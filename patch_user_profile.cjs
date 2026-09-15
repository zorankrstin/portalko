const fs = require('fs');
let code = fs.readFileSync('src/components/UserProfile.tsx', 'utf8');

code = code.replace(
  '<main className="lg:col-span-9 flex flex-col gap-space-md">',
  '<main className="lg:col-span-6 flex flex-col gap-space-md">'
);

fs.writeFileSync('src/components/UserProfile.tsx', code);

let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(
  `          {currentView === 'profile' && (
            <UserProfile onViewChange={setCurrentView} />
          )}`,
  `          {currentView === 'profile' && (
            <>
              <UserProfile onViewChange={setCurrentView} />
              <RightSidebar />
            </>
          )}`
);

fs.writeFileSync('src/App.tsx', appCode);
