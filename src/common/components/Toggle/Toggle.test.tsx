import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Toggle } from './Toggle';

describe('Toggle', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  it('renders all options', () => {
    render(<Toggle options={options} value="option1" onChange={() => {}} />);

    expect(screen.getByText('Option 1')).toBeDefined();
    expect(screen.getByText('Option 2')).toBeDefined();
    expect(screen.getByText('Option 3')).toBeDefined();
  });

  it('calls onChange when an option is clicked', () => {
    const onChange = vi.fn();
    render(<Toggle options={options} value="option1" onChange={onChange} />);

    fireEvent.click(screen.getByText('Option 2'));
    expect(onChange).toHaveBeenCalledWith('option2');
  });

  it('disables the active option button', () => {
    const onChange = vi.fn();
    render(<Toggle options={options} value="option1" onChange={onChange} />);

    const activeOption = screen.getByText('Option 1') as HTMLButtonElement;
    expect(activeOption.disabled).toBe(true);

    fireEvent.click(activeOption);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies active styles to the selected option', () => {
    render(<Toggle options={options} value="option2" onChange={() => {}} />);

    const activeOption = screen.getByText('Option 2');
    expect(activeOption.className).toContain('bg-bg-main');
    expect(activeOption.className).toContain('text-text-main');

    const inactiveOption = screen.getByText('Option 1');
    expect(inactiveOption.className).toContain('text-text-muted');
    expect(inactiveOption.className.split(' ')).not.toContain('bg-bg-main');
  });
});
