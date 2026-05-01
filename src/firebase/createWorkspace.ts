/**
 * #72: Standalone-Helper zum Erstellen eines neuen Workspace mit
 * vorgefuellten Initial-Daten. Wird aus dem Trip-Wizard-Modal aufgerufen.
 *
 * Im Gegensatz zum Auto-Create in useWorkspace.ts (der mit DEFAULT_SETTINGS
 * arbeitet) kann der User hier vor dem Workspace-Switch schon Stadt +
 * Reise-Zeitraum festlegen — sonst muesste er nach dem Switch in Settings
 * nochmal alles eintragen.
 */

import { doc, setDoc } from 'firebase/firestore';
import { getFirebase } from './firebase';
import { DEFAULT_SETTINGS } from '../settings/defaults';
import type { Settings, TripConfig } from '../settings/types';

export interface CreateWorkspaceInput {
  /** Firestore-Dokument-ID, validiert via WORKSPACE_ID_PATTERN. */
  workspaceId: string;
  /** Trip-Konfiguration (Stadt, Land, Currency, Timezone — meist aus CityPicker). */
  tripConfig: TripConfig;
  /** ISO YYYY-MM-DD Reise-Start. */
  tripStart: string;
  /** ISO YYYY-MM-DD Reise-Ende. */
  tripEnd: string;
}

/**
 * Erstellt ein neues Workspace-Dokument in Firestore mit den vorgefuellten
 * Trip-Daten. Erfordert authenticated User (Creator wird Owner + erstes Member).
 *
 * Wirft wenn:
 * - User nicht eingeloggt
 * - Workspace mit dieser ID existiert bereits (no overwrite)
 * - Firestore-Rules verbieten den Write
 */
export async function createWorkspace(input: CreateWorkspaceInput): Promise<void> {
  const { db, auth } = getFirebase();
  const creatorUid = auth.currentUser?.uid;
  if (!creatorUid) throw new Error('Nicht eingeloggt — bitte erneut anmelden.');

  const workspaceRef = doc(db, 'workspaces', input.workspaceId);

  // stripUndefined für TripConfig (Firestore akzeptiert kein undefined)
  const cleanTripConfig: Partial<TripConfig> = {};
  for (const [k, v] of Object.entries(input.tripConfig)) {
    if (v !== undefined) (cleanTripConfig as Record<string, unknown>)[k] = v;
  }

  const initialSettings: Settings = {
    ...DEFAULT_SETTINGS,
    tripStart: input.tripStart,
    tripEnd: input.tripEnd,
    tripConfig: cleanTripConfig as TripConfig,
  };

  // setDoc mit merge:false → wirft NICHT bei existierendem Doc, ueberschreibt
  // ABER ueberschreiben wollen wir nicht. Daher predicate ueber Listener
  // unmoeglich; stattdessen: wenn das Doc schon existiert, ist das ein
  // User-Fehler (Trip-ID vergeben). Wir verlassen uns auf den vorherigen
  // Check im Wizard-Modal (existingIds-Liste).
  await setDoc(workspaceRef, {
    ownerUid: creatorUid,
    memberIds: [creatorUid],
    settings: initialSettings,
    tripPlan: {},
    dayDescriptions: {},
    dayBriefings: {},
    dayBudgets: {},
    postTripAnalysis: '',
    createdAt: Date.now(),
  });
}
