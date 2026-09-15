const fs = require('fs');

let code = fs.readFileSync('src/components/LeftSidebar.tsx', 'utf8');

// replace LeftSidebarProps
code = code.replace(
  "interface LeftSidebarProps {\n  role: Role;\n  onRoleChange: (role: Role) => void;\n  currentView: ViewMode;\n  onViewChange: (view: ViewMode) => void;\n}",
  `import { useAuth } from '../contexts/AuthContext';
interface LeftSidebarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}`
);

// update function signature
code = code.replace(
  "export function LeftSidebar({ role, onRoleChange, currentView, onViewChange }: LeftSidebarProps) {",
  "export function LeftSidebar({ currentView, onViewChange }: LeftSidebarProps) {\n  const { currentUser } = useAuth();\n  const role = currentUser?.role || 'guest';"
);

// update role details and user card
code = code.replace(
  `<div className="flex flex-col gap-space-md">

      {/* Kartica uporabnika s simulatorjem vlog */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm relative">
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"><div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 rounded-full blur-2xl -mr-8 -mt-8"></div></div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <img alt="Luka Novak profilna slika" className="w-12 h-12 rounded-xl object-cover shadow-sm ring-1 ring-black/5" src="https://lh3.googleusercontent.com/aida/AEtjO1WzgwshpYtUlUT6B6hzTtlscXMkpKFYIjPiStIYfRrhCOV_MJeKV53x2D-tigu5SbHyESMyvILulBOUHZNfXTh6f8BRNGoWAkmZGhTeSWRB6n0Yw7IQRI0B91gU_U5KeEaSv6GZGH_W05qE5EOybPtK8yTXIY8KRAN88q_810UgS5RUyRmLSTI-zFjGHDUBCI7ELn7zCVDuy5Hy1SYdchdHKbBPfokQqaaMmc3liYXq_mNFC7yqQPYrfuA" />
            <span className="absolute -bottom-1 -right-1 bg-secondary text-on-secondary rounded-full p-0.5 shadow">
              <svg className="w-3 h-3 block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="font-headline-sm text-sm font-bold text-on-surface truncate">Luka Novak</h2>
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant flex items-center gap-1">
              <svg className="w-3 h-3 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              <span className={details.className}>{details.label}</span>
            </p>
          </div>
        </div>
        
        <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col gap-1">
          <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Aktivne pravice objav</span>
          <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
            {details.permissions}
          </p>
        </div>
        
        <div className="flex flex-col gap-1.5 pt-1">
          <label className="font-label-caps text-label-caps text-outline uppercase tracking-wider flex items-center justify-between" htmlFor="role-switcher">
            <span>Simuliraj vlogo (RLS)</span>
            <SlidersHorizontal className="w-[1em] h-[1em] text-xs text-outline" />
          </label>
          <select 
            className="w-full bg-surface-container-low text-on-surface font-label-md text-label-md px-3 py-2 rounded-lg focus:outline-none focus:bg-surface-container-lowest shadow-sm border border-transparent focus:border-outline-variant" 
            id="role-switcher"
            value={role}
            onChange={(e) => onRoleChange(e.target.value as Role)}
          >
            <option value="verified">🛡️ Preverjen (Polni dostop)</option>
            <option value="registered">👤 Registriran (Oglasi, Blog, Dogodki)</option>
            <option value="guest">👀 Gost (Samo branje & komentarji)</option>
            <option value="admin">⚡ Administrator (Vse pravice)</option>
          </select>
        </div>
        <button 
          onClick={() => onViewChange('profile')}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors" type="button"
        >
          <UserCog className="w-[1em] h-[1em] text-base" />
          <span>Moj profil</span>
        </button>
      </div>`,
  `<div className="flex flex-col gap-space-md">

      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm relative">
        {currentUser ? (
          <>
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"><div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 rounded-full blur-2xl -mr-8 -mt-8"></div></div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <img alt={currentUser.name} className="w-12 h-12 rounded-xl object-cover shadow-sm ring-1 ring-black/5" src={currentUser.avatar} />
                <span className="absolute -bottom-1 -right-1 bg-secondary text-on-secondary rounded-full p-0.5 shadow">
                  <svg className="w-3 h-3 block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-headline-sm text-sm font-bold text-on-surface truncate">{currentUser.name}</h2>
                </div>
                <p className="font-body-sm text-xs text-on-surface-variant flex items-center gap-1">
                  <svg className="w-3 h-3 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  <span className={details.className}>{details.label}</span>
                </p>
              </div>
            </div>
            
            <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col gap-1">
              <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Aktivne pravice objav</span>
              <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                {details.permissions}
              </p>
            </div>
            
            <button 
              onClick={() => onViewChange('profile')}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors" type="button"
            >
              <UserCog className="w-[1em] h-[1em] text-base" />
              <span>Moj profil</span>
            </button>
          </>
        ) : (
          <div className="py-2 text-center flex flex-col gap-2">
            <span className="font-headline-sm font-bold text-on-surface">Prijavite se</span>
            <p className="text-xs text-on-surface-variant">Prijavite se za objavljanje oglasov in sodelovanje v skupnosti.</p>
          </div>
        )}
      </div>`
);

// change role === 'admin' logic for sidebar items
code = code.replace(
  "{role === 'admin' && (",
  "{(role === 'admin' || role === 'superadmin') && ("
);

fs.writeFileSync('src/components/LeftSidebar.tsx', code);
