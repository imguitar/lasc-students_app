# แก้ไขปัญหา Blob URL เปิด PDF ไม่ได้ — "ไม่สามารถโหลดเอกสาร PDF"

**วันที่:** 3 ตุลาคม 2026
**สถานะ:** ✅ แก้ไขเรียบร้อย — Build ผ่าน

---

## Root Cause

ระบบเก็บเอกสารเป็น `data:application/pdf;base64,...` ในฐานข้อมูล (ไม่มี backend endpoint สำหรับ serve ไฟล์) ฝั่ง frontend แปลง dataUrl → Blob URL เพื่อเปิดในแท็บใหม่ แต่ฟังก์ชันแปลงเดิมมีช่องโหว่:

1. **`atob()` พังเมื่อ base64 มี whitespace/newline** — base64 ที่อ่านจาก DB (LONGTEXT / JSON) อาจมี line break หรือ space แทรก `atob` จะ throw ทันที → โค้ดเดิม fallback คืน dataUrl ดิบ หรือผลิต Blob ว่าง/เสีย
2. **ไม่รองรับ dataUrl ที่ไม่ใช่ base64** — payload แบบ percent-encoded (`data:application/pdf,%PDF-...`) ถูกส่งให้ `atob` ตรงๆ → ล้มเหลว
3. **Blob เสียแต่ยังถูกเปิด** — เมื่อแปลงไม่สำเร็จโค้ดเดิมยังเปิด blob URL ที่มีเนื้อหาเสีย → PDF viewer แสดง "ไม่สามารถโหลดเอกสาร PDF"
4. **โค้ดแปลงซ้ำ 3 ที่ไม่เท่ากัน** — `documentViewer.js` + copy ใน `RequestDetailsPage.jsx` และ `StudentDetailsPage.jsx` มี logic แปลงคนละแบบ (split(',') ตัดตำแหน่งแรกซึ่งพังถ้า header ซับซ้อน) ทำให้พฤติกรรมไม่ consistent ระหว่างหน้า
5. **revoke เร็วเกิน** — หาก `URL.revokeObjectURL` ถูกเรียกก่อน viewer โหลดเสร็จ → viewer เห็น URL ตายแล้ว (ตอนนี้หน่วง 60 วินาที)

**หมายเหตุ Backend:** ตรวจสอบแล้วไม่มี route ใด serve ไฟล์ binary — ทุกเอกสารมาจาก `data:` URL ใน DB ผ่าน JSON API เดิม จึงไม่ต้องตั้ง `Content-Type: application/pdf` ฝั่ง backend (ถ้าอนาคตย้ายไป serve ไฟล์จริง ให้ใช้ `res.sendFile` + `Content-Disposition: inline`)

## Files Modified

| ไฟล์ | การแก้ไข |
|---|---|
| `coop-frontend/src/utils/documentViewer.js` | เขียน `dataUrlToBlobUrl` ใหม่ให้ robust: หา comma ตำแหน่งแรกด้วย `indexOf`, ตรวจ `;base64` ใน header, **strip whitespace ก่อน `atob`**, รองรับ percent-encoded payload, parse mime ได้ทั้ง `data:mime` และ `data:mime;base64`, คืน `''` เมื่อแปลงล้มเหลว (ไม่เปิดแท็บเสีย), ป้องกัน input ที่ไม่ใช่ string (เช่น object) |
| `coop-frontend/src/pages/Admin/Shared/RequestDetailsPage.jsx` | ลบ local copy ของ `dataUrlToBlobUrl`/`handleDownloadFile` แล้ว import จาก util กลาง (`downloadDocument`) |
| `coop-frontend/src/pages/Admin/Shared/StudentDetailsPage.jsx` | เหมือนกัน — ใช้ util กลางทั้งหมด |

## จุดที่ยังเหมือนเดิม (ถูกต้องแล้ว)

- ทุกหน้าที่เปิดเอกสาร (`DashboardPage`, `MyRequestsPage`, `PublicRequestPage`, `StudentNotificationsPage`, `AdminNotificationsPage`) ใช้ `openDocumentInNewTab`/`downloadDocument` จาก util กลางอยู่แล้ว — ได้รับประโยชน์จากการแก้นี้ทันทีโดยไม่ต้องแก้ไฟล์
- `URL.revokeObjectURL` หน่วง 60 วินาทีทั้ง open และ download
- มือถือเปิดผ่าน `<a target="_blank">` ใน user gesture เดียวกัน (ไม่โดน popup blocker)

## Verification Steps

### Desktop

1. `npm run dev` → login นักศึกษา → หน้าแดชบอร์ด/คำร้องของฉัน
2. กดไอคอนดูเอกสาร (หนังสือส่งตัว/หนังสือขออนุเคราะห์) → **PDF ต้องเปิดในแท็บใหม่และแสดงเนื้อหาได้**
3. กดปุ่มดาวน์โหลด → ไฟล์ `.pdf` ต้องเปิดได้ใน PDF reader ภายนอก
4. Admin: `/coop/admin-dashboard` → รายการคำร้อง → เมนู ⋮ → ดูเอกสาร

### ตรวจความถูกต้องของ Blob (DevTools Console)

```js
// วางใน console ขณะอยู่หน้าที่มีเอกสาร
const du = '<< dataUrl จาก API >>';
const i = du.indexOf(',');
const bytes = atob(du.slice(i + 1).replace(/\s/g, ''));
bytes.slice(0, 5);   // ต้องขึ้นต้น "%PDF-"
bytes.length;        // ต้อง > 0
```

### ทดสอบแท็บใหม่ + Error กรณีเอกสารเสีย

- เปิดแท็บ `blob:http://localhost:5173/...` แล้ว refresh หน้าเดิม → เอกสารต้องยังแสดงได้ (revoke 60s)
- ถ้า record ใน DB มี dataUrl เสียจริง (truncate/mojibake) → util คืน `''` และ **ไม่เปิดแท็บว่าง** แล้ว (log error ใน console) — ตรวจ record นั้นใน DB แทน

### Mobile

- เปิด `http://<LAN-IP>:5173/coop` จากมือถือ → กดดูเอกสาร → PDF เปิดในแท็บใหม่/แอปอ่าน PDF
- Modal รายละเอียดคำร้อง (admin/advisor) บนมือถือ → แสดงปุ่ม "เปิดดูเอกสารในแท็บใหม่" แทน iframe

## Issues Found

- ไม่สามารถยืนยันตัวอย่าง record ที่เสียได้จากฝั่งโค้ด — ถ้าหลังแก้แล้วยังเจอเอกสารบางฉบับเปิดไม่ได้ ให้ตรวจ dataUrl ของ record นั้นใน DB ว่าถูกต้อง (ขึ้นต้น `data:application/pdf;base64,` + decode แล้วขึ้น `%PDF-`) เพราะอาจเสียตั้งแต่ตอนบันทึก
- บิลด์เตือน chunk >500KB (มีอยู่ก่อน ไม่เกี่ยวกับ fix นี้)
