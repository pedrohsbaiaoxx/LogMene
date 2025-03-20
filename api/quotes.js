// API de cotações para ambiente Vercel
import { createDb } from './db.js';
import { quotes, freightRequests, users } from '../shared/schema.js';
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
  const path = req.url.replace('/api/quotes', '').split('?')[0];
  
  switch (path) {
    // Criar uma nova cotação
    case '/create':
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
      }
      
      // Verificar se é uma empresa
      if (!checkUserRole(user, 'company')) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      try {
        const quoteData = req.body;
        
        if (!quoteData.requestId || !quoteData.value) {
          return res.status(400).json({ error: 'ID da solicitação e valor são obrigatórios' });
        }
        
        // Verificar se a solicitação existe e está pendente
        const [request] = await db.select()
          .from(freightRequests)
          .where(eq(freightRequests.id, quoteData.requestId))
          .limit(1);
          
        if (!request) {
          return res.status(404).json({ error: 'Solicitação não encontrada' });
        }
        
        if (request.status !== 'pending') {
          return res.status(400).json({ error: 'A solicitação não está em estado pendente' });
        }
        
        // Verificar se já existe uma cotação para esta solicitação
        const existingQuote = await db.select()
          .from(quotes)
          .where(eq(quotes.requestId, quoteData.requestId))
          .limit(1);
          
        if (existingQuote.length > 0) {
          return res.status(400).json({ error: 'Já existe uma cotação para esta solicitação' });
        }
        
        // Criar cotação
        const [quote] = await db.insert(quotes)
          .values({
            ...quoteData,
            createdAt: new Date()
          })
          .returning();
          
        // Atualizar status da solicitação para 'quoted'
        await db.update(freightRequests)
          .set({ status: 'quoted', updatedAt: new Date() })
          .where(eq(freightRequests.id, quoteData.requestId));
          
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
              subject: `Cotação recebida para solicitação #${quoteData.requestId}`,
              html: `
                <h2>Cotação Recebida</h2>
                <p>Olá ${client.fullName},</p>
                <p>Você recebeu uma cotação para a solicitação de frete #${quoteData.requestId}.</p>
                <p>Valor: R$ ${parseFloat(quoteData.value).toFixed(2)}</p>
                <p>Detalhes adicionais: ${quoteData.details || 'Não especificados'}</p>
                <p>Acesse o sistema LogMene para aceitar ou recusar esta cotação.</p>
                <p>Atenciosamente,<br>Equipe LogMene</p>
              `
            });
          }
        } catch (emailError) {
          console.error('Erro ao enviar notificação por email:', emailError);
          // Não falhar a operação se o email falhar
        }
        
        return res.status(201).json(quote);
      } catch (error) {
        console.error('Erro ao criar cotação:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
    
    // Obter cotação de uma solicitação específica
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
        
        // Obter a cotação
        const [quote] = await db.select()
          .from(quotes)
          .where(eq(quotes.requestId, Number(requestId)))
          .limit(1);
          
        if (!quote) {
          return res.status(404).json({ error: 'Cotação não encontrada' });
        }
        
        return res.status(200).json(quote);
      } catch (error) {
        console.error('Erro ao obter cotação:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
    default:
      return res.status(404).json({ error: 'Rota não encontrada' });
  }
}