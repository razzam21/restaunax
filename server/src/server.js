const app = require('./app');
const config = require('./config');
const prisma = require('./db/client');
const { initializeWebSocketServer } = require('./services/websocket-service');
// const jobQueue = require('./services/job-queue');

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
  .then(async () => {
    console.log('Database connection successful');
    
    // Start server first
    const server = app.listen(PORT, () => {
      console.log(`Server running in ${config.env} mode on port ${PORT}`);
    });
    
    // Initialize WebSocket server first (non-blocking)
    initializeWebSocketServer(server);
    console.log('WebSocket server initialized on /ws/dashboard');
    
    // Initialize job queue for AI processing (non-blocking)
    setTimeout(async () => {
      try {
        console.log('Attempting to initialize job queue...');
        const jobQueue = require('./services/job-queue');
        await jobQueue.initialize();
        console.log('Job queue service initialized');
      } catch (error) {
        console.warn('Job queue initialization failed:', error.message);
        console.warn('AI features will continue without job queue');
      }
    }, 1000);
    
    server.on('error', (error) => {
      console.error('Server error:', error);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Shutting down gracefully');
      
      // Close server
      server.close(async () => {
        console.log('Server closed');
        
        // Cleanup job queue
        try {
          await jobQueue.cleanup();
          console.log('Job queue cleaned up');
        } catch (error) {
          console.warn('Job queue cleanup failed:', error.message);
        }
        
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