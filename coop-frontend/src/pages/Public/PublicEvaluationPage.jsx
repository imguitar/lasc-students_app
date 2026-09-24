import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Eraser,
  GraduationCap,
  Loader2,
  PenLine,
  Send,
  UserRound,
} from 'lucide-react';
import api from '../../api/axios';
import lascLogo from '../../assets/LASC-SSKRU-1.png';

const questions = [
  { id: 'q1', label: '1. ปริมาณงาน (Quantity of Work) ปริมาณงานที่ปฏิบัติสำเร็จตามหน้าที่หรือตามที่ได้รับมอบหมายเมื่อเทียบกับเวลาและข้อตกลง' },
  { id: 'q2', label: '2. คุณภาพงาน (Quality of Work) ทำงานได้ถูกต้องครบถ้วนสมบูรณ์ มีความประณีตเรียบร้อย มีความแม่นยำ ไว้ใจได้' },
  { id: 'q3', label: '3. ความรู้ความสามารถทางวิชาการ นักศึกษามีความรู้ทางวิชาการเพียงพอที่จะปฏิบัติงานได้อย่างมีประสิทธิภาพ' },
  { id: 'q4', label: '4. ความสามารถในการเรียนรู้และประยุกต์วิชาการ ความรวดเร็วในการเรียนรู้ เข้าใจข้อมูล ข่าวสาร และวิธีการทำงาน สามารถนำไปประยุกต์ใช้ได้' },
  { id: 'q5', label: '5. ความรู้ความชำนาญด้านปฏิบัติการ หลังจากพนักงานที่ปรึกษาสอนงานแล้วสามารถปฏิบัติงานได้ มีทักษะและความชำนาญในการปฏิบัติงาน' },
  { id: 'q6', label: '6. วิจารณญาณ การวิเคราะห์ และการตัดสินใจ ตัดสินใจได้ดี ถูกต้อง รวดเร็ว มีการวิเคราะห์ข้อมูลและแก้ปัญหาอย่างมีเหตุผล' },
  { id: 'q7', label: '7. การจัดการและวางแผน นักศึกษามีความสามารถในการจัดการ ลำดับความสำคัญของงาน วางแผนขั้นตอนการทำงานได้ดี' },
  { id: 'q8', label: '8. ทักษะการสื่อสารและการนำเสนอ ความสามารถในการติดต่อสื่อสาร พูด เขียน นำเสนอ (Presentation) ได้อย่างมีประสิทธิภาพ' },
  { id: 'q9', label: '9. การพัฒนาด้านภาษาและวัฒนธรรมต่างประเทศ เช่น ภาษาอังกฤษ การทำงานกับชาวต่างชาติ หรือความตระหนักในความหลากหลายทางวัฒนธรรม' },
  { id: 'q10', label: '10. ความเหมาะสมต่อตำแหน่งงานที่ได้รับมอบหมาย สามารถพัฒนาตนเองให้ปฏิบัติงานตามตำแหน่งที่ได้รับมอบหมายได้อย่างเหมาะสม' },
  { id: 'q11', label: '11. ความรับผิดชอบและเป็นผู้ที่ไว้วางใจได้ ดำเนินงานให้สำเร็จลุล่วงโดยคำนึงถึงเป้าหมาย มีความรับผิดชอบต่องานที่ได้รับมอบหมาย' },
  { id: 'q12', label: '12. ความสนใจ อุตสาหะในการทำงาน มีความสนใจและกระตือรือร้นในการทำงาน มีความอุตสาหะ ไม่ย่อท้อต่ออุปสรรค' },
  { id: 'q13', label: '13. ความคิดริเริ่มในการทำงานและการเสนอความคิดเห็น เมื่อได้รับคำชี้แนะ สามารถเริ่มทำงานได้เอง มีความคิดสร้างสรรค์ นำเสนอแนวคิดใหม่ๆ' },
  { id: 'q14', label: '14. การตอบสนองต่อการสั่งการ ยินดีรับคำสั่ง คำแนะนำ คำวิจารณ์ ไม่แสดงความอึดอัดใจ พร้อมที่จะปรับปรุงตนเอง' },
  { id: 'q15', label: '15. บุคลิกภาพ การวางตัว และการปรับตัวเข้ากับสังคม มีบุคลิกภาพและการวางตัวได้เหมาะสม แต่งกายสุภาพ รู้จักกาลเทศะ' },
  { id: 'q16', label: '16. มนุษยสัมพันธ์ สามารถร่วมงานกับผู้อื่น การทำงานเป็นทีม สร้างมนุษยสัมพันธ์ได้ดีกับเพื่อนร่วมงานและผู้บังคับบัญชา' },
  { id: 'q17', label: '17. ความมั่นใจในตนเอง มีความสามารถแก้ปัญหา รับมือกับปัญหาต่างๆ เผชิญหน้ากับความท้าทายด้วยความมั่นใจ' },
  { id: 'q18', label: '18. ความเป็นผู้นำ มีความสามารถทำให้คนอื่นให้ความร่วมมือ สามารถชักจูง โน้มน้าว ชี้แนะ และเป็นผู้นำที่ดี' },
  { id: 'q19', label: '19. ความมีระเบียบวินัย ปฏิบัติตามวัฒนธรรมขององค์กร ความสนใจเรียนรู้ ศึกษา กฎระเบียบ เข้างานตรงเวลา' },
  { id: 'q20', label: '20. คุณธรรมและจริยธรรม มีความซื่อสัตย์ สุจริต มีจิตใจสะอาด รู้จักเสียสละ ไม่เห็นแก่ตัว เอื้อเฟื้อเผื่อแผ่' },
];

