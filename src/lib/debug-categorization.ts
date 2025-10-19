// Debug categorization - run this in console to test
import { aiCategorizer } from './ai-categorizer';

export async function debugCategorization() {
  console.log('🔍 Testing AI categorization with your actual transaction patterns...');
  
  const testTransactions = [
    { description: 'UPI - BPPETROL', amount: -75.00, date: '2024-10-13' },
    { description: 'UPI - MYJIO', amount: -299.00, date: '2024-10-13' },
    { description: 'UPI - MRS PUJA', amount: -590.00, date: '2024-10-13' },
    { description: 'UPI - AMRUTAV', amount: -3000.00, date: '2024-10-13' },
    { description: 'UPI - ZEBABANO', amount: -150.00, date: '2024-10-13' },
    { description: 'UPI - PREMCHAN', amount: -200.00, date: '2024-10-13' }
  ];
  
  console.log('📊 Testing categorization for your UPI transactions:');
  
  for (const tx of testTransactions) {
    try {
      const result = await aiCategorizer.categorizeTransaction(tx);
      console.log(`🎯 "${tx.description}" → ${result.category} (${Math.round(result.confidence * 100)}% confidence)`);
      console.log(`   💡 Reasoning: ${result.reasoning}`);
    } catch (error) {
      console.error(`❌ Error categorizing "${tx.description}":`, error);
    }
  }
  
  console.log('✅ Categorization test complete!');
}

// Make it available globally
declare global {
  interface Window {
    debugCategorization: () => Promise<void>;
  }
}

if (typeof window !== 'undefined') {
  window.debugCategorization = debugCategorization;
}
