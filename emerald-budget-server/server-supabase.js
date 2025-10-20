// Emerald Budget Server with Supabase Integration
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const multer = require('multer');
require('dotenv').config();

// Import Supabase configuration
const { SupabaseDB, initializeDatabase } = require('./supabase-config');
const db = new SupabaseDB();

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
// Allow forcing a specific user ID for local development to bind requests to an existing Supabase user
const FORCE_USER_ID = process.env.DEV_STATIC_USER_ID || process.env.FORCE_USER_ID;

app.set('trust proxy', true);
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
app.head('/health', (req, res) => {
  res.status(200).end();
});

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Current authenticated user (in production, use proper session management)
let currentUser = null;

// HTTPS redirect for production
app.use(httpsRedirect);

// Generate nonce for each request
app.use((req, res, next) => {
  res.locals.nonce = generateNonce();
  next();
});

// Security middleware with CSP nonces
app.use((req, res, next) => {
  helmet({
    contentSecurityPolicy: {
      directives: getCSPConfig(res.locals.nonce),
      reportOnly: false,
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })(req, res, next);
});

// Rate limiting - different limits for auth vs general endpoints
const authLimiter = rateLimit(securityConfig.rateLimit.auth);
const generalLimiter = rateLimit(securityConfig.rateLimit.general);

// Apply general limiter to all routes
app.use(generalLimiter);

// CORS configuration with origin validation
app.use(cors(securityConfig.cors));

app.use(express.json());

// Initialize database on startup
async function initializeServer() {
  console.log('🔄 Initializing Supabase connection...');
  const dbReady = await initializeDatabase();
  if (!dbReady) {
    console.log('⚠️ Database schema needs to be created. Please run the SQL in Supabase dashboard.');
  }
  return dbReady;
}

// Token validation middleware
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('🔍 Auth check - Authorization header:', authHeader ? `${authHeader.substring(0, 30)}...` : 'null');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ Auth failed - No Bearer token found');
    return res.status(401).json({
      status: 'error',
      reason: 'unauthorized',
      details: 'token-not-found'
    });
  }
  
  const token = authHeader.substring(7);

  // If a static user id is configured, always use it (development convenience)
  if (FORCE_USER_ID) {
    req.user = { id: FORCE_USER_ID, token };
    console.log('🔐 Using DEV_STATIC_USER_ID for all requests:', FORCE_USER_ID);
    return next();
  }
  
  // For demo purposes, accept any token that starts with 'demo-token-'
  if (token.startsWith('demo-token-')) {
    // Create unique user ID based on token to separate users
    const crypto = require('crypto');
    const uniqueUserId = crypto.createHash('sha256').update(token).digest('hex').substring(0, 32);
    const formattedUserId = `${uniqueUserId.substring(0, 8)}-${uniqueUserId.substring(8, 12)}-${uniqueUserId.substring(12, 16)}-${uniqueUserId.substring(16, 20)}-${uniqueUserId.substring(20, 32)}`;
    // Ensure the user exists in Supabase so FK constraints don't fail
    try {
      await db.ensureUserExists(formattedUserId);
    } catch (e) {
      console.error('❌ Failed ensuring user exists:', e);
      return res.status(500).json({ status: 'error', message: 'Failed to ensure user exists' });
    }
    req.user = { id: formattedUserId, token };
    console.log('✅ Auth success - Demo token accepted, user ID:', formattedUserId);
    return next();
  }
  
  // Also accept any token for development
  if (token && token.length > 5) {
    // Create unique user ID based on token to separate users
    const crypto = require('crypto');
    const uniqueUserId = crypto.createHash('sha256').update(token).digest('hex').substring(0, 32);
    const formattedUserId = `${uniqueUserId.substring(0, 8)}-${uniqueUserId.substring(8, 12)}-${uniqueUserId.substring(12, 16)}-${uniqueUserId.substring(16, 20)}-${uniqueUserId.substring(20, 32)}`;
    try {
      await db.ensureUserExists(formattedUserId);
    } catch (e) {
      console.error('❌ Failed ensuring user exists:', e);
      return res.status(500).json({ status: 'error', message: 'Failed to ensure user exists' });
    }
    req.user = { id: formattedUserId, token };
    console.log('✅ Auth success - Dev token accepted, user ID:', formattedUserId);
    return next();
  }
  
  return res.status(401).json({
    status: 'error',
    message: 'Invalid token'
  });
};

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Emerald Budget Server with Supabase',
    version: '2.0.0',
    database: 'Supabase',
    timestamp: new Date().toISOString()
  });
});

