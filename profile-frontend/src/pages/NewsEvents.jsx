import React, { useState, useEffect, useRef } from 'react';
import { newsEventService, uploadService, departmentService, facultyService } from '../services';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/use-toast';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../components/ui/dialog';
import {
  Megaphone,
  Search,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Pin,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  FileText,
  Download,
  Image as ImageIcon,
  RotateCcw,
  Upload,
  LayoutGrid,
  List,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  X,
  Building2,
  Users,
  Mail,
  Send,
  History,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import {
  THAI_MONTHS,
  EVENT_TYPE_COLORS,
  formatThaiDate,
  formatThaiShortDate
} from '../components/MonthlyNewsSection';

export const EVENT_TYPES = [
  'ประกาศ',
  'กิจกรรม',
  'การเรียน',
  'ฝึกงาน',
  'การแข่งขัน',
  'อบรม/สัมมนา',
  'กำหนดการสำคัญ',
  'อื่น ๆ'
];

export const TARGET_TYPES = [
  { value: 'all', label: 'ทุกคน (Public)' },
  { value: 'department', label: 'เฉพาะสาขาวิชา' },
  { value: 'year', label: 'เฉพาะชั้นปี' },
  { value: 'department_year', label: 'สาขาวิชา + ชั้นปี' },
  { value: 'faculty', label: 'เฉพาะคณะ' }
];

export const EMAIL_TARGET_GROUPS = [
  { value: 'all', label: 'นักศึกษาทั้งหมด' },
  { value: 'department', label: 'นักศึกษาตามสาขาวิชา' },
  { value: 'year', label: 'นักศึกษาตามชั้นปี' },
  { value: 'department_year', label: 'นักศึกษาตามสาขาวิชา + ชั้นปี' },
  { value: 'faculty', label: 'นักศึกษาตามคณะ' },
  { value: 'teachers', label: 'อาจารย์และที่ปรึกษา' },
  { value: 'everyone', label: 'ทุกคน (นักศึกษา + อาจารย์)' }
];

const renderTargetBadge = (item) => {
  const target = item?.target_type || 'all';
  if (target === 'department') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
        <Building2 className="w-2.5 h-2.5" />
        {item.department?.department_name || 'เฉพาะสาขา'}
      </span>
    );
  }
  if (target === 'year') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
        <Users className="w-2.5 h-2.5" />
        เฉพาะปี {item.year_level}
      </span>
    );
  }
  if (target === 'department_year') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
        <Building2 className="w-2.5 h-2.5" />
        {item.department?.department_name || 'สาขา'} (ปี {item.year_level})
      </span>
    );
  }
  if (target === 'faculty') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
        เฉพาะคณะ
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200">
      ทุกคน
    </span>
  );
};

/**
 * กล่องเลือกเวลาแบบ 24 ชั่วโมงของไทย (00:00 - 23:59 น.)
 * ไม่มีคอลัมน์ AM / PM ไม่ขึ้นกับระบบปฏิบัติการ Windows หรือ Locale ของเบราว์เซอร์
 */
