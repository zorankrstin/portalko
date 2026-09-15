const fs = require('fs');

let blog = fs.readFileSync('src/components/posts/BlogPost.tsx', 'utf8');

const regexToRemove = /<div className="flex items-center gap-1">\s*<span className="font-label-caps text-label-caps text-outline mr-1">Deli:<\/span>[\s\S]*?<\/div>/;
blog = blog.replace(regexToRemove, '');

fs.writeFileSync('src/components/posts/BlogPost.tsx', blog);
