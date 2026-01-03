import mammoth from 'mammoth';
import path from 'path';
import { DocumentParser, ParsedDocument } from './DocumentParser.js';

export class WordParser implements DocumentParser {
  canHandle(filePath: string): boolean {
    return /\.docx?$/i.test(filePath);
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    const result = await mammoth.extractRawText({ path: filePath });
    
    return {
      title: path.basename(filePath),
      content: result.value,
      metadata: { 
        messages: result.messages,
        source: filePath
      },
      type: 'word'
    };
  }
}