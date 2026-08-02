import { getPublicationDecision } from './publication';
import type { ContentDocument, ContentManifest } from './types';

/** A deliberate learning-path relationship between two published documents. */
export type ContentRelationKind = 'prerequisite' | 'deep-dive' | 'implementation' | 'related';

export interface ContentRelation {
  /** The document where this relationship is shown. */
  sourceId: string;
  /** The recommended destination document. */
  targetId: string;
  kind: ContentRelationKind;
  /** Optional human explanation; use this for a relation that needs context. */
  rationale?: string;
}

export interface ContentRelationMatch {
  document: ContentDocument;
  kind: ContentRelationKind;
  rationale?: string;
}

/**
 * Curated cross-document learning paths. Keep this separate from frontmatter:
 * a relationship is editorial metadata, not an incidental property of one file.
 */
export const CONTENT_RELATIONS: readonly ContentRelation[] = [
  {
    sourceId: 'embedded/hardware/cxl/chapter01-cxl-position',
    targetId: 'embedded/hardware/pcie/chapter01-fundamentals',
    kind: 'prerequisite',
    rationale: 'CXL이 기반으로 삼는 PCIe 링크와 계층 구조를 먼저 확인합니다.',
  },
  {
    sourceId: 'embedded/hardware/cxl/chapter06-cxl-io',
    targetId: 'embedded/hardware/pcie/chapter02-tlp',
    kind: 'prerequisite',
    rationale: 'CXL.io와 PCIe TLP의 연결을 이해하기 위한 선행 개념입니다.',
  },
] as const;

const RELATION_KINDS = new Set<ContentRelationKind>(['prerequisite', 'deep-dive', 'implementation', 'related']);
const validatedManifests = new WeakSet<ContentManifest>();

/** Reject broken or duplicate editorial links before they can become production 404s. */
export function assertContentRelationIntegrity(
  relations: readonly ContentRelation[],
  documents: readonly Pick<ContentDocument, 'id' | 'status'>[],
): void {
  const documentsById = new Map(documents.map((document) => [document.id, document]));
  const seen = new Set<string>();

  for (const relation of relations) {
    if (!RELATION_KINDS.has(relation.kind)) {
      throw new Error(`Content relation has an unknown kind: ${relation.kind}`);
    }
    if (!relation.sourceId || !relation.targetId) {
      throw new Error('Content relation requires both sourceId and targetId.');
    }
    if (relation.sourceId === relation.targetId) {
      throw new Error(`Content relation cannot point to itself: ${relation.sourceId}`);
    }
    if (!documentsById.has(relation.sourceId) || !documentsById.has(relation.targetId)) {
      throw new Error(`Content relation references a missing document: ${relation.sourceId} -> ${relation.targetId}`);
    }
    for (const [role, id] of [['source', relation.sourceId], ['target', relation.targetId]] as const) {
      if (documentsById.get(id)?.status !== 'published') {
        throw new Error(`Content relation ${role} must be published: ${id}`);
      }
    }
    const key = `${relation.sourceId}\u0000${relation.targetId}\u0000${relation.kind}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate content relation: ${relation.sourceId} -> ${relation.targetId} (${relation.kind})`);
    }
    seen.add(key);
  }
}

/** Returns only intentional, renderable relations for a document. */
export function getContentRelations(manifest: ContentManifest, sourceId: string): ContentRelationMatch[] {
  if (!validatedManifests.has(manifest)) {
    assertContentRelationIntegrity(CONTENT_RELATIONS, manifest.documents);
    validatedManifests.add(manifest);
  }
  return CONTENT_RELATIONS.flatMap((relation) => {
    if (relation.sourceId !== sourceId) return [];
    const document = manifest.byId.get(relation.targetId);
    if (!document || !getPublicationDecision(document).render) return [];
    return [{ document, kind: relation.kind, rationale: relation.rationale }];
  });
}
