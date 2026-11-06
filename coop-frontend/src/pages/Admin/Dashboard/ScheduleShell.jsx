import { Box, Dialog } from '@mui/material';

/**
 * ตัวห่อหน้าต่างของตารางกำหนดการ:
 * - embedded = false: แสดงเป็น Dialog แบบเดิม (ใช้ตอนเปิดจากที่อื่น)
 * - embedded = true: แสดงเนื้อหาตรง ๆ ในแท็บของหน้า จัดการกำหนดการและปฏิทิน
 */
const ScheduleShell = ({ embedded = false, open, onClose, children, ...rest }) => {
  if (embedded) {
    return <Box className="sched-embed">{children}</Box>;
  }
  return <Dialog open={open} onClose={onClose} {...rest}>{children}</Dialog>;
};

export default ScheduleShell;
