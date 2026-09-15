const fs = require('fs');
let code = fs.readFileSync('src/components/LeftSidebar.tsx', 'utf8');

code = code.replace(
  '<option value="guest">👤 Gost (Samo branje)</option>',
  '<option value="guest">👤 Gost (Samo branje)</option>\n            <option value="admin">⚙️ Admin (Upravljanje)</option>'
);

fs.writeFileSync('src/components/LeftSidebar.tsx', code);
