# Contratos de API que necesita la app a Fluor

Qué se le pide al backend. La app no puede reemplazar a la actual hasta que existan los endpoints de **prioridad 1**.
Todos siguen las convenciones de Fluor: rutas `/<módulo>/<recurso>/<acción>`, campos en `snake_case`, estados como `estado_*` booleanos,
listas `{total, page, size, items}`, errores `{success:false, error:{code,message,...}, request_id}`.

- **Auth**: `Authorization: Bearer <jwt>` y `X-Tenant-ID: <id>` en todo, salvo login y `/mas/user-tenant/lista`.
- **Reenvíos**: la app reenvía una operación cuando se pierde la respuesta. Fluor decidió no usar `id_operacion` (6 nov 2026): cada endpoint debe responder un `409` reconocible cuando la acción ya estaba aplicada (la entrega usa `error.entrega = true`), para que la app lo dé por recibido.
- **Fechas**: ISO 8601 sin zona, hora de Colombia. La app envía la hora del dispositivo en `fecha_*` porque la operación pudo ocurrir sin red.
- **Usuario**: el que se guarda en `usuario`/`usuario_entrega` es el del JWT, nunca uno enviado por la app.

## Decisiones de producto que ya se tomaron (afectan al backend)

| Tema | Decisión |
| --- | --- |
| Duración de la sesión móvil | **Resuelto en Fluor** (`1f80800`): con `client_type=api` el login devuelve `refresh_token` de 30 días y `POST /auth/seguridad/refresh` acepta `{refresh_token}` en el body. La app ya lo usa. |
| Registro y recuperación de clave | **Resuelto en Fluor** (`329211e`): `client_type` `api`/`mobile` salta Turnstile; solo `web` lo exige. La app va como `api` y no usa WebView. |
| Usuario con despachos | **Resuelto en Fluor**: el acceso es por asignación (`mas_tenant_despacho`), no por conductor ni por `user_tenant`. |
| Varias empresas por usuario | Despachos: no se elige empresa. Ingreso y envíos: la app muestra selector si `GET /mas/user-tenant/lista` devuelve más de una. |
| Despachos offline de la app vieja | Se pierden al corte; no hay migración. |

---

## Pendiente de confirmar con operaciones

- **Recaudo en la entrega.** Cada guía trae `vr_recaudo` y `vr_cobro_entrega`. La app anterior solo mostraba `vr_cobro_entrega` como "Cobro" y no leía el recaudo; la app nueva hace lo mismo para "por cobrar" (`aCobrar` en `features/despachos/domain/gestion.ts`) y muestra el recaudo solo como dato en el detalle de la guía. Falta confirmar si el conductor también cobra el recaudo en la puerta: si es así, `aCobrar` debe sumarlo.

## Prioridad 1: sin esto la app no puede entregar

### 1 a 3. Vincular, mis despachos y paquete offline: **hechos en Fluor** (`2fedfa9`…`9a16d3b`)

Fluor los resolvió con otro diseño: el repartidor no se asocia a un conductor, sino a **asignaciones** en `mas_tenant_despacho` (base maestra). No necesita `user_tenant` ni `X-Tenant-ID` para sus despachos, y puede tener despachos de varias empresas. La app ya los usa (`features/despachos/api/despachos.ts`).

| Endpoint | Uso en la app |
| --- | --- |
| `POST /mas/tenant-despacho/cargar` `{tenant_id, codigo_despacho, token_despacho}` | Vincular. 404 igual para empresa, despacho o token inválidos (o despacho cerrado/entregado); 409 si es de otro repartidor. 5/min. |
| `GET /mas/tenant-despacho/lista` (paginado) | Mis despachos: `{id, fecha, tenant_id, tenant_nombre, codigo_despacho}`. |
| `DELETE /mas/tenant-despacho/eliminar/{id}` | Desvincular (también lo puede hacer el control de la empresa). |
| `GET /tte/movil/despacho/{id}/guias` | Todas las guías del despacho para trabajar sin señal, con `estado_entregado`, `estado_novedad`, recaudo, orden de ruta y coordenadas. |

Pendiente o por confirmar:

- **Formato del QR** que imprime la web: debe llevar `tenant_id`, `codigo_despacho` y `token_despacho`. Mientras tanto la app vincula con ingreso manual.
- `/lista` devuelve solo la asignación. Para pintar la lista sin descargar cada despacho convendría agregar `numero`, `fecha_salida`, `cantidad` y `cantidad_entregada` (no bloquea: la app las calcula de las guías descargadas).
- El paquete no trae `novedad_tipos` ni `configuracion_entrega`: siguen haciendo falta los endpoints 7 y 9.
- Las rutas nuevas de escritura (4, 5, 6, 8) deberían validar acceso igual que `/tte/movil/despacho/{id}/...` (por asignación), porque el repartidor no tiene `user_tenant`.
  Propuesta: colgarlas de la misma ruta, p. ej. `POST /tte/movil/despacho/{tenant_despacho_id}/guia/{codigo_guia}/entregar`. La app guarda `tenant_despacho_id` en cada operación de la cola, así que puede armar esa URL sin `X-Tenant-ID`.

