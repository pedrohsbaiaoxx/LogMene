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
import { Quote } from "../../types";

export default function EditQuotePage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const quoteId = params.id ? parseInt(params.id) : 0;
  
  const { data: quote, isLoading } = useQuery<Quote>({
    queryKey: [`/api/quotes/${quoteId}`],
    enabled: quoteId > 0
  });

  const [formData, setFormData] = useState({
    value: "",
    estimatedDays: "",
    distanceKm: "",
    notes: ""
  });

  // Update form data when quote is loaded
  useEffect(() => {
    if (quote) {
      setFormData({
        value: quote.value?.toString() || "",
        estimatedDays: quote.estimatedDays?.toString() || "",
        distanceKm: quote.distanceKm?.toString() || "",
        notes: quote.notes || ""
      });
    }
  }, [quote]);

  // Update quote mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await api("PUT", `/api/quotes/${quoteId}`, {
        ...formData,
        value: parseFloat(formData.value),
        estimatedDays: parseInt(formData.estimatedDays),
        distanceKm: formData.distanceKm ? parseFloat(formData.distanceKm) : undefined
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Cotação atualizada",
        description: "A cotação foi atualizada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/quotes/${quoteId}`] });
      navigate(`/request/${quote?.requestId}`);
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

  if (!quote) {
    return <div>Cotação não encontrada</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            className="flex items-center text-primary p-0 h-auto"
            onClick={() => navigate(`/request/${quote.requestId}`)}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-neutral-700">
              Editar Cotação
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Valor (R$)</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="estimatedDays">Prazo Estimado (dias)</Label>
                  <Input
                    id="estimatedDays"
                    type="number"
                    value={formData.estimatedDays}
                    onChange={(e) => setFormData({ ...formData, estimatedDays: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="distanceKm">Distância (km)</Label>
                  <Input
                    id="distanceKm"
                    type="number"
                    step="0.01"
                    value={formData.distanceKm}
                    onChange={(e) => setFormData({ ...formData, distanceKm: e.target.value })}
                  />
                </div>
              </div>

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