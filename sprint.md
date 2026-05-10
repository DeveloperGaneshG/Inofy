# Invofy — Mart Billing Software · Complete Project Guide

> **Stack:** NestJS + Prisma + PostgreSQL (backend) · React + TypeScript + Vite + Tailwind (frontend)
> **Last Updated:** 2026-05-10 (r3)

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

> **Screens covered:** Login · Dashboard · POS · Products · Customers · Invoices · Reports · Settings · Suppliers · Purchases · Khata Book · Expiry Tracker · **Inventory Adjustments** · **Audit Logs**

---

## 1. Project Overview

**Invofy** is a full-stack Point of Sale (POS) and billing software built for Indian retail marts. It handles the complete billing lifecycle — from product and inventory management to customer billing, invoice generation, and sales reporting.

### What it does
- **Cashiers** can quickly search products, add to cart, apply per-item discounts, redeem customer loyalty points, and generate bills
- **Admins** can manage products, categories, customers, suppliers, view reports, and manage staff users
- **Managers** can perform inventory adjustments (damaged stock, theft, count corrections) and view adjustment history
- Every bill auto-generates a GST invoice (printable + PDF downloadable) with per-product GST rates (0%, 5%, 12%, 18%, 28%)
- Inventory is tracked automatically — stock decreases on billing, restores on cancellation or return
- Customers earn loyalty points (₹100 = 1 point) which can be redeemed for discounts
- Barcode scanner support — scan directly into POS for instant add-to-cart
- Partial returns and exchanges supported — return individual items from any past bill
- Unit/weight-based products supported (KG, G, L, ML, etc.) with decimal quantity billing
- Full audit trail — every bill creation/cancellation and product price change is logged with before/after values

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
| Admin | admin@invofy.com | admin123 | Full access — all screens + user management + audit logs |
| Manager | *(create via Settings)* | *(set on creation)* | POS + inventory adjustments; no audit logs or user management |
| Cashier | cashier@invofy.com | cashier123 | POS, Products (view), Customers, Invoices |

> **Note:** Only ADMIN can register new users, manage categories, view reports, and read audit logs.

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
- 5 stat cards at the top
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
| Expiry Alerts | Count of expired + expiring-this-week batches; red if expired, amber if only this-week, green if all clear; clicking navigates to `/expiry?filter=expired` |

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
  - For weight/loose products (`allowDecimalQty = true`): buttons step by 0.5 and an editable input field appears for precise entry (e.g. `1.25 KG`)
  - Unit type shown next to quantity if not PCS (e.g. `× 1.25 KG`)
- **Per-item discount**: each cart row has a `[__] % off` input with a tag icon — discounted unit price shown in green with original struck through; discount savings shown as `−₹X`
- Trash icon to remove item
- **Customer Search** (optional): type 2+ characters to search customers by name or phone, click to select
- **Bill-level Discount field**: enter a flat ₹ discount amount applied to the entire bill (in addition to any per-item discounts)
- **Summary** at bottom:
  - Subtotal (sum of all discounted item totals, before GST)
  - GST (per-product rate applied on discounted price — correct under Indian GST rules)
  - Discount (bill-level flat discount, if any)
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
| Stock | Yes | Current stock quantity — accepts decimals for weight products |
| Low Stock Alert | No | Default 10 — triggers warning badge |
| Unit Type | No | PCS / KG / G / L / ML / BOX / DOZEN / PACK (default PCS) |
| Allow Decimal Qty | No | Checkbox — enables 0.5-step +/− and decimal input in POS cart |
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

### Screen 12 — Expiry Tracker (`/expiry`)

Gives store managers a single place to monitor every batch with an expiry date, act on soon-to-expire or already-expired stock, and keep a permanent write-off audit trail. Only purchase items from **RECEIVED** purchase orders with a non-null `expiryDate` appear here.

---

**[A] Page Header**

- Title "Expiry tracker" with a calendar-X icon
- **Export CSV** button — downloads the currently filtered batch list as a CSV file (columns: Product, SKU, Batch, Expiry Date, Days Left, Qty, Cost Price, Supplier, Status)
- **Alert settings** button (placeholder for future notification configuration)

---

**[B] Summary Cards (5 cards)**

