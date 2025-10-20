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
// Ensure fetch/FormData/Blob available in Node runtime
const { fetch, FormData, Blob } = require('undici');
const pdfParse = require('pdf-parse');
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

// Separate multer instance for AI endpoints (PDF/images/CSV)
const aiUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    // Be permissive to avoid 500s from filter; downstream service will validate
    cb(null, true);
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

// AI Proxy: Nanonets extract
app.post('/ai/nanonets/extract', authenticateUser, aiUpload.single('file'), async (req, res) => {
  try {
    if (!process.env.NANONETS_API_KEY) {
      return res.status(500).json({ status: 'error', message: 'NANONETS_API_KEY not configured' });
    }
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }
    console.log('🧾 Nanonets proxy received file:', {
      name: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
    const form = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype || 'application/octet-stream' });
    form.append('file', blob, req.file.originalname || 'upload');
    // Some Nanonets endpoints accept 'files' instead of 'file' – include both for compatibility
    form.append('files', blob, req.file.originalname || 'upload');
    form.append('output_type', req.body?.output_type || 'markdown');
    form.append('format', 'markdown');
    form.append('output_format', 'markdown');
    // Attempt 1: Bearer
    let resp = await fetch('https://extraction-api.nanonets.com/extract', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.NANONETS_API_KEY}`, Accept: 'application/json' },
      body: form
    });
    let text = await resp.text();
    console.log('🧾 Nanonets upstream (Bearer) status:', resp.status, resp.statusText);
    console.log('🧾 Nanonets upstream (Bearer) body (first 500 chars):', text.slice(0, 500));
    if (!resp.ok) {
      // Attempt 2: x-api-key
      console.log('🔁 Retrying Nanonets with x-api-key header...');
      resp = await fetch('https://extraction-api.nanonets.com/extract', {
        method: 'POST',
        headers: { 'x-api-key': process.env.NANONETS_API_KEY, Accept: 'application/json' },
        body: form
      });
      text = await resp.text();
      console.log('🧾 Nanonets upstream (x-api-key) status:', resp.status, resp.statusText);
      console.log('🧾 Nanonets upstream (x-api-key) body (first 500 chars):', text.slice(0, 500));
      if (!resp.ok) {
        // Attempt 3: Basic
        console.log('🔁 Retrying Nanonets with Basic auth header...');
        const basic = Buffer.from(`${process.env.NANONETS_API_KEY}:`).toString('base64');
        resp = await fetch('https://extraction-api.nanonets.com/extract', {
          method: 'POST',
          headers: { Authorization: `Basic ${basic}`, Accept: 'application/json' },
          body: form
        });
        text = await resp.text();
        console.log('🧾 Nanonets upstream (Basic) status:', resp.status, resp.statusText);
        console.log('🧾 Nanonets upstream (Basic) body (first 500 chars):', text.slice(0, 500));

        // Fallback to PDF.co OCR text if Nanonets failed
        if (!resp.ok) {
          // Local PDF text extraction as first fallback
          try {
            if ((req.file.mimetype && req.file.mimetype.includes('pdf')) || (req.file.originalname && req.file.originalname.toLowerCase().endsWith('.pdf'))) {
              console.log('🛟 Local fallback: extracting PDF text via pdf-parse');
              const parsed = await pdfParse(Buffer.from(req.file.buffer));
              const content = parsed.text || '';
              if (content && content.trim().length) {
                return res.status(200).json({ content });
              }
            }
          } catch (lpErr) {
            console.error('❌ Local pdf-parse fallback error:', lpErr);
          }

          console.log('🛟 Falling back to PDF.co text extraction...');
          if (!process.env.PDFCO_API_KEY) {
            console.warn('⚠️ PDFCO_API_KEY not configured; cannot fallback');
            return res.status(502).json({
              status: 'error',
              message: 'Nanonets failed and no PDF.co fallback available (missing PDFCO_API_KEY)',
              upstreamStatus: resp.status,
              upstreamBody: text.slice(0, 500)
            });
          }
          try {
            // 1) Upload file to PDF.co
            const upForm = new FormData();
            const upBlob = new Blob([req.file.buffer], { type: req.file.mimetype || 'application/pdf' });
            upForm.append('file', upBlob, req.file.originalname || 'upload.pdf');
            const upResp = await fetch('https://api.pdf.co/v1/file/upload', {
              method: 'POST',
              headers: { 'x-api-key': process.env.PDFCO_API_KEY },
              body: upForm
            });
            const upText = await upResp.text();
            console.log('🧾 PDF.co upload status:', upResp.status, upResp.statusText);
            console.log('🧾 PDF.co upload body (first 500 chars):', upText.slice(0, 500));
            if (!upResp.ok) {
              return res.status(502).json({ status: 'error', message: 'PDF.co upload failed', details: upText.slice(0, 500) });
            }
            let upJson;
            try { upJson = JSON.parse(upText); } catch { upJson = {}; }
            const fileUrl = upJson.url || upJson.fileUrl || upJson.body;
            if (!fileUrl) {
              return res.status(502).json({ status: 'error', message: 'PDF.co upload: no url in response' });
            }

            // 2) Convert to text via PDF.co (choose endpoint based on file type)
            const isImage = (req.file.mimetype && req.file.mimetype.startsWith('image/')) || /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(req.file.originalname || '');
            const convertEndpoint = isImage
              ? 'https://api.pdf.co/v1/image/convert/to/text'
              : 'https://api.pdf.co/v1/pdf/convert/to/text';
            const convResp = await fetch(convertEndpoint, {
              method: 'POST',
              headers: {
                'x-api-key': process.env.PDFCO_API_KEY,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ url: fileUrl, inline: true })
            });
            const convText = await convResp.text();
            console.log('🧾 PDF.co convert-to-text status:', convResp.status, convResp.statusText, 'endpoint:', convertEndpoint);
            console.log('🧾 PDF.co convert-to-text body (first 500 chars):', convText.slice(0, 500));
            if (!convResp.ok) {
              return res.status(502).json({ status: 'error', message: 'PDF.co convert-to-text failed', details: convText.slice(0, 500) });
            }
            let convJson;
            try { convJson = JSON.parse(convText); } catch { convJson = {}; }
            const content = convJson.body || convJson.text || '';
            if (!content) {
              return res.status(502).json({ status: 'error', message: 'PDF.co conversion returned no content' });
            }
            return res.status(200).json({ content });
          } catch (fbErr) {
            console.error('❌ PDF.co fallback error:', fbErr);
            return res.status(502).json({ status: 'error', message: 'PDF.co fallback error' });
          }
        }
      }
    }
    if (resp.ok) {
    try {
      const json = JSON.parse(text);
      return res.status(200).json(json);
    } catch {
      return res.status(200).type('application/json').send(text);
    }
  } else {
    return res.status(502).json({
      status: 'error',
      message: 'Nanonets upstream error',
      upstreamStatus: resp.status,
      upstreamBody: text.slice(0, 1000)
    });
  }
  } catch (err) {
    console.error('Nanonets proxy error:', err);
    // Try local PDF fallback first on thrown errors
    try {
      if (req.file) {
        console.log('🧾 Catch block file context:', {
          name: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        });
      } else {
        console.warn('⚠️ Catch block: req.file is missing');
      }

      if (req.file && ((req.file.mimetype && req.file.mimetype.includes('pdf')) || (req.file.originalname && req.file.originalname.toLowerCase().endsWith('.pdf')))) {
        try {
          console.log('🛟 Catch: local pdf-parse fallback');
          const parsed = await pdfParse(Buffer.from(req.file.buffer));
          const content = parsed.text || '';
          if (content && content.trim().length) {
            return res.status(200).json({ content });
          }
        } catch (lpErr) {
          console.error('❌ Catch: local pdf-parse fallback error:', lpErr);
        }
      }

      // Then try PDF.co fallback
      if (!process.env.PDFCO_API_KEY) {
        return res.status(500).json({ status: 'error', message: 'Failed to process with Nanonets; PDFCO_API_KEY missing for fallback' });
      }
      console.log('🛟 Falling back to PDF.co due to error...');
      const upForm = new FormData();
      const upBlob = new Blob([req.file.buffer], { type: req.file.mimetype || 'application/pdf' });
      upForm.append('file', upBlob, req.file.originalname || 'upload.pdf');
      const upResp = await fetch('https://api.pdf.co/v1/file/upload', {
        method: 'POST',
        headers: { 'x-api-key': process.env.PDFCO_API_KEY },
        body: upForm
      });
      const upText = await upResp.text();
      if (!upResp.ok) {
        return res.status(502).json({ status: 'error', message: 'PDF.co upload failed', details: upText.slice(0, 500) });
      }
      let upJson;
      try { upJson = JSON.parse(upText); } catch { upJson = {}; }
      const fileUrl = upJson.url || upJson.fileUrl || upJson.body;
      if (!fileUrl) {
        return res.status(502).json({ status: 'error', message: 'PDF.co upload: no url in response' });
      }
      const convResp = await fetch('https://api.pdf.co/v1/pdf/convert/to/text', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.PDFCO_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: fileUrl, inline: true })
      });
      const convText = await convResp.text();
      if (!convResp.ok) {
        return res.status(502).json({ status: 'error', message: 'PDF.co convert-to-text failed', details: convText.slice(0, 500) });
      }
      let convJson;
      try { convJson = JSON.parse(convText); } catch { convJson = {}; }
      const content = convJson.body || convJson.text || '';
      if (!content) {
        return res.status(502).json({ status: 'error', message: 'PDF.co conversion returned no content' });
      }
      return res.status(200).json({ content });
    } catch (fbErr) {
      console.error('❌ PDF.co fallback error (catch):', fbErr);
      res.status(500).json({ status: 'error', message: 'Failed to process with Nanonets and PDF.co fallback' });
    }
  }
});

// AI Proxy: PDF.co upload
app.post('/ai/pdfco/upload', authenticateUser, aiUpload.single('file'), async (req, res) => {
  try {
    if (!process.env.PDFCO_API_KEY) {
      return res.status(500).json({ status: 'error', message: 'PDFCO_API_KEY not configured' });
    }
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }
    console.log('🧾 PDF.co upload proxy received file:', {
      name: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
    const form = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype || 'application/pdf' });
    form.append('file', blob, req.file.originalname || 'upload.pdf');
    const resp = await fetch('https://api.pdf.co/v1/file/upload', {
      method: 'POST',
      headers: { 'x-api-key': process.env.PDFCO_API_KEY },
      body: form
    });
    const text = await resp.text();
    console.log('🧾 PDF.co upload upstream status:', resp.status, resp.statusText);
    console.log('🧾 PDF.co upload upstream body (first 500 chars):', text.slice(0, 500));
    res.status(resp.status).type('application/json').send(text);
  } catch (err) {
    console.error('PDF.co upload proxy error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to upload to PDF.co' });
  }
});

// AI Proxy: PDF.co split
app.post('/ai/pdfco/split', authenticateUser, async (req, res) => {
  try {
    if (!process.env.PDFCO_API_KEY) {
      return res.status(500).json({ status: 'error', message: 'PDFCO_API_KEY not configured' });
    }
    const { url, pages } = req.body || {};
    if (!url || !pages) {
      return res.status(400).json({ status: 'error', message: 'url and pages are required' });
    }
    const payload = {
      url,
      inline: false,
      pages,
      name: 'split.pdf',
      async: false
    };
    const resp = await fetch('https://api.pdf.co/v1/pdf/split', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.PDFCO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const text = await resp.text();
    res.status(resp.status).type('application/json').send(text);
  } catch (err) {
    console.error('PDF.co split proxy error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to split via PDF.co' });
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

// Global error handler to ensure JSON error responses
app.use((err, req, res, next) => {
  try {
    console.error('💥 Global error handler:', err && (err.stack || err));
  } catch {}
  if (res.headersSent) return next(err);
  res.status(500).json({ status: 'error', message: err?.message || 'Internal Server Error' });
});

startServer().catch(console.error);
