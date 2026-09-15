const fs = require('fs');

let code = fs.readFileSync('src/components/LeftSidebar.tsx', 'utf8');

const regex = /\{\/\* Kartica uporabnika s simulatorjem vlog \*\/\}[\s\S]*?<button \n          onClick=\{\(\) => onViewChange\('profile'\)\}[\s\S]*?Moj profil<\/span>\n        <\/button>\n      <\/div>/;

const newContent = `{/* Kartica uporabnika */}
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
      </div>`;

code = code.replace(regex, newContent);

// Fix role === 'admin'
code = code.replace(
  "{role === 'admin' && (",
  "{(role === 'admin' || role === 'superadmin') && ("
);

fs.writeFileSync('src/components/LeftSidebar.tsx', code);
