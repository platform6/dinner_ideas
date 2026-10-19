import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StepList } from '@/features/dinners/components/StepList';
import type { DinnerStep } from '@/features/dinners/types';

const steps: DinnerStep[] = [
  { id: 's1', dinner_id: 'd1', step_number: 1, instruction: 'Brown the turkey.' },
  { id: 's2', dinner_id: 'd1', step_number: 2, instruction: 'Serve in tortillas.' },
];

describe('StepList (intent 026)', () => {
  it('should list the steps in the order given', () => {
    render(<StepList steps={steps} />);

    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(['Brown the turkey.', 'Serve in tortillas.']);
  });

  it('should say so when a dinner has no steps', () => {
    render(<StepList steps={[]} />);

    expect(screen.getByText('No steps recorded.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
