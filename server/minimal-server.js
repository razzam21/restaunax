const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

// Create Express app
const app = express();
const prisma = new PrismaClient();

// Configuration
const PORT = 8081;
const JWT_SECRET = 'access-secret-dev-only';
const REFRESH_SECRET = 'refresh-secret-dev-only';

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Basic routes
app.get('/', (req, res) => {
  res.json({ message: 'Minimal API server is running' });
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
    res.json({
      success: true,
      accessToken,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Start server
(async () => {
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Database connected successfully');
    
    app.listen(PORT, () => {
      console.log(`Minimal server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
  }
})();