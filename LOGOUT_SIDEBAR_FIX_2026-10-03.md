# แก้ไขปุ่มออกจากระบบใน Sidebar — Drawer Auto-close & Modal z-index

**วันที่:** 2026-10-03

## Root Cause

พบปัญหา 2 ชั้นซ้อนกัน:

1. **Drawer ไม่ปิด:** `onLogout` ใน `AppSidebar.jsx` แค่ dispatch event `request-logout-confirm` — ไม่เคยสั่ง `setIsMenuOpen(false)` จึงเปิด Modal ทั้งที่ Drawer ยังค้าง
2. **Event ไม่ถึงปุ่ม:** `GlobalAlertModalProvider` ดัก `.logout-btn` ด้วย **capture phase + `stopPropagation()`** ที่ document — ต่อให้ใส่ `setIsMenuOpen(false)` ใน `onClick` ก็ไม่ถูกเรียก
3. **z-index ผิดลำดับ:** Modal ยืนยันใช้ `z-[100]` ต่ำกว่า `.mobile-menu-btn` (1090), `.mobile-top-navbar` (1080), `.sidebar` (1050) ทำให้ Navbar/ปุ่ม Burger ทับ Modal ได้แม้ Drawer ปิดแล้ว

## Files Modified

### 1. `coop-frontend/src/components/AppSidebar.jsx`

- **`onLogout` (บรรทัด ~77):** เพิ่ม `setIsMenuOpen(false)` ก่อน dispatch — Drawer + overlay หุบทันทีก่อน Modal เด้ง
- **ปุ่ม logout:** เพิ่ม `data-skip-logout-confirm="1"` — ข้ามตัวจับ capture ของ `GlobalAlertModalProvider` (convention `skipLogoutConfirm` ที่มีอยู่แล้ว) ทำให้ `onClick` ทำงานจริงและ dispatch event ครั้งเดียว

```jsx
const onLogout = (e) => {
  e.preventDefault();
  e.stopPropagation();
  setIsMenuOpen(false);                                  // ← ปิด Drawer ก่อน
  window.dispatchEvent(new CustomEvent('request-logout-confirm'));
};
```

### 2. `coop-frontend/src/components/UserProfileMenu.jsx`

- **Modal backdrop (บรรทัด 316):** `z-[100]` → **`z-[2000]`** — เหนือทุกชั้นของระบบ (สูงสุดเดิม: `.mobile-menu-btn` 1090 / `.modal-overlay` 1100)

## Logic Applied

| State | Trigger | ผลลัพธ์ |
|---|---|---|
| `isMenuOpen` | กด "ออกจากระบบ" | `false` → `.sidebar` ถอด class `open` → สไลด์หุบซ้าย (`left: 0 → -280px`) + `.sidebar-overlay` หาย |
| `isLogoutModalOpen` | event `request-logout-confirm` | `true` → Modal แสดงบนฉากเทาล้วน |
| กด "ยกเลิก" / คลิก backdrop | `handleCancelLogout` | `setIsLogoutModalOpen(false)` เท่านั้น — ไม่มีอะไรเปิด Sidebar คืน หน้ากลับสู่แดชบอร์ดปกติ |
| กด "ออกจากระบบ" | `handleConfirmLogout` | flow เดิมครบ: clear storage + cookie → `logout()` (sso) — ไม่เปลี่ยน behavior |

## z-index Layering (หลังแก้)

```
2000  Logout modal backdrop + card (UserProfileMenu portal → body)
1100  .modal-overlay (RequestDetailsPage)
1090  .mobile-menu-btn
1080  .mobile-top-navbar
1050  .sidebar (mobile drawer)
1040  .sidebar-overlay
```

## ขอบเขตผลกระทบ

- `AppSidebar` เป็น shared component — `AdminSidebar`/`AdvisorSidebar`/`StudentSidebar` เป็น wrapper ส่ง props ตรง — **23 หน้า** ทั้งหมดผูก `setIsMenuOpen={setIsMenuOpen}` ครบ ไม่มีหน้าไหนส่ง default ว่าง
- `UserProfileMenu` render modal ผ่าน `createPortal` → `document.body` — fix เดียวครอบคลุมทุก role (student / advisor / admin)

## Verification

- [x] กด "ออกจากระบบ" ขณะ Drawer เปิด → `isMenuOpen = false` → Sidebar + overlay หุบทันที → Modal เด้งกลางจอ
- [x] `data-skip-logout-confirm` ทำให้ `onClick` ถูกเรียกจริง + กัน double-dispatch
- [x] กด "ยกเลิก" / คลิก backdrop → ปิดเฉพาะ Modal, Sidebar ไม่เด้งคืน
- [x] Modal `z-[2000]` เหนือ Navbar (1080), menu-btn (1090), sidebar (1050) — ไม่มีชั้นใดทับ
- [x] `npm run build` ผ่าน (exit 0)

*หมายเหตุ: ยืนยันจาก code path, CSS layering และ build — ยังไม่ได้ทดสอบจริงบนเบราว์เซอร์*
