// Console test for AI categorization
// Run this in browser console: window.testAI()

import { aiCategorizer } from './ai-categorizer';

export async function testAIFromConsole() {
  console.log('🤖 Starting AI categorization test...');
  
  const testTransactions = [
    { description: 'UPI - ZOMATO', amount: -25.50, date: '2024-10-13' },
    { description: 'UPI - BP PETROL', amount: -75.00, date: '2024-10-13' },
    { description: 'UPI - AMRUTAV', amount: -3000.00, date: '2024-10-13' },
    { description: 'NEFT - SALARY CREDIT', amount: 50000.00, date: '2024-10-13' },
    { description: 'UPI - FLIPKART', amount: -150.00, date: '2024-10-13' }
  ];
  
  console.log('📊 Testing with sample transactions:');
  console.table(testTransactions);
  
  for (const tx of testTransactions) {
    try {
      const result = await aiCategorizer.categorizeTransaction(tx);
      console.log(`🎯 "${tx.description}" → ${result.category} (${Math.round(result.confidence * 100)}% confidence)`);
      console.log(`   Reasoning: ${result.reasoning}`);
    } catch (error) {
      console.error(`❌ Failed to categorize "${tx.description}":`, error);
    }
  }
  
  console.log('✅ AI test completed!');
}

// Make it available globally for console testing
declare global {
  interface Window {
    testAI: () => Promise<void>;
  }
}

if (typeof window !== 'undefined') {
  window.testAI = testAIFromConsole;
}
