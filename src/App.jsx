// App.jsx

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Signup from "./pages/Signup.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import DailyIncome from "./pages/DailyIncome.jsx";
import DailyExpenseCalculation from "./pages/DailyExpenseCalculation.jsx";
import DailyAccount from "./pages/DailyAccount.jsx";
import Reports from "./pages/Reports.jsx";
import CustomersList from "./pages/CustomersList.jsx";
import Settings from "./pages/Settings.jsx";

// এই লাইনটা ডিলিট করো → import Not import NotFound from "./pages/NotFound.jsx";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/daily-income" element={<DailyIncome />} />
        <Route path="/daily-expense" element={<DailyExpenseCalculation />} />
        <Route path="/daily-account" element={<DailyAccount />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/customers" element={<CustomersList />} />
        <Route path="/settings" element={<Settings />} />

        {/* Fallback - 404 এর জায়গায় Login এ পাঠিয়ে দাও (সাধারণত এটাই করা হয়) */}
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;