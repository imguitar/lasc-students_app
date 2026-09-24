import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Save,
  UserRound,
} from 'lucide-react';
import lascLogo from '../../assets/LASC-SSKRU-1.png';
import api from '../../api/axios';

const companyQuestions = [
  { id: 'c1', label: '1.1 ความเข้าใจในแนวคิดของการฝึกงานและสหกิจศึกษา - ผู้บริหาร' },
  { id: 'c2', label: '1.2 ความเข้าใจในแนวคิดของการฝึกงานและสหกิจศึกษา - เจ้าหน้าที่ฝ่ายบุคคล' },
  { id: 'c3', label: '1.3 ความเข้าใจในแนวคิดของการฝึกงานและสหกิจศึกษา - พนักงานที่ปรึกษา (Job Supervisor)' },
  { id: 'c4', label: '2.1 ปริมาณงานมีความเหมาะสม' },
  { id: 'c5', label: '2.2 คุณภาพงานตรงตามลักษณะของสาขาวิชาชีพ' },
  { id: 'c6', label: '2.3 ลักษณะงานมีความปลอดภัย ไม่เสี่ยงหรือก่อให้เกิดอันตราย' },
  { id: 'c7', label: '3.1 การประสานงานภายในสถานประกอบการระหว่างฝ่ายบุคคล และ Job Supervisor เป็นไปอย่างมีประสิทธิภาพ' },
  { id: 'c8', label: '3.2 ฝ่ายบุคคล/ผู้ที่เกี่ยวข้อง มีการปฐมนิเทศ แนะนำกฎระเบียบต่างๆ ขององค์กรให้นักศึกษาทราบ' },
  { id: 'c9', label: '3.3 มี Job Supervisor ดูแลนักศึกษาภายในสัปดาห์แรกที่เข้างาน' },
  { id: 'c10', label: '3.4 Job Supervisor มีความรู้ และประสบการณ์ ตรงกับสาขาวิชาชีพของนักศึกษา' },
  { id: 'c11', label: '3.5 Job Supervisor มีเวลาให้แก่นักศึกษาด้านการปฏิบัติงาน' },
  { id: 'c12', label: '3.6 Job Supervisor มอบหมายงาน สอนงาน และให้คำปรึกษาอย่างเหมาะสม' },
  { id: 'c13', label: '3.7 มีการจัดทำแผนการทำงานตลอดระยะเวลาของการปฏิบัติงาน' },
  { id: 'c14', label: '3.8 มีค่าตอบแทนให้นักศึกษาอย่างเหมาะสม' },
  { id: 'c15', label: '3.9 จัดสวัสดิการ (ที่พัก อาหาร รถรับส่ง ฯลฯ) ให้นักศึกษาอย่างเหมาะสม' },
  { id: 'c16', label: '3.10 มีความพร้อมด้านอุปกรณ์ หรือเครื่องมือสำหรับให้นักศึกษาปฏิบัติงาน' },
  { id: 'c17', label: '3.11 ให้ความสำคัญต่อการประเมินผลการปฏิบัติงาน และรายงานของนักศึกษา' },
];