// Authentication endpoints
app.post('/account/login', authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        status: 'error',
        message: 'Password is required'
      });
    }

    // For demo purposes, we'll use a simple email
    const email = 'user@emeraldbudget.com';
    
    // Check if user exists
    let user = await db.getUserByEmail(email);
    
    if (!user) {
      // First time setup - create user
      console.log('🔐 First time setup - creating user...');
      const hashedPassword = await bcrypt.hash(password, 12);
      user = await db.createUser(email, hashedPassword);
      
      // Create default categories
      await createDefaultCategories(user.id);
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (isValidPassword) {
      const token = crypto.randomBytes(32).toString('hex');
      await db.updateUserToken(user.id, token);
      
      // Store current user
      currentUser = { ...user, token };
      
      console.log('✅ User authenticated successfully');
      res.json({
        status: 'ok',
        data: { 
          token: token,
          message: '🔐 Login successful' 
        }
      });
    } else {
      console.log('❌ Invalid password');
      res.status(401).json({
        status: 'error',
        message: 'Invalid password'
      });
    }
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred during login'
    });
  }
});

// Create default categories for new users
async function createDefaultCategories(userId) {
  const defaultCategories = [
    { name: 'Food & Dining', cat_group: 'Everyday Expenses', is_income: false, sort_order: 1 },
    { name: 'Transportation', cat_group: 'Everyday Expenses', is_income: false, sort_order: 2 },
    { name: 'Shopping', cat_group: 'Everyday Expenses', is_income: false, sort_order: 3 },
    { name: 'Entertainment', cat_group: 'Everyday Expenses', is_income: false, sort_order: 4 },
    { name: 'Bills & Utilities', cat_group: 'Monthly Bills', is_income: false, sort_order: 5 },
    { name: 'Rent/Mortgage', cat_group: 'Monthly Bills', is_income: false, sort_order: 6 },
    { name: 'Insurance', cat_group: 'Monthly Bills', is_income: false, sort_order: 7 },
    { name: 'Salary', cat_group: 'Income', is_income: true, sort_order: 8 },
    { name: 'Freelance', cat_group: 'Income', is_income: true, sort_order: 9 },
  ];

  for (const category of defaultCategories) {
    try {
      await db.createCategory(userId, category);
    } catch (error) {
      console.warn('Failed to create default category:', category.name, error.message);
    }
  }
}

// Accounts endpoints
app.get('/accounts', authenticateUser, async (req, res) => {
  try {
    const accounts = await db.getAccounts(req.user.id);
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    // Return empty array instead of error for now
    res.json([]);
  }
});

app.post('/accounts', authenticateUser, async (req, res) => {
  try {
    const account = await db.createAccount(req.user.id, req.body);
    res.json({ status: 'ok', data: account });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create account' });
  }
});

app.put('/accounts/:id', authenticateUser, async (req, res) => {
  try {
    const account = await db.updateAccount(req.params.id, req.body);
    res.json({ status: 'ok', data: account });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update account' });
  }
});

// Transactions endpoints
app.get('/transactions', authenticateUser, async (req, res) => {
  try {
    const { account } = req.query;
    const transactions = await db.getTransactions(req.user.id, account);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    // Return empty array instead of error for now
    res.json([]);
  }
});

app.post('/transactions', authenticateUser, async (req, res) => {
  try {
    const transaction = await db.createTransaction(req.user.id, req.body);
    res.json({ status: 'ok', data: transaction });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create transaction' });
  }
});

app.put('/transactions/:id', authenticateUser, async (req, res) => {
  try {
    const transaction = await db.updateTransaction(req.params.id, req.body);
    res.json({ status: 'ok', data: transaction });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update transaction' });
  }
});

