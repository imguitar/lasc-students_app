import React, { useState } from 'react';
import { Bot, Download, X, CheckCircle, Users, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';
import api from '../services/api';
import { useToast } from './ui/use-toast';

const AITrackModal = ({ onClose, onImport }) => {
  const [step, setStep] = useState('idle'); // idle | loading | preview | importing | done
  const [previewData, setPreviewData] = useState(null);
  const [expandedDept, setExpandedDept] = useState(null);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const { toast } = useToast();

  const handleStartScan = async () => {
    setStep('loading');
    try {
      const res = await api.get('/scrape/preview');
      if (res.data.success) {
        setPreviewData(res.data.data);
        setStep('preview');
      } else {
        throw new Error(res.data.message);
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: err.response?.data?.message || err.message || 'ไม่สามารถดึงข้อมูลจากเว็บมหาลัยได้',
      });
      setStep('idle');
    }
  };

  const handleImport = async () => {
    if (!previewData?.students?.length) return;
    setStep('importing');
    const students = previewData.students;
    setImportProgress({ current: 0, total: students.length });

    let successCount = 0;
    let skipCount = 0;

    // Import ทีละ 10 คน
    for (let i = 0; i < students.length; i += 10) {
      const batch = students.slice(i, i + 10);
      await Promise.all(
        batch.map(async (s) => {
          try {
            // ตรวจสอบว่ามีอยู่แล้วหรือไม่ ถ้ามีให้เขียนทับชื่อ-สกุลที่ถูกต้อง
            await api.post('/students?upsert=true', {
              student_id: s.student_id,
              first_name: s.first_name,
              last_name: s.last_name,
              faculty: s.faculty,
              department: s.department,
              year: extractYear(s.student_id),
              email: `${s.student_id}@student.sskru.ac.th`,
              status: 'Active',
            });
            successCount++;
          } catch {
            skipCount++; // ข้ามถ้าเกิดข้อผิดพลาดจริงๆ
          }
        })
      );
      setImportProgress({ current: Math.min(i + 10, students.length), total: students.length });
    }

    setStep('done');
    toast({
      title: '✅ Import สำเร็จ!',
      description: `นำเข้า ${successCount} คน, ข้ามซ้ำ ${skipCount} คน`,
    });
    if (onImport) onImport();
  };

  // คำนวณชั้นปีจากรหัสนักศึกษา (2 ตัวแรก = ปี พ.ศ. ที่เข้า)
  const extractYear = (studentId) => {
    if (!studentId) return 1;
    const yearDigit = parseInt(studentId.substring(0, 2), 10);
    const currentBE = new Date().getFullYear() + 543;
    const entryBE = 2500 + yearDigit;
    const year = currentBE - entryBE + 1;
    return Math.min(Math.max(year, 1), 6);
  };

  // จัดกลุ่มนักศึกษาตามสาขา
  const groupedByDept = previewData?.students?.reduce((acc, s) => {
    if (!acc[s.department]) acc[s.department] = [];
    acc[s.department].push(s);
    return acc;
  }, {}) || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-purple-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">AI Track รายชื่อนักศึกษา</h2>
              <p className="text-xs text-gray-500">ดึงข้อมูลอัตโนมัติจากเว็บมหาวิทยาลัยราชภัฏศรีสะเกษ</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Step: idle */}
          {step === 'idle' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
                <Bot className="h-10 w-10 text-purple-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">พร้อมเริ่มการสแกน</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto mb-2">
                ระบบจะดึงรายชื่อนักศึกษาทั้งหมดของ<strong>คณะศิลปศาสตร์และวิทยาศาสตร์</strong>
                จากเว็บมหาวิทยาลัยโดยอัตโนมัติ
              </p>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 inline-block mb-6">
                ⚠️ อาจใช้เวลา 1-2 นาทีขึ้นอยู่กับจำนวนหมู่เรียน
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 bg-gray-50 rounded-xl p-4 mb-6 text-left">
                <div>📡 <strong>แหล่งข้อมูล:</strong> ระบบสารสนเทศ มรภ.ศรีสะเกษ</div>
                <div>🏫 <strong>คณะ:</strong> ศิลปศาสตร์และวิทยาศาสตร์</div>
                <div>📚 <strong>สาขาวิชา:</strong> 11 สาขา</div>
                <div>✅ <strong>ความปลอดภัย:</strong> ไม่เก็บรหัสผ่าน</div>
              </div>
            </div>
          )}

          {/* Step: loading */}
          {step === 'loading' && (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4 relative">
                <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">กำลังสแกนข้อมูล...</h3>
              <p className="text-gray-500 text-sm">กำลังดึงข้อมูลรายชื่อนักศึกษาจากเว็บมหาวิทยาลัย</p>
              <div className="mt-6 space-y-1 text-xs text-gray-400">
                <p>🔍 กำลังค้นหาหมู่เรียนของคณะ...</p>
                <p>📥 กำลังดึงรายชื่อนักศึกษา...</p>
              </div>
            </div>
          )}

          {/* Step: preview */}
          {step === 'preview' && previewData && (
            <div>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
                  <div className="text-3xl font-extrabold text-purple-700">{previewData.total}</div>
                  <div className="text-xs text-purple-600 mt-1">นักศึกษาทั้งหมด</div>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
                  <div className="text-3xl font-extrabold text-indigo-700">{previewData.groups.length}</div>
                  <div className="text-xs text-indigo-600 mt-1">หมู่เรียนที่พบ</div>
                </div>
              </div>

              {/* Dept breakdown */}
              <h4 className="text-sm font-bold text-gray-700 mb-3">รายละเอียดตามสาขาวิชา</h4>
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {Object.entries(groupedByDept).map(([dept, students]) => (
                  <div key={dept} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-purple-50 transition-colors text-left"
                      onClick={() => setExpandedDept(expandedDept === dept ? null : dept)}
                    >
                      <span className="font-semibold text-sm text-gray-800">{dept}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">{students.length} คน</span>
                        {expandedDept === dept ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </button>
                    {expandedDept === dept && (
                      <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                        {students.slice(0, 50).map((s, i) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-2 text-xs">
                            <span className="text-gray-400 w-6 text-right">{i + 1}.</span>
                            <span className="font-mono text-purple-600 w-24">{s.student_id}</span>
                            <span className="text-gray-700">{s.first_name} {s.last_name}</span>
                          </div>
                        ))}
                        {students.length > 50 && (
                          <div className="px-4 py-2 text-xs text-gray-400 text-center">...และอีก {students.length - 50} คน</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: importing */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 text-purple-500 animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">กำลัง Import ข้อมูล...</h3>
              <p className="text-gray-500 text-sm mb-4">
                {importProgress.current} / {importProgress.total} คน
              </p>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress.total ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Step: done */}
          {step === 'done' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Import สำเร็จ!</h3>
              <p className="text-gray-500 text-sm">ข้อมูลนักศึกษาถูกนำเข้าระบบเรียบร้อยแล้ว</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-50">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            {step === 'done' ? 'ปิด' : 'ยกเลิก'}
          </Button>
          {step === 'idle' && (
            <Button onClick={handleStartScan} className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white gap-2">
              <Bot size={16} />
              เริ่มสแกนข้อมูล
            </Button>
          )}
          {step === 'preview' && previewData?.total > 0 && (
            <Button onClick={handleImport} className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white gap-2">
              <Download size={16} />
              Import {previewData.total} คน เข้าระบบ
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AITrackModal;
