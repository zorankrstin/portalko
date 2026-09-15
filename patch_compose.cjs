const fs = require('fs');

let code = fs.readFileSync('src/components/ComposeModal.tsx', 'utf8');

code = code.replace(
  "import { useState } from 'react';",
  "import { useState, useEffect } from 'react';"
);

code = code.replace(
  "  const [postType, setPostType] = useState<PostType>(initialType);",
  `  const [postType, setPostType] = useState<PostType>(initialType);

  useEffect(() => {
    if (isOpen) {
      setPostType(initialType);
    }
  }, [isOpen, initialType]);`
);

fs.writeFileSync('src/components/ComposeModal.tsx', code);
