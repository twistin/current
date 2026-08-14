import {
  AddEvidencePayload,
  AddEvidenceResult,
  Assertion,
  Claim,
  ClaimDetailResponse,
  CreateClaimPayload,
  Rebuttal,
  RegisterResponse,
} from './types';

const TOKEN_KEY = 'current_bearer_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/// Obtiene la lista priorizada de bulos (GET /claims)
export async function fetchClaims(): Promise<Claim[]> {
  const res = await fetch('/claims');
  if (!res.ok) {
    throw new Error(`Error al obtener bulos: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/// Obtiene el detalle de un bulo con sus afirmaciones, evidencias, variantes y desmentido (GET /claims/:id)
export async function fetchClaimDetail(id: string): Promise<ClaimDetailResponse> {
  const res = await fetch(`/claims/${id}`);
  if (!res.ok) {
    throw new Error(`Error al obtener detalle del bulo: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/// Registro seudónimo de miembro (POST /auth/register)
export async function registerMember(pseudonym: string): Promise<RegisterResponse> {
  const res = await fetch('/auth/register', {
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
  return data;
}

/// Reporta un bulo nuevo (POST /claims)
export async function createClaim(payload: CreateClaimPayload): Promise<{ claim: Claim }> {
  const token = getToken();
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const res = await fetch('/claims', {
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

  const res = await fetch(`/claims/${claimId}/assertions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ assertions }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.details || 'Error al descomponer el bulo en afirmaciones');
  }

  return res.json();
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

  const res = await fetch(`/assertions/${assertionId}/evidence`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.details || 'Error al añadir evidencia');
  }

  return res.json();
}

/// Publica un desmentido verificando el invariante (POST /claims/:id/rebuttal)
export async function publishRebuttal(claimId: string, baseText: string): Promise<Rebuttal> {
  const token = getToken();
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const res = await fetch(`/claims/${claimId}/rebuttal`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ base_text: baseText }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 409) {
      throw new Error(
        errorData.details ||
          'CONFLICT: El desmentido no puede publicarse si el veredicto del bulo es unproven (no probado).'
      );
    }
    throw new Error(errorData.details || 'Error al publicar el desmentido');
  }

  return res.json();
}
