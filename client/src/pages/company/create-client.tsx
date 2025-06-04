import { useState } from "react";
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
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { UserPlusIcon, ArrowLeftIcon } from "lucide-react";

// Esquema para criar um novo cliente
const createClientSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Confirmar senha é obrigatório"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export default function CreateClientPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Formulário
  const form = useForm<z.infer<typeof createClientSchema>>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      email: "",
      phone: "",
      role: "client", // Sempre criamos clientes
    },
  });

  // Mutation para criar cliente
  const createClientMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertUserSchema>) => {
      const res = await apiRequest("POST", "/api/company/clients", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Cliente criado com sucesso",
        description: "O novo cliente já pode acessar o sistema.",
        variant: "default",
      });
      form.reset();
      // Invalidar cache de clientes se houver
      queryClient.invalidateQueries({ queryKey: ["/api/company/clients"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: z.infer<typeof createClientSchema>) {
    const { confirmPassword, ...clientData } = values;
    createClientMutation.mutate(clientData);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="Criar Novo Cliente" />
      
      <main className="container mx-auto py-6 px-4 md:px-6">
        <div className="mb-6 flex items-center justify-between">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/company/clients")}
            className="flex items-center gap-1 text-black"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Voltar
          </Button>
          
          <div className="flex items-center text-primary">
            <UserPlusIcon className="mr-2 h-5 w-5" />
            <h1 className="text-xl font-semibold">Cadastrar Novo Cliente</h1>
          </div>
        </div>
        
        <div className="bg-card rounded-lg shadow p-6 max-w-2xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-800 font-semibold">Nome de Usuário</FormLabel>
                      <FormControl>
                        <Input className="text-gray-800" placeholder="nome.usuario" {...field} />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-800 font-semibold">Nome Completo</FormLabel>
                      <FormControl>
                        <Input className="text-gray-800" placeholder="Nome completo do cliente" {...field} />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-800 font-semibold">Email</FormLabel>
                      <FormControl>
                        <Input className="text-gray-800" type="email" placeholder="cliente@email.com" {...field} />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-800 font-semibold">Telefone</FormLabel>
                      <FormControl>
                        <Input className="text-gray-800" placeholder="(00) 00000-0000" {...field} />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-800 font-semibold">Senha</FormLabel>
                      <FormControl>
                        <Input className="text-gray-800" type="password" placeholder="Senha para o cliente" {...field} />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-800 font-semibold">Confirmar Senha</FormLabel>
                      <FormControl>
                        <Input className="text-gray-800" type="password" placeholder="Confirme a senha" {...field} />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="mt-6 pt-4 border-t flex justify-end">
                <Button
                  type="submit"
                  className="w-full md:w-auto text-black"
                  disabled={createClientMutation.isPending}
                >
                  {createClientMutation.isPending ? "Cadastrando..." : "Cadastrar Cliente"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}