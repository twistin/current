import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fetchClaims,
  fetchClaimDetail,
  registerMember,
  getToken,
  getStoredPseudonym,
  clearSession,
} from './api/client';
import { Claim, ClaimDetailResponse } from './api/types';
import { Header } from './components/Header';
import { ClaimCard } from './components/ClaimCard';
import { VerificationRoom } from './components/VerificationRoom';
import { MemberProfile } from './components/MemberProfile';
import { ReportClaimModal } from './components/ReportClaimModal';
import { ManifestoLanding } from './components/ManifestoLanding';
import { ManifestoPage } from './components/ManifestoPage';
import { ToxicityRadar } from './components/ToxicityRadar';
import { ActorDossier } from './components/ActorDossier';
import { useTheme } from './theme';

type AppView = 'landing' | 'queue' | 'manifesto' | 'radar';

function parseRouteFromUrl(): {
  view: AppView;
  claimId: string | null;
  memberId: string | null;
  actorId: string | null;
} {
  const pathname = window.location.pathname;

  if (pathname.startsWith('/claims/')) {
    const claimId = pathname.replace('/claims/', '').split('/')[0].trim();
    if (claimId) {
      return { view: 'queue', claimId, memberId: null, actorId: null };
    }
  }

  if (pathname.startsWith('/actor/') || pathname.startsWith('/actors/')) {
    const actorId = pathname.replace(/^\/actors?\//, '').split('/')[0].trim();
    if (actorId) {
      return { view: 'radar', claimId: null, memberId: null, actorId };
    }
  }

  if (pathname.startsWith('/members/')) {
    const memberId = decodeURIComponent(pathname.replace('/members/', '').split('/')[0].trim());
    if (memberId) {
      return { view: 'queue', claimId: null, memberId, actorId: null };
    }
  }

  if (pathname.startsWith('/@')) {
    const memberId = decodeURIComponent(pathname.replace('/@', '').split('/')[0].trim());
    if (memberId) {
      return { view: 'queue', claimId: null, memberId, actorId: null };
    }
  }

  if (pathname === '/radar' || pathname === '/actors') {
    return { view: 'radar', claimId: null, memberId: null, actorId: null };
  }

  if (pathname === '/manifesto' || pathname === '/manifiesto') {
    return { view: 'manifesto', claimId: null, memberId: null, actorId: null };
  }

  if (pathname === '/queue' || pathname === '/cola') {
    return { view: 'queue', claimId: null, memberId: null, actorId: null };
  }

  return { view: getToken() ? 'queue' : 'landing', claimId: null, memberId: null, actorId: null };
}

export const App: React.FC = () => {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Autenticación seudónima
  const [pseudonym, setPseudonym] = useState<string | null>(() => getStoredPseudonym());
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [inputPseudonym, setInputPseudonym] = useState<string>('');
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registering, setRegistering] = useState<boolean>(false);

  // Navegación sincronizada con la URL
  const initialRoute = parseRouteFromUrl();
  const [currentView, setCurrentView] = useState<AppView>(() => initialRoute.view);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(() => initialRoute.claimId);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(() => initialRoute.actorId);
  const [claimDetail, setClaimDetail] = useState<ClaimDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(() => initialRoute.memberId);

  // Modal Reportar Bulo
  const [showReportClaimModal, setShowReportClaimModal] = useState<boolean>(false);

  const loadClaims = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClaims();
      setClaims(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al conectar con la API');
    } finally {
      setLoading(false);
    }
  };

  const loadClaimDetail = async (id: string) => {
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const detail = await fetchClaimDetail(id);
      setClaimDetail(detail);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Error al cargar la sala de verificación');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadClaims();
    const storedPseudo = getStoredPseudonym();
    if (storedPseudo) {
      setPseudonym(storedPseudo);
    } else {
      setPseudonym(null);
    }

    // Cargar detalle si la URL inicial apuntaba a un bulo
    if (initialRoute.claimId) {
      loadClaimDetail(initialRoute.claimId);
    }

    // Escuchar botones Atrás/Adelante del navegador
    const handlePopState = () => {
      const route = parseRouteFromUrl();
      setSelectedMemberId(route.memberId);
      setSelectedClaimId(route.claimId);
      setSelectedActorId(route.actorId);
      setCurrentView(route.view);
      if (route.claimId) {
        loadClaimDetail(route.claimId);
      } else {
        setClaimDetail(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLogout = () => {
    clearSession();
    setPseudonym(null);
    if (selectedMemberId) {
      handleNavigate('queue');
    }
  };

  const handleSelectClaim = (id: string, pushHistory = true) => {
    setSelectedMemberId(null);
    setSelectedActorId(null);
    setSelectedClaimId(id);
    loadClaimDetail(id);
    if (pushHistory) {
      window.history.pushState(null, '', `/claims/${id}`);
    }
  };

  const handleSelectActor = (actorId: string, pushHistory = true) => {
    setSelectedMemberId(null);
    setSelectedClaimId(null);
    setClaimDetail(null);
    setSelectedActorId(actorId);
    if (pushHistory) {
      window.history.pushState(null, '', `/actor/${actorId}`);
    }
  };

  const refreshCurrentRoom = () => {
    if (selectedClaimId) {
      loadClaimDetail(selectedClaimId);
    }
  };

  const handleNavigate = (view: AppView, pushHistory = true) => {
    setSelectedMemberId(null);
    setSelectedClaimId(null);
    setSelectedActorId(null);
    setClaimDetail(null);
    setCurrentView(view);
    if (pushHistory) {
      if (view === 'manifesto') {
        window.history.pushState(null, '', '/manifesto');
      } else if (view === 'radar') {
        window.history.pushState(null, '', '/radar');
      } else if (view === 'queue') {
        window.history.pushState(null, '', '/queue');
      } else {
        window.history.pushState(null, '', '/');
      }
    }
  };

  const handleSelectMember = (identifier: string, pushHistory = true) => {
    setSelectedClaimId(null);
    setSelectedActorId(null);
    setClaimDetail(null);
    setSelectedMemberId(identifier);
    if (pushHistory) {
      window.history.pushState(null, '', `/members/${encodeURIComponent(identifier)}`);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPseudonym.trim()) return;

    setRegisterError(null);
    setRegistering(true);
    try {
      const res = await registerMember(inputPseudonym.trim());
      setPseudonym(res.pseudonym);
      setShowRegisterModal(false);
      setInputPseudonym('');
      if (currentView === 'landing') {
        setCurrentView('queue');
      }
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div>
      <Header
        memberPseudonym={pseudonym}
        onRegisterClick={() => setShowRegisterModal(true)}
        onLogout={handleLogout}
        currentView={selectedActorId ? 'actor' : selectedMemberId ? 'profile' : selectedClaimId ? 'room' : currentView}
        onNavigate={handleNavigate}
        onSelectMember={handleSelectMember}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="wrap" style={{ paddingTop: '28px' }}>
        {/* VISTA F: Expediente del Actor Auditado */}
        {selectedActorId && (
          <ActorDossier
            actorId={selectedActorId}
            onBack={() => handleNavigate('radar')}
            onSelectClaim={(claimId) => handleSelectClaim(claimId)}
          />
        )}

        {/* VISTA G: Radar Táctico de Toxicidad y Actores */}
        {!selectedActorId && !selectedMemberId && !selectedClaimId && currentView === 'radar' && (
          <ToxicityRadar onSelectActor={(actorId) => handleSelectActor(actorId)} />
        )}

        {/* VISTA E: Perfil Seudónimo de Miembro */}
        {!selectedActorId && selectedMemberId && (
          <MemberProfile
            identifier={selectedMemberId}
            onBack={() => handleNavigate('queue')}
            onSelectClaim={(claimId) => {
              handleSelectClaim(claimId);
            }}
            onRegisterClick={() => setShowRegisterModal(true)}
          />
        )}

        {/* VISTA A: Portada con Manifiesto Corto */}
        {!selectedActorId && !selectedMemberId && !selectedClaimId && currentView === 'landing' && (
          <ManifestoLanding
            onEnterQueue={() => setCurrentView('queue')}
            onRegister={() => setShowRegisterModal(true)}
            onReadFullManifesto={() => setCurrentView('manifesto')}
            isAuthenticated={!!pseudonym}
          />
        )}

        {/* VISTA B: Manifiesto Largo Completo (Qué es Current) */}
        {!selectedActorId && !selectedMemberId && !selectedClaimId && currentView === 'manifesto' && (
          <ManifestoPage
            onBackToQueue={() => setCurrentView('queue')}
            onRegister={() => setShowRegisterModal(true)}
            isAuthenticated={!!pseudonym}
          />
        )}

        {/* VISTA C: Cola de Verificación */}
        {!selectedActorId && !selectedMemberId && !selectedClaimId && currentView === 'queue' && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <div>
                <div className="eyebrow" style={{ marginBottom: '8px' }}>
                  {t('queue.eyebrow')}
                </div>
                <h1 className="serif" style={{ fontSize: '28px', color: 'var(--text)', fontWeight: 500 }}>
                  {t('queue.title')}
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-soft)', marginTop: '6px' }}>
                  {t('queue.subtitle')}
                </p>
              </div>

              <button
                onClick={() => {
                  if (!getToken()) {
                    setShowRegisterModal(true);
                  } else {
                    setShowReportClaimModal(true);
                  }
                }}
                className="mono"
                style={{
                  background: 'var(--accent)',
                  border: 'none',
                  color: 'var(--accent-text)',
                  fontWeight: 600,
                  fontSize: '12px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px var(--accent-shadow)',
                  transition: 'opacity 0.15s ease',
                }}
              >
                {t('queue.report_claim_button')}
              </button>
            </div>

            {loading && (
              <div className="mono" style={{ color: 'var(--text-soft)', padding: '40px 0', textAlign: 'center' }}>
                {t('queue.loading')}
              </div>
            )}

            {error && (
              <div
                style={{
                  background: 'rgba(232, 112, 90, 0.1)',
                  border: '1px solid var(--refute)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  color: 'var(--text)',
                  marginTop: '20px',
                }}
              >
                <div className="mono" style={{ color: 'var(--refute)', fontWeight: 600, fontSize: '12px' }}>
                  {t('queue.error_title')}
                </div>
                <div style={{ fontSize: '13px', marginTop: '6px', color: 'var(--text-body)' }}>{error}</div>
                <button
                  onClick={loadClaims}
                  className="mono"
                  style={{
                    marginTop: '12px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  {t('queue.retry')}
                </button>
              </div>
            )}

            {!loading && !error && claims.length === 0 && (
              <div
                className="mono"
                style={{
                  background: 'var(--surface)',
                  border: '1px dashed var(--border)',
                  borderRadius: '16px',
                  padding: '40px',
                  textAlign: 'center',
                  color: 'var(--text-faint)',
                }}
              >
                {t('queue.empty')}
              </div>
            )}

            {!loading && !error && claims.length > 0 && (
              <div>
                {claims.map((claim) => (
                  <ClaimCard key={claim.id} claim={claim} onClick={() => handleSelectClaim(claim.id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* VISTA D: Sala de Verificación Detallada */}
        {!selectedMemberId && selectedClaimId && (
          <div>
            {loadingDetail && (
              <div className="mono" style={{ color: 'var(--text-soft)', padding: '60px 0', textAlign: 'center' }}>
                {t('verification.loading')}
              </div>
            )}

            {detailError && (
              <div
                style={{
                  background: 'rgba(232, 112, 90, 0.1)',
                  border: '1px solid var(--refute)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  color: 'var(--text)',
                }}
              >
                <div className="mono" style={{ color: 'var(--refute)', fontWeight: 600, fontSize: '12px' }}>
                  {t('verification.error_title')}
                </div>
                <div style={{ fontSize: '13px', marginTop: '6px', color: 'var(--text-body)' }}>{detailError}</div>
                <button
                  onClick={() => handleNavigate('queue')}
                  className="mono"
                  style={{
                    marginTop: '12px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  {`← ${t('verification.back_to_queue')}`}
                </button>
              </div>
            )}

            {!loadingDetail && !detailError && claimDetail && (
              <VerificationRoom
                detail={claimDetail}
                onBack={() => handleNavigate('queue')}
                onRefresh={refreshCurrentRoom}
                onRequestAuth={() => setShowRegisterModal(true)}
                onSelectMember={handleSelectMember}
              />
            )}
          </div>
        )}
      </main>

      {/* Modal Reportar Bulo */}
      {showReportClaimModal && (
        <ReportClaimModal
          onClose={() => setShowReportClaimModal(false)}
          onSuccess={(newId) => {
            loadClaims();
            handleSelectClaim(newId);
          }}
          onRequestAuth={() => setShowRegisterModal(true)}
        />
      )}

      {/* Modal de Onboarding y Registro Seudónimo con Manifiesto */}
      {showRegisterModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--overlay-bg)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '28px',
              width: '100%',
              maxWidth: '460px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            {/* MANIFIESTO EN ONBOARDING */}
            <div
              style={{
                background: 'linear-gradient(150deg, var(--surface-2), var(--bg))',
                border: '1px solid var(--border-soft)',
                borderRadius: '12px',
                padding: '16px 18px',
                marginBottom: '20px',
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: '9.5px',
                  letterSpacing: '0.12em',
                  color: 'var(--accent)',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  marginBottom: '8px',
                }}
              >
                {t('auth_modal.manifesto_badge')}
              </div>
              <p
                className="serif"
                style={{
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'var(--text)',
                  lineHeight: 1.35,
                  marginBottom: '8px',
                }}
              >
                “{t('auth_modal.manifesto_quote')}”
              </p>
              <p style={{ fontSize: '11.5px', color: 'var(--text-soft)', lineHeight: 1.5 }}>
                {t('auth_modal.manifesto_sub')}
              </p>
            </div>

            <div className="eyebrow" style={{ marginBottom: '8px' }}>
              {t('auth_modal.eyebrow')}
            </div>
            <h3 className="serif" style={{ fontSize: '20px', color: 'var(--text)', marginBottom: '8px' }}>
              {t('auth_modal.title')}
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-soft)', marginBottom: '18px', lineHeight: 1.5 }}>
              {t('auth_modal.subtitle')}
            </p>

            <form onSubmit={handleRegister}>
              <input
                type="text"
                placeholder={t('auth_modal.placeholder')}
                value={inputPseudonym}
                onChange={(e) => setInputPseudonym(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontFamily: 'var(--mono)',
                  marginBottom: '14px',
                  outline: 'none',
                }}
              />

              {registerError && (
                <div className="mono" style={{ color: 'var(--refute)', fontSize: '11px', marginBottom: '14px' }}>
                  ⚠️ {registerError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="mono"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-soft)',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  {t('auth_modal.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="mono"
                  style={{
                    background: 'var(--accent)',
                    border: 'none',
                    color: 'var(--accent-text)',
                    fontWeight: 600,
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    opacity: registering ? 0.7 : 1,
                  }}
                >
                  {registering ? '...' : t('auth_modal.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
