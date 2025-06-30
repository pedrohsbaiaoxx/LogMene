#!/bin/bash

# Script de Deploy LogMene para VPS
# Execute este script na sua VPS

set -e

echo "🚀 Iniciando deploy do LogMene para VPS..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Verificar se está rodando como root
if [[ $EUID -eq 0 ]]; then
   error "Este script não deve ser executado como root. Use um usuário com sudo."
fi

# Configurações
APP_NAME="logmene"
APP_DIR="/home/$USER/$APP_NAME"
DOMAIN="seu-dominio.com"  # Altere para seu domínio
PORT=3000

log "Configurando ambiente..."

# Atualizar sistema
log "Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar dependências
log "Instalando dependências..."
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx

# Instalar Node.js 18.x
log "Instalando Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 globalmente
log "Instalando PM2..."
sudo npm install -g pm2

# Verificar versões
log "Verificando versões instaladas..."
node --version
npm --version
pm2 --version

# Criar diretório da aplicação
log "Criando diretório da aplicação..."
mkdir -p $APP_DIR
cd $APP_DIR

# Clonar repositório (substitua pela URL do seu repositório)
log "Clonando repositório..."
git clone https://github.com/seu-usuario/LogMene-2.git .
# OU se você já tem o código na VPS:
# cp -r /caminho/para/seu/codigo/* .

# Instalar dependências
log "Instalando dependências do projeto..."
npm install

# Criar arquivo .env
log "Criando arquivo .env..."
cat > .env << EOF
NODE_ENV=production
DATABASE_URL=sua_database_url_aqui
JWT_SECRET=seu_jwt_secret_aqui
MAILERSEND_API_KEY=sua_mailersend_api_key_aqui
TWILIO_ACCOUNT_SID=seu_twilio_account_sid_aqui
TWILIO_AUTH_TOKEN=seu_twilio_auth_token_aqui
TWILIO_PHONE_NUMBER=seu_twilio_phone_number_aqui
EOF

warn "⚠️  IMPORTANTE: Edite o arquivo .env com suas credenciais reais!"

# Build da aplicação
log "Fazendo build da aplicação..."
npm run build

# Configurar PM2
log "Configurando PM2..."
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

# Configurar Nginx
log "Configurando Nginx..."
sudo tee /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Configuração para arquivos estáticos
    location /dist/ {
        alias $APP_DIR/dist/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Ativar site
sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração do Nginx
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Configurar firewall
log "Configurando firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Configurar SSL com Let's Encrypt (opcional)
read -p "Deseja configurar SSL com Let's Encrypt? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Configurando SSL..."
    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email seu-email@exemplo.com
fi

# Configurar backup automático
log "Configurando backup automático..."
sudo tee /etc/cron.daily/backup-$APP_NAME << EOF
#!/bin/bash
BACKUP_DIR="/home/$USER/backups"
mkdir -p \$BACKUP_DIR
cd $APP_DIR
tar -czf \$BACKUP_DIR/$APP_NAME-\$(date +%Y%m%d).tar.gz .
find \$BACKUP_DIR -name "$APP_NAME-*.tar.gz" -mtime +7 -delete
EOF

sudo chmod +x /etc/cron.daily/backup-$APP_NAME

# Criar script de atualização
cat > update.sh << EOF
#!/bin/bash
cd $APP_DIR
git pull origin main
npm install
npm run build
pm2 restart $APP_NAME
echo "Aplicação atualizada com sucesso!"
EOF

chmod +x update.sh

log "✅ Deploy concluído com sucesso!"
log "📝 Próximos passos:"
log "1. Edite o arquivo .env com suas credenciais reais"
log "2. Configure seu domínio para apontar para o IP da VPS"
log "3. Execute: pm2 restart $APP_NAME"
log "4. Acesse: http://$DOMAIN"
log ""
log "🔧 Comandos úteis:"
log "- Ver logs: pm2 logs $APP_NAME"
log "- Reiniciar: pm2 restart $APP_NAME"
log "- Status: pm2 status"
log "- Atualizar: ./update.sh"
log ""
log "📁 Diretório da aplicação: $APP_DIR" 