// AI-powered transaction categorization using Groq
// Uses stronger models with fallback and strict JSON instruction

interface TransactionData {
  description: string;
  amount: number;
  date: string;
  merchant?: string;
}

interface CategoryResult {
  category: string;
  confidence: number;
  reasoning: string;
}

// Predefined categories that match your app
const CATEGORIES = [
  'Food & Dining',
  'Shopping', 
  'Transportation',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Personal Care',
  'Gifts & Donations',
  'Salary',
  'Freelance',
  'Investment',
  'Other Income',
  'Other'
];

class AICategorizer {
  private apiKey: string | null = null;
  private baseUrl: string = 'https://api.groq.com/openai/v1';
  private modelCandidates: string[] = [
    'llama3-70b-8192',
    'mixtral-8x7b-32768',
    'llama3-8b-8192'
  ];
  private merchantHintCache = new Map<string, string[]>();
  private hfModelId: string = 'kuro-08/bert-transaction-categorization';
  private hfToken: string | null = null;
  private provider: 'auto' | 'huggingface' | 'groq' | 'fina' = 'auto';
  
  constructor() {
    // Try to get API key from environment or localStorage
    const envApiKey = typeof process !== 'undefined' ? process.env?.REACT_APP_GROQ_API_KEY : null;
    this.apiKey = envApiKey || 
                  (typeof localStorage !== 'undefined' ? localStorage.getItem('groq_api_key') : null) ||
                  null;
    const envHf = typeof process !== 'undefined' ? (process.env?.REACT_APP_HF_TOKEN as string | undefined) : undefined;
    this.hfToken = envHf || (typeof localStorage !== 'undefined' ? localStorage.getItem('hf_api_token') : null);
    try {
      const p = typeof localStorage !== 'undefined' ? localStorage.getItem('ai_provider') : null;
      if (p === 'huggingface' || p === 'groq' || p === 'fina' || p === 'auto') {
        this.provider = p;
      }
    } catch {}
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('groq_api_key', apiKey);
    }
  }

  setProvider(p: 'auto' | 'huggingface' | 'groq' | 'fina') {
    this.provider = p;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('ai_provider', p); } catch {}
  }

  async categorizeTransaction(transaction: TransactionData): Promise<CategoryResult> {
    console.log('🤖 AI Categorizer called with transaction:', transaction);
    
    try {
      const enrichment = await this.enrichContext(transaction);
      const pref = this.provider;

      if (pref === 'fina') {
        const finaRes = await this.categorizeWithFina(transaction);
        if (finaRes) return finaRes;
      }

      if (pref === 'huggingface' || pref === 'auto') {
        try {
          const localRes = await this.categorizeWithLocalHF(transaction);
          if (localRes) return localRes;
        } catch {}
        if (this.isHFConfigured()) {
          try {
            const res = await this.categorizeWithHF(transaction);
            if (res) return res;
          } catch {}
        }
      }

      if (pref === 'groq' || pref === 'auto') {
        if (!this.apiKey) {
          console.warn('Groq API key not configured; using fallback categorization');
          return this.fallbackCategorization(transaction, (enrichment.hints || []).join(' '));
        }
      } else if (pref === 'fina' || pref === 'huggingface') {
        if (!this.apiKey) {
          // If user explicitly chose fina/huggingface and they failed, and no Groq key present, go to rules
          return this.fallbackCategorization(transaction, (enrichment.hints || []).join(' '));
        }
      }
      // If we arrive here, try Groq as a robust backup when available
      console.log('📝 Building prompt for AI...');
      const prompt = this.buildPrompt(transaction, enrichment);
      console.log('📝 Prompt built');

      // Try stronger models first, then fallback
      let lastError: any = null;
      for (const model of this.modelCandidates) {
        try {
          const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: 'system',
                  content: [
                    'You are a precise financial transaction classifier for Indian banking data.',
                    `Allowed categories: ${CATEGORIES.join(', ')}.`,
                    'Rules:',
                    '- Use the transaction amount sign strictly: amount > 0 = income; amount < 0 = expense.',
                    `- If income, choose only from: Salary, Freelance, Investment, Other Income.`,
                    `- If expense, you MUST NOT choose any income category.`,
                    '- You will be provided with MerchantGuess, IsHumanPayeeLikely, and ExternalHints. ExternalHints come from quick web summaries. Use them to disambiguate unknown merchants. Prefer hints when they clearly identify the merchant or domain.',
                    '- Indian patterns: UPI/NEFT/IMPS refs often include personal names. Petrol/diesel/fuel/gas stations -> Transportation. Amazon/Flipkart/Myntra -> Shopping. Jio/Airtel/VI/BSNL/Internet/WiFi/Mobile/Bill -> Bills & Utilities. Zomato/Swiggy/Restaurant/Cafe/Food/Grocery/Supermarket/DMart/BigBazaar -> Food & Dining. Hospital/Clinic/Pharmacy/Medicine -> Healthcare.',
                    'Output strict JSON with keys: {"is_income": boolean, "is_human_payee": boolean, "merchant_type": string, "final_category": string}.',
                    'merchant_type one of: fuel,grocery,restaurant,telecom,ecommerce,utilities,transport,healthcare,entertainment,education,travel,personal_transfer,other.'
                  ].join('\n')
                },
                {
                  role: 'user',
                  content: `Transaction: ${prompt}\nUse MerchantGuess, IsHumanPayeeLikely, and ExternalHints to classify. Return ONLY JSON.`
                }
              ],
              temperature: 0.0,
              max_tokens: 200
            })
          });

          if (!response.ok) {
            let detail = '';
            try {
              detail = await response.text();
            } catch {}
            lastError = new Error(`Groq API error: ${response.status} ${response.statusText} ${detail}`);
            console.warn(`[${model}] failed:`, lastError.message);
            continue;
          }

          const data = await response.json();
          let content = data.choices?.[0]?.message?.content?.trim() || '';
          if (!content) {
            lastError = new Error('Empty model response');
            continue;
          }

          // Remove code fences if present
          content = content.replace(/```json|```/g, '').trim();
          let parsed: any;
          try {
            parsed = JSON.parse(content);
          } catch (e) {
            console.warn('JSON parse failed, falling back to text match');
            // Try to fall back to plain text category extraction
            const category = CATEGORIES.find(cat => 
              content.toLowerCase().includes(cat.toLowerCase()) ||
              cat.toLowerCase().includes(content.toLowerCase())
            );
            if (category) {
              return { category, confidence: 0.8, reasoning: `AI (text) → ${category}` };
            }
            lastError = e;
            continue;
          }

          // Validate category against allowed sets
          const isIncome = transaction.amount > 0;
          const incomeSet = new Set(['Salary','Freelance','Investment','Other Income']);
          const expenseSet = new Set(CATEGORIES.filter(c => !incomeSet.has(c)));
          let cat = (parsed?.final_category || '').toString();
          if (!CATEGORIES.includes(cat)) {
            // Try case-insensitive match
            const found = CATEGORIES.find(c => c.toLowerCase() === cat.toLowerCase());
            cat = found || '';
          }
          if (!cat) {
            // Map by merchant_type if provided
            const mt = (parsed?.merchant_type || '').toString();
            cat = this.mapMerchantTypeToCategory(mt, isIncome) || '';
          }
          if (!cat) {
            cat = this.fallbackCategorization(transaction, (enrichment.hints || []).join(' ')).category;
          }
          // Enforce income/expense constraint
          if (isIncome && !incomeSet.has(cat)) {
            cat = 'Other Income';
          }
          if (!isIncome && !expenseSet.has(cat)) {
            // Try mapping again
            const mt = (parsed?.merchant_type || '').toString();
            cat = this.mapMerchantTypeToCategory(mt, false) || 'Other';
          }

          return {
            category: cat,
            confidence: 0.9,
            reasoning: `AI(${model}) JSON classification`
          };
        } catch (err) {
          lastError = err;
          console.warn(`[${model}] exception:`, err);
          continue;
        }
      }

      console.error('All model attempts failed, using fallback:', lastError);
      return this.fallbackCategorization(transaction, (enrichment.hints || []).join(' '));
    } catch (error) {
      console.error('❌ Groq API error:', error);
      console.log('🔄 Falling back to rule-based categorization...');
      const enrichment = await this.enrichContext(transaction);
      const fallbackResult = this.fallbackCategorization(transaction, (enrichment.hints || []).join(' '));
      console.log('✅ Fallback categorization result:', fallbackResult);
      return fallbackResult;
    }
  }

  private buildPrompt(transaction: TransactionData, enrichment?: { merchant?: string; isHumanLikely?: boolean; hints?: string[] }): string {
    const { description, amount, date } = transaction;
    const isIncome = amount > 0;
    const absAmount = Math.abs(amount);
    const merchant = enrichment?.merchant || 'unknown';
    const isHumanLikely = enrichment?.isHumanLikely ? 'yes' : 'no';
    const hints = (enrichment?.hints || []).slice(0, 2).join(' | ');
    return [
      `Description: "${description}"`,
      `Amount: ${isIncome ? '+' : '-'}$${absAmount.toFixed(2)} (${isIncome ? 'income' : 'expense'})`,
      `Date: ${date}`,
      'Context: Indian banking (UPI/NEFT/IMPS common).',
      `Amount size: ${absAmount < 100 ? 'small' : absAmount < 1000 ? 'medium' : 'large'}`,
      `MerchantGuess: ${merchant}`,
      `IsHumanPayeeLikely: ${isHumanLikely}`,
      `ExternalHints: ${hints}`
    ].join('\n');
  }

  private normalizeDesc(text: string): string {
    return (text || '').toLowerCase().replace(/[0-9_.:@\-]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private extractMerchantCandidate(desc: string): string | null {
    const d = this.normalizeDesc(desc);
    const brands = ['amazon','flipkart','myntra','swiggy','zomato','ola','uber','dmart','bigbazaar','big bazaar','jio','airtel','vi','bsnl','netflix','spotify','dominos','kfc','mcdonald','irctc','iocl','hpcl','bpcl','reliance','tataplay','tatasky','lic','paytm','razorpay','payu','blinkit','zepto'];
    for (const b of brands) {
      if (d.includes(b)) return b;
    }
    const tokens = d.split(' ').filter(t => /^[a-z][a-z]+$/.test(t) && t.length >= 4);
    if (tokens.length === 0) return null;
    tokens.sort((a,b) => b.length - a.length);
    return tokens[0];
  }

  private async fetchMerchantHints(merchant: string): Promise<string[]> {
    const key = merchant.toLowerCase();
    if (this.merchantHintCache.has(key)) return this.merchantHintCache.get(key) || [];
    const hints: string[] = [];
    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(merchant)}`);
      if (res.ok) {
        const j = await res.json();
        if (j?.description) hints.push(String(j.description));
        if (j?.extract) hints.push(String(j.extract).slice(0, 240));
      }
    } catch {}
    try {
      const res2 = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(merchant)}&format=json&no_redirect=1&no_html=1`);
      if (res2.ok) {
        const j2 = await res2.json();
        if (j2?.AbstractText) hints.push(String(j2.AbstractText).slice(0, 240));
        if (j2?.Heading) hints.push(String(j2.Heading));
      }
    } catch {}
    const uniq = Array.from(new Set(hints.filter(Boolean)));
    this.merchantHintCache.set(key, uniq);
    return uniq;
  }

  private async enrichContext(transaction: TransactionData): Promise<{ merchant?: string; isHumanLikely: boolean; hints: string[] }> {
    const desc = (transaction.description || '').toLowerCase();
    const names = ['amruta','amrutha','ananya','anusha','priya','rahul','rohit','anand','arjun','sai','sandeep','santosh','ravi','kiran','vikas','vivek','neha','pooja','deepak','ankit','rakesh','abhishek','akshay','harsh','krishna','gopal','naveen','pavan','shreya','aditya'];
    const surnames = ['kumar','singh','sharma','gupta','agarwal','agrawal','jain','shah','patel','reddy','rao','das','devi','kumari','yadav','verma','banerjee','bhattacharya','chatterjee'];
    const humanCue = names.some(n => desc.includes(n)) || surnames.some(n => desc.includes(n)) || desc.includes(' mr ') || desc.includes(' mrs ');
    const p2pCue = desc.includes('upi') || desc.includes('gpay') || desc.includes('phonepe') || desc.includes('imps') || desc.includes('neft');
    const isHumanLikely = humanCue || p2pCue;
    const merchant = this.extractMerchantCandidate(transaction.description);
    let hints: string[] = [];
    if (merchant && !isHumanLikely) {
      try { hints = await this.fetchMerchantHints(merchant); } catch {}
    }
    return { merchant: merchant || undefined, isHumanLikely, hints };
  }

  private isHFConfigured(): boolean {
    return !!this.hfToken && /^hf_/i.test(String(this.hfToken));
  }

  setHfToken(token: string) {
    this.hfToken = token;
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('hf_api_token', token); } catch {}
  }

  private async normalizeDescription(desc: string): Promise<string> {
    let s = (desc || '').trim();
    s = s.replace(/[_.:@\-]+/g, ' ');
    s = s.replace(/([a-zA-Z])([0-9])/g, '$1 $2');
    s = s.replace(/([0-9])([a-zA-Z])/g, '$1 $2');
    const keywords = ['petrol','fuel','fuels','diesel','cash','salary','salaries','rent','recharge','uber','ola','zomato','swiggy','amazon','flipkart','myntra','dmart','bazaar','bigbazaar','big','vi','airtel','bsnl','jio','tatasky','tataplay','wifi','broadband','electricity','maintenance','society','pg','upi','gpay','phonepe','imps','neft','grocery','groceries'];
    const lower = s.toLowerCase();
    let out = lower;
    for (const k of keywords.sort((a,b) => b.length - a.length)) {
      const re = new RegExp(`(?<![a-z])(${k})(?![a-z])|(${k})`, 'g');
      out = out.replace(re, ' $& ');
    }
    out = out.replace(/\s+/g, ' ').trim();
    return out;
  }

  private async llmNormalizeDescription(desc: string): Promise<string> {
    try {
      if (!this.apiKey) return desc;
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            { role: 'system', content: 'Rewrite transaction merchant text to a clean readable form by inserting missing spaces and fixing obvious concatenations. Remove IDs/refs. Keep under 8 words. Return ONLY the cleaned text.' },
            { role: 'user', content: desc }
          ],
          temperature: 0.0,
          max_tokens: 40
        })
      });
      if (!response.ok) return desc;
      const data = await response.json();
      const content = (data?.choices?.[0]?.message?.content || '').toString().trim();
      if (!content) return desc;
      return content.replace(/^"|"$/g, '').trim();
    } catch {
      return desc;
    }
  }

  private idToHfLabel(id: number): string {
    const labels = [
      'Utilities','Health','Dining','Travel','Education','Subscription','Family','Food','Festivals','Culture','Apparel','Transportation','Investment','Shopping','Groceries','Documents','Grooming','Entertainment','Social Life','Beauty','Rent','Money transfer','Salary','Tourism','Household'
    ];
    return labels[id] || `LABEL_${id}`;
  }

  private hfToAppCategory(hfLabel: string, amount: number): string {
    const map: Record<string, string> = {
      'Utilities': 'Bills & Utilities',
      'Health': 'Healthcare',
      'Dining': 'Food & Dining',
      'Travel': 'Travel',
      'Education': 'Education',
      'Subscription': 'Bills & Utilities',
      'Family': 'Personal Care',
      'Food': 'Food & Dining',
      'Festivals': 'Gifts & Donations',
      'Culture': 'Entertainment',
      'Apparel': 'Shopping',
      'Transportation': 'Transportation',
      'Investment': 'Investment',
      'Shopping': 'Shopping',
      'Groceries': 'Food & Dining',
      'Documents': 'Other',
      'Grooming': 'Personal Care',
      'Entertainment': 'Entertainment',
      'Social Life': 'Entertainment',
      'Beauty': 'Personal Care',
      'Rent': 'Bills & Utilities',
      'Money transfer': (amount > 0 ? 'Other Income' : 'Personal Care'),
      'Salary': 'Salary',
      'Tourism': 'Travel',
      'Household': 'Shopping'
    };
    return map[hfLabel] || 'Other';
  }

  private mapFinaToAppCategory(fin: string, amount: number): string {
    const s = (fin || '').toLowerCase();
    if (s.includes('primary paycheck') || s.includes('income.wages')) return 'Salary';
    if (s.includes('business income')) return 'Freelance';
    if (s.includes('repayment from others') || s.includes('income.other_income') || s.includes('transfer_in')) return 'Other Income';
    if (s.includes('income.dividends') || s.includes('investment_cash.dividend') || s.includes('investment_cash.interest')) return 'Investment';
    if (s.includes('rent_and_utilities') || s.includes('internet_and_cable') || s.includes('gas_and_electricity') || s.includes('telephone') || s.includes('water') || s.includes('rent')) return 'Bills & Utilities';
    if (s.includes('transportation') || s.includes('auto & transport') || s.includes('vehicle') || s.includes('gas_and_charging') || s.includes('taxis') || s.includes('public_transit')) return 'Transportation';
    if (s.includes('food_and_drink') || s.includes('groceries') || s.includes('restaurant') || s.includes('coffee') || s.includes('fast_food')) return 'Food & Dining';
    if (s.includes('general_merchandise') || s.includes('shopping') || s.includes('clothing')) return 'Shopping';
    if (s.includes('entertainment') || s.includes('lifestyle') || s.includes('tv_and_movies') || s.includes('video_games')) return 'Entertainment';
    if (s.includes('education')) return 'Education';
    if (s.includes('donations')) return 'Gifts & Donations';
    if (s.includes('medical') || s.includes('pharmacies') || s.includes('primary_care')) return 'Healthcare';
    if (s.includes('gyms') || s.includes('hair_and_beauty') || s.includes('family & pets') || s.includes('laundry')) return 'Personal Care';
    if (s.includes('subscriptions')) return 'Bills & Utilities';
    if (s.includes('travel')) return 'Travel';
    if (s.includes('insurance')) return 'Bills & Utilities';
    if (s.includes('taxes')) return 'Other';
    if (s.includes('transfer') || s.includes('credit card payment')) return amount > 0 ? 'Other Income' : 'Other';
    if (s.includes('home')) return 'Other';
    if (s.includes('loans') || s.includes('financial fees') || s.includes('bank_fees')) return 'Other';
    return amount > 0 ? 'Other Income' : 'Other';
  }

  private async categorizeWithFina(transaction: TransactionData): Promise<CategoryResult | null> {
    try {
      const isIncome = transaction.amount > 0;
      let base = transaction.description;
      if (this.apiKey) {
        try { base = await this.llmNormalizeDescription(base); } catch {}
      }
      const normalized = await this.normalizeDescription(base);
      const serverBase = (typeof process !== 'undefined' && (process.env?.REACT_APP_AI_SERVER_URL as string)) || 'http://127.0.0.1:8010';
      const body = {
        items: [{ name: normalized, merchant: '', amount: isIncome ? 1 : -1 }],
        model: 'v3',
        mapping: true
      };
      const res = await fetch(`${serverBase}/ai/fina-categorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) return null;
      const data = await res.json();
      const cats = (data?.categories ?? []) as any;
      const first = Array.isArray(cats) && cats.length > 0 ? cats[0] : null;
      const label = typeof first === 'string' ? first : (typeof first?.category === 'string' ? first.category : '');
      if (!label) return null;
      let appCat = this.mapFinaToAppCategory(label, transaction.amount);
      const incomeSet = new Set(['Salary','Freelance','Investment','Other Income']);
      const expenseSet = new Set(CATEGORIES.filter(c => !incomeSet.has(c)));
      if (isIncome && !incomeSet.has(appCat)) appCat = 'Other Income';
      if (!isIncome && !expenseSet.has(appCat)) appCat = 'Other';
      return { category: appCat, confidence: 0.85, reasoning: `Fina -> ${label}` };
    } catch {
      return null;
    }
  }

  private async categorizeWithHF(transaction: TransactionData): Promise<CategoryResult | null> {
    try {
      const hfToken = this.hfToken;
      if (!hfToken) return null;
      const isIncome = transaction.amount > 0;
      let base = transaction.description;
      if (this.apiKey) {
        try { base = await this.llmNormalizeDescription(base); } catch {}
      }
      const normalized = await this.normalizeDescription(base);
      const input = `Transaction: ${normalized} - Type: ${isIncome ? 'income' : 'expense'}`;
      const res = await fetch(`https://api-inference.huggingface.co/models/${this.hfModelId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${hfToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: input })
      });
      if (!res.ok) return null;
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      const top = Array.isArray(arr[0]) ? arr[0] : arr;
      let bestLabel = '';
      let bestScore = 0;
      for (const item of top) {
        const label = String(item?.label || '');
        const score = Number(item?.score || 0);
        if (score > bestScore) { bestScore = score; bestLabel = label; }
      }
      if (!bestLabel) return null;
      let hfLabel = bestLabel;
      const m = /LABEL_(\d+)/.exec(bestLabel);
      if (m) { hfLabel = this.idToHfLabel(parseInt(m[1], 10)); }
      let appCat = this.hfToAppCategory(hfLabel, transaction.amount);
      const incomeSet = new Set(['Salary','Freelance','Investment','Other Income']);
      const expenseSet = new Set(CATEGORIES.filter(c => !incomeSet.has(c)));
      if (isIncome && !incomeSet.has(appCat)) appCat = 'Other Income';
      if (!isIncome && !expenseSet.has(appCat)) appCat = 'Other';
      const conf = Math.max(0.5, Math.min(0.99, bestScore || 0.8));
      return { category: appCat, confidence: conf, reasoning: `HF BERT -> ${hfLabel}` };
    } catch {
      return null;
    }
  }

  private async categorizeWithLocalHF(transaction: TransactionData): Promise<CategoryResult | null> {
    try {
      const isIncome = transaction.amount > 0;
      let base = transaction.description;
      if (this.apiKey) {
        try { base = await this.llmNormalizeDescription(base); } catch {}
      }
      const normalized = await this.normalizeDescription(base);
      const serverBase = (typeof process !== 'undefined' && (process.env?.REACT_APP_AI_SERVER_URL as string)) || 'http://127.0.0.1:8010';
      const res = await fetch(`${serverBase}/ai/hf-classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: normalized, type: isIncome ? 'income' : 'expense' })
      });
      if (!res.ok) return null;
      const data = await res.json();
      let hfLabel = String(data?.label_name || '');
      if (!hfLabel || /^LABEL_/i.test(hfLabel)) {
        const id = Number(data?.label_id);
        if (!Number.isNaN(id)) {
          hfLabel = this.idToHfLabel(id);
        }
      }
      let appCat = this.hfToAppCategory(hfLabel, transaction.amount);
      const incomeSet = new Set(['Salary','Freelance','Investment','Other Income']);
      const expenseSet = new Set(CATEGORIES.filter(c => !incomeSet.has(c)));
      if (isIncome && !incomeSet.has(appCat)) appCat = 'Other Income';
      if (!isIncome && !expenseSet.has(appCat)) appCat = 'Other';
      const conf = Math.max(0.5, Math.min(0.99, Number(data?.score) || 0.8));
      return { category: appCat, confidence: conf, reasoning: `Local HF BERT -> ${hfLabel}` };
    } catch {
      return null;
    }
  }

  private fallbackCategorization(transaction: TransactionData, hintText?: string): CategoryResult {
    const { description, amount } = transaction;
    const desc = description.toLowerCase();
    const hint = (hintText || '').toLowerCase();
    const hay = `${desc} ${hint}`;
    const isIncome = amount > 0;
    const absAmount = Math.abs(amount);
    
    // Enhanced rule-based categorization with Indian context
    if (isIncome) {
      if (hay.includes('salary') || hay.includes('pay') || hay.includes('credit') && absAmount > 10000) {
        return { category: 'Salary', confidence: 0.9, reasoning: 'Large credit transaction - likely salary' };
      }
      if (hay.includes('freelance') || hay.includes('consulting') || hay.includes('project')) {
        return { category: 'Freelance', confidence: 0.8, reasoning: 'Freelance work indicators' };
      }
      return { category: 'Other Income', confidence: 0.7, reasoning: 'Positive amount' };
    }

    // Food & Dining - Enhanced patterns
    if (hay.includes('zomato') || hay.includes('swiggy') || hay.includes('food') || 
        hay.includes('restaurant') || hay.includes('cafe') || hay.includes('dominos') ||
        hay.includes('kfc') || hay.includes('mcdonald') || hay.includes('pizza') ||
        hay.includes('hotel') || hay.includes('canteen') || hay.includes('mess') ||
        hay.includes('grocery') || hay.includes('supermarket') || hay.includes('dmart') ||
        hay.includes('d-mart') || hay.includes('big bazaar') || hay.includes('bigbazaar') ||
        hay.includes('more ') || hay.includes('reliance fresh') || hay.includes('star bazaar')) {
      return { category: 'Food & Dining', confidence: 0.9, reasoning: 'Food delivery/restaurant patterns' };
    }
    
    // Transportation - Enhanced patterns
    if (hay.includes('petrol') || hay.includes('fuel') || hay.includes('bp') ||
        hay.includes('uber') || hay.includes('ola') || hay.includes('taxi') ||
        hay.includes('bus') || hay.includes('metro') || hay.includes('train') ||
        hay.includes('auto') || hay.includes('rickshaw') || hay.includes('transport') ||
        hay.includes('iocl') || hay.includes('hpcl') || hay.includes('bpcl')) {
      return { category: 'Transportation', confidence: 0.9, reasoning: 'Transport/fuel related' };
    }
    
    // Bills & Utilities - Enhanced patterns
    if (hay.includes('jio') || hay.includes('airtel') || hay.includes('vi') ||
        hay.includes('bsnl') || hay.includes('electricity') || hay.includes('bill') || hay.includes('recharge') ||
        hay.includes('broadband') || hay.includes('internet') || hay.includes('mobile') ||
        hay.includes('phone') || hay.includes('water') || hay.includes('gas')) {
      return { category: 'Bills & Utilities', confidence: 0.9, reasoning: 'Utility/telecom services' };
    }
    
    // Shopping - Enhanced patterns
    if (hay.includes('amazon') || hay.includes('flipkart') || hay.includes('myntra') ||
        hay.includes('shopping') || hay.includes('mall') || hay.includes('store') ||
        hay.includes('market') || hay.includes('shop') || hay.includes('purchase') ||
        hay.includes('buy') || hay.includes('retail')) {
      return { category: 'Shopping', confidence: 0.8, reasoning: 'E-commerce/shopping patterns' };
    }

    // Healthcare
    if (hay.includes('hospital') || hay.includes('doctor') || hay.includes('medical') ||
        hay.includes('pharmacy') || hay.includes('medicine') || hay.includes('clinic') ||
        hay.includes('health') || hay.includes('apollo') || hay.includes('max')) {
      return { category: 'Healthcare', confidence: 0.8, reasoning: 'Medical/healthcare services' };
    }

    // Entertainment
    if (hay.includes('movie') || hay.includes('cinema') || hay.includes('netflix') ||
        hay.includes('spotify') || hay.includes('game') || hay.includes('entertainment') ||
        hay.includes('ticket') || hay.includes('show') || hay.includes('concert')) {
      return { category: 'Entertainment', confidence: 0.8, reasoning: 'Entertainment services' };
    }

    // Personal names (Indian context) - likely P2P via UPI/IMPS/NEFT
    const nameList = [
      'amruta','amrutha','ananya','anusha','priya','rahul','rohit','anand','arjun','sai','sandeep','santosh','ravi','kiran','vikas','vivek','neha','pooja','deepak','ankit','rakesh','abhishek','akshay','harsh','krishna','gopal','naveen','pavan','shreya','aditya'
    ];
    const surnameList = ['kumar','singh','sharma','gupta','agarwal','agrawal','jain','shah','patel','reddy','rao','das','devi','kumari','yadav','verma','banerjee','bhattacharya','chatterjee'];
    const hasHumanCue = nameList.some(n => hay.includes(n)) || surnameList.some(n => hay.includes(n)) || hay.includes(' mr ') || hay.includes(' mrs ');
    const hasP2PCue = hay.includes('upi') || hay.includes('paytm') || hay.includes('gpay') || hay.includes('phonepe') || hay.includes('imps') || hay.includes('neft');
    if (hasHumanCue || hasP2PCue) {
      // Expense side heuristics
      if (!isIncome) {
        if (/(gift|donation|charit|temple|mandir|dargah|gurdwara|ngo)/i.test(desc)) {
          return { category: 'Gifts & Donations', confidence: 0.8, reasoning: 'P2P donation/gift keywords' };
        }
        if (/(fees|tuition|coaching|academy|class)/i.test(desc)) {
          return { category: 'Education', confidence: 0.75, reasoning: 'Education-related P2P' };
        }
        if (/(rent|pg|landlord|broker|maintenance|society)/i.test(desc)) {
          return { category: 'Bills & Utilities', confidence: 0.7, reasoning: 'Housing-related P2P' };
        }
        // Default: treat P2P as personal expense rather than Other
        return { category: 'Personal Care', confidence: 0.65, reasoning: 'Personal transfer to individual' };
      } else {
        // Income side heuristics
        if (/(freelance|consult|invoice|project|service)/i.test(desc)) {
          return { category: 'Freelance', confidence: 0.8, reasoning: 'Freelance/consulting indicators' };
        }
        return { category: 'Other Income', confidence: 0.7, reasoning: 'P2P income from individual' };
      }
    }

    // Amount-based categorization
    if (absAmount > 5000) {
      return { category: 'Other', confidence: 0.5, reasoning: 'Large transaction - needs manual review' };
    }

    return { category: 'Other', confidence: 0.4, reasoning: 'No clear pattern found' };
  }

  // Batch categorize multiple transactions
  async categorizeTransactions(transactions: TransactionData[]): Promise<CategoryResult[]> {
    const results: CategoryResult[] = [];
    
    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      const batchResults: CategoryResult[] = [];
      for (const tx of batch) {
        // Sequential inside batch for stricter rate limiting
        // eslint-disable-next-line no-await-in-loop
        const res = await this.categorizeTransaction(tx);
        batchResults.push(res);
        // eslint-disable-next-line no-await-in-loop
        await new Promise(resolve => setTimeout(resolve, 75));
      }
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < transactions.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  private mapMerchantTypeToCategory(mt: string, isIncome: boolean): string | null {
    if (isIncome) return 'Other Income';
    switch ((mt || '').toLowerCase()) {
      case 'fuel':
      case 'transport':
        return 'Transportation';
      case 'grocery':
      case 'restaurant':
        return 'Food & Dining';
      case 'telecom':
      case 'utilities':
        return 'Bills & Utilities';
      case 'ecommerce':
        return 'Shopping';
      case 'healthcare':
        return 'Healthcare';
      case 'entertainment':
        return 'Entertainment';
      case 'education':
        return 'Education';
      case 'travel':
        return 'Travel';
      case 'personal_transfer':
        return 'Personal Care';
      default:
        return 'Other';
    }
  }

  // Check if API key is configured
  isConfigured(): boolean {
    return !!this.apiKey && /^gsk_/.test(this.apiKey);
  }

  // Get usage stats (if needed)
  getStats() {
    return {
      configured: this.isConfigured(),
      provider: 'Groq (llama3-8b-8192)',
      fallbackEnabled: true
    };
  }
}

// Export singleton instance
export const aiCategorizer = new AICategorizer();

// Export types
export type { TransactionData, CategoryResult };
