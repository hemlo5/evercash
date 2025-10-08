// Emerald Budget Secure Server - Production-Grade
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

// Import security configuration
const {
  config: securityConfig,
  generateTokens,
  verifyToken,
  hashPassword,
  verifyPassword,
  generateNonce,
  getCSPConfig,
  generateSessionToken,
  httpsRedirect
} = require('./security-config');

const app = express();
const PORT = process.env.PORT || 5006;

// HTTPS redirect for production
app.use(httpsRedirect);

// Generate nonce for each request
app.use((req, res, next) => {
  res.locals.nonce = generateNonce();
  next();
});

// Security middleware with CSP nonces
app.use(helmet({
  contentSecurityPolicy: {
    directives: getCSPConfig(generateNonce())
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Body size limit to prevent large payload attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Cookie parser for CSRF
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: securityConfig.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: securityConfig.session,
  name: 'emerald.sid'
}));

// Rate limiting - different limits for auth vs general endpoints
const authLimiter = rateLimit(securityConfig.rateLimit.auth);
const generalLimiter = rateLimit(securityConfig.rateLimit.general);

// Apply general limiter to all routes
app.use(generalLimiter);

// CORS configuration with origin validation
app.use(cors(securityConfig.cors));

// CSRF protection - apply after session
const csrfProtection = csrf({ cookie: true });

// Data storage directory
const DATA_DIR = path.join(__dirname, 'budget-data');

// Initialize data directory
async function initDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Load data file
async function loadData() {
  const dataFile = path.join(DATA_DIR, 'budget.json');
  try {
    const data = await fs.readFile(dataFile, 'utf8');
    return JSON.parse(data);
  } catch {
    // Create default data
    const defaultData = {
      accounts: [],
      transactions: [],
      categories: [],
      categoryGroups: [],
      payees: [],
      budgets: {},
      user: {
        id: crypto.randomUUID(),
        email: 'user@emerald-budget.com',
        createdAt: new Date().toISOString(),
        passwordHash: null
      },
      sessions: [],
      failedAttempts: 0
    };
    await saveData(defaultData);
    return defaultData;
  }
}

// Save data file
async function saveData(data) {
  const dataFile = path.join(DATA_DIR, 'budget.json');
  // Don't save sensitive tokens or passwords in plain text
  const safeData = { ...data };
  delete safeData.user?.password;
  await fs.writeFile(dataFile, JSON.stringify(safeData, null, 2));
}

// Global data object
let budgetData = {};

// Initialize
initDataDir().then(async () => {
  budgetData = await loadData();
  console.log('✅ Secure server initialized');
});

// Middleware to verify JWT tokens
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.message === 'Token expired') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Server status
app.get('/', (req, res) => {
  res.json({ 
    version: '2.0.0',
    status: 'running',
    name: 'Emerald Budget Secure Server',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Get CSRF token
app.get('/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Check if needs bootstrap
app.get('/account/needs-bootstrap', (req, res) => {
  const hasPassword = budgetData.user?.passwordHash;
  res.json({
    bootstrapped: !!hasPassword,
    needsBootstrap: !hasPassword
  });
});

// Login with JWT and enhanced security
app.post('/account/login', authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    
    // Input validation
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters' 
      });
    }
    
    // Check for account lockout
    if (budgetData.failedAttempts >= 5) {
      const lastAttempt = new Date(budgetData.lastFailedAttempt);
      const lockoutTime = 15 * 60 * 1000; // 15 minutes
      const timePassed = Date.now() - lastAttempt.getTime();
      
      if (timePassed < lockoutTime) {
        const remainingTime = Math.ceil((lockoutTime - timePassed) / 60000);
        return res.status(429).json({
          error: `Account locked. Try again in ${remainingTime} minutes.`
        });
      }
      
      // Reset failed attempts after lockout period
      budgetData.failedAttempts = 0;
    }
    
    // First time setup
    if (!budgetData.user.passwordHash) {
      // Hash the password with enhanced bcrypt rounds
      const hashedPassword = await hashPassword(password);
      budgetData.user.passwordHash = hashedPassword;
      
      // Generate JWT tokens
      const { accessToken, refreshToken } = generateTokens(
        budgetData.user.id,
        budgetData.user.email
      );
      
      // Store refresh token hash
      budgetData.sessions = budgetData.sessions || [];
      budgetData.sessions.push({
        refreshToken: crypto.createHash('sha256').update(refreshToken).digest('hex'),
        createdAt: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });
      
      await saveData(budgetData);
      
      // Set secure httpOnly cookie for refresh token
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      return res.json({
        status: 'ok',
        data: {
          accessToken,
          expiresIn: 3600,
          tokenType: 'Bearer',
          user: {
            id: budgetData.user.id,
            email: budgetData.user.email
          },
          message: '🔐 Secure account created successfully'
        }
      });
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, budgetData.user.passwordHash);
    
    if (!isValidPassword) {
      // Log failed attempt
      budgetData.failedAttempts = (budgetData.failedAttempts || 0) + 1;
      budgetData.lastFailedAttempt = new Date().toISOString();
      
      await saveData(budgetData);
      
      return res.status(401).json({ 
        error: 'Invalid password',
        remainingAttempts: Math.max(0, 5 - budgetData.failedAttempts)
      });
    }
    
    // Reset failed attempts on successful login
    budgetData.failedAttempts = 0;
    
    // Generate new JWT tokens
    const { accessToken, refreshToken } = generateTokens(
      budgetData.user.id,
      budgetData.user.email
    );
    
    // Store refresh token hash
    budgetData.sessions = budgetData.sessions || [];
    budgetData.sessions.push({
      refreshToken: crypto.createHash('sha256').update(refreshToken).digest('hex'),
      createdAt: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });
    
    // Clean old sessions (keep last 5)
    if (budgetData.sessions.length > 5) {
      budgetData.sessions = budgetData.sessions.slice(-5);
    }
    
    await saveData(budgetData);
    
    // Set secure httpOnly cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    return res.json({
      status: 'ok',
      data: {
        accessToken,
        expiresIn: 3600,
        tokenType: 'Bearer',
        user: {
          id: budgetData.user.id,
          email: budgetData.user.email
        },
        message: '🔐 Secure login successful'
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Token refresh endpoint
app.post('/account/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }
    
    // Verify refresh token
    const decoded = verifyToken(refreshToken, true);
    
    // Check if token exists in sessions
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const sessionExists = budgetData.sessions?.some(s => s.refreshToken === hashedToken);
    
    if (!sessionExists) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    // Generate new tokens
    const tokens = generateTokens(decoded.userId, decoded.email);
    
    // Update session
    const sessionIndex = budgetData.sessions.findIndex(s => s.refreshToken === hashedToken);
    if (sessionIndex !== -1) {
      budgetData.sessions[sessionIndex] = {
        refreshToken: crypto.createHash('sha256').update(tokens.refreshToken).digest('hex'),
        createdAt: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ip: req.ip
      };
    }
    
    await saveData(budgetData);
    
    // Set new refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({
      status: 'ok',
      data: {
        accessToken: tokens.accessToken,
        expiresIn: 3600,
        tokenType: 'Bearer'
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout endpoint
app.post('/account/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (refreshToken) {
      // Remove session
      const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
      budgetData.sessions = budgetData.sessions?.filter(s => s.refreshToken !== hashedToken) || [];
      await saveData(budgetData);
    }
    
    res.clearCookie('refreshToken');
    res.json({ status: 'ok', message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Protected sync endpoint with CSRF
app.post('/sync/sync', authenticateToken, csrfProtection, async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages must be an array' });
    }
    
    // Process sync messages
    for (const message of messages) {
      const { dataset, row, column } = message;
      
      // Basic validation
      if (!dataset || !row) continue;
      
      // Handle different datasets
      switch (dataset) {
        case 'accounts':
          // Update accounts
          const accountIndex = budgetData.accounts.findIndex(a => a.id === row.id);
          if (accountIndex >= 0) {
            budgetData.accounts[accountIndex] = { ...budgetData.accounts[accountIndex], ...row };
          } else {
            budgetData.accounts.push(row);
          }
          break;
          
        case 'transactions':
          // Update transactions
          const txIndex = budgetData.transactions.findIndex(t => t.id === row.id);
          if (txIndex >= 0) {
            budgetData.transactions[txIndex] = { ...budgetData.transactions[txIndex], ...row };
          } else {
            budgetData.transactions.push(row);
          }
          break;
          
        case 'categories':
          // Update categories
          const catIndex = budgetData.categories.findIndex(c => c.id === row.id);
          if (catIndex >= 0) {
            budgetData.categories[catIndex] = { ...budgetData.categories[catIndex], ...row };
          } else {
            budgetData.categories.push(row);
          }
          break;
      }
    }
    
    await saveData(budgetData);
    res.json({ status: 'ok', data: { messages } });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Get budget data (protected)
app.get('/budget/:month', authenticateToken, async (req, res) => {
  try {
    const { month } = req.params;
    
    // Return budget data for the month
    const monthBudget = budgetData.budgets?.[month] || {
      month,
      totalIncome: 0,
      totalBudgeted: 0,
      totalSpent: 0,
      toBudget: 0,
      categoryGroups: budgetData.categoryGroups || []
    };
    
    res.json(monthBudget);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get budget' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).json({ error: 'Invalid CSRF token' });
  } else {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🔒 Secure Emerald Budget Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🛡️ Security: CSP enabled, JWT auth, CSRF protection, Rate limiting active`);
});
