import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

afterEach(() => {
  vi.restoreAllMocks();
});

it('renders without crashing', () => {
  const div = document.createElement('div');
  const root = createRoot(div);

  act(() => {
    root.render(<App />);
  });

  act(() => {
    root.unmount();
  });
});

it('groups clue words and lets the user choose them', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: () => Promise.resolve([
      { word: 'first', numSyllables: 1, tags: ['adj', 'f:10'] },
      { word: 'second', numSyllables: 2, tags: ['adj', 'f:8'] },
      { word: 'third', numSyllables: 1, tags: ['n', 'f:6'] },
      { word: 'fourth', numSyllables: 1, tags: ['n', 'f:4'] },
      { word: 'fifth', numSyllables: 1, tags: ['n', 'f:2'] },
    ]),
  });

  const div = document.createElement('div');
  const root = createRoot(div);

  await act(async () => {
    root.render(<App />);
  });

  const searchButton = [...div.querySelectorAll('button')]
    .find(button => button.textContent === 'Search');

  await act(async () => {
    searchButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(div.querySelectorAll('.clue-group').length).toBeGreaterThan(0);
  const clueButton = div.querySelector('.clue-option');

  await act(async () => {
    clueButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(clueButton.getAttribute('aria-pressed')).toBe('true');
  expect(div.querySelector('.selected-clue-phrase').textContent).toContain(clueButton.textContent);

  await act(async () => {
    clueButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(clueButton.getAttribute('aria-pressed')).toBe('false');

  act(() => {
    root.unmount();
  });
});
