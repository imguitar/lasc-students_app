import React from 'react';
import { Box, Typography } from '@mui/material';

export const thaiBahtText = (num) => {
  if (num === null || num === undefined || isNaN(num)) return 'ห้าร้อยบาทถ้วน';
  const numStr = Number(num).toFixed(2);
  const [intPart, decPart] = numStr.split('.');
  
  const numbers = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
  
  const convertGroup = (str) => {
    let result = '';
    const len = str.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(str[i], 10);
      const pos = len - i - 1;
      if (digit !== 0) {
        if (pos === 1 && digit === 1) {
          result += 'สิบ';
        } else if (pos === 1 && digit === 2) {
          result += 'ยี่สิบ';
        } else if (pos === 0 && digit === 1 && len > 1 && str[len - 2] !== '0') {
          result += 'เอ็ด';
        } else {
          result += numbers[digit] + positions[pos];
        }
      }
    }
    return result;
  };

  let intText = '';
  if (parseInt(intPart, 10) === 0) {
    intText = 'ศูนย์';
  } else {
    intText = convertGroup(intPart);
  }

  let decText = '';
  if (parseInt(decPart, 10) > 0) {
    decText = convertGroup(decPart) + 'สตางค์';
  } else {
    decText = 'ถ้วน';
  }

  return intText + 'บาท' + decText;
};

