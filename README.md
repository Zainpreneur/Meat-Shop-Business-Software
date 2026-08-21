# 🥩 Meat Shop Business Manager

A full-stack business management system for a retail meat shop: point-of-sale
checkout, inventory & stock tracking, supplier purchase orders, customer
accounts (with credit balances), expense tracking, and a live dashboard.

## Stack

| Layer    | Tech |
|----------|------|
| Backend  | Node.js, Express, TypeScript, Prisma ORM, SQLite, JWT auth, Zod validation |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router, Recharts |
| Data     | SQLite (file-based, zero setup). Swap the Prisma datasource for Postgres/MySQL in production. |

## Features

- **Authentication & roles** — JWT login, three roles (`ADMIN`, `MANAGER`, `CASHIER`) gating what each user can do.
- **Point of Sale (POS)** — tap-to-add product grid, live cart, discounts/tax, multiple payment methods (cash, card, mobile money, store credit, bank transfer), instant receipt. Stock is decremented atomically inside a DB transaction.
- **Inventory & products** — categories, per-unit pricing (kg/gram/piece/dozen), cost vs. selling price, reorder levels, low-stock alerts, manual stock adjustments (wastage/stocktake corrections) with a full audit trail (`StockMovement`).
- **Suppliers & purchases** — create purchase orders, then "receive" them to add stock and update cost price in one atomic step.
- **Customers** — contact info + running credit balance for customers who buy on account.
- **Sales history & refunds** — full invoice history with line items; refunding a sale restocks items and reverses any credit balance.
- **Expenses** — categorized shop expenses (rent, wages, utilities, etc.) factored into the dashboard's profit figure.
- **Dashboard** — today's revenue/orders, month-to-date revenue/profit, 14-day revenue trend chart, top-selling products, low-stock list, recent sales.

## Project layout

```
backend/    Express API (TypeScript + Prisma + SQLite)
frontend/   React SPA (Vite + TypeScript + Tailwind)
docker-compose.yml   Optional containerized setup
```

## Getting started (local development)

Requires Node.js 20+.

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init   # creates dev.db and applies the schema
npm run seed                         # seeds demo users, categories, products
npm run dev                          # starts the API on http://localhost:4000
```

### 2. Frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                          # starts the SPA on http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:4000`, so just open
**http://localhost:5173**.

### Demo accounts (from the seed script)

| Role    | Email                 | Password     |
|---------|------------------------|--------------|
| Admin   | admin@meatshop.com     | Admin@123    |
| Cashier | cashier@meatshop.com   | Cashier@123  |

## Building for production

```bash
# Backend
cd backend && npm run build && npm start

# Frontend
cd frontend && npm run build   # outputs static assets to frontend/dist
```

## Running with Docker Compose

```bash
docker compose up --build
```

This builds the API (port `4000`) and an Nginx-served frontend (port `8080`,
proxying `/api` to the backend), with the SQLite database persisted in a
named volume. Run the seed script once against the running backend container
if you want demo data:

```bash
docker compose exec backend npx tsx prisma/seed.ts
```

## API overview

All endpoints are namespaced under `/api` and (except `/api/auth/login` and
`/api/health`) require a `Authorization: Bearer <token>` header.

| Resource     | Endpoints |
|--------------|-----------|
| Auth         | `POST /auth/login`, `GET /auth/me` |
| Users        | `GET/POST /users`, `PUT/DELETE /users/:id` *(admin/manager)* |
| Categories   | `GET/POST /categories`, `PUT/DELETE /categories/:id` |
| Products     | `GET/POST /products`, `GET/PUT/DELETE /products/:id`, `POST /products/:id/adjust-stock` |
| Suppliers    | `GET/POST /suppliers`, `GET/PUT/DELETE /suppliers/:id` |
| Purchases    | `GET/POST /purchases`, `GET /purchases/:id`, `POST /purchases/:id/receive`, `POST /purchases/:id/cancel` |
| Customers    | `GET/POST /customers`, `GET/PUT/DELETE /customers/:id` |
| Sales (POS)  | `GET/POST /sales`, `GET /sales/:id`, `POST /sales/:id/refund` |
| Expenses     | `GET/POST /expenses`, `PUT/DELETE /expenses/:id` |
| Dashboard    | `GET /dashboard/summary` |

## Data model highlights

- Stock only ever changes through a transaction that also writes a
  `StockMovement` audit row: selling (`SALE_OUT`), receiving a purchase order
  (`PURCHASE_IN`), a refund (`RETURN_IN`), or a manual adjustment
  (`ADJUSTMENT` / `WASTAGE`).
- A `Sale` paid via `CREDIT` increments the customer's `creditBalance`;
  refunding it decrements it back.
- Enum-like fields (`role`, `unit`, statuses, payment method) are stored as
  validated strings rather than native Prisma enums, since the default
  SQLite datasource doesn't support them — see
  `backend/src/constants/enums.ts` for the single source of truth. Swapping
  to Postgres later lets you promote these to real `enum` blocks if desired.

## License

Provided as-is for the requesting user's own business use.
