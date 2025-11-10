# POS MiniVeci 🏪

**Sistema de Punto de Venta Local-First para Pequeños Comercios**

Una solución moderna de punto de venta que funciona completamente offline, diseñada específicamente para pequeños comerciantes que necesitan un sistema confiable, rápido y sin dependencia de internet constante.

## 🌟 Características Principales

- **🔄 Local-First**: Funciona completamente offline, con sincronización automática cuando hay conexión
- **⚡ Rendimiento**: Interfaz ultra-rápida con respuesta instantánea 
- **💾 Almacenamiento Dual**: SQLite local + PostgreSQL en la nube
- **🔄 Sincronización Inteligente**: Sync bidireccional automático con resolución de conflictos
- **📱 Responsive**: Diseñado para funcionar en tablets y dispositivos móviles
- **🛡️ Confiable**: Sin pérdida de datos, incluso sin conexión a internet

## 🚀 Tecnologías

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Base de Datos Local**: SQLite + sql.js (WebAssembly)
- **Base de Datos Nube**: PostgreSQL + Drizzle ORM
- **Sincronización**: Sistema custom con timestamps y resolución de conflictos
- **Estado**: React hooks + Context API

## 📂 Estructura del Proyecto

```
src/
├── app/                    # App Router de Next.js
│   ├── pos/               # Módulos del POS
│   │   ├── dashboard/     # Panel principal
│   │   └── products/      # Gestión de productos
├── components/            # Componentes reutilizables
│   └── ui/               # Componentes de UI (shadcn)
├── lib/                  # Utilidades y configuraciones
│   └── db/               # Capa de datos
│       ├── schema.ts     # Esquemas de BD
│       ├── local-db.ts   # Cliente SQLite
│       ├── cloud-db.ts   # Cliente PostgreSQL
│       └── sync.ts       # Motor de sincronización
└── hooks/                # React hooks personalizados
    └── use-offline-sync.ts
```

## 🏁 Getting Started

### Prerequisitos

- Node.js 18+
- npm, yarn, pnpm o bun

### Instalación

1. Clona el repositorio:
```bash
git clone [repository-url]
cd pos-miniveci
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp .env.example .env.local
# Edita .env.local con tus configuraciones
```

4. Ejecuta las migraciones:
```bash
npm run db:migrate
```

5. Inicia el servidor de desarrollo:
```bash
npm run dev
```

6. Abre [http://localhost:3000](http://localhost:3000) en tu navegador

## 💾 Base de Datos

El proyecto usa un enfoque **dual-database**:

- **SQLite Local**: Para operaciones offline y rendimiento máximo
- **PostgreSQL Cloud**: Para respaldos y sincronización entre dispositivos

### Esquema Principal

```sql
-- Productos
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  stock INTEGER NOT NULL,
  category TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

-- Ventas
CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

-- Ítems de venta
CREATE TABLE sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

## 🔄 Sincronización

El sistema implementa sincronización bidireccional automática:

- **Detección de Cambios**: Basada en timestamps `updated_at`
- **Resolución de Conflictos**: Last-write-wins con timestamp de desempate
- **Soft Delete**: Los registros se marcan como eliminados (`deleted_at`)
- **Sincronización Incremental**: Solo se sincronizan los cambios nuevos

## 🛠️ Scripts Disponibles

```bash
npm run dev          # Inicia servidor de desarrollo
npm run build        # Build de producción
npm run start        # Inicia servidor de producción
npm run lint         # Linting con ESLint
npm run type-check   # Verificación de tipos TypeScript
npm run db:migrate   # Ejecuta migraciones de BD
npm run db:studio    # Abre Drizzle Studio
```

## 🗂️ Casos de Uso Principales

1. **Venta de Productos**: Interfaz rápida para procesar ventas
2. **Gestión de Inventario**: CRUD completo de productos
3. **Reportes de Ventas**: Análisis de ventas y tendencias
4. **Trabajo Offline**: Funcionalidad completa sin internet
5. **Sincronización Multi-dispositivo**: Datos consistentes entre dispositivos

## 🎯 Próximas Características

- [ ] Módulo de clientes
- [ ] Sistema de descuentos y promociones
- [ ] Reportes avanzados con gráficas
- [ ] Impresión de tickets
- [ ] Gestión de proveedores
- [ ] Sistema de usuarios y permisos

## 📄 Documentación Adicional

- [CLAUDE.md](./CLAUDE.md) - Documentación completa del proyecto y arquitectura técnica

## 🤝 Contribuir

1. Fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -am 'Agrega nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---

*Desarrollado para comerciantes que necesitan un sistema de ventas confiable y moderno* ⭐


