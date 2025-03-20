// API de notificações para ambiente Vercel
import { createDb } from './db.js';
import { notifications } from '../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

// Verificar autenticação com JWT
function authenticateUser(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.split(' ')[1];
    return jwt.verify(
      token, 
      process.env.JWT_SECRET || 'seu_segredo_jwt_aqui'
    ).user;
  } catch (error) {
    console.error('Erro ao autenticar usuário:', error);
    return null;
  }
}

export default async function handler(req, res) {
  // Verificar autenticação
  const user = authenticateUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  const db = createDb();
  
  // Roteamento baseado no método e caminho
  const path = req.url.replace('/api/notifications', '').split('?')[0];
  
  switch (path) {
    // Criar uma nova notificação
    case '/create':
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
      }
      
      try {
        const { userId, type, requestId, content, isRead = false } = req.body;
        
        if (!userId || !type || !content) {
          return res.status(400).json({ error: 'Usuário, tipo e conteúdo são obrigatórios' });
        }
        
        // Criar notificação
        const [notification] = await db.insert(notifications)
          .values({
            userId,
            type,
            requestId: requestId || null,
            content,
            isRead,
            createdAt: new Date()
          })
          .returning();
          
        return res.status(201).json(notification);
      } catch (error) {
        console.error('Erro ao criar notificação:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
    
    // Obter notificações do usuário
    case '':
    case '/':
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
      }
      
      try {
        // Obter notificações do usuário autenticado
        const userNotifications = await db.select()
          .from(notifications)
          .where(eq(notifications.userId, user.id))
          .orderBy(desc(notifications.createdAt))
          .limit(20); // Limitar para melhorar performance
          
        return res.status(200).json(userNotifications);
      } catch (error) {
        console.error('Erro ao obter notificações:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
    
    // Marcar notificação como lida
    case '/mark-read':
      if (req.method !== 'PUT' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
      }
      
      try {
        const { id } = req.body;
        
        if (!id) {
          return res.status(400).json({ error: 'ID da notificação é obrigatório' });
        }
        
        // Obter a notificação
        const [notification] = await db.select()
          .from(notifications)
          .where(eq(notifications.id, id))
          .limit(1);
          
        if (!notification) {
          return res.status(404).json({ error: 'Notificação não encontrada' });
        }
        
        // Verificar se a notificação pertence ao usuário
        if (notification.userId !== user.id) {
          return res.status(403).json({ error: 'Acesso negado' });
        }
        
        // Marcar como lida
        const [updatedNotification] = await db.update(notifications)
          .set({ isRead: true })
          .where(eq(notifications.id, id))
          .returning();
          
        return res.status(200).json(updatedNotification);
      } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
    
    // Marcar todas as notificações como lidas
    case '/mark-all-read':
      if (req.method !== 'PUT' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
      }
      
      try {
        // Marcar todas as notificações do usuário como lidas
        await db.update(notifications)
          .set({ isRead: true })
          .where(and(
            eq(notifications.userId, user.id),
            eq(notifications.isRead, false)
          ));
          
        return res.status(200).json({ message: 'Todas as notificações marcadas como lidas' });
      } catch (error) {
        console.error('Erro ao marcar todas notificações como lidas:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
    
    // Contar notificações não lidas
    case '/count':
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
      }
      
      try {
        // Contar notificações não lidas do usuário
        const unreadNotifications = await db.select()
          .from(notifications)
          .where(and(
            eq(notifications.userId, user.id),
            eq(notifications.isRead, false)
          ));
          
        return res.status(200).json({ count: unreadNotifications.length });
      } catch (error) {
        console.error('Erro ao contar notificações não lidas:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
    default:
      return res.status(404).json({ error: 'Rota não encontrada' });
  }
}