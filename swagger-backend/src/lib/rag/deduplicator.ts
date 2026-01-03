import { Document } from '@langchain/core/documents';

export interface DeduplicationResult {
  uniqueDocuments: Document[];
  duplicatesRemoved: number;
  similarityThreshold: number;
}

export class DocumentDeduplicator {
  private readonly defaultThreshold = 0.85;

  deduplicate(documents: Document[], threshold: number = this.defaultThreshold): DeduplicationResult {
    if (documents.length <= 1) {
      return {
        uniqueDocuments: documents,
        duplicatesRemoved: 0,
        similarityThreshold: threshold
      };
    }

    const unique: Document[] = [];
    const seen = new Set<string>();
    let duplicatesRemoved = 0;

    for (const doc of documents) {
      const signature = this.generateDocumentSignature(doc);
      
      if (!seen.has(signature)) {
        // Check content similarity with existing unique documents
        const isDuplicate = unique.some(existingDoc => 
          this.calculateSimilarity(doc.pageContent, existingDoc.pageContent) > threshold
        );
        
        if (!isDuplicate) {
          unique.push(doc);
          seen.add(signature);
        } else {
          duplicatesRemoved++;
        }
      } else {
        duplicatesRemoved++;
      }
    }

    return {
      uniqueDocuments: unique,
      duplicatesRemoved,
      similarityThreshold: threshold
    };
  }

  private generateDocumentSignature(doc: Document): string {
    // Create a signature based on content hash and metadata
    const contentHash = this.simpleHash(doc.pageContent.slice(0, 200));
    const source = doc.metadata.source || '';
    const title = doc.metadata.title || '';
    
    return `${contentHash}_${this.simpleHash(source + title)}`;
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Jaccard similarity for quick comparison
    const tokens1 = new Set(this.tokenize(text1));
    const tokens2 = new Set(this.tokenize(text2));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size;
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Remove documents with low information content
  filterLowQuality(documents: Document[], minLength: number = 50): Document[] {
    return documents.filter(doc => {
      const content = doc.pageContent.trim();
      
      // Filter out very short content
      if (content.length < minLength) return false;
      
      // Filter out mostly whitespace or special characters
      const meaningfulChars = content.replace(/[\s\n\r\t]/g, '').length;
      if (meaningfulChars / content.length < 0.3) return false;
      
      // Filter out repetitive content
      const words = this.tokenize(content);
      const uniqueWords = new Set(words);
      if (words.length > 10 && uniqueWords.size / words.length < 0.3) return false;
      
      return true;
    });
  }

  // Merge similar documents to reduce redundancy
  mergeSimilarDocuments(documents: Document[], threshold: number = 0.7): Document[] {
    const merged: Document[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < documents.length; i++) {
      if (processed.has(i)) continue;

      const currentDoc = documents[i];
      const similarDocs = [currentDoc];
      processed.add(i);

      // Find similar documents
      for (let j = i + 1; j < documents.length; j++) {
        if (processed.has(j)) continue;
        
        const similarity = this.calculateSimilarity(
          currentDoc.pageContent, 
          documents[j].pageContent
        );
        
        if (similarity > threshold) {
          similarDocs.push(documents[j]);
          processed.add(j);
        }
      }

      // Merge similar documents
      if (similarDocs.length > 1) {
        const mergedContent = this.mergeDocumentContents(similarDocs);
        const mergedMetadata = this.mergeMetadata(similarDocs);
        
        merged.push(new Document({
          pageContent: mergedContent,
          metadata: mergedMetadata
        }));
      } else {
        merged.push(currentDoc);
      }
    }

    return merged;
  }

  private mergeDocumentContents(docs: Document[]): string {
    // Combine unique sentences from all documents
    const allSentences = new Set<string>();
    
    docs.forEach(doc => {
      const sentences = doc.pageContent.split(/[.!?]+/).map(s => s.trim());
      sentences.forEach(sentence => {
        if (sentence.length > 10) {
          allSentences.add(sentence);
        }
      });
    });
    
    return Array.from(allSentences).join('. ') + '.';
  }

  private mergeMetadata(docs: Document[]): Record<string, any> {
    const merged: Record<string, any> = {};
    const sources = new Set<string>();
    
    docs.forEach(doc => {
      Object.assign(merged, doc.metadata);
      if (doc.metadata.source) {
        sources.add(doc.metadata.source);
      }
    });
    
    merged.sources = Array.from(sources);
    merged.mergedCount = docs.length;
    
    return merged;
  }
}