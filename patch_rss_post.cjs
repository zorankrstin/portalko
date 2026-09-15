const fs = require('fs');

let code = fs.readFileSync('src/components/posts/RssPost.tsx', 'utf8');

code = code.replace(
  '  const sourceInitial = sourceName ? sourceName.substring(0, 3).toUpperCase() : "RSS";',
  `  const [imgError, setImgError] = React.useState(false);

  const sourceInitial = sourceName ? sourceName.substring(0, 3).toUpperCase() : "RSS";

  const domain = React.useMemo(() => {
    try {
      return new URL(link || '').hostname;
    } catch (e) {
      return '';
    }
  }, [link]);
  
  const faviconUrl = domain ? \`https://www.google.com/s2/favicons?domain=\${domain}&sz=64\` : '';`
);

code = code.replace(
  `          <div className="w-7 h-7 rounded-md bg-primary-fixed flex items-center justify-center font-bold text-xs text-on-primary-fixed">
            {sourceInitial}
          </div>`,
  `          <div className="w-8 h-8 rounded-md bg-surface-container-high flex items-center justify-center font-bold text-xs text-on-surface-variant overflow-hidden shrink-0">
            {!imgError && faviconUrl ? (
              <img src={faviconUrl} alt={sourceName} className="w-full h-full object-cover" onError={() => setImgError(true)} />
            ) : (
              sourceInitial
            )}
          </div>`
);

fs.writeFileSync('src/components/posts/RssPost.tsx', code);
