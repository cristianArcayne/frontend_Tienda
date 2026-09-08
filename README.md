# Frontend - Atelier Numérique (Angular 19/22)

Aplicación web desarrollada en **Angular** con arquitectura Standalone, inspirada en la interfaz editorial de alta costura de **Atelier Numérique - Acceso al Vestidor**.

---

## 🛠️ Requisitos Previos

- Node.js 18+ (recomendado Node 20 o superior)
- npm 9+

---

## 🚀 Instalación y Ejecución

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar servidor de desarrollo:**
   ```bash
   npm start
   ```

3. **Abrir en el navegador:**
   Navega a `http://localhost:4200`.

---

## 💎 Características Principales

- **Diseño Editorial de Lujo:** Pantalla dividida, badges biométricos, tipografía de alta costura y paleta refinada.
- **Autenticación Completa:** Login ("Acceso al Vestidor"), Recuperación de cuenta y Registro de cliente.
- **Botones de Modo Demo:** Permite iniciar sesión con 1 clic como Admin, Trabajador o Cliente.
- **Control de Acceso RBAC:** Guards de ruta que restringen el acceso a `/dashboard` y `/bitacora`.
- **Bitácora de Uso en Tiempo Real:** Tabla interactiva con búsqueda por texto y CI, badges de auditoría y refresco inmediato.
- **Vestidor Virtual:** Catálogo exclusivo de piezas con calibración biométrica simulada.
