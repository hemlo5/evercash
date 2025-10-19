// Bulk categorization for existing transactions
import { aiCategorizer } from './ai-categorizer';

export interface BulkCategorizationResult {
  updated: number;
  skipped: number;
  errors: number;
  results: Array<{
    id: string;
    description: string;
    oldCategory: string;
    newCategory: string;
    confidence: number;
  }>;
}

export async function bulkCategorizeTransactions(
  transactions: any[],
  api: any,
  onProgress?: (current: number, total: number) => void
): Promise<BulkCategorizationResult> {
  const result: BulkCategorizationResult = {
    updated: 0,
    skipped: 0,
    errors: 0,
    results: []
  };

  console.log(`🤖 Starting bulk categorization of ${transactions.length} transactions...`);

  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];
    
    console.log(`\n🔄 Processing transaction ${i + 1}/${transactions.length}:`);
    console.log('📋 Transaction object:', transaction);
    
    try {
      // Check if already categorized - but now we include "Other Income" as needing re-categorization
      const needsRecategorization = !transaction.category || 
                                   transaction.category === 'Other' || 
                                   transaction.category === 'Uncategorized' ||
                                   transaction.category === 'Other Income' ||
                                   transaction.category === '';
      
      console.log(`🎯 Category check: "${transaction.category}" - Needs recategorization: ${needsRecategorization}`);
      
      if (!needsRecategorization) {
        console.log('⏭️ Skipping - already has good category');
        result.skipped++;
        continue;
      }

      // Prepare transaction data for AI
      const transactionData = {
        description: transaction.payee || transaction.description || 'Unknown Transaction',
        amount: transaction.amount || 0,
        date: transaction.date || new Date().toISOString().split('T')[0]
      };
      
      console.log('🤖 Prepared transaction data for AI:', transactionData);

      // Get AI categorization
      console.log('🚀 Calling AI categorizer...');
      const aiResult = await aiCategorizer.categorizeTransaction(transactionData);
      console.log('✅ AI categorizer returned:', aiResult);
      
      console.log(`🔍 Transaction ${i+1}/${transactions.length}:`, {
        id: transaction.id,
        description: transactionData.description,
        currentCategory: transaction.category,
        aiCategory: aiResult.category,
        confidence: aiResult.confidence
      });
      
      // Only update if confidence is reasonable (lowered threshold for better results)
      console.log(`🎯 AI Result for "${transactionData.description}": ${aiResult.category} (${Math.round(aiResult.confidence * 100)}% confidence)`);
      
      if (aiResult.confidence > 0.3) { // Lowered from 0.5 to 0.3
        try {
          // Update the transaction
          console.log(`🔄 Attempting to update transaction:`);
          console.log(`   - Transaction ID: ${transaction.id}`);
          console.log(`   - New Category: ${aiResult.category}`);
          console.log(`   - API object:`, api);
          
          const updateResult = await api.updateTransaction(transaction.id, {
            category: aiResult.category
          });
          
          console.log(`✅ Update successful! Result:`, updateResult);

          result.results.push({
            id: transaction.id,
            description: transactionData.description,
            oldCategory: transaction.category || 'Uncategorized',
            newCategory: aiResult.category,
            confidence: aiResult.confidence
          });

          result.updated++;
          console.log(`✅ Updated: "${transactionData.description}" → ${aiResult.category} (${Math.round(aiResult.confidence * 100)}%)`);
        } catch (updateError) {
          console.error(`❌ Failed to update transaction ${transaction.id}:`, updateError);
          result.errors++;
        }
      } else {
        result.skipped++;
        console.log(`⏭️ Skipped: "${transactionData.description}" (confidence too low: ${Math.round(aiResult.confidence * 100)}% < 30%)`);
      }

      // Progress callback
      if (onProgress) {
        onProgress(i + 1, transactions.length);
      }

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`❌ Error categorizing transaction ${transaction.id}:`, error);
      result.errors++;
    }
  }

  console.log(`🎉 Bulk categorization complete: ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors`);
  return result;
}
