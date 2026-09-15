const fs = require('fs');
let code = fs.readFileSync('src/components/LeftSidebar.tsx', 'utf8');

if (!code.includes('Settings')) {
  code = code.replace("import { Home,", "import { Settings, Home,");
}

code = code.replace(
  '<span className="w-[1em] h-[1em] flex items-center justify-center text-lg text-error">⚙️</span>',
  '<Settings className="w-[1em] h-[1em] text-lg text-error" />'
);

fs.writeFileSync('src/components/LeftSidebar.tsx', code);
