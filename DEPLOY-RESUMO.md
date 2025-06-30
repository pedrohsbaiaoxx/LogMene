# 🚀 Deploy LogMene para VPS - Resumo Rápido

## 📁 Arquivos Criados

- `deploy-vps.sh` - Script completo de deploy
- `setup-vps.sh` - Script de configuração rápida
- `ecosystem-vps.config.cjs` - Configuração PM2 otimizada
- `env.example` - Exemplo de variáveis de ambiente
- `GUIA-DEPLOY-VPS.md` - Guia completo detalhado

## ⚡ Deploy Rápido (3 passos)

### 1. Na sua VPS (Ubuntu)
```bash
# Baixar e executar configuração rápida
wget https://raw.githubusercontent.com/seu-usuario/LogMene-2/main/setup-vps.sh
chmod +x setup-vps.sh
./setup-vps.sh
```

### 2. Clonar e Configurar
```bash
cd /home/logmene/logmene
git clone https://github.com/seu-usuario/LogMene-2.git .
cp env.example .env
nano .env  # Configure suas credenciais
```

### 3. Deploy
```bash
./deploy.sh
```

## 🔧 Configurações Essenciais

### Variáveis de Ambiente (.env)
```env
NODE_ENV=production
DATABASE_URL=postgresql://usuario:senha@host:porta/banco
JWT_SECRET=sua_chave_secreta_muito_longa
MAILERSEND_API_KEY=sua_api_key
TWILIO_ACCOUNT_SID=seu_sid
TWILIO_AUTH_TOKEN=seu_token
TWILIO_PHONE_NUMBER=+5511999999999
```

### Comandos Úteis
```bash
# Status da aplicação
pm2 status
pm2 logs logmene-backend

# Reiniciar
pm2 restart logmene-backend

# Atualizar
cd /home/logmene/logmene && ./deploy.sh

# Monitor
pm2 monit
```

## 🌐 Configurar Domínio

1. **DNS**: Aponte seu domínio para o IP da VPS
2. **SSL**: `sudo certbot --nginx -d seu-dominio.com`

## 📊 Monitoramento

- **PM2**: `pm2 monit`
- **Logs**: `pm2 logs logmene-backend`
- **Sistema**: `htop`, `df -h`

## 🚨 Troubleshooting

### Aplicação não inicia
```bash
pm2 logs logmene-backend
ls -la dist/index.js
cat .env
```

### Nginx não funciona
```bash
sudo nginx -t
sudo systemctl status nginx
```

### Banco não conecta
```bash
psql "sua_database_url"
```

## 📞 Suporte

1. Verifique os logs: `pm2 logs logmene-backend`
2. Teste localmente: `curl http://localhost:3000`
3. Consulte o guia completo: `GUIA-DEPLOY-VPS.md`

---

**🎯 Checklist Final:**
- [ ] VPS configurada
- [ ] Repositório clonado
- [ ] Variáveis configuradas
- [ ] Banco conectado
- [ ] Aplicação rodando
- [ ] Domínio configurado (opcional)
- [ ] SSL configurado (opcional)

**🚀 Pronto! Seu LogMene está no ar!** 