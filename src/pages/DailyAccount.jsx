import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useNavigate } from "react-router-dom";

export default function DailyAccount() {
    const navigate = useNavigate();
    const user = auth.currentUser;
    const [ownerName, setOwnerName] = useState("");
    const [customers, setCustomers] = useState({});
    const [dailyIncome, setDailyIncome] = useState({});
    const [dailySummaries, setDailySummaries] = useState([]);
    const [filteredSummaries, setFilteredSummaries] = useState([]); // নতুন: ফিল্টার করা লিস্ট
    const [darkMode, setDarkMode] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [dateTransactions, setDateTransactions] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(""); // YYYY-MM

    useEffect(() => {
        if (!user) {
            navigate("/login");
            return;
        }

        const ownerRef = ref(db, `owners/${user.uid}`);
        const unsubscribe = onValue(ownerRef, (snap) => {
            const data = snap.val();
            if (data) {
                setOwnerName(data.name || "Boss");
                setCustomers(data.customers || {});
                setDailyIncome(data.dailyIncome || {});
                processDailySummaries(data.customers || {}, data.dailyIncome || {});
            }
        });

        return () => unsubscribe();
    }, [user, navigate]);

    useEffect(() => {
        if (darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [darkMode]);

    // ESC key for modal close
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape" && selectedDate) {
                closeModal();
            }
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [selectedDate]);

    const processDailySummaries = (customersData, incomeData) => {
        const summaries = {};
        const allTransactions = {};

        // Customer transactions
        Object.entries(customersData).forEach(([custKey, cust]) => {
            if (cust.transactions) {
                Object.entries(cust.transactions).forEach(([txnKey, t]) => {
                    const dateKey = t.date.slice(0, 10);
                    if (!summaries[dateKey]) {
                        summaries[dateKey] = { received: 0, added: 0, income: 0, txns: 0 };
                        allTransactions[dateKey] = [];
                    }
                    if (t.type === "pay") summaries[dateKey].received += Number(t.amount);
                    if (t.type === "add") summaries[dateKey].added += Number(t.amount);
                    summaries[dateKey].txns += 1;

                    allTransactions[dateKey].push({
                        type: "customer",
                        customerName: cust.name,
                        customerPhone: cust.phone || "N/A",
                        action: t.type === "pay" ? "Received" : "Added Due",
                        amount: Number(t.amount),
                        sign: t.type === "pay" ? "+" : "-",
                        fullDate: t.date,
                        color: t.type === "pay" ? "text-green-400" : "text-red-400"
                    });
                });
            }
        });

        // Daily Income
        Object.keys(incomeData).forEach(date => {
            if (!summaries[date]) {
                summaries[date] = { received: 0, added: 0, income: 0, txns: 0 };
                allTransactions[date] = [];
            }
            Object.values(incomeData[date] || {}).forEach(entry => {
                summaries[date].income += Number(entry.amount);
                summaries[date].txns += 1;

                allTransactions[date].push({
                    type: "income",
                    description: entry.description || "Daily Income",
                    amount: Number(entry.amount),
                    sign: "+",
                    fullDate: entry.timestamp,
                    color: "text-cyan-400"
                });
            });
        });

        const sortedSummaries = Object.entries(summaries)
            .map(([date, data]) => ({
                date,
                month: date.slice(0, 7), // YYYY-MM
                ...data,
                net: data.received + data.income - data.added,
                transactions: allTransactions[date] || []
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        setDailySummaries(sortedSummaries);
    };

    // Available months বের করা
    const availableMonths = Array.from(new Set(dailySummaries.map(s => s.month)))
        .sort((a, b) => b.localeCompare(a)); // সর্বশেষ মাস উপরে

    // ডিফল্ট: বর্তমান মাস
    useEffect(() => {
        if (availableMonths.length > 0 && !selectedMonth) {
            const currentMonth = new Date().toISOString().slice(0, 7);
            setSelectedMonth(availableMonths.includes(currentMonth) ? currentMonth : availableMonths[0]);
        }
    }, [availableMonths]);

    // Month change এ ফিল্টার
    useEffect(() => {
        if (selectedMonth) {
            setFilteredSummaries(
                dailySummaries.filter(summary => summary.month === selectedMonth)
            );
        } else {
            setFilteredSummaries(dailySummaries);
        }
    }, [selectedMonth, dailySummaries]);

    const handleShowDetails = (date, transactions) => {
        setSelectedDate(date);
        const sortedTxns = transactions.sort((a, b) => new Date(b.fullDate) - new Date(a.fullDate));
        setDateTransactions(sortedTxns);
    };

    const closeModal = () => {
        setSelectedDate(null);
        setDateTransactions([]);
    };

    const formatMonthName = (yyyyMm) => {
        const date = new Date(yyyyMm + "-01");
        return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    };

    return (
        <div className={`min-h-screen ${darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'} transition-all duration-700`}>
            <div className="p-6 sm:p-8 lg:p-12 max-w-7xl mx-auto">

                {/* Navigation */}
                <div className="mb-12 flex flex-wrap justify-center gap-5">
                    {[
                        { to: "/dashboard", label: "🏠 Dashboard", gradient: "from-blue-600 to-cyan-600" },
                        { active: true, label: "📅 Daily Account", gradient: "from-purple-600 to-pink-600" },
                        { to: "/daily-expense", label: "💸 Daily Expense", gradient: "from-amber-600 to-orange-600" },
                        { to: "/reports", label: "📊 Reports", gradient: "from-green-600 to-teal-600" },
                        { to: "/customers", label: "👥 Customers", gradient: "from-orange-600 to-red-600" },
                        { to: "/settings", label: "⚙️ Settings", gradient: "from-gray-600 to-gray-800" },
                    ].map((btn, i) => (
                        <button
                            key={i}
                            onClick={() => btn.to && navigate(btn.to)}
                            className={`px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex items-center gap-3
                                ${btn.active
                                    ? 'bg-gradient-to-r ' + btn.gradient + ' text-white scale-105 shadow-pink-500/60'
                                    : 'bg-gradient-to-r ' + btn.gradient + ' text-white'}`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                {/* Header */}
                <div className="mb-10 text-center">
                    <h1 className="text-5xl sm:text-6xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        Daily Accounts 📅
                    </h1>
                    <p className="text-xl mt-4 opacity-80">All customer transactions + business income</p>
                </div>

                {/* Month Selector */}
                {availableMonths.length > 0 && (
                    <div className="mb-10 text-center">
                        <label className="text-xl font-semibold mr-6 opacity-90">View Month:</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-8 py-4 rounded-2xl bg-gray-800/70 border border-gray-700 text-lg focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 transition-all"
                        >
                            {availableMonths.map(month => (
                                <option key={month} value={month}>
                                    {formatMonthName(month)}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Table */}
                <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-gray-800 flex justify-between items-center">
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Daily Transaction Summaries {selectedMonth && `- ${formatMonthName(selectedMonth)}`}
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead className="bg-gray-800/70">
                                <tr>
                                    <th className="p-6 text-left text-lg">Date</th>
                                    <th className="p-6 text-left text-lg">Customer Received</th>
                                    <th className="p-6 text-left text-lg">Due Added</th>
                                    <th className="p-6 text-left text-lg">Business Income</th>
                                    <th className="p-6 text-left text-lg font-bold">Net Total</th>
                                    <th className="p-6 text-left text-lg">Actions</th>
                                    <th className="p-6 text-left text-lg">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSummaries.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="p-16 text-center text-2xl opacity-60">
                                            {selectedMonth
                                                ? `No activity recorded in ${formatMonthName(selectedMonth)}`
                                                : "No transactions or income recorded yet"}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSummaries.map((summary) => (
                                        <tr key={summary.date} className="border-b border-gray-800 hover:bg-gray-800/50 transition-all">
                                            <td className="p-6 font-semibold text-lg">
                                                {new Date(summary.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                            </td>
                                            <td className="p-6 text-green-400 font-bold text-xl">{summary.received.toLocaleString()} Tk</td>
                                            <td className="p-6 text-red-400 font-bold text-xl">{summary.added.toLocaleString()} Tk</td>
                                            <td className="p-6 text-cyan-400 font-bold text-xl">{summary.income.toLocaleString()} Tk</td>
                                            <td className={`p-6 font-extrabold text-2xl ${summary.net >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                                {summary.net >= 0 ? '+' : ''}{summary.net.toLocaleString()} Tk
                                            </td>
                                            <td className="p-6 text-center text-lg font-medium">{summary.txns}</td>
                                            <td className="p-6">
                                                <button
                                                    onClick={() => handleShowDetails(summary.date, summary.transactions)}
                                                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold hover:shadow-lg hover:shadow-pink-500/50 transform hover:scale-105 transition-all"
                                                >
                                                    View Details →
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Details Modal */}
                {selectedDate && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={closeModal}>
                        <div className="bg-gray-900/95 border border-gray-700 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                    All Activities – {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </h2>
                                <button onClick={closeModal} className="text-4xl hover:text-red-400 transition transform hover:scale-110">×</button>
                            </div>
                            <div className="space-y-5">
                                {dateTransactions.length === 0 ? (
                                    <p className="text-center text-xl opacity-70">No activity on this date</p>
                                ) : (
                                    dateTransactions.map((txn, idx) => (
                                        <div key={idx} className="bg-gray-800/70 rounded-2xl p-6 flex justify-between items-center shadow-inner hover:shadow-lg transition">
                                            <div>
                                                {txn.type === "customer" ? (
                                                    <>
                                                        <p className="text-xl font-bold">{txn.customerName}</p>
                                                        <p className="text-sm opacity-80">📞 {txn.customerPhone}</p>
                                                    </>
                                                ) : (
                                                    <p className="text-xl font-bold text-cyan-300">{txn.description}</p>
                                                )}
                                                <p className="text-sm opacity-70 mt-1">
                                                    {new Date(txn.fullDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-3xl font-extrabold ${txn.color}`}>
                                                    {txn.sign}{txn.amount.toLocaleString()} Tk
                                                </p>
                                                <p className="text-sm opacity-80">
                                                    {txn.type === "customer" ? txn.action : "Business Income"}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="mt-10 text-center text-sm opacity-70">
                                Press <kbd className="px-3 py-1 bg-gray-800 rounded mx-1">ESC</kbd> to close
                            </div>
                            <button onClick={closeModal} className="mt-6 w-full py-5 bg-gradient-to-r from-red-600 to-pink-600 rounded-2xl font-bold text-xl hover:shadow-lg hover:shadow-red-500/50 transition-all">
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {/* Dark Mode Toggle */}
                <div className="fixed bottom-8 right-8">
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="p-4 rounded-full bg-gray-800/80 backdrop-blur border border-gray-700 shadow-2xl text-2xl hover:scale-110 transition-all"
                    >
                        {darkMode ? '☀️' : '🌙'}
                    </button>
                </div>
            </div>
        </div>
    );
}