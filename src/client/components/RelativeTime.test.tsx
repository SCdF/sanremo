import { screen, waitFor } from '@testing-library/react';
import { render } from '../test-utils';

import { expect, test } from 'vitest';
import RelativeTime from './RelativeTime';

test('renders without crashing', async () => {
  render(<RelativeTime date={Date.now()} />);

  expect(screen.getByText('less than a minute ago')).toBeTruthy();
});

test('updates as now changes', async () => {
  render(<RelativeTime date={Date.now() - 1000 * 29} interval={1000} />);

  expect(screen.getByText('less than a minute ago')).toBeTruthy();

  await waitFor(() => screen.getByText('1 minute ago'), { timeout: 2000 });

  expect(screen.getByText('1 minute ago')).toBeTruthy();
});
