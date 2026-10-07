import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

function cleanDataForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export type CategorySection = 'ads' | 'events' | 'blog' | 'deals';

export interface SubCategory {
  id: string;
  name: string;
  description?: string;
  order?: number;
  tertiaryItems?: string[];
}

export interface CategoryItem {
  id: string;
  name: string;
  section: CategorySection;
  icon?: string;
  description?: string;
  subcategories: SubCategory[];
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SloveniaRegion {
  id: string;
  name: string;
  shortName: string;
  cities: string[];
}

export const SLOVENIA_REGIONS: SloveniaRegion[] = [
  { 
    id: 'osrednjeslovenska', 
    name: 'Osrednjeslovenska', 
    shortName: 'Ljubljana & Osrednja', 
    cities: [
      'Ljubljana', 'Domžale', 'Kamnik', 'Grosuplje', 'Vrhnika', 'Logatec', 'Medvode', 
      'Litija', 'Ivančna Gorica', 'Brezovica', 'Mengeš', 'Škofljica', 'Trzin', 'Vodice', 
      'Komenda', 'Ig', 'Borovnica', 'Horjul', 'Dobrova', 'Lukovica', 'Moravče', 'Šmartno pri Litiji'
    ] 
  },
  { 
    id: 'podravska', 
    name: 'Podravska', 
    shortName: 'Maribor & Podravje', 
    cities: [
      'Maribor', 'Ptuj', 'Slovenska Bistrica', 'Ormož', 'Lenart', 'Ruše', 'Pesnica', 
      'Šentilj', 'Hoče-Slivnica', 'Miklavž na Dravskem polju', 'Rače-Fram', 'Kidričevo', 
      'Duplek', 'Majšperk', 'Gorišnica', 'Dornava', 'Videm pri Ptuju', 'Poljčane', 
      'Makole', 'Selnica ob Dravi', 'Sveta Trojica', 'Benedikt', 'Cerkvenjak', 'Destrnik', 'Žetale'
    ] 
  },
  { 
    id: 'savinjska', 
    name: 'Savinjska', 
    shortName: 'Celje & Savinjska', 
    cities: [
      'Celje', 'Velenje', 'Žalec', 'Slovenske Konjice', 'Šentjur', 'Rogaška Slatina', 
      'Laško', 'Šoštanj', 'Zreče', 'Mozirje', 'Prebold', 'Polzela', 'Vransko', 
      'Braslovče', 'Šmarje pri Jelšah', 'Podčetrtek', 'Kozje', 'Rogatec', 'Ljubno', 
      'Gornji Grad', 'Luče', 'Solčava', 'Vojnik', 'Dobrna', 'Štore', 'Tabor', 'Rečica ob Savinji'
    ] 
  },
  { 
    id: 'gorenjska', 
    name: 'Gorenjska', 
    shortName: 'Kranj & Gorenjska', 
    cities: [
      'Kranj', 'Jesenice', 'Škofja Loka', 'Radovljica', 'Bled', 'Tržič', 'Bohinj', 
      'Kranjska Gora', 'Železniki', 'Žiri', 'Šenčur', 'Cerklje na Gorenjskem', 'Naklo', 
      'Preddvor', 'Gorje', 'Žirovnica', 'Gorenja vas'
    ] 
  },
  { 
    id: 'obalnokraska', 
    name: 'Obalno-kraška', 
    shortName: 'Koper & Obala', 
    cities: [
      'Koper', 'Izola', 'Piran', 'Portorož', 'Sežana', 'Ankaran', 'Hrpelje-Kozina', 'Divača', 'Komen'
    ] 
  },
  { 
    id: 'goriska', 
    name: 'Goriška', 
    shortName: 'Nova Gorica & Posočje', 
    cities: [
      'Nova Gorica', 'Ajdovščina', 'Tolmin', 'Idrija', 'Bovec', 'Kobarid', 
      'Šempeter pri Gorici', 'Brda', 'Cerkno', 'Vipava', 'Kanal ob Soči', 'Miren', 'Renče'
    ] 
  },
  { 
    id: 'jugovzhodna', 
    name: 'Jugovzhodna Slovenija', 
    shortName: 'Novo mesto & Dolenjska', 
    cities: [
      'Novo mesto', 'Kočevje', 'Črnomelj', 'Trebnje', 'Metlika', 'Ribnica', 'Šentjernej', 
      'Semič', 'Žužemberk', 'Dolenjske Toplice', 'Šmarješke Toplice', 'Mirna Peč', 'Straža', 
      'Mokronog', 'Mirna', 'Kostel', 'Sodražica', 'Osilnica'
    ] 
  },
  { 
    id: 'pomurska', 
    name: 'Pomurska', 
    shortName: 'Murska Sobota & Pomurje', 
    cities: [
      'Murska Sobota', 'Lendava', 'Gornja Radgona', 'Ljutomer', 'Beltinci', 'Radenci', 
      'Moravske Toplice', 'Puconci', 'Tišina', 'Črenšovci', 'Turnišče', 'Kuzma', 
      'Rogašovci', 'Grad', 'Gornji Petrovci', 'Šalovci', 'Odranci', 'Dobrovnik', 'Veržej', 'Križevci', 'Apače'
    ] 
  },
  { 
    id: 'koroska', 
    name: 'Koroška', 
    shortName: 'Slovenj Gradec & Koroška', 
    cities: [
      'Slovenj Gradec', 'Ravne na Koroškem', 'Dravograd', 'Prevalje', 'Radlje ob Dravi', 
      'Mežica', 'Črna na Koroškem', 'Vuzenica', 'Muta', 'Mislinja', 'Podvelka', 'Ribnica na Pohorju'
    ] 
  },
  { 
    id: 'posavska', 
    name: 'Posavska', 
    shortName: 'Krško & Posavje', 
    cities: [
      'Krško', 'Brežice', 'Sevnica', 'Kostanjevica na Krki', 'Radeče', 'Bistrica ob Sotli'
    ] 
  },
  { 
    id: 'zasavska', 
    name: 'Zasavska', 
    shortName: 'Trbovlje & Zasavje', 
    cities: [
      'Trbovlje', 'Zagorje ob Savi', 'Hrastnik'
    ] 
  },
  { 
    id: 'primorskonotranjska', 
    name: 'Primorsko-notranjska', 
    shortName: 'Postojna & Notranjska', 
    cities: [
      'Postojna', 'Ilirska Bistrica', 'Cerknica', 'Pivka', 'Loška dolina', 'Bloke'
    ] 
  },
];

export const POPULAR_SLOVENIA_TOWNS: string[] = [
  'Ljubljana',
  'Maribor',
  'Celje',
  'Kranj',
  'Koper',
  'Novo mesto',
  'Velenje',
  'Nova Gorica',
  'Ptuj',
  'Murska Sobota',
  'Jesenice',
  'Trbovlje',
  'Kamnik',
  'Domžale',
  'Škofja Loka',
  'Izola',
  'Postojna',
  'Kočevje',
  'Slovenj Gradec',
  'Ravne na Koroškem',
  'Krško',
  'Brežice',
  'Grosuplje',
  'Ajdovščina',
  'Radovljica',
  'Zagorje ob Savi',
  'Slovenska Bistrica',
  'Slovenske Konjice',
  'Bled',
  'Idrija',
  'Sežana',
  'Piran',
  'Portorož',
  'Vrhnika',
  'Logatec',
  'Tržič',
  'Črnomelj',
  'Hrastnik',
  'Gornja Radgona',
  'Ljutomer',
  'Sevnica',
  'Rogaška Slatina',
  'Laško',
  'Žalec',
  'Ilirska Bistrica',
  'Tolmin',
  'Cerknica',
  'Trebnje',
  'Ribnica',
  'Dravograd',
  'Medvode',
  'Mengeš',
  'Litija',
  'Lendava',
  'Bohinj',
  'Kranjska Gora',
  'Bovec',
  'Kobarid',
  'Ankaran',
  'Šentjur',
  'Prevalje',
  'Ruše',
  'Ormož',
  'Lenart',
  'Metlika',
  'Radenci',
  'Moravske Toplice',
  'Vipava',
  'Brezovica',
  'Ivančna Gorica'
];

/**
 * Returns a deduplicated, alphabetically sorted list of all cities and towns in Slovenia.
 */
export function getAllSloveniaCities(): string[] {
  const set = new Set<string>();
  SLOVENIA_REGIONS.forEach(reg => {
    reg.cities.forEach(c => set.add(c.trim()));
  });
  POPULAR_SLOVENIA_TOWNS.forEach(t => set.add(t.trim()));
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'sl'));
}

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  // ---------------- MALI OGLASI ----------------
  {
    id: 'ads-avto-moto',
    name: 'Avto-moto',
    section: 'ads',
    icon: '🚗',
    description: 'Vozila, motorji, plovila, rezervni deli in dodatna oprema',
    order: 1,
    subcategories: [
      { id: 'osebna-vozila', name: 'Osebna vozila', description: 'Rabljeni in novi avtomobili' },
      { id: 'motorna-kolesa', name: 'Motorna kolesa & skuterji', description: 'Motorji, mopedi, štirikolesniki' },
      { id: 'gospodarska-vozila', name: 'Gospodarska & tovorna vozila', description: 'Kombiji, vlačilci, dostavna vozila' },
      { id: 'rezervni-deli', name: 'Rezervni deli & oprema', description: 'Karoserija, motor, elektronika, dodatki' },
      { id: 'pnevmatike-platisca', name: 'Pnevmatike & platišča', description: 'Zimske, letne gume, alu platišča' },
      { id: 'bivalniki-navtika', name: 'Prikolice, bivalniki & navtika', description: 'Avtodomi, čolni, prikolice' },
    ],
  },
  {
    id: 'ads-nepremicnine',
    name: 'Nepremičnine',
    section: 'ads',
    icon: '🏠',
    description: 'Stanovanja, hiše, parcele, poslovni prostori in počitniške hiše',
    order: 2,
    subcategories: [
      { id: 'stanovanja-prodaja', name: 'Stanovanja (prodaja)', description: 'Garsonjere, 1-sobna, večsobna stanovanja' },
      { id: 'stanovanja-oddaja', name: 'Stanovanja (oddaja)', description: 'Dolgoročni in kratkoročni najem stanovanj' },
      { id: 'hise-prodaja', name: 'Hiše (prodaja)', description: 'Samostojne, vrstne hiše in dvojčki' },
      { id: 'hise-oddaja', name: 'Hiše (oddaja)', description: 'Najem hiš in bivalnih enot' },
      { id: 'posesti-parcele', name: 'Posesti & parcele', description: 'Zazidljiva, kmetijska in gozdna zemljišča' },
      { id: 'poslovni-prostori', name: 'Poslovni prostori', description: 'Pisarne, skladišča, trgovski lokali' },
      { id: 'pocitniski-objekti', name: 'Počitniški objekti', description: 'Vikendi, apartmaji na morju ali v gorah' },
    ],
  },
  {
    id: 'ads-tehnika',
    name: 'Tehnika & Elektronika',
    section: 'ads',
    icon: '📱',
    description: 'Pametni telefoni, računalniki, TV, avdio, bela tehnika in pripomočki',
    order: 3,
    subcategories: [
      { id: 'telefoni-tablice', name: 'Pametni telefoni & tablice', description: 'iPhone, Samsung, Xiaomi in dodatki' },
      { id: 'racunalniki-prenosniki', name: 'Računalniki & prenosniki', description: 'Laptops, PC konfiguracije, monitorji' },
      { id: 'tv-avdio-video', name: 'TV, avdio & hi-fi', description: 'Pametni televizorji, ozvočenje, zvočniki' },
      { id: 'foto-kamere', name: 'Fotoaparati & kamere', description: 'DSLR, brezzrcalni aparati, objektivi' },
      { id: 'gaming-konzole', name: 'Gaming & konzole', description: 'PlayStation, Xbox, Nintendo, igre' },
      { id: 'bela-tehnika', name: 'Bela tehnika & aparati', description: 'Pralni stroji, hladilniki, kuhinjski aparati' },
    ],
  },
  {
    id: 'ads-dom-vrt',
    name: 'Dom in vrt',
    section: 'ads',
    icon: '🛋️',
    description: 'Pohištvo, orodje, vrtna oprema, gradbeni material in bivalni dekor',
    order: 4,
    subcategories: [
      { id: 'pohistvo-oprema', name: 'Pohištvo & notranja oprema', description: 'Dnevne sobe, spalnice, kuhinje, omare' },
      { id: 'orodje-stroji', name: 'Orodje & delovni stroji', description: 'Ročno in električno orodje, kosilnice' },
      { id: 'vrt-rastline', name: 'Vrt & urejanje okolice', description: 'Rastline, sadike, vrtno pohištvo, žari' },
      { id: 'gradbeni-material', name: 'Gradbeni material', description: 'Izolacija, les, ploščice, stavbno pohištvo' },
      { id: 'ogrevanje-hlajenje', name: 'Ogrevanje & klima', description: 'Kamini, toplotne črpalke, drva, klime' },
    ],
  },
  {
    id: 'ads-sport-prosti-cas',
    name: 'Šport & Prosti čas',
    section: 'ads',
    icon: '🚲',
    description: 'Kolesa, zimska oprema, fitnes pripomočki, pohodništvo in hobiji',
    order: 5,
    subcategories: [
      { id: 'kolesarstvo', name: 'Kolesarstvo', description: 'Gorska, cestna, električna kolesa in oprema' },
      { id: 'zimski-sporti', name: 'Zimski športi', description: 'Smuči, snežne deske, drsalke, smučarska oblačila' },
      { id: 'fitnes-vadba', name: 'Fitnes & vadba', description: 'Uteži, naprave, trenažerji, vadbeni rekviziti' },
      { id: 'pohodnistvo-kamp', name: 'Pohodništvo & kampiranje', description: 'Nahrbtniki, šotori, planinska obutev' },
      { id: 'vodni-sporti', name: 'Vodni športi', description: 'SUP deske, potapljaška oprema, kajaki' },
    ],
  },
  {
    id: 'ads-storitve-delo',
    name: 'Storitve & Zaposlitev',
    section: 'ads',
    icon: '💼',
    description: 'Ponudba in povpraševanje po delu, obrtniške storitve in inštrukcije',
    order: 6,
    subcategories: [
      { id: 'ponujam-delo', name: 'Ponujam delo', description: 'Zaposlitveni oglasi, študentsko delo' },
      { id: 'iscem-delo', name: 'Iščem delo', description: 'Iskalci zaposlitve in samostojni izvajalci' },
      { id: 'obrt-prenova', name: 'Obrt & gradbena dela', description: 'Slikopleskarstvo, mizarstvo, vodovod, elektrika' },
      { id: 'servis-popravila', name: 'Servis & tehnična pomoč', description: 'Popravilo računalnikov, avtomehanika' },
      { id: 'instrukcije-tecaji', name: 'Inštrukcije & učenje', description: 'Učne inštrukcije, tuji jeziki, glasbene ure' },
    ],
  },

  // ---------------- DOGODKI ----------------
  {
    id: 'events-glasba-koncerti',
    name: 'Glasba & Koncerti',
    section: 'events',
    icon: '🎵',
    description: 'Koncerti v živo, klubski večeri, festivali in glasbene prireditve',
    order: 1,
    subcategories: [
      { id: 'rock-pop', name: 'Rock & Pop', description: 'Koncerti domačih in tujih skupin' },
      { id: 'elektronska-klubi', name: 'Elektronska glasba & klubi', description: 'DJ večeri, techno, house, bass' },
      { id: 'klasika-jazz', name: 'Klasika, jazz & blues', description: 'Filharmonija, simfonični orkestri, jazz klubi' },
      { id: 'narodnozabavna', name: 'Narodnozabavna & veselice', description: 'Tradicionalne slovenske veselice in ansambli' },
      { id: 'akusticni-veceri', name: 'Akustični & kantavtorski večeri', description: 'Intimni akustični koncerti in kantavtorji' },
    ],
  },
  {
    id: 'events-kultura-gledalisce',
    name: 'Kultura & Gledališče',
    section: 'events',
    icon: '🎭',
    description: 'Predstave, razstave, filmske projekcije, stand-up in literatura',
    order: 2,
    subcategories: [
      { id: 'gledaliske-predstave', name: 'Gledališke predstave', description: 'Drame, komedije, opere in balet' },
      { id: 'razstave-muzeji', name: 'Razstave & muzeji', description: 'Likovne razstave, muzejske noči, galerije' },
      { id: 'kino-festivali', name: 'Kino & filmski festivali', description: 'Premierne projekcije, art kino, filmski tedni' },
      { id: 'stand-up-komedija', name: 'Stand-up & komedija', description: 'Večeri smeha, monokomedije, improvizacija' },
      { id: 'literarni-veceri', name: 'Literarni večeri & poezija', description: 'Predstavitve knjig, bralni klubi' },
    ],
  },
  {
    id: 'events-sport-rekreacija',
    name: 'Šport & Rekreacija',
    section: 'events',
    icon: '🏆',
    description: 'Teki, kolesarski maratoni, pohodi, turnirji in rekreacijski dnevi',
    order: 3,
    subcategories: [
      { id: 'teki-maratoni', name: 'Teki & maratoni', description: 'Ulični teki, trail maratoni, nočni teki' },
      { id: 'kolesarjenje-maratoni', name: 'Kolesarska tekmovanja & izleti', description: 'Franja, maratoni in rekreativne runde' },
      { id: 'organizirani-pohodi', name: 'Organizirani pohodi', description: 'Pohodi po planinskih in lokalnih poteh' },
      { id: 'turnirji-prvenstva', name: 'Turnirji & prvenstva', description: 'Košarka, nogomet, tenis, odbojka' },
      { id: 'vadbe-na-prostem', name: 'Joga & vadbe na prostem', description: 'Skupinske vadbe v parkih in ob jezerih' },
    ],
  },
  {
    id: 'events-festivali-sejmi',
    name: 'Festivali & Sejmi',
    section: 'events',
    icon: '🎪',
    description: 'Mestni prazniki, kulinarični sejmi, obrtniške stojnice in praznovanja',
    order: 4,
    subcategories: [
      { id: 'kulinarični-festivali', name: 'Kulinarični festivali & ulična hrana', description: 'Odprta kuhna, festivali čokolade, piva in vina' },
      { id: 'mestni-prazniki', name: 'Mestni festivali & karnevali', description: 'Festival Lent, Pivo in cvetje, pustovanja' },
      { id: 'kmecki-obrtniski-sejmi', name: 'Sejmi & domača obrt', description: 'Kmetijski sejmi, sejem Agra, obrtniške tržnice' },
      { id: 'srednjeveski-etno', name: 'Srednjeveški & etno dnevi', description: 'Viteške igre, folklorni festivali' },
    ],
  },
  {
    id: 'events-druzina-otroci',
    name: 'Družina & Otroci',
    section: 'events',
    icon: '👨‍👩‍👧‍👦',
    description: 'Lutkovno gledališče, ustvarjalne delavnice in družinska doživetja',
    order: 5,
    subcategories: [
      { id: 'lutke-otroske-predstave', name: 'Lutkovne & otroške predstave', description: 'Predstave za najmlajše v gledališčih in knjižnicah' },
      { id: 'ustvarjalne-delavnice', name: 'Ustvarjalne & naravoslovne delavnice', description: 'Delavnice robotike, risanja, kuhanja za otroke' },
      { id: 'druzinski-izleti-dnevi', name: 'Družinski dnevi & animacija', description: 'Tematski parki, družinske igre, športni dnevi' },
    ],
  },
  {
    id: 'events-posel-izobrazevanje',
    name: 'Posel & Delavnice',
    section: 'events',
    icon: '💡',
    description: 'Konference, strokovna predavanja, tečaji in poslovno mreženje',
    order: 6,
    subcategories: [
      { id: 'konference-forumi', name: 'Konference & strokovni forumi', description: 'Gospodarske, tehnološke in zdravstvene konference' },
      { id: 'tecaji-delavnice', name: 'Tečaji & praktične delavnice', description: 'Programiranje, marketing, vodenje, finance' },
      { id: 'poslovno-mrezenje', name: 'Poslovno mreženje & startupi', description: 'Mreženje za podjetnike, predstavitve idej' },
    ],
  },

  // ---------------- BLOG ----------------
  {
    id: 'blog-turizem-izleti',
    name: 'Turizem & Izleti',
    section: 'blog',
    icon: '🏔️',
    description: 'Predlogi za enodnevne izlete, pohode po Sloveniji in skrite bisere',
    order: 1,
    subcategories: [
      { id: 'slovenski-biseri', name: 'Slovenski biseri & narava', description: 'Slapovi, soteske, jezera in naravni parki' },
      { id: 'enodnevni-izleti', name: 'Enodnevni družinski izleti', description: 'Lahki izleti, primerni za vse generacije' },
      { id: 'hribi-planinske-poti', name: 'Hribi & planinske poti', description: 'Vzponi na slovenske vrhove in obisk koč' },
      { id: 'vikend-oddih-wellness', name: 'Vikend oddih & wellness', description: 'Razvajanje v termah in butičnih hotelih' },
      { id: 'skriti-koticki', name: 'Manj znani skriti kotički', description: 'Odkrivanje neznanih lepot Slovenije' },
    ],
  },
  {
    id: 'blog-kulinarika-recepti',
    name: 'Kulinarika & Recepti',
    section: 'blog',
    icon: '🍲',
    description: 'Tradicionalne slovenske dobrote, sodobni recepti, vinarstvo in kulinarični vodiči',
    order: 2,
    subcategories: [
      { id: 'tradicionalne-jedi', name: 'Tradicionalne slovenske jedi', description: 'Potica, gibanica, jota, štruklji in žganci' },
      { id: 'sodobna-kuhinja', name: 'Hitra & sodobna kuhinja', description: 'Enostavna kosila za vsak dan' },
      { id: 'vino-lokalna-pijaca', name: 'Vinska kultura & domači napitki', description: 'Slovenska vinorodna območja in kleti' },
      { id: 'zdrava-prehrana', name: 'Zdravi & sezonski recepti', description: 'Prehrana iz lokalnih sestavin' },
      { id: 'priporocila-gostiln', name: 'Kulinarične poti & domače gostilne', description: 'Kje v Sloveniji najbolje jesti' },
    ],
  },
  {
    id: 'blog-tehnologija-inovacije',
    name: 'Tehnologija & Inovacije',
    section: 'blog',
    icon: '💻',
    description: 'Digitalni trendi, umetna inteligenca, spletna varnost in pametni pripomočki',
    order: 3,
    subcategories: [
      { id: 'umetna-inteligenca', name: 'Umetna inteligenca & orodja', description: 'Kako uporabljati AI v vsakdanjem življenju' },
      { id: 'pametni-telefoni-gadgeti', name: 'Pametni pripomočki & gadgeti', description: 'Ocenjevanje najnovejših naprav' },
      { id: 'spletna-varnost', name: 'Spletna varnost & varovanje podatkov', description: 'Zaščita pred spletnimi prevarami in vdorom' },
      { id: 'pametni-dom', name: 'Pametni dom & IoT', description: 'Avtomatizacija doma, razsvetljava, varčevanje' },
    ],
  },
  {
    id: 'blog-dom-vrt-gradnja',
    name: 'Dom, Vrt & Gradnja',
    section: 'blog',
    icon: '🏡',
    description: 'Nasveti za prenovo, energijsko učinkovitost, vrtnarjenje in domače mojstre',
    order: 4,
    subcategories: [
      { id: 'prenova-ambient', name: 'Urejanje & prenova doma', description: 'Trendi v notranjem oblikovanju in pohištvu' },
      { id: 'naredi-sam-diy', name: 'Naredi sam (DIY) vodiči', description: 'Praktična navodila za domače mojstre' },
      { id: 'sezonski-vrt', name: 'Sezonsko vrtnarjenje & rastline', description: 'Kdaj saditi, kako obrezovati in negovati vrt' },
      { id: 'energetska-ucinkovitost', name: 'Energetska sanacija & sončne elektrarne', description: 'Kako zmanjšati stroške ogrevanja in elektrike' },
    ],
  },
  {
    id: 'blog-finance-gospodarstvo',
    name: 'Finance & Podjetništvo',
    section: 'blog',
    icon: '📈',
    description: 'Osebne finance, varčevanje, investiranje in slovenske podjetniške zgodbe',
    order: 5,
    subcategories: [
      { id: 'osebne-finance', name: 'Osebne finance & varčevanje', description: 'Pametno razporejanje mesečnega proračuna' },
      { id: 'slovenski-podjetniki', name: 'Zgodbe slovenskih podjetnikov', description: 'Intervjuji z ustvarjalci uspešnih zgodb' },
      { id: 'nepremicninski-nasveti', name: 'Nepremičninski trg & nakup stanovanja', description: 'Postopek nakupa, krediti in pravni vidiki' },
      { id: 'investicije-skladi', name: 'Investiranje & plemenitenje premoženja', description: 'Osnove skladov, nepremičnin in naložb' },
    ],
  },
  {
    id: 'blog-zdravje-zivljenjski-slog',
    name: 'Zdravje & Dobro počutje',
    section: 'blog',
    icon: '🌿',
    description: 'Prehrana, gibanje, duševno zdravje in naravni pristopi k vitalnosti',
    order: 6,
    subcategories: [
      { id: 'zdrav-zivljenjski-slog', name: 'Zdrav življenjski slog & gibanje', description: 'Navade za več energije in vitalnosti' },
      { id: 'dusevno-zdravje-stres', name: 'Premagovanje stresa & duševni mir', description: 'Meditacija, sprostitev, spanje' },
      { id: 'zelišča-narava', name: 'Domača lekarna & zelišča', description: 'Moč slovenskih zdravilnih rastlin in čajev' },
    ],
  },

  // ---------------- UGODNOSTI ----------------
  {
    id: 'deals-tehnika-elektronika',
    name: 'Tehnika & Elektronika',
    section: 'deals',
    icon: '⚡',
    description: 'Popusti na računalnike, telefone, televizorje in male gospodinjske aparate',
    order: 1,
    subcategories: [
      { id: 'pametni-telefoni-akcija', name: 'Pametni telefoni & dodatki', description: 'Popusti na telefone, ovitke in polnilce' },
      { id: 'prenosniki-racunalniki', name: 'Prenosniki & monitorji', description: 'Akcije za študente in delo od doma' },
      { id: 'tv-avdio-znizanja', name: 'TV sprejemniki & zvočniki', description: 'Soundbari, slušalke in OLED televizorji' },
      { id: 'bela-tehnika-ugodno', name: 'Bela tehnika & kuhinjski aparati', description: 'Popusti pri nakupu kuhinjskih naprav' },
    ],
  },
  {
    id: 'deals-trgovine-hrana',
    name: 'Trgovine & Hrana',
    section: 'deals',
    icon: '🛒',
    description: 'Katalogi živil, kuponi za restavracije, dostavo hrane in lokalne pridelke',
    order: 2,
    subcategories: [
      { id: 'supermarketi-katalogi', name: 'Supermarketi & živilske akcije', description: 'Tedenske akcije v trgovskih verigah' },
      { id: 'restavracije-dostava', name: 'Restavracije & dostava hrane', description: 'Popusti na kosila, pizze in dostavne kupone' },
      { id: 'eko-lokalni-pridelki', name: 'Eko pridelki & lokalne kmetije', description: 'Ugodnosti pri nakupu slovenskih pridelkov' },
    ],
  },
  {
    id: 'deals-moda-lepota',
    name: 'Moda & Lepota',
    section: 'deals',
    icon: '✨',
    description: 'Sezonska znižanja oblačil, športne obutve, kozmetike in modnih dodatkov',
    order: 3,
    subcategories: [
      { id: 'sezonska-znizanja', name: 'Sezonska znižanja oblačil', description: 'Spomladanski, poletni in zimski popusti' },
      { id: 'sportna-obutev-oblacila', name: 'Športna obutev & superge', description: 'Akcije na tekaške superge in trenirke' },
      { id: 'kozmetika-parfumi', name: 'Kozmetika & parfumi', description: 'Ugodnosti za nego obraza, telesa in dišave' },
    ],
  },
  {
    id: 'deals-dom-bivanje',
    name: 'Dom & Bivanje',
    section: 'deals',
    icon: '🛋️',
    description: 'Pohištvo, vzmetnice, vrtno orodje, barve in čistilni pripomočki',
    order: 4,
    subcategories: [
      { id: 'pohistvo-vzmetnice', name: 'Pohištvo & ležišča', description: 'Postelje, sedežne garniture in mize' },
      { id: 'vrt-bivanje-akcija', name: 'Vrtno pohištvo & oprema', description: 'Žari, senčniki in vrtne garniture' },
      { id: 'dekor-gospodinjstvo', name: 'Dekoracija & posoda', description: 'Gospodinjski pripomočki po znižanih cenah' },
    ],
  },
  {
    id: 'deals-potovanja-wellness',
    name: 'Potovanja & Wellness',
    section: 'deals',
    icon: '🏖️',
    description: 'Kuponi za terme, hotele, vikend pakete, masaže in doživetja',
    order: 5,
    subcategories: [
      { id: 'terme-wellness-kuponi', name: 'Terme & bazenske vstopnice', description: 'Kopanje, savne in wellness paketi' },
      { id: 'nocitve-hoteli-vikend', name: 'Nočitve & vikend paketi', description: 'Hoteli, glamping in apartmaji po Sloveniji' },
      { id: 'dozivetja-vstopnice', name: 'Vstopnice za doživetja & parke', description: 'Adrenalinski parki, muzeji, razstave' },
    ],
  },
  {
    id: 'deals-storitve-avto',
    name: 'Storitve & Avto',
    section: 'deals',
    icon: '🔧',
    description: 'Pnevmatike, avtoservis, zavarovalni paketi, mobilne naročnine in tečaji',
    order: 6,
    subcategories: [
      { id: 'avtoservis-pnevmatike', name: 'Pnevmatike & avtoservis', description: 'Sezonska menjava gum in pregled vozila' },
      { id: 'zavarovanja-narocnine', name: 'Zavarovanja & telekomunikacije', description: 'Popusti na zavarovalne police in mobilne pakete' },
      { id: 'izobrazevanja-tecaji', name: 'Izobraževanje & vozniški izpit', description: 'Ugodnejši tečaji tujih jezikov in šole vožnje' },
    ],
  },
];

