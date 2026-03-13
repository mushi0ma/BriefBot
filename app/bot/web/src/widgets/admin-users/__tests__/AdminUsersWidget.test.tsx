import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AdminUsersWidget } from '../ui/AdminUsersWidget';

describe('AdminUsersWidget', () => {
  it('renders correctly', () => {
    render(<AdminUsersWidget />);
    expect(screen.getByPlaceholderText('Search by name, ID or role...')).toBeInTheDocument();
    expect(screen.getByText('All Users')).toBeInTheDocument();
    expect(screen.getByText('Alex Rivers')).toBeInTheDocument();
  });

  it('filters users by search query', () => {
    render(<AdminUsersWidget />);
    const searchInput = screen.getByPlaceholderText('Search by name, ID or role...');

    // Type "Sarah"
    fireEvent.change(searchInput, { target: { value: 'Sarah' } });

    expect(screen.getByText('Sarah Jenkins')).toBeInTheDocument();
    expect(screen.queryByText('Alex Rivers')).not.toBeInTheDocument();
  });

  it('filters users by role', () => {
    render(<AdminUsersWidget />);

    // Click "Admin" filter button (getByRole handles disambiguation if we specify name)
    const adminButton = screen.getAllByText('Admin').find(el => el.tagName === 'BUTTON');
    if (adminButton) {
        fireEvent.click(adminButton);
    }

    expect(screen.getByText('Alex Rivers')).toBeInTheDocument(); // Is Admin
    expect(screen.queryByText('Sarah Jenkins')).not.toBeInTheDocument(); // Is Pro
  });
});
