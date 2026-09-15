const fs = require('fs');

let code = fs.readFileSync('src/components/MaliOglasiFeed.tsx', 'utf8');

// I need to add ShowIf wrapper around the inner hardcoded articles
// The problem is that the hardcoded posts are wrapped in a map, but the map doesn't have ShowIf inside properly, or it's not structured individually.
