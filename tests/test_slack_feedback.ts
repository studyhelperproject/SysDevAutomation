import { formatSlackReply } from '../src/index.js';
import { GeminiAnalysisResult } from '../src/types.js';

const mockIssueUrl = 'https://github.com/owner/repo/issues/1';

const testCases = [
  {
    name: 'Clear Feature Request',
    result: {
      action: 'create',
      category: '[Feature]',
      title: 'Add login',
      description: 'Add Google login',
      acceptance_criteria: 'Given...',
      is_ambiguous: false,
      missing_info: []
    } as GeminiAnalysisResult,
    expectedContains: [
      'GitHub Issue created: https://github.com/owner/repo/issues/1',
      'Category: [Feature]'
    ],
    expectedNotContains: ['Missing Information']
  },
  {
    name: 'Ambiguous Clarify Request',
    result: {
      action: 'create',
      category: '[Clarify]',
      title: 'Vague request',
      description: 'Something vague',
      acceptance_criteria: '',
      is_ambiguous: true,
      missing_info: ['What is the goal?', 'Who is the user?']
    } as GeminiAnalysisResult,
    expectedContains: [
      'GitHub Issue created: https://github.com/owner/repo/issues/1',
      'Category: [Clarify]',
      '*Missing Information / Questions:*',
      '- What is the goal?',
      '- Who is the user?'
    ]
  },
  {
    name: 'Dependency Request',
    result: {
      action: 'create',
      category: '[Dependency]',
      title: 'Need API Key',
      description: 'Need Stripe API key',
      acceptance_criteria: '',
      is_ambiguous: false,
      missing_info: ['Please provide the production API key']
    } as GeminiAnalysisResult,
    expectedContains: [
      'GitHub Issue created: https://github.com/owner/repo/issues/1',
      'Category: [Dependency]',
      '*Missing Information / Questions:*',
      '- Please provide the production API key'
    ]
  },
  {
    name: 'Update Request',
    result: {
      action: 'update',
      category: '[Feature]',
      title: 'Updated login',
      description: 'Updated Google login',
      acceptance_criteria: 'Given...',
      is_ambiguous: false,
      missing_info: []
    } as GeminiAnalysisResult,
    expectedContains: [
      'GitHub Issue updated: https://github.com/owner/repo/issues/1',
      'Category: [Feature]'
    ]
  },
  {
    name: 'Comment Request',
    result: {
      action: 'comment',
      category: '[Feature]',
      title: 'Add login',
      description: 'Comment text',
      acceptance_criteria: '',
      is_ambiguous: false,
      missing_info: []
    } as GeminiAnalysisResult,
    expectedContains: [
      'GitHub Issue commented on: https://github.com/owner/repo/issues/1',
      'Category: [Feature]'
    ]
  }
];

function runTests() {
  console.log('Starting formatSlackReply tests...');
  let anyFailed = false;
  testCases.forEach(tc => {
    console.log(`Running test: ${tc.name}`);
    const actual = formatSlackReply(tc.result, mockIssueUrl);
    let failed = false;

    tc.expectedContains.forEach(expected => {
      if (!actual.includes(expected)) {
        console.error(`  ❌ Failed: Expected to contain "${expected}"`);
        failed = true;
      }
    });

    if (tc.expectedNotContains) {
      tc.expectedNotContains.forEach(notExpected => {
        if (actual.includes(notExpected)) {
          console.error(`  ❌ Failed: Expected NOT to contain "${notExpected}"`);
          failed = true;
        }
      });
    }

    if (!failed) {
      console.log(`  ✅ Passed`);
    } else {
      console.error(`     Actual: "${actual}"`);
      anyFailed = true;
    }
  });

  if (anyFailed) {
    process.exit(1);
  } else {
    console.log('\nAll formatSlackReply tests passed!');
    process.exit(0);
  }
}

runTests();
