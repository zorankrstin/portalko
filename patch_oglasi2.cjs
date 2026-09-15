const fs = require('fs');
let code = fs.readFileSync('src/components/MaliOglasiFeed.tsx', 'utf8');

code = code.replace(
  `<article className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 hover:shadow-md transition-shadow flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high text-primary flex items-center justify-center font-bold">TB</div>`,
  `<ShowIf text="gorsko kolo scott scale 960 kolesarstvo šport prosti čas maribor tabor tomaž">
          <article className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 hover:shadow-md transition-shadow flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high text-primary flex items-center justify-center font-bold">TB</div>`
);
code = code.replace(
  `<button className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs font-semibold transition-colors flex items-center gap-1">
                  <MessageSquare className="w-[1em] h-[1em] text-xs" /> Sporočilo
                </button>
              </div>
            </div>
          </article>`,
  `<button className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-xs font-semibold transition-colors flex items-center gap-1">
                  <MessageSquare className="w-[1em] h-[1em] text-xs" /> Sporočilo
                </button>
              </div>
            </div>
          </article>
          </ShowIf>`
);

fs.writeFileSync('src/components/MaliOglasiFeed.tsx', code);
