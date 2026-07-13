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

Initial calls were blocked by the environment proxy with `403 Forbidden`. The calls were rerun on 2026-07-11 with approved network access, and live JSON sampling is now complete.

Commands attempted:

```bash
curl -sS --max-time 15 'http://api.datamuse.com/words?rel_syn=scream&max=10'
curl -sS --max-time 15 'https://api.datamuse.com/words?rel_syn=scream&max=10'
curl -sS --max-time 10 'https://api.dictionaryapi.dev/api/v2/entries/en/scream'
curl -sS --max-time 10 'https://freedictionaryapi.com/api/v1/entries/en/scream'
curl -sS --max-time 10 'https://www.dictionaryapi.com/api/v3/references/thesaurus/json/scream?key=DEMO_KEY'
curl -sS --max-time 10 'https://wordsapiv1.p.rapidapi.com/words/scream/synonyms'
```

Observed final status:

| API | Live result | What the response showed |
| --- | --- | --- |
| Datamuse | `200 OK` | Returned ranked synonyms plus part-of-speech, syllable, and frequency metadata. For `scream`, useful results included `cry`, `shout`, and `yell`. |
| Free Dictionary API (`dictionaryapi.dev`) | `200 OK` | Returned complete definitions, but synonym coverage was inconsistent and often empty. |
| FreeDictionaryAPI.com | `200 OK` | Returned rich Wiktionary entries, but synonyms are deeply nested, inconsistently populated, and not ranked for clue quality. |
| Merriam-Webster | `200 OK` with an error payload | The demo placeholder returned `Invalid API key. Not subscribed for this reference.`, confirming that a real subscribed key is required. |
| WordsAPI | `401 Unauthorized` | Confirmed that RapidAPI authentication is required. |

### Ten-word live sample

The three no-key APIs were queried for all ten example movie words. Counts below are returned synonym candidates found in each response; each Datamuse request was capped at 10.

| Word | Datamuse | dictionaryapi.dev | FreeDictionaryAPI.com | Datamuse quality notes |
| --- | ---: | ---: | ---: | --- |
| scream | 10 | 2 | 35 | Strong: `cry`, `shout`, `yell` |
| frozen | 10 | 9 | 0 | Strong: `cold`, `frigid`; needs filtering |
| speed | 10 | 4 | 29 | Strong: `rush`, `race`, `hurry` |
| brave | 10 | 6 | 30 | Strong: `bold`, `valiant`; some uncommon words |
| split | 10 | 3 | 47 | Strong: `break`, `rip`, `cut`, `tear` |
| sing | 8 | 0 | 1 | Weak strict set; fallback adds `chant`, `croon`, `carol` |
| heat | 10 | 7 | 8 | Mixed; fallback adds `ignite`, `warmth`, `fire up` |
| alien | 10 | 4 | 78 | Mixed senses; includes `stranger`, `foreign`, `extraterrestrial` |
| jaws | 1 | 0 | 0 | Strict set fails; fallback adds `mouth`, `maw`, `claws` |
| rocky | 8 | 0 | 31 | Useful after filtering: `rough`, `hard`, `stony` |

Raw counts overstate FreeDictionaryAPI.com usefulness: its candidates can occur at multiple nested entry/sense levels, are unranked, and may mix meanings. Datamuse produced immediately usable candidates for 8 of 10 words and recovered useful candidates for the two weak cases through `ml`.

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
https://api.datamuse.com/words?ml=<word>&md=psf&max=20
```

Do not apply `topics=movie,action,emotion` by default. Live testing showed topic bias can introduce title associations instead of synonyms—for example, `rocky` produced `Balboa`. Topic hints should only be added when the game knows the intended word sense and the hint cannot reveal the movie.

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

## Final report

The previously failed live-call work is complete. The live results support the original primary recommendation with one change to the fallback query:

**Use Datamuse `rel_syn`, then unbiased Datamuse `ml`, then a local curated fallback.**

Datamuse is the only tested no-key API that consistently combines ranked synonym-like candidates with metadata useful for a charades scorer. It is not sufficient to display the first result: `scream` ranked `squall` above the more actable `cry`, `shout`, and `yell`, and ambiguous words such as `sing`, `alien`, and `jaws` mix senses. The local ranking layer is therefore required, not optional.

Production sequence:

1. Request `rel_syn` with `md=psf&max=20`.
2. Normalize and deduplicate results; reject the source word, shared word roots, multiword phrases, rare words, and unsuitable parts of speech.
3. Rank for common, short, actable verbs/adjectives using syllable and frequency metadata.
4. If fewer than three candidates pass, request unbiased `ml` and run the same filters.
5. If the result is still weak or sense-ambiguous, use the curated local map.
6. Cache accepted clues so gameplay does not depend on network latency or API availability.

The keyed Merriam-Webster and WordsAPI services could not be quality-sampled without credentials, but their authentication behavior was successfully verified. They are not needed for the recommended implementation. Free Dictionary API and FreeDictionaryAPI.com remain useful for definition or validation features, but their live synonym output is not dependable enough to drive charades clues.
