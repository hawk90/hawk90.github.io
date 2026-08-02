import { getPublicationDecision } from './publication';
import { TOPIC_REGISTRY } from './topics';
import type { ContentManifest, TopicDefinition } from './types';

export interface TopicHubConcept {
  title: string;
  description: string;
}

/** Editorial configuration for a curated Topic Hub, not a tag archive. */
export interface TopicHubDefinition extends TopicDefinition {
  href: string;
  isPublished: boolean;
  summary: string;
  audience: string;
  concepts: readonly TopicHubConcept[];
  startHereIds: readonly string[];
  relatedTopicIds: readonly string[];
}

/**
 * Topic Hubs introduce a field, provide a learning map, and curate entry
 * points. They intentionally do not replace tag listings or full search.
 */
export const TOPIC_HUBS: readonly TopicHubDefinition[] = [
  {
    id: 'pcie-cxl',
    label: 'PCIe & CXL',
    href: '/topics/pcie-cxl/',
    isPublished: true,
    summary: 'PCIe 장치 발견과 BAR, 인터럽트, DMA부터 CXL 메모리와 Linux 노출까지 호스트와 장치 사이의 흐름을 설명합니다.',
    audience: '시스템 소프트웨어와 장치 드라이버의 연결을 이해하려는 개발자',
    description: 'Host-to-device interconnect and coherent memory systems.',
    categoryIds: ['embedded/hardware', 'systems/architecture'],
    concepts: [
      { title: 'Enumeration', description: '장치를 발견하고 리소스를 배정하는 초기화 흐름' },
      { title: 'BAR & MMIO', description: '장치 레지스터 공간을 호스트 주소 공간에 연결하는 방식' },
      { title: 'Interrupt & DMA', description: '비동기 완료 통지와 고속 데이터 이동의 경계' },
      { title: 'CXL Memory', description: '일관성 메모리와 Linux 메모리 모델의 접점' },
    ],
    startHereIds: [
      'embedded/hardware/pcie/chapter01-fundamentals',
      'embedded/hardware/pcie/chapter04-bar-mmio',
      'embedded/hardware/cxl/chapter08-cxl-mem',
    ],
    relatedTopicIds: ['firmware-bootloader'],
  },
  {
    id: 'firmware-bootloader',
    label: 'Firmware & Bootloader',
    href: '/topics/firmware-bootloader/',
    isPublished: false,
    summary: 'ROM에서 펌웨어, 부트로더, 커널 핸드오프까지 시스템이 실행 가능한 상태가 되는 과정을 다룹니다.',
    audience: '보드 초기화와 부트 체인을 체계적으로 이해하려는 임베디드 개발자',
    description: 'Boot flow, board initialization, and firmware-to-kernel handoff.',
    categoryIds: ['embedded/bootloader', 'embedded/yocto'],
    concepts: [
      { title: 'Boot chain', description: 'ROM·SPL·부트로더·커널의 책임 분리' },
      { title: 'Board bring-up', description: '클록, DRAM, 핀 설정과 초기 주변장치 구성' },
      { title: 'Device tree', description: '하드웨어 설명을 커널과 부트로더가 공유하는 계약' },
      { title: 'Verified boot', description: '신뢰 체인과 업데이트 무결성의 경계' },
    ],
    startHereIds: [],
    relatedTopicIds: ['pcie-cxl'],
  },
];

const hubsById = new Map(TOPIC_HUBS.map((hub) => [hub.id, hub]));

export function getTopicHubDefinition(id: string): TopicHubDefinition | undefined {
  return hubsById.get(id);
}

/** Reject silent omissions and broken links before a curated hub is published. */
export function assertTopicHubIntegrity(manifest: ContentManifest): void {
  const issues: string[] = [];
  const ids = new Set<string>();

  for (const hub of TOPIC_HUBS) {
    if (ids.has(hub.id)) issues.push(`Duplicate Topic Hub ID: ${hub.id}`);
    ids.add(hub.id);
    if (hub.href !== `/topics/${hub.id}/`) issues.push(`${hub.id}: href must be /topics/${hub.id}/`);
    // Draft hubs are planning records. Their taxonomy and start-here choices
    // become build contracts only once they are published.
    if (!hub.isPublished) continue;
    if (!hub.summary.trim() || !hub.audience.trim()) issues.push(`${hub.id}: summary and audience are required`);

    for (const categoryId of hub.categoryIds) {
      if (!TOPIC_REGISTRY.byId.has(categoryId)) issues.push(`${hub.id}: unknown category ${categoryId}`);
    }
    for (const relatedId of hub.relatedTopicIds) {
      if (relatedId === hub.id) issues.push(`${hub.id}: cannot relate to itself`);
      else if (!hubsById.has(relatedId)) issues.push(`${hub.id}: unknown related hub ${relatedId}`);
    }

    if (hub.startHereIds.length === 0) issues.push(`${hub.id}: published hubs need at least one Start Here document`);
    for (const documentId of hub.startHereIds) {
      const document = manifest.byId.get(documentId);
      if (!document) {
        issues.push(`${hub.id}: missing Start Here document ${documentId}`);
        continue;
      }
      if (!getPublicationDecision(document).render) issues.push(`${hub.id}: Start Here document is not published: ${documentId}`);
      const belongsToHub = document.categories.some((category) => hub.categoryIds.some(
        (hubCategory) => category === hubCategory || category.startsWith(`${hubCategory}/`),
      ));
      if (!belongsToHub) issues.push(`${hub.id}: Start Here document is outside hub categories: ${documentId}`);
    }
  }

  if (issues.length) throw new Error(`Topic Hub integrity failed:\n- ${issues.join('\n- ')}`);
}
