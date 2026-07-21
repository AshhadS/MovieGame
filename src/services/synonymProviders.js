const DATAMUSE_URL = 'https://api.datamuse.com/words';
const MERRIAM_WEBSTER_URL = 'https://www.dictionaryapi.com/api/v3/references/thesaurus/json';
const MERRIAM_WEBSTER_CACHE_KEY = 'movie-game:merriam-webster-cache:v1';
const MERRIAM_WEBSTER_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MERRIAM_WEBSTER_CACHE_MAX_ENTRIES = 250;
const DEFAULT_PROVIDER = 'related';
const SUPPORTED_PROVIDERS = new Set(['related', 'datamuse', 'merriam-webster']);
const ABSTRACT_WORDS = new Set([
  'condition', 'process', 'quality', 'relation', 'state', 'status',
]);
const merriamWebsterRequests = new Map();
const LOG_PREFIX = '[MovieGame synonyms]';

const logInfo = (message, details = {}) => console.info(LOG_PREFIX, message, details);
const logWarning = (message, details = {}) => console.warn(LOG_PREFIX, message, details);
const logError = (message, error, details = {}) => console.error(
  LOG_PREFIX,
  message,
  { ...details, error },
);

const readMerriamWebsterCache = () => {
  try {
    const cache = JSON.parse(localStorage.getItem(MERRIAM_WEBSTER_CACHE_KEY));
    return cache && typeof cache === 'object' ? cache : {};
  } catch (error) {
    logWarning('Could not read the Merriam-Webster cache; continuing without it.', { error });
    return {};
  }
};

