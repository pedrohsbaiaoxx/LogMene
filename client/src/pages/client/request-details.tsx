import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Flag, ArrowDownIcon } from "lucide-react";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { FreightRequestWithQuote } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function RequestDetailsPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [statusUpdateConfirmOpen, setStatusUpdateConfirmOpen] = useState(false);
  const [statusToUpdate, setStatusToUpdate] = useState<"accepted" | "rejected">("accepted");
  
  const requestId = parseInt(params.id);
  
  const { data: request, isLoading } = useQuery<FreightRequestWithQuote>({
    queryKey: [`/api/requests/${requestId}`],
  });

  // Update request status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest("PATCH", `/api/requests/${requestId}/status`, { status });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: statusToUpdate === "accepted" ? "Cotação aceita" : "Cotação recusada",
        description: statusToUpdate === "accepted" 
          ? "A transportadora foi notificada e processará seu frete." 
          : "A solicitação foi recusada.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/requests/${requestId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (status: "accepted" | "rejected") => {
    setStatusToUpdate(status);
    setStatusUpdateConfirmOpen(true);
  };

  const confirmStatusUpdate = () => {
    updateStatusMutation.mutate(statusToUpdate);
    setStatusUpdateConfirmOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-neutral-50">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6 pb-20 md:pb-6">
          <div className="mb-6">
            <Button
              variant="ghost"
              className="flex items-center text-primary p-0 h-auto"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl font-bold text-neutral-700">
                <Skeleton className="h-8 w-64" />
              </CardTitle>
              <Skeleton className="h-6 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col min-h-screen bg-neutral-50">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6 pb-20 md:pb-6">
          <div className="mb-6">
            <Button
              variant="ghost"
              className="flex items-center text-primary p-0 h-auto"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <h2 className="text-xl font-bold text-neutral-700">Solicitação não encontrada</h2>
                <p className="text-neutral-500 mt-2">A solicitação que você está procurando não foi encontrada.</p>
              </div>
            </CardContent>
          </Card>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            className="flex items-center text-primary p-0 h-auto"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-bold text-neutral-700">
              Detalhes da Solicitação #{request.id}
            </CardTitle>
            <StatusBadge status={request.status} />
          </CardHeader>
          
          <CardContent>
            {/* Route Information */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-neutral-700 mb-3">Rota</h3>
              <div className="flex flex-col md:flex-row items-start md:items-center text-neutral-700">
                <div className="flex items-center">
                  <MapPin className="text-primary mr-2 h-5 w-5" />
                  <span className="font-medium">{request.origin}</span>
                </div>
                <div className="hidden md:block mx-4">
                  <ArrowDownIcon className="rotate-90 text-neutral-400 h-5 w-5" />
                </div>
                <div className="md:hidden my-2">
                  <ArrowDownIcon className="text-neutral-400 h-5 w-5" />
                </div>
                <div className="flex items-center">
                  <Flag className="text-[#00ACC1] mr-2 h-5 w-5" />
                  <span className="font-medium">{request.destination}</span>
                </div>
              </div>
            </div>
            
            {/* Cargo Details */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-neutral-700 mb-3">Detalhes da Carga</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-neutral-500">Tipo</p>
                  <p className="font-medium text-neutral-700">
                    {request.cargoType === "general" && "Carga Geral"}
                    {request.cargoType === "fragile" && "Frágil"}
                    {request.cargoType === "perishable" && "Perecível"}
                    {request.cargoType === "dangerous" && "Perigosa"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Peso</p>
                  <p className="font-medium text-neutral-700">{request.weight} kg</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Volume</p>
                  <p className="font-medium text-neutral-700">{request.volume} m³</p>
                </div>
              </div>
            </div>
            
            {/* Dates */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-neutral-700 mb-3">Datas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500">Retirada</p>
                  <p className="font-medium text-neutral-700">{request.pickupDate}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Entrega Desejada</p>
                  <p className="font-medium text-neutral-700">{request.deliveryDate}</p>
                </div>
              </div>
            </div>
            
            {/* Quote Information (visible when status is "quoted") */}
            {request.status === "quoted" && request.quote && (
              <div className="mb-6 p-4 bg-[#2196F3]/5 rounded-lg border border-[#2196F3]/30">
                <h3 className="text-lg font-medium text-neutral-700 mb-3">Cotação</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-neutral-500">Valor</p>
                    <p className="font-medium text-neutral-700">{formatCurrency(request.quote.value)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Prazo Estimado</p>
                    <p className="font-medium text-neutral-700">{request.quote.estimatedDays} dias</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Cotado em</p>
                    <p className="font-medium text-neutral-700">
                      {request.quote.createdAt && new Date(request.quote.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                {request.quote.notes && (
                  <div className="mb-4">
                    <p className="text-sm text-neutral-500">Observações da cotação</p>
                    <p className="text-neutral-700">{request.quote.notes}</p>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    className="mr-2"
                    onClick={() => handleStatusUpdate("rejected")}
                  >
                    Recusar
                  </Button>
                  <Button
                    className="bg-[#4CAF50] hover:bg-[#4CAF50]/90"
                    onClick={() => handleStatusUpdate("accepted")}
                  >
                    Aceitar
                  </Button>
                </div>
              </div>
            )}
            
            {/* Accepted Status */}
            {request.status === "accepted" && request.quote && (
              <div className="mb-6 p-4 bg-[#4CAF50]/5 rounded-lg border border-[#4CAF50]/30">
                <h3 className="text-lg font-medium text-neutral-700 mb-3">Frete Confirmado</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-neutral-500">Valor</p>
                    <p className="font-medium text-neutral-700">{formatCurrency(request.quote.value)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Prazo Estimado</p>
                    <p className="font-medium text-neutral-700">{request.quote.estimatedDays} dias</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Entrega estimada até</p>
                    <p className="font-medium text-neutral-700">
                      {request.pickupDate}
                    </p>
                  </div>
                </div>
                <div className="bg-[#4CAF50]/10 p-3 rounded-md">
                  <p className="text-[#4CAF50] font-medium">
                    A transportadora está processando seu frete e entrará em contato para agendar a retirada.
                  </p>
                </div>
              </div>
            )}
            
            {/* Rejected Status */}
            {request.status === "rejected" && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
                <h3 className="text-lg font-medium text-neutral-700 mb-3">Cotação Recusada</h3>
                <p className="text-neutral-700">
                  Você recusou a cotação para esta solicitação de frete.
                </p>
              </div>
            )}
            
            {/* Completed Status */}
            {request.status === "completed" && (
              <div className="mb-6 p-4 bg-[#4CAF50]/5 rounded-lg border border-[#4CAF50]/30">
                <h3 className="text-lg font-medium text-neutral-700 mb-3">Frete Concluído</h3>
                <p className="text-[#4CAF50] font-medium">
                  Este frete foi entregue e concluído com sucesso.
                </p>
              </div>
            )}
            
            {/* Notes */}
            {request.notes && (
              <div>
                <h3 className="text-lg font-medium text-neutral-700 mb-3">Observações</h3>
                <p className="text-neutral-700">{request.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      
      <BottomNavigation />
      
      {/* Confirm Status Update Dialog */}
      <AlertDialog open={statusUpdateConfirmOpen} onOpenChange={setStatusUpdateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusToUpdate === "accepted" ? "Aceitar cotação?" : "Recusar cotação?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusToUpdate === "accepted" 
                ? "Ao aceitar a cotação, você confirma o frete pelo valor proposto. A transportadora será notificada." 
                : "Ao recusar a cotação, esta solicitação será cancelada."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusUpdate}
              className={statusToUpdate === "accepted" ? "bg-[#4CAF50] hover:bg-[#4CAF50]/90" : ""}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
