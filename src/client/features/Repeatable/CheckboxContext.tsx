import { createContext, useContext } from 'react';

export type CheckboxContextType = {
  /** Map of checkbox ID to checked state */
  values: Record<string, boolean>;
  /**
   * Callback when a checkbox is toggled by index. If undefined, checkboxes are disabled.
   * The parent component (RepeatableRenderer) handles translating index to checkbox ID.
   */
  onChange?: (idx: number) => void;
  /** Whether checkboxes are disabled (derived from onChange being undefined) */
  disabled: boolean;
  /** Register a button ref for focus management. Uses positional index for focus order. */
  registerButton: (idx: number, element: HTMLElement | null) => void;
  /** Get checkbox ID at a given positional index */
  getCheckboxId: (idx: number) => string | undefined;
};

const defaultContext: CheckboxContextType = {
  values: {},
  onChange: undefined,
  disabled: true,
  registerButton: () => {},
  getCheckboxId: () => undefined,
};

export const CheckboxContext = createContext<CheckboxContextType>(defaultContext);

export const useCheckboxContext = () => useContext(CheckboxContext);
