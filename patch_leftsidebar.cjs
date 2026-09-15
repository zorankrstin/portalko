const fs = require('fs');
let code = fs.readFileSync('src/components/LeftSidebar.tsx', 'utf8');

// Add ShieldAlert or Settings icon import
if (!code.includes('ShieldAlert')) {
  code = code.replace("import { Home, Users, Search", "import { Home, Users, Search, ShieldAlert");
  // maybe the import is just "import { ... } from 'lucide-react';" Let's check imports
}

const adminLink = `        {role === 'admin' && (
          <a 
            className={\`flex items-center justify-between px-3 py-2.5 rounded-xl font-label-lg text-label-lg transition-colors \${currentView === 'admin' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}\`} 
            onClick={(e) => { e.preventDefault(); onViewChange('admin'); }}
            href="#"
          >
            <span className="flex items-center gap-2.5">
              <span className="w-[1em] h-[1em] flex items-center justify-center text-lg text-error">⚙️</span>
              <span className="text-error font-semibold">Admin Panel</span>
            </span>
          </a>
        )}`;

code = code.replace(
  '</a>\n      </nav>',
  '</a>\n' + adminLink + '\n      </nav>'
);

fs.writeFileSync('src/components/LeftSidebar.tsx', code);
