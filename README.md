<div align="center">

<img src="./public/icons/logo.svg" width="56" alt="Horizon logo" />

# Horizon

### A modern, multi-bank finance dashboard built with Next.js

Connect bank accounts, track balances, and transfer money in one clean, unified interface.

<br />

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Appwrite](https://img.shields.io/badge/Appwrite-Backend-FD366E?logo=appwrite&logoColor=white)
![Plaid](https://img.shields.io/badge/Plaid-Bank_Linking-000000)
![Dwolla](https://img.shields.io/badge/Dwolla-Payments-FF6A3D)
![License](https://img.shields.io/badge/license-MIT-blue)

</div>

---

## 📖 About

**Horizon** is a full-stack personal finance platform that lets users securely link multiple real-world bank accounts, view a consolidated overview of their finances, browse transaction history, and transfer money between accounts — all from a single, elegant dashboard.

It's built as a production-style SaaS banking app, showcasing how modern web technologies (Next.js App Router, server actions, and a component-driven UI) come together with real financial infrastructure providers (**Plaid** for bank connections and **Dwolla** for ACH money transfers) on top of an **Appwrite** backend.

---

## ✨ Features

### 🔐 Authentication & Onboarding
- Secure **sign-up** and **sign-in** flows using Appwrite's session-based authentication
- Form validation powered by **React Hook Form** + **Zod** schemas
- Automatic **Dwolla customer** creation during onboarding, so every user is instantly payment-ready
- Persistent, cookie-based sessions with protected routes (unauthenticated users are redirected to sign-in)

### 🏦 Bank Account Linking
- **Plaid Link** integration for securely connecting real bank accounts (sandbox-ready out of the box)
- Automatic exchange of Plaid public tokens for permanent access tokens
- Generation of a **Dwolla processor token** to bridge Plaid-linked accounts into the Dwolla payment network
- Support for linking and managing **multiple bank accounts** per user
- Dedicated **"My Banks"** page to view every connected account and its card

### 📊 Dashboard & Financial Insights
- Unified **Total Balance** overview aggregating balances across all linked accounts
- Animated, count-up balance figures (**React CountUp**) for a polished, dynamic feel
- **Doughnut chart** (Chart.js + react-chartjs-2) visualizing how funds are distributed across accounts
- Bank card components with realistic card UI (chip, card number masking, copy-to-clipboard for account numbers)
- Recent transactions feed on the home page for an at-a-glance financial summary

### 💳 Transactions
- Full **Transaction History** page with a searchable, sortable table
- Automatic **categorization** of transactions with category icons/badges
- Color-coded debit/credit indicators
- **Pagination** for browsing large transaction histories efficiently

### 💸 Payments & Transfers
- **"Transfer Funds"** page for sending money between accounts
- Real ACH bank-to-bank transfers via the **Dwolla** API
- Transfer creation is logged and persisted as a transaction record in the database
- Recipient bank selection via a searchable **bank dropdown**

### 🖥️ UI / UX
- Fully responsive layout — collapsible sidebar on desktop, bottom **mobile navigation** on small screens
- Component library built on **Radix UI** primitives + **shadcn/ui** patterns (dialogs, sheets, tabs, selects, forms)
- Reusable design system components: `HeaderBox`, `CustomInput`, `BankCard`, `BankDropdown`, `Category`, `Pagination`, `Copy`, `AnimatedCounter`, and more
- Utility-first styling with **Tailwind CSS 4** and `tailwind-merge` / `class-variance-authority` for clean conditional class composition
- Lucide icon set throughout the interface

### 🛡️ Reliability & Observability
- **Sentry** integration (client, server, and edge runtimes) for error monitoring, tracing, and a built-in example error page/API route to verify setup
- Centralized, typed server actions for all backend operations (`bank.actions`, `user.actions`, `transaction.actions`, `dwolla.actions`) keeping data access consistent and secure

### 🧱 Developer Experience
- Built on the **Next.js App Router** with route groups for `(auth)` and `(root)` layouts
- Written entirely in **TypeScript** with shared global types (`index.d.ts`)
- **ESLint** + **Prettier** for consistent code style
- Query string parsing with `query-string` for clean, shareable URLs (e.g. paginated/filterable pages)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Server Actions) |
| **Language** | TypeScript |
| **UI Library** | React 19 |
| **Styling** | Tailwind CSS 4, `tw-animate-css`, `class-variance-authority` |
| **Component Primitives** | Radix UI, shadcn/ui |
| **Icons** | Lucide React |
| **Forms & Validation** | React Hook Form, Zod, `@hookform/resolvers` |
| **Charts** | Chart.js, react-chartjs-2 |
| **Animated Numbers** | react-countup |
| **Backend / Database / Auth** | [Appwrite](https://appwrite.io/) (`node-appwrite`) |
| **Bank Linking** | [Plaid](https://plaid.com/) (`plaid`, `react-plaid-link`) |
| **Payments / ACH Transfers** | [Dwolla](https://www.dwolla.com/) (`dwolla-v2`) |
| **Error Monitoring** | Sentry (`@sentry/nextjs`) |
| **Linting/Formatting** | ESLint, Prettier |

---

## 📁 Project Structure

```
Horizon/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Sign-in & sign-up routes + shared auth layout
│   │   ├── (root)/              # Authenticated app: dashboard, my banks,
│   │   │                        #   transaction history, payment transfer
│   │   ├── api/                 # API routes (e.g. Sentry example endpoint)
│   │   └── layout.tsx           # Root layout
│   ├── components/
│   │   ├── ui/                  # shadcn/Radix-based primitives (button, form, table, etc.)
│   │   └── *.tsx                # Feature components (Sidebar, PlaidLink, BankCard, ...)
│   ├── constants/                # Sidebar links, sandbox IDs, static config
│   └── lib/
│       ├── actions/              # Server actions: bank, user, transaction, dwolla
│       ├── appwrite.ts           # Appwrite session/admin client setup
│       ├── plaid.ts              # Plaid client setup
│       └── utils.ts              # Shared helpers
├── public/                       # Static assets & icons
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.18+ (or the version required by Next.js 16)
- A package manager: `npm`, `yarn`, `pnpm`, or `bun`
- Accounts/API keys for:
  - [Appwrite](https://appwrite.io/) (self-hosted or Appwrite Cloud)
  - [Plaid](https://plaid.com/) (sandbox credentials work for local development)
  - [Dwolla](https://www.dwolla.com/) (sandbox environment)
  - [Sentry](https://sentry.io/) (optional, for error tracking)

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/Horizon.git
cd Horizon
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root with the following:

```bash
# Appwrite
NEXT_PUBLIC_APPWRITE_ENDPOINT=
NEXT_PUBLIC_APPWRITE_PROJECT=
NEXT_APPWRITE_KEY=
APPWRITE_DATABASE_ID=
APPWRITE_USER_TABLE_ID=
APPWRITE_BANK_TABLE_ID=
APPWRITE_TRANSACTION_TABLE_ID=

# Plaid
PLAID_CLIENT_ID=
PLAID_SECRET=

# Dwolla
DWOLLA_KEY=
DWOLLA_SECRET=
DWOLLA_ENV=sandbox

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=
```

> ⚠️ Never commit `.env.local` — keep all API keys and secrets private.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### 5. Build for production

```bash
npm run build
npm run start
```

---

## 🧪 Linting

```bash
npm run lint
```

---

## 🗺️ Key User Flows

1. **Sign up** → account created in Appwrite → a matching Dwolla customer is created automatically.
2. **Connect a bank** → Plaid Link opens → user authenticates with their bank → public token is exchanged for an access token → a Dwolla processor token links the account for transfers.
3. **View dashboard** → balances across all linked accounts are aggregated, charted, and displayed with recent activity.
4. **Browse history** → paginated, categorized transaction table.
5. **Transfer funds** → pick a source and destination bank → submit a validated transfer → Dwolla processes the ACH transfer → transaction is recorded.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. Feel free to open a pull request or file an issue.

## 📄 License

This project is available under the [MIT License](LICENSE).
