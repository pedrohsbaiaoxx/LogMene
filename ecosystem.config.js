module.exports = {
  apps: [
    {
      name: "logmene-backend",
      script: "server/index.ts",
      interpreter: "node",
      interpreter_args: "--require ts-node/register",
      env: {
        NODE_ENV: "production",
      },
      watch: false,
      max_memory_restart: "1G",
    },
  ],
}; 