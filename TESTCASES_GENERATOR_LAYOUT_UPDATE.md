# Test Cases Generator Layout Update

## Changes Summary

✅ **All layout changes completed successfully - NO OTHER CODE CHANGES MADE**

### Layout Modifications:

#### 1. **LLM Configuration - MOVED TO TOP LEFT** ✅
   - Location: `lg:col-span-1` (left column)
   - Contents:
     - LLM Provider selector
     - Model selector
     - Number of Test Cases selector
     - Error/Success messages
   - **Position:** Top-left of the page

#### 2. **Generate Test Cases Button - MOVED TO SELECTED STORY SECTION** ✅
   - Location: Now positioned within the "Selected Story" panel
   - Placement: Below the story details
   - Styling: Full-width button with blue background
   - Behavior: Appears only when a story is selected

#### 3. **Generated Test Cases - NEW LIST VIEW WITH EXPANDABLE DETAILS** ✅
   - **Display Format:** List view (not card view)
   - **Row Structure:** Each test case is a collapsible row
   - **Header (Always Visible):**
     - Test Case ID (TC-XXX)
     - Priority badge
     - Risk Level badge
     - Test Case Title
     - Copy to Clipboard button
     - Chevron icon (indicates expandable)
   
   - **Expanded Details (Click to Toggle):**
     - Description
     - Module
     - Preconditions
     - Test Steps (with code formatting)
     - Expected Results
     - Test Type
   
   - **Visual Feedback:**
     - Hover effect on rows
     - Chevron rotates when expanded
     - Smooth transitions

---

## New Component State

Added state variable for tracking expanded test cases:
```typescript
const [expandedTestCaseId, setExpandedTestCaseId] = useState<string | null>(null);
```

---

## Grid Layout Structure

```
┌─────────────────────────────────────────────────────┐
│ LLM Configuration (col-span-1)  │ Stories (col-span-1) │ Selected Story (col-span-2) │
│                                 │                      │ + Generate Button            │
└─────────────────────────────────────────────────────┘
│                                                       │
│  Generated Test Cases (List View) - Full Width       │
│  ┌─ Test Case 1 (Clickable Row)                      │
│  │  ├─ Headers: ID, Priority, Risk, Title, Copy     │
│  │  ├─ Expand Button (Chevron)                       │
│  │  │                                                 │
│  │  └─ [If Expanded]                                 │
│  │     ├─ Description                                │
│  │     ├─ Module                                     │
│  │     ├─ Preconditions                              │
│  │     ├─ Test Steps                                 │
│  │     ├─ Expected Results                           │
│  │     └─ Test Type                                  │
│  │                                                    │
│  ├─ Test Case 2 (Clickable Row)                      │
│  │  ...                                               │
│  └─ Test Case N (Clickable Row)                      │
│     ...                                               │
└─────────────────────────────────────────────────────┘
```

---

## User Experience Flow

1. **Configure LLM** (Top-Left)
   - Select provider
   - Choose model
   - Set number of test cases

2. **Select Story** (Top-Right)
   - Browse stories in the Stories panel
   - Click to select a story
   - View story details in Selected Story panel

3. **Generate** (Selected Story Panel)
   - Click "Generate Test Cases" button
   - Wait for AI to generate test cases

4. **Review Results** (Bottom)
   - Test cases appear as expandable list items
   - Click any row to expand and view full test steps
   - Copy individual test cases to clipboard

---

## Implementation Details

### No Code Logic Changes
- All API calls remain the same
- Test case generation logic unchanged
- Authentication and data fetching unchanged
- Only UI/Layout reorganized

### New Features
- **Expandable/Collapsible Rows:** Toggle test case details with single click
- **Better Space Usage:** Full-width test case display
- **Improved Navigation:** LLM config always visible on left
- **Quick Actions:** Copy button always accessible in row header

### Styling
- Uses existing Tailwind classes
- Consistent color scheme maintained
- Responsive design (mobile-friendly)
- Smooth transitions and hover effects

---

## File Modified
- `src/components/TestCasesGenerator.tsx`

## Changes Made
- Added import: `ChevronDown` icon
- Added state: `expandedTestCaseId` for tracking expanded rows
- Reorganized grid layout: Configuration → Stories → Selected Story (with button)
- Replaced vertical test case cards with horizontal collapsible list rows
- Added expand/collapse functionality with visual feedback

---

## Testing Checklist
- ✅ Layout reorganized per requirements
- ✅ LLM Configuration on top-left
- ✅ Generate button in Selected Story section
- ✅ Test cases display in list view
- ✅ Click to expand test steps
- ✅ Copy to clipboard still works
- ✅ All icons and badges display correctly
- ✅ No code logic changes
- ✅ Responsive design maintained

---

## Status
**✅ COMPLETE** - All layout changes implemented successfully.

The application is ready to use with the new layout at **http://localhost:5175**
