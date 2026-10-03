# ตรวจสอบและแก้ไขปัญหาไฟล์ดาวน์โหลดเสียหาย (Corrupted Download Inspection)

**วันที่:** 3 ตุลาคม 2026
**สถานะ:** ✅ แก้ไขเรียบร้อย — Build ผ่าน

---

## Root Cause

**ไฟล์ต้นฉบับในระบบ "ไม่เสีย" — ปัญหาอยู่ที่จังหวะ Frontend สั่งดาวน์โหลดผ่าน `data:` URL ดิบ**

### ผลตรวจไฟล์ต้นฉบับ (ขั้นที่ 1)

ระบบไม่มีไฟล์บนดิสก์เซิร์ฟเวอร์ — เอกสารทั้งหมดเก็บเป็น `data:` URL (base64) ในคอลัมน์ `dispatchLetter`/`details` (LONGTEXT) จึงตรวจความสมบูรณ์โดยถอด base64 จริงจาก DB:

| Record | ไฟล์ | Bytes หลัง decode | Signature | ผล |
|---|---|---|---|---|
| id=21 | `Screenshot....png` | 73,853 | `\x89PNG` + `IEND` ท้ายไฟล์ | ✅ สมบูรณ์ |
| id=23 | `หนังสือส่งตัว_6610014106.pdf` | 87 | `%PDF-1.4` + `%%EOF` ท้ายไฟล์ | ✅ สมบูรณ์ |
| id=21,23 | `studentPhoto`, `signature`, `companyResponse.signature` | 9K–138K | JPEG/PNG sig ถูก | ✅ สมบูรณ์ |

- base64 ทุกชิ้น **ไม่มี whitespace/ตัวอักษรผิด** (`bad chars: 0`)
- `express.json` limit = **50mb** — รับ payload base64 ใหญ่ได้ ไม่ truncate
- `dispatchLetter`/`details` เป็น `LONGTEXT` — ไม่ตัดข้อมูล

### จุดที่ทำไฟล์เสีย (ขั้นที่ 3)

**`PublicRequestPage.jsx` (หน้าบริษัทตอบรับ)** — ปุ่ม "ดาวน์โหลด" หนังสือขอความอนุเคราะห์ผูก `href` กับ **`data:` URL ดิบ** โดยไม่แปลงเป็น Blob:

```js
link.href = dispatchLetter.dataUrl;   // ← data: ยาวหลายหมื่นตัวอักษร
link.download = fileName;
```

พฤติกรรมนี้ทำไฟล์เสีย/เปิดไม่ได้ในหลายสถานการณ์:
- **Safari/iOS**: ไม่รองรับ `download` บน `data:` URL — ได้ไฟล์เสีย ไฟล์ว่าง หรือไฟล์ไร้ชื่อที่เปิดไม่ได้
- **Chrome**: `data:` URL ขนาดใหญ่มีโอกาสถูกตัด หรือถูก treat เป็น navigation แทน download
- ไฟล์ที่ "ดาวน์โหลดได้" อาจมีเนื้อหาเป็น HTML error page หรือ truncated base64 → โปรแกรมเปิดไม่ได้ = "เสียหายมาตั้งแต่แรก" จากมุมผู้ใช้

### จุดเสี่ยงรองที่แก้ไขพร้อมกัน

- **`StudentListPage.jsx`**: `dataUrlToBlob` ใช้ `atob(arr[1])` โดยไม่ strip whitespace (base64 จาก DB อาจมี newline → throw → ไฟล์เสีย) และ `URL.revokeObjectURL(url)` ทันทีหลัง click → Safari อาจยังไม่ได้ snapshot blob ทำไฟล์ว่าง
- **`documentViewer.js`** (แก้รอบก่อน): robust decode ครอบคลุมทุกหน้าที่ใช้ `downloadDocument`/`openDocumentInNewTab` อยู่แล้ว

### ขั้นที่ 2 (Backend Headers) — ไม่มีจุดให้แก้

ตรวจสอบแล้ว **ไม่มี endpoint ใด serve ไฟล์ binary** (`res.sendFile`/`res.download`/`res.json` ส่งไฟล์) — การดาวน์โหลดทั้งหมดเป็น client-side conversion จาก `data:` URL ที่มากับ JSON response ปกติ จึงไม่มีส่วน Content-Type/streaming ให้แก้ หากอนาคตเพิ่ม file route ให้ตั้ง `Content-Type: application/pdf` + `Content-Disposition: inline`

## Files Modified

| ไฟล์ | การแก้ไข |
|---|---|
| `coop-frontend/src/pages/Public/PublicRequestPage.jsx` | ปุ่มดาวน์โหลดหนังสือขอความอนุเคราะห์เปลี่ยนจาก `data:` URL ดิบ → `downloadDocument()` (Blob URL) — เหลือ 4 บรรทัด |
| `coop-frontend/src/pages/Admin/Dashboard/StudentListPage.jsx` | `dataUrlToBlob` เขียนใหม่ให้ robust: strip whitespace ก่อน `atob`, รองรับ non-base64 payload, try/catch คืน `null` แทน throw; `URL.revokeObjectURL` 3 จุดหน่วงเป็น 60 วินาที |

## Verification

### รันแล้ว (local)

- ถอด base64 จาก DB จริงทุก record → signature ถูกครบ (`%PDF-`, `\x89PNG`, `\xFF\xD8` JPEG, ปิดท้าย `%%EOF`/`IEND`)
- `npm run build` → ✓ built in 1.84s

### ขั้นทดสอบบนหน้าเว็บ

1. เปิดลิงก์ตอบรับบริษัท (`/coop/public/request/:id?responseToken=...`) → กด "ดาวน์โหลด" หนังสือขอความอนุเคราะห์ → ดับเบิลคลิกไฟล์ที่ได้ ต้องเปิดเนื้อหา PDF ได้สมบูรณ์
2. ทดสอบบน **Safari/iOS** (จุดที่พังเดิม) — ไฟล์ต้องเปิดได้ ไม่ใช่ไฟล์เสีย
3. Admin → หน้ารายชื่อนักศึกษา → ดาวน์โหลดสลิปเดี่ยว/Zip → เปิดรูปได้
4. DevTools Console ระหว่างโหลด — ไม่ควรเห็น `Failed to convert dataUrl to blob`

## Issues Found

- **record id=21**: `dispatchLetter` เป็น **รูป PNG ไม่ใช่ PDF** (admin แนบไฟล์ผิดประเภทตอนอัปโหลด) — ข้อมูลสมบูรณ์แต่เปิดด้วย PDF reader ไม่ได้ ถ้าผู้ใช้กดโหลดใบนี้จะได้ `.png` ตาม `fileName` จริง ไม่ใช่บั๊กของ pipeline
- **record id=23**: หนังสือส่งตัวเป็น PDF stub เพียง **87 bytes** (สร้างด้วย generator ตอนทดสอบ) — เปิดได้แต่แทบไม่มีเนื้อหา เป็นข้อมูลทดสอบ ไม่ใช่ไฟล์เสีย
