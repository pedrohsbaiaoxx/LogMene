import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { 
  insertFreightRequestSchema, 
  insertQuoteSchema, 
  insertUserSchema, 
  insertDeliveryProofSchema, 
  insertNotificationSchema,
  freightRequests
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { ZodError, z } from "zod";
import { fromZodError } from "zod-validation-error";
import { log } from "./vite";
import { sendEmail, sendNewFreightRequestEmail } from "./services/email-service";
import { sendEmail as sendBrevoEmail, sendNewFreightRequestEmail as sendNewFreightRequestBrevoEmail } from "./services/brevo-email-service";
import { sendNewFreightRequestSMS } from "./services/sms-service";
import { sendWhatsApp, sendNewFreightRequestWhatsApp } from "./services/whatsapp-service";
import { 
  sendStatusUpdateNotification, 
  sendQuoteNotification, 
  sendDeliveryProofNotification,
  sendNewFreightRequestNotification
} from "./services/notification-service";


export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Rota temporária para testar email (remover após teste)
  app.get("/api/test/email", async (req, res) => {
    try {
      const testEmail = req.query.email as string || "pedroxxsb@gmail.com";
      
      console.log(`Iniciando teste de email para: ${testEmail}`);
      
      const result = await sendEmail({
        to: testEmail,
        from: "LogMene <noreply@logmene.com>",
        subject: "Teste do Serviço de Email - LogMene",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #2E3192; color: white; padding: 10px 20px; border-radius: 4px 4px 0 0;">
              <h2>LogMene - Sistema de Logística</h2>
            </div>
            <div style="border: 1px solid #eee; padding: 20px; border-radius: 0 0 4px 4px;">
              <p>Este é um email de teste do sistema LogMene.</p>
              <p>Se você está recebendo este email, o serviço de email está funcionando corretamente!</p>
              <p>Data e hora do teste: ${new Date().toLocaleString('pt-BR')}</p>
            </div>
            <div style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
              <p>Este é um email automático de teste, por favor não responda.</p>
              <p>&copy; ${new Date().getFullYear()} LogMene. Todos os direitos reservados.</p>
            </div>
          </div>
        `
      });
      
      if (result) {
        console.log(`Email de teste enviado com sucesso para: ${testEmail}`);
        res.json({ success: true, message: `Email de teste enviado com sucesso para ${testEmail}` });
      } else {
        console.error(`Falha ao enviar email de teste para: ${testEmail}`);
        res.status(500).json({ success: false, message: "Falha ao enviar email de teste" });
      }
    } catch (error) {
      console.error("Erro ao enviar email de teste:", error);
      res.status(500).json({ success: false, message: `Erro ao enviar email: ${error}` });
    }
  });

  // Rota para testar o envio de email usando Brevo
  app.get("/api/test/brevo-email", async (req, res) => {
    try {
      const testEmail = req.query.email as string || "pedroxxsb@gmail.com";
      
      console.log(`Iniciando teste de email usando Brevo para: ${testEmail}`);
      
      const textContent = `
        Teste do Sistema LogMene
        
        Este é um email de teste do sistema LogMene usando o serviço Brevo.
        Se você está recebendo este email, o serviço de email Brevo está funcionando corretamente!
        Data e hora do teste: ${new Date().toLocaleString('pt-BR')}
        
        Este é um email automático de teste, por favor não responda.
        © ${new Date().getFullYear()} LogMene. Todos os direitos reservados.
      `;
      
      const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #2E3192; color: white; padding: 10px 20px; border-radius: 4px 4px 0 0;">
              <h2>LogMene - Sistema de Logística</h2>
            </div>
            <div style="border: 1px solid #eee; padding: 20px; border-radius: 0 0 4px 4px;">
              <p>Este é um email de teste do sistema LogMene usando o serviço <strong>Brevo</strong>.</p>
              <p>Se você está recebendo este email, o serviço de email Brevo está funcionando corretamente!</p>
              <p>Data e hora do teste: ${new Date().toLocaleString('pt-BR')}</p>
            </div>
            <div style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
              <p>Este é um email automático de teste, por favor não responda.</p>
              <p>&copy; ${new Date().getFullYear()} LogMene. Todos os direitos reservados.</p>
            </div>
          </div>
        `;
        
      const result = await sendBrevoEmail({
        to: testEmail,
        from: "LogMene <noreply@logmene.com>",
        subject: "Teste do Brevo - LogMene",
        html: htmlContent,
        text: textContent
      });
      
      if (result) {
        console.log(`Email de teste via Brevo enviado com sucesso para: ${testEmail}`);
        res.json({ success: true, message: `Email de teste via Brevo enviado com sucesso para ${testEmail}` });
      } else {
        console.error(`Falha ao enviar email de teste via Brevo para: ${testEmail}`);
        res.status(500).json({ success: false, message: "Falha ao enviar email de teste via Brevo" });
      }
    } catch (error) {
      console.error("Erro ao enviar email de teste via Brevo:", error);
      console.error("Detalhes do erro:", error instanceof Error ? error.message : String(error));
      res.status(500).json({ 
        success: false, 
        message: "Falha ao enviar email de teste via Brevo",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Rota para testar o email de nova solicitação de frete via Brevo (GET)
  app.get("/api/test/freight-request-email", async (req, res) => {
    try {
      const testEmail = req.query.email as string || "pedroxxsb@gmail.com";
      const companyName = req.query.name as string || "Empresa Teste";
      
      console.log(`Iniciando teste de email de nova solicitação para: ${testEmail}`);
      
      // Simulando detalhes de uma solicitação de frete
      const freightDetails = `
        <ul>
          <li><strong>Origem:</strong> São Paulo, SP</li>
          <li><strong>Destino:</strong> Rio de Janeiro, RJ</li>
          <li><strong>Tipo de carga:</strong> Carga Geral</li>
          <li><strong>Peso:</strong> 500 kg</li>
          <li><strong>Volume:</strong> 2 m³</li>
          <li><strong>Valor da Nota Fiscal:</strong> R$ 5.000,00</li>
          <li><strong>Data de Coleta:</strong> 25/03/2025</li>
          <li><strong>Data de Entrega:</strong> 27/03/2025</li>
        </ul>
      `;
      
      // Usando a função específica para novas solicitações via Brevo
      const result = await sendNewFreightRequestBrevoEmail(
        testEmail,
        companyName,
        12345, // ID fictício da solicitação
        "Cliente Teste", // Nome fictício do cliente
        freightDetails
      );
      
      if (result) {
        console.log(`Email de nova solicitação enviado com sucesso para: ${testEmail}`);
        res.json({ 
          success: true, 
          message: `Email de nova solicitação enviado com sucesso para ${testEmail}` 
        });
      } else {
        console.error(`Falha ao enviar email de nova solicitação para: ${testEmail}`);
        res.status(500).json({ 
          success: false, 
          message: "Falha ao enviar email de nova solicitação" 
        });
      }
    } catch (error) {
      console.error("Erro ao enviar email de nova solicitação:", error);
      res.status(500).json({ 
        success: false, 
        message: "Falha ao enviar email de nova solicitação",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Rota para testar o envio de SMS
  app.get("/api/test/sms", async (req, res) => {
    try {
      const phone = req.query.phone as string;
      
      if (!phone) {
        return res.status(400).json({ 
          success: false, 
          message: "O parâmetro 'phone' é obrigatório" 
        });
      }
      
      console.log(`Iniciando teste de SMS para o número: ${phone}`);
      
      // Enviando uma mensagem SMS de teste
      const result = await sendNewFreightRequestSMS(
        phone,
        "Empresa Teste",
        12345, // ID fictício da solicitação
        "Cliente Teste" // Nome fictício do cliente
      );
      
      if (result) {
        console.log(`SMS de teste enviado com sucesso para: ${phone}`);
        res.json({ 
          success: true, 
          message: `SMS de teste enviado com sucesso para ${phone}` 
        });
      } else {
        console.error(`Falha ao enviar SMS de teste para: ${phone}`);
        res.status(500).json({ 
          success: false, 
          message: "Falha ao enviar SMS de teste" 
        });
      }
    } catch (error) {
      console.error("Erro ao enviar SMS de teste:", error);
      res.status(500).json({ 
        success: false, 
        message: "Falha ao enviar SMS de teste",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Rota para testar o envio de WhatsApp
  app.get("/api/test/whatsapp", async (req, res) => {
    try {
      const phone = req.query.phone as string;
      
      if (!phone) {
        return res.status(400).json({ 
          success: false, 
          message: "O parâmetro 'phone' é obrigatório" 
        });
      }
      
      log(`Iniciando teste de WhatsApp para o número: ${phone}`, 'whatsapp-test');
      
      // Log das variáveis de ambiente para debug
      const simulationModeValue = process.env.WHATSAPP_SIMULATION_MODE;
      log(`Variável de ambiente WHATSAPP_SIMULATION_MODE="${simulationModeValue}" (${typeof simulationModeValue})`, 'whatsapp-test');
      
      // Enviando uma mensagem WhatsApp de teste
      const result = await sendNewFreightRequestWhatsApp(
        phone,
        "Empresa Teste",
        12345, // ID fictício da solicitação
        "Cliente Teste" // Nome fictício do cliente
      );
      
      if (result) {
        log(`WhatsApp de teste enviado com sucesso para: ${phone}`, 'whatsapp-test');
        res.json({ 
          success: true, 
          message: `WhatsApp de teste enviado com sucesso para ${phone}`,
          simulation_mode: true,
          phone_formatted: phone.replace(/\D/g, '')
        });
      } else {
        log(`Falha ao enviar WhatsApp de teste para: ${phone}`, 'whatsapp-test');
        res.status(500).json({ 
          success: false, 
          message: "Falha ao enviar WhatsApp de teste" 
        });
      }
    } catch (error) {
      log(`Erro ao enviar WhatsApp de teste: ${error}`, 'whatsapp-test');
      res.status(500).json({ 
        success: false, 
        message: "Falha ao enviar WhatsApp de teste",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Rota para testar o email de nova solicitação de frete via Brevo (POST)
  app.post("/api/test/send-freight-request-email", async (req, res) => {
    try {
      const { email, name, requestId, clientName, freightDetails } = req.body;
      
      if (!email || !name) {
        return res.status(400).json({ 
          success: false, 
          message: "Parâmetros obrigatórios: email e name" 
        });
      }
      
      console.log(`Iniciando teste de email de nova solicitação (POST) para: ${email}`);
      
      // Usando a função específica para novas solicitações via Brevo
      const result = await sendNewFreightRequestBrevoEmail(
        email,
        name,
        requestId || 12345, // Usa o ID fornecido ou um valor padrão
        clientName || "Cliente Teste", // Usa o nome fornecido ou um valor padrão
        freightDetails || `
          <ul>
            <li><strong>Origem:</strong> São Paulo, SP</li>
            <li><strong>Destino:</strong> Rio de Janeiro, RJ</li>
            <li><strong>Tipo de carga:</strong> Carga Geral</li>
            <li><strong>Peso:</strong> 500 kg</li>
            <li><strong>Volume:</strong> 2 m³</li>
            <li><strong>Valor da Nota Fiscal:</strong> R$ 5.000,00</li>
            <li><strong>Data de Coleta:</strong> 25/03/2025</li>
            <li><strong>Data de Entrega:</strong> 27/03/2025</li>
          </ul>
        `
      );
      
      if (result) {
        console.log(`Email de nova solicitação (POST) enviado com sucesso para: ${email}`);
        res.json({ 
          success: true, 
          message: `Email de nova solicitação enviado com sucesso para ${email}` 
        });
      } else {
        console.error(`Falha ao enviar email de nova solicitação (POST) para: ${email}`);
        res.status(500).json({ 
          success: false, 
          message: "Falha ao enviar email de nova solicitação" 
        });
      }
    } catch (error) {
      console.error("Erro ao enviar email de nova solicitação (POST):", error);
      res.status(500).json({ 
        success: false, 
        message: "Falha ao enviar email de nova solicitação",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Error handler for Zod validation errors
  const handleZodError = (error: unknown, res: Response) => {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ message: validationError.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  };

  // Middleware to check if user is authenticated
  const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Middleware to check if user is a client
  const ensureClient = (req: Request, res: Response, next: NextFunction) => {
    console.log("User in ensureClient:", req.user);
    console.log("Is authenticated:", req.isAuthenticated());
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized: Please log in" });
    }
    
    if (req.user?.role !== "client") {
      return res.status(403).json({ message: `Forbidden: Client access required. Current role: ${req.user?.role || 'undefined'}` });
    }
    
    return next();
  };

  // Middleware to check if user is a company
  const ensureCompany = (req: Request, res: Response, next: NextFunction) => {
    console.log("User in ensureCompany:", req.user);
    console.log("Is authenticated:", req.isAuthenticated());
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized: Please log in" });
    }
    
    if (req.user?.role !== "company") {
      return res.status(403).json({ message: `Forbidden: Company access required. Current role: ${req.user?.role || 'undefined'}` });
    }
    
    return next();
  };

  // Create a freight request (client only)
  app.post("/api/requests", ensureClient, async (req, res) => {
    try {
      // req.user é garantido existir pelo middleware ensureClient
      const userId = req.user!.id;
      
      console.log("Corpo da requisição recebido:", req.body);
      
      try {
        const requestData = insertFreightRequestSchema.parse({
          ...req.body,
          userId
        });
        console.log("Dados validados:", requestData);
        
        const freightRequest = await storage.createFreightRequest(requestData);
        console.log("Solicitação criada:", freightRequest);
        
        // Enviar notificação para empresas sobre nova solicitação
        // Buscando usuários que são empresas para notificá-los
        const allUsers = await storage.getAllUsers();
        const companyUsers = allUsers.filter(user => user.role === "company");
        if (companyUsers.length > 0) {
          // Usar o nome completo do cliente para a notificação
          const clientName = req.user!.fullName || req.user!.username;
          
          // Preparar detalhes do frete para o email
          const freightDetails = `
            <ul>
              <li><strong>Origem:</strong> ${requestData.originCity}, ${requestData.originState}</li>
              <li><strong>Destino:</strong> ${requestData.destinationCity}, ${requestData.destinationState}</li>
              <li><strong>Tipo de Carga:</strong> ${requestData.cargoType}</li>
              <li><strong>Peso:</strong> ${requestData.weight} kg</li>
              <li><strong>Volume:</strong> ${requestData.volume} m³</li>
              <li><strong>Valor da Nota Fiscal:</strong> R$ ${requestData.invoiceValue.toFixed(2)}</li>
              <li><strong>Data de Coleta:</strong> ${requestData.pickupDate}</li>
              <li><strong>Data de Entrega:</strong> ${requestData.deliveryDate}</li>
            </ul>
          `;
          
          // Notificar cada empresa via notificação in-app, e-mail e WhatsApp
          for (const companyUser of companyUsers) {
            log(`Notificando empresa: ${companyUser.id} - ${companyUser.fullName}`, 'freight-notification');
            
            // Notificação in-app
            sendNewFreightRequestNotification(companyUser.id, freightRequest.id, clientName);
            
            // Enviar WhatsApp para a empresa se tiver número de telefone cadastrado
            if (companyUser.phone) {
              log(`Tentando enviar WhatsApp para ${companyUser.fullName} no número ${companyUser.phone}`, 'whatsapp');
              const whatsappSent = await sendNewFreightRequestWhatsApp(
                companyUser.phone,
                companyUser.fullName || companyUser.username,
                freightRequest.id,
                clientName
              );
              
              if (whatsappSent) {
                log(`WhatsApp enviado com sucesso para empresa ${companyUser.id}`, 'whatsapp');
              } else {
                log(`Falha ao enviar WhatsApp para empresa ${companyUser.id}, tentando SMS como fallback`, 'whatsapp');
                
                // Fallback para SMS caso o WhatsApp falhe
                await sendNewFreightRequestSMS(
                  companyUser.phone,
                  companyUser.fullName || companyUser.username,
                  freightRequest.id,
                  clientName
                );
              }
            } else {
              log(`Empresa ${companyUser.username} não tem número de telefone cadastrado. Não foi possível enviar WhatsApp.`, 'whatsapp');
            }
          }
        }
        
        res.status(201).json(freightRequest);
      } catch (validationError) {
        console.error("Erro de validação:", validationError);
        if (validationError instanceof ZodError) {
          const validationMessage = fromZodError(validationError);
          return res.status(400).json({ message: validationMessage.message });
        }
        throw validationError; // Repassa o erro para o tratamento global
      }
    } catch (error) {
      console.error("Erro ao criar solicitação de frete:", error);
      res.status(500).json({ message: "Erro interno do servidor ao criar solicitação", details: String(error) });
    }
  });

  // Get all freight requests for the logged-in client
  app.get("/api/requests", ensureClient, async (req, res) => {
    // req.user é garantido existir pelo middleware ensureClient
    const userId = req.user!.id;
    const requests = await storage.getFreightRequestsByUserId(userId);
    res.json(requests);
  });
  
  // Get active requests (in progress) for logged-in client
  app.get("/api/client/active-requests", ensureClient, async (req, res) => {
    const allRequests = await storage.getFreightRequestsByUserId(req.user!.id);
    const activeRequests = allRequests.filter(request => request.status === "accepted");
    res.json(activeRequests);
  });
  
  // Get completed requests for logged-in client
  app.get("/api/client/completed-requests", ensureClient, async (req, res) => {
    const allRequests = await storage.getFreightRequestsByUserId(req.user!.id);
    const completedRequests = allRequests.filter(request => request.status === "completed");
    res.json(completedRequests);
  });
  
  // Rotas adicionais sem o prefixo "client" para compatibilidade
  
  // Get pending requests (includes both pending and quoted)
  app.get("/api/pending-requests", ensureClient, async (req, res) => {
    const allRequests = await storage.getFreightRequestsByUserId(req.user!.id);
    const pendingRequests = allRequests.filter(request => 
      request.status === "pending" || request.status === "quoted"
    );
    res.json(pendingRequests);
  });
  
  // Get active requests (in progress)
  app.get("/api/active-requests", ensureClient, async (req, res) => {
    const allRequests = await storage.getFreightRequestsByUserId(req.user!.id);
    const activeRequests = allRequests.filter(request => request.status === "accepted");
    res.json(activeRequests);
  });
  
  // Get completed requests
  app.get("/api/completed-requests", ensureClient, async (req, res) => {
    const allRequests = await storage.getFreightRequestsByUserId(req.user!.id);
    const completedRequests = allRequests.filter(request => request.status === "completed");
    res.json(completedRequests);
  });

  // Get freight request details
  app.get("/api/requests/:id", ensureAuthenticated, async (req, res) => {
    const requestId = parseInt(req.params.id);
    
    if (isNaN(requestId)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }
    
    const request = await storage.getFreightRequestById(requestId);
    
    // Log da resposta para debug
    console.log("REQUEST DETAILS:", JSON.stringify(request, null, 2));
    
    if (!request) {
      return res.status(404).json({ message: "Freight request not found" });
    }
    
    // req.user é garantido existir pelo middleware ensureAuthenticated
    // Check if the user has access to this request
    if (req.user!.role === "client" && request.userId !== req.user!.id) {
      return res.status(403).json({ message: "You don't have access to this request" });
    }
    
    res.json(request);
  });

  // Get pending freight requests (company only)
  app.get("/api/company/pending-requests", ensureCompany, async (req, res) => {
    const requests = await storage.getPendingFreightRequests();
    res.json(requests);
  });

  // Get active freight requests (company only)
  app.get("/api/company/active-requests", ensureCompany, async (req, res) => {
    const requests = await storage.getActiveFreightRequests();
    res.json(requests);
  });
  
  // Get completed freight requests (company only)
  app.get("/api/company/completed-requests", ensureCompany, async (req, res) => {
    const requests = await storage.getCompletedFreightRequests();
    res.json(requests);
  });

  // Create a quote for a freight request (company only)
  app.post("/api/quotes", ensureCompany, async (req, res) => {
    try {
      // Modificar o schema para permitir campos opcionais
      const modifiedSchema = insertQuoteSchema.extend({
        value: z.number().min(0),
        estimatedDays: z.number().min(1),
      });
      
      const quoteData = modifiedSchema.parse(req.body);
      
      // Check if the request exists
      const request = await storage.getFreightRequestById(quoteData.requestId);
      if (!request) {
        return res.status(404).json({ message: "Freight request not found" });
      }
      
      // Check if the request status is pending
      if (request.status !== "pending") {
        return res.status(400).json({ message: "This request already has a quote or has been processed" });
      }
      
      const quote = await storage.createQuote(quoteData);
      
      // Após criar a cotação, atualizamos o status da solicitação para "quoted"
      const updatedRequest = await storage.updateFreightRequestStatus(quoteData.requestId, "quoted");
      
      // Enviamos notificação ao cliente
      if (updatedRequest) {
        sendQuoteNotification(updatedRequest.userId, quoteData.requestId, quoteData.value);
      }
      
      res.status(201).json(quote);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Update freight request status (client only)
  app.patch("/api/requests/:id/status", ensureClient, async (req, res) => {
    const requestId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (isNaN(requestId)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }
    
    if (!status || !["accepted", "rejected"].includes(status as string)) {
      return res.status(400).json({ message: "Invalid status. Must be 'accepted' or 'rejected'" });
    }
    
    // Check if the request exists and belongs to the user
    const request = await storage.getFreightRequestById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Freight request not found" });
    }
    
    // req.user é garantido existir pelo middleware ensureClient
    if (request.userId !== req.user!.id) {
      return res.status(403).json({ message: "You don't have access to this request" });
    }
    
    // Check if the current status is "quoted"
    if (request.status !== "quoted") {
      return res.status(400).json({ message: "This request cannot be accepted or rejected in its current state" });
    }
    
    const updatedRequest = await storage.updateFreightRequestStatus(requestId, status);
    
    // Enviar notificação de atualização de status
    if (updatedRequest) {
      sendStatusUpdateNotification(updatedRequest.userId, requestId, status);
    }
    
    res.json(updatedRequest);
  });

  // Update freight request status to completed (company only)
  app.patch("/api/company/requests/:id/complete", ensureCompany, async (req, res) => {
    const requestId = parseInt(req.params.id);
    
    if (isNaN(requestId)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }
    
    // Check if the request exists
    const request = await storage.getFreightRequestById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Freight request not found" });
    }
    
    // Check if the current status is "accepted"
    if (request.status !== "accepted") {
      return res.status(400).json({ message: "Only accepted requests can be marked as completed" });
    }
    
    const updatedRequest = await storage.updateFreightRequestStatus(requestId, "completed");
    
    // Enviar notificação ao cliente sobre conclusão do frete
    if (updatedRequest) {
      sendStatusUpdateNotification(updatedRequest.userId, requestId, "completed");
    }
    
    res.json(updatedRequest);
  });
  
  // Create a client account (company only)
  app.post("/api/company/clients", ensureCompany, async (req, res, next) => {
    try {
      console.log("Criando cliente com dados:", { ...req.body, password: '***' });
      
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      try {
        // Force the role to be client
        const userData = insertUserSchema.parse({
          ...req.body,
          role: "client" // Garantir que a role seja sempre "client"
        });
        
        console.log("Dados validados:", { ...userData, password: '***' });
        
        try {
          // Usamos o hashPassword importado no topo do arquivo
          const hashedPassword = await hashPassword(userData.password);
          console.log("Senha hash gerada com sucesso");
          
          try {
            const user = await storage.createUser({
              ...userData,
              password: hashedPassword,
            });
            
            console.log("Usuário criado com sucesso:", { id: user.id, username: user.username });

            // Remove password from response
            const { password, ...userWithoutPassword } = user;
            res.status(201).json(userWithoutPassword);
          } catch (error: any) {
            console.error("Erro ao criar usuário no storage:", error);
            res.status(500).json({ message: `Erro ao criar usuário: ${error.message}` });
          }
        } catch (error: any) {
          console.error("Erro ao fazer hash da senha:", error);
          res.status(500).json({ message: `Erro ao processar senha: ${error.message}` });
        }
      } catch (error) {
        console.error("Erro de validação:", error);
        handleZodError(error, res);
      }
    } catch (error: any) {
      console.error("Erro geral na criação do cliente:", error);
      res.status(500).json({ message: `Erro interno do servidor: ${error.message}` });
    }
  });
  
  // Get all clients (company only)
  app.get("/api/company/clients", ensureCompany, async (req, res) => {
    try {
      const allClients = await storage.getAllClients();
      // Remove passwords before sending
      const clientsWithoutPasswords = allClients.map(client => {
        const { password, ...clientWithoutPassword } = client;
        return clientWithoutPassword;
      });
      
      res.json(clientsWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Error fetching clients" });
    }
  });
  
  // Get specific user by ID (company only)
  app.get("/api/users/:id", ensureCompany, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Remove password before sending
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar usuário" });
    }
  });
  
  // Get all requests for a specific client (company only)
  app.get("/api/client/:id/requests", ensureCompany, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "ID de cliente inválido" });
      }
      
      // Verifica se o usuário existe e é um cliente
      const user = await storage.getUser(clientId);
      if (!user) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      if (user.role !== "client") {
        return res.status(403).json({ message: "O usuário especificado não é um cliente" });
      }
      
      const requests = await storage.getFreightRequestsByUserId(clientId);
      res.json(requests);
    } catch (error) {
      console.error("Erro ao buscar solicitações do cliente:", error);
      res.status(500).json({ message: "Erro ao buscar solicitações do cliente" });
    }
  });
  
  // Delete client (company only)
  app.delete("/api/company/clients/:id", ensureCompany, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      
      // Verifica se o usuário existe e é um cliente
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      if (user.role !== "client") {
        return res.status(403).json({ message: "Somente clientes podem ser excluídos" });
      }
      
      const deleted = await storage.deleteUser(userId);
      if (deleted) {
        res.status(200).json({ message: "Cliente excluído com sucesso" });
      } else {
        res.status(500).json({ message: "Erro ao excluir cliente" });
      }
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      res.status(500).json({ message: "Erro interno ao excluir cliente" });
    }
  });

  // API para gerenciamento de notificações

  // Get notifications for logged in user
  app.get("/api/notifications", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const notifications = await storage.getNotificationsByUserId(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar notificações" });
    }
  });

  // Get unread notifications count
  app.get("/api/notifications/count", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const count = await storage.getUnreadNotificationsCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Erro ao contar notificações não lidas" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", ensureAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      if (isNaN(notificationId)) {
        return res.status(400).json({ message: "ID de notificação inválido" });
      }
      
      const notification = await storage.markNotificationAsRead(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notificação não encontrada" });
      }
      
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Erro ao marcar notificação como lida" });
    }
  });
  
  // Mark all notifications as read for a user
  app.patch("/api/notifications/mark-all-read", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const updatedCount = await storage.markAllNotificationsAsRead(userId);
      
      res.json({ success: true, count: updatedCount });
    } catch (error) {
      res.status(500).json({ message: "Erro ao marcar todas notificações como lidas" });
    }
  });
  
  // Mark freight request as completed (company only)
  app.patch("/api/company/requests/:id/complete", ensureCompany, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      if (isNaN(requestId)) {
        return res.status(400).json({ message: "ID de solicitação inválido" });
      }
      
      // Verificar se a solicitação existe
      const request = await storage.getFreightRequestById(requestId);
      if (!request) {
        return res.status(404).json({ message: "Solicitação não encontrada" });
      }
      
      // Verificar se a solicitação está aceita (status "accepted")
      if (request.status !== "accepted") {
        return res.status(400).json({ message: "Apenas solicitações aceitas podem ser marcadas como concluídas" });
      }
      
      // Verificar se tem comprovante de entrega
      const proof = await storage.getDeliveryProofByRequestId(requestId);
      if (!proof) {
        return res.status(400).json({ message: "É necessário anexar um comprovante de entrega antes de concluir a solicitação" });
      }
      
      // Atualizar o status para "completed"
      const updatedRequest = await storage.updateFreightRequestStatus(requestId, "completed");
      
      // Notificar o cliente
      await storage.createNotification({
        userId: request.userId,
        requestId: requestId,
        type: "status_update",
        message: "Seu frete foi marcado como concluído pela transportadora.",
        read: false
      });
      
      res.json(updatedRequest);
    } catch (error) {
      console.error("Erro ao concluir solicitação:", error);
      res.status(500).json({ message: "Erro ao concluir a solicitação" });
    }
  });

  // API para gerenciamento de comprovantes de entrega

  // Upload delivery proof (company only)
  app.post("/api/delivery-proofs", ensureCompany, async (req, res) => {
    try {
      const proofData = insertDeliveryProofSchema.parse(req.body);
      
      // Check if the request exists
      const request = await storage.getFreightRequestById(proofData.requestId);
      if (!request) {
        return res.status(404).json({ message: "Solicitação de frete não encontrada" });
      }
      
      // Verificar se a requisição tem status "accepted"
      console.log("Status da requisição:", request.status);
      
      // Check if the current status is accepted
      if (request.status !== "accepted") {
        return res.status(400).json({ message: "Apenas solicitações aceitas podem receber comprovantes de entrega" });
      }
      
      // Check if proof already exists
      const existingProof = await storage.getDeliveryProofByRequestId(proofData.requestId);
      if (existingProof) {
        return res.status(400).json({ message: "Esta solicitação já possui um comprovante de entrega" });
      }
      
      const proof = await storage.createDeliveryProof(proofData);
      
      // Notificar o cliente que um comprovante foi enviado
      sendDeliveryProofNotification(request.userId, proofData.requestId);
      
      res.status(201).json(proof);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Get delivery proof by request ID
  app.get("/api/requests/:id/delivery-proof", ensureAuthenticated, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      if (isNaN(requestId)) {
        return res.status(400).json({ message: "ID de solicitação inválido" });
      }
      
      // Check if the request exists
      const request = await storage.getFreightRequestById(requestId);
      if (!request) {
        return res.status(404).json({ message: "Solicitação de frete não encontrada" });
      }
      
      // If user is client, check if it belongs to them
      if (req.user!.role === "client" && request.userId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem acesso a esta solicitação" });
      }
      
      const proof = await storage.getDeliveryProofByRequestId(requestId);
      if (!proof) {
        return res.status(404).json({ message: "Comprovante de entrega não encontrado" });
      }
      
      res.json(proof);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar comprovante de entrega" });
    }
  });


  
  // Serviço de Email para notificações
  app.post("/api/send-email", ensureAuthenticated, async (req, res) => {
    try {
      const { to, subject, text, html } = req.body;
      
      // Verifica permissões - apenas usuários da empresa podem enviar emails
      if (req.user!.role !== "company") {
        return res.status(403).json({ message: "Apenas usuários da empresa podem enviar emails" });
      }
      
      // Verifica campos obrigatórios
      if (!to || !subject || (!text && !html)) {
        return res.status(400).json({ message: "Campos obrigatórios: to, subject e (text ou html)" });
      }
      
      // Usa o novo serviço de email
      const result = await sendEmail({
        to,
        from: 'noreply@logmene.com',
        subject,
        text: text || '',
        html: html || ''
      });
      
      if (result) {
        res.status(200).json({ message: "Email enviado com sucesso" });
      } else {
        res.status(500).json({ message: "Falha ao enviar email" });
      }
    } catch (error) {
      console.error("Erro ao enviar email:", error);
      res.status(500).json({ message: "Erro ao enviar email" });
    }
  });
  
  // Temporário: Atualizar registros de fretes concluídos com data de conclusão
  app.get("/api/update-completed-dates", ensureCompany, async (req, res) => {
    try {
      const completedRequests = await db
        .select()
        .from(freightRequests)
        .where(eq(freightRequests.status, "completed"));
      
      const today = new Date();
      let updatedCount = 0;
      
      for (const request of completedRequests) {
        if (!request.completedAt) {
          await db
            .update(freightRequests)
            .set({ completedAt: today })
            .where(eq(freightRequests.id, request.id));
          updatedCount++;
        }
      }
      
      res.json({ 
        success: true, 
        message: `Atualizado ${updatedCount} registro(s) de fretes concluídos com a data de hoje.` 
      });
    } catch (error) {
      console.error("Erro ao atualizar datas de conclusão:", error);
      res.status(500).json({ message: "Erro ao atualizar datas de conclusão" });
    }
  });

  // Endpoint para gerar relatório de fretes de um cliente em PDF
  app.get("/api/report/client/:id", ensureAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: "ID de cliente inválido" });
      }

      // Obter cliente
      const client = await storage.getUser(clientId);
      if (!client || client.role !== 'client') {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      // Verificar se o usuário logado é o próprio cliente ou uma empresa (que pode ver relatórios de qualquer cliente)
      if (req.user?.id !== clientId && req.user?.role !== 'company') {
        return res.status(403).json({ message: "Acesso não autorizado ao relatório" });
      }

      // Obter todos os fretes do cliente
      const requests = await storage.getFreightRequestsByUserId(clientId);
      
      // Verificar período específico para o relatório
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (req.query.startDate && req.query.endDate) {
        startDate = new Date(req.query.startDate as string);
        endDate = new Date(req.query.endDate as string);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return res.status(400).json({ message: "Datas inválidas" });
        }
      }
      
      // Importar o serviço de PDF
      const { generateClientFreightReport } = await import('./services/html-report');
      
      // Gerar o PDF
      const pdfBuffer = await generateClientFreightReport(
        client.fullName, 
        requests,
        startDate,
        endDate
      );
      
      // Enviar o PDF como resposta
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=relatorio_${client.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      res.status(500).json({ message: "Erro ao gerar relatório" });
    }
  });

  // Endpoint para gerar relatório mensal de fretes de um cliente em PDF
  app.get("/api/report/client/:id/monthly/:month/:year", ensureAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const month = parseInt(req.params.month);
      const year = parseInt(req.params.year);
      
      if (isNaN(clientId) || isNaN(month) || isNaN(year) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Parâmetros inválidos" });
      }

      // Obter cliente
      const client = await storage.getUser(clientId);
      if (!client || client.role !== 'client') {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      // Verificar se o usuário logado é o próprio cliente ou uma empresa (que pode ver relatórios de qualquer cliente)
      if (req.user?.id !== clientId && req.user?.role !== 'company') {
        return res.status(403).json({ message: "Acesso não autorizado ao relatório" });
      }

      // Obter todos os fretes do cliente
      const requests = await storage.getFreightRequestsByUserId(clientId);
      
      // Definir o período do mês
      const startDate = new Date(year, month - 1, 1); // Mês em JavaScript é 0-indexed
      const endDate = new Date(year, month, 0); // Último dia do mês
      
      // Importar o serviço de PDF
      const { generateClientFreightReport } = await import('./services/html-report');
      
      // Gerar o PDF
      const pdfBuffer = await generateClientFreightReport(
        client.fullName, 
        requests,
        startDate,
        endDate
      );
      
      // Enviar o PDF como resposta
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=relatorio_mensal_${client.fullName.replace(/\s+/g, '_')}_${month}_${year}.pdf`);
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Erro ao gerar relatório mensal:", error);
      res.status(500).json({ message: "Erro ao gerar relatório mensal" });
    }
  });

  // Rota de teste para enviar email
  app.get("/api/test-email", async (req, res) => {
    try {
      console.log("Iniciando teste de envio de email para pedroxxsb@gmail.com");
      
      const to = 'pedroxxsb@gmail.com';
      const from = process.env.EMAIL_USER || 'noreply@logmene.com';
      
      console.log(`Tentando enviar email de teste para ${to}`);
      
      const result = await sendEmail({
        to: to,
        from: from,
        subject: 'Teste de Email do LogMene',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #2E3192;">Teste de Email do LogMene</h2>
            <p>Este é um email de teste do sistema LogMene.</p>
            <p>Se você recebeu este email, significa que a integração com o serviço de email está funcionando corretamente.</p>
            <p>Data e hora do envio: ${new Date().toLocaleString('pt-BR')}</p>
          </div>
        `
      });
      
      if (result) {
        console.log("Email de teste enviado com sucesso");
        res.json({ 
          success: true, 
          message: 'Email enviado com sucesso!', 
          details: 'Verifique os logs do servidor para mais informações sobre o envio.'
        });
      } else {
        console.log("Falha ao enviar email de teste");
        res.status(500).json({ success: false, message: 'Falha ao enviar email' });
      }
    } catch (error) {
      console.error('Erro ao enviar email de teste:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao enviar email', 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  const httpServer = createServer(app);
  // Rota para testar o mecanismo de fallback do serviço de notificação
  app.get('/api/test/notification-fallback', async (req, res) => {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email é obrigatório' });
    }
    
    try {
      console.log(`Testando mecanismo de fallback para notificações para: ${email}`);
      
      // Desativar temporariamente a chave Brevo para forçar o uso do fallback
      const originalBrevoKey = process.env.BREVO_API_KEY;
      process.env.BREVO_API_KEY = '';
      
      // Tentamos enviar um email usando o serviço de notificação, que vai usar o fallback
      const { sendEmail } = await import('./services/email-service');
      
      // Enviamos um email de teste via nodemailer
      console.log('Enviando email diretamente via Nodemailer (fallback)...');
      const result = await sendEmail({
        to: email,
        from: 'LogMene <noreply@logmene.com>',
        subject: 'Teste de Fallback do Sistema LogMene',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #2E3192; color: white; padding: 10px 20px; border-radius: 4px 4px 0 0;">
              <h2>LogMene - Teste de Fallback</h2>
            </div>
            <div style="border: 1px solid #eee; padding: 20px; border-radius: 0 0 4px 4px;">
              <p>Este é um email de teste do mecanismo de fallback do Sistema LogMene.</p>
              <p>Este email foi enviado usando o sistema de fallback (Nodemailer) porque o Brevo foi desativado para este teste.</p>
              <p>Se você está recebendo este email, o mecanismo de fallback está funcionando corretamente!</p>
              <p>Data e hora do teste: ${new Date().toLocaleString('pt-BR')}</p>
            </div>
            <div style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
              <p>Este é um email automático de teste, por favor não responda.</p>
              <p>&copy; ${new Date().getFullYear()} LogMene. Todos os direitos reservados.</p>
            </div>
          </div>
        `
      });
      
      // Restaurar a chave Brevo
      process.env.BREVO_API_KEY = originalBrevoKey;
      
      if (result) {
        return res.json({ 
          success: true, 
          message: `Teste de fallback concluído com sucesso. Email enviado via Nodemailer (sistema de fallback).`,
          details: {
            usedFallback: true,
            email
          }
        });
      } else {
        return res.status(500).json({ 
          success: false, 
          message: `Falha ao enviar email via sistema de fallback.`
        });
      }
    } catch (error) {
      console.error('Erro no teste de fallback:', error);
      return res.status(500).json({ 
        success: false, 
        message: `Erro ao testar mecanismo de fallback: ${error}`,
        error: String(error)
      });
    }
  });

  // Rota para testar o serviço de notificações
  app.post('/api/test/notification', async (req, res) => {
    const { userId, requestId, type, message, sendEmail } = req.body;
    
    if (!userId || !type || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dados incompletos. userId, type e message são obrigatórios.'
      });
    }
    
    try {
      console.log(`Testando serviço de notificação para usuário ${userId}`);
      
      const { sendNotification } = await import('./services/notification-service');
      
      // Verificar se o usuário existe
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: `Usuário com ID ${userId} não encontrado`
        });
      }
      
      // Enviar notificação usando o serviço
      const result = await sendNotification({
        userId,
        requestId: requestId || null,
        type,
        message,
        sendEmail
      });
      
      if (result) {
        // Buscar a notificação criada para confirmar
        const notifications = await storage.getNotificationsByUserId(userId);
        const lastNotification = notifications.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date();
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date();
          return dateB.getTime() - dateA.getTime();
        })[0];
        
        return res.json({ 
          success: true, 
          message: `Notificação enviada com sucesso para ${user.username} (${user.email})`,
          notification: lastNotification,
          emailSent: sendEmail
        });
      } else {
        return res.status(500).json({ 
          success: false, 
          message: 'Falha ao enviar notificação'
        });
      }
    } catch (error) {
      console.error('Erro ao testar serviço de notificação:', error);
      return res.status(500).json({ 
        success: false, 
        message: `Erro ao testar serviço de notificação: ${error}`,
        error: String(error)
      });
    }
  });

  return httpServer;
}
