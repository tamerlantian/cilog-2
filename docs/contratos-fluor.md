# Contratos de API que necesita la app a Fluor

Qué se le pide al backend. La app no puede reemplazar a la actual hasta que existan los endpoints de **prioridad 1**.
Todos siguen las convenciones de Fluor: rutas `/<módulo>/<recurso>/<acción>`, campos en `snake_case`, estados como `estado_*` booleanos,
listas `{total, page, size, items}`, errores `{success:false, error:{code,message,...}, request_id}`.

- **Auth**: `Authorization: Bearer <jwt>` y `X-Tenant-ID: <id>` en todo, salvo login y `/mas/user-tenant/lista`.
- **Idempotencia**: toda escritura que la app encola offline lleva `id_operacion` (UUID v4 generado en el dispositivo).
  Si Fluor ya procesó ese `id_operacion`, responde **200 con el mismo cuerpo de la primera vez**, sin duplicar efectos.
  Se guarda por empresa (`tte_operacion_movil`: `id_operacion` único, `usuario`, `tipo`, `fecha`, `respuesta`).
- **Fechas**: ISO 8601 sin zona, hora de Colombia. La app envía la hora del dispositivo en `fecha_*` porque la operación pudo ocurrir sin red.
- **Usuario**: el que se guarda en `usuario`/`usuario_entrega` es el del JWT, nunca uno enviado por la app.

## Decisiones de producto que ya se tomaron (afectan al backend)

| Tema | Decisión |
| --- | --- |
| Duración de la sesión móvil | **Resuelto en Fluor** (`1f80800`): con `client_type=api` el login devuelve `refresh_token` de 30 días y `POST /auth/seguridad/refresh` acepta `{refresh_token}` en el body. La app ya lo usa. |
| Registro y recuperación de clave | **Resuelto en Fluor** (`329211e`): `client_type` `api`/`mobile` salta Turnstile; solo `web` lo exige. La app va como `api` y no usa WebView. |
| Usuario con conductor | Propuesta: resolver el conductor comparando `auth_user.numero_identificacion` con `tte_conductor.numero_identificacion` en la base de la empresa. Sin cambio de esquema; el registro ya exige la identificación. Alternativa: columna `codigo_conductor_fk` en `mas_user_tenant`. **Pendiente de hablar con backend.** |
| Varias empresas por usuario | **Pendiente.** La app mostrará selector si `GET /mas/user-tenant/lista` devuelve más de una. |
| Despachos offline de la app vieja | Se pierden al corte; no hay migración. |

---

## Prioridad 1: sin esto la app no puede entregar

### 1. `POST /tte/despacho/vincular`

Reemplaza `api/despacho/nuevo`. Asocia el despacho al conductor autenticado si el token coincide.

```json
// request
{"numero": 12345, "token": "A1B2"}
```

```json
// 200
{
  "codigo_despacho_pk": 9001,
  "numero": 12345,
  "codigo_despacho_clase_fk": "VIA",
  "fecha_salida": "2026-10-27T07:30:00",
  "estado_entregado": false
}
```

- 404 `NOT_FOUND` "Despacho no encontrado" si `numero` no existe. 403 `FORBIDDEN` "Token del despacho inválido" si `token` != `tte_despacho.api_token`.
- 409 `CONFLICT` "El despacho ya está asignado a otro conductor" si ya tiene `codigo_conductor_fk` distinto. 409 si el despacho está anulado o cerrado.
- Rate limit propio: 10/min por usuario, para que el token de 4 caracteres no se pueda adivinar por fuerza bruta.

### 2. `GET /tte/despacho/mis-despachos`

Despachos del conductor del usuario JWT. Query: `estado_entregado` (bool, opcional), `page`, `size`.

```json
// 200
{
  "total": 1, "page": 1, "size": 50,
  "items": [{
    "codigo_despacho_pk": 9001, "numero": 12345, "codigo_despacho_clase_fk": "VIA",
    "fecha_salida": "2026-10-27T07:30:00", "estado_entregado": false,
    "cantidad": 40, "cantidad_entregada": 12, "unidades": 55
  }]
}
```

