import { storage } from '../storage';
import { createNotificationEmail as createEmailNotification, sendEmail } from './email-service';
import { createNotificationEmail as createBrevoNotification, sendEmail as sendBrevoEmail } from './brevo-email-service';
import { sendNewFreightRequestWhatsApp, sendStatusUpdateWhatsApp, sendDeliveryProofWhatsApp } from './whatsapp-service';
import { log } from '../vite';
import { InsertNotification } from '@shared/schema';

/**
 * Serviço para enviar notificações para usuários
 * Permite envio de notificações in-app, email e WhatsApp quando configurados
 */
export async function sendNotification({
  userId,
  requestId,
  type,
  message,
  sendEmail: shouldSendEmail = true,
  sendWhatsApp: shouldSendWhatsApp = true,
}: {
  userId: number;
  requestId: number | null;
  type: InsertNotification['type'];
  message: string;
  sendEmail?: boolean;
  sendWhatsApp?: boolean;
}) {
  try {
    // Buscar usuário para obter email, telefone e nome
    const user = await storage.getUser(userId);
    if (!user) {
      log(`Usuário não encontrado para envio de notificação: ${userId}`, 'notification-service');
      return false;
    }

    // Criar notificação no sistema
    const notification = await storage.createNotification({
      userId,
      requestId,
      type,
      message,
      read: false,
    });

    log(`Notificação interna criada: [${type}] ${message} para usuário ${userId}`, 'notification-service');

    // Se solicitado, enviar também por email
    if (shouldSendEmail && user.email) {
      try {
        // Preferimos usar o Brevo se estiver configurado
        if (process.env.BREVO_API_KEY) {
          const emailParams = createBrevoNotification(
            user.email,
            user.fullName || user.username,
            type,
            requestId || 0,
            message
          );

          try {
            // Tentamos com Brevo primeiro
            const result = await sendBrevoEmail(emailParams);
            if (result) {
              log(`Email enviado via Brevo para ${user.email}`, 'notification-service');
            } else {
              throw new Error('Falha no envio com Brevo');
            }
          } catch (brewoError) {
            log(`Falha no envio com Brevo, tentando serviço padrão: ${brewoError}`, 'notification-service');
            
            // Fallback para o serviço de email original
            const fallbackParams = createEmailNotification(
              user.email,
              user.fullName || user.username,
              type,
              requestId || 0,
              message
            );
            
            await sendEmail(fallbackParams);
            log(`Email enviado via serviço padrão para ${user.email} (fallback)`, 'notification-service');
          }
        } else {
          // Se não tiver Brevo configurado, usa serviço padrão
          const emailParams = createEmailNotification(
            user.email,
            user.fullName || user.username,
            type,
            requestId || 0,
            message
          );

          await sendEmail(emailParams);
          log(`Email enviado via serviço padrão para ${user.email}`, 'notification-service');
        }
      } catch (error) {
        log(`Erro ao enviar email de notificação: ${error}`, 'notification-service');
        // Continuamos a execução mesmo se o email falhar
      }
    }

    // Se solicitado e configurado, enviar também por WhatsApp
    if (shouldSendWhatsApp && user.phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const userName = user.fullName || user.username;
        let whatsappSent = false;

        // Usar o tipo da notificação para determinar qual função de WhatsApp chamar
        if (type === 'status_update' && requestId) {
          // Extrair o status da mensagem para notificações de atualização de status
          const statusMatch = message.match(/atualizado para "([^"]+)"/);
          const status = statusMatch ? statusMatch[1] : 'atualizado';
          
          whatsappSent = await sendStatusUpdateWhatsApp(user.phone, userName, requestId, status);
        } 
        else if (type === 'proof_uploaded' && requestId) {
          whatsappSent = await sendDeliveryProofWhatsApp(user.phone, userName, requestId);
        }
        else if (type === 'quote_received' && requestId) {
          // Para notificações de cotação, usamos a função de status atualizado com status "cotado"
          whatsappSent = await sendStatusUpdateWhatsApp(user.phone, userName, requestId, 'quoted');
        }

        if (whatsappSent) {
          log(`WhatsApp enviado para ${user.phone} (${type})`, 'notification-service');
        }
      } catch (error) {
        log(`Erro ao enviar WhatsApp: ${error}`, 'notification-service');
        // Continuamos a execução mesmo se o WhatsApp falhar
      }
    }

    return true;
  } catch (error) {
    log(`Erro ao enviar notificação: ${error}`, 'notification-service');
    return false;
  }
}

/**
 * Enviar notificação de atualização de status de frete
 */
export async function sendStatusUpdateNotification(userId: number, requestId: number, status: string) {
  const statusMessages: Record<string, string> = {
    'quoted': 'Uma nova cotação foi criada para sua solicitação de frete.',
    'accepted': 'Sua solicitação de frete foi aceita e está em andamento.',
    'rejected': 'Sua solicitação de frete foi recusada.',
    'completed': 'Seu frete foi entregue e concluído com sucesso.',
  };

  const message = statusMessages[status] || `O status da sua solicitação foi atualizado para "${status}".`;

  return sendNotification({
    userId,
    requestId,
    type: 'status_update',
    message,
  });
}

/**
 * Enviar notificação de recebimento de cotação
 */
export async function sendQuoteNotification(userId: number, requestId: number, value: number) {
  const formattedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);

  const message = `Uma cotação no valor de ${formattedValue} foi enviada para sua solicitação de frete. Acesse o sistema para revisar e responder.`;

  return sendNotification({
    userId,
    requestId,
    type: 'quote_received',
    message,
  });
}

/**
 * Enviar notificação de upload de comprovante de entrega
 */
export async function sendDeliveryProofNotification(userId: number, requestId: number) {
  const message = `Um comprovante de entrega foi adicionado à sua solicitação de frete. Acesse o sistema para visualizar.`;

  return sendNotification({
    userId,
    requestId,
    type: 'proof_uploaded',
    message,
  });
}

/**
 * Enviar notificação para empresa quando uma nova solicitação de frete é criada
 */
export async function sendNewFreightRequestNotification(companyUserId: number, requestId: number, clientName: string) {
  const message = `Nova solicitação de frete recebida do cliente ${clientName}. Acesse o sistema para enviar uma cotação.`;

  // Buscar a empresa para enviar WhatsApp direto pela função especializada
  const company = await storage.getUser(companyUserId);
  if (company && company.phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      await sendNewFreightRequestWhatsApp(
        company.phone,
        company.fullName || company.username,
        requestId,
        clientName
      );
      log(`WhatsApp de nova solicitação enviado para ${company.phone}`, 'notification-service');
    } catch (error) {
      log(`Erro ao enviar WhatsApp de nova solicitação: ${error}`, 'notification-service');
    }
  }

  return sendNotification({
    userId: companyUserId,
    requestId,
    type: 'status_update',
    message,
    // Não enviar WhatsApp pela função genérica, pois já enviamos diretamente acima
    sendWhatsApp: false 
  });
}