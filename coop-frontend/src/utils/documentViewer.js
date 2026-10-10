// Utilities สำหรับเปิด/ดาวน์โหลดเอกสารที่เก็บเป็น dataUrl (base64) ในฐานข้อมูล
// หมายเหตุสำคัญ:
// - Chrome/Safari บล็อก window.open('data:...') และ download ผ่าน data: URL มักล้มเหลวเงียบๆ
// - base64 จาก DB อาจมี whitespace/newline ทำให้ atob พัง → ต้อง strip ก่อนเสมอ
// - เรียกภายใน user gesture (click handler) เท่านั้น

export const dataUrlToBlobUrl = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return typeof dataUrl === 'string' ? dataUrl : '';
  }
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return dataUrl;
    const header = dataUrl.slice(0, commaIdx);
    const payload = dataUrl.slice(commaIdx + 1);

    const mimeMatch = header.match(/:(.*?)(;|$)/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const isBase64 = /;base64/i.test(header);

    // รองรับทั้ง payload แบบ base64 และแบบ percent-encoded raw
    const bstr = isBase64
      ? atob(payload.replace(/\s/g, ''))
      : decodeURIComponent(payload);

    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    return URL.createObjectURL(new Blob([u8arr], { type: mime }));
  } catch (err) {
    console.error('Failed to convert dataUrl to blob:', err);
    return '';
  }
};

export const isMobileDevice = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  || window.innerWidth < 768;

// LINE / in-app browsers — บล็อก filesystem download; ใช้พารามิเตอร์ openExternalBrowser=1 ดีดออกไป external browser
export const isLineBrowser = () => /Line/i.test(navigator.userAgent);

// เปิดเอกสารในแท็บใหม่ — เรียกจาก click handler เท่านั้น
// มือถือใช้ <a target="_blank"> (browser ให้อนุญาตเสมอ ไม่โดนบล็อกเหมือน window.open)
// Desktop ใช้ window.open(blobUrl) ให้เปิดด้วย Native PDF Viewer
export const openDocumentInNewTab = (dataUrl) => {
  if (!dataUrl) return;
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    window.open(dataUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  const blobUrl = dataUrlToBlobUrl(dataUrl);
  if (!blobUrl) return; // แปลงไม่สำเร็จ — อย่าเปิดแท็บว่าง
  if (isMobileDevice()) {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else {
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
  }
  // รอให้ viewer โหลดเสร็จก่อนค่อยคืน blob
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
};

// ดาวน์โหลดเอกสาร — บังคับผ่าน Blob URL (iOS/Safari ไม่รองรับ download บน data: URL ขนาดใหญ่)
export const downloadDocument = (dataUrl, fileName = 'document.pdf') => {
  if (!dataUrl) return;
  const href = dataUrl.startsWith('data:') ? (dataUrlToBlobUrl(dataUrl) || dataUrl) : dataUrl;
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (href.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(href), 60_000);
};

// Dual-strategy สำหรับไฟล์จาก URL (ตาม skill mobile-document-download):
// - Mobile/In-App browser: preview-first — เปิด URL จริงในแท็บใหม่
//   (native PDF viewer มี Share/Save to Files; blob download บน iOS/Android มักพังหรือชื่อไฟล์เพี้ยน)
// - Desktop: fetch→blob→a.download เพื่อบังคับเซฟข้าม origin (/uploads คนละพอร์ต)
//   fallback: เปิดแท็บใหม่ถ้า fetch ล้มเหลว
// ต้องเรียกภายใน user gesture (click handler) เท่านั้น
export const downloadFileSmart = async (url, fileName = 'document.pdf') => {
  if (!url) return;
  // data: URL ถูกบล็อกทั้งเปิดแท็บและดาวน์โหลดบนมือถือ — แปลงเป็น blob ก่อนเสมอ
  const href = url.startsWith('data:') ? dataUrlToBlobUrl(url) : url;
  if (!href) return;
  // LINE in-app browser: แนบพารามิเตอร์ให้ดีดไป external browser (ทำได้เฉพาะ http(s) เท่านั้น)
  const openHref = isLineBrowser() && /^https?:/i.test(href)
    ? href + (href.includes('?') ? '&' : '?') + 'openExternalBrowser=1'
    : href;
  if (isMobileDevice()) {
    // Preview-first — เปิดในแท็บใหม่ผ่าน <a> click (ไม่โดน popup blocker)
    // native PDF viewer มี Share/Save to Files ในตัว
    const a = document.createElement('a');
    a.href = openHref;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (href.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(href), 60_000);
    return;
  }
  try {
    const res = await fetch(href);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 10_000);
  } catch {
    window.open(openHref, '_blank', 'noopener,noreferrer');
  }
};