- 404 `NOT_FOUND` "No hay un conductor asociado a tu usuario" si no se puede resolver el conductor.

### 3. `GET /tte/despacho/paquete/{codigo_despacho_pk}`

Todo lo que la app necesita para trabajar sin red, en una sola respuesta. Reemplaza `entrega/pendiente`, `nuevo/desconetado` y `datosoperador`.

```json
// 200
{
  "despacho": {"codigo_despacho_pk": 9001, "numero": 12345, "codigo_despacho_clase_fk": "VIA", "fecha_salida": "...", "estado_entregado": false, "cantidad": 40, "cantidad_entregada": 12, "unidades": 55, "peso_real": 410.5},
  "guias": [{
    "codigo_guia_pk": 777001,
    "documento_cliente": "FAC-1022",
    "nombre_remitente": "Ferretería El Tornillo",
    "nombre_destinatario": "María Pérez",
    "direccion_destinatario": "Cra 45 # 12-30",
    "telefono_destinatario": "3001234567",
    "codigo_ciudad_destino_fk": "05001",
    "ciudad_destino_nombre": "Medellín",
    "departamento_destino_nombre": "Antioquia",
    "unidades": 3, "peso_real": 12.5,
    "vr_cobro_entrega": 18000,
    "estado_entregado": false, "estado_novedad": false, "estado_recogido": true
  }],
  "destinos": ["Medellín", "Bello"],
  "novedad_tipos": [{"codigo_novedad_tipo_pk": "DIR", "nombre": "Dirección errada"}],
  "configuracion_entrega": {"exige_imagen_entrega": true, "exige_firma_entrega": true, "entrega_con_novedad": false, "calidad_imagen": 70, "limite_imagenes": 4}
}
```

- Solo guías del despacho (`tte_despacho_detalle`), con `estado_anulado = false`.
- 403 `FORBIDDEN` si el despacho no está asignado al conductor del JWT.
- `novedad_tipos` y `configuracion_entrega` son los mismos de los endpoints 7 y 9, incluidos aquí para no hacer 3 llamadas al descargar.

### 4. `POST /tte/guia/entregar`

Reemplaza `api/despacho/guia/entrega`. **Los archivos van aparte** (endpoint 5): primero se confirma la entrega, luego se suben firma y fotos.

```json
// request
{
  "id_operacion": "0f8a2c3e-7d1b-4f6a-9b52-1c3d4e5f6a7b",
  "codigo_guia_pk": 777001,
  "codigo_despacho_fk": 9001,
  "recibe": "María Pérez",
  "codigo_identificacion_fk": "CC",
  "numero_identificacion": "43123456",
  "parentesco": "TITULAR",
  "celular": "3001234567",
  "fecha_entrega": "2026-10-27T10:42:10",
  "latitud": 6.2442,
  "longitud": -75.5812
}
```

```json
// 200
{
  "codigo_guia_pk": 777001,
  "estado_entregado": true,
  "fecha_entrega": "2026-10-27T10:42:10",
  "usuario_entrega": "43987654",
  "despacho": {"cantidad": 40, "cantidad_entregada": 13, "estado_entregado": false}
}
```

- Marca `estado_entregado`, `fecha_entrega`, `usuario_entrega` y `estado_firma` (si luego llega la firma); crea `tte_seguimiento` tipo `ENTREGADO` con `latitud`/`longitud`.
- Incrementa `tte_despacho.cantidad_entregada`; si llega a `cantidad`, `tte_despacho.estado_entregado = true`.
- `latitud`, `longitud` opcionales. `parentesco` es uno de los 33 valores del catálogo de la app (`TITULAR`, `PORTERIA`, ...).
- 409 `CONFLICT` "La guía ya fue entregada" si ya estaba entregada **por otra operación**. Con el mismo `id_operacion` es idempotente (200).
- 409 si `estado_novedad = true` y `configuracion_entrega.entrega_con_novedad = false`.
- 403 si la guía no pertenece a un despacho del conductor.

