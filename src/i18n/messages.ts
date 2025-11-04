import type { AxiosError } from 'axios';
import i18n from '@/i18n';

export const translateApiError = (error: AxiosError<any>): string => {
  const status = error.response?.status;
  const data: any = error.response?.data || {};
  const detail = data?.detail || data?.message;

  if (status) {
    const key = `errors.http.${status}`;
    const msg = i18n.t(key);
    if (typeof msg === 'string' && msg !== key) {
      return detail ? `${msg}: ${detail}` : msg;
    }
  }

  if ((error as any).code === 'ECONNABORTED') {
    return i18n.t('errors.timeout') as string;
  }

  if (!error.response) {
    return i18n.t('errors.network') as string;
  }

  return (detail as string) || (i18n.t('errors.unknown') as string);
};

export const validationMessages = {
  required: (field?: string) => i18n.t('validation.required', { field }) as string,
  email: () => i18n.t('validation.email') as string,
  minLength: (min: number) => i18n.t('validation.min_length', { min }) as string,
  maxLength: (max: number) => i18n.t('validation.max_length', { max }) as string,
  pattern: () => i18n.t('validation.pattern') as string,
};

export const translateStatus = (value: string): string => {
  const key = `status.${value}`;
  const out = i18n.t(key);
  return typeof out === 'string' && out !== key ? (out as string) : value;
};