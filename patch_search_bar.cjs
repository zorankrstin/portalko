const fs = require('fs');

let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// Add 'X' to lucide-react import
code = code.replace(
  "import { Search, MapPin, ChevronDown, Bookmark } from 'lucide-react';",
  "import { Search, MapPin, ChevronDown, Bookmark, X } from 'lucide-react';"
);

// Replace the input wrapper
code = code.replace(
  `<div className="relative w-full">
            <Search className="w-[1em] h-[1em] absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg" />
            <input 
              value={searchQuery || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full bg-surface-container-low pl-10 pr-4 py-2 rounded-lg font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest transition-colors border border-transparent focus:border-outline-variant" placeholder="Išči po objavah, novicah, oglasih, dogodkih..." type="text" />
          </div>`,
  `<div className="relative w-full">
            <Search className="w-[1em] h-[1em] absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg" />
            <input 
              value={searchQuery || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full bg-surface-container-low pl-10 pr-10 py-2 rounded-lg font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest transition-colors border border-transparent focus:border-outline-variant" placeholder="Išči po objavah, novicah, oglasih, dogodkih..." type="text" />
            {searchQuery && (
              <button 
                onClick={() => onSearchChange?.('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors p-0.5 rounded-full hover:bg-surface-container-high"
                aria-label="Počisti iskanje"
                title="Počisti iskanje"
              >
                <X className="w-[1em] h-[1em] text-base" />
              </button>
            )}
          </div>`
);

fs.writeFileSync('src/components/Header.tsx', code);
