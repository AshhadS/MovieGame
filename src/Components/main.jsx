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
];

class Main extends Component {
  constructor(props) {
    super(props)
    this.state = {
      movie_name: "Blade Runner",
      synonyms: [],
      synonyms_count: 5,
      isLoading: false,
      statusMessage: 'Type a movie title, pick a random one, then tab away to generate clue words.',
      teams: [
        { name: 'Team One', score: 0 },
        { name: 'Team Two', score: 0 },
      ],
      activeTeam: 0,
      roundSeconds: 60,
      secondsRemaining: 60,
      isTimerRunning: false,
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

    this.setState({ isLoading: true, statusMessage: 'Generating clue words...' });

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

  input_blur=()=> {
    this.generateSynonyms();
  }

  input_change=(e)=> {
    this.setState({movie_name: e.target.value, synonyms: []})
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

  updateScore=(teamIndex, amount)=> {
    this.setState(({ teams }) => ({
      teams: teams.map((team, index) => {
        if (index !== teamIndex) {
          return team;
        }

        return { ...team, score: Math.max(0, team.score + amount) };
      })
    }));
  }

  resetScores=()=> {
    this.setState(({ teams }) => ({
      activeTeam: 0,
      teams: teams.map(team => ({ ...team, score: 0 }))
    }));
  }

  passTurn=()=> {
    this.switchTeam();
    this.resetTimer();
  }

  awardPoint=()=> {
    this.updateScore(this.state.activeTeam, 1);
    this.passTurn();
  }

  randomizeMovie=()=> {
    const availableTitles = MOVIE_TITLES.filter(title => title !== this.state.movie_name);
    const randomTitle = availableTitles[Math.floor(Math.random() * availableTitles.length)] || MOVIE_TITLES[0];
    this.setState({ movie_name: randomTitle, synonyms: [] }, () => this.generateSynonyms(randomTitle));
  }

  formatTime = () => {
    const minutes = Math.floor(this.state.secondsRemaining / 60);
    const seconds = this.state.secondsRemaining % 60;

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  render() {
    let {synonyms, movie_name, synonyms_count, isLoading, statusMessage, teams, activeTeam, isTimerRunning, secondsRemaining} = this.state;

    let syn_list = null;
    const words = movie_name.split(' ').filter(Boolean);

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
        <section className="hero-card" aria-labelledby="movie-name-heading">
          <p className="eyebrow">Movie clue party game</p>
          <h1 id="movie-name-heading">Movie Name Remix</h1>
          <p className="lede">Turn famous titles into playful synonym clues for a fast guessing round.</p>

          <div className="movie-form">
            <label htmlFor="movie-name">Movie title</label>
            <div className="input-row">
              <input type="text"
                id="movie-name"
                name="movie_name"
                value={this.state.movie_name}
                onBlur={this.input_blur}
                onChange={e => {this.input_change(e)}}
              />
              <button type="button" onClick={this.randomizeMovie}>Random movie</button>
            </div>
          </div>

          <p className="subtitle" role="status">{isLoading ? '🎬 ' : '✨ '}{statusMessage}</p>
        </section>

        <section className="session-panel" aria-label="Pass and play controls">
          <div className="scoreboard">
            {teams.map((team, index) => (
              <article className={`team-card ${activeTeam === index ? 'is-active' : ''}`} key={team.name}>
                <p className="eyebrow">{activeTeam === index ? 'Guessing now' : 'Next up'}</p>
                <h2>{team.name}</h2>
                <p className="score">{team.score}</p>
                <div className="score-actions">
                  <button type="button" className="secondary-button" onClick={() => this.updateScore(index, -1)}>-</button>
                  <button type="button" className="secondary-button" onClick={() => this.updateScore(index, 1)}>+</button>
                </div>
              </article>
            ))}
          </div>

          <div className="timer-card">
            <p className="eyebrow">Round timer</p>
            <p className="timer-display" aria-live="polite">{this.formatTime()}</p>
            <p className="timer-note">Start when {teams[activeTeam].name} begins guessing.</p>
            <div className="timer-actions">
              <button type="button" onClick={this.startTimer} disabled={isTimerRunning || secondsRemaining === 0}>Start guessing</button>
              <button type="button" className="secondary-button" onClick={this.stopTimer} disabled={!isTimerRunning}>Pause</button>
              <button type="button" className="secondary-button" onClick={this.resetTimer}>Reset timer</button>
            </div>
            <div className="round-actions">
              <button type="button" onClick={this.awardPoint}>Correct guess + switch</button>
              <button type="button" className="secondary-button" onClick={this.passTurn}>Pass turn</button>
              <button type="button" className="secondary-button" onClick={this.resetScores}>Reset scores</button>
            </div>
          </div>
        </section>

        <section className="clues-panel" aria-labelledby="clues-heading">
          <div className="section-heading">
            <p className="eyebrow">Play words</p>
            <h2 id="clues-heading">Clue board</h2>
          </div>
          {syn_list ? <ul className="clue-list">{syn_list}</ul> : <p className="empty-state">Your generated clues will appear here.</p>}
        </section>
      </main>
    )
  }
}

export default Main;
