import { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, PenLine } from 'lucide-react';

// Digital Signature Pad — canvas รองรับเมาส์ + ทัชสกรีน (Pointer Events)
// onChange(dataUrl|null) คืน PNG data-url เมื่อมีลายเซ็น, null เมื่อว่าง
const SignaturePad = ({ onChange, height = 160, label = 'ลงลายมือชื่อที่นี่' }) => {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const getCtx = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e293b';
    return ctx;
  };

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const w = parent ? parent.clientWidth : 300;
    // รักษา pixel data เดิมตอน resize
    const prev = hasInkRef.current ? canvas.toDataURL() : null;
    canvas.width = w;
    canvas.height = height;
    if (prev) {
      const img = new Image();
      img.onload = () => canvas.getContext('2d').drawImage(img, 0, 0);
      img.src = prev;
    }
  }, [height]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e) => {
    const ctx = getCtx();
    if (!ctx) return;
    e.preventDefault();
    drawingRef.current = true;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const draw = (e) => {
    if (!drawingRef.current) return;
    const ctx = getCtx();
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (!hasInkRef.current) {
      hasInkRef.current = true;
      setHasInk(true);
    }
  };

  const endDraw = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (hasInkRef.current) onChange?.(canvasRef.current.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas?.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    hasInkRef.current = false;
    setHasInk(false);
    onChange?.(null);
  };

  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 overflow-hidden">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none cursor-crosshair bg-white"
          style={{ height }}
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
        />
        {!hasInk && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <PenLine className="w-6 h-6 text-slate-300 mb-1.5" />
            <span className="text-xs text-slate-400">{label}</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-100 bg-slate-50/70">
        <span className="text-[10px] text-slate-400">ใช้นิ้วหรือเมาส์ลากเพื่อเซ็นชื่อ</span>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-red-500 bg-transparent border-0 cursor-pointer py-0.5"
        >
          <Eraser className="w-3.5 h-3.5" /> ล้าง
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;
