ALTER TABLE banners
ADD COLUMN overlay_style VARCHAR(50) DEFAULT 'gradient_purple' COMMENT 'รูปแบบ overlay เช่น gradient_purple, gradient_dark, solid_purple, custom',
ADD COLUMN overlay_color VARCHAR(30) DEFAULT '#4c1d95' COMMENT 'รหัสสีหลักของ Overlay (HEX/RGBA)',
ADD COLUMN overlay_opacity INT DEFAULT 75 COMMENT 'ความทึบของสี Overlay (0 - 100%)';
