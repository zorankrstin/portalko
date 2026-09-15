const fs = require('fs');

let code = fs.readFileSync('src/components/posts/RssPost.tsx', 'utf8');

code = code.replace(
  `<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant font-label-caps text-label-caps hidden sm:inline-flex">
            <Rss className="w-[1em] h-[1em] text-xs" /> RSS Avtomatika
          </span>`,
  ``
);

code = code.replace(
  `<div className="flex items-center justify-between pt-2 border-t border-surface-container-low text-xs text-outline">
        <span className="flex items-center gap-1">
          <Clock className="w-[1em] h-[1em] text-sm" /> Posodobljeno prek RSS Fetcherja
        </span>
      </div>`,
  ``
);

fs.writeFileSync('src/components/posts/RssPost.tsx', code);