| Card | Value | Colour rule |
|---|---|---|
| Already expired | Count of RECEIVED batches where `expiryDate < today` | Count shown in red when > 0 |
| Expires this week | Count where `today ≤ expiryDate ≤ today + 7 days` | Count shown in amber when > 0 |
| Expires this month | Count where `today + 7 < expiryDate ≤ today + 30 days` | Default colour |
| Safe stock | Count where `expiryDate > today + 30 days` | Count always shown in green |
| Stock value at risk | `SUM(quantity × costPrice)` for expired + this-week batches | Shown in red when > 0 |

Cards are skeleton-animated while loading; skeletons match the card height.

---

**[C] Alert Banner**

Shown only when `summary.expired > 0`:

> ⚠ **X batches are past expiry. Remove from shelves immediately.**

Red border, red background, red text. Disappears automatically as soon as write-offs bring `expired` count to zero.

---

**[D] Filter Pill Bar + Search**

Five pills across the left, search input on the right:

| Pill | Filter applied | Active colour |
|---|---|---|
| Expired (N) | `expiryDate < today` | Red |
| This week (N) | `today ≤ expiryDate ≤ today + 7` | Amber |
| This month (N) | `today + 7 < expiryDate ≤ today + 30` | Amber (lighter) |
| Safe | `expiryDate > today + 30` | Green |
| All batches | No date filter (all with non-null expiry) | Dark grey |

- Counts (N) inside pills come from the summary response and update after every write-off
- **Search input** — case-insensitive match on product name or SKU; debounced 300 ms before firing the API call; clears do not require a submit
- Changing the filter pill immediately reloads the batches table

---

**[E] Batches Table**

Columns: **Product** (name + SKU sub-text) · **Batch no.** · **Expiry date** · **Days left** · **Qty** · **Status** · **Supplier** · **Actions**

**Row background tint**

| Status | Background |
|---|---|
| `expired` or `today` | Very light red (`#FCEBEB22`) |
| `week` or `month` | Very light amber (`#FAEEDA22`) |
| `safe` | Transparent |

**Days left display**

| daysLeft | Display | Colour |
|---|---|---|
| < 0 | `−N days` | Red |
| 0 | `Today` | Red |
| 1 – 30 | `N days` | Amber |
| > 30 | `N days` | Green |

**Status badge**

| Value | Label | Badge colour |
|---|---|---|
| `expired` | Expired | Red pill |
| `today` | Expires today | Red pill |
| `week` | This week | Amber pill |
| `month` | This month | Amber pill |
| `safe` | Safe | Green pill |

**Actions column (context-aware)**

| Row status | Buttons shown |
|---|---|
| `expired` or `today` | **Write off** (red destructive button) |
| `week` or `month` | **Write off** (red) + **Mark discount** (amber outline) |
| `safe` | **View** (ghost button — links to `/purchases`) |

Empty state ("No batches found") shown when the filtered result is empty.

---

**[F] Write-Off Confirmation Dialog**

Triggered by any "Write off" button on a batch row.

Fields (inside the dialog):

| Field | Type | Rules |
|---|---|---|
| Product + batch | Read-only display | Shows `productName · SKU · Batch X` |
| Available qty | Read-only | Shows current `purchaseItem.quantity` |
| Quantity to write off | Number input | Min 1, max = available qty; live ₹ value preview below |
| Reason | Text input | Optional; placeholder "e.g. Damaged, expired, contaminated…" |

**On Confirm:**
1. `POST /api/v1/expiry/write-off` with `{ purchaseItemId, quantityWrittenOff, reason }`
2. Backend runs a single Prisma transaction:
   - Creates `StockWriteOff` record
   - Decrements `product.stock` by `quantityWrittenOff`
   - Decrements `purchaseItem.quantity` by `quantityWrittenOff` (row disappears if qty hits 0)
3. Dialog closes; success notification shown for 3.5 seconds: *"X units of [Product] written off successfully"*
4. Both summary cards and batch table reload automatically
5. Write-off log cache is invalidated (forces fresh load on next expand)

**On error:** notification shown in red with the server error message.

---

**[G] Write-Off Log (Expandable Section)**

Below the main table; collapsed by default.

**Collapsed header shows:**
- Label: "Write-off log — this month"
- Sub-text: `N units written off · ₹X value` (pulled from `summary.writeOffThisMonth`)
- Expand/collapse chevron icon

