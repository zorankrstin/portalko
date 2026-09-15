const fs = require('fs');
let code = fs.readFileSync('src/components/NotificationCenter.tsx', 'utf8');

code = code.replace(
  "type: 'like' | 'event' | 'message' | 'alert';",
  "type: 'like' | 'event' | 'message' | 'alert' | 'bookmark';"
);

code = code.replace(
  "import { Bell, Heart, Calendar, MessageSquare, Tag, Check } from 'lucide-react';",
  "import { Bell, Heart, Calendar, MessageSquare, Tag, Check, Bookmark } from 'lucide-react';"
);

code = code.replace(
  "const MOCK_NOTIFICATIONS: Notification[] = [",
  `const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '0', type: 'bookmark', title: 'Nova aktivnost (Shranjeno)', description: 'Na vaši shranjeni objavi "Kino Šiška koncert" je nov komentar.', time: 'pravkar', read: false },`
);

code = code.replace(
  "case 'alert': return <Tag className=\"w-4 h-4 text-error\" />;",
  "case 'alert': return <Tag className=\"w-4 h-4 text-error\" />;\n      case 'bookmark': return <Bookmark className=\"w-4 h-4 text-primary\" />;"
);

// We can also make the unread dot more prominent if it represents a "simple notification indicator"
code = code.replace(
  `<span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-tertiary-container"></span>`,
  `<span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-error border-2 border-surface-container-lowest animate-pulse"></span>`
);

fs.writeFileSync('src/components/NotificationCenter.tsx', code);
