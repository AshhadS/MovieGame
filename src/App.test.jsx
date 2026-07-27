import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

it('renders without crashing', () => {
  const div = document.createElement('div');
  const root = createRoot(div);

  act(() => {
    root.render(<App />);
  });

  expect(div.querySelector('.brand-icon').getAttribute('src')).toContain('favicon.svg');

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

  const searchButton = div.querySelector('button[aria-label="Search movie title"]');
  const movieInput = div.querySelector('#movie-name');
  const submittedMovieTitle = movieInput.value;

  await act(async () => {
    searchButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(movieInput.value).toBe(submittedMovieTitle);
  expect(div.querySelectorAll('.clue-group').length).toBeGreaterThan(0);
  expect(div.querySelector('.source-word-number').textContent).toBe('1.');
  const clueButton = div.querySelector('.clue-option');
  expect(clueButton.querySelector('.clue-option-number')).toBeNull();
  const clueLabel = clueButton.textContent;

  await act(async () => {
    clueButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(clueButton.getAttribute('aria-pressed')).toBe('true');
  expect(div.querySelector('.selected-clue-phrase').textContent).toContain(clueLabel);

  await act(async () => {
    clueButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(clueButton.getAttribute('aria-pressed')).toBe('false');

  act(() => {
    root.unmount();
  });
});

it('restores scores from local storage after remounting', () => {
  const firstContainer = document.createElement('div');
  const firstRoot = createRoot(firstContainer);

  act(() => {
    firstRoot.render(<App />);
  });

  act(() => {
    firstContainer.querySelector('button[aria-label="Award point"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(window.localStorage.getItem('movieGame.scores')).toBe('[1,0]');

  act(() => {
    firstRoot.unmount();
  });

  const refreshedContainer = document.createElement('div');
  const refreshedRoot = createRoot(refreshedContainer);

  act(() => {
    refreshedRoot.render(<App />);
  });

  expect(refreshedContainer.querySelector('.score-toggle').textContent).toBe('1 - 0');

  act(() => {
    refreshedRoot.unmount();
  });
});
