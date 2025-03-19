import twilio from 'twilio';
import { log } from '../vite';

// Criar o cliente Twilio usando as credenciais
const createTwilioClient = () => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }
  
  return twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
};

/**
 * Envia uma mensagem SMS para o número especificado
 * 
 * @param to Número de telefone do destinatário (formato internacional com +)
 * @param body Conteúdo da mensagem
 * @returns true se o envio foi bem-sucedido, false caso contrário
 */
export async function sendSMS(to: string, body: string): Promise<boolean> {
  // Se não tiver as credenciais do Twilio, loga e simula o envio
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    log(`[SMS simulado] Para: ${to}`, 'twilio-sms');
    log(`[SMS simulado] Mensagem: ${body}`, 'twilio-sms');
    log(`AVISO: Credenciais Twilio não configuradas. Configure para enviar SMS reais.`, 'twilio-sms');
    return true; // Retorna sucesso para não quebrar o fluxo da aplicação
  }

  try {
    const client = createTwilioClient();
    
    if (!client) {
      throw new Error('Não foi possível criar o cliente Twilio');
    }

    // Formatar o número de telefone (garantir formato internacional)
    const formattedPhone = formatPhoneNumber(to);
    
    log(`Enviando SMS via Twilio para: ${formattedPhone}`, 'twilio-sms');
    
    // Enviar SMS via Twilio
    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    log(`SMS enviado com sucesso via Twilio. SID: ${message.sid}`, 'twilio-sms');
    return true;
  } catch (error) {
    log(`Erro ao enviar SMS via Twilio: ${error}`, 'twilio-sms');
    
    if (error instanceof Error) {
      log(`Detalhes do erro: ${error.message}`, 'twilio-sms');
    }
    
    return false;
  }
}

/**
 * Formata o número de telefone para o formato internacional do Twilio
 * Se o número já começar com +, mantém como está
 * Caso contrário, adiciona o prefixo internacional do Brasil +55
 */
function formatPhoneNumber(phone: string): string {
  // Remove espaços, parênteses, hífens e outros caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '');
  
  // Se o número já estiver no formato internacional (começando com +)
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Se o número começar com 0, remove o 0
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Se o número não tiver o código do país (55 para Brasil)
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  // Adiciona o + no início
  return '+' + cleaned;
}

/**
 * Envia uma notificação SMS para a transportadora quando uma nova solicitação de frete é criada
 */
export async function sendNewFreightRequestSMS(
  companyPhone: string,
  companyName: string,
  requestId: number,
  clientName: string
): Promise<boolean> {
  const message = `LogMene: Nova solicitação de frete #${requestId} registrada por ${clientName}. Por favor, acesse o sistema para avaliar e enviar uma cotação.`;

  return await sendSMS(companyPhone, message);
}