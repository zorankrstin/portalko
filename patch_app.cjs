const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "import type { Role, ViewMode } from './types';",
  "import type { ViewMode } from './types';\nimport { useAuth } from './contexts/AuthContext';"
);

code = code.replace(
  "const [role, setRole] = useState<Role>('verified');",
  "const { currentUser } = useAuth();\n  const role = currentUser?.role || 'guest';"
);

fs.writeFileSync('src/App.tsx', code);
