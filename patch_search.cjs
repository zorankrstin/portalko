const fs = require('fs');

const createMatchFunction = () => `
const matchSearchTerms = (text, query) => {
  if (!query) return true;
  const terms = query.toLowerCase().trim().split(/\\s+/);
  const lowerText = (text || '').toLowerCase();
  return terms.every(term => lowerText.includes(term));
};
`;

// 1. MainFeed
let mainFeed = fs.readFileSync('src/components/MainFeed.tsx', 'utf8');
mainFeed = mainFeed.replace(
  "const matchesSearch = !searchQuery || post.text.toLowerCase().includes(searchQuery.toLowerCase());",
  `const matchesSearch = (() => {
      if (!searchQuery) return true;
      const terms = searchQuery.toLowerCase().trim().split(/\\s+/);
      const lowerText = (post.text || '').toLowerCase();
      return terms.every(term => lowerText.includes(term));
    })();`
);
fs.writeFileSync('src/components/MainFeed.tsx', mainFeed);

// 2. DogodkiFeed
let dogodkiFeed = fs.readFileSync('src/components/DogodkiFeed.tsx', 'utf8');
dogodkiFeed = dogodkiFeed.replace(
  "if (searchQuery && !text.toLowerCase().includes(searchQuery.toLowerCase())) return null;",
  `if (searchQuery) {
      const terms = searchQuery.toLowerCase().trim().split(/\\s+/);
      const lowerText = (text || '').toLowerCase();
      if (!terms.every(term => lowerText.includes(term))) return null;
    }`
);
fs.writeFileSync('src/components/DogodkiFeed.tsx', dogodkiFeed);

// 3. MaliOglasiFeed
let maliOglasiFeed = fs.readFileSync('src/components/MaliOglasiFeed.tsx', 'utf8');
maliOglasiFeed = maliOglasiFeed.replace(
  "if (text.toLowerCase().includes(searchQuery.toLowerCase())) return <>{children}</>;\n    return null;",
  `const terms = searchQuery.toLowerCase().trim().split(/\\s+/);
    const lowerText = (text || '').toLowerCase();
    if (terms.every(term => lowerText.includes(term))) return <>{children}</>;
    return null;`
);
fs.writeFileSync('src/components/MaliOglasiFeed.tsx', maliOglasiFeed);

// 4. RssFeedViewer
let rssFeedViewer = fs.readFileSync('src/components/RssFeedViewer.tsx', 'utf8');
rssFeedViewer = rssFeedViewer.replace(
  `const q = searchQuery.toLowerCase();
    return (
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.sourceName && item.sourceName.toLowerCase().includes(q))
    );`,
  `const terms = searchQuery.toLowerCase().trim().split(/\\s+/);
    return terms.every(term => {
      return (
        (item.title && item.title.toLowerCase().includes(term)) ||
        (item.description && item.description.toLowerCase().includes(term)) ||
        (item.sourceName && item.sourceName.toLowerCase().includes(term))
      );
    });`
);
fs.writeFileSync('src/components/RssFeedViewer.tsx', rssFeedViewer);