**When expanded:**
- Lazy-loads `GET /api/v1/expiry/write-off-log` (current month, no date params)
- Result cached until the next write-off action clears it
- Table columns: **Date** · **Product** (name + SKU sub-text) · **Batch** · **Qty** · **Value (₹)** · **Reason** · **By**
- Sticky totals row at the bottom: total quantity + total value across all log entries
- **Download log** button appears in the header when expanded — builds a CSV client-side and triggers browser download (`write-off-log-YYYY-MM-DD.csv`)
- Empty state: "No write-offs recorded this month"

---

**Acceptance Criteria**

| # | Criterion | How to verify |
|---|---|---|
| AC-1 | Summary cards show correct counts for each expiry bucket | Check counts match actual purchase items in DB by status |
| AC-2 | `stockValueAtRisk` = `SUM(quantity × costPrice)` for expired + this-week items only | Calculate manually from DB; compare card value |
| AC-3 | `writeOffThisMonth` in summary reflects only write-offs created in the current calendar month | Create a write-off; check the summary card updates |
| AC-4 | Alert banner appears when `expired > 0` and is hidden otherwise | Ensure no expired batches → banner gone; create one → banner appears |
| AC-5 | Filter pills change the table content immediately | Click each pill; verify table rows match the expected date range |
| AC-6 | Search debounces 300 ms — no API call fired on every keystroke | Open network tab; confirm only one request per pause |
| AC-7 | Search is case-insensitive on product name and SKU | Type lowercase sku, uppercase name — both return results |
| AC-8 | Row background tint is applied correctly per status | Expired rows have light red tint; week/month rows have light amber tint |
| AC-9 | "Expired" rows show only Write-off button; "week/month" rows show Write-off + Mark discount; "safe" rows show only View | Inspect action cells for each status |
| AC-10 | Write-off quantity input enforces min = 1 and max = available qty | Try entering 0 and a value > qty; input clamps both |
| AC-11 | Live value preview in dialog updates as quantity changes | Change qty in dialog; confirm ₹ value = qty × costPrice |
| AC-12 | Successful write-off decrements `product.stock` and `purchaseItem.quantity` atomically | Check DB before and after; both fields reduced by written-off qty |
| AC-13 | If `purchaseItem.quantity` reaches 0 after write-off, the row disappears from the table | Write off all remaining units; row no longer shows in any filter |
| AC-14 | Write-off dialog shows success notification, closes, and reloads both summary and batches | Observe UI after confirming write-off |
| AC-15 | Write-off log lazy-loads on first expand and is cached until the next write-off | Expand log; collapse; expand again — no second API call (unless write-off occurred) |
| AC-16 | Log totals row matches `SUM(quantityWrittenOff)` and `SUM(qty × costPrice)` of all displayed rows | Compare footer totals with manual sum of table rows |
| AC-17 | "Download log" generates a valid CSV with correct headers and data | Download; open in spreadsheet; verify columns and values |
| AC-18 | "Export CSV" (header button) exports the currently filtered and searched batch list | Apply a filter + search; export; verify CSV contains only those rows |
| AC-19 | Sidebar shows a red dot on the Expiry tracker icon when `expired + thisWeek > 0` | Ensure there are urgent batches; reload the app; observe red dot |
| AC-20 | Dashboard "Expiry alerts" card navigates to `/expiry?filter=expired` on click | Click card; verify URL and that the Expired pill is active |
| AC-21 | All endpoints return 401 without a valid JWT | Call any `/expiry/*` endpoint without a token; expect 401 |
| AC-22 | Write-off of qty > available returns 400 with a clear error message | POST with `quantityWrittenOff` > `purchaseItem.quantity`; check error |
| AC-23 | Write-off on a non-RECEIVED purchase item returns 400 | Attempt write-off referencing a DRAFT purchase item; check error |
| AC-24 | `GET /expiry/batches?filter=expired` returns only items where `expiryDate < today` | Check each returned row's expiry date is in the past |
| AC-25 | `daysLeft` in batch response is negative for expired items, 0 for today, positive for future | Verify values match `FLOOR((expiryDate - today) / 86400000)` |

---

**Demo tip:** Create a purchase order, receive it, set one item's expiry date to yesterday — it appears immediately in "Already expired" with a red row tint. Write it off, watch all three sections (summary card, batch table, write-off log) update live.

