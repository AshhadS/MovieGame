import React, { Component } from 'react';
import { getClueWords } from '../services/synonymProviders.js';
import { getRandomLatestMovie, isTmdbConfigured } from '../services/movieProvider.js';

const Icon = ({ name }) => {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    shuffle: <><path d="M16 3h5v5" /><path d="m4 20 5.5-5.5" /><path d="m15 9 6-6" /><path d="M4 4l16.5 16.5" /><path d="M16 21h5v-5" /></>,
    play: <path d="m8 5 11 7-11 7Z" />,
    pause: <><path d="M9 5v14" /><path d="M15 5v14" /></>,
    reset: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    minus: <path d="M5 12h14" />,
    skip: <><path d="m5 5 9 7-9 7Z" /><path d="M19 5v14" /></>,
    clear: <><path d="m3 6 3 15h12l3-15" /><path d="M8 6V3h8v3" /><path d="M1 6h22" /><path d="M10 10v7M14 10v7" /></>,
    close: <><path d="M6 6l12 12" /><path d="M18 6 6 18" /></>,
    trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0Z" /><path d="M12 13v5" /><path d="M8 21h8" /><path d="M6 6H3v2a4 4 0 0 0 5 4M18 6h3v2a4 4 0 0 1-5 4" /></>,
  };

  return (
    <svg className="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
};

const MOVIE_TITLES = [
  'Blade Runner',
  'The Grand Budapest Hotel',
  'Moonlight',
  'Spirited Away',
  'The Matrix',
  'Casablanca',
  'Everything Everywhere All at Once',
  'Mad Max Fury Road',
  'The Princess Bride',
  'Jurassic Park',
  'The Social Network',
  'Back to the Future',
  'Pan\'s Labyrinth',
  'Arrival',
  'Knives Out',
  'The Iron Giant',
  'Hidden Figures',
  'Ratatouille',
  'No Country for Old Men',
  'The Dark Knight',
  'Oppenheimer',
  'Barbie',
  'Dune Part Two',
  'Inside Out 2',
  'Deadpool and Wolverine',
  'Wicked',
  'The Substance',
  'Anora',
  'Challengers',
  'Godzilla Minus One',
  'Past Lives',
  'Poor Things',
  'The Holdovers',
  'Killers of the Flower Moon',
  'Top Gun Maverick',
  'Spider Man Across the Spider Verse',
  'Avatar The Way of Water',
  'The Batman',
  'A Quiet Place Day One',
  'Kingdom of the Planet of the Apes',
  'Furiosa A Mad Max Saga',
  'The Fall Guy',
  'Civil War',
  'Longlegs',
  'The Wild Robot',
  'Flow',
  'Conclave',
  'Nosferatu',
  'Alien Romulus',
];

const getRandomMovieTitle = (excludedTitle = '') => {
  const availableTitles = MOVIE_TITLES.filter(title => title !== excludedTitle);
  return availableTitles[Math.floor(Math.random() * availableTitles.length)] || MOVIE_TITLES[0];
}

class Main extends Component {
  constructor(props) {
    super(props)
    this.state = {
      movie_name: getRandomMovieTitle(),
      synonyms: [],
      selectedClues: [],
      clueMovieName: '',
      synonyms_count: 5,
      isLoading: false,
      statusMessage: 'Enter a Movie Name, then press Enter or tap Search.',
      teams: [
        { name: 'Team One', score: 0 },
        { name: 'Team Two', score: 0 },
      ],
      activeTeam: 0,
      roundSeconds: 120,
      secondsRemaining: 120,
      isTimerRunning: false,
      isScorePopupOpen: false,
      skip_words: [
        'in', 'on', 'of', 'where', 'when', 'the', 'a', 'an', 'for', 'to'
      ]
    }
  }

  componentWillUnmount() {
    if (this.timerId) {
      window.clearInterval(this.timerId);
    }
  }

