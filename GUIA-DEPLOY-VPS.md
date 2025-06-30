# 🚀 Guia Completo de Deploy LogMene para VPS

Este guia te ajudará a fazer o deploy do LogMene em uma VPS (Virtual Private Server) de forma completa e profissional.

## 📋 Pré-requisitos

### 1. VPS Configurada
- **Sistema Operacional**: Ubuntu 20.04 LTS ou superior
- **RAM**: Mínimo 2GB (recomendado 4GB+)
- **CPU**: 2 cores ou mais
- **Armazenamento**: 20GB+ de espaço livre
- **Acesso SSH** configurado

### 2. Domínio (Opcional mas Recomendado)
- Um domínio apontando para o IP da VPS
- Para SSL gratuito com Let's Encrypt

### 3. Serviços Externos
- **Banco de Dados**: PostgreSQL (Neon, Supabase, ou próprio)
- **Email**: MailerSend ou similar
- **SMS**: Twilio ou similar

## 🔧 Passo a Passo do Deploy

### Passo 1: Conectar na VPS

```bash
ssh usuario@ip-da-sua-vps
```

### Passo 2: Preparar o Ambiente

Execute o script de deploy automatizado:

```bash
# Baixar o script
wget https://raw.githubusercontent.com/seu-usuario/LogMene-2/main/deploy-vps.sh

# Dar permissão de execução
chmod +x deploy-vps.sh

# Executar o script
./deploy-vps.sh
```

**OU** execute manualmente os comandos do script.

### Passo 3: Configurar Variáveis de Ambiente

Edite o arquivo `.env` criado:

```bash
nano /home/usuario/logmene/.env
```

Configure as seguintes variáveis:

```env
NODE_ENV=production
DATABASE_URL=postgresql://usuario:senha@host:porta/banco
JWT_SECRET=sua_chave_secreta_muito_longa_e_aleatoria
MAILERSEND_API_KEY=sua_api_key_do_mailersend
TWILIO_ACCOUNT_SID=seu_account_sid_do_twilio
TWILIO_AUTH_TOKEN=seu_auth_token_do_twilio
TWILIO_PHONE_NUMBER=+5511999999999
```

### Passo 4: Configurar Banco de Dados

Execute as migrações:

```bash
cd /home/usuario/logmene
npm run db:push
```

### Passo 5: Configurar Domínio

1. **No seu provedor de DNS**, configure:
   ```
   A    @     IP_DA_VPS
   A    www   IP_DA_VPS
   ```

2. **Aguarde a propagação** (pode levar até 24h)

### Passo 6: Configurar SSL (Opcional)

```bash
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

## 🛠️ Comandos de Manutenção

### Verificar Status da Aplicação
```bash
pm2 status
pm2 logs logmene-backend
```

### Reiniciar Aplicação
```bash
pm2 restart logmene-backend
```

### Atualizar Aplicação
```bash
cd /home/usuario/logmene
./update.sh
```

### Verificar Logs do Nginx
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Backup Manual
```bash
cd /home/usuario/logmene
tar -czf backup-$(date +%Y%m%d).tar.gz .
```

## 🔒 Configurações de Segurança

### 1. Firewall
O script já configura o UFW, mas você pode verificar:

```bash
sudo ufw status
```

### 2. SSH Seguro
```bash
sudo nano /etc/ssh/sshd_config
```

Configure:
- `Port 2222` (mude a porta padrão)
- `PermitRootLogin no`
- `PasswordAuthentication no` (use chaves SSH)

### 3. Fail2ban (Opcional)
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## 📊 Monitoramento

### 1. PM2 Monitor
```bash
pm2 monit
```

### 2. Logs em Tempo Real
```bash
pm2 logs logmene-backend --lines 100
```

### 3. Status do Sistema
```bash
htop
df -h
free -h
```

## 🚨 Solução de Problemas

### Problema: Aplicação não inicia
```bash
# Verificar logs
pm2 logs logmene-backend

# Verificar se o arquivo existe
ls -la dist/index.js

# Verificar variáveis de ambiente
pm2 env logmene-backend
```

### Problema: Erro de conexão com banco
```bash
# Testar conexão
psql "sua_database_url"

# Verificar se a URL está correta
cat .env | grep DATABASE_URL
```

### Problema: Nginx não funciona
```bash
# Testar configuração
sudo nginx -t

# Verificar status
sudo systemctl status nginx

# Verificar logs
sudo tail -f /var/log/nginx/error.log
```

### Problema: SSL não funciona
```bash
# Verificar certificado
sudo certbot certificates

# Renovar certificado
sudo certbot renew --dry-run
```

## 📈 Otimizações de Performance

### 1. Nginx
Adicione ao arquivo de configuração:

```nginx
# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

# Cache para arquivos estáticos
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 2. Node.js
Configure no `ecosystem-vps.config.cjs`:

```javascript
node_args: '--max-old-space-size=2048 --optimize-for-size'
```

### 3. Banco de Dados
- Configure connection pooling
- Otimize queries
- Configure índices adequados

## 🔄 CI/CD (Opcional)

### GitHub Actions
Crie `.github/workflows/deploy.yml`:

```yaml
name: Deploy to VPS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.KEY }}
          script: |
            cd /home/usuario/logmene
            git pull origin main
            npm install
            npm run build
            pm2 restart logmene-backend
```

## 📞 Suporte

Se encontrar problemas:

1. **Verifique os logs**: `pm2 logs logmene-backend`
2. **Teste a conexão**: `curl http://localhost:3000`
3. **Verifique o status**: `pm2 status`
4. **Consulte a documentação**: README-DEPLOY.md

## 🎯 Checklist Final

- [ ] VPS configurada e acessível
- [ ] Script de deploy executado
- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados conectado e migrado
- [ ] Domínio configurado (se aplicável)
- [ ] SSL configurado (se aplicável)
- [ ] Aplicação rodando: `pm2 status`
- [ ] Nginx funcionando: `sudo systemctl status nginx`
- [ ] Acesso via navegador funcionando
- [ ] Backup automático configurado
- [ ] Monitoramento configurado

## 🚀 Próximos Passos

1. **Teste todas as funcionalidades** da aplicação
2. **Configure monitoramento** (New Relic, DataDog, etc.)
3. **Configure alertas** para downtime
4. **Documente** as configurações específicas
5. **Treine** a equipe nos comandos de manutenção

---

**🎉 Parabéns! Seu LogMene está rodando em produção!** 