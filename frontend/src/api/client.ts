import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";

export const api = axios.create({
  baseURL: API_BASE
});

export function setAuthToken(token?: string) {
  if (!token) {
    delete api.defaults.headers.common.Authorization;
    return;
  }
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}
