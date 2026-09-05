/**
 * Utility functions for formatting data
 */

export const formatAddress = (address) => {
  if (!address) return '-';
  if (typeof address === 'string') return address;

  const parts = [];
  if (address.house) parts.push(`บ้านเลขที่ ${address.house}`);
  if (address.moo) parts.push(`หมู่ ${address.moo}`);
  if (address.tambon) parts.push(`ตำบล ${address.tambon}`);
  if (address.amphur) parts.push(`อำเภอ ${address.amphur}`);
  if (address.province) parts.push(`จังหวัด ${address.province}`);
  if (address.postal) parts.push(`รหัสไปรษณีย์ ${address.postal}`);
  if (address.detail) parts.push(address.detail);

  return parts.length ? parts.join(' ') : '-';
};
