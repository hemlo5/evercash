import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, DollarSign, CheckCircle } from "lucide-react";
import { formatCurrencyFromDollars } from "@/lib/currency";

interface ImportRecord {
  id: string;
  fileName: string;
  importDate: string;
  transactionCount: number;
  totalAmount: number;
  status: 'success' | 'partial' | 'failed';
}

interface ImportHistoryProps {
  onNewImport?: (record: ImportRecord) => void;
}

export function ImportHistory({ onNewImport }: ImportHistoryProps) {
  const [importHistory, setImportHistory] = useState<ImportRecord[]>([]);
  const [storageKey, setStorageKey] = useState<string>('import-history');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('actual-token');
        if (!token) {
          if (!cancelled) setStorageKey('import-history');
          return;
        }
        const enc = new TextEncoder();
        const hash = await crypto.subtle.digest('SHA-256', enc.encode(token));
        const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
        const uuid = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
        if (!cancelled) setStorageKey(`import-history:${uuid}`);
      } catch {
        if (!cancelled) setStorageKey('import-history');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey) || localStorage.getItem('import-history');
      if (saved) {
        setImportHistory(JSON.parse(saved));
      } else {
        setImportHistory([]);
      }
    } catch (error) {
      console.error('Error loading import history:', error);
      setImportHistory([]);
    }
  }, [storageKey]);

  const addImportRecord = (record: ImportRecord) => {
    const newHistory = [record, ...importHistory].slice(0, 10); // Keep last 10 imports
    setImportHistory(newHistory);
    localStorage.setItem(storageKey, JSON.stringify(newHistory));
    onNewImport?.(record);
  };

  // Expose the addImportRecord function to parent components
  useEffect(() => {
    (window as any).addImportRecord = addImportRecord;
    return () => {
      delete (window as any).addImportRecord;
    };
  }, [importHistory]);

  if (importHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Import History
          </CardTitle>
          <CardDescription>
            Your recent file imports will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No imports yet. Upload a file to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Import History
        </CardTitle>
        <CardDescription>
          Recent file imports and their results
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {importHistory.map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium">{record.fileName}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {new Date(record.importDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-2 mb-1">
                  <Badge 
                    variant={record.status === 'success' ? 'default' : 
                            record.status === 'partial' ? 'secondary' : 'destructive'}
                  >
                    {record.status === 'success' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {record.status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {record.transactionCount} transactions
                </div>
                <div className="text-sm font-medium">
                  {formatCurrencyFromDollars(record.totalAmount)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to create import records
export function createImportRecord(
  fileName: string,
  transactionCount: number,
  successCount: number,
  totalAmount: number
): ImportRecord {
  const status: 'success' | 'partial' | 'failed' = 
    successCount === transactionCount ? 'success' :
    successCount > 0 ? 'partial' : 'failed';

  return {
    id: Date.now().toString(),
    fileName,
    importDate: new Date().toISOString(),
    transactionCount: successCount,
    totalAmount,
    status
  };
}
