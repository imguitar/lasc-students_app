import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../Dashboard/AdminDashboardPage.css';
import AnnouncementManager from '../../../components/admin/AnnouncementManager';
import { MegaphoneIcon } from '@heroicons/react/24/outline';

const AdminAnnouncementsPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) { navigate('/login?next=' + encodeURIComponent(window.location.pathname.replace(/^\/coop/, '') || '/')); return; }
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') { navigate('/login?next=' + encodeURIComponent(window.location.pathname.replace(/^\/coop/, '') || '/')); return; }
  }, [navigate]);

  return (
    <>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1 style={{display:'flex', alignItems:'center', gap:'8px'}}><MegaphoneIcon style={{width: 32, height: 32}} /> ข่าวประชาสัมพันธ์</h1>
            <p>จัดการข่าวสำหรับแสดงบนหน้าแรก เช่น บริษัท/โรงพยาบาลที่เปิดรับฝึกงาน</p>
          </div>
        </header>

        <AnnouncementManager />
      </main>
    </>
  );
};

export default AdminAnnouncementsPage;
