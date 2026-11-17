// Single shared player instance (keeps audio state independent of React re-renders / StrictMode).
import { Player } from './player';
import { loadSettings } from './settings';

export const initialSettings = loadSettings();
export const player = new Player(initialSettings);
