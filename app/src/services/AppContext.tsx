import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react';
import { Alert } from 'react-native';
import { AppData, MatchOutcome, MatchScore, RosterEntry, TeamId } from '../models';
import { fetchData, pushData } from './api';
import * as mutations from './mutations';
import { CreateTournamentInput } from './mutations';

interface State {
  data: AppData | null;
  loading: boolean;
  refreshing: boolean;
  syncing: boolean;
  error: string | null;
}

type Action =
  | { type: 'LOADING' }
  | { type: 'REFRESHING' }
  | { type: 'LOADED'; data: AppData }
  | { type: 'ERROR'; message: string }
  | { type: 'SYNCING'; value: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null };
    case 'REFRESHING':
      return { ...state, refreshing: true, error: null };
    case 'LOADED':
      return { ...state, loading: false, refreshing: false, error: null, data: action.data };
    case 'ERROR':
      return { ...state, loading: false, refreshing: false, error: action.message };
    case 'SYNCING':
      return { ...state, syncing: action.value };
    default:
      return state;
  }
}

const initial: State = { data: null, loading: false, refreshing: false, syncing: false, error: null };

interface AppContextValue extends State {
  /** Manual re-fetch from jsonbin. Used by pull-to-refresh; the app never polls in the background. */
  refresh: () => Promise<void>;
  /**
   * Applies a local edit safely: silently re-fetches the remote document first and
   * compares it to what's currently loaded. If someone else changed it since load,
   * the user is warned before anything is overwritten. Returns true if the edit was
   * saved, false if it was cancelled or failed.
   */
  mutate: (editFn: (data: AppData) => AppData) => Promise<boolean>;

  addPlayer: (firstName: string, surname: string) => Promise<boolean>;
  updatePlayer: (id: string, firstName: string, surname: string) => Promise<boolean>;
  deletePlayer: (id: string) => Promise<boolean>;
  setPlayerArchived: (id: string, archived: boolean) => Promise<boolean>;

  createTournament: (input: CreateTournamentInput) => Promise<boolean>;
  updateTournamentDetails: (id: string, updates: { name?: string; year?: number; courses?: { day1: string; day2: string } }) => Promise<boolean>;
  changePlayersPerTeam: (id: string, newN: number) => Promise<boolean>;
  replaceRosters: (id: string, rosters: { boere: RosterEntry[]; british: RosterEntry[] }) => Promise<boolean>;

  assignDay1Slot: (tournamentId: string, matchIndex: number, side: TeamId, slot: 0 | 1, playerId: string | null) => Promise<boolean>;
  assignDay2Slot: (tournamentId: string, matchIndex: number, side: TeamId, playerId: string | null) => Promise<boolean>;
  setDay1Result: (tournamentId: string, matchIndex: number, result: MatchOutcome | null, score: MatchScore | null) => Promise<boolean>;
  setDay2Result: (tournamentId: string, matchIndex: number, result: MatchOutcome | null, score: MatchScore | null) => Promise<boolean>;
  endTournament: (tournamentId: string) => Promise<boolean>;
  deleteTournament: (tournamentId: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextValue | null>(null);

function confirmOverwrite(): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(
      'Data changed elsewhere',
      'Someone else updated this tournament since you last loaded it. Reload the latest data and redo your change, or overwrite it with what you have now?',
      [
        { text: 'Reload latest', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Overwrite anyway', style: 'destructive', onPress: () => resolve(true) },
      ],
    );
  });
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const dataRef = useRef<AppData | null>(null);
  useEffect(() => {
    dataRef.current = state.data;
  }, [state.data]);

