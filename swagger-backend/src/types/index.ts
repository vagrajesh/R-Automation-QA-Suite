/**
 * Common Type Definitions
 */

export interface Endpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  summary?: string;
  description?: string;
  parameters: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  tags: string[];
  operationId?: string;
  deprecated?: boolean;
}

export interface Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required: boolean;
  schema: SchemaObject;
  example?: any;
}

export interface RequestBody {
  required: boolean;
  content: Record<string, MediaType>;
}

export interface MediaType {
  schema: SchemaObject;
  example?: any;
}

export interface SchemaObject {
  type?: string;
  format?: string;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  items?: SchemaObject;
  enum?: any[];
  default?: any;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  example?: any;
}

export interface Response {
  description: string;
  content?: Record<string, MediaType>;
  headers?: Record<string, any>;
}

export interface RAGDocument {
  _id?: string;
  type: 'endpoint' | 'schema' | 'example' | 'error-code';
  title: string;
  content: string;
  endpoint?: string;
  method?: string;
  tags?: string[];
  embedding?: number[];
  contentHash?: string;
  metadata: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TestCase {
  _id?: string;
  name: string;
  description?: string;
  endpoint: string;
  method: string;
  endpoint_id?: string;
  tags?: string[];
  
  request: {
    path?: string;
    query?: Record<string, any>;
    headers?: Record<string, string>;
    body?: any;
  };
  
  expected: {
    statusCode: number;
    bodySchema?: SchemaObject;
    headers?: Record<string, string>;
  };

  assertions?: string[];
  testSteps?: string;
  sourceCitations?: string[];
  
  testType: 'happy-path' | 'error-scenario' | 'edge-case' | 'contract';
  priority: 'critical' | 'high' | 'medium' | 'low';
  
  generated: boolean;
  generatedBy?: string; // LLM provider used
  confidence?: number;
  
  createdAt?: Date;
  lastRunAt?: Date;
  lastRunResult?: 'pass' | 'fail' | 'skip';
}

export interface ExecutionResult {
  testId: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  duration: number;
  error?: string;
  assertion?: string;
  timestamp: Date;
}

export interface TestReport {
  generatedAt: Date;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: ExecutionResult[];
  coverage?: {
    endpoints: number;
    methods: number;
    percentage: number;
  };
  summary: string;
}

export interface SwaggerIngestionJob {
  jobId: string;
  status: 'in-progress' | 'completed' | 'failed';
  specFile: string;
  specUrl?: string;
  endpointsFound: number;
  documentsCreated: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}