---

### Screen 13 — Inventory Adjustments (`/inventory-adjustments`)

For manual stock corrections that don't come from a sale, purchase, or return — damaged goods, theft, counting mismatches, or setting opening stock.

**Access:** ADMIN and MANAGER only.

**What it shows:**
- Header with total adjustment count + **New Adjustment** button
- Paginated adjustments table (20 per page)

**Adjustments Table columns:**
| Column | Description |
|---|---|
| Product | Name + SKU |
| Type | ADD (green) or REMOVE (red) badge with arrow icon |
| Reason | Human-readable reason label |
| Qty | `+N UNIT` or `−N UNIT` — unit type from product |
| Notes | Free-text description (or `—`) |
| By | User who performed the adjustment |
| Date | Short locale date + time |

**New Adjustment dialog:**
| Field | Required | Notes |
|---|---|---|
| Product | Yes | Search by name or SKU — shows current stock next to result |
| Adjustment Type | Yes | **Add Stock** (green) or **Remove Stock** (red) toggle |
| Reason | Yes | Damaged / Theft / Count Mismatch / Opening Stock / Other |
| Quantity | Yes | Positive number; step = 1 for PCS products, 0.001 for decimal products |
| Notes | No | Free-text description |

**Validation:**
- REMOVE rejected if quantity > current stock (server returns 400 with message showing available qty)
- Inline warning shown in dialog when input quantity exceeds stock before submit

**What happens on save (atomic transaction):**
1. `product.stock` incremented or decremented
2. `StockMovement` record created (type = ADJUSTMENT, note includes adjustment type + reason + notes)
3. `InventoryAdjustment` record created for full audit history

**Demo tip:** Remove 5 units of a product with reason "Damaged" → go to Products page → confirm stock reduced → go back and show the adjustment in the table.

---

### Screen 14 — Audit Logs (`/audit-logs`)

Full tamper-evident log of all key business events: bill creation, bill cancellation, and product price changes.

**Access:** ADMIN only.

**What it shows:**
- Header with total event count
- Entity filter pills: All / Bill / Product / User / Purchase / Return
- Paginated log table (50 per page)
- Click any row with before/after data to expand an inline diff

**Log Table columns:**
| Column | Description |
|---|---|
| Action | Color-coded pill — CREATE (green), UPDATE (blue), PRICE_UPDATE (yellow), DELETE (red), CANCEL (orange) |
| Entity | Entity type + last 6 chars of ID |
| By | User name who triggered the action |
| When | Short locale date + time |
| Details | "Click to expand" if before/after data exists |

**Expanded row (before / after diff):**
- Two-column JSON pre block showing the recorded state before and after the change
- Formatted with 2-space indent for readability

**What gets logged automatically:**
| Trigger | Action | Entity | Before | After |
|---|---|---|---|---|
| Bill created | CREATE | Bill | — | `{ billNumber, totalAmount, paymentMethod }` |
| Bill cancelled | CANCEL | Bill | `{ status: "PAID" }` | `{ status: "CANCELLED" }` |
| Product price changed | PRICE_UPDATE | Product | `{ price, costPrice }` | `{ price, costPrice }` |

**Demo tip:** Edit a product's price → go to Audit Logs → filter by Product → expand the PRICE_UPDATE row to show exactly what changed.

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
- Stock **increments** when a purchase order is received
- Stock **adjusts** manually via the Inventory Adjustments screen (ADMIN/MANAGER only)
- Products with 0 stock cannot be added to cart
- Low stock warning triggers when `stock < lowStockAlert` (default: 10 units)
- `product.stock` is stored as **Float** — supports decimal quantities for weight/loose products
- All stock changes recorded in `StockMovement` table with type (SALE / RETURN / PURCHASE / ADJUSTMENT)

### Unit / Weight Based Products
| Field | Description |
|---|---|
| `unitType` | Display label for the unit — PCS, KG, G, L, ML, BOX, DOZEN, PACK (default: PCS) |
| `allowDecimalQty` | Boolean flag — when true, POS cart shows decimal quantity input stepping by 0.5 |