const LOCAL_STORAGE_KEY = 'portalko_categories_cache';

// Load cached categories if present, ensuring default categories are preserved
function getCachedCategories(): CategoryItem[] {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return DEFAULT_CATEGORIES;
    }
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Map existing categories by ID
        const existingMap = new Map<string, CategoryItem>();
        // Add all defaults as base
        DEFAULT_CATEGORIES.forEach(cat => existingMap.set(cat.id, cat));
        // Overlay cached categories (which contain the admin's edits)
        parsed.forEach((cat: CategoryItem) => {
          if (cat && cat.id) {
            existingMap.set(cat.id, cat);
          }
        });
        return Array.from(existingMap.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
      }
    }
  } catch (e) {
    console.error('Error reading category cache from localStorage:', e);
  }
  return DEFAULT_CATEGORIES;
}

// In-memory categories store
let activeCategories: CategoryItem[] = getCachedCategories();
const listeners = new Set<(cats: CategoryItem[]) => void>();

function notifyListeners() {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(activeCategories));
  } catch (e) {
    // Ignore storage quota errors
  }
  listeners.forEach(cb => cb([...activeCategories]));
}

let isAutoSeeding = false;

/**
 * Subscribe to category changes in real time.
 * Connects directly to Firestore `/categories` collection.
 * Ensures all default categories are preserved and auto-seeded into Firestore,
 * while respecting admin edits and intentional deletions.
 */
