import twilio from 'twilio';
import { log } from '../vite';

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER || '+14155238886'; // Número do Twilio Sandbox como fallback

// Modo de simulação (útil para desenvolvimento e testes)
// Configurando para modo de produção para permitir envio real de mensagens
const SIMULATION_MODE = false; // Modo de produção ativado

// Log de inicialização para verificar as configurações
log(`Serviço WhatsApp inicializado. Modo de simulação: ${SIMULATION_MODE ? 'ATIVADO' : 'DESATIVADO'}`, 'twilio-whatsapp-init');
log(`Valor da variável de ambiente WHATSAPP_SIMULATION_MODE: "${process.env.WHATSAPP_SIMULATION_MODE}"`, 'twilio-whatsapp-init');

/**
 * Envia uma mensagem WhatsApp para o número especificado
 * 
 * @param to Número de telefone do destinatário (formato internacional com +)
 * @param body Conteúdo da mensagem
 * @returns true se o envio foi bem-sucedido, false caso contrário
 */
export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  // Log das credenciais (parcialmente ofuscadas para segurança)
  log(`MODO DE PRODUÇÃO ATIVO - Preparando para enviar mensagem real via WhatsApp`, 'twilio-whatsapp');
  log(`TWILIO_ACCOUNT_SID: ${accountSid ? accountSid.substring(0, 4) + '...' + accountSid.substring(accountSid.length - 4) : 'não definido'}`, 'twilio-whatsapp');
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
    log('Verifique as variáveis de ambiente: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER', 'twilio-whatsapp');
    return false;
  }
  
  try {
    // Inicializa o cliente do Twilio
    const client = twilio(accountSid, authToken);
    
    log(`ENVIANDO WHATSAPP EM MODO DE PRODUÇÃO para: ${formattedNumber}`, 'twilio-whatsapp');
    log(`Mensagem: "${body}"`, 'twilio-whatsapp');
    
    // WhatsApp requer o prefixo 'whatsapp:' nos números
    // Remove espaços e outros caracteres do número do remetente
    const cleanedFromNumber = twilioWhatsappNumber.replace(/\s+/g, '');
    const from = `whatsapp:${cleanedFromNumber}`;
    const to = `whatsapp:${formattedNumber}`;
    
    log(`Número de origem formatado: ${from}`, 'twilio-whatsapp');
    log(`Número de destino formatado: ${to}`, 'twilio-whatsapp');
    
    // Envia a mensagem
    const message = await client.messages.create({
      body,
      from,
      to
    });

    log(`WhatsApp enviado com SUCESSO em MODO DE PRODUÇÃO!`, 'twilio-whatsapp');
    log(`SID da mensagem: ${message.sid}`, 'twilio-whatsapp');
    log(`Status da mensagem: ${message.status}`, 'twilio-whatsapp');
    log(`Direção da mensagem: ${message.direction}`, 'twilio-whatsapp');
    
    return true;
  } catch (error) {
    log(`ERRO CRÍTICO ao enviar WhatsApp via Twilio: ${error}`, 'twilio-whatsapp');
    
    if (error instanceof Error) {
      log(`Detalhes do erro: ${error.message}`, 'twilio-whatsapp');
      log(`Stack trace: ${error.stack}`, 'twilio-whatsapp');
      
      // Se o erro tiver mais propriedades específicas do Twilio
      const twilioError = error as any;
      if (twilioError.code) {
        log(`Código de erro Twilio: ${twilioError.code}`, 'twilio-whatsapp');
      }
      if (twilioError.status) {
        log(`Status HTTP: ${twilioError.status}`, 'twilio-whatsapp');
      }
      if (twilioError.moreInfo) {
        log(`Mais informações: ${twilioError.moreInfo}`, 'twilio-whatsapp');
      }
      if (twilioError.details) {
        log(`Detalhes adicionais: ${JSON.stringify(twilioError.details)}`, 'twilio-whatsapp');
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
    return phone.replace(/\+/g, '').replace(/\s+/g, ''); // Remove o + inicial e espaços para o formato do WhatsApp
  }
  
  // Se o número começar com 0, remove o 0
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Se o número não tiver o código do país (55 para Brasil)
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  // Remover o 9 adicional para números de celular brasileiros
  // (alguns sistemas inserem o 9 mas o Twilio já lida com isso)
  if (cleaned.startsWith('55') && cleaned.length > 12) {
    // Se for um número de celular brasileiro com o 9 adicional
    // O padrão é: 55 + DDD (2 dígitos) + 9 + número (8 dígitos)
    const ddd = cleaned.substring(2, 4);
    const hasExtra9 = cleaned.substring(4, 5) === '9' && cleaned.length === 13;
    
    if (hasExtra9) {
      // Manter o formato internacional + DDD + número sem o 9 adicional
      // cleaned = '55' + ddd + cleaned.substring(5);
      // Na verdade, vamos manter o 9 pois o Twilio espera o formato completo para o Brasil
    }
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

/**
 * Envia uma notificação WhatsApp quando o status de uma solicitação é atualizado
 */
export async function sendStatusUpdateWhatsApp(
  phone: string,
  recipientName: string,
  requestId: number,
  status: string
): Promise<boolean> {
  // Traduz o status para um formato mais amigável
  const statusMessages: Record<string, string> = {
    'pending': 'em análise',
    'quoted': 'cotada',
    'accepted': 'aceita',
    'rejected': 'rejeitada',
    'completed': 'concluída'
  };
  
  const statusText = statusMessages[status] || status;
  
  const message = `LogMene: A solicitação de frete #${requestId} teve seu status atualizado para "${statusText}". Acesse o sistema para mais detalhes.`;

  return await sendWhatsApp(phone, message);
}

/**
 * Envia uma notificação WhatsApp quando um comprovante de entrega é anexado
 */
export async function sendDeliveryProofWhatsApp(
  phone: string,
  recipientName: string,
  requestId: number
): Promise<boolean> {
  const message = `LogMene: Um comprovante de entrega foi anexado à solicitação de frete #${requestId}. Acesse o sistema para visualizar o comprovante.`;
  
  return await sendWhatsApp(phone, message);
}