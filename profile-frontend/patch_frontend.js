const fs = require('fs');
const path = require('path');

const studentsFile = path.join(__dirname, 'src/pages/Students.jsx');
let content = fs.readFileSync(studentsFile, 'utf8');

// 1. Replace FACULTIES_DEPARMENTS hardcode
content = content.replace(
  /const FACULTIES_DEPARMENTS = \{[\s\S]*?\};/,
  `const getUniqueFaculties = (departmentsList) => {
  const faculties = new Set(departmentsList.map(d => d.faculty_name).filter(Boolean));
  return Array.from(faculties);
};`
);

// 2. Add fetchDepartments to useEffect
content = content.replace(
  /  useEffect\(\(\) => \{\s+fetchStudents\(\);\s+\}, \[filters\]\);/,
  `  useEffect(() => {
    fetchDepartments();
    fetchStudents();
  }, [filters]);

  const fetchDepartments = async () => {
    try {
      const response = await departmentService.getAll();
      if (response.success) {
        setDepartmentsList(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };`
);

// 3. Update filters dropdown
content = content.replace(
  /\{Object\.keys\(FACULTIES_DEPARMENTS\)\.map\(\(fac\) => \([\s\S]*?\)\)\}/,
  `{getUniqueFaculties(departmentsList).map((fac) => (
                <option key={fac} value={fac}>{fac}</option>
              ))}`
);

// 4. Update filters department dropdown
content = content.replace(
  /\{filters\.faculty && FACULTIES_DEPARMENTS\[filters\.faculty\]\?\.map\(\(dept\) => \([\s\S]*?\)\)\}/,
  `{departmentsList.filter(d => !filters.faculty || d.faculty_name === filters.faculty).map((dept) => (
                <option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>
              ))}`
);

// 5. Update form faculty dropdown
content = content.replace(
  /\{Object\.keys\(FACULTIES_DEPARMENTS\)\.map\(\(fac\) => \([\s\S]*?\)\)\}/,
  `{getUniqueFaculties(departmentsList).map((fac) => (
                    <option key={fac} value={fac}>{fac}</option>
                  ))}`
);

// 6. Update form department dropdown
content = content.replace(
  /\{form\.faculty && FACULTIES_DEPARMENTS\[form\.faculty\]\?\.map\(\(dept\) => \([\s\S]*?\)\)\}/,
  `{departmentsList.filter(d => !form.faculty || d.faculty_name === form.faculty).map((dept) => (
                    <option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>
                  ))}`
);

// Update department -> department_id in filters
content = content.replace(
  /onChange=\{\(e\) => setFilters\(\{ \.\.\.filters, department: e\.target\.value \}\)\}/,
  `onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}`
);
content = content.replace(
  /value=\{filters\.department\}/,
  `value={filters.department_id || ''}`
);

// Also need to fix department mapping for forms (if any logic depends on department_name).
// In handleFormChange, we don't need changes.

fs.writeFileSync(studentsFile, content, 'utf8');
console.log('Students.jsx updated');
