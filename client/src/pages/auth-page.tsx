import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertUserSchema } from "@shared/schema";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { TruckIcon } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type UserType = "client" | "company";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [userType, setUserType] = useState<UserType>("client");
  const { user, loginMutation, registerMutation } = useAuth();
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

  // Register form
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      email: "",
      phone: "",
      role: userType,
    },
  });

  // Update the role field when userType changes
  useEffect(() => {
    registerForm.setValue("role", userType);
  }, [userType, registerForm]);

  // Login form submit handler
  function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate(values);
  }

  // Register form submit handler
  function onRegisterSubmit(values: z.infer<typeof registerSchema>) {
    const { confirmPassword, ...registrationData } = values;
    registerMutation.mutate(registrationData);
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Form Section */}
      <div className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary flex items-center justify-center">
              <TruckIcon className="mr-2 h-8 w-8" />
              FreteApp
            </h1>
            <p className="text-neutral-600 mt-2">
              Serviço de Transporte Eficiente
            </p>
          </div>

          <Tabs
            defaultValue="login"
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "login" | "register")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Cadastro</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <div className="mb-6">
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
            </TabsContent>

            <TabsContent value="register">
              <div className="mb-6">
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

              <Form {...registerForm}>
                <form
                  onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome de Usuário</FormLabel>
                        <FormControl>
                          <Input placeholder="Escolha um usuário" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Crie uma senha"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Confirme sua senha"
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
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending
                      ? "Cadastrando..."
                      : "Cadastrar"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Hero Section */}
      <div className="hidden lg:block relative w-0 flex-1 bg-gradient-to-r from-primary to-primary-dark">
        <div className="flex flex-col justify-center h-full px-12 text-white">
          <div className="max-w-md">
            <h2 className="text-4xl font-bold mb-4">
              Gerencie suas entregas de forma simples e eficiente
            </h2>
            <p className="text-lg mb-6">
              Conectamos clientes e transportadoras para proporcionar a melhor
              experiência em fretes e transportes.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="mr-2">✓</span> Solicite fretes facilmente
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span> Receba cotações competitivas
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span> Acompanhe suas entregas em tempo real
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span> Acesse histórico de solicitações
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
