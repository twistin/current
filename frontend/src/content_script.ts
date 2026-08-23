/**
 * CURRENT // ESCUDO TÁCTICO PARA X (TWITTER)
 * Content Script (Manifest V3)
 */

interface FlaggedActor {
  id: string;
  handle: string;
  reputation: number;
  threatLevel: 'CRÍTICO' | 'ALTO' | 'MEDIO';
  actorType?: string;
}

type RadarDictionary = Record<string, FlaggedActor>;

let radarCache: RadarDictionary = {
  '@okdiario': {
    id: '22222222-2222-2222-2222-222222222222',
    handle: '@Okdiario',
    reputation: 34.5,
    threatLevel: 'CRÍTICO',
  },
  '@alvise_canal_noticias': {
    id: '33333333-3333-3333-3333-333333333333',
    handle: '@Alvise_Canal_Noticias',
    reputation: 28.0,
    threatLevel: 'CRÍTICO',
  },
  '@periodistadigital': {
    id: '11111111-1111-1111-1111-111111111111',
    handle: '@PeriodistaDigital',
    reputation: 42.0,
    threatLevel: 'CRÍTICO',
  },
  '@liberaldig': {
    id: '44444444-4444-4444-4444-444444444444',
    handle: '@Liberaldig',
    reputation: 38.0,
    threatLevel: 'CRÍTICO',
  },
  '@vox_es': {
    id: '66666666-6666-6666-6666-666666666666',
    handle: '@vox_es',
    reputation: 32.0,
    threatLevel: 'CRÍTICO',
  },
  '@mavica81': {
    id: '77777777-7777-7777-7777-777777777777',
    handle: '@mavica81',
    reputation: 29.0,
    threatLevel: 'CRÍTICO',
  },
};

const processedTweets = new WeakSet<HTMLElement>();
const PROCESSED_ATTR = 'data-current-audited';

function extractTweetHandle(tweetElement: HTMLElement): string | null {
  // 1. Buscar en enlaces dentro de User-Name
  const userNameContainer = tweetElement.querySelector('[data-testid="User-Name"]');
  if (userNameContainer) {
    const links = userNameContainer.querySelectorAll('a[role="link"]');
    for (const link of Array.from(links)) {
      const href = link.getAttribute('href') || '';
      if (href.startsWith('/') && !href.includes('/status/') && !href.includes('/analytics')) {
        const handleFromHref = href.replace('/', '').trim();
        if (handleFromHref) return `@${handleFromHref}`;
      }
      const text = link.textContent?.trim() || '';
      if (text.startsWith('@')) {
        return text;
      }
    }

    const allTexts = userNameContainer.querySelectorAll('span');
    for (const span of Array.from(allTexts)) {
      const text = span.textContent?.trim() || '';
      if (text.startsWith('@') && text.length > 1) {
        return text;
      }
    }
  }

  // 2. Fallback: buscar cualquier enlace de perfil de autor en el tweet
  const allUserLinks = tweetElement.querySelectorAll('a[role="link"][href^="/"]');
  for (const link of Array.from(allUserLinks)) {
    const href = link.getAttribute('href') || '';
    if (href.length > 1 && !href.includes('/') && !href.includes('?') && !href.includes('home') && !href.includes('explore')) {
      return `@${href.replace('/', '')}`;
    }
    const text = link.textContent?.trim() || '';
    if (text.startsWith('@') && text.length > 1) {
      return text;
    }
  }

  // 3. Fallback de URL actual si es vista de post individual
  const currentPath = window.location.pathname;
  if (currentPath.includes('/status/')) {
    const segments = currentPath.split('/');
    if (segments[1] && segments[1] !== 'i') {
      return `@${segments[1]}`;
    }
  }

  return null;
}

