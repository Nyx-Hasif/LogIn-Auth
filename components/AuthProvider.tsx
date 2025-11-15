"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { auth, User } from "@/lib/supabase"; // Remove 'supabase' import
import type { Session, AuthError } from "@supabase/supabase-js"; // Add AuthError import

// Define the shape of our auth context
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>; // Fix any type
  signOut: () => Promise<void>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data } = await auth.getSession();
      setSession(data.session);
      setUser((data.session?.user as User) || null);
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);

      setSession(session);
      setUser((session?.user as User) || null);
      setLoading(false);

      // Handle different auth events
      if (event === "SIGNED_IN") {
        console.log("User signed in:", session?.user?.email);
      } else if (event === "SIGNED_OUT") {
        console.log("User signed out");
      }
    });

    // Cleanup subscription
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Sign in function
  const signIn = async (email: string, password: string) => {
    setLoading(true);

    try {
      const { data, error } = await auth.signIn(email, password);

      if (error) {
        console.error("Sign in error:", error.message);
        return { error };
      }

      console.log("Sign in successful:", data.user?.email);
      return { error: null };
    } catch (error) {
      console.error("Unexpected sign in error:", error);
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    setLoading(true);

    try {
      const { error } = await auth.signOut();

      if (error) {
        console.error("Sign out error:", error.message);
      } else {
        console.log("Sign out successful");
      }
    } catch (error) {
      console.error("Unexpected sign out error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

// Helper hook for checking authentication status
export function useRequireAuth() {
  const { user, loading } = useAuth();

  return {
    isAuthenticated: !!user,
    user,
    loading,
  };
}
