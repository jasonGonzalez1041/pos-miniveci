# CLAUDE.md - Guía Completa del Proyecto POS MiniVeci

## 🎯 Orquestación de Agentes Especializados

### Agentes Disponibles

#### Debug & Problem Solving
- **Debugger-GOD** (`.claude/agents/debugger-god.md`)
  - Encuentra bugs en <10 segundos con análisis lightning-fast
  - Para: errores críticos, comportamientos inesperados, debugging complejo, hotfixes
  - Prompt: "Debug este error: esperaba [X] pero obtuve [Y]. Stack trace: [trace]"

#### Code Quality & Security  
- **CodeReviewer-PRO** (`.claude/agents/code-reviewer-pro.md`)
  - Revisión experta con análisis OWASP Top 10 y performance
  - Para: code reviews, auditorías de seguridad, análisis de calidad
  - Prompt: "Revisa este código/PR considerando seguridad, performance y mejores prácticas"

#### TypeScript Excellence
- **TypeScript-Guru** (`.claude/agents/typescript-guru.md`) 
  - Experto mundial en TypeScript 5.6+, nunca permite 'any'
  - Para: dudas específicas de TS, tipos avanzados, problemas de compilación
  - Prompt: "¿Cómo resolver [problema TypeScript]? Versión 5.6+"

#### Testing & TDD
- **TDD-Enforcer** (`.claude/agents/tdd-enforcer.md`)
  - Cobertura mínima 90%, testing completo con ciclo Red-Green-Refactor
  - Para: escribir tests, mejorar cobertura, debugging de tests
  - Prompt: "Crea tests con 90% cobertura para: [código] usando npm test --coverage"

#### Frontend & UI
- **Frontend-POS-MiniVeci** (`.claude/agents/frontend-pos-miniveci.md`)
  - Experto en React 19, Next.js 16, Tailwind CSS 4, shadcn/ui
  - Para: componentes UI, páginas, formularios, dashboards
  - Prompt: "Crea componente [nombre] con [funcionalidad] usando shadcn/ui"

#### Architecture & Infrastructure
- **POS-MiniVeci-Architect** (`.claude/agents/pos-miniveci-architect.md`)
  - Arquitectura principal del sistema POS local-first
  - Para: decisiones arquitectónicas, estructura de proyecto, patrones
  - Prompt: "Diseña arquitectura para [feature] considerando [requisitos]"

#### DevOps & Deployment
- **Cloudflare-DevOps-Guardian** (`.claude/agents/cloudflare-devops-guardian.md`)
  - Especialista en Cloudflare Pages y deployments
  - Para: configuración de deployment, optimización de build
  - Prompt: "Configura deployment para [feature] en Cloudflare Pages"

### 🎯 Proceso de Decisión Inteligente

#### 1. ANALIZA la Solicitud
```
¿Qué necesita?
- ¿Es un bug?                    → Debugger-GOD
- ¿Necesita code review?         → CodeReviewer-PRO  
- ¿Dudas de TypeScript?          → TypeScript-Guru
- ¿Requiere tests?               → TDD-Enforcer
- ¿Componente/UI nueva?          → Frontend-POS-MiniVeci
- ¿Decisión arquitectónica?      → POS-MiniVeci-Architect
- ¿Deployment/infraestructura?   → Cloudflare-DevOps-Guardian
```

#### 2. PRIORIZA según Fase de Desarrollo

**Fase de Planificación:**
1. POS-MiniVeci-Architect (diseño del sistema)
2. TypeScript-Guru (definición de tipos)

**Fase de Implementación:**
1. Frontend-POS-MiniVeci (componentes UI)
2. TypeScript-Guru (implementación type-safe) 
3. TDD-Enforcer (tests en paralelo)

**Fase de Debugging:**
1. Debugger-GOD (identificar problema)
2. CodeReviewer-PRO (análisis de root cause)

**Fase de Deployment:**
1. CodeReviewer-PRO (security & quality check)
2. Cloudflare-DevOps-Guardian (configuración deployment)

#### 3. COMBINA Agentes Estratégicamente

**Ejemplos de Combinaciones:**
- **Bug crítico**: Debugger-GOD → CodeReviewer-PRO → TDD-Enforcer
- **Nueva feature**: POS-MiniVeci-Architect → Frontend-POS-MiniVeci → TDD-Enforcer
- **Refactor complejo**: TypeScript-Guru → CodeReviewer-PRO → TDD-Enforcer
- **Deploy preparation**: CodeReviewer-PRO → Cloudflare-DevOps-Guardian

### 🛡️ Reglas de Oro

