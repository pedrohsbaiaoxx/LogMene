import nodemailer from 'nodemailer';

// Configurar transportador SMTP do MailerSend com as credenciais fornecidas
const transporter = nodemailer.createTransport({
  host: 'smtp.mailersend.net',
  port: 587,
  secure: false, // TLS
  auth: {
    user: 'MS_3naSUS@bigstone.dev.br',
    pass: 'mssp.d3fvrVh.jy7zpl936eol5vx6.p8Nn9vS'
  }
});

interface SendEmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

/**
 * Função para enviar email usando SMTP do MailerSend
 * Esta implementação usa nodemailer para enviar emails pelo servidor SMTP
 */
export async function sendEmailViaSMTP(params: SendEmailParams): Promise<boolean> {
  try {
    console.log(`Iniciando envio de email SMTP para: ${params.to}`);
    
    // Utilizar o domínio verificado como remetente
    const from = params.from || 'LogMene <MS_3naSUS@bigstone.dev.br>';

    const mailOptions = {
      from,
      to: params.to,
      subject: params.subject,
      text: params.text || '',
      html: params.html || ''
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email SMTP enviado com sucesso:', info.messageId);
    
    return true;
  } catch (error) {
    console.error('Erro ao enviar email via SMTP:', error);
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
  const subject = `Nova Solicitação de Frete #${requestId} - LogMene`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #2E3192; color: white; padding: 10px 20px; border-radius: 4px 4px 0 0;">
        <h2>LogMene - Nova Solicitação de Frete</h2>
      </div>
      <div style="border: 1px solid #eee; padding: 20px; border-radius: 0 0 4px 4px;">
        <p>Olá, <strong>${companyName}</strong>!</p>
        <p>Uma nova solicitação de frete foi criada por <strong>${clientName}</strong>.</p>
        <p><strong>Detalhes da Solicitação #${requestId}:</strong></p>
        ${freightDetails}
        <p>Você pode acessar o sistema para visualizar mais detalhes e enviar uma cotação.</p>
        <p style="margin-top: 30px;">
          <a href="https://logmene.replit.app/requests/${requestId}" 
             style="background-color: #2E3192; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            Ver Solicitação
          </a>
        </p>
      </div>
      <div style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
        <p>Este é um email automático, por favor não responda.</p>
        <p>&copy; ${new Date().getFullYear()} LogMene. Todos os direitos reservados.</p>
      </div>
    </div>
  `;
  
  return sendEmailViaSMTP({
    to: companyEmail,
    subject,
    html
  });
}

/**
 * Cria o conteúdo do email de notificação com base no tipo
 */
export function createNotificationEmail(
  type: "status_update" | "quote_received" | "proof_uploaded",
  userName: string,
  requestId: number,
  additionalInfo?: any
): SendEmailParams {
  let subject = '';
  let content = '';
  
  switch(type) {
    case 'status_update':
      const status = additionalInfo?.status || 'atualizado';
      subject = `Status de Frete Atualizado #${requestId} - LogMene`;
      content = `
        <p>Olá, <strong>${userName}</strong>!</p>
        <p>O status da sua solicitação de frete #${requestId} foi atualizado para <strong>${status}</strong>.</p>
        <p>Você pode acessar o sistema para visualizar mais detalhes.</p>
        <p style="margin-top: 30px;">
          <a href="https://logmene.replit.app/requests/${requestId}" 
             style="background-color: #2E3192; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            Ver Detalhes
          </a>
        </p>
      `;
      break;
      
    case 'quote_received':
      const value = additionalInfo?.value ? `R$ ${additionalInfo.value.toFixed(2)}` : 'valor personalizado';
      subject = `Nova Cotação Recebida #${requestId} - LogMene`;
      content = `
        <p>Olá, <strong>${userName}</strong>!</p>
        <p>Você recebeu uma nova cotação para sua solicitação de frete #${requestId} no valor de <strong>${value}</strong>.</p>
        <p>Você pode acessar o sistema para aceitar ou rejeitar esta cotação.</p>
        <p style="margin-top: 30px;">
          <a href="https://logmene.replit.app/requests/${requestId}" 
             style="background-color: #2E3192; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            Ver Cotação
          </a>
        </p>
      `;
      break;
      
    case 'proof_uploaded':
      subject = `Comprovante de Entrega Anexado #${requestId} - LogMene`;
      content = `
        <p>Olá, <strong>${userName}</strong>!</p>
        <p>Um comprovante de entrega foi anexado à sua solicitação de frete #${requestId}.</p>
        <p>Você pode acessar o sistema para visualizar o comprovante.</p>
        <p style="margin-top: 30px;">
          <a href="https://logmene.replit.app/requests/${requestId}" 
             style="background-color: #2E3192; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            Ver Comprovante
          </a>
        </p>
      `;
      break;
  }
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #2E3192; color: white; padding: 10px 20px; border-radius: 4px 4px 0 0;">
        <h2>LogMene - Atualização de Frete</h2>
      </div>
      <div style="border: 1px solid #eee; padding: 20px; border-radius: 0 0 4px 4px;">
        ${content}
      </div>
      <div style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
        <p>Este é um email automático, por favor não responda.</p>
        <p>&copy; ${new Date().getFullYear()} LogMene. Todos os direitos reservados.</p>
      </div>
    </div>
  `;
  
  return {
    to: '', // será preenchido quando usado
    subject,
    html
  };
}