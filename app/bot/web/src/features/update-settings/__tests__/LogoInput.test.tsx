"use client";
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LogoInput } from '../ui/LogoInput';

describe('LogoInput', () => {
  it('renders with initial value', () => {
    render(<LogoInput initialValue="https://example.com/logo.png" onSave={() => {}} disabled={false} />);
    
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('https://example.com/logo.png');
  });

  it('updates input value on type', () => {
    render(<LogoInput initialValue="" onSave={() => {}} disabled={false} />);
    
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'https://newlogo.com/test.png' } });
    
    expect(input.value).toBe('https://newlogo.com/test.png');
  });

  it('calls onSave with input value when OK button is clicked', () => {
    const handleSave = vi.fn();
    render(<LogoInput initialValue="old" onSave={handleSave} disabled={false} />);
    
    const input = screen.getByRole('textbox') as HTMLInputElement;
    const button = screen.getByRole('button', { name: /ok/i });
    
    fireEvent.change(input, { target: { value: 'new-logo' } });
    fireEvent.click(button);
    
    expect(handleSave).toHaveBeenCalledWith('new-logo');
  });

  it('disables input and button when disabled prop is true', () => {
    render(<LogoInput initialValue="" onSave={() => {}} disabled={true} />);
    
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: /\.\.\./i })).toBeDisabled();
  });
});