- `stock` and all quantity fields (`BillItem.quantity`, `PurchaseItem.quantity`, `StockMovement.quantity`, `ReturnItem.quantity`) are `Float` in the database — no separate conversion needed
- When selling loose goods (e.g. 1.25 KG rice): cashier types the decimal qty directly; backend receives it and decrements stock accurately
- GST is correctly applied on the discounted price of the decimal quantity
- Unit type is shown next to quantity in the cart, on invoices, and in adjustment records

### Inventory Adjustments
| Adjustment Type | Effect |
|---|---|
| ADD | `product.stock += quantity` — use for opening stock, found stock, or correction upward |
| REMOVE | `product.stock -= quantity` — use for damaged, stolen, or miscounted stock |

**Reasons:** Damaged · Theft · Count Mismatch · Opening Stock · Other

- Each adjustment runs in a Prisma transaction: updates stock + creates `StockMovement` (type = ADJUSTMENT) + creates `InventoryAdjustment` record
- REMOVE is rejected server-side if quantity > current stock (400 Bad Request)
- All adjustments are permanent — there is no undo; a counter-adjustment must be made manually
- Restricted to ADMIN and MANAGER roles

### Audit Logging
Audit log entries are created automatically inside service methods — no extra action required from the user.

| Event | When logged |
|---|---|
| Bill CREATE | On every successful bill creation |
| Bill CANCEL | When a bill's status is set to CANCELLED |
| Product PRICE_UPDATE | When `price` or `costPrice` changes on a product update |

- Log entries store: `action`, `entity`, `entityId`, `before` (JSON), `after` (JSON), `userId`, `userName`, `createdAt`
- Readable by ADMIN only via `GET /audit-logs`
- Not deletable via API — permanent record

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

### Expiry Tracking & Stock Write-Off

**Expiry date buckets** — computed fresh on every request using the server's current date:

| Bucket | Date range | Interpretation |
|---|---|---|
| Expired | `expiryDate < today (00:00)` | Past their sell-by date — must be removed |
| This week | `today ≤ expiryDate < today + 8 days` | Needs urgent action |
| This month | `today + 8 days ≤ expiryDate < today + 31 days` | Monitor and discount |
| Safe | `expiryDate ≥ today + 31 days` | No immediate action needed |

Only items from **RECEIVED** purchase orders with a non-null `expiryDate` are included. DRAFT and CANCELLED purchases are excluded entirely.

**Write-off rules:**

| Rule | Detail |
|---|---|
| Eligibility | Purchase item must belong to a RECEIVED purchase |
| Minimum qty | 1 unit |
| Maximum qty | Current `purchaseItem.quantity` — cannot write off more than is tracked |
| Atomicity | `StockWriteOff` creation + `product.stock` decrement + `purchaseItem.quantity` decrement run in a single Prisma transaction |
| Audit trail | Every write-off creates a permanent `StockWriteOff` record (id, product, qty, reason, userId, timestamp) |
| Stock impact | `product.stock` decrements immediately — reflected in POS and Products screens |
| Batch cleanup | If `purchaseItem.quantity` hits 0 after a write-off, the batch row no longer appears in any expiry filter |
| No reversal | Write-offs cannot be undone — they are permanent audit records |

**Stock value at risk** = `SUM(purchaseItem.quantity × purchaseItem.costPrice)` for all expired and this-week batches. This uses each batch's individual cost price (not the product's current blended cost price) to reflect the actual sunk cost of the at-risk stock.

---

### User Roles
| Feature | ADMIN | MANAGER | CASHIER |
|---|---|---|---|
| POS & Billing | ✅ | ✅ | ✅ |
| Per-item discount in POS | ✅ | ✅ | ✅ |
| View Products | ✅ | ✅ | ✅ |
| Add/Edit/Delete Products | ✅ | ✅ | ✅ |
| View Customers | ✅ | ✅ | ✅ |
| Add/Edit Customers | ✅ | ✅ | ✅ |
| View Invoices | ✅ | ✅ | ✅ |
| Cancel Bills | ✅ | ✅ | ✅ |
| Return Items (refund/exchange) | ✅ | ✅ | ✅ |
| Reports | ✅ | ❌ | ❌ |
| Settings / Categories | ✅ | ✅ | ✅ |
| Register New Users | ✅ | ❌ | ❌ |
| Suppliers (view/add/edit) | ✅ | ✅ | ✅ |
| Purchases (view/create/receive) | ✅ | ✅ | ✅ |
| Khata Book (credit/payments) | ✅ | ✅ | ✅ |
| Expiry Tracker (view all sections) | ✅ | ✅ | ✅ |
| Write off expired stock | ✅ | ✅ | ✅ |
| Inventory Adjustments | ✅ | ✅ | ❌ |
| Audit Logs | ✅ | ❌ | ❌ |

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

