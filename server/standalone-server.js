// This is a completely standalone server that doesn't rely on any existing code
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

// Initialize Express app and database client
const app = express();
const prisma = new PrismaClient();

// Configuration
const PORT = 8081;
const JWT_ACCESS_SECRET = 'access-secret-dev-only';
const JWT_REFRESH_SECRET = 'refresh-secret-dev-only';

// Middleware
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Standalone server is running' });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { username }
    });
    
    if (!user) {
      console.log(`User not found: ${username}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }
    
    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log(`Invalid password for user: ${username}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }
    
    console.log(`User authenticated: ${user.username}, role: ${user.role}`);
    
    // Generate access token
    const accessToken = jwt.sign(
      { 
        sub: user.id,
        username: user.username,
        role: user.role,
        restaurantId: user.restaurantId 
      },
      JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
    
    // Generate refresh token
    const refreshToken = jwt.sign(
      { sub: user.id, type: 'refresh' },
      JWT_REFRESH_SECRET,
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
    
    // Return access token and user data
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      success: true,
      accessToken,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred. Please try again later.'
    });
  }
});

// Refresh token endpoint
app.post('/api/auth/refresh-token', async (req, res) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token is required',
        errorCode: 'REFRESH_TOKEN_MISSING'
      });
    }
    
    // Find refresh token in database
    const tokenRecord = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });
    
    // Check if token exists and is valid
    if (!tokenRecord) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: tokenRecord.userId },
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Generate new access token
    const accessToken = jwt.sign(
      { 
        sub: user.id,
        username: user.username,
        role: user.role,
        restaurantId: user.restaurantId 
      },
      JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
    
    res.json({
      success: true,
      accessToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred. Please try again later.'
    });
  }
});

// Logout endpoint
app.post('/api/auth/logout', async (req, res) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    
    // Revoke refresh token if it exists
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: {
          revoked: true,
          revokedAt: new Date(),
        },
      });
    }
    
    // Clear refresh token cookie
    res.clearCookie('refreshToken');
    
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred. Please try again later.'
    });
  }
});

// Not found handler
app.use((req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'An unexpected error occurred'
  });
});

// Start server
(async () => {
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Database connected successfully');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Standalone server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
})();