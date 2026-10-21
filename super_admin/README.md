# Licit Super Admin

Next.js control panel for approving seller account requests and creating
product listings from a seller/admin account.

## Setup

```bash
cd super_admin
npm install
cp .env.example .env.local
npm run dev
```

The app runs on `http://localhost:3001` and expects the NestJS backend at `NEXT_PUBLIC_API_BASE_URL`.

For local CORS, set the backend `APP_ORIGIN` to include both origins:

```bash
APP_ORIGIN=http://localhost:3000,http://localhost:3001
```

Use an admin account for approvals, for example the seeded local account if
available:

```text
admin@licit.local / admin1234
```

Use a `seller` account to open the `Create product` tab and publish a listing.
Admins can also create listings because the backend allows both `seller` and
`admin` roles to create products.
