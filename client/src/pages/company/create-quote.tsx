import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, LocateIcon, Map, TruckIcon } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertQuoteSchema, FreightRequestWithQuote } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

// Define the form schema based on the quote schema
const formSchema = insertQuoteSchema.omit({ 
  requestId: true,
});

export default function CreateQuotePage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const requestId = params.requestId ? parseInt(params.requestId) : 0;
  const [distance, setDistance] = useState<number | null>(null);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  
  // Fetch request details
  const { data: request, isLoading } = useQuery<FreightRequestWithQuote>({
    queryKey: [`/api/requests/${requestId}`],
  });

  // Mutation for distance calculation
  const calculateDistanceMutation = useMutation({
    mutationFn: async (addresses: { fromAddress: string, toAddress: string }) => {
      const res = await apiRequest("POST", "/api/calculate-distance", addresses);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.distance) {
        setDistance(data.distance);
        
        // Sugerir valor baseado na distância (R$ 2,50/km + taxa base de R$ 100)
        const baseRate = 100;
        const ratePerKm = 2.5;
        const suggestedValue = baseRate + (data.distance * ratePerKm);
        
        // Atualizar o valor no formulário
        form.setValue("value", parseFloat(suggestedValue.toFixed(2)));
        
        // Calcular prazo estimado (1 dia a cada 400km, mínimo 1 dia)
        const daysPerKm = 400;
        const estimatedDays = Math.max(1, Math.ceil(data.distance / daysPerKm));
        form.setValue("estimatedDays", estimatedDays);
        
        toast({
          title: "Distância calculada",
          description: `A distância entre os endereços é de aproximadamente ${data.distance} km.`,
        });
      } else {
        toast({
          title: "Erro ao calcular distância",
          description: data.error || "Não foi possível calcular a distância.",
          variant: "destructive",
        });
      }
      setIsCalculatingDistance(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no cálculo",
        description: error.message,
        variant: "destructive",
      });
      setIsCalculatingDistance(false);
    },
  });

  // Função para calcular a distância
  const handleCalculateDistance = () => {
    if (!request) return;
    
    setIsCalculatingDistance(true);
    calculateDistanceMutation.mutate({
      fromAddress: `${request.originStreet}, ${request.originCity} - ${request.originState}`,
      toAddress: `${request.destinationStreet}, ${request.destinationCity} - ${request.destinationState}`
    });
  };

  // Create the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: 0,
      estimatedDays: 1,
      notes: "",
    },
  });

  // Create quote mutation
  const createQuoteMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const quoteData = {
        ...data,
        requestId,
      };
      const res = await apiRequest("POST", "/api/quotes", quoteData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Cotação enviada",
        description: "A cotação foi enviada com sucesso para o cliente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/company/pending-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company/active-requests"] });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar cotação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit handler
  function onSubmit(values: z.infer<typeof formSchema>) {
    createQuoteMutation.mutate(values);
  }

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
            <CardHeader>
              <Skeleton className="h-8 w-64" />
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
          <CardHeader>
            <CardTitle className="text-xl font-bold text-neutral-700">
              Criar Cotação - Solicitação #{request.id}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {/* Request Details Summary */}
            <div className="mb-6 bg-neutral-100 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-neutral-700 mb-3">Detalhes da Solicitação</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-neutral-500">Cliente</p>
                  <p className="font-medium text-neutral-700">{request.clientName}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Data da Solicitação</p>
                  <p className="font-medium text-neutral-700">
                    {request.createdAt && new Date(request.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-neutral-500">Rota</p>
                <div className="flex flex-col md:flex-row items-start md:items-center text-neutral-700">
                  <span className="font-medium">
                    {request.originStreet}, {request.originCity} - {request.originState}
                  </span>
                  <span className="hidden md:block mx-2">→</span>
                  <span className="md:hidden my-1">↓</span>
                  <span className="font-medium">
                    {request.destinationStreet}, {request.destinationCity} - {request.destinationState}
                  </span>
                </div>
                
                {/* Cálculo de distância */}
                <div className="mt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                    onClick={handleCalculateDistance}
                    disabled={isCalculatingDistance}
                  >
                    <Map className="h-4 w-4" />
                    {isCalculatingDistance 
                      ? "Calculando..." 
                      : distance 
                        ? "Recalcular distância" 
                        : "Calcular distância"}
                  </Button>
                  
                  {distance !== null && (
                    <div className="mt-2 flex flex-col">
                      <div className="flex items-center gap-1">
                        <TruckIcon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">
                          Distância estimada: <Badge variant="outline">{distance} km</Badge>
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Valores sugeridos: 
                        R$ {(100 + (distance * 2.5)).toFixed(2)} | 
                        Prazo: {Math.max(1, Math.ceil(distance / 400))} dias
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-neutral-500">Tipo de Carga</p>
                  <p className="font-medium text-neutral-700">
                    {request.cargoType === "general" && "Carga Geral"}
                    {request.cargoType === "fragile" && "Frágil"}
                    {request.cargoType === "perishable" && "Perecível"}
                    {request.cargoType === "dangerous" && "Perigosa"}
                    {request.cargoType === "fractional" && "Carga Fracionada"}
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
              {/* Additional notes */}
              {request.notes && (
                <div className="mt-4">
                  <p className="text-sm text-neutral-500">Observações do cliente</p>
                  <p className="text-neutral-700">{request.notes}</p>
                </div>
              )}
              {/* Insurance requirement */}
              {request.requireInsurance && (
                <div className="mt-4 p-2 bg-yellow-50 border border-yellow-100 rounded-md">
                  <p className="text-yellow-800 text-sm">
                    <span className="font-medium">Nota:</span> O cliente solicitou seguro para esta carga
                  </p>
                </div>
              )}
            </div>
            
            {/* Quote Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <h3 className="text-lg font-medium text-neutral-700 mb-3">Dados da Cotação</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor (R$)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value ? parseFloat(e.target.value) : 0;
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="estimatedDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prazo de Entrega (dias)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value ? parseInt(e.target.value) : 1;
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Informações adicionais sobre a cotação"
                          rows={3}
                          value={field.value || ''}
                          onChange={field.onChange}
                          name={field.name}
                          onBlur={field.onBlur}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="mr-2"
                    onClick={() => navigate("/")}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createQuoteMutation.isPending}
                  >
                    {createQuoteMutation.isPending ? "Enviando..." : "Enviar Cotação"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
      
      <BottomNavigation />
    </div>
  );
}
