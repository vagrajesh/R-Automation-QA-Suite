import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { DocumentParser, ParsedDocument } from './DocumentParser.js';

export class TextParser implements DocumentParser {
  canHandle(filePath: string): boolean {
    const isUrl = filePath.startsWith('http://') || filePath.startsWith('https://');
    if (isUrl) {
      return /\.(txt|md|json)$/i.test(filePath);
    }
    return /\.(txt|md|json)$/i.test(filePath);
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    const isUrl = filePath.startsWith('http://') || filePath.startsWith('https://');
    
    let content: string;
    let title: string;
    
    if (isUrl) {
      const response = await axios.get(filePath);
      content = response.data;
      title = filePath.split('/').pop() || 'URL Document';
    } else {
      content = fs.readFileSync(filePath, 'utf-8');
      title = path.basename(filePath);
    }
    
    return {
      title,
      content,
      metadata: { 
        encoding: 'utf-8',
        source: filePath
      },
      type: 'text'
    };
  }
}