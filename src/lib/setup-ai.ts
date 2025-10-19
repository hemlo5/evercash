// Quick setup script for AI categorization
import { aiCategorizer } from './ai-categorizer';
import { toast } from 'sonner';

export async function setupAIWithKey(apiKey: string) {
  try {
    // Set the API key
    aiCategorizer.setApiKey(apiKey);
    
    console.log('🤖 Setting up AI categorization...');
    
    // Test the API key with a sample transaction
    const testTransaction = {
      description: 'UPI - ZOMATO',
      amount: -25.50,
      date: new Date().toISOString().split('T')[0]
    };

    console.log('🧪 Testing API key with sample transaction...');
    const result = await aiCategorizer.categorizeTransaction(testTransaction);
    
    if (result.confidence > 0.5) {
      console.log(`✅ AI Test Success: "${testTransaction.description}" → ${result.category} (${Math.round(result.confidence * 100)}% confidence)`);
      toast.success(`🎉 AI Categorization Ready! Test: "${testTransaction.description}" → ${result.category}`);
      return true;
    } else {
      console.warn('⚠️ API key works but low confidence');
      toast.warning('⚠️ API key works but giving low confidence results');
      return false;
    }
  } catch (error) {
    console.error('❌ AI setup failed:', error);
    toast.error('❌ AI setup failed. Please check the API key.');
    return false;
  }
}

// Auto-setup function that can be called from console
export async function quickSetup() {
  try {
    let apiKey = localStorage.getItem('groq_api_key') || '';
    if (!apiKey) {
      const entered = typeof window !== 'undefined' ? window.prompt('Enter your Groq API key') : '';
      if (!entered) {
        toast.warning('No API key entered. AI setup skipped.');
        return false;
      }
      apiKey = entered.trim();
      localStorage.setItem('groq_api_key', apiKey);
    }
    return await setupAIWithKey(apiKey);
  } catch (e) {
    console.error('AI quickSetup failed:', e);
    return false;
  }
}
