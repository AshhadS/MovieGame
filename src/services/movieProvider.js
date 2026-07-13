const TMDB_API_URL = 'https://api.themoviedb.org/3/movie/now_playing';

export const isTmdbConfigured = () => Boolean(import.meta.env.VITE_TMDB_API_TOKEN?.trim());

export const getRandomLatestMovie = async (excludedTitle = '') => {
  const token = import.meta.env.VITE_TMDB_API_TOKEN?.trim();

  if (!token) {
    throw new Error('TMDB is not configured');
  }

  const params = new URLSearchParams({
    language: import.meta.env.VITE_TMDB_LANGUAGE || 'en-US',
    region: import.meta.env.VITE_TMDB_REGION || 'US',
    page: '1',
  });
  const response = await fetch(`${TMDB_API_URL}?${params}`, {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`TMDB request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const availableMovies = (Array.isArray(payload.results) ? payload.results : [])
    .filter(movie => typeof movie.title === 'string' && movie.title.trim())
    .filter(movie => movie.title !== excludedTitle);

  if (!availableMovies.length) {
    throw new Error('TMDB returned no available movies');
  }

  return availableMovies[Math.floor(Math.random() * availableMovies.length)].title;
};

