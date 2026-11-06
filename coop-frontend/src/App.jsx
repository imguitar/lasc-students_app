import { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import { loadHolidaysFromServer } from './utils/thaiHolidays';
import './App.css';

function App() {
  // วันหยุดนักขัตฤกษ์จากฐานข้อมูล (ใช้ทั้งปฏิทินและการคำนวณวันทำการ)
  useEffect(() => {
    loadHolidaysFromServer();
  }, []);

  return (
    <Router basename="/coop">
      <AppRoutes />
    </Router>
  );
}

export default App;
