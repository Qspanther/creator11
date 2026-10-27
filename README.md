# ⚡ CREATOR11 — Fantasy Sports Platform

> **Creator11** is a Next.js + Node.js/Express fantasy sports platform for content creators with Apple Cupertino OLED Dark Mode UI, real-time creator scoring, and USDT crypto wallet payment gateway.

---

## 🚨 MANDATORY DIRECTIVE FOR ALL AI AGENTS & DEVELOPERS
### 🚨 सभी AI AGENTS और डेवलपर्स के लिए सख्त हिदायत (STRICT RULE)

> [!CAUTION]
> ### 🛑 INSTAGRAM PORTION IS TEMPORARILY FROZEN / SHUT DOWN (फ्रीज है)
> **हिंदी में निर्देश (Hindi Instructions):**
> 1. **Instagram का पूरा पोर्शन इस प्रोजेक्ट का एक महत्वपूर्ण और पूरा बना हुआ हिस्सा (Integral Part) है।**
> 2. प्रोजेक्ट ओनर के निर्देशानुसार **Instagram के पूरे हिस्से को अभी के लिए SHUTDOWN / FREEZE (बंद) किया हुआ है**।
> 3. **कोई भी AI Agent या डेवलपर Instagram वाले हिस्से को न छेड़े, न उसे Live करे, न उसे Delete करे, और न ही उसे Update करे।**
> 4. Instagram की सभी फाइल्स, डेटाबेस टेबल्स, मॉडल्स, कोड और सीक्रेट्स को **AS IT IS सुरक्षित (Preserved)** रखना अनिवार्य है।
> 5. **जब तक यूजर / प्रोजेक्ट ओनर खुद न कहे** ("ab instagram chalu kar do"), तब तक Instagram पोर्शन को बिल्कुल हाथ न लगाएं।
> 6. अभी पूरा प्रोजेक्ट **सिर्फ और सिर्फ YouTube League** पर एक्टिव रहेगा।
>
> ---
>
> **English Directive:**
> 1. The **Instagram portion is a core, fully implemented module** of Creator11 (including DB models, tables, seed data, and scoring formulas).
> 2. It has been **intentionally FROZEN and SHUT DOWN** by the project owner for the time being.
> 3. **NO AI AGENT OR DEVELOPER is permitted to touch, modify, update, delete, or reactivate the Instagram module.**
> 4. All Instagram files, database tables, and routes must remain **100% PRESERVED AS-IS**.
> 5. The application UI, tournament lobbies, and creator rosters must exclusively display **YouTube**.
> 6. Do NOT re-enable Instagram until the owner explicitly instructs to do so.

---

## 📌 Current Active Scope (वर्तमान में एक्टिव भाग)

- **Active Platform:** YouTube Battle League Only (25 elite verified YouTube creators across Gaming, Tech, Comedy, Vlogging, Lifestyle).
- **Tournaments:** YouTube Flash Blitz (6h), Daily Battle (24h), Weekend Clash (48h), Weekly Showdown (72h).
- **Theme:** Apple Cupertino OLED Dark Mode (`#09090d`, frosted glassmorphism, widescreen split-layout).
- **Wallet & Payments:** USDT (TRC-20, BEP-20, ERC-20) Crypto Gateway with QR codes and TXID proof submission.
- **Admin Console:** Located at `/admin` (User, Tournament, Creator Roster, Crypto Topup Approvals, Formula Engine).

---

## 🔄 How to Unfreeze Instagram in the Future (भविष्य में चालू करने की गाइड)

When the user explicitly instructs: *"Instagram ko wapas chalu kar do"* / *"Reactivate Instagram"*, perform these steps:
1. **Frontend Landing Page (`frontend/app/page.tsx`):** Re-add the Instagram Battle League card and link (`/platform/instagram`).
2. **Dashboard (`frontend/app/dashboard/page.tsx`):** Add back the Instagram League card inside the `departments` array.
3. **Creators Directory (`frontend/app/creators/page.tsx`):** Re-enable the platform filter tabs (`['all', 'youtube', 'instagram']`).
4. **Tournaments Page (`frontend/app/tournaments/page.tsx`):** Allow both YouTube and Instagram tournaments to display.
5. **Platform Lobby (`frontend/app/platform/[platform]/page.tsx`):** Remove the temporary freeze notice for `platform === 'instagram'`.
6. **Backend Routes (`backend/routes/tournaments.js` & `creators.js`):** Remove default fallback `where.platform = 'youtube'` so all platforms query freely.
7. **Admin Pages (`admin/tournaments` & `admin/creators`):** Re-enable Instagram options in dropdowns and filter bars.

---

## 🚀 Running the Project Locally

- **Backend:**
  ```bash
  cd backend
  node server.js
  # Runs on http://localhost:5000
  ```
- **Frontend:**
  ```bash
  cd frontend
  npm run dev
  # Runs on http://localhost:3000
  ```
- **Admin Credentials:** `admin@creator11.com` / `admin123`
