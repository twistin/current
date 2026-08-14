import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchClaims, fetchClaimDetail, registerMember, getToken } from './api/client';
import { Claim, ClaimDetailResponse } from './api/types';
import { Header } from './components/Header';
import { ClaimCard } from './components/ClaimCard';
import { VerificationRoom } from './components/VerificationRoom';
import { ReportClaimModal } from './components/ReportClaimModal';

export const App: React.FC = () => {
  const { t } = useTranslation();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Autenticación seudónima
  const [pseudonym, setPseudonym] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [inputPseudonym, setInputPseudonym] = useState<string>('');
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Navegación a Sala de Verificación
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [claimDetail, setClaimDetail] = useState<ClaimDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

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

  useEffect(() => {
    loadClaims();
    const storedToken = getToken();
    if (storedToken) {
      setPseudonym('verificador_activo');
    }
  }, []);

  const handleSelectClaim = async (id: string) => {
    setSelectedClaimId(id);
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

  const refreshCurrentRoom = () => {
    if (selectedClaimId) {
      handleSelectClaim(selectedClaimId);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPseudonym.trim()) return;

    setRegisterError(null);
    try {
      const res = await registerMember(inputPseudonym.trim());
      setPseudonym(res.pseudonym);
      setShowRegisterModal(false);
      setInputPseudonym('');
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'Error al registrar');
    }
  };

  return (
    <div>
      <Header memberPseudonym={pseudonym} onRegisterClick={() => setShowRegisterModal(true)} />

      <main className="wrap" style={{ paddingTop: '34px' }}>
        {/* VISTA 1: Lista de Cola de Verificación */}
        {!selectedClaimId && (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
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
                  color: '#0c1830',
                  fontWeight: 600,
                  fontSize: '12px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
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

        {/* VISTA 2: Sala de Verificación */}
        {selectedClaimId && (
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
                  onClick={() => setSelectedClaimId(null)}
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
                  {t('verification.back_to_queue')}
                </button>
              </div>
            )}

            {!loadingDetail && !detailError && claimDetail && (
              <VerificationRoom
                detail={claimDetail}
                onBack={() => setSelectedClaimId(null)}
                onRefresh={refreshCurrentRoom}
                onRequestAuth={() => setShowRegisterModal(true)}
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

      {/* Modal Mínimo de Registro Seudónimo */}
      {showRegisterModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '28px',
              width: '90%',
              maxWidth: '420px',
            }}
          >
            <div className="eyebrow" style={{ marginBottom: '10px' }}>
              {t('auth_modal.eyebrow')}
            </div>
            <h3 className="serif" style={{ fontSize: '20px', color: 'var(--text)', marginBottom: '12px' }}>
              {t('auth_modal.title')}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-soft)', marginBottom: '18px', lineHeight: 1.5 }}>
              {t('auth_modal.subtitle')}
            </p>

            <form onSubmit={handleRegister}>
              <input
                type="text"
                placeholder={t('auth_modal.placeholder')}
                value={inputPseudonym}
                onChange={(e) => setInputPseudonym(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
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
                  {registerError}
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
                  className="mono"
                  style={{
                    background: 'var(--accent)',
                    border: 'none',
                    color: '#0c1830',
                    fontWeight: 600,
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  {t('auth_modal.submit')}
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
