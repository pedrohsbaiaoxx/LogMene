// Email service adaptado para Vercel sem dependência de vite.ts
import nodemailer from 'nodemailer';
import axios from 'axios';

// Constantes para serviços de email
const MAILERSEND_API_URL = 'https://api.mailersend.com/v1/email';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

// Cria um transportador SMTP para MailerSend
function createMailerSendSMTPTransporter() {
  // Verificar se as credenciais SMTP estão configuradas
  if (!process.env.MAILERSEND_API_KEY) {
    console.log('API Key do MailerSend não configurada');
    return null;
  }

  // Criar transportador SMTP
  return nodemailer.createTransport({
    host: 'smtp.mailersend.net',
    port: 587,
    secure: false, // true para 465, false para outras portas
    auth: {
      user: 'MS_3naSUS@bigstone.dev.br', // Usuário SMTP do MailerSend
      pass: process.env.MAILERSEND_API_KEY, // Senha SMTP (API Key do MailerSend)
    },
  });
}

// Verifica se o domínio está verificado (simplificada para Vercel)
function isDomainVerified(email) {
  // Verificar se é um email do domínio verificado
  return email.endsWith('@bigstone.dev.br') || 
         email.endsWith('@logmene.com.br');
}

/**
 * Função para enviar email usando SMTP baseado no destinatário
 * 
 * Esta implementação escolhe o método de envio apropriado:
 * 1. SMTP do MailerSend para domínios verificados
 * 2. Para outros domínios, tenta via MailerSend API
 */
export async function sendEmailViaSMTP(params) {
  const { to, subject, text, html, from = 'contato@logmene.com.br' } = params;
  
  try {
    // Verificar se o domínio do remetente está verificado
    const isVerified = isDomainVerified(from);
    
    if (isVerified) {
      console.log(`Enviando via SMTP do MailerSend para ${to}`);
      
      // Criar transportador SMTP do MailerSend
      const transporter = createMailerSendSMTPTransporter();
      
      if (!transporter) {
        console.log('Não foi possível criar transportador SMTP');
        // Fallback para API
        return await sendViaMailerSendAPI({ to, from, subject, text, html });
      }
      
      // Enviar via SMTP
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html
      });
      
      console.log(`Email enviado via SMTP: ${info.messageId}`);
      return true;
    } else {
      console.log(`Domínio não verificado: ${from}, tentando via API`);
      // Tentar enviar via API
      return await sendViaMailerSendAPI({ to, from, subject, text, html });
    }
  } catch (error) {
    console.error(`Erro ao enviar email via SMTP: ${error.message}`);
    // Em caso de erro, tenta via API como fallback
    try {
      return await sendViaMailerSendAPI({ to, from: 'contato@logmene.com.br', subject, text, html });
    } catch (fallbackError) {
      console.error(`Erro ao enviar email via API (fallback): ${fallbackError.message}`);
      return false;
    }
  }
}

/**
 * Função para enviar email via API do MailerSend
 */
