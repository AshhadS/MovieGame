import { afterEach, describe, expect, it, vi } from 'vitest';
import { getClueWords } from './synonymProviders.js';

const response = body => ({
  ok: true,
  json: () => Promise.resolve(body),
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
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

  it('loads and normalizes Collegiate Thesaurus synonyms', async () => {
    vi.stubEnv('VITE_MERRIAM_WEBSTER_API_KEY', 'test-key');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response([
      {
        meta: {
          syns: [
            ['cry', 'shout', 'belly laugh'],
            ['yell', 'cry'],
          ],
        },
      },
    ]));

    await expect(getClueWords('scream', 3, 'merriam-webster'))
      .resolves.toEqual(['cry', 'shout', 'yell']);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toContain('/references/thesaurus/json/scream?key=test-key');
  });

  it('reuses cached Merriam-Webster synonyms across repeated lookups', async () => {
    vi.stubEnv('VITE_MERRIAM_WEBSTER_API_KEY', 'test-key');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response([{
      meta: { syns: [['dash', 'race', 'sprint']] },
    }]));

    await expect(getClueWords('Run', 2, 'merriam-webster')).resolves.toEqual(['dash', 'race']);
    await expect(getClueWords('run', 3, 'merriam-webster')).resolves.toEqual(['dash', 'race', 'sprint']);

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('deduplicates simultaneous Merriam-Webster lookups', async () => {
    vi.stubEnv('VITE_MERRIAM_WEBSTER_API_KEY', 'test-key');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response([{
      meta: { syns: [['leap', 'bound']] },
    }]));

    await expect(Promise.all([
      getClueWords('jump', 1, 'merriam-webster'),
      getClueWords('JUMP', 2, 'merriam-webster'),
    ])).resolves.toEqual([['leap'], ['leap', 'bound']]);

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('requires an API key in Merriam-Webster mode', async () => {
    vi.stubEnv('VITE_MERRIAM_WEBSTER_API_KEY', '');

    await expect(getClueWords('scream', 3, 'merriam-webster'))
      .rejects.toThrow('Merriam-Webster is not configured');
  });
});
