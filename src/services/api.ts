import axios from 'axios';
import Cookies from 'js-cookie';

// Definimos la URL base del backend en Django
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Instancia pública (No requiere token, ej: para login, ver planes o el catálogo público)
export const apiPublica = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Instancia privada (Requiere token, ej: panel de admin, POS, inventario)
export const apiPrivada = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar el Token JWT en las peticiones privadas
apiPrivada.interceptors.request.use(
  (config) => {
    // Obtenemos el token de las cookies (lo guardaremos ahí al hacer login)
    const token = Cookies.get('access_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Lógica para Multi-Tenant:
    // Si estamos en el navegador y detectamos un subdominio, ajustamos la baseURL
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      // Extraemos el subdominio (ej: 'zapatos-carlos' de 'zapatos-carlos.localhost')
      const tenant = hostname.split('.')[0];
      
      // Si no es el dominio principal, apuntamos la API al subdominio
      if (tenant !== 'www' && tenant !== 'localhost') {
         // Ajusta la URL de http://localhost:8000 a http://zapatos-carlos.localhost:8000
         const port = window.location.port ? `:${window.location.port}` : '';
         // Suponiendo que tu Django corre en el puerto 8000 localmente
         config.baseURL = `http://${tenant}.localhost:8000/api/v1`; 
      } else {
         config.baseURL = `${API_URL}/api/v1`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor opcional: Si el token expira (Error 401), podemos hacer logout automático
apiPrivada.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');
      // Redirigir al login si falla la auth
      if (typeof window !== 'undefined') {
        window.location.href = 'http://localhost:3000/login';
      }
    }
    return Promise.reject(error);
  }
);