const fs = require('fs');

let code = fs.readFileSync('src/components/UserProfile.tsx', 'utf8');

// Remove the misplaced tab button
code = code.replace(/<button\s*onClick={\(\) => setActiveTab\('saved'\)}[\s\S]*?<\/button>\s*/, '');

// Insert it in the right place
const tabButton = `
        <button 
          onClick={() => setActiveTab('saved')}
          className={\`px-4 py-3 font-label-md text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 \${
            activeTab === 'saved' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/50 rounded-t-lg'
          }\`}
        >
          <Bookmark className="w-[1em] h-[1em] text-base" />
          <span>Shranjeno</span>
        </button>
`;
code = code.replace(/(<button\s*onClick={\(\) => setActiveTab\('settings'\)}\s*className={`px-4 py-3)/, `${tabButton}        $1`);

fs.writeFileSync('src/components/UserProfile.tsx', code);
