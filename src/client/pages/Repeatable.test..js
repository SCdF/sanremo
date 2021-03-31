import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Checklist from './Checklist';

import { navigate, useLocation } from '@reach/router';
import db from '../db';

jest.mock('@reach/router');
jest.mock('../db');

test('renders without crashing', async () => {
  db.get.mockResolvedValue({
    title: 'A Checklist',
    items: []
  });
  useLocation.mockReturnValue('http://test/checklist');

  render(<Checklist db={db} checklistId='1234'/>);

  await waitFor(() => screen.getByText(/A Checklist/));
});

test('creates new instance and redirects if "new"', async () => {
  db.get.mockResolvedValue({
    _id: 'checklist:template:1234',
    _rev: '42-abc',
    items: ['an item']
  });
  db.put.mockResolvedValue({id: '4321'});
  useLocation.mockReturnValue('http://test/checklist/new?templateId=1234');

  render(<Checklist db={db} checklistId='new' />);

  await waitFor(() => expect(navigate.mock.calls.length).toBe(1));
  expect(navigate.mock.calls[0][0]).toBe('/checklist/4321')

  const storedChecklist = db.put.mock.calls[0][0];
  expect(storedChecklist).toBeTruthy();
  expect(storedChecklist._id).toMatch(/^checklist:instance:/);
  expect(storedChecklist._rev).not.toBeTruthy();
  expect(storedChecklist.created).toBeLessThan(Date.now());
  expect(storedChecklist.updated).toBe(storedChecklist.created);
  expect(storedChecklist).toMatchObject({
    template: 'checklist:template:1234',
    items: ['an item'],
  });
})

describe('completion redirection semantics', () => {
  it('redirects when completing a fresh checklist', async () => {
    db.get.mockResolvedValue({
      title: 'A Checklist',
      items: []
    });
    useLocation.mockReturnValue('http://test/checklist');
    db.put.mockResolvedValue({rev: '2-abc'});

    render(<Checklist db={db} checklistId='1234'/>);
    await waitFor(() => screen.getByText(/A Checklist/));

    fireEvent.click(screen.getByText(/Complete/));
    await waitFor(() =>
      expect(navigate.mock.calls[0][0]).toBe('/'));
  });
  it('doesnt redirect when uncompleting a checklist', async () => {
    db.get.mockResolvedValue({
      title: 'A Checklist',
      completed: 123456789,
      items: []
    });
    useLocation.mockReturnValue('http://test/checklist');
    db.put.mockResolvedValue({rev: '2-abc'});

    render(<Checklist db={db} checklistId='1234'/>);
    await waitFor(() => screen.getByText(/A Checklist/));

    fireEvent.click(screen.getByText(/Un-complete/));
    await waitFor(() => expect(db.put.mock.calls.length).toBe(1));

    expect(navigate.mock.calls.length).toBe(0);
    expect(db.put.mock.calls[0][0].completed).not.toBeTruthy();
  });
  it('doesnt redirect when completing a just uncompleted checklist', async () => {
    db.get.mockResolvedValue({
      title: 'A Checklist',
      completed: 123456789,
      items: []
    });
    useLocation.mockReturnValue('http://test/checklist');
    db.put.mockResolvedValue({rev: '2-abc'});

    render(<Checklist db={db} checklistId='1234'/>);
    await waitFor(() => screen.getByText(/A Checklist/));

    fireEvent.click(screen.getByText(/Un-complete/));
    await waitFor(() => expect(db.put.mock.calls.length).toBe(1));
    expect(navigate.mock.calls.length).toBe(0);
    expect(db.put.mock.calls[0][0].completed).not.toBeTruthy();

    fireEvent.click(screen.getByText(/Complete/));
    await waitFor(() => expect(db.put.mock.calls.length).toBe(2));
    expect(navigate.mock.calls.length).toBe(0);
    expect(db.put.mock.calls[1][0].completed).toBeTruthy();
  });
  it('does redirect when completing a just uncompleted checklist if you change something', async () => {
    db.get.mockResolvedValue({
      title: 'A Checklist',
      completed: 123456789,
      items: [{_id: '1234', text: 'Something to change'}]
    });
    useLocation.mockReturnValue('http://test/checklist');
    db.put.mockResolvedValue({rev: '2-abc'});

    render(<Checklist db={db} checklistId='1234'/>);
    await waitFor(() => screen.getByText(/A Checklist/));

    fireEvent.click(screen.getByText(/Un-complete/));
    await waitFor(() => expect(db.put.mock.calls.length).toBe(1));
    expect(navigate.mock.calls.length).toBe(0);
    expect(db.put.mock.calls[0][0].completed).not.toBeTruthy();

    fireEvent.click(screen.getByText(/Something to change/));
    await waitFor(() => expect(db.put.mock.calls.length).toBe(2));

    fireEvent.click(screen.getByText(/Complete/));
    await waitFor(() => expect(db.put.mock.calls.length).toBe(3));
    expect(navigate.mock.calls.length).toBe(1);
    expect(db.put.mock.calls[2][0].completed).toBeTruthy();
    expect(navigate.mock.calls[0][0]).toBe('/');
  });
})

// TODO: parsing tests
describe('parsing', () => {

});
