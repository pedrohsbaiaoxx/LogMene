import twilio from 'twilio';
import { log } from '../vite';

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER;

// Modo de simulação (útil para desenvolvimento e testes)
const SIMULATION_MODE = process.env.WHATSAPP_SIMULATION_MODE === 'true';

/**
 * Envia uma mensagem WhatsApp para o número especificado
 * 
 * @param to Número de telefone do destinatário (formato internacional com +)
 * @param body Conteúdo da mensagem
 * @returns true se o envio foi bem-sucedido, false caso contrário
 */
export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  // Log das credenciais (parcialmente ofuscadas para segurança)
  log(`TWILIO_ACCOUNT_SID: ${accountSid ? accountSid.substring(0, 4) + '...' : 'não definido'}`, 'twilio-whatsapp');
  log(`TWILIO_AUTH_TOKEN existe: ${!!authToken}`, 'twilio-whatsapp');
  log(`TWILIO_WHATSAPP_NUMBER: ${twilioWhatsappNumber}`, 'twilio-whatsapp');
  
  // Formatando o número para o formato do WhatsApp
  const formattedNumber = formatPhoneNumber(to);
  
  // Se estiver no modo de simulação, apenas loga a mensagem e retorna sucesso
  if (SIMULATION_MODE) {
    log(`MODO DE SIMULAÇÃO: Enviaria WhatsApp para ${formattedNumber}: "${body}"`, 'twilio-whatsapp');
    return true;
  }
  
  // Verifica se as credenciais do Twilio estão configuradas
  if (!accountSid || !authToken || !twilioWhatsappNumber) {
    log('Credenciais do Twilio não configuradas para WhatsApp', 'twilio-whatsapp');
    return false;
  }
  
  try {
    // Inicializa o cliente do Twilio
    const client = twilio(accountSid, authToken);
    
    log(`Enviando WhatsApp via Twilio para: ${formattedNumber}`, 'twilio-whatsapp');
    
    // WhatsApp requer o prefixo 'whatsapp:' nos números
    const from = `whatsapp:${twilioWhatsappNumber}`;
    const to = `whatsapp:${formattedNumber}`;
    
    // Envia a mensagem
    const message = await client.messages.create({
      body,
      from,
      to
    });

    log(`WhatsApp enviado com sucesso via Twilio. SID: ${message.sid}`, 'twilio-whatsapp');
    return true;
  } catch (error) {
    log(`Erro ao enviar WhatsApp via Twilio: ${error}`, 'twilio-whatsapp');
    
    if (error instanceof Error) {
      log(`Detalhes do erro: ${error.message}`, 'twilio-whatsapp');
      log(`Stack trace: ${error.stack}`, 'twilio-whatsapp');
      
      // Se o erro tiver mais propriedades específicas do Twilio
      const twilioError = error as any;
      if (twilioError.code) {
        log(`Código de erro Twilio: ${twilioError.code}`, 'twilio-whatsapp');
      }
      if (twilioError.moreInfo) {
        log(`Mais informações: ${twilioError.moreInfo}`, 'twilio-whatsapp');
      }
    }
    
    return false;
  }
}

/**
 * Formata o número de telefone para o formato internacional
 * Se o número já começar com +, mantém como está
 * Caso contrário, adiciona o prefixo internacional do Brasil +55
 */
function formatPhoneNumber(phone: string): string {
  // Remove espaços, parênteses, hífens e outros caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '');
  
  // Se o número já estiver no formato internacional (começando com +)
  if (phone.startsWith('+')) {
    return phone.substring(1); // Remove o + inicial para o formato do WhatsApp
  }
  
  // Se o número começar com 0, remove o 0
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Se o número não tiver o código do país (55 para Brasil)
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  log(`Número formatado para WhatsApp: ${phone} -> ${cleaned}`, 'twilio-whatsapp');
  
  return cleaned;
}

/**
 * Envia uma notificação WhatsApp para a transportadora quando uma nova solicitação de frete é criada
 */
export async function sendNewFreightRequestWhatsApp(
  companyPhone: string,
  companyName: string,
  requestId: number,
  clientName: string
): Promise<boolean> {
  const message = `LogMene: Nova solicitação de frete #${requestId} registrada por ${clientName}. Por favor, acesse o sistema para avaliar e enviar uma cotação.`;

  return await sendWhatsApp(companyPhone, message);
}