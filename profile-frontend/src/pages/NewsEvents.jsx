import React, { useState, useEffect, useRef } from 'react';
import { newsEventService, uploadService } from '../services';
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
  X
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

const NewsEvents = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  const currentDate = new Date();
  const currentBEYear = currentDate.getFullYear() + 543;

  // Data & Loading States
  const [events, setEvents] = useState([]);
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
    start_time: '',
    end_time: '',
    location: '',
    image_url: '',
    attachment_url: '',
    attachment_name: '',
    is_pinned: false,
    is_published: true
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

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

  // Open Create Dialog
  const handleOpenCreate = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormId(null);
    setFormData({
      title: '',
      type: 'ประกาศ',
      description: '',
      event_date: today,
      start_time: '',
      end_time: '',
      location: '',
      image_url: '',
      attachment_url: '',
      attachment_name: '',
      is_pinned: false,
      is_published: true
    });
    setIsAddEditOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (item) => {
    setFormId(item.id);
    const dateStr = item.event_date ? new Date(item.event_date).toISOString().split('T')[0] : '';
    setFormData({
      title: item.title || '',
      type: item.type || 'ประกาศ',
      description: item.description || '',
      event_date: dateStr,
      start_time: item.start_time || '',
      end_time: item.end_time || '',
      location: item.location || '',
      image_url: item.image_url || '',
      attachment_url: item.attachment_url || '',
      attachment_name: item.attachment_name || '',
      is_pinned: Boolean(item.is_pinned),
      is_published: Boolean(item.is_published)
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

          {isAdmin && (
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
          {isAdmin && (
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
                        {formatThaiDate(item.event_date)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {/* Top Row: Date Badge (if no cover) + Type + Pin + Unpublished Badge */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {!item.image_url && (
                          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex flex-col items-center justify-center text-purple-900 shrink-0 font-bold">
                            <span className="text-sm leading-none">{dateParts.day}</span>
                            <span className="text-[9px] text-purple-600 leading-tight mt-0.5">{dateParts.month}</span>
                          </div>
                        )}
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${typeStyle}`}>
                          {item.type}
                        </span>
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

                    {/* Admin Actions Bar */}
                    {isAdmin && (
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
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedEvent(item)}
                      className="hover:bg-purple-50/20 cursor-pointer transition-colors"
                    >
                      <td className="p-3.5 pl-5 font-semibold text-gray-800 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {item.is_pinned && <Pin className="w-3 h-3 text-amber-600 fill-amber-500 rotate-45 shrink-0" />}
                          <span>{formatThaiDate(item.event_date)}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-gray-900 line-clamp-1 max-w-sm">
                          {item.title}
                        </div>
                        {item.description && (
                          <div className="text-[11px] text-gray-400 line-clamp-1 max-w-sm">
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
                    <span className="font-semibold">{formatThaiDate(selectedEvent.event_date)}</span>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedEvent(null)}
                className="text-xs"
              >
                ปิดหน้าต่าง
              </Button>
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

            {/* Type & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">เวลาเริ่มต้น (เช่น 09:00)</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  className="text-xs h-9 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">เวลาสิ้นสุด (เช่น 12:00)</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                  className="text-xs h-9 rounded-xl"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">สถานที่</Label>
              <Input
                type="text"
                placeholder="เช่น ห้องประชุมชั้น 3 อาคาร 1 หรือ ห้องปฏิบัติการคอมพิวเตอร์"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="text-xs h-9 rounded-xl"
              />
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
    </div>
  );
};

export default NewsEvents;
