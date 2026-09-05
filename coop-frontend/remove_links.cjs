const fs = require('fs');
const path = require('path');
const dir = 'd:/Professional-Internship/Professional-Internship/src/pages/Admin/Dashboard';
fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.jsx')) {
    const p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf8');
    const rx = /<Link\s+to="\/admin-dashboard\/payments"[\s\S]*?<\/Link>/g;
    if (rx.test(content)) {
      fs.writeFileSync(p, content.replace(rx, ''));
      console.log('Updated ' + file);
    }
  }
});
