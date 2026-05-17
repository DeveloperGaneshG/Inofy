export interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  gstin: string;
}

const DEFAULTS: StoreSettings = {
  name: "Chandu's Mart",
  address: 'Opp. Hanuman Temple, Balarampuram',
  phone: '+91 9505821254',
  gstin: '',
};

const KEY = 'invofy_store_v2';

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
