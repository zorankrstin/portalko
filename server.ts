import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { 
  getBaseSitemapEntries, 
  generateXmlFromEntries, 
  formatFirestoreDocToSitemapEntry, 
  SitemapEntry, 
  SITE_URL 
} from "./src/utils/sitemapGenerator";

dotenv.config();

const _currentFilename = typeof __filename !== "undefined" ? __filename : (typeof import.meta !== "undefined" && import.meta.url ? fileURLToPath(import.meta.url) : process.cwd());
const _currentDirname = typeof __dirname !== "undefined" ? __dirname : path.dirname(_currentFilename);

const GA_TAG_HTML = `    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-DYZSLZ29C4"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-DYZSLZ29C4');
    </script>`;

// Cached dynamic sitemap in memory (refreshed every 15 minutes)
let cachedSitemapXml: string | null = null;
let lastSitemapTime = 0;
const SITEMAP_CACHE_DURATION = 15 * 60 * 1000;

async function getOrGenerateSitemap(): Promise<string> {
  const now = Date.now();
  if (cachedSitemapXml && now - lastSitemapTime < SITEMAP_CACHE_DURATION) {
    return cachedSitemapXml;
  }

  const entries: SitemapEntry[] = getBaseSitemapEntries();
  const seenLocs = new Set<string>(entries.map(e => e.loc));

  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
      const { initializeApp } = await import("firebase/app");
      const { getFirestore, collection, getDocs } = await import("firebase/firestore");
      const app = initializeApp(cfg);
      const db = getFirestore(app, cfg.firestoreDatabaseId);

      // Fetch Events
      try {
        const eventsSnap = await getDocs(collection(db, "events"));
        eventsSnap.forEach(docSnap => {
          const entry = formatFirestoreDocToSitemapEntry(docSnap.data(), docSnap.id, "event");
          if (entry && !seenLocs.has(entry.loc)) {
            seenLocs.add(entry.loc);
            entries.push(entry);
          }
        });
      } catch (e) {
        // Ignore firestore read errors
      }

      // Fetch Ads
      try {
        const adsSnap = await getDocs(collection(db, "ads"));
        adsSnap.forEach(docSnap => {
          const entry = formatFirestoreDocToSitemapEntry(docSnap.data(), docSnap.id, "ad");
          if (entry && !seenLocs.has(entry.loc)) {
            seenLocs.add(entry.loc);
            entries.push(entry);
          }
        });
      } catch (e) {
        // Ignore firestore read errors
      }

      // Fetch Posts (Deals, Blog, News)
      try {
        const postsSnap = await getDocs(collection(db, "posts"));
        postsSnap.forEach(docSnap => {
          const data = docSnap.data();
          if (!data || !data.title) return;
          const isDeal = data.type === "deal" || 
                         data.category === "deal" || 
                         data.category?.startsWith("deal") || 
                         (data.categoryName && /ugodnost|akcij|popust|trgovin|hrana/i.test(data.categoryName)) || 
                         Boolean(data.discount) || 
                         Boolean(data.promoCode);
          const type = isDeal ? "deal" : data.type === "news" ? "news" : "blog";
          const entry = formatFirestoreDocToSitemapEntry(data, docSnap.id, type);
          if (entry && !seenLocs.has(entry.loc)) {
            seenLocs.add(entry.loc);
            entries.push(entry);
          }
        });
      } catch (e) {
        // Ignore firestore read errors
      }
    }
  } catch (err: any) {
    console.warn("Error augmenting dynamic sitemap from Firestore:", err.message);
  }

  const xml = generateXmlFromEntries(entries);
  cachedSitemapXml = xml;
  lastSitemapTime = now;
  return xml;
}

/**
 * Injects Google Analytics tag at the very beginning of <head>,
 * along with route-specific SEO titles and meta descriptions.
 */
