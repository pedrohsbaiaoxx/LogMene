import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertFreightRequestSchema, insertQuoteSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

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
    if (req.isAuthenticated() && req.user.role === "client") {
      return next();
    }
    res.status(403).json({ message: "Forbidden: Client access required" });
  };

  // Middleware to check if user is a company
  const ensureCompany = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && req.user.role === "company") {
      return next();
    }
    res.status(403).json({ message: "Forbidden: Company access required" });
  };

  // Create a freight request (client only)
  app.post("/api/requests", ensureClient, async (req, res) => {
    try {
      const userId = req.user.id;
      const requestData = insertFreightRequestSchema.parse({
        ...req.body,
        userId
      });
      
      const freightRequest = await storage.createFreightRequest(requestData);
      res.status(201).json(freightRequest);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  // Get all freight requests for the logged-in client
  app.get("/api/requests", ensureClient, async (req, res) => {
    const userId = req.user.id;
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
    
    // Check if the user has access to this request
    if (req.user.role === "client" && request.userId !== req.user.id) {
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
    
    if (!status || !["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'accepted' or 'rejected'" });
    }
    
    // Check if the request exists and belongs to the user
    const request = await storage.getFreightRequestById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Freight request not found" });
    }
    
    if (request.userId !== req.user.id) {
      return res.status(403).json({ message: "You don't have access to this request" });
    }
    
    // Check if the current status is "quoted"
    if (request.status !== "quoted") {
      return res.status(400).json({ message: "This request cannot be accepted or rejected in its current state" });
    }
    
    const updatedRequest = await storage.updateFreightRequestStatus(requestId, status);
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
    res.json(updatedRequest);
  });

  const httpServer = createServer(app);
  return httpServer;
}
