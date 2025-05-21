const app = require('./app');
const config = require('./config');
const prisma = require('./db/client');

const PORT = config.port;

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
  // Close server & exit process
  process.exit(1);
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running in ${config.env} mode on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully');
  
  // Close server
  server.close(async () => {
    console.log('Process terminated');
    
    // Disconnect Prisma client
    await prisma.$disconnect();
  });
});

module.exports = server;