const CATEGORIES = [
  { title: 'หมวดที่ 1: ผลสำเร็จของงาน', desc: 'ปริมาณและคุณภาพของงานที่ปฏิบัติ', range: [0, 2] },
  { title: 'หมวดที่ 2: ความรู้ความสามารถและทักษะการทำงาน', desc: 'ความรู้ ทักษะ การเรียนรู้ และการประยุกต์ใช้', range: [2, 14] },
  { title: 'หมวดที่ 3: ลักษณะส่วนบุคคลและมนุษยสัมพันธ์', desc: 'วินัย ความรับผิดชอบ และการทำงานร่วมกับผู้อื่น', range: [14, 20] },
];

const SCORE_OPTIONS = [
  { value: '5', label: 'ดีมาก' },
  { value: '4', label: 'ดี' },
  { value: '3', label: 'ปานกลาง' },
  { value: '2', label: 'พอใช้' },
  { value: '1', label: 'ต้องปรับปรุง' },
  { value: '-', label: 'ไม่มีความเห็น' },
];

const HIRE_OPTIONS = ['รับ', 'ไม่แน่ใจ', 'ไม่รับ'];
const OVERALL_OPTIONS = [
  { value: 'ยอดเยี่ยม', label: '5 = ยอดเยี่ยม (Outstanding)' },
  { value: 'ดีมาก', label: '4 = ดีมาก (Very good)' },
  { value: 'พอใจ', label: '3 = พอใจ (Satisfactory)' },
  { value: 'คาบเส้น', label: '2 = คาบเส้น (Marginal)' },
  { value: 'ไม่เป็นที่พอใจ', label: '1 = ไม่เป็นที่พอใจ (Unsatisfactory)' },
];
const PROJECT_OPTIONS = [
  { value: 'ใช้', label: 'สถานประกอบการนำผลการปฏิบัติงานไปใช้ประโยชน์ หรือคาดว่าจะนำไปใช้' },
  { value: 'ยังไม่ใช้แต่อาจจะใช้ในอนาคต', label: 'ยังไม่ใช้ประโยชน์ ณ เวลานี้ แต่คาดว่าจะนำไปใช้ในอนาคต' },
  { value: 'ไม่มีประโยชน์', label: 'ผลการปฏิบัติงานไม่มีประโยชน์ต่อสถานประกอบการ' },
];

