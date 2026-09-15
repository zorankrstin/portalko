const fs = require('fs');

function addImport(content, importStatement) {
  if (!content.includes(importStatement)) {
    return content.replace(/import [^\n]*\n/, match => match + importStatement + '\n');
  }
  return content;
}

// 1. BlogPost
let blog = fs.readFileSync('src/components/posts/BlogPost.tsx', 'utf8');
blog = addImport(blog, 'import { ShareMenu } from "../ShareMenu";');
blog = blog.replace('<BookmarkButton id={id} />', '<BookmarkButton id={id} />\n          <ShareMenu />');
fs.writeFileSync('src/components/posts/BlogPost.tsx', blog);

// 2. AdPost
let ad = fs.readFileSync('src/components/posts/AdPost.tsx', 'utf8');
ad = addImport(ad, 'import { ShareMenu } from "../ShareMenu";');
// It doesn't have BookmarkButton inserted correctly yet. We will insert it at the top right.
ad = ad.replace(
  /<span className="font-label-caps text-label-caps bg-surface-container text-on-surface-variant px-2 py-1 rounded-lg">\s*Oglas\s*<\/span>\s*<\/div>/,
  `<span className="font-label-caps text-label-caps bg-surface-container text-on-surface-variant px-2 py-1 rounded-lg">\n            Oglas\n          </span>\n          <BookmarkButton id={id} />\n          <ShareMenu />\n        </div>`
);
// Also remove the old fake bookmark button in AdPost
ad = ad.replace(/<button className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant transition-colors" title="Shrani oglas med priljubljene" type="button">\s*<Bookmark className="w-\[1em\] h-\[1em\] text-lg" \/>\s*<\/button>/, '');
fs.writeFileSync('src/components/posts/AdPost.tsx', ad);

// 3. DealPost
let deal = fs.readFileSync('src/components/posts/DealPost.tsx', 'utf8');
deal = addImport(deal, 'import { ShareMenu } from "../ShareMenu";');
deal = deal.replace(
  /<span className="bg-tertiary text-on-tertiary font-label-caps text-label-caps px-2.5 py-1 rounded-full uppercase font-bold tracking-wider animate-pulse">\s*Ekskluzivno\s*<\/span>\s*<\/div>/,
  `<span className="bg-tertiary text-on-tertiary font-label-caps text-label-caps px-2.5 py-1 rounded-full uppercase font-bold tracking-wider animate-pulse hidden sm:inline-flex">\n            Ekskluzivno\n          </span>\n          <BookmarkButton id={id} />\n          <ShareMenu />\n        </div>`
);
fs.writeFileSync('src/components/posts/DealPost.tsx', deal);

// 4. EventPost
let event = fs.readFileSync('src/components/posts/EventPost.tsx', 'utf8');
event = addImport(event, 'import { ShareMenu } from "../ShareMenu";');
event = event.replace(
  /<span className="font-label-caps text-label-caps bg-tertiary-fixed text-on-tertiary-fixed px-2.5 py-1 rounded-full font-bold">\s*Dogodek\s*<\/span>/,
  `<div className="flex items-center gap-1">\n          <span className="font-label-caps text-label-caps bg-tertiary-fixed text-on-tertiary-fixed px-2.5 py-1 rounded-full font-bold hidden sm:inline-flex">\n            Dogodek\n          </span>\n          <BookmarkButton id={id} />\n          <ShareMenu />\n        </div>`
);
fs.writeFileSync('src/components/posts/EventPost.tsx', event);

// 5. NewsPost
let news = fs.readFileSync('src/components/posts/NewsPost.tsx', 'utf8');
news = addImport(news, 'import { ShareMenu } from "../ShareMenu";');
news = news.replace(
  /<a className="font-label-caps text-label-caps text-primary hover:underline flex items-center gap-0\.5" href="https:\/\/www\.24ur\.com" rel="noopener noreferrer" target="_blank">\s*<span>Beri na 24ur\.com<\/span>\s*<ExternalLink className="w-\[1em\] h-\[1em\] text-xs" \/>\s*<\/a>/,
  `<div className="flex items-center gap-1">\n          <a className="font-label-caps text-label-caps text-primary hover:underline flex items-center gap-0.5 hidden sm:flex" href="https://www.24ur.com" rel="noopener noreferrer" target="_blank">\n            <span>Beri na 24ur.com</span>\n            <ExternalLink className="w-[1em] h-[1em] text-xs" />\n          </a>\n          <BookmarkButton id={id} />\n          <ShareMenu />\n        </div>`
);
fs.writeFileSync('src/components/posts/NewsPost.tsx', news);

// 6. RssPost
let rss = fs.readFileSync('src/components/posts/RssPost.tsx', 'utf8');
rss = addImport(rss, 'import { ShareMenu } from "../ShareMenu";');
rss = rss.replace(
  /<a className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors" href="https:\/\/www\.rtvslo\.si" target="_blank" rel="noopener noreferrer" title="Odpri izvirnik">\s*<ExternalLink className="w-\[1em\] h-\[1em\] text-sm" \/>\s*<\/a>/,
  `<a className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors hidden sm:flex" href="https://www.rtvslo.si" target="_blank" rel="noopener noreferrer" title="Odpri izvirnik">\n            <ExternalLink className="w-[1em] h-[1em] text-sm" />\n          </a>\n          <BookmarkButton id={id} />\n          <ShareMenu />`
);
fs.writeFileSync('src/components/posts/RssPost.tsx', rss);

// 7. DogodkiFeed.tsx
let dogodki = fs.readFileSync('src/components/DogodkiFeed.tsx', 'utf8');
dogodki = addImport(dogodki, 'import { ShareMenu } from "./ShareMenu";');
dogodki = dogodki.replace(/<BookmarkButton id="dogodek-inline-([0-9]+)" \/>/g, '<BookmarkButton id="dogodek-inline-$1" />\n                  <ShareMenu />');
fs.writeFileSync('src/components/DogodkiFeed.tsx', dogodki);

// 8. MaliOglasiFeed.tsx
let oglasi = fs.readFileSync('src/components/MaliOglasiFeed.tsx', 'utf8');
oglasi = addImport(oglasi, 'import { ShareMenu } from "./ShareMenu";');
oglasi = oglasi.replace(/<BookmarkButton id="oglas-inline-([0-9]+)" \/>/g, '<BookmarkButton id="oglas-inline-$1" />\n                <ShareMenu />');
fs.writeFileSync('src/components/MaliOglasiFeed.tsx', oglasi);

console.log("Done");
