import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface User {
  id: string;
  email: string;
  phone?: string;
  full_name?: string;
  role?: string;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  signUp: (
    email: string,
    password: string,
    full_name?: string
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  checkPermissions: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to get token from storage
  const getTokenFromStorage = () => {
    return (
      localStorage.getItem("supabase.auth.token") ||
      sessionStorage.getItem("supabase.auth.token")
    );
  };

  // Initialize auth on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = getTokenFromStorage();

        if (token) {
          const parsed = JSON.parse(token);
          setSession(parsed);

          if (parsed?.user) {
            // Extract role and permissions from various possible locations
            const role =
              parsed.user.role ||
              parsed.user.user_metadata?.role ||
              parsed.user.app_metadata?.role ||
              "user";

            const permissions =
              parsed.user.permissions ||
              parsed.user.user_metadata?.permissions ||
              parsed.user.app_metadata?.permissions ||
              [];

            console.log("🔍 DEBUG - Initializing user with data:", {
              id: parsed.user.id,
              email: parsed.user.email,
              role,
              permissions,
              user_metadata: parsed.user.user_metadata,
              app_metadata: parsed.user.app_metadata,
            });

            setUser({
              id: parsed.user.id,
              email: parsed.user.email,
              phone: parsed.user.phone || "",
              full_name: parsed.user.user_metadata?.full_name || "",
              role,
              permissions,
            });
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        // Clear invalid token
        localStorage.removeItem("supabase.auth.token");
        sessionStorage.removeItem("supabase.auth.token");
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Check user permissions
  const checkPermissions = async () => {
    try {
      const token = getTokenFromStorage();
      if (!token) {
        console.log("🔍 No token found for permission check");
        return null;
      }

      const parsed = JSON.parse(token);
      if (!parsed?.access_token) {
        console.log("🔍 No access token found for permission check");
        return null;
      }

      const response = await fetch(
        "https://brickbook-backend.vercel.app/api/auth/me",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${parsed.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.log("🔍 Permission check failed with status:", response.status);
        return null;
      }

      const userData = await response.json();
      console.log("🔍 Current user data from /api/auth/me:", userData);

      // Update user state with fresh data
      if (userData.user) {
        const role =
          userData.user.role ||
          userData.user.user_metadata?.role ||
          userData.user.app_metadata?.role ||
          "user";

        const permissions =
          userData.user.permissions ||
          userData.user.user_metadata?.permissions ||
          userData.user.app_metadata?.permissions ||
          [];

        setUser({
          id: userData.user.id,
          email: userData.user.email,
          phone: userData.user.phone || "",
          full_name: userData.user.user_metadata?.full_name || "",
          role,
          permissions,
        });
      }

      return userData;
    } catch (error) {
      console.error("Error checking permissions:", error);
      return null;
    }
  };

  // Login function
  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        "https://brickbook-backend.vercel.app/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }

      const data = await response.json();
      console.log("🔍 Login response data:", data);

      // Extract role and permissions from various possible locations
      const role =
        data.user.role ||
        data.user.user_metadata?.role ||
        data.user.app_metadata?.role ||
        "user";

      const permissions =
        data.user.permissions ||
        data.user.user_metadata?.permissions ||
        data.user.app_metadata?.permissions ||
        [];

      console.log("🔍 User logged in with:", {
        id: data.user.id,
        email: data.user.email,
        role,
        permissions,
        user_metadata: data.user.user_metadata,
        app_metadata: data.user.app_metadata,
      });

      // Store the token in localStorage
      const authData = {
        access_token: data.access_token,
        user: data.user,
        session: data.session,
      };

      localStorage.setItem("supabase.auth.token", JSON.stringify(authData));

      // Update state
      setSession(authData);
      setUser({
        id: data.user.id,
        email: data.user.email,
        phone: data.user.phone || "",
        full_name: data.user.user_metadata?.full_name || "",
        role,
        permissions,
      });

      // Check permissions after login
      await checkPermissions();
    } catch (err) {
      console.error("Login error:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Signup function
  const signUp = async (
    email: string,
    password: string,
    full_name?: string
  ) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        "https://brickbook-backend.vercel.app/api/auth/signup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, full_name }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Signup failed");
      }

      const data = await response.json();
      console.log("🔍 Signup response data:", data);

      // Extract role and permissions
      const role =
        data.user.role ||
        data.user.user_metadata?.role ||
        data.user.app_metadata?.role ||
        "user";

      const permissions =
        data.user.permissions ||
        data.user.user_metadata?.permissions ||
        data.user.app_metadata?.permissions ||
        [];

      // Store the token
      const authData = {
        access_token: data.access_token,
        user: data.user,
        session: data.session,
      };

      localStorage.setItem("supabase.auth.token", JSON.stringify(authData));

      // Update state
      setSession(authData);
      setUser({
        id: data.user.id,
        email: data.user.email,
        phone: data.user.phone || "",
        full_name: data.user.user_metadata?.full_name || "",
        role,
        permissions,
      });

      // Check permissions after signup
      await checkPermissions();
    } catch (err) {
      console.error("Signup error:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const signOut = async () => {
    try {
      setIsLoading(true);
      const token = getTokenFromStorage();

      if (token) {
        try {
          const parsed = JSON.parse(token);
          if (parsed?.access_token) {
            await fetch(
              "https://brickbook-backend.vercel.app/api/auth/logout",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${parsed.access_token}`,
                  "Content-Type": "application/json",
                },
              }
            );
          }
        } catch (err) {
          console.error("Error parsing token during logout:", err);
        }
      }
    } catch (err) {
      console.error("Logout API error:", err);
    } finally {
      // Always clear local state and storage
      localStorage.removeItem("supabase.auth.token");
      sessionStorage.removeItem("supabase.auth.token");
      setUser(null);
      setSession(null);
      setIsLoading(false);
    }
  };

  // Reset password function
  const resetPassword = async (email: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        "https://brickbook-backend.vercel.app/api/auth/reset-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Password reset failed");
      }
    } catch (err) {
      console.error("Reset password error:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for storage changes (for cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "supabase.auth.token" || e.key === null) {
        const token = getTokenFromStorage();

        if (token) {
          try {
            const parsed = JSON.parse(token);
            setSession(parsed);

            if (parsed?.user) {
              // Extract role and permissions
              const role =
                parsed.user.role ||
                parsed.user.user_metadata?.role ||
                parsed.user.app_metadata?.role ||
                "user";

              const permissions =
                parsed.user.permissions ||
                parsed.user.user_metadata?.permissions ||
                parsed.user.app_metadata?.permissions ||
                [];

              setUser({
                id: parsed.user.id,
                email: parsed.user.email,
                phone: parsed.user.phone || "",
                full_name: parsed.user.user_metadata?.full_name || "",
                role,
                permissions,
              });
            }
          } catch (error) {
            console.error("Error parsing token from storage event:", error);
            setUser(null);
            setSession(null);
          }
        } else {
          setUser(null);
          setSession(null);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Check permissions when user changes
  useEffect(() => {
    if (user && !isLoading) {
      checkPermissions();
    }
  }, [user?.id]);

  const value = {
    user,
    session,
    isLoading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    checkPermissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
