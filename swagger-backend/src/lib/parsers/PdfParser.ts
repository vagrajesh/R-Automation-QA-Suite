import fs from 'fs';
import path from 'path';
import { DocumentParser, ParsedDocument } from './DocumentParser.js';

export class PdfParser implements DocumentParser {
  canHandle(filePath: string): boolean {
    return filePath.toLowerCase().endsWith('.pdf');
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    const pdf = await import('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdf.default(buffer);
    
    return {
      title: path.basename(filePath, '.pdf'),
      content: data.text,
      metadata: { 
        pages: data.numpages,
        source: filePath
      },
      type: 'pdf'
    };
  }
}