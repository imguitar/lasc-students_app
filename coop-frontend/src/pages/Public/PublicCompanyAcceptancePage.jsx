import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';
import SignaturePad from '../../components/SignaturePad';
import { getUploadUrl } from '../../utils/fileUrl';
import { ArrowRightLeft, CheckCircle2, FileText, Loader2, Trash2, Upload, UserRound, X, XCircle } from 'lucide-react';

const fileUrl = getUploadUrl;

// หน้าตอบรับนักศึกษาของสถานประกอบการใหม่ — one-time link ไม่ต้องล็อกอิน (แอดมิน gen QR หลังออกหนังสือขอความอนุเคราะห์)
const PublicCompanyAcceptancePage = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [decision, setDecision] = useState('accept');
  const [signerName, setSignerName] = useState('');
  const [signerPosition, setSignerPosition] = useState('');
  const [signature, setSignature] = useState('');
  const [comment, setComment] = useState('');
  const [preparations, setPreparations] = useState('');
  const [evaluatorEmail, setEvaluatorEmail] = useState('');
  const [acceptFile, setAcceptFile] = useState(null); // {fileName, dataUrl, size, mime}
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);

  useEffect(() => {
    api.get(`/public/relocations/acceptance/${token}`)
      .then((res) => {
        const d = res.data?.data;
        setData(d);
        // prefill ผู้ลงนามจากผู้ประสานงาน/หัวหน้าหน่วยงานที่นักศึกษาระบุในคำร้อง (แก้ไขได้)
        setSignerName((v) => v || (d?.mentor_name || (d?.new_company_contact || '').split('·')[0].trim() || ''));
        setSignerPosition((v) => v || (d?.mentor_position || ''));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const isAccept = decision === 'accept';
  // รับ → บังคับแค่ชื่อผู้ลงนาม (ลายเซ็น/ไฟล์แนบไม่บังคับ) | ไม่รับ → บังคับเหตุผล
  const canSubmit = signerName.trim() && (isAccept ? true : !!comment.trim()) && !submitting;

  const ACCEPT_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
  const fmtBytes = (n) => (n ? `${(n / 1048576).toFixed(1)} MB` : '');
  const onPickAcceptDoc = async (file) => {
    if (!file) return;
    setError('');
    if (!ACCEPT_DOC_TYPES.includes(file.type)) return setError('รองรับเฉพาะไฟล์ PDF, PNG, JPG เท่านั้น');
    if (file.size > 10 * 1024 * 1024) return setError('ไฟล์ต้องมีขนาดไม่เกิน 10MB');
    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    setAcceptFile({ fileName: file.name, dataUrl, size: file.size, mime: file.type });
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/public/relocations/acceptance/${token}/respond`, {
        decision,
        signer_name: signerName,
        signer_position: signerPosition,
        signature_data_url: isAccept ? signature : undefined,
        comment,
        acceptance_preparations: isAccept ? preparations.trim() || undefined : undefined,
        acceptance_evaluator_email: isAccept ? evaluatorEmail.trim() || undefined : undefined,
        acceptance_document: isAccept && acceptFile ? { fileName: acceptFile.fileName, dataUrl: acceptFile.dataUrl } : undefined
      });
      setDone(true);
    } catch (e) {
      setError(e.response?.data?.message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  const avatarSrc = data?.student_avatar
    ? (/^https?:|^data:/.test(data.student_avatar) ? data.student_avatar : fileUrl(data.student_avatar))
    : '';
  const initials = (data?.student_name_th || '').trim().charAt(0);
  // student_info จาก JSON_EXTRACT อาจเป็น string — parse ให้เป็น object เสมอ
  const sinfo = (() => {
    try {
      const v = typeof data?.student_info === 'string' ? JSON.parse(data.student_info) : data?.student_info;
      return v && typeof v === 'object' ? v : {};
    } catch { return {}; }
  })();
  const saddr = sinfo.address || {};
  const studentAddr = [
    saddr.house ? `บ้านเลขที่ ${saddr.house}` : '',
    saddr.moo ? `หมู่ ${saddr.moo}` : '',
    saddr.soi ? (/^(ซอย|ตรอก|ซ\.)/.test(saddr.soi) ? saddr.soi : `ซอย${saddr.soi}`) : '',
    saddr.road ? (/^(ถนน|ถ\.)/.test(saddr.road) ? saddr.road : `ถนน${saddr.road}`) : '',
    saddr.tambon ? `ต.${saddr.tambon}` : '',
    saddr.amphur ? `อ.${saddr.amphur}` : '',
    saddr.province ? `จ.${saddr.province}` : '',
    saddr.postal || ''
  ].filter(Boolean).join(' ');
  const fmtThaiDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const internPeriod = fmtThaiDate(data?.new_start_date) && fmtThaiDate(data?.new_end_date)
    ? `${fmtThaiDate(data.new_start_date)} — ${fmtThaiDate(data.new_end_date)}`
    : null;
  const remainingHours = (Number(data?.days_remaining) || 0) * 8;

  // สไตล์ถอดแบบจากฟอร์มคำร้องหลัก — input/label/section header เดียวกัน
  const inputCls = 'w-full box-border h-11 px-4 text-sm text-slate-700 placeholder:text-slate-400 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition';
  const textareaCls = inputCls.replace('h-11 ', 'py-2.5 ') + ' resize-none';
  const labelCls = 'text-sm font-semibold text-slate-800 mb-1.5 block';
  const ReqStar = () => <span className="text-rose-500 ml-1">*</span>;

  const field = (label, value) => (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3 py-2 border-b border-slate-100 last:border-0">
      <span className="text-[11px] font-semibold text-slate-400 w-32 shrink-0">{label}</span>
      <span className="text-xs font-semibold text-slate-800">{value || '—'}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-violet-50/40 py-6 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header — ชื่อแบบฟอร์ม + badge สถานะ */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
            <ArrowRightLeft className="text-white" style={{ width: 18, height: 18 }} />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 m-0">แบบตอบรับนักศึกษาฝึกประสบการณ์วิชาชีพ</h1>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-semibold">
              ขอความอนุเคราะห์เข้าฝึกงาน
            </span>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-10 flex items-center justify-center gap-2 text-slate-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin" /> กำลังตรวจสอบลิงก์...
          </div>
        ) : notFound ? (
          <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-10 text-center">
            <XCircle className="w-10 h-10 text-red-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 m-0">ลิงก์ไม่ถูกต้องหรือถูกใช้งานไปแล้ว</p>
            <p className="text-xs text-slate-400 mt-1 m-0">ลิงก์นี้อาจหมดอายุ หรือถูกบันทึกผลไปแล้ว</p>
          </div>
        ) : done || !data.usable ? (
          <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-10 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800 m-0">บันทึกผลตอบรับเรียบร้อยแล้ว</p>
            <p className="text-xs text-slate-500 mt-1 m-0 leading-relaxed">
              {done
                ? 'ขอบคุณ — ระบบได้บันทึกผลตอบรับของท่านและแจ้งสำนักงานคณบดีเรียบร้อยแล้ว ลิงก์นี้ไม่สามารถใช้งานได้อีก'
                : 'คำร้องนี้ได้รับการบันทึกผลไปก่อนหน้าแล้ว ลิงก์นี้ไม่สามารถใช้งานได้อีก'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* แถบแจ้งบริบท — ฝึกงานต่อเนื่องจากการย้ายสถานที่ */}
            <div className="rounded-2xl bg-violet-50 border border-violet-200/70 px-4 py-3 flex items-start gap-2.5">
              <ArrowRightLeft className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
              <p className="text-xs text-violet-900 m-0 leading-relaxed font-semibold">
                คำร้องขอส่งตัวนักศึกษาเข้าฝึกประสบการณ์วิชาชีพต่อเนื่อง
                <span className="block text-[11px] font-normal text-violet-600 mt-0.5">(เนื่องจากได้รับอนุมัติให้เปลี่ยนสถานที่ฝึกงาน — นักศึกษาฝึกงานมาแล้วบางส่วน)</span>
              </p>
            </div>

            {/* การ์ด 1: ข้อมูลนักศึกษา */}
            <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-5 sm:p-6">
              <div className="border-l-4 border-purple-600 pl-3 mb-4">
                <h2 className="text-lg font-bold text-slate-800 m-0">ข้อมูลนักศึกษา</h2>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  {field('ชื่อ-นามสกุล', data.student_name_th)}
                  {field('รหัสนักศึกษา', data.student_id)}
                  {field('สาขาวิชา', data.major)}
                  {field('โทรศัพท์', sinfo.phone)}
                  {field('อีเมล', sinfo.email)}
                  {field('ที่อยู่ปัจจุบัน', studentAddr)}
                </div>
                {/* รูปถ่ายนักศึกษา 3:4 มุมขวาบน */}
                <div className="shrink-0 self-start">
                  <div className={`w-24 h-32 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-sm bg-slate-50 flex items-center justify-center ${avatarSrc ? 'cursor-zoom-in hover:border-violet-300 transition' : ''}`}
                    onClick={() => avatarSrc && setShowPhoto(true)}
                    role={avatarSrc ? 'button' : undefined}
                    aria-label={avatarSrc ? 'ขยายรูปนักศึกษา' : undefined}>
                    {avatarSrc ? (
                      <img src={avatarSrc} alt={data.student_name_th} className="w-full h-full object-cover object-top" />
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

              {/* สรุปเวลาฝึกงานคงเหลือ */}
              <div className="mt-4 rounded-xl bg-violet-50/50 border border-violet-100 p-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <p className="text-[10px] font-semibold text-violet-400 m-0">สถานะการฝึก</p>
                  <p className="text-xs font-bold text-violet-800 m-0 mt-0.5">ฝึกงานต่อเนื่อง</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-violet-400 m-0">จำนวนวันที่ต้องฝึกต่อ</p>
                  <p className="text-xs font-bold text-violet-800 m-0 mt-0.5">
                    {data.days_remaining ? `${data.days_remaining} วัน` : '—'}
                    {remainingHours > 0 && <span className="font-normal text-violet-600"> (≈{remainingHours} ชั่วโมง)</span>}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-violet-400 m-0">ช่วงเวลาที่ประสงค์ขอเข้าฝึกงาน</p>
                  <p className="text-xs font-bold text-violet-800 m-0 mt-0.5">{internPeriod || 'รอสำนักงานคณบดีระบุ'}</p>
                </div>
              </div>
            </div>

            {/* การ์ด 2: รายละเอียดสถานประกอบการ */}
            <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-5 sm:p-6">
              <div className="border-l-4 border-purple-600 pl-3 mb-4">
                <h2 className="text-lg font-bold text-slate-800 m-0">รายละเอียดสถานประกอบการ</h2>
              </div>
              <div className="min-w-0">
                {field('ผู้ประสานงาน', data.new_company_contact || data.mentor_name)}
                {field('ตำแหน่งผู้ประสานงาน', data.mentor_position)}
                {field('ชื่อหน่วยงาน/บริษัท', data.new_company_name)}
                {field('ที่อยู่หน่วยงาน', data.new_company_address)}
                {field('โทรศัพท์', data.mentor_phone)}
                {field('อีเมล', data.mentor_email)}
                {field('ตำแหน่งที่เข้าฝึกงาน', data.intern_position)}
              </div>

              {/* ความประสงค์และลักษณะงานที่ต้องการฝึก */}
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-4">
                <p className="text-[11px] font-bold text-slate-700 m-0 mb-2 flex items-center gap-1.5">
                  <UserRound style={{ width: 13, height: 13 }} className="text-violet-500" /> ความประสงค์และลักษณะงานที่ต้องการฝึก
                </p>
                {field('ตำแหน่งที่ต้องการ', data.intern_position)}
                {field('ลักษณะงาน/เป้าหมายการเรียนรู้', data.intern_description)}
                {field('ทักษะที่เกี่ยวข้อง', data.intern_skills)}
              </div>

              {data.new_request_letter_file && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <a href={fileUrl(data.new_request_letter_file)} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 h-11 px-4 rounded-2xl bg-violet-50 border border-violet-200 text-sm font-semibold text-violet-700 hover:bg-violet-100 no-underline transition">
                    <FileText style={{ width: 15, height: 15 }} /> เปิดดู/ดาวน์โหลดหนังสือขอความอนุเคราะห์ (PDF)
                  </a>
                </div>
              )}
            </div>

            {/* การ์ด 3: แบบตอบรับและลงนาม */}
            <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-5 sm:p-6">
              <div className="border-l-4 border-purple-600 pl-3 mb-4">
                <h2 className="text-lg font-bold text-slate-800 m-0">แบบตอบรับและลงนาม</h2>
                <p className="text-xs text-slate-500 m-0 mt-0.5">โปรดตรวจสอบรายละเอียดและเลือกผลการพิจารณา</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[['accept', 'รับนักศึกษาเข้าฝึกงาน', <CheckCircle2 key="i" style={{ width: 18, height: 18 }} className="shrink-0" />], ['decline', 'ไม่สามารถรับได้', <XCircle key="i" style={{ width: 18, height: 18 }} className="shrink-0" />]].map(([val, label, icon]) => (
                  <button key={val} type="button" onClick={() => setDecision(val)}
                    className={`min-h-[56px] py-2.5 px-3 rounded-2xl text-[13px] sm:text-sm font-bold border-2 cursor-pointer transition flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 leading-snug ${decision === val
                      ? val === 'accept' ? 'bg-emerald-600 text-white border-emerald-600 shadow-[0_4px_12px_rgba(5,150,105,0.3)]' : 'bg-red-600 text-white border-red-600 shadow-[0_4px_12px_rgba(225,29,72,0.3)]'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                    {icon}
                    {label}
                  </button>
                ))}
              </div>

              {/* รายละเอียดการรับเข้าฝึกงาน — เฉพาะตอนเลือก "รับนักศึกษา" */}
              {isAccept && (
                <div className="mt-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 p-4 space-y-4">
                  <div>
                    <label className={labelCls}>สิ่งของ/เอกสารที่นักศึกษาต้องเตรียม (ถ้ามี)</label>
                    <input value={preparations} onChange={(e) => setPreparations(e.target.value)}
                      placeholder="เช่น ชุดยูนิฟอร์ม, สมุดบันทึกการฝึกงาน, บัตรประชาชน"
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>อีเมลสำหรับรับแบบฟอร์มประเมินผล (ส่งอัตโนมัติ)</label>
                    <input type="email" value={evaluatorEmail} onChange={(e) => setEvaluatorEmail(e.target.value)}
                      placeholder="เช่น hr@company.com"
                      className={inputCls} />
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <div>
                  <label className={labelCls}>ชื่อ-นามสกุลผู้มีอำนาจลงนาม<ReqStar /></label>
                  <input value={signerName} onChange={(e) => setSignerName(e.target.value)}
                    placeholder="เช่น นายสมชาย ใจดี"
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>ตำแหน่ง</label>
                  <input value={signerPosition} onChange={(e) => setSignerPosition(e.target.value)}
                    placeholder="เช่น หัวหน้าหน่วยงาน"
                    className={inputCls} />
                </div>
              </div>
              {isAccept && (
                <div className="mt-4">
                  <label className={labelCls}>ลายมือชื่อผู้ลงนาม <span className="text-xs font-normal text-slate-400">(ไม่บังคับ)</span></label>
                  <SignaturePad onChange={(d) => setSignature(d || '')} height={150} />
                </div>
              )}

              {/* แนบไฟล์เอกสารตอบรับ — ไม่บังคับ */}
              {isAccept && (
                <div className="mt-4">
                  <label className={labelCls}>
                    แนบไฟล์หนังสือตอบรับ / เอกสารยืนยันจากสถานประกอบการ (ถ้ามี)
                    <span className="block text-xs font-normal text-slate-400 mt-0.5">(PDF/PNG/JPG ขนาดไม่เกิน 10MB - ไม่บังคับ)</span>
                  </label>
                  {!acceptFile ? (
                    <label
                      className="block cursor-pointer border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-violet-400 hover:bg-violet-50/50 transition-colors"
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={(e) => { e.preventDefault(); onPickAcceptDoc(e.dataTransfer.files?.[0]); }}>
                      <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden"
                        onChange={(e) => { onPickAcceptDoc(e.target.files?.[0]); e.target.value = ''; }} />
                      <Upload className="w-7 h-7 mx-auto mb-2 text-slate-400" />
                      <span className="block text-xs font-semibold text-slate-500">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวาง</span>
                    </label>
                  ) : (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-emerald-800 m-0 truncate">{acceptFile.fileName}</p>
                          <p className="text-[10px] text-emerald-600 m-0">{fmtBytes(acceptFile.size)}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setAcceptFile(null)} aria-label="ลบไฟล์แนบ"
                        className="shrink-0 w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 cursor-pointer flex items-center justify-center transition">
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="mt-4">
                <label className={labelCls}>
                  {isAccept ? 'หมายเหตุเพิ่มเติม (ไม่บังคับ)' : <>เหตุผลที่ไม่สามารถรับนักศึกษาได้<ReqStar /></>}
                </label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={isAccept ? 2 : 3}
                  placeholder={isAccept ? 'เงื่อนไข/ข้อเสนอแนะเพิ่มเติม' : 'เช่น อัตรากำลังเต็ม, ไม่ตรงสายงาน'}
                  className={textareaCls} />
              </div>
              {error && <p className="text-xs font-semibold text-red-500 mt-3 mb-0">{error}</p>}

              <button type="button" onClick={submit} disabled={!canSubmit}
                className={`mt-5 w-full py-3 rounded-2xl text-white text-sm font-bold transition cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${decision === 'accept' ? 'bg-violet-600 hover:bg-violet-700 shadow-[0_4px_14px_rgba(124,58,237,0.25)]' : 'bg-rose-600 hover:bg-rose-700 shadow-[0_4px_14px_rgba(225,29,72,0.25)]'}`}>
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {decision === 'accept' ? 'ยืนยันการตอบรับนักศึกษาฝึกงาน' : 'ยืนยันการปฏิเสธคำร้อง'}
              </button>
              <p className="text-[10px] text-slate-400 text-center mt-2 m-0">
                เมื่อกดยืนยัน ลิงก์นี้จะหมดอายุทันทีและไม่สามารถใช้งานได้อีก
              </p>
            </div>
          </div>

          )}
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

export default PublicCompanyAcceptancePage;
