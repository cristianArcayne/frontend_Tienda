export const environment = {
  production: false,
  isMultitenant: true, // true = cada subdominio es una empresa
  apiBaseUrl: 'http://127.0.0.1:8000/api', // Fallback si no está en subdominio
};