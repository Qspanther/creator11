# AGENT DIRECTIVES & PROJECT CONSTRAINTS — CREATOR11

## 🔒 PERMANENT WORKSPACE RULES (MANDATORY FOR ALL SESSIONS & AGENTS)

### 1. 🎯 STRICT ISOLATED TARGET UPDATES (Sirf Requested Part Ko Update Karna Hai)
- **Hindi Rule:** Jab bhi user kisi specific update, screen, feature, ya bug fix ke liye bole, toh agent ko **sirf aur sirf usi targeted part ko update karna hai jiske liye user ne bola hai**.
- Us requested part ke alawa codebase ka koi bhi doosra module, component, route, logic ya configuration **kisi bhi haal me modify, refactor ya alter nahi kiya jayega**.
- **English Rule:** Always restrict changes strictly and exclusively to the specific file, feature, or component requested by the user. Never perform unsolicited refactoring or modify unrelated parts of the codebase.

---

### 2. ⚡ SOURCE CODE ONLY UPDATES (No Database Re-Pushes / Overwrites)
- **Hindi Rule:** Aage ke kisi bhi update me sirf pure source code (frontend UI, backend logic, bug fixes) hi repository aur Render par push hoga.
- Render ka **Cloud PostgreSQL Database (`creator11_db`)** permanent production live database hai. Kisi bhi update ke sath purana data, sqlite dump, truncate query, ya database reset script dobara run nahi karna hai. Live users aur live match data safe aur untouched rahega.
- **English Rule:** Deployments and git pushes must strictly contain application source code only. Never overwrite, truncate, or re-push database dumps to Cloud PostgreSQL.

---

### 3. 🔑 AUTHENTICATION & OTP ARCHITECTURE
- **Login:** 100% direct with Email + Password. Bilkul koi OTP prompt nahi aana chahiye.
- **OTP Scope:** OTP strictly aur exclusively sirf **Signup** (new account verification) aur **Forgot Password** (password reset) ke liye hi dispatch hoga via Brevo HTTPS API.

---

### 4. 🚨 INSTAGRAM PORTION IS FROZEN (DO NOT TOUCH)
- **Hindi Summary:** Instagram ka portion is project ka ek zaroori hissa hai par abhi ke liye SHUTDOWN / FREEZE kiya hua hai. Koi bhi agent ise DELETE, UPDATE ya REACTIVATE na kare. Iski saari files as-it-is save hain aur rahengi. Sirf YouTube league ko active aur live rakhna hai jab tak owner explicitly activate karne ko na kahe.
- **English Summary:** The Instagram module is an integral part of Creator11 but is intentionally FROZEN and SHUT DOWN. No agent may modify, update, delete, or bring Instagram live on the UI. Keep all Instagram files and database rows untouched.
