/**
 * Static Sitemap and robots.txt Generation Script
 * Runs at build time or on demand to crawl Firestore and generate /public/sitemap.xml and /public/robots.txt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { SITE_URL } from '../src/utils/sitemapGenerator';
import {
  buildDynamicSitemapFromFirestore,
  CrawledFirestoreDoc,
  SitemapCollectionName,
} from '../src/services/sitemapCrawlerService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

async function buildStaticSitemap() {
  console.log('Crawling Firestore and generating sitemap entries...');

  let db: any = null;
  try {
    const configPath = path.join(rootDir, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const app = getApps().length > 0 ? getApp() : initializeApp(cfg);
      db = getFirestore(app, cfg.firestoreDatabaseId);
    }
  } catch (err: any) {
    console.warn('Could not initialize Firebase for static sitemap generation:', err?.message || err);
  }

  const fetchCollectionDocs = async (colName: SitemapCollectionName): Promise<CrawledFirestoreDoc[]> => {
    if (!db) return [];
    try {
      const snap = await getDocs(collection(db, colName));
      return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
    } catch (err: any) {
      console.warn(`Could not fetch ${colName} for sitemap:`, err?.message || err);
      return [];
    }
  };

  const snapshot = await buildDynamicSitemapFromFirestore({
    fetchCollectionDocs,
    persistSitemapXml: (xml, stats) => {
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      const sitemapPath = path.join(publicDir, 'sitemap.xml');
      fs.writeFileSync(sitemapPath, xml, 'utf8');
      console.log(
        `Successfully generated ${sitemapPath} with ${stats.totalUrls} URLs ` +
          `(posts=${stats.postsCount}, ads=${stats.adsCount}, events=${stats.eventsCount}, ` +
          `directory=${stats.directoryCount}, tags=${stats.tagsCount}).`
      );
    },
  });

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Generate robots.txt
  const robotsTxt = `# ==============================================================================
# Portalko.net Robots Configuration
# https://www.robotstxt.org/robotstxt.html
# ==============================================================================

# Block aggressive AI scrapers and automated content harvesters
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Claude-Web
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: PetalBot
Disallow: /

User-agent: Scrapy
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: AhrefsBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: Amazonbot
Disallow: /

# General rules for all other crawlers and search engines
User-agent: *
Allow: /

# Disallow API endpoints and scanner probe targets
Disallow: /api/
Disallow: /admin
Disallow: /.env*
Disallow: /wp-admin*
Disallow: /wp-login*
Disallow: /*.php
Disallow: /*.sql
Disallow: /*.bak
Disallow: /*.config
Disallow: /*.ini
Disallow: /*?*spa_route=
Crawl-delay: 5

# Sitemaps
Sitemap: ${SITE_URL}/sitemap.xml
`;
  const robotsPath = path.join(publicDir, 'robots.txt');
  fs.writeFileSync(robotsPath, robotsTxt, 'utf8');
  console.log(`Successfully generated ${robotsPath} (sitemap hash: ${snapshot.etag}).`);
}

buildStaticSitemap().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Fatal sitemap generation error:', err);
  process.exit(1);
});
