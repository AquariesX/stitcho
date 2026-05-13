"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { onAuthStateChanged, User as FirebaseUser, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

type Role = "admin" | "tailor" | "customer";

interface AppUser {
  id: number;
  firebaseUid: string;
  name: string;
  email: string;
}

interface AuthContextType {
  role: Role;
  setRole: (role: Role) => void;
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (userData: AppUser, role: Role) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<Role>("admin");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);

        // Try to hydrate from localStorage (set at login time)
        const storedRole = localStorage.getItem("userRole") as Role | null;
        const storedUser = localStorage.getItem("userData");

        if (storedRole) setRole(storedRole);
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            // ignore parse errors
          }
        }
      } else {
        // Not authenticated — clear state
        setFirebaseUser(null);
        setUser(null);
        setRole("admin");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userData");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = (userData: AppUser, newRole: Role) => {
    setUser(userData);
    setRole(newRole);
    localStorage.setItem("userRole", newRole);
    localStorage.setItem("userData", JSON.stringify(userData));
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
    setRole("admin");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userData");
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{ role, setRole, user, firebaseUser, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
