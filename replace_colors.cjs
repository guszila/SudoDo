const fs = require('fs');
const path = require('path');

const replacements = [
  { search: /#7F77DD/gi, replace: 'var(--theme-accent)' },
  { search: /#3C3489/gi, replace: 'var(--theme-accent-dark)' },
  { search: /#EEEDFE/gi, replace: 'var(--theme-accent-light)' },
  { search: /rgba\(127,\s*119,\s*221,\s*0\.4\)/gi, replace: 'var(--theme-accent-border)' },
  { search: /#534AB7/gi, replace: 'var(--theme-nav-active)' },
  { search: /#4B439F/gi, replace: 'var(--theme-section-label)' },
  { search: /#CECBF6/gi, replace: 'var(--theme-avatar-bg)' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;
  
  for (const { search, replace } of replacements) {
    content = content.replace(search, replace);
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.css')) {
      processFile(fullPath);
    }
  }
}

walkDir('src');
console.log('Color replacement complete.');
