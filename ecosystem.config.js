module.exports = {
  apps: [
    {
      name: "gmvmax-web",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      env: {
        PORT: 3000,
        NODE_ENV: "production"
      }
    },
    {
      name: "gmvmax-cron",
      script: "npx",
      args: "tsx src/cron-worker.ts",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
