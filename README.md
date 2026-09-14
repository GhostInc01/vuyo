# LocalBiz — Full Web-Based Platform (SQLite + Prisma ORM)

A production-ready, full-stack, responsive web application for **LocalBiz South Africa** — a hyperlocal community commerce platform.

---

## 🗄️ Database Architecture (Option B: SQLite via Prisma)

The database layer runs on **Prisma ORM with SQLite** stored locally at:
📁 `prisma/dev.db`

### Relational Schema Models:
* **`Merchant`**: Business profiles, suburbs, ratings, verification badges, tiers.
* **`Product`**: Item listings linked by relational foreign key to `Merchant` with cascade deletes.
* **`Order`**: Customer details, total amount, delivery address, and status.
* **`OrderItem`**: Line items linked by foreign key to `Order` with CUID primary keys.
* **`Message`**: Customer–merchant direct chat threads.
* **`Campaign`**: Advertiser sponsor campaigns and performance metrics.
* **`KycApproval`**: Merchant identity and trade license compliance queue.
* **`AdminSetting`**: Platform monetization model and commission toggles.

---

## 🔄 Future Upgrade to Option A (PostgreSQL / Supabase)

Because the system is built with Prisma, migrating to **Option A (PostgreSQL / Supabase)** later requires only one small change:

1. In `prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Add your PostgreSQL / Supabase connection string to `.env`.
3. Run `npx prisma db push` and `node prisma/seed.js`.

No backend endpoints or React frontend code need to be rewritten!

---

## 🚀 Running the Application

### Start Full-Stack Server
```powershell
npm start
# or
node server.js
```
Server runs at **[http://localhost:3000/](http://localhost:3000/)**.

### Start Development Mode (Hot-Reloading)
```powershell
npm run dev
```
Runs Vite dev server at **[http://localhost:5173/](http://localhost:5173/)** with proxy to `localhost:3000`.

### Inspect the Database with Prisma Studio
```powershell
npx prisma studio
```
Opens an interactive web GUI at `http://localhost:5555` to browse, inspect, and edit tables in `prisma/dev.db`.

---

## 🌐 Portals & Roles

* **🛒 Consumer Marketplace:** [http://localhost:3000/](http://localhost:3000/)
* **🏪 Merchant Hub:** Access from the header portal switcher (catalog manager, order updates, subscriptions).
* **📢 Advertiser Hub:** Sponsor feed campaign launcher and metrics.
* **🛡️ Super Admin Console:** KYC document approvals, platform transaction ledger, and commission toggles.
