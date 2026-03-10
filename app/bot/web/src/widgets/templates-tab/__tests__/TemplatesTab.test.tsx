"use client";
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TemplatesTab } from '../ui/TemplatesTab';

describe('TemplatesTab', () => {
  it('renders template list header', () => {
    render(<TemplatesTab selected={null} onSelect={() => {}} saving={false} />);
    expect(screen.getByText('Шаблон по умолчанию')).toBeInTheDocument();
  });

  it('renders all default templates', () => {
    render(<TemplatesTab selected={null} onSelect={() => {}} saving={false} />);
    expect(screen.getByText('Универсальный')).toBeInTheDocument();
    expect(screen.getByText('Дизайн')).toBeInTheDocument();
    expect(screen.getByText('Разработка')).toBeInTheDocument();
    expect(screen.getByText('Маркетинг')).toBeInTheDocument();
  });
});
