const cron = require('node-cron');
const { autoUpdateInternshipStatuses } = require('../utils/internshipAutoUpdate');

const initCronJobs = () => {
  // รันทุกเที่ยงคืนตามเวลาประเทศไทย เพื่อเปลี่ยนสถานะคำร้องที่ถึงกำหนดวันเริ่มฝึกงาน
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Running daily check for internship start dates...');
    try {
      const { today, updated } = await autoUpdateInternshipStatuses();
      if (updated > 0) {
        console.log(`[Cron] Auto-updated ${updated} requests to 'ออกฝึกงาน' (today: ${today}).`);
      }
    } catch (error) {
      console.error('[Cron Error]', error);
    }
  }, { timezone: 'Asia/Bangkok' });
};

module.exports = initCronJobs;
