import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../components/ui/use-toast';
import { GraduationCap, Lock, User, Eye, EyeOff, Shield, Users } from 'lucide-react';

const tabs = [
  { id: 'student', label: 'นักศึกษา', icon: GraduationCap },
  { id: 'teacher', label: 'อาจารย์', icon: User },
  { id: 'alumni', label: 'ศิษย์เก่า', icon: Users },
  { id: 'admin', label: 'ผู้ดูแลระบบ', icon: Shield },
];

const tabConfig = {
  student: {
    usernameLabel: 'รหัสนักศึกษา',
    usernamePlaceholder: 'รหัสนักศึกษา',
    passwordLabel: 'รหัสผ่าน',
    passwordPlaceholder: 'รหัสผ่าน',
  },
  teacher: {
    usernameLabel: 'รหัสอาจารย์',
    usernamePlaceholder: 'รหัสอาจารย์',
    passwordLabel: 'รหัสผ่าน',
    passwordPlaceholder: 'รหัสผ่าน',
  },
  alumni: {
    usernameLabel: 'รหัสนักศึกษาศิษย์เก่า',
    usernamePlaceholder: 'รหัสนักศึกษาศิษย์เก่า',
    passwordLabel: 'รหัสผ่าน',
    passwordPlaceholder: 'รหัสผ่าน',
  },
  admin: {
    usernameLabel: 'ชื่อผู้ใช้ผู้ดูแลระบบ',
    usernamePlaceholder: 'ชื่อผู้ใช้ผู้ดูแลระบบ',
    passwordLabel: 'รหัสผ่าน',
    passwordPlaceholder: 'รหัสผ่าน',
  },
};

const Login = () => {
  const [activeTab, setActiveTab] = useState('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setUsername('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await login(username, password);
      const loggedInUser = res?.data?.user || JSON.parse(localStorage.getItem('user'));

      let isRoleMatched = false;
      if (activeTab === 'student' && loggedInUser?.role === 'student') {
        isRoleMatched = true;
      } else if (activeTab === 'teacher' && (loggedInUser?.role === 'teacher' || loggedInUser?.role === 'advisor')) {
        isRoleMatched = true;
      } else if (activeTab === 'alumni' && loggedInUser?.role === 'alumni') {
        isRoleMatched = true;
      } else if (activeTab === 'admin' && loggedInUser?.role === 'admin') {
        isRoleMatched = true;
      }

      if (!isRoleMatched) {
        logout();
        throw new Error('บทบาทผู้ใช้งานไม่ถูกต้อง กรุณาเข้าสู่ระบบผ่านแท็บที่ตรงกับบทบาทของคุณ');
      }

      toast({
        title: "เข้าสู่ระบบสำเร็จ",
        description: "ยินดีต้อนรับเข้าสู่ระบบจัดการฐานข้อมูล",
      });
      // ใช้ window.location เพื่อ reload หน้าเว็บใหม่ให้ระบบโหลด token จาก localStorage
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      let targetUrl = '/';
      if (redirect) {
        try {
          const redirectUrl = new URL(redirect, window.location.origin);
          if (redirectUrl.pathname === '/coop/sso' || redirectUrl.pathname === '/coop/sso-landing') {
            targetUrl = redirectUrl.toString();
          }
        } catch (_) {
          // Ignore malformed redirect URLs and use the profile home page.
        }
      }
      window.location.replace(targetUrl);
    } catch (error) {
      setPassword('');
      toast({
        variant: "destructive",
        title: "เข้าสู่ระบบไม่สำเร็จ",
        description: error.response?.data?.message || error.message || "กรุณาตรวจสอบชื่อผู้ใช้และรหัสผ่าน",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen relative flex flex-col justify-between bg-cover bg-center bg-no-repeat overflow-hidden"
      style={{ backgroundImage: 'url("/login-bg.jpg")' }}
    >
      {/* Background Overlay (Dark overlay for readability) */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] pointer-events-none" />

      {/* Main Content Area */}
      <div className="flex-grow flex items-center justify-center p-4 relative z-10">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/25 shadow-2xl rounded-2xl p-2">
          <CardHeader className="space-y-2 text-center pb-4">
            <div className="mx-auto w-28 h-28 flex items-center justify-center mb-2">
              <img src="/logo.png" alt="Logo" className="h-full w-auto object-contain" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              ระบบฐานข้อมูลนักศึกษา
            </CardTitle>
            <CardDescription className="text-gray-500 text-sm">
              ยินดีต้อนรับ กรุณาเข้าสู่ระบบเพื่อเริ่มใช้งาน
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Tab Switcher */}
            <div className="flex bg-slate-100/80 p-1 rounded-xl gap-1 mb-6 border border-slate-200/50">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-semibold transition-all duration-200 ${isActive
                        ? 'bg-white text-purple-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/30'
                      }`}
                  >
                    <Icon size={14} className={isActive ? 'text-purple-600' : 'text-slate-400'} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-700 text-xs font-semibold uppercase tracking-wider">
                  {tabConfig[activeTab].usernameLabel}
                </Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                    {activeTab === 'admin' ? <Shield size={18} /> : <User size={18} />}
                  </span>
                  <Input
                    id="username"
                    type="text"
                    placeholder={tabConfig[activeTab].usernamePlaceholder}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-11 border-purple-100/80 rounded-xl focus:ring-purple-500 focus:border-purple-500 bg-white/50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 text-xs font-semibold uppercase tracking-wider">
                  {tabConfig[activeTab].passwordLabel}
                </Label>
                <div className="relative flex items-center">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                    <Lock size={18} />
                  </span>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={tabConfig[activeTab].passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 border-purple-100/80 rounded-xl focus:ring-purple-500 focus:border-purple-500 bg-white/50 w-full"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 mt-2 flex items-center justify-center gap-2 group"
                disabled={loading}
              >
                {loading ? (
                  <span>กำลังเข้าสู่ระบบ...</span>
                ) : (
                  <>
                    <span>เข้าสู่ระบบ</span>
                    <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Footer Area */}
      <footer className="w-full py-4 border-t border-white/10 bg-black/25 backdrop-blur-sm relative z-10 text-center">
        <p className="text-xs text-white/80 font-medium tracking-wide drop-shadow-sm">
          คณะศิลปศาสตร์และวิทยาศาสตร์ - ระบบฐานข้อมูลนักศึกษา
        </p>
      </footer>
    </div>
  );
};

export default Login;
