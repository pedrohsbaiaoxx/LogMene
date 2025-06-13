module.exports = {
  apps: [{
    name: 'logmene-backend',
    script: 'server/index.ts',
    interpreter: '/usr/local/bin/node',
    interpreter_args: '--require /usr/local/lib/node_modules/ts-node/register',
    env: {
      NODE_ENV: 'production',
      TS_NODE_PROJECT: './tsconfig.json'
    },
    watch: false,
    max_memory_restart: '1G',
    exp_backoff_restart_delay: 100,
    max_restarts: 10
  }]
} 