const fs = require('fs');

let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace(
  "import { useBookmarks } from '../contexts/BookmarkContext';",
  "import { useBookmarks } from '../contexts/BookmarkContext';\nimport { useAuth } from '../contexts/AuthContext';\nimport { LoginModal } from './LoginModal';\nimport { useState } from 'react';"
);

code = code.replace(
  "export function Header({",
  "export function Header({\n  onProfileClick,\n  onSavedClick,\n  onHomeClick,\n  searchQuery,\n  onSearchChange\n}: {\n  onProfileClick?: () => void;\n  onSavedClick?: () => void;\n  onHomeClick?: () => void;\n  searchQuery?: string;\n  onSearchChange?: (q: string) => void;\n}) {\n  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);\n  const { currentUser } = useAuth();\n  const { savedIds } = useBookmarks();\n  const savedCount = savedIds.length;\n\n  return ("
);

// strip the old signature
code = code.replace(
  `  onProfileClick,
  onSavedClick,
  onHomeClick,
  searchQuery,
  onSearchChange
}: { 
  onProfileClick?: () => void;
  onSavedClick?: () => void;
  onHomeClick?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}) {
  const { savedIds } = useBookmarks();
  const savedCount = savedIds.length;
  return (`,
  ""
);

// replace profile section
code = code.replace(
  `<div className="flex items-center gap-2 pl-2 cursor-pointer" onClick={onProfileClick}>
            <img alt="Profile" className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/20" src="https://lh3.googleusercontent.com/aida/AEtjO1WzgwshpYtUlUT6B6hzTtlscXMkpKFYIjPiStIYfRrhCOV_MJeKV53x2D-tigu5SbHyESMyvILulBOUHZNfXTh6f8BRNGoWAkmZGhTeSWRB6n0Yw7IQRI0B91gU_U5KeEaSv6GZGH_W05qE5EOybPtK8yTXIY8KRAN88q_810UgS5RUyRmLSTI-zFjGHDUBCI7ELn7zCVDuy5Hy1SYdchdHKbBPfokQqaaMmc3liYXq_mNFC7yqQPYrfuA" />
            <ChevronDown className="w-[1em] h-[1em] text-outline text-sm hidden sm:inline-block" />
          </div>`,
  `{currentUser ? (
          <div className="flex items-center gap-2 pl-2 cursor-pointer" onClick={onProfileClick}>
            <img alt={currentUser.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/20" src={currentUser.avatar} />
            <ChevronDown className="w-[1em] h-[1em] text-outline text-sm hidden sm:inline-block" />
          </div>
          ) : (
            <button onClick={() => setIsLoginModalOpen(true)} className="px-4 py-2 bg-primary text-on-primary rounded-xl font-label-md text-sm font-bold shadow hover:bg-primary-container transition-colors ml-2">Prijava</button>
          )}`
);

// add LoginModal at the end of header
code = code.replace(
  "    </header>\n  );\n}",
  "    <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />\n    </header>\n  );\n}"
);

fs.writeFileSync('src/components/Header.tsx', code);
