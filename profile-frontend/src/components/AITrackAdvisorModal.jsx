import React, { useState } from 'react';
import { Bot, Download, X, CheckCircle, Users, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';
import api from '../services/api';
import { useToast } from './ui/use-toast';

const AITrackAdvisorModal = ({ onClose, onImport }) => {
  const [step, setStep] = useState('idle'); // idle | loading | preview | importing | done
  const [previewData, setPreviewData] = useState(null);
  const [expandedDept, setExpandedDept] = useState(null);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const { toast } = useToast();

  const handleStartScan = async () => {
    setStep('loading');
    try {
      const res = await api.get('/scrape/advisors/preview');
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
    if (!previewData?.advisors?.length) return;
    setStep('importing');
    const advisors = previewData.advisors;
    setImportProgress({ current: 0, total: advisors.length });

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < advisors.length; i += 5) {
      const batch = advisors.slice(i, i + 5);
      await Promise.all(
        batch.map(async (adv) => {
          try {
            await api.post('/advisors', {
              advisor_id: adv.advisor_id,
              name: adv.name,
              faculty: adv.faculty,
              department: adv.department,
              email: adv.email,
              isActive: true,
            });
            successCount++;
          } catch {
            skipCount++; // ข้ามถ้ามีอยู่แล้ว
          }
        })
      );
      setImportProgress({ current: Math.min(i + 5, advisors.length), total: advisors.length });
    }

    setStep('done');
    toast({
      title: '✅ Import สำเร็จ!',
      description: `นำเข้า ${successCount} ท่าน, ข้ามซ้ำ ${skipCount} ท่าน`,
    });
    if (onImport) onImport();
  };

  const groupedByDept = previewData?.advisors?.reduce((acc, adv) => {
    if (!acc[adv.department]) acc[adv.department] = [];
    acc[adv.department].push(adv);
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
              <h2 className="text-lg font-bold text-gray-900">AI Track รายชื่ออาจารย์</h2>
              <p className="text-xs text-gray-500">ดึงข้อมูลอัตโนมัติจากระบบบุคลากร (HRMS) มหาวิทยาลัยราชภัฏศรีสะเกษ</p>
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
                ระบบจะดึงรายชื่ออาจารย์ของ<strong>คณะศิลปศาสตร์และวิทยาศาสตร์</strong>
                จากเว็บ HRMS มหาวิทยาลัยโดยอัตโนมัติ
              </p>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 inline-block mb-6">
                ⚠️ อาจใช้เวลา 10-20 วินาทีในการวิเคราะห์ข้อมูล
              </p>
            </div>
          )}

          {/* Step: loading */}
          {step === 'loading' && (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4 relative">
                <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">กำลังสแกนข้อมูล...</h3>
              <p className="text-gray-500 text-sm">กำลังดึงข้อมูลรายชื่อบุคลากรจากเว็บ HRMS</p>
            </div>
          )}

          {/* Step: preview */}
          {step === 'preview' && previewData && (
            <div>
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-6 text-center mb-6">
                <div className="text-4xl font-extrabold text-purple-700">{previewData.total}</div>
                <div className="text-sm font-bold text-purple-600 mt-1">อาจารย์ที่พบทั้งหมด</div>
              </div>

              <h4 className="text-sm font-bold text-gray-700 mb-3">รายละเอียดตามสาขาวิชา</h4>
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {Object.entries(groupedByDept).map(([dept, advs]) => (
                  <div key={dept} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-purple-50 transition-colors text-left"
                      onClick={() => setExpandedDept(expandedDept === dept ? null : dept)}
                    >
                      <span className="font-semibold text-sm text-gray-800">{dept}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">{advs.length} ท่าน</span>
                        {expandedDept === dept ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </button>
                    {expandedDept === dept && (
                      <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                        {advs.map((a, i) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-2 text-xs">
                            <span className="text-gray-400 w-6 text-right">{i + 1}.</span>
                            <span className="font-mono text-purple-600 w-16">{a.advisor_id}</span>
                            <span className="text-gray-700">{a.name}</span>
                          </div>
                        ))}
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
                {importProgress.current} / {importProgress.total} ท่าน
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
              <p className="text-gray-500 text-sm">ข้อมูลอาจารย์ถูกนำเข้าระบบเรียบร้อยแล้ว</p>
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
              Import {previewData.total} ท่าน เข้าระบบ
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AITrackAdvisorModal;
