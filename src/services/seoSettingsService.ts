import { useState, useEffect } from 'react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebase';

export interface PageSeoConfig {
  pageId: string;
  path: string;
  pageName: string;
  h1: string;
  h2: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords?: string;
  ogImage?: string;
  canonicalUrl?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type PageSeoMap = Record<string, PageSeoConfig>;

export const DEFAULT_PAGE_SEO: PageSeoMap = {
  main: {
    pageId: 'main',
    path: '/',
    pageName: 'Vse objave (Prva stran)',
    h1: 'Portalko – Slovenski portal za novice, male oglase in dogodke',
    h2: 'Zadnje novice, brezplačni mali oglasi, prihajajoči dogodki in ugodnosti v Sloveniji',
    metaTitle: 'Portalko – Slovenski portal za novice, male oglase in dogodke',
    metaDescription: 'Portalko je osrednji slovenski spletni portal za novice, brezplačne male oglase, lokalne dogodke, ugodnosti in popuste ter skupnost po vsej Sloveniji.',
    metaKeywords: 'Portalko, slovenski portal, novice, mali oglasi, dogodki, akcije, popusti, Ljubljana, Maribor, Slovenija',
    ogImage: '/favicon.png',
  },
  news: {
    pageId: 'news',
    path: '/novice',
    pageName: 'Novice',
    h1: 'Aktualne novice v Sloveniji',
    h2: 'Sveže novice iz osrednjih slovenskih medijev in preverjenih RSS virov v živo po kategorijah',
    metaTitle: 'Aktualne novice v Sloveniji – RSS viri v živo | Portalko',
    metaDescription: 'Zadnje novice iz osrednjih slovenskih medijev in RSS virov v živo. Preverite aktualna dogajanja v Sloveniji in po svetu na portalu Portalko.',
    metaKeywords: 'novice, novice v živo, RSS viri, Slovenija, svet, politika, gospodarstvo, šport, kultura',
    ogImage: '/favicon.png',
  },
  ads: {
    pageId: 'ads',
    path: '/mali-oglasi',
    pageName: 'Mali oglasi',
    h1: 'Mali oglasi v Sloveniji',
    h2: 'Brezplačni mali oglasi v Sloveniji – poiščite ali objavite rabljene in nove predmete, nepremičnine, vozila ter opremo',
    metaTitle: 'Mali oglasi Slovenija – Brezplačni spletni oglasi | Portalko',
    metaDescription: 'Brezplačni mali oglasi v Sloveniji. Poiščite rabljena in nova vozila, nepremičnine, elektroniko, dom in storitve po slovenskih regijah.',
    metaKeywords: 'mali oglasi, brezplačni mali oglasi, avtomobili, nepremičnine, rabljena vozila, elektronika, storitve, Slovenija',
    ogImage: '/favicon.png',
  },
  events: {
    pageId: 'events',
    path: '/dogodki',
    pageName: 'Dogodki in prireditve',
    h1: 'Dogodki in prireditve v Sloveniji',
    h2: 'Koledar prireditev, koncerti, festivali, športni in kulturni dogodki po vsej Sloveniji',
    metaTitle: 'Dogodki in prireditve v Sloveniji – Koledar dogodkov | Portalko',
    metaDescription: 'Koledar prireditev, koncertov, festivalov, športnih in kulturnih dogodkov po celotni Sloveniji na enem mestu na portalu Portalko.',
    metaKeywords: 'dogodki, prireditve, koledar dogodkov, koncerti, festivali, kultura, šport, gledališče, Slovenija',
    ogImage: '/favicon.png',
  },
  deals: {
    pageId: 'deals',
    path: '/akcije',
    pageName: 'Akcije in popusti',
    h1: 'Akcije, popusti in ugodnosti v Sloveniji',
    h2: 'Preverjene akcije, promocijske kode, ugodnosti in popusti v slovenskih trgovinah ter na spletu',
    metaTitle: 'Akcije, popusti in ugodnosti v Sloveniji | Portalko',
    metaDescription: 'Preverjene akcije, promocijske kode, ugodnosti in popusti v slovenskih trgovinah ter na spletu. Prihranite z vsakodnevnimi popusti na Portalko.',
    metaKeywords: 'akcije, popusti, ugodnosti, kuponi, promocijske kode, ceneje, ugodni nakupi, trgovine, Slovenija',
    ogImage: '/favicon.png',
  },
  blog: {
    pageId: 'blog',
    path: '/blog',
    pageName: 'Blog in zgodbe',
    h1: 'Blog & Zgodbe slovenske skupnosti',
    h2: 'Poglobljeni zapisi, potopisi, praktični vodniki za dom ter izkušnje slovenskih ustvarjalcev in strokovnjakov',
    metaTitle: 'Blog & Zgodbe slovenske skupnosti | Portalko',
    metaDescription: 'Avtorske zgodbe, potopisi, lokalni vodiči in razmišljanja članov slovenske spletne skupnosti na uradnem blogu portala Portalko.',
    metaKeywords: 'blog, zgodbe, potopisi, vodniki, slovenska skupnost, mnenja, nasveti, Portalko blog',
    ogImage: '/favicon.png',
  },
  saved: {
    pageId: 'saved',
    path: '/shranjeno',
    pageName: 'Shranjene objave',
    h1: 'Shranjene objave',
    h2: 'Vse vaše zaznamovane novice, mali oglasi, dogodki in blog zapisi na enem mestu',
    metaTitle: 'Shranjene objave in zaznamki | Portalko',
    metaDescription: 'Vaše shranjene novice, mali oglasi, dogodki in ugodnosti na enem mestu za hiter in enostaven dostop na slovenskem portalu Portalko.',
    metaKeywords: 'shranjene objave, zaznamki, priljubljene novice, shranjeni oglasi, Portalko',
    ogImage: '/favicon.png',
  },
  about: {
    pageId: 'about',
    path: '/o-nas',
    pageName: 'O portalu Portalko',
    h1: 'O portalu Portalko',
    h2: 'Spoznajte osrednji slovenski spletni portal za novice, male oglase, lokalne dogodke in ugodnosti',
    metaTitle: 'O portalu Portalko – Slovenski portal za novice, male oglase in dogodke | Portalko',
    metaDescription: 'Spoznajte portal Portalko, osrednjo slovensko skupnost za novice, male oglase, lokalne prireditve in ugodnosti.',
    metaKeywords: 'o nas, o portalu, uredništvo, poslanstvo, skupnost, Portalko',
    ogImage: '/favicon.png',
  },
  terms: {
    pageId: 'terms',
    path: '/pogoji-uporabe',
    pageName: 'Pogoji uporabe',
    h1: 'Pogoji uporabe portala',
    h2: 'Splošni pogoji, pravila uporabe in pravne informacije za obiskovalce in registrirane uporabnike',
    metaTitle: 'Pogoji uporabe portala | Portalko',
    metaDescription: 'Pogoji uporabe in pravna pravila za uporabnike spletnega portala Portalko.',
    metaKeywords: 'pogoji uporabe, splošni pogoji, pravila, pravno obvestilo, Portalko',
    ogImage: '/favicon.png',
  },
  privacy: {
    pageId: 'privacy',
    path: '/zasebnost',
    pageName: 'Politika zasebnosti',
    h1: 'Politika zasebnosti in varstvo osebnih podatkov',
    h2: 'Informacije o obdelavi, varovanju in hrambi osebnih podatkov uporabnikov na portalu Portalko',
    metaTitle: 'Politika zasebnosti | Portalko',
    metaDescription: 'Informacije o varstvu osebnih podatkov in zasebnosti na portalu Portalko.',
    metaKeywords: 'politika zasebnosti, GDPR, varstvo osebnih podatkov, piškotki, Portalko',
    ogImage: '/favicon.png',
  },
  contact: {
    pageId: 'contact',
    path: '/kontakt',
    pageName: 'Kontakt',
    h1: 'Kontakt in uredništvo',
    h2: 'Stopite v stik z nami za vprašanja, predloge, oglaševanje in tehnično podporo',
    metaTitle: 'Kontakt | Portalko',
    metaDescription: 'Stopite v stik z uredništvom in podporo portala Portalko.',
    metaKeywords: 'kontakt, uredništvo, podpora, oglaševanje, sporočilo, e-pošta, Portalko',
    ogImage: '/favicon.png',
  },
  rules: {
    pageId: 'rules',
    path: '/pravila-objavljanja',
    pageName: 'Pravila objavljanja',
    h1: 'Pravila objavljanja vsebin',
    h2: 'Smernice in etična pravila za varno objavljanje malih oglasov, dogodkov in prispevkov',
    metaTitle: 'Pravila objavljanja vsebin | Portalko',
    metaDescription: 'Smernice in pravila za varno objavljanje malih oglasov, dogodkov in prispevkov na portalu Portalko.',
    metaKeywords: 'pravila objavljanja, varno objavljanje, moderiranje vsebin, smernice za male oglase, Portalko',
    ogImage: '/favicon.png',
  },
};

const LOCAL_STORAGE_KEY = 'portalko_page_seo_cache';

// In-memory cache for synchronous reads
let cachedPageSeo: PageSeoMap = (() => {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_PAGE_SEO, ...parsed };
      }
    }
  } catch (e) {
    // Ignore storage parse error
  }
  return { ...DEFAULT_PAGE_SEO };
})();