// ปุ่มคะแนนแบบ pill card — ไฮไลต์ม่วงเมื่อเลือก
const ScorePill = ({ name, value, selected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(name, value)}
    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-sm font-semibold transition-all duration-200 border ${
      selected
        ? 'bg-violet-600 border-violet-600 text-white shadow-sm scale-105'
        : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50'
    }`}
  >
    {value === '-' ? '–' : value}
  </button>
);

const QuestionRow = ({ q, value, onSelect, error }) => (
  <div
    id={`question-${q.id}`}
    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6 py-3.5 px-4 sm:px-6 transition-colors ${
      error ? 'bg-rose-50/60' : 'hover:bg-violet-50/40'
    }`}
  >
    <p className="text-sm sm:text-base font-normal text-slate-700 leading-relaxed m-0 sm:flex-1 min-w-0 sm:pr-2">
      {q.label}
    </p>
    <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 justify-end sm:justify-start pt-1 sm:pt-0">
      {SCORE_OPTIONS.map((opt) => (
        <ScorePill key={opt.value} name={q.id} value={opt.value} selected={String(value ?? '') === opt.value} onSelect={onSelect} />
      ))}
    </div>
  </div>
);

const OptionCard = ({ name, value, label, selected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(name, value)}
    className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
      selected
        ? 'bg-violet-600 border-violet-600 text-white shadow-[0_4px_12px_rgba(124,58,237,0.3)]'
        : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:bg-violet-50/50'
    }`}
  >
    {label}
  </button>
);

const inputCls =
  'w-full box-border h-11 px-3.5 text-sm text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-400 transition placeholder:text-slate-400';
const textareaCls =
  'w-full box-border rounded-xl border border-slate-200 p-3.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-400 resize-none text-slate-700 bg-slate-50/70 focus:bg-white transition';

const PublicEvaluationPage = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [evaluated, setEvaluated] = useState(false);
  const [requestData, setRequestData] = useState(null);
  const [missingQuestions, setMissingQuestions] = useState([]);

  const [formData, setFormData] = useState({
    evaluatorName: '', evaluatorPosition: '', evaluatorDepartment: '',
    q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7: '', q8: '', q9: '', q10: '',
    q11: '', q12: '', q13: '', q14: '', q15: '', q16: '', q17: '', q18: '', q19: '', q20: '',
    strengths: '', improvements: '', hireFuture: '', overallScore: '', projectUsage: '', otherComments: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const sigCanvas = useRef({});
  const [signatureError, setSignatureError] = useState(false);
  const [roundClosedMessage, setRoundClosedMessage] = useState('');

  useEffect(() => {
    api.get(`/public/evaluate/request/${id}`)
      .then((res) => {
        if (res.data.roundClosed) {
          setRoundClosedMessage(res.data.roundMessage || 'ขณะนี้อยู่นอกรอบเวลาการประเมินนักศึกษา (กำหนดโดยผู้ดูแลระบบ)');
        } else if (res.data.evaluated) {
          setEvaluated(true);
        } else if (res.data.data) {
          setRequestData(res.data.data);
        } else {
          setError('ไม่พบข้อมูลคำร้อง');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('ไม่พบข้อมูลคำร้อง หรือลิงก์ไม่ถูกต้อง');
        setLoading(false);
      });
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const selectValue = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setMissingQuestions(prev => prev.filter((qid) => qid !== name));
  };

  const clearSignature = () => {
    sigCanvas.current.clear();
    setSignatureError(false);
  };

  const answeredCount = questions.filter((q) => formData[q.id] !== '').length;
  const progressPct = Math.round((answeredCount / questions.length) * 100);

  // เงื่อนไขวันเวลา: เปิดให้ส่งแบบประเมินได้ตั้งแต่วันสิ้นสุดฝึกงานเป็นต้นไป
  const endDateRaw = requestData?.internship_end_date || requestData?.details?.endDate || null;
  const endDateObj = endDateRaw ? new Date(endDateRaw) : null;
  const endDateValid = endDateObj && !Number.isNaN(endDateObj.getTime());
  if (endDateValid) endDateObj.setHours(0, 0, 0, 0);
  const todayZero = new Date();
  todayZero.setHours(0, 0, 0, 0);
  const isBeforeEnd = endDateValid && todayZero < endDateObj;
  const endDateLabel = endDateValid
    ? endDateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const totalScore = questions.reduce((sum, q) => {
    const v = parseInt(formData[q.id], 10);
    return Number.isNaN(v) ? sum : sum + v;
  }, 0);
  const scoreLabel = totalScore >= 90 ? 'ดีมาก' : totalScore >= 80 ? 'ดี' : totalScore >= 70 ? 'ปานกลาง' : totalScore >= 60 ? 'พอใช้' : totalScore > 0 ? 'ต้องปรับปรุง' : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isBeforeEnd) return;

    const missing = questions.filter((q) => formData[q.id] === '').map((q) => q.id);
    if (missing.length > 0) {
      setMissingQuestions(missing);
      document.getElementById(`question-${missing[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!formData.evaluatorName.trim() || !formData.evaluatorPosition.trim() || !formData.evaluatorDepartment.trim()) {
      document.getElementById('evaluator-info')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setError('กรุณากรอกข้อมูลผู้ประเมินให้ครบถ้วน');
      return;
    }

    if (sigCanvas.current.isEmpty()) {
      setSignatureError(true);
      document.getElementById('signature-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    setSignatureError(false);
    setError('');

    // ใช้ getCanvas() แทน getTrimmedCanvas() เพื่อเลี่ยงปัญหา Vite module import
    const signatureBase64 = sigCanvas.current.getCanvas().toDataURL('image/png');

    const payload = { ...formData, studentId: requestData.studentId, signature: signatureBase64 };
    for (let i = 1; i <= 20; i++) {
      if (payload[`q${i}`] === '-') {
        payload[`q${i}`] = null;
      } else if (payload[`q${i}`] !== '') {
        payload[`q${i}`] = parseInt(payload[`q${i}`], 10);
      } else {
        payload[`q${i}`] = null;
      }
    }

    try {
      await api.post(`/public/evaluate/${id}`, payload);
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const CenteredState = ({ children }) => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-100 p-8 max-w-md w-full text-center shadow-sm">
        {children}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin stroke-[2.2]" />
        <p className="text-xs font-medium text-slate-400">กำลังโหลดแบบประเมิน...</p>
      </div>
    );
  }

  if (roundClosedMessage) {
    return (
      <CenteredState>
        <div className="w-14 h-14 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mx-auto mb-4">
          <ClipboardList className="w-7 h-7 text-violet-500" />
        </div>
        <h2 className="text-base font-bold text-slate-800 m-0 mb-2">ไม่อยู่ในรอบการประเมิน</h2>
        <p className="text-xs text-slate-500 m-0 mb-2 leading-relaxed">{roundClosedMessage}</p>
        <p className="text-xs text-slate-400 m-0">กรุณาติดต่อผู้ดูแลระบบหรืออาจารย์ประจำสาขาวิชาเพื่อสอบถามข้อมูลเพิ่มเติม</p>
      </CenteredState>
    );
  }

  if (evaluated) {
    return (
      <CenteredState>
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
        </div>
        <h2 className="text-base font-bold text-slate-800 m-0 mb-2">ประเมินเรียบร้อยแล้ว</h2>
        <p className="text-xs text-slate-500 m-0 leading-relaxed">นักศึกษาคนนี้ได้รับการประเมินเรียบร้อยแล้ว ขอบคุณที่ให้ความอนุเคราะห์ครับ</p>
      </CenteredState>
    );
  }

  if (error && !success && !requestData) {
    return (
      <CenteredState>
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-rose-500" />
        </div>
        <h2 className="text-base font-bold text-slate-800 m-0 mb-2">โหลดข้อมูลไม่สำเร็จ</h2>
        <p className="text-xs text-slate-500 m-0">{error}</p>
      </CenteredState>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50/60 via-slate-50 to-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-violet-100 p-10 max-w-md w-full text-center shadow-[0_20px_50px_-12px_rgba(124,58,237,0.15)]">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-5 shadow-[0_12px_30px_rgba(124,58,237,0.35)]">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 m-0 mb-2 tracking-tight">บันทึกผลการประเมินเรียบร้อยแล้ว</h2>
          <p className="text-sm text-slate-500 m-0 leading-relaxed">
            ขอบคุณที่ให้ความอนุเคราะห์ในการประเมินนักศึกษา<br />
            ผลการประเมินของท่านถูกส่งเข้าระบบเรียบร้อยแล้ว
          </p>
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 m-0">มหาวิทยาลัยราชภัฏศรีสะเกษ • ระบบสหกิจศึกษาและฝึกงาน LASC</p>
          </div>
        </div>
      </div>
    );
  }

  const infoFields = [
    { label: 'ชื่อ-นามสกุลนักศึกษา', value: requestData?.studentName },
    { label: 'รหัสนักศึกษา', value: requestData?.studentId },
    { label: 'สถานประกอบการ', value: requestData?.companyName || requestData?.company },
    { label: 'ตำแหน่ง / แผนกที่ฝึก', value: requestData?.position },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Hero banner */}
      <header className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
              <img src={lascLogo} alt="LASC" className="h-8 w-auto object-contain" />
            </div>
            <span className="text-[11px] font-semibold bg-white/15 border border-white/25 rounded-full px-3 py-1 tracking-wide">
              สำหรับสถานประกอบการ / พี่เลี้ยง
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white m-0 tracking-tight leading-snug">
            แบบประเมินผลการฝึกงานและสหกิจศึกษา
          </h1>
          <p className="text-sm text-white font-semibold mt-2 m-0">
            คณะศิลปศาสตร์และวิทยาศาสตร์ มหาวิทยาลัยราชภัฏศรีสะเกษ
          </p>
        </div>
      </header>

      {/* Sticky progress */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">กรอกแล้ว</span>
          <span className="text-xs font-bold text-violet-700 bg-violet-50 border border-violet-100 rounded-full px-2.5 py-1 whitespace-nowrap">
            {answeredCount}/{questions.length} ข้อ ({progressPct}%)
          </span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {/* Student info card */}
        <section className="bg-white rounded-2xl border border-purple-100 shadow-sm p-5 sm:p-6 mb-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-violet-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-800 m-0">ข้อมูลนักศึกษาที่ประเมิน</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {infoFields.map((f) => (
              <div key={f.label} className="rounded-xl bg-violet-50/50 border border-violet-100/70 px-4 py-3">
                <div className="text-[10px] font-medium text-violet-400 mb-0.5">{f.label}</div>
                <div className="text-sm font-bold text-slate-800 break-words">{f.value || '-'}</div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-4 m-0 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            กรุณาประเมินตามความเป็นจริง เพื่อนำไปพัฒนาศักยภาพและตัดเกรดของนักศึกษา
          </p>
        </section>

        {/* สถานะช่วงเวลาประเมิน — อิงวันสิ้นสุดฝึกงานจริง */}
        {isBeforeEnd ? (
          <div className="mb-5 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 m-0 mb-1">ยังไม่ถึงกำหนดเวลาประเมิน</p>
              <p className="text-xs text-amber-700 m-0 leading-relaxed">
                นักศึกษามีกำหนดฝึกงานถึงวันที่ <strong>{endDateLabel}</strong> — ขอความอนุเคราะห์สถานประกอบการทำแบบประเมินฉบับนี้หลังเสร็จสิ้นการฝึกงานตามวันดังกล่าว
                ท่านสามารถดูหัวข้อเกณฑ์ประเมินล่วงหน้าได้ แต่ปุ่มส่งจะเปิดใช้งานตั้งแต่วันที่ {endDateLabel} เป็นต้นไป
              </p>
            </div>
          </div>
        ) : endDateLabel ? (
          <div className="mb-5 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3.5 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="text-xs text-emerald-700 font-medium m-0">อยู่ในช่วงเวลาประเมินผลการฝึกงาน (นักศึกษาฝึกงานเสร็จสิ้นวันที่ {endDateLabel})</p>
          </div>
        ) : null}

        {/* Score legend */}
        <div className="bg-violet-50/50 rounded-2xl border border-violet-100/70 px-4 py-3 mb-6 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="text-[11px] font-bold text-violet-700">เกณฑ์คะแนน:</span>
          {SCORE_OPTIONS.map((opt) => (
            <span key={opt.value} className="text-[11px] text-slate-600">
              <span className="font-bold text-violet-700">{opt.value === '-' ? '–' : opt.value}</span> = {opt.label}
            </span>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Evaluator info */}
          <section id="evaluator-info" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 mb-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                <UserRound className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800 m-0">ข้อมูลผู้ประเมิน</h2>
                <p className="text-[11px] text-slate-400 m-0 mt-0.5">พนักงานที่ปรึกษา (Job Supervisor) หรือผู้ได้รับมอบหมาย</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">ชื่อ-นามสกุลผู้ประเมิน <span className="text-rose-500">*</span></label>
                <input type="text" name="evaluatorName" value={formData.evaluatorName} onChange={handleChange} className={inputCls} placeholder="เช่น สมชาย ใจดี" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">ตำแหน่ง <span className="text-rose-500">*</span></label>
                <input type="text" name="evaluatorPosition" value={formData.evaluatorPosition} onChange={handleChange} className={inputCls} placeholder="เช่น หัวหน้าแผนก" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">แผนก / ฝ่าย <span className="text-rose-500">*</span></label>
                <input type="text" name="evaluatorDepartment" value={formData.evaluatorDepartment} onChange={handleChange} className={inputCls} placeholder="เช่น ฝ่ายพัฒนาซอฟต์แวร์" />
              </div>
            </div>
          </section>

          {/* Score categories */}
          {CATEGORIES.map((cat) => (
            <section key={cat.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
              <div className="bg-purple-50 text-purple-900 border-l-4 border-purple-600 font-semibold px-4 sm:px-6 py-3.5">
                <h2 className="text-sm font-bold m-0">{cat.title}</h2>
                <p className="text-[11px] font-normal text-purple-500 m-0 mt-0.5">{cat.desc}</p>
              </div>
              <div className="divide-y divide-slate-50">
                {questions.slice(cat.range[0], cat.range[1]).map((q) => (
                  <QuestionRow
                    key={q.id}
                    q={q}
                    value={formData[q.id]}
                    onSelect={selectValue}
                    error={missingQuestions.includes(q.id)}
                  />
                ))}
              </div>
            </section>
          ))}

          {/* Feedback */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 mb-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                <PenLine className="w-5 h-5 text-violet-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 m-0">ข้อคิดเห็นเพิ่มเติม</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">21. จุดเด่นของนักศึกษา</label>
                <textarea name="strengths" value={formData.strengths} onChange={handleChange} rows={3} className={textareaCls} placeholder="จุดเด่น ความสามารถที่โดดเด่น..." />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">22. ข้อควรปรับปรุงของนักศึกษา</label>
                <textarea name="improvements" value={formData.improvements} onChange={handleChange} rows={3} className={textareaCls} placeholder="จุดที่ควรพัฒนาเพิ่มเติม..." />
              </div>
            </div>
          </section>

          {/* Q23-25 option cards */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 mb-5 space-y-6">
            <div>
              <label className="text-[13px] font-semibold text-slate-700 mb-2.5 block">
                23. ในอนาคต ท่านสนใจจะรับนักศึกษาเข้าทำงานในสถานประกอบการนี้หรือไม่ <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {HIRE_OPTIONS.map((opt) => (
                  <OptionCard key={opt} name="hireFuture" value={opt} label={opt} selected={formData.hireFuture === opt} onSelect={selectValue} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-[13px] font-semibold text-slate-700 mb-2.5 block">
                24. สรุปโดยภาพรวมท่านมีความคิดเห็นต่อคุณภาพนักศึกษาคนนี้ในระดับ <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {OVERALL_OPTIONS.map((opt) => (
                  <OptionCard key={opt.value} name="overallScore" value={opt.value} label={opt.label} selected={formData.overallScore === opt.value} onSelect={selectValue} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-[13px] font-semibold text-slate-700 mb-2.5 block">
                25. การใช้ประโยชน์จากผลการปฏิบัติงาน/โครงงานของนักศึกษา <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {PROJECT_OPTIONS.map((opt) => (
                  <OptionCard key={opt.value} name="projectUsage" value={opt.value} label={opt.label} selected={formData.projectUsage === opt.value} onSelect={selectValue} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">26. ข้อคิดเห็นอื่นๆ</label>
              <textarea name="otherComments" value={formData.otherComments} onChange={handleChange} rows={3} className={textareaCls} placeholder="ข้อเสนอแนะเพิ่มเติม..." />
            </div>
          </section>

          {/* Signature */}
          <section id="signature-box" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 mb-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                  <PenLine className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 m-0">ลายมือชื่อผู้ประเมิน <span className="text-rose-500">*</span></h2>
                  <p className="text-[11px] text-slate-400 m-0 mt-0.5">ใช้นิ้วหรือเมาส์วาดลายเซ็นลงในกรอบ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearSignature}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition cursor-pointer"
              >
                <Eraser className="w-3.5 h-3.5" /> ล้างลายเซ็น
              </button>
            </div>
            <div className={`border-2 border-dashed rounded-xl bg-slate-50/50 h-[200px] overflow-hidden transition-colors ${signatureError ? 'border-rose-300' : 'border-slate-200'}`}>
              <SignatureCanvas
                ref={sigCanvas}
                penColor="#1e1b4b"
                canvasProps={{ className: 'sigCanvas', style: { width: '100%', height: '100%' } }}
              />
            </div>
            {signatureError && (
              <p className="text-xs text-rose-600 font-medium mt-2 m-0">* กรุณาลงลายเซ็นก่อนส่งแบบประเมิน</p>
            )}
            <p className="text-[11px] text-slate-400 mt-3 m-0">
              ผู้ประเมิน: {formData.evaluatorName || '-'} {formData.evaluatorPosition ? `(${formData.evaluatorPosition})` : ''} • วันที่ {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </section>

          {/* Live score summary */}
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl border border-violet-100 px-5 py-4 mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-semibold text-slate-600">คะแนนรวม (ข้อ 1-20)</span>
            </div>
            <span className="text-sm font-extrabold text-violet-700">
              {totalScore} / 100 คะแนน{scoreLabel ? ` (${scoreLabel})` : ''}
            </span>
          </div>

          {missingQuestions.length > 0 && (
            <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3.5 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-600 font-medium m-0 leading-relaxed">
                กรุณาให้คะแนนครบทุกข้อ — เหลืออีก {missingQuestions.length} ข้อ (ข้อ {missingQuestions.map((qid) => qid.replace('q', '')).join(', ')})
              </p>
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3.5 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-600 font-medium m-0 leading-relaxed">{error}</p>
            </div>
          )}

          <div className="sm:text-right">
            <button
              type="submit"
              disabled={submitting || isBeforeEnd}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-bold shadow-lg hover:shadow-purple-500/30 transition-all cursor-pointer border-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'กำลังบันทึก...' : 'ส่งแบบประเมิน'}
            </button>
            {isBeforeEnd && (
              <p className="text-[11px] text-amber-600 font-medium mt-2 m-0">
                ปุ่มส่งแบบประเมินจะเปิดใช้งานตั้งแต่วันที่ {endDateLabel} เป็นต้นไป
              </p>
            )}
          </div>
          <div className="clear-both" />
        </form>

        <p className="text-[11px] text-slate-400 text-center mt-8 m-0">
          มหาวิทยาลัยราชภัฏศรีสะเกษ • ระบบสหกิจศึกษาและฝึกงาน LASC
        </p>
      </main>
    </div>
  );
};

export default PublicEvaluationPage;
