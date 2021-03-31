import { render, screen } from '@testing-library/react';

import TemplateListItem from './TemplateListItem';

test('renders without crashing', async () => {
  render(<TemplateListItem
    _id='abc'
    title='Template ListItem'
  />);

  const [create, edit] = screen.getAllByRole('link');

  expect(create).toHaveTextContent('Template ListItem');
  expect(create).toHaveAttribute('href', '/repeatable/new?template=abc');

  expect(edit).toHaveAttribute('aria-label', 'edit');
  expect(edit).toHaveAttribute('href', '/template/abc')
});
