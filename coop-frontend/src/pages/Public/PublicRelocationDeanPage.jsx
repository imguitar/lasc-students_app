import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';
import SignaturePad from '../../components/SignaturePad';
import { getUploadUrl } from '../../utils/fileUrl';
import { ArrowRightLeft, Building2, CheckCircle2, FileText, Loader2, MapPin, PenLine, Stamp, UserRound, X, XCircle } from 'lucide-react';

const fileUrl = getUploadUrl;

// หน้าลงนามพิจารณาของคณบดี — one-time link ไม่ต้องล็อกอิน (แอดมิน gen QR ส่งให้)
const PublicRelocationDeanPage = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [decision, setDecision] = useState('allow');
  const [signature, setSignature] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);

  useEffect(() => {
    api.get(`/public/relocations/dean/${token}`)
      .then((res) => setData(res.data?.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const canSubmit = signature && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/public/relocations/dean/${token}/approve`, {
        decision,
        signature_data_url: signature,
        comment
      });
      setDone(true);
    } catch (e) {
      setError(e.response?.data?.message || 'ลงนามไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  const avatarSrc = data?.student_avatar
    ? (/^https?:|^data:/.test(data.student_avatar) ? data.student_avatar : fileUrl(data.student_avatar))
    : '';
  const initials = (data?.student_name_th || '').trim().charAt(0);

  const field = (label, value) => (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3 py-2 border-b border-slate-100 last:border-0">
      <span className="text-[11px] font-semibold text-slate-400 w-32 shrink-0">{label}</span>
      <span className="text-xs font-semibold text-slate-800">{value || '—'}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-violet-50/40 py-6 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
            <ArrowRightLeft className="text-white" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 m-0">คำร้องขอเปลี่ยนสถานที่ฝึกงาน</h1>
            <p className="text-[10px] text-slate-400 m-0">คณะศิลปศาสตร์และวิทยาศาสตร์ • ระบบลงนามพิจารณาออนไลน์</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 flex items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-4 h-4 animate-spin" /> กำลังตรวจสอบลิงก์...
            </div>
          ) : notFound ? (
            <div className="p-10 text-center">
              <XCircle className="w-10 h-10 text-red-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 m-0">ลิงก์ไม่ถูกต้องหรือถูกใช้งานไปแล้ว</p>
              <p className="text-xs text-slate-400 mt-1 m-0">ลิงก์นี้อาจหมดอายุ หรือถูกลงนามไปแล้ว</p>
            </div>
          ) : done || !data.usable ? (
            <div className="p-10 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800 m-0">ลงนามพิจารณาเรียบร้อยแล้ว</p>
              <p className="text-xs text-slate-500 mt-1 m-0 leading-relaxed">
                {done
                  ? 'ขอบคุณ — ระบบได้บันทึกผลพิจารณาของท่านเรียบร้อยแล้ว ลิงก์นี้ไม่สามารถใช้งานได้อีก'
                  : 'คำร้องนี้ได้รับการพิจารณาไปก่อนหน้าแล้ว ลิงก์นี้ไม่สามารถใช้งานได้อีก'}
              </p>
            </div>
          ) : (
            <>
              <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 m-0 flex items-center gap-2">
                  <Stamp className="text-violet-600" style={{ width: 18, height: 18 }} />
                  พิจารณาอนุญาตให้เปลี่ยนสถานที่ฝึกงาน
                </h2>
                <p className="text-[11px] text-slate-400 mt-1 m-0 leading-relaxed">
                  สำหรับคณบดี/ผู้มีอำนาจลงนาม — โปรดตรวจสอบรายละเอียด เลือกผลพิจารณา และลงลายมือชื่อเพื่อยืนยัน
                </p>
              </div>

              <div className="px-5 sm:px-6 py-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    {field('นักศึกษา', data.student_name_th)}
                    {field('รหัสนักศึกษา', data.student_id)}
                    {field('สาขาวิชา', data.major)}
                    {field('ฝึกงานอยู่ที่', data.company_name)}
                    {field('ฝึกสะสมแล้ว', `${data.days_trained} วัน (คงเหลือ ${data.days_remaining} วัน)`)}
                    {field('เหตุผล', data.reason)}
                    {data.advisor_comment && field('ความเห็นอาจารย์ที่ปรึกษา', data.advisor_comment)}
                  </div>
                  {/* รูปถ่ายนักศึกษา — ยืนยันตัวตนก่อนลงนาม */}
                  <div className="shrink-0 self-start">
                    <div className={`w-[70px] h-[92px] sm:w-[110px] sm:h-[147px] rounded-2xl overflow-hidden border-2 border-slate-200 shadow-sm bg-slate-50 flex items-center justify-center ${avatarSrc ? 'cursor-zoom-in hover:border-violet-300 transition' : ''}`}
                      onClick={() => avatarSrc && setShowPhoto(true)}
                      role={avatarSrc ? 'button' : undefined}
                      aria-label={avatarSrc ? 'ขยายรูปนักศึกษา' : undefined}>
                      {avatarSrc ? (
                        <img src={avatarSrc} alt={data.student_name_th} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-violet-50 to-slate-100 text-violet-400">
                          <UserRound style={{ width: 26, height: 26 }} />
                          <span className="text-base font-bold mt-0.5">{initials || '?'}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-400 text-center mt-1 m-0">รูปนักศึกษา</p>
                  </div>
                </div>
                {data.return_letter_file && (
                  <div className="py-2">
                    <a href={fileUrl(data.return_letter_file)} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 hover:text-violet-800 no-underline">
                      <FileText style={{ width: 13, height: 13 }} />
                      ดูหนังสือส่งตัวกลับ ({data.return_letter_name || 'เอกสาร'})
                    </a>
                  </div>
                )}

                {/* ปลายทาง */}
                <div className="mt-3 rounded-xl bg-violet-50/70 border border-violet-100 p-3">
                  <p className="text-[10px] font-bold text-violet-800 m-0 flex items-center gap-1.5">
                    <Building2 style={{ width: 12, height: 12 }} /> สถานประกอบการแห่งใหม่
                  </p>
                  <p className="text-[11px] text-violet-900 font-semibold mt-1 m-0">{data.new_company_name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 m-0 flex items-start gap-1 leading-relaxed">
                    <MapPin style={{ width: 11, height: 11 }} className="mt-0.5 shrink-0" />{data.new_company_address}
                  </p>
                </div>

                {/* ผลพิจารณา */}
                <div className="mt-4 flex gap-2">
                  {[['allow', 'อนุญาตให้เปลี่ยน'], ['deny', 'ไม่อนุญาตให้เปลี่ยน']].map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setDecision(val)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition ${decision === val
                        ? val === 'allow' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* ลายเซ็น + หมายเหตุ */}
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                      <PenLine style={{ width: 12, height: 12 }} /> ลายมือชื่อคณบดี / ผู้มีอำนาจลงนาม *
                    </label>
                    <SignaturePad onChange={(d) => setSignature(d || '')} height={150} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">หมายเหตุ (ไม่บังคับ)</label>
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
                      placeholder="ข้อเสนอแนะ/เงื่อนไขเพิ่มเติม"
                      className="w-full box-border px-3 py-2.5 text-xs text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-400 resize-none" />
                  </div>
                  {error && <p className="text-[11px] font-semibold text-red-500 m-0">{error}</p>}
                </div>
              </div>

              <div className="px-5 sm:px-6 py-4 border-t border-slate-100">
                <button type="button" onClick={submit} disabled={!canSubmit}
                  className={`w-full py-3 rounded-xl text-white text-xs font-bold transition cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${decision === 'allow' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-[0_4px_14px_rgba(5,150,105,0.25)]' : 'bg-red-600 hover:bg-red-700 shadow-[0_4px_14px_rgba(220,38,38,0.25)]'}`}>
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {decision === 'allow' ? 'ลงนามอนุญาตให้เปลี่ยนสถานที่ฝึกงาน' : 'ลงนามไม่อนุญาต'}
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-2 m-0">
                  เมื่อกดยืนยัน ลิงก์นี้จะหมดอายุทันทีและไม่สามารถใช้งานได้อีก
                </p>
              </div>
            </>
          )}
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-4">ระบบสหกิจศึกษาและการฝึกงาน คณะศิลปศาสตร์และวิทยาศาสตร์</p>
      </div>

      {/* Lightbox ดูรูปนักศึกษาขยาย */}
      {showPhoto && avatarSrc && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowPhoto(false)}>
          <button type="button" aria-label="ปิด" onClick={() => setShowPhoto(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer border-none">
            <X style={{ width: 18, height: 18 }} />
          </button>
          <div className="rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-800 max-w-[85vw]" onClick={(e) => e.stopPropagation()}>
            <img src={avatarSrc} alt={data.student_name_th} className="max-h-[75vh] w-auto object-contain block" />
            <p className="text-center text-[11px] text-slate-300 py-2 m-0 bg-slate-900/60">{data.student_name_th} • {data.student_id}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicRelocationDeanPage;
