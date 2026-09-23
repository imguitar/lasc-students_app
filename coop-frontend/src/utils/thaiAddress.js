import dbData from 'thai-address-database/database/db.json';

// Decompact and cache Thailand address database
let cachedEntries = null;
let cachedProvinces = null;
let amphoeMapByProvince = null; // province -> Set of amphoes
let districtMapByProvAmph = null; // `${province}_${amphoe}` -> array of { district, zipcode }

const initDatabase = () => {
  if (cachedEntries) return cachedEntries;

  const lookup = (dbData.lookup || '').split('|');
  const words = (dbData.words || '').split('|');
  const useLookup = Boolean(dbData.lookup && dbData.words);

  const translate = (text) => {
    if (!useLookup) return text;
    if (typeof text === 'number') {
      text = lookup[text];
    }
    return String(text).replace(/[A-Z]/gi, (m) => {
      const ch = m.charCodeAt(0);
      return words[ch < 97 ? ch - 65 : 26 + ch - 97];
    });
  };

  const entries = [];
  amphoeMapByProvince = new Map();
  districtMapByProvAmph = new Map();

  (dbData.data || []).forEach((provArr) => {
    const provinceName = translate(provArr[0]);
    const amphoes = provArr[1] || [];

    if (!amphoeMapByProvince.has(provinceName)) {
      amphoeMapByProvince.set(provinceName, new Set());
    }
    const currentAmphoeSet = amphoeMapByProvince.get(provinceName);

    amphoes.forEach((amphArr) => {
      const amphoeName = translate(amphArr[0]);
      currentAmphoeSet.add(amphoeName);

      const mapKey = `${provinceName}_${amphoeName}`;
      if (!districtMapByProvAmph.has(mapKey)) {
        districtMapByProvAmph.set(mapKey, []);
      }
      const currentDistrictList = districtMapByProvAmph.get(mapKey);

      const districts = amphArr[1] || [];
      districts.forEach((distArr) => {
        const districtName = translate(distArr[0]);
        const zips = Array.isArray(distArr[1]) ? distArr[1] : [distArr[1]];

        zips.forEach((zip) => {
          const zipStr = String(zip);
          const entry = {
            district: districtName,
            amphoe: amphoeName,
            province: provinceName,
            zipcode: zipStr,
          };
          entries.push(entry);
          currentDistrictList.push({
            district: districtName,
            zipcode: zipStr,
          });
        });
      });
    });
  });

  cachedEntries = entries;
  cachedProvinces = Array.from(amphoeMapByProvince.keys()).sort((a, b) => {
    if (a === 'กรุงเทพมหานคร') return -1;
    if (b === 'กรุงเทพมหานคร') return 1;
    return a.localeCompare(b, 'th');
  });

  return cachedEntries;
};

/**
 * Check if the given province is Bangkok
 */
export const isBangkok = (province) => {
  return province === 'กรุงเทพมหานคร' || province === 'กทม' || province === 'กทม.';
};

/**
 * Get the proper label prefix for district (ตำบล or แขวง)
 */
export const getDistrictLabel = (province) => {
  return isBangkok(province) ? 'แขวง' : 'ตำบล';
};

/**
 * Get the proper label prefix for amphoe (อำเภอ or เขต)
 */
export const getAmphoeLabel = (province) => {
  return isBangkok(province) ? 'เขต' : 'อำเภอ';
};

/**
 * Get list of all 77 Thai provinces sorted alphabetically (Bangkok first)
 */
export const getProvinces = () => {
  initDatabase();
  return cachedProvinces;
};

/**
 * Get list of amphoes/khets for a given province
 */
export const getAmphoes = (province) => {
  initDatabase();
  if (!province) return [];
  const set = amphoeMapByProvince.get(province);
  if (!set) return [];
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
};

/**
 * Get list of districts/khwaengs with zipcodes for a given province and amphoe
 */
export const getDistricts = (province, amphoe) => {
  initDatabase();
  if (!province || !amphoe) return [];
  const mapKey = `${province}_${amphoe}`;
  const list = districtMapByProvAmph.get(mapKey) || [];
  return list;
};

/**
 * Get zipcode for a given province, amphoe, and district
 */
export const getZipcode = (province, amphoe, district) => {
  initDatabase();
  if (!province || !amphoe || !district) return '';
  const mapKey = `${province}_${amphoe}`;
  const list = districtMapByProvAmph.get(mapKey) || [];
  const matched = list.find((item) => item.district === district);
  return matched ? matched.zipcode : '';
};

/**
 * Format address item nicely with proper prefixes
 */
export const formatAddressLabel = (item) => {
  if (!item) return '';
  const isBkk = isBangkok(item.province);
  const distLabel = isBkk ? 'แขวง' : 'ต.';
  const amphLabel = isBkk ? 'เขต' : 'อ.';
  const provLabel = isBkk ? '' : 'จ.';

  return `${distLabel}${item.district} ${amphLabel}${item.amphoe} ${provLabel}${item.province} ${item.zipcode}`.trim();
};

/**
 * Search addresses by keyword (matches subdistrict, district, province, or postal code)
 * Allows users to search and auto-complete full address with 1 click
 */
export const searchAddress = (query, maxResult = 25) => {
  initDatabase();
  if (!query) return [];
  const normalized = String(query).trim().toLowerCase();
  if (!normalized) return [];

  const results = [];
  for (const item of cachedEntries) {
    if (
      item.zipcode.startsWith(normalized) ||
      item.district.includes(normalized) ||
      item.amphoe.includes(normalized) ||
      item.province.includes(normalized)
    ) {
      results.push({
        ...item,
        label: formatAddressLabel(item),
      });
      if (results.length >= maxResult) break;
    }
  }

  return results;
};

export default {
  initDatabase,
  isBangkok,
  getDistrictLabel,
  getAmphoeLabel,
  getProvinces,
  getAmphoes,
  getDistricts,
  getZipcode,
  formatAddressLabel,
  searchAddress,
};
