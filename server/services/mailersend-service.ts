import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY!,
});

// Configuração do remetente padrão
// Usando endereço de email que é gerado automaticamente pelo MailerSend para cada conta
const defaultSender = new Sender('no-reply@mailersend.net', 'LogMene');

// Interface para os parâmetros de envio de email
// Note que 'from' não é necessário pois usamos o defaultSender
interface SendEmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  try {
    const recipients = [new Recipient(params.to)];

    const emailParams = new EmailParams()
      .setFrom(defaultSender)
      .setTo(recipients)
      .setSubject(params.subject)
      .setText(params.text || '')
      .setHtml(params.html || '');

    await mailerSend.email.send(emailParams);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email via MailerSend:', error);
    
    // Log detalhado para depuração
    if (error instanceof Error) {
      console.error(`Detalhes do erro: ${error.message}`);
      
      // Detalhes específicos da API do MailerSend
      if ((error as any).body) {
        console.error('Resposta da API:', (error as any).body);
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
  const subject = `Nova solicitação de frete #${requestId} - ${clientName}`;
  const html = `
    <h2>Nova solicitação de frete</h2>
    <p>Olá ${companyName},</p>
    <p>Uma nova solicitação de frete foi criada por <strong>${clientName}</strong>.</p>
    <p><strong>Detalhes do frete:</strong></p>
    ${freightDetails}
    <p>
      <a href="https://logmene.com.br/company/requests/${requestId}" style="
        background-color: #0066cc;
        color: white;
        padding: 10px 20px;
        text-decoration: none;
        border-radius: 5px;
        display: inline-block;
        margin-top: 10px;
      ">
        Ver detalhes da solicitação
      </a>
    </p>
    <p>Atenciosamente,<br>Equipe LogMene</p>
  `;

  return sendEmail({
    to: companyEmail,
    subject,
    html,
  });
}

/**
 * Cria o conteúdo do email de notificação com base no tipo
 */
export function createNotificationEmail(
  notificationType: 'status_update' | 'quote_received' | 'proof_uploaded',
  userName: string,
  requestId: number,
  additionalData?: { status?: string; value?: number }
): SendEmailParams {
  let subject = '';
  let html = '';

  switch (notificationType) {
    case 'status_update':
      subject = `Atualização de status do frete #${requestId}`;
      html = `
        <h2>Atualização de status do frete</h2>
        <p>Olá ${userName},</p>
        <p>O status do seu frete #${requestId} foi atualizado para: <strong>${additionalData?.status}</strong></p>
        <p>
          <a href="https://logmene.com.br/requests/${requestId}" style="
            background-color: #0066cc;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
            margin-top: 10px;
          ">
            Ver detalhes do frete
          </a>
        </p>
        <p>Atenciosamente,<br>Equipe LogMene</p>
      `;
      break;

    case 'quote_received':
      subject = `Nova cotação recebida para o frete #${requestId}`;
      html = `
        <h2>Nova cotação recebida</h2>
        <p>Olá ${userName},</p>
        <p>Uma nova cotação foi recebida para sua solicitação de frete #${requestId}.</p>
        <p>Valor da cotação: <strong>R$ ${additionalData?.value?.toFixed(2)}</strong></p>
        <p>
          <a href="https://logmene.com.br/requests/${requestId}" style="
            background-color: #0066cc;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
            margin-top: 10px;
          ">
            Ver detalhes da cotação
          </a>
        </p>
        <p>Atenciosamente,<br>Equipe LogMene</p>
      `;
      break;

    case 'proof_uploaded':
      subject = `Comprovante de entrega anexado ao frete #${requestId}`;
      html = `
        <h2>Comprovante de entrega anexado</h2>
        <p>Olá ${userName},</p>
        <p>Um comprovante de entrega foi anexado à sua solicitação de frete #${requestId}.</p>
        <p>
          <a href="https://logmene.com.br/requests/${requestId}" style="
            background-color: #0066cc;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
            margin-top: 10px;
          ">
            Ver comprovante
          </a>
        </p>
        <p>Atenciosamente,<br>Equipe LogMene</p>
      `;
      break;
  }

  return {
    to: userName,
    subject,
    html,
  };
}