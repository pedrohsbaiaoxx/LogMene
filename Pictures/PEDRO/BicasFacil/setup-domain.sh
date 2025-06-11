#!/bin/bash

# Atualiza os pacotes
sudo apt update
sudo apt upgrade -y

# Instala o Nginx
sudo apt install nginx -y

# Copia a configuração do Nginx
sudo cp nginx.conf /etc/nginx/sites-available/bicasfacil.com.br
sudo ln -s /etc/nginx/sites-available/bicasfacil.com.br /etc/nginx/sites-enabled/

# Remove a configuração padrão
sudo rm /etc/nginx/sites-enabled/default

# Testa a configuração do Nginx
sudo nginx -t

# Reinicia o Nginx
sudo systemctl restart nginx

# Configura o firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable

echo "Configuração concluída! O site deve estar acessível em bicasfacil.com.br" 