/**
 * Utility functions for formatting data
 */

export const formatAddress = (address) => {
  if (!address) return '-';
  if (typeof address === 'string') return address;

  const parts = [];
  const isBkk = address.province === 'กรุงเทพมหานคร' || address.province === 'กทม' || address.province === 'กทม.';

  if (address.house) parts.push(`บ้านเลขที่ ${address.house}`);
  if (address.moo) parts.push(`หมู่ ${address.moo}`);

  if (address.tambon) {
    const prefix = isBkk ? 'แขวง' : 'ตำบล';
    const text = address.tambon.startsWith('แขวง') || address.tambon.startsWith('ตำบล') || address.tambon.startsWith('ต.')
      ? address.tambon
      : `${prefix} ${address.tambon}`;
    parts.push(text);
  }

  if (address.amphur) {
    const prefix = isBkk ? 'เขต' : 'อำเภอ';
    const text = address.amphur.startsWith('เขต') || address.amphur.startsWith('อำเภอ') || address.amphur.startsWith('อ.')
      ? address.amphur
      : `${prefix} ${address.amphur}`;
    parts.push(text);
  }

  if (address.province) {
    const text = isBkk ? address.province : (address.province.startsWith('จังหวัด') || address.province.startsWith('จ.') ? address.province : `จังหวัด ${address.province}`);
    parts.push(text);
  }

  if (address.postal) parts.push(`รหัสไปรษณีย์ ${address.postal}`);
  if (address.detail) parts.push(address.detail);

  return parts.length ? parts.join(' ') : '-';
};
