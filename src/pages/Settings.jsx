import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useState } from "react";

export default function Settings() {
    const navigate = useNavigate();
    const [darkMode, setDarkMode] = useState(true);

    const handleLogout = () => {
        signOut(auth).then(() => navigate("/login"));
    };

    return (
        <div className={`min-h-screen ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}>
            <div className="p-6 max-w-4xl mx-auto">

                {/* একই ন্যাভবার */}
                <div className="mb-10 flex flex-wrap justify-center gap-4">
                    <button onClick={() => navigate("/dashboard")} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-lg shadow-lg hover:shadow-cyan-500/50 transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3">🏠 Dashboard</button>
                    <button onClick={() => navigate("/daily-account")} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-lg hover:shadow-pink-500/50 transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3">📅 Daily Account</button>
                    <button onClick={() => navigate("/reports")} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold text-lg shadow-lg hover:shadow-teal-500/50 transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3">📊 Reports</button>
                    <button onClick={() => navigate("/customers")} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold text-lg shadow-lg hover:shadow-red-500/50 transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3">👥 All Customers</button>
                    <button className="px-8 py-4 rounded-2xl bg-gradient-to-r from-gray-600 to-gray-800 text-white font-bold text-lg shadow-lg shadow-gray-500/50 transform -translate-y-1">⚙️ Settings</button>
                </div>

                <h1 className="text-4xl font-bold text-center mb-10">⚙️ Settings</h1>

                <div className="bg-gray-900/70 border border-gray-800 rounded-3xl p-8 space-y-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-bold">Dark Mode</h3>
                            <p className="opacity-70">Toggle dark/light theme</p>
                        </div>
                        <button onClick={() => setDarkMode(!darkMode)} className="text-4xl">
                            {darkMode ? '🌙' : '☀️'}
                        </button>
                    </div>

                    <div className="pt-8 border-t border-gray-700">
                        <button onClick={handleLogout} className="w-full py-5 bg-red-600 hover:bg-red-700 rounded-2xl font-bold text-xl transition">
                            Logout 🚪
                        </button>
                    </div>

                    <div className="text-center opacity-60 pt-8">
                        <p>App Version 1.0</p>
                        <p>Made with ❤️ for Business Owners</p>
                    </div>
                </div>
            </div>
        </div>
    );
}