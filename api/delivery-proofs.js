// API de comprovantes de entrega para ambiente Vercel
import { createDb } from './db.js';
import { deliveryProofs, freightRequests, users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { sendEmailViaSMTP } from './email-service.js';

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

// Verificar se o usuário tem o papel necessário
function checkUserRole(user, role) {
  return user && user.role === role;
}

export default async function handler(req, res) {
  // Verificar autenticação
  const user = authenticateUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  const db = createDb();
  
  // Roteamento baseado no método e caminho
  const path = req.url.replace('/api/delivery-proofs', '').split('?')[0];
  
  switch (path) {
    // Criar um novo comprovante de entrega
    case '/upload':
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
      }
      
      // Apenas empresas podem criar comprovantes
      if (!checkUserRole(user, 'company')) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      try {
        const { requestId, image, notes } = req.body;
        
        if (!requestId || !image) {
          return res.status(400).json({ error: 'ID da solicitação e imagem são obrigatórios' });
        }
        
        // Verificar se a solicitação existe e está no status correto
        const [request] = await db.select()
          .from(freightRequests)
          .where(eq(freightRequests.id, requestId))
          .limit(1);
          
        if (!request) {
          return res.status(404).json({ error: 'Solicitação não encontrada' });
        }
        
        if (request.status !== 'accepted') {
          return res.status(400).json({ error: 'A solicitação deve estar no status "accepted" para anexar um comprovante' });
        }
        
        // Verificar se já existe um comprovante
        const existingProof = await db.select()
          .from(deliveryProofs)
          .where(eq(deliveryProofs.requestId, requestId))
          .limit(1);
          
        if (existingProof.length > 0) {
          return res.status(400).json({ error: 'Já existe um comprovante para esta solicitação' });
        }
        
        // Criar comprovante
        const [proof] = await db.insert(deliveryProofs)
          .values({
            requestId,
            image,
            notes: notes || null,
            uploadedAt: new Date()
          })
          .returning();

        // Atualizar status e data de conclusão da solicitação
        await db.update(freightRequests)
          .set({ status: 'completed', completedAt: new Date() })
          .where(eq(freightRequests.id, requestId));
          
        // Enviar notificação por email ao cliente
        try {
          // Obter dados do cliente
          const [client] = await db.select()
            .from(users)
            .where(eq(users.id, request.userId))
            .limit(1);
            
          if (client && client.email) {
            await sendEmailViaSMTP({
              to: client.email,
              subject: `Comprovante de entrega para solicitação #${requestId}`,
              html: `
                <h2>Comprovante de Entrega</h2>
                <p>Olá ${client.fullName},</p>
                <p>Um comprovante de entrega foi anexado à sua solicitação de frete #${requestId}.</p>
                <p>Detalhes adicionais: ${notes || 'Não especificados'}</p>
                <p>Acesse o sistema LogMene para visualizar o comprovante e confirmar a entrega.</p>
                <p>Atenciosamente,<br>Equipe LogMene</p>
              `
            });
          }
        } catch (emailError) {
          console.error('Erro ao enviar notificação por email:', emailError);
          // Não falhar a operação se o email falhar
        }
        
        return res.status(201).json(proof);
      } catch (error) {
        console.error('Erro ao criar comprovante:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
    
    // Obter comprovante de uma solicitação específica
    case '':
    case '/':
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
      }
      
      try {
        const { requestId } = req.query;
        
        if (!requestId) {
          return res.status(400).json({ error: 'ID da solicitação é obrigatório' });
        }
        
        // Obter a solicitação
        const [request] = await db.select()
          .from(freightRequests)
          .where(eq(freightRequests.id, Number(requestId)))
          .limit(1);
          
        if (!request) {
          return res.status(404).json({ error: 'Solicitação não encontrada' });
        }
        
        // Verificar permissões
        if (user.role === 'client' && request.userId !== user.id) {
          return res.status(403).json({ error: 'Acesso negado' });
        }
        
        // Obter o comprovante
        const [proof] = await db.select()
          .from(deliveryProofs)
          .where(eq(deliveryProofs.requestId, Number(requestId)))
          .limit(1);
          
        if (!proof) {
          return res.status(404).json({ error: 'Comprovante não encontrado' });
        }
        
        return res.status(200).json(proof);
      } catch (error) {
        console.error('Erro ao obter comprovante:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
    default:
      return res.status(404).json({ error: 'Rota não encontrada' });
  }
}