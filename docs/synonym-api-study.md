# Synonym API study for MovieGame charades clues

Date: 2026-07-11

## Game need

MovieGame needs synonym clues that are easy for one player to act out and still point the guessing team toward the original movie-title word. For example, if the movie word is `Scream`, a useful clue is `shout` or `cry`; a less useful clue is `utterance` because it is harder to act and less familiar.

## APIs evaluated

| API | Free/key status | Synonym fit | Charades fit | Notes |
| --- | --- | --- | --- | --- |
| Datamuse | Free without key until 2027; then free key required | Excellent | Best | Has direct `rel_syn` synonyms plus metadata like parts of speech, syllables, and frequency. Also supports `ml` and context/topic hints, so we can filter for short, common, actable words. |
| Free Dictionary API (`dictionaryapi.dev`) | Free, no key | Medium | Medium-low | Good for definitions; synonym arrays are sometimes empty, so it is not reliable as the main clue source. |
| FreeDictionaryAPI.com | Free, no key | Medium | Medium-low | Broad Wiktionary data and no key, but dictionary-entry structure is better for definitions/validation than ranked synonym clues. |
| Merriam-Webster Collegiate Thesaurus API | Free key for non-commercial use | High | Medium-high | High-quality thesaurus data, but requires a key and daily limits. Good fallback/quality-check source, not best as the only free no-key app dependency. |
| WordsAPI | Free tier through RapidAPI | High | Medium-high | Has synonyms and related words, but requires RapidAPI signup/key and is quota-managed. Useful if we later need richer lexical relations. |

## Live-call test status

I attempted direct terminal API calls from this environment for all candidate APIs. The environment proxy rejected outbound CONNECT tunnels with `403 Forbidden`, so live JSON quality sampling could not be completed from the terminal here.

Commands attempted:

```bash
curl -sS --max-time 15 'http://api.datamuse.com/words?rel_syn=scream&max=10'
curl -sS --max-time 15 'https://api.datamuse.com/words?rel_syn=scream&max=10'
curl -sS --max-time 10 'https://api.dictionaryapi.dev/api/v2/entries/en/scream'
curl -sS --max-time 10 'https://freedictionaryapi.com/api/v1/entries/en/scream'
curl -sS --max-time 10 'https://www.dictionaryapi.com/api/v3/references/thesaurus/json/scream?key=DEMO_KEY'
curl -sS --max-time 10 'https://wordsapiv1.p.rapidapi.com/words/scream/synonyms'
```

Observed output:

```text
Forbidden
curl: (56) CONNECT tunnel failed, response 403
```

## Evaluation method

Because the network prevented terminal sampling, the recommendation is based on official API capability checks plus English/game-design criteria:

1. **Coverage:** can the API return synonyms/near-synonyms for many short movie-title words?
2. **No-key availability:** can the app call it without a secret backend?
3. **Ranking:** are results ordered in a useful way?
4. **Actability filters:** can we filter to words that are short, common, physical, emotional, or action-oriented?
5. **Clue usefulness:** does the word help the team infer the movie title without being impossible to mime?

## Best API choice

**Use Datamuse as the primary synonym API.**

Recommended endpoint:

```text
https://api.datamuse.com/words?rel_syn=<word>&md=psf&max=20
```

Recommended fallback endpoint when strict synonyms are weak:

```text
https://api.datamuse.com/words?ml=<word>&topics=movie,action,emotion&md=psf&max=20
```

Why Datamuse wins for this game:

- It is built for word games and word-finding.
- `rel_syn` gives real synonym-set results.
- `ml` gives broader clue-like words when direct synonyms are too abstract.
- `md=p/s/f` lets us request part of speech, syllables, and frequency metadata for filtering.
- Results are ranked, which helps pick a good first clue.
- It does not require an API key until January 1, 2027, and then still offers a free key-based daily limit.

## Recommended clue selection rule

After getting results from Datamuse, score each candidate:

```text
+4 if it is a concrete action or emotion word: run, jump, cry, shout, fight, sleep, freeze, burn
+3 if it is one word
+2 if it has 1-2 syllables
+2 if it is high frequency/common
+1 if it is a verb or simple adjective
-3 if it is abstract: condition, state, quality, process, relation
-2 if it is longer than 10 letters
-2 if it is a multiword phrase
-4 if it directly gives away too much or repeats the movie word root
```

Use the highest-scoring word. If no candidate scores well, fall back to a manually curated clue list for that movie word.

## Example expected choices

| Movie-title word | Good actable clues | Bad clues to reject |
| --- | --- | --- |
| Scream | shout, cry, yell | utterance, exclamation |
| Frozen | freeze, cold, ice | immobilized, preserved |
| Speed | fast, rush, race | velocity, rapidity |
| Brave | bold, fearless, hero | courageousness |
| Split | break, cut, divide | bifurcate |
| Sing | chant, hum, vocalize | intone |
| Heat | hot, burn, fire | temperature |
| Alien | monster, stranger, creature | extraterrestrial |
| Jaws | bite, teeth, mouth | mandibles |
| Rocky | stone, rough, bumpy | lithic |

## Implementation recommendation

For the actual app, do not simply show the first API result. Add a small filter/ranker layer:

1. Query Datamuse `rel_syn`.
2. Remove words that are too long, rare, abstract, or multiword.
3. Prefer verbs and simple adjectives.
4. Prefer 1-2 syllable words.
5. Prefer high-frequency words from Datamuse metadata.
6. If fewer than 3 good clues remain, query Datamuse `ml` and re-rank.
7. If still weak, use a local curated fallback map for common movie words.

Final recommendation: **Datamuse + local charades ranking/fallback**. The API supplies candidates; our game-specific scorer chooses the actable clue.
