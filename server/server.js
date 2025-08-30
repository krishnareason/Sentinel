require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const http = require("http");
const { WebSocketServer } = require("ws");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendSms, sendEmail } = require("./services/notificationService");

// --- DATABASE & SERVER SETUP (Same as before) ---
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.connect((err, client, release) => { if (err) { return console.error("DB FAIL:", err.stack); } console.log("✅ DB Connected"); client.release(); });
const app = express();
const PORT = process.env.PORT || 3001;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
app.use(cors());
app.use(express.json());
wss.on('connection', (ws) => { console.log('🔌 Client connected'); ws.on('close', () => console.log('🔌 Client disconnected')); });
function broadcast(data) { wss.clients.forEach((c) => { if (c.readyState === c.OPEN) c.send(JSON.stringify(data)); }); }

// --- AUTH API ENDPOINTS (Same as before) ---
app.post("/api/auth/register", async (req, res) => { const { username, password, email, phone_number } = req.body; if (!username || !password || !email || !phone_number) { return res.status(400).json({ error: "All fields are required." }); } try { const salt = await bcrypt.genSalt(10); const hashedPassword = await bcrypt.hash(password, salt); const newUserQuery = `INSERT INTO users (username, password_hash, email, phone_number) VALUES ($1, $2, $3, $4) RETURNING id, username, email, phone_number;`; const result = await pool.query(newUserQuery, [username, hashedPassword, email, phone_number]); res.status(201).json(result.rows[0]); } catch (error) { console.error("❌ Error during registration:", error); if (error.code === '23505') { return res.status(409).json({ error: "Username or email already exists." }); } res.status(500).json({ error: "Server error during registration." }); } });
app.post("/api/auth/login", async (req, res) => { const { username, password } = req.body; if (!username || !password) { return res.status(400).json({ error: "Username and password are required." }); } try { const userQuery = "SELECT * FROM users WHERE username = $1"; const result = await pool.query(userQuery, [username]); const user = result.rows[0]; if (!user) { return res.status(401).json({ error: "Invalid credentials." }); } const isMatch = await bcrypt.compare(password, user.password_hash); if (!isMatch) { return res.status(401).json({ error: "Invalid credentials." }); } const payload = { user: { id: user.id, username: user.username, email: user.email, phone_number: user.phone_number } }; jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' }, (err, token) => { if (err) throw err; res.json({ token, user: payload.user }); }); } catch (error) { console.error("❌ Error during login:", error); res.status(500).json({ error: "Server error during login." }); } });

// --- CAMERA API ENDPOINTS (DELETE endpoint added) ---
app.post("/api/cameras", async (req, res) => { const { name, stream_url, access_password } = req.body; if (!name || !stream_url) { return res.status(400).json({ error: "Name and URL required." }); } const client = await pool.connect(); try { await client.query('BEGIN'); const cQ = `INSERT INTO cameras (name, stream_url, access_password, status, last_heartbeat) VALUES ($1, $2, $3, 'offline', NOW()) RETURNING *;`; const cV = [name, stream_url, access_password || null]; const cR = await client.query(cQ, cV); const nC = cR.rows[0]; const aQ = 'INSERT INTO alerts (camera_id) VALUES ($1);'; await client.query(aQ, [nC.id]); await client.query('COMMIT'); console.log("✅ New camera created:", nC); res.status(201).json(nC); broadcast({ type: 'DATA_CHANGED' }); } catch (e) { await client.query('ROLLBACK'); console.error("❌ Error adding camera:", e); res.status(500).json({ error: "Server error." }); } finally { client.release(); } });
app.get("/api/cameras", async (req, res) => { try { const r = await pool.query("SELECT id, name, stream_url, status FROM cameras ORDER BY id ASC;"); res.json(r.rows); } catch (e) { console.error("❌ Error fetching cameras:", e.message); res.status(500).json({ error: "Server error." }); } });
app.put("/api/cameras/:id/heartbeat", async (req, res) => { const { id } = req.params; const client = await pool.connect(); try { await client.query('BEGIN'); const cUQ = `UPDATE cameras SET status = 'online', last_heartbeat = NOW() WHERE id = $1 RETURNING *;`; const cR = await client.query(cUQ, [id]); if (cR.rows.length === 0) { return res.status(404).json({ error: "Not found." }); } const aRQ = `UPDATE alerts SET is_resolved = TRUE, resolved_at = NOW(), resolution_reason = 'Auto-resolved: Camera online.' WHERE camera_id = $1 AND is_resolved = FALSE;`; await client.query(aRQ, [id]); await client.query('COMMIT'); console.log(`💓 Heartbeat from ID: ${id}`); res.status(200).json(cR.rows[0]); broadcast({ type: 'DATA_CHANGED' }); } catch (e) { await client.query('ROLLBACK'); console.error(`❌ Error on heartbeat ID ${id}:`, e); res.status(500).json({ error: "Server error." }); } finally { client.release(); } });
app.post("/api/cameras/:id/verify", async (req, res) => { const { id } = req.params; const { password } = req.body; try { const result = await pool.query("SELECT access_password FROM cameras WHERE id = $1", [id]); if (result.rows.length === 0) { return res.status(404).json({ error: "Camera not found." }); } const storedPassword = result.rows[0].access_password; if (storedPassword === password) { res.json({ success: true }); } else { res.status(401).json({ success: false, error: "Invalid password." }); } } catch (e) { console.error("❌ Error verifying password:", e.message); res.status(500).json({ error: "Server error." }); } });

// --- NEW ENDPOINT: DELETE A CAMERA ---
app.delete("/api/cameras/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM cameras WHERE id = $1 RETURNING *;", [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Camera not found." });
        }
        console.log(`✅ Camera ID ${id} deleted.`);
        res.status(200).json({ message: "Camera deleted successfully." });
        broadcast({ type: 'DATA_CHANGED' });
    } catch (e) {
        console.error("❌ Error deleting camera:", e.message);
        res.status(500).json({ error: "Server error." });
    }
});

// --- ALERT API ENDPOINTS (GET resolved endpoint added) ---
app.get("/api/alerts", async (req, res) => { try { const q = `SELECT a.id, a.offline_at, c.name AS camera_name FROM alerts a JOIN cameras c ON a.camera_id = c.id WHERE a.is_resolved = FALSE ORDER BY a.offline_at DESC;`; const r = await pool.query(q); res.json(r.rows); } catch (e) { console.error("❌ Error fetching active alerts:", e); res.status(500).json({ error: "Server error." }); } });

// --- NEW ENDPOINT: GET RESOLVED ALERTS ---
app.get("/api/alerts/resolved", async (req, res) => {
    try {
        const query = `
            SELECT
                a.id,
                a.resolved_at,
                a.resolution_reason,
                c.name AS camera_name
            FROM alerts a
            JOIN cameras c ON a.camera_id = c.id
            WHERE a.is_resolved = TRUE
            ORDER BY a.resolved_at DESC
            LIMIT 10;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("❌ Error fetching resolved alerts:", error);
        res.status(500).json({ error: "Server error" });
    }
});

app.put("/api/alerts/:id/resolve", async (req, res) => { try { const { id } = req.params; const { reason } = req.body; if (!reason) { return res.status(400).json({ error: "Reason required." }); } const q = `UPDATE alerts SET is_resolved = TRUE, resolved_at = NOW(), resolution_reason = $1 WHERE id = $2 RETURNING *;`; const r = await pool.query(q, [reason, id]); if (r.rows.length === 0) { return res.status(404).json({ error: "Not found." }); } console.log("✅ Alert resolved:", r.rows[0]); res.json(r.rows[0]); broadcast({ type: 'DATA_CHANGED' }); } catch (e) { console.error("❌ Error resolving alert:", e); res.status(500).json({ error: "Server error." }); } });

// --- BACKGROUND STATUS CHECKER (Same as before) ---
const CHECK_INTERVAL_MS = 30 * 1000;
async function checkCameraStatuses() { console.log('⌛ Running background check...'); const client = await pool.connect(); try { const oQ = `SELECT id, name FROM cameras WHERE status = 'online' AND last_heartbeat < NOW() - INTERVAL '40 seconds';`; const { rows: oC } = await client.query(oQ); if (oC.length > 0) { console.log(`🚨 Found ${oC.length} offline cameras.`); const { rows: users } = await client.query('SELECT username, email, phone_number FROM users;'); if (users.length === 0) { return; } for (const cam of oC) { await client.query('BEGIN'); await client.query(`UPDATE cameras SET status = 'offline' WHERE id = $1;`, [cam.id]); await client.query(`INSERT INTO alerts (camera_id) VALUES ($1);`, [cam.id]); await client.query('COMMIT'); console.log(`- Marked ID ${cam.id} (${cam.name}) offline.`); const msg = `Sentinel Alert: Camera "${cam.name}" went offline at ${new Date().toLocaleTimeString()}.`; for (const user of users) { if (user.phone_number) { sendSms(user.phone_number, msg); } if (user.email) { sendEmail(user.email, `Sentinel Alert: ${cam.name} Offline`, msg); } } } broadcast({ type: 'DATA_CHANGED' }); } } catch (e) { console.error('❌ Error in checker:', e); await client.query('ROLLBACK'); } finally { client.release(); } }
setInterval(checkCameraStatuses, CHECK_INTERVAL_MS);

// --- START THE SERVER ---
server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});