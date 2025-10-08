// Simple backend server for Emerald Budget
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5006;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:*"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

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

// Load or create data file
async function loadData() {
  const dataFile = path.join(DATA_DIR, 'budget.json');
  try {
    const data = await fs.readFile(dataFile, 'utf8');
    return JSON.parse(data);
  } catch {
    // Create default data structure
    const defaultData = {
      accounts: [],
      transactions: [],
      categories: [],
      categoryGroups: [],
      payees: [],
      budgets: {},
      user: {
        token: null,
        password: null
      }
    };
    await saveData(defaultData);
    return defaultData;
  }
}

// Save data file
async function saveData(data) {
  const dataFile = path.join(DATA_DIR, 'budget.json');
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
}

// Global data object
let budgetData = {};

// Initialize
initDataDir().then(async () => {
  budgetData = await loadData();
  console.log('Data loaded successfully');
});

// Routes

// Server status
app.get('/', (req, res) => {
  res.json({ 
    version: '1.0.0',
    status: 'running',
    name: 'Emerald Budget Server'
  });
});

// Check if needs bootstrap
app.get('/account/needs-bootstrap', (req, res) => {
  const hasPassword = budgetData.user?.passwordHash || budgetData.user?.password;
  res.json({
    bootstrapped: hasPassword !== null && hasPassword !== undefined,
    needsBootstrap: !hasPassword
  });
});

// Login
app.post('/account/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    // Input validation
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters'
      });
    }
    
    // First time setup
    if (!budgetData.user.passwordHash) {
      // Hash the password with bcrypt
      const hashedPassword = await bcrypt.hash(password, 12);
      budgetData.user.passwordHash = hashedPassword;
      budgetData.user.token = crypto.randomBytes(32).toString('hex');
      
      // Remove old plain text password if it exists
      delete budgetData.user.password;
      
      await saveData(budgetData);
      
      res.json({
        status: 'ok',
        data: { 
          token: budgetData.user.token,
          message: '🔐 Secure account created successfully' 
        }
      });
      return;
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, budgetData.user.passwordHash);
    
    if (isValidPassword) {
      budgetData.user.token = crypto.randomBytes(32).toString('hex');
      await saveData(budgetData);
      
      res.json({
        status: 'ok',
        data: { 
          token: budgetData.user.token,
          message: '🔐 Secure login successful' 
        }
      });
    } else {
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

// Middleware to check authentication
function checkAuth(req, res, next) {
  // Allow unauthenticated access if no password is set yet (first time setup)
  const hasPassword = budgetData.user?.passwordHash || budgetData.user?.password;
  if (!hasPassword) {
    return next();
  }
  
  const token = req.headers['x-actual-token'] || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || token !== budgetData.user?.token) {
    return res.status(401).json({
      status: 'error',
      reason: 'unauthorized',
      details: 'token-not-found'
    });
  }
  
  next();
}

// Sync endpoint (main data endpoint)
app.post('/sync/sync', checkAuth, (req, res) => {
  const { messages } = req.body;
  
  if (!messages) {
    res.json({ messages: [] });
    return;
  }
  
  const responseMessages = [];
  
  for (const msg of messages) {
    const { dataset, row, column } = msg;
    
    // Handle reads
    if (!row && !column) {
      switch (dataset) {
        case 'accounts':
          responseMessages.push({
            dataset: 'accounts',
            data: budgetData.accounts
          });
          break;
        case 'transactions':
          responseMessages.push({
            dataset: 'transactions',
            data: budgetData.transactions
          });
          break;
        case 'categories':
          responseMessages.push({
            dataset: 'categories',
            data: budgetData.categories
          });
          break;
        case 'category_groups':
          responseMessages.push({
            dataset: 'category_groups',
            data: budgetData.categoryGroups
          });
          break;
        case 'payees':
          responseMessages.push({
            dataset: 'payees',
            data: budgetData.payees
          });
          break;
      }
    }
    
    // Handle writes
    if (row) {
      switch (dataset) {
        case 'accounts':
          if (row.tombstone) {
            budgetData.accounts = budgetData.accounts.filter(a => a.id !== row.id);
          } else if (budgetData.accounts.find(a => a.id === row.id)) {
            // Update
            const index = budgetData.accounts.findIndex(a => a.id === row.id);
            budgetData.accounts[index] = { ...budgetData.accounts[index], ...row };
          } else {
            // Create
            budgetData.accounts.push(row);
          }
          break;
          
        case 'transactions':
          if (row.tombstone) {
            budgetData.transactions = budgetData.transactions.filter(t => t.id !== row.id);
          } else if (budgetData.transactions.find(t => t.id === row.id)) {
            // Update
            const index = budgetData.transactions.findIndex(t => t.id === row.id);
            budgetData.transactions[index] = { ...budgetData.transactions[index], ...row };
          } else {
            // Create
            budgetData.transactions.push(row);
          }
          break;
          
        case 'categories':
          if (row.tombstone) {
            budgetData.categories = budgetData.categories.filter(c => c.id !== row.id);
          } else if (budgetData.categories.find(c => c.id === row.id)) {
            // Update
            const index = budgetData.categories.findIndex(c => c.id === row.id);
            budgetData.categories[index] = { ...budgetData.categories[index], ...row };
            
            // If budgeted amount is being updated, also update the budgets object
            if (row.budgeted !== undefined) {
              const currentDate = new Date();
              const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
              
              if (!budgetData.budgets[currentMonth]) {
                budgetData.budgets[currentMonth] = {};
              }
              budgetData.budgets[currentMonth][row.id] = {
                budgeted: row.budgeted,
                spent: row.spent || 0,
                balance: (row.budgeted || 0) - (row.spent || 0)
              };
              
              console.log(`Updated budget for category ${row.id} in ${currentMonth}:`, budgetData.budgets[currentMonth][row.id]);
            }
          } else {
            // Create
            budgetData.categories.push(row);
          }
          break;
          
        case 'payees':
          if (row.tombstone) {
            budgetData.payees = budgetData.payees.filter(p => p.id !== row.id);
          } else if (budgetData.payees.find(p => p.id === row.id)) {
            // Update
            const index = budgetData.payees.findIndex(p => p.id === row.id);
            budgetData.payees[index] = { ...budgetData.payees[index], ...row };
          } else {
            // Create
            budgetData.payees.push(row);
          }
          break;
      }
      
      // Save after each write
      saveData(budgetData);
    }
  }
  
  res.json({ messages: responseMessages });
});

