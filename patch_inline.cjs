const fs = require('fs');

let dogodki = fs.readFileSync('src/components/DogodkiFeed.tsx', 'utf8');
dogodki = dogodki.replace('import { Search, MapPin, ChevronDown, PlusCircle', 'import { BookmarkButton } from "./BookmarkButton";\nimport { Search, MapPin, ChevronDown, PlusCircle');
dogodki = dogodki.replace(/<button className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant transition-colors" title="Shrani dogodek" type="button">\s*<Bookmark className="w-\[1em\] h-\[1em\] text-lg" \/>\s*<\/button>/g, '<BookmarkButton id="dogodek-inline-1" />');
fs.writeFileSync('src/components/DogodkiFeed.tsx', dogodki);

let oglasi = fs.readFileSync('src/components/MaliOglasiFeed.tsx', 'utf8');
oglasi = oglasi.replace('import React, { useState } from \'react\';', 'import React, { useState } from \'react\';\nimport { BookmarkButton } from "./BookmarkButton";');
oglasi = oglasi.replace(/<button className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant transition-colors" title="Shrani oglas" type="button">\s*<Bookmark className="w-\[1em\] h-\[1em\] text-lg" \/>\s*<\/button>/g, '<BookmarkButton id="oglas-inline-1" />');
fs.writeFileSync('src/components/MaliOglasiFeed.tsx', oglasi);
