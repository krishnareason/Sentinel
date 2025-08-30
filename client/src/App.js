import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Video, VideoOff, AlertTriangle, Plus, LogIn, X, Wifi, WifiOff, Eye, UserPlus, LogOut, Trash2, CheckCircle } from 'lucide-react';

// --- Main Application Component ---
export default function App() {
    const [appView, setAppView] = useState('dashboard');
    const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const user = localStorage.getItem('currentUser');
        if (user) {
            setCurrentUser(JSON.parse(user));
        }
    }, [authToken]);

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        setAuthToken(null);
        setCurrentUser(null);
    };

    if (!authToken) {
        return <AuthRouter setAuthToken={setAuthToken} setCurrentUser={setCurrentUser} />;
    }

    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans">
            <Header
                currentUser={currentUser}
                onLogout={handleLogout}
                appView={appView}
                setAppView={setAppView}
            />
            <main className="p-4 md:p-8">
                {appView === 'dashboard' && <Dashboard />}
                {appView === 'cameras' && <CameraManagement />}
            </main>
        </div>
    );
}

// --- Auth Components ---
const AuthRouter = ({ setAuthToken, setCurrentUser }) => {
    const [authView, setAuthView] = useState('login');
    if (authView === 'register') {
        return <RegisterPage setAuthView={setAuthView} />;
    }
    return <LoginPage setAuthView={setAuthView} setAuthToken={setAuthToken} setCurrentUser={setCurrentUser} />;
};

const LoginPage = ({ setAuthView, setAuthToken, setCurrentUser }) => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await fetch('http://localhost:3001/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Login failed');
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            setAuthToken(data.token);
            setCurrentUser(data.user);
        } catch (err) {
            setError(err.message);
        }
    };
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-teal-500/20">
                <div className="text-center mb-8"><Shield className="mx-auto h-16 w-16 text-teal-400" /><h1 className="text-3xl font-bold mt-4">Security Dashboard Login</h1></div>
                <form onSubmit={handleSubmit}>
                    {error && <p className="text-red-400 text-center mb-4">{error}</p>}
                    <input name="username" type="text" value={formData.username} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-4 text-white focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Username" required />
                    <input name="password" type="password" value={formData.password} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-6 text-white focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Password" required />
                    <button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2"><LogIn size={20} />Sign In</button>
                </form>
                <p className="text-center text-gray-400 mt-6">Don't have an account? <button onClick={() => setAuthView('register')} className="font-bold text-teal-400 hover:underline">Register here</button></p>
            </div>
        </div>
    );
};

const RegisterPage = ({ setAuthView }) => {
    const [formData, setFormData] = useState({ username: '', password: '', email: '', phone_number: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            const response = await fetch('http://localhost:3001/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Registration failed');
            setSuccess('Registration successful! Redirecting to login...');
            setTimeout(() => setAuthView('login'), 2000);
        } catch (err) {
            setError(err.message);
        }
    };
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-teal-500/20">
                <div className="text-center mb-8"><UserPlus className="mx-auto h-16 w-16 text-teal-400" /><h1 className="text-3xl font-bold mt-4">Create Account</h1></div>
                <form onSubmit={handleSubmit}>
                    {error && <p className="text-red-400 text-center mb-4">{error}</p>}
                    {success && <p className="text-green-400 text-center mb-4">{success}</p>}
                    <input name="username" value={formData.username} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-4 text-white focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Username" required />
                    <input name="password" type="password" value={formData.password} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-4 text-white focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Password" required />
                    <input name="email" type="email" value={formData.email} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-4 text-white focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Email Address" required />
                    <input name="phone_number" type="tel" value={formData.phone_number} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 mb-6 text-white focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Phone Number (e.g., +91...)" required />
                    <button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2">Register</button>
                </form>
                <p className="text-center text-gray-400 mt-6">Already have an account? <button onClick={() => setAuthView('login')} className="font-bold text-teal-400 hover:underline">Login here</button></p>
            </div>
        </div>
    );
};

// --- Main App Components ---
const Header = ({ currentUser, onLogout, appView, setAppView }) => {
    return (
        <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4 flex justify-between items-center sticky top-0 z-10">
            <div className="flex items-center gap-3"><Shield className="h-8 w-8 text-teal-400" /><h1 className="text-xl font-bold">Sentinel Dashboard</h1></div>
            <div className="flex items-center gap-6">
                <nav className="flex items-center gap-4">
                    <button onClick={() => setAppView('dashboard')} className={appView === 'dashboard' ? 'text-white font-bold' : 'text-gray-400 hover:text-white'}>Dashboard</button>
                    <button onClick={() => setAppView('cameras')} className={appView === 'cameras' ? 'text-white font-bold' : 'text-gray-400 hover:text-white'}>Manage Cameras</button>
                </nav>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-300 hidden sm:block">Welcome, {currentUser?.username}</span>
                    <button onClick={onLogout} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"><LogOut size={16} />Logout</button>
                </div>
            </div>
        </header>
    );
};