// List budget files
app.post('/sync/list-user-files', (req, res) => {
  res.json([
    {
      fileId: 'budget-1',
      groupId: 'budget-1',
      name: 'My Budget',
      encryptKeyId: null
    }
  ]);
});

// Budget month endpoint
app.get('/budget/month/:month', (req, res) => {
  const { month } = req.params;
  
  // Calculate budget data for the month
  const categoryGroups = budgetData.categoryGroups.map(group => ({
    ...group,
    categories: budgetData.categories
      .filter(cat => cat.cat_group === group.id)
      .map(cat => {
        // Calculate spent amount from transactions
        const spent = budgetData.transactions
          .filter(t => t.category === cat.id && t.date && t.date.startsWith(month.replace(/-/g, '')))
          .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
        
        const budgeted = budgetData.budgets[`${month}-${cat.id}`] || 0;
        
        return {
          ...cat,
          budgeted,
          spent,
          balance: budgeted - spent
        };
      })
  }));
  
  res.json({
    month,
    categoryGroups,
    incomeAvailable: 0,
    lastMonthOverspent: 0,
    forNextMonth: 0,
    totalBudgeted: 0,
    toBudget: 0,
    fromLastMonth: 0,
    totalIncome: 0,
    totalSpent: 0,
    totalBalance: 0
  });
});

// Create some default data if empty
app.post('/init-sample-data', (req, res) => {
  if (budgetData.accounts.length === 0) {
    // Add default accounts
    budgetData.accounts = [
      {
        id: 'acc-checking',
        name: 'Checking Account',
        type: 'checking',
        offbudget: 0,
        closed: 0,
        balance: 500000 // $5000
      },
      {
        id: 'acc-savings',
        name: 'Savings Account',
        type: 'savings',
        offbudget: 0,
        closed: 0,
        balance: 1000000 // $10000
      },
      {
        id: 'acc-credit',
        name: 'Credit Card',
        type: 'credit',
        offbudget: 0,
        closed: 0,
        balance: -50000 // -$500
      }
    ];
    
    // Add default category groups
    budgetData.categoryGroups = [
      {
        id: 'grp-income',
        name: 'Income',
        is_income: 1,
        sort_order: 0
      },
      {
        id: 'grp-essential',
        name: 'Essential Expenses',
        is_income: 0,
        sort_order: 1
      },
      {
        id: 'grp-lifestyle',
        name: 'Lifestyle',
        is_income: 0,
        sort_order: 2
      },
      {
        id: 'grp-savings',
        name: 'Savings Goals',
        is_income: 0,
        sort_order: 3
      }
    ];
    
    // Add default categories
    budgetData.categories = [
      // Income
      { id: 'cat-salary', name: 'Salary', cat_group: 'grp-income', is_income: 1 },
      { id: 'cat-other-income', name: 'Other Income', cat_group: 'grp-income', is_income: 1 },
      
      // Essential
      { id: 'cat-rent', name: 'Rent/Mortgage', cat_group: 'grp-essential', is_income: 0 },
      { id: 'cat-utilities', name: 'Utilities', cat_group: 'grp-essential', is_income: 0 },
      { id: 'cat-groceries', name: 'Groceries', cat_group: 'grp-essential', is_income: 0 },
      { id: 'cat-transport', name: 'Transportation', cat_group: 'grp-essential', is_income: 0 },
      
      // Lifestyle
      { id: 'cat-dining', name: 'Dining Out', cat_group: 'grp-lifestyle', is_income: 0 },
      { id: 'cat-entertainment', name: 'Entertainment', cat_group: 'grp-lifestyle', is_income: 0 },
      { id: 'cat-shopping', name: 'Shopping', cat_group: 'grp-lifestyle', is_income: 0 },
      
      // Savings
      { id: 'cat-emergency', name: 'Emergency Fund', cat_group: 'grp-savings', is_income: 0 },
      { id: 'cat-vacation', name: 'Vacation', cat_group: 'grp-savings', is_income: 0 }
    ];
    
    // Add some default payees
    budgetData.payees = [
      { id: 'payee-1', name: 'Walmart' },
      { id: 'payee-2', name: 'Amazon' },
      { id: 'payee-3', name: 'Starbucks' },
      { id: 'payee-4', name: 'Gas Station' },
      { id: 'payee-5', name: 'Electric Company' }
    ];
    
    saveData(budgetData);
  }
  
  res.json({ messages: responseMessages });
});

