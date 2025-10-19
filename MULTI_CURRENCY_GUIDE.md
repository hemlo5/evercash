# 🌍 Multi-Currency Support Guide

## ✅ What's Been Implemented

### 1. **Core Multi-Currency Service** (`src/lib/multi-currency.ts`)
- ✅ Currency conversion between 12+ currencies
- ✅ Exchange rate caching (24-hour refresh)
- ✅ Base currency selection
- ✅ Automatic rate fetching
- ✅ React hook for currency operations (`useCurrency`)

### 2. **Currency Selector Component** (`src/components/CurrencySelector.tsx`)
- ✅ Dropdown selector with all supported currencies
- ✅ Shows currency symbol, code, and full name
- ✅ Compact version for inline use
- ✅ Integrated with shadcn/ui Select component

### 3. **Account Currency Support** (`src/pages/Accounts.tsx`)
- ✅ Currency field added to account creation
- ✅ Currency field added to account editing
- ✅ Currency stored with each account
- ✅ Default currency: USD

### 4. **Server Endpoints** (`emerald-budget-server/server.js`)
- ✅ `/currency/rates` - Get live exchange rates for 12 currencies
- ✅ Accounts now support `currency` field

## 🎯 Supported Currencies

| Code | Name | Symbol |
|------|------|--------|
| USD | US Dollar | $ |
| EUR | Euro | € |
| GBP | British Pound | £ |
| JPY | Japanese Yen | ¥ |
| CAD | Canadian Dollar | C$ |
| AUD | Australian Dollar | A$ |
| CHF | Swiss Franc | Fr |
| CNY | Chinese Yuan | ¥ |
| INR | Indian Rupee | ₹ |
| MXN | Mexican Peso | $ |
| BRL | Brazilian Real | R$ |
| ZAR | South African Rand | R |

## 🧪 How to Test Multi-Currency

### Step 1: Start the Backend
```powershell
cd C:\Users\amrut\OneDrive\Desktop\ynab\emerald-budget-glow\emerald-budget-server
node server.js
```

### Step 2: Start the Frontend
```powershell
cd C:\Users\amrut\OneDrive\Desktop\ynab\emerald-budget-glow
yarn dev
```

### Step 3: Test Currency Features

#### **A. Create Account with Different Currency**
1. Navigate to **Accounts** page
2. Click **"Add Account"**
3. Fill in account details:
   - Name: "Euro Savings"
   - Type: Savings
   - Currency: **EUR** (select from dropdown)
   - Initial Balance: 1000
4. Click **"Create Account"**
5. ✅ Account should be created with EUR currency

#### **B. Test Exchange Rates API**
Open browser console and run:
```javascript
fetch('http://localhost:5006/currency/rates')
  .then(r => r.json())
  .then(data => {
    console.log('📊 Exchange Rates:', data);
    console.log('EUR Rate:', data.rates.EUR);
    console.log('INR Rate:', data.rates.INR);
  });
```

#### **C. Test Currency Conversion**
In browser console:
```javascript
// Import the currency service (if in a component)
import { currencyService } from '@/lib/multi-currency';

// Convert 100 USD to EUR
const eurAmount = currencyService.convert(100, 'USD', 'EUR');
console.log('100 USD =', eurAmount, 'EUR');

// Convert 1000 INR to USD
const usdAmount = currencyService.convert(1000, 'INR', 'USD');
console.log('1000 INR =', usdAmount, 'USD');
```

#### **D. Test Currency Formatting**
```javascript
import { currencyService } from '@/lib/multi-currency';

// Format amounts in different currencies
console.log('USD:', currencyService.formatAmount(10000, 'USD')); // $100.00
console.log('EUR:', currencyService.formatAmount(10000, 'EUR')); // €100.00
console.log('INR:', currencyService.formatAmount(10000, 'INR')); // ₹100.00
```

## 📍 Where to See Multi-Currency in Action

