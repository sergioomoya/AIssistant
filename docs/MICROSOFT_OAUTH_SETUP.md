# Configuración de Microsoft OAuth para Outlook Calendar

Esta guía te ayudará a configurar la autenticación OAuth con Microsoft para conectar calendarios de Outlook (tanto personales como empresariales).

## Requisitos Previos

- Una cuenta de Microsoft (personal o empresarial)
- Acceso a [Azure Portal](https://portal.azure.com)

## Paso 1: Registrar una Aplicación en Azure Portal

1. **Accede a Azure Portal**
   - Ve a https://portal.azure.com
   - Inicia sesión con tu cuenta de Microsoft

2. **Navega a Azure Active Directory**
   - En el menú lateral, busca "Azure Active Directory" o "Microsoft Entra ID"
   - O ve directamente a: https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps

3. **Registrar Nueva Aplicación**
   - Haz clic en "Registrar una aplicación" o "App registrations" > "New registration"
   - Completa el formulario:
     - **Name**: `AIssistant Calendar Integration` (o el nombre que prefieras)
     - **Supported account types**: 
       - Para soportar tanto cuentas personales como empresariales: **"Accounts in any organizational directory and personal Microsoft accounts"**
       - Solo cuentas personales: **"Personal Microsoft accounts only"**
       - Solo cuentas empresariales: **"Accounts in this organizational directory only"**
     - **Redirect URI**: 
       - Platform: **Web**
       - URI: `http://localhost:3000/settings/calendar/callback`
   - Haz clic en **"Register"**

4. **Anotar Credenciales**
   - Después del registro, verás la página de "Overview"
   - **Application (client) ID**: Este es tu `MICROSOFT_CLIENT_ID`
   - **Directory (tenant) ID**: Este es tu `MICROSOFT_TENANT_ID` (opcional, puedes usar "common")
   - **Copia estos valores** - los necesitarás más tarde

## Paso 2: Crear Client Secret

1. **Ir a Certificates & secrets**
   - En el menú lateral de tu aplicación, ve a "Certificates & secrets"
   - O directamente: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Credentials/appId/[TU_CLIENT_ID]

2. **Crear nuevo Secret**
   - Haz clic en **"+ New client secret"**
   - **Description**: `AIssistant Calendar Secret` (o el nombre que prefieras)
   - **Expires**: Elige una duración (recomendado: 24 meses)
   - Haz clic en **"Add"**

3. **Copiar el Secret Value**
   - ⚠️ **IMPORTANTE**: El valor del secret solo se muestra UNA VEZ
   - Copia el **Value** inmediatamente (no el Secret ID)
   - Este es tu `MICROSOFT_CLIENT_SECRET`
   - Guárdalo en un lugar seguro

## Paso 3: Configurar Permisos (API Permissions)

1. **Ir a API Permissions**
   - En el menú lateral, ve a "API permissions"
   - O directamente: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/ApiPermissions/appId/[TU_CLIENT_ID]

2. **Añadir Permisos**
   - Haz clic en **"+ Add a permission"**
   - Selecciona **"Microsoft Graph"**
   - Selecciona **"Delegated permissions"**

3. **Permisos Necesarios**
   Añade los siguientes permisos:
   - `Calendars.Read` - Leer eventos del calendario
   - `User.Read` - Leer información básica del usuario
   - `offline_access` - Mantener acceso sin que el usuario esté presente (para refresh tokens)

4. **Dar Consentimiento**
   - Si tu aplicación está en modo "Testing", necesitarás dar consentimiento:
     - Haz clic en **"Grant admin consent for [TU_ORGANIZACIÓN]"** (si tienes permisos de admin)
     - O cada usuario deberá dar consentimiento la primera vez que se conecte
   - Si tu aplicación está publicada, los usuarios pueden dar consentimiento automáticamente

## Paso 4: Configurar Redirect URIs

1. **Ir a Authentication**
   - En el menú lateral, ve a "Authentication"
   - O directamente: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Authentication/appId/[TU_CLIENT_ID]

2. **Añadir Redirect URIs**
   - En "Redirect URIs", asegúrate de tener:
     - `http://localhost:3000/settings/calendar/callback` (para desarrollo)
     - `https://tu-dominio.com/settings/calendar/callback` (para producción, cuando esté listo)
   - ⚠️ **IMPORTANTE**: 
     - No debe tener trailing slash (`/`)
     - Debe coincidir EXACTAMENTE con el URI usado en el código
     - Es case-sensitive

3. **Configurar Implicit Grant (opcional)**
   - Para este flujo OAuth, NO necesitas habilitar "Implicit grant"
   - Deja las opciones por defecto

4. **Guardar**
   - Haz clic en **"Save"** al final de la página

## Paso 5: Configurar Variables de Entorno

Añade las siguientes variables a tu archivo `.env`:

```env
# Microsoft OAuth (Calendar)
MICROSOFT_CLIENT_ID=tu-client-id-aqui
MICROSOFT_CLIENT_SECRET=tu-client-secret-aqui
MICROSOFT_TENANT_ID=common
```

### Explicación de Variables

- **MICROSOFT_CLIENT_ID**: El Application (client) ID que copiaste del Azure Portal
- **MICROSOFT_CLIENT_SECRET**: El Value del client secret que creaste
- **MICROSOFT_TENANT_ID**: 
  - `common`: Permite tanto cuentas personales como empresariales (recomendado)
  - `consumers`: Solo cuentas personales de Microsoft
  - `organizations`: Solo cuentas empresariales (Office 365 / Azure AD)
  - `[tenant-id]`: Un tenant específico (el Directory ID de tu organización)

## Paso 6: Reiniciar Servicios

Después de configurar las variables de entorno:

```bash
docker-compose restart backend frontend
```

## Verificación

1. **Verificar Configuración**
   - Accede a: `http://localhost:8000/api/v1/calendar/debug/oauth-config`
   - Debes estar autenticado (necesitas un token JWT válido)
   - Verás información sobre la configuración de Microsoft OAuth

2. **Probar Conexión**
   - Ve a la sección de Configuración > Calendarios
   - Deberías ver dos opciones:
     - **Outlook Personal**
     - **Outlook Empresarial**
   - Haz clic en cualquiera de ellas para iniciar el flujo OAuth

## Solución de Problemas

### Error: `redirect_uri_mismatch`

**Problema**: El redirect URI no coincide con el configurado en Azure Portal.

**Solución**:
1. Verifica que el URI en Azure Portal sea exactamente: `http://localhost:3000/settings/calendar/callback`
2. No debe tener trailing slash
3. Debe coincidir exactamente (case-sensitive)
4. Espera 2-5 minutos después de guardar en Azure Portal
5. Reinicia los servicios: `docker-compose restart backend frontend`

### Error: `AADSTS70011: The provided value for the input parameter 'scope' is not valid`

**Problema**: Los scopes no están correctamente configurados.

**Solución**:
1. Verifica que hayas añadido los permisos correctos en "API Permissions"
2. Asegúrate de que los permisos estén aprobados (con el check verde)
3. Si estás en modo "Testing", da consentimiento de admin

### Error: `AADSTS65005: Invalid client`

**Problema**: El Client ID o Client Secret son incorrectos.

**Solución**:
1. Verifica que `MICROSOFT_CLIENT_ID` sea el Application (client) ID correcto
2. Verifica que `MICROSOFT_CLIENT_SECRET` sea el Value del secret (no el Secret ID)
3. Si el secret expiró, crea uno nuevo y actualiza la variable

### Error: `AADSTS50020: User account from identity provider does not exist`

**Problema**: El tipo de cuenta no coincide con el tenant configurado.

**Solución**:
- Si intentas conectar una cuenta personal pero `MICROSOFT_TENANT_ID=organizations`, cambia a `common` o `consumers`
- Si intentas conectar una cuenta empresarial pero `MICROSOFT_TENANT_ID=consumers`, cambia a `common` o `organizations`
- Usa `common` para permitir ambos tipos

### Los proveedores de Outlook no aparecen

**Problema**: Microsoft Calendar no está configurado correctamente.

**Solución**:
1. Verifica que `MICROSOFT_CLIENT_ID` y `MICROSOFT_CLIENT_SECRET` estén configurados en `.env`
2. Verifica que no estén vacíos
3. Reinicia los servicios: `docker-compose restart backend frontend`
4. Revisa los logs: `docker-compose logs backend | grep -i microsoft`

## Tipos de Cuentas Soportadas

### Outlook Personal (`outlook_personal`)
- Usa tenant `consumers`
- Para cuentas personales de Microsoft (@outlook.com, @hotmail.com, @live.com, etc.)
- Ejemplo: `usuario@outlook.com`

### Outlook Empresarial (`outlook_business`)
- Usa tenant `organizations`
- Para cuentas de Office 365 / Azure AD empresariales
- Ejemplo: `usuario@empresa.com`

### Microsoft (Genérico)
- Usa tenant `common` (por defecto)
- Permite ambos tipos de cuentas
- El usuario elige durante el login

## Notas Importantes

1. **Client Secrets expiran**: Los secrets tienen una fecha de expiración. Asegúrate de renovarlos antes de que expiren.

2. **Modo Testing vs Publicado**: 
   - En modo "Testing", solo los usuarios añadidos como "Test users" pueden usar la app
   - Para publicar la app, ve a "Overview" > "Essentials" > "Publish an app"

3. **Límites de Rate**: Microsoft Graph API tiene límites de rate. Si sincronizas muchos calendarios, considera implementar rate limiting.

4. **Seguridad**: 
   - Nunca compartas tu `MICROSOFT_CLIENT_SECRET` públicamente
   - No lo subas a repositorios públicos
   - Usa variables de entorno o un gestor de secretos en producción

## Recursos Adicionales

- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/overview)
- [Azure Portal](https://portal.azure.com)
- [OAuth 2.0 Authorization Code Flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [Calendar API Reference](https://docs.microsoft.com/en-us/graph/api/resources/calendar)
