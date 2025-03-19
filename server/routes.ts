import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertFreightRequestSchema, 
  insertQuoteSchema, 
  insertUserSchema, 
  insertDeliveryProofSchema, 
  insertNotificationSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { sendEmail } from "./services/email-service";
import { 
  sendStatusUpdateNotification, 
  sendQuoteNotification, 
  sendDeliveryProofNotification,
  sendNewFreightRequestNotification
} from "./services/notification-service";
import { getDistanceBetweenAddresses } from "./services/distance-service";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

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
          
          // Notificar cada empresa
          for (const companyUser of companyUsers) {
            sendNewFreightRequestNotification(companyUser.id, freightRequest.id, clientName);
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

  // Get freight request details
  app.get("/api/requests/:id", ensureAuthenticated, async (req, res) => {
    const requestId = parseInt(req.params.id);
    
    if (isNaN(requestId)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }
    
    const request = await storage.getFreightRequestById(requestId);
    
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

  // Create a quote for a freight request (company only)
  app.post("/api/quotes", ensureCompany, async (req, res) => {
    try {
      const quoteData = insertQuoteSchema.parse(req.body);
      
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
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Force the role to be client
      const userData = insertUserSchema.parse({
        ...req.body,
        role: "client" // Garantir que a role seja sempre "client"
      });
      
      // Hash the password using the auth helper
      const { hashPassword } = require("./auth");
      const user = await storage.createUser({
        ...userData,
        password: await hashPassword(userData.password),
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      handleZodError(error, res);
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

  // API para cálculo de distância entre endereços
  app.post("/api/calculate-distance", ensureAuthenticated, async (req, res) => {
    try {
      const { fromAddress, toAddress } = req.body;
      
      if (!fromAddress || !toAddress) {
        return res.status(400).json({ 
          success: false, 
          error: "Os endereços de origem e destino são obrigatórios" 
        });
      }
      
      const result = await getDistanceBetweenAddresses(fromAddress, toAddress);
      res.json(result);
    } catch (error) {
      console.error("Erro ao calcular distância:", error);
      res.status(500).json({ 
        success: false, 
        error: "Erro interno ao calcular distância entre endereços" 
      });
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

  const httpServer = createServer(app);
  return httpServer;
}
