export type ClaimKind = 'text' | 'image' | 'video' | 'mixed';
export type ClaimStatus = 'open' | 'in_review' | 'resolved';
export type ClaimVerdict = 'false' | 'true' | 'misleading' | 'unproven';

export type SourceKind = 'official' | 'primary' | 'press' | 'academic' | 'factchecker' | 'secundaria';
export type SourceReliability = 'high' | 'medium' | 'low' | 'disputed';
export type EvidenceStance = 'supports' | 'refutes' | 'contextualizes';
export type EvidenceStrength = 'strong' | 'moderate' | 'weak';
export type AssertionStatus = 'unverified' | 'supported' | 'refuted' | 'contested';
export type RebuttalStatus = 'draft' | 'published';

export interface Source {
  id: string;
  url: string;
  title: string;
  kind: SourceKind;
  reliability: SourceReliability;
  excerpt: string | null;
  added_by: string;
  added_at: string;
}

export interface Evidence {
  id: string;
  assertion_id: string;
  source_id: string;
  stance: EvidenceStance;
  strength: EvidenceStrength;
  rationale: string;
  added_by: string;
  added_at: string;
}

export interface EvidenceWithSource {
  evidence: Evidence;
  source: Source | null;
  added_by_pseudonym: string;
}

export interface Assertion {
  id: string;
  claim_id: string;
  text: string;
  is_load_bearing: boolean;
  status: AssertionStatus;
  created_by: string;
  created_by_pseudonym: string;
  evidence: EvidenceWithSource[];
}

export interface ClaimVariant {
  id: string;
  claim_id: string;
  origin_url: string;
  platform: string;
  language: string;
  snapshot: string | null;
  seen_at: string;
}

export interface Rebuttal {
  id: string;
  claim_id: string;
  base_text: string;
  published_at: string | null;
  status: RebuttalStatus;
}

export interface Claim {
  id: string;
  summary: string;
  kind: ClaimKind;
  detected_at: string;
  propagation_score: number;
  status: ClaimStatus;
  verdict: ClaimVerdict | null;
  created_by: string;
}

export interface ClaimDetailResponse {
  claim: Claim;
  assertions: Assertion[];
  variants?: ClaimVariant[];
  rebuttal?: Rebuttal | null;
}

export interface RegisterResponse {
  member_id: string;
  pseudonym: string;
  token: string;
}

export interface NewSourceInput {
  url: string;
  title: string;
  kind: SourceKind;
  reliability: SourceReliability;
  excerpt?: string | null;
}

export interface AddEvidencePayload {
  source: NewSourceInput;
  stance: EvidenceStance;
  strength: EvidenceStrength;
  rationale: string;
}

export interface CreateClaimPayload {
  summary: string;
  kind: ClaimKind;
  propagation_score: number;
  origin_url: string;
  platform: string;
  language: string;
}

export interface AddEvidenceResult {
  evidence_id: string;
  source_id: string;
  new_assertion_status: AssertionStatus;
  new_claim_verdict: ClaimVerdict | null;
}
