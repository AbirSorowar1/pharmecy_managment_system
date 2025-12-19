import { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase";
import { ref, onValue, push, update, remove } from "firebase/database";
import { useNavigate } from "react-router-dom";

export default function DailyExpenseCalculation() {
    const navigate = useNavigate();
    const user = auth.currentUser;
    const [ownerName, setOwnerName] = useState("");
    const [dailyEntries, setDailyEntries] = useState({});
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [darkMode, setDarkMode] = useState(true);

    // Refs for inputs
    const amountRef = useRef(null);
    const descriptionRef = useRef(null);

    // আজকের তারিখ ফোর্স করা
    useEffect(() => {
        const today = new Date().toISOString().slice(0, 10);
        setSelectedDate(today);
    }, []);

    useEffect(() => {
        if (!user) {
            navigate("/login");
            return;
        }

        const ownerRef = ref(db, "owners/" + user.uid);
        const unsubscribe = onValue(ownerRef, (snap) => {
            const data = snap.val();
            if (data) {
                setOwnerName(data.name || "Boss");
                setDailyEntries(data.dailyIncome || {});
            }
        });

        return () => unsubscribe();
    }, [user, navigate]);

    useEffect(() => {
        if (darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [darkMode]);

    // Enter key to add
    useEffect(() => {
        const handleEnter = (e) => {
            if (e.key === "Enter" && amount && !isNaN(amount) && Number(amount) > 0) {
                handleAddIncome();
            }
        };

        const amountInput = amountRef.current;
        const descInput = descriptionRef.current;

        amountInput?.addEventListener("keydown", handleEnter);
        descInput?.addEventListener("keydown", handleEnter);

        return () => {
            amountInput?.removeEventListener("keydown", handleEnter);
            descInput?.removeEventListener("keydown", handleEnter);
        };
    }, [amount, description, selectedDate]);

    const handleAddIncome = () => {
        if (!amount || isNaN(amount) || Number(amount) <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        const dateKey = selectedDate;
        const entryRef = ref(db, `owners/${user.uid}/dailyIncome/${dateKey}`);

        push(entryRef, {
            amount: Number(amount),
            description: description.trim() || "Daily Income",
            timestamp: new Date().toISOString()
        });

        setAmount("");
        setDescription("");
        amountRef.current?.focus();
    };

    const handleUpdateEntry = (dateKey, entryKey, newAmount, newDescription) => {
        if (!newAmount || isNaN(newAmount) || Number(newAmount) <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        const entryRef = ref(db, `owners/${user.uid}/dailyIncome/${dateKey}/${entryKey}`);
        update(entryRef, {
            amount: Number(newAmount),
            description: newDescription.trim() || "Daily Income",
            timestamp: new Date().toISOString()
        });
    };

    const handleDeleteEntry = (dateKey, entryKey) => {
        if (window.confirm("Are you sure you want to delete this entry?")) {
            const entryRef = ref(db, `owners/${user.uid}/dailyIncome/${dateKey}/${entryKey}`);
            remove(entryRef);
        }
    };

    const getEntriesForDate = (date) => {
        if (!dailyEntries[date]) return [];
        return Object.entries(dailyEntries[date])
            .map(([key, value]) => ({ key, ...value }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    };

    const calculateTotalForDate = (date) => {
        if (!dailyEntries[date]) return 0;
        return Object.values(dailyEntries[date] || {}).reduce((sum, entry) => sum + Number(entry.amount), 0);
    };

    const calculateMonthlyTotal = () => {
        const month = selectedDate.slice(0, 7);
        return Object.keys(dailyEntries).reduce((total, date) => {
            if (date.startsWith(month)) {
                return total + calculateTotalForDate(date);
            }
            return total;
        }, 0);
    };

    const allDates = Object.keys(dailyEntries).sort((a, b) => b.localeCompare(a));

    return (
        <div className={`min-h-screen ${darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'} transition-all duration-700`}>
            <div className="p-6 sm:p-8 lg:p-12 max-w-7xl mx-auto">

                {/* Updated Navigation Bar - Daily Income button added */}
                <div className="mb-12 flex flex-wrap justify-center gap-5">
                    {[
                        { to: "/dashboard", label: "🏠 Dashboard", gradient: "from-blue-600 to-cyan-600" },
                        { to: "/daily-account", label: "💰 Daily Income", gradient: "from-purple-600 to-pink-600" },
                        { active: true, label: "💸 Daily Expense Calculation", gradient: "from-amber-600 to-orange-600" },
                        { to: "/reports", label: "📊 Reports", gradient: "from-green-600 to-teal-600" },
                        { to: "/customers", label: "👥 Customers", gradient: "from-orange-600 to-red-600" },
                        { to: "/settings", label: "⚙️ Settings", gradient: "from-gray-600 to-gray-800" },
                    ].map((btn, i) => (
                        <button
                            key={i}
                            onClick={() => btn.to && navigate(btn.to)}
                            className={`px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex items-center gap-3
                                ${btn.active
                                    ? 'bg-gradient-to-r ' + btn.gradient + ' text-white scale-105 shadow-orange-500/60'
                                    : 'bg-gradient-to-r ' + btn.gradient + ' text-white hover:shadow-lg'}`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                {/* Header - Expense এর জন্য চেঞ্জ করা */}
                <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                            Daily Expense Calculation
                        </h1>
                        <p className="text-xl mt-4 opacity-80">Welcome back, <span className="font-semibold text-orange-400">{ownerName}</span></p>
                    </div>
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="p-4 rounded-2xl bg-gray-800/50 border border-gray-700 hover:bg-gray-700/70 transition-all duration-300 text-2xl"
                    >
                        {darkMode ? '☀️' : '🌙'}
                    </button>
                </div>

                {/* Add Income Card */}
                <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 mb-10 shadow-2xl">
                    <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                        Add New Income
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-gray-800/70 border border-gray-700 rounded-2xl px-6 py-5 text-lg focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 transition-all"
                        />
                        <input
                            ref={amountRef}
                            type="number"
                            placeholder="Amount in Tk"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="bg-gray-800/70 border border-gray-700 rounded-2xl px-6 py-5 text-3xl font-bold text-center focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/30 transition-all placeholder-gray-500"
                        />
                        <button
                            onClick={handleAddIncome}
                            disabled={!amount || isNaN(amount) || Number(amount) <= 0}
                            className="bg-gradient-to-r from-green-500 to-emerald-600 py-5 rounded-2xl font-bold text-xl shadow-lg hover:shadow-green-500/50 transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            ➕ Add Income
                        </button>
                    </div>
                    <input
                        ref={descriptionRef}
                        type="text"
                        placeholder="Description (optional) – Press Enter to add quickly"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl px-6 py-5 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all placeholder-gray-500"
                    />
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    {[
                        { title: "Today's Total", value: calculateTotalForDate(selectedDate), color: "from-green-500 to-emerald-600" },
                        { title: "This Month", value: calculateMonthlyTotal(), color: "from-purple-500 to-pink-600" },
                        { title: "Entries Today", value: getEntriesForDate(selectedDate).length, color: "from-orange-500 to-red-600" },
                    ].map((card, i) => (
                        <div key={i} className={`bg-gradient-to-br ${card.color} rounded-3xl p-8 text-center shadow-2xl transform hover:scale-105 transition-all duration-500`}>
                            <p className="text-xl opacity-90 mb-4">{card.title}</p>
                            <p className="text-6xl font-extrabold">
                                {card.title.includes("Entries") ? card.value : `${card.value} Tk`}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Income History */}
                <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-gray-800">
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                            Income History
                        </h2>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {allDates.length === 0 ? (
                            <div className="p-20 text-center">
                                <p className="text-3xl opacity-50">No income recorded yet</p>
                                <p className="mt-4 text-lg opacity-70">Start adding your daily income above ↑</p>
                            </div>
                        ) : (
                            allDates.map((date) => (
                                <div
                                    key={date}
                                    className={`border-b border-gray-800 last:border-0 cursor-pointer transition-all duration-300 hover:bg-gray-800/60 ${selectedDate === date ? 'bg-gray-800/80' : ''}`}
                                    onClick={() => setSelectedDate(date)}
                                >
                                    <div className="p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <div>
                                                <h3 className="text-2xl font-bold">
                                                    {new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                </h3>
                                                <p className="text-sm opacity-70 mt-1">{getEntriesForDate(date).length} entries</p>
                                            </div>
                                            <p className="text-4xl font-extrabold text-green-400">
                                                +{calculateTotalForDate(date)} Tk
                                            </p>
                                        </div>

                                        {selectedDate === date && (
                                            <div className="mt-6 space-y-4 pl-6 border-l-4 border-green-500">
                                                {getEntriesForDate(date).map((entry) => (
                                                    <div key={entry.key} className="bg-gray-800/70 rounded-2xl p-5 flex justify-between items-center shadow-inner">
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-lg">{entry.description}</p>
                                                            <p className="text-sm opacity-70">
                                                                {new Date(entry.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                        <p className="text-2xl font-bold text-green-400 mx-8">+{entry.amount} Tk</p>
                                                        <div className="flex gap-3">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newAmount = prompt("Edit amount (Tk):", entry.amount);
                                                                    const newDesc = prompt("Edit description:", entry.description);
                                                                    if (newAmount !== null && newDesc !== null) {
                                                                        handleUpdateEntry(date, entry.key, newAmount, newDesc);
                                                                    }
                                                                }}
                                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium transition"
                                                            >
                                                                ✏️ Edit
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteEntry(date, entry.key);
                                                                }}
                                                                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-medium transition"
                                                            >
                                                                🗑️ Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}