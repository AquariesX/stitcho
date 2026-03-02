"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Role = "admin" | "tailor" | "customer";

interface AuthContextType {
    role: Role;
    setRole: (role: Role) => void;
    user: { id: number; firebaseUid?: string; name: string; email: string } | null;
    login: (userData: { id: number; firebaseUid?: string; name: string; email: string }, role: Role) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [role, setRole] = useState<Role>("admin"); // Default to admin for dev
    const [user, setUser] = useState<{ id: number; firebaseUid?: string; name: string; email: string } | null>({
        id: 1,
        name: "Super Admin",
        email: "admin@gmail.com"
    });

    // Load from local storage on mount (simulating persistence)
    useEffect(() => {
        const storedRole = localStorage.getItem("userRole") as Role;
        const storedUser = localStorage.getItem("userData");

        if (storedRole) {
            setRole(storedRole);
        }
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user data", e);
            }
        }
    }, []);

    const login = (userData: { id: number; firebaseUid?: string; name: string; email: string }, newRole: Role) => {
        setRole(newRole);
        setUser(userData);
        localStorage.setItem("userRole", newRole);
        localStorage.setItem("userData", JSON.stringify(userData));
    };

    const logout = () => {
        setRole("admin");
        setUser(null);
        localStorage.removeItem("userRole");
        localStorage.removeItem("userData");
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