// Budget-specific endpoint
app.get('/budget/:month', (req, res) => {
  console.log('Budget endpoint called for month:', req.params.month);
  const { month } = req.params;
  
  // Calculate spending from transactions for this month
  const monthTransactions = budgetData.transactions.filter(t => {
    if (!t.date) return false;
    const txDate = new Date(t.date);
    const [year, monthNum] = month.split('-').map(Number);
    return txDate.getFullYear() === year && (txDate.getMonth() + 1) === monthNum;
  });
  
  // Calculate spending by category
  const spendingByCategory = {};
  monthTransactions.forEach(tx => {
    if (tx.category && tx.amount < 0) { // Only expenses
      spendingByCategory[tx.category] = (spendingByCategory[tx.category] || 0) + Math.abs(tx.amount);
    }
  });
  
  // Get budget data for this month
  const monthBudgets = budgetData.budgets[month] || {};
  
  // Combine categories with budget and spending data
  const categoryGroups = budgetData.categoryGroups.map(group => ({
    ...group,
    categories: budgetData.categories
      .filter(cat => cat.cat_group === group.id && !group.is_income)
      .map(cat => ({
        ...cat,
        budgeted: monthBudgets[cat.id]?.budgeted || 0,
        spent: spendingByCategory[cat.id] || 0,
        balance: (monthBudgets[cat.id]?.budgeted || 0) - (spendingByCategory[cat.id] || 0)
      }))
  })).filter(group => group.categories.length > 0);
  
  // Calculate totals
  let totalBudgeted = 0;
  let totalSpent = 0;
  let totalIncome = 0;
  
  categoryGroups.forEach(group => {
    group.categories.forEach(cat => {
      totalBudgeted += cat.budgeted || 0;
      totalSpent += cat.spent || 0;
    });
  });
  
  // Calculate income from transactions
  monthTransactions.forEach(tx => {
    if (tx.amount > 0) {
      totalIncome += tx.amount;
    }
  });
  
  const budgetMonth = {
    month,
    incomeAvailable: totalIncome,
    lastMonthOverspent: 0,
    forNextMonth: 0,
    totalBudgeted,
    toBudget: totalIncome - totalBudgeted,
    fromLastMonth: 0,
    totalIncome,
    totalSpent,
    totalBalance: totalBudgeted - totalSpent,
    categoryGroups
  };
  
  console.log(`Budget data for ${month}:`, JSON.stringify(budgetMonth, null, 2));
  res.json(budgetMonth);
});

// Budget update endpoint
app.put('/budget/:month/category/:categoryId', (req, res) => {
  const { month, categoryId } = req.params;
  const { budgeted } = req.body;
  
  console.log(`Updating budget for category ${categoryId} in ${month} to ${budgeted}`);
  
  // Initialize budget structure if needed
  if (!budgetData.budgets[month]) {
    budgetData.budgets[month] = {};
  }
  
  // Update the budget
  budgetData.budgets[month][categoryId] = {
    budgeted: budgeted,
    spent: budgetData.budgets[month][categoryId]?.spent || 0,
    balance: budgeted - (budgetData.budgets[month][categoryId]?.spent || 0)
  };
  
  // Also update the category in the categories array
  const category = budgetData.categories.find(cat => cat.id === categoryId);
  if (category) {
    category.budgeted = budgeted;
  }
  
  // Save the data
  saveData(budgetData);
  
  console.log(`Budget updated successfully for ${categoryId}:`, budgetData.budgets[month][categoryId]);
  res.json({ success: true, budget: budgetData.budgets[month][categoryId] });
});

// Start server
initDataDir().then(() => {
  loadData().then(data => {
    budgetData = data;
    app.listen(PORT, () => {
      console.log(`Emerald Budget Server running on port ${PORT}`);
      console.log('Use this server for real data storage with your budget app');
    });
  });
});
