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
    // Estado para zoom
    const [zoom, setZoom] = useState(1);
    const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 3));
    const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.4));
    const handleResetZoom = () => setZoom(1);

    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileCheck className="h-5 w-5 mr-2 text-green-500" />
            Comprovante de Entrega
          </CardTitle>
          <CardDescription>
            {requestStatus === "completed" 
              ? "A entrega foi concluída com sucesso."
              : "A transportadora enviou o comprovante de entrega."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 mb-2 justify-center">
            <button onClick={handleZoomOut} className="px-2 py-1 border rounded text-lg" title="Diminuir zoom">-</button>
            <button onClick={handleResetZoom} className="px-2 py-1 border rounded text-lg" title="Resetar zoom">⟳</button>
            <button onClick={handleZoomIn} className="px-2 py-1 border rounded text-lg" title="Aumentar zoom">+</button>
          </div>
          <div
            className="flex justify-center items-center rounded-md overflow-auto border bg-muted/20 p-4"
            style={{ width: '100%', height: 'auto', maxWidth: '100%', maxHeight: 900 }}
          >
            <img 
              src={existingProof.proofImage} 
              alt="Comprovante de entrega" 
              style={{
                width: 'auto',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
                margin: '0 auto',
                transform: `rotate(90deg) scale(${zoom})`,
                maxWidth: '100%',
                transition: 'transform 0.2s',
              }}
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