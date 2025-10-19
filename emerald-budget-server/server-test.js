// Simple Test Server - For Feature Testing
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5006;

// Basic security middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// Data storage
const DATA_DIR = path.join(__dirname, 'budget-data');
let budgetData = {};

// Initialize data
async function initData() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
  
  const dataFile = path.join(DATA_DIR, 'budget.json');
  try {
    const data = await fs.readFile(dataFile, 'utf8');
    budgetData = JSON.parse(data);
  } catch {
    budgetData = {
      accounts: [],
      transactions: [],
      categories: [],
      categoryGroups: [],
      payees: [],
      budgets: {},
      user: {
        id: crypto.randomUUID(),
        email: 'test@emerald-budget.com'
      },
      scheduledTransactions: [],
      importRules: []
    };
    await saveData();
  }
}

async function saveData() {
  const dataFile = path.join(DATA_DIR, 'budget.json');
  await fs.writeFile(dataFile, JSON.stringify(budgetData, null, 2));
}

// Routes
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    name: 'Emerald Budget Test Server',
    features: [
      'Basic Auth',
      'Scheduled Transactions',
      'Import Rules',
      'Multi-Currency',
      'Virtual Lists'
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Simple login
app.post('/account/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    // Simple token for testing
    const token = crypto.randomBytes(32).toString('hex');
    
    res.json({
      status: 'ok',
      data: {
        token,
        user: budgetData.user,
        message: '✅ Test login successful'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get accounts
app.get('/accounts', (req, res) => {
  res.json(budgetData.accounts || []);
});

// Get transactions
app.get('/transactions', (req, res) => {
  res.json(budgetData.transactions || []);
});

// Sync endpoint
app.post('/sync/sync', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages must be an array' });
    }
    
    for (const message of messages) {
      const { dataset, row } = message;
      
      if (!dataset || !row) continue;
      
      switch (dataset) {
        case 'accounts':
          const accountIndex = budgetData.accounts.findIndex(a => a.id === row.id);
          if (accountIndex >= 0) {
            budgetData.accounts[accountIndex] = { ...budgetData.accounts[accountIndex], ...row };
          } else {
            budgetData.accounts.push(row);
          }
          break;
          
        case 'transactions':
          const txIndex = budgetData.transactions.findIndex(t => t.id === row.id);
          if (txIndex >= 0) {
            budgetData.transactions[txIndex] = { ...budgetData.transactions[txIndex], ...row };
          } else {
            budgetData.transactions.push(row);
          }
          break;
          
        case 'categories':
          const catIndex = budgetData.categories.findIndex(c => c.id === row.id);
          if (catIndex >= 0) {
            budgetData.categories[catIndex] = { ...budgetData.categories[catIndex], ...row };
          } else {
            budgetData.categories.push(row);
          }
          break;
      }
    }
    
    await saveData();
    res.json({ status: 'ok', data: { messages } });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Budget endpoint
app.get('/budget/:month', (req, res) => {
  const { month } = req.params;
  
  // Create default category groups if they don't exist
  if (!budgetData.categoryGroups || budgetData.categoryGroups.length === 0) {
    budgetData.categoryGroups = [
      {
        id: 'group-1',
        name: 'Essential Expenses',
        is_income: false,
        categories: [
          { id: 'cat-1', name: 'Rent/Mortgage', budgeted: 150000, spent: -150000, balance: 0 },
          { id: 'cat-2', name: 'Groceries', budgeted: 50000, spent: -35000, balance: 15000 },
          { id: 'cat-3', name: 'Utilities', budgeted: 20000, spent: -18000, balance: 2000 }
        ]
      },
      {
        id: 'group-2',
        name: 'Transportation',
        is_income: false,
        categories: [
          { id: 'cat-4', name: 'Gas', budgeted: 15000, spent: -12000, balance: 3000 },
          { id: 'cat-5', name: 'Car Insurance', budgeted: 10000, spent: -10000, balance: 0 }
        ]
      },
      {
        id: 'group-3',
        name: 'Fun Money',
        is_income: false,
        categories: [
          { id: 'cat-6', name: 'Dining Out', budgeted: 30000, spent: -25000, balance: 5000 },
          { id: 'cat-7', name: 'Entertainment', budgeted: 20000, spent: -15000, balance: 5000 }
        ]
      }
    ];
  }
  
  const monthBudget = budgetData.budgets?.[month] || {
    month,
    totalIncome: 300000, // $3000 in cents
    totalBudgeted: 285000, // $2850 in cents
    totalSpent: 270000, // $2700 in cents
    toBudget: 15000, // $150 in cents
    categoryGroups: budgetData.categoryGroups
  };
  
  res.json(monthBudget);
});

// Test endpoints for new features

// Scheduled transactions
app.get('/scheduled-transactions', (req, res) => {
  res.json(budgetData.scheduledTransactions || []);
});

app.post('/scheduled-transactions', async (req, res) => {
  const schedule = {
    id: crypto.randomUUID(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  
  budgetData.scheduledTransactions = budgetData.scheduledTransactions || [];
  budgetData.scheduledTransactions.push(schedule);
  
  await saveData();
  res.json({ status: 'ok', data: schedule });
});

// Import rules
app.get('/import-rules', (req, res) => {
  res.json(budgetData.importRules || []);
});

app.post('/import-rules', async (req, res) => {
  const rule = {
    id: crypto.randomUUID(),
    ...req.body,
    createdAt: new Date().toISOString(),
    useCount: 0
  };
  
  budgetData.importRules = budgetData.importRules || [];
  budgetData.importRules.push(rule);
  
  await saveData();
  res.json({ status: 'ok', data: rule });
});

// Currency rates (mock)
app.get('/currency/rates', (req, res) => {
  const rates = {
    base: 'USD',
    rates: {
      'EUR': 0.85,
      'GBP': 0.73,
      'JPY': 110.50,
      'CAD': 1.25,
      'AUD': 1.35
    },
    lastUpdated: new Date().toISOString()
  };
  
  res.json(rates);
});

// Plaid mock endpoints
app.post('/plaid/link-token', (req, res) => {
  res.json({
    link_token: 'link-sandbox-' + crypto.randomBytes(16).toString('hex'),
    expiration: new Date(Date.now() + 3600000).toISOString()
  });
});

app.post('/plaid/exchange-token', (req, res) => {
  res.json({
    access_token: 'access-sandbox-' + crypto.randomBytes(16).toString('hex'),
    item_id: 'item-' + crypto.randomBytes(8).toString('hex')
  });
});

// Initialize and start
initData().then(() => {
  app.listen(PORT, () => {
    console.log(`🧪 Emerald Budget Test Server running on port ${PORT}`);
    console.log(`📊 Features ready for testing:`);
    console.log(`   - JWT Authentication (simplified)`);
    console.log(`   - Scheduled Transactions API`);
    console.log(`   - Import Rules API`);
    console.log(`   - Multi-Currency API`);
    console.log(`   - Plaid Mock API`);
    console.log(`🔗 Frontend: http://localhost:3000`);
  });
});
