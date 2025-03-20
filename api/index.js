// Serverless entry point for Vercel
import express from 'express';
import { registerRoutes } from '../server/routes.js';
import { setupVite, serveStatic } from '../server/vite.js';
import cors from 'cors';

const app = express();

// Middlewares básicos
app.use(express.json());
app.use(cors());

// Configuração de rotas da API
const httpServer = await registerRoutes(app);

// Em ambiente serverless, não precisamos do servidor HTTP separado
// mas sim exportar o app Express diretamente

// Servir arquivos estáticos (compilados pelo Vite)
serveStatic(app);

// Configurar callback para roteamento do cliente
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    // Já tratado pelas rotas de API
    return;
  }
  
  // Servir o index.html para todas as outras rotas para suportar o client-side routing
  res.sendFile('dist/index.html', { root: '.' });
});

// Exportar a aplicação para Vercel
export default app;