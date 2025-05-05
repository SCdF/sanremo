import { screen } from '@testing-library/react';
import { NavigateFunction } from 'react-router-dom';

import { Store } from '@reduxjs/toolkit';
import { MockedFunction, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../../store';
import { render, withStore } from '../../test-utils';
import { setUserAsLoggedIn } from '../User/userSlice';
import Page from './Page';
import { set as setPageContext } from './pageSlice';

vi.mock('react-router-dom');
vi.mock('../../db');

describe('Page', () => {
  let navigate: MockedFunction<NavigateFunction>;
  let store: Store;

  beforeEach(() => {
    store = createStore();
    store.dispatch(setUserAsLoggedIn({ user: { id: 1, name: 'Tester Test' } }));
  });

  it('renders without crashing', async () => {
    render(withStore(store, <Page />));
  });

  it('sets the title on page and on window', async () => {
    store.dispatch(setPageContext({ title: 'Test Title' }));
    render(withStore(store, <Page />));

    expect(screen.getByText('Test Title')).toBeTruthy();
    expect(global.window.document.title).toBe('Test Title | Sanremo');
  });
});
