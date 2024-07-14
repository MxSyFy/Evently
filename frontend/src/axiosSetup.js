import axios from 'axios';

// Create an instance of axios
const instance = axios.create({
  baseURL: 'http://localhost/api',
  timeout: 1000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Ensure this is set to true to send cookies
});

// Helper function to get the CSRF token from cookies
const getCSRFToken = () => {
  const name = 'csrftoken';
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith(name))
    ?.split('=')[1];
  return cookieValue;
};

// Add a request interceptor to include the token
instance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('access_token');
    const csrfToken = getCSRFToken();
    
    console.log('Request Interceptor:');
    console.log('Access Token:', token);
    console.log('CSRF Token:', csrfToken);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token refresh
instance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post('http://localhost:8000/api/token/refresh/', {
            refresh: refreshToken,
          });
          localStorage.setItem('access_token', response.data.access);
          axios.defaults.headers.Authorization = `Bearer ${response.data.access}`;
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          return axios(originalRequest);
        } catch (e) {
          console.error('Token refresh failed', e);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
