import { AppData } from '../models';
import { JSONBIN_BIN_ID, JSONBIN_WRITE_KEY } from '../config';

const BASE_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;
const HEADERS = {
  'Content-Type': 'application/json',
  'X-Master-Key': JSONBIN_WRITE_KEY,
};
const TIMEOUT_MS = 15000;

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out')), ms),
  );
}

export async function fetchData(): Promise<AppData> {
  try {
    const res = await Promise.race([
      fetch(`${BASE_URL}/latest`, { headers: HEADERS }),
      timeout(TIMEOUT_MS),
    ]);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const json = await res.json();
    return json.record as AppData;
  } catch (e: any) {
    if (e.message?.includes('Server returned') || e.message?.includes('timed out')) throw e;
    throw new Error('Could not reach the server. Check your connection.');
  }
}

export async function pushData(data: AppData): Promise<void> {
  try {
    const res = await Promise.race([
      fetch(BASE_URL, {
        method: 'PUT',
        headers: HEADERS,
        body: JSON.stringify(data),
      }),
      timeout(TIMEOUT_MS),
    ]);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
  } catch (e: any) {
    if (e.message?.includes('Server returned') || e.message?.includes('timed out')) throw e;
    throw new Error('Could not save data. Check your connection.');
  }
}
