import { useEffect, useState, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { ref, onValue, set, push, update, remove } from "firebase/database";
import { useNavigate, useLocation } from "react-router-dom";
import QRCode from "react-qr-code";

// Add your logo import here (adjust path if needed)
import logo from "./Minimalist AS Latter Logo.png"; // ← Change this path if your file is in a different folder

export default function Dashboard() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = auth.currentUser;
    const [ownerName, setOwnerName] = useState("");
    const [customers, setCustomers] = useState({});
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [searchCustomer, setSearchCustomer] = useState("");
    const [amount, setAmount] = useState("");
    const [filterDate, setFilterDate] = useState("");
    const [transactionDone, setTransactionDone] = useState(false);
    const [editTxn, setEditTxn] = useState(null);
    const [editAmount, setEditAmount] = useState("");
    const [editType, setEditType] = useState("");
    const [darkMode, setDarkMode] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const [showQR, setShowQR] = useState(false);
    const [voiceListening, setVoiceListening] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);

    const nameInputRef = useRef(null);
    const phoneInputRef = useRef(null);
    const amountInputRef = useRef(null);

    useEffect(() => {
        if (!user) { navigate("/login"); return; }
        const ownerRef = ref(db, "owners/" + user.uid);
        onValue(ownerRef, (snap) => {
            const data = snap.val();
            if (data) setOwnerName(data.name || "User");
            if (data && data.customers) setCustomers(data.customers);
            else setCustomers({});
        });
    }, [user, navigate]);

    useEffect(() => {
        if (darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [darkMode]);

    useEffect(() => {
        if (selectedCustomer) {
            amountInputRef.current?.focus();
        }
    }, [selectedCustomer]);

    const startVoiceInput = () => {
        if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            alert("Voice input not supported in your browser");
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = "en-IN";
        recognition.onstart = () => setVoiceListening(true);
        recognition.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            const numbers = transcript.match(/\d+/g);
            if (numbers) setAmount(numbers.join(""));
            setVoiceListening(false);
        };
        recognition.onerror = () => setVoiceListening(false);
        recognition.onend = () => setVoiceListening(false);
        recognition.start();
    };

    const handleLogout = () => { signOut(auth).then(() => navigate("/login")) };

    const handleSelectCustomer = (key) => {
        setSelectedCustomer({ key, data: customers[key] });
        setFilterDate("");
        setTransactionDone(false);
        setEditTxn(null);
        setShowQR(false);
        setShowProfileModal(false);
        setAmount("");
    };

    const handleCreateCustomer = async () => {
        if (!customerName.trim() || !customerPhone.trim()) {
            alert("Please enter both name and phone number!");
            return;
        }
        const normalizedName = customerName.trim();
        if (customers[normalizedName]) {
            alert("Customer with this name already exists!");
            return;
        }
        const custRef = ref(db, `owners/${user.uid}/customers/${normalizedName}`);
        await set(custRef, {
            name: normalizedName,
            phone: customerPhone.trim(),
            transactions: {}
        });
        setCustomerName("");
        setCustomerPhone("");
        setSelectedCustomer({ key: normalizedName, data: { name: normalizedName, phone: customerPhone.trim(), transactions: {} } });
        nameInputRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            if (e.target === nameInputRef.current) {
                phoneInputRef.current?.focus();
            } else if (e.target === phoneInputRef.current) {
                handleCreateCustomer();
            }
        }
    };

    const handleAddTransaction = (type) => {
        if (!amount || !selectedCustomer || isNaN(amount) || Number(amount) <= 0) {
            alert("Please enter a valid amount!");
            return;
        }

        const txnRef = ref(db, `owners/${user.uid}/customers/${selectedCustomer.key}/transactions`);
        const newTxn = push(txnRef);
        set(newTxn, {
            type,
            amount: Number(amount),
            date: new Date().toISOString()
        });

        setAmount("");
        setTransactionDone(true);

        setTimeout(() => {
            amountInputRef.current?.focus();
            setTransactionDone(false);
        }, 800);
    };

    const handleAmountKeyDown = (e) => {
        if (e.key === "Enter") {
            handleAddTransaction("add");
        }
    };

    const handleEditTransaction = (key, txn) => {
        setEditTxn(key);
        setEditAmount(txn.amount);
        setEditType(txn.type);
    };

    const saveEditTransaction = async () => {
        if (!editTxn || !selectedCustomer) return;
        const txnRef = ref(db, `owners/${user.uid}/customers/${selectedCustomer.key}/transactions/${editTxn}`);
        await update(txnRef, { amount: Number(editAmount), type: editType });
        setEditTxn(null);
    };

    const confirmDeleteCustomer = (key) => {
        setCustomerToDelete(key);
        setShowDeleteModal(true);
    };

    const deleteCustomer = async () => {
        if (!customerToDelete) return;
        const custRef = ref(db, `owners/${user.uid}/customers/${customerToDelete}`);
        await remove(custRef);
        setShowDeleteModal(false);
        setCustomerToDelete(null);
        if (selectedCustomer?.key === customerToDelete) setSelectedCustomer(null);
    };

    const calculateDue = (txns) => {
        let due = 0;
        if (!txns) return 0;
        Object.values(txns).forEach((t) => {
            if (t.type === "add") due += Number(t.amount);
            if (t.type === "pay") due -= Number(t.amount);
        });
        return due;
    };

    const totalDueAll = () => {
        let total = 0;
        Object.values(customers).forEach(cust => total += calculateDue(cust.transactions));
        return total;
    };

    const todaysTransactions = () => {
        const today = new Date().toISOString().slice(0, 10);
        let count = 0;
        Object.values(customers).forEach(cust => {
            if (cust.transactions) {
                Object.values(cust.transactions).forEach(t => {
                    if (t.date.startsWith(today)) count++;
                });
            }
        });
        return count;
    };

    const filteredTransactions = () => {
        if (!selectedCustomer || !selectedCustomer.data.transactions) return [];
        let txns = Object.entries(selectedCustomer.data.transactions)
            .map(([key, value]) => ({ key, ...value }))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        if (filterDate) txns = txns.filter(t => t.date.startsWith(filterDate));
        return txns;
    };

    const getRunningBalance = () => {
        const txns = filteredTransactions();
        let balance = 0;
        return txns.map(t => {
            if (t.type === "add") balance += t.amount;
            else balance -= t.amount;
            return { ...t, runningBalance: balance };
        });
    };

    const exportToCSV = () => {
        if (!selectedCustomer) return;
        const txns = getRunningBalance();
        let csv = "Date,Type,Amount,Running Balance\n";
        txns.forEach(t => {
            csv += `${new Date(t.date).toLocaleString()},${t.type === "add" ? "Added" : "Paid"},${t.amount},${t.runningBalance}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedCustomer.data.name}_full_history.csv`;
        a.click();
    };

    const searchResults = () => {
        if (!searchCustomer) return Object.keys(customers);
        return Object.keys(customers).filter((key) =>
            key.toLowerCase().includes(searchCustomer.toLowerCase()) ||
            customers[key].phone?.includes(searchCustomer)
        );
    };

    const getCustomerStats = (cust) => {
        if (!cust.transactions || Object.keys(cust.transactions).length === 0) {
            return { totalTxns: 0, firstDate: "No transactions yet" };
        }
        const txns = Object.values(cust.transactions);
        const dates = txns.map(t => new Date(t.date));
        const firstDate = new Date(Math.min(...dates)).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        return { totalTxns: txns.length, firstDate };
    };

    const getLastTransactionDate = (cust) => {
        if (!cust.transactions || Object.keys(cust.transactions).length === 0) return null;
        const dates = Object.values(cust.transactions).map(t => new Date(t.date));
        return new Date(Math.max(...dates));
    };

    const isActive = (path) => location.pathname === path;

    return (
        <div className={`min-h-screen ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'} transition-colors duration-500 relative`}>
            {/* Beautiful Top-Left Logo */}
            <div className="absolute top-6 left-6 z-30 pointer-events-none">
                <div className="group relative">
                    <img
                        src={logo}
                        alt="App Logo"
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-2xl border-4 border-transparent 
                                   transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 
                                   group-hover:shadow-cyan-500/60 group-hover:border-cyan-400/60"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-600 
                                    opacity-0 group-hover:opacity-40 blur-xl transition-opacity duration-500"></div>
                </div>
            </div>

            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pt-28 sm:pt-32"> {/* Extra top padding for logo */}

                {/* Beautiful Navbar with Active Highlight */}
                <div className="mb-12">
                    <div className="flex flex-wrap justify-center gap-5 sm:gap-6 lg:gap-8 px-4">
                        <button className={`group relative px-8 py-5 rounded-3xl overflow-hidden text-white font-bold text-lg shadow-2xl transform transition-all duration-500 hover:scale-105
                            ${isActive('/') || isActive('/dashboard')
                                ? 'bg-gradient-to-br from-cyan-500 to-blue-700 shadow-cyan-500/80 scale-105 ring-4 ring-cyan-400/50'
                                : 'bg-gradient-to-br from-blue-600 to-cyan-500 hover:shadow-cyan-500/60'}`}>
                            <span className="relative z-10 flex items-center gap-3">
                                🏠 Dashboard
                            </span>
                            <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-150 transition-transform duration-700 origin-center rounded-full"></div>
                        </button>

                        <button onClick={() => navigate("/daily-account")} className={`group relative px-8 py-5 rounded-3xl overflow-hidden text-white font-bold text-lg shadow-2xl transform transition-all duration-500 hover:scale-105
                            ${isActive('/daily-account')
                                ? 'bg-gradient-to-br from-pink-500 to-purple-700 shadow-pink-500/80 scale-105 ring-4 ring-pink-400/50'
                                : 'bg-gradient-to-br from-purple-600 to-pink-600 hover:shadow-pink-500/60'}`}>
                            <span className="relative z-10 flex items-center gap-3">
                                📅 Daily Account
                            </span>
                            <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-150 transition-transform duration-700 origin-center rounded-full"></div>
                        </button>

                        <button onClick={() => navigate("/daily-expense")} className={`group relative px-8 py-5 rounded-3xl overflow-hidden text-white font-bold text-lg shadow-2xl transform transition-all duration-500 hover:scale-105
                            ${isActive('/daily-expense')
                                ? 'bg-gradient-to-br from-orange-500 to-amber-600 shadow-orange-500/80 scale-105 ring-4 ring-orange-400/50'
                                : 'bg-gradient-to-br from-amber-500 to-orange-600 hover:shadow-orange-500/60'}`}>
                            <span className="relative z-10 flex items-center gap-3">
                                💸 Daily Expense Calculation
                            </span>
                            <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-150 transition-transform duration-700 origin-center rounded-full"></div>
                        </button>

                        <button onClick={() => navigate("/reports")} className={`group relative px-8 py-5 rounded-3xl overflow-hidden text-white font-bold text-lg shadow-2xl transform transition-all duration-500 hover:scale-105
                            ${isActive('/reports')
                                ? 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/80 scale-105 ring-4 ring-teal-400/50'
                                : 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:shadow-teal-500/60'}`}>
                            <span className="relative z-10 flex items-center gap-3">
                                📊 Reports
                            </span>
                            <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-150 transition-transform duration-700 origin-center rounded-full"></div>
                        </button>

                        <button onClick={() => navigate("/customers")} className={`group relative px-8 py-5 rounded-3xl overflow-hidden text-white font-bold text-lg shadow-2xl transform transition-all duration-500 hover:scale-105
                            ${isActive('/customers')
                                ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/80 scale-105 ring-4 ring-red-400/50'
                                : 'bg-gradient-to-br from-rose-500 to-red-600 hover:shadow-red-500/60'}`}>
                            <span className="relative z-10 flex items-center gap-3">
                                👥 All Customers
                            </span>
                            <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-150 transition-transform duration-700 origin-center rounded-full"></div>
                        </button>

                        <button onClick={() => navigate("/settings")} className={`group relative px-8 py-5 rounded-3xl overflow-hidden text-white font-bold text-lg shadow-2xl transform transition-all duration-500 hover:scale-105
                            ${isActive('/settings')
                                ? 'bg-gradient-to-br from-gray-400 to-gray-700 shadow-gray-400/80 scale-105 ring-4 ring-gray-300/50'
                                : 'bg-gradient-to-br from-gray-600 to-gray-800 hover:shadow-gray-500/60'}`}>
                            <span className="relative z-10 flex items-center gap-3">
                                ⚙️ Settings
                            </span>
                            <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-150 transition-transform duration-700 origin-center rounded-full"></div>
                        </button>
                    </div>
                </div>

                {/* Header */}
                <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Hello, {ownerName || "Boss"}</h1>
                        <p className="text-xl sm:text-2xl mt-3 opacity-80">
                            Total Receivable: <span className={`font-bold text-3xl sm:text-4xl ${totalDueAll() > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {totalDueAll()} Tk
                            </span>
                        </p>
                    </div>
                    <div className="flex gap-3 sm:gap-4 items-center">
                        <button onClick={() => setDarkMode(!darkMode)} className="p-3 sm:p-4 rounded-xl border border-gray-600 hover:bg-gray-800 transition">
                            {darkMode ? '☀️' : '🌙'}
                        </button>
                        <button onClick={handleLogout} className="px-6 sm:px-10 py-3 sm:py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition text-sm sm:text-base">
                            Logout
                        </button>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-center">
                        <p className="text-base sm:text-lg opacity-70">Total Customers</p>
                        <p className="text-4xl sm:text-5xl font-bold mt-2">{Object.keys(customers).length}</p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-center">
                        <p className="text-base sm:text-lg opacity-70">Today's Activity</p>
                        <p className="text-4xl sm:text-5xl font-bold mt-2">{todaysTransactions()}</p>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-center">
                        <p className="text-base sm:text-lg opacity-70">Total Due</p>
                        <p className={`text-4xl sm:text-5xl font-bold mt-2 ${totalDueAll() > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {totalDueAll()} Tk
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
                    {/* Customers Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-3xl p-6 flex flex-col h-full shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
                                <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-full text-lg font-bold shadow-lg">
                                    {Object.keys(customers).length}
                                </div>
                            </div>

                            <input
                                type="text"
                                placeholder="🔍 Search name or phone..."
                                className="w-full bg-gray-800/60 border border-gray-700 rounded-2xl px-5 py-4 focus:outline-none focus:border-purple-500 transition-all duration-300 placeholder-gray-500"
                                value={searchCustomer}
                                onChange={(e) => setSearchCustomer(e.target.value)}
                            />

                            <div className="flex-1 overflow-y-auto my-6 space-y-4 pr-1 max-h-96 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                                {searchResults().length === 0 ? (
                                    <p className="text-center text-gray-500 py-8">No customers found</p>
                                ) : (
                                    searchResults().map((key) => {
                                        const cust = customers[key];
                                        const due = calculateDue(cust.transactions);
                                        const lastTxn = getLastTransactionDate(cust);
                                        const daysAgo = lastTxn ? Math.floor((Date.now() - lastTxn.getTime()) / (1000 * 60 * 60 * 24)) : null;

                                        return (
                                            <div
                                                key={key}
                                                onClick={() => handleSelectCustomer(key)}
                                                className={`
                                                    relative group bg-gray-800/50 backdrop-blur-sm border rounded-2xl p-5 cursor-pointer
                                                    transition-all duration-300 hover:bg-gray-800/80 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-900/20
                                                    ${selectedCustomer?.key === key ? 'border-purple-500 shadow-xl shadow-purple-900/30 ring-2 ring-purple-500/30' : 'border-gray-700'}
                                                `}
                                            >
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); confirmDeleteCustomer(key); }}
                                                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-red-600/20 text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 hover:text-white flex items-center justify-center"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>

                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                                        {cust.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-lg truncate">{cust.name}</h4>
                                                        <p className="text-sm text-gray-400 truncate">📞 {cust.phone}</p>
                                                        {daysAgo !== null && daysAgo > 0 && (
                                                            <p className="text-xs text-gray-500 mt-1">Last txn: {daysAgo} days ago</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex justify-between items-end">
                                                    <span className="text-xs text-gray-500">Balance</span>
                                                    <span className={`text-2xl font-extrabold ${due > 0 ? 'text-red-400' : due < 0 ? 'text-green-400' : 'text-gray-500'}`}>
                                                        {due > 0 ? '+' : due < 0 ? '-' : ''}{Math.abs(due)} Tk
                                                    </span>
                                                </div>
                                                {due === 0 && <p className="text-xs text-center text-green-500 mt-2 font-medium">All Clear ✓</p>}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Add New Customer Form */}
                            <div className="border-t border-gray-700 pt-6 space-y-4">
                                <h3 className="text-lg font-semibold text-center mb-4">Add New Customer</h3>
                                <input
                                    ref={nameInputRef}
                                    placeholder="Full Name"
                                    className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-5 py-4 focus:outline-none focus:border-purple-500 transition placeholder-gray-500"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                                <input
                                    ref={phoneInputRef}
                                    placeholder="Phone Number"
                                    className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-5 py-4 focus:outline-none focus:border-purple-500 transition placeholder-gray-500"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                                <button
                                    onClick={handleCreateCustomer}
                                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 rounded-xl font-bold transition-all duration-300 shadow-lg"
                                >
                                    ➕ Create Customer
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-6">
                        {selectedCustomer ? (
                            <>
                                <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
                                        <div>
                                            <h3 className="text-3xl sm:text-4xl font-bold">{selectedCustomer.data.name}</h3>
                                            <p className="text-xl sm:text-2xl mt-2 opacity-70">📞 {selectedCustomer.data.phone}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-base sm:text-lg opacity-70">Current Due</p>
                                            <p className={`text-4xl sm:text-6xl font-bold ${calculateDue(selectedCustomer.data.transactions) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                {calculateDue(selectedCustomer.data.transactions)} Tk
                                            </p>
                                            <button
                                                onClick={() => setShowProfileModal(true)}
                                                className="mt-4 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition text-sm sm:text-base"
                                            >
                                                👤 Customer Info
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div className="relative col-span-2 lg:col-span-1">
                                            <input
                                                ref={amountInputRef}
                                                type="number"
                                                placeholder="Amount"
                                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-5 py-6 text-2xl sm:text-3xl text-center focus:outline-none focus:border-white"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                onKeyDown={handleAmountKeyDown}
                                            />
                                            <button onClick={startVoiceInput} className={`absolute right-4 top-1/2 -translate-y-1/2 text-2xl sm:text-3xl ${voiceListening ? 'animate-pulse' : ''}`}>
                                                {voiceListening ? '🎙️' : '🎤'}
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => handleAddTransaction("add")}
                                            className="bg-red-600 hover:bg-red-700 py-6 rounded-xl font-bold text-xl shadow-lg transform hover:scale-105 transition-all"
                                        >
                                            ➕ Add Due
                                        </button>
                                        <button
                                            onClick={() => handleAddTransaction("pay")}
                                            className="bg-green-600 hover:bg-green-700 py-6 rounded-xl font-bold text-xl shadow-lg transform hover:scale-105 transition-all"
                                        >
                                            ✔️ Received
                                        </button>
                                        <button onClick={() => setShowQR(true)} className="bg-gray-700 hover:bg-gray-600 py-6 rounded-xl font-bold text-lg transition">
                                            QR Share
                                        </button>
                                    </div>

                                    {transactionDone && (
                                        <p className="text-center mt-6 text-2xl text-green-400 font-bold animate-pulse">
                                            ✅ Transaction Added!
                                        </p>
                                    )}
                                </div>

                                {/* Transaction History */}
                                <div className="bg-gray-900/70 border border-gray-800 rounded-2xl overflow-hidden">
                                    <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                            <label className="text-lg font-semibold">Filter:</label>
                                            <input type="date" className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                                        </div>
                                        <button onClick={exportToCSV} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition text-sm sm:text-base">
                                            📄 Export History
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[650px]">
                                            <thead className="bg-gray-800">
                                                <tr>
                                                    <th className="p-4 text-left text-sm sm:text-base">Date</th>
                                                    <th className="p-4 text-left text-sm sm:text-base">Type</th>
                                                    <th className="p-4 text-left text-sm sm:text-base">Amount</th>
                                                    <th className="p-4 text-left text-sm sm:text-base">Balance</th>
                                                    <th className="p-4 text-left text-sm sm:text-base">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {getRunningBalance().map((t) => (
                                                    <tr key={t.key} className="border-b border-gray-800 hover:bg-gray-800/50">
                                                        <td className="p-4 text-sm opacity-80">{new Date(t.date).toLocaleDateString()}</td>
                                                        <td className="p-4">
                                                            {editTxn === t.key ? (
                                                                <select className="bg-gray-700 rounded px-3 py-2 text-sm" value={editType} onChange={(e) => setEditType(e.target.value)}>
                                                                    <option value="add">Added</option>
                                                                    <option value="pay">Paid</option>
                                                                </select>
                                                            ) : (
                                                                <span className={`font-bold ${t.type === "add" ? "text-red-500" : "text-green-500"}`}>
                                                                    {t.type === "add" ? "+ Added" : "− Paid"}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 font-bold text-lg">
                                                            {editTxn === t.key ? <input type="number" className="bg-gray-700 rounded px-3 py-1 w-24 text-sm" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} /> : t.amount + " Tk"}
                                                        </td>
                                                        <td className={`p-4 font-bold text-lg ${t.runningBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                            {t.runningBalance} Tk
                                                        </td>
                                                        <td className="p-4">
                                                            {editTxn === t.key ? (
                                                                <button onClick={saveEditTransaction} className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded text-xs sm:text-sm font-bold transition">Save</button>
                                                            ) : (
                                                                <button onClick={() => handleEditTransaction(t.key, t)} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-xs sm:text-sm transition">Edit</button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-12 sm:p-20 text-center">
                                <p className="text-2xl sm:text-4xl opacity-60 font-medium">Select a customer to view details</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modals */}
                {showQR && selectedCustomer && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setShowQR(false)}>
                        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-2xl sm:text-3xl font-bold text-center mb-6">Share with {selectedCustomer.data.name}</h3>
                            <div className="bg-white p-6 rounded-2xl mx-auto max-w-[220px]">
                                <QRCode value={`tel:${selectedCustomer.data.phone}`} size={200} />
                            </div>
                            <p className="text-center text-lg mt-6 opacity-80">Scan to Call</p>
                            <button onClick={() => setShowQR(false)} className="mt-8 w-full py-4 bg-red-600 hover:bg-red-700 rounded-2xl font-bold text-lg transition">
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {showDeleteModal && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
                        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full">
                            <h3 className="text-2xl sm:text-3xl font-bold text-red-500 mb-4">Delete Customer?</h3>
                            <p className="text-base sm:text-lg mb-8">All data of <strong>{customers[customerToDelete]?.name}</strong> will be permanently deleted.</p>
                            <div className="flex flex-col sm:flex-row justify-end gap-4">
                                <button onClick={() => setShowDeleteModal(false)} className="px-8 py-3 border border-gray-600 rounded-xl hover:bg-gray-800 transition order-2 sm:order-1">
                                    Cancel
                                </button>
                                <button onClick={deleteCustomer} className="px-10 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-bold transition order-1 sm:order-2">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showProfileModal && selectedCustomer && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setShowProfileModal(false)}>
                        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 sm:p-10 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="text-center">
                                <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-6 bg-gradient-to-br from-blue-600 to-purple-700 rounded-full flex items-center justify-center text-5xl sm:text-7xl font-bold shadow-2xl">
                                    {selectedCustomer.data.name.charAt(0).toUpperCase()}
                                </div>
                                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3">{selectedCustomer.data.name}</h2>
                                <p className="text-xl sm:text-2xl lg:text-3xl opacity-80 mb-8 flex items-center justify-center gap-2">
                                    <span>📞</span> {selectedCustomer.data.phone}
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
                                    <div className="bg-gray-800/50 rounded-2xl p-6">
                                        <p className="text-lg sm:text-xl opacity-70">Current Due</p>
                                        <p className={`text-3xl sm:text-4xl font-bold mt-3 ${calculateDue(selectedCustomer.data.transactions) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                            {calculateDue(selectedCustomer.data.transactions)} Tk
                                        </p>
                                    </div>
                                    <div className="bg-gray-800/50 rounded-2xl p-6">
                                        <p className="text-lg sm:text-xl opacity-70">Total Transactions</p>
                                        <p className="text-3xl sm:text-4xl font-bold mt-3">
                                            {getCustomerStats(selectedCustomer.data).totalTxns}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-gray-800/50 rounded-2xl p-6">
                                    <p className="text-lg sm:text-xl opacity-70">Customer Since</p>
                                    <p className="text-2xl sm:text-3xl font-semibold mt-3">
                                        {getCustomerStats(selectedCustomer.data).firstDate}
                                    </p>
                                </div>

                                <button
                                    onClick={() => setShowProfileModal(false)}
                                    className="mt-10 w-full py-4 sm:py-5 bg-red-600 hover:bg-red-700 rounded-2xl font-bold text-lg sm:text-xl transition"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}