import { log } from '../vite';

// Interface para parâmetros do email
export interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Função para enviar email usando o Brevo (Sendinblue) via API HTTP direta
 * Esta implementação usa fetch para enviar emails diretamente para a API REST do Brevo
 * em vez de usar a biblioteca sib-api-v3-sdk
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  // Se não tiver a chave da API configurada, loga e simula o envio
  if (!process.env.BREVO_API_KEY) {
    log(`[Email simulado] Para: ${params.to}, Assunto: ${params.subject}`, 'brevo-email');
    log(`[Email simulado] Conteúdo: ${params.text || params.html?.substring(0, 150)}...`, 'brevo-email');
    log(`AVISO: BREVO_API_KEY não configurada. Configure para enviar emails reais.`, 'brevo-email');
    return true; // Retorna sucesso para não quebrar o fluxo da aplicação
  }

  try {
    // Preparação dos dados para o email
    const fromEmail = params.from.includes('<') 
      ? params.from.match(/<(.+)>/)?.[1] || params.from 
      : params.from;
    
    const fromName = params.from.includes('<') 
      ? params.from.match(/(.+)</)?.[1]?.trim() || 'LogMene' 
      : 'LogMene';

    // Dados para a API do Brevo
    const payload = {
      sender: { 
        name: fromName, 
        email: fromEmail 
      },
      to: [{ 
        email: params.to 
      }],
      subject: params.subject,
      htmlContent: params.html || '',
      textContent: params.text || ''
    };

    log(`Enviando email via API Brevo para: ${params.to}`, 'brevo-email');
    
    // Chamada direta para a API do Brevo via HTTP
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
      throw new Error(`API Brevo retornou erro ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    log(`Email enviado com sucesso via Brevo. ID: ${result?.messageId || 'N/A'}`, 'brevo-email');
    return true;
  } catch (error) {
    log(`Erro ao enviar email via Brevo: ${error}`, 'brevo-email');
    
    if (error instanceof Error) {
      log(`Detalhes do erro: ${error.message}`, 'brevo-email');
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

// Alias para a função acima, mantendo compatibilidade com o nome usado em routes.ts
export const sendNewFreightRequestBrevoEmail = sendNewFreightRequestEmail;

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

  // Versão texto simples do email (requerido pela API Brevo)
  const text = `
LogMene - Sistema de Logística

${template.intro}

${message}

Por favor, acesse o sistema para visualizar mais detalhes e tomar as ações necessárias.

Se você tiver dúvidas, entre em contato com nossa equipe de suporte.

Este é um email automático, por favor não responda.
© ${new Date().getFullYear()} LogMene. Todos os direitos reservados.
`;

  return {
    to: userEmail,
    from,
    subject: template.subject,
    html,
    text
  };
}