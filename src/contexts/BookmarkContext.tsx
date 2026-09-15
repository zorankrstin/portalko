import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { subscribeToBookmarks, saveBookmarkInFirestore, removeBookmarkInFirestore } from '../services/firestoreService';

export type BookmarkCategory = 'all' | 'news' | 'ads' | 'events' | 'blog' | 'deals';

export interface SavedItemData {
  id: string;
  category: BookmarkCategory | string;
  type?: string;
  title: string;
  description?: string;
  price?: string;
  location?: string;
  author?: string;
  authorRole?: string;
  authorAvatar?: string;
  sourceName?: string;
  date?: string;
  pubDate?: string;
  time?: string;
  month?: string;
  day?: string;
  image?: string;
  thumbnail?: string;
  images?: string[];
  link?: string;
  tags?: string[];
  organizer?: string;
  [key: string]: any;
}

export const DEFAULT_KNOWN_ITEMS: Record<string, SavedItemData> = {
  blog: {
    id: 'blog',
    type: 'blog',
    category: 'blog',
    title: 'Potep po dolini Soče: 5 skritih kotičkov, ki jih morate obiskati to pomlad',
    author: 'Maja Zupan',
    authorRole: 'Registrirana',
    authorAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA0aillBK42foqYYRs3Hl0i5psDvvr2NDlrZX_P-FXMFxLDlTrJyttrIRyIM7OjAMIeCA8VDw5Da046gdbXusHkNnSCNLmgTP1y3GLJPh-_spwBhPsrnwKXD-zF6zEb144nZU8FLIklzGTs5sg8xvIs7NcM-R4fOwdNJHr4sPnR2x0Im8d6D1xpgLSCk-6lXFjnWO5W4kUTP6QjtqfjqwL9sD3BxP22cIPCehiW4qkKlJEasSlcrIVW',
    date: 'Pred 2 urama',
    location: 'Dolina Soče, Bovec',
    description: 'Pomlad ob smaragdni reki ponuja popolno tišino pred glavno turistično sezono. Odkrili smo manj znane slapove, neobljudene tolmunčke v Trenti ter domačo sirarno v vasi Čezsoča, kjer še vedno ohranjajo stoletno tradicijo izdelave bovškega sira.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmfcqLkX6EpehopwShblWWWTErEk6fiZmrLuObihcFhQPTTdN1UP0HwAJWNxbpewO7AD8rNtHki7D2UQxR3ruAprxzai0oCSFiLO7Ucc2eM__0HctsIVOGVfYNHax9soqlpthUdhwDbTst0e68dCdSFOM0wasuTUnvpZCJ__StsF3T8Qey5cE-RGiZXa7sEzk59Ev8spqvVpe-6CJ-6XR19xlIiJd9yyxqk2aRczUvHRHR4HUWu0Zv',
  },
  ad: {
    id: 'ad',
    type: 'ad',
    category: 'ads',
    title: 'Apple iPhone 15 Pro 128GB - Naravni Titan, garancija do nov. 2025',
    price: '790 €',
    author: 'Marko K.',
    location: 'Ljubljana - Bežigrad',
    date: 'danes ob 11:20',
    description: 'Telefon je brezhiben, od prvega dne nošen v originalnem Apple usnjenem ovitku ter z nameščenim PanzerGlass steklom. Zdravje baterije 98%. Priložen original račun (iStyle Ljubljana), embalaža in nerabljen kabel.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBfIBngWKS30xAFzsMq_Dxy2qrMQztheyrgJ5NmeICUhk5lSyoH8H0jEx6lEbzYMgY5qP-PRwxH7wcmTG1TdM0SVmIequYR1ci3Qt5BwzjPQrYx32XODDP5xacq9fV1QSDsjGtXYJYKrxZ_3frQ7mNFrFCFfQQPO0kMUXGiaUV4qBUID4yNyRy3oVkWAuk1XP3IrSgzM6PPd1AyM8Z2ZbdZaWha3pAyQDNC3djtCF6TMbqwo5NG21uz',
  },
  'oglas-inline-12310': {
    id: 'oglas-inline-12310',
    type: 'ad',
    category: 'ads',
    title: 'Volkswagen Golf 8 2.0 TDI Life - 1. lastnik, SLO poreklo, redno servisiran',
    price: '19.850 €',
    location: 'Ljubljana • Avto salon Preverjen',
    date: '2021 • 84.000 km',
    description: '1. lastnik SLO, redno servisiran na pooblaščenem servisu z znano servisno zgodovino.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBcdJiCk82d6POLgjYq8D_L-SNdy-1R98FqPMTPuE1rSh1BeGBTJvmQn6eBe7v54bHiGufB4QWUGD0hTNro4_xhpNjwkoTxtvXg_DwCOEpy1VBUrtk8S3io-BBrOVWd9Km0wsqsa9TWLjyD9oEV7B3AB4OAu3UFGpmCaglsECT2fwFtO_yRszXTpD66MOhJobuko5rVOGwiPCdgmySgNkmV_PcPYsqlcp1WnBbryB2LNI4cEqvnIkuD',
  },
  'oglas-inline-15138': {
    id: 'oglas-inline-15138',
    type: 'ad',
    category: 'ads',
    title: 'Svetlo 2.5-sobno stanovanje z balkonom in odprtim razgledom na Grad',
    price: '275.000 €',
    location: 'Ljubljana Center - Trnovo • Zasebna ponudba',
    date: '68 m² • Balkon',
    description: 'Popolnoma opremljeno, svetlo stanovanje na odlični lokaciji z odprtim razgledom na Ljubljanski grad.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDE40bShL3GSdGXkiztITaRkYVY1qJlcLlriBhImNenO3ltaOWXPBctxnyNLEDGLO48JUQuourT8vOIWRzizHxf_0Fq6k2xWyTFikZKrHwQ7Dkg9BRFmOW-NvbUHBC0Rn1REhAkshRdvHdt2PQkY1GKMJNBBzHWMYV_l0yL92Jw8p-six9SkUOylQUlEVolW_idiJC4n_DkBWuSJAH4kCsB2ukbYDEU9QQCqUTdebUTzQpCSmgJAr6J',
  },
  'oglas-inline-19314': {
    id: 'oglas-inline-19314',
    type: 'ad',
    category: 'ads',
    title: 'Gorsko kolo Scott Scale 960 (2023) - Velikost L, odlično ohranjeno',
    price: '890 €',
    author: 'Tomaž B.',
    location: 'Maribor • včeraj ob 18:45',
    description: 'Alu okvir, Shimano XT menjalnik, RockShox zračne vilice z zaklepom na krmilu. Prevoženih manj kot 500 km.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmfcqLkX6EpehopwShblWWWTErEk6fiZmrLuObihcFhQPTTdN1UP0HwAJWNxbpewO7AD8rNtHki7D2UQxR3ruAprxzai0oCSFiLO7Ucc2eM__0HctsIVOGVfYNHax9soqlpthUdhwDbTst0e68dCdSFOM0wasuTUnvpZCJ__StsF3T8Qey5cE-RGiZXa7sEzk59Ev8spqvVpe-6CJ-6XR19xlIiJd9yyxqk2aRczUvHRHR4HUWu0Zv',
  },
  'oglas-inline-miza': {
    id: 'oglas-inline-miza',
    type: 'ad',
    category: 'ads',
    title: 'Hrastova masivna jedilna miza 200x90 cm z kovinskimi U nogami',
    price: '380 €',
    location: 'Kranj z okolico',
    description: 'Ročno delo, oljen naravni hrast debeline 4 cm. Brez prask, rabljena le pol leta zaradi selitve.',
  },
  'oglas-inline-vozicek': {
    id: 'oglas-inline-vozicek',
    type: 'ad',
    category: 'ads',
    title: 'Otroški voziček Cybex Priam 3v1 (košara, športni del, lupinica Cloud Z)',
    price: '450 €',
    location: 'Celje Center',
    description: 'Črna barva z rose gold ogrodjem. Zelo lepo ohranjen, vključena dežna prevleka in adapterji.',
  },
  event: {
    id: 'event',
    type: 'event',
    category: 'events',
    title: 'Literarni večer z domačimi avtorji in akustični koncert Dua Sever',
    organizer: 'Mestna knjižnica Kranj',
    location: 'Kranj, Glavni trg 12 (Dvorana)',
    date: 'Četrtek, 20. marec ob 19:00',
    price: 'Brezplačno',
    description: 'Vabljeni v dvorano Mestne knjižnice Kranj na predstavitev novih pesniških zbirk gorenjskih avtorjev. Večer bo obogaten z uglasbeno poezijo in prijetnim druženjem ob lokalni kapljici. Vstop je prost!',
    month: 'MAR',
    day: '20',
  },
  'dogodek-inline-15866': {
    id: 'dogodek-inline-15866',
    type: 'event',
    category: 'events',
    title: 'Flirrt & Gostje: Veliki akustični koncert na Ljubljanskem gradu',
    organizer: 'Ljubljanski grad',
    location: 'Ljubljanski grad, Grajsko dvorišče, Ljubljana',
    date: 'Petek, 28. marec ob 20:00',
    price: '22,00 €',
    description: 'Ekskluzivni akustični koncert skupine Flirrt z gosti v čarobnem ambientu grajskega dvorišča.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBoc0CSy-sKNVmhSZRxOp8WfTqAS43GZKvTGz7WryDO9KEXVbXoj1vXymDCGxJyOfq6npN2TKvMZ1d1DTKqkt6Rp-aZZS69FFDNyD4NmKui28nOBaSqLE1z3mN-XiYbeBcdmMZLsmk4fHFPCk1UkccXclOnv7KfCGc3Bs4w0IsSr92MFx0Y0cW5I6BAyhN1fT0FmewUJIkbVFHOaNSFbofa-6-EavEYLlODaKrnu_YtT4X9UJ8Ag1fg',
  },
  'dogodek-inline-tek': {
    id: 'dogodek-inline-tek',
    type: 'event',
    category: 'events',
    title: '38. Ljubljanski pomladni tek & polmaraton 2025',
    organizer: 'Športna zveza Ljubljana',
    location: 'Kongresni trg & mestne ulice, Ljubljana',
    date: 'Nedelja, 6. april ob 09:00',
    price: '25,00 €',
    description: 'Tradicionalni spomladanski tek po najlepših ulicah in parkih prestolnice s trasami 5km, 10km in polmaraton.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCgjvqZCRvdRPYwdIuN3PXwnavwerKtUwrd5_F-Xmkk11Ar57le42_1lEjDXGWxq_yYO2kLGHPr71ooGGUhDd_SwI-kOvy-_Qk3ZNRCn1VtjBL83DqOOupBUvxAncGAXwtiuYgTTs4pp_kzlYpRBHlLcmugAzzqp5hEoo68KeSgoU-8nB-hTobmFilMat7AvaOXw0K9t-k3Xlb_FekMFMMLJ7aMWPXGPWwdjAs3CwrYbKWOZ7lWYQNy',
  },
  'dogodek-inline-drama': {
    id: 'dogodek-inline-drama',
    type: 'event',
    category: 'events',
    title: 'Cankarjev dom: SNG Drama - Kralj Lear (Premiera)',
    organizer: 'Cankarjev dom • SNG Drama',
    location: 'Prešernova cesta 10, Ljubljana • Gallusova dvorana',
    date: 'Danes ob 19:30',
    price: 'od 18,00 €',
    description: 'Monumentalna Shakespearjeva tragedija v sodobni režiji in z vrhunsko igralsko zasedbo.',
  },
  'dogodek-inline-cokolada': {
    id: 'dogodek-inline-cokolada',
    type: 'event',
    category: 'events',
    title: 'Festival čokolade & lokalnih dobrot Radovljica 2025',
    organizer: 'TIC Radovljica',
    location: 'Staro mestno jedro, Linhartov trg, Radovljica',
    date: 'Sobota, 29. marec, 10:00 - 19:00',
    price: 'Vstop prost',
    description: 'Največji slovenski čokoladni festival s čokoladnicami iz celotne Slovenije in tujine.',
  },
  'dogodek-inline-derbi': {
    id: 'dogodek-inline-derbi',
    type: 'event',
    category: 'events',
    title: 'NK Maribor vs NK Olimpija - Večni derbi Prve Lige',
    organizer: 'Prva Liga Telemach',
    location: 'Mladinska ulica 29, Maribor • Ljudski vrt',
    date: 'Nedelja, 30. marec ob 17:30',
    price: '12,00 € - 20,00 €',
    description: 'Neposredni obračun za vrh prvenstvene lestvice v razprodanem Ljudskem vrtu.',
  },
  rss: {
    id: 'rss',
    type: 'rss',
    category: 'news',
    title: 'Cene življenjskih potrebščin v februarju zmernejše, letna inflacija na 1,8 odstotka',
    sourceName: 'RTV Slovenija',
    pubDate: 'pred 35 min',
    link: 'https://www.rtvslo.si',
    description: 'Statistični urad RS (SURS) poroča o umiritvi cen hrane in brezalkoholnih pijač, medtem ko se cene storitev še naprej krepijo s povprečno 3,2-odstotno letno rastjo.',
    thumbnail: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwa3x1j5cEF-Q5lqAuTCNRDeCuUWlx07IL-SE9-c3bPNgf9mqKgoqSLqpi74z2tdnR_H1fDvgOsdbWrxsVpt5XBs9keJPGcD-RdiK80jklKPkTFRKen6kXVuTB_aaEDFw2RgOW2jFy3xwfMgT4P_HXw1S06uG0DJ59rQcK_T65fjqdl8nJT0EvOmjASY8u2InfluMhuWH9Z_ZLH2mgKmPNZx4N5kegWcqZdfGFfV67CDd9WIGh7qpl',
  },
  deal: {
    id: 'deal',
    type: 'deal',
    category: 'deals',
    title: 'Hervis Slovenija: 30% spomladanski popust na vso tekaško obutev',
    author: 'Gregor H.',
    description: 'Za vse registrirane člane portala je na voljo posebna ugodnost ob začetku tekaške sezone.',
  },
  news: {
    id: 'news',
    type: 'news',
    category: 'news',
    title: 'Prometna napoved: Predor Karavanke ponovno odprt za ves promet, popoldne krajše zapore',
    sourceName: '24ur.com',
    link: 'https://www.24ur.com',
  },
};

