// Live INR → foreign currency conversion.
// Uses open.er-api.com — free, no API key, CORS-enabled.

let ratesCache = null;
let fetchedAt = 0;
const ONE_HOUR = 60 * 60 * 1000;

export const CURRENCIES = {
  INR: { symbol: '₹', label: 'Indian Rupee' },
  USD: { symbol: '$', label: 'US Dollar' },
  EUR: { symbol: '€', label: 'Euro' },
  GBP: { symbol: '£', label: 'British Pound' },
  AUD: { symbol: 'A$', label: 'Australian Dollar' },
  CAD: { symbol: 'C$', label: 'Canadian Dollar' },
  JPY: { symbol: '¥', label: 'Japanese Yen' },
  SGD: { symbol: 'S$', label: 'Singapore Dollar' },
  CHF: { symbol: 'CHF ', label: 'Swiss Franc' },
  CNY: { symbol: '¥', label: 'Chinese Yuan' },
  AED: { symbol: 'AED ', label: 'UAE Dirham' },
};

export async function getRates() {
  if (ratesCache && Date.now() - fetchedAt < ONE_HOUR) return ratesCache;
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/INR');
    const data = await res.json();
    ratesCache = data.rates || {};
    fetchedAt = Date.now();
    return ratesCache;
  } catch {
    return ratesCache || {};
  }
}

export function convert(inr, currency, rates) {
  if (currency === 'INR' || !rates || !rates[currency]) {
    return `₹${inr.toLocaleString('en-IN')}`;
  }
  const converted = Math.round(inr * rates[currency]);
  const sym = CURRENCIES[currency]?.symbol || '';
  return `${sym}${converted.toLocaleString()}`;
}

export const getSavedCurrency = () => localStorage.getItem('crafttrail_currency') || 'INR';
export const setSavedCurrency = (c) => localStorage.setItem('crafttrail_currency', c);