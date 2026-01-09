# Guía de Pruebas: Coeus Backend Robust (Local)

Para asegurar que todo funciona sin errores, vamos a correr el sistema en local donde podemos ver todos los logs en tiempo real.

## 1. Preparación del Backend
Abre una terminal nueva y ejecuta:
```bash
cd backend
npm install
node server.js
```
**Qué vigilar:** Deberías ver `Server running on port 3000`.

## 2. Lanzar el Frontend (con Proxy)
En otra terminal (en la raíz del proyecto):
```bash
npm install
npm run dev
```
**IMPORTANTE:** He configurado un proxy en `vite.config.js`. Ahora todas las peticiones a `/api` se redirigen automáticamente a tu servidor local en el puerto 3000.

## 3. Prueba de Ingestión (Frontend)
1. Ve a `http://localhost:5173/` (o el puerto que te dé Vite).
2. Pestaña **Search**.
3. Busca "Clinica estetica" en "Barcelona".
4. Haz clic en **Launch Search Workflow**.

**Qué pasará:**
- En la terminal del **Backend**, verás logs como `[INGEST] Received request...` y `[INGEST] Run registered...`.
- El frontend mostrará un mensaje de éxito azul.

## 4. Prueba de Enriquecimiento (Simulada)
Como Apify no puede llamar a tu `localhost` sin herramientas como ngrok, he preparado un script para probar el procesamiento de datos directamente:

En la terminal del backend, ejecuta:
```bash
node test-local.js
```
Este script enviará una petición de prueba al backend para verificar que la conexión con Supabase y el registro de la búsqueda funcionan perfectamente.

## 5. Verificación de Robustez
Si algo falla, verás logs detallados en la terminal con el prefijo `[INGEST]` o `[ERROR]`. He añadido bloques try/catch en todas las fases críticas para que el sistema no "pete" y te diga exactamente qué ha fallado.
