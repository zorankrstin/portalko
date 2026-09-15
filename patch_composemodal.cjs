const fs = require('fs');
let code = fs.readFileSync('src/components/ComposeModal.tsx', 'utf8');

// Add import
code = code.replace("import { useState } from 'react';", "import { useState } from 'react';\nimport { RichTextEditor } from './RichTextEditor';");

// Replace textarea with RichTextEditor
code = code.replace(
  /<textarea\s*rows=\{5\}\s*placeholder="O čem želite pisati\?"\s*className="w-full bg-surface-container-low px-4 py-3 rounded-xl font-body-md text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary border border-transparent transition-colors resize-none"\s*\/>/,
  '<RichTextEditor placeholder="O čem želite pisati?" />'
);

fs.writeFileSync('src/components/ComposeModal.tsx', code);
