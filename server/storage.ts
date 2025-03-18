import { 
  users, type User, type InsertUser, 
  freightRequests, type FreightRequest, type InsertFreightRequest, 
  quotes, type Quote, type InsertQuote, 
  deliveryProofs, type DeliveryProof, type InsertDeliveryProof,
  notifications, type Notification, type InsertNotification,
  type FreightRequestWithQuote, requestStatus, notificationTypes 
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Freight request operations
  createFreightRequest(request: InsertFreightRequest): Promise<FreightRequest>;
  getFreightRequestById(id: number): Promise<FreightRequestWithQuote | undefined>;
  getFreightRequestsByUserId(userId: number): Promise<FreightRequestWithQuote[]>;
  getPendingFreightRequests(): Promise<FreightRequestWithQuote[]>;
  getActiveFreightRequests(): Promise<FreightRequestWithQuote[]>;
  updateFreightRequestStatus(id: number, status: typeof requestStatus[number]): Promise<FreightRequest | undefined>;
  
  // Quote operations
  createQuote(quote: InsertQuote): Promise<Quote>;
  getQuoteByRequestId(requestId: number): Promise<Quote | undefined>;
  
  // Delivery proof operations
  createDeliveryProof(proof: InsertDeliveryProof): Promise<DeliveryProof>;
  getDeliveryProofByRequestId(requestId: number): Promise<DeliveryProof | undefined>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUserId(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  getUnreadNotificationsCount(userId: number): Promise<number>;
  
  // Session store
  sessionStore: ReturnType<typeof createMemoryStore>;
}

export class MemStorage implements IStorage {
  users: Map<number, User>; // Mudado de private para public para permitir acesso no routes.ts
  private freightRequests: Map<number, FreightRequest>;
  private quotes: Map<number, Quote>;
  private deliveryProofs: Map<number, DeliveryProof>;
  private notifications: Map<number, Notification>;
  private userCounter: number;
  private requestCounter: number;
  private quoteCounter: number;
  private proofCounter: number;
  private notificationCounter: number;
  sessionStore: ReturnType<typeof createMemoryStore>;

  constructor() {
    this.users = new Map();
    this.freightRequests = new Map();
    this.quotes = new Map();
    this.deliveryProofs = new Map();
    this.notifications = new Map();
    this.userCounter = 1;
    this.requestCounter = 1;
    this.quoteCounter = 1;
    this.proofCounter = 1;
    this.notificationCounter = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Criar usuários iniciais para teste
    this.createInitialUsers();
  }
  
  // Inicializa usuários para testes
  private async createInitialUsers() {
    // Senha 'cliente123' já com hash
    const clientHashedPassword = '1f3870be274f6c49b3e31a0c6728957f03420416a938df5de94e89d540619e503b3df6cd204995d6f6e601ecd65bd5399e4f8c26d991e3485a12ea728d94c63d.7e43c1a5e833b5f4';
    
    // Senha 'empresa123' já com hash
    const companyHashedPassword = '87bd4c9c26de8ca47498b025a709bc272ed9b67dcc07f8c67eca40c392f74ccd73ac00e2e25cae79a05f04cb5ed2a90a8d1f03880c11e465a44f25ae3f02b013.ba7ca8eb6ac84e6e';
    
    // Usuário cliente
    await this.createUser({
      username: 'cliente',
      password: clientHashedPassword,
      fullName: 'Cliente Teste',
      email: 'cliente@teste.com',
      phone: '(11) 98765-4321',
      role: 'client'
    });
    
    // Usuário empresa
    await this.createUser({
      username: 'empresa',
      password: companyHashedPassword,
      fullName: 'Empresa Teste',
      email: 'empresa@teste.com',
      phone: '(11) 12345-6789',
      role: 'company'
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    // Verifica se o usuário existe
    if (!this.users.has(id)) {
      return false;
    }
    
    // Remove o usuário
    this.users.delete(id);
    
    // Remove também as solicitações de frete deste usuário
    const requestsToRemove = Array.from(this.freightRequests.entries())
      .filter(([_, request]) => request.userId === id);
      
    for (const [requestId, _] of requestsToRemove) {
      // Remove cotações associadas a esta solicitação
      const quotesToRemove = Array.from(this.quotes.entries())
        .filter(([_, quote]) => quote.requestId === requestId);
        
      for (const [quoteId, _] of quotesToRemove) {
        this.quotes.delete(quoteId);
      }
      
      // Remove a solicitação
      this.freightRequests.delete(requestId);
    }
    
    return true;
  }
  
  async getAllClients(): Promise<User[]> {
    return Array.from(this.users.values())
      .filter(user => user.role === 'client');
  }

  // Freight request operations
  async createFreightRequest(insertRequest: InsertFreightRequest): Promise<FreightRequest> {
    const id = this.requestCounter++;
    const createdAt = new Date();
    
    // Garantir que campos opcionais não sejam undefined
    const notes = insertRequest.notes === undefined ? null : insertRequest.notes;
    const requireInsurance = insertRequest.requireInsurance === undefined ? false : insertRequest.requireInsurance;
    
    const request: FreightRequest = { 
      ...insertRequest,
      notes,
      requireInsurance, 
      id, 
      createdAt,
      status: "pending" as const
    };
    this.freightRequests.set(id, request);
    return request;
  }

  async getFreightRequestById(id: number): Promise<FreightRequestWithQuote | undefined> {
    const request = this.freightRequests.get(id);
    if (!request) return undefined;

    const quote = await this.getQuoteByRequestId(id);
    const user = await this.getUser(request.userId);
    const deliveryProof = await this.getDeliveryProofByRequestId(id);

    return {
      ...request,
      quote,
      clientName: user?.fullName,
      deliveryProof
    };
  }

  async getFreightRequestsByUserId(userId: number): Promise<FreightRequestWithQuote[]> {
    const requests = Array.from(this.freightRequests.values())
      .filter(request => request.userId === userId);
    
    const result = await Promise.all(
      requests.map(async (request) => {
        const quote = await this.getQuoteByRequestId(request.id);
        const deliveryProof = await this.getDeliveryProofByRequestId(request.id);
        return {
          ...request,
          quote,
          deliveryProof
        };
      })
    );
    
    return result.sort((a, b) => 
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getPendingFreightRequests(): Promise<FreightRequestWithQuote[]> {
    const requests = Array.from(this.freightRequests.values())
      .filter(request => request.status === "pending");
    
    const result = await Promise.all(
      requests.map(async (request) => {
        const user = await this.getUser(request.userId);
        return {
          ...request,
          clientName: user?.fullName
        };
      })
    );
    
    return result.sort((a, b) => 
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getActiveFreightRequests(): Promise<FreightRequestWithQuote[]> {
    const requests = Array.from(this.freightRequests.values())
      .filter(request => ["accepted", "quoted"].includes(request.status));
    
    const result = await Promise.all(
      requests.map(async (request) => {
        const quote = await this.getQuoteByRequestId(request.id);
        const user = await this.getUser(request.userId);
        return {
          ...request,
          quote,
          clientName: user?.fullName
        };
      })
    );
    
    return result.sort((a, b) => 
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async updateFreightRequestStatus(id: number, status: typeof requestStatus[number]): Promise<FreightRequest | undefined> {
    const request = this.freightRequests.get(id);
    if (!request) return undefined;

    const updatedRequest = {
      ...request,
      status
    };
    
    this.freightRequests.set(id, updatedRequest);

    // Criar notificação de mudança de status
    let message = "";
    switch (status) {
      case "quoted":
        message = "Uma nova cotação foi adicionada à sua solicitação de frete.";
        break;
      case "accepted":
        message = "A cotação da sua solicitação de frete foi aceita.";
        break;
      case "rejected":
        message = "A cotação da sua solicitação de frete foi rejeitada.";
        break;
      case "completed":
        message = "Sua solicitação de frete foi marcada como concluída.";
        break;
      default:
        message = `O status da sua solicitação de frete foi atualizado para ${status}.`;
    }
    
    this.createNotification({
      userId: request.userId,
      requestId: id,
      type: "status_update",
      message,
      read: false
    });
    
    return updatedRequest;
  }

  // Quote operations
  async createQuote(insertQuote: InsertQuote): Promise<Quote> {
    const id = this.quoteCounter++;
    const createdAt = new Date();
    
    // Garantir que notes não é undefined
    const notes = insertQuote.notes === undefined ? null : insertQuote.notes;
    
    const quote: Quote = { 
      ...insertQuote, 
      notes,
      id, 
      createdAt 
    };
    this.quotes.set(id, quote);
    
    // Update freight request status to "quoted"
    const request = this.freightRequests.get(insertQuote.requestId);
    if (request) {
      const updatedRequest = {
        ...request,
        status: "quoted" as const
      };
      this.freightRequests.set(request.id, updatedRequest);
      
      // Criar notificação para o cliente
      this.createNotification({
        userId: request.userId,
        requestId: request.id,
        type: "quote_received",
        message: "Uma nova cotação foi adicionada à sua solicitação de frete.",
        read: false
      });
    }
    
    return quote;
  }

  async getQuoteByRequestId(requestId: number): Promise<Quote | undefined> {
    return Array.from(this.quotes.values()).find(
      (quote) => quote.requestId === requestId
    );
  }

  // Delivery proof operations
  async createDeliveryProof(insertProof: InsertDeliveryProof): Promise<DeliveryProof> {
    const id = this.proofCounter++;
    const createdAt = new Date();
    
    // Garantir que notes não é undefined
    const notes = insertProof.notes === undefined ? null : insertProof.notes;
    
    const proof: DeliveryProof = { 
      ...insertProof, 
      notes,
      id, 
      createdAt 
    };
    this.deliveryProofs.set(id, proof);
    
    // Atualizar o status da solicitação para "completed"
    const request = this.freightRequests.get(insertProof.requestId);
    if (request) {
      const updatedRequest = {
        ...request,
        status: "completed" as const
      };
      this.freightRequests.set(request.id, updatedRequest);
      
      // Criar notificação para o cliente
      this.createNotification({
        userId: request.userId,
        requestId: request.id,
        type: "proof_uploaded",
        message: "O comprovante de entrega da sua carga foi adicionado.",
        read: false
      });
    }
    
    return proof;
  }

  async getDeliveryProofByRequestId(requestId: number): Promise<DeliveryProof | undefined> {
    return Array.from(this.deliveryProofs.values()).find(
      (proof) => proof.requestId === requestId
    );
  }

  // Notification operations
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.notificationCounter++;
    const createdAt = new Date();
    
    // Garantir que campos opcionais não sejam undefined
    const requestId = insertNotification.requestId === undefined ? null : insertNotification.requestId;
    const read = insertNotification.read === undefined ? false : insertNotification.read;
    
    const notification: Notification = { 
      ...insertNotification, 
      requestId,
      read,
      id, 
      createdAt 
    };
    this.notifications.set(id, notification);
    
    return notification;
  }

  async getNotificationsByUserId(userId: number): Promise<Notification[]> {
    const notifications = Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId);
    
    return notifications.sort((a, b) => 
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;

    const updatedNotification = {
      ...notification,
      read: true
    };
    
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }

  async getUnreadNotificationsCount(userId: number): Promise<number> {
    const notifications = await this.getNotificationsByUserId(userId);
    return notifications.filter(notification => !notification.read).length;
  }
}

export const storage = new MemStorage();
