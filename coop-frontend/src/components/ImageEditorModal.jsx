import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  Button,
  Box,
  Typography,
  IconButton,
  Slider,
  GlobalStyles,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ScissorsIcon,
  ArrowPathIcon,
  SwatchIcon,
  XMarkIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import getCroppedImg, { getFilteredImg } from '../utils/canvasUtils';

const DEFAULT_FILTERS = { brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0 };

const FILTER_CONTROLS = [
  { key: 'brightness', label: 'ความสว่าง', min: 30, max: 200, unit: '%' },
  { key: 'contrast', label: 'คอนทราสต์', min: 30, max: 200, unit: '%' },
  { key: 'saturate', label: 'ความสดสี', min: 0, max: 200, unit: '%' },
  { key: 'grayscale', label: 'ขาวดำ', min: 0, max: 100, unit: '%' },
  { key: 'sepia', label: 'โทนเก่า (Sepia)', min: 0, max: 100, unit: '%' },
];

const buildFilterString = (f) =>
  `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) grayscale(${f.grayscale}%) sepia(${f.sepia}%)`;

const isDefaultFilters = (f) =>
  f.brightness === 100 && f.contrast === 100 && f.saturate === 100 && f.grayscale === 0 && f.sepia === 0;

// aspect = width/height — undefined = ครอปอิสระ
const ASPECT_PRESETS = [
  { label: 'อิสระ', value: undefined, hint: 'ครอปเองได้ทุกรูปแบบ — ระบบจะใช้สัดส่วนตามกรอบที่ลาก' },
  { label: '21:9', value: 21 / 9, hint: 'แนะนำสำหรับแบนเนอร์หน้าแรก — พอดีจอคอม/แล็ปท็อปแบบกว้างพิเศษ' },
  { label: '16:9', value: 16 / 9, hint: 'จอคอมและแล็ปท็อปทั่วไป — มาตรฐานวิดีโอ/การ์ดข่าว' },
  { label: '3:1', value: 3 / 1, hint: 'แถบแบนเนอร์เตี้ยกว้างมาก — เหมาะกับพื้นที่สูงจำกัด' },
  { label: '4:3', value: 4 / 3, hint: 'แท็บเล็ต/iPad แนวนอน — สมดุลระหว่างกว้างกับสูง' },
  { label: '1:1', value: 1 / 1, hint: 'มือถือ/รูปโปรไฟล์/โพสต์โซเชียล — เห็นเต็มทุกอุปกรณ์' },
];

