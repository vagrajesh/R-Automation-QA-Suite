/**
 * Test module index
 */
export { TestGenerator } from './generator.js';
export { TestCaseManager } from './manager.js';
export { TestExecutor } from './executor.js';
export { BaseTestUtils, generatePlaywrightTest } from './utils.js';

import testCaseManager from './manager.js';
import testExecutor from './executor.js';

export default {
  testCaseManager,
  testExecutor
};
