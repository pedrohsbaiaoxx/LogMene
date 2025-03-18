import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { TruckIcon } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type UserType = "client" | "company";

export default function AuthPage() {
  const [userType, setUserType] = useState<UserType>("client");
  const { user, loginMutation, logoutMutation } = useAuth();
  const [, navigate] = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Login form submit handler
  function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    // Limpando erros anteriores
    loginForm.clearErrors();
    
    loginMutation.mutate(values, {
      onSuccess: (user: any) => {
        // Verificar se o tipo de usuário corresponde ao selecionado
        if (user.role !== userType) {
          loginForm.setError("username", {
            type: "manual",
            message: `Esta conta não é do tipo ${userType === "client" ? "cliente" : "transportadora"}`
          });
          // Fazer logout, pois o usuário logou com o tipo errado
          logoutMutation.mutate();
        }
      },
      onError: (error) => {
        // Mostrando erros específicos no formulário
        loginForm.setError("username", {
          type: "manual",
          message: "Usuário ou senha inválidos"
        });
        loginForm.setError("password", {
          type: "manual",
          message: "Usuário ou senha inválidos"
        });
      }
    });
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Form Section */}
      <div className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary flex items-center justify-center">
              <TruckIcon className="mr-2 h-8 w-8" />
              LogMene
            </h1>
            <p className="text-neutral-600 mt-2">
              Sistema de Logística Inteligente
            </p>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-center mb-6">Login</h2>
            <div className="flex justify-center mb-4">
              <div className="flex space-x-4">
                <Button
                  variant={userType === "client" ? "default" : "outline"}
                  onClick={() => setUserType("client")}
                  className="px-4 py-2"
                >
                  Cliente
                </Button>
                <Button
                  variant={userType === "company" ? "default" : "outline"}
                  onClick={() => setUserType("company")}
                  className="px-4 py-2"
                >
                  Transportadora
                </Button>
              </div>
            </div>
          </div>

          <Form {...loginForm}>
            <form
              onSubmit={loginForm.handleSubmit(onLoginSubmit)}
              className="space-y-4"
            >
              <FormField
                control={loginForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuário</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu usuário" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Sua senha"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </Form>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Não tem uma conta? Entre em contato com o administrador.</p>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="hidden lg:block relative w-0 flex-1 bg-gradient-to-r from-blue-600 to-purple-700">
        <div className="flex flex-col justify-center h-full px-12 text-white">
          <div className="max-w-md">
            <h2 className="text-4xl font-bold mb-4">
              Gerencie suas entregas de forma simples e eficiente
            </h2>
            <p className="text-lg mb-6">
              O LogMene conecta clientes e transportadoras para proporcionar a melhor
              experiência em logística e transporte de cargas.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="mr-2 bg-white bg-opacity-20 rounded-full w-5 h-5 flex items-center justify-center text-sm">✓</span> 
                <span>Solicite fretes facilmente</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 bg-white bg-opacity-20 rounded-full w-5 h-5 flex items-center justify-center text-sm">✓</span> 
                <span>Receba cotações competitivas</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 bg-white bg-opacity-20 rounded-full w-5 h-5 flex items-center justify-center text-sm">✓</span> 
                <span>Acompanhe suas entregas em tempo real</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 bg-white bg-opacity-20 rounded-full w-5 h-5 flex items-center justify-center text-sm">✓</span> 
                <span>Acesse histórico de solicitações</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
