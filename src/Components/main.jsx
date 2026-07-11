import React, { Component } from 'react';

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
      clueMovieName: '',
      synonyms_count: 5,
      isLoading: false,
      statusMessage: 'Type a movie title, then press Enter or tap Search.',
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
      this.setState({ synonyms: [], statusMessage: 'Add a movie title to get clue words.' });
      return;
    }

    this.setState({ isLoading: true, clueMovieName: movieName, statusMessage: 'Generating clue words...' });

    Promise.all(encoded_name.map(word => {
      if (this.state.skip_words.includes(word.toLowerCase())) {
        return Promise.resolve([word]);
      }

      return fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(word)}`)
        .then(res => res.json())
        .then(result => {
          const matches = result.slice(0, this.state.synonyms_count).map(resp => resp.word);
          return matches.length ? matches : [word];
        });
    })).then(syns => {
      this.setState({
        synonyms: syns,
        isLoading: false,
        statusMessage: 'Use these clue rows to help players guess the real movie title.'
      });
    }, () => {
      this.setState({
        synonyms: [],
        isLoading: false,
        statusMessage: 'Could not reach the clue-word service. Try again in a moment.'
      });
    })
  }

  input_change=(e)=> {
    const nextMovieName = e.target.value;
    this.setState({movie_name: nextMovieName, synonyms: []})
  }

  submitMovieTitle=(movieName = this.state.movie_name)=> {
    this.generateSynonyms(movieName);
    this.setState({ movie_name: '' });
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

  randomizeMovie=()=> {
    const randomTitle = getRandomMovieTitle(this.state.movie_name);
    this.setState({ movie_name: randomTitle, synonyms: [] }, () => this.generateSynonyms(randomTitle));
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
              <button type="button" className="secondary-button" onClick={() => this.updateScore(index, -1, true)}>-</button>
              <button type="button" className="secondary-button" onClick={() => this.updateScore(index, 1, true)}>+</button>
            </div>
          </article>
        ))}
        <div className="round-actions score-round-actions">
          <button type="button" onClick={() => this.awardPoint(true)}>Add point</button>
          <button type="button" className="secondary-button" onClick={() => this.passTurn(true)}>Skip</button>
          <button type="button" className="secondary-button" onClick={() => this.resetScores(true)}>Reset scores</button>
        </div>
      </div>
    );
  }

  render() {
    let {synonyms, movie_name, clueMovieName, synonyms_count, isLoading, statusMessage, teams, activeTeam, isTimerRunning, secondsRemaining, isScorePopupOpen} = this.state;

    let syn_list = null;
    const words = (clueMovieName || movie_name).split(' ').filter(Boolean);

    if(synonyms.length === words.length ) {
      const built_words = [];

      for (let i = 0; i <= synonyms_count - 1; i++) {
        const rowWords = [];

        for (let s = 0; s <= synonyms.length - 1; s++) {
          rowWords.push(synonyms[s][i] || synonyms[s][0] || words[s]);
        }

        built_words[i] = rowWords.join(' · ');
      }

      syn_list = built_words.map((word, index) => (
        <li className="clue-card" key={`${word}-${index}`}>{word}</li>
      ));
    }

    return (
      <main className="main-wrapper">
        <header className="top-bar">
          <div>
            <p className="eyebrow">Movie clue party game</p>
            <h1 id="movie-name-heading">Remix</h1>
          </div>
          <div className="top-status" aria-label="Game status">
            <span className="turn-pill">Turn {activeTeam + 1}</span>
            <button type="button" className="secondary-button score-toggle" onClick={this.openScorePopup}>{teams.map(team => team.score).join(' - ')}</button>
          </div>
        </header>

        <section className="hero-card" aria-labelledby="movie-name-heading">
          <div className="movie-form">
            <label htmlFor="movie-name">Movie title</label>
            <div className="input-row">
              <input type="text"
                id="movie-name"
                name="movie_name"
                value={this.state.movie_name}
                onChange={e => {this.input_change(e)}}
                onKeyDown={this.input_key_down}
              />
              <button type="button" onClick={() => this.submitMovieTitle()} disabled={isLoading}>Search</button>
              <button type="button" className="secondary-button" onClick={this.randomizeMovie}>Random</button>
            </div>
          </div>

          <p className="subtitle" role="status">{isLoading ? '🎬 ' : '✨ '}{statusMessage}</p>
        </section>

        <section className="clues-panel" aria-labelledby="clues-heading">
          <div className="section-heading">
            <p className="eyebrow">Play words</p>
            <h2 id="clues-heading">Clues</h2>
          </div>
          {syn_list ? <ul className="clue-list">{syn_list}</ul> : <p className="empty-state">Your generated clues will appear here.</p>}
        </section>

        <section className="timer-card compact-timer" aria-label="Round timer">
          <div>
            <p className="eyebrow">{teams[activeTeam].name} guessing</p>
            <p className="timer-display" aria-live="polite">{this.formatTime()}</p>
          </div>
          <div className="timer-controls">
            <div className="timer-actions">
              <button type="button" onClick={this.startTimer} disabled={isTimerRunning || secondsRemaining === 0}>Start</button>
              <button type="button" className="secondary-button" onClick={this.stopTimer} disabled={!isTimerRunning}>Pause</button>
              <button type="button" className="secondary-button" onClick={this.resetTimer}>Reset</button>
            </div>
            <div className="turn-result-actions">
              <button type="button" className="add-point-button" onClick={() => this.awardPoint()}>Add point</button>
              <button type="button" className="secondary-button skip-button" onClick={() => this.passTurn()}>Skip</button>
            </div>
          </div>
        </section>

        {isScorePopupOpen && (
          <div className="score-modal-backdrop" role="presentation" onClick={this.closeScorePopup}>
            <section className="score-modal" role="dialog" aria-modal="true" aria-labelledby="score-heading" onClick={event => event.stopPropagation()}>
              <div className="modal-header">
                <h2 id="score-heading">Scores</h2>
                <button type="button" className="secondary-button close-button" onClick={this.closeScorePopup}>Close</button>
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
