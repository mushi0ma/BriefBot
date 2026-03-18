import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsTab } from '../ui/SettingsTab';

const DEFAULT_SETTINGS = { brand_color: null, logo_url: null, default_template: null };

describe('SettingsTab', () => {
  it('renders brief customization section by default', () => {
    render(<SettingsTab settings={DEFAULT_SETTINGS} onUpdate={() => {}} saving={false} />);
    expect(screen.getByText('Brief Customization')).toBeInTheDocument();
  });

  it('renders branding section when branding tab is clicked', () => {
    render(<SettingsTab settings={DEFAULT_SETTINGS} onUpdate={() => {}} saving={false} />);
    const brandingTab = screen.getByText('Branding');
    fireEvent.click(brandingTab);
    expect(screen.getByText('PDF Accent Color')).toBeInTheDocument();
    expect(screen.getByText('Company Logo')).toBeInTheDocument();
  });
});