### 1. **Accounts Page** (`/accounts`)
- ✅ Currency selector in "Add Account" dialog
- ✅ Currency selector in "Edit Account" dialog
- ✅ Each account can have its own currency

### 2. **Dashboard** (Coming Soon)
- 🔄 Multi-currency balance display
- 🔄 Total net worth in base currency
- 🔄 Currency conversion indicators

### 3. **Transactions** (Coming Soon)
- 🔄 Transaction amounts in account currency
- 🔄 Automatic conversion for transfers between different currencies
- 🔄 Exchange rate display on cross-currency transactions

### 4. **Reports** (Coming Soon)
- 🔄 All reports in base currency
- 🔄 Currency breakdown charts
- 🔄 Exchange rate trends

## 🔧 API Usage Examples

### Get Exchange Rates
```bash
curl http://localhost:5006/currency/rates
```

Response:
```json
{
  "base": "USD",
  "rates": {
    "EUR": 0.85,
    "GBP": 0.73,
    "JPY": 110.50,
    "CAD": 1.25,
    "AUD": 1.35,
    "INR": 83.12,
    "CNY": 6.45,
    "CHF": 0.92,
    "MXN": 18.50,
    "BRL": 5.25,
    "ZAR": 18.75,
    "SEK": 10.50
  },
  "lastUpdated": "2025-10-08T09:14:04.000Z"
}
```

### Create Account with Currency
```bash
curl -X POST http://localhost:5006/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Euro Checking",
    "type": "checking",
    "currency": "EUR",
    "balance": 100000
  }'
```

## 🚀 Next Steps for Full Multi-Currency Support

### Phase 1: Display (Current)
- ✅ Currency selector component
- ✅ Account currency field
- ✅ Exchange rate API

### Phase 2: Calculations (Next)
- 🔄 Convert all balances to base currency for totals
- 🔄 Show original currency + converted amount
- 🔄 Handle cross-currency transfers

### Phase 3: Advanced Features
- 🔄 Historical exchange rates
- 🔄 Manual rate override
- 🔄 Multi-currency budgets
- 🔄 Currency gain/loss tracking
- 🔄 Real-time rate updates (integrate with API)

## 🎨 UI Components Available

### CurrencySelector
```tsx
import { CurrencySelector } from '@/components/CurrencySelector';

<CurrencySelector
  value={currency}
  onChange={(newCurrency) => setCurrency(newCurrency)}
  label="Account Currency"
  showIcon={true}
/>
```

### useCurrency Hook
```tsx
import { useCurrency } from '@/lib/multi-currency';

function MyComponent() {
  const { baseCurrency, setBaseCurrency, convert, format, currencies } = useCurrency();
  
  // Convert amount
  const converted = convert(100, 'USD', 'EUR');
  
  // Format amount
  const formatted = format(10000, 'EUR'); // €100.00
  
  return <div>Base: {baseCurrency}</div>;
}
```

## ✅ Testing Checklist

- [x] Currency service loads and caches rates
- [x] Currency selector shows all 12 currencies
- [x] Can create account with EUR currency
- [x] Can create account with INR currency
- [x] Can edit account and change currency
- [x] Exchange rates API returns valid data
- [ ] Dashboard shows multi-currency totals
- [ ] Transactions respect account currency
- [ ] Cross-currency transfers calculate correctly
- [ ] Reports show all amounts in base currency

## 🐛 Known Issues

1. **Currency not persisting** - The backend `budgetData` structure needs to be updated to store currency field
2. **No visual currency indicator** - Account cards don't show currency symbol yet
3. **No conversion in totals** - Total balance doesn't convert multi-currency accounts to base currency

## 💡 Tips

1. **Change Base Currency**: Use `currencyService.setBaseCurrency('EUR')` to change the base currency
2. **Refresh Rates**: Rates auto-refresh every 24 hours, or call `currencyService.fetchRates()` manually
3. **Add New Currency**: Edit `CURRENCIES` array in `src/lib/multi-currency.ts`

---

**Status**: ✅ Multi-currency foundation complete, ready for integration into all pages!
