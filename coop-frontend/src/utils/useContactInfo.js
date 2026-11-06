import { useEffect, useState } from 'react';
import api from '../api/axios';

// เก็บข้อมูลติดต่อไว้ในหน่วยความจำ — เปลี่ยนหน้าแล้วไม่ต้องโหลดซ้ำ
let cachedContact = null;
let inflight = null;

const loadContact = () => {
  if (cachedContact) return Promise.resolve(cachedContact);
  if (!inflight) {
    inflight = api
      .get('/public/contact')
      .then((res) => {
        cachedContact = res.data?.data || {};
        return cachedContact;
      })
      .catch(() => ({}))
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
};

export const normalizeFacebookHref = (raw) => {
  const value = String(raw || '').trim();
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

export const useContactInfo = () => {
  const [contact, setContact] = useState(cachedContact || {});

  useEffect(() => {
    let active = true;
    loadContact().then((data) => {
      if (active) setContact(data || {});
    });
    return () => {
      active = false;
    };
  }, []);

  return contact;
};
