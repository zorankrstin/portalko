const fs = require('fs');

let codeApp = fs.readFileSync('src/App.tsx', 'utf8');
codeApp = codeApp.replace(
  "<SavedView />",
  "<SavedView searchQuery={searchQuery} />"
);
fs.writeFileSync('src/App.tsx', codeApp);

let codeSaved = fs.readFileSync('src/components/SavedView.tsx', 'utf8');
codeSaved = codeSaved.replace(
  "export function SavedView() {",
  "export function SavedView({ searchQuery = '' }: { searchQuery?: string }) {"
);
codeSaved = codeSaved.replace(
  "<SavedPostsTab />",
  "<SavedPostsTab searchQuery={searchQuery} />"
);
fs.writeFileSync('src/components/SavedView.tsx', codeSaved);

let codeTab = fs.readFileSync('src/components/SavedPostsTab.tsx', 'utf8');
codeTab = codeTab.replace(
  "export function SavedPostsTab() {",
  "export function SavedPostsTab({ searchQuery = '' }: { searchQuery?: string }) {"
);
codeTab = codeTab.replace(
  "return (",
  `const matchSearchTerms = (text: string, query: string) => {
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

  return (`
);

codeTab = codeTab.replace(
  "{savedIds.includes('blog') && <BlogPost id=\"blog\" />}",
  "{isVisible('blog', 'maja zupan potep po dolini soče 5 skritih kotičkov pomlad') && <BlogPost id=\"blog\" />}"
);
codeTab = codeTab.replace(
  "{savedIds.includes('rss') && <RssPost id=\"rss\" />}",
  "{isVisible('rss', 'cene življenjskih potrebščin inflacija rtv slovenija') && <RssPost id=\"rss\" />}"
);
codeTab = codeTab.replace(
  "{savedIds.includes('ad') && <AdPost id=\"ad\" />}",
  "{isVisible('ad', 'prodam audi a4 2.0 tdi letnik 2018 odličen marko k') && <AdPost id=\"ad\" />}"
);
codeTab = codeTab.replace(
  "{savedIds.includes('deal') && <DealPost id=\"deal\" />}",
  "{isVisible('deal', 'big bang super vikend popustov 20% televizorje') && <DealPost id=\"deal\" />}"
);
codeTab = codeTab.replace(
  "{savedIds.includes('event') && <EventPost id=\"event\" />}",
  "{isVisible('event', 'kino šiška koncert joker out') && <EventPost id=\"event\" />}"
);
codeTab = codeTab.replace(
  "{savedIds.includes('news') && <NewsPost id=\"news\" />}",
  "{isVisible('news', '24ur huda prometna nesreča štajerski avtocesti') && <NewsPost id=\"news\" />}"
);

codeTab = codeTab.replace(
  `{savedIds.filter(id => id.startsWith('rss-')).map(id => (
        <RssPost key={id} id={id} {...(savedItems[id] || {})} />
      ))}`,
  `{savedIds.filter(id => id.startsWith('rss-') && isRssVisible(id)).map(id => (
        <RssPost key={id} id={id} {...(savedItems[id] || {})} />
      ))}`
);

fs.writeFileSync('src/components/SavedPostsTab.tsx', codeTab);
