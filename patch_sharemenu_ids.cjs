const fs = require('fs');

const files = [
  'src/components/posts/BlogPost.tsx',
  'src/components/posts/AdPost.tsx',
  'src/components/posts/DealPost.tsx',
  'src/components/posts/EventPost.tsx',
  'src/components/posts/NewsPost.tsx',
  'src/components/posts/RssPost.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<ShareMenu \/>/g, '<ShareMenu id={id} />');
  fs.writeFileSync(file, content);
}

// For inline feeds
let oglasi = fs.readFileSync('src/components/MaliOglasiFeed.tsx', 'utf8');
oglasi = oglasi.replace(/<BookmarkButton id="oglas-inline-([0-9]+)" \/>\s*<ShareMenu \/>/g, '<BookmarkButton id="oglas-inline-$1" />\n                <ShareMenu id={`oglas-inline-${$1}`} />');
fs.writeFileSync('src/components/MaliOglasiFeed.tsx', oglasi);

let dogodki = fs.readFileSync('src/components/DogodkiFeed.tsx', 'utf8');
dogodki = dogodki.replace(/<BookmarkButton id="dogodek-inline-([0-9]+)" \/>\s*<ShareMenu \/>/g, '<BookmarkButton id="dogodek-inline-$1" />\n                  <ShareMenu id={`dogodek-inline-${$1}`} />');
fs.writeFileSync('src/components/DogodkiFeed.tsx', dogodki);

console.log("Done");
