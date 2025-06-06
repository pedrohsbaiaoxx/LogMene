import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { User as UserType } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  UsersIcon, 
  PlusIcon, 
  MailIcon, 
  PhoneIcon,
  TrashIcon,
  Loader2Icon,
  AlertTriangleIcon,
  FileTextIcon
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ClientsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [clientToDelete, setClientToDelete] = useState<UserType | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (user?.role !== "company") {
      navigate("/");
    }
  }, [user, navigate]);

  // Buscar todos os clientes
  const { data: clients, isLoading, error } = useQuery<UserType[]>({
    queryKey: ["/api/company/clients"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Mutation para excluir cliente
  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const res = await apiRequest("DELETE", `/api/company/clients/${clientId}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Cliente excluído com sucesso",
        description: "O cliente e todos os seus pedidos foram removidos.",
        variant: "default",
      });
      // Fechar o diálogo
      setIsDeleteDialogOpen(false);
      setClientToDelete(null);
      // Invalidar o cache para recarregar a lista
      queryClient.invalidateQueries({ queryKey: ["/api/company/clients"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
    },
  });

  // Filtrar clientes baseado na busca
  const filteredClients = clients?.filter((client) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      client.fullName.toLowerCase().includes(searchLower) ||
      client.username.toLowerCase().includes(searchLower) ||
      client.email.toLowerCase().includes(searchLower)
    );
  }).filter(client => client.role === "client");

  return (
    <div className="min-h-screen bg-background">
      <Header title="Gerenciamento de Clientes" />
      
      <main className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center">
            <UsersIcon className="mr-2 h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Clientes Cadastrados</h1>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Input
                type="search"
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Button onClick={() => navigate("/company/create-client")} className="flex items-center gap-1">
              <PlusIcon className="h-4 w-4" />
              Novo Cliente
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <p>Erro ao carregar clientes. Tente novamente mais tarde.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients && filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <Card key={client.id} className="overflow-hidden border-muted hover:border-primary transition-colors">
                  <CardHeader className="bg-muted/30 pb-2">
                    <CardTitle className="text-lg">{client.fullName}</CardTitle>
                    <CardDescription>@{client.username}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <MailIcon className="mr-2 h-4 w-4" />
                        {client.email}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <PhoneIcon className="mr-2 h-4 w-4" />
                        {client.phone || "Não informado"}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2 justify-between border-t bg-muted/10 pt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/company/client/${client.id}/requests`)}
                    >
                      Ver Solicitações
                    </Button>
                    
                    <Button 
                      variant="outline"
                      className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                      size="sm"
                      onClick={() => window.open(`/api/report/client/${client.id}`, '_blank')}
                    >
                      <FileTextIcon className="h-4 w-4 mr-1" />
                      Gerar Relatório
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => {
                        setClientToDelete(client);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <p>Nenhum cliente encontrado.</p>
                {searchTerm && (
                  <Button
                    variant="link"
                    onClick={() => setSearchTerm("")}
                    className="mt-2"
                  >
                    Limpar busca
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
      
      {/* Modal de confirmação de exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-destructive">
              <AlertTriangleIcon className="h-5 w-5 mr-2" />
              Confirmar exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir o cliente <strong>{clientToDelete?.fullName}</strong>. 
              <br /><br />
              Esta ação também excluirá todas as solicitações de frete e cotações associadas a este cliente.
              <br /><br />
              Esta ação <strong>não pode ser desfeita</strong>. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (clientToDelete) {
                  deleteClientMutation.mutate(clientToDelete.id);
                }
              }}
              disabled={deleteClientMutation.isPending}
            >
              {deleteClientMutation.isPending ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Sim, excluir cliente"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}