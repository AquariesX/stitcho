"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Scissors, ArrowRight, Lock, Mail } from "lucide-react";
import clsx from "clsx";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { verifyUserRole } from "../actions/user-actions";

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [role, setRole] = useState<"admin" | "tailor">("admin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    // Primary color: #223943
    // Using inline styles or arbitrary tailwind classes for the specific color

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Dev Credential Check
        if (email === 'admin@gmail.com' && password === 'dev786') {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            login({ id: 999, name: "Admin Dev", email }, "admin");
            router.push('/dashboard');
            return;
        }

        if (email === 'tailor@gmail.com' && password === 'dev786') {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            login({ id: 888, name: "Tailor Dev", email }, "tailor");
            router.push('/dashboard');
            return;
        }

        try {
            // Firebase Login
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const firebaseUid = userCredential.user.uid;

            // Verify Role on Server
            const result = await verifyUserRole(firebaseUid);

            if (!result.success || !result.role) {
                alert(result.error || "User verification failed");
                setLoading(false);
                return;
            }

            // Map Prisma Role to Context Role
            const dbRole = result.role; // ADMIN | TAILOR | CUSTOMER
            let contextRole: "admin" | "tailor" | "customer";

            if (dbRole === "ADMIN") contextRole = "admin";
            else if (dbRole === "TAILOR") contextRole = "tailor";
            else if (dbRole === "CUSTOMER") contextRole = "customer";
            else {
                alert("Invalid role assignment");
                setLoading(false);
                return;
            }

            // Check if role matches selected tab
            if (role === 'admin' && contextRole !== 'admin') {
                alert("Access Denied: You are not an admin.");
                setLoading(false);
                return;
            }
            if (role === 'tailor' && contextRole !== 'tailor' && contextRole !== 'admin') {
                // Allow admin to login as tailor? Maybe not.
                alert("Access Denied: You are not a tailor.");
                setLoading(false);
                return;
            }

            login({
                id: result.id!,
                firebaseUid,
                name: result.name || "User",
                email: result.email || email
            }, contextRole);
            router.push('/dashboard');

        } catch (error: any) {
            console.error("Login Error:", error);
            let message = "Login failed. Please check your credentials.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                message = "Invalid email or password.";
            } else if (error.code === 'auth/invalid-credential') {
                message = "Invalid credentials.";
            } else if (error.code === 'auth/network-request-failed') {
                message = "Network error. Please check your connection.";
            }
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] p-4 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#223943] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#2c4a57] rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob animation-delay-2000"></div>
            </div>

            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] z-10">

                {/* Left Side (Visuals) */}
                <div className="md:w-1/2 relative hidden md:flex flex-col justify-center items-center p-12 text-white overflow-hidden">
                    <div className="absolute inset-0 bg-[#223943] z-0"></div>
                    {/* Animated Patterns */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                        className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] border-[1px] border-white/10 rounded-[40%] origin-center"
                    />
                    <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                        className="absolute top-[-45%] left-[-45%] w-[190%] h-[190%] border-[1px] border-white/5 rounded-[45%] origin-center"
                    />

                    <div className="relative z-10 flex flex-col items-center text-center">
                        <motion.div
                            key={role}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="mb-6 p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20"
                        >
                            {role === 'admin' ? <User size={64} /> : <Scissors size={64} />}
                        </motion.div>
                        <h1 className="text-4xl font-bold mb-4 font-sans tracking-tight">
                            {role === 'admin' ? "Admin Portal" : "Tailor Workspace"}
                        </h1>
                        <p className="text-white/70 text-lg leading-relaxed max-w-xs">
                            {role === 'admin'
                                ? "Manage users, monitor metrics, and oversee the entire platform."
                                : "Track orders, manage measurements, and update delivery statuses."}
                        </p>
                    </div>
                </div>

                {/* Right Side (Form) */}
                <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white relative">
                    <div className="mb-10 text-center md:text-left">
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h2>
                        <p className="text-gray-500">Please enter your details to sign in.</p>
                    </div>

                    {/* Role Switcher */}
                    <div className="flex bg-gray-100 p-1 rounded-xl mb-8 relative">
                        <motion.div
                            layout
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className={clsx(
                                "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm border border-gray-200"
                            )}
                            style={{
                                left: role === 'admin' ? '4px' : 'calc(50% + 0px)'
                            }}
                        />
                        <button
                            onClick={() => setRole("admin")}
                            className={clsx(
                                "flex-1 flex items-center justify-center py-3 text-sm font-medium z-10 transition-colors duration-200",
                                role === 'admin' ? "text-[#223943]" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <User size={18} className="mr-2" />
                            Admin
                        </button>
                        <button
                            onClick={() => setRole("tailor")}
                            className={clsx(
                                "flex-1 flex items-center justify-center py-3 text-sm font-medium z-10 transition-colors duration-200",
                                role === 'tailor' ? "text-[#223943]" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <Scissors size={18} className="mr-2" />
                            Tailor
                        </button>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-[#223943] transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[#223943] transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#223943] focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-[#223943] focus:ring-[#223943] border-gray-300 rounded"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-gray-500">
                                    Remember me
                                </label>
                            </div>
                            <div className="text-sm">
                                <a href="#" className="font-medium text-[#223943] hover:underline">
                                    Forgot password?
                                </a>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-[#223943] hover:bg-[#1b2d35] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#223943] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-gray-500">
                        Don't have an account?{' '}
                        <a href="#" className="font-medium text-[#223943] hover:underline">
                            Contact Administrator
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
