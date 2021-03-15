import { render, screen } from '@testing-library/react';

import TemplateListItem from './TemplateListItem';

test('renders without crashing', async () => {
  render(<TemplateListItem template={{
    _id: 'abc',
    title: 'Template ListItem',
  }}/>);

  const [create, edit] = screen.getAllByRole('link');

  expect(create).toHaveTextContent('Template ListItem');
  expect(create).toHaveAttribute('href', '/checklist/new?template=abc');

  expect(edit).toHaveAttribute('aria-label', 'edit');
  expect(edit).toHaveAttribute('href', '/hacks/abc/edit')
});
