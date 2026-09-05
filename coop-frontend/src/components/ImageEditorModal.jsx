import React, { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Slider,
  TextField,
  Divider,
  GlobalStyles,
} from '@mui/material';
import {
  ScissorsIcon,
  ArrowPathIcon,
  TagIcon,
  LanguageIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import getCroppedImg from '../utils/canvasUtils';

const ImageEditorModal = ({ open, onClose, imageSrc, onSave }) => {
  const [activeTab, setActiveTab] = useState('crop');
  const [crop, setCrop] = useState({ unit: '%', width: 80, height: 80, x: 10, y: 10 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [altText, setAltText] = useState('');
  const imgRef = useRef(null);

  const onImageLoad = (e) => {
    imgRef.current = e.currentTarget;
  };

  const handleSave = async () => {
    try {
      let finalImage = imageSrc;
      if ((activeTab === 'crop' || completedCrop) && completedCrop?.width && completedCrop?.height && imgRef.current) {
        // Calculate the actual pixel coordinates based on the image's natural dimensions
        const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
        const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
        
        const pixelCrop = {
          x: completedCrop.x * scaleX,
          y: completedCrop.y * scaleY,
          width: completedCrop.width * scaleX,
          height: completedCrop.height * scaleY,
        };

        const croppedImage = await getCroppedImg(
          imageSrc,
          pixelCrop,
          rotation
        );
        finalImage = croppedImage;
      }
      
      onSave({ image: finalImage, altText });
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const menuItems = [
    { id: 'crop', label: 'ครอบตัด / หมุน', icon: <ScissorsIcon style={{ width: 24, height: 24 }} /> },
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
      fullWidth 
      maxWidth="md" 
      PaperProps={{ sx: { bgcolor: '#242526', color: '#e4e6eb', borderRadius: 2, height: '85vh', maxHeight: '800px', display: 'flex', flexDirection: 'column' } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderBottom: '1px solid #3e4042' }}>
        <IconButton sx={{ visibility: 'hidden' }}><XMarkIcon style={{ width: 24, height: 24 }} /></IconButton>
        <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>รายละเอียดรูปภาพ</Typography>
        <IconButton onClick={onClose} sx={{ color: '#b0b3b8', bgcolor: '#3a3b3c', '&:hover': { bgcolor: '#4e4f50' } }}>
          <XMarkIcon style={{ width: 24, height: 24 }} />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <Box sx={{ width: 260, borderRight: '1px solid #3e4042', display: 'flex', flexDirection: 'column', p: 1, overflowY: 'auto' }}>
          {menuItems.map((item) => (
            <Button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              startIcon={item.icon}
              sx={{
                justifyContent: 'flex-start',
                color: activeTab === item.id ? '#fff' : '#b0b3b8',
                bgcolor: activeTab === item.id ? '#3a3b3c' : 'transparent',
                p: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                '&:hover': { bgcolor: '#3a3b3c', color: '#fff' }
              }}
            >
              {item.label}
            </Button>
          ))}
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
            <Button variant="contained" fullWidth onClick={handleSave} sx={{ bgcolor: '#2374e1', color: '#fff', fontWeight: 700, borderRadius: 2, textTransform: 'none', '&:hover': { bgcolor: '#1a64c4' } }}>
              บันทึก
            </Button>
            <Button variant="contained" fullWidth onClick={onClose} sx={{ bgcolor: '#3a3b3c', color: '#e4e6eb', fontWeight: 700, borderRadius: 2, textTransform: 'none', '&:hover': { bgcolor: '#4e4f50' } }}>
              ยกเลิก
            </Button>
          </Box>
        </Box>

        {/* Workspace */}
        <Box sx={{ flexGrow: 1, position: 'relative', bgcolor: '#000', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'crop' && (
            <>
              <Box sx={{ position: 'relative', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', p: 2 }}>
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                >
                  <img
                    ref={imgRef}
                    alt="Crop me"
                    src={imageSrc}
                    onLoad={onImageLoad}
                    style={{ transform: `rotate(${rotation}deg)`, maxHeight: '50vh', objectFit: 'contain' }}
                  />
                </ReactCrop>
              </Box>
              <Box sx={{ p: 2, bgcolor: '#242526', display: 'flex', flexDirection: 'column', gap: 2, borderTop: '1px solid #3e4042' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ color: '#b0b3b8', minWidth: 60 }}>หมุน</Typography>
                  <Slider
                    value={rotation}
                    min={0}
                    max={360}
                    step={1}
                    onChange={(e, rotation) => setRotation(rotation)}
                    sx={{ color: '#2374e1' }}
                  />
                  <IconButton onClick={() => setRotation((prev) => (prev + 90) % 360)} sx={{ color: '#e4e6eb', bgcolor: '#3a3b3c', p: 1 }}>
                    <ArrowPathIcon style={{ width: 20, height: 20 }} />
                  </IconButton>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Dialog>
    </>
  );
};

export default ImageEditorModal;