const writeMerriamWebsterCache = cache => {
  try {
    localStorage.setItem(MERRIAM_WEBSTER_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    // Caching is an optimization; private browsing or a full store must not break clues.
    logWarning('Could not write the Merriam-Webster cache; results will not persist.', { error });
  }
};

const getCachedMerriamWebsterWords = word => {
  const cache = readMerriamWebsterCache();
  const entry = cache[word];

  if (!entry) {
    logInfo('Merriam-Webster cache miss.', { word });
    return null;
  }

  if (!Array.isArray(entry.words) || entry.words.length === 0 || entry.expiresAt <= Date.now()) {
    const reason = !Array.isArray(entry.words)
      ? 'invalid entry'
      : entry.words.length === 0
        ? 'empty entry'
        : 'expired entry';

    logInfo('Merriam-Webster cache entry ignored.', { word, reason });
    if (entry) {
      delete cache[word];
      writeMerriamWebsterCache(cache);
    }
    return null;
  }

  entry.lastAccessedAt = Date.now();
  writeMerriamWebsterCache(cache);
  logInfo('Merriam-Webster cache hit; API request skipped.', {
    word,
    synonymCount: entry.words.length,
  });
  return entry.words;
};

const cacheMerriamWebsterWords = (word, words) => {
  const now = Date.now();
  const cache = readMerriamWebsterCache();

  Object.entries(cache).forEach(([cachedWord, entry]) => {
    if (!entry || entry.expiresAt <= now) delete cache[cachedWord];
  });

  cache[word] = {
    words,
    expiresAt: now + MERRIAM_WEBSTER_CACHE_TTL_MS,
    lastAccessedAt: now,
  };

  const entries = Object.entries(cache);
  if (entries.length > MERRIAM_WEBSTER_CACHE_MAX_ENTRIES) {
    entries
      .sort(([, left], [, right]) => left.lastAccessedAt - right.lastAccessedAt)
      .slice(0, entries.length - MERRIAM_WEBSTER_CACHE_MAX_ENTRIES)
      .forEach(([cachedWord]) => delete cache[cachedWord]);
  }

  writeMerriamWebsterCache(cache);
};

const requestDatamuse = async params => {
  const response = await fetch(`${DATAMUSE_URL}?${new URLSearchParams(params)}`);

  if (!response.ok) {
    throw new Error(`Datamuse request failed with status ${response.status}`);
  }

  const result = await response.json();
  return Array.isArray(result) ? result : [];
};

const frequencyFor = candidate => {
  const frequencyTag = candidate.tags?.find(tag => tag.startsWith('f:'));
  return frequencyTag ? Number(frequencyTag.slice(2)) || 0 : 0;
};

const scoreCandidate = candidate => {
  const tags = candidate.tags || [];
  let score = 3;

  if (candidate.numSyllables > 0 && candidate.numSyllables <= 2) score += 2;
  if (tags.includes('v') || tags.includes('adj')) score += 1;
  score += Math.min(3, Math.log10(frequencyFor(candidate) + 1));

  return score;
};

const rankCandidates = (candidates, sourceWord, count, existingWords = []) => {
  const source = sourceWord.toLowerCase();
  const seen = new Set(existingWords.map(word => word.toLowerCase()));

  return candidates
    .filter(candidate => typeof candidate.word === 'string')
    .filter(candidate => {
      const word = candidate.word.trim().toLowerCase();
      return word
        && word !== source
        && !seen.has(word)
        && !word.includes(' ')
        && word.length <= 10
        && !ABSTRACT_WORDS.has(word);
    })
    .sort((left, right) => scoreCandidate(right) - scoreCandidate(left))
    .slice(0, count)
    .map(candidate => candidate.word);
};

// Preserves the app's original behavior: broad Datamuse "means like" results,
// in the order returned by the API.
const getRelatedWords = async (word, count) => {
  const candidates = await requestDatamuse({ ml: word, max: String(count) });
  return candidates.slice(0, count).map(candidate => candidate.word).filter(Boolean);
};

// Uses strict synonyms first, then broadens only when there are too few good clues.
const getRankedDatamuseWords = async (word, count) => {
  const requestCount = String(Math.max(20, count));
  const synonyms = await requestDatamuse({
    rel_syn: word,
    md: 'psf',
    max: requestCount,
  });
  const rankedSynonyms = rankCandidates(synonyms, word, count);

  if (rankedSynonyms.length >= count) {
    return rankedSynonyms;
  }

  const related = await requestDatamuse({
    ml: word,
    md: 'psf',
    max: requestCount,
  });
  const rankedRelated = rankCandidates(
    related,
    word,
    count - rankedSynonyms.length,
    rankedSynonyms,
  );

  return [...rankedSynonyms, ...rankedRelated];
};

const getMerriamWebsterWords = async (word, count) => {
  const apiKey = import.meta.env.VITE_MERRIAM_WEBSTER_API_KEY?.trim();

  if (!apiKey) {
    logError('Merriam-Webster lookup stopped because no API key was found.', null, {
      envVariable: 'VITE_MERRIAM_WEBSTER_API_KEY',
      word,
    });
    throw new Error('Merriam-Webster is not configured');
  }

  const normalizedWord = word.trim().toLowerCase();
  const cachedWords = getCachedMerriamWebsterWords(normalizedWord);

  if (cachedWords) {
    return cachedWords.slice(0, count);
  }

  if (!merriamWebsterRequests.has(normalizedWord)) {
    const request = (async () => {
      logInfo('Starting Merriam-Webster API request.', {
        word: normalizedWord,
        apiKeyConfigured: true,
        endpoint: `${MERRIAM_WEBSTER_URL}/${encodeURIComponent(normalizedWord)}`,
      });

      let response;
      try {
        response = await fetch(
          `${MERRIAM_WEBSTER_URL}/${encodeURIComponent(normalizedWord)}?key=${encodeURIComponent(apiKey)}`,
        );
      } catch (error) {
        logError('Merriam-Webster fetch failed before a response was received.', error, {
          word: normalizedWord,
          hint: 'Check the browser Network tab for CORS, DNS, or connectivity errors.',
        });
        throw error;
      }

      logInfo('Merriam-Webster API response received.', {
        word: normalizedWord,
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        logError('Merriam-Webster returned an unsuccessful HTTP status.', null, {
          word: normalizedWord,
          status: response.status,
        });
        throw new Error(`Merriam-Webster request failed with status ${response.status}`);
      }

      const entries = await response.json();

      if (!Array.isArray(entries)) {
        logWarning('Merriam-Webster returned an unexpected response shape.', {
          word: normalizedWord,
          responseType: typeof entries,
        });
        return [];
      }

      logInfo('Merriam-Webster response parsed.', {
        word: normalizedWord,
        entryCount: entries.length,
        spellingSuggestionsOnly: entries.length > 0 && entries.every(entry => typeof entry === 'string'),
      });

      const seen = new Set();

      const words = entries
        .flatMap(entry => Array.isArray(entry?.meta?.syns) ? entry.meta.syns.flat(Infinity) : [])
        .filter(candidate => typeof candidate === 'string')
        .map(candidate => candidate.trim())
        .filter(candidate => {
          const normalized = candidate.toLowerCase();
          const isUsable = normalized
            && normalized !== normalizedWord
            && !seen.has(normalized)
            && !normalized.includes(' ')
            && normalized.length <= 10
            && !ABSTRACT_WORDS.has(normalized);

          if (isUsable) {
            seen.add(normalized);
          }

          return isUsable;
        });

      if (words.length > 0) {
        cacheMerriamWebsterWords(normalizedWord, words);
      } else {
        logWarning('No usable Merriam-Webster synonyms were found; result was not cached.', {
          word: normalizedWord,
          rawEntryCount: entries.length,
        });
      }

      logInfo('Merriam-Webster lookup completed.', {
        word: normalizedWord,
        usableSynonymCount: words.length,
        requestedCount: count,
      });
      return words;
    })().finally(() => merriamWebsterRequests.delete(normalizedWord));

    merriamWebsterRequests.set(normalizedWord, request);
  } else {
    logInfo('Reusing an in-flight Merriam-Webster request.', { word: normalizedWord });
  }

  const words = await merriamWebsterRequests.get(normalizedWord);
  return words.slice(0, count);
};

export const getConfiguredSynonymProvider = () => {
  const configuredProvider = import.meta.env.VITE_SYNONYM_PROVIDER?.trim().toLowerCase();
  const provider = SUPPORTED_PROVIDERS.has(configuredProvider)
    ? configuredProvider
    : DEFAULT_PROVIDER;

  if (provider !== configuredProvider) {
    logWarning('Configured synonym provider is missing or unsupported; using the default.', {
      configuredProvider: configuredProvider || '(missing)',
      provider,
    });
  }

  return provider;
};

export const getClueWords = (word, count, provider = getConfiguredSynonymProvider()) => {
  logInfo('Clue-word lookup requested.', { word, count, provider });

  if (provider === 'datamuse') {
    return getRankedDatamuseWords(word, count);
  }

  if (provider === 'merriam-webster') {
    return getMerriamWebsterWords(word, count);
  }

  return getRelatedWords(word, count);
};
