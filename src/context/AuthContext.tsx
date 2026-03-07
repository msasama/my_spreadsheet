"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import {
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {//this firebase user is what google will pass in this call back.

            setUser(firebaseUser);//this is a react state update .
            setLoading(false);//react sees the state changed and updates our ui.rerenders the page.

        });//the call back runs everytime user state in firebase chnages.

        return unsubscribe;
    }, []);

    const signInWithGoogle = async (): Promise<void> => {
        await signInWithPopup(auth, googleProvider);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error("useAuth must be used within an <AuthProvider>");
    }
    return context;
}
