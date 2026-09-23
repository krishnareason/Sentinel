# Sentinel: Real-Time Camera Monitoring Dashboard

Sentinel is a full-stack, enterprise-grade web application designed for real-time monitoring of security camera statuses. It provides a centralized, modern dashboard for security personnel to track which cameras are online or offline, manage camera fleets, and receive instant, automated notifications for status changes.

This project was engineered to solve the real-world problem of managing multiple security feeds in large facilities like power plants or corporate campuses, where manually checking each camera's status is inefficient and unreliable.

## ✨ Core Features

* **Real-Time Dashboard:** A live, dynamic dashboard that displays the total number of cameras, active feeds, offline cameras, and active alerts—updated instantly across all clients using **Supabase Realtime**.
* **Automated Offline Detection:** A smart backend service that runs periodically to verify if cameras are still online using a "heartbeat" mechanism. If a heartbeat is missed, the camera is automatically marked as offline in the database.
* **Instant Notifications:** When a camera goes offline, the system securely queries the registered personnel database using the **Supabase Admin SDK** and automatically dispatches SMS (via Twilio) and email alerts (via Nodemailer).
* **Secure Video Feeds:** Live camera feeds are blurred by default and require an access password for viewing, ensuring only authorized personnel can access them.
* **Modern Authentication:** A complete, secure user registration and login system powered by **Supabase Auth**, featuring a modern Glassmorphism UI.
* **Camera Management:** An intuitive interface to provision new cameras and decommission existing ones.
* **Alert History:** A detailed audit panel on the dashboard to view a history of recently resolved alerts, including the operational reason for resolution.

## 🛠️ Technology Stack

* **Frontend:** React + **Vite** (for ultra-fast Hot Module Replacement and optimized builds)
* **Backend:** Node.js with Express.js
* **Database:** PostgreSQL (hosted on **Supabase**)
* **ORM:** **Prisma** (for type-safe, optimized database querying and schema management)
* **Real-Time Communication:** **Supabase Realtime Channels** (PostgreSQL change data capture)
* **Styling:** Tailwind CSS (featuring Glassmorphism design principles)
* **Authentication:** Supabase Auth + Supabase Admin SDK
* **Notifications:** Twilio for SMS, Nodemailer for email

## 🚀 Getting Started

To run this project on your local machine, you will need two separate terminals.

### 1. Backend Setup

```bash
# Navigate to the server directory
cd server

# Install dependencies
npm install

# Initialize Prisma Client
npx prisma generate

# Run the server
node server.js
```
The backend server will be running at http://localhost:3001.

### 2. Frontend Setup

```bash
# Navigate to the client directory
cd client

# Install dependencies
npm install

# Run the React application using Vite
npm run dev
```
The frontend application will be running at http://localhost:3000.

### 3. Environment Variables

To run this project, you need to configure your environment variables.

**server/.env**
```env
# Server Port
PORT=3001

# PostgreSQL Database Connection URL from Supabase
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[your-project-ref].supabase.co:5432/postgres"

# Supabase Service Role Key (Required for sending automated notifications to users)
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Twilio Credentials for SMS
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="your-twilio-phone-number"

# Nodemailer Credentials for Email (e.g., from Ethereal.email)
EMAIL_HOST="smtp.ethereal.email"
EMAIL_PORT=587
EMAIL_USER="your-email-user"
EMAIL_PASS="your-email-password"
```

**client/.env**
```env
# Supabase Configuration for the Frontend
REACT_APP_SUPABASE_URL="https://[your-project-ref].supabase.co"
REACT_APP_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

### 💡 How It Works: The Heartbeat System

The core of the monitoring system is the "heartbeat" mechanism.

1. ***The server assumes all cameras are offline until proven otherwise.***
2. ***A camera is marked "Online" only when the server receives a specific API request (a heartbeat) from it.***
3. ***For this project, the heartbeat is sent automatically by the frontend every 25 seconds only when a user is actively viewing that camera's live feed.***
4. ***A background process on the server runs every 30 seconds, executing an optimized Prisma query to check for cameras that have been silent for more than 40 seconds. Any silent camera is marked as "Offline", triggering a database update.***
5. ***Supabase Realtime instantly streams the update to all connected React clients, turning the dashboard red, while the Node.js backend simultaneously fires off Twilio SMS and email alerts to all registered security personnel.***
