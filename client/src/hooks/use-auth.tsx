import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "./use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation<SelectUser, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      console.log("Attempting login with:", credentials);
      const res = await apiRequest("POST", "/api/login", credentials);
      const data = await res.json();
      console.log("Login response:", data);
      return data;
    },
    onSuccess: (user: SelectUser) => {
      console.log("Login successful:", user);
      queryClient.setQueryData(["/api/user"], user);
      const welcomeMessage = user.role === "company" 
        ? "Bem-vindo(a) de volta, LogMene!" 
        : `Bem-vindo(a) de volta, ${user.fullName}!`;
      toast({
        title: "Login realizado com sucesso",
        description: welcomeMessage,
      });
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      toast({
        title: "Falha no login",
        description: error.message || "Nome de usuário ou senha incorretos",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation<SelectUser, Error, InsertUser>({
    mutationFn: async (credentials: InsertUser) => {
      console.log("Attempting registration with:", credentials);
      const res = await apiRequest("POST", "/api/register", credentials);
      const data = await res.json();
      console.log("Registration response:", data);
      return data;
    },
    onSuccess: (user: SelectUser) => {
      console.log("Registration successful:", user);
      queryClient.setQueryData(["/api/user"], user);
      const welcomeMessage = user.role === "company" 
        ? "Bem-vindo(a), LogMene!" 
        : `Bem-vindo(a), ${user.fullName}!`;
      toast({
        title: "Cadastro realizado com sucesso",
        description: welcomeMessage,
      });
    },
    onError: (error: Error) => {
      console.error("Registration error:", error);
      toast({
        title: "Falha no cadastro",
        description: error.message || "Não foi possível completar o cadastro. Por favor, tente novamente.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      console.log("Attempting logout");
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      console.log("Logout successful");
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Sessão encerrada",
        description: "Você saiu do sistema com sucesso.",
      });
    },
    onError: (error: Error) => {
      console.error("Logout error:", error);
      toast({
        title: "Falha ao sair",
        description: error.message || "Não foi possível encerrar a sessão. Tente novamente.",
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