const ImageEditorModal = ({ open, onClose, imageSrc, onSave, title = 'รายละเอียดรูปภาพ', defaultAspect }) => {
  const [activeTab, setActiveTab] = useState('crop');
  const [crop, setCrop] = useState(undefined);
  const [completedCrop, setCompletedCrop] = useState(null);
  const [aspect, setAspect] = useState(defaultAspect);
  const [rotation, setRotation] = useState(0);
  const [altText, setAltText] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const imgRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    if (open) {
      setActiveTab('crop');
      setCrop(undefined);
      setCompletedCrop(null);
      setAspect(defaultAspect);
      setRotation(0);
      setAltText('');
      setFilters(DEFAULT_FILTERS);
    }
  }, [open, imageSrc, defaultAspect]);

  const filterString = buildFilterString(filters);
  const filtersChanged = !isDefaultFilters(filters);

  const onImageLoad = (e) => {
    imgRef.current = e.currentTarget;
    // auto-เลือกกรอบครอบตามสัดส่วนเริ่มต้น (เช่น 21:9 ของแบนเนอร์) ทันทีที่ภาพโหลด
    if (aspect && !crop) applyAspect(aspect);
  };

  const applyAspect = (value) => {
    setAspect(value);
    if (!value || !imgRef.current) {
      setCrop(undefined);
      return;
    }
    // สร้าง crop กลางภาพให้ใหญ่สุดที่อัตราส่วนนั้นรับได้ (หน่วย %)
    const { width, height } = imgRef.current;
    const imgAspect = width / height;
    const w = imgAspect > value ? (90 * value) / imgAspect : 90;
    const h = imgAspect > value ? 90 : (90 * imgAspect) / value;
    setCrop({ unit: '%', width: w, height: h, x: (100 - w) / 2, y: (100 - h) / 2 });
  };

  const handleSave = async () => {
    try {
      let finalImage = imageSrc;
      if (completedCrop?.width && completedCrop?.height && imgRef.current) {
        const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
        const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
        const pixelCrop = {
          x: completedCrop.x * scaleX,
          y: completedCrop.y * scaleY,
          width: completedCrop.width * scaleX,
          height: completedCrop.height * scaleY,
        };
        finalImage = await getCroppedImg(
          imageSrc,
          pixelCrop,
          rotation,
          { horizontal: false, vertical: false },
          filtersChanged ? filterString : ''
        );
      } else if (filtersChanged) {
        finalImage = await getFilteredImg(imageSrc, filterString);
      }
      onSave({ image: finalImage, altText });
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const menuItems = [
    { id: 'crop', label: 'ครอบตัด / หมุน', icon: <ScissorsIcon style={{ width: 24, height: 24 }} /> },
    { id: 'filter', label: 'ปรับแสงและสี', icon: <SwatchIcon style={{ width: 24, height: 24 }} /> },
  ];

  return (
    <>
    <GlobalStyles styles={{
      '.ReactCrop': {
        maxWidth: '100%',
        maxHeight: '100%',
      },
      '.ReactCrop__crop-selection': {
        border: '2px solid rgba(255, 255, 255, 0.8) !important',
      },
      '.ReactCrop__crop-selection::before': {
        content: '""',
        position: 'absolute',
        top: '-6px', left: '-6px', right: '-6px', bottom: '-6px',
        backgroundImage: `
          radial-gradient(circle, #2374e1 5px, transparent 6px),
          radial-gradient(circle, #2374e1 5px, transparent 6px),
          radial-gradient(circle, #2374e1 5px, transparent 6px),
          radial-gradient(circle, #2374e1 5px, transparent 6px)
        `,
        backgroundPosition: '0 0, 100% 0, 0 100%, 100% 100%',
        backgroundSize: '12px 12px',
        backgroundRepeat: 'no-repeat',
        pointerEvents: 'none',
      }
    }} />
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          bgcolor: '#ffffff',
          color: '#111827',
          borderRadius: isMobile ? 0 : 2,
          height: isMobile ? '100%' : '85vh',
          maxHeight: isMobile ? '100%' : '800px',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: { xs: 1.5, md: 2 }, borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        <IconButton sx={{ visibility: 'hidden' }}><XMarkIcon style={{ width: 24, height: 24 }} /></IconButton>
        <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>{title}</Typography>
        <IconButton onClick={onClose} sx={{ color: '#6b7280', bgcolor: '#f3f4f6', '&:hover': { bgcolor: '#e5e7eb' } }}>
          <XMarkIcon style={{ width: 24, height: 24 }} />
        </IconButton>
      </Box>

      {/* Tab bar แนวนอน — ย้ายจาก sidebar ฝั่งซ้ายเพื่อไม่ให้เบียดพื้นที่ภาพบนมือถือ */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, p: 1, borderBottom: '1px solid #e5e7eb', bgcolor: '#ffffff', flexShrink: 0 }}>
        {menuItems.map((item) => (
          <Button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            startIcon={item.icon}
            sx={{
              color: activeTab === item.id ? '#6d28d9' : '#6b7280',
              bgcolor: activeTab === item.id ? '#f5f3ff' : 'transparent',
              px: 2.5,
              py: 1,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              '&:hover': { bgcolor: '#f3f4f6', color: '#111827' }
            }}
          >
            {item.label}
          </Button>
        ))}
      </Box>

      {/* Workspace — รูปภาพกินพื้นที่เต็มที่สุด */}
      <Box sx={{ flexGrow: 1, position: 'relative', bgcolor: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTab === 'crop' && (
          <>
            <Box sx={{ position: 'relative', flexGrow: 1, minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', p: { xs: 1, md: 2 } }}>
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imageSrc}
                  referrerPolicy="no-referrer"
                  onLoad={onImageLoad}
                  style={{ transform: `rotate(${rotation}deg)`, filter: filterString, maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                />
              </ReactCrop>
            </Box>
            <Box sx={{ p: { xs: 1.5, md: 2 }, bgcolor: '#ffffff', display: 'flex', flexDirection: 'column', gap: 1.5, borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflowX: 'auto', flexWrap: 'nowrap', py: 0.5, '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
                <Typography sx={{ color: '#6b7280', minWidth: 52, flexShrink: 0, fontSize: '0.85rem' }}>สัดส่วน</Typography>
                {ASPECT_PRESETS.map((p) => (
                  <Button
                    key={p.label}
                    size="small"
                    onClick={() => applyAspect(p.value)}
                    title={p.hint}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 999,
                      px: 1.5,
                      flexShrink: 0,
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      color: aspect === p.value ? '#fff' : '#6b7280',
                      bgcolor: aspect === p.value ? '#2374e1' : '#f3f4f6',
                      '&:hover': { bgcolor: aspect === p.value ? '#1a64c4' : '#e5e7eb' },
                    }}
                  >
                    {p.label}
                  </Button>
                ))}
              </Box>
              <Typography sx={{ color: '#9ca3af', fontSize: '0.72rem', mt: -0.5 }}>
                {ASPECT_PRESETS.find((p) => p.value === aspect)?.hint || 'เลือกสัดส่วนที่เหมาะกับหน้าจอเป้าหมาย'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography sx={{ color: '#6b7280', minWidth: 52, flexShrink: 0, fontSize: '0.85rem' }}>หมุน</Typography>
                <Slider
                  value={rotation}
                  min={0}
                  max={360}
                  step={1}
                  onChange={(e, rotation) => setRotation(rotation)}
                  sx={{ color: '#2374e1' }}
                />
                <IconButton onClick={() => setRotation(0)} disabled={rotation === 0} sx={{ color: '#6b7280', bgcolor: '#f3f4f6', p: 1 }} title="รีเซ็ตมุม">
                  <ArrowUturnLeftIcon style={{ width: 20, height: 20 }} />
                </IconButton>
                <IconButton onClick={() => setRotation((prev) => (prev + 90) % 360)} sx={{ color: '#111827', bgcolor: '#f3f4f6', p: 1 }} title="หมุน 90°">
                  <ArrowPathIcon style={{ width: 20, height: 20 }} />
                </IconButton>
              </Box>
            </Box>
          </>
        )}

        {activeTab === 'filter' && (
          <>
            <Box sx={{ position: 'relative', flexGrow: 1, minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', p: { xs: 1, md: 2 } }}>
              <img
                alt="Filter preview"
                src={imageSrc}
                referrerPolicy="no-referrer"
                style={{ filter: filterString, transform: `rotate(${rotation}deg)`, maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
              />
            </Box>
            <Box sx={{ p: { xs: 1.5, md: 2 }, bgcolor: '#ffffff', borderTop: '1px solid #e5e7eb', maxHeight: '45%', overflowY: 'auto', flexShrink: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ color: '#6b7280', fontWeight: 600 }}>ปรับแสงและสี</Typography>
                <Button
                  size="small"
                  startIcon={<ArrowUturnLeftIcon style={{ width: 14, height: 14 }} />}
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  disabled={!filtersChanged}
                  sx={{ textTransform: 'none', color: '#6b7280', fontSize: '0.8rem' }}
                >
                  รีเซ็ต
                </Button>
              </Box>
              {FILTER_CONTROLS.map((c) => (
                <Box key={c.key} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                  <Typography sx={{ color: '#6b7280', minWidth: 110, fontSize: '0.85rem', flexShrink: 0 }}>
                    {c.label}
                  </Typography>
                  <Slider
                    value={filters[c.key]}
                    min={c.min}
                    max={c.max}
                    step={1}
                    onChange={(e, v) => setFilters((prev) => ({ ...prev, [c.key]: v }))}
                    sx={{ color: '#2374e1' }}
                  />
                  <Typography sx={{ color: '#111827', minWidth: 48, fontSize: '0.8rem', textAlign: 'right', flexShrink: 0 }}>
                    {filters[c.key]}{c.unit}
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        )}
      </Box>

      {/* Bottom action bar — ตรึงล่างสุด ปุ่มไม่ทับกัน */}
      <Box sx={{ display: 'flex', gap: 1.5, p: { xs: 1.5, md: 2 }, borderTop: '1px solid #e5e7eb', bgcolor: '#ffffff', flexShrink: 0 }}>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{ bgcolor: '#f3f4f6', color: '#111827', fontWeight: 700, borderRadius: 2, textTransform: 'none', px: 3, '&:hover': { bgcolor: '#e5e7eb' } }}
        >
          ยกเลิก
        </Button>
        <Button
          variant="contained"
          fullWidth
          onClick={handleSave}
          sx={{ bgcolor: '#2374e1', color: '#fff', fontWeight: 700, borderRadius: 2, textTransform: 'none', '&:hover': { bgcolor: '#1a64c4' } }}
        >
          บันทึกรูปภาพ
        </Button>
      </Box>
    </Dialog>
    </>
  );
};

export default ImageEditorModal;
