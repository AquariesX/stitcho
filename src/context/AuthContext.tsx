"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Role = "admin" | "tailor" | "customer";

interface AuthContextType {
    role: Role;
    setRole: (role: Role) => void;
    user: { name: string; email: string } | null;
    login: (email: string, role: Role) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [role, setRole] = useState<Role>("admin"); // Default to admin for dev
    const [user, setUser] = useState<{ name: string; email: string } | null>({
        name: "Super Admin",
        email: "admin@gmail.com"
    });

    // Load from local storage on mount (simulating persistence)
    useEffect(() => {
        const storedRole = localStorage.getItem("userRole") as Role;
        if (storedRole) {
            setRole(storedRole);
        }
    }, []);

    const login = (email: string, newRole: Role) => {
        setRole(newRole);
        setUser({ name: "User", email });
        localStorage.setItem("userRole", newRole);
    };

    const logout = () => {
        setRole("admin");
        setUser(null);
        localStorage.removeItem("userRole");
    };

    return (
        <AuthContext.Provider value={{ role, setRole, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
