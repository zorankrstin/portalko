const fs = require('fs');
let code = fs.readFileSync('src/components/BookmarkButton.tsx', 'utf8');

code = code.replace(
  "interface BookmarkButtonProps {\n  id: string;\n  className?: string;\n}",
  "interface BookmarkButtonProps {\n  id: string;\n  className?: string;\n  data?: any;\n}"
);

code = code.replace(
  "export function BookmarkButton({ id, className = '' }: BookmarkButtonProps) {",
  "export function BookmarkButton({ id, className = '', data }: BookmarkButtonProps) {"
);

code = code.replace(
  "onClick={() => toggleBookmark(id)}",
  "onClick={() => toggleBookmark(id, data)}"
);

fs.writeFileSync('src/components/BookmarkButton.tsx', code);
