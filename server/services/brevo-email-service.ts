import { log } from '../vite';
import * as SibApiV3Sdk from 'sib-api-v3-sdk';

// Inicialização da API do Brevo/Sendinblue
let apiInstance: any = null;

// Função para inicializar a API do Brevo
function initBrevoApi() {
  if (apiInstance) {
    return apiInstance; // Se já inicializado, retorna a instância existente
  }

  // Verifica se a chave da API está configurada
  if (!process.env.BREVO_API_KEY) {
    log('BREVO_API_KEY não configurada. O serviço de email não funcionará corretamente.', 'brevo-email');
    return null;
  }

  try {
    // Configuração da API
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    // Criação da instância da API de emails transacionais
    apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    log('API do Brevo inicializada com sucesso', 'brevo-email');
    return apiInstance;
  } catch (error) {
    log(`Erro ao inicializar a API do Brevo: ${error}`, 'brevo-email');
    return null;
  }
}

// Interface para parâmetros do email
export interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Função para enviar email usando o Brevo (Sendinblue)
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  // Se não tiver a chave da API configurada, loga e simula o envio
  if (!process.env.BREVO_API_KEY) {
    log(`[Email simulado] Para: ${params.to}, Assunto: ${params.subject}`, 'brevo-email');
    log(`[Email simulado] Conteúdo: ${params.text || params.html?.substring(0, 150)}...`, 'brevo-email');
    log(`AVISO: BREVO_API_KEY não configurada. Configure para enviar emails reais.`, 'brevo-email');
    return true; // Retorna sucesso para não quebrar o fluxo da aplicação
  }

  // Inicializa a API do Brevo
  const api = initBrevoApi();
  if (!api) {
    log('Falha ao inicializar a API do Brevo', 'brevo-email');
    return false;
  }

  try {
    // Preparação dos dados para o email
    const fromEmail = params.from.includes('<') 
      ? params.from.match(/<(.+)>/)?.[1] || params.from 
      : params.from;
    
    const fromName = params.from.includes('<') 
      ? params.from.match(/(.+)</)?.[1]?.trim() || 'LogMene' 
      : 'LogMene';

    const sendSmtpEmail = {
      to: [{ email: params.to }],
      sender: { email: fromEmail, name: fromName },
      subject: params.subject,
      htmlContent: params.html,
      textContent: params.text
    };

    log(`Enviando email via Brevo para: ${params.to}`, 'brevo-email');
    
    // Envia o email
    const result = await api.sendTransacEmail(sendSmtpEmail);
    log(`Email enviado com sucesso via Brevo. ID: ${result?.messageId || 'N/A'}`, 'brevo-email');
    return true;
  } catch (error) {
    log(`Erro ao enviar email via Brevo: ${error}`, 'brevo-email');
    
    if (error instanceof Error) {
      log(`Detalhes do erro: ${error.message}`, 'brevo-email');
      if ('response' in error) {
        const response = (error as any).response;
        log(`Resposta da API: ${JSON.stringify(response?.body || {})}`, 'brevo-email');
      }
    }
    
    return false;
  }
}

/**
 * Envia um email de notificação para a transportadora quando uma nova solicitação de frete é criada
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

/**
 * Cria o conteúdo do email de notificação com base no tipo
 */
export function createNotificationEmail(
  userEmail: string, 
  userName: string, 
  notificationType: string, 
  requestId: number,
  message: string
): EmailParams {
  // Usar email configurado nas variáveis de ambiente ou fallback para noreply@logmene.com
  const from = 'LogMene <noreply@logmene.com>';
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