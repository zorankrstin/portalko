const fs = require('fs');
let code = fs.readFileSync('src/components/MaliOglasiFeed.tsx', 'utf8');

code = code.replace(
  `<article className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 hover:shadow-md transition-shadow flex flex-col justify-between gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-[10px] bg-surface-container text-on-surface-variant px-2 py-0.5 rounded">Dom & Vrt</span>`,
  `<ShowIf text="hrastova masivna jedilna miza dom in vrt kranj">
            <article className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 hover:shadow-md transition-shadow flex flex-col justify-between gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-[10px] bg-surface-container text-on-surface-variant px-2 py-0.5 rounded">Dom & Vrt</span>`
);
code = code.replace(
  `<button className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors">Podrobnosti</button>
              </div>
            </article>`,
  `<button className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors">Podrobnosti</button>
              </div>
            </article>
            </ShowIf>`
);

code = code.replace(
  `<article className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 hover:shadow-md transition-shadow flex flex-col justify-between gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-[10px] bg-surface-container text-on-surface-variant px-2 py-0.5 rounded">Otroška oprema</span>`,
  `<ShowIf text="otroški voziček cybex priam 3v1 otroška oprema celje center">
            <article className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 hover:shadow-md transition-shadow flex flex-col justify-between gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-[10px] bg-surface-container text-on-surface-variant px-2 py-0.5 rounded">Otroška oprema</span>`
);
code = code.replace(
  `<button className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors">Podrobnosti</button>
              </div>
            </article>
          </div>
        </div>
      ))}
      <div className="flex flex-col items-center justify-center gap-2 py-4">`,
  `<button className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold transition-colors">Podrobnosti</button>
              </div>
            </article>
            </ShowIf>
          </div>
        </div>
      ))}
      <div className="flex flex-col items-center justify-center gap-2 py-4">`
);

fs.writeFileSync('src/components/MaliOglasiFeed.tsx', code);
