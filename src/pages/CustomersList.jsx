import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useNavigate } from "react-router-dom";

export default function CustomersList() {
    const navigate = useNavigate();
    const user = auth.currentUser;
    const [customers, setCustomers] = useState({});
    const [darkMode, setDarkMode] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    useEffect(() => {
        if (!user) navigate("/login");
        const ownerRef = ref(db, "owners/" + user.uid + "/customers");
        onValue(ownerRef, (snap) => {
            setCustomers(snap.val() || {});
        });
    }, [user, navigate]);

    const calculateDue = (txns) => {
        let due = 0;
        if (txns) Object.values(txns).forEach(t => t.type === "add" ? due += Number(t.amount) : due -= Number(t.amount));
        return due;
    };

    const getLastTransactionDate = (txns) => {
        if (!txns || Object.keys(txns).length === 0) return "No transactions";
        const dates = Object.values(txns).map(t => new Date(t.date));
        const last = new Date(Math.max(...dates));
        return last.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const getTransactionsList = (txns) => {
        if (!txns) return [];
        return Object.entries(txns)
            .map(([key, t]) => ({ ...t, key }))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const filteredCustomers = Object.entries(customers).filter(([key, cust]) =>
        cust.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cust.phone.includes(searchTerm)
    );

    return (
        <div className={`min-h-screen transition-colors duration-500 ${darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
            <div className="p-6 max-w-7xl mx-auto">

                {/* Elegant Navbar */}
                <div className="mb-12 flex flex-wrap justify-center gap-5">
                    <button onClick={() => navigate("/dashboard")} className="px-9 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold text-lg shadow-xl hover:shadow-cyan-500/60 transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3">
                        🏠 Dashboard
                    </button>
                    <button onClick={() => navigate("/daily-account")} className="px-9 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-lg shadow-xl hover:shadow-pink-500/60 transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3">
                        📅 Daily Account
                    </button>
                    <button onClick={() => navigate("/reports")} className="px-9 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-teal-600 text-white font-semibold text-lg shadow-xl hover:shadow-teal-500/60 transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3">
                        📊 Reports
                    </button>
                    <button className="px-9 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg shadow-2xl shadow-purple-600/70 ring-4 ring-purple-500/30 transform transition-all duration-300 flex items-center gap-3">
                        👥 All Customers
                    </button>
                    <button onClick={() => navigate("/settings")} className="px-9 py-4 rounded-2xl bg-gradient-to-r from-gray-700 to-gray-900 text-white font-semibold text-lg shadow-xl hover:shadow-gray-600/60 transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-3">
                        ⚙️ Settings
                    </button>
                </div>

                <h1 className="text-5xl font-extrabold text-center mb-12 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    All Customers
                </h1>

                {/* Premium Search Bar */}
                <div className="max-w-3xl mx-auto mb-12">
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-6 flex items-center text-gray-400 text-xl">🔍</span>
                        <input
                            type="text"
                            placeholder="Search by name or phone number..."
                            className="w-full pl-14 pr-6 py-5 text-lg bg-gray-900/70 border border-gray-700 rounded-3xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all duration-300 placeholder-gray-500 backdrop-blur-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Customer Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredCustomers.length === 0 ? (
                        <p className="col-span-full text-center text-gray-500 text-2xl font-medium py-20">No customers found</p>
                    ) : (
                        filteredCustomers.map(([key, cust]) => {
                            const due = calculateDue(cust.transactions);
                            const lastTxnDate = getLastTransactionDate(cust.transactions);

                            return (
                                <div
                                    key={key}
                                    onClick={() => setSelectedCustomer({ key, ...cust })}
                                    className="group relative bg-gray-900/80 border border-gray-800 rounded-3xl p-7 cursor-pointer overflow-hidden transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-600/30 transition-all duration-500 backdrop-blur-sm"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-pink-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    <div className="relative z-10">
                                        <div className="flex items-center gap-5 mb-5">
                                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl font-extrabold shadow-2xl">
                                                {cust.name[0].toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-2xl font-bold truncate">{cust.name}</h3>
                                                <p className="text-gray-400 mt-1">📞 {cust.phone}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="text-sm text-gray-500">Last transaction: <span className="text-gray-300">{lastTxnDate}</span></p>

                                            <div className="text-right">
                                                <p className={`text-4xl font-extrabold ${due > 0 ? 'text-red-400' : due < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                                    {due > 0 ? '+' : due < 0 ? '-' : ''}{Math.abs(due).toLocaleString()} Tk
                                                </p>
                                                {due === 0 && <p className="text-green-400 text-lg font-medium mt-2">All Clear ✓</p>}
                                            </div>
                                        </div>

                                        <div className="mt-6 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <span className="text-purple-300 font-semibold text-sm">View full history →</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Professional Modal */}
                {selectedCustomer && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-fadeIn" onClick={() => setSelectedCustomer(null)}>
                        <div className="bg-gray-900/95 border border-gray-700 rounded-3xl p-10 max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl shadow-purple-900/50" onClick={(e) => e.stopPropagation()}>
                            <div className="text-center mb-10">
                                <div className="w-36 h-36 mx-auto mb-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center text-7xl font-extrabold shadow-2xl">
                                    {selectedCustomer.name.charAt(0).toUpperCase()}
                                </div>
                                <h2 className="text-5xl font-extrabold mb-3">{selectedCustomer.name}</h2>
                                <p className="text-2xl text-gray-300 mb-6">📞 {selectedCustomer.phone}</p>

                                <div className={`text-5xl font-extrabold ${calculateDue(selectedCustomer.transactions) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {calculateDue(selectedCustomer.transactions) > 0 ? '+' : ''}{Math.abs(calculateDue(selectedCustomer.transactions)).toLocaleString()} Tk
                                </div>
                                <p className="text-xl text-gray-400 mt-3">
                                    {calculateDue(selectedCustomer.transactions) > 0 ? "Customer owes you" : calculateDue(selectedCustomer.transactions) < 0 ? "You owe customer" : "Balance cleared"}
                                </p>
                            </div>

                            <h3 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                Transaction History
                            </h3>

                            {selectedCustomer.transactions && Object.keys(selectedCustomer.transactions).length > 0 ? (
                                <div className="overflow-x-auto rounded-2xl border border-gray-800">
                                    <table className="w-full min-w-[700px]">
                                        <thead className="bg-gray-800/70">
                                            <tr>
                                                <th className="px-8 py-5 text-left font-semibold text-gray-300">Date</th>
                                                <th className="px-8 py-5 text-left font-semibold text-gray-300">Type</th>
                                                <th className="px-8 py-5 text-right font-semibold text-gray-300">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {getTransactionsList(selectedCustomer.transactions).map((t, i) => (
                                                <tr key={t.key} className={`border-b border-gray-800 ${i % 2 === 0 ? 'bg-gray-800/30' : ''} hover:bg-purple-900/30 transition-colors`}>
                                                    <td className="px-8 py-5">{new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                                                    <td className="px-8 py-5">
                                                        <span className={`font-bold ${t.type === "add" ? "text-red-400" : "text-green-400"}`}>
                                                            {t.type === "add" ? "➕ Added Due" : "➖ Payment Received"}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 text-right font-bold text-xl">{t.amount.toLocaleString()} Tk</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 text-2xl py-16 font-medium">No transactions recorded yet</p>
                            )}

                            <button
                                onClick={() => setSelectedCustomer(null)}
                                className="mt-12 w-full py-5 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl font-bold text-xl hover:from-red-700 hover:to-rose-700 transform hover:scale-105 transition-all duration-300 shadow-xl"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}