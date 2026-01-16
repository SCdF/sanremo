import { createContext, useContext } from 'react';

export type CheckboxContextType = {
  /** Array of checkbox values (true = checked, false = unchecked) */
  values: boolean[];
  /** Callback when a checkbox is toggled. If undefined, checkboxes are disabled. */
  onChange?: (idx: number) => void;
  /** Whether checkboxes are disabled (derived from onChange being undefined) */
  disabled: boolean;
  /** Index of the checkbox that should receive focus, or null if none */
  focusedIdx: number | null;
};

const defaultContext: CheckboxContextType = {
  values: [],
  onChange: undefined,
  disabled: true,
  focusedIdx: null,
};

export const CheckboxContext = createContext<CheckboxContextType>(defaultContext);

export const useCheckboxContext = () => useContext(CheckboxContext);
