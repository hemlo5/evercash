import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Trash2, Calendar, HardDrive } from "lucide-react";
import { toast } from "sonner";

interface SavedFile {
  name: string;
  type: string;
  size: number;
  data: string;
  uploadDate: string;
}

export function SavedFiles() {
  const [savedFiles, setSavedFiles] = useState<SavedFile[]>([]);

  useEffect(() => {
    loadSavedFiles();
  }, []);

  const loadSavedFiles = () => {
    try {
      const files = JSON.parse(localStorage.getItem('uploaded-files') || '[]');
      setSavedFiles(files);
    } catch (error) {
      console.error('Error loading saved files:', error);
    }
  };

  const downloadFile = (file: SavedFile) => {
    try {
      const link = document.createElement('a');
      link.href = file.data;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloaded ${file.name}`);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const deleteFile = (fileName: string) => {
    try {
      const updatedFiles = savedFiles.filter(f => f.name !== fileName);
      setSavedFiles(updatedFiles);
      localStorage.setItem('uploaded-files', JSON.stringify(updatedFiles));
      toast.success(`Deleted ${fileName}`);
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (savedFiles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Saved Files
          </CardTitle>
          <CardDescription>
            Your uploaded files are saved in browser storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No files saved yet. Upload a PDF or CSV to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="w-5 h-5" />
          Saved Files ({savedFiles.length})
        </CardTitle>
        <CardDescription>
          Files saved in your browser storage (last 10 files)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {savedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium">{file.name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {new Date(file.uploadDate).toLocaleDateString()}
                    <span>•</span>
                    <span>{formatFileSize(file.size)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {file.type.includes('pdf') ? 'PDF' : 'CSV'}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadFile(file)}
                  className="h-8 w-8 p-0"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteFile(file.name)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            💡 <strong>Tip:</strong> Files are saved in your browser's local storage. 
            They'll persist until you clear browser data or manually delete them.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
