const fs = require('fs');

let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// The botched part is between `return (` and `  const savedCount = savedIds.length;`
const fixRegex = /  return \([\s\S]*?const savedCount = savedIds\.length;\s*return \(/;

code = code.replace(fixRegex, "  return (");

fs.writeFileSync('src/components/Header.tsx', code);
