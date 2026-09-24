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
  { id: 'osrednjeslovenska', name: 'Osrednjeslovenska (Ljubljana z okolico)', shortName: 'Ljubljana & Osrednja', cities: ['Ljubljana', 'Kamnik', 'Domžale', 'Grosuplje', 'Vrhnika', 'Logatec', 'Medvode', 'Litija'] },
  { id: 'podravska', name: 'Podravska (Maribor, Ptuj)', shortName: 'Maribor & Podravje', cities: ['Maribor', 'Ptuj', 'Slovenska Bistrica', 'Ormož', 'Lenart', 'Ruše'] },
  { id: 'savinjska', name: 'Savinjska (Celje, Velenje)', shortName: 'Celje & Savinjska', cities: ['Celje', 'Velenje', 'Žalec', 'Slovenske Konjice', 'Šentjur', 'Rogaška Slatina', 'Laško', 'Mozirje'] },
  { id: 'gorenjska', name: 'Gorenjska (Kranj, Jesenice, Bled)', shortName: 'Kranj & Gorenjska', cities: ['Kranj', 'Jesenice', 'Škofja Loka', 'Radovljica', 'Bled', 'Tržič', 'Bohinj', 'Kranjska Gora'] },
  { id: 'obalnokraska', name: 'Obalno-kraška (Koper, Izola, Piran, Kras)', shortName: 'Koper & Obala', cities: ['Koper', 'Izola', 'Piran', 'Portorož', 'Sežana', 'Hrpelje-Kozina', 'Divača', 'Komen'] },
  { id: 'goriska', name: 'Goriška (Nova Gorica, Ajdovščina, Soča)', shortName: 'Nova Gorica & Posočje', cities: ['Nova Gorica', 'Ajdovščina', 'Tolmin', 'Idrija', 'Bovec', 'Kobarid', 'Šempeter', 'Brda'] },
  { id: 'jugovzhodna', name: 'Dolenjska & JV Slovenija (Novo mesto, Kočevje)', shortName: 'Novo mesto & Dolenjska', cities: ['Novo mesto', 'Kočevje', 'Črnomelj', 'Trebnje', 'Metlika', 'Ribnica', 'Šentjernej', 'Semič'] },
  { id: 'pomurska', name: 'Pomurska (Murska Sobota, Lendava)', shortName: 'Murska Sobota & Pomurje', cities: ['Murska Sobota', 'Lendava', 'Gornja Radgona', 'Ljutomer', 'Beltinci', 'Radenci'] },
  { id: 'koroska', name: 'Koroška (Slovenj Gradec, Ravne)', shortName: 'Slovenj Gradec & Koroška', cities: ['Slovenj Gradec', 'Ravne na Koroškem', 'Dravograd', 'Prevalje', 'Radlje ob Dravi', 'Mežica'] },
  { id: 'posavska', name: 'Posavska (Krško, Brežice, Sevnica)', shortName: 'Krško & Posavje', cities: ['Krško', 'Brežice', 'Sevnica', 'Kostanjevica na Krki', 'Radeče', 'Bistrica ob Sotli'] },
  { id: 'zasavska', name: 'Zasavska (Trbovlje, Zagorje, Hrastnik)', shortName: 'Trbovlje & Zasavje', cities: ['Trbovlje', 'Zagorje ob Savi', 'Hrastnik'] },
  { id: 'primorskonotranjska', name: 'Primorsko-notranjska (Postojna, Ilirska Bistrica)', shortName: 'Postojna & Notranjska', cities: ['Postojna', 'Ilirska Bistrica', 'Cerknica', 'Pivka', 'Loška dolina', 'Bloke'] },
];

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
