import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // WCAG AA: Images must have alt text
      'jsx-a11y/alt-text': 'warn',
      // WCAG AA: Anchors must have content
      'jsx-a11y/anchor-has-content': 'warn',
      // WCAG AA: Interactive elements must be focusable
      'jsx-a11y/interactive-supports-focus': 'warn',
      // WCAG AA: Labels must be associated with controls
      'jsx-a11y/label-has-associated-control': 'warn',
      // WCAG AA: No autofocus
      'jsx-a11y/no-autofocus': 'warn',
      // WCAG AA: Headings must have content
      'jsx-a11y/heading-has-content': 'warn',
      // WCAG AA: Clicks on non-interactive elements need keyboard support
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      // WCAG AA: Aria attributes must be valid
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
    },
  },
];
