# CoopManager

Sistema web enterprise para la gestion integral de una cooperativa de asociados de profesores.

CoopManager esta construido con Next.js 16, React 19, TypeScript, Prisma ORM, PostgreSQL, NextAuth.js v5 beta, Zod y una capa de servicios de negocio aislada en `src/lib/services`.

## Stack

| Capa | Tecnologia |
| --- | --- |
| Frontend | Next.js 16 App Router, React 19, TypeScript |
| Backend | Route Handlers de Next.js, servicios TypeScript |
| Base de datos | PostgreSQL, Prisma ORM |
| Seguridad | NextAuth.js, RBAC, auditoria |
| Validacion | Zod |
| UI | CSS variables, Tailwind-compatible styling, lucide-react |
| Storage | Local, AWS S3, Google Drive |
| Notificaciones | Email HTTP API, WhatsApp Meta Cloud API |

## Requisitos

- Node.js 18+
- PostgreSQL 16 o Docker/Docker Compose
- npm

## Instalacion local

```bash
npm install
cp .env.example .env
docker-compose up -d
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Acceso local:

```text
http://localhost:3000
```

Credenciales de seed:

| Usuario | Password |
| --- | --- |
| admin@coopeenortol.com | Admin123! |

## Variables de entorno

Las variables minimas estan documentadas en `.env.example`.

Storage soportado:

- `STORAGE_PROVIDER=local`
- `STORAGE_PROVIDER=s3`
- `STORAGE_PROVIDER=google_drive`

Notificaciones:

- Email real se activa con `EMAIL_ENABLED=true` y `EMAIL_API_URL`.
- WhatsApp real se activa con `WHATSAPP_ENABLED=true`, `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID`.
- Si los canales estan apagados, CoopManager registra la notificacion como `OMITIDO`, util para desarrollo local.

## Modulos implementados

### Core

- Seguridad, login, sesiones y RBAC granular.
- Usuarios, roles y permisos.
- Auditoria de acciones criticas.
- Parametrizacion de catalogos y configuracion global.
- Dashboard con KPIs operativos.
- Perfil de usuario.

### Personas y asociados

- CRUD de personas y asociados.
- Beneficiarios.
- Documentos por asociado.
- Numeracion automatica de asociado.
- Estados operativos del asociado.

### Aportes, ahorros y recaudos

- Aportes ordinarios, extraordinarios y cuota de ingreso.
- Cuenta de ahorros por asociado.
- Recaudos individuales y en lote.
- Recibos con numeracion automatica.
- Anulaciones con reversion de saldos.

### Creditos y cartera

- Solicitud de credito.
- Simulador de cuota.
- Tabla de amortizacion.
- Aprobacion, desembolso y pagos.
- Cartera, mora y aging.

### Fase A: Libranzas y archivos planos

- Entidades pagadoras: Secretaria de Educacion, colegios u otros pagadores.
- Lotes de libranza para descuentos por nomina.
- Detalle por asociado y concepto.
- Generacion de archivo plano.
- Conciliacion de pagos de nomina.
- APIs protegidas por RBAC y servicios en `src/lib/services`.

Rutas principales:

- `/libranzas`
- `/api/entidades-pagadoras`
- `/api/libranzas`

### Fase B: CDATs

- Productos CDAT parametrizables.
- Inversiones a plazo con tasa, plazo, fecha de vencimiento y capital.
- Calculo de intereses.
- Movimientos de apertura, causacion, cancelacion y renovacion.
- APIs y UI protegidas.

Rutas principales:

- `/cdats`
- `/api/cdat-productos`
- `/api/cdats`

### Fase C: Contabilidad integrada

- Plan de cuentas.
- Reglas contables por evento de negocio.
- Asientos contables automaticos.
- Lineas debito/credito balanceadas.
- Integracion automatica desde aportes, creditos y CDATs.

Rutas principales:

- `/contabilidad`
- `/api/contabilidad/cuentas`
- `/api/contabilidad/reglas`
- `/api/contabilidad/asientos`

### Fase D: Portal del asociado

- Relacion entre usuario y asociado.
- Resumen de aportes, creditos, CDATs y documentos.
- Descarga de extracto.
- Generacion de certificado.
- Simulador de credito de autogestion.
- Rol `ASSOCIATE` y permisos especificos de portal.

Rutas principales:

- `/portal-asociado`
- `/api/portal-asociado/resumen`
- `/api/portal-asociado/extracto`
- `/api/portal-asociado/certificado`
- `/api/portal-asociado/simulador`

### Fase E: Cloud storage y notificaciones

- Abstraccion `StorageProvider` extendida.
- Proveedor local.
- Proveedor AWS S3 con firma SigV4 nativa.
- Proveedor Google Drive por API REST.
- Metadatos de almacenamiento en documentos: proveedor, bucket y checksum.
- Plantillas de notificacion.
- Logs de notificacion.
- Envio manual desde UI.
- Notificacion automatica al cargar documentos.
- Estado operativo de storage, email y WhatsApp.

Rutas principales:

- `/integraciones`
- `/api/integraciones/estado`
- `/api/integraciones/plantillas`
- `/api/integraciones/notificaciones`

## Estructura

```text
src/
  app/
    (dashboard)/
      aportes/
      asociados/
      cartera/
      cdats/
      contabilidad/
      creditos/
      dashboard/
      integraciones/
      libranzas/
      portal-asociado/
      recaudos/
    api/
      cdats/
      contabilidad/
      integraciones/
      libranzas/
      portal-asociado/
  lib/
    services/
    storage/
    validations/
    auth.ts
    constants.ts
    prisma.ts
prisma/
  migrations/
  schema.prisma
  seed.ts
```

## Scripts utiles

```bash
npm run dev
npm run build
npm run lint
npx tsc --noEmit
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

## Validacion de entrega

Ultima validacion ejecutada para las fases A-E:

```text
npx prisma migrate dev --skip-generate
npx prisma db seed
npx tsc --noEmit
npm run lint
npm run build
```

## Pendientes sugeridos

- Fondos de bienestar y solidaridad.
- Asambleas, quorum y votaciones seguras.
- Reportes avanzados en Excel/PDF.
- CI/CD y Dockerfile de produccion.
- Configuracion de proveedores reales de email, WhatsApp, S3 o Google Drive por ambiente.
