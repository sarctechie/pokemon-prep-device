# 🧠 Pokémon Prep Device

A web-based competitive Pokémon scouting and preparation tool designed to replace messy spreadsheets with a fast, visual, and intuitive interface.

👉 Live App: https://sarctechie.tech/prep
<img width="1220" height="874" alt="image" src="https://github.com/user-attachments/assets/daa82f67-aca1-4103-ba3e-7be99abb42c4" />


<img width="984" height="746" alt="image" src="https://github.com/user-attachments/assets/085504b0-6a03-4a3c-ba91-36e5b90d0ad7" />


---

## 🚀 Features

### 🧩 Team Builder
- Search across full National Dex (1300+ Pokémon + forms)
- Sprite-based UI for quick recognition
- Adjustable team sizes
- Drag-style ordering and slot management

### ⚡ Speed Control Engine
- Real-time speed calculations
- Level-based scaling
- Shows:
  - Base speed
  - 252 EV
  - 252+ nature
- Instantly compare your team vs opponent

### 🧠 Move Role Analysis
Automatically categorizes moves into strategic roles:

- Entry Hazards
- Hazard Removal
- Healing
- Momentum
- Status
- Priority
- Disruption
- Screens
- Speed Control
- VGC Support

Highlights:
- ✅ Strong roles
- ⚠️ Weak roles
- ❌ Missing roles

---

### 🗡️ Coverage Analysis
- Quickly identifies offensive pressure
- Shows which types your team hits effectively
- Helps detect gaps in coverage

---

### 💀 Threat Detection
- Identifies highest pressure threats from opponent team
- Based on matchup interactions vs your team

---

### 📝 Prep Notes (Auto-Generated)
- Highlights:
  - Speed advantages
  - Weakness stacking
  - Missing roles
  - Key threats

---

### ☁️ Multi-Board Cloud Save
- Google authentication (Firebase)
- Save multiple prep boards
- Load / delete boards
- Persistent across devices

---

### 💾 Local Save Backup
- Automatically saves to browser storage
- Never lose work on refresh

---

## 🏗️ Tech Stack

### Frontend
- React (Vite)
- Tailwind CSS
- Chart.js (visualization)

### Backend / Data
- Python (data processing + normalization)
- JSON dataset (custom-built)

### Cloud / Infra
- Firebase (Auth + Firestore)
- AWS EC2
- Nginx (reverse proxy + hosting)

---

## 📊 Data Pipeline

1. Raw data sourced from structured spreadsheets
2. Processed via Python scripts:
   - Normalized Pokémon forms
   - Standardized move names
   - Mapped moves → roles
3. Exported as optimized JSON
4. Served directly to frontend

---

## 🧪 Local Development

```bash
git clone https://github.com/sarctechie/pokemon-prep-device.git
cd pokemon-prep-device/frontend

npm install
npm run dev
```
---
## 🚀 Production Build

```bash
npm run build
```
## Firebase Setup

Enable Google Authentication
Add your domain to authorized domains

Firestore Rules
```bash
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/prepBoards/{boardId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 📌 Future Improvements
Pokepaste import
Shareable links
Meta usage stats
AI-based matchup suggestions
