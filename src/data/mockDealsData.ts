export interface DealItem {
  id: string;
  title: string;
  subtitle?: string;
  partner: string;
  partnerRole?: string;
  partnerInitial?: string;
  partnerLogoBg?: string;
  partnerAvatar?: string;
  category: 'tehnika' | 'prehrana' | 'turizem' | 'sport' | 'dom' | 'avto';
  categoryName: string;
  region: string;
  discount: string;
  oldPrice?: string;
  newPrice?: string;
  expirationDate?: string;
  dealType: 'code' | 'flyer' | 'coupon' | 'bogo' | 'sale';
  dealTypeName: string;
  date: string;
  description: string;
  code?: string;
  link: string;
  votes: number;
  verifiedText?: string;
  isSuperDeal?: boolean;
  featured?: boolean;
  image?: string;
  images?: string[];
  embedCode?: string;
  statusTag?: 'expiring' | 'today' | 'exclusive' | 'shipping' | 'normal';
}

export interface VoucherCode {
  id: string;
  store: string;
  description: string;
  code: string;
  discount: string;
  verified: boolean;
}

export interface CatalogueItem {
  id: string;
  title: string;
  initial: string;
  logoBg: string;
  validity: string;
  pages: string;
  link: string;
}

export const TOP_VOUCHER_CODES: VoucherCode[] = [
  {
    id: 'vc-1',
    store: 'Big Bang',
    description: '-15 % na avdio opremo',
    code: 'AUDIO15',
    discount: '-15%',
    verified: true,
  },
  {
    id: 'vc-2',
    store: 'Polleo Sport SLO',
    description: '-20 % na proteine & vitamine',
    code: 'FITSLO20',
    discount: '-20%',
    verified: true,
  },
  {
    id: 'vc-3',
    store: 'dm drogerie markt',
    description: 'Brezplačna poštnina nad 25 €',
    code: 'DMSLOPOST',
    discount: 'Brezplačna dostava',
    verified: true,
  },
  {
    id: 'vc-4',
    store: 'Kranjska Gora Ski',
    description: '-10 % spomladanske karte',
    code: 'GORE10',
    discount: '-10%',
    verified: true,
  },
  {
    id: 'vc-5',
    store: 'Wolt Slovenija',
    description: 'Kupon 6 € za prvo naročilo hrane',
    code: 'PORTALWOLT',
    discount: '6 €',
    verified: true,
  },
];

export const CATALOGUES_DATA: CatalogueItem[] = [
  {
    id: 'cat-1',
    title: 'Mercator redni katalog',
    initial: 'M',
    logoBg: 'bg-error-container text-on-error-container font-black',
    validity: 'Velja še 3 dni',
    pages: '36 strani',
    link: 'https://www.mercator.si/akcije/',
  },
  {
    id: 'cat-2',
    title: 'Spar & Interspar ponudba',
    initial: 'SP',
    logoBg: 'bg-surface-container text-primary font-bold',
    validity: 'Velja do torka',
    pages: '44 strani',
    link: 'https://www.spar.si/akcije',
  },
  {
    id: 'cat-3',
    title: 'Bauhaus & Merkur - Dom & vrt',
    initial: 'BH',
    logoBg: 'bg-surface-container text-on-surface font-bold',
    validity: 'Pomladna akcija',
    pages: '28 strani',
    link: 'https://www.bauhaus.si',
  },
  {
    id: 'cat-4',
    title: 'Big Bang Outlet & Tehnika',
    initial: 'BB',
    logoBg: 'bg-primary-fixed text-on-primary-fixed font-bold',
    validity: 'Spomladanske ugodnosti',
    pages: '16 strani',
    link: 'https://www.bigbang.si/outlet/',
  },
];

// All appearance mock deals removed - only real user submitted deals are displayed
export const HERO_BENTO_DEALS: DealItem[] = [];
export const INITIAL_DEALS: DealItem[] = [];
