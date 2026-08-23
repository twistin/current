/**
 * CURRENT // ESCUDO TÁCTICO
 * Service Worker (Manifest V3) - Sincronización en Segundo Plano
 */

const API_RADAR_URL = 'https://current-app-qg6pp.ondigitalocean.app/api/actors/radar';
const SYNC_ALARM_NAME = 'CURRENT_RADAR_SYNC_ALARM';
const SYNC_INTERVAL_MINUTES = 60;

export interface BackendActor {
  id: string;
  name: string;
  actor_type: 'media' | 'social_account' | 'telegram_channel';
  reputation_score: number;
}

export interface FlaggedActor {
  id: string;
  handle: string;
  reputation: number;
  threatLevel: 'CRÍTICO' | 'ALTO' | 'MEDIO';
  actorType: 'media' | 'social_account' | 'telegram_channel';
  lastUpdated: string;
}

export type RadarDictionary = Record<string, FlaggedActor>;

async function syncRadarDatabase(): Promise<void> {
  console.log('[CURRENT-SHIELD] Sincronizando radar de actores...');

  try {
    const response = await fetch(API_RADAR_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    let dictionary: RadarDictionary = {};

    if (response.ok) {
      const actors: BackendActor[] = await response.json();
      actors.forEach((actor) => {
        const normalizedKey = actor.name.toLowerCase().trim();
        const score = actor.reputation_score;
        const threatLevel = score < 50 ? 'CRÍTICO' : score < 80 ? 'ALTO' : 'MEDIO';

        dictionary[normalizedKey] = {
          id: actor.id,
          handle: actor.name,
          reputation: score,
          threatLevel,
          actorType: actor.actor_type,
          lastUpdated: new Date().toISOString(),
        };
      });
    } else {
      // Fallback inicial si la API está arrancando
      dictionary = {
        '@okdiario': {
          id: 'actor-okdiario',
          handle: '@Okdiario',
          reputation: 34.5,
          threatLevel: 'CRÍTICO',
          actorType: 'media',
          lastUpdated: new Date().toISOString(),
        },
        '@alvise_canal_noticias': {
          id: 'actor-alvise',
          handle: '@Alvise_Canal_Noticias',
          reputation: 22.0,
          threatLevel: 'CRÍTICO',
          actorType: 'telegram_channel',
          lastUpdated: new Date().toISOString(),
        },
        '@periodistadigital': {
          id: '11111111-1111-1111-1111-111111111111',
          handle: '@PeriodistaDigital',
          reputation: 42.0,
          threatLevel: 'CRÍTICO',
          actorType: 'media',
          lastUpdated: new Date().toISOString(),
        },
        '@liberaldig': {
          id: '44444444-4444-4444-4444-444444444444',
          handle: '@Liberaldig',
          reputation: 38.0,
          threatLevel: 'CRÍTICO',
          actorType: 'social_account',
          lastUpdated: new Date().toISOString(),
        },
        '@vox_es': {
          id: '66666666-6666-6666-6666-666666666666',
          handle: '@vox_es',
          reputation: 32.0,
          threatLevel: 'CRÍTICO',
          actorType: 'social_account',
          lastUpdated: new Date().toISOString(),
        },
        '@mavica81': {
          id: '77777777-7777-7777-7777-777777777777',
          handle: '@mavica81',
          reputation: 29.0,
          threatLevel: 'CRÍTICO',
          actorType: 'social_account',
          lastUpdated: new Date().toISOString(),
        },
      };
    }

    await chrome.storage.local.set({
      currentRadarList: dictionary,
      lastSyncTimestamp: new Date().toISOString(),
    });

    console.log(`[CURRENT-SHIELD] Radar sincronizado: ${Object.keys(dictionary).length} actores en local.`);
  } catch (error) {
    console.warn('[CURRENT-SHIELD] Fallo de red al sincronizar, usando base local:', error);
  }
}

// Sincronizar inmediatamente al iniciar el Service Worker
syncRadarDatabase();

chrome.runtime.onInstalled.addListener(async () => {
  await syncRadarDatabase();
  chrome.alarms.create(SYNC_ALARM_NAME, {
    periodInMinutes: SYNC_INTERVAL_MINUTES,
    delayInMinutes: SYNC_INTERVAL_MINUTES,
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === SYNC_ALARM_NAME) {
    await syncRadarDatabase();
  }
});
