const fs = require('fs');
let code = fs.readFileSync('src/components/UserProfile.tsx', 'utf8');

code = code.replace(
  "import { EventPost } from './posts/EventPost';",
  "import { EventPost } from './posts/EventPost';\nimport { useAuth } from '../contexts/AuthContext';\nimport { LogOut } from 'lucide-react';"
);

code = code.replace(
  "export function UserProfile({ onViewChange }: { onViewChange: (view: 'main') => void }) {",
  "export function UserProfile({ onViewChange }: { onViewChange: (view: 'main') => void }) {\n  const { currentUser, logout } = useAuth();\n  if (!currentUser) return <div className=\"p-8 text-center\">Niste prijavljeni.</div>;"
);

code = code.replace(
  `src="https://lh3.googleusercontent.com/aida/AEtjO1WzgwshpYtUlUT6B6hzTtlscXMkpKFYIjPiStIYfRrhCOV_MJeKV53x2D-tigu5SbHyESMyvILulBOUHZNfXTh6f8BRNGoWAkmZGhTeSWRB6n0Yw7IQRI0B91gU_U5KeEaSv6GZGH_W05qE5EOybPtK8yTXIY8KRAN88q_810UgS5RUyRmLSTI-zFjGHDUBCI7ELn7zCVDuy5Hy1SYdchdHKbBPfokQqaaMmc3liYXq_mNFC7yqQPYrfuA"`,
  `src={currentUser.avatar}`
);

code = code.replace(
  `Luka Novak
              <span className="bg-secondary text-on-secondary rounded-full p-1 shadow-sm" title="Preverjen uporabnik">`,
  `{currentUser.name}
              <span className="bg-secondary text-on-secondary rounded-full p-1 shadow-sm" title={currentUser.role}>`
);

code = code.replace(
  `defaultValue="Luka Novak"`,
  `defaultValue={currentUser.name}`
);

code = code.replace(
  `<h3 className="font-headline-sm text-base font-bold text-on-surface">Osebni podatki</h3>
              </div>`,
  `<h3 className="font-headline-sm text-base font-bold text-on-surface">Osebni podatki</h3>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-on-surface-variant font-bold">Vloga: {currentUser.role}</span>
                <button 
                  onClick={() => { logout(); onViewChange('main'); }} 
                  className="px-4 py-2 rounded-xl bg-error/10 hover:bg-error/20 text-error font-label-md text-sm font-bold flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Odjava
                </button>
              </div>`
);

fs.writeFileSync('src/components/UserProfile.tsx', code);