  generateSynonyms = (movieName = this.state.movie_name) => {
    const encoded_name = movieName
      .split(' ')
      .map(word => word.trim())
      .filter(Boolean);

    if (encoded_name.length === 0) {
      this.setState({ synonyms: [], selectedClues: [], clueMovieName: '', statusMessage: 'Add a movie title to get clue words.' });
      return;
    }

    this.setState({ isLoading: true, clueMovieName: movieName, statusMessage: 'Generating clue words...' });

    Promise.all(encoded_name.map(word => {
      if (this.state.skip_words.includes(word.toLowerCase())) {
        return Promise.resolve([word]);
      }

      return getClueWords(word, this.state.synonyms_count)
        .then(matches => {
          return matches.length ? matches : [word];
        });
    })).then(syns => {
      this.setState({
        synonyms: syns,
        selectedClues: syns.map(() => []),
        isLoading: false,
        statusMessage: 'Choose one or more clue words from each group.'
      });
    }, error => {
      console.error('[MovieGame synonyms] Could not generate clue words.', {
        movieName,
        provider: import.meta.env.VITE_SYNONYM_PROVIDER || '(not configured)',
        error,
      });
      this.setState({
        synonyms: [],
        selectedClues: [],
        isLoading: false,
        statusMessage: 'Could not reach the clue-word service. Try again in a moment.'
      });
    })
  }

  input_change=(e)=> {
    const nextMovieName = e.target.value;
    this.setState({
      movie_name: nextMovieName,
      clueMovieName: '',
      synonyms: [],
      selectedClues: [],
      statusMessage: nextMovieName.trim()
        ? 'Press Enter or Search to generate clue words for this title.'
        : 'Type a movie title, then press Enter or tap Search.',
    })
  }

  submitMovieTitle=(movieName = this.state.movie_name)=> {
    const submittedMovieName = movieName.trim();

    if (!submittedMovieName) {
      this.setState({ synonyms: [], selectedClues: [], clueMovieName: '', statusMessage: 'Add a movie title to get clue words.' });
      return;
    }

    this.generateSynonyms(submittedMovieName);
  }

