const fs = require('fs');
let code = fs.readFileSync('src/components/MaliOglasiFeed.tsx', 'utf8');

code = code.replace(
  `            </article>
          </div>
        </div>
      ))}

      <div className="flex flex-col items-center justify-center gap-2 py-4">`,
  `            </article>
            </ShowIf>
          </div>
        </div>
      ))}

      <div className="flex flex-col items-center justify-center gap-2 py-4">`
);

fs.writeFileSync('src/components/MaliOglasiFeed.tsx', code);
