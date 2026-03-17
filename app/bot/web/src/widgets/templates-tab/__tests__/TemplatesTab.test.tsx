import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TemplatesTab } from '../ui/TemplatesTab';

describe('TemplatesTab', () => {
  it('renders template list header', () => {
    render(<TemplatesTab selected={null} onSelect={() => {}} saving={false} />);
    expect(screen.getByText('Available Templates')).toBeInTheDocument();
  });

  it('renders all default templates', () => {
    render(<TemplatesTab selected={null} onSelect={() => {}} saving={false} />);
    expect(screen.getByText('Universal')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
    expect(screen.getByText('Development')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
  });
});
