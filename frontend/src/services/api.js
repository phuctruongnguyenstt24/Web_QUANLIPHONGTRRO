import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Chi nhánh owner đang xem. Lưu ở module để interceptor đọc được
// mà không cần truyền qua từng lời gọi API.
let activeBranch = null;
export function setActiveBranch(branchId) {
  activeBranch = branchId;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Backend bỏ qua tham số này với manager, nên gửi thừa cũng không sao
  if (activeBranch) {
    config.params = { ...config.params, branch: activeBranch };
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('activeBranch');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;