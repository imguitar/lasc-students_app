import React, { useEffect, useState } from 'react';
import { promotionService, departmentService } from '../services';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../components/ui/dialog';
import {
  ArrowUpCircle, Search, CheckCircle2, XCircle, AlertCircle, Users,
  Calendar, ChevronRight, History, Eye, ArrowLeft, Loader2, CheckSquare,
  Square, GraduationCap, Building2, ChevronDown, RotateCcw
} from 'lucide-react';

const StudentPromotion = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // ==========================================
  // State
  // ==========================================
  const [activeTab, setActiveTab] = useState('create'); // create | history
  const [departments, setDepartments] = useState([]);

  // Form state
  const [academicYear, setAcademicYear] = useState(() => new Date().getFullYear() + 543);
  const [fromYear, setFromYear] = useState('all');
  const [toYear, setToYear] = useState('all');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [notes, setNotes] = useState('');

  // Preview state
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [previewYearFilter, setPreviewYearFilter] = useState('all'); // all | 1 | 2 | 3 | 4

  // Execute state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [executing, setExecuting] = useState(false);

  // History state
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchDetailLoading, setBatchDetailLoading] = useState(false);
  const [batchToRollback, setBatchToRollback] = useState(null);
  const [rollingBack, setRollingBack] = useState(false);

  // ==========================================
  // Effects
  // ==========================================
  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  // Sync toYear when fromYear changes
  useEffect(() => {
    if (fromYear === 'all') {
      setToYear('all');
    } else {
      setToYear(parseInt(fromYear, 10) + 1);
    }
    setPreviewData(null);
    setSelectedIds(new Set());
    setPreviewYearFilter('all');
  }, [fromYear]);

  // ==========================================
  // Data loaders
  // ==========================================
  const loadDepartments = async () => {
    try {
      const res = await departmentService.getAll();
      if (res.success && res.data) {
        setDepartments(res.data);
      }
    } catch (err) {
      console.error('Error loading departments:', err);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await promotionService.getHistory();
      if (res.success) {
        setHistoryData(res.data || []);
      }
    } catch (err) {
      console.error('Error loading history:', err);
      toast({ title: 'ข้อผิดพลาด', description: 'ไม่สามารถโหลดประวัติการเลื่อนชั้นได้', variant: 'destructive' });
    } finally {
      setHistoryLoading(false);
    }
  };

  // ==========================================
  // Preview
  // ==========================================
  const handlePreview = async () => {
    if (!academicYear || !fromYear) {
      toast({ title: 'ข้อมูลไม่ครบ', description: 'กรุณาระบุปีการศึกษาและชั้นปีต้นทาง', variant: 'destructive' });
      return;
    }

    setPreviewLoading(true);
    setPreviewData(null);
    setSelectedIds(new Set());

    try {
      const payload = {
        academic_year: academicYear,
        from_year: fromYear,
        to_year: toYear
      };
      if (selectedDepartment) {
        payload.department_id = selectedDepartment;
      }

      const res = await promotionService.preview(payload);
      if (res.success) {
        setPreviewData(res.data);
        // Auto-select all eligible students
        const eligibleIds = new Set(
          (res.data.students || [])
            .filter(s => s.eligibility_status === 'eligible')
            .map(s => s.profile_id)
        );
        setSelectedIds(eligibleIds);
      }
    } catch (err) {
      console.error('Error previewing:', err);
      const msg = err.response?.data?.message || 'เกิดข้อผิดพลาดในการตรวจสอบ';
      toast({ title: 'ข้อผิดพลาด', description: msg, variant: 'destructive' });
    } finally {
      setPreviewLoading(false);
    }
  };

  // ==========================================
  // Selection
  // ==========================================
  const toggleStudent = (profileId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  };

  const selectAllEligible = () => {
    if (!previewData?.students) return;
    const eligibleIds = new Set(
      previewData.students
        .filter(s => s.eligibility_status === 'eligible')
        .map(s => s.profile_id)
    );
    setSelectedIds(eligibleIds);
  };

  const selectCurrentYearEligible = () => {
    if (!previewData?.students) return;
    const currentEligibleIds = previewData.students
      .filter(s => s.eligibility_status === 'eligible' && (previewYearFilter === 'all' || s.from_year === parseInt(previewYearFilter, 10)))
      .map(s => s.profile_id);

    setSelectedIds(prev => {
      const next = new Set(prev);
      currentEligibleIds.forEach(id => next.add(id));
      return next;
    });
  };

  const deselectCurrentYear = () => {
    if (!previewData?.students) return;
    const currentIds = new Set(
      previewData.students
        .filter(s => previewYearFilter === 'all' || s.from_year === parseInt(previewYearFilter, 10))
        .map(s => s.profile_id)
    );

    setSelectedIds(prev => {
      const next = new Set(prev);
      currentIds.forEach(id => next.delete(id));
      return next;
    });
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // ==========================================
  // Execute
  // ==========================================
  const handleExecute = async () => {
    if (selectedIds.size === 0) {
      toast({ title: 'ยังไม่ได้เลือก', description: 'กรุณาเลือกนักศึกษาอย่างน้อย 1 คน', variant: 'destructive' });
      return;
    }

    if (!effectiveDate) {
      toast({ title: 'ข้อมูลไม่ครบ', description: 'กรุณาระบุวันที่มีผล', variant: 'destructive' });
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmExecute = async () => {
    setExecuting(true);
    try {
      const res = await promotionService.execute({
        academic_year: academicYear,
        from_year: fromYear,
        to_year: toYear,
        effective_date: effectiveDate,
        notes,
        selected_profile_ids: Array.from(selectedIds)
      });

      if (res.success) {
        toast({
          title: 'สำเร็จ',
          description: res.message,
          className: 'bg-emerald-50 border-emerald-200 text-emerald-800'
        });
        setShowConfirmDialog(false);
        setPreviewData(null);
        setSelectedIds(new Set());
        setPreviewYearFilter('all');
        setNotes('');
        setEffectiveDate('');
      }
    } catch (err) {
      console.error('Error executing promotion:', err);
      const msg = err.response?.data?.message || 'เกิดข้อผิดพลาดในการดำเนินการ';
      toast({ title: 'ข้อผิดพลาด', description: msg, variant: 'destructive' });
    } finally {
      setExecuting(false);
    }
  };

  // ==========================================
  // History detail
  // ==========================================
  const viewBatchDetail = async (batchId) => {
    setBatchDetailLoading(true);
    try {
      const res = await promotionService.getBatchDetail(batchId);
      if (res.success) {
        setSelectedBatch(res.data);
      }
    } catch (err) {
      console.error('Error loading batch detail:', err);
      toast({ title: 'ข้อผิดพลาด', description: 'ไม่สามารถโหลดรายละเอียดรอบได้', variant: 'destructive' });
    } finally {
      setBatchDetailLoading(false);
    }
  };

  // ==========================================
  // Batch Rollback
  // ==========================================
  const handleConfirmRollback = async () => {
    if (!batchToRollback) return;
    setRollingBack(true);
    try {
      const res = await promotionService.rollbackBatch(batchToRollback.id);
      if (res.success) {
        toast({
          title: 'ยกเลิกรอบสำเร็จ',
          description: res.message || 'รายชื่อนักศึกษาถูกย้อนกลับสู่ชั้นปีเดิมเรียบร้อยแล้ว'
        });
        setBatchToRollback(null);
        setSelectedBatch(null);
        loadHistory();
      }
    } catch (err) {
      console.error('Error rolling back batch:', err);
      const msg = err.response?.data?.message || 'เกิดข้อผิดพลาดในการยกเลิกรอบการเลื่อนชั้น';
      toast({ title: 'ข้อผิดพลาด', description: msg, variant: 'destructive' });
    } finally {
      setRollingBack(false);
    }
  };

  // ==========================================
  // Helpers
  // ==========================================
  const yearLabel = (y) => {
    if (y === 'all' || y === 0) return 'ทุกชั้นปี';
    if (y === 5) return 'สำเร็จการศึกษา';
    return `ปี ${y}`;
  };

  const batchFromYearLabel = (y) => {
    if (y === 'all' || y === 0) return 'ทุกชั้นปี (ปี 1-4)';
    return `ปี ${y}`;
  };

  const batchToYearLabel = (y) => {
    if (y === 'all' || y === 0) return 'เลื่อนขึ้น 1 ชั้นปี (ปี 2 - สำเร็จการศึกษา)';
    if (y === 5) return 'สำเร็จการศึกษา';
    return `ปี ${y}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // ==========================================
  // Render
  // ==========================================
  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <AlertCircle className="w-16 h-16 mb-4" />
        <p className="text-lg font-medium">ไม่มีสิทธิ์เข้าถึง</p>
        <p className="text-sm">เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถใช้งานหน้านี้ได้</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ArrowUpCircle className="w-7 h-7 text-violet-600" />
            จัดการเลื่อนชั้นปี
          </h1>
          <p className="text-slate-500 text-sm mt-1">เลื่อนชั้นปีนักศึกษาแบบอัตโนมัติ พร้อม Preview ก่อนยืนยัน</p>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => { setActiveTab('create'); setSelectedBatch(null); }}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'create'
              ? 'bg-white text-violet-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ArrowUpCircle className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          สร้างรอบเลื่อนชั้น
        </button>
        <button
          onClick={() => { setActiveTab('history'); setSelectedBatch(null); }}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'history'
              ? 'bg-white text-violet-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <History className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          ประวัติการเลื่อนชั้น
        </button>
      </div>

      {/* ==========================================
          TAB: Create Promotion
          ========================================== */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          {/* Settings Card */}
          <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-4">
              <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                กำหนดรอบการเลื่อนชั้น
              </h2>
              <p className="text-violet-200 text-sm mt-0.5">ระบุเงื่อนไขเพื่อค้นหานักศึกษาที่เข้าเกณฑ์</p>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* ปีการศึกษา */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">ปีการศึกษา (พ.ศ.)</Label>
                <Input
                  type="number"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(parseInt(e.target.value) || '')}
                  className="border-slate-200 focus:border-violet-300 focus:ring-violet-200"
                  placeholder="เช่น 2569"
                />
              </div>

              {/* ชั้นปีต้นทาง */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">จากชั้นปี</Label>
                <select
                  value={fromYear}
                  onChange={(e) => setFromYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
                >
                  <option value="all">ทุกชั้นปี (ปี 1 - 4)</option>
                  <option value={1}>ปี 1</option>
                  <option value={2}>ปี 2</option>
                  <option value={3}>ปี 3</option>
                  <option value={4}>ปี 4</option>
                </select>
              </div>

              {/* ชั้นปีปลายทาง */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">เป็นชั้นปี</Label>
                <div className="flex items-center h-10 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm">
                  <ChevronRight className="w-4 h-4 text-violet-500 mr-2 shrink-0" />
                  <span className="font-medium text-violet-700 truncate">
                    {fromYear === 'all' || fromYear === 0
                      ? 'เลื่อนขึ้น 1 ชั้นปี (ปี 2 - สำเร็จการศึกษา)'
                      : yearLabel(toYear)}
                  </span>
                </div>
              </div>

              {/* สาขาวิชา */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">สาขาวิชา (ไม่จำเป็น)</Label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
                >
                  <option value="">ทุกสาขาวิชา</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.department_name}</option>
                  ))}
                </select>
              </div>

              {/* วันที่มีผล */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">วันที่มีผล</Label>
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="border-slate-200 focus:border-violet-300 focus:ring-violet-200"
                />
              </div>

              {/* หมายเหตุ */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">หมายเหตุ</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ระบุหมายเหตุ (ไม่จำเป็น)"
                  className="border-slate-200 focus:border-violet-300 focus:ring-violet-200"
                />
              </div>
            </div>

            <div className="px-6 pb-6 flex justify-end">
              <Button
                onClick={handlePreview}
                disabled={previewLoading}
                className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl shadow-sm"
              >
                {previewLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> กำลังตรวจสอบ...</>
                ) : (
                  <><Search className="w-4 h-4 mr-2" /> ตรวจสอบนักศึกษาที่เข้าเกณฑ์</>
                )}
              </Button>
            </div>
          </div>

          {/* ==========================================
              Preview Results
              ========================================== */}
          {previewData && (
            <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
              {/* Summary bar */}
              <div className="px-6 py-4 bg-violet-50/60 border-b border-violet-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-800 text-lg">
                    รายชื่อนักศึกษาที่เข้าเกณฑ์
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    ปีการศึกษา {previewData.academic_year} | {batchFromYearLabel(previewData.from_year)} → {batchToYearLabel(previewData.to_year)}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 text-sm font-medium">
                    <Users className="w-4 h-4" />
                    ทั้งหมด {previewData.total} คน
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    เข้าเกณฑ์ {previewData.eligible_count} คน
                  </span>
                  {previewData.ineligible_count > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
                      <AlertCircle className="w-4 h-4" />
                      ไม่เข้าเกณฑ์ {previewData.ineligible_count} คน
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                    <CheckSquare className="w-4 h-4" />
                    เลือกแล้ว {selectedIds.size} คน
                  </span>
                </div>
              </div>

              {/* Year Filter Pills for "All Years" mode */}
              {previewData.by_year && (fromYear === 'all' || fromYear === 0) && (
                <div className="px-6 py-2.5 bg-violet-50/30 border-b border-violet-100/60 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-slate-500 font-medium mr-1">แยกตามชั้นปี:</span>
                    <button
                      onClick={() => setPreviewYearFilter('all')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        previewYearFilter === 'all'
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      ทั้งหมด ({previewData.total})
                    </button>
                    {[1, 2, 3, 4].map(y => {
                      const count = previewData.by_year?.[`year${y}`] || 0;
                      return (
                        <button
                          key={y}
                          onClick={() => setPreviewYearFilter(y)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                            previewYearFilter === y
                              ? 'bg-violet-600 text-white shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {y === 4 ? `ปี 4 → สำเร็จการศึกษา (${count})` : `ปี ${y} → ปี ${y + 1} (${count})`}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      onClick={selectAllEligible}
                      className="text-violet-600 hover:text-violet-800 font-medium transition-colors"
                    >
                      เลือกทั้งหมดที่เข้าเกณฑ์ ({previewData.eligible_count})
                    </button>
                    {previewYearFilter !== 'all' && (
                      <>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={selectCurrentYearEligible}
                          className="text-violet-600 hover:text-violet-800 font-medium transition-colors"
                        >
                          เลือกเฉพาะปี {previewYearFilter}
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={deselectCurrentYear}
                          className="text-slate-500 hover:text-slate-700 font-medium transition-colors"
                        >
                          ยกเลิกเฉพาะปี {previewYearFilter}
                        </button>
                      </>
                    )}
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={deselectAll}
                      className="text-slate-500 hover:text-slate-700 font-medium transition-colors"
                    >
                      ยกเลิกทั้งหมด
                    </button>
                  </div>
                </div>
              )}

              {/* Select All / Deselect bar for single year mode */}
              {(!previewData.by_year || (fromYear !== 'all' && fromYear !== 0)) && previewData.students?.length > 0 && (
                <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3">
                  <button
                    onClick={selectAllEligible}
                    className="text-sm text-violet-600 hover:text-violet-800 font-medium transition-colors"
                  >
                    เลือกทั้งหมดที่เข้าเกณฑ์
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={deselectAll}
                    className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
                  >
                    ยกเลิกทั้งหมด
                  </button>
                </div>
              )}

              {/* Student list */}
              {previewData.students?.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium text-lg">ไม่พบนักศึกษาที่เข้าเกณฑ์</p>
                  <p className="text-sm mt-1">ลองเปลี่ยนเงื่อนไขแล้วค้นหาใหม่</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100">
                        <th className="px-4 py-3 text-center w-12">เลือก</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">รหัสนักศึกษา</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">ชื่อ-นามสกุล</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600 hidden md:table-cell">สาขาวิชา</th>
                        <th className="px-4 py-3 text-center font-medium text-slate-600">ชั้นปีเดิม</th>
                        <th className="px-4 py-3 text-center font-medium text-slate-600">ชั้นปีใหม่</th>
                        <th className="px-4 py-3 text-center font-medium text-slate-600">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(previewData.students || [])
                        .filter(s => previewYearFilter === 'all' || s.from_year === parseInt(previewYearFilter, 10))
                        .map((student) => {
                        const isEligible = student.eligibility_status === 'eligible';
                        const isSelected = selectedIds.has(student.profile_id);

                        return (
                          <tr
                            key={student.profile_id}
                            className={`border-b border-slate-50 transition-colors ${
                              isSelected ? 'bg-violet-50/40' : 'hover:bg-slate-50/60'
                            } ${!isEligible ? 'opacity-60' : ''}`}
                          >
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => isEligible && toggleStudent(student.profile_id)}
                                disabled={!isEligible}
                                className={`transition-colors ${!isEligible ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-5 h-5 text-violet-600" />
                                ) : (
                                  <Square className={`w-5 h-5 ${isEligible ? 'text-slate-400 hover:text-violet-400' : 'text-slate-300'}`} />
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-700">{student.profile_id}</td>
                            <td className="px-4 py-3">
                              <span className="text-slate-800">
                                {student.prefix} {student.firstname} {student.lastname}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{student.department}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                                ปี {student.from_year}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                student.to_year >= 5
                                  ? 'bg-amber-100 text-amber-700 font-semibold'
                                  : 'bg-violet-100 text-violet-700'
                              }`}>
                                {student.to_year >= 5 ? 'สำเร็จการศึกษา' : `ปี ${student.to_year}`}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isEligible ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  พร้อมเลื่อน
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-600 text-xs font-medium cursor-help"
                                  title={student.eligibility_reason}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  ไม่เข้าเกณฑ์
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Action bar */}
              {previewData.students?.length > 0 && (
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">
                    เลือกนักศึกษาที่ต้องการเลื่อนชั้นแล้วกดยืนยัน
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => { setPreviewData(null); setSelectedIds(new Set()); }}
                      className="rounded-xl border-slate-200 text-slate-600"
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      onClick={handleExecute}
                      disabled={selectedIds.size === 0 || !effectiveDate}
                      className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-6 shadow-sm disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      ยืนยันการเลื่อนชั้นปี ({selectedIds.size} คน)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB: History
          ========================================== */}
      {activeTab === 'history' && !selectedBatch && (
        <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-violet-600" />
              ประวัติการเลื่อนชั้นปีทั้งหมด
            </h3>
          </div>

          {historyLoading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
              <p className="text-sm">กำลังโหลด...</p>
            </div>
          ) : historyData.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-lg">ยังไม่มีประวัติการเลื่อนชั้น</p>
              <p className="text-sm mt-1">สร้างรอบเลื่อนชั้นครั้งแรกได้จากแท็บ "สร้างรอบเลื่อนชั้น"</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-4 py-3 text-left font-medium text-slate-600">รอบ</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">ปีการศึกษา</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">จากปี</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">เป็นปี</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">จำนวนที่เลื่อน</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600 hidden md:table-cell">วันที่มีผล</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600 hidden lg:table-cell">ดำเนินการโดย</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600 hidden lg:table-cell">วันที่ดำเนินการ</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">สถานะ</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">ดูรายละเอียด</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((batch) => (
                    <tr key={batch.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-700">#{batch.id}</td>
                      <td className="px-4 py-3 text-slate-600">{batch.academic_year}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                          {batchFromYearLabel(batch.from_year)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          batch.to_year === 5 ? 'bg-amber-100 text-amber-700 font-semibold' : 'bg-violet-100 text-violet-700'
                        }`}>
                          {batchToYearLabel(batch.to_year)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-violet-700">
                        {batch.total_promoted} คน
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{formatDate(batch.effective_date)}</td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{batch.created_by}</td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{formatDateTime(batch.executed_at)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          batch.status === 'executed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : batch.status === 'cancelled'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-amber-100 text-amber-700'
                        }`}>
                          {batch.status === 'executed' ? 'ดำเนินการแล้ว' : batch.status === 'cancelled' ? 'ยกเลิก' : 'รอดำเนินการ'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => viewBatchDetail(batch.id)}
                          className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-800 font-medium text-sm transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          ดู
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          Batch Detail View
          ========================================== */}
      {activeTab === 'history' && selectedBatch && (
        <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedBatch(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-semibold text-slate-800 text-lg">
                  รายละเอียดรอบ #{selectedBatch.id}
                </h3>
                <p className="text-sm text-slate-500">
                  ปีการศึกษา {selectedBatch.academic_year} | {batchFromYearLabel(selectedBatch.from_year)} → {batchToYearLabel(selectedBatch.to_year)}
                </p>
              </div>
            </div>

            {user?.role === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBatchToRollback(selectedBatch)}
                className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-1.5 text-xs rounded-xl"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                ยกเลิกรอบนี้
              </Button>
            )}
          </div>

          {/* Summary */}
          <div className="px-6 py-4 bg-violet-50/40 border-b border-violet-100 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-0.5">จำนวนที่เลื่อน</p>
              <p className="font-bold text-violet-700 text-lg">{selectedBatch.total_promoted} คน</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">วันที่มีผล</p>
              <p className="font-medium text-slate-700">{formatDate(selectedBatch.effective_date)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">ดำเนินการโดย</p>
              <p className="font-medium text-slate-700">{selectedBatch.created_by}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">วันที่ดำเนินการ</p>
              <p className="font-medium text-slate-700">{formatDateTime(selectedBatch.executed_at)}</p>
            </div>
          </div>

          {selectedBatch.notes && (
            <div className="px-6 py-3 bg-amber-50/50 border-b border-amber-100 text-sm text-amber-700">
              <span className="font-medium">หมายเหตุ:</span> {selectedBatch.notes}
            </div>
          )}

          {/* Student list */}
          {batchDetailLoading ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
              <p className="text-sm">กำลังโหลดรายชื่อ...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-4 py-3 text-center w-12 font-medium text-slate-600">#</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">รหัสนักศึกษา</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">ชื่อ-นามสกุล</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600 hidden md:table-cell">สาขาวิชา</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">จากปี</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">เป็นปี</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedBatch.students || []).map((student, idx) => (
                    <tr key={student.profile_id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{student.profile_id}</td>
                      <td className="px-4 py-3 text-slate-800">
                        {student.prefix} {student.firstname} {student.lastname}
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{student.department}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                          ปี {student.from_year}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          student.to_year >= 5 ? 'bg-amber-100 text-amber-700 font-semibold' : 'bg-violet-100 text-violet-700'
                        }`}>
                          {student.to_year >= 5 ? 'สำเร็จการศึกษา' : `ปี ${student.to_year}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          student.status === 'promoted'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {student.status === 'promoted' ? (
                            <><CheckCircle2 className="w-3.5 h-3.5" /> เลื่อนแล้ว</>
                          ) : (
                            <><XCircle className="w-3.5 h-3.5" /> ข้าม</>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          Confirmation Dialog
          ========================================== */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              ยืนยันการเลื่อนชั้นปี
            </DialogTitle>
            <DialogDescription className="text-slate-600 mt-3 space-y-2">
              <p>
                คุณกำลังจะเลื่อนนักศึกษาจำนวน <strong className="text-violet-700">{selectedIds.size} คน</strong>
              </p>
              <p>
                จาก <strong>{batchFromYearLabel(fromYear)}</strong> → <strong className="text-violet-700">{batchToYearLabel(toYear)}</strong>
              </p>
              <p>
                ปีการศึกษา: <strong>{academicYear}</strong>
              </p>
              <p>
                วันที่มีผล: <strong>{formatDate(effectiveDate)}</strong>
              </p>
              {(() => {
                const graduatingCount = (previewData?.students || [])
                  .filter(s => selectedIds.has(s.profile_id) && s.to_year >= 5).length;
                if (graduatingCount > 0) {
                  return (
                    <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-sm">
                      <GraduationCap className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                      <strong>มีนักศึกษาชั้นปี 4 จำนวน {graduatingCount} คน</strong> ที่จะถูกเปลี่ยนสถานะเป็น "สำเร็จการศึกษา" และ role จะเปลี่ยนเป็น "ศิษย์เก่า"
                    </div>
                  );
                }
                return null;
              })()}
              <p className="text-xs text-slate-400 mt-4">
                การดำเนินการนี้จะเปลี่ยนข้อมูลนักศึกษาจำนวน {selectedIds.size} คน
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={executing}
              className="rounded-xl"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={confirmExecute}
              disabled={executing}
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-6"
            >
              {executing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> กำลังดำเนินการ...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> ยืนยันการเลื่อนชั้น</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback Confirm Dialog */}
      <Dialog open={!!batchToRollback} onOpenChange={() => setBatchToRollback(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              ยืนยันการยกเลิกรอบการเลื่อนชั้นปี
            </DialogTitle>
            <DialogDescription className="pt-2 text-slate-600 space-y-2">
              <p>
                คุณต้องการยกเลิกรอบ <strong>#{batchToRollback?.id}</strong> (ปีการศึกษา {batchToRollback?.academic_year}) ใช่หรือไม่?
              </p>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-rose-700 text-xs">
                รายชื่อนักศึกษาจำนวน <strong>{batchToRollback?.total_promoted} คน</strong> จะถูกย้อนกลับสู่ชั้นปีเดิมทันที
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-3">
            <Button variant="outline" onClick={() => setBatchToRollback(null)} disabled={rollingBack} className="rounded-xl">
              ปิด
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
              onClick={handleConfirmRollback}
              disabled={rollingBack}
            >
              {rollingBack ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> กำลังยกเลิก...</>
              ) : (
                <><RotateCcw className="w-4 h-4 mr-1.5" /> ยืนยันยกเลิกรอบนี้</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentPromotion;
