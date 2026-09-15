const fs = require('fs');

let code = fs.readFileSync('src/components/DogodkiFeed.tsx', 'utf8');

// 1. Add activeCategory state
code = code.replace(
  'const [isLoading, setIsLoading] = useState(false);',
  `const [isLoading, setIsLoading] = useState(false);\n  const [activeCategory, setActiveCategory] = useState<string>('all');`
);

// 2. Update ShowIf definition
code = code.replace(
  `const ShowIf = ({ text, children }: { text: string; children: React.ReactNode }) => {
    if (!searchQuery) return <>{children}</>;
    if (text.toLowerCase().includes(searchQuery.toLowerCase())) return <>{children}</>;
    return null;
  };`,
  `const ShowIf = ({ text, category, categories = [], children }: { text: string; category?: string; categories?: string[]; children: React.ReactNode }) => {
    if (activeCategory !== 'all' && category !== activeCategory && !categories.includes(activeCategory)) return null;
    if (searchQuery && !text.toLowerCase().includes(searchQuery.toLowerCase())) return null;
    return <>{children}</>;
  };`
);

// 3. Update category buttons
const activeClass = 'bg-primary-fixed text-on-primary-fixed font-bold border border-transparent';
const inactiveClass = 'bg-surface-container-lowest hover:bg-surface-container-low text-on-surface-variant border border-surface-container';

const categoriesHtml = `
      {/* 3. Kategorije dogodkov */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        <button 
          onClick={() => setActiveCategory('all')}
          className={\`px-3 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 \${activeCategory === 'all' ? '${activeClass}' : '${inactiveClass}'}\`}
        >
          Vse kategorije (342)
        </button>
        <button 
          onClick={() => setActiveCategory('culture')}
          className={\`px-3 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 \${activeCategory === 'culture' ? '${activeClass}' : '${inactiveClass}'}\`}
        >
          <Theater className={\`w-[1em] h-[1em] text-xs \${activeCategory === 'culture' ? 'text-on-primary-fixed' : 'text-primary'}\`} /> Gledališče & Kultura (68)
        </button>
        <button 
          onClick={() => setActiveCategory('music')}
          className={\`px-3 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 \${activeCategory === 'music' ? '${activeClass}' : '${inactiveClass}'}\`}
        >
          <Music className={\`w-[1em] h-[1em] text-xs \${activeCategory === 'music' ? 'text-on-primary-fixed' : 'text-primary'}\`} /> Koncerti & Glasba (114)
        </button>
        <button 
          onClick={() => setActiveCategory('sport')}
          className={\`px-3 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 \${activeCategory === 'sport' ? '${activeClass}' : '${inactiveClass}'}\`}
        >
          <Bike className={\`w-[1em] h-[1em] text-xs \${activeCategory === 'sport' ? 'text-on-primary-fixed' : 'text-primary'}\`} /> Šport & Rekreacija (52)
        </button>
        <button 
          onClick={() => setActiveCategory('food')}
          className={\`px-3 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 \${activeCategory === 'food' ? '${activeClass}' : '${inactiveClass}'}\`}
        >
          <Flame className={\`w-[1em] h-[1em] text-xs \${activeCategory === 'food' ? 'text-on-primary-fixed' : 'text-secondary'}\`} /> Gastronomija & Sejmi (43)
        </button>
        <button 
          onClick={() => setActiveCategory('family')}
          className={\`px-3 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 \${activeCategory === 'family' ? '${activeClass}' : '${inactiveClass}'}\`}
        >
          <Users className={\`w-[1em] h-[1em] text-xs \${activeCategory === 'family' ? 'text-on-primary-fixed' : 'text-primary'}\`} /> Za otroke & Družino (37)
        </button>
        <button 
          onClick={() => setActiveCategory('business')}
          className={\`px-3 py-1.5 rounded-xl font-label-md text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 \${activeCategory === 'business' ? '${activeClass}' : '${inactiveClass}'}\`}
        >
          <Building className={\`w-[1em] h-[1em] text-xs \${activeCategory === 'business' ? 'text-on-primary-fixed' : 'text-outline'}\`} /> Izobraževanje & Posel (28)
        </button>
      </div>`;

// Replace the old categories div block
const regexCat = /\{\/\* 3\. Kategorije dogodkov \*\/\}[\s\S]*?<\/div>/;
code = code.replace(regexCat, categoriesHtml);

// 4. Update ShowIf usages
code = code.replace(
  '<ShowIf text="Flirrt & Gostje: Veliki akustični koncert na Ljubljanskem gradu koncerti glasba ljubljana">',
  '<ShowIf text="Flirrt & Gostje: Veliki akustični koncert na Ljubljanskem gradu koncerti glasba ljubljana" category="music">'
);
code = code.replace(
  '<ShowIf text="38. Ljubljanski pomladni tek polmaraton 2025 rekreacija tek maraton">',
  '<ShowIf text="38. Ljubljanski pomladni tek polmaraton 2025 rekreacija tek maraton" category="sport">'
);
code = code.replace(
  '<ShowIf text="cankarjev dom sng drama kralj lear premiera gledališče ljubljana">',
  '<ShowIf text="cankarjev dom sng drama kralj lear premiera gledališče ljubljana" category="culture">'
);
code = code.replace(
  '<ShowIf text="festival čokolade lokalnih dobrot radovljica gastronomija družina hrana">',
  '<ShowIf text="festival čokolade lokalnih dobrot radovljica gastronomija družina hrana" categories={["food", "family"]}>'
);
code = code.replace(
  '<ShowIf text="prva liga telemach nk maribor nk olimpija nogomet derbi šport">',
  '<ShowIf text="prva liga telemach nk maribor nk olimpija nogomet derbi šport" category="sport">'
);

fs.writeFileSync('src/components/DogodkiFeed.tsx', code);
