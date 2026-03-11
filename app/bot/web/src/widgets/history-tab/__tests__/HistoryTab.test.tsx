import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HistoryTab } from '../ui/HistoryTab';

describe('HistoryTab', () => {
  it('renders empty state when no briefs', () => {
    render(<HistoryTab briefs={[]} />);
    expect(screen.getByText('Пока нет брифов')).toBeInTheDocument();
  });

  it('renders brief list when briefs exist', () => {
    const briefs = [
      { id: '1', template_slug: 'default', processing_state: 'done', brief_data: { title: 'Test' }, pdf_url: null, processing_time_ms: 100, created_at: '2026-01-01T00:00:00Z' },
    ];
    render(<HistoryTab briefs={briefs} />);
    expect(screen.getByText('Последние брифы')).toBeInTheDocument();
  });
});
