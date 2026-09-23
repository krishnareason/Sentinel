require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");
const { sendSms, sendEmail } = require("./services/notificationService");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const app = express();
const PORT = process.env.PORT || 3001;
const server = http.createServer(app);

// Check for required env vars
const supabaseUrl = "https://opicgvtbijqjzqinnzrp.supabase.co"; // extracted from client env
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY is missing in server/.env! Notifications will not work until you add it.");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || 'dummy_key');

app.use(cors());
app.use(express.json());

// --- CAMERA API ENDPOINTS ---
app.post("/api/cameras", async (req, res) => { 
    const { name, stream_url, access_password } = req.body; 
    if (!name || !stream_url) { return res.status(400).json({ error: "Name and URL required." }); } 
    try { 
        const newCamera = await prisma.camera.create({
            data: {
                name,
                stream_url,
                access_password: access_password || null,
                status: 'offline'
            }
        });
        await prisma.alert.create({
            data: { camera_id: newCamera.id }
        });
        console.log("✅ New camera created:", newCamera); 
        res.status(201).json(newCamera); 
    } catch (e) { 
        console.error("❌ Error adding camera:", e); 
        res.status(500).json({ error: "Server error." }); 
    } 
});

app.get("/api/cameras", async (req, res) => { 
    try { 
        const cameras = await prisma.camera.findMany({
            select: { id: true, name: true, stream_url: true, status: true },
            orderBy: { id: 'asc' }
        });
        res.json(cameras); 
    } catch (e) { 
        console.error("❌ Error fetching cameras:", e.message); 
        res.status(500).json({ error: "Server error." }); 
    } 
});

app.put("/api/cameras/:id/heartbeat", async (req, res) => { 
    const id = parseInt(req.params.id); 
    try { 
        const camera = await prisma.camera.update({
            where: { id },
            data: { status: 'online', last_heartbeat: new Date() }
        });
        
        await prisma.alert.updateMany({
            where: { camera_id: id, is_resolved: false },
            data: { is_resolved: true, resolved_at: new Date(), resolution_reason: 'Auto-resolved: Camera online.' }
        });

        console.log(`💓 Heartbeat from ID: ${id}`); 
        res.status(200).json(camera); 
    } catch (e) { 
        console.error(`❌ Error on heartbeat ID ${id}:`, e); 
        res.status(500).json({ error: "Server error." }); 
    } 
});

app.post("/api/cameras/:id/verify", async (req, res) => { 
    const id = parseInt(req.params.id); 
    const { password } = req.body; 
    try { 
        const camera = await prisma.camera.findUnique({ where: { id } });
        if (!camera) return res.status(404).json({ error: "Camera not found." }); 
        
        if (camera.access_password === password) { 
            res.json({ success: true }); 
        } else { 
            res.status(401).json({ success: false, error: "Invalid password." }); 
        } 
    } catch (e) { 
        console.error("❌ Error verifying password:", e.message); 
        res.status(500).json({ error: "Server error." }); 
    } 
});

app.delete("/api/cameras/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        await prisma.camera.delete({ where: { id } });
        console.log(`✅ Camera ID ${id} deleted.`);
        res.status(200).json({ message: "Camera deleted successfully." });
    } catch (e) {
        console.error("❌ Error deleting camera:", e.message);
        res.status(500).json({ error: "Server error." });
    }
});

// --- ALERT API ENDPOINTS ---
app.get("/api/alerts", async (req, res) => { 
    try { 
        const alerts = await prisma.alert.findMany({
            where: { is_resolved: false },
            include: { camera: { select: { name: true } } },
            orderBy: { offline_at: 'desc' }
        });
        const formatted = alerts.map(a => ({ id: a.id, offline_at: a.offline_at, camera_name: a.camera.name }));
        res.json(formatted); 
    } catch (e) { 
        console.error("❌ Error fetching active alerts:", e); 
        res.status(500).json({ error: "Server error." }); 
    } 
});

app.get("/api/alerts/resolved", async (req, res) => {
    try {
        const alerts = await prisma.alert.findMany({
            where: { is_resolved: true },
            include: { camera: { select: { name: true } } },
            orderBy: { resolved_at: 'desc' },
            take: 10
        });
        const formatted = alerts.map(a => ({ 
            id: a.id, resolved_at: a.resolved_at, resolution_reason: a.resolution_reason, camera_name: a.camera.name 
        }));
        res.json(formatted);
    } catch (error) {
        console.error("❌ Error fetching resolved alerts:", error);
        res.status(500).json({ error: "Server error" });
    }
});

app.put("/api/alerts/:id/resolve", async (req, res) => { 
    const id = parseInt(req.params.id); 
    const { reason } = req.body; 
    if (!reason) return res.status(400).json({ error: "Reason required." }); 
    try { 
        const alert = await prisma.alert.update({
            where: { id },
            data: { is_resolved: true, resolved_at: new Date(), resolution_reason: reason }
        });
        console.log("✅ Alert resolved:", alert); 
        res.json(alert); 
    } catch (e) { 
        console.error("❌ Error resolving alert:", e); 
        res.status(500).json({ error: "Server error." }); 
    } 
});

// --- BACKGROUND STATUS CHECKER ---
const CHECK_INTERVAL_MS = 30 * 1000;
async function checkCameraStatuses() { 
    console.log('⌛ Running background check...'); 
    try { 
        // 40 seconds ago
        const fortySecondsAgo = new Date(Date.now() - 40000);
        
        const offlineCameras = await prisma.camera.findMany({
            where: {
                status: 'online',
                last_heartbeat: { lt: fortySecondsAgo }
            }
        });

        if (offlineCameras.length > 0) { 
            console.log(`🚨 Found ${offlineCameras.length} newly offline cameras.`); 
            
            if (!supabaseServiceKey) {
                console.error("Cannot fetch users for notifications without SUPABASE_SERVICE_ROLE_KEY! Please add it to .env");
                return;
            }

            // Fetch users securely from Supabase Admin API
            const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
            if (error) throw error;
            if (!users || users.length === 0) return; 

            for (const cam of offlineCameras) { 
                await prisma.$transaction([
                    prisma.camera.update({ where: { id: cam.id }, data: { status: 'offline' } }),
                    prisma.alert.create({ data: { camera_id: cam.id } })
                ]);
                
                console.log(`- Marked ID ${cam.id} (${cam.name}) offline.`); 
                const msg = `Sentinel Alert: Camera "${cam.name}" went offline at ${new Date().toLocaleTimeString()}.`; 
                
                for (const user of users) { 
                    // Make sure to parse user metadata if you have phone stored there
                    const phone = user.phone; 
                    if (phone) { 
                        sendSms(phone, msg); 
                    } 
                    if (user.email) { 
                        sendEmail(user.email, `Sentinel Alert: ${cam.name} Offline`, msg); 
                    } 
                } 
            } 
        } 
    } catch (e) { 
        console.error('❌ Error in checker:', e); 
    } 
}
setInterval(checkCameraStatuses, CHECK_INTERVAL_MS);

// --- START THE SERVER ---
server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});