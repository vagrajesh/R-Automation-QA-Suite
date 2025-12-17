# Test Cases Generation Format Update

## Overview
Updated the TestCasesGenerator component to format test cases in a structured JSON format with organized test data, version information, and detailed test steps.

## New Test Case Format

The generated test cases now follow this comprehensive structure:

```json
{
  "test_cases": [
    {
      "testData": {
        "name": "Test Case Name",
        "short_description": "Brief description",
        "description": "Detailed test case description",
        "test_type": "functional",
        "priority": "High",
        "state": "draft"
      },
      "versionData": {
        "version": "1.0",
        "state": "draft",
        "short_description": "Brief description",
        "description": "Version description",
        "priority": "High"
      },
      "stepsData": [
        {
          "order": 100,
          "step": "Step description",
          "expected_result": "Expected outcome",
          "test_data": "Test data if applicable"
        }
      ]
    }
  ]
}
```

## Updated Interfaces

### TestData
- `name`: Test case name
- `short_description`: Brief one-line description
- `description`: Detailed test case description
- `test_type`: Type of test (functional, integration, regression, smoke)
- `priority`: Priority level (Critical, High, Medium, Low)
- `state`: Current state (draft, ready, deprecated, etc.)

### VersionData
- `version`: Version number (e.g., 1.0, 1.1)
- `state`: Version state (draft, approved, deprecated)
- `short_description`: Brief version description
- `description`: Detailed version information
- `priority`: Version priority

### StepData (Array)
- `order`: Step order number (100, 200, 300, etc.)
- `step`: Step description/action
- `expected_result`: Expected outcome after step execution
- `test_data`: Test data needed for the step (optional)

## UI Display Format

### Main Table View
The test cases are displayed in a tabular format with columns:
- **Expand Button**: Click to view full details
- **Test Case Name**: Name of the test case
- **Description**: Short description
- **Type**: Test type badge (functional, integration, regression, smoke)
- **Priority**: Priority badge (Critical, High, Medium, Low)
- **Version**: Version number
- **State**: Current state
- **Actions**: Copy to clipboard button

### Expandable Details View
When expanded, shows complete information organized in three sections:

#### 1. Test Case Data
- Full name and description
- Test type, priority, and state
- Organized in a grid layout

#### 2. Version Information
- Version number and state
- Version-specific description
- Priority tracking

#### 3. Test Steps (Table Format)
Detailed table with columns:
- **Step #**: Step order number
- **Step Description**: The action to perform
- **Expected Result**: Expected outcome
- **Test Data**: Test data required (if any)

Steps are automatically sorted by order number for correct sequence display.

## LLM Prompt Update

The prompt sent to the LLM now includes detailed requirements for the structured format:

```
Generate test cases in the following JSON format with a "test_cases" array:

{
  "test_cases": [
    {
      "testData": { ... },
      "versionData": { ... },
      "stepsData": [ ... ]
    }
  ]
}

Requirements:
- Each test case must have testData with name, short_description, description, test_type, priority, and state
- Include versionData with version numbering and descriptive information
- Include stepsData array with ordered steps (order field: 100, 200, 300, etc.)
- Each step must have: order, step, expected_result, and test_data fields
- Priority values: "Critical", "High", "Medium", "Low"
- test_type values: "functional", "integration", "regression", "smoke"
- Return valid JSON array within the response
```

## Response Parsing

The LLM response is parsed to extract the test_cases array:

```typescript
const jsonMatch = content.match(/\{[\s\S]*"test_cases"[\s\S]*\}/);
if (!jsonMatch) {
  throw new Error('Could not parse test cases from LLM response');
}

const parsedResponse = JSON.parse(jsonMatch[0]) as { test_cases: Omit<GeneratedTestCase, 'id'>[] };
const testCases = parsedResponse.test_cases;
```

## Color Coding

### Priority Colors
- **Critical**: Red background
- **High**: Orange background
- **Medium**: Yellow background
- **Low**: Green background

### Test Type Colors
- **Functional**: Blue background
- **Integration**: Purple background
- **Regression**: Indigo background
- **Smoke**: Cyan background

## Benefits

1. **Structured Data**: Test cases follow a consistent, hierarchical structure
2. **Complete Information**: Captures test data, version information, and detailed steps
3. **Better Organization**: Separates test metadata from implementation details
4. **Easy Integration**: JSON format compatible with test management systems
5. **Clear Steps**: Ordered test steps with expected results and test data
6. **Version Control**: Tracks test case versions and changes over time

## Component Structure

### File: `src/components/TestCasesGenerator.tsx`

**State Management**:
- `stories`: Array of fetched stories
- `selectedStory`: Currently selected story
- `generatedTestCases`: Array of generated test cases
- `expandedTestCaseId`: ID of currently expanded test case (for details view)
- `selectedProvider`, `selectedModel`: LLM configuration
- `isGenerating`, `error`, `success`: Status messages

**Key Functions**:
- `generateTestCases()`: Generates test cases using LLM
- `copyToClipboard()`: Copies test case JSON to clipboard
- `getPriorityColor()`: Returns CSS classes for priority badge
- `getTestTypeColor()`: Returns CSS classes for test type badge
- `getSourceBadgeColor()`: Returns CSS classes for source badge

## Layout

The component maintains the previously designed layout:

```
┌─────────────────────────────────────────────────┐
│  LLM Configuration  │  Stories  │ Selected Story  │
│    (Top Left)       │   (Left)  │    (Right)      │
│                     │           │                 │
│ - Provider          │ · Story 1 │ Story Details   │
│ - Model             │ · Story 2 │ Buttons         │
│ - Test Count        │ · Story 3 │                 │
│ - Errors/Success    │           │ [Generate Btn]  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│         Generated Test Cases (Full Width)        │
│                                                   │
│  [Expand] Name | Description | Type | Priority  │
│  [Expand] Name | Description | Type | Priority  │
│                                                   │
│  When Expanded:                                 │
│  ├─ Test Case Data (grid view)                  │
│  ├─ Version Information (grid view)              │
│  └─ Test Steps (table view: Step# | Desc | Result) │
└─────────────────────────────────────────────────┘
```

## Testing

To test the new format:

1. Start the application: `npm run dev`
2. Navigate to the Test Cases Generator
3. Select a story from Jira or ServiceNow
4. Click "Generate Test Cases"
5. The LLM will generate test cases in the new structured format
6. Click on any test case row to expand and view full details
7. Use the "Copy" button to copy the entire test case to clipboard

## Files Modified

- `src/components/TestCasesGenerator.tsx`:
  - Updated interfaces (TestData, VersionData, StepData, GeneratedTestCase)
  - Updated LLM prompt template
  - Updated response parsing logic
  - Updated table rendering with new columns and expandable details
  - Added color functions for test type