const SEO_DOC_REF = () => doc(db, 'settings', 'seo');

/**
 * Returns current SEO config synchronously from cache or default.
 */
export function getPageSeoConfig(pageId: string): PageSeoConfig {
  const custom = cachedPageSeo[pageId];
  const def = DEFAULT_PAGE_SEO[pageId] || DEFAULT_PAGE_SEO.main;
  if (!custom) return def;
  return {
    ...def,
    ...custom,
    h1: custom.h1 || def.h1,
    h2: custom.h2 || def.h2,
    metaTitle: custom.metaTitle || def.metaTitle,
    metaDescription: custom.metaDescription || def.metaDescription,
  };
}

/**
 * Real-time listener for SEO settings across the entire application.
 */
export function subscribeToPageSeoSettings(callback: (seoMap: PageSeoMap) => void): () => void {
  try {
    const unsub = onSnapshot(
      SEO_DOC_REF(),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const remoteMap: PageSeoMap = data?.pages || {};
          
          const merged: PageSeoMap = {};
          Object.keys(DEFAULT_PAGE_SEO).forEach((key) => {
            merged[key] = {
              ...DEFAULT_PAGE_SEO[key],
              ...(remoteMap[key] || {}),
            };
          });

          cachedPageSeo = merged;
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
            }
          } catch (e) {}

          callback(merged);
        } else {
          callback(DEFAULT_PAGE_SEO);
        }
      },
      (error) => {
        console.warn('subscribeToPageSeoSettings error, falling back to cache:', error);
        callback(cachedPageSeo);
      }
    );
    return unsub;
  } catch (err) {
    console.warn('Failed to subscribe to SEO settings:', err);
    callback(cachedPageSeo);
    return () => {};
  }
}