### Inventory Adjustments
Requires JWT. ADMIN and MANAGER only.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/inventory-adjustments` | Create adjustment — updates stock + StockMovement + AdjustmentRecord |
| GET | `/inventory-adjustments?page=&limit=&productId=` | Paginated adjustment history (filter by product optional) |

**Create body:**
```json
{
  "productId": "uuid",
  "adjustmentType": "REMOVE",
  "reason": "DAMAGED",
  "quantity": 5,
  "notes": "Broken during unloading"
}
```

`adjustmentType`: `ADD` | `REMOVE`
`reason`: `DAMAGED` | `THEFT` | `COUNT_MISMATCH` | `OPENING_STOCK` | `OTHER`

### Audit Logs
Requires JWT. ADMIN only.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/audit-logs?page=&limit=&entity=&userId=` | Paginated audit log (filter by entity type or user) |

**Log entry shape:**
```json
{
  "id": "uuid",
  "action": "PRICE_UPDATE",
  "entity": "Product",
  "entityId": "uuid",
  "before": { "price": 45.00, "costPrice": 30.00 },
  "after": { "price": 50.00, "costPrice": 32.00 },
  "userId": "uuid",
  "userName": "Admin",
  "createdAt": "2026-05-10T10:00:00.000Z"
}
```

### Expiry Tracking

All routes require JWT. No role restriction — both ADMIN and CASHIER can access.

| Method | Endpoint | Query params | Description |
|---|---|---|---|
| GET | `/expiry/summary` | — | Bucket counts + `stockValueAtRisk` + `writeOffThisMonth { quantity, value }` |
| GET | `/expiry/batches` | `filter` (`expired`\|`week`\|`month`\|`safe`\|`all`, default `all`), `search` (name/SKU substring) | Sorted batch list (most urgent first) with `daysLeft` and `status` per row |
| POST | `/expiry/write-off` | — | Write off stock; body: `{ purchaseItemId, quantityWrittenOff, reason? }` |
| GET | `/expiry/write-off-log` | `from` (ISO date, default: start of month), `to` (ISO date, default: now) | Write-off log with `items[]`, `totalQuantity`, `totalValue` |
| GET | `/expiry/alerts` | — | Lightweight `{ expired, thisWeek, total }` — called on sidebar/dashboard load |

**Summary response:**
```json
{
  "expired": 3,
  "thisWeek": 5,
  "thisMonth": 12,
  "safe": 47,
  "stockValueAtRisk": 4250.00,
  "writeOffThisMonth": { "quantity": 18, "value": 1890.00 }
}
```

**Batch row shape:**
```json
{
  "purchaseItemId": "abc123",
  "productId": "...",
  "productName": "Amul Butter 500g",
  "sku": "AMUL-BTR-500",
  "batchNumber": "B240301",
  "expiryDate": "2026-05-03T00:00:00.000Z",
  "daysLeft": -4,
  "quantity": 12,
  "costPrice": 230.00,
  "supplierId": "...",
  "supplierName": "Amul Distributor",
  "status": "expired"
}
```

