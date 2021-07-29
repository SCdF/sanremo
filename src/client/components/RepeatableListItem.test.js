import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import RepeatableListItem from './RepeatableListItem';

jest.mock('@reach/router');
const navigate = require('@reach/router').navigate;

test('renders without crashing', async () => {
  const params = {
    _id: 'abc',
    timestamp: Date.now(),
    slug: 'http://example.com',
    template: {
      title: 'Checklist ListItem',
      slug: {
        type: 'url',
        label: 'For',
      },
    },
  };

  render(<RepeatableListItem {...params} />);

  expect(screen.getByText('Checklist ListItem')).toBeInTheDocument();
  expect(screen.getByText('less than a minute ago')).toBeInTheDocument();
});

test('url slug renders (and does not effect slug click)', async () => {
  const params = {
    _id: 'abc',
    timestamp: Date.now(),
    slug: 'http://example.com',
    template: {
      title: 'URL Test',
      slug: {
        type: 'url',
      },
    },
  };

  render(<RepeatableListItem {...params} />);

  expect(screen.getByRole('link')).toHaveAttribute('href', params.slug);
  userEvent.click(screen.getByText('URL Test'));
  expect(navigate).toBeCalledWith('/repeatable/abc');
});

test('date slug', async () => {
  const params = {
    _id: 'abc',
    timestamp: Date.now(),
    slug: new Date(2020, 0, 1).getTime(),
    template: {
      title: 'Date test',
      slug: {
        type: 'date',
      },
    },
  };

  render(<RepeatableListItem {...params} />);
  expect(screen.getByText('1/1/2020')).toBeInTheDocument();
});

test('timestamp slug', async () => {
  const params = {
    _id: 'abc',
    timestamp: Date.now(),
    slug: new Date(2020, 0, 1, 10, 20).getTime(),
    template: {
      title: 'Timestamp test',
      slug: {
        type: 'timestamp',
      },
    },
  };

  render(<RepeatableListItem {...params} />);
  expect(screen.getByText('1/1/2020, 10:20:00 AM')).toBeInTheDocument();
});
test('plain text slug', async () => {
  const params = {
    _id: 'abc',
    timestamp: Date.now(),
    slug: 'some text for you',
    template: {
      title: 'Plain Text test',
      slug: {
        type: 'string',
      },
    },
  };

  render(<RepeatableListItem {...params} />);
  expect(screen.getByText('some text for you')).toBeInTheDocument();
});
