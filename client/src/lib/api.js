import axios from 'axios';
import { keyHeaders } from './keys';

const api = axios.create({ baseURL: '/api' });

// Attach the user's BYOK keys (from localStorage) to every request.
api.interceptors.request.use(config => {
  config.headers = { ...config.headers, ...keyHeaders() };
  return config;
});

export const screenStocks = (filters = {}) =>
  api.get('/screen', { params: filters }).then(r => r.data);

export const qualifyStock = ticker =>
  api.get(`/qualify/${ticker}`).then(r => r.data);

export const getStatus = () =>
  api.get('/status').then(r => r.data);
