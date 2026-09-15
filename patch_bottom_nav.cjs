const fs = require('fs');

let code = fs.readFileSync('src/components/BottomNav.tsx', 'utf8');

code = code.replace(
  "import { Home, ShoppingBag, CalendarDays, User } from 'lucide-react';",
  "import { Home, ShoppingBag, CalendarDays, User, Bookmark } from 'lucide-react';"
);

const newBtn = `      <button 
        onClick={() => onViewChange('saved')}
        className={\`flex flex-col items-center gap-1 p-2 rounded-xl min-w-[4rem] transition-colors \${currentView === 'saved' ? 'text-primary' : 'text-on-surface-variant'}\`}
      >
        <Bookmark className={\`w-6 h-6 \${currentView === 'saved' ? 'fill-primary/20' : ''}\`} />
        <span className="text-[10px] font-label-caps font-semibold">Shranjeno</span>
      </button>
      <button`;

code = code.replace(
  "      <button \n        onClick={() => onViewChange('profile')}",
  newBtn + " \n        onClick={() => onViewChange('profile')}"
);

fs.writeFileSync('src/components/BottomNav.tsx', code);