function preparePageHtml(rawHtml: string, reqUrl: string): string {
  let html = rawHtml;

  // Determine metadata based on URL path
  const parsedUrl = new URL(reqUrl, "https://portalko.net");
  const pathname = parsedUrl.pathname.replace(/\/+$/, "") || "/";
  const segments = pathname.split("/").filter(Boolean);

  let title = "Portalko – Slovenski portal za novice, male oglase in dogodke";
  let description = "Portalko je osrednji slovenski spletni portal za novice, brezplačne male oglase, lokalne dogodke, ugodnosti in popuste ter skupnost po vsej Sloveniji.";
  let ogType = "website";
  const canonicalUrl = `https://portalko.net${pathname === "/" ? "" : pathname}`;

  if (pathname === "/novice") {
    title = "Aktualne novice v Sloveniji – RSS viri v živo | Portalko";
    description = "Zadnje novice iz osrednjih slovenskih medijev in RSS virov v živo. Preverite dogajanja v Sloveniji in po svetu.";
  } else if (pathname === "/mali-oglasi") {
    title = "Mali oglasi Slovenija – Brezplačni spletni oglasi | Portalko";
    description = "Brezplačni mali oglasi v Sloveniji. Rabljena in nova vozila, nepremičnine, elektronika, dom in storitve po slovenskih regijah.";
  } else if (pathname === "/dogodki") {
    title = "Dogodki in prireditve v Sloveniji – Koledar dogodkov | Portalko";
    description = "Koledar prireditev, koncertov, festivalov, športnih in kulturnih dogodkov po celotni Sloveniji.";
  } else if (pathname === "/akcije") {
    title = "Akcije, popusti in ugodnosti v Sloveniji | Portalko";
    description = "Preverjene akcije, promocijske kode, ugodnosti in popusti v slovenskih trgovinah ter na spletu.";
  } else if (pathname === "/blog") {
    title = "Blog & Zgodbe slovenske skupnosti | Portalko";
    description = "Avtorske zgodbe, potopisi, lokalni vodiči in razmišljanja članov slovenske spletne skupnosti Portalko.";
  } else if (pathname === "/shranjeno") {
    title = "Shranjene objave in zaznamki | Portalko";
    description = "Vaše shranjene novice, mali oglasi, dogodki in ugodnosti na enem mestu za hiter dostop.";
  } else if (pathname === "/o-nas") {
    title = "O portalu Portalko – Slovenski portal za novice, male oglase in dogodke | Portalko";
    description = "Spoznajte portal Portalko, osrednjo slovensko skupnost za novice, male oglase, lokalne prireditve in ugodnosti.";
  } else if (pathname === "/pogoji-uporabe") {
    title = "Pogoji uporabe portala | Portalko";
    description = "Pogoji uporabe in pravna pravila za uporabnike spletnega portala Portalko.";
  } else if (pathname === "/zasebnost") {
    title = "Politika zasebnosti | Portalko";
    description = "Informacije o varstvu osebnih podatkov in zasebnosti na portalu Portalko.";
  } else if (pathname === "/kontakt") {
    title = "Kontakt | Portalko";
    description = "Stopite v stik z uredništvom in podporo portala Portalko.";
  } else if (pathname === "/pravila-objavljanja") {
    title = "Pravila objavljanja vsebin | Portalko";
    description = "Smernice in pravila za varno objavljanje malih oglasov, dogodkov in prispevkov na portalu Portalko.";
  } else if (segments.length >= 2) {
    // Category or Post page (e.g. /dogodki/glasba-koncerti/... or /novice/slovenija)
    const section = segments[0];
    const lastSegment = segments[segments.length - 1];
    const humanTitle = lastSegment
      .split("-")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    if (segments.length >= 3 || (section !== "novice" && segments.length === 2 && !["slovenija", "svet", "gospodarstvo", "sport", "kultura", "tehnologija"].includes(segments[1]))) {
      // Looks like an individual post or deep subcategory
      title = `${humanTitle} | Portalko`;
      description = `Oglejte si podrobnosti objave ${humanTitle} na portalu Portalko.`;
      ogType = section === "dogodki" ? "event" : (section === "mali-oglasi" || section === "akcije") ? "product" : "article";
    } else {
      title = `${humanTitle} – ${section.charAt(0).toUpperCase() + section.slice(1)} | Portalko`;
    }
  }

  // Update Title
  html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
  
  // Update Meta Description
  html = html.replace(/<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta name="description" content="${description}" />`);

  // Update Canonical
  html = html.replace(/<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i, `<link rel="canonical" href="${canonicalUrl}" />`);

  // Update OpenGraph
  html = html.replace(/<meta\s+property=["']og:title["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:title" content="${title}" />`);
  html = html.replace(/<meta\s+property=["']og:description["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:description" content="${description}" />`);
  html = html.replace(/<meta\s+property=["']og:url["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}" />`);
  html = html.replace(/<meta\s+property=["']og:type["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:type" content="${ogType}" />`);

  // Update Twitter Cards
  html = html.replace(/<meta\s+name=["']twitter:title["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta name="twitter:title" content="${title}" />`);
  html = html.replace(/<meta\s+name=["']twitter:description["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta name="twitter:description" content="${description}" />`);
  html = html.replace(/<meta\s+name=["']twitter:url["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta name="twitter:url" content="${canonicalUrl}" />`);

  // Remove existing Google Analytics code to avoid duplicates
  html = html.replace(/<!-- Google tag \(gtag\.js\) -->[\s\S]*?gtag\('config',\s*'G-DYZSLZ29C4'\);\s*<\/script>/gi, "");

  // Insert Google Analytics code at the absolute beginning of <head>
  html = html.replace(/(<head[^>]*>)/i, `$1\n${GA_TAG_HTML}`);

  return html;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Sitemap endpoint (dynamic and real-time with Firestore entries)
  app.get("/sitemap.xml", async (req, res) => {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    try {
      const xml = await getOrGenerateSitemap();
      return res.send(xml);
    } catch (err: any) {
      console.error("Error serving sitemap.xml:", err);
      const publicSitemap = path.join(process.cwd(), "public", "sitemap.xml");
      if (fs.existsSync(publicSitemap)) {
        return res.sendFile(publicSitemap);
      }
      return res.status(500).send("Error generating sitemap");
    }
  });

  // Robots.txt endpoint
  app.get("/robots.txt", (req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    const publicRobots = path.join(process.cwd(), "public", "robots.txt");
    if (fs.existsSync(publicRobots)) {
      return res.sendFile(publicRobots);
    }
    const defaultRobots = `# https://www.robotstxt.org/robotstxt.html\nUser-agent: *\nAllow: /\n\n# Sitemaps\nSitemap: ${SITE_URL}/sitemap.xml\n`;
    res.send(defaultRobots);
  });

  // Lazy-initialize Stripe client
  let stripeClient: any = null;
  async function getStripe() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return null;
    }
    if (!stripeClient) {
      const Stripe = (await import("stripe")).default;
      stripeClient = new Stripe(key, { apiVersion: "2023-10-16" as any });
    }
    return stripeClient;
  }

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Stripe config status check
  app.get("/api/stripe/config", (req, res) => {
    const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || "";
    const hasSecretKey = Boolean(process.env.STRIPE_SECRET_KEY);
    res.json({
      configured: hasSecretKey,
      publishableKey,
    });
  });

  // Create Stripe Checkout Session or Payment Intent for post promotion
  app.post("/api/stripe/create-payment-intent", async (req, res) => {
    try {
      const {
        amountEur,
        itemId,
        itemType,
        itemTitle,
        planId,
        badgeType,
        targetSection,
        userEmail,
        userId,
      } = req.body;

      if (!amountEur || amountEur <= 0) {
        return res.status(400).json({ error: "Neveljaven znesek plačila." });
      }

      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        const simulatedPaymentIntentId = `pi_sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        return res.json({
          simulated: true,
          clientSecret: `${simulatedPaymentIntentId}_secret_simulated`,
          paymentIntentId: simulatedPaymentIntentId,
          amountEur,
          currency: "eur",
          message: "Stripe testna simulacija (STRIPE_SECRET_KEY ni nastavljen v .env).",
        });
      }

      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(key, { apiVersion: "2023-10-16" as any });
      const amountCents = Math.round(Number(amountEur) * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "eur",
        automatic_payment_methods: { enabled: true },
        description: `Izpostavitev (${badgeType || "PROMO"}) za: ${itemTitle || itemId}`,
        receipt_email: userEmail || undefined,
        metadata: {
          itemId: String(itemId || ""),
          itemType: String(itemType || ""),
          itemTitle: String((itemTitle || "").substring(0, 100)),
          planId: String(planId || ""),
          badgeType: String(badgeType || "PROMO"),
          targetSection: String(targetSection || "all"),
          userId: String(userId || ""),
        },
      });

      res.json({
        simulated: false,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amountEur,
        currency: "eur",
      });
    } catch (err: any) {
      console.error("Stripe error creating payment intent:", err);
      res.status(500).json({
        error: err.message || "Prišlo je do napake pri vzpostavitvi Stripe plačila.",
      });
    }
  });

  // Verify payment status
  app.post("/api/stripe/verify-payment", async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      if (!paymentIntentId) {
        return res.status(400).json({ error: "Manjka paymentIntentId." });
      }

      if (paymentIntentId.startsWith("pi_sim_")) {
        return res.json({
          status: "succeeded",
          paid: true,
          simulated: true,
        });
      }

      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        return res.status(500).json({ error: "STRIPE_SECRET_KEY ni nastavljen." });
      }

      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(key, { apiVersion: "2023-10-16" as any });
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      const isPaid = paymentIntent.status === "succeeded";

      res.json({
        status: paymentIntent.status,
        paid: isPaid,
        amountReceived: paymentIntent.amount_received ? paymentIntent.amount_received / 100 : 0,
        currency: paymentIntent.currency,
      });
    } catch (err: any) {
      console.error("Stripe verification error:", err);
      res.status(500).json({
        error: err.message || "Napaka pri preverjanju plačila.",
      });
    }
  });

  // Page serving & Vite middleware
  const isProduction = 
    process.env.NODE_ENV === "production" || 
    _currentFilename.endsWith("server.cjs") || 
    _currentFilename.includes("/dist/") ||
    !fs.existsSync(path.resolve(process.cwd(), "src", "main.tsx"));

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });

    app.use(vite.middlewares);

    // Serve HTML with Google Analytics and SEO tags for all page routes
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      const pathname = req.path;

      // Skip API and Vite internal paths
      if (url.startsWith("/api") || url.startsWith("/@") || url.startsWith("/src")) {
        return next();
      }

      // Only skip actual static file assets with file extensions (e.g. .js, .css, .png, etc.)
      if (/\.(js|css|png|jpe?g|gif|svg|ico|json|woff2?|ttf|eot|webp|avif|map|xml|txt)$/i.test(pathname)) {
        return next();
      }

      try {
        const indexHtmlPath = path.resolve(process.cwd(), "index.html");
        let template = fs.readFileSync(indexHtmlPath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        const html = preparePageHtml(template, url);
        res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(html);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    // Robust resolution of dist folder across different execution environments
    const candidateDirs = [
      path.join(process.cwd(), "dist"),
      _currentDirname,
      path.resolve(_currentDirname, "dist"),
      path.resolve(_currentDirname, ".."),
      process.cwd(),
    ];
    const resolvedDistPath = candidateDirs.find(d => fs.existsSync(path.join(d, "index.html"))) || path.join(process.cwd(), "dist");
    const distIndexPath = path.join(resolvedDistPath, "index.html");

    // Serve static assets from dist
    app.use(express.static(resolvedDistPath));

    // Fallback for all SPA page routes - handles browser refreshes in production
    app.get("*", (req, res) => {
      // Don't intercept API requests
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ error: "API endpoint ni bil najden." });
      }

      // Check if dist/index.html exists
      if (fs.existsSync(distIndexPath)) {
        try {
          const template = fs.readFileSync(distIndexPath, "utf-8");
          const html = preparePageHtml(template, req.originalUrl);
          return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(html);
        } catch (err) {
          return res.sendFile(distIndexPath);
        }
      }

      // Fallback if index.html is located elsewhere
      const fallbackIndexPath = path.join(process.cwd(), "index.html");
      if (fs.existsSync(fallbackIndexPath)) {
        return res.sendFile(fallbackIndexPath);
      }

      return res.status(404).send("Page not found");
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