async function sendViaMailerSendAPI(params) {
  const { to, from, subject, text, html } = params;
  
  if (!process.env.MAILERSEND_API_KEY) {
    console.log('API Key do MailerSend não configurada');
    return false;
  }
  
  try {
    console.log(`Enviando via API do MailerSend para ${to}`);
    
    // Criar payload para a API
    const payload = {
      from: {
        email: from || 'contato@logmene.com.br',
        name: 'LogMene Logística'
      },
      to: [
        {
          email: to,
          name: to.split('@')[0]
        }
      ],
      subject,
      text,
      html
    };
    
    // Fazer requisição para a API
    const response = await axios.post(MAILERSEND_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MAILERSEND_API_KEY}`
      }
    });
    
    if (response.status === 202) {
      console.log('Email enviado via API do MailerSend');
      return true;
    } else {
      console.error(`Erro ao enviar email via API: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`Erro ao enviar email via API: ${error.message}`);
    if (error.response) {
      console.error(`Detalhes: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

/**
 * Envia um email de notificação para a transportadora quando uma nova solicitação de frete é criada
 */
export async function sendNewFreightRequestEmail(
  companyEmail,
  companyName,
  requestId,
  clientName,
  freightDetails = {}
) {
  const subject = `Nova solicitação de frete #${requestId} de ${clientName}`;
  
  // Extrair detalhes do frete (se disponíveis)
  const { originAddress, destinationAddress, description, weight, dimensions } = freightDetails;
  
  // Criar corpo do email
  const html = `
    <h2>Nova solicitação de frete</h2>
    <p>Olá ${companyName},</p>
    <p>Uma nova solicitação de frete (#${requestId}) foi registrada por <strong>${clientName}</strong>.</p>
    
    ${originAddress ? `<p><strong>Origem:</strong> ${originAddress}</p>` : ''}
    ${destinationAddress ? `<p><strong>Destino:</strong> ${destinationAddress}</p>` : ''}
    ${description ? `<p><strong>Descrição:</strong> ${description}</p>` : ''}
    ${weight ? `<p><strong>Peso:</strong> ${weight} kg</p>` : ''}
    ${dimensions ? `<p><strong>Dimensões:</strong> ${dimensions}</p>` : ''}
    
    <p>Por favor, acesse o sistema LogMene para avaliar esta solicitação e enviar uma cotação.</p>
    <p>Atenciosamente,<br>Equipe LogMene</p>
  `;
  
  const text = `
    Nova solicitação de frete
    
    Olá ${companyName},
    
    Uma nova solicitação de frete (#${requestId}) foi registrada por ${clientName}.
    
    ${originAddress ? `Origem: ${originAddress}` : ''}
    ${destinationAddress ? `Destino: ${destinationAddress}` : ''}
    ${description ? `Descrição: ${description}` : ''}
    ${weight ? `Peso: ${weight} kg` : ''}
    ${dimensions ? `Dimensões: ${dimensions}` : ''}
    
    Por favor, acesse o sistema LogMene para avaliar esta solicitação e enviar uma cotação.
    
    Atenciosamente,
    Equipe LogMene
  `;
  
  // Enviar email
  return await sendEmailViaSMTP({
    to: companyEmail,
    subject,
    text,
    html,
    from: 'notificacoes@logmene.com.br'
  });
}

/**
 * Cria o conteúdo do email de notificação com base no tipo
 */
export function createNotificationEmail(
  type,
  email,
  name,
  data = {}
) {
  let subject = '';
  let content = '';
  
  switch (type) {
    case 'status_update':
      subject = `Atualização de Status na Solicitação #${data.requestId}`;
      content = `
        <h2>Atualização de Status</h2>
        <p>Olá ${name},</p>
        <p>O status da sua solicitação de frete #${data.requestId} foi atualizado para <strong>${data.status}</strong>.</p>
        <p>Acesse o sistema LogMene para mais detalhes.</p>
      `;
      break;
      
    case 'quote_received':
      subject = `Cotação Recebida para Solicitação #${data.requestId}`;
      content = `
        <h2>Cotação Recebida</h2>
        <p>Olá ${name},</p>
        <p>Você recebeu uma cotação para a solicitação de frete #${data.requestId}.</p>
        <p>Valor: R$ ${data.value.toFixed(2)}</p>
        <p>Acesse o sistema LogMene para aceitar ou recusar esta cotação.</p>
      `;
      break;
      
    case 'proof_uploaded':
      subject = `Comprovante de Entrega para Solicitação #${data.requestId}`;
      content = `
        <h2>Comprovante de Entrega</h2>
        <p>Olá ${name},</p>
        <p>Um comprovante de entrega foi anexado à solicitação de frete #${data.requestId}.</p>
        <p>Acesse o sistema LogMene para visualizar o comprovante.</p>
      `;
      break;
      
    case 'new_freight_request':
      return sendNewFreightRequestEmail(
        email,
        name,
        data.requestId,
        data.clientName,
        data.freightDetails
      );
      
    default:
      subject = 'Notificação do Sistema LogMene';
      content = `
        <h2>Notificação</h2>
        <p>Olá ${name},</p>
        <p>Você tem uma nova notificação no sistema LogMene.</p>
        <p>Acesse o sistema para mais detalhes.</p>
      `;
  }
  
  // Para tipos que não sejam new_freight_request, enviamos diretamente
  return sendEmailViaSMTP({
    to: email,
    subject,
    html: content,
    text: content.replace(/<[^>]*>/g, ''),
    from: 'notificacoes@logmene.com.br'
  });
}

/**
 * Handler para serverless function da Vercel
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export default async function handler(req, res) {
  // Verifica se é um método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { to, from, subject, text, html, type, data } = req.body;

    // Verifica se é um envio direto ou se é um tipo de notificação específico
    if (to && (text || html) && subject) {
      // Envio direto de email
      const success = await sendEmailViaSMTP({ to, from, subject, text, html });
      if (success) {
        return res.status(200).json({ status: 'success', message: 'Email enviado com sucesso' });
      } else {
        return res.status(500).json({ status: 'error', message: 'Falha ao enviar email' });
      }
    } else if (type && data && to) {
      // Envio de notificação por tipo
      const success = await createNotificationEmail(type, to, data.name || 'Cliente', data);
      
      if (success) {
        return res.status(200).json({ status: 'success', message: 'Notificação enviada com sucesso' });
      } else {
        return res.status(500).json({ status: 'error', message: 'Falha ao enviar notificação' });
      }
    } else {
      return res.status(400).json({ status: 'error', message: 'Parâmetros insuficientes ou inválidos' });
    }
  } catch (error) {
    console.error('Erro ao processar requisição de email:', error);
    return res.status(500).json({ status: 'error', message: 'Erro interno do servidor', error: error.message });
  }
}