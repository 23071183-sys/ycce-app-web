import axios from 'axios';

// The API host sleeps when idle and takes ~25s to answer the request that wakes
// it, so there has to be a ceiling well above that rather than none at all.
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://ycce-app-backend.onrender.com/api',
  timeout: 40000,
});

// While the host is still starting it answers 5xx rather than queueing, so the
// first request after an idle period fails even though nothing is wrong.
const WAKE_RETRY_STATUSES = [502, 503, 504];
const WAKE_RETRY_DELAYS_MS = [2000, 5000, 10000];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && typeof window !== 'undefined' && !isLoginRequest) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    const config = error.config;
    if (config && WAKE_RETRY_STATUSES.includes(error.response?.status)) {
      const attempt = config._wakeRetry ?? 0;
      if (attempt < WAKE_RETRY_DELAYS_MS.length) {
        config._wakeRetry = attempt + 1;
        await sleep(WAKE_RETRY_DELAYS_MS[attempt]);
        return api(config);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
