# 🏆 CREATOR11 — Creator Entertainment League (CEL)
> **Motto: "NEVER LOOSE"**  
> *The World's First Fantasy Sports Platform for Content Creators with Guaranteed Non-Loss Player Economics.*

---

## 🧭 Live Cloud Platform Links & Status

- **Platform Name:** Creator11 — Creator Entertainment League (CEL)
- **Frontend Live URL:** [https://creator11-frontend.onrender.com](https://creator11-frontend.onrender.com)
- **Backend Live URL:** [https://creator11-backend.onrender.com](https://creator11-backend.onrender.com)
- **Health Check API:** [https://creator11-backend.onrender.com/health](https://creator11-backend.onrender.com/health)
- **Default Admin Account:** `admin@creator11.com` / `admin123`
- **Primary Currency:** **Indian Rupee (INR - ₹)** throughout all wallets, bots, fees, and payouts.

---

## 🚨 MANDATORY AGENT DIRECTIVES & RULES (READ FIRST)
### 🚨 भविष्य में काम करने वाले सभी AI AGENTS और डेवलपर्स के लिए सख्त नियम

> [!CAUTION]
> ### 🛑 1. STRICT ISOLATED TARGET UPDATES (सिर्फ बोले गए पार्ट को ही अपडेट करना है)
> - **Hindi:** जब भी यूजर किसी स्पेसिफिक अपडेट, फीचर, स्क्रीन या बग फिक्स के लिए बोले, तो एजेंट को **सिर्फ और सिर्फ उसी पार्ट को टच/अपडेट करना है जिसके लिए यूजर ने बोला है**। उसके अलावा कोडबेस के किसी भी दूसरे मॉड्यूल, रूट, कंपोनेंट, फाइल या लॉजिक को छेड़ना, रिफैक्टर करना या ऑल्टर करना **सख्त मना है**।
> - **English:** Always isolate your code changes strictly to the single feature, file, or component requested by the user. NEVER perform unsolicited refactoring or alter unrelated parts of the codebase.

> [!IMPORTANT]
> ### ⚡ 2. SOURCE CODE ONLY UPDATES (डेटाबेस रिसेट या ओवरराइट कभी नहीं करना है)
> - **Hindi:** आगे के किसी भी Git commit या Render डिप्लॉय में **सिर्फ प्योर सोर्स कोड** ही अपलोड करना है। 
> - Render का **Cloud PostgreSQL (`creator11_db`)** अब आपका परमानेंट लाइव डेटाबेस है। किसी भी अपडेट में पुराना डेटाबेस डंप, ट्रंकेट क्वेरी, या री-सीड स्क्रिप्ट दोबारा नहीं चलानी है। लाइव यूजर्स, लाइव मैच, और वॉलेट बैलेंस हमेशा इंटैक्ट और सेफ रहेंगे।
> - **English:** Future updates must strictly contain source code only. Never truncate, overwrite, or re-push database dumps to the live Cloud PostgreSQL instance.

> [!IMPORTANT]
> ### 🔑 3. AUTHENTICATION & OTP ARCHITECTURE
> - **Login:** 100% डायरेक्ट Email + Password से लॉगिन होगा। **लॉगिन पर कभी भी OTP नहीं मांगना है।**
> - **OTP Scope:** OTP सिर्फ और सिर्फ नए **Signup** (ईमेल वेरिफिकेशन) और **Forgot Password** (पासवर्ड रीसेट) के लिए ही Brevo HTTPS API के जरिए जाएगा।

> [!CAUTION]
> ### 🛑 4. INSTAGRAM MODULE IS FROZEN (फ्रीज है - टच न करें)
> - **Hindi:** Instagram का पूरा मॉड्यूल बैकएंड में सेफ है पर ओनर के निर्देशानुसार **FREEZE / SHUT DOWN** किया हुआ है। कोई भी एजेंट इसे अनफ्रीज, डिलीट, या UI पर लाइव न करे जब तक ओनर स्पष्ट रूप से न कहे।
> - **English:** The Instagram module is preserved but intentionally FROZEN. Platform exclusively runs **YouTube Fantasy League**.

---

## 🔑 Cloud Infrastructure, Service IDs & Credentials

सभी सर्विसेज Render Cloud और Brevo पर लाइव कॉन्फिगर हैं:

### 1. Render Platform Access & Services
- **Render Owner Account:** `qspanther@gmail.com`
- **Render API Key:** `rnd_gWVNlE9aIfZWzJWyNvO1BS2wzGpv`
- **Render Workspace ID:** `tea-d5orhuggjchc73akr9mg`

| Service | Type | Service ID / Host | Live URL / Connection |
|---|---|---|---|
| **Backend API** | Node.js Web Service | `srv-dbhc6h8u01pc73atgdlg` | `https://creator11-backend.onrender.com` |
| **Frontend Web** | Next.js 16 Web Service| `srv-dbhc6hgu01pc73atgeog` | `https://creator11-frontend.onrender.com` |
| **Cloud Database** | PostgreSQL 16 (Render)| `dpg-dbjo40fb9u1s73ejvoo0-a` | *See connection strings below* |

### 2. Cloud PostgreSQL Database (`creator11_db`)
- **Database Name:** `creator11_db`
- **Database User:** `creator11_db_user`
- **Database Password:** `052zGrGmGvOZGZ1b4dCVvnCUBlyGK6gw`
- **Internal Connection URL (Render Private Network):**
  ```text
  postgresql://creator11_db_user:052zGrGmGvOZGZ1b4dCVvnCUBlyGK6gw@dpg-dbjo40fb9u1s73ejvoo0-a/creator11_db
  ```
- **External Connection URL (Direct SSL from anywhere):**
  ```text
  postgresql://creator11_db_user:052zGrGmGvOZGZ1b4dCVvnCUBlyGK6gw@dpg-dbjo40fb9u1s73ejvoo0-a.oregon-postgres.render.com:5432/creator11_db
  ```

### 3. Email & OTP Service (Brevo HTTPS API)
- **Provider:** [Brevo](https://app.brevo.com/) (formerly Sendinblue)
- **Account Email:** `qspanther@gmail.com`
- **Verified Active Sender:** `qspanther@gmail.com` (Sender ID: 1)
- **API Protocol:** HTTPS Port 443 (Render blocks direct SMTP 465/587, Brevo HTTPS works 100%)
- **Brevo API Key (Environment Variable `BREVO_API_KEY`):**
  - Injected directly in Render Backend Environment Variables: `BREVO_API_KEY`
  - *(Full raw key is permanently preserved locally in `CREATOR11_SECRETS.local.md` & `.env` to prevent GitHub Push Protection blocking)*

---

## 📊 Live Database State (Cloud PostgreSQL)

Turso Cloud की जगह Render का native **Cloud PostgreSQL (`creator11_db`)** एक्टिव है और इसमें पूरा ओरिजिनल डेटा माइग्रेट और वेरिफाइड है:

| Table Name | Live Row Count | Data Highlights |
|---|---|---|
| **`creators`** | **50** | CarryMinati, IShowSpeed, MrBeast, Techno Gamerz, Round2hell, Technical Guruji, Unbox Therapy, Triggered Insaan, etc. |
| **`users`** | **1,114** | 14 Real User Accounts (`admin@creator11.com`, `qs@panther.com`, `nitin@noni.com`, `panstake8937@gmail.com`, etc.) + 1,100 Bots |
| **`wallets`** | **1,113** | सभी यूजर्स और बॉट्स के INR वॉलेट बैलेंसेज |
| **`transactions`** | **917** | वॉलेट डिपॉजिट, कॉन्टेस्ट एंट्री फीस और प्राइज हिस्ट्री |
| **`tournaments`** | **2** | एक्टिव YouTube टूर्नामेंट्स (6h, 24h, 48h, 72h) |
| **`teams`** | **2,007** | यूजर्स और बॉट्स की 11-क्रिएटर फैंटेसी टीमें |
| **`team_creators`**| **22,077** | फैंटेसी टीमों के क्रिएटर मैपिंग रिकॉर्ड्स |
| **`scores`** | **22,077** | लाइव पॉइंट्स और मल्टीप्लायर रिकॉर्ड्स |
| **`leaderboard`** | **2,007** | लाइव रैंक्स और प्राइज कैलकुलेशन डेटा |
| **`system_settings`**| **19** | Admin TRC20, BEP20, ERC20 एड्रेसेस, स्कोरिंग फॉर्मूला, सब्सक्रिप्शन प्राइस (₹99), 4-राउंड रेफरल नियम |
| **`snapshots`** | **100** | क्रिएटर परफॉर्मेंस डेल्टा स्नैपशॉट्स |
| **`notifications`**| **610** | इन-ऐप यूजर नोटिफिकेशन लॉग्स |
| **`referral_logs`** | **2** | रेफरल ट्रैकिंग हिस्ट्री |
| **`share_logs`** | **1** | सोशल शेयर रिवॉर्ड ट्रैकिंग |

---

## 🛠️ Complete Summary of Work Done & Problems Solved

### 1. Turso Cloud Quota Block Elimination
- **Issue:** Turso Cloud पर पुराने 3-मिनट वाले फुल डंप सिंक लूप की वजह से 1.18 करोड़ रो राइट्स हो गए और Turso ने अकाउंट ब्लॉक कर दिया।
- **Fix:** Turso पर से डिपेंडेंसी 100% हटाकर Render के native **Cloud PostgreSQL (`creator11_db`)** पर पूरा सिस्टम माइग्रेट कर दिया। डेटाबेस अब हमेशा के लिए फ्री और अनब्लॉकेबल है।

### 2. Render Backend Logs Ke 4 Errors Ka Permanent Fix
1. **`Error creating user_streaks table: type "datetime" does not exist`**:
   - PostgreSQL में `DATETIME` की जगह ANSI `TIMESTAMP` इस्तेमाल करके टेबल को सक्सेसफुली ऑटो-क्रिएट किया।
2. **`[YouTubeSync Error] ModuleNotFoundError: No module named 'requests'` Crash Loop**:
   - Render Node कंटेनर में Python `requests` न होने से हर 3s में रीस्टार्ट लूप चल रहा था।
   - Python स्क्रिप्ट हटाकर **Pure Node.js लाइव स्टेट्स इंजन** (`youtubeSyncService.js`) बना दिया, जिससे क्रैश लूप 0 हो गया।
3. **`ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`**:
   - Render रिवर्स प्रॉक्सी के लिए `app.set('trust proxy', 1);` इनेबल किया।
4. **Vulnerabilities & Slow 3-Min Build**:
   - `express@4.22.3` और `qs@6.16.2` पर अपग्रेड किया।
   - SQLite `--build-from-source` हटा दिया जिससे रेंडर बिल्ड 3 मिनट से घटकर सिर्फ **35 सेकंड** हो गया।

### 3. Frontend Next.js Upgrade & Security Hardening
- **Frontend Next.js** को **`16.4.3`** पर अपग्रेड किया गया।
- सारी **18 वल्नरेबिलिटीज (Critical/High RCE, SSRF, DoS)** पूरी तरह एलिमिनेट हो गईं (`0 Critical, 0 High`).
- `npm run build` 100% क्लीन: 22/22 पेजेस सक्सेसफुली जेनरेट।

### 4. Brevo Multi-Channel Email Architecture
- Render होस्ट के SMTP पोर्ट (465/587) ब्लॉकेज को बायपास करने के लिए **Brevo HTTPS REST API (Port 443)** लिंक किया।
- Signup और Forgot-Password पर रियल 6-डिजिट OTP ईमेल इनबॉक्स में इंस्टेंट डिलीवर हो रहा है।
- Login को 100% डायरेक्ट (Email + Password) रखा गया है।

---

## 🏗️ Architecture & Core Components

```
                               ┌────────────────────────┐
                               │   Browser / Client     │
                               │  (Mobile & Desktop)    │
                               └───────────┬────────────┘
                                           │ HTTPS / JSON
                                           ▼
                ┌─────────────────────────────────────────────────────┐
                │              Next.js 16.4.3 Frontend                │
                │              (React 19 + Turbopack)                 │
                │  - Dark Glassmorphism UI (Tailwind CSS v4)          │
                │  - 3D Arena Controls, Shimmer Skeletons, PWA Worker │
                │  - Auto-routing to Public Render Backend            │
                └──────────────────────────┬──────────────────────────┘
                                           │ REST API / JWT
                                           ▼
                ┌─────────────────────────────────────────────────────┐
                │             Express.js 4.22 Backend API             │
                │             (Node.js 20 LTS Runtime)                │
                │  - Direct Login (Zero OTP) + Brevo HTTPS Signup OTP │
                │  - Native Node.js YouTube Live Daemon               │
                │  - "Never Loose" Guaranteed Refund Engine           │
                │  - 4-Round Referral Access Progression              │
                └──────────────────────────┬──────────────────────────┘
                                           │ Sequelize ORM (SSL)
                                           ▼
                ┌─────────────────────────────────────────────────────┐
                │          Render Cloud PostgreSQL (v16)              │
                │             (creator11_db on Render)                │
                │  - 1,114 Users, 50 Real Creators, 2007 Teams        │
                │  - 22,077 Scores, 19 System Settings, 1113 Wallets   │
                └─────────────────────────────────────────────────────┘
```

---

## 🎮 Game Rules & Economic Logic

### 1. "Never Loose" Contest Guarantee (₹99 Entry)
- हर टूर्नामेंट कॉन्टेस्ट की एंट्री फीस **फिक्स्ड ₹99 INR** है।
- टीम लॉक करते समय वॉलेट बैलेंस चेक होता है (`wallet >= 99`).
- **टूर्नामेंट खत्म होने पर:**
  1. **Top Rankers:** प्राइज पूल स्लैब के अनुसार कैश प्राइज जीतते हैं (`contest_prize`).
  2. **Non-Winning / Unranked Participants:** पूरे **₹99 का 100% रिफंड** सीधे उनके वॉलेट में वापस क्रेडिट हो जाता है (`contest_refund_never_loose`)!
  - *खिलाड़ी कभी अपना पैसा नहीं हारते!*

### 2. 4-Round Referral Progression
- **Round 1:** 2 फ्रेंड्स जॉइन → **15 दिन** फ्री टूर्नामेंट पास
- **Round 2:** 3 फ्रेंड्स जॉइन → **15 दिन** फ्री टूर्नामेंट पास
- **Round 3:** 4 फ्रेंड्स जॉइन → **15 दिन** फ्री टूर्नामेंट पास
- **Round 4:** 5 फ्रेंड्स जॉइन → **30 दिन** फ्री टूर्नामेंट पास
*(एडमिन पैनल `/admin/subscriptions` से किसी भी राउंड का टारगेट और दिन कभी भी बदले जा सकते हैं)*

### 3. Team Builder Rules
- **Total Creators:** Exactly 11
- **Credits Budget:** 125 Credits
- **Categories (5):** Gaming, Vlogging, Comedy, Tech, Lifestyle
- **Multipliers:** Captain = 2.0x points, Vice-Captain = 1.5x points

---

## 💻 Local Setup & Development Commands

### 1. Prerequisites
- Node.js 20.x or 22.x
- npm 10.x+

### 2. Backend Setup
```bash
cd backend
npm install
node server.js
```
- Local URL: `http://localhost:5000`
- Config endpoint: `http://localhost:5000/api/config`
- Health check: `http://localhost:5000/health`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- Open browser at `http://localhost:3000`

### 4. Admin Access
- URL: `https://creator11-frontend.onrender.com/login` (या लोकल `http://localhost:3000/login`)
- Email: `admin@creator11.com`
- Password: `admin123`

---

## 🔄 Emergency Re-Sync / Data Migration Script
अगर कभी डेटाबेस को SQLite से दोबारा Cloud PostgreSQL में माइग्रेट करना पड़े, तो स्क्रिप्ट तैयार है:
```bash
cd backend
node scripts/migrate_to_postgres.js
```
*(यह स्क्रिप्ट सीक्वेंशियल फॉरेन-की आर्डर में 100% डेटा बिना किसी डेटा लॉस के क्लाउड में पुश कर देती है)*

---
*Creator11 Engineering Team द्वारा मेंटेन किया हुआ। Node.js, Next.js, Express, Sequelize, और Cloud PostgreSQL पर आधारित।*
