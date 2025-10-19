// Direct categorization bypass - manually update transactions
import { aiCategorizer } from './ai-categorizer';

export async function directCategorizeAll(api: any, transactions: any[]) {
  console.log('🔍 Direct categorization starting...');
  console.log('📊 Total transactions received:', transactions.length);
  console.log('📋 Transaction sample:', transactions.slice(0, 3));
  
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];
    
    console.log(`\n🔍 Processing transaction ${i + 1}/${transactions.length}:`);
    console.log('  ID:', transaction.id);
    console.log('  Payee:', transaction.payee);
    console.log('  Current Category:', transaction.category);
    console.log('  Amount:', transaction.amount);
    
    // Skip if already has a meaningful category
    if (transaction.category && 
        transaction.category !== 'Other' && 
        transaction.category !== 'Uncategorized' &&
        transaction.category !== '' &&
        transaction.category !== null) {
      console.log('  ⏭️ Skipping - already categorized');
      skipped++;
      continue;
    }
    
    try {
      // Prepare transaction for AI
      const transactionData = {
        description: transaction.payee || transaction.description || 'Unknown',
        amount: transaction.amount || 0,
        date: transaction.date || new Date().toISOString().split('T')[0]
      };
      
      console.log('  🤖 Sending to AI:', transactionData);
      
      // Get AI category
      const aiResult = await aiCategorizer.categorizeTransaction(transactionData);
      console.log('  🎯 AI Result:', aiResult);
      
      if (aiResult.confidence > 0.5) {
        console.log(`  🔄 Updating with category: ${aiResult.category}`);
        
        // Try the update
        try {
          await api.updateTransaction(transaction.id, {
            category: aiResult.category
          });
          
          console.log('  ✅ Update successful!');
          updated++;
        } catch (updateError) {
          console.error('  ❌ Update failed:', updateError);
          errors++;
        }
      } else {
        console.log('  ⏭️ Skipping - low confidence');
        skipped++;
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`  ❌ Error processing transaction:`, error);
      errors++;
    }
  }
  
  console.log(`\n🎉 Direct categorization complete!`);
  console.log(`📊 Results: ${updated} updated, ${skipped} skipped, ${errors} errors`);
  
  return { updated, skipped, errors };
}

// Make it available globally
declare global {
  interface Window {
    directCategorizeAll: (api: any, transactions: any[]) => Promise<any>;
  }
}

if (typeof window !== 'undefined') {
  window.directCategorizeAll = directCategorizeAll;
}