function injectTacticalWarning(tweetElement: HTMLElement, actor: FlaggedActor): void {
  if (tweetElement.querySelector('.current-tactical-shield-banner')) return;

  const isCritical = actor.threatLevel === 'CRÍTICO';

  // Buscar todos los bloques de contenido (texto, fotos, vídeos, embeds)
  const tweetTextNode = tweetElement.querySelector<HTMLElement>('[data-testid="tweetText"]');
  const mediaNodes = tweetElement.querySelectorAll<HTMLElement>(
    '[data-testid="tweetPhoto"], [data-testid="videoPlayer"], [data-testid="videoComponent"], video, [data-testid="card.wrapper"]'
  );

  const contentNodes: HTMLElement[] = [
    tweetTextNode,
    ...Array.from(mediaNodes).map((m) => (m.parentElement as HTMLElement) || m),
  ].filter((node): node is HTMLElement => node !== null && node !== undefined);

  if (isCritical) {
    contentNodes.forEach((node) => {
      node.style.filter = 'blur(10px) brightness(0.7)';
      node.style.opacity = '0.5';
      node.style.transition = 'filter 0.3s ease, opacity 0.3s ease';
      node.style.pointerEvents = 'none';
    });
  }

  const banner = document.createElement('div');
  banner.className = 'current-tactical-shield-banner';

  Object.assign(banner.style, {
    margin: '10px 16px 12px',
    padding: '12px 14px',
    background: 'rgba(17, 24, 39, 0.95)',
    border: '1px solid #ef4444',
    borderLeft: '4px solid #ef4444',
    borderRadius: '8px',
    boxShadow: isCritical ? '0 4px 20px rgba(239, 68, 68, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.4)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: '12px',
    color: '#f3f4f6',
    zIndex: '10',
    position: 'relative',
    backdropFilter: 'blur(8px)',
  });

  banner.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
      <div style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; color: #ef4444; font-size: 11.5px; letter-spacing: 0.04em;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 8px #ef4444;"></span>
        ⚠️ [CURRENT] ACTOR DE ALTO IMPACTO DETECTADO
      </div>
      <span style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">
        ${actor.threatLevel}
      </span>
    </div>
    
    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #9ca3af; flex-wrap: wrap; gap: 8px;">
      <span>Índice de Confianza: <strong style="color: #ef4444;">${actor.reputation.toFixed(1)} / 100</strong></span>
      <a 
        href="https://current-app-qg6pp.ondigitalocean.app/actor/${encodeURIComponent(actor.id || actor.handle)}" 
        target="_blank" 
        rel="noopener noreferrer" 
        style="color: #60a5fa; text-decoration: underline; font-weight: 600; cursor: pointer;"
      >
        Ver Expediente Público →
      </a>
    </div>

    ${
      isCritical
        ? `
      <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 8px; margin-top: 2px; display: flex; justify-content: flex-end;">
        <button 
          class="current-reveal-btn"
          style="
            background: rgba(239, 68, 68, 0.1);
            color: #fca5a5;
            border: 1px solid rgba(239, 68, 68, 0.5);
            font-family: inherit;
            font-size: 11px;
            font-weight: 600;
            padding: 5px 10px;
            border-radius: 6px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            transition: all 0.15s ease;
          "
        >
          👁️ Revelar contenido bajo riesgo
        </button>
      </div>
    `
        : ''
    }
  `;

  if (isCritical) {
    const revealBtn = banner.querySelector<HTMLButtonElement>('.current-reveal-btn');
    if (revealBtn) {
      revealBtn.addEventListener('click', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        contentNodes.forEach((node) => {
          node.style.filter = 'none';
          node.style.opacity = '1';
          node.style.userSelect = 'auto';
          node.style.pointerEvents = 'auto';
        });

        revealBtn.style.background = 'transparent';
        revealBtn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        revealBtn.style.color = '#9ca3af';
        revealBtn.style.cursor = 'default';
        revealBtn.textContent = '🔓 Contenido revelado por el usuario';
        revealBtn.disabled = true;
      });

      revealBtn.addEventListener('mousedown', (e: MouseEvent) => e.stopPropagation());
    }
  }

  if (tweetTextNode && tweetTextNode.parentElement) {
    tweetTextNode.parentElement.insertBefore(banner, tweetTextNode);
  } else {
    tweetElement.prepend(banner);
  }
}

function analyzeTweets(): void {
  if (!radarCache || Object.keys(radarCache).length === 0) return;

  // 1. Detección si estamos directamente en la página de un post (/usuario/status/...)
  const currentPath = window.location.pathname;
  let pageAuthorHandle: string | null = null;
  if (currentPath.includes('/status/')) {
    const segments = currentPath.split('/');
    if (segments[1] && segments[1] !== 'i') {
      pageAuthorHandle = `@${segments[1].toLowerCase().trim()}`;
    }
  }

  const tweetElements = document.querySelectorAll<HTMLElement>(
    'article[data-testid="tweet"], div[data-testid="cellInnerDiv"] article, article, [data-testid="tweet"]'
  );

  console.log(`🛡️ [CURRENT] Escaneando DOM de X... Elementos encontrados: ${tweetElements.length}. Actor en URL: ${pageAuthorHandle || 'ninguno'}`);

  tweetElements.forEach((tweet) => {
    if (tweet.querySelector('.current-tactical-shield-banner')) {
      return;
    }

    let handle = extractTweetHandle(tweet) || pageAuthorHandle;
    if (!handle) return;

    const cleanHandle = handle.toLowerCase().replace(/[@\s]/g, '').trim();
    const withAt = `@${cleanHandle}`;

    const matchedActor = radarCache[withAt] || radarCache[cleanHandle];

    if (matchedActor) {
      console.log(`🚨 [CURRENT] ¡MATCH CONFIRMADO! Aplicando escudo a ${matchedActor.handle}...`);
      injectTacticalWarning(tweet, matchedActor);
    }
  });
}

let isScheduled = false;

function scheduleAudit(): void {
  if (isScheduled) return;
  isScheduled = true;

  requestAnimationFrame(() => {
    analyzeTweets();
    isScheduled = false;
  });
}

const observer = new MutationObserver((mutations) => {
  let hasNodes = false;
  for (const m of mutations) {
    if (m.addedNodes.length > 0) {
      hasNodes = true;
      break;
    }
  }
  if (hasNodes) {
    scheduleAudit();
  }
});

async function initTacticalShield(): Promise<void> {
  console.log('🛡️ [CURRENT] Inicializando Escudo Táctico...');

  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const storage = await chrome.storage.local.get('currentRadarList');
      if (storage.currentRadarList && Object.keys(storage.currentRadarList).length > 0) {
        radarCache = storage.currentRadarList as RadarDictionary;
      }

      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.currentRadarList) {
          radarCache = (changes.currentRadarList.newValue as RadarDictionary) || {};
          scheduleAudit();
        }
      });
    }

    analyzeTweets();

    // Intervalo de seguridad para SPAs con virtual scrolling agresivo como X
    setInterval(() => {
      analyzeTweets();
    }, 1500);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  } catch (err) {
    console.error('🛡️ [CURRENT] Error al inicializar:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTacticalShield);
} else {
  initTacticalShield();
}