// Bulk delete MUST come before parameterized route
app.delete('/transactions/bulk-delete', authenticateUser, async (req, res) => {
  try {
    console.log('🗑️ Bulk delete request received');
    console.log('🗑️ Headers:', req.headers.authorization ? 'Authorization header present' : 'No auth header');
    console.log('🗑️ User ID:', req.user?.id);
    console.log('🗑️ Request method:', req.method);
    console.log('🗑️ Request URL:', req.url);
    
    if (!req.user?.id) {
      console.error('❌ No user ID found in request');
      return res.status(401).json({ status: 'error', message: 'User not authenticated' });
    }
    
    const deletedCount = await db.deleteAllTransactions(req.user.id);
    console.log('✅ Successfully deleted', deletedCount, 'transactions');
    res.json({ status: 'ok', message: `${deletedCount} transactions deleted successfully` });
  } catch (error) {
    console.error('❌ Error bulk deleting transactions:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ status: 'error', message: 'Failed to delete all transactions' });
  }
});

app.delete('/transactions/:id', authenticateUser, async (req, res) => {
  try {
    await db.deleteTransaction(req.params.id);
    res.json({ status: 'ok', message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete transaction' });
  }
});

// Budget endpoints
app.post('/budgets/set-amount', authenticateUser, async (req, res) => {
  try {
    const { categoryId, month, amount } = req.body;
    const budget = await db.setBudgetAmount(req.user.id, categoryId, month, amount);
    res.json({ status: 'ok', data: budget });
  } catch (error) {
    console.error('Error setting budget amount:', error);
    res.status(500).json({ status: 'error', message: 'Failed to set budget amount' });
  }
});

app.get('/budgets/:month', authenticateUser, async (req, res) => {
  try {
    const budgets = await db.getBudgetAmounts(req.user.id, req.params.month);
    res.json(budgets);
  } catch (error) {
    console.error('Error fetching budget amounts:', error);
    res.json([]);
  }
});

// Goals endpoints
app.get('/goals', authenticateUser, async (req, res) => {
  try {
    const goals = await db.getGoals(req.user.id);
    res.json(goals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.json([]);
  }
});

app.post('/goals', authenticateUser, async (req, res) => {
  try {
    const goal = await db.createGoal(req.user.id, req.body);
    res.json({ status: 'ok', data: goal });
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create goal' });
  }
});

app.put('/goals/:id', authenticateUser, async (req, res) => {
  try {
    const goal = await db.updateGoal(req.user.id, req.params.id, req.body);
    res.json({ status: 'ok', data: goal });
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update goal' });
  }
});

app.delete('/goals/:id', authenticateUser, async (req, res) => {
  try {
    await db.deleteGoal(req.user.id, req.params.id);
    res.json({ status: 'ok', message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete goal' });
  }
});

// Categories endpoints
app.get('/categories', authenticateUser, async (req, res) => {
  try {
    const categories = await db.getCategories(req.user.id);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    // Return empty array instead of error for now
    res.json([]);
  }
});

app.post('/categories', authenticateUser, async (req, res) => {
  try {
    const category = await db.createCategory(req.user.id, req.body);
    res.json({ status: 'ok', data: category });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create category' });
  }
});

// Payees endpoints
app.get('/payees', authenticateUser, async (req, res) => {
  try {
    const payees = await db.getPayees(req.user.id);
    res.json(payees);
  } catch (error) {
    console.error('Error fetching payees:', error);
    // Return empty array instead of error for now
    res.json([]);
  }
});

// Budget endpoints
app.get('/budget/:month', authenticateUser, async (req, res) => {
  try {
    const { month } = req.params;
    const budget = await db.getBudgetMonth(req.user.id, `${month}-01`);
    res.json(budget);
  } catch (error) {
    console.error('Error fetching budget:', error);
    // Return empty budget structure instead of error for now
    res.json({ month, categories: [], transactions: [], accounts: [] });
  }
});

// CSV Import endpoint using Supabase storage
app.post('/import-transactions', authenticateUser, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'No file uploaded' 
      });
    }

    const { accountId } = req.body;
    if (!accountId) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Account ID is required' 
      });
    }

    console.log('📄 Processing CSV import:', req.file.originalname);
    
    // Parse CSV file using proven CSV parsing
    const fileContent = req.file.buffer.toString('utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'CSV file must have at least a header and one data row' 
      });
    }

    // Parse header and detect columns
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log('📋 CSV Headers:', headers);
    
    // Auto-detect column mappings (case insensitive)
    const getColumnIndex = (patterns) => {
      for (const pattern of patterns) {
        const index = headers.findIndex(h => 
          h.toLowerCase().includes(pattern.toLowerCase())
        );
        if (index !== -1) return index;
      }
      return -1;
    };

    const dateCol = getColumnIndex(['date', 'transaction date', 'posted date']);
    const amountCol = getColumnIndex(['amount', 'debit', 'credit']);
    const descCol = getColumnIndex(['description', 'memo', 'payee', 'merchant']);
    
    if (dateCol === -1 || amountCol === -1) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Could not find required Date and Amount columns in CSV' 
      });
    }

    console.log('🎯 Column mapping:', { dateCol, amountCol, descCol });

    // Parse transactions
    const transactions = [];
    let imported = 0;
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        
        if (values.length < Math.max(dateCol, amountCol) + 1) {
          console.warn(`⚠️ Skipping row ${i + 1}: insufficient columns`);
          continue;
        }

        // Parse date (handle multiple formats)
        const dateStr = values[dateCol];
        let parsedDate;
        
        // Try different date formats
        if (dateStr.includes('/')) {
          const [month, day, year] = dateStr.split('/');
          parsedDate = new Date(year.length === 2 ? `20${year}` : year, month - 1, day);
        } else if (dateStr.includes('-')) {
          parsedDate = new Date(dateStr);
        } else {
          console.warn(`⚠️ Skipping row ${i + 1}: invalid date format`);
          continue;
        }

        if (isNaN(parsedDate.getTime())) {
          console.warn(`⚠️ Skipping row ${i + 1}: invalid date`);
          continue;
        }

        // Parse amount (handle negative values, currency symbols)
        let amountStr = values[amountCol].replace(/[$,]/g, '');
        let amount = parseFloat(amountStr);
        
        if (isNaN(amount)) {
          console.warn(`⚠️ Skipping row ${i + 1}: invalid amount`);
          continue;
        }

        // Keep amount in dollars (already in correct format)
        // amount = Math.round(amount * 100); // Removed - causing double conversion

        // Get description and create/find payee
        const description = descCol !== -1 ? values[descCol] : 'Imported Transaction';
        
        // Create payee if it doesn't exist
        let payee = null;
        try {
          const existingPayees = await db.getPayees(req.user.id);
          payee = existingPayees.find(p => p.name === description);
          if (!payee) {
            payee = await db.createPayee(req.user.id, description);
          }
        } catch (error) {
          console.warn('Failed to create payee:', error.message);
        }

        const transaction = {
          account_id: accountId,
          amount: amount,
          date: parsedDate.toISOString().split('T')[0],
          notes: `Imported from ${req.file.originalname}`,
          payee_id: payee?.id || null,
          imported: true,
          cleared: true
        };

        transactions.push(transaction);
        imported++;
        
      } catch (error) {
        console.warn(`⚠️ Error parsing row ${i + 1}:`, error.message);
      }
    }

    if (imported === 0) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'No valid transactions found in CSV file' 
      });
    }

    // Save transactions to Supabase
    const savedTransactions = await db.createTransactions(req.user.id, transactions);
    
    console.log(`✅ Successfully imported ${savedTransactions.length} transactions to Supabase`);
    
    res.json({ 
      status: 'ok', 
      imported: savedTransactions.length,
      message: `Successfully imported ${savedTransactions.length} transactions`
    });
    
  } catch (error) {
    console.error('💥 CSV import error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to import CSV file' 
    });
  }
});

// Start server
async function startServer() {
  await initializeServer();
  
  app.listen(PORT, () => {
    console.log(`✅ Emerald Budget Server with Supabase running on port ${PORT}`);
    console.log(`   Database: Supabase Cloud`);
    console.log(`   Server is ready to accept connections...`);
    console.log(`   All data is now stored in Supabase - no more local files!`);
  });
}

startServer().catch(console.error);
