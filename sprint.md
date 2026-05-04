# Invofy — Mart Billing Software · Sprint Tracker

> **Stack:** NestJS + Prisma + PostgreSQL (backend) · React + TypeScript + Vite + Tailwind + shadcn/ui (frontend)
> **Last Updated:** 2026-05-04

---

## Progress Overview

| Step | Description | Status |
|------|-------------|--------|
| 1 | Backend NestJS project setup | ✅ Complete |
| 2 | Prisma schema (all models + relations) | ✅ Complete |
| 3 | Auth module (JWT, bcrypt, role guards) | ✅ Complete |
| 4 | Products module (CRUD + search + low-stock) | ✅ Complete |
| 5 | Billing module (bills CRUD, stock management) | ✅ Complete |
| 6 | Customers module (CRUD, search, loyalty pts) | ✅ Complete |
| 7 | Reports module (daily/monthly/top/revenue/inventory) | ✅ Complete |
| 7b | Categories module (bonus — needed by products) | ✅ Complete |
| 8 | Frontend setup (Vite, Router, Zustand, Axios, types) | ✅ Complete |
| 9 | POS screen (product grid, cart, payment modal) | ✅ Complete |
| 10 | Products page (table, form, filters, badges) | ✅ Complete |
| 11 | Invoice & thermal Receipt (print + PDF export) | ✅ Complete |
| 12 | Dashboard (stats, charts, recent bills) | ✅ Complete |
| 12b | Reports page (revenue chart, top products, inventory) | ✅ Complete |
| 12c | Customers page (CRUD) | ✅ Complete |
| 12d | Invoices list page (view, cancel) | ✅ Complete |
| 12e | Settings page (categories management) | ✅ Complete |

---

## Backend API Endpoints

### Auth (`/api/v1/auth`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | Public | Login → returns JWT |
| POST | `/auth/register` | ADMIN | Register new user |
| GET | `/auth/me` | JWT | Get current user |

### Products (`/api/v1/products`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | All products |
| POST | `/products` | Create product |
| GET | `/products/search?q=` | Search by name/barcode |
| GET | `/products/low-stock` | Below lowStockAlert |
| GET | `/products/:id` | Get single product |
| PATCH | `/products/:id` | Update product |
| DELETE | `/products/:id` | Delete product |

### Categories (`/api/v1/categories`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | All categories |
| POST | `/categories` | Create |
| GET | `/categories/:id` | Single category |
| PATCH | `/categories/:id` | Update |
| DELETE | `/categories/:id` | Delete |

### Bills (`/api/v1/bills`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bills` | Create bill (reduces stock, adds loyalty pts) |
| GET | `/bills?page=&limit=` | Paginated bills list |
| GET | `/bills/:id` | Single bill with items |
| PATCH | `/bills/:id/status` | Update status (CANCELLED restores stock) |

### Customers (`/api/v1/customers`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customers` | All customers |
| POST | `/customers` | Create |
| GET | `/customers/search?q=` | Search by name/phone |
| GET | `/customers/:id` | Single customer |
| GET | `/customers/:id/bills` | Customer's bills |
| PATCH | `/customers/:id` | Update |
| DELETE | `/customers/:id` | Delete |

### Reports (`/api/v1/reports`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/sales/daily?date=` | Daily sales summary |
| GET | `/reports/sales/monthly?month=&year=` | Monthly breakdown |
| GET | `/reports/top-products?limit=10` | Best sellers |
| GET | `/reports/revenue?from=&to=` | Revenue in range |
| GET | `/reports/inventory` | Stock summary |

---

## Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | JWT authentication |
| `/` | Dashboard | Stats cards, charts, recent bills |
| `/pos` | POS | Point of sale — scan/search → cart → pay |
| `/products` | Products | Table, add/edit/delete, low-stock alerts |
| `/customers` | Customers | CRUD, search, loyalty points |
| `/invoices` | Invoices | Bill list, view invoice, cancel |
| `/reports` | Reports | Revenue, top products, inventory |
| `/settings` | Settings | Categories management, account info |

---

## Key Business Logic

- **Bill Number:** Auto-generated as `BILL-YYYY-NNNN` (resets each year)
- **GST:** 18% applied on subtotal automatically
- **Stock:** Decremented on bill creation, restored on cancellation
- **Loyalty Points:** 1 point per ₹100 of total bill amount; deducted on cancellation
- **Low Stock Alert:** Products show warning badge when `stock < lowStockAlert`
- **PDF Export:** jsPDF + jspdf-autotable for full invoice download
- **Thermal Receipt:** 80mm width monospace layout for POS printers

---

## Setup Instructions

### Backend
```bash
cd backend
npm install
# Set up .env (DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, PORT)
npx prisma migrate dev --name init
npx prisma generate
npm run start:dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

> Backend runs on http://localhost:3000/api/v1
> Frontend runs on http://localhost:5173

---

## File Structure

```
Invofy/
├── backend/
│   ├── prisma/schema.prisma
│   └── src/
│       ├── auth/          # JWT auth, guards, strategies
│       ├── bills/         # Billing module
│       ├── categories/    # Categories module
│       ├── common/        # Global filter + interceptor
│       ├── customers/     # Customers module
│       ├── prisma/        # Prisma service + module
│       ├── products/      # Products module
│       ├── reports/       # Reports module
│       ├── users/         # Users module
│       └── main.ts
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ui/        # shadcn-style components
│       │   ├── dashboard/ # StatsCard, SalesChart
│       │   ├── pos/       # ProductCard, CartItem, PaymentModal
│       │   ├── products/  # ProductTable, ProductForm
│       │   ├── AppLayout, Sidebar, ProtectedRoute
│       │   ├── Invoice.tsx (+ PDF export)
│       │   └── Receipt.tsx (80mm thermal)
│       ├── pages/         # All route pages
│       ├── services/      # API service calls
│       ├── store/         # Zustand auth + cart stores
│       ├── types/         # TypeScript interfaces
│       └── lib/           # axios instance, utils
└── sprint.md              ← you are here
```
