const fs = require('fs');

let code = fs.readFileSync('src/contexts/BookmarkContext.tsx', 'utf8');

code = code.replace(
  "  savedIds: string[];\n  toggleBookmark: (id: string) => void;",
  "  savedIds: string[];\n  savedItems: Record<string, any>;\n  toggleBookmark: (id: string, data?: any) => void;"
);

code = code.replace(
  "  const [savedIds, setSavedIds] = useState<string[]>([]);",
  "  const [savedIds, setSavedIds] = useState<string[]>([]);\n  const [savedItems, setSavedItems] = useState<Record<string, any>>({});"
);

code = code.replace(
  "  const toggleBookmark = (id: string) => {\n    setSavedIds(prev => \n      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]\n    );\n  };",
  "  const toggleBookmark = (id: string, data?: any) => {\n    setSavedIds(prev => {\n      if (prev.includes(id)) {\n        const newItems = { ...savedItems };\n        delete newItems[id];\n        setSavedItems(newItems);\n        return prev.filter(i => i !== id);\n      } else {\n        if (data) {\n          setSavedItems(items => ({ ...items, [id]: data }));\n        }\n        return [...prev, id];\n      }\n    });\n  };"
);

code = code.replace(
  "value={{ savedIds, toggleBookmark, isBookmarked }}",
  "value={{ savedIds, savedItems, toggleBookmark, isBookmarked }}"
);

fs.writeFileSync('src/contexts/BookmarkContext.tsx', code);