**Write-off body & response:**
```json
// POST /expiry/write-off
{ "purchaseItemId": "abc123", "quantityWrittenOff": 5, "reason": "Past expiry" }

// 201 response
{ "writeOffId": "clxyz...", "message": "Stock written off successfully" }
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

### Step 11 — Inventory Adjustments (1 min)
- Go to `/inventory-adjustments`
- Click **New Adjustment**
- Search for a product (e.g. "Rice")
- Select **Remove Stock**, reason = **Damaged**, qty = 2, notes = "Broken during unloading"
- Save → show the new row in the table with red REMOVE badge
- Go back to Products → confirm stock reduced by 2

### Step 12 — Audit Logs (1 min)
- Go to `/audit-logs`
- Show the CREATE events from the bill you just made in Step 4
- Click the **Product** filter pill → show PRICE_UPDATE log if you edited a product price
- Click a row to expand → show the before/after JSON diff

### Step 13 — Expiry Tracker (2 min)
- Point out the **red dot** on the "Expiry tracker" sidebar icon (if any urgent batches exist)
- Go to `/expiry`
- Show the 5 summary cards — point out "Stock value at risk" in red
- If there are expired batches, show the red alert banner at top
- Click the **Expired** filter pill — table narrows to past-expiry rows with red tint
- Click **Write off** on any row → dialog opens showing product, batch, available qty
  - Enter a quantity (e.g. 3 units) and a reason ("Past expiry, unsellable")
  - Click **Confirm write-off** → success toast, summary cards refresh, row qty decreases (or disappears)
- Expand the **Write-off log** section → show the entry just created with date, qty, ₹ value, reason
- Click **Download log** → CSV downloads; open it to show data is correct
- Navigate back to Dashboard → show the Expiry alerts card reflects the updated count

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
│   │   ├── expiry/                # Expiry tracker — getSummary, getBatches, writeOff, getWriteOffLog, getExpiryAlerts
│   │   │   ├── expiry.module.ts
│   │   │   ├── expiry.controller.ts   # 5 routes under /expiry, all JWT-guarded
│   │   │   ├── expiry.service.ts      # Date-bucket logic, write-off transaction, log queries
│   │   │   └── expiry.dto.ts          # WriteOffDto (purchaseItemId, quantityWrittenOff, reason?)
│   │   ├── inventory-adjustments/ # Manual stock adjustments (ADMIN/MANAGER)
│   │   │   ├── inventory-adjustments.module.ts
│   │   │   ├── inventory-adjustments.controller.ts  # POST / GET /inventory-adjustments
│   │   │   ├── inventory-adjustments.service.ts     # Validates stock, runs tx: product + StockMovement + InventoryAdjustment
│   │   │   └── dto/create-adjustment.dto.ts         # productId, adjustmentType, reason, quantity, notes
│   │   ├── audit/                 # Audit log — read-only for ADMIN
│   │   │   ├── audit.module.ts
│   │   │   ├── audit.controller.ts   # GET /audit-logs with entity/userId filters
│   │   │   └── audit.service.ts      # log() method called inline by bills/products services
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
│       │   ├── CreditBook.tsx              # Khata Book — summary cards, customer list, detail dialog, add/payment forms
│       │   ├── ExpiryTracker.tsx           # Expiry tracker — summary cards, filter pills, batch table, write-off dialog, expandable log
│       │   ├── InventoryAdjustments.tsx    # Manual stock adjustments — table + dialog (product search, type, reason, qty, notes)
│       │   ├── AuditLogs.tsx              # Audit log — entity filter tabs, expandable before/after diff, color-coded actions
│       │   ├── Reports.tsx
│       │   └── Settings.tsx
│       ├── services/              # Axios API calls per module
│       │   ├── expiry.service.ts               # expirySummary, expiryBatches, writeOffStock, writeOffLog, expiryAlerts
│       │   ├── inventoryAdjustmentService.ts   # create, getAll
│       │   └── auditService.ts                 # getAll (with entity + userId filters)
│       ├── store/                 # Zustand auth store + cart store
│       ├── types/
│       │   ├── index.ts           # TypeScript interfaces for all core models
│       │   └── expiry.ts          # ExpirySummary, ExpiryBatch, ExpiryStatus, WriteOffDto, WriteOffLog, ExpiryAlerts
│       └── lib/
│           ├── axios.ts           # Axios instance + interceptors
│           └── utils.ts           # formatCurrency, formatDate, formatDateShort helpers
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

### 2026-05-10
- **Per-item discount in POS** — each cart row now has a `% off` input with tag icon; discounted unit price shown in green with original struck through; savings shown inline (`−₹X`); `CartItem` type extended with `discount: number` (0–100); `cartStore` updated with `setItemDiscount(productId, pct)` action; `calcTotal` helper preserves discount when quantity changes; GST correctly applied on discounted price; discounted effective unit price sent to backend on checkout (no backend schema change required)
- **Unit / Weight Based Products** — `unitType String @default("PCS")` and `allowDecimalQty Boolean @default(false)` added to `Product` model; `stock`, `BillItem.quantity`, `PurchaseItem.quantity`, `StockMovement.quantity`, `ReturnItem.quantity` all changed from `Int` to `Float` in schema (migration `20260510063622_add_inventory_audit_units_manager_role`); `ProductForm` updated with unit type selector (PCS/KG/G/L/ML/BOX/DOZEN/PACK) and "Allow decimal qty" checkbox; POS `CartItem` shows unit type next to quantity, switches to decimal input and 0.5-step buttons when `allowDecimalQty = true`; `cartStore.updateQuantity` rounds to 3 decimal places; `CreateBillItemDto.quantity` min changed from 1 to 0.001
- **Inventory Adjustments** (`/inventory-adjustments`) — new `AdjustmentType` (ADD/REMOVE) and `AdjustmentReason` (DAMAGED/THEFT/COUNT_MISMATCH/OPENING_STOCK/OTHER) enums; new `InventoryAdjustment` Prisma model with relations to Product and User; `InventoryAdjustmentsModule` with POST + GET endpoints (ADMIN/MANAGER only); service runs atomic Prisma transaction: updates `product.stock`, creates `StockMovement` (type=ADJUSTMENT), creates `InventoryAdjustment` record; REMOVE rejects if qty > current stock (400); frontend page with paginated table, product search autocomplete, ADD/REMOVE toggle, reason dropdown, decimal-aware qty input, inline stock warning, notes field
- **Audit Logs** (`/audit-logs`) — new `AuditLog` Prisma model (action, entity, entityId, before JSON, after JSON, userId, userName, createdAt); `AuditModule` with read-only `GET /audit-logs` (ADMIN only, entity/userId filters, paginated); `BillsService` logs `CREATE` and `CANCEL` events inline via `tx.auditLog.create()`; `ProductsService.update` logs `PRICE_UPDATE` when price or costPrice changes (user ID passed from controller via `@CurrentUser`); frontend `AuditLogs.tsx` with entity filter pills, expandable before/after JSON diff (side-by-side pre blocks), color-coded action badges (green CREATE, blue UPDATE, yellow PRICE_UPDATE, red DELETE, orange CANCEL)
- **Manager Role** — `MANAGER` added to `Role` enum in Prisma schema and frontend `types/index.ts`; inventory-adjustments endpoints restricted to ADMIN + MANAGER; audit-logs endpoint restricted to ADMIN only; `Role` table in Business Logic updated with 3-column matrix
- **Schema migration** — single migration `20260510063622_add_inventory_audit_units_manager_role` covers all of the above: new enums (AdjustmentType, AdjustmentReason), new tables (inventory_adjustments, audit_logs), column type changes (stock/quantity Int→Float), new product columns (unitType, allowDecimalQty), MANAGER enum value; Prisma Client regenerated; backend and frontend both pass `tsc --noEmit` with zero errors

### 2026-05-07
- **Expiry Tracker** (`/expiry`) — full batch expiry management module; new `StockWriteOff` Prisma model (`stock_write_offs` table, cuid IDs, relations to `PurchaseItem`, `Product`, `User`); DB migration `20260507104807_add_stock_write_off`; new `expiry` NestJS module with 5 endpoints: `GET /summary` (bucket counts + `stockValueAtRisk` + `writeOffThisMonth`), `GET /batches` (filter + search + `daysLeft` + `status` per row, ordered most-urgent first), `POST /write-off` (atomic Prisma transaction: creates `StockWriteOff`, decrements `product.stock`, decrements `purchaseItem.quantity`), `GET /write-off-log` (filterable by date range, defaults to current month), `GET /alerts` (lightweight count for sidebar/dashboard); frontend: `src/types/expiry.ts` (7 interfaces), `src/services/expiry.service.ts` (5 named exports), `src/pages/ExpiryTracker.tsx` (header + 5 summary cards + conditional alert banner + filter pills with debounced search + batch table with row-tint + context-aware action buttons + write-off dialog with live ₹ preview + expandable write-off log with CSV download); Sidebar updated with `CalendarX2` nav item (red dot badge from `/expiry/alerts` on mount); Dashboard updated to 5-card grid with an "Expiry alerts" card that navigates to `/expiry?filter=expired`; all 25 acceptance criteria documented in `sprint.md`; backend and frontend both pass `tsc --noEmit` with zero errors
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