import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useToast } from "../../components/ui/use-toast";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Header } from "../../components/header";
import { FreightRequestWithQuote } from "@shared/schema";
import { formatISODateToDisplay } from "../../lib/utils";

// Função para converter data do formato brasileiro para ISO
function convertToISODate(dateStr: string): string {
  if (!dateStr) return "";
  const [day, month, year] = dateStr.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

// Função para converter data do formato ISO para brasileiro
function convertToBRDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR");
}

export default function EditRequestPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const requestId = params.id ? parseInt(params.id) : 0;
  
  const { data: request, isLoading } = useQuery<FreightRequestWithQuote>({
    queryKey: [`/api/requests/${requestId}`],
    enabled: requestId > 0
  });

  const [formData, setFormData] = useState({
    originCNPJ: "",
    originCompanyName: "",
    originStreet: "",
    originCity: "",
    originState: "",
    originZipCode: "",
    destinationCNPJ: "",
    destinationCompanyName: "",
    destinationStreet: "",
    destinationCity: "",
    destinationState: "",
    destinationZipCode: "",
    cargoType: "",
    weight: "",
    invoiceValue: "",
    cargoDescription: "",
    packageQuantity: "",
    pickupDate: "",
    deliveryDate: "",
    notes: "",
    requireInsurance: false
  });

  // Update form data when request is loaded
  useEffect(() => {
    if (request) {
      setFormData({
        originCNPJ: request.originCNPJ || "",
        originCompanyName: request.originCompanyName || "",
        originStreet: request.originStreet || "",
        originCity: request.originCity || "",
        originState: request.originState || "",
        originZipCode: request.originZipCode || "",
        destinationCNPJ: request.destinationCNPJ || "",
        destinationCompanyName: request.destinationCompanyName || "",
        destinationStreet: request.destinationStreet || "",
        destinationCity: request.destinationCity || "",
        destinationState: request.destinationState || "",
        destinationZipCode: request.destinationZipCode || "",
        cargoType: request.cargoType || "",
        weight: request.weight?.toString() || "",
        invoiceValue: request.invoiceValue?.toString() || "",
        cargoDescription: request.cargoDescription || "",
        packageQuantity: request.packageQuantity?.toString() || "",
        pickupDate: request.pickupDate || "",
        deliveryDate: request.deliveryDate || "",
        notes: request.notes || "",
        requireInsurance: request.requireInsurance || false
      });
    }
  }, [request]);

  // Update request mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!request) throw new Error("Request não carregada");
      const res = await api("PUT", `/api/requests/${requestId}`, {
        ...formData,
        userId: request.userId,
        weight: parseFloat(formData.weight) || 0,
        volume: parseFloat((formData as any).volume) || 0,
        invoiceValue: parseFloat(formData.invoiceValue) || 0,
        packageQuantity: formData.packageQuantity ? parseInt(formData.packageQuantity) : null,
        originCNPJ: formData.originCNPJ || "",
        originCompanyName: formData.originCompanyName || "",
        originZipCode: formData.originZipCode || "",
        destinationCNPJ: formData.destinationCNPJ || "",
        destinationCompanyName: formData.destinationCompanyName || "",
        destinationZipCode: formData.destinationZipCode || "",
        cargoDescription: formData.cargoDescription || ""
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Solicitação atualizada",
        description: "A solicitação foi atualizada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/requests/${requestId}`] });
      console.log("Redirecionando para /requests...");
      window.location.href = "/requests";
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (!request) {
    return <div>Solicitação não encontrada</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            className="flex items-center text-primary p-0 h-auto"
            onClick={() => navigate(`/requests/${requestId}`)}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-neutral-700">
              Editar Solicitação #{request.id}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Origin Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-700">Origem</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="originCNPJ">CNPJ</Label>
                    <Input
                      id="originCNPJ"
                      value={formData.originCNPJ}
                      onChange={(e) => setFormData({ ...formData, originCNPJ: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="originCompanyName">Nome da Empresa</Label>
                    <Input
                      id="originCompanyName"
                      value={formData.originCompanyName}
                      onChange={(e) => setFormData({ ...formData, originCompanyName: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="originStreet">Endereço</Label>
                    <Input
                      id="originStreet"
                      value={formData.originStreet}
                      onChange={(e) => setFormData({ ...formData, originStreet: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="originCity">Cidade</Label>
                    <Input
                      id="originCity"
                      value={formData.originCity}
                      onChange={(e) => setFormData({ ...formData, originCity: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="originState">Estado</Label>
                    <Input
                      id="originState"
                      value={formData.originState}
                      onChange={(e) => setFormData({ ...formData, originState: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="originZipCode">CEP</Label>
                    <Input
                      id="originZipCode"
                      value={formData.originZipCode}
                      onChange={(e) => setFormData({ ...formData, originZipCode: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Destination Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-700">Destino</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="destinationCNPJ">CNPJ</Label>
                    <Input
                      id="destinationCNPJ"
                      value={formData.destinationCNPJ}
                      onChange={(e) => setFormData({ ...formData, destinationCNPJ: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="destinationCompanyName">Nome da Empresa</Label>
                    <Input
                      id="destinationCompanyName"
                      value={formData.destinationCompanyName}
                      onChange={(e) => setFormData({ ...formData, destinationCompanyName: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="destinationStreet">Endereço</Label>
                    <Input
                      id="destinationStreet"
                      value={formData.destinationStreet}
                      onChange={(e) => setFormData({ ...formData, destinationStreet: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="destinationCity">Cidade</Label>
                    <Input
                      id="destinationCity"
                      value={formData.destinationCity}
                      onChange={(e) => setFormData({ ...formData, destinationCity: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="destinationState">Estado</Label>
                    <Input
                      id="destinationState"
                      value={formData.destinationState}
                      onChange={(e) => setFormData({ ...formData, destinationState: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="destinationZipCode">CEP</Label>
                    <Input
                      id="destinationZipCode"
                      value={formData.destinationZipCode}
                      onChange={(e) => setFormData({ ...formData, destinationZipCode: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Cargo Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-700">Carga</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cargoType">Tipo de Carga</Label>
                    <Input
                      id="cargoType"
                      value={formData.cargoType}
                      onChange={(e) => setFormData({ ...formData, cargoType: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="weight">Peso (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.01"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="invoiceValue">Valor da Nota Fiscal</Label>
                    <Input
                      id="invoiceValue"
                      type="number"
                      step="0.01"
                      value={formData.invoiceValue}
                      onChange={(e) => setFormData({ ...formData, invoiceValue: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="packageQuantity">Quantidade de Volumes</Label>
                    <Input
                      id="packageQuantity"
                      type="number"
                      value={formData.packageQuantity}
                      onChange={(e) => setFormData({ ...formData, packageQuantity: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cargoDescription">Descrição da Carga</Label>
                  <Textarea
                    id="cargoDescription"
                    value={formData.cargoDescription}
                    onChange={(e) => setFormData({ ...formData, cargoDescription: e.target.value })}
                  />
                </div>
              </div>

              {/* Dates Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-neutral-700">Datas</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pickupDate">Data de Retirada</Label>
                    <Input
                      id="pickupDate"
                      type="date"
                      value={formData.pickupDate}
                      onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="deliveryDate">Data de Entrega</Label>
                    <Input
                      id="deliveryDate"
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit">
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 