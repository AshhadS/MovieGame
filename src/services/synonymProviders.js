const DATAMUSE_URL = 'https://api.datamuse.com/words';
const DEFAULT_PROVIDER = 'related';
const SUPPORTED_PROVIDERS = new Set(['related', 'datamuse']);
const ABSTRACT_WORDS = new Set([
  'condition', 'process', 'quality', 'relation', 'state', 'status',
]);

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

export const getConfiguredSynonymProvider = () => {
  const configuredProvider = import.meta.env.VITE_SYNONYM_PROVIDER?.toLowerCase();
  return SUPPORTED_PROVIDERS.has(configuredProvider)
    ? configuredProvider
    : DEFAULT_PROVIDER;
};

export const getClueWords = (word, count, provider = getConfiguredSynonymProvider()) => {
  if (provider === 'datamuse') {
    return getRankedDatamuseWords(word, count);
  }

  return getRelatedWords(word, count);
};

