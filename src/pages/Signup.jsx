import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { ref, set } from "firebase/database";
import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";

export default function Signup() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        if (loading) return;

        // Basic validation
        if (!name.trim()) {
            setError("Please enter your name");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            const user = userCredential.user;

            // Save owner data in Realtime Database
            await set(ref(db, 'owners/' + user.uid), {
                name: name.trim(),
                email: user.email,
                createdAt: new Date().toISOString()
            });

            navigate("/dashboard");
        } catch (error) {
            // Friendly error messages
            switch (error.code) {
                case "auth/email-already-in-use":
                    setError("This email is already registered. Try logging in.");
                    break;
                case "auth/invalid-email":
                    setError("Please enter a valid email address.");
                    break;
                case "auth/weak-password":
                    setError("Password should be at least 6 characters.");
                    break;
                case "auth/operation-not-allowed":
                    setError("Sign up is currently disabled. Contact support.");
                    break;
                default:
                    setError(error.message || "Failed to create account. Try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-600">
            <div className="bg-white/90 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
                <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">Owner Signup</h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignup}>
                    <div className="mb-5">
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            disabled={loading}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-4 focus:ring-cyan-400 focus:border-transparent transition disabled:bg-gray-100"
                        />
                    </div>

                    <div className="mb-5">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-4 focus:ring-cyan-400 focus:border-transparent transition disabled:bg-gray-100"
                        />
                    </div>

                    <div className="mb-6">
                        <input
                            type="password"
                            placeholder="Password (min 6 characters)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-4 focus:ring-cyan-400 focus:border-transparent transition disabled:bg-gray-100"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {loading ? "Creating Account..." : "Create Account"}
                    </button>
                </form>

                <p className="mt-6 text-center text-gray-600">
                    Already have an account?{" "}
                    <Link to="/login" className="text-cyan-600 font-medium hover:underline">
                        Login here
                    </Link>
                </p>
            </div>
        </div>
    );
}