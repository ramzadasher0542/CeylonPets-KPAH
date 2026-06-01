const fs = require('fs');
const path = require('path');

const directories = [
  'c:\\Users\\USER\\Downloads\\kandy-vetcare\\src',
  'c:\\Users\\USER\\Downloads\\kandy-vetcare\\src\\components'
];

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  if (filePath.includes('Toast.tsx') || filePath.includes('initialData.ts') || filePath.includes('types.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('alert(')) return;
  
  let modified = false;
  
  content = content.replace(/alert\((['"`])(.*?)(['"`])\)/g, (match, q1, msg, q2) => {
    modified = true;
    const lowerMsg = msg.toLowerCase();
    let type = 'success';
    if (lowerMsg.includes('error') || lowerMsg.includes('❌') || lowerMsg.includes('failed') || lowerMsg.includes('denied') || lowerMsg.includes('missing') || lowerMsg.includes('invalid') || lowerMsg.includes('unrecognized') || lowerMsg.includes('unstable') || lowerMsg.includes('critical') || lowerMsg.includes('blocked') || lowerMsg.includes('cannot')) {
      type = 'error';
    } else if (lowerMsg.includes('warning') || lowerMsg.includes('notice') || lowerMsg.includes('please')) {
      type = 'info';
    }
    
    let cleanMsg = msg;
    cleanMsg = cleanMsg.replace(/^[❌✅]\s*/, '');
    cleanMsg = cleanMsg.replace(/\\n/g, ' ');
    
    return `showToast(${q1}${cleanMsg}${q2}, '${type}')`;
  });
  
  if (modified && !content.includes('showToast')) {
    const importStatement = filePath.includes('components') 
      ? `import { showToast } from './Toast';\n`
      : `import { showToast } from './components/Toast';\n`;
      
    // Find the last import
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLastImport = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfLastImport + 1) + importStatement + content.slice(endOfLastImport + 1);
    } else {
      content = importStatement + content;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

directories.forEach(dir => {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isFile()) {
      processFile(fullPath);
    }
  });
});
