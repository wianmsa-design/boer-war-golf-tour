import { JSONBIN_BIN_ID, JSONBIN_READ_KEY } from './config.local.js';

const BASE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

export async function fetchData() {
  const res = await fetch(`${BASE_URL}/latest`, {
    headers: { 'X-Access-Key': JSONBIN_READ_KEY },
  });
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
  const json = await res.json();
  return json.record;
}
