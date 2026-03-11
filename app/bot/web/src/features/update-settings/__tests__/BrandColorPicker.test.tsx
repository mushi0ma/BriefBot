import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrandColorPicker } from '../ui/BrandColorPicker';
import { PRESET_COLORS } from '../model/constants';

describe('BrandColorPicker', () => {
  it('renders all preset colors', () => {
    render(<BrandColorPicker value={null} onChange={() => {}} disabled={false} />);
    
    PRESET_COLORS.forEach(color => {
      expect(screen.getByLabelText(`Select color ${color}`)).toBeInTheDocument();
    });
  });

  it('shows check icon on selected color', () => {
    const selectedColor = PRESET_COLORS[1];
    render(<BrandColorPicker value={selectedColor} onChange={() => {}} disabled={false} />);
    
    const selectedButton = screen.getByLabelText(`Select color ${selectedColor}`);
    // Check icon renders as SVG inside the button
    expect(selectedButton.querySelector('svg')).toBeInTheDocument();
  });

  it('calls onChange when a color is clicked', () => {
    const handleChange = vi.fn();
    const targetColor = PRESET_COLORS[2];
    
    render(<BrandColorPicker value={null} onChange={handleChange} disabled={false} />);
    
    fireEvent.click(screen.getByLabelText(`Select color ${targetColor}`));
    
    expect(handleChange).toHaveBeenCalledWith(targetColor);
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('disables all buttons when disabled prop is true', () => {
    render(<BrandColorPicker value={null} onChange={() => {}} disabled={true} />);
    
    PRESET_COLORS.forEach(color => {
      expect(screen.getByLabelText(`Select color ${color}`)).toBeDisabled();
    });
  });
});
