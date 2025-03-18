import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BarChart2, PieChart, TruckIcon, CheckCircle, AlertCircle, ArrowDown, Users } from "lucide-react";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { FreightRequestWithQuote } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

export default function CompanyHomePage() {
  const [, navigate] = useLocation();
  
  const { data: pendingRequests, isLoading: isPendingLoading } = useQuery<FreightRequestWithQuote[]>({
    queryKey: ["/api/company/pending-requests"],
  });
  
  const { data: activeRequests, isLoading: isActiveLoading } = useQuery<FreightRequestWithQuote[]>({
    queryKey: ["/api/company/active-requests"],
  });
  
  // Calculate statistics
  const stats = {
    newRequests: pendingRequests?.length || 0,
    quoted: activeRequests?.filter(req => req.status === "quoted").length || 0,
    inProgress: activeRequests?.filter(req => req.status === "accepted").length || 0,
    completed: 0, // For demonstration purposes
  };
  
  // Define columns for pending requests table
  const pendingRequestsColumns: ColumnDef<FreightRequestWithQuote>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => <span className="font-medium">#{row.getValue("id")}</span>,
    },
    {
      accessorKey: "clientName",
      header: "Cliente",
    },
    {
      accessorKey: "route",
      header: "Origem/Destino",
      cell: ({ row }) => {
        const request = row.original;
        return (
          <div>
            <div>{request.origin}</div>
            <div className="text-xs text-neutral-500 flex items-center">
              <ArrowDown className="h-3 w-3 mr-1" />
              <span>{request.destination}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "pickupDate",
      header: "Data Solicitada",
    },
    {
      id: "actions",
      header: () => <div className="text-right">Ações</div>,
      cell: ({ row }) => {
        return (
          <div className="text-right">
            <Button
              variant="link"
              className="h-8 px-2 text-primary"
              onClick={() => navigate(`/company/quotes/${row.original.id}`)}
            >
              Cotar
            </Button>
          </div>
        );
      },
    },
  ];
  
  // Define columns for active requests table
  const activeRequestsColumns: ColumnDef<FreightRequestWithQuote>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => <span className="font-medium">#{row.getValue("id")}</span>,
    },
    {
      accessorKey: "clientName",
      header: "Cliente",
    },
    {
      accessorKey: "route",
      header: "Rota",
      cell: ({ row }) => {
        return `${row.original.origin} → ${row.original.destination}`;
      },
    },
    {
      accessorKey: "deliveryDate",
      header: "Entrega Prevista",
    },
    {
      id: "actions",
      header: () => <div className="text-right">Ações</div>,
      cell: ({ row }) => {
        const isAccepted = row.original.status === "accepted";
        return (
          <div className="text-right">
            <Button
              variant="link"
              className="h-8 px-2 text-primary"
              onClick={() => {
                if (isAccepted) {
                  navigate(`/company/freights/${row.original.id}`);
                } else {
                  navigate(`/company/quotes/${row.original.id}`);
                }
              }}
            >
              {isAccepted ? "Atualizar" : "Ver Detalhes"}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <Header title="FreteApp" />
      
      <main className="flex-1 container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h2 className="text-2xl font-bold text-neutral-700">Painel da Transportadora</h2>
          
          <div className="mt-3 md:mt-0">
            <Button 
              onClick={() => navigate("/company/clients")} 
              className="flex items-center gap-2"
              variant="outline"
            >
              <Users className="h-4 w-4" />
              Gerenciar Clientes
            </Button>
          </div>
        </div>
        
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {isPendingLoading || isActiveLoading ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-neutral-700">Novas Solicitações</h3>
                    <AlertCircle className="h-5 w-5 text-[#2196F3]" />
                  </div>
                  <p className="text-3xl font-bold text-[#2196F3]">{stats.newRequests}</p>
                  <p className="text-sm text-neutral-500">Aguardando cotação</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-neutral-700">Cotadas</h3>
                    <PieChart className="h-5 w-5 text-[#FF9800]" />
                  </div>
                  <p className="text-3xl font-bold text-[#FF9800]">{stats.quoted}</p>
                  <p className="text-sm text-neutral-500">Aguardando resposta</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-neutral-700">Em Andamento</h3>
                    <TruckIcon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-3xl font-bold text-primary">{stats.inProgress}</p>
                  <p className="text-sm text-neutral-500">Fretes ativos</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-neutral-700">Concluídas</h3>
                    <CheckCircle className="h-5 w-5 text-[#4CAF50]" />
                  </div>
                  <p className="text-3xl font-bold text-[#4CAF50]">{stats.completed}</p>
                  <p className="text-sm text-neutral-500">No último mês</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
        
        {/* New Requests Section */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-neutral-700">Novas Solicitações</CardTitle>
          </CardHeader>
          
          {isPendingLoading ? (
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          ) : (
            <CardContent className="p-0">
              <DataTable 
                columns={pendingRequestsColumns}
                data={pendingRequests || []}
              />
            </CardContent>
          )}
        </Card>
        
        {/* In Progress Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-neutral-700">Fretes em Andamento</CardTitle>
          </CardHeader>
          
          {isActiveLoading ? (
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          ) : (
            <CardContent className="p-0">
              <DataTable 
                columns={activeRequestsColumns}
                data={activeRequests || []}
              />
            </CardContent>
          )}
        </Card>
      </main>
      
      <BottomNavigation />
    </div>
  );
}
