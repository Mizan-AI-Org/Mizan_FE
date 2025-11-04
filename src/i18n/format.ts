import i18n from './index';

const resolveLocale = () => {
  const lng = i18n.language || 'en';
  // Map Darija to Arabic Morocco
  return lng === 'ma' ? 'ar-MA' : lng;
};

export const formatDate = (date: Date | number | string, options: Intl.DateTimeFormatOptions = {}) => {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat(resolveLocale(), {
    year: 'numeric', month: 'short', day: '2-digit', ...options,
  }).format(d);
};

export const formatNumber = (value: number, options: Intl.NumberFormatOptions = {}) => {
  return new Intl.NumberFormat(resolveLocale(), options).format(value);
};

export const formatCurrency = (value: number, currency: string = 'USD', options: Intl.NumberFormatOptions = {}) => {
  return new Intl.NumberFormat(resolveLocale(), { style: 'currency', currency, ...options }).format(value);
};