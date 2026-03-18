import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HistoryTab } from '../ui/HistoryTab';

describe('HistoryTab', () => {
  it('renders empty state when no briefs', () => {
    render(<HistoryTab briefs={[]} />);
    expect(screen.getByText('Your history is clear')).toBeInTheDocument();
  });

  it('renders brief list when briefs exist', () => {
    const briefs = [
      { id: '1', template_slug: 'default', processing_state: 'done', brief_data: { title: 'Test' }, pdf_url: null, processing_time_ms: 100, created_at: '2026-01-01T00:00:00Z' },
    ];
    render(<HistoryTab briefs={briefs} />);
    expect(screen.getByText('New Briefs')).toBeInTheDocument();
  });

  it('disables download button if no new briefs available', async () => {
    const briefs = [
      { id: '1', template_slug: 'default', processing_state: 'done', brief_data: null, pdf_url: 'http://example.com/a.pdf', is_downloaded: true, processing_time_ms: null, created_at: '2026-01-01T00:00:00Z' },
    ];
    render(<HistoryTab briefs={briefs} />);
    
    const newBtn = screen.getByTitle('Download Displayed Briefs');
    expect(newBtn).toBeDisabled();
  });

  it('disables download button if no PDFs exist structurally at all', async () => {
    const briefs = [
      { id: '1', template_slug: 'default', processing_state: 'done', brief_data: null, pdf_url: null, is_downloaded: false, processing_time_ms: null, created_at: '2026-01-01T00:00:00Z' },
    ];
    render(<HistoryTab briefs={briefs} />);
    
    const archiveTab = screen.getByText('Archive');
    fireEvent.click(archiveTab);
    const allBtn = screen.getByTitle('Download Displayed Briefs');
    expect(allBtn).toBeDisabled();
  });
});

