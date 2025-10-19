/**
 * Bank Sync Configuration
 * Cost-effective alternatives to expensive Plaid pricing
 */

export const BANK_SYNC_CONFIG = {
  // Your Plaid credentials (for testing only - too expensive for production)
  plaid: {
    clientId: '68e770d4fd05e80025702668',
    sandbox: 'b22b3d697c5bc0f317468b84aebc4a',
    environment: 'sandbox' as const,
    // Note: Production costs $0.30/account/month - too expensive!
    productionCost: {
      transactions: '$0.30/account/month',
      auth: '$1.50/initial call',
      balance: '$0.10/call',
      totalEstimate: '$10-50/month for typical user'
    }
  },

  // FREE ALTERNATIVES (Recommended)
  alternatives: {
    // 1. CSV Import (100% FREE)
    csvImport: {
      cost: 'FREE',
      description: 'Users download CSV from their bank and upload',
      pros: ['No ongoing costs', 'Works with any bank', 'User controls data'],
      cons: ['Manual process', 'Not real-time'],
      implementation: 'Already built in your app!'
    },

    // 2. SimpleFIN (Much cheaper)
    simplefin: {
      cost: '$15-25 one-time setup per bank',
      monthlyFee: '$0 (after setup)',
      description: 'Direct bank connections without third-party fees',
      pros: ['No monthly fees', 'Direct bank API', 'More private'],
      cons: ['One-time setup fee', 'Technical setup required'],
      website: 'https://simplefin.org'
    },

    // 3. Open Banking (EU - FREE)
    openBanking: {
      cost: 'FREE (EU banks)',
      description: 'PSD2 regulated Open Banking APIs',
      pros: ['Completely free', 'Regulated', 'Secure'],
      cons: ['EU only', 'Requires business registration'],
      implementation: 'GoCardless integration already built'
    },

    // 4. Teller (Cheaper than Plaid)
    teller: {
      cost: '$0.10/account/month',
      description: 'Plaid alternative with 70% lower costs',
      pros: ['Much cheaper', 'Similar features', 'Good API'],
      cons: ['Still has monthly fees', 'Smaller bank coverage'],
      website: 'https://teller.io'
    },

    // 5. Yodlee (Enterprise but negotiable)
    yodlee: {
      cost: 'Negotiable (usually cheaper than Plaid)',
      description: 'Enterprise bank aggregation',
      pros: ['Established player', 'Good coverage', 'Negotiable pricing'],
      cons: ['Enterprise focus', 'Complex setup'],
      website: 'https://developer.yodlee.com'
    }
  },

  // RECOMMENDED STRATEGY
  recommendedApproach: {
    phase1: 'Start with CSV Import (FREE) - covers 80% of users',
    phase2: 'Add SimpleFIN for power users ($15-25 one-time)',
    phase3: 'Consider Teller if you need real-time sync ($0.10/month)',
    phase4: 'Only use Plaid for enterprise customers who pay premium'
  }
};

// Cost comparison for typical user with 3 accounts
export const COST_COMPARISON = {
  plaid: {
    monthly: 3 * 0.30, // $0.90/month
    yearly: 3 * 0.30 * 12, // $10.80/year
    note: 'Plus auth calls, balance calls, etc.'
  },
  teller: {
    monthly: 3 * 0.10, // $0.30/month  
    yearly: 3 * 0.10 * 12, // $3.60/year
    savings: '70% cheaper than Plaid'
  },
  simplefin: {
    oneTime: 3 * 20, // $60 one-time setup
    monthly: 0, // $0/month ongoing
    yearly: 0, // $0/year ongoing
    note: 'One-time cost, then free forever'
  },
  csvImport: {
    monthly: 0,
    yearly: 0,
    note: 'Completely free, user downloads from bank'
  }
};

export default BANK_SYNC_CONFIG;
