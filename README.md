# Heladería POS - Sistema de Punto de Venta

Sistema completo de punto de venta para heladería con gestión de inventario, recetas, pedidos y control de caja.

## 🚀 Tecnologías

- **Framework**: Next.js 16 (App Router)
- **Base de datos**: SQLite con Prisma ORM 7.9
- **Autenticación**: JWT con jose
- **Estilos**: Tailwind CSS 4
- **Validación**: Zod
- **Runtime**: Node.js 24+

## 📦 Estructura del Proyecto

```
heladeria-pos/
├── prisma/
│   └── schema.prisma          # Esquema de base de datos
├── src/
│   ├── app/                   # Rutas de Next.js (App Router)
│   │   ├── api/              # API Routes
│   │   ├── dashboard/        # Panel de administración
│   │   ├── pos/              # Interfaz de punto de venta
│   │   └── login/            # Página de login
│   ├── components/           # Componentes React reutilizables
│   ├── lib/                  # Utilidades y lógica de negocio
│   │   ├── prisma.ts         # Cliente Prisma singleton
│   │   ├── seed-recetas.ts   # Script de seed de recetas
│   │   ├── auth.ts           # Autenticación JWT
│   │   ├── cash-register.ts  # Control de caja
│   │   ├── actions/          # Server Actions
│   │   └── ...
│   └── generated/prisma/     # Cliente Prisma generado
├── public/                   # Archivos estáticos
└── package.json
```

## 🗄️ Modelo de Datos (Prisma)

### Entidades Principales

| Modelo | Descripción |
|--------|-------------|
| **User** | Usuarios del sistema (cajeros, admins) |
| **Category** | Categorías de productos |
| **Product** | Productos (BASE = simples, COMBO = con receta) |
| **Ingredient** | Insumos/ingredientes del inventario |
| **RecipeItem** | Relación producto-ingrediente con cantidad |
| **Order** | Pedidos/ventas |
| **OrderItem** | Líneas de pedido |
| **CashRegister** | Control de apertura/cierre de caja |
| **Expense** | Gastos durante el turno |
| **AuditLog** | Log de auditoría de acciones |

### Flujo de Inventario Automático

1. Los productos **COMBO** tienen `RecipeItem` vinculados a `Ingredient`
2. Al vender un COMBO, el sistema descuenta automáticamente:
   - `ingredient.currentStock -= recipeItem.quantity * orderItem.quantity`
3. Los productos **BASE** usan `Product.stockQuantity` directamente

## 🌱 Seed de Recetas

El archivo `src/lib/seed-recetas.ts` contiene **19 recetas completas** con **51 ingredientes únicos**:

### Productos COMBO (con receta):
- OSITO, MALTEADA, RATONCITO, AÑARITA
- CONO TRIPLE, DANI ESPECIAL, COPA CHOCOLATE
- WAFFLE DULCE DANI, FRESAS CON CREMA
- WAFFLE FRUTI DANI, BANANA SPLIT
- ENSALADA DE FRUTAS, MEZCLA DE WAFFLE
- SALPICON CON HELADO, CANASTA DOBLE
- CANASTA TRIPLE, MARACUMANGO, SODA
- MALTEADA DANI ESPECIAL

### Ejecutar seed:
```bash
npx tsx src/lib/seed-recetas.ts
```

## 🔧 Instalación y Desarrollo

```bash
# Instalar dependencias
npm install

# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones (crea dev.db)
npx prisma migrate dev

# Seed de recetas
npx tsx src/lib/seed-recetas.ts

# Desarrollo
npm run dev
```

## 📋 Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (puerto 3000) |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npx prisma studio` | GUI de base de datos |
| `npx prisma migrate dev` | Migraciones en desarrollo |
| `npx tsx src/lib/seed-recetas.ts` | Poblar recetas |

## 🔐 Autenticación y Roles

- **ADMIN**: Acceso completo (dashboard, usuarios, reportes)
- **CASHIER**: Solo POS y apertura/cierre de caja
- JWT en cookies httpOnly
- Middleware de protección de rutas

## 💰 Flujo de Caja

1. **Apertura**: `CashRegister` con `initialAmount`
2. **Ventas**: Se registran en `Order` (cash/transfer/card)
3. **Gastos**: `Expense` vinculados al turno
4. **Cierre**: `expectedAmount` vs `actualAmount` → `difference`

## 🌐 API Endpoints Principales

### Autenticación
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Usuario actual

### Productos
- `GET /api/products` - Listar (con categoría)
- `POST /api/products` - Crear (ADMIN)
- `PUT /api/products/[id]` - Actualizar (ADMIN)

### Pedidos
- `POST /api/orders` - Crear pedido (descuenta inventario)
- `GET /api/orders` - Historial

### Caja
- `POST /api/cash-register/open` - Abrir caja
- `POST /api/cash-register/close` - Cerrar caja
- `GET /api/cash-register/current` - Caja actual

### Inventario
- `GET /api/ingredients` - Listar insumos
- `PUT /api/ingredients/[id]` - Actualizar stock (ADMIN)

## 📊 Prisma Studio

```bash
npx prisma studio
```
Accede a `http://localhost:5555` para explorar/editar datos visualmente.

## 🔑 Variables de Entorno

Crear `.env` en la raíz:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="tu-secreto-super-seguro-aqui"
```

## 📝 Licencia

Proyecto privado - Heladería POS