### 5. `POST /doc/fichero/cargar/{codigo_modelo}/{codigo}` con tipo

Ya existe. Se pide un cambio mínimo: aceptar el campo de formulario `tipo`.

- `multipart/form-data`: `archivo` (jpg/png) y `tipo` = `F` (firma), `I` (imagen) o `G` (genérico, valor por defecto actual).
- `codigo_modelo = TteGuia`, `codigo = codigo_guia_pk`. La app envía la firma una vez y hasta 4 imágenes, cada una como petición independiente con `id_operacion` en el header `Idempotency-Key`.
- Con `tipo = F` debe poner `tte_guia.estado_firma = true`.
- Respuesta sin cambios: `201 {"codigo_fichero_pk": 123}`. Idempotente por `Idempotency-Key`.
- Límite actual de 10 MB está bien: la app comprime a máx. 1.280 px.

### 6. `POST /tte/novedad/nuevo`

```json
// request
{
  "id_operacion": "6b3c9f1e-2a4d-4c8e-8f10-aa11bb22cc33",
  "codigo_guia_pk": 777001,
  "codigo_despacho_fk": 9001,
  "codigo_novedad_tipo_fk": "DIR",
  "descripcion": "Nadie atiende en la dirección",
  "fecha": "2026-10-27T10:50:00",
  "latitud": 6.2442,
  "longitud": -75.5812
}
```

```json
// 201
{"codigo_novedad_pk": 5521, "codigo_guia_fk": 777001, "estado_novedad": true, "fecha": "2026-10-27T10:50:00"}
```

- Crea `tte_novedad` (`ingreso_api = true`, `aplica_guia = true`, `usuario` del JWT) y marca `tte_guia.estado_novedad = true` y `tte_despacho.estado_novedad = true`.
- 404 si el tipo no existe o `aplica_movil = false`. `descripcion` máx. 2000 caracteres (columna existente).

### 7. `GET /tte/novedad-tipo/descargar`

Query `aplica_movil` (bool, por defecto `true`). Sin paginación (catálogo para caché).

```json
// 200
[{"codigo_novedad_tipo_pk": "DIR", "nombre": "Dirección errada", "aplica_movil": true}]
```

### 8. `POST /tte/despacho/terminar`

```json
// request
{"id_operacion": "c1d2e3f4-0000-4000-8000-000000000001", "codigo_despacho_pk": 9001, "fecha": "2026-10-27T16:05:00"}
```

```json
// 200
{"codigo_despacho_pk": 9001, "estado_entregado": true, "fecha_entrega": "2026-10-27T16:05:00", "cantidad": 40, "cantidad_entregada": 40}
```

- 409 `CONFLICT` "Quedan guías sin gestionar" si hay guías sin entregar y sin novedad. Se pide la regla exacta al negocio: hoy la app permite terminar cuando la lista de pendientes queda vacía.

---

## Prioridad 2: recogidas, ingreso, posición y sesión

### 9. `GET /tte/configuracion/entrega`

Config de entrega de la empresa. Reemplaza `operador/datosoperador` y `calidadimagenentrega`.

```json
// 200
{"exige_imagen_entrega": true, "exige_firma_entrega": true, "entrega_con_novedad": false, "calidad_imagen": 70, "limite_imagenes": 4}
```

### 10. `POST /tte/guia/recogido` (ampliar)

Hoy acepta solo `{guia}`. La app necesita además unidades, producto y ubicación.

```json
{"id_operacion": "uuid", "guia": 777001, "unidades": 3, "codigo_producto_fk": "PAQ", "fecha": "2026-10-27T08:15:00", "latitud": 6.24, "longitud": -75.58}
```

