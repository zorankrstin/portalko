const fs = require('fs');

let oglasi = fs.readFileSync('src/components/MaliOglasiFeed.tsx', 'utf8');
oglasi = oglasi.replace(/<button className="p-1\.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant( transition-colors)?"( title="Shrani med zaznamke")?>\s*<Bookmark className="w-\[1em\] h-\[1em\] text-sm" \/>\s*<\/button>/g, (match, p1, p2, offset) => {
  return `<BookmarkButton id="oglas-inline-${offset}" />`;
});
fs.writeFileSync('src/components/MaliOglasiFeed.tsx', oglasi);

let dogodki = fs.readFileSync('src/components/DogodkiFeed.tsx', 'utf8');
if (!dogodki.includes('BookmarkButton')) {
  dogodki = dogodki.replace('import { Search', 'import { BookmarkButton } from "./BookmarkButton";\nimport { Search');
}
dogodki = dogodki.replace(/<button className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant transition-colors" title="Shrani dogodek" type="button">\s*<svg[^>]*>.*?<\/svg>\s*<\/button>/g, (match, offset) => {
  return `<BookmarkButton id="dogodek-inline-${offset}" />`;
});
dogodki = dogodki.replace(/<button className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant transition-colors" title="Shrani dogodek" type="button">\s*<Bookmark[^>]*>.*?<\/Bookmark>\s*<\/button>/g, (match, offset) => {
  return `<BookmarkButton id="dogodek-inline-${offset}" />`;
});

fs.writeFileSync('src/components/DogodkiFeed.tsx', dogodki);