  const load = useCallback(async (isRefresh: boolean) => {
    dispatch({ type: isRefresh ? 'REFRESHING' : 'LOADING' });
    try {
      const data = await fetchData();
      dispatch({ type: 'LOADED', data });
    } catch (e: any) {
      dispatch({ type: 'ERROR', message: e.message ?? 'Something went wrong.' });
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  const mutate = useCallback(async (editFn: (data: AppData) => AppData): Promise<boolean> => {
    dispatch({ type: 'SYNCING', value: true });
    try {
      let remote: AppData;
      try {
        remote = await fetchData();
      } catch (e: any) {
        Alert.alert('Could not save', e.message ?? 'Check your connection and try again.');
        return false;
      }

      const loaded = dataRef.current;
      const changedRemotely = loaded !== null && JSON.stringify(remote) !== JSON.stringify(loaded);
      if (changedRemotely) {
        const overwrite = await confirmOverwrite();
        if (!overwrite) {
          dispatch({ type: 'LOADED', data: remote });
          return false;
        }
      }

      const base = changedRemotely ? remote : (loaded ?? remote);
      const updated = editFn(base);
      try {
        await pushData(updated);
      } catch (e: any) {
        Alert.alert('Could not save', e.message ?? 'Check your connection and try again.');
        return false;
      }
      dispatch({ type: 'LOADED', data: updated });
      return true;
    } finally {
      dispatch({ type: 'SYNCING', value: false });
    }
  }, []);

  const addPlayer = useCallback((firstName: string, surname: string) => mutate(d => mutations.addPlayer(d, firstName, surname)), [mutate]);
  const updatePlayer = useCallback((id: string, firstName: string, surname: string) => mutate(d => mutations.updatePlayer(d, id, firstName, surname)), [mutate]);
  const deletePlayer = useCallback((id: string) => mutate(d => mutations.deletePlayer(d, id)), [mutate]);
  const setPlayerArchived = useCallback((id: string, archived: boolean) => mutate(d => mutations.setPlayerArchived(d, id, archived)), [mutate]);

  const createTournament = useCallback((input: CreateTournamentInput) => mutate(d => mutations.createTournament(d, input)), [mutate]);
  const updateTournamentDetails = useCallback(
    (id: string, updates: { name?: string; year?: number; courses?: { day1: string; day2: string } }) =>
      mutate(d => mutations.updateTournamentDetails(d, id, updates)),
    [mutate],
  );
  const changePlayersPerTeam = useCallback((id: string, newN: number) => mutate(d => mutations.changePlayersPerTeam(d, id, newN)), [mutate]);
  const replaceRosters = useCallback(
    (id: string, rosters: { boere: RosterEntry[]; british: RosterEntry[] }) => mutate(d => mutations.replaceRosters(d, id, rosters)),
    [mutate],
  );

  const assignDay1Slot = useCallback(
    (tournamentId: string, matchIndex: number, side: TeamId, slot: 0 | 1, playerId: string | null) =>
      mutate(d => mutations.assignDay1Slot(d, tournamentId, matchIndex, side, slot, playerId)),
    [mutate],
  );
  const assignDay2Slot = useCallback(
    (tournamentId: string, matchIndex: number, side: TeamId, playerId: string | null) =>
      mutate(d => mutations.assignDay2Slot(d, tournamentId, matchIndex, side, playerId)),
    [mutate],
  );
  const setDay1Result = useCallback(
    (tournamentId: string, matchIndex: number, result: MatchOutcome | null, score: MatchScore | null) =>
      mutate(d => mutations.setDay1Result(d, tournamentId, matchIndex, result, score)),
    [mutate],
  );
  const setDay2Result = useCallback(
    (tournamentId: string, matchIndex: number, result: MatchOutcome | null, score: MatchScore | null) =>
      mutate(d => mutations.setDay2Result(d, tournamentId, matchIndex, result, score)),
    [mutate],
  );
  const endTournament = useCallback((tournamentId: string) => mutate(d => mutations.endTournament(d, tournamentId)), [mutate]);
  const deleteTournament = useCallback((tournamentId: string) => mutate(d => mutations.deleteTournament(d, tournamentId)), [mutate]);

  return (
    <AppContext.Provider
      value={{
        ...state,
        refresh,
        mutate,
        addPlayer,
        updatePlayer,
        deletePlayer,
        setPlayerArchived,
        createTournament,
        updateTournamentDetails,
        changePlayersPerTeam,
        replaceRosters,
        assignDay1Slot,
        assignDay2Slot,
        setDay1Result,
        setDay2Result,
        endTournament,
        deleteTournament,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
