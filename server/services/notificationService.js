// This service handles sending SMS and Email alerts.
require("dotenv").config();
const twilio = require("twilio");
const nodemailer = require("nodemailer");

// --- Twilio SMS Setup ---
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// --- Nodemailer Email Setup ---
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10),
  secure: false, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends an SMS alert using Twilio.
 * @param {string} toPhoneNumber - The recipient's phone number.
 * @param {string} message - The message to send.
 */
async function sendSms(toPhoneNumber, message) {
  // --- NEW DEBUG LINE ---
  console.log("DEBUG: Attempting to send SMS to this exact number:", `'${toPhoneNumber}'`);
  // --------------------

  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.log("Twilio credentials not found. Skipping SMS.");
    return;
  }
  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toPhoneNumber,
    });
    console.log(`📲 SMS sent to ${toPhoneNumber}`);
  } catch (error) {
    console.error(`❌ Failed to send SMS to ${toPhoneNumber}:`, error.message);
  }
}

/**
 * Sends an email alert using Nodemailer.
 * @param {string} toEmail - The recipient's email address.
 * @param {string} subject - The subject of the email.
 * @param {string} text - The plain text body of the email.
 */
async function sendEmail(toEmail, subject, text) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log("Email credentials not found in .env file. Skipping email.");
    return;
  }
  try {
    const info = await transporter.sendMail({
      from: `"Camera Alert System" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: subject,
      text: text,
      html: `<p>${text}</p>`, 
    });
    console.log(`📧 Email sent to ${toEmail}`);
    console.log("✉️ Preview URL: %s", nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error(`❌ Failed to send email to ${toEmail}:`, error.message);
  }
}

module.exports = { sendSms, sendEmail };