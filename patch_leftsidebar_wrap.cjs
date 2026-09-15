const fs = require('fs');
let code = fs.readFileSync('src/components/LeftSidebar.tsx', 'utf8');

// Wrap contents to prevent flex shrinking
code = code.replace(
  '<aside className="hidden lg:flex lg:col-span-3 flex-col gap-space-md sticky top-20 self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto no-scrollbar pb-6">',
  '<aside className="hidden lg:block lg:col-span-3 sticky top-20 self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto no-scrollbar pb-6">\n      <div className="flex flex-col gap-space-md">'
);

code = code.replace(
  '    </aside>',
  '      </div>\n    </aside>'
);

// Fix overflow hidden on user card
code = code.replace(
  '<div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm relative overflow-hidden">',
  '<div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container/50 flex flex-col gap-space-sm relative">'
);

code = code.replace(
  '<div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>',
  '<div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"><div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 rounded-full blur-2xl -mr-8 -mt-8"></div></div>'
);

fs.writeFileSync('src/components/LeftSidebar.tsx', code);
