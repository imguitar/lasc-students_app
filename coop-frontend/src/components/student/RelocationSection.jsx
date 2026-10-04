import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import RelocationStepper, { RELOCATION_STATUS_LABEL } from '../RelocationStepper';
import { getUploadUrl } from '../../utils/fileUrl';
import { QRCodeCanvas } from 'qrcode.react';
import { ArrowRightLeft, Check, Copy, Download, QrCode } from 'lucide-react';

const fileUrl = getUploadUrl;

// การ์ดคำร้องขอเปลี่ยนสถานที่ฝึกงาน + ลิงก์ไปหน้าฟอร์มเต็มจอ — ใช้ในหน้า My Requests
const RelocationSection = ({ request, daysTrained = 0, items: itemsProp }) => {
  const navigate = useNavigate();
  const [itemsState, setItemsState] = useState([]);
  const [copied, setCopied] = useState(false);

  // รับ items จาก parent ได้ (หน้า My Requests fetch รวมแล้ว) — ไม่ส่งมาก็ fetch เอง
  const items = itemsProp ?? itemsState;
  useEffect(() => {
    if (itemsProp) return;
    api.get('/relocations').then((res) => setItemsState(res.data?.data || [])).catch(() => {});
  }, [itemsProp]);

  // แสดงเฉพาะนักศึกษาที่ "ออกฝึกงานแล้ว" — สถานะชุดเดียวกับที่ backend ใช้เช็คกำลังฝึกงาน
  const INTERNING_STATUSES = ['ออกฝึกงาน', 'กำลังออกฝึกงาน'];
  const interning = INTERNING_STATUSES.includes(String(request?.status || '').trim());

  // คำร้องที่ยังไม่สิ้นสุด (หรือ completed ล่าสุด) ของ internship request นี้
  const mine = request ? items
    .filter((r) => Number(r.internship_request_id) === Number(request.id))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : [];
  const active = mine.find((r) => r.status !== 'rejected') || null;
  const lastRejected = !active && mine[0]?.status === 'rejected' ? mine[0] : null;

  if (!request) return null;
  // ไม่ออกฝึกงาน → ซ่อนทั้งการ์ด (ยกเว้นมี relocation ค้างให้ติดตามสถานะต่อได้)
  if (!interning && !active) return null;
  const approvalLink = active?.company_token
    ? `${window.location.origin}/coop/public/relocation-approval/${active.company_token}`
    : '';

  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-bold text-slate-900 m-0 flex items-center gap-2">
          <ArrowRightLeft className="w-4.5 h-4.5 text-purple-600" style={{ width: 18, height: 18 }} />
          คำร้องขอเปลี่ยนสถานที่ฝึกงาน
        </h3>
        {active && (
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${active.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60' : 'bg-violet-50 text-violet-600 border border-violet-200/60'}`}>
            {RELOCATION_STATUS_LABEL[active.status] || active.status}
          </span>
        )}
      </div>
      <div className="h-1 w-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full mt-2 mb-4" />

      {active ? (
        <>
          <div className="rounded-xl bg-slate-50/70 border border-slate-100 p-3.5 mb-4">
            <p className="text-xs text-slate-500 m-0">
              ขอย้ายไป <span className="font-semibold text-slate-800">{active.new_company_name}</span>
              {' '}• ยื่นเมื่อ {new Date(active.created_at).toLocaleDateString('th-TH')}
            </p>
          </div>
          <RelocationStepper status={active.status} />

          {/* การ์ดลิงก์/QR สำหรับสถานประกอบการเดิม (ใช้ได้ครั้งเดียว) */}
          {active.status === 'submitted_waiting_company' && active.company_token && (
            <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
              <p className="text-xs font-bold text-violet-900 m-0 flex items-center gap-1.5">
                <QrCode style={{ width: 14, height: 14 }} className="shrink-0" />
                ลิงก์และ QR Code สำหรับสถานประกอบการเดิม
              </p>
              <p className="text-[11px] text-violet-700 mt-1 mb-3 leading-relaxed">
                เปิด QR ให้ผู้มีอำนาจสแกน หรือคัดลอกลิงก์ส่งให้ลงนามยินยอมออนไลน์ — ลิงก์ใช้ได้ครั้งเดียวและจะหมดอายุทันทีเมื่อลงนาม
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="bg-white p-2.5 rounded-xl border border-violet-100 shadow-sm shrink-0">
                  <QRCodeCanvas value={approvalLink} size={120} />
                </div>
                <div className="w-full min-w-0">
                  <div className="flex items-stretch gap-1.5">
                    <input
                      readOnly
                      value={approvalLink}
                      onFocus={(e) => e.target.select()}
                      className="flex-1 min-w-0 h-9 px-3 text-[11px] text-slate-600 bg-white border border-violet-200 rounded-lg focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(approvalLink);
                          setCopied(true); setTimeout(() => setCopied(false), 1800);
                        } catch { /* noop */ }
                      }}
                      className="shrink-0 inline-flex items-center gap-1 px-3 h-9 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold border-none cursor-pointer transition-colors"
                    >
                      {copied ? <Check style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
                      {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
                    </button>
                  </div>
                  <p className="text-[10px] text-violet-500 mt-1.5 m-0">หรือพิมพ์ QR แนบไปกับหนังสือส่งตัวกลับเพื่อให้บริษัทสแกนลงนาม</p>
                </div>
              </div>
            </div>
          )}

          {active.status === 'completed' && active.new_dispatch_letter_file && (
            <a
              href={fileUrl(active.new_dispatch_letter_file)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold no-underline transition-colors"
            >
              <Download style={{ width: 14, height: 14 }} />
              ดาวน์โหลดหนังสือส่งตัวนักศึกษาฉบับใหม่ (PDF)
            </a>
          )}
        </>
      ) : (
        <>
          {lastRejected && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5 mb-3">
              <p className="text-xs font-semibold text-red-600 m-0">คำร้องก่อนหน้าไม่ได้รับอนุมัติ</p>
              {(lastRejected.advisor_comment || lastRejected.admin_comment) && (
                <p className="text-[11px] text-red-500 mt-0.5 m-0">{lastRejected.advisor_comment || lastRejected.admin_comment}</p>
              )}
            </div>
          )}
          <p className="text-xs text-slate-500 m-0">
            ต้องการยื่นเรื่องขอเปลี่ยนสถานที่ฝึกงาน?{' '}
            <button
              type="button"
              onClick={() => navigate('/dashboard/relocation-request')}
              className="text-purple-700 font-bold underline underline-offset-2 hover:text-purple-900 bg-transparent border-0 cursor-pointer p-0 text-xs"
            >
              คลิกที่นี่
            </button>
          </p>
          <p className="text-[10px] text-slate-400 mt-1.5 m-0">ฝึกสะสมแล้ว {daysTrained} วัน — แบบฟอร์มบันทึกข้อความจะดึงข้อมูลสถานที่เดิมมาให้อัตโนมัติ</p>
        </>
      )}
    </div>
  );
};

export default RelocationSection;
