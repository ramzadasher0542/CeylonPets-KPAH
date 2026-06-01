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
  
  // Clean up emojis from start if any
  let cleanMsg = msg;
  // Actually we can leave emojis, but since we have beautiful icons, we might want to remove leading emojis like ❌ or ✅
  cleanMsg = cleanMsg.replace(/^[❌✅]\s*/, '');
  
  // The string might have newlines `\n\n`, let's leave them or replace with spaces
  cleanMsg = cleanMsg.replace(/\\n/g, ' ');
  
  return `showToast(${q1}${cleanMsg}${q2}, '${type}')`;
});

// There is one dynamic alert: alert(`Success: Registered ${newStaffName}...`)
// It is covered by the above regex since it matches backticks (`).

fs.writeFileSync(path, content, 'utf8');
console.log('Replaced alerts with showToast in SystemSettings.tsx');
