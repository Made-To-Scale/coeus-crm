# Coeus CRM

Sistema de gestión de leads para campañas de outreach.

## Características

- 🔍 **Búsqueda de Leads**: Interfaz para buscar negocios por tipo y ubicación
- 📊 **Gestión de Leads**: Visualización completa de leads con scoring, tier y estado de routing
- 📧 **Canales de Contacto**: Gestión de emails, teléfonos y WhatsApp
- 🎯 **Campañas**: Sistema de campañas e interacciones

## Tech Stack

- **Frontend**: React + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgREST + PostgreSQL)
- **Icons**: Lucide React

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Build para producción
npm run build
```

## Variables de Entorno

Crear un archivo `.env` con:

```env
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_SEARCH_WEBHOOK_URL=https://your-webhook-url.com
```

## Despliegue en Vercel

1. Push del código a GitHub
2. Importar proyecto en Vercel
3. Configurar variables de entorno en Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SEARCH_WEBHOOK_URL`
4. Deploy automático

## Estructura del Proyecto

```
src/
├── components/
│   ├── LeadsView.jsx      # Vista principal de leads
│   └── SearchView.jsx     # Interfaz de búsqueda
├── lib/
│   └── supabaseClient.js  # Cliente de Supabase
├── App.jsx                # Componente principal
└── main.jsx              # Entry point
```

## Base de Datos

El proyecto usa el schema `coeus` en PostgreSQL con las siguientes tablas:

- `leads` - Información de leads
- `contacts` - Contactos (personas)
- `lead_channels` - Canales de contacto (emails/teléfonos)
- `campaigns` - Campañas de outreach
- `interactions` - Interacciones con leads
