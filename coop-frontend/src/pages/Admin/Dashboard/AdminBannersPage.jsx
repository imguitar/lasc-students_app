import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../Dashboard/AdminDashboardPage.css';
import BannerManager from '../../../components/admin/BannerManager';
import { RectangleGroupIcon } from '@heroicons/react/24/outline';

const AdminBannersPage = () => {
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
            <h1 style={{display:'flex', alignItems:'center', gap:'8px'}}><RectangleGroupIcon style={{width: 32, height: 32}} /> แบนเนอร์หน้าแรก</h1>
            <p>จัดการสไลด์แบนเนอร์ประชาสัมพันธ์บนหน้าแรก แนบลิงก์ภายนอก เช่น Facebook / Google Form</p>
          </div>
        </header>
        <BannerManager />
      </main>
    </>
  );
};

export default AdminBannersPage;
