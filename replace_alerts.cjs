const fs = require('fs');

const path = 'c:\\Users\\USER\\Downloads\\kandy-vetcare\\src\\components\\SystemSettings.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace alerts with showToast
content = content.replace(/alert\((['"`])(.*?)(['"`])\)/g, (match, q1, msg, q2) => {
  const lowerMsg = msg.toLowerCase();
  let type = 'success';
  if (lowerMsg.includes('error') || lowerMsg.includes('❌') || lowerMsg.includes('failed') || lowerMsg.includes('denied') || lowerMsg.includes('missing') || lowerMsg.includes('invalid') || lowerMsg.includes('unrecognized') || lowerMsg.includes('unstable')) {
    type = 'error';
  } else if (lowerMsg.includes('warning') || lowerMsg.includes('notice') || lowerMsg.includes('please')) {
    type = 'info';
  }
  
  let cleanMsg = msg;
  cleanMsg = cleanMsg.replace(/^[❌✅]\s*/, '');
  cleanMsg = cleanMsg.replace(/\\n/g, ' ');
  
  return `showToast(${q1}${cleanMsg}${q2}, '${type}')`;
});

fs.writeFileSync(path, content, 'utf8');
console.log('Replaced alerts with showToast in SystemSettings.tsx');
