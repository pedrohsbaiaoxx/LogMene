import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { Notification } from '@shared/schema';

export function useNotifications() {
  const { user } = useAuth();
  
  // Buscar notificações
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch
  } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: !!user,
  });
  
  // Buscar contagem de notificações não lidas
  const { 
    data: unreadCount = 0,
    refetch: refetchCount
  } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/count'],
    enabled: !!user,
    select: (data) => data,
  });
  
  // Marcar notificação como lida
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Erro ao marcar notificação como lida');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Atualizar cache de notificações e contagem
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
    },
  });
  
  // Marcar todas as notificações como lidas
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      // Buscar notificações não lidas
      const notificationsToMark = notifications.filter(n => !n.read);
      
      // Marcar cada uma como lida
      await Promise.all(
        notificationsToMark.map(notification => 
          fetch(`/api/notifications/${notification.id}/read`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
          })
        )
      );
      
      return true;
    },
    onSuccess: () => {
      // Atualizar cache de notificações e contagem
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
    },
  });
  
  return { 
    notifications,
    unreadCount: unreadCount.count || 0,
    isLoading,
    error,
    refetch,
    refetchCount,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}