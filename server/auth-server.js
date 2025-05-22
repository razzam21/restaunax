// This is a standalone authentication server to debug login issues
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

// Create Express app
const app = express();
const prisma = new PrismaClient();

// Write to local log file for debugging
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage);
  
  fs.appendFileSync('./auth-server.log', logMessage);
}

// Configuration
const PORT = 8082; // Use a different port to avoid conflicts
const JWT_SECRET = 'access-secret-dev-only';
const REFRESH_SECRET = 'refresh-secret-dev-only';

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Basic routes
app.get('/', (req, res) => {
  log('GET / - Root endpoint accessed');
  res.json({ message: 'Authentication server is running' });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    log(`Login attempt: ${JSON.stringify(req.body)}`);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
      log('Login failed: Missing username or password');
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
    }
    
    // Find user
    log(`Looking up user: ${username}`);
    const user = await prisma.user.findUnique({
      where: { username }
    });
    
    if (!user) {
      log(`User not found: ${username}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }
    
    log(`User found: ${user.username}, role: ${user.role}`);
    
    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      log(`Invalid password for user: ${username}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }
    
    log(`User authenticated: ${user.username}, role: ${user.role}`);
    
    // Generate tokens
    const accessToken = jwt.sign(
      { 
        sub: user.id,
        username: user.username,
        role: user.role,
        restaurantId: user.restaurantId
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { sub: user.id },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false, // Set to true in production
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });
    
    // Return access token and user data (without password)
    const { password: _, ...userWithoutPassword } = user;
    
    log('Login successful, sending response');
    res.json({
      success: true,
      accessToken,
      user: userWithoutPassword,
    });
  } catch (error) {
    log(`Login error: ${error.message}\n${error.stack}`);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Start server
(async () => {
  try {
    log('Starting authentication server...');
    log('Connecting to database...');
    
    await prisma.$connect();
    log('Database connected successfully');
    
    // Check if we can access users
    const userCount = await prisma.user.count();
    log(`Found ${userCount} users in database`);
    
    app.listen(PORT, '0.0.0.0', () => {
      log(`Authentication server running on port ${PORT}`);
      log(`CORS configured for origin: http://localhost:3000`);
      log(`Test with: curl -X POST -H "Content-Type: application/json" -d '{"username":"owner","password":"Test1234"}' http://localhost:${PORT}/api/auth/login`);
    });
  } catch (error) {
    log(`Server startup error: ${error.message}\n${error.stack}`);
  }
})();