import { Endpoint } from '../../types/index.js';

export interface DocumentParser {
  canHandle(filePath: string): boolean;
  parse(filePath: string): Promise<ParsedDocument>;
}

export interface ParsedDocument {
  title: string;
  content: string;
  endpoints?: Endpoint[];
  metadata: Record<string, any>;
  type: 'swagger' | 'pdf' | 'excel' | 'word' | 'text' | 'confluence';
}