const fs = require('fs');
let code = fs.readFileSync('src/components/MaliOglasiFeed.tsx', 'utf8');

code = code.replace(
  `            <ShowIf text="otroški voziček cybex priam 3v1 otroška oprema celje center">
            <article className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 hover:shadow-md transition-shadow flex flex-col justify-between gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-[10px] bg-surface-container text-on-surface-variant px-2 py-0.5 rounded">Otroška oprema</span>
                  <span className="font-headline-sm text-base font-bold text-primary">450 €</span>
                </div>
                <h4 className="font-headline-sm text-sm font-bold text-on-surface line-clamp-2">Otroški voziček Cybex Priam 3v1 (košara, športni del, lupinica Cloud Z)</h4>
                <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2">Črna barva z rose gold ogrodjem. Zelo lepo ohranjen, vključena dežna prevleka in adapterji.</p>
                <div className="flex items-center gap-1 text-xs text-outline">
                  <MapPin className="w-[1em] h-[1em] text-xs text-primary" /> Celje Center
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-surface-container-low">
                <span className="font-body-sm text-[11px] text-outline">Pred 2 dnevi</span>
                <button className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors">Podrobnosti</button>
              </div>
            </article>
            </ShowIf>
          </div>
        </div>
      ))}
      <div className="flex flex-col items-center justify-center gap-2 py-4">`,
  `            <ShowIf text="otroški voziček cybex priam 3v1 otroška oprema celje center">
            <article className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 hover:shadow-md transition-shadow flex flex-col justify-between gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-[10px] bg-surface-container text-on-surface-variant px-2 py-0.5 rounded">Otroška oprema</span>
                  <span className="font-headline-sm text-base font-bold text-primary">450 €</span>
                </div>
                <h4 className="font-headline-sm text-sm font-bold text-on-surface line-clamp-2">Otroški voziček Cybex Priam 3v1 (košara, športni del, lupinica Cloud Z)</h4>
                <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2">Črna barva z rose gold ogrodjem. Zelo lepo ohranjen, vključena dežna prevleka in adapterji.</p>
                <div className="flex items-center gap-1 text-xs text-outline">
                  <MapPin className="w-[1em] h-[1em] text-xs text-primary" /> Celje Center
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-surface-container-low">
                <span className="font-body-sm text-[11px] text-outline">Pred 2 dnevi</span>
                <button className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors">Podrobnosti</button>
              </div>
            </article>
            </ShowIf>
          </div>
        </div>
      ))}
      <div className="flex flex-col items-center justify-center gap-2 py-4">`
);

fs.writeFileSync('src/components/MaliOglasiFeed.tsx', code);