const Dashboard = () => {
    const [stats, setStats] = useState({ totalCameras: 0, activeCameras: 0, offlineCameras: 0, activeAlerts: 0 });
    const [activeAlerts, setActiveAlerts] = useState([]);
    const [resolvedAlerts, setResolvedAlerts] = useState([]);

    const fetchData = useCallback(() => {
        Promise.all([
            fetch('http://localhost:3001/api/cameras'),
            fetch('http://localhost:3001/api/alerts'),
            fetch('http://localhost:3001/api/alerts/resolved')
        ]).then(async ([camerasRes, activeAlertsRes, resolvedAlertsRes]) => {
            const cameras = await camerasRes.json();
            const active = await activeAlertsRes.json();
            const resolved = await resolvedAlertsRes.json();
            const onlineCount = cameras.filter(c => c.status === 'online').length;
            const offlineCount = cameras.filter(c => c.status === 'offline').length;
            setStats({ totalCameras: cameras.length, activeCameras: onlineCount, offlineCameras: offlineCount, activeAlerts: active.length });
            setActiveAlerts(active);
            setResolvedAlerts(resolved);
        }).catch(err => console.error("Failed to fetch dashboard data:", err));
    }, []);

    useEffect(() => {
        fetchData();
        const ws = new WebSocket('ws://localhost:3001');
        ws.onopen = () => console.log('WebSocket connected');
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'DATA_CHANGED') {
                fetchData();
            }
        };
        ws.onclose = () => console.log('WebSocket disconnected');
        return () => ws.close();
    }, [fetchData]);

    return (
        <>
            <StatsGrid stats={stats} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                <AlertsPanel alerts={activeAlerts} onAlertResolved={fetchData} />
                <AlertHistoryPanel alerts={resolvedAlerts} />
            </div>
        </>
    );
};

const CameraManagement = () => {
    const [cameras, setCameras] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchCameras = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch('http://localhost:3001/api/cameras');
            if (!response.ok) throw new Error('Network error');
            const data = await response.json();
            setCameras(data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCameras();
    }, [fetchCameras]);

    const handleAddCamera = async (cameraData) => {
        try {
            const response = await fetch('http://localhost:3001/api/cameras', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cameraData) });
            if (!response.ok) throw new Error('Failed to add camera');
            fetchCameras();
            setIsModalOpen(false);
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDeleteCamera = async (id) => {
        if (window.confirm("Are you sure you want to delete this camera?")) {
            try {
                const response = await fetch(`http://localhost:3001/api/cameras/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Failed to delete camera');
            } catch (err) {
                alert(err.message);
            }
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 shadow-lg">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Manage & View Cameras</h2>
                    <p className="text-gray-400">Manage {cameras.length} cameras</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"><Plus size={20} /> Add New Camera</button>
            </div>
            {isLoading && <p>Loading...</p>}
            {error && <p className="text-red-400">Error: {error}</p>}
            {!isLoading && !error && cameras.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cameras.map(camera => <CameraCard key={camera.id} camera={camera} onDelete={handleDeleteCamera} />)}
                </div>
            )}
            {!isLoading && !error && cameras.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed border-gray-600 rounded-lg">
                    <p className="text-gray-400">No cameras configured.</p>
                </div>
            )}
            {isModalOpen && <AddCameraModal onClose={() => setIsModalOpen(false)} onAdd={handleAddCamera} />}
        </div>
    );
};

const StatsGrid = ({ stats }) => {
    const statCards = [
        { title: 'Total Cameras', value: stats.totalCameras, icon: Video, color: 'text-blue-400' },
        { title: 'Active Cameras', value: stats.activeCameras, icon: Video, color: 'text-green-400' },
        { title: 'Offline Cameras', value: stats.offlineCameras, icon: VideoOff, color: 'text-red-400' },
        { title: 'Active Alerts', value: stats.activeAlerts, icon: AlertTriangle, color: 'text-yellow-400' },
    ];
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map(card => (
                <div key={card.title} className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 shadow-lg flex items-center gap-6">
                    <card.icon className={`h-12 w-12 ${card.color}`} />
                    <div>
                        <p className="text-gray-400 text-sm">{card.title}</p>
                        <p className="text-4xl font-bold">{card.value}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

const AlertsPanel = ({ alerts, onAlertResolved }) => {
    const handleResolve = async (id) => {
        const reason = prompt("Reason:");
        if (reason && reason.trim() !== "") {
            try {
                const res = await fetch(`http://localhost:3001/api/alerts/${id}/resolve`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: reason }) });
                if (!res.ok) throw new Error('Failed to resolve alert');
                onAlertResolved();
            } catch (err) {
                alert(err.message);
            }
        }
    };
    return (
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Active Alerts</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
                {alerts.length > 0 ? alerts.map(a => (
                    <div key={a.id} className="flex flex-wrap justify-between items-center bg-yellow-500/10 p-4 rounded-lg">
                        <div className="flex items-center gap-4">
                            <AlertTriangle className="h-6 w-6 text-yellow-400" />
                            <div>
                                <p className="font-semibold">{a.camera_name} is offline.</p>
                                <p className="text-sm text-gray-400">Detected at: {new Date(a.offline_at).toLocaleString()}</p>
                            </div>
                        </div>
                        <button onClick={() => handleResolve(a.id)} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg mt-2 sm:mt-0">Resolve</button>
                    </div>
                )) : <p className="text-gray-400">No active alerts.</p>}
            </div>
        </div>
    );
};