1. **SIEMPRE** consulta al agente específico, no improvises
2. **NUNCA** saltees el testing (TDD-Enforcer)
3. **PRIORIZA** Debugger-GOD ante cualquier error
4. **CONSULTA** TypeScript-Guru antes de usar 'any' o 'as'
5. **VALIDA** con CodeReviewer-PRO antes de deployments
6. **MANTÉN** tests pasando siempre

---

## 📋 Información del Proyecto

### Descripción General
POS MiniVeci es un sistema de punto de venta **local-first** que funciona offline y sincroniza con la nube cuando hay conexión. Construido con Next.js 16, React 19, TypeScript, y Cloudflare Pages.

### Arquitectura Local-First
- **Base de datos local**: SQLite con Drizzle ORM
- **Sincronización**: Sistema bidireccional con Turso (cloud SQLite)
- **Estado**: React 19 con useOptimistic para UI responsiva
- **Offline-first**: Funciona completamente sin conexión

### Stack Tecnológico
- **Frontend**: Next.js 16, React 19, TypeScript 5.6+
- **Styling**: Tailwind CSS 4, shadcn/ui, Radix UI
- **Database**: SQLite local + Turso cloud sync
- **ORM**: Drizzle ORM
- **Deployment**: Cloudflare Pages
- **Testing**: Jest, Testing Library

### Estructura de Carpetas
```
src/
├── app/                    # Next.js App Router
│   ├── pos/dashboard/     # Dashboard CRUD
│   └── pos/products/      # Vista alternativa productos
├── components/
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── db/               # Database layer
│   │   ├── local-db.ts   # SQLite local operations
│   │   ├── cloud-db.ts   # Turso cloud operations  
│   │   ├── schema.ts     # Drizzle schema
│   │   └── sync.ts       # Sincronización bidireccional
│   └── utils/            # Utilidades de negocio
└── hooks/                # Custom React hooks
```

## 🔧 Configuración y Setup

### Requisitos Previos
- Node.js 18.17+
- npm/pnpm
- Cuenta Cloudflare
- Turso database

### Instalación
```bash
npm install
cp .env.example .env.local
npm run dev
```

### Variables de Entorno
```env
TURSO_DATABASE_URL=libsql://[database].turso.io
TURSO_AUTH_TOKEN=[token]
```

## 🎨 Convenciones de Código

### TypeScript
- **Strict mode** siempre activado
- **Nunca `any`** - usar `unknown` + type guards
- **Branded types** para IDs y valores de dominio
- **`satisfies`** operator para type enforcement
- **Zod** para validación runtime

### Testing
- **TDD obligatorio**: Red → Green → Refactor
- **Cobertura mínima**: 90% en todas las métricas
- **Estructura**: `src/__tests__/` organizada por capas
- **Tools**: Jest + Testing Library + MSW

### React/Next.js
- **Server Components** por defecto
- **`useOptimistic`** para UI responsiva
- **Error boundaries** en todas las rutas
- **Loading states** obligatorios

### Git Commits
- **Conventional Commits**: `feat:`, `fix:`, `test:`, etc.
- **Atomic commits**: una funcionalidad por commit
- **Tests pasando**: verificación pre-commit obligatoria

## 🏗️ Patrones Arquitectónicos

### Local-First Pattern
- Datos locales como source of truth
- Sincronización asíncrona en background
- Resolución de conflictos automática
- UI optimista con rollback

### Database Layer Pattern
```typescript
// Separación clara de responsabilidades
localDb.ts    // Operaciones SQLite locales
cloudDb.ts    // Operaciones Turso cloud  
sync.ts       // Logic de sincronización
```

### Component Pattern
- **Composition over inheritance**
- **Props interfaces** explícitas y strict
- **Error boundaries** para manejo robusto
- **Accessibility-first** con Radix UI

---

## 🚀 Próximas Integraciones Recomendadas

Basándome en la configuración actual y las mejores prácticas de Rovo Dev, estas son las **próximas mejoras prioritarias** que deberías considerar:

### 1. **Streaming & Temperatura Optimizada** (Tu recomendación #3)
- **agent.streaming**: `true` para debugging interactivo
- **agent.temperature**: `0.2` para precisión en código

### 2. **Prompts Guardados** (Tu recomendación #5)
- "Review Code Coverage"
- "Generate Secure Feature"  
- "Debug Production Issue"

### 3. **Integración con Atlassian** 
- Auto-creación de Jira issues para TODOs
- Documentación automática en Confluence
- Tracking de progreso en sprints

¿Te gustaría que implemente alguna de estas mejoras específicas o prefieres que nos enfoquemos en otra área del proyecto?