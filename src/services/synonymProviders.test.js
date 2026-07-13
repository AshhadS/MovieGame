import { afterEach, describe, expect, it, vi } from 'vitest';
import { getClueWords } from './synonymProviders.js';

const response = body => ({
  ok: true,
  json: () => Promise.resolve(body),
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('synonym providers', () => {
  it('preserves the existing related-word provider', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response([
      { word: 'shout' },
      { word: 'cry' },
    ]));

    await expect(getClueWords('scream', 2, 'related')).resolves.toEqual(['shout', 'cry']);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toContain('ml=scream');
  });

  it('uses strict ranked synonyms in datamuse mode', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response([
      { word: 'utterance', numSyllables: 3, tags: ['n', 'f:0.1'] },
      { word: 'cry', numSyllables: 1, tags: ['n', 'v', 'f:20'] },
      { word: 'shout', numSyllables: 1, tags: ['n', 'v', 'f:5'] },
    ]));

    await expect(getClueWords('scream', 2, 'datamuse')).resolves.toEqual(['cry', 'shout']);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toContain('rel_syn=scream');
    expect(fetchMock.mock.calls[0][0]).toContain('md=psf');
  });

  it('falls back to related words when strict synonyms are insufficient', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response([{ word: 'jaw', numSyllables: 1, tags: ['n', 'f:8'] }]))
      .mockResolvedValueOnce(response([
        { word: 'mouth', numSyllables: 1, tags: ['n', 'f:30'] },
        { word: 'jaw', numSyllables: 1, tags: ['n', 'f:8'] },
      ]));

    await expect(getClueWords('jaws', 2, 'datamuse')).resolves.toEqual(['jaw', 'mouth']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain('ml=jaws');
  });
});