const ThaiTimeInput = ({ value = '', onChange, placeholder = '--:--', className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const hourListRef = useRef(null);
  const minuteListRef = useRef(null);

  // ปิด Popover เมื่อคลิกด้านนอก
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const [currentH, currentM] = (value || '').split(':');
  const selectedH = currentH !== undefined && currentH !== '' ? currentH.padStart(2, '0') : '';
  const selectedM = currentM !== undefined && currentM !== '' ? currentM.padStart(2, '0') : '';

  // เลื่อน scroll ไปยังเวลาที่เลือกไว้เมื่อเปิด Popover
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (hourListRef.current && selectedH) {
          const el = hourListRef.current.querySelector(`[data-hour="${selectedH}"]`);
          if (el) el.scrollIntoView({ block: 'center' });
        }
        if (minuteListRef.current && selectedM) {
          const el = minuteListRef.current.querySelector(`[data-minute="${selectedM}"]`);
          if (el) el.scrollIntoView({ block: 'center' });
        }
      }, 50);
    }
  }, [isOpen]);

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const handleSelectHour = (hr) => {
    const min = selectedM || '00';
    onChange(`${hr}:${min}`);
  };

  const handleSelectMinute = (mn) => {
    const hr = selectedH || '08';
    onChange(`${hr}:${mn}`);
  };

  // พิมพ์เวลาด้วยคีย์บอร์ดได้โดยตรง และจัดรูปแบบอัตโนมัติ
  const handleInputChange = (e) => {
    let text = e.target.value.replace(/[^0-9:]/g, '');
    if (text.length === 2 && !text.includes(':') && !e.target.value.includes(':')) {
      text = text + ':';
    }
    if (text.length > 5) text = text.slice(0, 5);
    onChange(text);
  };

  const handleBlur = () => {
    if (!value) return;
    const parts = value.split(':');
    if (parts.length === 2) {
      let h = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10);
      if (isNaN(h) || h < 0) h = 0;
      if (h > 23) h = 23;
      if (isNaN(m) || m < 0) m = 0;
      if (m > 59) m = 59;
      onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={`relative flex items-center h-9 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs shadow-2xs transition-colors focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-200/50 ${className}`}
      >
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onClick={() => setIsOpen(true)}
          placeholder={placeholder}
          maxLength={5}
          className="w-full bg-transparent font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none tracking-wider text-xs"
        />

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="text-gray-300 hover:text-gray-600 p-0.5 rounded"
              title="ล้างเวลา"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(prev => !prev);
            }}
            className="text-gray-400 hover:text-purple-600 p-0.5 rounded transition-colors"
            title="เลือกเวลาแบบ 24 ชั่วโมง (ไทย)"
          >
            <Clock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Popover Dropdown (2 Columns: Hour 00-23, Minute 00-59 — ไม่มี AM/PM) */}
      {isOpen && (
        <div className="absolute z-50 left-0 mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-gray-200 p-2.5 space-y-2 animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="flex items-center justify-between px-1 text-[11px] font-bold text-gray-500 border-b border-gray-100 pb-1.5">
            <span>ชั่วโมง (00 - 23)</span>
            <span>นาที (00 - 59)</span>
          </div>

          <div className="grid grid-cols-2 gap-2 h-48">
            {/* Hour List (00 - 23) */}
            <div ref={hourListRef} className="overflow-y-auto space-y-0.5 pr-1 scrollbar-thin">
              {hours.map((hr) => {
                const isSelected = selectedH === hr;
                return (
                  <button
                    key={hr}
                    type="button"
                    data-hour={hr}
                    onClick={() => handleSelectHour(hr)}
                    className={`w-full py-1 text-center text-xs font-semibold rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                    }`}
                  >
                    {hr}
                  </button>
                );
              })}
            </div>

            {/* Minute List (00 - 59) */}
            <div ref={minuteListRef} className="overflow-y-auto space-y-0.5 pr-1 border-l border-gray-100 pl-1 scrollbar-thin">
              {minutes.map((mn) => {
                const isSelected = selectedM === mn;
                return (
                  <button
                    key={mn}
                    type="button"
                    data-minute={mn}
                    onClick={() => handleSelectMinute(mn)}
                    className={`w-full py-1 text-center text-xs font-semibold rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                    }`}
                  >
                    {mn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Preset Buttons & Close */}
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-gray-400">
              <span>เวลาด่วน:</span>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const h = String(now.getHours()).padStart(2, '0');
                  const m = String(now.getMinutes()).padStart(2, '0');
                  onChange(`${h}:${m}`);
                }}
                className="text-purple-600 hover:underline font-medium"
              >
                เวลาปัจจุบัน
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {['08:30', '09:00', '13:00', '16:30'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    onChange(preset);
                  }}
                  className={`py-0.5 text-[10px] rounded border font-medium transition-colors ${
                    value === preset
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-purple-50'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                }}
                className="text-[11px] text-gray-400 hover:text-red-600 font-medium px-1"
              >
                ล้างค่า
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-semibold bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NewsEvents = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';
  const isAdvisor = user?.role === 'advisor' || user?.role === 'teacher';
  const canManage = isAdmin || isAdvisor;

  const currentDate = new Date();
  const currentBEYear = currentDate.getFullYear() + 543;

  // Data & Loading States
  const [events, setEvents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [publishedFilter, setPublishedFilter] = useState('ALL'); // for admin: ALL | published | draft

  // Modal States
  const [selectedEvent, setSelectedEvent] = useState(null); // Detail modal
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Form State
  const [formId, setFormId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'ประกาศ',
    description: '',
    event_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    location: '',
    image_url: '',
    attachment_url: '',
    attachment_name: '',
    is_pinned: false,
    is_published: true,
    target_type: isAdvisor && !isAdmin ? 'department' : 'all',
    department_id: '',
    year_level: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Email Notification States
  const [faculties, setFaculties] = useState([]);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailEvent, setEmailEvent] = useState(null);
  const [emailTargetType, setEmailTargetType] = useState('all');
  const [emailFacultyId, setEmailFacultyId] = useState('');
  const [emailDepartmentId, setEmailDepartmentId] = useState('');
  const [emailYearLevel, setEmailYearLevel] = useState('');
  const [emailStartTime, setEmailStartTime] = useState('');
  const [emailEndTime, setEmailEndTime] = useState('');
  const [emailLocation, setEmailLocation] = useState('');
  const [emailForceResend, setEmailForceResend] = useState(false);
  const [sendEmailAfterCreate, setSendEmailAfterCreate] = useState(false);
  const [showRecipientList, setShowRecipientList] = useState(false);

  const [emailRecipients, setEmailRecipients] = useState([]);
  const [emailSummary, setEmailSummary] = useState(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  // Email History Modal / Tab
  const [emailActiveTab, setEmailActiveTab] = useState('send'); // 'send' | 'history'
  const [emailHistoryLogs, setEmailHistoryLogs] = useState([]);
  const [emailHistorySummary, setEmailHistorySummary] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [retryingFailed, setRetryingFailed] = useState(false);

  const imageInputRef = useRef(null);
  const attachmentInputRef = useRef(null);

  // Dynamic BE years
  const availableYears = [];
  for (let i = currentBEYear - 3; i <= currentBEYear + 3; i++) {
    availableYears.push(i);
  }

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search && search.trim()) params.search = search.trim();
      if (selectedType && selectedType !== 'ALL') params.type = selectedType;
      if (selectedMonth && selectedMonth !== 'ALL') params.month = selectedMonth;
      if (selectedYear && selectedYear !== 'ALL') params.year = selectedYear;
      if (isAdmin && publishedFilter !== 'ALL') {
        params.is_published = publishedFilter === 'published';
      }

      const res = await newsEventService.getAll(params);
      if (res.success) {
        setEvents(res.data || []);
      }
    } catch (error) {
      console.error('Error fetching news & events:', error);
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลข่าวสารและกิจกรรมได้'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedType, selectedMonth, selectedYear, publishedFilter]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchEvents();
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedType('ALL');
    setSelectedMonth('ALL');
    setSelectedYear('ALL');
    setPublishedFilter('ALL');
  };

  // Fetch departments & faculties for admin
  useEffect(() => {
    if (isAdmin) {
      departmentService.getAll()
        .then(res => {
          if (res.success && res.data) setDepartments(res.data);
        })
        .catch(err => console.error('Error fetching departments:', err));

      facultyService.getAll()
        .then(res => {
          if (res.success && res.data) setFaculties(res.data);
        })
        .catch(err => console.error('Error fetching faculties:', err));
    }
  }, [isAdmin]);

  // Open Create Dialog
  const handleOpenCreate = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormId(null);
    setSendEmailAfterCreate(false);
    setFormData({
      title: '',
      type: 'ประกาศ',
      description: '',
      event_date: today,
      end_date: '',
      start_time: '',
      end_time: '',
      location: '',
      image_url: '',
      attachment_url: '',
      attachment_name: '',
      is_pinned: false,
      is_published: true,
      target_type: isAdvisor && !isAdmin ? 'department' : 'all',
      department_id: '',
      year_level: ''
    });
    setIsAddEditOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (item) => {
    setFormId(item.id);
    const dateStr = item.event_date ? new Date(item.event_date).toISOString().split('T')[0] : '';
    const endDateStr = item.end_date ? new Date(item.end_date).toISOString().split('T')[0] : '';
    setFormData({
      title: item.title || '',
      type: item.type || 'ประกาศ',
      description: item.description || '',
      event_date: dateStr,
      end_date: endDateStr,
      start_time: item.start_time || '',
      end_time: item.end_time || '',
      location: item.location || '',
      image_url: item.image_url || '',
      attachment_url: item.attachment_url || '',
      attachment_name: item.attachment_name || '',
      is_pinned: Boolean(item.is_pinned),
      is_published: Boolean(item.is_published),
      target_type: item.target_type || (isAdvisor && !isAdmin ? 'department' : 'all'),
      department_id: item.department_id ? String(item.department_id) : '',
      year_level: item.year_level ? String(item.year_level) : ''
    });
    setIsAddEditOpen(true);
  };

  // Handle Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({ variant: 'destructive', title: 'กรุณาระบุหัวข้อ' });
      return;
    }
    if (!formData.event_date) {
      toast({ variant: 'destructive', title: 'กรุณาระบุวันที่จัดกิจกรรม' });
      return;
    }

    setFormSubmitting(true);
    try {
      if (formId) {
        // Update
        const res = await newsEventService.update(formId, formData);
        if (res.success) {
          toast({ title: 'สำเร็จ', description: 'แก้ไขข่าวสาร/กิจกรรมเรียบร้อยแล้ว' });
          setIsAddEditOpen(false);
          fetchEvents();
        }
      } else {
        // Create
        const res = await newsEventService.create(formData);
        if (res.success) {
          toast({ title: 'สำเร็จ', description: 'สร้างข่าวสาร/กิจกรรมเรียบร้อยแล้ว' });
          setIsAddEditOpen(false);
          fetchEvents();
          if (sendEmailAfterCreate && res.data) {
            setTimeout(() => {
              handleOpenEmailModal(res.data);
            }, 300);
          }
        }
      }
    } catch (error) {
      console.error('Error saving news event:', error);
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: error.response?.data?.message || 'ไม่สามารถบันทึกข้อมูลได้'
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Image Upload handler
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await uploadService.uploadNewsImage(file);
      if (res.success) {
        setFormData(prev => ({ ...prev, image_url: res.data.file_path }));
        toast({ title: 'อัปโหลดรูปภาพสำเร็จ' });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        variant: 'destructive',
        title: 'อัปโหลดรูปภาพไม่สำเร็จ',
        description: error.response?.data?.message || error.message
      });
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // Attachment Upload handler
  const handleAttachmentFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAttachment(true);
    try {
      const res = await uploadService.uploadNewsAttachment(file);
      if (res.success) {
        setFormData(prev => ({
          ...prev,
          attachment_url: res.data.file_path,
          attachment_name: res.data.original_name || file.name
        }));
        toast({ title: 'อัปโหลดเอกสารแนบสำเร็จ' });
      }
    } catch (error) {
      console.error('Error uploading attachment:', error);
      toast({
        variant: 'destructive',
        title: 'อัปโหลดเอกสารไม่สำเร็จ',
        description: error.response?.data?.message || error.message
      });
    } finally {
      setUploadingAttachment(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    }
  };

  // =========================================================================
  // Email Notification Handlers
  // =========================================================================
  const handleOpenEmailModal = (eventItem) => {
    setEmailEvent(eventItem);
    setEmailTargetType(eventItem.target_type || 'all');
    setEmailFacultyId(eventItem.faculty_id ? String(eventItem.faculty_id) : '');
    setEmailDepartmentId(eventItem.department_id ? String(eventItem.department_id) : '');
    setEmailYearLevel(eventItem.year_level ? String(eventItem.year_level) : '');
    setEmailStartTime(eventItem.start_time || '');
    setEmailEndTime(eventItem.end_time || '');
    setEmailLocation(eventItem.location || '');
    setEmailForceResend(false);
    setSendResult(null);
    setShowRecipientList(false);
    setEmailActiveTab('send');
    setIsEmailModalOpen(true);
  };

  const fetchEmailRecipients = async () => {
    if (!emailEvent) return;
    setLoadingRecipients(true);
    try {
      const params = {
        target_type: emailTargetType
      };
      if (emailFacultyId) params.faculty_id = emailFacultyId;
      if (emailDepartmentId) params.department_id = emailDepartmentId;
      if (emailYearLevel) params.year_level = emailYearLevel;

      const res = await newsEventService.getEmailRecipients(emailEvent.id, params);
      if (res.success && res.data) {
        setEmailRecipients(res.data.recipients || []);
        setEmailSummary(res.data.summary || null);
      }
    } catch (err) {
      console.error('Error fetching email recipients:', err);
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: err.response?.data?.message || 'ไม่สามารถดึงรายชื่อผู้รับได้'
      });
    } finally {
      setLoadingRecipients(false);
    }
  };

  useEffect(() => {
    if (isEmailModalOpen && emailEvent && emailActiveTab === 'send') {
      fetchEmailRecipients();
    }
  }, [isEmailModalOpen, emailEvent, emailTargetType, emailFacultyId, emailDepartmentId, emailYearLevel]);

  const fetchEmailHistory = async () => {
    if (!emailEvent) return;
    setLoadingHistory(true);
    try {
      const res = await newsEventService.getEmailHistory(emailEvent.id);
      if (res.success && res.data) {
        setEmailHistoryLogs(res.data.logs || []);
        setEmailHistorySummary(res.data.summary || null);
      }
    } catch (err) {
      console.error('Error fetching email history:', err);
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถดึงประวัติการส่งอีเมลได้'
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isEmailModalOpen && emailEvent && emailActiveTab === 'history') {
      fetchEmailHistory();
    }
  }, [isEmailModalOpen, emailEvent, emailActiveTab]);

  const handleSendEmails = async () => {
    if (!emailEvent) return;
    setSendingEmails(true);
    try {
      const payload = {
        target_type: emailTargetType,
        faculty_id: emailFacultyId ? parseInt(emailFacultyId, 10) : null,
        department_id: emailDepartmentId ? parseInt(emailDepartmentId, 10) : null,
        year_level: emailYearLevel ? parseInt(emailYearLevel, 10) : null,
        force_resend: emailForceResend,
        start_time: emailStartTime,
        end_time: emailEndTime,
        location: emailLocation
      };

      const res = await newsEventService.sendEmailBatch(emailEvent.id, payload);
      if (res.success && res.data) {
        setSendResult(res.data);
        setEmailEvent(prev => ({
          ...prev,
          start_time: emailStartTime,
          end_time: emailEndTime,
          location: emailLocation
        }));
        toast({
          title: 'ส่งอีเมลแจ้งเตือนเรียบร้อยแล้ว',
          description: `สำเร็จ: ${res.data.sent} คน, ล้มเหลว: ${res.data.failed} คน, ข้าม: ${res.data.skipped} คน`
        });
        fetchEmailRecipients();
        fetchEvents();
      }
    } catch (err) {
      console.error('Error sending emails:', err);
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาดในการส่งอีเมล',
        description: err.response?.data?.message || err.message
      });
    } finally {
      setSendingEmails(false);
    }
  };

  const handleRetryFailedEmails = async () => {
    if (!emailEvent) return;
    setRetryingFailed(true);
    try {
      const res = await newsEventService.retryFailedEmail(emailEvent.id);
      if (res.success) {
        toast({
          title: 'ส่งใหม่อีกครั้งเรียบร้อย',
          description: `สำเร็จ: ${res.data.sent} คน, ล้มเหลว: ${res.data.failed} คน`
        });
        fetchEmailHistory();
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'เกิดข้อผิดพลาด',
        description: err.response?.data?.message || 'ไม่สามารถส่งใหม่อีกครั้งได้'
      });
    } finally {
      setRetryingFailed(false);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await newsEventService.togglePin(id);
      if (res.success) {
        toast({ title: res.message });
        setEvents(prev => prev.map(item => item.id === id ? { ...item, is_pinned: !item.is_pinned } : item));
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะปักหมุด' });
    }
  };

  // Toggle Publish
  const handleTogglePublish = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await newsEventService.togglePublish(id);
      if (res.success) {
        toast({ title: res.message });
        setEvents(prev => prev.map(item => item.id === id ? { ...item, is_published: !item.is_published } : item));
      }
    } catch (error) {
      console.error('Error toggling publish:', error);
      toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะเผยแพร่' });
    }
  };

  // Delete handler
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      const res = await newsEventService.delete(itemToDelete.id);
      if (res.success) {
        toast({ title: 'ลบสำเร็จ', description: 'ลบข่าวสาร/กิจกรรมเรียบร้อยแล้ว' });
        setIsDeleteOpen(false);
        setItemToDelete(null);
        fetchEvents();
      }
    } catch (error) {
      console.error('Error deleting news event:', error);
      toast({ variant: 'destructive', title: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-800 text-white p-6 md:p-8 shadow-lg">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-purple-100">
              <Megaphone className="w-3.5 h-3.5" />
              <span>ข่าวสาร ประกาศ และกิจกรรม</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              ข่าวสารและกิจกรรมทั้งหมด
            </h1>
            <p className="text-xs md:text-sm text-purple-200 max-w-xl">
              ติดตามกำหนดการสำคัญ ประกาศวิชาการ การฝึกงาน และกิจกรรมต่าง ๆ ภายในสาขาวิชาและมหาวิทยาลัย
            </p>
          </div>

          {canManage && (
            <Button
              onClick={handleOpenCreate}
              className="bg-white hover:bg-purple-50 text-purple-900 font-bold px-5 py-2.5 rounded-2xl shadow-md flex items-center gap-2 shrink-0 transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4 text-purple-700" />
              <span>เพิ่มข่าวสารหรือกิจกรรม</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Control Bar */}
      <Card className="border border-purple-100/60 shadow-xs rounded-2xl bg-white p-4">
        <div className="space-y-3">
          {/* Top row: Search, Month, Year, Type, View Switcher */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="ค้นหาหัวข้อ, รายละเอียด, สถานที่..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8 text-xs h-9 rounded-xl border-gray-200 focus:border-purple-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Type selector */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="h-9 px-3 text-xs bg-gray-50/80 border border-gray-200 rounded-xl text-gray-700 font-medium focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="ALL">ประเภททั้งหมด</option>
                {EVENT_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              {/* Month selector */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-9 px-3 text-xs bg-gray-50/80 border border-gray-200 rounded-xl text-gray-700 font-medium focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="ALL">ทุกเดือน</option>
                {THAI_MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>

              {/* Year selector */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-9 px-3 text-xs bg-gray-50/80 border border-gray-200 rounded-xl text-gray-700 font-medium focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="ALL">ทุกปี พ.ศ.</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>พ.ศ. {y}</option>
                ))}
              </select>

              {/* Admin publish filter */}
              {isAdmin && (
                <select
                  value={publishedFilter}
                  onChange={(e) => setPublishedFilter(e.target.value)}
                  className="h-9 px-3 text-xs bg-gray-50/80 border border-gray-200 rounded-xl text-gray-700 font-medium focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="ALL">ทุกสถานะ</option>
                  <option value="published">เผยแพร่แล้ว</option>
                  <option value="draft">ยังไม่เผยแพร่</option>
                </select>
              )}

              {/* Reset filter button */}
              {(search || selectedType !== 'ALL' || selectedMonth !== 'ALL' || selectedYear !== 'ALL' || publishedFilter !== 'ALL') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-9 px-2.5 text-xs text-purple-600 border-purple-200 hover:bg-purple-50 rounded-xl"
                  title="ล้างตัวกรอง"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  <span>ล้างตัวกรอง</span>
                </Button>
              )}

              {/* View Switcher */}
              <div className="flex items-center border border-gray-200 rounded-xl p-0.5 bg-gray-50/50">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-xs text-purple-700' : 'text-gray-400 hover:text-gray-600'}`}
                  title="มุมมองการ์ด"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-white shadow-xs text-purple-700' : 'text-gray-400 hover:text-gray-600'}`}
                  title="มุมมองตาราง"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Content Section */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-gray-400 space-y-2">
          <div className="w-9 h-9 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">กำลังโหลดข้อมูลข่าวสารและกิจกรรม...</span>
        </div>
      ) : events.length === 0 ? (
        <Card className="border border-dashed border-purple-200/80 bg-purple-50/10 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-400 flex items-center justify-center">
            <Megaphone className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-800">ไม่พบข่าวสารหรือกิจกรรม</h3>
          <p className="text-xs text-gray-500 max-w-md">
            ลองปรับเปลี่ยนคำค้นหาหรือตัวกรอง หรือเพิ่มข่าวสาร/กิจกรรมใหม่
          </p>
          {canManage && (
            <Button
              onClick={handleOpenCreate}
              className="mt-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างข่าวสาร/กิจกรรม</span>
            </Button>
          )}
        </Card>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((item) => {
            const dateParts = formatThaiShortDate(item.event_date);
            const typeStyle = EVENT_TYPE_COLORS[item.type] || EVENT_TYPE_COLORS['อื่น ๆ'];
            const canManageItem = isAdmin || (canManage && item.created_by === user?.id);

            return (
              <div
                key={item.id}
                onClick={() => setSelectedEvent(item)}
                className="group relative bg-white border border-gray-100 hover:border-purple-200 rounded-2xl shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between cursor-pointer overflow-hidden"
              >
                {/* Pinned Accent Header */}
                {item.is_pinned && (
                  <div className="h-1.5 bg-gradient-to-r from-amber-400 via-purple-500 to-indigo-500" />
                )}

                {/* Optional Cover Image Banner */}
                {item.image_url && (
                  <div className="relative h-44 w-full overflow-hidden bg-gray-100">
                    <img
                      src={item.image_url.startsWith('http') ? item.image_url : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${item.image_url}`}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[11px] font-medium">
                      <span className="bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-md">
                        {formatThaiDate(item.event_date)}{item.end_date ? ` - ${formatThaiDate(item.end_date)}` : ''}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {/* Top Row: Date Badge (if no cover) + Type + Target + Pin */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {!item.image_url && (
                          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex flex-col items-center justify-center text-purple-900 shrink-0 font-bold">
                            <span className="text-sm leading-none">{dateParts.day}</span>
                            <span className="text-[9px] text-purple-600 leading-tight mt-0.5">{dateParts.month}</span>
                          </div>
                        )}
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${typeStyle}`}>
                          {item.type}
                        </span>
                        {renderTargetBadge(item)}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.is_pinned && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            <Pin className="w-2.5 h-2.5 fill-amber-500 text-amber-600 rotate-45" />
                            ปักหมุด
                          </span>
                        )}
                        {isAdmin && !item.is_published && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                            <EyeOff className="w-2.5 h-2.5" />
                            ร่าง
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="font-bold text-base text-gray-900 group-hover:text-purple-700 transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1.5 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Metadata: Time & Location */}
                  <div className="space-y-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-2.5 truncate">
                        {(item.start_time || item.end_time) && (
                          <span className="inline-flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3 text-purple-500" />
                            {item.start_time || ''}{item.end_time ? ` - ${item.end_time}` : ''} น.
                          </span>
                        )}
                        {item.location && (
                          <span className="inline-flex items-center gap-1 truncate" title={item.location}>
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="truncate">{item.location}</span>
                          </span>
                        )}
                      </div>

                      {item.attachment_url && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
                          <FileText className="w-2.5 h-2.5" />
                          ไฟล์แนบ
                        </span>
                      )}
                    </div>

                    {/* Actions Bar */}
                    {canManageItem && (
                      <div
                        className="pt-2 flex items-center justify-between border-t border-gray-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleTogglePin(e, item.id)}
                            className={`p-1.5 rounded-lg border transition-colors ${item.is_pinned ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-400 border-gray-200 hover:text-amber-600'}`}
                            title={item.is_pinned ? 'ยกเลิกการปักหมุด' : 'ปักหมุด'}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => handleTogglePublish(e, item.id)}
                            className={`p-1.5 rounded-lg border transition-colors ${item.is_published ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-400 border-gray-200 hover:text-emerald-600'}`}
                            title={item.is_published ? 'ยกเลิกเผยแพร่' : 'เผยแพร่'}
                          >
                            {item.is_published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {isAdmin && (
                            <button
                              onClick={() => handleOpenEmailModal(item)}
                              className="p-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors flex items-center gap-1 text-[11px] font-semibold px-2"
                              title="ส่ง Email แจ้งเตือน"
                            >
                              <Mail className="w-3.5 h-3.5 text-purple-600" />
                              <span>ส่งอีเมล</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg border border-purple-100 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                            title="แก้ไข"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setItemToDelete(item);
                              setIsDeleteOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="border border-purple-100/60 rounded-2xl bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-purple-50/50 border-b border-purple-100 text-gray-700 font-bold">
                  <th className="p-3.5 pl-5">วันที่จัดกิจกรรม</th>
                  <th className="p-3.5">หัวข้อข่าว / กิจกรรม</th>
                  <th className="p-3.5">ประเภท</th>
                  <th className="p-3.5">เวลา & สถานที่</th>
                  <th className="p-3.5">ไฟล์แนบ</th>
                  {isAdmin && <th className="p-3.5 text-center">สถานะ</th>}
                  <th className="p-3.5 pr-5 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((item) => {
                  const typeStyle = EVENT_TYPE_COLORS[item.type] || EVENT_TYPE_COLORS['อื่น ๆ'];
                  const canManageItem = isAdmin || (canManage && item.created_by === user?.id);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedEvent(item)}
                      className="hover:bg-purple-50/20 cursor-pointer transition-colors"
                    >
                      <td className="p-3.5 pl-5 font-semibold text-gray-800 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {item.is_pinned && <Pin className="w-3 h-3 text-amber-600 fill-amber-500 rotate-45 shrink-0" />}
                          <span>{formatThaiDate(item.event_date)}{item.end_date ? ` - ${formatThaiDate(item.end_date)}` : ''}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 line-clamp-1 max-w-sm">
                            {item.title}
                          </span>
                          {renderTargetBadge(item)}
                        </div>
                        {item.description && (
                          <div className="text-[11px] text-gray-400 line-clamp-1 max-w-sm mt-0.5">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${typeStyle}`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap text-gray-600">
                        <div>{item.start_time ? `${item.start_time}${item.end_time ? ` - ${item.end_time}` : ''} น.` : '-'}</div>
                        <div className="text-[11px] text-gray-400">{item.location || '-'}</div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {item.attachment_url ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
                            <FileText className="w-3 h-3" />
                            มีเอกสาร
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="p-3.5 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={(e) => handleTogglePin(e, item.id)}
                              className={`p-1 rounded ${item.is_pinned ? 'text-amber-600 bg-amber-50' : 'text-gray-300 hover:text-amber-500'}`}
                              title="ปักหมุด"
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleTogglePublish(e, item.id)}
                              className={`p-1 rounded ${item.is_published ? 'text-emerald-600 bg-emerald-50' : 'text-gray-300 hover:text-emerald-500'}`}
                              title="สถานะเผยแพร่"
                            >
                              {item.is_published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      )}
                      <td className="p-3.5 pr-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEvent(item)}
                            className="h-7 px-2 text-xs text-purple-700 hover:bg-purple-50"
                          >
                            ดูรายละเอียด
                          </Button>
                          {isAdmin && (
                            <button
                              onClick={() => handleOpenEmailModal(item)}
                              className="p-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                              title="ส่ง Email แจ้งเตือน"
                            >
                              <Mail className="w-3 h-3 text-purple-600" />
                            </button>
                          )}
                          {canManageItem && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 rounded-lg border border-purple-100 bg-purple-50 text-purple-700 hover:bg-purple-100"
                                title="แก้ไข"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  setItemToDelete(item);
                                  setIsDeleteOpen(true);
                                }}
                                className="p-1.5 rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
                                title="ลบ"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Detail Modal */}
      {/* ========================================================================= */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex items-start justify-between gap-4 z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${EVENT_TYPE_COLORS[selectedEvent.type] || EVENT_TYPE_COLORS['อื่น ๆ']}`}>
                    {selectedEvent.type}
                  </span>
                  {renderTargetBadge(selectedEvent)}
                  {selectedEvent.is_pinned && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      <Pin className="w-3 h-3 fill-amber-500 text-amber-600 rotate-45" />
                      ปักหมุด
                    </span>
                  )}
                  {isAdmin && !selectedEvent.is_published && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                      ยังไม่เผยแพร่ (ร่าง)
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 leading-snug">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Event Image */}
              {selectedEvent.image_url && (
                <div className="rounded-xl overflow-hidden bg-gray-50 border border-gray-100 max-h-80 flex items-center justify-center">
                  <img
                    src={selectedEvent.image_url.startsWith('http') ? selectedEvent.image_url : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${selectedEvent.image_url}`}
                    alt={selectedEvent.title}
                    className="w-full h-full object-contain max-h-80"
                  />
                </div>
              )}

              {/* Event Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-50/40 border border-purple-100/60 rounded-xl p-3.5 text-xs text-gray-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                  <div>
                    <span className="text-gray-400 block text-[10px]">วันที่จัดกิจกรรม</span>
                    <span className="font-semibold">
                      {formatThaiDate(selectedEvent.event_date)}{selectedEvent.end_date ? ` - ${formatThaiDate(selectedEvent.end_date)}` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <span className="text-gray-400 block text-[10px]">เวลา</span>
                    <span className="font-semibold">
                      {selectedEvent.start_time ? `${selectedEvent.start_time}${selectedEvent.end_time ? ` - ${selectedEvent.end_time}` : ''} น.` : 'ไม่ระบุเวลา'}
                    </span>
                  </div>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                    <div>
                      <span className="text-gray-400 block text-[10px]">สถานที่</span>
                      <span className="font-semibold">{selectedEvent.location}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedEvent.description && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">รายละเอียด</h4>
                  <div className="text-sm text-gray-600 whitespace-pre-line leading-relaxed bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    {selectedEvent.description}
                  </div>
                </div>
              )}

              {/* Attachment */}
              {selectedEvent.attachment_url && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">เอกสารแนบ</h4>
                  <a
                    href={selectedEvent.attachment_url.startsWith('http') ? selectedEvent.attachment_url : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${selectedEvent.attachment_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl border border-purple-100 bg-purple-50/30 hover:bg-purple-50 transition-colors text-xs font-semibold text-purple-900 group"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span>{selectedEvent.attachment_name || 'ดาวน์โหลดเอกสารแนบ'}</span>
                    </div>
                    <Download className="w-4 h-4 text-purple-500 group-hover:translate-y-0.5 transition-transform" />
                  </a>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
              <span>{selectedEvent.creator ? `สร้างโดย: ${selectedEvent.creator.username}` : ''}</span>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const ev = selectedEvent;
                      setSelectedEvent(null);
                      handleOpenEmailModal(ev);
                    }}
                    className="text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-xl flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>ส่ง Email แจ้งเตือน</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEvent(null)}
                  className="text-xs rounded-xl"
                >
                  ปิดหน้าต่าง
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Create / Edit Modal */}
      {/* ========================================================================= */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-purple-600" />
              <span>{formId ? 'แก้ไขข้อมูลข่าวสาร/กิจกรรม' : 'เพิ่มข่าวสารหรือกิจกรรมใหม่'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              กรอกรายละเอียดข่าวสาร กำหนดการ หรือกิจกรรม เพื่อเผยแพร่ให้กับนักศึกษาและบุคลากร
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">หัวข้อข่าว / กิจกรรม <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                required
                placeholder="เช่น กำหนดการสอบโครงงาน ภาคเรียนที่ 1/2569"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="text-xs h-9 rounded-xl"
              />
            </div>

            {/* Type, Start Date & End Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">ประเภท <span className="text-red-500">*</span></Label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-xl text-gray-700 font-medium focus:outline-none focus:border-purple-500"
                >
                  {EVENT_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">วันที่จัดกิจกรรม <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  required
                  value={formData.event_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                  className="text-xs h-9 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">วันสิ้นสุดกิจกรรม (ถ้ามี)</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="text-xs h-9 rounded-xl"
                />
              </div>
            </div>

            {/* Time Range & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">เวลาเริ่มต้น (เช่น 09:00 น.)</Label>
                <ThaiTimeInput
                  value={formData.start_time || ''}
                  onChange={(v) => setFormData(prev => ({ ...prev, start_time: v }))}
                  placeholder="--:--"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">เวลาสิ้นสุด (เช่น 12:00 น.)</Label>
                <ThaiTimeInput
                  value={formData.end_time || ''}
                  onChange={(v) => setFormData(prev => ({ ...prev, end_time: v }))}
                  placeholder="--:--"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">สถานที่</Label>
                <Input
                  type="text"
                  placeholder="เช่น ห้องประชุมชั้น 3"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="text-xs h-9 rounded-xl"
                />
              </div>
            </div>

            {/* Target Audience Group */}
            <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/40 space-y-3">
              <Label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>กลุ่มเป้าหมายผู้รับข่าวสาร <span className="text-red-500">*</span></span>
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] text-gray-600">ขอบเขตเป้าหมาย</span>
                  <select
                    value={formData.target_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_type: e.target.value }))}
                    className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-xl text-gray-700 font-medium focus:outline-none focus:border-purple-500"
                  >
                    {TARGET_TYPES.filter(t => {
                      if (!isAdmin && (t.value === 'all' || t.value === 'faculty')) return false;
                      return true;
                    }).map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Conditional Department Select (for Admin) */}
                {(formData.target_type === 'department' || formData.target_type === 'department_year') && (
                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-600">สาขาวิชา</span>
                    {isAdmin ? (
                      <select
                        value={formData.department_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))}
                        className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-xl text-gray-700 font-medium focus:outline-none focus:border-purple-500"
                      >
                        <option value="">-- เลือกสาขาวิชา --</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.department_name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="h-9 px-3 text-xs bg-white border border-purple-200 rounded-xl text-purple-800 font-medium flex items-center">
                        สาขาวิชาของคุณ ({user?.profile?.department?.department_name || 'สาขาวิชาต้นสังกัด'})
                      </div>
                    )}
                  </div>
                )}

                {/* Conditional Year Level Select */}
                {(formData.target_type === 'year' || formData.target_type === 'department_year') && (
                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-600">เฉพาะชั้นปี</span>
                    <select
                      value={formData.year_level}
                      onChange={(e) => setFormData(prev => ({ ...prev, year_level: e.target.value }))}
                      className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-xl text-gray-700 font-medium focus:outline-none focus:border-purple-500"
                    >
                      <option value="">-- ทุกชั้นปีในขอบเขตนี้ --</option>
                      <option value="1">ชั้นปีที่ 1</option>
                      <option value="2">ชั้นปีที่ 2</option>
                      <option value="3">ชั้นปีที่ 3</option>
                      <option value="4">ชั้นปีที่ 4</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">รายละเอียด</Label>
              <textarea
                rows={4}
                placeholder="รายละเอียดเนื้อหา ข้อกำหนด หรือสิ่งที่ต้องเตรียมมา..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-purple-500 font-sans"
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2 border border-gray-100 rounded-xl p-3 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                  <span>รูปภาพหน้าปก / แบนเนอร์</span>
                </Label>
                {formData.image_url && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                    className="text-[11px] text-red-600 hover:underline"
                  >
                    ลบรูปภาพ
                  </button>
                )}
              </div>

              {formData.image_url ? (
                <div className="relative h-28 w-full rounded-lg overflow-hidden border border-gray-200 bg-white">
                  <img
                    src={formData.image_url.startsWith('http') ? formData.image_url : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${formData.image_url}`}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={imageInputRef}
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                    id="news-image-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingImage}
                    onClick={() => imageInputRef.current?.click()}
                    className="text-xs rounded-xl"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    <span>{uploadingImage ? 'กำลังอัปโหลด...' : 'เลือกไฟล์รูปภาพ'}</span>
                  </Button>
                  <span className="text-[11px] text-gray-400">JPG, PNG, WebP ขนาดไม่เกิน 10MB</span>
                </div>
              )}
            </div>

            {/* Attachment Upload */}
            <div className="space-y-2 border border-gray-100 rounded-xl p-3 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ไฟล์เอกสารแนบ</span>
                </Label>
                {formData.attachment_url && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, attachment_url: '', attachment_name: '' }))}
                    className="text-[11px] text-red-600 hover:underline"
                  >
                    ลบเอกสาร
                  </button>
                )}
              </div>

              {formData.attachment_url ? (
                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="font-semibold text-gray-700 truncate">{formData.attachment_name || 'ไฟล์แนบ'}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={attachmentInputRef}
                    onChange={handleAttachmentFileChange}
                    className="hidden"
                    id="news-attachment-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingAttachment}
                    onClick={() => attachmentInputRef.current?.click()}
                    className="text-xs rounded-xl"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    <span>{uploadingAttachment ? 'กำลังอัปโหลด...' : 'เลือกไฟล์แนบ'}</span>
                  </Button>
                  <span className="text-[11px] text-gray-400">PDF, DOC, DOCX ขนาดไม่เกิน 25MB</span>
                </div>
              )}
            </div>

            {/* Switches: Pin and Publish */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_pinned}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_pinned: e.target.checked }))}
                  className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-gray-800 flex items-center gap-1">
                    <Pin className="w-3 h-3 text-amber-500 fill-amber-500 rotate-45" />
                    ปักหมุดไว้บนสุด
                  </span>
                  <p className="text-[10px] text-gray-400">แสดงผลเด่นที่ด้านบนสุดของรายการ</p>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                  className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-gray-800 flex items-center gap-1">
                    <Eye className="w-3 h-3 text-emerald-600" />
                    เผยแพร่ทันที
                  </span>
                  <p className="text-[10px] text-gray-400">นักศึกษาและอาจารย์จะมองเห็นรายการนี้</p>
                </div>
              </label>
            </div>

            {isAdmin && !formId && (
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmailAfterCreate}
                  onChange={(e) => setSendEmailAfterCreate(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-purple-900 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-purple-600" />
                    ส่ง Email แจ้งเตือนหลังสร้างกิจกรรม
                  </span>
                  <p className="text-[10px] text-purple-600/80">ระบบจะเปิดหน้าต่างยืนยันและส่งอีเมลแจ้งเตือนไปยังกลุ่มผู้รับที่เกี่ยวข้องทันที</p>
                </div>
              </label>
            )}

            <DialogFooter className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddEditOpen(false)}
                disabled={formSubmitting}
                className="text-xs rounded-xl"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={formSubmitting}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-xl"
              >
                {formSubmitting ? 'กำลังบันทึก...' : formId ? 'บันทึกการแก้ไข' : 'สร้างรายการ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* Delete Confirmation Modal */}
      {/* ========================================================================= */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>ยืนยันการลบข้อมูล</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              คุณแน่ใจหรือไม่ว่าต้องการลบข่าวสาร/กิจกรรมนี้? การดำเนินการนี้ไม่สามารถยกเลิกได้
            </DialogDescription>
          </DialogHeader>

          {itemToDelete && (
            <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl text-xs space-y-1">
              <div className="font-bold text-gray-800">{itemToDelete.title}</div>
              <div className="text-gray-500">วันที่: {formatThaiDate(itemToDelete.event_date)}</div>
            </div>
          )}

          <DialogFooter className="pt-3 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteOpen(false)}
              className="text-xs rounded-xl"
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              className="text-xs rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              ยืนยันการลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* Email Notification Modal */}
      {/* ========================================================================= */}
      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-6">
          <DialogHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <span>ส่ง Email แจ้งเตือนกิจกรรม</span>
              </DialogTitle>

              {/* Tabs */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setEmailActiveTab('send')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    emailActiveTab === 'send'
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ส่งแจ้งเตือน</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEmailActiveTab('history')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    emailActiveTab === 'history'
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>ประวัติการส่ง</span>
                </button>
              </div>
            </div>

            {emailEvent && (
              <DialogDescription className="text-xs text-gray-500 pt-1 flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-purple-900">{emailEvent.title}</span>
                <span className="text-gray-300">•</span>
                <span>📅 {formatThaiDate(emailEvent.event_date)}</span>
                <span className="text-gray-300">•</span>
                <span>⏰ {emailStartTime ? `${emailStartTime}${emailEndTime ? ` - ${emailEndTime}` : ''} น.` : 'ไม่ระบุเวลา'}</span>
                <span className="text-gray-300">•</span>
                <span>📍 {emailLocation || 'ไม่ระบุสถานที่'}</span>
              </DialogDescription>
            )}
          </DialogHeader>

          {emailActiveTab === 'send' ? (
            <div className="space-y-4 pt-3">
              {/* Audience Selection Section */}
              <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-100/80 space-y-3">
                <Label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  <span>เลือกกลุ่มผู้รับอีเมล</span>
                </Label>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Group Type */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-gray-600">กลุ่มเป้าหมาย</span>
                    <select
                      value={emailTargetType}
                      onChange={(e) => setEmailTargetType(e.target.value)}
                      className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-xl text-gray-700 font-medium focus:outline-none focus:border-purple-500"
                    >
                      {EMAIL_TARGET_GROUPS.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Faculty Selector */}
                  {emailTargetType === 'faculty' && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-gray-600">คณะ</span>
                      <select
                        value={emailFacultyId}
                        onChange={(e) => setEmailFacultyId(e.target.value)}
                        className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-xl text-gray-700 font-medium focus:outline-none focus:border-purple-500"
                      >
                        <option value="">-- เลือกคณะ --</option>
                        {faculties.map(f => (
                          <option key={f.id} value={f.id}>{f.faculty_name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Department Selector */}
                  {(emailTargetType === 'department' || emailTargetType === 'department_year') && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-gray-600">สาขาวิชา</span>
                      <select
                        value={emailDepartmentId}
                        onChange={(e) => setEmailDepartmentId(e.target.value)}
                        className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-xl text-gray-700 font-medium focus:outline-none focus:border-purple-500"
                      >
                        <option value="">-- เลือกสาขาวิชา --</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.department_name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Year Level Selector */}
                  {(emailTargetType === 'year' || emailTargetType === 'department_year') && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-gray-600">ชั้นปี</span>
                      <select
                        value={emailYearLevel}
                        onChange={(e) => setEmailYearLevel(e.target.value)}
                        className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-xl text-gray-700 font-medium focus:outline-none focus:border-purple-500"
                      >
                        <option value="">-- ทุกชั้นปี --</option>
                        <option value="1">ชั้นปีที่ 1</option>
                        <option value="2">ชั้นปีที่ 2</option>
                        <option value="3">ชั้นปีที่ 3</option>
                        <option value="4">ชั้นปีที่ 4</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Event Time & Location to display in Email */}
              <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/80 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ข้อมูลเวลาและสถานที่จัดกิจกรรม (ที่จะระบุในเนื้อหาอีเมล)</span>
                  </Label>
                  <span className="text-[10px] text-indigo-600 font-medium bg-indigo-100/70 px-2 py-0.5 rounded-full">
                    สามารถระบุหรือแก้ไขก่อนกดส่งได้
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-500" />
                      <span>เวลาเริ่มต้น (เช่น 09:00 น.)</span>
                    </Label>
                    <ThaiTimeInput
                      value={emailStartTime}
                      onChange={setEmailStartTime}
                      placeholder="--:--"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-500" />
                      <span>เวลาสิ้นสุด (เช่น 12:00 น.)</span>
                    </Label>
                    <ThaiTimeInput
                      value={emailEndTime}
                      onChange={setEmailEndTime}
                      placeholder="--:--"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-500" />
                      <span>สถานที่จัดกิจกรรม</span>
                    </Label>
                    <Input
                      type="text"
                      placeholder="เช่น ห้องประชุม 1 อาคาร 3"
                      value={emailLocation}
                      onChange={(e) => setEmailLocation(e.target.value)}
                      className="h-9 text-xs rounded-xl bg-white border-gray-200"
                    />
                  </div>
                </div>

                {/* Email Display Preview Bar */}
                <div className="pt-2 border-t border-indigo-100/60 flex items-center justify-between text-xs flex-wrap gap-2 text-gray-600">
                  <div className="flex items-center gap-3 flex-wrap text-[11px]">
                    <span className="font-medium text-gray-500">ตัวอย่างข้อมูลที่จะแสดงในกล่องกิจกรรม:</span>
                    <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-indigo-100">
                      📅 {formatThaiDate(emailEvent?.event_date)}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-indigo-100 font-semibold text-indigo-700">
                      ⏰ {emailStartTime ? `${emailStartTime}${emailEndTime ? ` - ${emailEndTime}` : ''} น.` : 'ไม่ระบุเวลา'}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-indigo-100 font-semibold text-purple-700">
                      📍 {emailLocation || 'ไม่ระบุสถานที่'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recipient Statistics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/70 text-center">
                  <div className="text-[11px] text-gray-500 font-medium">ผู้รับทั้งหมด</div>
                  <div className="text-lg font-bold text-gray-800 mt-0.5">
                    {loadingRecipients ? '...' : (emailSummary?.total ?? 0)}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 text-center">
                  <div className="text-[11px] text-emerald-700 font-medium">พร้อมส่งรอบนี้</div>
                  <div className="text-lg font-bold text-emerald-700 mt-0.5">
                    {loadingRecipients ? '...' : (emailForceResend ? (emailSummary?.hasEmail ?? 0) : (emailSummary?.readyToSend ?? 0))}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/50 text-center">
                  <div className="text-[11px] text-amber-700 font-medium">เคยส่งสำเร็จแล้ว</div>
                  <div className="text-lg font-bold text-amber-700 mt-0.5">
                    {loadingRecipients ? '...' : (emailSummary?.alreadySent ?? 0)}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-rose-100 bg-rose-50/50 text-center">
                  <div className="text-[11px] text-rose-700 font-medium">ไม่มีอีเมล</div>
                  <div className="text-lg font-bold text-rose-700 mt-0.5">
                    {loadingRecipients ? '...' : (emailSummary?.missingEmail ?? 0)}
                  </div>
                </div>
              </div>

              {/* Duplicate Prevention & Options */}
              <div className="space-y-2">
                {emailSummary?.alreadySent > 0 && !emailForceResend && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">ระบบป้องกันการส่งซ้ำ:</span> มีผู้รับจำนวน {emailSummary.alreadySent} คนที่เคยได้รับอีเมลสำหรับกิจกรรมนี้แล้ว ระบบจะข้ามเพื่อไม่ให้รบกวนผู้ใช้
                    </div>
                  </div>
                )}

                {emailSummary?.missingEmail > 0 && (
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">หมายเหตุ:</span> ผู้รับ {emailSummary.missingEmail} คนไม่มีข้อมูลอีเมลในระบบ โดยระบบจะบันทึกสถานะเป็น SKIPPED และข้ามการส่งอัตโนมัติ
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailForceResend}
                    onChange={(e) => setEmailForceResend(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-gray-800">ส่งซ้ำอีกครั้ง (Force Resend)</span>
                    <span className="text-gray-500 ml-1">บังคับส่งอีเมลให้ทุกคนที่มีอีเมล รวมถึงคนที่เคยได้รับแล้ว</span>
                  </div>
                </label>
              </div>

              {/* Collapsible Recipient Preview List */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div
                  onClick={() => setShowRecipientList(!showRecipientList)}
                  className="p-3 bg-gray-50/80 flex items-center justify-between cursor-pointer hover:bg-gray-100/70 transition-colors text-xs font-bold text-gray-700"
                >
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    รายชื่อผู้รับ ({emailRecipients.length} คน)
                  </span>
                  <span className="text-[11px] text-purple-600 hover:underline">
                    {showRecipientList ? 'ย่อรายชื่อ ▲' : 'ดูรายชื่อทั้งหมด ▼'}
                  </span>
                </div>

                {showRecipientList && (
                  <div className="max-h-56 overflow-y-auto border-t border-gray-100">
                    {emailRecipients.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-400">
                        ไม่พบผู้รับในเงื่อนไขที่เลือก
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50/50 text-[11px] text-gray-500 border-b border-gray-100 sticky top-0">
                          <tr>
                            <th className="p-2.5 pl-3">ชื่อ-นามสกุล / รหัส</th>
                            <th className="p-2.5">สาขา / ชั้นปี</th>
                            <th className="p-2.5">อีเมล</th>
                            <th className="p-2.5 pr-3 text-right">สถานะ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-[11px]">
                          {emailRecipients.map((r, i) => (
                            <tr key={i} className="hover:bg-purple-50/20">
                              <td className="p-2.5 pl-3">
                                <div className="font-semibold text-gray-800">{r.name}</div>
                                <div className="text-[10px] text-gray-400">{r.username} ({r.role})</div>
                              </td>
                              <td className="p-2.5 text-gray-600">
                                <div>{r.departmentName || '-'}</div>
                                {r.year && <div className="text-[10px] text-purple-600">ปี {r.year}</div>}
                              </td>
                              <td className="p-2.5 font-mono text-[11px] text-gray-600">
                                {r.email || <span className="text-red-400 italic">ไม่มีอีเมล</span>}
                              </td>
                              <td className="p-2.5 pr-3 text-right">
                                {!r.hasEmail ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500">
                                    ไม่มีอีเมล
                                  </span>
                                ) : r.alreadySent && !emailForceResend ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    เคยส่งแล้ว
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    พร้อมส่ง
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>

              {/* Send Result Banner */}
              {sendResult && (
                <div className="p-4 rounded-xl bg-purple-50/80 border border-purple-200 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>ผลการส่งอีเมลแจ้งเตือนล่าสุด</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white p-2 rounded-lg border border-emerald-100">
                      <div className="text-emerald-700 font-bold text-sm">✅ {sendResult.sent}</div>
                      <div className="text-[10px] text-gray-500">ส่งสำเร็จ</div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-rose-100">
                      <div className="text-rose-700 font-bold text-sm">❌ {sendResult.failed}</div>
                      <div className="text-[10px] text-gray-500">ล้มเหลว</div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-gray-100">
                      <div className="text-gray-700 font-bold text-sm">⏭️ {sendResult.skipped}</div>
                      <div className="text-[10px] text-gray-500">ข้าม</div>
                    </div>
                  </div>
                  {sendResult.simulated && (
                    <p className="text-[10px] text-purple-700 bg-purple-100/50 p-2 rounded-lg leading-relaxed">
                      💡 <strong>โหมดจำลอง (Simulated Mode):</strong> ระบบได้จำลองการส่งและบันทึกลง Console สำหรับการทดสอบในเครื่อง สามารถตั้งค่า SMTP หรือ EMAIL_API_KEY ในไฟล์ .env สำหรับการส่งจริงใน Production
                    </p>
                  )}
                </div>
              )}

              {/* Dialog Footer Actions */}
              <DialogFooter className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEmailModalOpen(false)}
                  disabled={sendingEmails}
                  className="text-xs rounded-xl"
                >
                  ปิดหน้าต่าง
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleSendEmails}
                  disabled={
                    sendingEmails ||
                    loadingRecipients ||
                    (emailForceResend ? (emailSummary?.hasEmail === 0) : (emailSummary?.readyToSend === 0))
                  }
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-xl flex items-center gap-1.5"
                >
                  {sendingEmails ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>กำลังส่งอีเมล...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        ส่ง Email แจ้งเตือน ({emailForceResend ? (emailSummary?.hasEmail || 0) : (emailSummary?.readyToSend || 0)} คน)
                      </span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* History Tab */
            <div className="space-y-4 pt-3">
              {/* History Summary */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="text-gray-500 text-[10px]">บันทึกทั้งหมด</div>
                  <div className="text-base font-bold text-gray-800">{emailHistorySummary?.total || 0}</div>
                </div>
                <div className="p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/50">
                  <div className="text-emerald-700 text-[10px]">ส่งสำเร็จ</div>
                  <div className="text-base font-bold text-emerald-700">{emailHistorySummary?.sent || 0}</div>
                </div>
                <div className="p-2.5 rounded-xl border border-rose-100 bg-rose-50/50">
                  <div className="text-rose-700 text-[10px]">ล้มเหลว</div>
                  <div className="text-base font-bold text-rose-700">{emailHistorySummary?.failed || 0}</div>
                </div>
                <div className="p-2.5 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="text-gray-500 text-[10px]">ข้าม</div>
                  <div className="text-base font-bold text-gray-600">{emailHistorySummary?.skipped || 0}</div>
                </div>
              </div>

              {emailHistorySummary?.failed > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <div className="text-xs text-rose-800 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>มีรายการส่งไม่สำเร็จ {emailHistorySummary.failed} รายการ</span>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleRetryFailedEmails}
                    disabled={retryingFailed}
                    className="text-xs h-7 rounded-lg flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${retryingFailed ? 'animate-spin' : ''}`} />
                    <span>{retryingFailed ? 'กำลังส่งใหม่...' : 'ส่งใหม่อีกครั้ง'}</span>
                  </Button>
                </div>
              )}

              {/* Logs Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {loadingHistory ? (
                  <div className="p-8 text-center text-xs text-gray-400">
                    <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    กำลังโหลดประวัติ...
                  </div>
                ) : emailHistoryLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400">
                    ยังไม่มีประวัติการส่งอีเมลสำหรับกิจกรรมนี้
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-[11px] text-gray-500 border-b border-gray-100 sticky top-0">
                        <tr>
                          <th className="p-2.5 pl-3">ผู้รับ</th>
                          <th className="p-2.5">อีเมล</th>
                          <th className="p-2.5">วันที่-เวลา</th>
                          <th className="p-2.5">สถานะ</th>
                          <th className="p-2.5 pr-3">รายละเอียด / Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-[11px]">
                        {emailHistoryLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-purple-50/20">
                            <td className="p-2.5 pl-3">
                              <div className="font-semibold text-gray-800">{log.recipient_name || '-'}</div>
                              <div className="text-[10px] text-gray-400">{log.user?.username || ''} ({log.recipient_role || '-'})</div>
                            </td>
                            <td className="p-2.5 font-mono text-[10px] text-gray-600">
                              {log.recipient_email}
                            </td>
                            <td className="p-2.5 text-gray-500 text-[10px] whitespace-nowrap">
                              {log.sent_at ? new Date(log.sent_at).toLocaleString('th-TH') : new Date(log.created_at).toLocaleString('th-TH')}
                            </td>
                            <td className="p-2.5">
                              {log.status === 'SENT' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  SENT
                                </span>
                              )}
                              {log.status === 'FAILED' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  FAILED
                                </span>
                              )}
                              {log.status === 'SKIPPED' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                                  SKIPPED
                                </span>
                              )}
                              {log.status === 'PENDING' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                                  PENDING
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 pr-3 text-[10px] text-gray-500 max-w-xs truncate">
                              {log.error_message ? (
                                <span className="text-rose-600">{log.error_message}</span>
                              ) : log.status === 'SENT' ? (
                                <span className="text-emerald-600">สำเร็จ</span>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="text-xs rounded-xl"
                >
                  ปิดหน้าต่าง
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default NewsEvents;
