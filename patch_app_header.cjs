const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "<Header \n        onProfileClick={() => setCurrentView('profile')} \n        searchQuery={searchQuery}\n        onSearchChange={setSearchQuery}\n      />",
  "<Header \n        onProfileClick={() => setCurrentView('profile')}\n        onSavedClick={() => setCurrentView('saved')}\n        searchQuery={searchQuery}\n        onSearchChange={setSearchQuery}\n      />"
);

fs.writeFileSync('src/App.tsx', code);
