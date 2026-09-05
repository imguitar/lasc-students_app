const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/Students.jsx',
  'src/pages/Alumni.jsx',
  'src/pages/Advisors.jsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // In Students.jsx
  if (file.includes('Students.jsx')) {
    content = content.replace(
      /const data = \{ \.\.\.form, department_id: form\.department, year: parseInt\(form\.year\) \};/,
      `const selectedDept = departmentsList.find(d => d.department_id === form.department);
      const deptName = selectedDept ? selectedDept.department_name : form.department;
      const data = { ...form, department: deptName, department_id: form.department, year: parseInt(form.year) };`
    );
  }

  // In Alumni.jsx
  if (file.includes('Alumni.jsx')) {
    content = content.replace(
      /department: form\.department,/,
      `department: (departmentsList.find(d => d.department_id === form.department)?.department_name) || form.department,
      department_id: form.department,`
    );
  }

  // In Advisors.jsx
  if (file.includes('Advisors.jsx')) {
    content = content.replace(
      /const formattedData = \{[\s\S]*?\.\.\.form,/,
      `const formattedData = {
      ...form,
      department: (departmentsList.find(d => d.department_id === form.department)?.department_name) || form.department,
      department_id: form.department,`
    );
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(file + ' payload patched');
});
