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

### Fase 8 — Documentos y Adjuntos *(en progreso)*
- Almacenamiento de documentos por asociado (cédula, solicitudes, pagarés, etc.)
- Capa de abstracción `StorageProvider` (local ahora → Google Drive/OneDrive/S3 en el futuro)
- API de subida, descarga y eliminación de archivos
- Tab "Documentos" en detalle de asociado
- Validación de tipo (PDF, imágenes, Word, Excel) y tamaño (máx. 10MB)

### Fase 9 — Recaudos e Ingresos *(en progreso)*
- Recaudos en lote: múltiples aportes de múltiples asociados en un solo recibo
- Generación automática de número de recibo (`REC-YYYY-NNNN`)
- Listado de recibos con búsqueda y paginación
- Detalle de recibo con desglose de aportes
- Anulación de recibos con reversión automática de saldos

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
│   │   ├── asociados/        # Gestión de asociados + documentos
│   │   ├── aportes/          # Registro de aportes
│   │   ├── recaudos/         # Recaudos en lote + recibos
│   │   ├── creditos/         # Gestión de créditos
│   │   ├── cartera/          # Gestión de cartera
│   │   ├── reportes/         # Reportes CSV
│   │   ├── perfil/           # Perfil de usuario
│   │   └── auditoria/        # Logs de auditoría
│   ├── api/                  # API Routes
│   └── login/                # Autenticación
├── lib/
│   ├── services/             # Lógica de negocio
│   ├── storage/              # Abstracción de almacenamiento
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

- **50+ rutas** (28+ API + 22+ páginas)
- **~20 modelos** Prisma
- **34 permisos** granulares
- **7 roles** predefinidos
- **8 servicios** de negocio

---

## 📋 Estado del Proyecto y Pendientes

### ✅ Implementado
| Módulo | Estado |
|--------|--------|
| Autenticación y Seguridad | ✅ Completo |
| Usuarios y RBAC | ✅ Completo |
| Parametrización | ✅ Completo |
| Auditoría | ✅ Completo |
| Personas y Asociados | ✅ Completo |
| Aportes y Ahorros | ✅ Completo |
| Créditos | ✅ Completo |
| Cartera | ✅ Completo |
| Dashboard y Reportes | ✅ Completo |
| Perfil de Usuario | ✅ Completo |
| E2E Test (12 módulos) | ✅ Completo e idempotente |
| Documentos y Adjuntos | 🔄 Backend + API listo, frontend (tab) listo — falta integrar ícono sidebar |
| Recaudos e Ingresos | 🔄 Backend + API + páginas listas — falta integrar ícono sidebar |

### ❌ Pendiente por Implementar
| # | Funcionalidad | Prioridad |
|---|---------------|-----------|
| 1 | Integrar ícono "Receipt" en sidebar layout | 🟢 Menor |
| 2 | Filtro `status=ACTIVO` en API asociados (para búsqueda en recaudos) | 🟢 Menor |
| 3 | Actualizar E2E test con pasos 13 (Documentos) y 14 (Recaudos) | 🟡 Media |
| 4 | Cloud storage providers (Google Drive, OneDrive, S3) | 🟡 Media |
| 5 | Notificaciones (alertas de mora, vencimientos) | 🟡 Media |
| 6 | Créditos avanzados (capacidad de pago, garantías, refinanciación) | 🟡 Media |
| 7 | Cartera avanzada (acuerdos de pago, cartera castigada) | 🟡 Media |
| 8 | Reportes avanzados (Excel/PDF) | 🟡 Media |
| 9 | Multiempresa / Multisede | 🔴 Alta complejidad |
| 10 | Dockerfile + CI/CD para producción | 🟡 Media |
| 11 | Portal del Asociado (autoconsulta) | 🔵 Futuro |
