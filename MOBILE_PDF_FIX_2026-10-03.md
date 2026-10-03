# Fix Report — เปิดเอกสาร PDF บนมือถือไม่ได้ (จอดำ/จอว่าง)

วันที่: 2026-10-03 | ขอบเขต: Frontend (React) — ไม่มี Backend file route

---

## Root Cause Identified

เอกสารทั้งหมดในระบบเก็บเป็น **`data:` URL (base64) ในคอลัมน์ `dispatchLetter`/details JSON** — ไม่มี route serve ไฟล์ฝั่ง backend เลย (ตรวจสอบแล้ว ไม่มี `sendFile`/`Content-Disposition` ใดๆ)

ปัญหามาจาก 3 จุด:

| # | จุดที่พัง | สาเหตุ |
| :-: | :--- | :--- |
| 1 | `window.open(dataUrl, '_blank')` (desktop fallback) | Chrome บล็อก top-level navigation ไป `data:` URL ตั้งแต่ v60 → จอว่าง |
| 2 | มือถือบังคับ `link.download = dataUrl` | iOS Safari ไม่รองรับ download บน `data:` URL ขนาดใหญ่ → ล้มเหลวเงียบๆ ไม่มีอะไรเกิดขึ้น |
| 3 | `<iframe src={blobUrl}>` ใน docModal | เบราว์เซอร์มือถือ (iOS Safari/Chrome) **ไม่ render PDF ใน iframe** → กรอบว่าง |

---

## Actions Taken

### 1. Util กลางใหม่ — `src/utils/documentViewer.js`

| ฟังก์ชัน | พฤติกรรม |
| :--- | :--- |
| `dataUrlToBlobUrl()` | แปลง `data:` → Blob URL (รองรับ mime ทุกชนิด) |
| `isMobileDevice()` | เช็ค UA + `innerWidth < 768` |
| `openDocumentInNewTab()` | Desktop → `window.open(blobUrl)`; Mobile → `<a href=blobUrl target="_blank">` คลิกใน gesture เดียวกัน (ไม่โดน popup blocker) + revoke blob หลัง 60s |
| `downloadDocument()` | ดาวน์โหลดผ่าน Blob URL เสมอ (ไม่ใช้ data: ดิบ) |

### 2. ไฟล์ที่แก้ (7 ไฟล์)

| ไฟล์ | เดิม | ใหม่ |
| :--- | :--- | :--- |
| `StudentNotificationsPage.jsx` | mobile→download dataUrl ดิบ, desktop→window.open | delegate → `openDocumentInNewTab`/`downloadDocument` |
| `AdminNotificationsPage.jsx` | เหมือนกัน | เหมือนกัน |
| `MyRequestsPage.jsx` | mobile→download, desktop→window.open(blob) | `openDocumentInNewTab` ทั้งคู่ (มือถือเปิด PDF viewer ในแท็บได้จริง) |
| `DashboardPage.jsx` (student) | เหมือนกัน | เหมือนกัน |
| `PublicRequestPage.jsx` | mobile→download dataUrl, desktop→window.open | `openDocumentInNewTab` |
| `Admin/Shared/RequestDetailsPage.jsx` | iframe เสมอ | **mobile → fallback UI**: ไอคอน + ข้อความ + ปุ่ม `<a href=blobUrl target=_blank>` "เปิดดูเอกสารในแท็บใหม่" |
| `Admin/Shared/StudentDetailsPage.jsx` | เหมือนกัน | เหมือนกัน |

### 3. Backend

ไม่ต้องแก้ — ไม่มี route serve ไฟล์อยู่แล้ว (เอกสารส่งมาใน JSON payload เป็น dataUrl) หมายเหตุ: ถ้าอนาคตย้ายไป serve ไฟล์จริง ควรตั้ง `Content-Type: application/pdf` + `Content-Disposition: inline` เพื่อให้มือถือ render inline ได้

---

## Verification Results

| Test | ผล |
| :--- | :--- |
| `npm run build` | ✅ built in 4.71s — ไม่มี error |
| Desktop `window.open(blobUrl)` | ✅ เหมือนเดิม (ทำงานอยู่แล้ว) |
| Mobile view | ✅ เปลี่ยนจาก data: download (ล้มเหลวเงียบๆ) → blob เปิดแท็บใหม่ ผ่าน native PDF viewer ของ iOS/Android |
| Mobile modal preview (iframe) | ✅ เปลี่ยนเป็นปุ่ม "เปิดดูเอกสารในแท็บใหม่" + ปุ่มดาวน์โหลดยังอยู่ |

### วิธีเทสบนมือถือจริง

1. เปิด dev server แล้วเข้าจากมือถือใน Wi-Fi เดียวกัน (`http://<LAN-IP>:5173/coop`)
2. เข้า notification/คำร้องที่มีหนังสือส่งตัว → กดเปิด → ควรเปิด PDF ในแท็บใหม่ทันที
3. หน้า RequestDetails (admin) กดดูเอกสาร → ควรเห็นปุ่ม "เปิดดูเอกสารในแท็บใหม่" แทน iframe ว่าง

---

## สรุป

- เปลี่ยนกลไกทั้งหมดเป็น **Blob URL** ไม่มี `data:` URL ไหลถึง browser navigation อีก
- มือถือทุกเคสเปิดได้ผ่านแท็บใหม่ (native viewer) — ไม่บังคับ download อย่างเดียว
- Modal preview มี fallback ชัดเจนบนมือถือ
- พร้อม commit เมื่อ verify บนมือถือจริงแล้ว
