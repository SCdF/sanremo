import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useNavigate } from 'react-router-dom';
import { render } from '../../test-utils';

import RepeatableListItem from './RepeatableListItem';

jest.mock('react-router-dom');

// FIXME: this test has different date format outputs depending on the computer you're
// running it on
describe.skip('Repeatable', () => {
  let navigate;
  beforeEach(() => {
    navigate = jest.fn();
    useNavigate.mockReturnValue(navigate);
  });

  it('renders without crashing', async () => {
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

  it('url slug renders (and does not effect slug click)', async () => {
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

  it('date slug', async () => {
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
    expect(screen.getByText('01/01/2020')).toBeInTheDocument();
  });

  it('timestamp slug', async () => {
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
    expect(screen.getByText('01/01/2020, 10:20:00')).toBeInTheDocument();
  });
  it('plain text slug', async () => {
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
});
