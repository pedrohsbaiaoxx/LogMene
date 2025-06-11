# BicasFácil - Instruções de Deploy

Este documento contém as instruções para fazer o deploy do BicasFácil em uma VPS.

## Pré-requisitos

- Uma VPS com Ubuntu 20.04 ou superior
- Acesso SSH à VPS
- Um domínio configurado (opcional, mas recomendado)
- Git instalado na VPS

## Passos para Deploy

1. **Preparação da VPS**

   ```bash
   # Atualize o sistema
   sudo apt update && sudo apt upgrade -y

   # Instale as dependências necessárias
   sudo apt install -y nodejs npm postgresql nginx
   ```

2. **Configuração do Banco de Dados**

   ```bash
   # Acesse o PostgreSQL
   sudo -u postgres psql

   # Crie o banco de dados e usuário
   CREATE DATABASE bicasfacil;
   CREATE USER bicasfacil WITH PASSWORD 'sua_senha_aqui';
   GRANT ALL PRIVILEGES ON DATABASE bicasfacil TO bicasfacil;
   ```

3. **Configuração do Nginx**

   ```bash
   # Crie o arquivo de configuração
   sudo nano /etc/nginx/sites-available/bicasfacil

   # Adicione a configuração (veja o arquivo deploy.sh para o conteúdo)

   # Ative o site
   sudo ln -s /etc/nginx/sites-available/bicasfacil /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **Configuração do SSL (opcional)**

   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d seu_dominio.com -d api.seu_dominio.com
   ```

5. **Deploy da Aplicação**

   ```bash
   # Clone o repositório
   git clone https://seu_repositorio.git
   cd BicasFacil

   # Instale as dependências do backend
   npm install

   # Instale as dependências do frontend
   cd client
   npm install
   npm run build
   ```

6. **Configuração do PM2**

   ```bash
   # Instale o PM2 globalmente
   sudo npm install -g pm2

   # Inicie o backend
   cd ..
   pm2 start server.js --name "bicasfacil-backend"

   # Inicie o frontend
   cd client
   pm2 start npm --name "bicasfacil-frontend" -- start

   # Configure o PM2 para iniciar com o sistema
   pm2 save
   pm2 startup
   ```

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
# Configurações do Banco de Dados
DATABASE_URL=postgresql://bicasfacil:sua_senha_aqui@localhost:5432/bicasfacil

# Configurações do Servidor
PORT=3001
NODE_ENV=production

# Configurações de Segurança
JWT_SECRET=seu_jwt_secret_aqui
CORS_ORIGIN=https://seu_dominio.com

# Configurações do Frontend
VITE_API_URL=https://api.seu_dominio.com
```

## Manutenção

- Para ver os logs: `pm2 logs`
- Para reiniciar a aplicação: `pm2 restart all`
- Para atualizar a aplicação:
  ```bash
  git pull
  npm install
  cd client && npm install && npm run build
  pm2 restart all
  ```

## Troubleshooting

1. **Erro de conexão com o banco de dados**
   - Verifique se o PostgreSQL está rodando: `sudo systemctl status postgresql`
   - Verifique as credenciais no arquivo `.env`

2. **Erro no Nginx**
   - Verifique os logs: `sudo tail -f /var/log/nginx/error.log`
   - Teste a configuração: `sudo nginx -t`

3. **Erro na aplicação**
   - Verifique os logs do PM2: `pm2 logs`
   - Verifique o status: `pm2 status` 