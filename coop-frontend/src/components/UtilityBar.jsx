import React, { useEffect } from 'react';
import { PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import FacebookIcon from './icons/FacebookIcon';
import { useContactInfo, normalizeFacebookHref } from '../utils/useContactInfo';

/**
 * แถบติดต่อด้านบนสุด (Contact Bar) สูงตายตัว 32px แสดงเฉพาะจอ >= 1024px
 * - variant="inline": อยู่ในลำดับเอกสาร (หน้าโฮม/หน้า Public)
 * - variant="fixed": ตรึงบนสุดของหน้าแดชบอร์ด และเลื่อน Navbar/Sidebar ลงด้วยตัวแปร --utility-h
 */
const UtilityBar = ({ variant = 'inline' }) => {
  const contact = useContactInfo();

  useEffect(() => {
    if (variant !== 'fixed') return undefined;
    document.body.classList.add('has-utility-bar');
    return () => document.body.classList.remove('has-utility-bar');
  }, [variant]);

  const facebookHref = normalizeFacebookHref(contact.facebook_url);

  return (
    <div
      className={`utility-bar h-7 md:h-8 bg-purple-950 text-purple-200 text-xs px-4 md:px-6 flex justify-end items-center gap-4 ${
        variant === 'fixed' ? 'utility-bar-fixed' : ''
      }`}
    >
      {facebookHref ? (
        <a
          href={facebookHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-purple-200 hover:text-white transition-colors no-underline min-w-0"
        >
          <FacebookIcon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className="truncate">{contact.facebook_name || 'Facebook'}</span>
        </a>
      ) : (
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <PhoneIcon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className="truncate">{contact.phone ? `ติดต่อสอบถาม ${contact.phone}` : 'ติดต่อสอบถาม 02-XXX-XXXX'}</span>
        </span>
      )}
      <span className="hidden sm:inline-flex items-center gap-1.5">
        <EnvelopeIcon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
        {contact.email || 'contact@example.com'}
      </span>
    </div>
  );
};

export default UtilityBar;
