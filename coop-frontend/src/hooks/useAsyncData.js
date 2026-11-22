import { useCallback, useEffect, useRef, useState } from 'react';

const isCanceled = (error) =>
  error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError' || error?.name === 'AbortError';

/**
 * ดึงข้อมูลแบบปลอดภัยต่อ Race Condition + มีสถานะโหลด/ผิดพลาด/ลองใหม่ในที่เดียว
 *
 * - fetcher(signal): ฟังก์ชัน async คืนข้อมูล (ส่ง signal ให้ axios: api.get(url, { signal }))
 * - key: สตริงที่เปลี่ยนเมื่อต้องดึงใหม่ (เช่น แท็บ/ตัวกรอง/หน้า) — เปลี่ยนแล้ว loading = true ทันทีในเรนเดอร์เดียวกัน
 *   (ไม่มีเฟรมที่เห็น Empty State หลอก) และ Request เดิมที่ค้างอยู่ถูก abort ผลของแท็บเก่าจึงไม่เขียนทับแท็บปัจจุบัน
 * - onSuccess(data): เรียกเฉพาะเมื่อผลยังเป็นของ key ปัจจุบัน (ใช้เซ็ต state เดิมของหน้า)
 * - enabled=false: ยังไม่ดึง (loading = false)
 * loading จะกลายเป็น false เสมอเมื่อ Request จบ ไม่ว่าสำเร็จหรือล้มเหลว (ไม่ค้าง "กำลังโหลด..." )
 */
export default function useAsyncData(fetcher, key, { enabled = true, onSuccess } = {}) {
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState({ token: null, error: null });
  const fetcherRef = useRef(fetcher);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    fetcherRef.current = fetcher;
    onSuccessRef.current = onSuccess;
  });

  const token = `${key}#${nonce}`;

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    (async () => {
      try {
        const data = await fetcherRef.current(controller.signal);
        if (controller.signal.aborted) return;
        onSuccessRef.current?.(data);
        setSettled({ token, error: null });
      } catch (error) {
        if (controller.signal.aborted || isCanceled(error)) return;
        console.error('useAsyncData:', error);
        setSettled({ token, error });
      }
    })();
    return () => controller.abort();
  }, [token, enabled]);

  const done = settled.token === token;
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return {
    loading: enabled && !done,
    error: enabled && done ? settled.error : null,
    reload,
  };
}
