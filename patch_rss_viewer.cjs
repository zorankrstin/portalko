const fs = require('fs');

let code = fs.readFileSync('src/components/RssFeedViewer.tsx', 'utf8');

code = code.replace(
  "export function RssFeedViewer() {",
  "export function RssFeedViewer({ searchQuery = '' }: { searchQuery?: string }) {"
);

code = code.replace(
  "  if (items.length === 0) {\n    return null; // Don't show anything if no active feeds or no items\n  }\n\n  return (\n    <div className=\"flex flex-col gap-space-md\">\n      {items.map(item => (\n        <RssPost",
  `  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.sourceName && item.sourceName.toLowerCase().includes(q))
    );
  });

  if (items.length === 0) {
    return null; // Don't show anything if no active feeds or no items
  }

  if (searchQuery && filteredItems.length === 0) {
    return null; // Don't show anything if search filters everything out
  }

  return (
    <div className="flex flex-col gap-space-md">
      {filteredItems.map(item => (
        <RssPost`
);

fs.writeFileSync('src/components/RssFeedViewer.tsx', code);
