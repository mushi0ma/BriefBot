import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TabIcon } from '../ui/TabIcon';

describe('TabIcon', () => {
  it('renders an svg element for history tab', () => {
    const { container } = render(<TabIcon tab="history" active={false} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders an svg element for settings tab', () => {
    const { container } = render(<TabIcon tab="settings" active={false} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders an svg element for templates tab', () => {
    const { container } = render(<TabIcon tab="templates" active={false} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('uses active color when active is true', () => {
    const { container } = render(<TabIcon tab="history" active={true} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('stroke')).toContain('--tg-theme-button-color');
  });
});
