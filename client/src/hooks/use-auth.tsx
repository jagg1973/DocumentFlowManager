import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
  forgotPasswordMutation: UseMutationResult<any, Error, { email: string }>;
};

type LoginData = {
  email: string;
  password: string;
};

type RegisterData = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const res = await apiRequest("/api/auth/me", "GET");
        if (res.status === 401) {
          return null;
        }
        return await res.json();
      } catch (error) {
        return null;
      }
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("/api/auth/login", "POST", credentials);
      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(errorData || 'Login failed');
      }
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/auth/me"], user);
      toast({
        title: "Welcome back!",
        description: `Hello ${user.firstName}, you're now logged in.`,
      });
      // Redirect based on user role
      setTimeout(() => {
        if (user.email === "jaguzman123@hotmail.com") {
          window.location.href = "/admin";
        } else {
          window.location.href = "/";
        }
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const res = await apiRequest("/api/auth/register", "POST", credentials);
      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(errorData || 'Registration failed');
      }
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/auth/me"], user);
      toast({
        title: "Welcome!",
        description: `Account created successfully. Welcome ${user.firstName}!`,
      });
      // Redirect based on user role
      setTimeout(() => {
        if (user.email === "jaguzman123@hotmail.com") {
          window.location.href = "/admin";
        } else {
          window.location.href = "/";
        }
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Clear local session data immediately
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
      
      // Call server logout endpoint
      try {
        await apiRequest("/api/auth/logout", "POST");
      } catch (error) {
        console.warn("Server logout failed, but local session cleared:", error);
      }
      
      // Force redirect immediately
      window.location.href = "/auth";
    },
    onSuccess: () => {
      // Success handler - redirect already happens in mutationFn
    },
    onError: () => {
      // Error handler - redirect already happens in mutationFn
      window.location.href = "/auth";
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: { email: string }) => {
      const res = await apiRequest("/api/auth/forgot-password", "POST", email);
      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(errorData || 'Failed to send reset email');
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Reset email sent",
        description: "If an account with that email exists, a reset link has been sent.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send reset email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        forgotPasswordMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}