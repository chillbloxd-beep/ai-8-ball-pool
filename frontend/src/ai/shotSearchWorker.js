import { runMonteCarloSearch } from './shotSearch.js';
self.onmessage = (e) => {
  const { state, options } = e.data;
  const result = runMonteCarloSearch(state, {
    ...options,
    onProgress: (p) => self.postMessage({ type: 'progress', ...p })
  });
  self.postMessage({ type: 'done', result });
};
