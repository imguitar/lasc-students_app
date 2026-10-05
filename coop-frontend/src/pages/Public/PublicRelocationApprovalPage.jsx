import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';
import SignaturePad from '../../components/SignaturePad';
import { getUploadUrl } from '../../utils/fileUrl';
import { ArrowRightLeft, CheckCircle2, FileText, Loader2, PenLine, ShieldCheck, Trash2, Upload, XCircle } from 'lucide-react';

const fileUrl = getUploadUrl;

// หน้าลงนามยินยอมของสถานประกอบการเดิม — one-time link ไม่ต้องล็อกอิน
const PublicRelocationApprovalPage = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerPosition, setSignerPosition] = useState('');
  const [signature, setSignature] = useState('');
  const [releaseFile, setReleaseFile] = useState(null); // {fileName, dataUrl, size, mime}
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get(`/public/relocations/token/${token}`)
      .then((res) => setData(res.data?.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  // บังคับลงลายเซ็นยินยอม + ชื่อผู้ลงนาม | ไฟล์หนังสือส่งตัวกลับแนบเพิ่มได้ (ไม่บังคับ)
  const canSubmit = signerName.trim() && signature && !submitting;

  const ACCEPT_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
  const fmtBytes = (n) => (n ? `${(n / 1048576).toFixed(1)} MB` : '');
  const onPickReleaseDoc = async (file) => {
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
    setReleaseFile({ fileName: file.name, dataUrl, size: file.size, mime: file.type });
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/public/relocations/token/${token}/approve`, {
        signer_name: signerName,
        signer_position: signerPosition,
        signature_data_url: signature || undefined,
        return_letter_document: releaseFile ? { fileName: releaseFile.fileName, dataUrl: releaseFile.dataUrl } : undefined
      });
      setDone(true);
    } catch (e) {
      setError(e.response?.data?.message || 'ลงนามไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

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
            <ArrowRightLeft className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 m-0">คำร้องขอเปลี่ยนสถานที่ฝึกงาน</h1>
            <p className="text-[10px] text-slate-400 m-0">คณะศิลปศาสตร์และวิทยาศาสตร์ • ระบบลงนามยินยอมออนไลน์</p>
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
              <p className="text-sm font-bold text-slate-800 m-0">ลงนามยินยอมเรียบร้อยแล้ว</p>
              <p className="text-xs text-slate-500 mt-1 m-0 leading-relaxed">
                {done
                  ? 'ขอบคุณ — ระบบได้บันทึกการยินยอมและส่งคำร้องต่อให้อาจารย์ที่ปรึกษาพิจารณาแล้ว ลิงก์นี้ไม่สามารถใช้งานได้อีก'
                  : 'คำร้องนี้ได้รับการลงนามไปก่อนหน้าแล้ว ลิงก์นี้ไม่สามารถใช้งานได้อีก'}
              </p>
            </div>
          ) : (
            <>
              <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 m-0 flex items-center gap-2">
                  <ShieldCheck className="w-4.5 h-4.5 text-violet-600" style={{ width: 18, height: 18 }} />
                  ยินยอมให้นักศึกษาเปลี่ยนสถานที่ฝึกงาน
                </h2>
                <p className="text-[11px] text-slate-400 mt-1 m-0 leading-relaxed">
                  โปรดตรวจสอบรายละเอียดด้านล่าง หากสถานประกอบการของท่านยินยอมให้นักศึกษายุติ/ย้ายการฝึกงาน กรุณาระบุชื่อ-ตำแหน่ง และลงลายมือชื่อเพื่อยืนยัน
                </p>
              </div>

              <div className="px-5 sm:px-6 py-4">
                {field('นักศึกษา', `${data.student_name_th || ''}${data.student_name_en ? ` (${data.student_name_en})` : ''}`)}
                {field('รหัสนักศึกษา', data.student_id)}
                {field('สาขาวิชา', data.major)}
                {field('ฝึกงานอยู่ที่', data.company_name)}
                {field('ฝึกสะสมแล้ว', `${data.days_trained} วัน (คงเหลือ ${data.days_remaining} วัน)`)}
                {field('เหตุผล', data.reason)}
                {data.return_letter_file && (
                  <div className="py-2">
                    <a href={fileUrl(data.return_letter_file)} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 hover:text-violet-800 no-underline">
                      <FileText style={{ width: 13, height: 13 }} />
                      ดูหนังสือส่งตัวกลับ ({data.return_letter_name || 'เอกสาร'})
                    </a>
                  </div>
                )}

                {/* ผู้ลงนาม */}
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 mb-1 block">ชื่อ-นามสกุลผู้ลงนาม *</label>
                      <input value={signerName} onChange={(e) => setSignerName(e.target.value)}
                        placeholder="เช่น นายสมชาย ใจดี"
                        className="w-full box-border h-10 px-3 text-xs text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-400" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 mb-1 block">ตำแหน่ง</label>
                      <input value={signerPosition} onChange={(e) => setSignerPosition(e.target.value)}
                        placeholder="เช่น ผู้จัดการฝ่ายบุคคล"
                        className="w-full box-border h-10 px-3 text-xs text-slate-700 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-400" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block flex items-center gap-1">
                      <PenLine style={{ width: 12, height: 12 }} /> ลายมือชื่อผู้ลงนาม *
                    </label>
                    <SignaturePad onChange={(d) => setSignature(d || '')} height={150} />
                    <p className="text-[10px] text-slate-400 mt-1 m-0">จำเป็นต้องลงลายเซ็นเพื่อยืนยันการยินยอม</p>
                  </div>

                  {/* แนบไฟล์หนังสือส่งตัวกลับ — สลับกับลายเซ็นได้ */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                      แนบไฟล์หนังสือส่งตัวกลับ / เอกสารยินยอมจากสถานประกอบการ (ถ้ามี - ไม่บังคับ)
                    </label>
                    {!releaseFile ? (
                      <label
                        className="block cursor-pointer border-2 border-dashed border-slate-300 rounded-xl p-5 text-center hover:border-violet-400 hover:bg-violet-50/50 transition-colors"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); onPickReleaseDoc(e.dataTransfer.files?.[0]); }}>
                        <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden"
                          onChange={(e) => { onPickReleaseDoc(e.target.files?.[0]); e.target.value = ''; }} />
                        <Upload className="w-6 h-6 mx-auto mb-1.5 text-slate-400" />
                        <span className="block text-[11px] font-semibold text-slate-500">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวาง</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">(PDF/PNG/JPG ขนาดไม่เกิน 10MB)</span>
                      </label>
                    ) : (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-emerald-800 m-0 truncate">{releaseFile.fileName}</p>
                            <p className="text-[10px] text-emerald-600 m-0">{fmtBytes(releaseFile.size)}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => setReleaseFile(null)} aria-label="ลบไฟล์แนบ"
                          className="shrink-0 w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 cursor-pointer flex items-center justify-center transition">
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    )}
                  </div>
                  {error && <p className="text-[11px] font-semibold text-red-500 m-0">{error}</p>}
                </div>
              </div>

              <div className="px-5 sm:px-6 py-4 border-t border-slate-100">
                <button type="button" onClick={submit} disabled={!canSubmit}
                  className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-[0_4px_14px_rgba(124,58,237,0.25)] transition cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  ยืนยันการยินยอมให้เปลี่ยนสถานที่ฝึกงาน
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
    </div>
  );
};

export default PublicRelocationApprovalPage;
