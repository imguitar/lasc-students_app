import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { dashboardService } from '../services';
import { useAuth } from '../context/AuthContext';
import { Users, GraduationCap, FolderKanban, Award, Calendar, Activity, ChevronRight } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);


  const [recentAlumni, setRecentAlumni] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [
        statsRes,
        recentAlumniRes
      ] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRecentAlumni()
      ]);

      setStats(statsRes.data);
      setRecentAlumni(recentAlumniRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
        <div className="text-gray-500 font-medium animate-pulse text-sm">กำลังโหลดข้อมูลแดชบอร์ด...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-100/50 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">ภาพรวมระบบ (Dashboard)</h1>
          <p className="text-gray-500 text-sm mt-1">สรุปข้อมูลระบบฐานข้อมูลนักศึกษา ศิษย์เก่า และโครงการโครงการวิจัย/โปรเจคจบ</p>
          {(user?.role === 'advisor' || user?.role === 'teacher' || user?.role === 'student' || user?.role === 'alumni') && user?.department && (
            <div className="mt-3.5 text-xs bg-purple-50/80 text-purple-700 px-3.5 py-2 rounded-xl border border-purple-100/60 w-max font-semibold flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span>สาขาวิชา <strong>{user.department}</strong></span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2 text-xs font-semibold bg-white border border-purple-100/80 px-3.5 py-2 rounded-xl text-purple-700 shadow-sm self-start md:self-auto">
          <Activity className="h-4 w-4 animate-pulse text-amber-500" />
          <span>ข้อมูลล่าสุด ณ วันนี้</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Students */}
        <Card className="border border-purple-100/50 shadow-sm rounded-2xl bg-white hover:shadow-md transition-all duration-300 overflow-hidden relative group">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold text-gray-500">นักศึกษาทั้งหมด</CardTitle>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform duration-200">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-gray-900">{stats?.totalStudents || 0}</div>
            <div className="flex items-center space-x-1.5 mt-2.5 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>กำลังศึกษาอยู่: <strong>{stats?.activeStudents || 0}</strong> คน</span>
            </div>
            <div className="mt-3.5 pt-3.5 border-t border-purple-50/50 flex justify-between items-center text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="text-indigo-500 font-bold text-sm leading-none">♂</span> ชาย: <strong>{stats?.studentGender?.male || 0}</strong> คน</span>
              <span className="flex items-center gap-1.5"><span className="text-pink-500 font-bold text-sm leading-none">♀</span> หญิง: <strong>{stats?.studentGender?.female || 0}</strong> คน</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Alumni */}
        <Card className="border border-purple-100/50 shadow-sm rounded-2xl bg-white hover:shadow-md transition-all duration-300 overflow-hidden relative group">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold text-gray-500">ศิษย์เก่าในระบบ</CardTitle>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform duration-200">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-gray-900">{stats?.totalAlumni || 0}</div>
            <div className="flex items-center space-x-1.5 mt-2.5 text-xs text-gray-500">
              <span>ฐานข้อมูลประวัติและข้อมูลการทำงาน</span>
            </div>
            <div className="mt-3.5 pt-3.5 border-t border-purple-50/50 flex justify-between items-center text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="text-indigo-500 font-bold text-sm leading-none">♂</span> ชาย: <strong>{stats?.alumniGender?.male || 0}</strong> คน</span>
              <span className="flex items-center gap-1.5"><span className="text-pink-500 font-bold text-sm leading-none">♀</span> หญิง: <strong>{stats?.alumniGender?.female || 0}</strong> คน</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Projects */}
        <Card className="border border-purple-100/50 shadow-sm rounded-2xl bg-white hover:shadow-md transition-all duration-300 overflow-hidden relative group">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold text-gray-500">โปรเจคจบสะสม</CardTitle>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform duration-200">
              <FolderKanban className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-gray-900">{stats?.totalProjects || 0}</div>
            <div className="flex items-center space-x-1.5 mt-2.5 text-xs text-gray-500">
              <span>ฐานข้อมูลโครงงานวิจัยสะสมของสาขา</span>
            </div>
            <div className="mt-3.5 pt-3.5 border-t border-purple-50/50 flex items-center justify-between text-xs text-gray-500">
              <span>สถิติตลอดปีการศึกษา</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">อัปเดตอัตโนมัติ</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables/Lists Section */}
      <div className="grid grid-cols-1 gap-8">
        {/* Recent Alumni Updates */}
        <Card className="border border-purple-100/40 shadow-sm rounded-2xl bg-white overflow-hidden">
          <CardHeader className="border-b border-gray-50/80 pb-4">
            <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              การอัปเดตข้อมูลศิษย์เก่าล่าสุด
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">รายชื่อรุ่นพี่ศิษย์เก่าที่เพิ่งแก้ไข/อัปเดตข้อมูลส่วนตัวในระบบ</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 px-0">
            <div className="divide-y divide-purple-50">
              {recentAlumni.length > 0 ? (
                recentAlumni.map((alumni) => (
                  <div key={alumni.id} className="p-4 px-6 hover:bg-purple-50/20 transition-colors flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs shadow-sm">
                        {alumni.first_name ? alumni.first_name.charAt(0) : ''}{alumni.last_name ? alumni.last_name.charAt(0) : ''}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-gray-800">
                          {alumni.first_name} {alumni.last_name}
                        </div>
                        <div className="text-xs text-purple-600 font-medium">
                          {alumni.workplace || 'ไม่ระบุสถานที่ทำงาน'} 
                          {alumni.position && ` • ${alumni.position}`}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg">
                      {new Date(alumni.updatedAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400 text-sm">
                  <Users className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <span>ยังไม่มีข้อมูลการอัปเดตของศิษย์เก่า</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
