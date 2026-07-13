import { afterEach, expect, it, vi } from 'vitest';
import { getRandomLatestMovie, isTmdbConfigured } from './movieProvider.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it('reports whether TMDB has been configured', () => {
  vi.stubEnv('VITE_TMDB_API_TOKEN', 'test-token');
  expect(isTmdbConfigured()).toBe(true);
});

it('loads a random now-playing movie from TMDB', async () => {
  vi.stubEnv('VITE_TMDB_API_TOKEN', 'test-token');
  vi.stubEnv('VITE_TMDB_REGION', 'KW');
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      results: [
        { title: 'Current Movie' },
        { title: 'Another Movie' },
      ],
    }),
  });

  await expect(getRandomLatestMovie()).resolves.toBe('Current Movie');
  expect(fetchMock.mock.calls[0][0]).toContain('/movie/now_playing?');
  expect(fetchMock.mock.calls[0][0]).toContain('region=KW');
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token');
});

it('excludes the currently displayed movie', async () => {
  vi.stubEnv('VITE_TMDB_API_TOKEN', 'test-token');
  vi.spyOn(Math, 'random').mockReturnValue(0);
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      results: [
        { title: 'Current Movie' },
        { title: 'New Movie' },
      ],
    }),
  });

  await expect(getRandomLatestMovie('Current Movie')).resolves.toBe('New Movie');
});