  input_key_down=(e)=> {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
      this.submitMovieTitle(e.currentTarget.value);
    }
  }

  startTimer=()=> {
    if (this.timerId || this.state.secondsRemaining === 0) {
      return;
    }

    this.setState({ isTimerRunning: true });
    this.timerId = window.setInterval(() => {
      this.setState(({ secondsRemaining }) => {
        if (secondsRemaining <= 1) {
          window.clearInterval(this.timerId);
          this.timerId = null;
          return { secondsRemaining: 0, isTimerRunning: false };
        }

        return { secondsRemaining: secondsRemaining - 1 };
      });
    }, 1000);
  }

  stopTimer=()=> {
    if (this.timerId) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }

    this.setState({ isTimerRunning: false });
  }

  resetTimer=()=> {
    this.stopTimer();
    this.setState(({ roundSeconds }) => ({ secondsRemaining: roundSeconds }));
  }

  switchTeam=()=> {
    this.setState(({ activeTeam, teams }) => ({ activeTeam: (activeTeam + 1) % teams.length }));
  }

  updateScore=(teamIndex, amount, closePopup = false)=> {
    this.setState(({ teams, isScorePopupOpen }) => ({
      isScorePopupOpen: closePopup ? false : isScorePopupOpen,
      teams: teams.map((team, index) => {
        if (index !== teamIndex) {
          return team;
        }

        return { ...team, score: Math.max(0, team.score + amount) };
      })
    }));
  }

  resetScores=(closePopup = false)=> {
    this.setState(({ teams, isScorePopupOpen }) => ({
      activeTeam: 0,
      isScorePopupOpen: closePopup ? false : isScorePopupOpen,
      teams: teams.map(team => ({ ...team, score: 0 }))
    }));
  }

  passTurn=(closePopup = false)=> {
    if (this.timerId) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }

    this.setState(({ activeTeam, teams, roundSeconds, isScorePopupOpen }) => ({
      activeTeam: (activeTeam + 1) % teams.length,
      secondsRemaining: roundSeconds,
      isTimerRunning: false,
      isScorePopupOpen: closePopup ? false : isScorePopupOpen,
    }));
  }

  awardPoint=(closePopup = false)=> {
    if (this.timerId) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }

    this.setState(({ activeTeam, teams, roundSeconds, isScorePopupOpen }) => ({
      activeTeam: (activeTeam + 1) % teams.length,
      secondsRemaining: roundSeconds,
      isTimerRunning: false,
      isScorePopupOpen: closePopup ? false : isScorePopupOpen,
      teams: teams.map((team, index) => (
        index === activeTeam ? { ...team, score: team.score + 1 } : team
      )),
    }));
  }

  openScorePopup=()=> {
    this.setState({ isScorePopupOpen: true });
  }

  closeScorePopup=()=> {
    this.setState({ isScorePopupOpen: false });
  }

  randomizeMovie=async()=> {
    const excludedTitle = this.state.movie_name || this.state.clueMovieName;
    this.setState({ isLoading: true, statusMessage: 'Loading a recent movie...' });

    let randomTitle;

    try {
      randomTitle = isTmdbConfigured()
        ? await getRandomLatestMovie(excludedTitle)
        : getRandomMovieTitle(excludedTitle);
    } catch {
      randomTitle = getRandomMovieTitle(excludedTitle);
    }

    this.setState({ movie_name: randomTitle, clueMovieName: '', synonyms: [], selectedClues: [] }, () => this.generateSynonyms(randomTitle));
  }

  toggleClue=(wordIndex, clue)=> {
    this.setState(({ selectedClues }) => {
      const nextSelectedClues = selectedClues.map(words => [...words]);
      const selectedForWord = nextSelectedClues[wordIndex] || [];
      const isSelected = selectedForWord.includes(clue);

      nextSelectedClues[wordIndex] = isSelected
        ? selectedForWord.filter(word => word !== clue)
        : [...selectedForWord, clue];

      return { selectedClues: nextSelectedClues };
    });
  }

  clearSelectedClues=()=> {
    this.setState(({ synonyms }) => ({ selectedClues: synonyms.map(() => []) }));
  }

  formatTime = () => {
    const minutes = Math.floor(this.state.secondsRemaining / 60);
    const seconds = this.state.secondsRemaining % 60;

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  renderScoreControls = () => {
    const { teams, activeTeam } = this.state;

    return (
      <div className="scoreboard">
        {teams.map((team, index) => (
          <article className={`team-card ${activeTeam === index ? 'is-active' : ''}`} key={team.name}>
            <p className="eyebrow">{activeTeam === index ? 'Guessing now' : 'Next up'}</p>
            <h2>{team.name}</h2>
            <p className="score">{team.score}</p>
            <div className="score-actions">
              <button type="button" className="secondary-button icon-button" aria-label={`Subtract a point from ${team.name}`} title="Subtract point" onClick={() => this.updateScore(index, -1, true)}><Icon name="minus" /></button>
              <button type="button" className="secondary-button icon-button" aria-label={`Add a point to ${team.name}`} title="Add point" onClick={() => this.updateScore(index, 1, true)}><Icon name="plus" /></button>
            </div>
          </article>
        ))}
        <div className="round-actions score-round-actions">
          <button type="button" className="icon-button" aria-label="Award point" title="Award point" onClick={() => this.awardPoint(true)}><Icon name="trophy" /></button>
          <button type="button" className="secondary-button icon-button" aria-label="Skip turn" title="Skip turn" onClick={() => this.passTurn(true)}><Icon name="skip" /></button>
          <button type="button" className="secondary-button icon-button" aria-label="Reset scores" title="Reset scores" onClick={() => this.resetScores(true)}><Icon name="reset" /></button>
        </div>
      </div>
    );
  }

  render() {
    let {synonyms, movie_name, clueMovieName, isLoading, statusMessage, teams, activeTeam, isTimerRunning, secondsRemaining, isScorePopupOpen, selectedClues} = this.state;
    const activeTeamName = teams[activeTeam].name;

    const words = (clueMovieName || movie_name).split(' ').filter(Boolean);
    const hasClues = words.length > 0 && synonyms.length === words.length;
    const selectedWords = selectedClues.flat();

    return (
      <main className="main-wrapper">
        <header className="top-bar">
          <div className="brand-lockup">
            <img className="brand-icon" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" aria-hidden="true" />
            <div>
              <p className="eyebrow">Movie synonym game</p>
              <h1 id="movie-name-heading">Charades</h1>
            </div>
          </div>
          <div className="top-status" aria-label="Game status">
            <span className="turn-pill">{activeTeamName}</span>
            <button type="button" className="secondary-button score-toggle" onClick={this.openScorePopup}>{teams.map(team => team.score).join(' - ')}</button>
          </div>
        </header>

        <section className="hero-card" aria-labelledby="movie-name-heading">
          <div className="movie-form">
            <label htmlFor="movie-name">Movie Name</label>
            <div className="input-row">
              <input type="text"
                id="movie-name"
                placeholder="Enter a movie name"
                name="movie_name"
                value={this.state.movie_name}
                onChange={e => {this.input_change(e)}}
                onKeyDown={this.input_key_down}
              />
              <button type="button" className="icon-button" aria-label="Search movie title" title="Search" onClick={() => this.submitMovieTitle()} disabled={isLoading}><Icon name="search" /></button>
              <button type="button" className="secondary-button icon-button" aria-label="Choose a random latest movie" title="Random latest" onClick={this.randomizeMovie} disabled={isLoading}><Icon name="shuffle" /></button>
            </div>
          </div>

          <p className="subtitle" role="status">{isLoading ? '🎬 ' : '✨ '}{statusMessage}</p>
        </section>

        <section className="clues-panel" aria-labelledby="clues-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Play words</p>
              <h2 id="clues-heading">Choose clue words</h2>
            </div>
            {clueMovieName && <p className="clue-title">For <strong>{clueMovieName}</strong></p>}
          </div>
          {hasClues ? (
            <>
              <div className="clue-groups">
                {words.map((sourceWord, wordIndex) => (
                  <article className="clue-group" key={`${sourceWord}-${wordIndex}`}>
                    <h3>
                      <span className="source-word-number" aria-hidden="true">{wordIndex + 1}.</span>
                      <span>{sourceWord}</span>
                    </h3>
                    <div className="clue-options" aria-label={`Clue words for ${sourceWord}`}>
                      {synonyms[wordIndex].map((clue, clueIndex) => {
                        const isSelected = selectedClues[wordIndex]?.includes(clue);

                        return (
                          <button
                            type="button"
                            className={`clue-option ${isSelected ? 'is-selected' : ''}`}
                            aria-pressed={isSelected}
                            key={`${clue}-${clueIndex}`}
                            onClick={() => this.toggleClue(wordIndex, clue)}
                          >
                            {clue}
                          </button>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
              <div className="selected-clues" aria-live="polite">
                <div>
                  <p className="eyebrow">Your selected clues</p>
                  <p className={selectedWords.length ? 'selected-clue-phrase' : 'selected-clue-placeholder'}>
                    {selectedWords.length ? selectedWords.join(' · ') : 'Tap clue words above to build your clue.'}
                  </p>
                </div>
                {selectedWords.length > 0 && (
                  <button type="button" className="secondary-button icon-button" aria-label="Clear selected clues" title="Clear selected clues" onClick={this.clearSelectedClues}><Icon name="clear" /></button>
                )}
              </div>
            </>
          ) : (
            <p className="empty-state">Start typing a title to clear old clues. Search keeps existing clues visible until the new clue words are ready.</p>
          )}
        </section>

        <section className="timer-card compact-timer" aria-label="Round timer">
          <div>
            <p className="eyebrow">{activeTeamName} guessing</p>
            <p className="timer-display" aria-live="polite">{this.formatTime()}</p>
          </div>
          <div className="timer-controls">
            <div className="timer-actions">
              <button type="button" className="icon-button" aria-label="Start timer" title="Start timer" onClick={this.startTimer} disabled={isTimerRunning || secondsRemaining === 0}><Icon name="play" /></button>
              <button type="button" className="secondary-button icon-button" aria-label="Pause timer" title="Pause timer" onClick={this.stopTimer} disabled={!isTimerRunning}><Icon name="pause" /></button>
              <button type="button" className="secondary-button icon-button" aria-label="Reset timer" title="Reset timer" onClick={this.resetTimer}><Icon name="reset" /></button>
            </div>
            <div className="turn-result-actions">
              <button type="button" className="add-point-button icon-button" aria-label="Award point" title="Award point" onClick={() => this.awardPoint()}><Icon name="trophy" /></button>
              <button type="button" className="secondary-button skip-button icon-button" aria-label="Skip turn" title="Skip turn" onClick={() => this.passTurn()}><Icon name="skip" /></button>
            </div>
          </div>
        </section>

        {isScorePopupOpen && (
          <div className="score-modal-backdrop" role="presentation" onClick={this.closeScorePopup}>
            <section className="score-modal" role="dialog" aria-modal="true" aria-labelledby="score-heading" onClick={event => event.stopPropagation()}>
              <div className="modal-header">
                <h2 id="score-heading">Scores</h2>
                <button type="button" className="secondary-button close-button icon-button" aria-label="Close scores" title="Close" onClick={this.closeScorePopup}><Icon name="close" /></button>
              </div>
              {this.renderScoreControls()}
            </section>
          </div>
        )}
      </main>
    )
  }
}

export default Main;
