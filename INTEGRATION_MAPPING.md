# MyBudget Pro x Actual Budget Integration Mapping

**Project**: Integrating Actual Budget backend with emerald-budget-glow luxury UI  
**Status**: Phase 1 - Audit & Mapping  
**Date**: 2025-10-05

---

## 🎯 Integration Strategy Overview

This document maps every feature from Actual Budget's core functionality to the emerald-budget-glow UI components, ensuring 100% feature parity with enhanced UX.

---

## 📊 FEATURE MAPPING TABLE

### Core Budget Features

| Feature | Actual Budget Function/Hook | UI Component | Integration Priority | Notes |
|---------|----------------------------|--------------|---------------------|-------|
| **Budget Dashboard** | `useBudget()`, `getBudgetMonth()` | `Dashboard.tsx` | P0 - Critical | Main overview, needs real-time balance updates |
| Budget Categories | `useCategories()`, `getCategoryGroups()` | `Budgets.tsx` → `BudgetEnvelope` | P0 - Critical | Envelope/category allocation, current has mock data |
| Category Balance | `useCategoryBalance()` | `BudgetEnvelope.tsx` | P0 - Critical | Real-time spent/allocated tracking |
| Net Worth | `useAccounts()`, calculate sum | `NetWorthCircle.tsx` | P0 - Critical | Circle visualization needs real account balances |
| Monthly Income | `getIncome()` from loot-core | `Dashboard.tsx` → `StatCard` | P0 - Critical | Currently hardcoded $5,420 |
| Total Expenses | `getExpenses()` from loot-core | `Dashboard.tsx` → `StatCard` | P0 - Critical | Currently hardcoded $3,280 |
| Savings Rate | Calculated from income/expenses | `Dashboard.tsx` → `StatCard` | P1 - High | Derived metric |

### Transaction Management

| Feature | Actual Budget Function/Hook | UI Component | Integration Priority | Notes |
|---------|----------------------------|--------------|---------------------|-------|
| **Transaction List** | `useTransactions()` | `Transactions.tsx` → `TransactionItem` | P0 - Critical | Full CRUD operations needed |
| Recent Transactions | `useTransactions({ limit: 5 })` | `Dashboard.tsx` (widget) | P0 - Critical | Dashboard preview |
| Quick Add Transaction | `addTransaction()` | `QuickAddTransaction.tsx` | P0 - Critical | Modal form, needs validation |
| Transaction Search/Filter | `filterTransactions()` | `Transactions.tsx` (search bar) | P1 - High | Filter by category, date, amount |
| Edit Transaction | `updateTransaction()` | `TransactionItem` (inline edit) | P0 - Critical | Click-to-edit functionality |
| Delete Transaction | `deleteTransaction()` | `TransactionItem` (delete btn) | P0 - Critical | Confirm dialog needed |
| Bulk Import (CSV) | `importTransactions()` from loot-core | `Transactions.tsx` (Import btn) | P1 - High | Supports OFX/QFX/CSV formats |
| Split Transactions | `splitTransaction()` | Not yet implemented | P2 - Medium | **GAP**: Needs new modal |

### Account Management

| Feature | Actual Budget Function/Hook | UI Component | Integration Priority | Notes |
|---------|----------------------------|--------------|---------------------|-------|
| **Account List** | `useAccounts()` | `Dashboard.tsx` (widget) | P0 - Critical | Display all accounts with balances |
| Add/Edit Account | `addAccount()`, `updateAccount()` | Settings → Accounts section | P1 - High | Settings.tsx has account UI |
| Account Balances | `useAccountBalance()` | Multiple components | P0 - Critical | Synced across app |
| Account Reconciliation | `reconcileAccount()` | Not yet implemented | P2 - Medium | **GAP**: Needs reconciliation modal |

### Reports & Analytics

| Feature | Actual Budget Function/Hook | UI Component | Integration Priority | Notes |
|---------|----------------------------|--------------|---------------------|-------|
| **Spending Trends** | `getSpendingTrends()` | `Reports.tsx` (line chart) | P1 - High | Uses Recharts for visualization |
| Category Breakdown | `getCategorySpending()` | `Reports.tsx` (bar chart) | P1 - High | Monthly breakdown by category |
| Income vs Expenses | `getIncomeVsExpenses()` | `Reports.tsx` (area chart) | P1 - High | Time-series comparison |
| Net Worth Over Time | `getNetWorthHistory()` | `Reports.tsx` (line chart) | P2 - Medium | Historical balance tracking |
| Custom Date Range | Filter logic | `Reports.tsx` (date picker) | P1 - High | Currently has month selector |

