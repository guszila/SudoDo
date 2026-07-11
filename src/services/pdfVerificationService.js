import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const issueVerification = httpsCallable(functions, 'issuePdfVerification');
const fetchVerification = httpsCallable(functions, 'getPdfVerification');

export const issuePdfVerification = async (month) => {
  const result = await issueVerification({ month });
  return result.data;
};

export const getPdfVerification = async (verifyId) => {
  const result = await fetchVerification({ verifyId });
  return result.data;
};

export const buildVerificationUrl = (verifyId) => {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  const browserUrl = /^https?:$/.test(window.location.protocol) ? window.location.origin : '';
  const baseUrl = (configuredUrl || browserUrl).replace(/\/$/, '');

  if (!baseUrl) {
    throw new Error('VITE_PUBLIC_APP_URL is required when exporting from the mobile app');
  }

  return `${baseUrl}/verify/${encodeURIComponent(verifyId)}`;
};
