import nodemailer from 'nodemailer';
import { log } from '../vite';

// Configuração do transportador de email
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // true para 465, false para outras portas
  auth: {
    user: 'noreply@logmene.com', // ou outro email que você quiser usar como remetente
    pass: process.env.BREVO_API_KEY || ''
  }
});

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  // Se não tiver configurado a API key, apenas loga e retorna como enviado
  if (!process.env.BREVO_API_KEY) {
    log(`[Email simulado] Para: ${params.to}, Assunto: ${params.subject}`, 'email-service');
    log(`[Email simulado] Conteúdo: ${params.text || params.html}`, 'email-service');
    return true;
  }

  try {
    // Enviando email usando nodemailer
    const info = await transporter.sendMail({
      from: params.from,
      to: params.to,
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    });
    
    log(`Email enviado para ${params.to}. ID da mensagem: ${info.messageId}`, 'email-service');
    return true;
  } catch (error) {
    console.error('Brevo email error:', error);
    return false;
  }
}

/**
 * Envia um email de notificação para a transportadora quando uma nova solicitação de frete é criada
 * @param companyEmail Email da transportadora
 * @param companyName Nome da transportadora
 * @param requestId ID da solicitação de frete
 * @param clientName Nome do cliente que criou a solicitação
 * @param freightDetails Detalhes adicionais sobre o frete (origem, destino, etc.)
 */
export async function sendNewFreightRequestEmail(
  companyEmail: string,
  companyName: string,
  requestId: number,
  clientName: string,
  freightDetails: string
): Promise<boolean> {
  const message = `
    <div style="margin-bottom: 15px;">
      <p>Uma nova solicitação de frete (#${requestId}) foi registrada por <strong>${clientName}</strong>.</p>
      <p>Detalhes da solicitação:</p>
      <p>${freightDetails}</p>
      <p>Por favor, acesse o sistema para avaliar e enviar uma cotação para esta solicitação o mais breve possível.</p>
    </div>
  `;

  const emailParams = createNotificationEmail(
    companyEmail,
    companyName,
    'new_request',
    requestId,
    message
  );

  return await sendEmail(emailParams);
}

export function createNotificationEmail(
  userEmail: string, 
  userName: string, 
  notificationType: string, 
  requestId: number,
  message: string
): EmailParams {
  const from = 'noreply@logmene.com';
  const templates: Record<string, { subject: string, intro: string }> = {
    'status_update': {
      subject: 'Atualização de Status - LogMene',
      intro: `Olá ${userName}, sua solicitação de frete #${requestId} teve uma atualização de status.`
    },
    'quote_received': {
      subject: 'Nova Cotação Recebida - LogMene',
      intro: `Olá ${userName}, você recebeu uma nova cotação para sua solicitação de frete #${requestId}.`
    },
    'proof_uploaded': {
      subject: 'Comprovante de Entrega - LogMene',
      intro: `Olá ${userName}, um comprovante de entrega foi adicionado à sua solicitação de frete #${requestId}.`
    },
    'new_request': {
      subject: 'Nova Solicitação de Frete - LogMene',
      intro: `Olá ${userName}, uma nova solicitação de frete #${requestId} foi registrada no sistema.`
    },
    'default': {
      subject: 'Notificação - LogMene',
      intro: `Olá ${userName}, você tem uma notificação relacionada à sua solicitação de frete #${requestId}.`
    }
  };

  const template = templates[notificationType] || templates.default;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2E3192; color: white; padding: 10px 20px; border-radius: 4px 4px 0 0; }
    .content { border: 1px solid #eee; padding: 20px; border-radius: 0 0 4px 4px; }
    .button { display: inline-block; background-color: #2E3192; color: white; padding: 10px 20px; 
              text-decoration: none; border-radius: 4px; margin-top: 20px; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>LogMene - Sistema de Logística</h2>
    </div>
    <div class="content">
      <p>${template.intro}</p>
      <p>${message}</p>
      <p>Por favor, acesse o sistema para visualizar mais detalhes e tomar as ações necessárias.</p>
      <p>Se você tiver dúvidas, entre em contato com nossa equipe de suporte.</p>
    </div>
    <div class="footer">
      <p>Este é um email automático, por favor não responda.</p>
      <p>&copy; ${new Date().getFullYear()} LogMene. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
`;

  return {
    to: userEmail,
    from,
    subject: template.subject,
    html
  };
}