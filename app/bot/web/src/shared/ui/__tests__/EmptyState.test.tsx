import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EmptyState } from '../EmptyState';

describe('EmptyState Component', () => {
  it('renders the empty state graphic and text correctly', () => {
    render(<EmptyState />);
    
    // Check if the heading is present
    expect(screen.getByText('Your history is clear')).toBeInTheDocument();
    
    // Check if the descriptive paragraph is present
    expect(
      screen.getByText('Start by generating a professional brief. Your history and templates will appear here.')
    ).toBeInTheDocument();
  });
});
