module.exports = {
  apps: [{
    name: 'logmene-backend',
    script: 'dist/index.js',
    cwd: '/home/ubuntu/logmene', // Altere para o caminho correto
    instances: 'max', // Usar todas as CPUs disponíveis
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    watch: false,
    max_memory_restart: '1G',
    exp_backoff_restart_delay: 100,
    max_restarts: 10,
    min_uptime: '10s',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // Configurações de monitoramento
    pmx: true,
    // Configurações de segurança
    uid: 'ubuntu', // Altere para o usuário correto
    gid: 'ubuntu', // Altere para o grupo correto
    // Configurações de performance
    node_args: '--max-old-space-size=1024',
    // Configurações de reinicialização
    autorestart: true,
    restart_delay: 4000,
    // Configurações de logs
    log_type: 'json'
  }]
} 