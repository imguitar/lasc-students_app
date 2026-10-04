import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';
import SignaturePad from '../../components/SignaturePad';
import { getUploadUrl } from '../../utils/fileUrl';
import { ArrowRightLeft, Building2, CheckCircle2, FileText, Loader2, MapPin, PenLine, ShieldCheck, XCircle } from 'lucide-react';

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get(`/public/relocations/token/${token}`)
      .then((res) => setData(res.data?.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const canSubmit = signerName.trim() && signature && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/public/relocations/token/${token}/approve`, {
        signer_name: signerName,
        signer_position: signerPosition,
        signature_data_url: signature
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
                {field('ย้ายไป', data.new_company_name)}
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

                {/* ปลายทาง */}
                <div className="mt-3 rounded-xl bg-violet-50/70 border border-violet-100 p-3">
                  <p className="text-[10px] font-bold text-violet-800 m-0 flex items-center gap-1.5">
                    <Building2 style={{ width: 12, height: 12 }} /> สถานประกอบการแห่งใหม่
                  </p>
                  <p className="text-[11px] text-violet-900 font-semibold mt-1 m-0">{data.new_company_name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 m-0 flex items-start gap-1 leading-relaxed">
                    <MapPin style={{ width: 11, height: 11 }} className="mt-0.5 shrink-0" />{data.new_company_address}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 m-0">
                    {data.mentor_name
                      ? `หัวหน้าหน่วยงาน: ${data.mentor_name}${data.mentor_position ? ` (${data.mentor_position})` : ''}`
                      : `ผู้ประสานงาน: ${data.new_company_contact}`}
                  </p>
                </div>

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
