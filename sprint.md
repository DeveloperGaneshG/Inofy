# Invofy — Mart Billing Software · Complete Project Guide

> **Stack:** NestJS + Prisma + PostgreSQL (backend) · React + TypeScript + Vite + Tailwind (frontend)
> **Last Updated:** 2026-05-07 (r2)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Setup](#3-project-setup)
4. [Login Credentials](#4-login-credentials)
5. [Screen-by-Screen Walkthrough](#5-screen-by-screen-walkthrough)
6. [Business Logic & Rules](#6-business-logic--rules)
7. [API Reference](#7-api-reference)
8. [Demo Script (Suggested Flow)](#8-demo-script-suggested-flow)
9. [File Structure](#9-file-structure)
10. [Changelog](#10-changelog)

---

## 1. Project Overview

**Invofy** is a full-stack Point of Sale (POS) and billing software built for Indian retail marts. It handles the complete billing lifecycle — from product and inventory management to customer billing, invoice generation, and sales reporting.

### What it does
- **Cashiers** can quickly search products, add to cart, apply discounts, redeem customer loyalty points, and generate bills
- **Admins** can manage products, categories, customers, suppliers, view reports, and manage staff users
- Every bill auto-generates a GST invoice (printable + PDF downloadable) with per-product GST rates (0%, 5%, 12%, 18%, 28%)
- Inventory is tracked automatically — stock decreases on billing, restores on cancellation or return
- Customers earn loyalty points (₹100 = 1 point) which can be redeemed for discounts
- Barcode scanner support — scan directly into POS for instant add-to-cart
- Partial returns and exchanges supported — return individual items from any past bill

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Backend Framework | NestJS (Node.js) |
| Database ORM | Prisma |
| Database | PostgreSQL |
| Authentication | JWT + bcrypt |
| Frontend Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS + shadcn/ui components |
| State Management | Zustand |
| HTTP Client | Axios |
| PDF Generation | jsPDF + jspdf-autotable |
| Charts | Recharts |
| Form Validation | React Hook Form + Zod |

---

## 3. Project Setup

### Prerequisites
- Node.js 18+
- PostgreSQL running on port 5432
- Database named `invofy_db`

### Backend Setup
```bash
cd backend

# Install dependencies (already done)
npm install

# Environment variables — backend/.env
DATABASE_URL="postgresql://postgres:password@localhost:5432/invofy_db?schema=public"
JWT_SECRET="invofy_super_secret_jwt_key_change_in_production"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development

# Run migrations
npx prisma migrate dev

# Seed sample data
npx prisma db seed

# Start backend (auto-reloads on change)
npm run start:dev
```

Backend runs at: **http://localhost:3000/api/v1**

### Frontend Setup
```bash
cd frontend

# Install dependencies (already done)
npm install

# Start frontend
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 4. Login Credentials

| Role | Email | Password | Access |
|---|---|---|---|
| Admin | admin@invofy.com | admin123 | Full access — all screens + user management |
| Cashier | cashier@invofy.com | cashier123 | POS, Products (view), Customers, Invoices |

> **Note:** Only ADMIN can register new users, manage categories, and view reports.

---

## 5. Screen-by-Screen Walkthrough

---

### Screen 1 — Login (`/login`)

**What it shows:**
- Invofy logo and branding
- Email + Password fields
- Sign In button

**How it works:**
- Submits credentials to `POST /api/v1/auth/login`
- Backend validates email, compares bcrypt password hash, returns JWT token
- Token is stored in browser localStorage via Zustand persist
- All subsequent API calls send `Authorization: Bearer <token>` header
- On successful login → redirected to Dashboard
- Wrong credentials → shows "Invalid credentials" error inline (form does NOT reset)
- If token expires or is invalid on any other screen → auto logout + redirect to login

**Demo tip:** Log in as Admin to show full access.

---

### Screen 2 — Dashboard (`/`)

**What it shows:**
- 4 stat cards at the top
- Revenue line chart (last 7 days)
- Top 5 products bar chart
- Recent bills table

**Stat Cards:**
| Card | Data Source |
|---|---|
| Today's Sales | Sum of all PAID bills created today |
| Today's Orders | Count of bills created today |
| Total Products | Count of all products in inventory |
| Low Stock Alerts | Products where `stock < lowStockAlert` |

**Charts:**
- **Revenue chart** — pulls last 7 days from the revenue report API, plots daily revenue as a line graph
- **Top Products chart** — shows top 5 best-selling products by quantity sold

**Recent Bills table:**
- Shows last 10 bills with bill number, customer, cashier, payment method, amount, status, date
- Status badges: green (PAID), red (CANCELLED), grey (PENDING)

**Demo tip:** After creating a bill in POS, come back to Dashboard — today's sales and orders update immediately.

---

### Screen 3 — POS / Point of Sale (`/pos`)

This is the most important screen. Cashiers spend most of their time here.

**Layout:** Two-panel — products grid on the left, cart on the right.

#### Left Panel — Product Search & Grid
- Search bar at top — searches by product name, SKU, or barcode in real time
- **Auto-focused on page load** — cashier can scan immediately without clicking
- Press **F2** to refocus the search bar at any time (keyboard shortcut)
- **Barcode scanner support** — scanner sends barcode string → exact barcode match auto-adds to cart instantly (no Enter needed); input clears and refocuses for the next scan
- Press **Enter** → adds exact barcode match (if any) or the first result
- Products displayed as cards showing:
  - Product image (or first letter as avatar)
  - Product name + category
  - **Selling price** (bold, in blue)
  - **MRP with strikethrough** + **discount % badge** (if MRP is set and higher than price)
  - Stock count with color-coded badge (green = ok, yellow = low stock, red = out of stock)
- Click a product card or the `+` button to add it to the cart
- Out-of-stock products are dimmed and non-clickable

#### Right Panel — Cart
- Shows all items in the current bill
- Each cart item shows: product name, unit price × quantity, total price
- `−` / `+` buttons to adjust quantity (max = available stock)
- Trash icon to remove item
- **Customer Search** (optional): type 2+ characters to search customers by name or phone, click to select
- **Discount field**: enter a flat ₹ discount amount to apply to the bill
- **Summary** at bottom:
  - Subtotal (before GST)
  - GST (sum of per-product rates — not a flat 18%)
  - Discount (if any)
  - **Total** (large, bold)
- **Checkout button** opens the Payment Modal

#### Payment Modal
- Shows full order summary (subtotal, GST, discounts, total)
- **Loyalty Points Redemption** (appears only when a customer is selected with ≥ 10 points):
  - Shows customer name + available points + rupee value
  - Toggle to redeem points — 1 point = ₹1 discount, capped at 20% of bill total
  - Shows exactly how many points will be redeemed and the discount amount
  - Shows how many new points will be earned after this bill
- **Payment Method** selector: Cash / Card / UPI (visual button group)
- **Amount Tendered** field (Cash only): enter cash received, shows change amount
- **Pay ₹X button** — creates the bill, reduces stock, awards loyalty points, clears cart

**After successful payment:**
- Shows success screen with bill confirmation
- Options: "View Invoice" or "New Bill"

---

### Screen 4 — Products (`/products`)

**What it shows:**
- Header with total product count + Add Product button
- Alert badges for out-of-stock and low-stock counts
- Search bar (by name, SKU, barcode) + Category filter dropdown
- Products table

**Products Table columns:**
- Product (image/avatar + name + barcode)
- SKU
- Category
- MRP (if set)
- Selling Price + discount % off (if MRP is set)
- GST%
- Stock count (red if out of stock, yellow if low stock, with warning icon)
- Status badge (Active / Low Stock / Out of Stock / Inactive)
- Date added
- Edit / Delete action buttons

**Add / Edit Product Form** (opens as a modal dialog):
| Field | Required | Notes |
|---|---|---|
| Name | Yes | Product display name |
| SKU | Yes | Unique stock-keeping unit code |
| Barcode | No | For barcode scanner support |
| MRP (₹) | No | Printed MRP on packet — used to show discount % |
| Selling Price (₹) | Yes | Actual price charged to customer |
| Cost Price (₹) | Yes | Purchase price — for profit tracking |
| GST Rate | Yes | 0% / 5% / 12% / 18% / 28% — Indian GST slab (default 18%) |
| Stock | Yes | Current stock quantity |
| Low Stock Alert | No | Default 10 — triggers warning badge |
| Category | Yes | Must select from existing categories |
| Image URL | No | Link to product image |
| Active | Yes | Toggle to hide product from POS without deleting |

**Delete:** Confirmation prompt before deletion. Cannot delete if product has been billed.

---

### Screen 5 — Customers (`/customers`)

**What it shows:**
- Search bar (by name or phone)
- Add Customer button
- Customers table with all registered customers

**Customer Table columns:**
- Name
- Phone
- Email
- Address
- Loyalty Points (star icon + count)
- Date joined
- Edit / Delete / View Bills action buttons

**Add / Edit Customer Form:**
| Field | Required |
|---|---|
| Name | Yes |
| Phone | No (unique) |
| Email | No (unique) |
| Address | No |

**Demo tip:** Select a customer with loyalty points in POS to show the redemption feature.

---

### Screen 6 — Invoices (`/invoices`)

**What it shows:**
- Search bar (by bill number or customer name)
- Paginated bills table (15 per page)

**Invoices Table columns:**
- Bill Number (e.g. `BILL-2026-0001`)
- Customer name (or `—` for walk-in)
- Cashier name
- Item count
- Payment method badge
- Total amount
- Status badge (PAID / CANCELLED / PENDING)
- Date & time
- View (eye icon) + Return (↩ amber icon, PAID only) + Cancel (X icon) action buttons

**View Invoice** (click eye icon):
Opens a full invoice dialog showing:
- Mart name, address, phone, GST number
- Bill number, date, cashier, payment method
- Customer details (if selected)
- Items table: product name + SKU, MRP (strikethrough if discount), selling price, **GST%**, quantity, total
- Subtotal, GST (calculated at per-product rates), discounts
- **Grand Total**
- **"You saved ₹X"** line (if MRP discounts apply)
- **Return Items** button (top-right of dialog, PAID bills only)
- Print button — opens **80mm thermal receipt** in a popup window, auto-prints, auto-closes
- Download PDF button (generates a formatted A4 PDF)

**Cancel Bill:**
- Confirmation dialog before cancelling
- On cancellation: bill status → CANCELLED, stock is restored, customer loyalty points are deducted

**Return Items** (amber ↩ button on table row or inside invoice dialog):
Opens the Return Modal:
- Shows all bill items with + / − quantity inputs
- Max returnable per item = billed qty − already returned qty (supports multiple partial returns over time)
- Fully-returned items are greyed out
- **Return Type toggle:** 💰 Refund (cash back to customer) or 🔄 Exchange (swap for another item — process new sale at POS)
- Optional reason field
- Live refund amount preview
- On submit: stock restored for each returned item, `StockMovement` (type RETURN) recorded, return number generated (`RET-YYYY-NNNN`)

---

### Screen 7 — Reports (`/reports`)

**What it shows:**
- Date range picker (From / To) with Apply button
- Revenue summary cards
- Revenue line chart over the selected period
- Top 10 selling products table
- Inventory summary card

**Revenue Summary Cards:**
| Card | Description |
|---|---|
| Total Revenue | Sum of all PAID bill totals in the date range |
| Total Orders | Count of PAID bills |
| Total Tax (GST) | Sum of all GST amounts collected |
| Total Discounts | Sum of all discounts given |

**Revenue Chart:**
- Line chart showing daily revenue for each day in the selected date range
- X-axis: date (MM-DD format), Y-axis: revenue in ₹k

**Top Selling Products table:**
- Rank, product name, category, quantity sold, total revenue
- Sorted by quantity sold descending

**Inventory Summary:**
- Total products count
- Total stock value (stock × cost price)
- Low stock count (yellow)
- Out of stock count (red)
- List of top 5 low-stock products with remaining stock badge

---

### Screen 8 — Settings (`/settings`)

**Two sections:**

**Account Card:**
- Shows logged-in user's name, email, and role (read-only)

**Categories Management:**
- List of all product categories with name and description
- Add Category button → opens dialog with name + description fields
- Edit (pencil) and Delete (trash) buttons on each category
- Cannot delete a category that has products assigned to it

---

### Screen 9 — Suppliers (`/suppliers`)

**What it shows:**
- Header with active count and total count
- Search bar (by name or phone)
- Add Supplier button
- Suppliers table

**Suppliers Table columns:**
- Name + email (sub-text)
- Phone
- GST Number
- Purchases count badge
- Status (Active / Inactive with icon)
- Since (date joined)
- Edit / Delete action buttons

**Add / Edit Supplier Form:**
| Field | Required | Notes |
|---|---|---|
| Name | Yes | Min 2 characters |
| Phone | No | Contact number |
| GST Number | No | e.g. `27XXXXX1234X1ZX` |
| Email | No (unique) | Validated format |
| Address | No | Street, City, State |

**Delete behaviour:**
- If supplier has no purchases → deleted permanently
- If supplier has purchases → deactivated instead (button label changes to "Deactivate")

---

### Screen 11 — Khata Book (`/credit-book`)

This screen is optional — mart owners can use it when customers take goods on credit and pay later (local "udhar" system). It replaces paper ledger books or separate apps like KhataBook.

**What it shows:**
- 3 summary cards at top
- Search bar + "Show cleared" toggle + "New Entry" button
- Customer list sorted by outstanding balance

**Summary Cards:**
| Card | Description |
|---|---|
| Total Outstanding | Sum of all unpaid balances across all customers |
| Active Debtors | Count of customers with balance > 0 |
| Cleared Accounts | Count of customers whose balance is fully paid |

**Customer List:**
- Each row shows: avatar (first letter, red = owes, green = cleared), name, phone, last activity date, outstanding balance badge
- **Red badge** = customer owes money; **Green badge** = fully cleared; **Blue badge** = customer overpaid (advance)
- Sorted by outstanding balance (highest first)
- "Show cleared" toggle includes zero-balance customers in the list
- Click any row → opens Customer Detail Dialog

**Customer Detail Dialog:**
- Customer name, phone, address
- Large outstanding balance (red if owed, green if cleared)
- Two action buttons:
  - **Add Goods Credit** (red) — customer took goods, owes more money
  - **Record Payment** (green) — customer paid back; disabled if balance is already 0
- Full transaction history (newest first), each entry shows:
  - Direction icon (↓ red = credit, ↑ green = payment)
  - Amount
  - Description (what items were taken, or payment note)
  - Running balance after that entry
  - Timestamp

**New Entry button (main page):**
Opens a dialog to add a credit entry for any customer:
- Type toggle: Goods on Credit / Payment Received
- Customer search (type name or phone — filters all customers live)
- Amount (₹)
- Description / items (e.g. "Rice 2kg, Oil 1L")
- Remarks (optional)

**Validation:**
- Payment amount cannot exceed outstanding balance (server-side check returns a clear error)
- Amount must be positive

**Demo tip:** Add a credit entry for a customer → show the running balance in transaction history → record a partial payment → show balance decrease.

---

### Screen 10 — Purchases (`/purchases`)

**What it shows:**
- Header with total PO count
- Status filter buttons: All / Draft / Received / Cancelled
- New Purchase button
- Paginated purchase orders table (10 per page)

**Purchases Table columns:**
- PO Number (e.g. `PO-2026-0001`, monospaced)
- Supplier name
- Items count badge
- Total amount
- Status badge with icon (Draft / Received / Cancelled)
- Created date
- View (eye icon) + Receive + Cancel action buttons (Receive/Cancel only for DRAFT)

**New Purchase Form** (modal dialog):
- Supplier dropdown (only active suppliers)
- Optional notes field
- Line-item rows — each row has:
  - Product search (type 2+ chars, shows autocomplete with SKU + stock)
  - Quantity
  - Cost price (₹) — pre-filled from product's cost price
  - Batch number (optional)
  - Expiry date (optional)
- Add Row / Remove Row buttons
- Running total at bottom

**View Detail** (eye icon):
Opens a detail dialog showing:
- Supplier info, status badge, created by, received at, notes
- Items table: product name + SKU, qty, cost, total, batch, expiry
- Grand total
- Receive / Cancel PO buttons (if DRAFT)

**Purchase Lifecycle:**
- **DRAFT** → created, stock not yet updated
- **RECEIVED** → stock incremented for each item, `receivedAt` timestamp set
- **CANCELLED** → no stock change (was never received)

**PO Number Format:** `PO-YYYY-NNNN` — auto-generated, counter resets each year

---

## 6. Business Logic & Rules

### Bill Number Generation
- Format: `BILL-YYYY-NNNN` (e.g. `BILL-2026-0001`)
- Counter resets every year
- Auto-generated on bill creation — cashier never types it

### GST (Tax) — Per-Product Rate
- Each product has its own GST rate: **0%, 5%, 12%, 18%, or 28%** (Indian GST slabs)
- `taxAmount = Σ (unitPrice × quantity × gstRate / 100)` for each line item
- `totalAmount = subtotal + taxAmount − discountAmount`
- Invoice shows **GST%** column per item and total GST collected
- Backend fetches rate from DB — cannot be manipulated from frontend

**Common Indian GST slabs:**
| Rate | Examples |
|---|---|
| 0% | Fresh vegetables, milk, salt |
| 5% | Rice, edible oil, tea, coffee |
| 12% | Packaged food, fruit juices, branded snacks |
| 18% | Soaps, detergents, hair oil (default) |
| 28% | Aerated drinks, luxury goods |

### Stock Management
- Stock **decrements** automatically when a bill is created (atomic DB update — race condition safe)
- Stock **restores** when a bill is cancelled or items are returned
- Products with 0 stock cannot be added to cart
- Low stock warning triggers when `stock < lowStockAlert` (default: 10 units)
- All stock changes recorded in `StockMovement` table with type (SALE / RETURN / PURCHASE / ADJUSTMENT)

### Returns & Refunds
| Rule | Detail |
|---|---|
| Who can return | Any PAID bill — no time limit |
| Partial returns | Yes — return any subset of items at any quantity |
| Multiple returns | Yes — return more items from the same bill on different days |
| Return types | **REFUND** (cash back) or **EXCHANGE** (item swap — new sale processed at POS) |
| Stock | Restocked immediately when return is processed |
| Return number | `RET-YYYY-NNNN` — auto-generated, counter resets yearly |
| Over-return guard | Backend validates returnable qty = billed qty − already returned qty |

### MRP & Discount Display
- MRP is optional on each product
- If `mrp > price`, discount % is auto-calculated: `((mrp − price) / mrp) × 100`
- Shown as strikethrough MRP + green "X% off" badge on product cards and invoices
- "You saved ₹X" summary shown at bottom of invoice

### Loyalty Points
| Rule | Value |
|---|---|
| Earning rate | ₹100 spent = 1 point |
| Point value | 1 point = ₹1 discount |
| Minimum to redeem | 10 points |
| Maximum redemption | 20% of bill total |
| On cancellation | Earned points deducted |
| On redemption | Redeemed points deducted, new points earned on net amount |

### User Roles
| Feature | ADMIN | CASHIER |
|---|---|---|
| POS & Billing | ✅ | ✅ |
| View Products | ✅ | ✅ |
| Add/Edit/Delete Products | ✅ | ✅ |
| View Customers | ✅ | ✅ |
| Add/Edit Customers | ✅ | ✅ |
| View Invoices | ✅ | ✅ |
| Cancel Bills | ✅ | ✅ |
| Return Items (refund/exchange) | ✅ | ✅ |
| Reports | ✅ | ❌ |
| Settings / Categories | ✅ | ✅ |
| Register New Users | ✅ | ❌ |
| Suppliers (view/add/edit) | ✅ | ✅ |
| Purchases (view/create/receive) | ✅ | ✅ |
| Khata Book (credit/payments) | ✅ | ✅ |

---

## 7. API Reference

Base URL: `http://localhost:3000/api/v1`

All responses follow this structure:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Request successful",
  "data": { ... },
  "timestamp": "2026-05-05T00:00:00.000Z"
}
```

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login → JWT token |
| POST | `/auth/register` | ADMIN JWT | Register new user |
| GET | `/auth/me` | JWT | Get current user profile |

### Products
| Method | Endpoint | Description |
|---|---|---|
| GET | `/products` | All products with category |
| POST | `/products` | Create product |
| GET | `/products/search?q=` | Search by name / SKU / barcode |
| GET | `/products/low-stock` | Products below lowStockAlert |
| GET | `/products/:id` | Single product |
| PATCH | `/products/:id` | Update product |
| DELETE | `/products/:id` | Delete product |

### Categories
| Method | Endpoint | Description |
|---|---|---|
| GET | `/categories` | All categories |
| POST | `/categories` | Create category |
| PATCH | `/categories/:id` | Update category |
| DELETE | `/categories/:id` | Delete category |

### Bills
| Method | Endpoint | Description |
|---|---|---|
| POST | `/bills` | Create bill (reduces stock, adds loyalty pts) |
| GET | `/bills?page=&limit=` | Paginated bills list |
| GET | `/bills/:id` | Single bill with items + customer + user + returns |
| PATCH | `/bills/:id/status` | Update status (CANCELLED restores stock) |

### Returns
| Method | Endpoint | Description |
|---|---|---|
| POST | `/returns` | Create return — restocks items, generates `RET-YYYY-NNNN` |
| GET | `/returns?billId=` | All returns for a specific bill |
| GET | `/returns/:id` | Single return with items |

### Customers
| Method | Endpoint | Description |
|---|---|---|
| GET | `/customers` | All customers |
| POST | `/customers` | Create customer |
| GET | `/customers/search?q=` | Search by name or phone |
| GET | `/customers/:id` | Single customer |
| GET | `/customers/:id/bills` | All bills for a customer |
| PATCH | `/customers/:id` | Update customer |
| DELETE | `/customers/:id` | Delete customer |

### Reports
| Method | Endpoint | Description |
|---|---|---|
| GET | `/reports/sales/daily?date=YYYY-MM-DD` | Daily sales summary |
| GET | `/reports/sales/monthly?month=5&year=2026` | Monthly breakdown |
| GET | `/reports/top-products?limit=10` | Best sellers |
| GET | `/reports/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD` | Revenue in date range |
| GET | `/reports/inventory` | Full inventory summary |

### Suppliers
| Method | Endpoint | Description |
|---|---|---|
| GET | `/suppliers?q=` | All suppliers (optional search by name/phone) |
| POST | `/suppliers` | Create supplier |
| GET | `/suppliers/:id` | Single supplier |
| PATCH | `/suppliers/:id` | Update supplier |
| DELETE | `/suppliers/:id` | Delete (or deactivate if has purchases) |

### Purchases
| Method | Endpoint | Description |
|---|---|---|
| GET | `/purchases?page=&limit=&status=` | Paginated purchase orders |
| POST | `/purchases` | Create new PO (DRAFT) |
| GET | `/purchases/:id` | Single PO with items + supplier + user |
| POST | `/purchases/:id/receive` | Mark as RECEIVED — increments stock |
| POST | `/purchases/:id/cancel` | Mark as CANCELLED |

### Khata Book (Credit Management)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/credit-book/summary` | `{ totalOutstanding, debtorCount, clearedCount }` |
| GET | `/credit-book?search=` | All customers with credit history + computed balance |
| GET | `/credit-book/:customerId` | Customer detail + full transaction history with running balance |
| POST | `/credit-book/:customerId/credit` | Add credit entry (customer took goods) |
| POST | `/credit-book/:customerId/payment` | Record payment received — validates amount ≤ balance |

**Transaction body:**
```json
{ "amount": 250.00, "description": "Rice 2kg, Oil 1L", "note": "optional remark" }
```

---

## 8. Demo Script (Suggested Flow)

Follow this order for a smooth live demo — each step builds on the previous.

### Step 1 — Login (30 sec)
- Open `http://localhost:5173`
- Log in as `admin@invofy.com` / `admin123`
- Point out: secure JWT login, role-based system

### Step 2 — Dashboard (1 min)
- Show today's stats, revenue chart, top products
- Explain: "This is the first thing your manager sees every morning"

### Step 3 — Products (2 min)
- Go to `/products`
- Show the product table — MRP column, discount %, stock alerts
- Click **Add Product** → fill in a new product with MRP and selling price
- Show the discount % auto-calculated on the table row
- Show low stock / out of stock color coding

### Step 4 — POS Demo — Create a Bill (3 min)
- Go to `/pos`
- Search "Cola" → products appear, show MRP strikethrough
- Click to add 2x Coca Cola
- Search "Parle" → add 3x Parle-G
- Search customer "Ramesh" → select from dropdown
- Apply ₹5 discount
- Click **Checkout**
- In Payment Modal: show loyalty points toggle → turn ON → show discount applied
- Select **UPI** as payment method
- Click **Pay** → success screen

### Step 5 — Invoice (1 min)
- Click **View Invoice**
- Show the full invoice: MRP strikethrough, GST breakdown, "You saved ₹X", loyalty points info
- Click **Download PDF** → open the downloaded PDF

### Step 6 — Invoices List (1 min)
- Go to `/invoices`
- Show the bill just created — PAID status
- Click eye icon → show invoice dialog
- Show cancel button — explain stock restore + points deduction

### Step 7 — Customers (1 min)
- Go to `/customers`
- Show Ramesh's loyalty points — increased after the demo bill
- Show customer history with bills count

### Step 8 — Reports (1 min)
- Go to `/reports`
- Show revenue summary cards
- Set date range to current month → Apply
- Show revenue chart, top products table
- Show inventory summary — low stock products

### Step 9 — Settings (30 sec)
- Go to `/settings`
- Show account info section
- Show categories management — add/edit/delete categories

### Step 10 — Khata Book (2 min)
- Go to `/credit-book`
- Show the 3 summary cards (Total Outstanding, Active Debtors, Cleared)
- Click **New Entry** → select a customer → type "Goods on Credit" → ₹350 → description "Rice 2kg, Atta 5kg" → submit
- Click the customer row → show Customer Detail Dialog
- Point out: running balance after each entry, red ↓ for credit / green ↑ for payment
- Click **Record Payment** → ₹200 → submit → show balance reduced from ₹350 to ₹150
- Point out: "Record Payment" would be disabled once balance hits zero

---

## 9. File Structure

```
Invofy/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database models
│   │   ├── migrations/            # SQL migration history
│   │   └── seed.ts                # Seed script
│   ├── src/
│   │   ├── auth/                  # JWT auth, guards, strategies, decorators
│   │   ├── bills/                 # Billing — create, list, cancel, status
│   │   ├── categories/            # Product categories CRUD
│   │   ├── common/
│   │   │   ├── filters/           # Global HTTP exception filter
│   │   │   └── interceptors/      # Response wrapper interceptor
│   │   ├── customers/             # Customer CRUD + search
│   │   ├── prisma/                # PrismaService (singleton)
│   │   ├── products/              # Product CRUD + search + low-stock
│   │   ├── credit-book/           # Khata Book — credit/payment tracking, balance computation
│   │   ├── purchases/             # Purchase orders — create, receive, cancel
│   │   ├── reports/               # Sales, revenue, inventory reports
│   │   ├── returns/               # Returns — create, validate, restock, RET number
│   │   ├── suppliers/             # Supplier CRUD + search
│   │   ├── users/                 # User management (admin)
│   │   └── main.ts                # App bootstrap, CORS, pipes, guards
│   ├── .env                       # Environment variables (not committed)
│   ├── .env.example               # Template for env setup
│   ├── sample-data.js             # Sample data seeder (run with node)
│   └── fix-password.js            # One-time password fix utility
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ui/                # shadcn-style reusable components
│       │   ├── dashboard/         # StatsCard, SalesChart
│       │   ├── pos/               # ProductCard, CartItem, PaymentModal
│       │   ├── products/          # ProductTable, ProductForm
│       │   ├── purchases/         # PurchaseForm (new PO modal)
│       │   ├── AppLayout.tsx      # Sidebar + outlet wrapper
│       │   ├── ErrorBoundary.tsx  # Catches JS crashes, shows error + retry button
│       │   ├── ProtectedRoute.tsx # JWT guard for routes
│       │   ├── Invoice.tsx        # Invoice UI + PDF download; GST% per item; thermal print button
│       │   ├── Receipt.tsx        # 80mm thermal receipt — popup window, auto-prints, auto-closes
│       │   └── ReturnModal.tsx    # Return items flow — qty inputs, refund/exchange toggle, live preview
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Dashboard.tsx
│       │   ├── POS.tsx
│       │   ├── Products.tsx
│       │   ├── Customers.tsx
│       │   ├── Invoices.tsx
│       │   ├── Suppliers.tsx
│       │   ├── Purchases.tsx
│       │   ├── CreditBook.tsx     # Khata Book — summary cards, customer list, detail dialog, add/payment forms
│       │   ├── Reports.tsx
│       │   └── Settings.tsx
│       ├── services/              # Axios API calls per module
│       ├── store/                 # Zustand auth store + cart store
│       ├── types/                 # TypeScript interfaces for all models
│       └── lib/
│           ├── axios.ts           # Axios instance + interceptors
│           └── utils.ts           # formatCurrency, formatDate helpers
│
└── sprint.md                      # ← You are here
```

---

## Quick Reference Card

| What | Where |
|---|---|
| Frontend URL | http://localhost:5173 |
| Backend API | http://localhost:3000/api/v1 |
| Admin login | admin@invofy.com / admin123 |
| Cashier login | cashier@invofy.com / cashier123 |
| Start backend | `cd backend && npm run start:dev` |
| Start frontend | `cd frontend && npm run dev` |
| Load sample data | `cd backend && npx prisma db seed` |
| DB migrations | `cd backend && npx prisma migrate dev` |
| View DB (GUI) | `cd backend && npx prisma studio` → http://localhost:5555 |

<!-- http://localhost:5555/ -->
<!-- npm run start:dev -->
<!-- npm run start:dev -->

---

## 10. Changelog

### 2026-05-07
- **Barcode label printing** — `🏷️` button on every product row in the Products table opens a "Print Label" dialog with a copies input (1–100); "Print All Labels" button in the page header prints one label per product currently visible (respects search + category filter); labels are generated as a print popup (same pattern as thermal receipt) via `jsbarcode` (CODE128 format, falls back to SKU if no barcode); each 60mm × 42mm label shows store name, barcode SVG + number, product name, SKU, MRP (strikethrough if discounted), selling price, discount % badge, and GST rate; labels flow 3-per-row on A4, print-ready with dashed cut lines; `printLabels.ts` utility is reusable for any future label printing need
- **Khata Book** (`/credit-book`) — local mart credit/debt tracker replacing paper ledger books; new `CreditTransaction` Prisma model with `CREDIT` / `PAYMENT` enum; new `credit-book` NestJS module with 5 endpoints; balance is computed dynamically from transactions (no denormalisation); payment validation rejects amounts exceeding outstanding balance; frontend page shows 3 summary cards, customer list with colour-coded balance badges, customer detail dialog with running-balance transaction timeline, add-credit and record-payment forms, and a "New Entry" dialog with live customer search; "Show cleared" toggle shows zero-balance customers; DB migration `20260507101421_add_credit_book`

### 2026-05-05
- **Suppliers screen** (`/suppliers`) — full CRUD with search, GST number, active/inactive status, purchase count badge; deactivates instead of deletes if supplier has existing POs
- **Purchases screen** (`/purchases`) — paginated PO list with status filter; New Purchase modal with product autocomplete, batch/expiry tracking; detail view with Receive / Cancel actions; stock auto-increments on RECEIVE
- **ErrorBoundary** — wraps entire app; crashes now show a readable error message + "Try again" button instead of a blank white page
- **Select component** — replaced plain HTML `<select>` wrapper with full Radix UI compound component (`SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`) to fix blank-page crash
- **Seed script** — fixed seed runner from `ts-node --esm` → `tsx` (was crashing due to `module: nodenext` in tsconfig); added 3 categories, 5 products, 4 suppliers, 4 purchase orders to seed data; seed command is now `npx prisma db seed`
- **Product-wise GST rates** — added `gstRate` field (Decimal) to Product model; dropdown in ProductForm with Indian GST slabs (0%, 5%, 12%, 18%, 28%); GST% column in ProductTable; tax calculated per line item (`unitPrice × qty × rate/100`), not flat 18%; Invoice and PaymentModal updated to show variable GST; cart store `getTaxAmount()` uses per-product rate
- **Barcode scanner optimisation** — POS search bar auto-focuses on mount; F2 refocuses at any time; exact barcode match in search results auto-adds to cart instantly (continuous scan mode, no Enter needed); input clears and refocuses for next scan
- **Thermal printer support** — Receipt component generates isolated 80mm HTML page (`@page { size: 80mm auto }`), opens in popup window, auto-calls `print()` then `close()` after 250 ms; no whole-page print dialog
- **Stock race condition fix** — bill creation uses `product.updateMany({ where: { stock: { gte: qty } } })` for atomic check-and-decrement; throws if `count === 0` (concurrent sale took last unit); bill and PO number generation moved inside Serializable transaction
- **Returns & Refunds** — new `Return` / `ReturnItem` Prisma models; `RET-YYYY-NNNN` auto-number; `POST /returns` validates max-returnable per item (billed − already returned), calculates refundAmount, restocks via `product.update({ increment })`, records `StockMovement` (type RETURN); ReturnModal on Invoices page with per-item qty inputs, REFUND/EXCHANGE toggle, optional reason, live refund preview; multiple partial returns from the same bill supported over time