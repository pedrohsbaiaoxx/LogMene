// Adaptação do banco de dados para ambiente Vercel
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../shared/schema.js';

// Usar o driver da Neon para conexão serverless
export const createPool = () => {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL não configurada');
    throw new Error('DATABASE_URL não configurada');
  }
  
  return new Pool({ connectionString: process.env.DATABASE_URL });
};

// Criar conexão com o banco de dados
export const createDb = () => {
  const pool = createPool();
  return drizzle({ client: pool, schema });
};

// Função para lidar com os pedidos de API relacionados ao banco de dados
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const db = createDb();
    const { operation, table, data, filters } = req.body;
    
    if (!operation || !table) {
      return res.status(400).json({ error: 'Operação ou tabela não especificada' });
    }
    
    // Verificar se a tabela existe no esquema
    if (!schema[table]) {
      return res.status(400).json({ error: 'Tabela não encontrada no esquema' });
    }
    
    let result;
    
    switch (operation) {
      case 'select':
        if (filters) {
          // Implementar filtros específicos aqui
          // Exemplo: result = await db.select().from(schema[table]).where(eq(schema[table].id, filters.id));
          result = await db.query[table].findMany({ where: filters });
        } else {
          result = await db.select().from(schema[table]);
        }
        break;
        
      case 'insert':
        if (!data) {
          return res.status(400).json({ error: 'Dados não fornecidos para inserção' });
        }
        result = await db.insert(schema[table]).values(data).returning();
        break;
        
      case 'update':
        if (!data || !filters) {
          return res.status(400).json({ error: 'Dados ou filtros não fornecidos para atualização' });
        }
        // Implementar atualização específica aqui
        break;
        
      case 'delete':
        if (!filters) {
          return res.status(400).json({ error: 'Filtros não fornecidos para exclusão' });
        }
        // Implementar exclusão específica aqui
        break;
        
      default:
        return res.status(400).json({ error: 'Operação desconhecida' });
    }
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro na operação do banco de dados:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}