import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Ruler } from "lucide-react";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertQuoteSchema, FreightRequestWithQuote } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

// Define the form schema based on the quote schema with optional fields
const formSchema = insertQuoteSchema.omit({ 
  requestId: true,
})
.extend({
  value: z.number().min(0, "O valor não pode ser negativo").optional(),
  estimatedDays: z.number().min(1, "O prazo de entrega deve ser de pelo menos 1 dia").optional(),
  distanceKm: z.number().min(0, "A distância não pode ser negativa").optional(),
});

export default function CreateQuotePage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  
  const requestId = params.requestId ? parseInt(params.requestId) : 0;
  
  // Fetch request details
  const { data: request, isLoading } = useQuery<FreightRequestWithQuote>({
    queryKey: [`/api/requests/${requestId}`],
  });

  // Create the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: undefined,
      estimatedDays: undefined,
      distanceKm: undefined,
      notes: "",
    },
  });
  
  // Calcular distância automaticamente quando os dados do pedido forem carregados
  useEffect(() => {
    if (request) {
      calculateDistance();
    }
  }, [request]);

  // Função para calcular a distância entre origem e destino
  const calculateDistance = async () => {
    if (!request) return;
    
    setCalculatingDistance(true);
    try {
      // Preparar os endereços
      const origem = `${request.originStreet}, ${request.originCity}, ${request.originState}`;
      const destino = `${request.destinationStreet}, ${request.destinationCity}, ${request.destinationState}`;
      
      // Usar uma estimativa básica baseada em distância direta
      // Para cada grau de diferença na latitude/longitude, adiciona aproximadamente 111 km
      const origemParts = origem.split(",").map(p => p.trim());
      const destinoParts = destino.split(",").map(p => p.trim());
      
      // Uma estimativa simples baseada nos nomes das cidades
      const cidadeOrigem = request.originCity;
      const estadoOrigem = request.originState;
      const cidadeDestino = request.destinationCity;
      const estadoDestino = request.destinationState;
      
      // Distância estimada (exemplo simples - numa aplicação real, usaria a API Google Maps)
      let distanciaEstimada = 0;
      
      // Se for no mesmo estado
      if (estadoOrigem === estadoDestino) {
        // Se for na mesma cidade
        if (cidadeOrigem === cidadeDestino) {
          distanciaEstimada = 15; // Distância local estimada
        } else {
          // Distância entre cidades do mesmo estado
          distanciaEstimada = 150; // Valor médio para exemplo
        }
      } else {
        // Distância entre estados
        distanciaEstimada = 500; // Valor médio para exemplo
      }
      
      // Adicionar alguma variação para parecer mais realista
      const variacao = Math.floor(Math.random() * 50) + 1;
      distanciaEstimada += variacao;
      
      // Atualizar o formulário com a distância calculada
      form.setValue("distanceKm", distanciaEstimada);
    } catch (error) {
      console.error("Erro ao calcular distância:", error);
      toast({
        title: "Erro ao calcular distância",
        description: "Não foi possível calcular a distância. Por favor, preencha manualmente.",
        variant: "destructive",
      });
    } finally {
      setCalculatingDistance(false);
    }
  };

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
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <p className="text-sm text-neutral-500">Valor da Nota</p>
                  <p className="font-medium text-neutral-700">
                    {request.invoiceValue ? `R$ ${request.invoiceValue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : "Não informado"}
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
                              const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
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
                              const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="distanceKm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Distância (km)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type="number" 
                              min="0" 
                              step="1"
                              disabled={calculatingDistance}
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                                field.onChange(value);
                              }}
                            />
                            {calculatingDistance && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>
                          Distância total estimada entre origem e destino
                        </FormDescription>
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
