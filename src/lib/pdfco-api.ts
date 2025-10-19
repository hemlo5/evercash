const PDFCO_API_KEY = 'vaishumaniket@gmail.com_LDxGg4x0qyUSjlGgDI4Egzax56gO6334Pd4YQ6MRNrceUTmZ92d4ftmaVvdxbAh6';

const PDFCO_BASE_URL = 'https://api.pdf.co/v1';

async function getPdfPageCount(file: File): Promise<number> {
  try {
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder('latin1').decode(buffer);
    const regex = /\/Type\s*\/Page\b/g;
    let count = 0;
    while (regex.exec(text)) {
      count++;
    }
    return count || 1;
  } catch {
    return 1;
  }
}

async function uploadToPdfco(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${PDFCO_BASE_URL}/file/upload`, {
    method: 'POST',
    headers: {
      'x-api-key': PDFCO_API_KEY,
    },
    body: form,
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PDF.co upload failed: ${res.status} ${t}`);
  }

  const data = await res.json();
  if (!data || (!data.url && !data.body && !data.fileUrl)) {
    throw new Error('PDF.co upload: unexpected response');
  }
  return data.url || data.fileUrl || data.body; // return a URL
}

async function splitByRanges(sourceUrl: string, pagesPattern: string): Promise<string[]> {
  const res = await fetch(`${PDFCO_BASE_URL}/pdf/split`, {
    method: 'POST',
    headers: {
      'x-api-key': PDFCO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: sourceUrl,
      inline: false,
      pages: pagesPattern,
      name: 'split.pdf',
      async: false,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PDF.co split failed: ${res.status} ${t}`);
  }
  const data = await res.json();
  if (Array.isArray(data.urls)) return data.urls as string[];
  if (data.url) return [data.url];
  throw new Error('PDF.co split: unexpected response');
}

function buildPagesPattern(pageCount: number, maxPer: number): string {
  const parts: string[] = [];
  for (let start = 1; start <= pageCount; start += maxPer) {
    const end = Math.min(start + maxPer - 1, pageCount);
    parts.push(`${start}-${end}`);
  }
  return parts.join(',');
}

export async function splitPdfIfNeeded(file: File, maxPagesPerFile = 5): Promise<File[]> {
  const pageCount = await getPdfPageCount(file);
  if (pageCount <= maxPagesPerFile) return [file];

  const sourceUrl = await uploadToPdfco(file);
  const pattern = buildPagesPattern(pageCount, maxPagesPerFile);
  const urls = await splitByRanges(sourceUrl, pattern);

  const files: File[] = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to download split file ${i + 1}: ${res.status}`);
    }
    const blob = await res.blob();
    const part = new File([blob], `${file.name.replace(/\.pdf$/i, '')}-part-${i + 1}.pdf`, { type: 'application/pdf' });
    files.push(part);
  }
  return files;
}
