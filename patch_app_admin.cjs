const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add import
code = code.replace(
  "import { BottomNav } from './components/BottomNav';",
  "import { BottomNav } from './components/BottomNav';\nimport { AdminDashboard } from './components/AdminDashboard';"
);

// Add view logic
code = code.replace(
  "{currentView === 'profile' && (\n            <UserProfile onViewChange={setCurrentView} />\n          )}",
  "{currentView === 'profile' && (\n            <UserProfile onViewChange={setCurrentView} />\n          )}\n          {currentView === 'admin' && (\n            <AdminDashboard />\n          )}"
);

fs.writeFileSync('src/App.tsx', code);
