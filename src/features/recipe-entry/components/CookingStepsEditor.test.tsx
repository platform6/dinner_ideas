import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CookingStepsEditor } from '@/features/recipe-entry/components/CookingStepsEditor';
import { createStep, type DraftStep } from '@/features/recipe-entry/draft';
import { theme } from '@/shared/theme';

function steps(...instructions: string[]): DraftStep[] {
  return instructions.map((instruction) => ({ ...createStep(), instruction }));
}

/** With the theme, so responsive sizes become media queries rather than collapsing (bolt 077). */
function renderEditor(given = steps('Heat the oven.', 'Roast it.', 'Serve.')) {
  const onChange = vi.fn();
  render(
    <ChakraProvider theme={theme}>
      <CookingStepsEditor
        steps={given}
        problems={[]}
        showProblems={false}
        onChange={onChange}
        onAddStep={vi.fn()}
      />
    </ChakraProvider>,
  );
  const controls = (n: number) => ({
    up: screen.getByRole('button', { name: `Move step ${n} up` }),
    down: screen.getByRole('button', { name: `Move step ${n} down` }),
    remove: screen.getByRole('button', { name: `Remove step ${n}` }),
  });
  return { given, onChange, controls };
}

describe('CookingStepsEditor: removing a step is not a mis-tap away (intent 024, FR-2)', () => {
  it('should keep remove out of the reorder pair, and after it', () => {
    const { controls } = renderEditor();
    const { up, down, remove } = controls(2);

    // The arrows are grouped together; remove is not in that group.
    expect(up.parentElement).toBe(down.parentElement);
    expect(remove.parentElement).not.toBe(up.parentElement);
    // And it comes after them, so neither a tap nor Tab lands on it while reaching for an arrow.
    expect(up.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('should make all three controls 44px on a phone', () => {
    // jsdom applies the base rule, so a computed size here is the phone one (bolt 077).
    const { controls } = renderEditor();

    for (const button of Object.values(controls(1))) {
      expect(getComputedStyle(button).height).toBe('44px');
    }
  });

  it('should still name the step each control acts on', () => {
    renderEditor();

    for (const n of [1, 2, 3]) {
      expect(screen.getByRole('button', { name: `Remove step ${n}` })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `Move step ${n} up` })).toBeInTheDocument();
    }
  });

  it('should still remove the step it names, leaving the others in order', async () => {
    const user = userEvent.setup();
    const { given, onChange } = renderEditor();

    await user.click(screen.getByRole('button', { name: 'Remove step 2' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual([given[0], given[2]]);
  });

  it('should still reorder, and disable the arrows at the ends', async () => {
    const user = userEvent.setup();
    const { given, onChange } = renderEditor();

    expect(screen.getByRole('button', { name: 'Move step 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move step 3 down' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Move step 2 up' }));

    expect(onChange.mock.calls[0][0]).toEqual([given[1], given[0], given[2]]);
  });
});
