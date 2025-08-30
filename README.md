# Sentinel: Real-Time Camera Monitoring Dashboard

Sentinel is a full-stack web application designed for real-time monitoring of security camera statuses. It provides a centralized dashboard for security personnel to track which cameras are online or offline, manage cameras, and receive instant notifications for status changes.

This project was built to solve the real-world problem of managing multiple cameras in large facilities like power plants or corporate campuses, where manually checking each camera is inefficient and unreliable.

## ✨ Core Features

* **Real-Time Dashboard:** A live dashboard that displays the total number of cameras, active feeds, offline cameras, and active alerts, updated instantly via WebSockets.
* **Automated Offline Detection:** A smart backend service that runs periodically to check if cameras are still online using a "heartbeat" mechanism. If a heartbeat is missed, the camera is automatically marked as offline.
* **Instant Notifications:** When a camera goes offline, the system automatically sends SMS (via Twilio) and email alerts to all registered monitoring users.
* **Secure Video Feeds:** Live camera feeds are blurred by default and require a password for viewing, ensuring only authorized personnel can access them.
* **User Authentication:** A complete user registration and login system with secure password hashing (bcrypt) and session management (JWT).
* **Camera Management:** An interface to add new cameras and delete existing ones.
* **Alert History:** A panel on the dashboard to view a history of recently resolved alerts, including the reason for resolution.

## 🛠️ Technology Stack

* **Frontend:** React (Create React App)
* **Backend:** Node.js with Express.js
* **Database:** PostgreSQL (hosted on Neon)
* **Real-Time Communication:** WebSockets (`ws` library)
* **Styling:** Tailwind CSS
* **Security:** `bcryptjs` for password hashing, `jsonwebtoken` for sessions
* **Notifications:** Twilio for SMS, Nodemailer for email

## 🚀 Getting Started

To run this project on your local machine, you will need two separate terminals.

### 1. Backend Setup

```bash
# Navigate to the server directory
cd server

# Install dependencies
npm install

# Create a .env file and add your secret keys
# (See the .env.example file for required variables)

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

# Run the React application
npm start
```
The frontend application will automatically open in your browser at http://localhost:3000.

### 3. Environment Variables

To run this project, you need to create a .env file in your server directory.
server/.env
```bash
# PostgreSQL Database Connection URL from Neon
DATABASE_URL="postgres://user:password@host:port/dbname"

# JWT Secret for signing tokens
JWT_SECRET="your-super-secret-key"

# Twilio Credentials for SMS
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Nodemailer Credentials for Email (e.g., from Ethereal.email)
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
```

### 💡 How It Works: The Heartbeat System

The core of the monitoring system is the "heartbeat" mechanism.

1. ***The server assumes all cameras are offline until proven otherwise.***
2. ***A camera is marked "Online" only when the server receives a specific API request (a heartbeat) from it.***
3. ***For this project, the heartbeat is sent automatically by the frontend every 25 seconds only when a user is actively viewing that camera's live feed.***
4. ***A background process on the server runs every 30 seconds, checking for cameras that have been silent for more than 40 seconds. Any silent camera is marked as "Offline", and an alert is generated.***

