import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DeliveryProof } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileCheck, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type DeliveryProofViewerProps = {
  requestId: number;
  requestStatus: string;
};

export function DeliveryProofViewer({ requestId, requestStatus }: DeliveryProofViewerProps) {
  // Buscar comprovante existente
  const { 
    data: existingProof,
    isLoading
  } = useQuery<DeliveryProof>({
    queryKey: [`/api/requests/${requestId}/delivery-proof`],
    enabled: requestStatus === "accepted" || requestStatus === "completed",
    // Se a requisição falhar com 404, não tratar como erro, apenas retornar undefined
    retry: (failureCount, error: any) => {
      return failureCount < 1 && error.status !== 404;
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-36 mb-2" />
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Se o comprovante existe, mostrar
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

  // Se não existe comprovante
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Package className="h-5 w-5 mr-2 text-muted-foreground" />
          Comprovante de Entrega
        </CardTitle>
        <CardDescription>
          {requestStatus === "completed" 
            ? "A entrega foi concluída, mas não há um comprovante disponível."
            : "A transportadora ainda não enviou o comprovante de entrega."}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}