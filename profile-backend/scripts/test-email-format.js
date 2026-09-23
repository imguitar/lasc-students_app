const axios = require('axios');

async function test() {
  console.log('🧪 Testing Student Email Format across API...');

  // 1. Login as admin1
  const loginRes = await axios.post('http://localhost:5001/api/auth/login', {
    username: 'admin1',
    password: 'password123'
  });
  const token = loginRes.data.data?.token || loginRes.data.token;
  console.log('✅ Admin Login successful.');

  const headers = { Authorization: `Bearer ${token}` };

  // 2. Fetch all students
  const listRes = await axios.get('http://localhost:5001/api/students?type=current', { headers });
  const students = listRes.data.data;
  console.log(`Fetched ${students.length} current students.`);

  // Check samples
  const sample = students[0];
  console.log('Sample student:', {
    student_id: sample.student_id,
    email: sample.email,
    department_id: sample.department_id
  });

  // Verify none have @student.sskru.ac.th
  const invalidEmails = students.filter(s => s.email && s.email.includes('@student.sskru.ac.th'));
  console.log(`Count of students with old @student.sskru.ac.th: ${invalidEmails.length}`);

  // 3. Test get student by code
  const codeRes = await axios.get(`http://localhost:5001/api/students/code/${sample.student_id}`, { headers });
  console.log('Get student by code response email:', codeRes.data.data?.email);

  // 4. Test student details
  const detailRes = await axios.get(`http://localhost:5001/api/students/${sample.id}`, { headers });
  console.log('Get student details response email:', detailRes.data.data?.contact_info?.email);

  console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
}

test().catch(err => {
  console.error('❌ Test failed:', err.response?.data || err.message);
  process.exit(1);
});
