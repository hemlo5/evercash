import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Key, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { aiCategorizer } from '@/lib/ai-categorizer';
import { toast } from 'sonner';

export function AICategorySettings() {
  const [apiKey, setApiKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [hfToken, setHfToken] = useState('');
  const [hfConfigured, setHfConfigured] = useState(false);
  const [provider, setProvider] = useState<'auto' | 'huggingface' | 'groq' | 'fina'>('auto');
  const anyConfigured = isConfigured || hfConfigured || provider === 'fina';

  useEffect(() => {
    setIsConfigured(aiCategorizer.isConfigured());
    if (aiCategorizer.isConfigured()) {
      setApiKey('sk-***************************'); // Masked display
    }
    try {
      const saved = localStorage.getItem('hf_api_token');
      if (saved) {
        setHfToken('hf-***************************');
        setHfConfigured(true);
      }
    } catch {}
    try {
      const p = localStorage.getItem('ai_provider') as any;
      if (p === 'auto' || p === 'huggingface' || p === 'groq' || p === 'fina') setProvider(p);
    } catch {}
  }, []);

  const handleSaveApiKey = async () => {
    if (!apiKey || apiKey.startsWith('sk-***')) {
      toast.error('Please enter a valid API key');
      return;
    }

    try {
      aiCategorizer.setApiKey(apiKey);
      setIsConfigured(true);
      toast.success('AI categorization enabled! 🎉');
      
      // Test the API key
      await testApiKey();
    } catch (error) {
      toast.error('Failed to save API key');
      console.error('API key save error:', error);
    }
  };

  const testApiKey = async () => {
    setIsTesting(true);
    try {
      const testTransaction = {
        description: 'UPI - ZOMATO',
        amount: -25.50,
        date: new Date().toISOString().split('T')[0]
      };

      const result = await aiCategorizer.categorizeTransaction(testTransaction);
      
      if (result.confidence > 0.5) {
        toast.success(`✅ AI Test: "${testTransaction.description}" → ${result.category} (${Math.round(result.confidence * 100)}% confidence)`);
      } else {
        toast.warning('⚠️ API key works but low confidence. Check your key.');
      }
    } catch (error) {
      toast.error('❌ API key test failed. Please check your key.');
      console.error('API test error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveHfToken = async () => {
    if (!hfToken || hfToken.startsWith('hf-***')) {
      toast.error('Please enter a valid Hugging Face token');
      return;
    }
    try {
      aiCategorizer.setHfToken(hfToken);
      setHfConfigured(true);
      toast.success('Hugging Face enabled! 🎯');
      await testApiKey();
    } catch (e) {
      toast.error('Failed to save Hugging Face token');
    }
  };

  const handleRemoveHfToken = () => {
    try {
      aiCategorizer.setHfToken('');
      setHfToken('');
      setHfConfigured(false);
      toast.info('Hugging Face disabled');
    } catch {}
  };

  const handleRemoveApiKey = () => {
    localStorage.removeItem('groq_api_key');
    setApiKey('');
    setIsConfigured(false);
    toast.info('AI categorization disabled');
  };

  const handleSaveProvider = () => {
    aiCategorizer.setProvider(provider);
    toast.success(`Provider set to ${provider}`);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 flex-shrink-0" />
            <CardTitle className="text-base sm:text-lg leading-tight">
              <span className="hidden sm:inline">AI Transaction Categorization</span>
              <span className="sm:hidden">AI Categorization</span>
            </CardTitle>
          </div>
          {anyConfigured && (
            <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              Active
            </Badge>
          )}
        </div>
        <CardDescription className="text-sm leading-relaxed mt-2">
          <span className="hidden sm:inline">Automatically categorize transactions using AI. Prefer Hugging Face BERT if configured, otherwise Groq, else rules.</span>
          <span className="sm:hidden">Auto-categorize with AI. Prefers HF BERT, then Groq, then rules.</span>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4 p-4 sm:p-6">
        {!anyConfigured ? (
          <>
            <div className="bg-blue-50 dark:bg-blue-950/30 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2 sm:gap-3">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 text-sm sm:text-base">Get Your Free API Key</h4>
                  <div className="space-y-1 mt-1">
                    <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                      1. Visit <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" 
                         className="underline hover:no-underline inline-flex items-center gap-1 break-all">
                         console.groq.com <ExternalLink className="w-2 h-2 sm:w-3 sm:h-3 flex-shrink-0" />
                      </a>
                    </p>
                    <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                      2. Sign up free (no card required)
                    </p>
                    <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                      3. Create & paste API key below
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-sm">Groq API Key</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="gsk_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="font-mono text-sm flex-1"
                />
                <Button onClick={handleSaveApiKey} disabled={!apiKey} className="w-full sm:w-auto">
                  <Key className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                  <span className="text-green-800 dark:text-green-200 font-medium text-sm sm:text-base truncate">
                    <span className="hidden sm:inline">AI Categorization Enabled</span>
                    <span className="sm:hidden">AI Enabled</span>
                  </span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={testApiKey}
                    disabled={isTesting}
                    className="text-xs px-3 py-1 h-8"
                  >
                    {isTesting ? 'Testing...' : 'Test API'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRemoveApiKey}
                    className="text-red-600 hover:text-red-700 text-xs px-3 py-1 h-8"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs sm:text-sm">Provider</p>
                <p className="font-medium text-xs sm:text-sm leading-tight break-words">
                  {provider === 'fina' && (
                    <span className="block">
                      <span className="hidden sm:inline">Fina Money (v3)</span>
                      <span className="sm:hidden">Fina Money</span>
                    </span>
                  )}
                  {provider === 'huggingface' && (
                    <span className="block">
                      <span className="hidden sm:inline">Hugging Face (BERT transaction categorization)</span>
                      <span className="sm:hidden">Hugging Face</span>
                    </span>
                  )}
                  {provider === 'groq' && 'Groq (llama3-8b-8192)'}
                  {provider === 'auto' && (
                    <span className="block">
                      <span className="hidden sm:inline">Auto (Local HF → HF → Groq → Rules)</span>
                      <span className="sm:hidden">Auto</span>
                    </span>
                  )}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs sm:text-sm">Fallback</p>
                <p className="font-medium text-xs sm:text-sm leading-tight">
                  <span className="hidden sm:inline">Rule-based categorization</span>
                  <span className="sm:hidden">Rule-based</span>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-2">
          <Label htmlFor="provider" className="text-sm">Provider Selection</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              id="provider"
              className="border rounded px-2 py-2 text-sm flex-1 bg-background"
              value={provider}
              onChange={(e) => setProvider(e.target.value as any)}
            >
              <option value="auto">Auto (Local HF → HF → Groq → Rules)</option>
              <option value="huggingface">Hugging Face (Local/Remote)</option>
              <option value="groq">Groq</option>
              <option value="fina">Fina Money</option>
            </select>
            <Button onClick={handleSaveProvider} className="w-full sm:w-auto text-sm px-4 py-2">
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="hidden sm:inline">Auto tries Local BERT first (fast, no tokens), then Hugging Face, then Groq, then rules.</span>
            <span className="sm:hidden">Auto tries local BERT first, then fallbacks.</span>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hfToken" className="text-sm">
            <span className="hidden sm:inline">Hugging Face Inference Token</span>
            <span className="sm:hidden">HF Token</span>
          </Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="hfToken"
              type="password"
              placeholder="hf_..."
              value={hfToken}
              onChange={(e) => setHfToken(e.target.value)}
              className="font-mono text-sm flex-1"
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveHfToken} disabled={!hfToken} className="flex-1 sm:flex-none text-sm">
                Save
              </Button>
              {hfConfigured && (
                <Button variant="outline" onClick={handleRemoveHfToken} className="text-red-600 flex-1 sm:flex-none text-sm">
                  Remove
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="hidden sm:inline">We prefer Hugging Face BERT if configured; otherwise we fall back to Groq or rules.</span>
            <span className="sm:hidden">Prefers HF BERT, fallback to Groq/rules.</span>
          </p>
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2 text-sm sm:text-base">How it works:</h4>
          <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
            <li>• Analyzes description, amount & date</li>
            <li>• Considers Indian patterns (UPI, NEFT, IMPS)</li>
            <li>• Provides confidence scores</li>
            <li>• Falls back to rules if AI fails</li>
            <li>• Batches to respect rate limits</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
