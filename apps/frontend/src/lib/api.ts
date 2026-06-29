import axios from 'axios';
import { useAuthStore } from '../store/auth';

export const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' });

apiClient.interceptors.request.use((cfg) => {
  const t = useAuthStore.getState().accessToken;
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

apiClient.interceptors.response.use(
  (r) => r,
  async (err) => {
    const { refreshToken, setAccess, clear } = useAuthStore.getState();
    if (err.response?.status === 401 && refreshToken && !err.config._retry) {
      err.config._retry = true;
      try {
        const { data } = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh`,
          { refreshToken },
        );
        setAccess(data.accessToken);
        err.config.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(err.config);
      } catch {
        clear();
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }
    if (err.response?.status === 401) {
      clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);
