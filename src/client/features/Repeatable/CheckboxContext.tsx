import { createContext, useContext } from 'react';

export type CheckboxContextType = {
  /** Array of checkbox values (true = checked, false = unchecked) */
  values: boolean[];
  /** Callback when a checkbox is toggled. If undefined, checkboxes are disabled. */
  onChange?: (idx: number) => void;
  /** Whether checkboxes are disabled (derived from onChange being undefined) */
  disabled: boolean;
  /** Register a button ref for focus management. Returns cleanup function. */
  registerButton: (idx: number, element: HTMLElement | null) => void;
};

const defaultContext: CheckboxContextType = {
  values: [],
  onChange: undefined,
  disabled: true,
  registerButton: () => {},
};

export const CheckboxContext = createContext<CheckboxContextType>(defaultContext);

export const useCheckboxContext = () => useContext(CheckboxContext);
