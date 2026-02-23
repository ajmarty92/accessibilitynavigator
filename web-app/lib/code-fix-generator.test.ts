import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  generateBasicFixForViolation,
  generateContrastFix,
  generateAriaFix,
  generateFocusFix,
  generateGenericFix
} from './code-fix-generator.ts';
import type { Violation } from './ai-prioritizer.ts';

describe('code-fix-generator basic fixes', () => {
  const mockViolation = (overrides: Partial<Violation>): Violation => ({
    id: 'test-id',
    description: 'test description',
    impact: 'moderate',
    wcagReference: 'WCAG 1.1.1',
    nodes: [{ html: '<div>test</div>' }],
    ...overrides
  });

  describe('generateContrastFix', () => {
    test('should fix color contrast if color style is present', () => {
      const v = mockViolation({ nodes: [{ html: '<div style="color: #ccc;">text</div>' }] });
      const result = generateContrastFix(v);
      assert.strictEqual(result, '<div style="color: #333333;">text</div>');
    });

    test('should return original HTML if no color style is present', () => {
      const v = mockViolation({ nodes: [{ html: '<div>text</div>' }] });
      const result = generateContrastFix(v);
      assert.strictEqual(result, '<div>text</div>');
    });
  });

  describe('generateAriaFix', () => {
    test('should add aria-label to buttons in React', () => {
      const v = mockViolation({ nodes: [{ html: '<button>Click me</button>' }] });
      const result = generateAriaFix(v, 'react');
      assert.strictEqual(result, '<button aria-label="Action button">Click me</button>');
    });

    test('should add aria-label to buttons in other frameworks', () => {
      const v = mockViolation({ nodes: [{ html: '<button>Click me</button>' }] });
      const result = generateAriaFix(v, 'html');
      assert.strictEqual(result, '<button aria-label="Action button">Click me</button>');
    });

    test('should not add aria-label if already present', () => {
      const v = mockViolation({ nodes: [{ html: '<button aria-label="Existing">Click me</button>' }] });
      const result = generateAriaFix(v, 'react');
      assert.strictEqual(result, '<button aria-label="Existing">Click me</button>');
    });
  });

  describe('generateFocusFix', () => {
    test('should add focus styles to existing style attribute', () => {
      const v = mockViolation({ nodes: [{ html: '<button style="margin: 10px;">Click</button>' }] });
      const result = generateFocusFix(v, 'html');
      assert.ok(result.includes('outline: 2px solid #0066cc'));
      assert.ok(result.includes('style="margin: 10px; outline: 2px solid #0066cc; outline-offset: 2px;"'));
    });

    test('should add style attribute if missing', () => {
      const v = mockViolation({ nodes: [{ html: '<button>Click</button>' }] });
      const result = generateFocusFix(v, 'html');
      assert.strictEqual(result, '<button style="outline: 2px solid #0066cc; outline-offset: 2px;">Click</button>');
    });

    test('should not add styles if focus is already mentioned', () => {
      const v = mockViolation({ nodes: [{ html: '<button class="focus:ring">Click</button>' }] });
      const result = generateFocusFix(v, 'html');
      assert.strictEqual(result, '<button class="focus:ring">Click</button>');
    });
  });

  describe('generateGenericFix', () => {
    test('should add role and aria-label to div', () => {
      const v = mockViolation({ nodes: [{ html: '<div>Content</div>' }] });
      const result = generateGenericFix(v);
      assert.strictEqual(result, '<div role="region" aria-label="Content area">Content</div>');
    });

    test('should not add role if already present', () => {
      const v = mockViolation({ nodes: [{ html: '<div role="main">Content</div>' }] });
      const result = generateGenericFix(v);
      assert.strictEqual(result, '<div role="main">Content</div>');
    });
  });

  describe('generateBasicFixForViolation Parameterized', () => {
    const testCases = [
      {
        description: 'Insufficient contrast on text',
        expectedPart: 'contrast',
        expectedCode: '<span style="color: #333333;">text</span>',
        html: '<span style="color: grey;">text</span>'
      },
      {
        description: 'ARIA attribute missing',
        expectedPart: 'ARIA labels',
        expectedCode: '<button aria-label="Action button">Submit</button>',
        html: '<button>Submit</button>'
      },
      {
        description: 'Form label missing',
        expectedPart: 'ARIA labels',
        expectedCode: '<button aria-label="Action button">OK</button>',
        html: '<button>OK</button>'
      },
      {
        description: 'Keyboard navigation issue',
        expectedPart: 'keyboard accessibility',
        expectedCode: 'outline: 2px solid #0066cc',
        html: '<a>Link</a>'
      },
      {
        description: 'Focus indicator not visible',
        expectedPart: 'keyboard accessibility',
        expectedCode: 'outline: 2px solid #0066cc',
        html: '<button>Click</button>'
      },
      {
        description: 'Missing alternative text',
        expectedPart: 'Fixed Missing alternative text',
        expectedCode: '<div role="region" aria-label="Content area">Image</div>',
        html: '<div>Image</div>'
      }
    ];

    testCases.forEach(({ description, expectedPart, expectedCode, html }) => {
      test(`should handle "${description}"`, () => {
        const v = mockViolation({ description, nodes: [{ html }] });
        const result = generateBasicFixForViolation(v, 'html');
        assert.ok(result.explanation.includes(expectedPart), `Explanation should include "${expectedPart}" for "${description}"`);
        assert.ok(result.fixedCode.includes(expectedCode), `Fixed code should include "${expectedCode}" for "${description}"`);
      });
    });
  });
});
