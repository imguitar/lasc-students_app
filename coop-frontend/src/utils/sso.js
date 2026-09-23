/**
 * SSO and Profile System Redirect Utilities
 */

export const getProfileLoginUrl = () => {
  if (import.meta.env.VITE_PROFILE_LOGIN_URL) {
    return import.meta.env.VITE_PROFILE_LOGIN_URL;
  }
  const isLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  return isLocal ? 'http://localhost:3000/login' : 'https://students.sci-sskru.com/login';
};

export const getSsoLandingUrl = () => {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/coop/sso-landing`;
};

export const redirectToProfileLogin = (customRedirect) => {
  const profileLoginUrl = getProfileLoginUrl();
  const ssoLandingUrl = customRedirect || getSsoLandingUrl();
  const separator = profileLoginUrl.includes('?') ? '&' : '?';
  const targetUrl = `${profileLoginUrl}${separator}redirect=${encodeURIComponent(ssoLandingUrl)}`;
  window.location.href = targetUrl;
};

/**
 * ออกจากระบบ:
 * 1) ล้าง Token, User Data, Session ใน localStorage, sessionStorage, cookies
 * 2) Redirect ผู้ใช้ไปยังหน้า Login ของโปรเจกต์ Profile ทันที
 */
export const logout = () => {
  try {
    localStorage.clear();
    sessionStorage.clear();
    if (typeof document !== 'undefined') {
      document.cookie.split(';').forEach((c) => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
      });
    }
  } catch (e) {
    console.error('Error clearing storage on logout:', e);
  }
  const profileLoginUrl = getProfileLoginUrl();
  window.location.href = profileLoginUrl;
};
