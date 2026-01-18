# Configuración de Google OAuth para Calendario

## Errores Comunes y Soluciones

### Error 1: redirect_uri_mismatch (Error 400)

Si recibes el error `Error 400: redirect_uri_mismatch`, significa que el URI de redirección no está registrado en Google Cloud Console.

### Error 2: access_denied (Error 403)

Si recibes el error `Error 403: access_denied` con el mensaje "Acceso bloqueado: [App] no ha completado el proceso de verificación de Google", significa que:

1. **La aplicación está en modo de prueba** (no verificada por Google)
2. **Solo los usuarios de prueba pueden acceder**
3. Necesitas añadir tu email como usuario de prueba O completar la verificación de Google

## Soluciones

### Solución para Error 403: access_denied (Modo de Prueba)

Si tu aplicación está en modo de prueba, necesitas añadir usuarios de prueba:

#### 1. Acceder a OAuth Consent Screen

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** > **OAuth consent screen**

#### 2. Añadir Usuarios de Prueba

1. En la sección **Test users**, haz clic en **+ ADD USERS**
2. Añade el email que quieres usar para probar (ej: `sermoyamarin@gmail.com`)
3. Haz clic en **ADD**
4. **Importante**: Los usuarios de prueba deben aceptar la invitación que recibirán por email

#### 3. Verificar que la App esté en Modo de Prueba

- En **OAuth consent screen**, verifica que el **Publishing status** sea **Testing**
- Si está en **In production**, necesitarás completar la verificación de Google (proceso más largo)

#### 4. Alternativa: Hacer la App Pública (No Recomendado para Desarrollo)

⚠️ **Advertencia**: Hacer la app pública requiere completar el proceso de verificación de Google, que puede tardar varios días y requiere información adicional.

Para desarrollo local, es mejor usar usuarios de prueba.

---

### Solución para Error 400: redirect_uri_mismatch

#### 1. Acceder a Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto (o crea uno nuevo)
3. Ve a **APIs & Services** > **Credentials**

### 2. Configurar OAuth 2.0 Client ID

1. Haz clic en **Create Credentials** > **OAuth client ID**
2. Si es la primera vez, configura la pantalla de consentimiento OAuth
3. Selecciona **Application type**: **Web application**
4. En **Authorized redirect URIs**, añade:
   ```
   http://localhost:3000/settings/calendar/callback
   ```
   
   Si estás usando un dominio diferente, añade también:
   ```
   http://tu-dominio.com/settings/calendar/callback
   ```

### 3. Copiar Credenciales

1. Copia el **Client ID** y el **Client secret**
2. Añádelos a tu archivo `.env`:
   ```
   GOOGLE_CLIENT_ID=tu-client-id-aqui
   GOOGLE_CLIENT_SECRET=tu-client-secret-aqui
   ```

### 4. Reiniciar la Aplicación

```bash
docker-compose restart backend frontend
```

## Notas Importantes

### Para Desarrollo Local (Modo de Prueba)

- ✅ Añade tu email como **Test user** en OAuth consent screen
- ✅ Asegúrate de que el **Publishing status** sea **Testing**
- ✅ El `redirect_uri` debe coincidir **exactamente** con el registrado
- ✅ El `redirect_uri` actual usado por la aplicación es: `http://localhost:3000/settings/calendar/callback`

### Para Producción

- ⚠️ Necesitarás completar el proceso de verificación de Google
- ⚠️ El proceso puede tardar varios días
- ⚠️ Requiere información adicional sobre tu aplicación
- ⚠️ Asegúrate de registrar el dominio correcto en **Authorized redirect URIs**

## Verificación

Después de configurar, intenta conectar el calendario nuevamente.

### Si recibes Error 403: access_denied

1. ✅ Verifica que tu email esté en la lista de **Test users**
2. ✅ Asegúrate de que el **Publishing status** sea **Testing**
3. ✅ Acepta la invitación de usuario de prueba si la recibiste por email
4. ✅ Espera unos minutos después de añadir el usuario de prueba

### Si recibes Error 400: redirect_uri_mismatch

