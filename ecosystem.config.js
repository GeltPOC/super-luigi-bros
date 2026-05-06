module.exports = {
  apps: [
    {
      name: 'super-luigi-bros',
      script: 'npx',
      args: 'serve . -p 3000',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
