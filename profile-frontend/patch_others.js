const fs = require('fs');
const path = require('path');

const files = ['src/pages/Alumni.jsx', 'src/pages/Advisors.jsx'];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 0. Import departmentService
  if (!content.includes('departmentService')) {
    content = content.replace(/import \{ ([^}]+) \} from '\.\.\/services';/, "import { $1, departmentService } from '../services';");
  }

  // 1. Replace FACULTIES_DEPARMENTS hardcode
  content = content.replace(
    /const FACULTIES_DEPARMENTS = \{[\s\S]*?\};/,
    `const getUniqueFaculties = (departmentsList) => {
  const faculties = new Set(departmentsList.map(d => d.faculty_name).filter(Boolean));
  return Array.from(faculties);
};`
  );

  // 2. Add departmentsList state
  if (!content.includes('const [departmentsList, setDepartmentsList]')) {
    content = content.replace(
      /const \[filters, setFilters\] = useState\(\{/,
      `const [departmentsList, setDepartmentsList] = useState([]);\n  const [filters, setFilters] = useState({`
    );
  }

  // 3. Add fetchDepartments to useEffect
  // Find useEffect and the fetch function it calls
  const fetchName = file.includes('Alumni') ? 'fetchAlumni' : 'fetchAdvisors';
  const useEffectRegex = new RegExp(`useEffect\\(\\(\\) => \\{\\s+${fetchName}\\(\\);\\s+\\}, \\[filters\\]\\);`);
  content = content.replace(
    useEffectRegex,
    `useEffect(() => {
    fetchDepartments();
    ${fetchName}();
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

  // 4. Update filters dropdown
  content = content.replace(
    /\{Object\.keys\(FACULTIES_DEPARMENTS\)\.map\(\(fac\) => \([\s\S]*?\)\)\}/g,
    `{getUniqueFaculties(departmentsList).map((fac) => (
                <option key={fac} value={fac}>{fac}</option>
              ))}`
  );

  // 5. Update filters department dropdown
  content = content.replace(
    /\{filters\.faculty && FACULTIES_DEPARMENTS\[filters\.faculty\]\?\.map\(\(dept\) => \([\s\S]*?\)\)\}/,
    `{departmentsList.filter(d => !filters.faculty || d.faculty_name === filters.faculty).map((dept) => (
                <option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>
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

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(file + ' updated');
});
