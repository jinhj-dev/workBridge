import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormTable, FormTableRow } from './FormTable';

describe('FormTable', () => {
  it('shouldLinkLabelToControlAndKeepRequiredMarkOutOfName', () => {
    render(
      <FormTable>
        <FormTableRow label="理由" htmlFor="r" required>
          <input id="r" />
        </FormTableRow>
      </FormTable>,
    );
    expect(screen.getByLabelText('理由')).toBe(document.getElementById('r'));
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shouldRenderSpanLabelWithoutMarkWhenNotRequired', () => {
    render(
      <FormTable>
        <FormTableRow label="申請日数" labelId="d">
          <div>1日</div>
        </FormTableRow>
      </FormTable>,
    );
    expect(screen.getByText('申請日数').tagName).toBe('SPAN');
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });
});
