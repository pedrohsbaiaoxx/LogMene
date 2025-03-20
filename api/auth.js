// API de autenticação para ambiente Vercel
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { createDb } from './db.js';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const scryptAsync = promisify(scrypt);

// Funções de hash e comparação de senhas
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split('.');
  const hashedBuf = Buffer.from(hashed, 'hex');
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Gerar token JWT
function generateToken(user) {
  // Remover a senha antes de incluir no token
  const { password, ...userWithoutPassword } = user;
  
  return jwt.sign(
    { user: userWithoutPassword },
    process.env.JWT_SECRET || 'seu_segredo_jwt_aqui',
    { expiresIn: '7d' }
  );
}

// Verificar token JWT
function verifyToken(token) {
  try {
    return jwt.verify(
      token, 
      process.env.JWT_SECRET || 'seu_segredo_jwt_aqui'
    );
  } catch (error) {
    return null;
  }
}

// Handler principal para requisições de autenticação
export default async function handler(req, res) {
  const db = createDb();
  
  // Roteamento baseado no caminho
  const path = req.url.replace('/api/auth', '').split('?')[0];
  
  switch (path) {
    case '/register':
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
      }
      
      try {
        const userData = req.body;
        
        // Verificar se o usuário já existe
        const existingUser = await db.select()
          .from(users)
          .where(eq(users.username, userData.username))
          .limit(1);
          
        if (existingUser.length > 0) {
          return res.status(400).json({ error: 'Nome de usuário já existe' });
        }
        
        // Criar o usuário com senha hasheada
        const hashedPassword = await hashPassword(userData.password);
        const [user] = await db.insert(users)
          .values({
            ...userData,
            password: hashedPassword
          })
          .returning();
          
        // Gerar token JWT
        const token = generateToken(user);
        
        // Retornar usuário e token
        return res.status(201).json({
          user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            role: user.role
          },
          token
        });
      } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
    case '/login':
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
      }
      
      try {
        const { username, password } = req.body;
        
        // Buscar usuário pelo username
        const [user] = await db.select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);
          
        if (!user || !(await comparePasswords(password, user.password))) {
          return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        
        // Gerar token JWT
        const token = generateToken(user);
        
        // Retornar usuário e token
        return res.status(200).json({
          user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            role: user.role
          },
          token
        });
      } catch (error) {
        console.error('Erro ao fazer login:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
    case '/user':
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
      }
      
      try {
        // Obter token do cabeçalho Authorization
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Token não fornecido' });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        
        if (!decoded || !decoded.user) {
          return res.status(401).json({ error: 'Token inválido' });
        }
        
        // Retornar dados do usuário
        return res.status(200).json(decoded.user);
      } catch (error) {
        console.error('Erro ao verificar usuário:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
    case '/logout':
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
      }
      
      // No modelo JWT, não precisamos invalidar tokens no servidor
      // O cliente deve apenas descartar o token
      return res.status(200).json({ message: 'Logout realizado com sucesso' });
      
    default:
      return res.status(404).json({ error: 'Rota não encontrada' });
  }
}