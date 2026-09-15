const fs = require('fs');
let code = fs.readFileSync('src/components/SavedPostsTab.tsx', 'utf8');

code = code.replace(
  "const { savedIds } = useBookmarks();",
  "const { savedIds, savedItems } = useBookmarks();"
);

code = code.replace(
  "<RssPost key={id} id={id} />",
  "<RssPost key={id} id={id} {...(savedItems[id] || {})} />"
);

fs.writeFileSync('src/components/SavedPostsTab.tsx', code);
