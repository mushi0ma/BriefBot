import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
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

  it('shows error if no new briefs available for download', async () => {
    const briefs = [
      { id: '1', template_slug: 'default', processing_state: 'done', brief_data: null, pdf_url: 'http://example.com/a.pdf', is_downloaded: true, processing_time_ms: null, created_at: '2026-01-01T00:00:00Z' },
    ];
    render(<HistoryTab briefs={briefs} />);
    
    const newBtn = screen.getByText('Новые');
    fireEvent.click(newBtn);

    await waitFor(() => {
        expect(screen.getByText('Нет новых брифов для скачивания')).toBeInTheDocument();
    });
  });

  it('shows error if no PDFs exist structurally at all', async () => {
    const briefs = [
      { id: '1', template_slug: 'default', processing_state: 'done', brief_data: null, pdf_url: null, is_downloaded: false, processing_time_ms: null, created_at: '2026-01-01T00:00:00Z' },
    ];
    render(<HistoryTab briefs={briefs} />);
    
    const allBtn = screen.getByText('Весь архив');
    fireEvent.click(allBtn);

    await waitFor(() => {
        expect(screen.getByText('Нет доступных PDF-файлов')).toBeInTheDocument();
    });
  });
});

