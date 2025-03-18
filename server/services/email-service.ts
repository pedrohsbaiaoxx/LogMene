import { MailService } from '@sendgrid/mail';
import { log } from '../vite';

const mailService = new MailService();

// Configuração inicial da chave API
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  // Se não tiver configurado a API key, apenas loga e retorna como enviado
  if (!process.env.SENDGRID_API_KEY) {
    log(`[Email simulado] Para: ${params.to}, Assunto: ${params.subject}`, 'email-service');
    log(`[Email simulado] Conteúdo: ${params.text || params.html}`, 'email-service');
    return true;
  }

  try {
    await mailService.send({
      to: params.to,
      from: params.from, // deve ser um remetente verificado no SendGrid
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    });
    log(`Email enviado para ${params.to}`, 'email-service');
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
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
      <a href="https://logmene.replit.app" class="button">Acessar Sistema</a>
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