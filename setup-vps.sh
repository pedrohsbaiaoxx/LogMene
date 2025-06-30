#!/bin/bash

# Script de Configuração Rápida para VPS
# Execute este script na sua VPS para configurar o ambiente básico

set -e

echo "🔧 Configuração Rápida da VPS para LogMene..."

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] $1${NC}"
}

# Verificar se é Ubuntu
if ! grep -q "Ubuntu" /etc/os-release; then
    echo "❌ Este script é otimizado para Ubuntu. Use o script completo para outros sistemas."
    exit 1
fi

log "Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

log "Instalando dependências básicas..."
sudo apt install -y curl wget git htop nginx certbot python3-certbot-nginx

log "Instalando Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

log "Instalando PM2..."
sudo npm install -g pm2

log "Configurando firewall básico..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

log "Criando usuário para aplicação..."
read -p "Digite o nome do usuário para a aplicação (padrão: logmene): " APP_USER
APP_USER=${APP_USER:-logmene}

if ! id "$APP_USER" &>/dev/null; then
    sudo adduser --disabled-password --gecos "" $APP_USER
    sudo usermod -aG sudo $APP_USER
    log "Usuário $APP_USER criado com sucesso!"
else
    warn "Usuário $APP_USER já existe!"
fi

log "Configurando diretório da aplicação..."
APP_DIR="/home/$APP_USER/logmene"
sudo mkdir -p $APP_DIR
sudo chown $APP_USER:$APP_USER $APP_DIR

log "Configurando Nginx básico..."
sudo tee /etc/nginx/sites-available/logmene << EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/logmene /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

log "Configurando backup automático..."
sudo tee /etc/cron.daily/backup-logmene << EOF
#!/bin/bash
BACKUP_DIR="/home/$APP_USER/backups"
mkdir -p \$BACKUP_DIR
cd $APP_DIR
if [ -d ".git" ]; then
    tar -czf \$BACKUP_DIR/logmene-\$(date +%Y%m%d).tar.gz .
    find \$BACKUP_DIR -name "logmene-*.tar.gz" -mtime +7 -delete
fi
EOF

sudo chmod +x /etc/cron.daily/backup-logmene

log "Criando script de deploy..."
sudo tee $APP_DIR/deploy.sh << EOF
#!/bin/bash
cd $APP_DIR
if [ -d ".git" ]; then
    git pull origin main
    npm install
    npm run build
    pm2 restart logmene-backend || pm2 start ecosystem.config.cjs
    echo "Deploy concluído!"
else
    echo "Repositório git não encontrado. Clone o repositório primeiro."
fi
EOF

sudo chown $APP_USER:$APP_USER $APP_DIR/deploy.sh
sudo chmod +x $APP_DIR/deploy.sh

log "Configurando monitoramento básico..."
sudo tee /etc/cron.hourly/check-logmene << EOF
#!/bin/bash
if ! pm2 list | grep -q "logmene-backend"; then
    echo "\$(date): LogMene não está rodando. Tentando reiniciar..." >> /var/log/logmene-monitor.log
    cd $APP_DIR
    pm2 start ecosystem.config.cjs 2>/dev/null || echo "Falha ao reiniciar" >> /var/log/logmene-monitor.log
fi
EOF

sudo chmod +x /etc/cron.hourly/check-logmene

log "✅ Configuração básica concluída!"
echo ""
echo "📝 Próximos passos:"
echo "1. Clone o repositório: cd $APP_DIR && git clone https://github.com/seu-usuario/LogMene-2.git ."
echo "2. Configure as variáveis de ambiente: nano $APP_DIR/.env"
echo "3. Execute o deploy: cd $APP_DIR && ./deploy.sh"
echo "4. Configure seu domínio (se tiver): sudo certbot --nginx -d seu-dominio.com"
echo ""
echo "🔧 Comandos úteis:"
echo "- Ver status: pm2 status"
echo "- Ver logs: pm2 logs logmene-backend"
echo "- Reiniciar: pm2 restart logmene-backend"
echo "- Monitor: pm2 monit"
echo ""
echo "📁 Diretório da aplicação: $APP_DIR"
echo "👤 Usuário da aplicação: $APP_USER" 