import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export function resolveAssetUrl(url) {
  if (!url || /^https?:\/\//i.test(url)) {
    return url;
  }

  const apiBaseUrl = api.defaults.baseURL || "";
  const baseOrigin = apiBaseUrl.replace(/\/api\/?$/, "");

  return `${baseOrigin}${url.startsWith("/") ? "" : "/"}${url}`;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("vendora_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
