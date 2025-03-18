import { users, type User, type InsertUser, freightRequests, type FreightRequest, type InsertFreightRequest, quotes, type Quote, type InsertQuote, type FreightRequestWithQuote } from "@shared/schema";
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
  updateFreightRequestStatus(id: number, status: string): Promise<FreightRequest | undefined>;
  
  // Quote operations
  createQuote(quote: InsertQuote): Promise<Quote>;
  getQuoteByRequestId(requestId: number): Promise<Quote | undefined>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  users: Map<number, User>; // Mudado de private para public para permitir acesso no routes.ts
  private freightRequests: Map<number, FreightRequest>;
  private quotes: Map<number, Quote>;
  private userCounter: number;
  private requestCounter: number;
  private quoteCounter: number;
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.freightRequests = new Map();
    this.quotes = new Map();
    this.userCounter = 3; // Começando em 3 para criar os usuários padrão 1 e 2
    this.requestCounter = 1;
    this.quoteCounter = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Adicionar usuários padrão
    this.addDefaultUsers();
  }
  
  // Adiciona os usuários padrão para cliente e transportadora
  private addDefaultUsers() {
    // Usuário cliente
    const clientUser: User = {
      id: 1,
      username: "cliente",
      password: "$2b$10$vK5E2i6sjLc4PFX1Kfs3OOBexHOjnP/V8QDU2zg0o0SpRE/ygtEfK", // senha: 123456
      fullName: "Cliente Padrão",
      email: "cliente@exemplo.com",
      phone: "(11) 99999-8888",
      role: "client"
    };
    
    // Usuário transportadora
    const companyUser: User = {
      id: 2,
      username: "empresa",
      password: "$2b$10$vK5E2i6sjLc4PFX1Kfs3OOBexHOjnP/V8QDU2zg0o0SpRE/ygtEfK", // senha: 123456
      fullName: "Transportadora Ltda",
      email: "transportadora@exemplo.com",
      phone: "(11) 98888-7777",
      role: "company"
    };
    
    this.users.set(clientUser.id, clientUser);
    this.users.set(companyUser.id, companyUser);
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

  // Freight request operations
  async createFreightRequest(insertRequest: InsertFreightRequest): Promise<FreightRequest> {
    const id = this.requestCounter++;
    const createdAt = new Date();
    const request: FreightRequest = { 
      ...insertRequest, 
      id, 
      createdAt 
    };
    this.freightRequests.set(id, request);
    return request;
  }

  async getFreightRequestById(id: number): Promise<FreightRequestWithQuote | undefined> {
    const request = this.freightRequests.get(id);
    if (!request) return undefined;

    const quote = await this.getQuoteByRequestId(id);
    const user = await this.getUser(request.userId);

    return {
      ...request,
      quote,
      clientName: user?.fullName
    };
  }

  async getFreightRequestsByUserId(userId: number): Promise<FreightRequestWithQuote[]> {
    const requests = Array.from(this.freightRequests.values())
      .filter(request => request.userId === userId);
    
    const result = await Promise.all(
      requests.map(async (request) => {
        const quote = await this.getQuoteByRequestId(request.id);
        return {
          ...request,
          quote
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

  async updateFreightRequestStatus(id: number, status: string): Promise<FreightRequest | undefined> {
    const request = this.freightRequests.get(id);
    if (!request) return undefined;

    const updatedRequest = {
      ...request,
      status
    };
    
    this.freightRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  // Quote operations
  async createQuote(insertQuote: InsertQuote): Promise<Quote> {
    const id = this.quoteCounter++;
    const createdAt = new Date();
    const quote: Quote = { 
      ...insertQuote, 
      id, 
      createdAt 
    };
    this.quotes.set(id, quote);
    
    // Update freight request status to "quoted"
    const request = this.freightRequests.get(insertQuote.requestId);
    if (request) {
      const updatedRequest = {
        ...request,
        status: "quoted"
      };
      this.freightRequests.set(request.id, updatedRequest);
    }
    
    return quote;
  }

  async getQuoteByRequestId(requestId: number): Promise<Quote | undefined> {
    return Array.from(this.quotes.values()).find(
      (quote) => quote.requestId === requestId
    );
  }
}

export const storage = new MemStorage();