const studentQuestions = [
  { id: 's1', label: '1.1 มีความรับผิดชอบต่องานที่ได้รับมอบหมาย' },
  { id: 's2', label: '1.2 ปฏิบัติงานด้วยความกระตือรือร้น' },
  { id: 's3', label: '1.3 มีการปรับปรุงคุณภาพงานที่ปฏิบัติอยู่เสมอ' },
  { id: 's4', label: '1.4 ใช้เวลาในการทำงานให้เกิดประโยชน์สูงสุด' },
  { id: 's5', label: '1.5 มีการรายงานผลการปฏิบัติงาน' },
  { id: 's6', label: '2.1 ปฏิบัติงานโดยใช้ความรู้ ความสามารถที่มีอยู่อย่างเต็มที่' },
  { id: 's7', label: '2.2 มีความสามารถในการประยุกต์ใช้ความรู้' },
  { id: 's8', label: '2.3 มีความชำนาญในด้านปฏิบัติการ' },
  { id: 's9', label: '2.4 มีความสามารถในการวางแผน จัดลำดับความสำคัญของงาน' },
  { id: 's10', label: '2.5 ใฝ่รู้ สนใจศึกษาหาความรู้ใหม่ๆ เพิ่มเติม' },
  { id: 's11', label: '3.1 ปฏิบัติตามกฎ ระเบียบหรือข้อบังคับขององค์กรโดยเคร่งครัด' },
  { id: 's12', label: '3.2 เข้างานตรงเวลา ไม่เคยขาด ไม่เคยสาย' },
  { id: 's13', label: '3.3 ให้ความเคารพเชื่อฟังผู้บังคับบัญชา' },
  { id: 's14', label: '3.4 มีความขยัน อดทน สู้งาน' },
  { id: 's15', label: '3.5 มีคุณธรรม จริยธรรม เช่น ซื่อสัตย์ สุจริต รักษาความลับองค์กร' },
  { id: 's16', label: '3.6 มีความคิดริเริ่ม สร้างสรรค์' },
  { id: 's17', label: '3.7 มีความมั่นใจในตนเอง กล้าสอบถาม และเสนอความคิดเห็น' },
  { id: 's18', label: '3.8 มีบุคลิกภาพ และวางตัวเหมาะสม เช่น การแต่งกาย กิริยาวาจา วุฒิภาวะ' },
  { id: 's19', label: '3.9 มีความสามารถในการทำงานเป็นทีมร่วมกับผู้อื่น' },
  { id: 's20', label: '3.10 ใช้ทรัพยากรขององค์กรอย่างรู้คุณค่า เช่น ไฟฟ้า วัสดุสิ้นเปลืองต่างๆ' },
];

const SCORE_OPTIONS = [
  { value: '5', label: 'มากที่สุด' },
  { value: '4', label: 'มาก' },
  { value: '3', label: 'ปานกลาง' },
  { value: '2', label: 'น้อย' },
  { value: '1', label: 'น้อยที่สุด' },
  { value: '-', label: 'ไม่มีความเห็น' },
];