### Goals & Loans (Extended Features)

| Feature | Actual Budget Function/Hook | UI Component | Integration Priority | Notes |
|---------|----------------------------|--------------|---------------------|-------|
| **Savings Goals** | Custom extension needed | `Goals.tsx` → `GoalProgressCard` | P2 - Medium | Not in core Actual, needs DB extension |
| Goal Progress Tracking | Custom state management | `GoalProgressCard.tsx` | P2 - Medium | Track percentage complete |
| Loan Calculator | Pure JS calculation | `LoanCalculatorModal.tsx` | P3 - Nice-to-have | Standalone feature, no backend needed |
| Loan Amortization | Custom logic | `Goals.tsx` (loan section) | P3 - Nice-to-have | Calculate payment schedules |

### Bank Sync (Premium Feature)

| Feature | Actual Budget Function/Hook | UI Component | Integration Priority | Notes |
|---------|----------------------------|--------------|---------------------|-------|
| **Bank Connection** | Plaid API integration (external) | `BankSyncModal.tsx` | P2 - Medium | **NOT in core Actual**, requires Plaid setup |
| Auto-Import Transactions | Plaid transaction sync | Background service | P2 - Medium | Webhook-based or polling |
| Account Verification | Plaid OAuth flow | `BankSyncModal` | P2 - Medium | Multi-step modal UI ready |

### Sharing & Collaboration

| Feature | Actual Budget Function/Hook | UI Component | Integration Priority | Notes |
|---------|----------------------------|--------------|---------------------|-------|
| **Budget Sharing** | End-to-end encryption sync (Actual Cloud) | `Sharing.tsx` | P2 - Medium | Actual supports file sync, needs UI wiring |
| Share with Partner | `shareFile()` from sync logic | `Sharing.tsx` (share modal) | P2 - Medium | Uses Actual's existing sync infra |
| Permission Management | Custom extension | `Sharing.tsx` (permissions UI) | P3 - Nice-to-have | **GAP**: Actual sync is full-access, no granular perms |

### Settings & Preferences

| Feature | Actual Budget Function/Hook | UI Component | Integration Priority | Notes |
|---------|----------------------------|--------------|---------------------|-------|
| **Profile Settings** | `getUserSettings()` | `Settings.tsx` (profile tab) | P1 - High | Name, email, avatar |
| Budget Preferences | `getBudgetSettings()` | `Settings.tsx` (budget tab) | P1 - High | Currency, start day, etc. |
| Theme Toggle | LocalStorage + CSS vars | `Settings.tsx` (appearance) | P1 - High | Dark/light mode (keep beige theme) |
| Notification Settings | Custom state | `Settings.tsx` (notifications) | P3 - Nice-to-have | Email/push alerts |
| Import/Export Data | `exportBudget()`, `importBudget()` | `Settings.tsx` (data tab) | P1 - High | Backup/restore functionality |

### Gamification (Custom Features)

| Feature | Actual Budget Function/Hook | UI Component | Integration Priority | Notes |
|---------|----------------------------|--------------|---------------------|-------|
| **Savings Streak** | Custom state (LocalStorage) | `StreakBadge.tsx` | P3 - Nice-to-have | Days without overspending |
| Achievement Badges | Custom state | `Dashboard.tsx`, `Budgets.tsx` | P3 - Nice-to-have | Milestone tracking (e.g., "Saved $1000") |
| Leaderboard (if multi-user) | Custom logic | Not yet implemented | P4 - Future | Compare with friends |

### AI Insights (Custom Features)

| Feature | Actual Budget Function/Hook | UI Component | Integration Priority | Notes |
|---------|----------------------------|--------------|---------------------|-------|
| **Spending Alerts** | Custom rule engine | `AIInsightBadge.tsx` | P3 - Nice-to-have | Warnings when over budget |
| Smart Suggestions | ML model (external) | `AIInsightBadge.tsx` | P4 - Future | "Reduce dining" type tips |
| Predictive Budgeting | Trend analysis | Not yet implemented | P4 - Future | Forecast next month |

---

