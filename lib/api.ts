import axios from 'axios';

const PRODUCTION_API = 'https://ycce-app-backend.onrender.com/api';

// A NEXT_PUBLIC_API_URL left over from the old Railway host is still set in the
// deployment's dashboard, where it overrides vercel.json and is baked into the
// bundle at build time — every deployed sign-in was failing against a backend
// that no longer exists. Production pins the known-good host so stale config
// cannot point it at a dead one; local development still overrides freely
// through .env.local. Delete that dashboard variable and this can go back to
// reading the environment in both.
const baseURL = process.env.NODE_ENV === 'development'
  ? (process.env.NEXT_PUBLIC_API_URL || PRODUCTION_API)
  : PRODUCTION_API;

// The API host sleeps when idle and takes ~25s to answer the request that wakes
// it, so there has to be a ceiling well above that rather than none at all.
const api = axios.create({
  baseURL,
  timeout: 40000,
});

// While the host is still starting it answers 5xx rather than queueing, so the
// first request after an idle period fails even though nothing is wrong.
// A request whose 503 means something else (e.g. the AI service being off)
// sets skipWakeRetry so the answer comes back at once.
const WAKE_RETRY_STATUSES = [502, 503, 504];

declare module 'axios' {
  interface AxiosRequestConfig {
    skipWakeRetry?: boolean;
  }
}
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
    // A JSON { error } body means our server itself answered; only Render's own
    // wake-up responses are worth retrying.
    const fromOurServer = typeof error.response?.data?.error === 'string';
    if (config && !config.skipWakeRetry && !fromOurServer && WAKE_RETRY_STATUSES.includes(error.response?.status)) {
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
