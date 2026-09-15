const fs = require('fs');
let code = fs.readFileSync('src/components/MainFeed.tsx', 'utf8');

// Add import
code = code.replace(
  "import { NewsPost } from './posts/NewsPost';",
  "import { NewsPost } from './posts/NewsPost';\nimport { RssFeedViewer } from './RssFeedViewer';"
);

// Remove the static RSS dummy post
code = code.replace(
  "    { id: 'rss', Component: RssPost, text: 'rtvslo vlada sprejela nov zakon o dohodnini' },\n",
  ""
);

// Inject RssFeedViewer
code = code.replace(
  "{Array.from({ length: page }).map((_, index) => (",
  "      <RssFeedViewer />\n\n      {Array.from({ length: page }).map((_, index) => ("
);

fs.writeFileSync('src/components/MainFeed.tsx', code);
