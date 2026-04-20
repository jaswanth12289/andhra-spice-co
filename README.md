# Andhra Spice Co.

A production-ready, full-stack e-commerce web application focused exclusively on authentic Indian spices. Designed tightly on a Serverless-friendly architecture tailored for fluid scaling via Vercel deployments.

## Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS + Framer Motion + Lucide React
- **Database / Storage:** Firebase Firestore & Firebase Storage
- **State Management:** Zustand (Persisted locally)
- **Email Pipeline:** Nodemailer (Dynamic HTML Templates)
- **Authentication:** Custom JWT-based Edge configuration (`jose`)
- **Payments:** Cashfree Payments

## System Features
- **Strict Stock Controls:** Employs concurrent Firestore `runTransaction` operations ensuring accurate live-inventory decrements. Out-of-stock items naturally lock themselves.
- **Secure Order Mutations:** Safely handles order cancellations by rolling back atomic increments if the boundary (`Placed`/`Packed`) verifies valid.
- **Sequential Billing Identifications:** Establishes isolated generic keys formatting sequences iteratively via Firestore transaction counters (e.g., `ASC20260001`).
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
NEXT_PUBLIC_FIREBASE_API_KEY=...
JWT_SECRET=production_safe_jwt_secret_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
CASHFREE_APP_ID=test_id
CASHFREE_SECRET_KEY=test_secret
NEXT_PUBLIC_CASHFREE_ENVIRONMENT=sandbox
```

### 3. Execution
```bash
npm run dev
```
Access the application securely at `http://localhost:3000`.

## Seed Admin Privileges
Because `register` enforces standard 'User' roles natively, bootstrap your fundamental Administrative credentials directly using `Firebase Console` (Firestore) by adjusting your user document schema attribute to read: `"role": "admin"`.

## Technical Debt: Firestore Security Rules
**Current Architecture:** The backend API (`src/app/api/...`) utilizes the standard Firebase Client SDK (`firebase/firestore`). Because it relies on custom locally verified JWTs rather than Firebase Authentication, to Firebase, the server behaves entirely as an **unauthenticated anonymous client**.
**Constraint:** To permit the server to execute mandatory logic (checkout stock deductions, order creations), the Firestore Security Rules must structurally remain `allow read, write: if true;`. Implementing restrictive rules (like `request.auth != null`) will immediately break the application.
**Migration Setup:** To secure the database layer formally, the future migration path requires replacing the client SDK (`firebase/firestore`) in the Next.js API Routes with `firebase-admin` initialized via Google Cloud Service Account credentials. This architecture completely bypasses all security rules natively, allowing developers to safely change Cloud Console rules to `allow read, write: if false;` globally.

---
*Built intricately matching dynamic real-world small business thresholds entirely deployable globally mapping native Vercel boundaries.*
