const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /<LeftSidebar \s*role=\{role\} \s*onRoleChange=\{setRole\} \s*currentView=\{currentView\}\s*onViewChange=\{setCurrentView\}\s*\/>/m,
  "<LeftSidebar currentView={currentView} onViewChange={setCurrentView} />"
);

fs.writeFileSync('src/App.tsx', code);
