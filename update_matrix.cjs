const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\USER\\Downloads\\kandy-vetcare\\src\\components\\SystemSettings.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Update handleUpdatePermission type
content = content.replace(
  /const handleUpdatePermission = \(role: 'cashier' \| 'veterinarian' \| 'admin', view: string, checked: boolean\) => {/,
  `const handleUpdatePermission = (role: 'cashier' | 'veterinarian' | 'admin' | 'owner', view: string, checked: boolean) => {`
);

// Update rolePermissions initial value if not already owner
if (!content.includes('owner: [\'dashboard\',')) {
  content = content.replace(
    /admin: \['dashboard', 'pos', 'appointments', 'records', 'inventory', 'reminders', 'portal'\]\s*\}/g,
    `admin: ['dashboard', 'pos', 'appointments', 'records', 'inventory', 'reminders', 'portal'],\n          owner: ['dashboard', 'pos', 'appointments', 'records', 'inventory', 'reminders', 'portal']\n        }`
  );
  // for the one around line 155 without indentation:
  content = content.replace(
    /admin: \['dashboard', 'pos', 'appointments', 'records', 'inventory', 'reminders', 'portal'\]\n  \}/g,
    `admin: ['dashboard', 'pos', 'appointments', 'records', 'inventory', 'reminders', 'portal'],\n    owner: ['dashboard', 'pos', 'appointments', 'records', 'inventory', 'reminders', 'portal']\n  }`
  );
}

// Update the headers of the matrix
content = content.replace(
  /<div className="col-span-2\.5 text-center">Cashier<\/div>\s*<div className="col-span-2\.5 text-center">Vet Doc<\/div>\s*<div className="col-span-3 text-center">Clinic Admin<\/div>/,
  `<div className="col-span-2 text-center">Cashier</div>\n                        <div className="col-span-2 text-center">Vet Doc</div>\n                        <div className="col-span-2 text-center">Clinic Admin</div>\n                        <div className="col-span-2 text-center">Owner</div>`
);

// Update all the rows
const sections = ['dashboard', 'pos', 'appointments', 'records', 'inventory', 'reminders'];

sections.forEach(sec => {
  const adminRegex = new RegExp(`(<div className="col-span-[0-9\\.]+ text-center">\\s*<input[\\s\\S]*?checked=\\{rolePermissions\\.admin\\.includes\\('${sec}'\\)\\}[\\s\\S]*?onChange=\\{\\(e\\) => handleUpdatePermission\\('admin', '${sec}', e\\.target\\.checked\\)\\}[\\s\\S]*?className="cursor-pointer"\\s*\\/>\\s*<\\/div>)`, 'g');
  
  content = content.replace(adminRegex, (match) => {
    // Also we should fix the existing col-span-2.5 and col-span-3 in the rows before it, but regex might be tricky.
    // Instead of complex regex, let's just append the Owner block right after Admin.
    const ownerBlock = match.replace(/'admin'/g, "'owner'").replace(/\.admin\./g, '.owner.');
    return match + '\n                        ' + ownerBlock;
  });
});

// Fix all col-span-2.5 and col-span-3 to col-span-2 within the matrix grid.
// But only inside the matrix. To be safe, we'll replace any col-span-2.5 and col-span-3 that follow col-span-4 in the matrix context.
content = content.replace(/className="col-span-2\.5 text-center"/g, 'className="col-span-2 text-center"');
content = content.replace(/className="col-span-3 text-center"/g, 'className="col-span-2 text-center"');


fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated SystemSettings.tsx');
