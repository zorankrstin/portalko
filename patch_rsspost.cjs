const fs = require('fs');
let code = fs.readFileSync('src/components/posts/RssPost.tsx', 'utf8');

code = code.replace(
  "<BookmarkButton id={id} />",
  "<BookmarkButton id={id} data={{ title, link, description, sourceName, pubDate, thumbnail }} />"
);

fs.writeFileSync('src/components/posts/RssPost.tsx', code);
