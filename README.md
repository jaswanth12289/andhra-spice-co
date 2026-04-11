# Andhra Spice Co.

A production-ready, full-stack e-commerce web application focused exclusively on authentic Indian spices. Designed tightly on a Serverless-friendly architecture tailored for fluid scaling via Vercel deployments.

## Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS + Framer Motion + Lucide React
- **Database:** MongoDB via Mongoose
- **State Management:** Zustand (Persisted locally)
- **Email Pipeline:** Nodemailer (Dynamic HTML Templates)
- **Authentication:** Custom JWT-based Edge configuration (`jose`)

## System Features
- **Strict Stock Controls:** Employs concurrent `$inc` modifications ensuring accurate live-inventory decrements. Out-of-stock items naturally lock themselves.
- **Secure Order Mutations:** Safely handles order cancellations by rolling back atomic increments if the boundary (`Placed`/`Packed`) verifies valid.
- **Sequential Billing Identifications:** Establishes isolated generic keys formatting sequences iteratively (e.g., `ASC20260001`).
- **Dashboard Integrity:** Private `/admin` zones secured tightly via middleware blocking generic interactions. Uniquely signals Low-Stock thresholds cleanly on visual metrics.
- **Throttling Systems**: Form login validations enforce rate throttling restricting brute-forces effortlessly returning standard `429` metrics.

## Setup Instructions

### 1. Installation
Ensure you are running Node.js 20+.
```bash
npm install
```

### 2. Environment Setup
Configure your `.env.local` locally before executing dev testing:
```bash
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/SpiceDB
JWT_SECRET=production_safe_jwt_secret_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
RAZORPAY_KEY_ID=test_id
RAZORPAY_KEY_SECRET=test_secret
```

### 3. Execution
```bash
npm run dev
```
Access the application securely at `http://localhost:3000`.

## Seed Admin Privileges
Because `register` enforces standard 'User' roles natively, bootstrap your fundamental Administrative credentials directly using `MongoDB Compass` adjusting the user's document schema attribute to read: `"role": "admin"`.

---
*Built intricately matching dynamic real-world small business thresholds entirely deployable globally mapping native Vercel boundaries.*
