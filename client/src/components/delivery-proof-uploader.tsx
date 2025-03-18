import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DeliveryProof, FreightRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, Clock, FileCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Esquema de validação para o formulário de upload
const deliveryProofSchema = z.object({
  proofImage: z.string().min(5, {
    message: "URL da imagem deve ter pelo menos 5 caracteres",
  }),
  notes: z.string().optional(),
});

type DeliveryProofUploaderProps = {
  requestId: number;
  requestStatus: string;
  onSuccess?: () => void;
};

export function DeliveryProofUploader({ requestId, requestStatus, onSuccess }: DeliveryProofUploaderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isViewMode, setIsViewMode] = useState(false);
  
  // Buscar comprovante existente
  const { 
    data: existingProof,
    isLoading: isLoadingProof
  } = useQuery<DeliveryProof>({
    queryKey: [`/api/requests/${requestId}/delivery-proof`],
    enabled: requestStatus === "accepted" || requestStatus === "completed",
    // Se a requisição falhar com 404, não tratar como erro, apenas retornar undefined
    retry: (failureCount, error: any) => {
      return failureCount < 1 && error.status !== 404;
    },
  });

  // Definição do formulário
  const form = useForm<z.infer<typeof deliveryProofSchema>>({
    resolver: zodResolver(deliveryProofSchema),
    defaultValues: {
      proofImage: "",
      notes: "",
    },
  });

  // Mutação para upload do comprovante
  const uploadMutation = useMutation({
    mutationFn: async (values: z.infer<typeof deliveryProofSchema>) => {
      const response = await apiRequest("POST", "/api/delivery-proofs", {
        requestId,
        proofImage: values.proofImage,
        notes: values.notes || "",
      });
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Comprovante enviado",
        description: "Comprovante de entrega enviado com sucesso.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/requests/${requestId}/delivery-proof`] });
      queryClient.invalidateQueries({ queryKey: [`/api/requests/${requestId}`] });
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar comprovante",
        description: error.message || "Ocorreu um erro ao enviar o comprovante de entrega.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: z.infer<typeof deliveryProofSchema>) {
    uploadMutation.mutate(values);
  }

  // Se o comprovante já existe, mostrar em modo de visualização
  if (existingProof) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileCheck className="h-5 w-5 mr-2 text-green-500" />
            Comprovante de Entrega
          </CardTitle>
          <CardDescription>
            Enviado em {existingProof.createdAt ? new Date(existingProof.createdAt).toLocaleDateString('pt-BR') : '-'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="aspect-video rounded-md overflow-hidden border bg-muted/20">
            <img 
              src={existingProof.proofImage} 
              alt="Comprovante de entrega" 
              className="w-full h-full object-cover"
            />
          </div>
          
          {existingProof.notes && (
            <div>
              <h4 className="font-medium mb-1 text-sm">Observações:</h4>
              <p className="text-sm text-muted-foreground">{existingProof.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Se a requisição não foi aceita, não mostrar o uploader
  if (requestStatus !== "accepted") {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
            Comprovante de Entrega
          </CardTitle>
          <CardDescription>
            O comprovante de entrega só pode ser enviado quando a solicitação for aceita.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Formulário de upload
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Upload className="h-5 w-5 mr-2 text-primary" />
          Enviar Comprovante de Entrega
        </CardTitle>
        <CardDescription>
          Forneça uma URL de imagem do comprovante de entrega para esta solicitação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="proofImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Imagem</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://exemplo.com/imagem.jpg" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    URL da imagem do comprovante de entrega (foto da assinatura, comprovante, etc)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Informações adicionais sobre a entrega..." 
                      className="resize-none" 
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
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? "Enviando..." : "Enviar Comprovante"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}