const AlertHistoryPanel = ({ alerts }) => {
    return (
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700/50 shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Alert History</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
                {alerts.length > 0 ? alerts.map(alert => (
                    <div key={alert.id} className="bg-gray-700/40 p-4 rounded-lg opacity-80">
                        <div className="flex items-start gap-4">
                            <CheckCircle className="h-6 w-6 text-green-400 mt-1 flex-shrink-0" />
                            <div>
                                <p className="font-semibold">{alert.camera_name} was offline.</p>
                                <p className="text-sm text-gray-400">Resolved at: {new Date(alert.resolved_at).toLocaleString()}</p>
                                <p className="text-sm text-gray-300 mt-1">Reason: <span className="font-semibold">{alert.resolution_reason}</span></p>
                            </div>
                        </div>
                    </div>
                )) : <p className="text-gray-400">No resolved alerts found.</p>}
            </div>
        </div>
    );
};

const AddCameraModal = ({ onClose, onAdd }) => {
    const [formData, setFormData] = useState({ name: '', stream_url: '', access_password: '' });
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSubmit = (e) => { e.preventDefault(); onAdd(formData); };
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-teal-500/20 p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>
                <h2 className="text-2xl font-bold mb-6">Add New Camera</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Camera Name" required />
                    <input type="text" name="stream_url" value={formData.stream_url} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Stream URL" required />
                    <input type="password" name="access_password" value={formData.access_password} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Access Password" required />
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg">Cancel</button>
                        <button type="submit" className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-6 rounded-lg">Add Camera</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CameraCard = ({ camera, onDelete }) => {
    const isOnline = camera.status === 'online';
    const [isUnlocked, setIsUnlocked] = useState(false);
    const heartbeatInterval = useRef(null);

    const sendHeartbeat = useCallback(() => {
        console.log(`Sending automatic heartbeat for Camera ID: ${camera.id}`);
        fetch(`http://localhost:3001/api/cameras/${camera.id}/heartbeat`, {
            method: 'PUT'
        }).catch(err => console.error("Heartbeat failed:", err));
    }, [camera.id]);

    useEffect(() => {
        if (isUnlocked) {
            sendHeartbeat();
            heartbeatInterval.current = setInterval(sendHeartbeat, 25000);
        }
        return () => {
            if (heartbeatInterval.current) {
                clearInterval(heartbeatInterval.current);
            }
        };
    }, [isUnlocked, sendHeartbeat]);

    const handleViewClick = async () => {
        const password = prompt("Enter password to view feed:");
        if (password) {
            try {
                const response = await fetch(`http://localhost:3001/api/cameras/${camera.id}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
                const data = await response.json();
                if (data.success) {
                    setIsUnlocked(true);
                } else {
                    alert("Incorrect password.");
                }
            } catch (err) {
                alert("Error verifying password.");
            }
        }
    };
    
    return (
        <div className="bg-gray-700/50 rounded-2xl overflow-hidden border border-gray-600/50 flex flex-col">
            <div className="bg-black aspect-video flex items-center justify-center relative">
                {isUnlocked ? ( <img src={camera.stream_url} alt={`Feed from ${camera.name}`} className="w-full h-full object-cover" /> ) : ( <div className="absolute inset-0 bg-black/30 backdrop-blur-md flex flex-col items-center justify-center text-center p-4"> <button onClick={handleViewClick} className="bg-teal-500/80 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"><Eye size={16} />Click to View</button> </div> )}
                <span className={`absolute top-3 right-3 flex items-center gap-2 text-xs font-bold px-2 py-1 rounded-full ${isOnline ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}> {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />} {camera.status} </span>
            </div>
            <div className="p-4 flex-grow">
                <h3 className="font-bold text-lg">{camera.name}</h3>
                <p className="text-sm text-gray-400 truncate">{camera.stream_url}</p>
            </div>
            <div className="p-2 border-t border-gray-600/50">
                <button onClick={() => onDelete(camera.id)} className="w-full flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/10 py-2 rounded-lg text-sm font-semibold">
                    <Trash2 size={16} />
                    Delete Camera
                </button>
            </div>
        </div>
    );
};