export function subscribeToCategories(callback: (categories: CategoryItem[]) => void): () => void {
  // Call immediately with currently loaded categories
  callback([...activeCategories]);
  listeners.add(callback);

  try {
    const colRef = collection(db, 'categories');
    const unsubscribe = onSnapshot(colRef, async (snapshot) => {
      let deletedIds: string[] = [];
      const firestoreCats: CategoryItem[] = [];

      snapshot.forEach((d) => {
        if (d.id === '_meta' || d.id === '_metadata') {
          const mData = d.data();
          if (Array.isArray(mData?.deletedIds)) {
            deletedIds = mData.deletedIds;
          }
          return;
        }

        const data = d.data();
        if (data.isDeleted) return;

        const defCat = DEFAULT_CATEGORIES.find(c => c.id === d.id);
        const resolvedName = (data.name && String(data.name).trim()) || defCat?.name || '';
        const resolvedSection = (data.section && String(data.section).trim()) || defCat?.section || 'ads';
        const resolvedIcon = data.icon || defCat?.icon || '📁';
        const resolvedDesc = data.description || defCat?.description || '';
        const resolvedSubs = Array.isArray(data.subcategories) && data.subcategories.length > 0 
          ? data.subcategories 
          : (defCat?.subcategories || []);

        firestoreCats.push({
          id: d.id,
          name: resolvedName,
          section: resolvedSection as CategorySection,
          icon: resolvedIcon,
          description: resolvedDesc,
          subcategories: resolvedSubs,
          order: typeof data.order === 'number' ? data.order : (defCat?.order ?? 99),
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      // Map firestore categories by id (contains any custom edits by admin)
      const firestoreCatMap = new Map<string, CategoryItem>();
      firestoreCats.forEach(c => firestoreCatMap.set(c.id, c));

      // Identify any default categories that are not in Firestore and have not been deleted
      const missingDefaults: CategoryItem[] = [];
      DEFAULT_CATEGORIES.forEach(defCat => {
        if (!firestoreCatMap.has(defCat.id) && !deletedIds.includes(defCat.id)) {
          missingDefaults.push(defCat);
        }
      });

      // Combine firestore categories (preserving admin edits) with missing default categories
      // so categories never get wiped out when one is edited!
      const combined = [...firestoreCats, ...missingDefaults];
      combined.sort((a, b) => (a.order || 0) - (b.order || 0));

      activeCategories = combined;
      notifyListeners();

      // In the background, auto-seed any missing default categories to Firestore
      // so Firestore becomes the complete, permanent repository
      if (missingDefaults.length > 0 && !isAutoSeeding) {
        isAutoSeeding = true;
        (async () => {
          try {
            for (const missingCat of missingDefaults) {
              const docRef = doc(db, 'categories', missingCat.id);
              await setDoc(docRef, cleanDataForFirestore({
                ...missingCat,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }));
            }
          } catch (err) {
            console.error('Error auto-seeding missing categories to Firestore:', err);
          } finally {
            isAutoSeeding = false;
          }
        })();
      }
    }, (error) => {
      console.warn('Firestore categories subscription error (falling back to cache/defaults):', error);
    });

    return () => {
      listeners.delete(callback);
      unsubscribe();
    };
  } catch (err) {
    console.warn('Could not initialize Firestore categories listener, using local store:', err);
    return () => {
      listeners.delete(callback);
    };
  }
}

/**
 * Returns categories for a specific section ('ads', 'events', 'blog', 'deals').
 */
export function getCategoriesForSection(
  section: CategorySection, 
  categories: CategoryItem[] = activeCategories
): CategoryItem[] {
  return categories
    .filter(c => c.section === section)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Add a new category.
 */
export async function addCategory(category: Omit<CategoryItem, 'createdAt' | 'updatedAt'>): Promise<CategoryItem> {
  const newCat: CategoryItem = {
    ...category,
    subcategories: category.subcategories || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Optimistic local update
  activeCategories = [...activeCategories.filter(c => c.id !== newCat.id), newCat];
  notifyListeners();

  try {
    const docRef = doc(db, 'categories', newCat.id);
    await setDoc(docRef, cleanDataForFirestore(newCat));
  } catch (err) {
    console.error('Error adding category in Firestore:', err);
  }

  return newCat;
}

/**
 * Update an existing category.
 * Always saves the full category item so no fields (section, subcategories, etc.) are lost.
 */
export async function updateCategory(categoryId: string, data: Partial<CategoryItem>): Promise<void> {
  const existingIndex = activeCategories.findIndex(c => c.id === categoryId);
  const existingCat = existingIndex !== -1 
    ? activeCategories[existingIndex] 
    : DEFAULT_CATEGORIES.find(c => c.id === categoryId);

  const updated: CategoryItem = {
    id: categoryId,
    name: existingCat?.name || '',
    section: existingCat?.section || 'ads',
    icon: existingCat?.icon || '📁',
    description: existingCat?.description || '',
    subcategories: existingCat?.subcategories || [],
    order: existingCat?.order || 1,
    ...existingCat,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex !== -1) {
    activeCategories[existingIndex] = updated;
  } else {
    activeCategories.push(updated);
  }
  notifyListeners();

  try {
    const docRef = doc(db, 'categories', categoryId);
    await setDoc(docRef, cleanDataForFirestore(updated));
  } catch (err) {
    console.error('Error updating category in Firestore:', err);
  }
}

/**
 * Delete a category.
 * Also marks the ID in `_meta` so it is not resurrected by missing defaults logic.
 */
export async function deleteCategory(categoryId: string): Promise<void> {
  activeCategories = activeCategories.filter(c => c.id !== categoryId);
  notifyListeners();

  try {
    const docRef = doc(db, 'categories', categoryId);
    await deleteDoc(docRef);

    // Record deletion in _meta so it won't be re-seeded from defaults
    const metaRef = doc(db, 'categories', '_meta');
    const metaSnap = await getDoc(metaRef);
    const existingDeleted: string[] = metaSnap.exists() && Array.isArray(metaSnap.data()?.deletedIds)
      ? metaSnap.data()?.deletedIds
      : [];
    
    if (!existingDeleted.includes(categoryId)) {
      await setDoc(metaRef, {
        deletedIds: [...existingDeleted, categoryId],
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (err) {
    console.error('Error deleting category from Firestore:', err);
  }
}

/**
 * Add a subcategory to an existing category.
 */
export async function addSubcategory(categoryId: string, subcategory: SubCategory): Promise<void> {
  const cat = activeCategories.find(c => c.id === categoryId) || DEFAULT_CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return;

  const currentSubs = Array.isArray(cat.subcategories) ? cat.subcategories : [];
  const existingSubIdx = currentSubs.findIndex(s => s.id === subcategory.id);
  let updatedSubcategories: SubCategory[];
  if (existingSubIdx !== -1) {
    updatedSubcategories = currentSubs.map(s => s.id === subcategory.id ? subcategory : s);
  } else {
    updatedSubcategories = [...currentSubs, subcategory];
  }
  await updateCategory(categoryId, { subcategories: updatedSubcategories });
}

/**
 * Update a subcategory.
 */
export async function updateSubcategory(
  categoryId: string, 
  subcategoryId: string, 
  updatedData: Partial<SubCategory>
): Promise<void> {
  const cat = activeCategories.find(c => c.id === categoryId) || DEFAULT_CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return;

  const currentSubs = Array.isArray(cat.subcategories) ? cat.subcategories : [];
  const updatedSubcategories = currentSubs.map(s => {
    if (s.id === subcategoryId) {
      return { ...s, ...updatedData };
    }
    return s;
  });

  await updateCategory(categoryId, { subcategories: updatedSubcategories });
}

/**
 * Delete a subcategory.
 */
export async function deleteSubcategory(categoryId: string, subcategoryId: string): Promise<void> {
  const cat = activeCategories.find(c => c.id === categoryId) || DEFAULT_CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return;

  const currentSubs = Array.isArray(cat.subcategories) ? cat.subcategories : [];
  const updatedSubcategories = currentSubs.filter(s => s.id !== subcategoryId);
  await updateCategory(categoryId, { subcategories: updatedSubcategories });
}

/**
 * Seeds all DEFAULT_CATEGORIES into Firestore.
 * Useful for admin dashboard button or initial setup.
 */
export async function seedCategoriesToFirestore(forceResetAll = true): Promise<{ count: number }> {
  let count = 0;

  if (forceResetAll) {
    try {
      const metaRef = doc(db, 'categories', '_meta');
      await setDoc(metaRef, {
        deletedIds: [],
        isSeeded: true,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error resetting category metadata:', err);
    }
  }

  for (const cat of DEFAULT_CATEGORIES) {
    try {
      const docRef = doc(db, 'categories', cat.id);
      await setDoc(docRef, cleanDataForFirestore({
        ...cat,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      count++;
    } catch (err) {
      console.error(`Failed to seed category ${cat.id}:`, err);
    }
  }

  activeCategories = DEFAULT_CATEGORIES;
  notifyListeners();
  return { count };
}

// ---------------- 3RD-LEVEL SUB-CATEGORIES (ZNAMKE / MODELI / TIPI) ----------------

export interface TertiaryCategory {
  id: string;
  name: string;
  categoryId?: string;
  subcategoryId?: string;
}

export const TERTIARY_CATEGORIES_DATA: Record<string, string[]> = {
  // Avto-moto -> Osebna vozila (Car makes / brands)
  'osebna-vozila': [
    'Fiat', 'Volkswagen', 'Renault', 'BMW', 'Audi', 'Mercedes-Benz', 
    'Škoda', 'Peugeot', 'Ford', 'Toyota', 'Citroën', 'Opel', 
    'Hyundai', 'Kia', 'Honda', 'Seat', 'Mazda', 'Volvo', 
    'Nissan', 'Alfa Romeo', 'Dacia', 'Suzuki', 'Porsche', 'Cupra', 
    'Tesla', 'Mini', 'Land Rover', 'Jeep', 'Mitsubishi', 'Subaru', 'Jaguar', 'Smart'
  ],
  // Avto-moto -> Motorna kolesa & skuterji
  'motorna-kolesa': [
    'Yamaha', 'Honda', 'Kawasaki', 'Suzuki', 'KTM', 'BMW Motorrad', 
    'Ducati', 'Piaggio', 'Vespa', 'Aprilia', 'Harley-Davidson', 
    'Sym', 'Kymco', 'Husqvarna', 'Triumph', 'Tomos'
  ],
  // Avto-moto -> Gospodarska & tovorna vozila
  'gospodarska-vozila': [
    'Renault', 'Fiat Professional', 'Volkswagen', 'Ford', 'Mercedes-Benz', 
    'Iveco', 'Peugeot', 'Citroën', 'MAN', 'Scania', 'DAF', 'Volvo Trucks'
  ],
  // Avto-moto -> Rezervni deli & oprema
  'rezervni-deli': [
    'Karoserija & deli', 'Motor & menjalnik', 'Zavore & podvozje', 
    'Avtoakustika & navigacija', 'Svetila & žarometi', 'Izpušni sistem', 
    'Akumulatorji', 'Prtljažniki & vlečne kljuke'
  ],
  // Avto-moto -> Pnevmatike & platišča
  'pnevmatike-platisca': [
    'Michelin', 'Continental', 'Goodyear', 'Bridgestone', 'Pirelli', 
    'Dunlop', 'Sava', 'Hankook', 'Nokian', 'Alu platišča', 'Jeklena platišča'
  ],
  // Avto-moto -> Prikolice, bivalniki & navtika
  'bivalniki-navtika': [
    'Adria Mobil', 'Hobby', 'Hymer', 'Dethleffs', 'Knaus', 'Elan', 
    'Bayliner', 'Gumenjaki', 'Tovorne prikolice', 'Prikolice za plovila'
  ],

  // Nepremičnine -> Stanovanja
  'stanovanja-prodaja': [
    'Garsonjera', '1-sobno stanovanje', '1.5-sobno stanovanje', '2-sobno stanovanje', 
    '2.5-sobno stanovanje', '3-sobno stanovanje', '3.5-sobno stanovanje', 
    '4-sobno in več', 'Meščansko stanovanje', 'Penthouse', 'Oskrbovano stanovanje'
  ],
  'stanovanja-oddaja': [
    'Garsonjera', '1-sobno stanovanje', '1.5-sobno stanovanje', '2-sobno stanovanje', 
    '2.5-sobno stanovanje', '3-sobno stanovanje', '3.5-sobno stanovanje', 
    '4-sobno in več', 'Študentska soba', 'Penthouse'
  ],
  // Nepremičnine -> Hiše
  'hise-prodaja': [
    'Samostojna hiša', 'Vrstna hiša', 'Dvojček', 'Atrijska hiša', 
    'Kmečka domačija', 'Vila', 'Bivalni vikend'
  ],
  'hise-oddaja': [
    'Samostojna hiša', 'Vrstna hiša', 'Dvojček', 'Vila / Rezidenca'
  ],
  // Nepremičnine -> Posesti
  'posesti-parcele': [
    'Zazidljivo zemljišče', 'Kmetijsko zemljišče', 'Gozdno zemljišče', 'Posestvo', 'Industrijsko zemljišče'
  ],
  // Nepremičnine -> Poslovni prostori
  'poslovni-prostori': [
    'Pisarna', 'Skladišče & proizvodnja', 'Trgovski lokal', 'Gostinski lokal', 'Delavnica', 'Ordinacija'
  ],
  // Nepremičnine -> Počitniški objekti
  'pocitniski-objekti': [
    'Vikend / planinska koča', 'Apartma na morju', 'Apartma v gorah', 'Zidanica'
  ],

  // Tehnika & Elektronika -> Pametni telefoni & tablice
  'telefoni-tablice': [
    'Apple (iPhone)', 'Samsung Galaxy', 'Xiaomi / Redmi', 'Google Pixel', 
    'Huawei', 'OnePlus', 'Motorola', 'Honor', 'Sony Xperia', 'Realme', 'iPad & tablice'
  ],
  // Tehnika & Elektronika -> Računalniki & prenosniki
  'racunalniki-prenosniki': [
    'Apple MacBook / iMac', 'Lenovo / ThinkPad', 'HP', 'Dell', 'Asus (ROG / ZenBook)', 
    'Acer', 'Gaming PC namizni', 'Monitorji & zasloni', 'Računalniške komponente'
  ],
  // Tehnika & Elektronika -> TV, avdio & hi-fi
  'tv-avdio-video': [
    'Samsung', 'LG', 'Sony', 'Philips', 'TCL', 'Hisense', 
    'JBL', 'Bose', 'Sonos', 'Marshall', 'Slušalke'
  ],
  // Tehnika & Elektronika -> Fotoaparati & kamere
  'foto-kamere': [
    'Canon', 'Sony', 'Nikon', 'Fujifilm', 'Panasonic Lumix', 'GoPro', 'DJI droni', 'Leica'
  ],
  // Tehnika & Elektronika -> Gaming & konzole
  'gaming-konzole': [
    'PlayStation 5 / PS4', 'Xbox Series X/S', 'Nintendo Switch', 'Steam Deck', 'Gaming dodatki'
  ],
  // Tehnika & Elektronika -> Bela tehnika
  'bela-tehnika': [
    'Bosch', 'Gorenje', 'Miele', 'Samsung', 'Beko', 'Electrolux', 'Whirlpool', 'Siemens', 'AEG', 'Dyson'
  ],

  // Dom in vrt -> Pohištvo
  'pohistvo-oprema': [
    'Sedežne garniture & kavči', 'Jedilne mize & stoli', 'Postelje & vzmetnice', 
    'Garderobne omare', 'Kuhinje po meri', 'Pisarniško pohištvo', 'Vrtno pohištvo'
  ],
  // Dom in vrt -> Orodje & stroji
  'orodje-stroji': [
    'Makita', 'Bosch Professional', 'DeWalt', 'Milwaukee', 'Stihl', 
    'Husqvarna', 'Parkside', 'Kärcher', 'Kosilnice & vrtni stroji'
  ],
  // Dom in vrt -> Ogrevanje & klima
  'ogrevanje-hlajenje': [
    'Toplotne črpalke', 'Drva, peleti & briketi', 'Kamini & peči', 'Klimatske naprave', 'Radiatorji'
  ],

  // Šport -> Kolesarstvo
  'kolesarstvo': [
    'Trek', 'Specialized', 'Scott', 'Giant', 'Cube', 'Cannondale', 
    'Canyon', 'Merida', 'Bianchi', 'Rog', 'KTM Bike', 'Električna kolesa'
  ],
  // Šport -> Zimski športi
  'zimski-sporti': [
    'Elan', 'Atomic', 'Salomon', 'Head', 'Rossignol', 'Fischer', 'Volkl', 'Burton'
  ],
  // Šport -> Fitnes & vadba
  'fitnes-vadba': [
    'Uteži & ročke', 'Tekalne steze', 'Sobna kolesa', 'Multifunkcijske naprave', 'Drogovi & klopi'
  ],

  // ---------------- AKCIJE & UGODNOSTI ----------------
  // Tehnika & Elektronika
  'pametni-telefoni-akcija': [
    'Apple (iPhone)', 'Samsung', 'Xiaomi', 'Big Bang', 'Mimovrste', 'A1', 'Telekom', 'Telemach', 'Shoppster'
  ],
  'prenosniki-racunalniki': [
    'Apple MacBook', 'Lenovo', 'HP', 'Dell', 'Asus', 'Big Bang', 'Mimovrste', 'EPL', 'iStyle', 'Shoppster'
  ],
  'tv-avdio-znizanja': [
    'Samsung', 'LG', 'Sony', 'Philips', 'JBL', 'Bose', 'Big Bang', 'Harvey Norman', 'Mimovrste'
  ],
  'bela-tehnika-ugodno': [
    'Bosch', 'Gorenje', 'Beko', 'Miele', 'Electrolux', 'Big Bang', 'Harvey Norman', 'Mimovrste'
  ],

  // Trgovine & Hrana
  'supermarketi-katalogi': [
    'Spar & Interspar', 'Hofer', 'Lidl', 'Mercator', 'Tuš', 'Eurospin', 'Jager', 'E.Leclerc'
  ],
  'restavracije-dostava': [
    'Wolt kuponi', 'Glovo kuponi', 'McDonalds kuponi', 'Pizzerije & kosila', 'Lokalne restavracije'
  ],
  'eko-lokalni-pridelki': [
    'Lokalne kmetije', 'Bio & Eko trgovine', 'Tržnice', 'Med & olja', 'Domače mesnine'
  ],

  // Moda & Lepota
  'sezonska-znizanja': [
    'About You', 'Zalando', 'Answear', 'Zara', 'H&M', 'C&A', 'Mass', 'Deichmann', 'Peek & Cloppenburg'
  ],
  'sportna-obutev-oblacila': [
    'Nike', 'Adidas', 'Puma', 'Hervis', 'Intersport', 'Decathlon', 'Sport Vision', 'Polleo Sport'
  ],
  'kozmetika-parfumi': [
    'DM drogerie markt', 'Müller', 'Notino', 'Douglas', 'L’Occitane', 'Moja-Lekarna'
  ],

  // Dom & Bivanje
  'pohistvo-vzmetnice': [
    'Lesnina XXXL', 'Ikea', 'Mömax', 'Jysk', 'Harvey Norman', 'Rutar', 'Dormeo / Vitapur'
  ],
  'vrt-bivanje-akcija': [
    'Bauhaus', 'Obi', 'Merkur', 'Kalia', 'Inpos', 'Vrtni centri'
  ],
  'dekor-gospodinjstvo': [
    'Ikea', 'Mömax', 'Lesnina', 'Tedi', 'Pepco', 'Vitapur', 'Svilanit'
  ],

  // Potovanja & Wellness
  'terme-wellness-kuponi': [
    'Terme Olimia', 'Terme Čatež', 'Sava Hotels & Resorts', 'Terme Zreče', 'Thermana Laško', 'Terme Dobrna', 'Megabon kuponi', '1nadan kuponi'
  ],
  'nocitve-hoteli-vikend': [
    'Booking.com popusti', 'Glamping Slovenija', 'Slovenska obala', 'Bled & Bohinj', 'Kranjska Gora', 'Kuponko'
  ],
  'dozivetja-vstopnice': [
    'Postojnska jama', 'Vogel & Krvavec', 'Adrenalinski parki', 'Muzeji & gradovi', 'Woop Ljubljana & Maribor'
  ],

  // Storitve & Avto
  'avtoservis-pnevmatike': [
    'AMZS', 'LiderPnevmatik', 'Gume Direkt', 'Porsche Inter Auto', 'Avto Krka', 'Lokalni vulkanizerji'
  ],
  'zavarovanja-narocnine': [
    'Zavarovalnica Triglav', 'Generali', 'Sava Zavarovalnica', 'Grawe', 'WIZ zavarovanja', 'Telekom Slovenije', 'A1', 'Telemach'
  ],
  'izobrazevanja-tecaji': [
    'Šole vožnje', 'Jezikovni tečaji', 'Spletni tečaji & certifikati', 'Plesne šole'
  ],

  // ---------------- DOGODKI & PRIREDITVE ----------------
  // Koncerti & Zabava
  'koncerti-festivali': [
    'Rock & Metal', 'Pop & Estrada', 'Festivali na prostem', 'Stadionski koncerti', 'Akustični večeri'
  ],
  'klubska-scena-dj': [
    'House & Techno', 'EDM & Electronic', 'Trap & Hip-Hop', 'Tematske zabave / 90s', 'Afterparty'
  ],
  'narodnozabavni-veceri': [
    'Veselice & šotori', 'Koncerti narodnozabavnih ansamblov', 'Praznovanja & fešte'
  ],
  'klasicna-glasba-opere': [
    'Simfonični orkester', 'Komorni koncerti', 'Operne predstave', 'Zborovsko petje', 'Solistični recitali'
  ],

  // Kultura & Umetnost
  'gledalisce-drame-komedije': [
    'Komedija & Stand-up', 'Drama & Monodrama', 'Muzikal', 'Lutkovno gledališče', 'Impro liga'
  ],
  'razstave-muzeji-galerije': [
    'Sodobna umetnost', 'Fotografske razstave', 'Zgodovinske razstave', 'Dnevi odprtih vrat muzejev', 'Kiparske razstave'
  ],
  'kino-filmski-veceri': [
    'Kino na prostem', 'Filmski festivali (Liffe itd.)', 'Dokumentarni filmi', 'Premiera filma'
  ],

  // Šport & Rekreacija
  'nogomet-kosarka-dvorana': [
    'Prva liga & pokal', 'Evroliga & reprezentanca', 'Rokometna tekma', 'Odbojkarska tekma'
  ],
  'tek-maratoni-kolesarstvo': [
    'Ljubljanski maraton', 'Istrski maraton', 'Kolesarski maraton Franja', 'Trail tek & gorski teki'
  ],
  'pohodnistvo-gore': [
    'Organizirani pohodi', 'Planinski tabori', 'Nočni pohodi z baklami', 'Srečanja planincev'
  ],

  // Sejmi & Gastronomija
  'kulinarični-festivali': [
    'Odprta kuhna', 'Festivali čokolade', 'Festivali piva & craft pivovarji', 'Prazniki vina & Martinovanja'
  ],
  'mestni-prazniki': [
    'Festival Lent', 'Pivo in cvetje Laško', 'Pustovanja & karnevali', 'Martinovanja po Sloveniji', 'Srednjeveški dnevi'
  ],
  'kmecki-obrtniski-sejmi': [
    'Sejem Agra', 'Kmetijski sejmi', 'Obrtniški sejmi & bazarji', 'Božično-novoletni sejmi'
  ],

  // Družina & Otroci
  'lutke-otroske-predstave': [
    'Lutkovna predstava', 'Čarovniška predstava', 'Otroški muzikal', 'Pravljične urice'
  ],
  'ustvarjalne-delavnice': [
    'Lego & robotika', 'Slikarske delavnice za otroke', 'Naravoslovne delavnice', 'Kuharske delavnice'
  ],
  'druzinski-izleti-dnevi': [
    'Družinski dnevi v naravi', 'Pustolovski parki', 'Lov na zaklad', 'Animacija za otroke'
  ],

  // Posel & Delavnice
  'konference-forumi': [
    'Poslovne konference', 'IT & Tehnološki forumi', 'Marketing & Prodaja', 'Startupi & Investicije'
  ],
  'tecaji-delavnice': [
    'Programiranje & AI', 'Podjetniški tečaji', 'Javni nastop & retorika', 'Finančno opismenjevanje'
  ],

  // ---------------- BLOG & ČLANKI ----------------
  // Turizem & Izleti
  'slovenski-biseri': [
    'Bled & Bohinj', 'Dolina Soče', 'Kranjska Gora', 'Postojnska jama & Kras', 'Piran & Obala', 'Logarska dolina', 'Velika planina'
  ],
  'enodnevni-izleti': [
    'Izlet z otroki', 'Sprehod ob jezeru', 'Ogled gradu', 'Piknik v naravi', 'Arboretum & parki', 'Učne poti'
  ],
  'hribi-planinske-poti': [
    'Julijske Alpe', 'Kamniško-Savinjske Alpe', 'Karavanke', 'Pohorje', 'Triglav & visokogorje', 'Družinski hribi'
  ],
  'vikend-oddih-wellness': [
    'Terme Olimia', 'Terme Čatež', 'Rogaška Slatina', 'Portorož & obala', 'Bled oddih', 'Glamping v naravi'
  ],
  'skriti-koticki': [
    'Skriti slapovi', 'Gozdne poti', 'Zapuščene vasice', 'Panoramske točke', 'Divje soteske'
  ],

  // Kulinarika & Recepti
  'tradicionalne-jedi': [
    'Slovenska potica', 'Prekmurska gibanica', 'Kranjska klobasa', 'Idrijski žlikrofi', 'Jota & enolončnice', 'Štruklji'
  ],
  'sodobna-kuhinja': [
    'Hitra kosila (30 min)', 'Vegetarijanski recepti', 'Veganski recepti', 'Enolončnice', 'Testenine & rižote', 'Jed iz pečice'
  ],
  'vino-lokalna-pijaca': [
    'Teran & Kras', 'Rebula & Brda', 'Cviček & Dolenjska', 'Štajerska bela vina', 'Domači zeliščni likerji', 'Craft pivo'
  ],
  'zdrava-prehrana': [
    'Brez glutena', 'Sezonska zelenjava', 'Smoothie & zajtrki', 'Prehrana za športnike', 'Domači kruh z drožmi'
  ],
  'priporocila-gostiln': [
    'Domače gostilne', 'Michelin vodič Slovenija', 'Gostilne s tradicijo', 'Turistične kmetije', 'Mestni bistroji'
  ],

  // Tehnologija & Inovacije
  'umetna-inteligenca': [
    'ChatGPT & prompti', 'Generiranje slik & AI', 'Avtomatizacija dela', 'AI v šolstvu', 'Orodja za produktivnost'
  ],
  'pametni-telefoni-gadgeti': [
    'Apple iPhone', 'Samsung Galaxy', 'Pametne ure & zapestnice', 'Brezžične slušalke', 'Baterije & polnilci'
  ],
  'spletna-varnost': [
    'Preprečevanje spletnih prevar', 'Upravljanje gesel', 'Dvostopenjska avtentikacija', 'Varno spletno bančništvo'
  ],
  'pametni-dom': [
    'Pametna razsvetljava', 'Pametni termostati', 'Robotski sesalniki', 'Varnostne kamere', 'Brezžična stikala'
  ],

  // Dom, Vrt & Gradnja
  'prenova-ambient': [
    'Prenova kopalnice', 'Kuhinjski trendi', 'Minimalizem & feng shui', 'Barvne palete', 'Osvetlitev prostora'
  ],
  'naredi-sam-diy': [
    'Obnova starega pohištva', 'Leseni izdelki', 'Barvanje sten', 'Manjša popravila v hiši', 'Vrtno pohištvo DIY'
  ],
  'sezonski-vrt': [
    'Zasaditev visoke grede', 'Zelenjavni vrt', 'Obrezovanje dreves', 'Trata & nega trave', 'Zeliščni vrtiček'
  ],
  'energetska-ucinkovitost': [
    'Sončne elektrarne', 'Toplotne črpalke', 'Izolacija fasade', 'Menjava oken & vrat', 'Subvencije Eko sklada'
  ],

  // Finance & Podjetništvo
  'osebne-finance': [
    'Mesečni proračun', 'Varčevanje za rezervo', 'Zmanjšanje stroškov', 'Žepnina & otroci', 'Finančni cilji'
  ],
  'slovenski-podjetniki': [
    'Startupi & inovacije', 'Družinska podjetja', 'Samostojni podjetniki (s.p.)', 'Uspešni izvozniki'
  ],
  'nepremicninski-nasveti': [
    'Nakup prvega stanovanja', 'Stanovanjski kredit', 'Oddajanje nepremičnine', 'Zemljiška knjiga & davek'
  ],
  'investicije-skladi': [
    'Delniški ETF skladi', 'Vzajemni skladi', 'Zlato & plemenite kovine', 'Kriptovalute', 'Obveznice'
  ],

  // Zdravje & Dobro počutje
  'zdrav-zivljenjski-slog': [
    'Jutranje rutine', 'Kakovosten spanec', 'Vsakodnevna hoja', 'Vnos vode & hidracija', 'Pretegovanje & drža'
  ],
  'dusevno-zdravje-stres': [
    'Dihalne vaje', 'Meditacija & čuječnost', 'Digitalni odklop', 'Premagovanje izgorelosti', 'Pozitivno razmišljanje'
  ],
  'zelišča-narava': [
    'Domači čaji (lipa, kamilica)', 'Ameriški slamnik', 'Sirup iz smrekovih vršičkov', 'Tinkture & mazila', 'Nabiranje gob & zelišč'
  ]
};

// General fallback brands/makes for entire categories when no subcategory is selected
export const CATEGORY_GENERAL_TERTIARY_DATA: Record<string, string[]> = {
  'ads-avto-moto': [
    'Fiat', 'Volkswagen', 'Renault', 'BMW', 'Audi', 'Mercedes-Benz', 
    'Škoda', 'Peugeot', 'Ford', 'Toyota', 'Citroën', 'Opel', 
    'Hyundai', 'Kia', 'Honda', 'Yamaha', 'Kawasaki', 'Adria Mobil'
  ],
  'ads-nepremicnine': [
    'Garsonjera', '1-sobno', '2-sobno', '3-sobno', '4-sobno in več', 
    'Samostojna hiša', 'Vrstna hiša', 'Dvojček', 'Zazidljiva parcela', 'Poslovni prostor', 'Vikend'
  ],
  'ads-tehnika': [
    'Apple', 'Samsung', 'Xiaomi', 'Sony', 'Lenovo', 'HP', 
    'Dell', 'Asus', 'LG', 'Philips', 'Bosch', 'Gorenje', 'Canon'
  ],
  'ads-dom-vrt': [
    'Makita', 'Bosch', 'DeWalt', 'Stihl', 'Husqvarna', 
    'Sedežne garniture', 'Postelje', 'Jedilne mize', 'Kuhinje', 'Toplotne črpalke'
  ],
  'ads-sport-prosti-cas': [
    'Trek', 'Specialized', 'Scott', 'Giant', 'Cube', 
    'Elan', 'Atomic', 'Salomon', 'Head', 'Fischer'
  ],
  'ads-storitve-delo': [
    'Gradbeništvo & obrt', 'IT & programiranje', 'Avtoservis', 
    'Slikopleskarstvo', 'Elektro inštalacije', 'Inštrukcije', 'Prevozi'
  ],
  // Deals general fallbacks
  'deals-tehnika-elektronika': [
    'Big Bang', 'Mimovrste', 'Shoppster', 'Apple', 'Samsung', 'Xiaomi', 'Harvey Norman', 'Sony', 'Bosch', 'Gorenje'
  ],
  'deals-trgovine-hrana': [
    'Spar & Interspar', 'Hofer', 'Lidl', 'Mercator', 'Tuš', 'Eurospin', 'Wolt', 'Glovo', 'E.Leclerc'
  ],
  'deals-moda-lepota': [
    'About You', 'Zalando', 'Hervis', 'Intersport', 'Decathlon', 'DM drogerie', 'Müller', 'Notino', 'Zara', 'H&M'
  ],
  'deals-dom-bivanje': [
    'Lesnina XXXL', 'Ikea', 'Mömax', 'Jysk', 'Bauhaus', 'Obi', 'Merkur', 'Dormeo', 'Vitapur'
  ],
  'deals-potovanja-wellness': [
    'Terme Olimia', 'Terme Čatež', 'Sava Hotels', 'Thermana Laško', 'Megabon', '1nadan', 'Booking.com', 'Woop'
  ],
  'deals-storitve-avto': [
    'AMZS', 'Zavarovalnica Triglav', 'Generali', 'Telekom Slovenije', 'A1', 'Telemach', 'Porsche Inter Auto'
  ],

  // Events general fallbacks
  'events-koncerti-zabava': [
    'Rock & Metal', 'Pop & Estrada', 'Elektronska & DJ', 'Narodnozabavni večer', 'Festival na prostem', 'Klasični koncert'
  ],
  'events-kultura-umetnost': [
    'Komedija & Stand-up', 'Gledališka predstava', 'Razstava & Galerija', 'Kino na prostem', 'Liffe & film'
  ],
  'events-sport-rekreacija': [
    'Maraton & Tek', 'Kolesarska dirka', 'Nogomet & Košarka', 'Pohod & Gore', 'Tekme & turnirji'
  ],
  'events-sejmi-gastronomija': [
    'Odprta kuhna', 'Sejem Agra', 'Praznik vina & Piva', 'Festival Lent', 'Pivo in cvetje', 'Kulinarični dnevi'
  ],
  'events-druzina-otroci': [
    'Lutkovna predstava', 'Čarovniška predstava', 'Otroški muzikal', 'Družinski dan', 'Ustvarjalne delavnice'
  ],
  'events-posel-izobrazevanje': [
    'Poslovna konferenca', 'IT & AI delavnica', 'Podjetniški forum', 'Predavanja & tečaji'
  ],

  // Blog general fallbacks
  'blog-turizem-izleti': [
    'Bled & Bohinj', 'Dolina Soče', 'Kranjska Gora', 'Piran & Obala', 'Julijske Alpe', 'Logarska dolina', 'Terme & wellness'
  ],
  'blog-kulinarika-recepti': [
    'Tradicionalne jedi', 'Hitra kosila', 'Slovenska potica', 'Zdravi recepti', 'Vinska pot', 'Lokalne gostilne'
  ],
  'blog-tehnologija-inovacije': [
    'Umetna inteligenca (AI)', 'Pametni telefoni', 'Spletna varnost', 'Pametni dom', 'Produktivnost'
  ],
  'blog-dom-vrt-gradnja': [
    'Prenova doma', 'Naredi sam (DIY)', 'Urejanje vrta', 'Sončne elektrarne', 'Toplotne črpalke', 'Visoke grede'
  ],
  'blog-finance-gospodarstvo': [
    'Osebne finance', 'Varčevanje', 'Nakup nepremičnine', 'Investiranje v ETF', 'Podjetniške zgodbe'
  ],
  'blog-zdravje-zivljenjski-slog': [
    'Zdrav življenjski slog', 'Premagovanje stresa', 'Kakovosten spanec', 'Domača zelišča', 'Vitalnost'
  ]
};

// General fallback brands & stores for entire sections when 'all' is selected
export const DEALS_GENERAL_TERTIARY_DATA: string[] = [
  'Spar & Interspar', 
  'Hofer', 
  'Lidl', 
  'Mercator', 
  'Tuš', 
  'Eurospin', 
  'Big Bang', 
  'Mimovrste', 
  'Shoppster', 
  'Lesnina XXXL', 
  'Ikea', 
  'About You', 
  'Zalando', 
  'DM drogerie markt', 
  'Müller', 
  'Notino', 
  'Terme Olimia', 
  'Terme Čatež', 
  'Megabon', 
  'AMZS', 
  'Telekom Slovenije',
  'A1'
];

export const EVENTS_GENERAL_TERTIARY_DATA: string[] = [
  'Rock & Metal', 
  'Pop & Estrada', 
  'Komedija & Stand-up', 
  'Gledališče', 
  'Maraton & Tek', 
  'Odprta kuhna', 
  'Festival Lent', 
  'Lutkovna predstava', 
  'Poslovna konferenca', 
  'Kino na prostem'
];

export const ADS_GENERAL_TERTIARY_DATA: string[] = [
  'Volkswagen', 'Renault', 'BMW', 'Audi', 'Mercedes-Benz', 
  'Apple', 'Samsung', 'Xiaomi', 'Sony', 'Ikea', 'Trek'
];

export const BLOG_GENERAL_TERTIARY_DATA: string[] = [
  'Bled & Bohinj', 'Tradicionalne jedi', 'Umetna inteligenca (AI)', 
  'Prenova doma', 'Osebne finance', 'Zdrav življenjski slog'
];

/**
 * Returns available 3rd level category/make/type options based on category and subcategory.
 */
export function getTertiaryCategories(
  categoryId: string, 
  subcategoryId?: string, 
  customCategories?: CategoryItem[],
  section?: CategorySection
): string[] {
  const categoryPool = customCategories && customCategories.length > 0 ? customCategories : activeCategories;

  // Detect section if not provided explicitly
  let effectiveSection: CategorySection | undefined = section;
  if (!effectiveSection) {
    if (customCategories && customCategories.length > 0 && customCategories[0]?.section) {
      effectiveSection = customCategories[0].section;
    } else if (categoryId && categoryId !== 'all') {
      const catLower = categoryId.toLowerCase();
      if (catLower.startsWith('deals') || catLower.includes('deal') || catLower === 'tehnika' || catLower === 'prehrana' || catLower === 'turizem') {
        effectiveSection = 'deals';
      } else if (catLower.startsWith('events') || catLower.includes('event') || catLower.includes('dogod')) {
        effectiveSection = 'events';
      } else if (catLower.startsWith('ads') || catLower.includes('mali-oglasi') || catLower.includes('oglas')) {
        effectiveSection = 'ads';
      } else if (catLower.startsWith('blog') || catLower.includes('clank')) {
        effectiveSection = 'blog';
      }
    }
  }

  // 1. Check if admin configured custom tertiaryItems on active subcategory
  if (subcategoryId && subcategoryId !== 'all') {
    for (const c of categoryPool) {
      const sub = (c.subcategories || []).find(s => 
        s.id === subcategoryId || 
        s.name.toLowerCase().trim() === subcategoryId.toLowerCase().trim()
      );
      if (sub && Array.isArray(sub.tertiaryItems) && sub.tertiaryItems.length > 0) {
        return sub.tertiaryItems;
      }
    }
  }

  // 2. If subcategory is explicitly chosen and has a mapping in static tables
  if (subcategoryId && subcategoryId !== 'all' && TERTIARY_CATEGORIES_DATA[subcategoryId]) {
    return TERTIARY_CATEGORIES_DATA[subcategoryId];
  }

  // If subcategory ID might be matched by partial string
  if (subcategoryId && subcategoryId !== 'all') {
    const matchedKey = Object.keys(TERTIARY_CATEGORIES_DATA).find(k => 
      k.toLowerCase() === subcategoryId.toLowerCase() || 
      subcategoryId.toLowerCase().includes(k.toLowerCase())
    );
    if (matchedKey) return TERTIARY_CATEGORIES_DATA[matchedKey];
  }

  // 3. If category is selected (e.g. 'ads-avto-moto', 'deals-trgovine-hrana', 'events-koncerti-zabava')
  if (categoryId && categoryId !== 'all') {
    if (CATEGORY_GENERAL_TERTIARY_DATA[categoryId]) {
      return CATEGORY_GENERAL_TERTIARY_DATA[categoryId];
    }
    const catLower = categoryId.toLowerCase();

    // If section is 'deals'
    if (effectiveSection === 'deals') {
      if (catLower.includes('tehnik') || catLower.includes('elektronik') || catLower.includes('telefon') || catLower.includes('racunal')) {
        return CATEGORY_GENERAL_TERTIARY_DATA['deals-tehnika-elektronika'];
      }
      if (catLower.includes('hrana') || catLower.includes('trgovin') || catLower.includes('zivil') || catLower.includes('prehran') || catLower.includes('market')) {
        return CATEGORY_GENERAL_TERTIARY_DATA['deals-trgovine-hrana'];
      }
      if (catLower.includes('moda') || catLower.includes('lepota') || catLower.includes('sport') || catLower.includes('oblacil') || catLower.includes('obutev') || catLower.includes('kozmetik')) {
        return CATEGORY_GENERAL_TERTIARY_DATA['deals-moda-lepota'];
      }
      if (catLower.includes('dom') || catLower.includes('vrt') || catLower.includes('bivanj') || catLower.includes('pohistv')) {
        return CATEGORY_GENERAL_TERTIARY_DATA['deals-dom-bivanje'];
      }
      if (catLower.includes('potovan') || catLower.includes('turiz') || catLower.includes('wellnes') || catLower.includes('term') || catLower.includes('pocitnic')) {
        return CATEGORY_GENERAL_TERTIARY_DATA['deals-potovanja-wellness'];
      }
      if (catLower.includes('storitv') || catLower.includes('avto') || catLower.includes('mobilnost') || catLower.includes('zavarovanj')) {
        return CATEGORY_GENERAL_TERTIARY_DATA['deals-storitve-avto'];
      }
      return DEALS_GENERAL_TERTIARY_DATA;
    }

    // If section is 'events'
    if (effectiveSection === 'events') {
      if (catLower.includes('koncert') || catLower.includes('zabav') || catLower.includes('glasb')) {
        return CATEGORY_GENERAL_TERTIARY_DATA['events-koncerti-zabava'];
      }
      if (catLower.includes('kultur') || catLower.includes('umetnost') || catLower.includes('gledalis')) {
        return CATEGORY_GENERAL_TERTIARY_DATA['events-kultura-umetnost'];
      }
      if (catLower.includes('sport') || catLower.includes('rekreacij') || catLower.includes('tek') || catLower.includes('koles')) {
        return CATEGORY_GENERAL_TERTIARY_DATA['events-sport-rekreacija'];
      }
      if (catLower.includes('sejm') || catLower.includes('gastronom') || catLower.includes('kulinari')) {
        return CATEGORY_GENERAL_TERTIARY_DATA['events-sejmi-gastronomija'];
      }
      if (catLower.includes('druzina') || catLower.includes('otroc') || catLower.includes('lutk')) {
        return CATEGORY_GENERAL_TERTIARY_DATA['events-druzina-otroci'];
      }
      if (catLower.includes('posel') || catLower.includes('izobrazev') || catLower.includes('konferenc')) {
        return CATEGORY_GENERAL_TERTIARY_DATA['events-posel-izobrazevanje'];
      }
      return EVENTS_GENERAL_TERTIARY_DATA;
    }

    // Generic fallback checks if section is unspecified
    if (catLower.includes('koncert') || catLower.includes('zabav') || catLower.includes('glasb')) {
      return CATEGORY_GENERAL_TERTIARY_DATA['events-koncerti-zabava'];
    }
    if (catLower.includes('kultur') || catLower.includes('umetnost') || catLower.includes('gledalis')) {
      return CATEGORY_GENERAL_TERTIARY_DATA['events-kultura-umetnost'];
    }
    if (catLower.includes('sejm') || catLower.includes('gastronom') || catLower.includes('kulinari')) {
      return CATEGORY_GENERAL_TERTIARY_DATA['events-sejmi-gastronomija'];
    }
    if (catLower.includes('druzina') || catLower.includes('otroc') || catLower.includes('lutk')) {
      return CATEGORY_GENERAL_TERTIARY_DATA['events-druzina-otroci'];
    }
    if (catLower.includes('posel') || catLower.includes('izobrazev') || catLower.includes('konferenc')) {
      return CATEGORY_GENERAL_TERTIARY_DATA['events-posel-izobrazevanje'];
    }
    if (catLower.includes('avto') || catLower.includes('moto') || catLower.includes('vozil')) {
      return CATEGORY_GENERAL_TERTIARY_DATA['ads-avto-moto'];
    }
    if (catLower.includes('nepremicnin') || catLower.includes('stanovan') || catLower.includes('his')) {
      return CATEGORY_GENERAL_TERTIARY_DATA['ads-nepremicnine'];
    }
    if (catLower.includes('tehnik') || catLower.includes('elektronik') || catLower.includes('telefon')) {
      return (catLower.startsWith('deals') || catLower.includes('deal'))
        ? CATEGORY_GENERAL_TERTIARY_DATA['deals-tehnika-elektronika']
        : CATEGORY_GENERAL_TERTIARY_DATA['ads-tehnika'];
    }
    if (catLower.includes('hrana') || catLower.includes('trgovin') || catLower.includes('zivil') || catLower.includes('prehran')) {
      return CATEGORY_GENERAL_TERTIARY_DATA['deals-trgovine-hrana'];
    }
    if (catLower.includes('moda') || catLower.includes('lepota') || catLower.includes('oblacil') || catLower.includes('kozmetik')) {
      return CATEGORY_GENERAL_TERTIARY_DATA['deals-moda-lepota'];
    }
    if (catLower.includes('potovan') || catLower.includes('turiz') || catLower.includes('wellnes') || catLower.includes('term')) {
      return CATEGORY_GENERAL_TERTIARY_DATA['deals-potovanja-wellness'];
    }
    if (catLower.includes('dom') || catLower.includes('vrt') || catLower.includes('bivanj')) {
      return (catLower.startsWith('deals') || catLower.includes('deal'))
        ? CATEGORY_GENERAL_TERTIARY_DATA['deals-dom-bivanje']
        : CATEGORY_GENERAL_TERTIARY_DATA['ads-dom-vrt'];
    }
    if (catLower.includes('sport') || catLower.includes('koles')) {
      return catLower.includes('event') || catLower.includes('dogod')
        ? CATEGORY_GENERAL_TERTIARY_DATA['events-sport-rekreacija']
        : CATEGORY_GENERAL_TERTIARY_DATA['ads-sport-prosti-cas'];
    }
    if (catLower.includes('storitv') || catLower.includes('zavarovanj')) {
      return CATEGORY_GENERAL_TERTIARY_DATA['deals-storitve-avto'];
    }
    // Blog categories
    if (catLower.includes('turiz') || catLower.includes('izlet') || catLower.includes('hrib') || catLower.includes('biser')) {
      return CATEGORY_GENERAL_TERTIARY_DATA['blog-turizem-izleti'];
    }
    if (catLower.includes('kulinari') || catLower.includes('recept') || catLower.includes('kuhinj') || catLower.includes('jed')) {
      return CATEGORY_GENERAL_TERTIARY_DATA['blog-kulinarika-recepti'];
    }
    if (catLower.includes('tehnolog') || catLower.includes('inovacij') || catLower.includes('umetna') || catLower.includes('ai')) {
      return CATEGORY_GENERAL_TERTIARY_DATA['blog-tehnologija-inovacije'];
    }
    if (catLower.includes('gradnj') || catLower.includes('prenov') || catLower.includes('diy')) {
      return CATEGORY_GENERAL_TERTIARY_DATA['blog-dom-vrt-gradnja'];
    }
    if (catLower.includes('financ') || catLower.includes('podjetn') || catLower.includes('investic') || catLower.includes('varcev')) {
      return CATEGORY_GENERAL_TERTIARY_DATA['blog-finance-gospodarstvo'];
    }
    if (catLower.includes('zdravj') || catLower.includes('pocutj') || catLower.includes('zelisc') || catLower.includes('stres')) {
      return CATEGORY_GENERAL_TERTIARY_DATA['blog-zdravje-zivljenjski-slog'];
    }
  }

  // 4. Fallback when category is 'all' or no specific match found
  if (effectiveSection === 'deals') {
    return DEALS_GENERAL_TERTIARY_DATA;
  }
  if (effectiveSection === 'ads') {
    return ADS_GENERAL_TERTIARY_DATA;
  }
  if (effectiveSection === 'blog') {
    return BLOG_GENERAL_TERTIARY_DATA;
  }
  if (effectiveSection === 'events') {
    return EVENTS_GENERAL_TERTIARY_DATA;
  }

  // Default fallback
  return EVENTS_GENERAL_TERTIARY_DATA;
}

