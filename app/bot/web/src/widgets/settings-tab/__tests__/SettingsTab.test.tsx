"use client";
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsTab } from '../ui/SettingsTab';

const DEFAULT_SETTINGS = { brand_color: null, logo_url: null, default_template: null };

describe('SettingsTab', () => {
  it('renders color and logo sections', () => {
    render(<SettingsTab settings={DEFAULT_SETTINGS} onUpdate={() => {}} saving={false} />);
    expect(screen.getByText('Цвет акцента PDF')).toBeInTheDocument();
    expect(screen.getByText('Логотип')).toBeInTheDocument();
  });
});