/**
 * Saves SEO settings for a specific page to Firestore.
 */
export async function savePageSeoConfig(
  pageId: string, 
  config: Partial<PageSeoConfig>, 
  userEmail?: string
): Promise<void> {
  const current = getPageSeoConfig(pageId);
  const updated: PageSeoConfig = {
    ...current,
    ...config,
    updatedAt: new Date().toISOString(),
    updatedBy: userEmail || 'Administrator',
  };

  const newMap: PageSeoMap = {
    ...cachedPageSeo,
    [pageId]: updated,
  };

  cachedPageSeo = newMap;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newMap));
    }
  } catch (e) {}

  try {
    await setDoc(SEO_DOC_REF(), {
      pages: newMap,
      updatedAt: new Date().toISOString(),
      updatedBy: userEmail || 'Administrator',
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/seo');
    throw error;
  }
}

/**
 * Resets a single page's SEO settings to default.
 */
export async function resetPageSeoToDefault(pageId: string, userEmail?: string): Promise<void> {
  const def = DEFAULT_PAGE_SEO[pageId];
  if (!def) return;
  await savePageSeoConfig(pageId, def, userEmail);
}

/**
 * React hook to access and manage page SEO settings.
 */
export function usePageSeo(pageId?: string) {
  const [seoMap, setSeoMap] = useState<PageSeoMap>(cachedPageSeo);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToPageSeoSettings((map) => {
      setSeoMap(map);
      setLoading(false);
    });
    return unsub;
  }, []);

  const currentSeo = pageId ? (seoMap[pageId] || DEFAULT_PAGE_SEO[pageId] || DEFAULT_PAGE_SEO.main) : undefined;

  const saveSeo = async (targetPageId: string, data: Partial<PageSeoConfig>, userEmail?: string) => {
    await savePageSeoConfig(targetPageId, data, userEmail);
  };

  const resetSeo = async (targetPageId: string, userEmail?: string) => {
    await resetPageSeoToDefault(targetPageId, userEmail);
  };

  return {
    seoMap,
    currentSeo,
    loading,
    saveSeo,
    resetSeo,
  };
}
