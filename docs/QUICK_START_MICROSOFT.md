# Guía Rápida: Configurar Microsoft OAuth

## Resumen de Pasos

### 1. Registrar Aplicación en Azure Portal (5 minutos)

1. Ve a https://portal.azure.com
2. Busca "Azure Active Directory" > "App registrations" > "New registration"
3. Completa:
   - **Name**: `AIssistant Calendar`
   - **Account types**: "Accounts in any organizational directory and personal Microsoft accounts"
   - **Redirect URI**: `http://localhost:3000/settings/calendar/callback` (Platform: Web)
4. Haz clic en "Register"
5. **Copia el "Application (client) ID"** - este es tu `MICROSOFT_CLIENT_ID`

### 2. Crear Client Secret (2 minutos)

1. En tu aplicación, ve a "Certificates & secrets"
2. Haz clic en "+ New client secret"
3. Description: `AIssistant Secret`
4. Expires: 24 months
5. Haz clic en "Add"
6. **Copia el "Value" inmediatamente** (solo se muestra una vez) - este es tu `MICROSOFT_CLIENT_SECRET`

### 3. Configurar Permisos (3 minutos)

1. Ve a "API permissions"
2. Haz clic en "+ Add a permission"
3. Selecciona "Microsoft Graph" > "Delegated permissions"
4. Añade estos permisos:
   - `Calendars.Read`
   - `User.Read`
   - `offline_access`
5. Haz clic en "Grant admin consent" (si tienes permisos)

### 4. Añadir Variables al .env

Abre tu archivo `.env` y añade:

```env
# ----- Microsoft OAuth (Calendar) -----
MICROSOFT_CLIENT_ID=tu-client-id-aqui
MICROSOFT_CLIENT_SECRET=tu-client-secret-aqui
MICROSOFT_TENANT_ID=common
```

**Reemplaza:**
- `tu-client-id-aqui` con el Application (client) ID del paso 1
- `tu-client-secret-aqui` con el Value del secret del paso 2
- `common` puede quedarse así (permite ambos tipos de cuentas)

### 5. Reiniciar Servicios

```bash
docker-compose restart backend frontend
```

### 6. Verificar

1. Ve a Configuración > Calendarios
2. Deberías ver:
   - **Outlook Personal**
   - **Outlook Empresarial**
3. Haz clic en cualquiera para probar la conexión

## ¿Problemas?

Consulta la documentación completa en: `docs/MICROSOFT_OAUTH_SETUP.md`

## Enlaces Rápidos

- [Azure Portal](https://portal.azure.com)
- [App Registrations](https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps)
