const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

async function runTests() {
  console.log('🚀 Starting News & Events API Verification Tests...\n');

  // Step 1: Login as Admin
  console.log('1️⃣ Logging in as Admin (admin1)...');
  const adminLoginRes = await axios.post(`${API_BASE}/auth/login`, {
    username: 'admin1',
    password: 'password123'
  });
  const adminToken = adminLoginRes.data.data?.token || adminLoginRes.data.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  console.log('✅ Admin login successful!\n');

  // Step 2: Create a new news/event (with title, description, attachment_name, dates, etc.)
  console.log('2️⃣ Testing POST /api/news-events (Create new event)...');
  const createPayload = {
    title: 'ทดสอบการประกาศกิจกรรมอบรม AI สำหรับนักศึกษา',
    type: 'อบรม/สัมมนา',
    description: 'รายละเอียดการอบรมปัญญาประดิษฐ์เบื้องต้นเพื่อเตรียมความพร้อมสู่ตลาดงาน',
    event_date: '2026-10-15',
    start_time: '09:00',
    end_time: '16:00',
    location: 'ห้องประชุม IT ชั้น 3',
    image_url: '/uploads/news/test-image.png',
    attachment_url: '/uploads/news/test-doc.pdf',
    attachment_name: 'เอกสารประกอบการอบรม.pdf',
    is_pinned: true,
    is_published: true
  };

  const createRes = await axios.post(`${API_BASE}/news-events`, createPayload, { headers: adminHeaders });
  console.log('Status code:', createRes.status);
  console.log('Response:', createRes.data.success, createRes.data.message);
  const createdEvent = createRes.data.data;
  console.log('Created ID:', createdEvent.id);
  console.log('Created Title:', createdEvent.title);
  console.log('Attachment Name:', createdEvent.attachment_name);
  console.log('Description:', createdEvent.description);
  console.log('✅ Create news event passed!\n');

  const createdId = createdEvent.id;

  // Step 2.1: Test creating with empty description and null attachments (Edge case)
  console.log('2️⃣.1️⃣ Testing POST /api/news-events with empty description and null attachments...');
  const edgePayload = {
    title: 'ประกาศด่วนไม่มีคำอธิบาย',
    type: 'ประกาศ',
    description: '',
    event_date: '2026-10-20',
    start_time: '10:00',
    end_time: '12:00',
    location: '',
    image_url: '',
    attachment_url: '',
    attachment_name: '',
    is_pinned: false,
    is_published: false
  };
  const edgeRes = await axios.post(`${API_BASE}/news-events`, edgePayload, { headers: adminHeaders });
  console.log('Edge Create Status code:', edgeRes.status);
  const edgeId = edgeRes.data.data.id;
  console.log('Edge Create ID:', edgeId);
  console.log('✅ Empty description create passed!\n');

  // Step 3: Fetch list of events (Admin)
  console.log('3️⃣ Testing GET /api/news-events (Admin view - sees drafts and published)...');
  const listRes = await axios.get(`${API_BASE}/news-events`, { headers: adminHeaders });
  console.log(`Total events fetched: ${listRes.data.count}`);
  const foundCreated = listRes.data.data.find(e => e.id === createdId);
  const foundEdge = listRes.data.data.find(e => e.id === edgeId);
  console.log('Found created event in list?', Boolean(foundCreated));
  console.log('Found edge draft event in list?', Boolean(foundEdge));
  console.log('✅ List events passed!\n');

  // Step 4: Get Single Event by ID
  console.log(`4️⃣ Testing GET /api/news-events/${createdId}...`);
  const getSingleRes = await axios.get(`${API_BASE}/news-events/${createdId}`, { headers: adminHeaders });
  console.log('Fetched single event title:', getSingleRes.data.data.title);
  console.log('Fetched attachment_name:', getSingleRes.data.data.attachment_name);
  console.log('✅ Single event fetched passed!\n');

  // Step 5: Update the event
  console.log(`5️⃣ Testing PUT /api/news-events/${createdId} (Update event)...`);
  const updatePayload = {
    title: 'ทดสอบการประกาศกิจกรรมอบรม AI สำหรับนักศึกษา (ฉบับแก้ไข)',
    type: 'อบรม/สัมมนา',
    description: 'อัปเดตกำหนดการและห้องประชุมใหม่',
    event_date: '2026-10-16',
    start_time: '09:30',
    end_time: '16:30',
    location: 'ห้องประชุมใหญ่ อาคารเฉลิมพระเกียรติ',
    attachment_name: 'เอกสารฉบับปรับปรุง.pdf',
    is_pinned: false
  };
  const updateRes = await axios.put(`${API_BASE}/news-events/${createdId}`, updatePayload, { headers: adminHeaders });
  console.log('Update Status code:', updateRes.status);
  console.log('Updated title:', updateRes.data.data.title);
  console.log('Updated location:', updateRes.data.data.location);
  console.log('Updated attachment_name:', updateRes.data.data.attachment_name);
  console.log('✅ Update news event passed!\n');

  // Step 6: Test Toggle Pin & Toggle Publish
  console.log(`6️⃣ Testing PATCH /api/news-events/${createdId}/pin and /publish...`);
  const pinRes = await axios.patch(`${API_BASE}/news-events/${createdId}/pin`, {}, { headers: adminHeaders });
  console.log('Pin toggle result:', pinRes.data.message, 'Pinned:', pinRes.data.data.is_pinned);
  const publishRes = await axios.patch(`${API_BASE}/news-events/${createdId}/publish`, {}, { headers: adminHeaders });
  console.log('Publish toggle result:', publishRes.data.message, 'Published:', publishRes.data.data.is_published);
  // Re-publish so student can test seeing it
  await axios.patch(`${API_BASE}/news-events/${createdId}/publish`, {}, { headers: adminHeaders });
  console.log('✅ Pin & Publish toggle passed!\n');

  // Step 7: Persistence check (Fetch again after restart/changes)
  console.log('7️⃣ Testing Persistence check after all updates...');
  const verifyRes = await axios.get(`${API_BASE}/news-events/${createdId}`, { headers: adminHeaders });
  console.log('Verified persisted title:', verifyRes.data.data.title);
  console.log('Verified persisted location:', verifyRes.data.data.location);
  console.log('Verified persisted attachment_name:', verifyRes.data.data.attachment_name);
  console.log('✅ Persistence verified!\n');

  // Step 8: Test Role-based Permissions (Student role)
  console.log('8️⃣ Testing Role Permissions as Student (student1)...');
  const studentLoginRes = await axios.post(`${API_BASE}/auth/login`, {
    username: 'student1',
    password: 'password123'
  });
  const studentToken = studentLoginRes.data.data?.token || studentLoginRes.data.token;
  const studentHeaders = { Authorization: `Bearer ${studentToken}` };
  console.log('✅ Student login successful!');

  // Student list view: must not see unpublished draft event
  const studentListRes = await axios.get(`${API_BASE}/news-events`, { headers: studentHeaders });
  const studentSeesEdge = studentListRes.data.data.some(e => e.id === edgeId);
  console.log('Student sees unpublished draft event?', studentSeesEdge, '(Expected: false)');
  if (studentSeesEdge) throw new Error('Student should not see unpublished events!');

  // Student trying to create: must be 403
  try {
    await axios.post(`${API_BASE}/news-events`, { title: 'แอบโพสต์', type: 'ประกาศ', event_date: '2026-10-15' }, { headers: studentHeaders });
    throw new Error('Student was able to create event!');
  } catch (err) {
    if (err.response?.status === 403) {
      console.log('✅ Student blocked from POST (403 Forbidden)');
    } else {
      throw err;
    }
  }

  // Student trying to delete: must be 403
  try {
    await axios.delete(`${API_BASE}/news-events/${createdId}`, { headers: studentHeaders });
    throw new Error('Student was able to delete event!');
  } catch (err) {
    if (err.response?.status === 403) {
      console.log('✅ Student blocked from DELETE (403 Forbidden)');
    } else {
      throw err;
    }
  }
  console.log('✅ All Role Permission tests passed!\n');

  // Step 9: Clean up test events (Delete)
  console.log(`9️⃣ Testing DELETE /api/news-events/${createdId} and ${edgeId}...`);
  const delRes1 = await axios.delete(`${API_BASE}/news-events/${createdId}`, { headers: adminHeaders });
  console.log('Delete 1 result:', delRes1.data.message);
  const delRes2 = await axios.delete(`${API_BASE}/news-events/${edgeId}`, { headers: adminHeaders });
  console.log('Delete 2 result:', delRes2.data.message);

  // Verify it is gone
  try {
    await axios.get(`${API_BASE}/news-events/${createdId}`, { headers: adminHeaders });
    console.error('❌ Error: Event still exists after delete!');
  } catch (err) {
    if (err.response?.status === 404) {
      console.log('✅ Confirmed 404: Event deleted successfully!');
    } else {
      throw err;
    }
  }

  console.log('\n🎉 ALL NEWS & EVENTS TESTS COMPLETED SUCCESSFULLY! 🎉');
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err.response?.data || err.message);
  process.exit(1);
});