const ScorePicker = ({ name, value, onSelect, accent, disabled }) => (
  <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
    {SCORE_OPTIONS.map((opt) => {
      const active = String(value ?? '') === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          title={opt.label}
          disabled={disabled}
          onClick={() => onSelect(name, opt.value)}
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-sm transition-all duration-200 border ${disabled ? 'cursor-default' : 'cursor-pointer'} ${
            active
              ? accent === 'emerald'
                ? 'bg-emerald-600 border-emerald-600 text-white font-semibold shadow-sm'
                : 'bg-violet-600 border-violet-600 text-white font-semibold shadow-sm'
              : 'bg-white border-slate-200 text-slate-600 font-medium hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600'
          }`}
        >
          {opt.value === '-' ? '–' : opt.value}
        </button>
      );
    })}
  </div>
);

// แถวคำถาม: จอกว้าง = คำถามซ้าย + คะแนนขวาแถวเดียว, จอแคบ = คำถามบน คะแนนล่างชิดขวา
const QuestionRow = ({ q, value, onSelect, accent, disabled }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6 py-3.5 px-4 sm:px-6 transition-colors hover:bg-violet-50/40">
    <p className="text-sm sm:text-base font-normal text-slate-700 leading-relaxed m-0 sm:flex-1 min-w-0 sm:pr-2">
      {q.label}
    </p>
    <div className="flex justify-end sm:justify-start pt-1 sm:pt-0">
      <ScorePicker name={q.id} value={value} onSelect={onSelect} accent={accent} disabled={disabled} />
    </div>
  </div>
);

const AdvisorEvaluationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [requestData, setRequestData] = useState(null);

  const [formData, setFormData] = useState({
    advisorName: '',
    c1: '', c2: '', c3: '', c4: '', c5: '', c6: '', c7: '', c8: '', c9: '', c10: '', c11: '', c12: '', c13: '', c14: '', c15: '', c16: '', c17: '',
    companyComments: '',
    s1: '', s2: '', s3: '', s4: '', s5: '', s6: '', s7: '', s8: '', s9: '', s10: '', s11: '', s12: '', s13: '', s14: '', s15: '', s16: '', s17: '', s18: '', s19: '', s20: '',
    studentComments: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          navigate('/login');
          return;
        }
        const user = JSON.parse(userStr);
        if (user.role !== 'advisor') {
          navigate('/dashboard');
          return;
        }
        const advName = user.name || user.full_name || 'อาจารย์ที่ปรึกษา';

        const reqRes = await api.get(`/requests/${id}`);
        if (!reqRes.data.data) {
          setError('ไม่พบข้อมูลคำร้อง');
          return;
        }
        setRequestData(reqRes.data.data);

        const evalRes = await api.get(`/advisor-evaluations/request/${id}`);
        if (evalRes.data.data) {
          const d = evalRes.data.data;
          // คะแนนที่บันทึกแล้วตอบครบทุกข้อเสมอ — null ในคอลัมน์คะแนนหมายถึงเลือก "ไม่มีความเห็น" (-)
          const loadScore = (v) => (v === null || v === undefined ? '-' : String(v));
          setFormData({
            advisorName: d.advisorName || advName,
            c1: loadScore(d.c1), c2: loadScore(d.c2), c3: loadScore(d.c3), c4: loadScore(d.c4), c5: loadScore(d.c5), c6: loadScore(d.c6), c7: loadScore(d.c7), c8: loadScore(d.c8), c9: loadScore(d.c9), c10: loadScore(d.c10), c11: loadScore(d.c11), c12: loadScore(d.c12), c13: loadScore(d.c13), c14: loadScore(d.c14), c15: loadScore(d.c15), c16: loadScore(d.c16), c17: loadScore(d.c17),
            companyComments: d.companyComments || '',
            s1: loadScore(d.s1), s2: loadScore(d.s2), s3: loadScore(d.s3), s4: loadScore(d.s4), s5: loadScore(d.s5), s6: loadScore(d.s6), s7: loadScore(d.s7), s8: loadScore(d.s8), s9: loadScore(d.s9), s10: loadScore(d.s10), s11: loadScore(d.s11), s12: loadScore(d.s12), s13: loadScore(d.s13), s14: loadScore(d.s14), s15: loadScore(d.s15), s16: loadScore(d.s16), s17: loadScore(d.s17), s18: loadScore(d.s18), s19: loadScore(d.s19), s20: loadScore(d.s20),
            studentComments: d.studentComments || ''
          });
          setIsCompleted(true);
        } else {
          setFormData(prev => ({ ...prev, advisorName: advName }));
        }
      } catch (err) {
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const handleChange = (e) => {
    if (isCompleted) return;
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const selectScore = (name, value) => {
    if (isCompleted) return;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formError) setFormError('');
  };

  const allScoreKeys = [...companyQuestions, ...studentQuestions].map((q) => q.id);
  const answeredCount = allScoreKeys.filter((k) => formData[k] !== '' && formData[k] !== null).length;
  const totalQuestions = allScoreKeys.length;
  const progressPct = Math.round((answeredCount / totalQuestions) * 100);

  const sumScores = (questions) => questions.reduce((sum, q) => {
    const n = Number(formData[q.id]);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  const companyTotal = sumScores(companyQuestions);
  const studentTotal = sumScores(studentQuestions);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isCompleted) return;
    if (!formData.advisorName.trim()) {
      setFormError('กรุณาระบุชื่อผู้ประเมิน/อาจารย์นิเทศ');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const remaining = totalQuestions - answeredCount;
    if (remaining > 0) {
      setFormError(`กรุณาให้คะแนนครบทุกข้อ (เหลืออีก ${remaining} ข้อ) — หากไม่มีความเห็นให้เลือก "–"`);
      return;
    }

    const confirmed = await window.showMuiConfirm(
      'ยืนยันบันทึกผลการนิเทศ? ระบบจะส่งอีเมลแบบประเมินไปยังสถานประกอบการทันที',
      { title: 'ยืนยันการบันทึกผลนิเทศ', confirmText: 'บันทึกผลการนิเทศ', cancelText: 'ยกเลิก', tone: 'primary' }
    );
    if (!confirmed) return;

    setSubmitting(true);
    setFormError('');

    const payload = { ...formData };
    Object.keys(payload).forEach(key => {
      if ((key.startsWith('c') || key.startsWith('s')) && key !== 'companyComments' && key !== 'studentComments') {
        if (payload[key] === '-') {
          payload[key] = null;
        } else if (payload[key] !== '' && payload[key] !== null) {
          payload[key] = parseInt(payload[key], 10);
        } else {
          payload[key] = null;
        }
      }
    });

    try {
      await api.post(`/advisor-evaluations/request/${id}`, payload);
      navigate('/advisor-dashboard/supervision');
    } catch (err) {
      setFormError(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin stroke-[2.2]" />
        <p className="text-xs font-medium text-slate-400">กำลังโหลดแบบฟอร์มนิเทศ...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-rose-100 p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-rose-500" />
          </div>
          <h2 className="text-base font-bold text-slate-800 m-0 mb-1">โหลดข้อมูลไม่สำเร็จ</h2>
          <p className="text-xs text-slate-500 m-0 mb-5">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/advisor-dashboard/supervision')}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition cursor-pointer border-none"
          >
            กลับไปหน้านิเทศ
          </button>
        </div>
      </div>
    );
  }

  const infoFields = [
    { label: 'ชื่อสถานประกอบการ', value: requestData?.companyName || requestData?.company || '-' },
    { label: 'ชื่อนักศึกษา', value: requestData?.studentName || '-' },
    { label: 'สาขาวิชา', value: requestData?.department || '-' },
  ];

  return (
    <div className="min-h-screen bg-slate-50/80 pb-28">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/advisor-dashboard/supervision')}
            className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-500 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 transition cursor-pointer"
            aria-label="ย้อนกลับ"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Link to="/" className="flex items-center shrink-0" aria-label="LASC Home">
            <img src={lascLogo} alt="LASC Logo" style={{ height: '34px', width: 'auto', objectFit: 'contain' }} />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">ตอบแล้ว</span>
            <span className="text-xs font-bold text-violet-700 bg-violet-50 border border-violet-100 rounded-full px-2.5 py-1">
              {answeredCount}/{totalQuestions}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {/* Title */}
        <div className="flex items-start gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center shrink-0 shadow-[0_8px_20px_rgba(124,58,237,0.3)]">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 m-0 tracking-tight">
              แบบบันทึกการนิเทศการฝึกงานและสหกิจศึกษา
            </h1>
            <p className="text-xs text-slate-400 mt-1 m-0">สำหรับอาจารย์นิเทศ</p>
          </div>
        </div>

        {isCompleted && (
          <div className="mb-5 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3.5 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-700 font-medium m-0 leading-relaxed">
              บันทึกผลการนิเทศเรียบร้อยแล้ว — ดูได้อย่างเดียว ไม่สามารถแก้ไขคะแนนหรือเปลี่ยนนัดหมายได้อีก
            </p>
          </div>
        )}

        {isCompleted && (
          <div className="mb-5 rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 p-5 sm:p-6 text-white shadow-lg shadow-violet-500/25">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[11px] font-semibold text-violet-200 m-0 mb-1">คะแนนรวมทั้งหมด</p>
                <p className="text-3xl font-extrabold m-0 tracking-tight">
                  {companyTotal + studentTotal}
                  <span className="text-sm font-semibold text-violet-200"> / 185</span>
                </p>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-[10px] font-semibold text-violet-200 m-0 mb-0.5">สถานประกอบการ</p>
                  <p className="text-lg font-bold m-0">{companyTotal}<span className="text-xs font-semibold text-violet-300">/85</span></p>
                </div>
                <div className="w-px bg-white/20" />
                <div className="text-center">
                  <p className="text-[10px] font-semibold text-violet-200 m-0 mb-0.5">นักศึกษา</p>
                  <p className="text-lg font-bold m-0">{studentTotal}<span className="text-xs font-semibold text-violet-300">/100</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6 mb-4">
          <h2 className="text-sm font-bold text-slate-800 m-0 mb-4">ข้อมูลการนิเทศ</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {infoFields.map((f) => (
              <div key={f.label} className="rounded-2xl bg-slate-50/70 border border-slate-100 px-4 py-3">
                <div className="text-[10px] font-medium text-slate-400 mb-0.5">{f.label}</div>
                <div className="text-xs font-bold text-slate-800 break-words">{f.value}</div>
              </div>
            ))}
            <div>
              <label className="text-[10px] font-medium text-slate-400 mb-1.5 block px-1">
                ผู้ประเมิน / อาจารย์นิเทศ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="advisorName"
                value={formData.advisorName}
                onChange={handleChange}
                disabled={isCompleted}
                className="w-full box-border h-11 px-3.5 text-xs text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-400 transition"
              />
            </div>
          </div>
        </div>

        {/* Score legend */}
        <div className="bg-violet-50/50 rounded-2xl border border-violet-100/70 px-4 py-3 mb-6 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="text-[11px] font-bold text-violet-700">เกณฑ์คะแนน:</span>
          {SCORE_OPTIONS.map((opt) => (
            <span key={opt.value} className="text-[11px] text-slate-600">
              <span className="font-bold text-violet-700">{opt.value === '-' ? '–' : opt.value}</span> = {opt.label}
            </span>
          ))}
        </div>

        <form id="advisor-eval-form" onSubmit={handleSubmit}>
          {/* Section 1: Company */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-5">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800 m-0">ส่วนที่ 1: คุณภาพสถานประกอบการ</h2>
                <p className="text-[11px] text-slate-400 m-0 mt-0.5">{companyQuestions.length} ข้อ</p>
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {companyQuestions.map((q) => (
                <QuestionRow key={q.id} q={q} value={formData[q.id]} onSelect={selectScore} accent="violet" disabled={isCompleted} />
              ))}
            </div>
            <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/40">
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                ความคิดเห็นเพิ่มเติม (คุณภาพสถานประกอบการ)
              </label>
              <textarea
                name="companyComments"
                value={formData.companyComments}
                onChange={handleChange}
                disabled={isCompleted}
                placeholder="ข้อเสนอแนะหรือความเห็นเพิ่มเติมเกี่ยวกับสถานประกอบการ..."
                className="w-full box-border rounded-xl border border-slate-200 p-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-400 resize-none h-24 text-slate-700 bg-white transition"
              />
            </div>
          </section>

          {/* Section 2: Student */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-5">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <UserRound className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800 m-0">ส่วนที่ 2: คุณภาพนักศึกษา</h2>
                <p className="text-[11px] text-slate-400 m-0 mt-0.5">{studentQuestions.length} ข้อ</p>
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {studentQuestions.map((q) => (
                <QuestionRow key={q.id} q={q} value={formData[q.id]} onSelect={selectScore} accent="emerald" disabled={isCompleted} />
              ))}
            </div>
            <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/40">
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                ความคิดเห็นเพิ่มเติม (สรุปคุณภาพโดยรวมของนักศึกษา)
              </label>
              <textarea
                name="studentComments"
                value={formData.studentComments}
                onChange={handleChange}
                disabled={isCompleted}
                placeholder="สรุปจุดเด่น จุดที่ควรปรับปรุง และความเห็นโดยรวม..."
                className="w-full box-border rounded-xl border border-slate-200 p-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-400 resize-none h-24 text-slate-700 bg-white transition"
              />
            </div>
          </section>

          {formError && (
            <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3.5 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-600 font-medium m-0 leading-relaxed">{formError}</p>
            </div>
          )}
        </form>
      </main>

      {/* Sticky submit bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 min-w-0 flex-1">
              {answeredCount === totalQuestions ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden shrink-0">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              )}
              <span className="text-[11px] font-medium text-slate-400 truncate">
                {answeredCount === totalQuestions
                  ? 'ตอบครบทุกข้อแล้ว พร้อมบันทึก'
                  : `ตอบแล้ว ${answeredCount}/${totalQuestions} ข้อ`}
              </span>
            </div>
            {isCompleted ? (
              <span className="w-full sm:w-auto sm:ml-auto flex items-center justify-center gap-2 px-8 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold">
                <CheckCircle2 className="w-4 h-4" />
                บันทึกผลนิเทศแล้ว
              </span>
            ) : (
              <button
                type="submit"
                form="advisor-eval-form"
                disabled={submitting}
                className="w-full sm:w-auto sm:ml-auto flex items-center justify-center gap-2 px-8 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold shadow-[0_8px_20px_rgba(124,58,237,0.3)] transition cursor-pointer border-none disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {submitting ? 'กำลังบันทึก...' : 'บันทึกผลการนิเทศ'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvisorEvaluationPage;
