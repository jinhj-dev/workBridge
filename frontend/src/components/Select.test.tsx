import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './Select';

const options = [
  { value: 'A', label: 'エー' },
  { value: 'B', label: 'ビー' },
] as const;

describe('Select', () => {
  it('shouldShowDisabledPlaceholderWhenValueIsEmpty', () => {
    render(<Select id="s" value="" onChange={vi.fn()} options={options} placeholder="選択" />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('');
    expect(screen.getByRole('option', { name: '選択' })).toBeDisabled();
  });

  it('shouldCallOnChangeWithValueWhenOptionSelected', async () => {
    const onChange = vi.fn();
    render(<Select id="s" value="" onChange={onChange} options={options} placeholder="選択" />);
    await userEvent.setup().selectOptions(screen.getByRole('combobox'), 'B');
    expect(onChange).toHaveBeenCalledWith('B');
  });

  it('shouldExposeAriaStateWhenInvalidAndRequired', () => {
    render(
      <Select
        id="s"
        value="A"
        onChange={vi.fn()}
        options={options}
        invalid
        required
        describedBy="e"
      />,
    );
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveAttribute('aria-required', 'true');
    expect(select).toHaveAttribute('aria-describedby', 'e');
  });

  it('shouldHideChevronFromAccessibleTree', () => {
    const { container } = render(
      <Select id="s" value="A" onChange={vi.fn()} options={options} />,
    );
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-required');
  });
});