export function inferItemCategory(id: string, data?: any): BookmarkCategory {
  if (data?.category) return data.category as BookmarkCategory;
  if (data?.type === 'rss' || id.startsWith('rss') || data?.sourceName || id === 'news') return 'news';
  if (data?.type === 'ad' || id.startsWith('oglas') || id.startsWith('ad') || id.startsWith('inline-ad')) return 'ads';
  if (data?.type === 'event' || id.startsWith('dogodek') || id.startsWith('event')) return 'events';
  if (data?.type === 'blog' || id.startsWith('blog')) return 'blog';
  if (data?.type === 'deal' || id.startsWith('deal')) return 'deals';
  return 'all';
}

type BookmarkContextType = {
  savedIds: string[];
  savedItems: Record<string, SavedItemData>;
  toggleBookmark: (id: string, data?: any) => void;
  isBookmarked: (id: string) => boolean;
  getItemData: (id: string) => SavedItemData | null;
};

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

const STORAGE_IDS_KEY = 'portal_saved_bookmark_ids_v1';
const STORAGE_ITEMS_KEY = 'portal_saved_bookmark_items_v1';

export function BookmarkProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();

  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_IDS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved bookmark IDs from storage', e);
    }
    return [];
  });

  const [savedItems, setSavedItems] = useState<Record<string, SavedItemData>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_ITEMS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved bookmark items from storage', e);
    }
    return {};
  });

  // Sync with Firestore when logged into Firebase Auth
  useEffect(() => {
    let unsubscribeBookmarks: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      if (unsubscribeBookmarks) {
        unsubscribeBookmarks();
        unsubscribeBookmarks = null;
      }

      if (fbUser) {
        unsubscribeBookmarks = subscribeToBookmarks(fbUser.uid, (firestoreBookmarks) => {
          if (firestoreBookmarks && firestoreBookmarks.length > 0) {
            setSavedIds(prev => Array.from(new Set([...prev, ...firestoreBookmarks.map(b => b.targetId || b.id)])));
            setSavedItems(prev => {
              const next = { ...prev };
              firestoreBookmarks.forEach(b => {
                const bId = b.targetId || b.id;
                next[bId] = {
                  ...(b.data || {}),
                  id: bId,
                  category: b.targetCategory || b.data?.category || 'all',
                  title: b.targetTitle || b.data?.title || `Objava #${bId}`,
                };
              });
              return next;
            });
          }
        });
      }
    });

    return () => {
      if (unsubscribeBookmarks) unsubscribeBookmarks();
      unsubscribeAuth();
    };
  }, []);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_IDS_KEY, JSON.stringify(savedIds));
    } catch (e) {
      console.error('Failed to persist bookmark IDs', e);
    }
  }, [savedIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(savedItems));
    } catch (e) {
      console.error('Failed to persist bookmark items', e);
    }
  }, [savedItems]);

  const toggleBookmark = (id: string, data?: any) => {
    setSavedIds(prevIds => {
      const exists = prevIds.includes(id);
      if (exists) {
        // Remove bookmark from Firestore only if active Firebase Auth user exists
        if (auth.currentUser) {
          removeBookmarkInFirestore(auth.currentUser.uid, id).catch(console.error);
        }

        setSavedItems(prevItems => {
          const nextItems = { ...prevItems };
          delete nextItems[id];
          return nextItems;
        });
        return prevIds.filter(i => i !== id);
      } else {
        // Add bookmark
        const defaultData: Partial<SavedItemData> = DEFAULT_KNOWN_ITEMS[id] || {};
        const combined = { ...defaultData, ...(data || {}), id };
        const category = inferItemCategory(id, combined);
        const resolvedData: SavedItemData = {
          ...combined,
          category,
          title: combined.title || defaultData.title || `Objava #${id}`,
        };

        // Save bookmark to Firestore only if active Firebase Auth user exists
        if (auth.currentUser) {
          saveBookmarkInFirestore(auth.currentUser.uid, resolvedData).catch(console.error);
        }

        setSavedItems(prevItems => ({
          ...prevItems,
          [id]: resolvedData,
        }));
        return [...prevIds, id];
      }
    });
  };

  const isBookmarked = (id: string) => savedIds.includes(id);

  const getItemData = (id: string): SavedItemData | null => {
    return savedItems[id] || DEFAULT_KNOWN_ITEMS[id] || null;
  };

  return (
    <BookmarkContext.Provider value={{ savedIds, savedItems, toggleBookmark, isBookmarked, getItemData }}>
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmarks() {
  const context = useContext(BookmarkContext);
  if (!context) throw new Error('useBookmarks must be used within BookmarkProvider');
  return context;
}

