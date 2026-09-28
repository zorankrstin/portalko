/**
 * Static Sitemap and robots.txt Generation Script
 * Runs at build time or on demand to generate /public/sitemap.xml and /public/robots.txt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { 
  getBaseSitemapEntries, 
  generateXmlFromEntries, 
  formatFirestoreDocToSitemapEntry,
  SitemapEntry,
  SITE_URL
} from '../src/utils/sitemapGenerator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

async function buildStaticSitemap() {
  console.log('Generating sitemap entries...');
  const entries: SitemapEntry[] = getBaseSitemapEntries();
  const seenLocs = new Set<string>(entries.map(e => e.loc));

  // Try fetching posts from Firestore
  try {
    const configPath = path.join(rootDir, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const app = initializeApp(cfg);
      const db = getFirestore(app, cfg.firestoreDatabaseId);

      // Fetch Events
      try {
        const eventsSnap = await getDocs(collection(db, 'events'));
        eventsSnap.forEach(docSnap => {
          const entry = formatFirestoreDocToSitemapEntry(docSnap.data(), docSnap.id, 'event');
          if (entry && !seenLocs.has(entry.loc)) {
            seenLocs.add(entry.loc);
            entries.push(entry);
          }
        });
        console.log(`Added ${eventsSnap.size} events from Firestore.`);
      } catch (err: any) {
        console.warn('Could not fetch events for sitemap:', err.message);
      }

      // Fetch Ads
      try {
        const adsSnap = await getDocs(collection(db, 'ads'));
        adsSnap.forEach(docSnap => {
          const entry = formatFirestoreDocToSitemapEntry(docSnap.data(), docSnap.id, 'ad');
          if (entry && !seenLocs.has(entry.loc)) {
            seenLocs.add(entry.loc);
            entries.push(entry);
          }
        });
        console.log(`Added ${adsSnap.size} ads from Firestore.`);
      } catch (err: any) {
        console.warn('Could not fetch ads for sitemap:', err.message);
      }

      // Fetch Posts (Deals, Blog, News)
      try {
        const postsSnap = await getDocs(collection(db, 'posts'));
        postsSnap.forEach(docSnap => {
          const data = docSnap.data();
          const type = data.type === 'deal' ? 'deal' : data.type === 'news' ? 'news' : 'blog';
          const entry = formatFirestoreDocToSitemapEntry(data, docSnap.id, type);
          if (entry && !seenLocs.has(entry.loc)) {
            seenLocs.add(entry.loc);
            entries.push(entry);
          }
        });
        console.log(`Added ${postsSnap.size} posts from Firestore.`);
      } catch (err: any) {
        console.warn('Could not fetch posts for sitemap:', err.message);
      }
    }
  } catch (err: any) {
    console.warn('Error reading Firestore for sitemap:', err.message);
  }

  // Generate XML
  const xml = generateXmlFromEntries(entries);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, xml, 'utf8');
  console.log(`Successfully generated ${sitemapPath} with ${entries.length} URLs.`);

  // Generate robots.txt
  const robotsTxt = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

# Sitemaps
Sitemap: ${SITE_URL}/sitemap.xml
`;
  const robotsPath = path.join(publicDir, 'robots.txt');
  fs.writeFileSync(robotsPath, robotsTxt, 'utf8');
  console.log(`Successfully generated ${robotsPath}.`);
}

buildStaticSitemap().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Fatal sitemap generation error:', err);
  process.exit(1);
});
