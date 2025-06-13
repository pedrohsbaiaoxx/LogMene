module.exports = {
  apps: [{
    name: 'logmene-backend',
    script: 'server/index.ts',
    interpreter: '/usr/bin/node',
    interpreter_args: '--require tsx/register',
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