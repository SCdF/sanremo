import { useNavigate } from 'react-router-dom';
import { render as renderRtl, screen } from '@testing-library/react';
import { Provider } from 'react-redux';

import Page from './Page';
import { createStore } from '../store';
import { set as setLoggedInUser } from '../state/userSlice';
import { set as setPageContext } from '../state/pageSlice';

jest.mock('react-router-dom');

describe('Page', () => {
  let navigate;
  beforeEach(() => {
    navigate = jest.fn();
    useNavigate.mockReturnValue(navigate);
  });

  let store;
  beforeEach(() => {
    store = createStore();
    store.dispatch(setLoggedInUser({ id: 1, name: 'Tester Test' }));
  });

  function render(children) {
    renderRtl(<Provider store={store}>{children}</Provider>);
  }

  it('renders without crashing', async () => {
    render(<Page />);
  });

  it('sets the title on page and on window', async () => {
    store.dispatch(setPageContext({ title: 'Test Title' }));
    render(<Page />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(global.window.document.title).toBe('Test Title | Sanremo');
  });
});
