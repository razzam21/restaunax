const app = require('./app');
const config = require('./config');
const prisma = require('./db/client');

const PORT = config.port;

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

console.log('Starting server.js...');

// Connect to database and start server
prisma.$connect()
  .then(() => {
    console.log('Database connection successful');
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`Server running in ${config.env} mode on port ${PORT}`);
    });
    
    server.on('error', (error) => {
      console.error('Server error:', error);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Shutting down gracefully');
      
      // Close server
      server.close(async () => {
        console.log('Server closed');
        
        // Disconnect Prisma client
        await prisma.$disconnect();
        console.log('Database disconnected');
      });
    });
  })
  .catch(error => {
    console.error('Database connection error:', error);
  });

module.exports = app;