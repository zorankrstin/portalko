/**
 * Curated, zero-dependency SVG Data URL presets for default portal fallback images.
 * These load in 0ms, never experience CORS or HTTP 404 errors, and scale crisply on all screens.
 */

export interface FallbackPreset {
  id: string;
  name: string;
  description: string;
  categoryHint: string;
  dataUrl: string;
}

export const FALLBACK_PRESETS: FallbackPreset[] = [
  {
    id: 'portalko-editorial',
    name: 'Portalko Uradni Editorial',
    description: 'Eleganten smaragdno-moder barvni preliv z modernim geometrijskim vzorcem in logotipom Portalko.',
    categoryHint: 'Univerzalno (za vse vrste objav)',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="%230f172a" />
          <stop offset="50%" stop-color="%23064e3b" />
          <stop offset="100%" stop-color="%23022c22" />
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="%2310b981" />
          <stop offset="100%" stop-color="%2306b6d4" />
        </linearGradient>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="1" fill="%23ffffff" fill-opacity="0.08"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(%23bg)" />
      <rect width="100%" height="100%" fill="url(%23grid)" />
      
      <!-- Ambient light circles -->
      <circle cx="250" cy="200" r="280" fill="%2310b981" fill-opacity="0.12" filter="blur(60px)" />
      <circle cx="950" cy="450" r="320" fill="%2306b6d4" fill-opacity="0.1" filter="blur(80px)" />
      
      <!-- Central Branding Badge -->
      <g transform="translate(600, 310)">
        <rect x="-140" y="-85" width="280" height="170" rx="28" fill="%23ffffff" fill-opacity="0.06" stroke="%23ffffff" stroke-opacity="0.15" stroke-width="2" />
        
        <!-- Logo Emblem -->
        <circle cx="0" cy="-25" r="32" fill="url(%23accent)" />
        <path d="M-12 -25 L12 -25 M0 -37 L0 -13" stroke="%23ffffff" stroke-width="4" stroke-linecap="round" />
        
        <text x="0" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="900" fill="%23ffffff" text-anchor="middle" letter-spacing="4">PORTALKO</text>
        <text x="0" y="55" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="%2310b981" text-anchor="middle" letter-spacing="2">SLOVENSKI SPLETNI PORTAL</text>
      </g>
      
      <!-- Bottom bar -->
      <rect x="0" y="665" width="1200" height="10" fill="url(%23accent)" />
    </svg>`,
  },
  {
    id: 'slovenia-nature',
    name: 'Slovenska Narava & Gore',
    description: 'Silhuete gorskih vrhov z zlatim sončnim zahodom, idealno za novice, izlete in lokalne vsebine.',
    categoryHint: 'Novice, izleti, narava',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
      <defs>
        <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="%231e1b4b" />
          <stop offset="45%" stop-color="%234338ca" />
          <stop offset="75%" stop-color="%23d97706" />
          <stop offset="100%" stop-color="%23f59e0b" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(%23sky)" />
      
      <!-- Sun -->
      <circle cx="600" cy="420" r="90" fill="%23fef3c7" fill-opacity="0.9" />
      
      <!-- Distant Mountains -->
      <polygon points="0,520 220,380 430,490 600,340 780,480 980,360 1200,500 1200,675 0,675" fill="%23312e81" fill-opacity="0.7" />
      
      <!-- Mid Mountains -->
      <polygon points="0,560 180,440 360,540 520,410 740,560 920,430 1120,530 1200,480 1200,675 0,675" fill="%231e1b4b" fill-opacity="0.9" />
      
      <!-- Foreground Ridge -->
      <polygon points="0,590 120,530 320,620 540,510 760,630 1020,540 1200,610 1200,675 0,675" fill="%230f172a" />
      
      <!-- Forest silhouette trees -->
      <g fill="%23090d16">
        <polygon points="50,675 65,580 80,675" />
        <polygon points="75,675 90,560 105,675" />
        <polygon points="100,675 115,590 130,675" />
        <polygon points="180,675 195,570 210,675" />
        <polygon points="205,675 220,550 235,675" />
        <polygon points="850,675 865,575 880,675" />
        <polygon points="875,675 890,550 905,675" />
        <polygon points="1050,675 1065,570 1080,675" />
      </g>
      
      <!-- Badge -->
      <g transform="translate(60, 60)">
        <rect width="180" height="42" rx="12" fill="%230f172a" fill-opacity="0.7" stroke="%23ffffff" stroke-opacity="0.2" />
        <text x="90" y="27" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="%23ffffff" text-anchor="middle">SLOVENIJA</text>
      </g>
    </svg>`,
  },
  {
    id: 'events-culture',
    name: 'Kultura & Dogodki',
    description: 'Živahna odrska svetloba, festivali in prireditve, odlično za koledar dogodkov brez lastnih fotografij.',
    categoryHint: 'Dogodki, koncerti, kultura',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
      <defs>
        <linearGradient id="stage" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="%2318181b" />
          <stop offset="50%" stop-color="%2327272a" />
          <stop offset="100%" stop-color="%2309090b" />
        </linearGradient>
        <radialGradient id="spot1" cx="30%" cy="20%" r="60%">
          <stop offset="0%" stop-color="%23ec4899" stop-opacity="0.8" />
          <stop offset="100%" stop-color="%23ec4899" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="spot2" cx="70%" cy="25%" r="65%">
          <stop offset="0%" stop-color="%238b5cf6" stop-opacity="0.8" />
          <stop offset="100%" stop-color="%238b5cf6" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="spot3" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stop-color="%233b82f6" stop-opacity="0.5" />
          <stop offset="100%" stop-color="%233b82f6" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(%23stage)" />
      
      <!-- Stage Lights Beams -->
      <circle cx="360" cy="180" r="380" fill="url(%23spot1)" />
      <circle cx="840" cy="180" r="420" fill="url(%23spot2)" />
      <circle cx="600" cy="380" r="320" fill="url(%23spot3)" />
      
      <!-- Soundwave & Equalizer visual -->
      <g fill="%23ffffff" fill-opacity="0.25">
        <rect x="420" y="440" width="12" height="90" rx="6" />
        <rect x="445" y="400" width="12" height="130" rx="6" />
        <rect x="470" y="460" width="12" height="70" rx="6" />
        <rect x="495" y="380" width="12" height="150" rx="6" />
        <rect x="520" y="340" width="12" height="190" rx="6" />
        <rect x="545" y="420" width="12" height="110" rx="6" />
        <rect x="570" y="320" width="12" height="210" rx="6" />
        <rect x="595" y="300" width="12" height="230" rx="6" />
        <rect x="620" y="340" width="12" height="190" rx="6" />
        <rect x="645" y="410" width="12" height="120" rx="6" />
        <rect x="670" y="360" width="12" height="170" rx="6" />
        <rect x="695" y="430" width="12" height="100" rx="6" />
        <rect x="720" y="390" width="12" height="140" rx="6" />
        <rect x="745" y="450" width="12" height="80" rx="6" />
        <rect x="770" y="420" width="12" height="110" rx="6" />
      </g>
      
      <!-- Center Text Badge -->
      <g transform="translate(600, 220)">
        <rect x="-130" y="-35" width="260" height="70" rx="20" fill="%2309090b" fill-opacity="0.8" stroke="%238b5cf6" stroke-width="2" />
        <text x="0" y="8" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="900" fill="%23ffffff" text-anchor="middle" letter-spacing="3">DOGODKI & UMETNOST</text>
      </g>
    </svg>`,
  },
  {
    id: 'marketplace-clean',
    name: 'Mali Oglasi & Tržnica',
    description: 'Moderen, čist in profesionalen motiv za male oglase, tehniko, opremo ter prodajo.',
    categoryHint: 'Mali oglasi, nepremičnine, prodaja',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
      <defs>
        <linearGradient id="marketBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="%230f766e" />
          <stop offset="60%" stop-color="%23115e59" />
          <stop offset="100%" stop-color="%23134e4a" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(%23marketBg)" />
      
      <!-- Geometric overlapping rings -->
      <circle cx="850" cy="300" r="260" fill="none" stroke="%23ffffff" stroke-opacity="0.12" stroke-width="3" />
      <circle cx="850" cy="300" r="180" fill="none" stroke="%23ffffff" stroke-opacity="0.12" stroke-width="2" />
      <circle cx="350" cy="400" r="240" fill="none" stroke="%23ffffff" stroke-opacity="0.1" stroke-width="3" />
      
      <!-- Marketplace Emblem Center -->
      <g transform="translate(600, 310)">
        <rect x="-150" y="-70" width="300" height="140" rx="24" fill="%23042f2e" fill-opacity="0.75" stroke="%232dd4bf" stroke-width="2" />
        <text x="0" y="5" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="900" fill="%23ffffff" text-anchor="middle" letter-spacing="3">MALI OGLASI</text>
        <text x="0" y="34" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600" fill="%232dd4bf" text-anchor="middle" letter-spacing="1">PREVERJENE PONUDBE & OPREMA</text>
      </g>
    </svg>`,
  },
];
