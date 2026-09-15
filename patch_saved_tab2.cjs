const fs = require('fs');

let code = fs.readFileSync('src/components/SavedPostsTab.tsx', 'utf8');

code = code.replace(
  `  if (savedIds.length === 0) {
    const matchSearchTerms = (text: string, query: string) => {
    if (!query) return true;
    const terms = query.toLowerCase().trim().split(/\\s+/);
    const lowerText = (text || '').toLowerCase();
    return terms.every(term => lowerText.includes(term));
  };

  const isVisible = (id: string, text: string) => {
    return savedIds.includes(id) && matchSearchTerms(text, searchQuery);
  };

  const isRssVisible = (id: string) => {
    const data = savedItems[id] || {};
    const text = [data.title, data.description, data.sourceName].filter(Boolean).join(' ');
    return savedIds.includes(id) && matchSearchTerms(text, searchQuery);
  };

  return (`,
  `  const matchSearchTerms = (text: string, query: string) => {
    if (!query) return true;
    const terms = query.toLowerCase().trim().split(/\\s+/);
    const lowerText = (text || '').toLowerCase();
    return terms.every(term => lowerText.includes(term));
  };

  const isVisible = (id: string, text: string) => {
    return savedIds.includes(id) && matchSearchTerms(text, searchQuery);
  };

  const isRssVisible = (id: string) => {
    const data = savedItems[id] || {};
    const text = [data.title, data.description, data.sourceName].filter(Boolean).join(' ');
    return savedIds.includes(id) && matchSearchTerms(text, searchQuery);
  };

  if (savedIds.length === 0) {
    return (`
);

fs.writeFileSync('src/components/SavedPostsTab.tsx', code);
