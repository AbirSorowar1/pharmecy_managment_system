import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useNavigate } from "react-router-dom";

export default function Reports() {
    const navigate = useNavigate();
    const user = auth.currentUser;
    const [customers, setCustomers] = useState({});
    const [dailyIncome, setDailyIncome] = useState({});
    const [ownerName, setOwnerName] = useState("Boss");
    const [darkMode, setDarkMode] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState("");

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
            }
        });

        return () => unsubscribe();
    }, [user, navigate]);

    useEffect(() => {
        if (darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [darkMode]);

    // সব ইউনিক মাস বের করা
    const getAvailableMonths = () => {
        const months = new Set();

        Object.keys(dailyIncome).forEach(date => {
            months.add(date.slice(0, 7));
        });

        Object.values(customers).forEach(cust => {
            if (cust.transactions) {
                Object.values(cust.transactions).forEach(t => {
                    if (t.timestamp) {
                        months.add(t.timestamp.slice(0, 7));
                    }
                });
            }
        });

        return Array.from(months).sort((a, b) => b.localeCompare(a));
    };

    useEffect(() => {
        const available = getAvailableMonths();
        if (available.length > 0 && !selectedMonth) {
            setSelectedMonth(available[0]);
        }
    }, [dailyIncome, customers]);

    const availableMonths = getAvailableMonths();

    const getMonthlyData = (month) => {
        let income = 0;
        let received = 0;
        let dueGiven = 0;

        Object.keys(dailyIncome).forEach(date => {
            if (date.startsWith(month)) {
                Object.values(dailyIncome[date] || {}).forEach(entry => {
                    income += Number(entry.amount);
                });
            }
        });

        Object.values(customers).forEach(cust => {
            if (cust.transactions) {
                Object.values(cust.transactions).forEach(t => {
                    if (t.timestamp?.startsWith(month)) {
                        if (t.type === "pay") received += Number(t.amount);
                        if (t.type === "add") dueGiven += Number(t.amount);
                    }
                });
            }
        });

        return { income, received, dueGiven, net: received + income - dueGiven };
    };

    const currentMonthData = getMonthlyData(selectedMonth || availableMonths[0] || "");

    const totalReceivedAll = () => {
        let total = 0;
        Object.values(customers).forEach(cust => {
            if (cust.transactions) {
                Object.values(cust.transactions).forEach(t => {
                    if (t.type === "pay") total += Number(t.amount);
                });
            }
        });
        return total;
    };

    const totalDueGivenAll = () => {
        let total = 0;
        Object.values(customers).forEach(cust => {
            if (cust.transactions) {
                Object.values(cust.transactions).forEach(t => {
                    if (t.type === "add") total += Number(t.amount);
                });
            }
        });
        return total;
    };

    const totalDailyIncomeAll = () => {
        let total = 0;
        Object.keys(dailyIncome).forEach(date => {
            Object.values(dailyIncome[date] || {}).forEach(entry => {
                total += Number(entry.amount);
            });
        });
        return total;
    };

    const overallNet = totalReceivedAll() + totalDailyIncomeAll() - totalDueGivenAll();

    const formatMonthName = (yyyyMm) => {
        const date = new Date(yyyyMm + "-01");
        return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    };

    return (
        <div className={`min-h-screen ${darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'} transition-all duration-700`}>
            <div className="p-6 sm:p-8 lg:p-12 max-w-7xl mx-auto">

                {/* Updated Navigation Bar with Daily Expense Button */}
                <div className="mb-12 flex flex-wrap justify-center gap-5">
                    {[
                        { to: "/dashboard", label: "🏠 Dashboard", gradient: "from-blue-600 to-cyan-600" },
                        { to: "/daily-account", label: "💰 Daily Income", gradient: "from-purple-600 to-pink-600" },
                        { to: "/daily-expense", label: "💸 Daily Expense Calculation", gradient: "from-amber-600 to-orange-600" },
                        { active: true, label: "📊 Reports", gradient: "from-green-600 to-teal-600" },
                        { to: "/customers", label: "👥 Customers", gradient: "from-orange-600 to-red-600" },
                        { to: "/settings", label: "⚙️ Settings", gradient: "from-gray-600 to-gray-800" },
                    ].map((btn, i) => (
                        <button
                            key={i}
                            onClick={() => btn.to && navigate(btn.to)}
                            className={`px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex items-center gap-3
                                ${btn.active
                                    ? 'bg-gradient-to-r ' + btn.gradient + ' text-white scale-105 shadow-teal-500/60'
                                    : 'bg-gradient-to-r ' + btn.gradient + ' text-white hover:shadow-orange-500/70'}`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                {/* Header */}
                <div className="mb-10 text-center">
                    <h1 className="text-5xl sm:text-6xl font-extrabold bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent">
                        Business Reports
                    </h1>
                    <p className="text-xl mt-4 opacity-80">Welcome back, <span className="font-bold text-teal-400">{ownerName}</span></p>
                </div>

                {/* Month Selector */}
                {availableMonths.length > 0 && (
                    <div className="mb-12 text-center">
                        <label className="text-xl font-semibold mr-4 opacity-90">Select Month:</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-8 py-4 rounded-2xl bg-gray-800/70 border border-gray-700 text-lg focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/30 transition-all"
                        >
                            {availableMonths.map(month => (
                                <option key={month} value={month}>
                                    {formatMonthName(month)}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Selected Month Summary */}
                {selectedMonth && (
                    <div className="mb-12">
                        <h2 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                            {formatMonthName(selectedMonth)} Summary
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl p-8 text-center shadow-2xl hover:scale-105 transition-all">
                                <p className="text-xl opacity-90 mb-4">Daily Income</p>
                                <p className="text-5xl font-extrabold">{currentMonthData.income.toLocaleString()} Tk</p>
                            </div>
                            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-8 text-center shadow-2xl hover:scale-105 transition-all">
                                <p className="text-xl opacity-90 mb-4">Received from Customers</p>
                                <p className="text-5xl font-extrabold">{currentMonthData.received.toLocaleString()} Tk</p>
                            </div>
                            <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-3xl p-8 text-center shadow-2xl hover:scale-105 transition-all">
                                <p className="text-xl opacity-90 mb-4">Due Given</p>
                                <p className="text-5xl font-extrabold">{currentMonthData.dueGiven.toLocaleString()} Tk</p>
                            </div>
                            <div className={`bg-gradient-to-br ${currentMonthData.net >= 0 ? 'from-purple-500 to-indigo-600' : 'from-orange-500 to-red-600'} rounded-3xl p-10 text-center shadow-2xl hover:scale-105 transition-all`}>
                                <p className="text-2xl opacity-90 mb-6 font-bold">Monthly Net</p>
                                <p className={`text-6xl font-extrabold ${currentMonthData.net >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                    {currentMonthData.net.toLocaleString()} Tk
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* All-Time Overview */}
                <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-2xl">
                    <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        All-Time Business Overview
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="text-center">
                            <p className="text-lg opacity-80">Total Received</p>
                            <p className="text-4xl font-bold text-green-400 mt-3">{totalReceivedAll().toLocaleString()} Tk</p>
                        </div>
                        <div className="text-center">
                            <p className="text-lg opacity-80">Total Due Given</p>
                            <p className="text-4xl font-bold text-red-400 mt-3">{totalDueGivenAll().toLocaleString()} Tk</p>
                        </div>
                        <div className="text-center">
                            <p className="text-lg opacity-80">Total Daily Income</p>
                            <p className="text-4xl font-bold text-cyan-400 mt-3">{totalDailyIncomeAll().toLocaleString()} Tk</p>
                        </div>
                        <div className="text-center">
                            <p className="text-lg opacity-80 font-bold">Overall Net Profit</p>
                            <p className={`text-5xl font-extrabold mt-3 ${overallNet >= 0 ? 'text-purple-300' : 'text-orange-300'}`}>
                                {overallNet.toLocaleString()} Tk
                            </p>
                        </div>
                    </div>
                </div>

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