# HerdFlow

**HerdFlow** is a premium, responsive web application designed for cattle breeders to track artificial insemination cycles, manage calving predictions, and receive dynamic reproductive cycle alerts.

## 🚀 Key Features

* **Breeder Authentication**: Secure user registration and login powered by Firebase Auth, establishing private workspaces for each breeder.
* **Cows Directory**: Add, update, view, and delete cows.
* **Insemination Cycle Subcollections**: Log inseminations under individual cows as subcollections, ensuring logical data ownership.
* **Dynamic Pregnancy Calculations**:
  * Automatically sorts inseminations chronologically.
  * Dynamically computes cycle order numbers, resetting to 1 if the gap between consecutive inseminations exceeds 243 days (8 months).
  * Calculates expected calving dates (280 days from the last active insemination) and tracks countdowns.
* **Calving Schedule Warning Tiers**: Group cows by proximity to expected calving:
  * 🔴 **Critical Proximity** (< 7 days left)
  * 🟠 **Urgent Attention** (8 to 15 days left)
  * 🟡 **High Priority** (16 to 30 days left)
  * 🟢 **Routine Monitoring** (31 to 60 days left)
* **Real-time Reminders Popover**: Scans database to trigger dynamic pregnancy alerts in the header notification bar and on the dashboard.
* **Multilingual i18n & RTL Layout**:
  * Fully localized using `i18next`.
  * **Arabic** default language for Moroccan cattle breeders with automatic RTL document direction switching.
  * **French** language option ready.

---

## 🛠️ Tech Stack

* **Core**: React 19 + TypeScript + Vite 8
* **Styling**: Tailwind CSS v4
* **State & Query Management**: React Query (TanStack Query v5)
* **Backend**: Firebase Authentication + Cloud Firestore

---

## 📦 Getting Started

### Prerequisites

* Node.js (v18 or higher)
* npm (v9 or higher)

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd HerdFlow
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables by copying `.env.example` to `.env` and filling in your Firebase client credentials:
   ```bash
   cp .env.example .env
   ```

### Running Locally

To start the local development server:
```bash
npm run dev
```

### Building for Production

To create a production build of the client application:
```bash
npm run build
```
The output bundle will be generated under the `dist/` directory.
