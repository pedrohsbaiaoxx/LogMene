// SMS service optimizado para ambiente Vercel
import twilio from 'twilio';

// Criar o cliente Twilio usando as credenciais
const createTwilioClient = () => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log('Credenciais do Twilio não configuradas');
    return null;
  }
  
  try {
    // Se estamos usando um Account SID normal (AC)
    return twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  } catch (error) {
    console.error(`Erro ao criar cliente Twilio: ${error}`);
    return null;
  }
};

/**
 * Envia uma mensagem SMS para o número especificado
 * 
 * @param to Número de telefone do destinatário (formato internacional com +)
 * @param body Conteúdo da mensagem
 * @returns true se o envio foi bem-sucedido, false caso contrário
 */
export async function sendSMS(to, body) {
  // Se não tiver as credenciais do Twilio, loga e simula o envio
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.log(`AVISO: Credenciais Twilio não configuradas. Configure para enviar SMS reais.`);
    return true; // Retorna sucesso para não quebrar o fluxo da aplicação
  }

  try {
    const client = createTwilioClient();
    
    // Se não conseguimos criar o cliente, entramos em modo de simulação
    if (!client) {
      console.log(`Modo de simulação ativado - Cliente Twilio não disponível.`);
      return true; // Simulamos sucesso para não quebrar o fluxo da aplicação
    }

    // Formatar o número de telefone (garantir formato internacional)
    const formattedPhone = formatPhoneNumber(to);
    
    console.log(`Enviando SMS via Twilio para: ${formattedPhone}`);
    
    // Enviar SMS via Twilio
    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    console.log(`SMS enviado com sucesso via Twilio. SID: ${message.sid}`);
    return true;
  } catch (error) {
    console.error(`Erro ao enviar SMS via Twilio: ${error}`);
    
    if (error instanceof Error) {
      console.error(`Detalhes do erro: ${error.message}`);
      
      // Se o erro tiver mais propriedades específicas do Twilio
      const twilioError = error;
      if (twilioError.code) {
        console.error(`Código de erro Twilio: ${twilioError.code}`);
      }
    }
    
    return false;
  }
}

/**
 * Formata o número de telefone para o formato internacional do Twilio
 * Se o número já começar com +, mantém como está
 * Caso contrário, adiciona o prefixo internacional do Brasil +55
 */
function formatPhoneNumber(phone) {
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
  const formattedNumber = '+' + cleaned;
  
  return formattedNumber;
}

/**
 * Envia uma notificação SMS para a transportadora quando uma nova solicitação de frete é criada
 */
export async function sendNewFreightRequestSMS(
  companyPhone,
  companyName,
  requestId,
  clientName
) {
  const message = `LogMene: Nova solicitação de frete #${requestId} registrada por ${clientName}. Por favor, acesse o sistema para avaliar e enviar uma cotação.`;

  return await sendSMS(companyPhone, message);
}

/**
 * Handler específico para Vercel serverless function para envio de SMS
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export default async function handler(req, res) {
  // Verifica se é um método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { to, body, type, data } = req.body;

    // Verifica se é um envio direto ou se é um tipo de notificação específico
    if (to && body) {
      // Envio direto de SMS
      const success = await sendSMS(to, body);
      if (success) {
        return res.status(200).json({ status: 'success', message: 'SMS enviado com sucesso' });
      } else {
        return res.status(500).json({ status: 'error', message: 'Falha ao enviar SMS' });
      }
    } else if (type === 'new_freight_request' && data) {
      // Envio de notificação de nova solicitação de frete
      const { companyPhone, companyName, requestId, clientName } = data;
      const success = await sendNewFreightRequestSMS(companyPhone, companyName, requestId, clientName);
      
      if (success) {
        return res.status(200).json({ status: 'success', message: 'Notificação de nova solicitação enviada com sucesso' });
      } else {
        return res.status(500).json({ status: 'error', message: 'Falha ao enviar notificação de nova solicitação' });
      }
    } else {
      return res.status(400).json({ status: 'error', message: 'Parâmetros insuficientes ou inválidos' });
    }
  } catch (error) {
    console.error('Erro ao processar requisição de SMS:', error);
    return res.status(500).json({ status: 'error', message: 'Erro interno do servidor', error: error.message });
  }
}