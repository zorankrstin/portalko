const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace(
  "import { NotificationCenter } from './NotificationCenter';",
  "import { NotificationCenter } from './NotificationCenter';\nimport { useBookmarks } from '../contexts/BookmarkContext';"
);

code = code.replace(
  "export function Header({ ",
  "export function Header({ "
);

code = code.replace(
  "  onSearchChange?: (q: string) => void;\n}) {\n  return (",
  "  onSearchChange?: (q: string) => void;\n}) {\n  const { savedIds } = useBookmarks();\n  const savedCount = savedIds.length;\n\n  return ("
);

code = code.replace(
  `<button 
            onClick={onSavedClick}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            type="button"
            title="Shranjeno"
          >
            <Bookmark className="w-[1em] h-[1em] text-xl" />
          </button>`,
  `<button 
            onClick={onSavedClick}
            className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            type="button"
            title="Shranjeno"
          >
            <Bookmark className="w-[1em] h-[1em] text-xl" />
            {savedCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[9px] font-bold text-white bg-primary rounded-full border-2 border-white">
                {savedCount > 9 ? '9+' : savedCount}
              </span>
            )}
          </button>`
);

fs.writeFileSync('src/components/Header.tsx', code);
