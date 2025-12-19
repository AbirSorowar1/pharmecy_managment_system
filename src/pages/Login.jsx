import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        setError("");

        try {
            await signInWithEmailAndPassword(auth, email.trim(), password);
            navigate("/dashboard");
        } catch (err) {
            switch (err.code) {
                case "auth/user-not-found":
                case "auth/wrong-password":
                    setError("Invalid email or password.");
                    break;
                case "auth/invalid-email":
                    setError("Please enter a valid email.");
                    break;
                case "auth/too-many-requests":
                    setError("Too many attempts. Try again later.");
                    break;
                default:
                    setError("Failed to log in. Check your connection.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500">
            <div className="bg-white/90 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
                <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">Owner Login</h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <div className="mb-5">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-4 focus:ring-purple-400 focus:border-transparent transition disabled:bg-gray-100"
                        />
                    </div>

                    <div className="mb-6">
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-4 focus:ring-purple-400 focus:border-transparent transition disabled:bg-gray-100"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                <p className="mt-6 text-center text-gray-600">
                    Don't have an account?{" "}
                    <Link to="/signup" className="text-purple-600 font-medium hover:underline">
                        Sign up here
                    </Link>
                </p>
            </div>
        </div>
    );
}