# CoopManager - Coopeenortol

Sistema integral de gestión cooperativa para **Coopeenortol** (Cooperativa de Profesores).

## 🚀 Stack Tecnológico

- **Frontend:** Next.js 16 + React 19
- **Backend:** Next.js API Routes + Prisma ORM
- **Base de Datos:** PostgreSQL 16
- **Autenticación:** NextAuth.js v5
- **Validación:** Zod v4
- **Despliegue:** Docker + GitHub Actions CI/CD

## 📦 Módulos Implementados

| # | Módulo | Estado |
|---|--------|--------|
| 1 | Autenticación, Usuarios, Roles y Permisos | ✅ |
| 2 | Parametrización y Catálogos | ✅ |
| 3 | Asociados y Beneficiarios | ✅ |
| 4 | Aportes y Recaudos | ✅ |
| 5 | Créditos (básicos + scoring + codeudores + refinanciación) | ✅ |
| 6 | Libranzas y Entidades Pagadoras | ✅ |
| 7 | CDATs (Certificados de Depósito) | ✅ |
| 8 | Contabilidad (PUC, Reglas, Comprobantes) | ✅ |
| 9 | Portal del Asociado | ✅ |
| 10 | Notificaciones (Email + WhatsApp) | ✅ |
| 11 | Fondos Sociales y Bienestar | ✅ |
| 12 | Reportes PDF/Excel y Certificados Tributarios | ✅ |
| 13 | Cartera Avanzada (provisiones, acuerdos de pago) | ✅ |
| 14 | Asambleas y Votaciones | ✅ |
| 15 | Tesorería y Conciliación Bancaria | ✅ |
| 16 | Docker + CI/CD | ✅ |

## 🛠️ Desarrollo Local

### Prerrequisitos

- Node.js 20+
- Docker Desktop (para PostgreSQL)

### Setup rápido

```bash
# 1. Clonar el proyecto
git clone <repo-url> && cd Coopeenortol

# 2. Instalar dependencias
npm install

# 3. Levantar PostgreSQL con Docker
docker compose up -d db

# 4. Configurar variables de entorno
cp .env.example .env

# 5. Ejecutar migraciones y seed
npm run db:migrate
npm run db:seed

# 6. Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

### Credenciales por defecto (seed)

| Rol | Email | Contraseña |
|-----|-------|------------|
| Super Admin | admin@coopeenortol.com | Admin123! |

## 🐳 Docker

### Desarrollo (todo en Docker)

```bash
# Levantar app + db
npm run docker:dev

# Ver logs
npm run docker:logs

# Detener
npm run docker:dev:down
```

### Producción

```bash
# 1. Crear archivo de variables
cp .env.example .env.production

# 2. Editar .env.production con valores reales
#    Obligatorios: DB_PASSWORD, AUTH_SECRET, APP_URL

# 3. Levantar en producción
npm run docker:prod

# 4. Verificar salud
curl http://localhost:3000/api/health
```

### Construcción manual de imagen

```bash
docker build -t coopmanager .
```

## 🔄 CI/CD (GitHub Actions)

### Pipeline CI (`.github/workflows/ci.yml`)

Se ejecuta en cada push a `main`/`develop` y en PRs:

1. **Lint & TypeCheck** - ESLint + TypeScript
2. **Build** - Compilación de Next.js
3. **Docker Build** - Verifica que la imagen Docker se construye correctamente
4. **Prisma Validate** - Valida el schema de Prisma

### Pipeline Deploy (`.github/workflows/deploy.yml`)

Se ejecuta en push a `main` o manualmente:

1. **Build & Push** - Construye imagen y la sube a GitHub Container Registry
2. **Deploy** - Conecta por SSH al servidor y actualiza el servicio
3. **Health Check** - Verifica que la aplicación responde correctamente

#### Secrets necesarios para Deploy

| Secret | Descripción |
|--------|-------------|
| `DEPLOY_HOST` | IP/dominio del servidor |
| `DEPLOY_USER` | Usuario SSH |
| `DEPLOY_SSH_KEY` | Llave privada SSH |
| `DEPLOY_PATH` | Ruta del proyecto en el servidor |
| `APP_PORT` | Puerto de la aplicación (default: 3000) |

## 📁 Estructura del Proyecto

```
Coopeenortol/
├── .github/workflows/      # CI/CD pipelines
├── prisma/
│   ├── schema.prisma       # Esquema de base de datos
│   ├── seed.ts             # Datos iniciales
│   └── migrations/         # Migraciones SQL
├── src/
│   ├── app/
│   │   ├── (auth)/         # Páginas de login
│   │   ├── (dashboard)/    # Páginas del dashboard
│   │   │   ├── tesoreria/  # Módulo de tesorería
│   │   │   ├── asambleas/  # Módulo de asambleas
│   │   │   └── ...         # Otros módulos
│   │   └── api/            # API Routes
│   ├── lib/
│   │   ├── services/       # Lógica de negocio
│   │   ├── validations/    # Schemas Zod
│   │   ├── constants.ts    # Constantes del sistema
│   │   ├── prisma.ts       # Cliente Prisma
│   │   └── auth.ts         # Configuración NextAuth
│   └── types/              # Tipos TypeScript
├── Dockerfile              # Multi-stage build
├── docker-compose.yml      # Desarrollo
├── docker-compose.prod.yml # Producción
└── package.json
```

## 📝 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | Ejecutar ESLint |
| `npm run typecheck` | Verificar tipos TypeScript |
| `npm run db:migrate` | Crear/aplicar migraciones (dev) |
| `npm run db:migrate:deploy` | Aplicar migraciones (prod) |
| `npm run db:seed` | Ejecutar seed de datos |
| `npm run db:studio` | Prisma Studio (GUI) |
| `npm run docker:dev` | Docker desarrollo |
| `npm run docker:prod` | Docker producción |
| `npm run docker:build` | Construir imagen Docker |
| `npm run docker:logs` | Ver logs del contenedor |

## 📄 Licencia

Propiedad de Coopeenortol. Todos los derechos reservados.
