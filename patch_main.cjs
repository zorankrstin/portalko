const fs = require('fs');
let code = fs.readFileSync('src/main.tsx', 'utf8');

code = code.replace(
  "import { BookmarkProvider } from './contexts/BookmarkContext';",
  "import { BookmarkProvider } from './contexts/BookmarkContext';\nimport { AuthProvider } from './contexts/AuthContext';"
);

code = code.replace(
  "<BookmarkProvider>",
  "<AuthProvider>\n      <BookmarkProvider>"
);
code = code.replace(
  "</BookmarkProvider>",
  "</BookmarkProvider>\n    </AuthProvider>"
);

fs.writeFileSync('src/main.tsx', code);
