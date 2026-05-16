export interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  gstin: string;
}

const DEFAULTS: StoreSettings = {
  name: 'Invofy Mart',
  address: '123 Market St, City - 560001',
  phone: '+91 98765 43210',
  gstin: '',
};

const KEY = 'invofy_store_settings';

export function getStoreSettings(): StoreSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

export function saveStoreSettings(s: StoreSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}
