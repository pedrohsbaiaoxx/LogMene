#!/bin/bash

# Atualiza o sistema
echo "Atualizando o sistema..."
sudo apt update && sudo apt upgrade -y

# Instala dependências necessárias
echo "Instalando dependências..."
sudo apt install -y nodejs npm postgresql nginx

# Instala o PM2 globalmente
echo "Instalando PM2..."
sudo npm install -g pm2

# Configura o PostgreSQL
echo "Configurando PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE bicasfacil;"
sudo -u postgres psql -c "CREATE USER bicasfacil WITH PASSWORD 'sua_senha_aqui';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE bicasfacil TO bicasfacil;"

# Configura o Nginx
echo "Configurando Nginx..."
sudo tee /etc/nginx/sites-available/bicasfacil << EOF
server {
    listen 80;
    server_name seu_dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}

server {
    listen 80;
    server_name api.seu_dominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Ativa o site no Nginx
sudo ln -s /etc/nginx/sites-available/bicasfacil /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Configura o SSL com Certbot
echo "Configurando SSL..."
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seu_dominio.com -d api.seu_dominio.com

# Clona o repositório (se necessário)
echo "Clonando o repositório..."
git clone https://seu_repositorio.git
cd BicasFacil

# Instala dependências do backend
echo "Instalando dependências do backend..."
npm install

# Instala dependências do frontend
echo "Instalando dependências do frontend..."
cd client
npm install
npm run build

# Configura o PM2 para o backend
echo "Configurando PM2 para o backend..."
cd ..
pm2 start server.js --name "bicasfacil-backend"

# Configura o PM2 para o frontend
echo "Configurando PM2 para o frontend..."
cd client
pm2 start npm --name "bicasfacil-frontend" -- start

# Salva a configuração do PM2
pm2 save

# Configura o PM2 para iniciar com o sistema
pm2 startup

echo "Deploy concluído!" 