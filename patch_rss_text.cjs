const fs = require('fs');
let code = fs.readFileSync('src/components/posts/RssPost.tsx', 'utf8');

code = code.replace(
  `<span className="block text-outline text-xs mt-0.5">(Odpre zunanjo spletno stran medija)</span>`,
  ``
);

fs.writeFileSync('src/components/posts/RssPost.tsx', code);
