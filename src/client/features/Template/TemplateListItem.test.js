import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '../../test-utils';

import TemplateListItem from './TemplateListItem';

test('renders without crashing', async () => {
  render(
    <MemoryRouter>
      <TemplateListItem _id="abc" title="Template ListItem" />
    </MemoryRouter>,
  );

  const [create, edit] = screen.getAllByRole('button');

  expect(create).toHaveTextContent('Template ListItem');
  expect(create).toHaveAttribute('href', '/repeatable/new?template=abc');

  expect(edit).toHaveAttribute('aria-label', 'edit');
  expect(edit).toHaveAttribute('href', '/template/abc');
});
