// Standard manual verification checklist. Automated scanning (axe-core)
// reliably catches maybe a third of real WCAG failures — the rest require a
// human actually using a keyboard, a screen reader, and their eyes. This is
// the fixed set of checks a real accessibility audit walks through that no
// DOM inspection can substitute for. Every scan gets one instance of each
// item (see app/api/scans/[scanId]/audit/route.ts), and a person marks each
// one as they complete it.

export interface ManualAuditTemplateItem {
  category: string
  code: string
  title: string
  guidance: string
  wcagReference?: string
}

export const MANUAL_AUDIT_CHECKLIST: ManualAuditTemplateItem[] = [
  // Keyboard navigation
  {
    category: 'keyboard-navigation',
    code: 'kbd-tab-order',
    title: 'Tab order follows a logical reading sequence',
    guidance: 'Unplug your mouse. Tab through the entire page and confirm focus moves in the same order a sighted user would read the content, not the DOM order if it visually differs.',
    wcagReference: 'WCAG 2.4.3',
  },
  {
    category: 'keyboard-navigation',
    code: 'kbd-no-traps',
    title: 'No keyboard traps',
    guidance: 'Tab into every menu, modal, and embedded widget (date pickers, custom dropdowns, video players) and confirm you can always tab back out using only the keyboard.',
    wcagReference: 'WCAG 2.1.2',
  },
  {
    category: 'keyboard-navigation',
    code: 'kbd-all-reachable',
    title: 'Every interactive element is keyboard-reachable',
    guidance: 'Confirm every link, button, form control, and custom widget (carousels, tabs, accordions) can be reached and operated with Tab/Shift+Tab/Enter/Space/Arrow keys — not just clickable with a mouse.',
    wcagReference: 'WCAG 2.1.1',
  },
  {
    category: 'keyboard-navigation',
    code: 'kbd-visible-focus',
    title: 'A visible focus indicator appears on every focusable element',
    guidance: 'Tab through the page and confirm you can always tell which element has focus. A missing or near-invisible outline fails even if axe-core does not flag the specific CSS.',
    wcagReference: 'WCAG 2.4.7',
  },
  {
    category: 'keyboard-navigation',
    code: 'kbd-skip-link-works',
    title: 'The skip-to-content link actually works',
    guidance: 'If a skip link exists, tab to it as the first stop, activate it, and confirm focus actually lands past the repeated navigation — not just that the link is present.',
    wcagReference: 'WCAG 2.4.1',
  },

  // Screen reader
  {
    category: 'screen-reader',
    code: 'sr-landmarks',
    title: 'Landmarks and regions are announced sensibly',
    guidance: 'With a screen reader (VoiceOver, NVDA, or JAWS), navigate by landmark/region. Confirm header, nav, main, and footer are identifiable and there is exactly one main region.',
    wcagReference: 'WCAG 1.3.1',
  },
  {
    category: 'screen-reader',
    code: 'sr-image-alt-meaningful',
    title: 'Image alt text is meaningful in context, not just present',
    guidance: 'Automated tools only check that alt text exists. Listen to how each meaningful image is announced and confirm the text actually conveys its purpose (not "image123.jpg" or redundant text like "photo of").',
    wcagReference: 'WCAG 1.1.1',
  },
  {
    category: 'screen-reader',
    code: 'sr-form-labels-errors',
    title: 'Form fields announce their label and any error clearly',
    guidance: 'Tab through every form field with a screen reader running. Confirm the label is announced before the input, and that validation errors are announced automatically when they appear.',
    wcagReference: 'WCAG 3.3.1',
  },
  {
    category: 'screen-reader',
    code: 'sr-dynamic-content',
    title: 'Dynamic content changes are announced',
    guidance: 'Trigger content that updates without a page reload (toasts, cart totals, live search results, loading states). Confirm a screen reader announces the change via aria-live or a similar mechanism.',
    wcagReference: 'WCAG 4.1.3',
  },

  // Reading order & structure
  {
    category: 'reading-order',
    code: 'ro-visual-matches-dom',
    title: 'Visual order matches reading order',
    guidance: 'Compare the visual layout against the DOM/reading order (e.g. via screen reader or by disabling CSS). CSS-based reordering (flexbox order, grid placement, absolute positioning) can make these diverge silently.',
    wcagReference: 'WCAG 1.3.2',
  },
  {
    category: 'reading-order',
    code: 'ro-heading-hierarchy',
    title: 'Heading hierarchy makes sense navigated by headings alone',
    guidance: 'Pull up the heading list in a screen reader or browser extension. Confirm the outline reads as a sensible table of contents for the page, not just that levels are not skipped.',
    wcagReference: 'WCAG 1.3.1',
  },

  // Color, contrast & motion beyond automated checks
  {
    category: 'color-and-contrast',
    code: 'color-not-sole-indicator',
    title: 'Information is not conveyed by color alone',
    guidance: 'Check required-field markers, form validation states, charts, and status indicators. Confirm each also uses text, an icon, or a pattern — not color alone (relevant for color-blind users).',
    wcagReference: 'WCAG 1.4.1',
  },
  {
    category: 'color-and-contrast',
    code: 'color-blind-simulation',
    title: 'Page remains usable under a color-blindness simulation',
    guidance: 'Run the page through a color-blindness simulator (deuteranopia and protanopia at minimum) and confirm critical UI elements, CTAs, and status colors remain distinguishable.',
    wcagReference: 'WCAG 1.4.1',
  },

  // Zoom & reflow
  {
    category: 'zoom-and-reflow',
    code: 'zoom-400-reflow',
    title: 'Content reflows at 400% zoom without loss of function',
    guidance: 'Zoom the browser to 400% (or resize the viewport to 320px wide). Confirm content reflows into a single column without horizontal scrolling and no functionality is lost or hidden.',
    wcagReference: 'WCAG 1.4.10',
  },
  {
    category: 'zoom-and-reflow',
    code: 'zoom-text-spacing',
    title: 'Layout survives user-adjusted text spacing',
    guidance: 'Apply increased line height, paragraph spacing, letter spacing, and word spacing (a text-spacing bookmarklet or browser extension works well). Confirm no text is clipped or overlapping.',
    wcagReference: 'WCAG 1.4.12',
  },

  // Forms
  {
    category: 'forms',
    code: 'forms-required-indicated',
    title: 'Required fields are clearly indicated before submission',
    guidance: 'Confirm required fields are marked in a way available to all users (not just a color or a placeholder that disappears on focus) before the user attempts to submit.',
    wcagReference: 'WCAG 3.3.2',
  },
  {
    category: 'forms',
    code: 'forms-error-specific',
    title: 'Error messages are specific and tell the user how to fix them',
    guidance: 'Submit the form with invalid data. Confirm each error message identifies which field is wrong and what is needed to fix it — not a generic "there was an error."',
    wcagReference: 'WCAG 3.3.3',
  },
]
