# CoopManager — Sistema de Gestión Cooperativa

Sistema web para la gestión integral de cooperativas de ahorro y crédito.  
Desarrollado con **Next.js 16**, **Prisma ORM**, **PostgreSQL** y **NextAuth.js**.

---

## 🚀 Tecnologías

| Categoría | Tecnología |
|-----------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Backend | Next.js API Routes, Prisma ORM |
| Base de Datos | PostgreSQL 16 |
| Autenticación | NextAuth.js (credenciales + RBAC) |
| Validación | Zod |
| Estilos | CSS Variables + diseño propio |

## 📦 Requisitos

- Node.js 18+
- Docker y Docker Compose (para PostgreSQL)

## ⚡ Instalación

```bash
# 1. Clonar el repositorio
git clone <repo-url> && cd coopmanager

# 2. Instalar dependencias
npm install

# 3. Copiar variables de entorno
cp .env.example .env

# 4. Levantar PostgreSQL
docker-compose up -d

# 5. Ejecutar migraciones
npx prisma migrate dev --name init

# 6. Poblar base de datos
npx prisma db seed

# 7. Iniciar servidor de desarrollo
npm run dev
```

Acceder a: **http://localhost:3000**

### Credenciales por defecto

| Usuario | Contraseña |
|---------|-----------|
| admin@coopeenortol.com | Admin123! |

---

## 📋 Módulos

### Fase 1 — Administración
- **Usuarios**: CRUD completo, activación/desactivación, asignación de roles
- **Roles y Permisos**: RBAC con 31 permisos granulares y 7 roles predefinidos
- **Parametrización**: Catálogos del sistema y configuración global
- **Auditoría**: Registro completo de todas las acciones del sistema

### Fase 2 — Asociados
- Registro de personas con datos demográficos, contacto y laborales
- Generación automática de número de asociado (`ASO-YYYY-NNNN`)
- Flujo de estados: Pendiente → Activo → Inactivo/Suspendido/Retirado
- Gestión de beneficiarios con porcentajes
- Historial de cambios del asociado

### Fase 3 — Aportes y Recaudos
- Aportes individuales y en lote (ordinarios, extraordinarios, cuota de ingreso)
- Cuenta de ahorros automática por asociado
- Generación automática de recibo (`REC-YYYY-NNNN`)
- Anulación de aportes con reversión de saldo

### Fase 4 — Créditos
- Solicitud de crédito con simulador de cuota en tiempo real
- Generación automática de número de crédito (`CRE-YYYY-NNNN`)
- Aprobación con tabla de amortización (sistema francés, cuota fija)
- Desembolso y registro de pagos
- Flujo: Solicitud → Aprobado → Vigente → Pagado

### Fase 5 — Dashboard y Reportes
- Dashboard con KPIs reales: asociados, aportes (variación %), cartera, mora
- Actividad reciente y accesos rápidos
- 4 reportes exportables a CSV (asociados, aportes, créditos, cartera vencida)

### Fase 6 — Gestión de Cartera
- Índice de mora en tiempo real
- Clasificación por antigüedad (aging: 1-30, 31-60, 61-90, 90+ días)
- Barra de calidad de cartera
- Tabla de créditos con cuotas vencidas y días de mora
- Últimos pagos recibidos

### Fase 7 — Perfil de Usuario
- Edición de datos personales
- Cambio de contraseña con validación
- Visualización de roles y permisos asignados

---

## 🛡️ Seguridad

- Contraseñas hasheadas con bcrypt (12 rounds)
- Bloqueo por intentos fallidos de login (5 intentos → 15 min)
- RBAC con permisos granulares por módulo y acción
- Middleware de protección de rutas
- Registro de auditoría automático

## 🗃️ Estructura del Proyecto

```
src/
├── app/
│   ├── (dashboard)/          # Páginas protegidas
│   │   ├── dashboard/        # Dashboard con KPIs
│   │   ├── usuarios/         # CRUD usuarios
│   │   ├── roles/            # Gestión de roles
│   │   ├── parametrizacion/  # Catálogos y config
│   │   ├── asociados/        # Gestión de asociados
│   │   ├── aportes/          # Registro de aportes
│   │   ├── creditos/         # Gestión de créditos
│   │   ├── cartera/          # Gestión de cartera
│   │   ├── reportes/         # Reportes CSV
│   │   ├── perfil/           # Perfil de usuario
│   │   └── auditoria/        # Logs de auditoría
│   ├── api/                  # API Routes
│   └── login/                # Autenticación
├── lib/
│   ├── services/             # Lógica de negocio
│   ├── validations/          # Esquemas Zod
│   ├── auth.ts               # Configuración NextAuth
│   ├── prisma.ts             # Cliente Prisma
│   ├── api-helpers.ts        # Utilidades API
│   └── constants.ts          # Constantes del sistema
└── prisma/
    ├── schema.prisma          # Modelos de datos
    └── seed.ts                # Datos iniciales
```

## 📊 Resumen

- **44 rutas** (24 API + 20 páginas)
- **~20 modelos** Prisma
- **31 permisos** granulares
- **7 roles** predefinidos
- **6 servicios** de negocio
