const fs = require('fs');

let code = fs.readFileSync('src/components/MainFeed.tsx', 'utf8');

code = code.replace(
  "<RssFeedViewer />",
  "<RssFeedViewer searchQuery={searchQuery} />"
);

fs.writeFileSync('src/components/MainFeed.tsx', code);