1. ✅ Verifica que el `redirect_uri` en Google Cloud Console coincida exactamente
2. ✅ No incluyas trailing slashes (`/`) a menos que estén registrados
3. ✅ Asegúrate de que las credenciales estén correctas en `.env`
4. ✅ Reinicia los servicios Docker: `docker-compose restart backend frontend`

## Verificación con Endpoint de Depuración

Puedes verificar tu configuración usando el endpoint de depuración:

1. **Accede al endpoint** (requiere autenticación):
   ```
   GET http://localhost:8000/api/v1/calendar/debug/oauth-config
   ```
   
   O desde el navegador (después de iniciar sesión):
   ```
   http://localhost:8000/api/v1/calendar/debug/oauth-config
   ```

2. **Verifica la información mostrada:**
   - El `client_id` debe coincidir con el de Google Cloud Console
   - El `expected_redirect_uri` debe ser exactamente el que añadiste en Google Cloud Console
   - El `auth_url_example` muestra cómo se construye la URL de autorización

3. **Compara con Google Cloud Console:**
   - Ve a Google Cloud Console → APIs & Services → Credentials
   - Edita tu OAuth 2.0 Client ID
   - Verifica que el Client ID coincida
   - Verifica que el redirect_uri en "Authorized redirect URIs" sea exactamente igual

## Resumen de Pasos Rápidos

### Para Error 403 (Modo de Prueba)

1. Google Cloud Console → APIs & Services → OAuth consent screen
2. Sección **Test users** → **+ ADD USERS**
3. Añade tu email: `sermoyamarin@gmail.com`
4. Acepta la invitación por email (si la recibes)
5. Intenta conectar el calendario nuevamente

### Para Error 400 (redirect_uri)

#### Verificación Paso a Paso

1. **Verifica el Client ID que estás usando:**
   - Abre tu archivo `.env` y copia el valor de `GOOGLE_CLIENT_ID`
   - Ve a Google Cloud Console → APIs & Services → Credentials
   - Busca el OAuth 2.0 Client ID que coincida con el de tu `.env`
   - ⚠️ **IMPORTANTE**: Asegúrate de estar editando el Client ID correcto

2. **Verifica el redirect_uri exacto:**
   - El redirect_uri debe ser **exactamente**: `http://localhost:3000/settings/calendar/callback`
   - ❌ **NO debe tener trailing slash**: `http://localhost:3000/settings/calendar/callback/`
   - ❌ **NO debe tener espacios**: `http://localhost:3000/settings/calendar/callback `
   - ❌ **NO debe tener mayúsculas**: `http://Localhost:3000/settings/calendar/callback`
   - ✅ **Debe ser exactamente**: `http://localhost:3000/settings/calendar/callback`

3. **Añade el redirect_uri en Google Cloud Console:**
   - Edita tu OAuth 2.0 Client ID
   - En **Authorized redirect URIs**, haz clic en **+ ADD URI**
   - Añade exactamente: `http://localhost:3000/settings/calendar/callback`
   - **Copia y pega** para evitar errores de tipeo
   - Haz clic en **SAVE**

4. **Espera la propagación:**
   - Los cambios en Google Cloud Console pueden tardar **2-5 minutos** en propagarse
   - No intentes conectar inmediatamente después de guardar

5. **Reinicia los servicios:**
   ```bash
   docker-compose restart backend frontend
   ```

6. **Verifica que el Client ID coincida:**
   - El `GOOGLE_CLIENT_ID` en tu `.env` debe coincidir con el Client ID en Google Cloud Console
   - Si tienes múltiples proyectos, asegúrate de estar usando el correcto

#### Problemas Comunes

- **Múltiples OAuth Client IDs**: Si tienes varios, asegúrate de usar el correcto en `.env`
- **Proyecto incorrecto**: Verifica que estés editando el Client ID del proyecto correcto
- **Cambios no guardados**: Asegúrate de hacer clic en **SAVE** después de añadir el redirect_uri
- **Propagación lenta**: Espera 2-5 minutos después de guardar antes de intentar de nuevo