### Lo que la app ya guarda mientras tanto (paso 3a)

Entregar, novedad y terminar ya funcionan en la app: se guardan en el teléfono y quedan en la cola como *Por enviar* hasta que existan estos endpoints. El cuerpo se guarda listo, con la forma de §4, §6 y §8 (sin `id_operacion`, que lo pone el envío). Valores **provisionales** que hay que cambiar antes de activar el envío:

| Qué | Provisional en la app | Se reemplaza con |
| --- | --- | --- |
| Tipos de novedad | 6 códigos inventados (`AUSENTE`, `DIRECCION`, `CERRADO`, `RECHAZO`, `AVERIA`, `OTRO`) en `domain/gestion.ts`. **No existen en Fluor**: allá los tipos son de cada empresa (`tte_novedad_tipo.codigo_empresa_fk`). | §7, descargado por empresa del despacho |
| Configuración de entrega | Foto y firma opcionales; no se entrega una guía con novedad. | §9 |
| Tipo de documento de quien recibe | No se pide ni se envía `codigo_identificacion_fk` (el legacy tampoco lo pedía). Fluor debería aceptarlo opcional. | Decisión de negocio |
| Ubicación | Se envían `latitud`/`longitud` en entrega y novedad cuando el GPS responde; si no, van en null. | — |
| Fotos y firma | Cada archivo es una operación (`foto` o `firma`) que depende de la entrega, con cuerpo `{codigo_modelo: "TteGuia", codigo, tipo: "I"/"F"}`; el archivo está en la tabla `archivos`. Se subirán con §5 y `Idempotency-Key` = `id_operacion`. | §5 |

Lo que se encole con los tipos de novedad provisionales Fluor lo rechazaría (404). Antes de activar el envío de novedades hay que tener el catálogo real; las de prueba se descartan desde *Envíos*.

### 4 y 5. Entrega con fotos y firma: **hecho en Fluor** como `POST /tte/guia/entrega` (`b88a416`…`d517c77`)

Una sola petición `multipart/form-data`: `datos` (JSON), `imagenes` (0 a 4) y `firma` (PNG). Reemplaza lo que aquí se pedía como `/tte/guia/entregar` + `/doc/fichero/cargar`. El contrato que usa la app está en `docs/offline.md` §12.1.

Decidido por backend (6 nov 2026), y ya aplicado en la app:

- Sin `id_operacion` ni `Idempotency-Key`. Si la guía ya estaba entregada responde `409` con `error.entrega = true`; la app lo toma como recibida (reenvío propio o entrega de otra persona, no se distingue).
- Sin códigos de error propios.
- Si un archivo falla después de guardar la entrega, responde `200` con `ficheros_con_error > 0`; lo resuelve backend.

**Falta (bloqueante)**: hoy usa `get_tenant_db` (`X-Tenant-ID` + `user_tenant`) y el conductor, que no es usuario de la empresa, recibe `403`. Debe validar el acceso por la asignación (`mas_tenant_despacho`), como `GET /tte/movil/despacho/{id}/guias`, y que la guía sea de ese despacho.

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
- Soporte de `ETag`/`If-None-Match` en `GET /tte/movil/despacho/{id}/guias` para no re-descargar un despacho sin cambios.

## Qué no se pide (descartado en esta versión)

Cupones, foto de perfil, noticias, mapa de ruta, listado de viajes del cliente y "solicitar ayuda".


## Enlaces de correo hacia la app (prioridad 2)

Hoy los correos de verificación y de restablecer clave abren la web (`frontend_url` → `APP_URL` o un origen de `FRONTEND_URLS`). Para que abran la app hay que:

1. Publicar un dominio con Android App Links / iOS Universal Links (`assetlinks.json` y `apple-app-site-association`) o aceptar un esquema propio.
2. Que `frontend_url` use ese dominio cuando la petición venga del cliente móvil (p. ej. un header `X-Client: mobile`).
3. En la app, pantallas para `verify-email?token=` y `restablecer-clave?token=` (esta última con `POST /auth/user/restablecer-clave`, que también exige Turnstile).

Mientras tanto la app pide el correo y el usuario completa el paso en la web.
