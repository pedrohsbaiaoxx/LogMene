import nodemailer from 'nodemailer';
import { log } from '../vite';

// Configuração dos transportadores de email - várias estratégias
function createGmailTransporter() {
  // Verificar se o email e senha estão configurados
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    log('EMAIL_USER ou EMAIL_PASSWORD não configurados', 'email-service');
    return null;
  }

  // Criar transportador com configurações para Gmail
  log(`Configurando transportador Gmail para ${process.env.EMAIL_USER}`, 'email-service');
  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    },
    logger: true,
    debug: true
  });
}

// Cria um transportador de teste que apenas loga as mensagens, útil para desenvolvimento
function createTestTransporter() {
  log('Criando transportador de teste para simular envio de emails', 'email-service');
  return {
    sendMail: (mailOptions: any) => {
      return new Promise((resolve) => {
        log(`[EMAIL SIMULADO] Para: ${mailOptions.to}, Assunto: ${mailOptions.subject}`, 'email-service');
        log(`[EMAIL SIMULADO] Conteúdo: ${mailOptions.text || mailOptions.html?.substring(0, 150)}...`, 'email-service');
        
        // Simular um delay para parecer mais realista
        setTimeout(() => {
          resolve({ 
            messageId: `simulated-${Date.now()}@logmene.local`,
            response: 'Envio simulado com sucesso'
          });
        }, 500);
      });
    }
  };
}

// Estratégia de fallback: primeiro tenta Gmail, se falhar ou não estiver configurado, usa simulação
let transporter = createGmailTransporter() || createTestTransporter();

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  // Se não tiver configurado o email e senha, apenas loga e retorna como enviado
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    log(`[Email simulado] Para: ${params.to}, Assunto: ${params.subject}`, 'email-service');
    log(`[Email simulado] Conteúdo: ${params.text || params.html?.substring(0, 100)}...`, 'email-service');
    
    log(`AVISO: Variáveis de ambiente EMAIL_USER e/ou EMAIL_PASSWORD não configuradas.`, 'email-service');
    log(`Para usar o serviço de email, configure essas variáveis com credenciais válidas.`, 'email-service');
    
    // Em ambiente de desenvolvimento, simulamos o envio e retornamos sucesso
    return true;
  }
  
  // Verificar se temos um transportador válido
  if (!transporter) {
    log(`ERRO: Transportador de email não configurado corretamente.`, 'email-service');
    log(`Verifique se EMAIL_USER e EMAIL_PASSWORD estão configurados corretamente.`, 'email-service');
    return false;
  }

  try {
    // Atualizamos o remetente para usar o email configurado
    const from = process.env.EMAIL_USER;
    
    log(`Tentando enviar email de ${from} para ${params.to}`, 'email-service');
    
    // Enviando email usando nodemailer - garantimos acima que transporter não é null
    const info = await (transporter as any).sendMail({
      from: from,
      to: params.to,
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    });
    
    log(`Email enviado com sucesso para ${params.to}. ID da mensagem: ${info.messageId}`, 'email-service');
    return true;
  } catch (error) {
    console.error('Nodemailer error:', error);
    
    // Log detalhado do erro para melhor depuração
    if (error instanceof Error) {
      log(`Erro ao enviar email: ${error.message}`, 'email-service');
      
      // Log para erros específicos
      if ('code' in error) {
        const errorCode = (error as any).code;
        log(`Código de erro: ${errorCode}`, 'email-service');
        
        // Instruções baseadas no código de erro
        if (errorCode === 'EAUTH') {
          log(`
PROBLEMA DE AUTENTICAÇÃO DETECTADO!
----------------------------------
O Gmail está recusando a autenticação. Causas possíveis:
1. Senha incorreta
2. Configurações de segurança do Gmail bloqueando o acesso
3. Verificação em duas etapas ativada sem senha de app configurada

SOLUÇÕES:
A) Crie uma "Senha de App" no Gmail se você usa verificação em duas etapas:
   - Acesse https://myaccount.google.com/security
   - Em "Verificação em duas etapas", clique em "Senhas de app"
   - Selecione "App: Outro (nome personalizado)" e use "LogMene"
   - Use a senha gerada como EMAIL_PASSWORD

B) Ou ative "Acesso a apps menos seguros" (não recomendado, mas funciona para testes):
   - Acesse https://myaccount.google.com/security
   - Procure por "Acesso a app menos seguro" e ative
`, 'email-service');
        } else if (errorCode === 'ESOCKET') {
          log('Erro de conexão com o servidor SMTP. Verifique sua conexão com a internet.', 'email-service');
        }
      }
      
      if ('command' in error) {
        log(`Comando que falhou: ${(error as any).command}`, 'email-service');
      }
      if ('response' in error) {
        log(`Resposta do servidor: ${(error as any).response}`, 'email-service');
      }
    } else {
      log(`Erro ao enviar email (tipo não identificado): ${String(error)}`, 'email-service');
    }
    
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
  // Usar email configurado nas variáveis de ambiente ou fallback para noreply@logmene.com
  const from = process.env.EMAIL_USER || 'noreply@logmene.com';
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