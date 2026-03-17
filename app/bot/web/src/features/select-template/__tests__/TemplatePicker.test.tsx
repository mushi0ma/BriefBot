import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplatePicker } from '../ui/TemplatePicker';

const MOCK_TEMPLATES = [
  { slug: 'default', icon: 'target', name: 'Универсальный', desc: 'Подходит для любых проектов' },
  { slug: 'design', icon: 'paintbrush', name: 'Design', desc: 'Визуальные проекты и брендинг' },
];

describe('TemplatePicker', () => {
  it('renders all templates', () => {
    render(
      <TemplatePicker
        templates={MOCK_TEMPLATES}
        selected={null}
        onSelect={() => {}}
        disabled={false}
      />
    );

    expect(screen.getByText('Универсальный')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
  });

  it('shows check icon on selected template', () => {
    render(
      <TemplatePicker
        templates={MOCK_TEMPLATES}
        selected="design"
        onSelect={() => {}}
        disabled={false}
      />
    );

    // The selected item should have a check SVG icon
    const designButton = screen.getByText('Design').closest('button')!;
    const checkIcon = designButton.querySelector('span.material-symbols-outlined');
    expect(checkIcon).toBeInTheDocument();
  });

  it('calls onSelect when a template is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <TemplatePicker
        templates={MOCK_TEMPLATES}
        selected={null}
        onSelect={handleSelect}
        disabled={false}
      />
    );

    fireEvent.click(screen.getByText('Design').closest('button')!);
    expect(handleSelect).toHaveBeenCalledWith('design');
  });

  it('disables all buttons when disabled prop is true', () => {
    render(
      <TemplatePicker
        templates={MOCK_TEMPLATES}
        selected={null}
        onSelect={() => {}}
        disabled={true}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });
});