export const formatThaiDate = (dateStr) => {
  if (!dateStr) {
    const today = new Date();
    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    return `${today.getDate()} ${thaiMonths[today.getMonth()]} ${today.getFullYear() + 543}`;
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    return `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
  } catch {
    return dateStr;
  }
};

const SingleReceipt = ({ student, index, total }) => {
  const studentCode = student.student_code || student.studentId || student.username || '-';
  const studentName = student.full_name || student.name || '-';
  const department = student.major || student.department || '-';
  const receiptNo = `REC-${String(student.paymentId || index + 1).padStart(5, '0')}/${new Date().getFullYear() + 543}`;
  const receiptDate = formatThaiDate(student.paymentDate || student.created_at);
  const amount = 500;
  const amountText = thaiBahtText(amount);

  return (
    <div 
      className="receipt-page" 
      style={{ 
        width: '210mm',
        minHeight: '297mm',
        padding: '24mm 20mm',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: '"Sarabun", "TH Sarabun New", "Roboto", sans-serif',
        fontSize: '15pt',
        lineHeight: 1.6,
        boxSizing: 'border-box',
        pageBreakAfter: index < total - 1 ? 'always' : 'auto',
        position: 'relative'
      }}
    >
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22pt', fontWeight: 'bold', margin: 0, letterSpacing: '1px' }}>
          ใบสำคัญรับเงิน
        </h1>
        <div style={{ fontSize: '13pt', color: '#333', marginTop: '4px' }}>
          คณะศิลปศาสตร์และวิทยาศาสตร์ มหาวิทยาลัยราชภัฏศรีสะเกษ
        </div>
      </div>

      {/* Header Info (Right) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '18px' }}>
        <div style={{ width: '220px' }}>
          <div><strong>เลขที่:</strong> {receiptNo}</div>
          <div><strong>วันที่:</strong> {receiptDate}</div>
        </div>
      </div>

      {/* Receiver Info */}
      <div style={{ marginBottom: '14px', textAlign: 'justify', lineHeight: 1.8 }}>
        <div>
          <strong>ข้าพเจ้า</strong> ศูนย์ฝึกประสบการณ์วิชาชีพ คณะศิลปศาสตร์และวิทยาศาสตร์ (LASC)
          <span style={{ float: 'right' }}>(ผู้ขายสินค้า/ให้บริการ)</span>
        </div>
        <div>
          <strong>เลขประจำตัวผู้เสียภาษี</strong> 0994000350411
        </div>
        <div>
          <strong>ที่อยู่</strong> 47 ถนนไทยพันทา ตำบลโพธิ์ อำเภอเมือง จังหวัดศรีสะเกษ 33000
        </div>
      </div>

      {/* Payer Info */}
      <div style={{ marginBottom: '20px', lineHeight: 1.8 }}>
        <strong>ได้รับเงินจาก</strong> {studentName} &nbsp;&nbsp;<strong>รหัสนักศึกษา:</strong> {studentCode} &nbsp;&nbsp;<strong>สาขาวิชา:</strong> {department}
        <div style={{ textAlign: 'right' }}>(ผู้ซื้อ/ผู้รับบริการ) ดังรายการต่อไปนี้</div>
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '14pt' }}>
        <thead>
          <tr style={{ backgroundColor: '#fafafa' }}>
            <th style={{ border: '1px solid #000', padding: '8px 4px', width: '10%', textAlign: 'center' }}>ลำดับที่</th>
            <th style={{ border: '1px solid #000', padding: '8px 12px', width: '55%', textAlign: 'center' }}>รายการ</th>
            <th style={{ border: '1px solid #000', padding: '8px 8px', width: '20%', textAlign: 'center' }}>จำนวนเงิน (บาท)</th>
            <th style={{ border: '1px solid #000', padding: '8px 8px', width: '15%', textAlign: 'center' }}>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #000', padding: '10px 4px', textAlign: 'center', height: '40px' }}>1</td>
            <td style={{ border: '1px solid #000', padding: '10px 12px' }}>
              ค่าธรรมเนียมการออกฝึกประสบการณ์วิชาชีพ
            </td>
            <td style={{ border: '1px solid #000', padding: '10px 8px', textAlign: 'right' }}>{amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
            <td style={{ border: '1px solid #000', padding: '10px 8px', textAlign: 'center' }}>โอนเงิน</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '10px 4px', textAlign: 'center', height: '32px' }}></td>
            <td style={{ border: '1px solid #000', padding: '10px 12px' }}></td>
            <td style={{ border: '1px solid #000', padding: '10px 8px', textAlign: 'right' }}></td>
            <td style={{ border: '1px solid #000', padding: '10px 8px', textAlign: 'center' }}></td>
          </tr>
          <tr>
            <td colSpan={2} style={{ border: '1px solid #000', padding: '8px 12px', textAlign: 'right', fontWeight: 'bold' }}>
              รวมทั้งสิ้น
            </td>
            <td style={{ border: '1px solid #000', padding: '8px 8px', textAlign: 'right', fontWeight: 'bold' }}>
              {amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </td>
            <td style={{ border: '1px solid #000', padding: '8px 8px', textAlign: 'center' }}>-</td>
          </tr>
          <tr>
            <td colSpan={4} style={{ border: '1px solid #000', padding: '10px 12px', backgroundColor: '#fafafa' }}>
              <strong>ตัวอักษร:</strong> ( {amountText} )
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signatures */}
      <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'space-between', paddingLeft: '40px', paddingRight: '40px' }}>
        <div style={{ textAlign: 'center', width: '220px' }}>
          <div style={{ marginBottom: '40px' }}>ลงชื่อ ....................................................</div>
          <div>( .................................................... )</div>
          <div style={{ fontSize: '13pt', color: '#444' }}>ผู้รับเงิน / เจ้าหน้าที่การเงิน</div>
        </div>

        <div style={{ textAlign: 'center', width: '220px' }}>
          <div style={{ marginBottom: '40px' }}>ลงชื่อ ....................................................</div>
          <div>( {studentName} )</div>
          <div style={{ fontSize: '13pt', color: '#444' }}>ผู้จ่ายเงิน / นักศึกษา</div>
        </div>
      </div>

      {/* Accounting Section */}
      <div style={{ marginTop: '24px', paddingTop: '12px', borderTop: '1px dashed #666', fontSize: '13pt', color: '#333' }}>
        <div><strong>สำหรับฝ่ายการเงิน/บัญชี:</strong></div>
        <div style={{ marginTop: '4px' }}>
          จ่ายผ่าน: เงินโอนเข้าบัญชี เมื่อวันที่ {receiptDate} &nbsp;|&nbsp; สถานะการตรวจสอบ: <span style={{ color: '#166534', fontWeight: 'bold' }}>✓ ตรวจสอบแล้ว</span>
        </div>
      </div>

      {/* Attached Payment Slip Preview if available */}
      {student.paymentSlip && (
        <div style={{ marginTop: '20px', pageBreakInside: 'avoid', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', textAlign: 'center', backgroundColor: '#fcfcfc' }}>
          <div style={{ fontSize: '12pt', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>
            [ หลักฐานสลิปการโอนเงินแนบประกอบ ]
          </div>
          <img 
            src={student.paymentSlip} 
            alt="Attached Slip" 
            style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
          />
        </div>
      )}
    </div>
  );
};

const PrintablePaymentReceipt = React.forwardRef(({ students = [] }, ref) => {
  if (!students || students.length === 0) return <div ref={ref}></div>;

  return (
    <div ref={ref}>
      {students.map((student, index) => (
        <SingleReceipt 
          key={student.student_code || student.username || index} 
          student={student} 
          index={index} 
          total={students.length} 
        />
      ))}
    </div>
  );
});

export default PrintablePaymentReceipt;
