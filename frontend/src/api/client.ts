import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";

export const api = axios.create({
  baseURL: API_BASE
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error?.response?.data?.detail;
    if (error?.response?.status === 401 && typeof detail === "string" && detail.toLowerCase().includes("token")) {
      localStorage.removeItem("careleo_clinic_token");
      localStorage.removeItem("careleo_admin_token");
      setAuthToken(undefined);
    }
    return Promise.reject(error);
  }
);

export function setAuthToken(token?: string) {
  if (!token) {
    delete api.defaults.headers.common.Authorization;
    return;
  }
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}
