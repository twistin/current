import {
  AddEvidencePayload,
  AddEvidenceResult,
  Assertion,
  Claim,
  ClaimDetailResponse,
  CreateClaimPayload,
  MemberProfileResponse,
  Rebuttal,
  RegisterResponse,
  RetractAssertionResponse,
  RetractEvidenceResponse,
} from './types';

const TOKEN_KEY = 'current_bearer_token';
const PSEUDONYM_KEY = 'current_pseudonym';
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredPseudonym(): string | null {
  return localStorage.getItem(PSEUDONYM_KEY);
}

export function setStoredPseudonym(pseudonym: string): void {
  localStorage.setItem(PSEUDONYM_KEY, pseudonym);
}

/// Obtiene la lista priorizada de bulos (GET /claims)
export async function fetchClaims(): Promise<Claim[]> {
  const res = await fetch(`${API_BASE_URL}/claims`);
  if (!res.ok) {
    throw new Error(`Error al obtener bulos: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/// Obtiene el detalle de un bulo con sus afirmaciones, evidencias, variantes y desmentido (GET /claims/:id)
export async function fetchClaimDetail(id: string): Promise<ClaimDetailResponse> {
  const res = await fetch(`${API_BASE_URL}/claims/${id}`);
  if (!res.ok) {
    throw new Error(`Error al obtener detalle del bulo: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/// Obtiene el perfil de un miembro con sus estadísticas y aportaciones (GET /members/:identifier)
export async function fetchMemberProfile(identifier: string): Promise<MemberProfileResponse> {
  const res = await fetch(`${API_BASE_URL}/members/${encodeURIComponent(identifier)}`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('member_not_found');
    }
    throw new Error(`Error al obtener perfil: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/// Registro seudónimo de miembro (POST /auth/register)
export async function registerMember(pseudonym: string): Promise<RegisterResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pseudonym }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.details || 'Error al registrar miembro seudónimo');
  }

  const data: RegisterResponse = await res.json();
  setToken(data.token);
  setStoredPseudonym(data.pseudonym);
  return data;
}

/// Reporta un bulo nuevo (POST /claims)
export async function createClaim(payload: CreateClaimPayload): Promise<{ claim: Claim }> {
  const token = getToken();
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const res = await fetch(`${API_BASE_URL}/claims`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.details || 'Error al reportar el bulo');
  }

  return res.json();
}

/// Descompone un bulo en afirmaciones (POST /claims/:id/assertions)
export async function decomposeClaim(
  claimId: string,
  assertions: { text: string; is_load_bearing: boolean }[]
): Promise<Assertion[]> {
  const token = getToken();
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const res = await fetch(`${API_BASE_URL}/claims/${claimId}/assertions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ assertions }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.details || 'Error al descomponer el bulo');
  }

  const data = await res.json();
  return data.assertions;
}

/// Añade evidencia a una afirmación (POST /assertions/:id/evidence)
export async function addEvidence(
  assertionId: string,
  payload: AddEvidencePayload
): Promise<AddEvidenceResult> {
  const token = getToken();
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const res = await fetch(`${API_BASE_URL}/assertions/${assertionId}/evidence`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.details || 'Error al guardar la evidencia');
  }

  return res.json();
}

/// Publica un desmentido oficial (POST /claims/:id/rebuttal)
export async function publishRebuttal(
  claimId: string,
  baseText: string
): Promise<Rebuttal> {
  const token = getToken();
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const res = await fetch(`${API_BASE_URL}/claims/${claimId}/rebuttal`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ base_text: baseText }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.details || 'Error al publicar el desmentido');
  }

  return res.json();
}

/// Retracta una evidencia propia con rastro (POST /evidence/:id/retract)
export async function retractEvidence(evidenceId: string): Promise<RetractEvidenceResponse> {
  const token = getToken();
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const res = await fetch(`${API_BASE_URL}/evidence/${evidenceId}/retract`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.details || 'Error al retirar la evidencia');
  }

  return res.json();
}

/// Retracta una afirmación propia con rastro (POST /assertions/:id/retract)
export async function retractAssertion(assertionId: string): Promise<RetractAssertionResponse> {
  const token = getToken();
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const res = await fetch(`${API_BASE_URL}/assertions/${assertionId}/retract`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.details || 'Error al retirar la afirmación');
  }

  return res.json();
}
