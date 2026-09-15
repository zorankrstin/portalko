const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace(
  "export function Header({ \n  onProfileClick,\n  searchQuery,\n  onSearchChange\n}: { \n  onProfileClick?: () => void;\n  onSavedClick?: () => void;",
  "export function Header({ \n  onProfileClick,\n  onSavedClick,\n  searchQuery,\n  onSearchChange\n}: { \n  onProfileClick?: () => void;\n  onSavedClick?: () => void;"
);

fs.writeFileSync('src/components/Header.tsx', code);
