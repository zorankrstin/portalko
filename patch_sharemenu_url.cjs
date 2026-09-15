const fs = require('fs');

let code = fs.readFileSync('src/components/ShareMenu.tsx', 'utf8');

code = code.replace(
  /export function ShareMenu\({ url = window\.location\.href, title = "Preveri to objavo!" }: { url\?: string, title\?: string }\) {/,
  `export function ShareMenu({ url, id, title = "Preveri to objavo!" }: { url?: string, id?: string, title?: string }) {
  const shareUrl = url || (id ? \`\${window.location.origin}\${window.location.pathname}?post=\${id}\` : window.location.href);`
);

code = code.replace(/url\)/g, 'shareUrl)');
code = code.replace(/writeText\(url\)/, 'writeText(shareUrl)');

fs.writeFileSync('src/components/ShareMenu.tsx', code);