## 🔴 UNMAPPED FEATURES (Gaps in Current UI)

### From Actual Budget Core (Missing UI)
1. **Payee Management**: Actual has payee tracking/autocomplete, no UI in current design
   - **Suggestion**: Add "Payees" tab to Settings or inline in Transaction form
2. **Rules/Auto-categorization**: Actual supports transaction rules (e.g., "Always categorize Amazon → Shopping")
   - **Suggestion**: Add "Rules" section to Settings → Automation tab
3. **Scheduled Transactions**: Actual supports recurring bills/income
   - **Suggestion**: Add "Scheduled" tab to Transactions page or Dashboard widget
4. **Budget Templates**: Actual allows saving budget month as template
   - **Suggestion**: Add template dropdown in Budgets page header
5. **Account Reconciliation**: Missing reconciliation modal
   - **Suggestion**: Add "Reconcile" button to account list, create modal

### From UI (Features Not in Actual Core)
1. **Bank Sync**: Requires external Plaid integration
   - **Approach**: Implement as optional premium add-on using Plaid Link
2. **Loan Calculator**: Standalone feature
   - **Approach**: Keep as pure frontend calculation (no backend needed)
3. **Goals Tracking**: Not in core Actual
   - **Approach**: Extend loot-core DB schema to add `goals` table, or use LocalStorage for MVP
4. **Sharing with Permissions**: Actual sync is full-access only
   - **Approach**: Either use Actual's existing sync as-is or build custom auth layer
5. **AI Insights**: Requires ML model
   - **Approach**: Start with rule-based alerts (e.g., `if (spent > allocated) show warning`), add ML later

---

## 🏗️ TECHNICAL INTEGRATION NOTES

### Actual Budget Hooks Reference
Based on Actual Budget docs and repo (`actualbudget.org/docs`):

```typescript
// Budget data
import { useBudget } from 'loot-core/client/data-hooks/budget';
const { data: budgetData, isLoading } = useBudget();

// Categories
import { useCategories } from 'loot-core/client/data-hooks/categories';
const { grouped: categoryGroups } = useCategories();

// Transactions
import { useTransactions } from 'loot-core/client/data-hooks/transactions';
const { data: transactions } = useTransactions({ accountId });

// Accounts
import { useAccounts } from 'loot-core/client/data-hooks/accounts';
const { data: accounts } = useAccounts();
```

### Key Libraries in Use
- **Frontend**: React 18, React Router, TanStack Query
- **UI**: Radix UI (all primitives), Tailwind CSS
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **State**: TanStack Query (React Query) for server state

### File Structure Assumptions
```
/packages/loot-core/
  ├── src/
  │   ├── client/
  │   │   ├── data-hooks/   ← Custom hooks (useBudget, useTransactions, etc.)
  │   │   └── actions/      ← Dispatch actions (addTransaction, updateCategory, etc.)
  │   └── types/            ← TypeScript interfaces
/src/ (emerald-budget-glow)
  ├── pages/                ← UI screens
  ├── components/           ← Reusable components
  └── lib/                  ← Utils (cn(), API wrappers)
```

---

## ✅ PHASE 1 COMPLETION CHECKLIST

- [x] Audited all UI screens (9 pages)
- [x] Mapped core Actual features to UI (35+ features)
- [x] Identified unmapped features (10 gaps)
- [x] Documented integration priorities (P0-P4)
- [x] Listed required hooks/functions from loot-core
- [x] Created technical integration notes

---

## 🚀 NEXT STEPS (Phase 2 Preview)

1. **Setup Git Branch**: `git checkout -b actual-integration-phase2`
2. **Install Actual Budget**: Clone repo, link loot-core as dependency
3. **Start with Dashboard**: Replace mock data in `Dashboard.tsx` with `useBudget()` hook
4. **Test incrementally**: Commit after each screen integration

---

## 📝 NOTES FOR DEVELOPER

- **Backup before merge**: Current UI is pristine, ensure rollback option
- **Preserve styling**: Keep all glassmorphism, emerald/beige colors, animations
- **Performance**: Use `React.memo()` for heavy lists, lazy load charts
- **Accessibility**: Test keyboard nav, screen reader support
- **Mobile**: Responsive design is in place, verify on small screens

---

**Ready for Phase 2?** Confirm dependencies are installed and Actual Budget repo is accessible.
