import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DetailTable, DetailTableRow } from './DetailTable';

describe('DetailTable', () => {
  it('shouldRenderLabelValuePairsInOrder', () => {
    const { container } = render(
      <DetailTable>
        <DetailTableRow label="項目A">値A</DetailTableRow>
        <DetailTableRow label="項目B">値B</DetailTableRow>
      </DetailTable>,
    );
    const dl = container.querySelector('dl');
    expect(dl).not.toBeNull();
    const terms = dl!.querySelectorAll('dt');
    const defs = dl!.querySelectorAll('dd');
    expect(terms).toHaveLength(2);
    expect(terms[0]).toHaveTextContent('項目A');
    expect(defs[0]).toHaveTextContent('値A');
    expect(terms[1]).toHaveTextContent('項目B');
    expect(defs[1]).toHaveTextContent('値B');
    expect(terms[0]).toHaveClass('bg-general-30');
  });

  it('shouldAllowLongValueToWrap', () => {
    render(
      <DetailTable>
        <DetailTableRow label="理由">{'長い'.repeat(100)}</DetailTableRow>
      </DetailTable>,
    );
    const dd = screen.getByText('長い'.repeat(100)).closest('dd');
    expect(dd).toHaveClass('min-w-0');
    expect(dd).toHaveClass('break-words');
  });
});
