import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';

/**
 * Prompt Templates for Test Generation
 */

export const TEST_GENERATION_SYSTEM_PROMPT = `# API TEST CASE GENERATION (ICEPOT Framework)

## INSTRUCTION
Generate comprehensive API test cases for the given endpoint using retrieved documentation context. Each test must:
- Include 5-8 detailed, numbered test steps
- Define measurable expected results
- Cover positive, negative, and edge cases
- Validate API contracts (request/response schemas)
- Reference source documentation

## CONTEXT
API documentation database with endpoint specifications, error scenarios, and examples.
API entities: endpoints, parameters, schemas, status codes, authentication.

## EXAMPLES
Study the retrieved API documentation below for format, terminology, and test structure.

## PERSONA
Senior API Test Engineer with expertise in OpenAPI specifications, contract testing, and API security.

## OUTPUT
You MUST respond ONLY with valid JSON. No markdown, no explanations, no code blocks. Just pure JSON following the newTestCases schema exactly.

## TONE
Professional, technical. Use precise API terminology. Measurable assertions. Security awareness.`;

export const TEST_GENERATION_HUMAN_PROMPT = `### ENDPOINT FOR TEST GENERATION:
{endpoint_context}

### RAG DOCUMENTATION CONTEXT:
{related_docs}

### TEST REQUIREMENTS:
- Test Type: {test_type}
- Focus Area: {focus_area}
- Priority: {priority}
- Count: {count} test cases

### REQUIRED OUTPUT FORMAT:
Respond with valid JSON only. Follow this exact schema:

{{
  "analysis": {{
    "endpointTitle": "string",
    "module": "string",
    "existingCoverageCount": 0,
    "gapsIdentified": ["string"]
  }},
  "newTestCases": [{{
    "testCaseId": "TC_001",
    "module": "Users",
    "testCaseTitle": "string",
    "testCaseDescription": "string",
    "preconditions": "string",
    "testSteps": "1. Step\\r\\n2. Step\\r\\n3. Step",
    "expectedResults": "string",
    "priority": "P1",
    "testType": "Functional",
    "riskLevel": "High",
    "linkedUserStories": ["string"],
    "sourceCitations": ["string"],
    "complianceNotes": "string",
    "estimatedExecutionTime": "string"
  }}],
  "rationale": [{{"testCaseId": "string", "reason": "string"}}],
  "recommendations": "string"
}}`;

export const FILTER_GENERATION_SYSTEM_PROMPT = `You are an expert at analyzing API test cases and filtering them based on relevance and importance.

Your task is to:
1. Evaluate test relevance to the specified criteria
2. Prioritize critical tests for contract validation
3. Identify potential flaky tests or redundant scenarios
4. Suggest test consolidation opportunities

Be concise and data-driven in your analysis.`;

export const FILTER_GENERATION_HUMAN_PROMPT = `Analyze these generated test cases and apply filters based on the criteria:

## Test Cases Generated
{test_cases}

## Filter Criteria
{criteria}

## Selection Criteria
- Relevance score (0-1)
- Risk level (critical/high/medium/low)
- Execution time impact
- Coverage value

Return a prioritized list with your reasoning for each selection.`;

/**
 * Create test generation prompt template
 */
export function createTestGenerationPrompt(): ChatPromptTemplate {
  const system = SystemMessagePromptTemplate.fromTemplate(TEST_GENERATION_SYSTEM_PROMPT);
  const human = HumanMessagePromptTemplate.fromTemplate(TEST_GENERATION_HUMAN_PROMPT);
  
  return ChatPromptTemplate.fromMessages([system, human]);
}

/**
 * Create test filtering prompt template
 */
export function createFilteringPrompt(): ChatPromptTemplate {
  const system = SystemMessagePromptTemplate.fromTemplate(FILTER_GENERATION_SYSTEM_PROMPT);
  const human = HumanMessagePromptTemplate.fromTemplate(FILTER_GENERATION_HUMAN_PROMPT);
  
  return ChatPromptTemplate.fromMessages([system, human]);
}

/**
 * Create swagger parsing prompt
 */
export const SWAGGER_ANALYSIS_PROMPT = `Analyze this OpenAPI/Swagger specification and extract:
1. All endpoints with their methods
2. Required and optional parameters
3. Request/response schemas
4. Error codes and their meanings
5. Authentication requirements

Provide structured output that can be used for test generation.`;

/**
 * Create assertion generation prompt
 */
export const ASSERTION_GENERATION_PROMPT = `Based on the API specification, generate specific test assertions for this scenario:

Endpoint: {endpoint}
Test Scenario: {scenario}
Expected Status: {expected_status}
Response Schema: {schema}

Generate assertions in JavaScript/Playwright syntax that verify:
1. Status code matches
2. Response body matches schema
3. Required fields are present
4. Data types are correct
5. Business logic constraints`;
