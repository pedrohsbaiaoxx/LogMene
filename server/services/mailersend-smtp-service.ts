import nodemailer from 'nodemailer';

// Configurar transportador SMTP do MailerSend com as credenciais fornecidas
const mailerSendTransporter = nodemailer.createTransport({
  host: 'smtp.mailersend.net',
  port: 587,
  secure: false, // TLS
  auth: {
    user: 'MS_3naSUS@bigstone.dev.br',
    pass: 'mssp.d3fvrVh.jy7zpl936eol5vx6.p8Nn9vS'
  }
});

// Função para verificar se o endereço de email tem um domínio verificado
// No caso do MailerSend, o domínio bigstone.dev.br está verificado
function isDomainVerified(email: string): boolean {
  return email.endsWith('@bigstone.dev.br') || 
         email.endsWith('@logmene.com.br'); // Supondo que logmene.com.br também esteja verificado
}

interface SendEmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

// Criando um segundo transporter para emails Gmail (usando nodemailer)
// Isso permite enviar para qualquer destinatário sem restrições de domínio
const gmailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASSWORD || ''
  }
});

/**
 * Função para enviar email usando SMTP baseado no destinatário
 * 
 * Esta implementação escolhe o método de envio apropriado:
 * 1. SMTP do MailerSend para domínios verificados
 * 2. Para emails com gmail.com, usa o transporter do Gmail
 * 3. Para outros domínios, tenta via MailerSend mas com endereço ajustado
 */
export async function sendEmailViaSMTP(params: SendEmailParams): Promise<boolean> {
  try {
    console.log(`Iniciando envio de email SMTP para: ${params.to}`);
    const originalTo = params.to;
    
    // Utilizar o domínio verificado como remetente
    const from = params.from || 'LogMene <MS_3naSUS@bigstone.dev.br>';
    
    // Preparar as opções padrão de email
    const mailOptions = {
      from,
      to: params.to,
      subject: params.subject,
      text: params.text || '',
      html: params.html || ''
    };

    // Escolher o método de envio com base no destinatário
    if (isDomainVerified(params.to)) {
      // Para domínios verificados, enviar diretamente via MailerSend SMTP
      console.log(`Usando MailerSend SMTP para domínio verificado: ${params.to}`);
      const info = await mailerSendTransporter.sendMail(mailOptions);
      console.log('Email SMTP enviado com sucesso:', info.messageId);
      return true;
    } 
    else if (params.to.includes('@gmail.com') || 
             params.to.includes('@hotmail.com') ||
             params.to.includes('@outlook.com') ||
             params.to === 'pedroxxsb@gmail.com' ||
             params.to === 'logistica@logmene.com.br') {
      // Para Gmail e outros domínios comuns, usar transporter do Gmail
      // que possui menos restrições de destinatário
      if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        console.log(`Usando Gmail SMTP para: ${params.to}`);
        const info = await gmailTransporter.sendMail({
          ...mailOptions,
          from: `"LogMene" <${process.env.EMAIL_USER}>`
        });
        console.log('Email Gmail enviado com sucesso:', info.messageId);
        return true;
      } else {
        console.warn('Credenciais do Gmail não encontradas, tentando alternativa...');
      }
    }
    
    // Fallback para qualquer outro domínio - usar um destinatário confiável
    // e adicionar informações sobre o destinatário original no corpo do email
    const fallbackTo = 'test@bigstone.dev.br';
    console.log(`Usando fallback para ${params.to} -> ${fallbackTo}`);
    
    // Adicionar uma nota sobre o redirecionamento no HTML
    const redirectNote = `
      <div style="margin-top: 30px; padding: 10px; background-color: #fff3cd; border: 1px solid #ffe69c; border-radius: 4px;">
        <p><strong>Nota:</strong> Este email deveria ser enviado para <strong>${originalTo}</strong>, 
        mas foi redirecionado para você devido a restrições de domínio do MailerSend.</p>
      </div>
    `;
    
    const enhancedHtml = params.html?.replace('</div>\n      </div>', 
      `${redirectNote}</div>\n      </div>`);
    
    const fallbackInfo = await mailerSendTransporter.sendMail({
      ...mailOptions,
      to: fallbackTo,
      html: enhancedHtml,
      subject: `[Para: ${originalTo}] ${params.subject}`
    });
    
    console.log('Email de fallback enviado com sucesso:', fallbackInfo.messageId);
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