La respuesta actual `{codigo_guia_pk, estado_recogido, fecha_recogido}` se mantiene. Los campos nuevos son opcionales para no romper a otros clientes.

### 11. `POST /tte/guia/ingreso` (ampliar)

```json
{"id_operacion": "uuid", "guia": 777001, "unidades": 3, "codigo_producto_fk": "PAQ", "fecha": "2026-10-27T09:00:00"}
```

Respuesta actual se mantiene. Si `unidades` difiere de `tte_guia.unidades`, debe registrar la diferencia (hoy la app envía el valor corregido por el usuario).

### 12. `POST /tte/despacho/posicion`

Monitoreo: reemplaza `api/despacho/monitoreo/detalle/nuevo`.

```json
{"id_operacion": "uuid", "codigo_despacho_pk": 9001, "latitud": 6.2442, "longitud": -75.5812, "comentario": "Parada por tráfico", "fecha_reporte": "2026-10-27T12:00:00"}
```

```json
// 201
{"codigo_monitoreo_detalle_pk": 3301, "codigo_despacho_pk": 9001, "fecha_reporte": "2026-10-27T12:00:00"}
```

Escribe `tte_despacho.ultima_latitud/longitud`, `fecha_ultimo_reporte` y crea `tte_monitoreo_detalle`.

### 13. `POST /auth/user/cambiar-clave`

```json
{"clave_actual": "********", "clave_nueva": "********"}
```

`200 {"detail": "Clave actualizada correctamente"}`. 401/400 si la clave actual no coincide. Debe aplicar las mismas reglas de complejidad que `restablecer-clave`.

### 14. `PUT /auth/user/actualizar` (ampliar)

Agregar `celular` (opcional, máx. 20) al body y a `PerfilResponse`. Hoy solo acepta nombres, apellidos e identificación.

### 15. `POST /auth/dispositivo`

Registro del token push (FCM).

```json
{"token_fcm": "fcm-token", "plataforma": "android"}
```

`204`. Un usuario puede tener varios dispositivos; el mismo token se reasigna al último usuario que lo registra. Se pide aunque el envío de push lo haga otro servicio.

### 16. Refresh / sesión móvil

**Hecho en Fluor (`1f80800`)**: login con `client_type=api` devuelve `{access_token, refresh_token, token_type, user}` (access 60 min, refresh 30 días) y `POST /auth/seguridad/refresh` con `{refresh_token}` devuelve `{access_token, token_type}` (10/min).

Mejoras opcionales que se pueden pedir: rotar el refresh token en cada renovación y poder revocarlo (hoy `logout` solo borra cookies, así que un refresh robado sirve hasta que vence).

---

## Opcional: mejoras que reducen peticiones

- `POST /tte/guia/entregar` en lote: `{"entregas": [ ... ]}` con respuesta por elemento `{id_operacion, ok, error?}`. Si no existe, la app envía una por una.
- Soporte de `ETag`/`If-None-Match` en `GET /tte/despacho/paquete/{pk}` para no re-descargar un despacho sin cambios.

## Qué no se pide (descartado en esta versión)

Cupones, foto de perfil, noticias, mapa de ruta, listado de viajes del cliente y "solicitar ayuda".


## Enlaces de correo hacia la app (prioridad 2)

Hoy los correos de verificación y de restablecer clave abren la web (`frontend_url` → `APP_URL` o un origen de `FRONTEND_URLS`). Para que abran la app hay que:

1. Publicar un dominio con Android App Links / iOS Universal Links (`assetlinks.json` y `apple-app-site-association`) o aceptar un esquema propio.
2. Que `frontend_url` use ese dominio cuando la petición venga del cliente móvil (p. ej. un header `X-Client: mobile`).
3. En la app, pantallas para `verify-email?token=` y `restablecer-clave?token=` (esta última con `POST /auth/user/restablecer-clave`, que también exige Turnstile).

Mientras tanto la app pide el correo y el usuario completa el paso en la web.
