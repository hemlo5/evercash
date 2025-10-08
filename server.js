// Simple backend server for Emerald Budget
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 5006;

app.use(cors());
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
  res.json({
    bootstrapped: budgetData.user?.password !== null,
    needsBootstrap: budgetData.user?.password === null
  });
});

// Login
app.post('/account/login', (req, res) => {
  const { password } = req.body;
  
  // First time setup
  if (!budgetData.user.password) {
    budgetData.user.password = password;
    budgetData.user.token = crypto.randomBytes(32).toString('hex');
    saveData(budgetData);
    
    res.json({
      status: 'ok',
      data: { token: budgetData.user.token }
    });
    return;
  }
  
  // Check password
  if (budgetData.user.password === password) {
    budgetData.user.token = crypto.randomBytes(32).toString('hex');
    saveData(budgetData);
    
    res.json({
      status: 'ok',
      data: { token: budgetData.user.token }
    });
  } else {
    res.status(401).json({
      status: 'error',
      message: 'Invalid password'
    });
  }
});

// Sync endpoint (main data endpoint)
app.post('/sync/sync', (req, res) => {
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
  
  res.json({ status: 'ok', message: 'Sample data initialized' });
});

app.listen(PORT, () => {
  console.log(`Emerald Budget Server running on http://localhost:${PORT}`);
  console.log('Use this server for real data storage with your budget app');
});
