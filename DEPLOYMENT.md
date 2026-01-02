# Guía de Despliegue - Coeus CRM

## Paso 1: Crear Repositorio en GitHub

1. Ve a https://github.com/new
2. Nombre del repositorio: `coeus-crm`
3. Descripción: "Sistema CRM para gestión de leads y campañas de outreach"
4. Público o Privado (tu elección)
5. **NO** inicialices con README (ya tenemos uno)
6. Click en "Create repository"

## Paso 2: Push del Código

Ejecuta estos comandos en la terminal (desde `/Users/alvaropescadorruiz/.gemini/antigravity/scratch/coeus-web`):

```bash
# Añadir el remote (usa tu URL de GitHub)
git remote add origin https://github.com/TU_USUARIO/coeus-crm.git

# Push del código
git branch -M main
git push -u origin main
```

## Paso 3: Desplegar en Vercel

### Opción A: Desde la Web de Vercel
1. Ve a https://vercel.com/new
2. Importa tu repositorio de GitHub `coeus-crm`
3. Vercel detectará automáticamente que es un proyecto Vite
4. Configura las variables de entorno:
   - `VITE_SUPABASE_URL` = `http://213.199.47.72:8000`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.qJT2_5MYOjKFRPhAqxQ8WHhGRSaadBxKR81fbn5aNmA`
   - `VITE_SEARCH_WEBHOOK_URL` = `https://sswebhook.made-to-scale.com/webhook/ingest-leads`
5. Click en "Deploy"

### Opción B: Desde la CLI de Vercel
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
cd /Users/alvaropescadorruiz/.gemini/antigravity/scratch/coeus-web
vercel

# Seguir las instrucciones interactivas
```

## Paso 4: Configurar CORS en el Servidor

Para que Vercel pueda acceder a tu API, necesitas configurar CORS en Kong.

Verifica que Kong permita requests desde tu dominio de Vercel:
- `https://tu-proyecto.vercel.app`
- `https://tu-proyecto-*.vercel.app` (para previews)

## Verificación Post-Despliegue

1. Abre tu app en Vercel
2. Ve a la página de Leads
3. Verifica que los datos se carguen correctamente
4. Si hay errores de CORS, revisa la configuración de Kong

## Troubleshooting

### Error: "Failed to fetch"
- Verifica que `VITE_SUPABASE_URL` esté correctamente configurada
- Asegúrate de que el servidor (213.199.47.72:8000) sea accesible desde internet
- Revisa la configuración de CORS en Kong

### Error: "Unauthorized"
- Verifica que `VITE_SUPABASE_ANON_KEY` sea correcta
- Confirma que los permisos del schema `coeus` estén configurados

## Archivos Importantes

- `vercel.json` - Configuración de Vercel
- `.env` - Variables de entorno (NO se sube a GitHub)
- `.gitignore` - Archivos ignorados por Git
- `README.md` - Documentación del proyecto
