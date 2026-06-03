import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const screenStocks = (filters = {}) =>
  api.get('/screen', { params: filters }).then(r => r.data);

export const qualifyStock = ticker =>
  api.get(`/qualify/${ticker}`).then(r => r.data);
