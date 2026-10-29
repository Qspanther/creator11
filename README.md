# 🏆 CREATOR11 — Creator Entertainment League (CEL)
> **Motto: "NEVER LOOSE"**  
> *The World's First Fantasy Sports Platform for Content Creators with Guaranteed Non-Loss Player Economics.*

---

## 🧭 Project Quick Links & Live Status

- **Platform Name:** Creator11 — Creator Entertainment League (CEL)
- **Frontend Live URL:** [https://creator11-frontend.onrender.com](https://creator11-frontend.onrender.com)
- **Backend Live URL:** [https://creator11-backend.onrender.com](https://creator11-backend.onrender.com)
- **Health Check:** [https://creator11-backend.onrender.com/health](https://creator11-backend.onrender.com/health)
- **Default Admin Account:** `admin@creator11.com` / `admin123`
- **Primary Currency:** **Indian Rupee (INR - ₹)** throughout all wallets, bots, fees, and payouts.

---

## 🚨 MANDATORY DIRECTIVES FOR ALL AI AGENTS & DEVELOPERS
### 🚨 सभी AI AGENTS और डेवलपर्स के लिए सख्त नियम (READ FIRST)

> [!CAUTION]
> ### 🛑 1. INSTAGRAM MODULE IS TEMPORARILY FROZEN / SHUT DOWN (फ्रीज है)
> **Hindi:**
> 1. Instagram का पूरा मॉड्यूल (Models, Routes, Seed Data, Formulas) बना हुआ है, लेकिन प्रोजेक्ट ओनर के निर्देशानुसार इसे **अस्थाई रूप से FREEZE (बंद)** किया हुआ है।
> 2. **कोई भी AI Agent या डेवलपर Instagram वाले मॉड्यूल को न छेड़े, न Delete करे, न Modify करे और न ही Live करे।**
> 3. जब तक प्रोजेक्ट ओनर खुद स्पष्ट रूप से न कहे ("Instagram chalu kar do"), तब तक पूरा प्लेटफॉर्म **सिर्फ और सिर्फ YouTube Battle League** पर एक्टिव रहेगा।
>
> **English:**
> 1. The Instagram module is fully implemented in backend DB tables, models, and formulas, but is **intentionally FROZEN and DEACTIVATED** by the project owner.
> 2. **DO NOT touch, reactivate, or delete any Instagram code or DB records** unless the project owner explicitly requests it.
> 3. The platform currently exclusively presents and runs **YouTube Tournaments & Creators**.

> [!IMPORTANT]
> ### 💰 2. CURRENCY IS 100% INR (₹) — NO USDT / NO USD
> - **All transactions, wallet balances, contest fees, and admin adjustments are in INR (₹).**
> - The old USDT / Crypto / Demo credits system has been permanently eliminated.
> - Bot accounts also hold INR (₹) balances.

> [!IMPORTANT]
> ### 🛡️ 3. "NEVER LOOSE" CONTEST GUARANTEE (₹99 ENTRY & 100% REFUND FOR UNRANKED)
> - Every tournament contest entry fee is **strictly ₹99 INR**.
> - System verifies wallet balance before locking a team. If `< ₹99`, user is redirected to `/wallet?required=99&reason=contest_entry`.
> - **When tournament scoring completes:**
>   1. **Top Rankers:** Receive prize pool distribution according to the rank formula.
>   2. **All Other Participants (Unranked / Lower Ranks):** Receive **100% of their ₹99 entry fee refunded directly back into their INR wallet!**
>   - *Users never lose their money on Creator11!*

> [!IMPORTANT]
> ### 🔒 4. USER PRIVACY & EMAIL MASKING
> - User email addresses are **strictly private and hidden** across the platform.
> - In public leaderboards, team rosters, and profile cards, email is never displayed.
> - In the Admin Panel (`/admin/users`), emails are masked by default (e.g., `s***@gmail.com`) and are only revealed if an admin specifically searches by exact email.

> [!IMPORTANT]
> ### 🎟️ 5. SUBSCRIPTION & 4-ROUND REFERRAL PROGRESSION
> - Users must hold active tournament access to participate in ₹99 contests.
> - **Path A (Direct Paid):** Monthly Subscription in INR (Price controlled via Admin Panel `/admin/subscriptions`).
> - **Path B (4-Round Referral Progression):** Users share their unique promo code to unlock free access days:
>   - **Round 1:** e.g., 2 referrals → 15 days free access
>   - **Round 2:** e.g., 3 referrals → 15 days free access
>   - **Round 3:** e.g., 4 referrals → 15 days free access
>   - **Round 4:** e.g., 5 referrals → 30 days free access
>   *(All round targets and reward days are 100% customizable dynamically by the Admin in `/admin/subscriptions`).*

---

## 🏗️ Project Architecture & Tech Stack

```
                                  ┌────────────────────────┐
                                  │   Browser / Client     │
                                  │  (Mobile & Desktop)    │
                                  └───────────┬────────────┘
                                              │ HTTPS / JSON
                                              ▼
                   ┌─────────────────────────────────────────────────────┐
                   │               Next.js 16.2.9 Frontend               │
                   │               (React 19 + Turbopack)                │
                   │  - Dark Glassmorphism UI (Tailwind CSS v4)          │
                   │  - Auto-routing: onrender.com → Public Backend      │
                   │  - Client State: AuthContext, INR Wallet State      │
                   └──────────────────────────┬──────────────────────────┘
                                              │ REST API / JWT
                                              ▼
                   ┌─────────────────────────────────────────────────────┐
                   │             Express.js 4.21 Backend API             │
                   │             (Node.js 20 LTS Runtime)                │
                   │  - JWT Auth + bcryptjs password hashing             │
                   │  - Scoring Engine & Snapshot Scheduler (node-cron)  │
                   │  - "Never Loose" Prize Distribution & Refund Engine │
                   │  - Bot Manager Network & Admin Controls             │
                   └──────────────────────────┬──────────────────────────┘
                                              │ Sequelize ORM
                                              ▼
                   ┌─────────────────────────────────────────────────────┐
                   │             SQLite 5.1.7 Native Database            │
                   │               (backend/creator11.sqlite)            │
                   │  - Users, Wallets, Transactions, Contests           │
                   │  - Tournaments, Creators, Teams, Subscriptions      │
                   └─────────────────────────────────────────────────────┘
```

---

## 📂 Directory Structure Walkthrough

```text
creator11/
├── .node-version                  # Pins Node 20.18.0 for Render & local nvm
├── .nvmrc                         # Node version fallback
├── render.yaml                    # Render Cloud Blueprint (Infrastructure as Code)
├── README.md                      # Complete developer & agent guide (This file)
│
├── backend/                       # Express.js REST API Backend
│   ├── .node-version              # Node 20.18.0
│   ├── config.js                  # Global configuration (JWT, Ports, Fees, Margins)
│   ├── creator11.sqlite           # Active SQLite Database (Persisted seed & live data)
│   ├── package.json               # Backend dependencies (Sequelize, SQLite3 v5.1.7, bcryptjs)
│   ├── server.js                  # App bootstrap, CORS, middleware, static uploads, cron
│   │
│   ├── db/
│   │   ├── index.js               # Sequelize instance initialization
│   │   ├── models.js              # All 11 Sequelize DB models & relational associations
│   │   └── seed.js                # Database seeder (Admin, 25 YouTube Creators, Tournaments, Bots)
│   │
│   ├── routes/
│   │   ├── admin.js               # Admin controls (Stats, Users, Tournaments, Creators, INR Adjust)
│   │   ├── auth.js                # Signup, Login, OTP verification, Profile (/auth/me)
│   │   ├── bot-manager.js         # Automated bot squad simulation & activity
│   │   ├── config.js              # Public platform configuration (/api/config)
│   │   ├── contests.js            # Contest queries & participants
│   │   ├── creators.js            # Creator profiles, stats, filters
│   │   ├── leaderboard.js         # Live tournament ranks & scorecards
│   │   ├── notifications.js       # In-app user notifications
│   │   ├── subscription.js        # Subscription purchase, status check, round progression
│   │   ├── teams.js               # Team builder, lock team, ₹99 validation
│   │   ├── tournaments.js         # Tournaments list, countdowns, prize pool rules
│   │   └── wallet.js              # INR balance, deposits, withdrawals, transactions
│   │
│   └── services/
│       ├── prize-distribution.js  # "Never Loose" Settlement: Top Prizes + 100% Entry Fee Refunds
│       ├── scheduler.js           # Cron scheduler for automated tournament snapshots & scoring
│       └── scoring-engine.js      # Metric snapshot engine (Views, Likes, Comments delta scoring)
│
└── frontend/                      # Next.js 16 App Router Frontend
    ├── .node-version              # Node 20.18.0
    ├── next.config.ts             # Reverse proxy rewrites, image origins, auto-backend routing
    ├── package.json               # Next 16, React 19, Tailwind v4, Lucide, Framer Motion
    ├── postcss.config.mjs         # Tailwind CSS v4 PostCSS plugin
    │
    ├── app/
    │   ├── globals.css            # Dark glassmorphism, Cupertino theme, neon glow utilities
    │   ├── layout.tsx             # Root layout with AuthProvider & Navbar
    │   ├── page.tsx               # Home landing page with "NEVER LOOSE" hero banner & quick lobby
    │   │
    │   ├── admin/                 # Admin Dashboard Pages
    │   │   ├── creators/page.tsx  # Creator management & photo upload
    │   │   ├── crypto/page.tsx    # INR & Crypto deposit / withdrawal approvals
    │   │   ├── formula/page.tsx   # Scoring formula multipliers (Views, Likes, Comments)
    │   │   ├── subscriptions/page.tsx # Subscription price & 4-round referral admin controls
    │   │   ├── tournaments/page.tsx # Create & manage tournament lobbies
    │   │   └── users/page.tsx     # User table with email privacy mask & wallet adjustments
    │   │
    │   ├── creators/page.tsx      # Roster of verified YouTube creators
    │   ├── dashboard/page.tsx     # User dashboard & ongoing tournament cards
    │   ├── login/page.tsx         # User authentication with redirect state
    │   ├── signup/page.tsx        # Registration with promo/referral code support
    │   ├── verify-otp/page.tsx    # OTP verification screen
    │   ├── subscription/page.tsx  # Buy subscription or track 4-round referral progress
    │   ├── tournaments/page.tsx   # Tournament lobby (Live, Upcoming, Completed)
    │   ├── wallet/page.tsx        # INR Wallet: Add money, Withdraw, Transaction history
    │   ├── my-teams/page.tsx      # User's created & locked fantasy teams
    │   ├── team-builder/[tournamentId]/page.tsx # Pick 11 creators, assign C/VC, ₹99 lock check
    │   └── leaderboard/[tournamentId]/page.tsx  # Live points, rankings, and prize distribution
    │
    ├── components/
    │   ├── CountdownTimer.tsx     # Live tournament countdown timer
    │   ├── Navbar.tsx             # Global navigation bar with login/signup buttons & wallet balance
    │   ├── ProtectedRoute.tsx     # Route protection wrapper
    │   └── ScorecardModal.tsx     # Detailed creator performance breakdown modal
    │
    └── lib/
        ├── api.ts                 # Unified fetch client with safe JSON parsing & auto-routing
        └── auth-context.tsx       # AuthProvider, JWT token management, login/logout hooks
```

---

## 💾 Database Models & Schema Reference

All models are defined in [backend/db/models.js](backend/db/models.js) using Sequelize with SQLite storage:

| Model | Key Fields | Description |
|---|---|---|
| **User** | `id`, `name`, `email`, `password_hash`, `role`, `referral_code`, `referral_round`, `referrals_in_current_round`, `subscription_active_until` | Stores player profiles, credentials, referral progression, and subscription expiry. |
| **Wallet** | `id`, `user_id`, `balance`, `currency` (INR) | Stores user INR balances (Initial balance: ₹0). |
| **Transaction** | `id`, `wallet_id`, `amount`, `type`, `description`, `status` | Records all credit/debit events (`contest_entry`, `contest_prize`, `contest_refund_never_loose`, `deposit`, `admin_adjustment`). |
| **Tournament** | `id`, `title`, `platform` (youtube), `status` (upcoming/live/completed), `entry_fee` (₹99), `prize_pool`, `start_time`, `end_time` | Tournament lobby definitions and timestamps. |
| **Creator** | `id`, `name`, `channel_name`, `platform`, `category`, `subscribers`, `avatar_url`, `base_price` | Creators roster available for fantasy team selection. |
| **Team** | `id`, `user_id`, `tournament_id`, `captain_id`, `vice_captain_id`, `total_points`, `rank` | User's fantasy team entry for a tournament. |
| **TeamCreator** | `team_id`, `creator_id` | Many-to-many junction table for the 11 selected creators. |
| **Contest** | `id`, `tournament_id`, `entry_fee` (99), `max_participants`, `current_participants` | Contest instances within a tournament. |
| **Subscription**| `id`, `user_id`, `type`, `amount_paid`, `valid_until`, `status` | User subscription history and active passes. |
| **SystemSetting**| `key`, `value` | Key-value store for admin controls (`subscription_price_inr`, `referral_round_X_target`, `referral_round_X_days`). |
| **ReferralLog** | `referrer_user_id`, `referred_user_id`, `round` | Tracks which friend joined under whose code and in which round. |
| **Notification**| `user_id`, `title`, `message`, `type`, `is_read` | In-app alerts for referral rewards, tournament results, and payouts. |

---

## 🎮 Core Game Mechanics & Workflows

### 1. The ₹99 Contest Entry & Wallet Gate
1. User enters [team-builder/[tournamentId]](frontend/app/team-builder/[tournamentId]/page.tsx).
2. User selects **11 Creators** within 100 Credit budget, selects 1 Captain (2x points), and 1 Vice-Captain (1.5x points).
3. Clicking **"Lock and Enter Battle Team"**:
   - Frontend calls `POST /teams` with `{ tournamentId, creatorIds, captainId, viceCaptainId }`.
   - Backend checks `wallet.balance >= 99`.
   - If balance `< 99`, backend rejects with status 402, and frontend immediately redirects to `/wallet?required=99&reason=contest_entry`.
   - If balance `>= 99`, backend deducts ₹99, records transaction `contest_entry`, locks the team, and increments tournament participants.

### 2. "Never Loose" Guaranteed Refund Engine
Located in [backend/services/prize-distribution.js](backend/services/prize-distribution.js):
- Triggered automatically when tournament ends or manually via `POST /admin/distribute-prizes/:tournamentId`.
- **Ranked Winners:** Get paid according to their rank tier from the tournament prize pool (`contest_prize`).
- **All Non-Winning / Lower-Ranked Participants:**
  ```javascript
  // NEVER LOOSE GUARANTEE: Refund 100% of the ₹99 entry fee
  await wallet.increment('balance', { by: 99 });
  await Transaction.create({
    wallet_id: wallet.id,
    type: 'contest_refund_never_loose',
    amount: 99,
    status: 'completed',
    description: `Never Loose Guarantee: Full ₹99 refund for tournament ${tournament.title}`
  });
  ```
  *Every user either wins a prize or gets their ₹99 back!*

### 3. Subscription & 4-Round Referral Progression Engine
Located in [backend/routes/subscription.js](backend/routes/subscription.js) & [backend/routes/auth.js](backend/routes/auth.js):
- **Access Check:** `GET /subscription/status` returns `{ hasAccess: boolean, activeUntil, type, currentRound, referralsCount, target }`.
- **Admin Control Panel:** In `/admin/subscriptions`:
  - Monthly Subscription Price (e.g., ₹299 INR).
  - Target referrals & free days for Rounds 1, 2, 3, and 4.
- **Progression Flow:**
  - Friend registers using promo code → `ReferralLog` created.
  - Referrer's count increments.
  - When target reached (e.g., 2 friends in Round 1):
    - User unlocks configured free access days (e.g., 15 days).
    - Status moves to Round 2 with 0/3 progress.
    - Notification sent to user.

---

## 🌐 Cloud Deployment Architecture (Render)

The application is deployed as a single Render Blueprint ([render.yaml](render.yaml)) with two orchestrated services:

```yaml
services:
  # ─── BACKEND API SERVICE ───
  - type: web
    name: creator11-backend
    env: node
    plan: free
    rootDir: backend
    buildCommand: npm install && npm rebuild sqlite3 --build-from-source
    startCommand: npm start
    envVars:
      - key: NODE_VERSION
        value: 20.18.0
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000

  # ─── FRONTEND NEXT.JS WEB APP ───
  - type: web
    name: creator11-frontend
    env: node
    plan: free
    rootDir: frontend
    buildCommand: npm install --include=dev && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_VERSION
        value: 20.18.0
      - key: NODE_ENV
        value: production
      - key: BACKEND_URL
        value: https://creator11-backend.onrender.com
      - key: NEXT_PUBLIC_API_URL
        value: https://creator11-backend.onrender.com
```

### Critical Render Deployment Rules Learned:
1. **Node 20 LTS Pinning:** Render default Node 24 caused a `GLIBC_2.38 not found` error with native `sqlite3`. Node `20.18.0` is pinned via `.node-version` and `render.yaml` with `--build-from-source`.
2. **Free Tier Private Networking Restriction:** Render Free Tier web services **do NOT accept private inbound network traffic** (`creator11-backend:10000` is blocked). Both services must communicate over the public URL (`https://creator11-backend.onrender.com`).
3. **Auto-Routing in Frontend:** [frontend/app/lib/api.ts](frontend/app/lib/api.ts) automatically detects `onrender.com` in `window.location.hostname` and routes all API traffic directly to `https://creator11-backend.onrender.com`.
4. **DevDependencies in Production Build:** Next.js build requires `@tailwindcss/postcss` and `typescript`. These are placed in `dependencies` and installed with `--include=dev` to prevent npm from skipping them when `NODE_ENV=production`.

---

## 🛠️ How to Run the Project Locally

### Prerequisites
- Node.js version **20.x** (or 22.x)
- npm version **10.x+**

### 1. Run the Backend
```bash
cd backend
npm install
node server.js
```
- API will start on: `http://localhost:5000`
- Database `creator11.sqlite` will be automatically initialized and seeded if empty.
- Health Check: `http://localhost:5000/health`

### 2. Run the Frontend
```bash
cd frontend
npm install
npm run dev -- -p 3001
```
*(Or `npm run dev` to run on default port 3000)*
- Open browser at: `http://localhost:3000` (or `http://localhost:3001`)

### 3. Login Credentials
- **Admin Account:** `admin@creator11.com` / `admin123`
- **Admin Dashboard:** Access at `/admin` or `/admin/subscriptions`
- **Standard Users:** Available in seed data or create a fresh account via `/signup`.

---

## 🗺️ Roadmap & Guide for Future Developers & Agents

If you are an AI Agent or Developer continuing this project, here is the approved roadmap:
1. **Real Payment Gateway Integration:**
   - Integrate Razorpay / Cashfree UPI QR code Webhooks for real INR wallet deposits (`/wallet/deposit/initiate` & `/wallet/deposit/verify`).
2. **Live YouTube / Social API Metric Fetching:**
   - [backend/services/scoring-engine.js](backend/services/scoring-engine.js) has placeholder hooks for YouTube Data API v3 (`process.env.YOUTUBE_API_KEY`). Connect real channel IDs to fetch live delta views/subscribers during tournament windows.
3. **Reactivating Instagram (ONLY WHEN INSTRUCTED BY OWNER):**
   - Follow the unfreeze protocol outlined in section 1: restore Instagram cards in `page.tsx`, `dashboard`, `tournaments`, and remove filter restrictions in `tournaments.js`.

---
*Maintained by Creator11 Engineering Team. Built with Next.js, Express, Sequelize, and SQLite.*
