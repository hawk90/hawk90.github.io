#!/usr/bin/env node
// Restructure existing cxl/ series to "CXL 4.0 Internals" 15-chapter structure.
// Renames series field, reorders chapters, adds 5 new stubs.

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'src', 'content', 'blog', 'embedded', 'hardware', 'cxl');
const DRY = process.argv.includes('--dry-run');

// Existing files → new structure mapping.
// [oldFile, newFile, newOrder, newTitle, newDate, newDescription, outlinePoints]
const RENAMES = [
  ['chapter01-overview.md', 'chapter01-cxl-position.md', 1,
   "Ch 1: CXL의 자리와 진화 — 1.1에서 4.0까지",
   '2026-05-16T09:01:00',
   "CXL이 푸는 문제, 세대별 진화, 4.0의 핵심 변경 (128 GT/s·Bundled Port).",
   "CXL의 동기 (가속기 cache·디바이스 메모리 load/store), 세 프로토콜 (CXL.io·CXL.cache·CXL.mem), 세대 진화 (1.1 → 2.0 switching → 3.0 fabric → 4.0 128 GT/s), 4.0의 새 기능 (Bundled Port·Streamlined Port·x2 native·4 retimer), Flex Bus 개관, 시리즈 로드맵."
  ],
  // chapter02-cxl-io.md → Ch 6 (CXL.io)
  // chapter03-cxl-cache.md → Ch 7
  // chapter04-cxl-mem.md → Ch 8
  // chapter05-device-types.md → Ch 2 (System Architecture)
  // chapter06-pooling-sharing.md → Ch 4
  // chapter07-switch-fabric.md → Ch 13
  // chapter08-ml-accelerator.md → DELETE (covered in HBM·GDDR Ch 8·9)
  // chapter09-cxl-3.md → DELETE (covered in Ch 4·5)
  // chapter10-linux-driver.md → Ch 11
  ['chapter05-device-types.md', 'chapter02-system-architecture.md', 2,
   "Ch 2: System Architecture — Type 1·2·3·MLD·MH-MLD",
   '2026-05-16T09:02:00',
   "CXL 디바이스 분류와 multi-LD·multi-head 구조.",
   "Type 1 (cache-only NIC·DPU), Type 2 (accelerator with memory, HBM3·DRAM), Type 3 (memory expander), MLD (Multi Logical Device) — multi-host pooling을 위한 분할, MH-MLD (Multi-Headed Device) — 복수 upstream port, Bundled Port·Streamlined Port의 위치, 실 사례 (Samsung CMM-D, SK Hynix Niagara, AMD MI300X, Astera Labs Leo)."
  ],
  [null, 'chapter03-coherency-model.md', 3,
   "Ch 3: 메모리 일관성 모델 — HDM-DB·HDM-D·Bias·BISnp",
   '2026-05-16T09:03:00',
   "Host-managed Device Memory 두 종류와 일관성 메커니즘.",
   "HDM (Host-managed Device Memory) 정의, HDM-DB (Device-Backed, BISnp 기반 양방향 일관성) — Type 2의 양방향 cache, HDM-D (Device-Owned, Bias 기반 단방향) — Bias 전환으로 snoop overhead 회피, Bias 모드 — Host Bias vs Device Bias 의 전환 흐름, BISnp (Back-Invalidation Snoop) — CXL 3.0+의 explicit invalidation, snoop filter, software trigger."
  ],
  ['chapter06-pooling-sharing.md', 'chapter04-pooling-gfam.md', 4,
   "Ch 4: Pooling·GFAM·Fabric — Multi-host 메모리 공유",
   '2026-05-16T09:04:00',
   "CXL 2.0 pooling, CXL 3.x fabric, GFAM (Global Fabric Attached Memory).",
   "CXL 2.0 — Single-level switch + multi-LD time-share pooling, CXL 3.0 — Multi-level switch + coherent multi-host fabric, GFAM — fabric 전역에서 보이는 메모리 풀, PBR (Port-Based Routing) — switch가 라우팅, Fabric Manager — out-of-band 컨트롤, Coherency Domain ID, 실 사례 — Meta·Microsoft·AMD MI300 Cluster."
  ],
  [null, 'chapter05-cxl-4-features.md', 5,
   "Ch 5: CXL 4.0의 핵심 새 기능 — 128 GT/s·Bundled Port",
   '2026-05-16T09:05:00',
   "PCIe 7.0 기반 128 GT/s, Bundled Port·Streamlined Port의 동기와 효과.",
   "PCIe 7.0 PHY 위 128 GT/s — Flit 구조 (256B FEC·CRC)는 3.0과 동일, Backward compatibility 보장, x2 native width 추가, retimer 4개 지원 (장거리 link), Bundled Port — multiple upstream port 집계, Streamlined Port — 간소화된 enumeration, Maintenance — Host-initiated PPR·memory sparing at boot, 운용 효과 — latency↓·bandwidth↑·QoS↑."
  ],
  ['chapter02-cxl-io.md', 'chapter06-cxl-io.md', 6,
   "Ch 6: CXL.io — PCIe와의 차이·DOE·DVSEC",
   '2026-05-16T09:06:00',
   "CXL.io 프로토콜의 PCIe 호환성과 CXL 고유 확장.",
   "CXL.io 역할 — discovery·enumeration·configuration·error reporting, PCIe와 99% 호환, CXL DVSEC (Designated Vendor-Specific Extended Capability) — 디바이스가 CXL 호환임을 알리는 표지, DOE (Data Object Exchange) — SPDM·CMA·IDE_KM 같은 보조 프로토콜의 mailbox 채널, UIO (Unordered I/O) — P2P 흐름, Direct CXL.mem access (3.1+) — accelerator 간 P2P, Linux 측 인식 경로 (lspci DVSEC·DOE caps)."
  ],
  ['chapter03-cxl-cache.md', 'chapter07-cxl-cache.md', 7,
   "Ch 7: CXL.cache — D2H·H2D 흐름과 coherency state",
   '2026-05-16T09:07:00',
   "디바이스가 호스트 메모리를 캐시하는 프로토콜.",
   "CXL.cache 동기 — 가속기가 host 메모리를 native 캐시해 PCIe round-trip 회피, D2H 메시지 — Req (Read·Write·Invalidate)·Resp, H2D 메시지 — Snoop·Resp·Data, Cache state — Modified·Exclusive·Shared·Invalid (MESI 변형), Snoop 흐름 — host CPU의 cache와 device cache 간 일관성, Type 1 디바이스 시나리오 — SmartNIC packet metadata 캐싱, false sharing 위험."
  ],
  ['chapter04-cxl-mem.md', 'chapter08-cxl-mem.md', 8,
   "Ch 8: CXL.mem — M2S·S2M·HDM Decoder",
   '2026-05-16T09:08:00',
   "호스트가 디바이스 메모리를 load/store하는 프로토콜.",
   "CXL.mem 동기 — host가 device memory를 native load/store, M2S Req (MemRd·MemInv)·RwD (MemWr+data), S2M NDR (Cmp·Cmp-S)·DRS (MemData)·BISnp (Type 2만), Read 트랜잭션 흐름·Write 트랜잭션 흐름, Tag 기반 out-of-order completion, HDM Decoder — SPA → DPA 매핑, interleave, Linux 측 sysfs path (`cxl list -DT`)."
  ],
  [null, 'chapter09-flit-format.md', 9,
   "Ch 9: Flit Format — 68B vs 256B vs Latency-Optimized",
   '2026-05-16T09:09:00',
   "Flit 단위 구조의 세대 별 변화.",
   "Flit 개념 — Flow Control Unit, 68B flit (CXL 1.1·2.0) — 528-bit, PCIe 5.0 baseline, 256B flit (3.0+) — PCIe 6.0 FEC+CRC, throughput 위주, Latency-Optimized 256B flit — 작은 메시지 빠르게 보냄, Standard 256B flit — 큰 payload throughput, Flit packing rules — slot·DLLP·LLR, Protocol ID·payload·trailer, Backward compatibility negotiation."
  ],
  [null, 'chapter10-arb-mux.md', 10,
   "Ch 10: ARB/MUX — 세 프로토콜의 PHY 다중화",
   '2026-05-16T09:10:00',
   "같은 PHY에 CXL.io·CXL.cache·CXL.mem을 시분할로 흘리는 layer.",
   "ARB/MUX의 역할 — Transaction Layer와 Physical Layer 사이의 multiplexer, vLSM (virtual Link State Machine) — protocol별 link state, ALMP (ARB/MUX Link Management Packet) — protocol negotiation·power transition, Bypass Feature, arbitration policy — CXL.mem과 .cache 우선, .io fallback, Flit 단위 시분할 흐름."
  ],
  ['chapter10-linux-driver.md', 'chapter11-linux-driver.md', 11,
   "Ch 11: Linux drivers/cxl/ 분석 — Mainline kernel CXL 구현",
   '2026-05-16T09:11:00',
   "Linux 6.x의 CXL subsystem 코드 구조와 probe 흐름.",
   "모듈 구조 — cxl_acpi·cxl_pci·cxl_core·cxl_mem·cxl_port·cxl_pmem, 의존성 체인, cxl_pci_probe 단계별 호출 (DVSEC 확인·MMIO 매핑·mailbox 초기화·memdev 등록), HDM Decoder 프로그래밍 코드 (core/hdm.c), Region 생성 sysfs path (decoder → region → DAX), Mailbox API (core/mbox.c), Linux 6.0+에서 안정화, Modern Recipes Ch 151 연결."
  ],
  [null, 'chapter12-qemu-emulation.md', 12,
   "Ch 12: QEMU CXL 에뮬레이션 — 노트북에서 CXL 개발",
   '2026-05-16T09:12:00',
   "QEMU 8.0+의 CXL Type 3 에뮬레이션과 드라이버 검증 워크플로.",
   "QEMU CXL 지원 현황 (Type 3 stable, Type 2 experimental, Multi-LD partial), 호스트 머신 모델 (`-machine q35,cxl=on`), CXL Type 3 디바이스 추가 명령, Linux guest에서 cxl_acpi → cxl_pci → cxl_mem 인식 흐름, CEDT (CXL Early Discovery Table) 자동 생성, Region 생성·DAX 모드 전환, 드라이버 개발 사이클, 한계 (latency 시뮬레이션 부정확, CXL.cache 미지원), Modern Recipes Ch 150 연결."
  ],
  ['chapter07-switch-fabric.md', 'chapter13-switching-fabric.md', 13,
   "Ch 13: Switching·Fabric Manager — 2.0 pooling에서 3.x fabric까지",
   '2026-05-16T09:13:00',
   "CXL switch의 진화와 Fabric Manager의 역할.",
   "CXL 2.0 switching — single-host fan-out·multi-host pooling, CXL 3.0 fabric — multi-level switch·PBR·GFAM, Switch internal — port table·routing·QoS, Fabric Manager — out-of-band control plane (allocation·hot-plug·monitoring), MCTP (Management Component Transport Protocol) — FM↔switch 통신, DCD (Dynamic Capacity Device) — runtime 메모리 재할당, Composability vision."
  ],
  [null, 'chapter14-security.md', 14,
   "Ch 14: Security — IDE·SPDM·TSP·CXL TEE",
   '2026-05-16T09:14:00',
   "CXL 보안 메커니즘 4종의 위치와 관계.",
   "위협 모델 — link sniffing·MITM·device spoofing·firmware downgrade·co-tenant 도용, IDE (Integrity and Data Encryption) — link 트래픽 AES-GCM 암호화, SPDM (DMTF DSP0274) — 디바이스 인증·키 교환·session 협상, CMA (Component Measurement Attestation) — firmware hash 측정·검증, TSP (Trusted Security Protocol, CXL 3.1+) — fabric 통합 보안, CXL TEE (TDISP) — TVM에 디바이스 안전 attach, AMD SEV-TIO·Intel TDX Connect·ARM CCA의 CXL 통합."
  ],
  [null, 'chapter15-ras-performance.md', 15,
   "Ch 15: RAS·Performance·Compliance — 운용·검증의 마지막 단계",
   '2026-05-16T09:15:00',
   "Reliability·Availability·Serviceability, 성능 고려사항, Compliance Testing.",
   "RAS 이벤트 등급 — Information·Warning·Failure·Fatal, Viral·AER·Recovery, Poison list와 page offline, CVME (CXL Virtual Memory Errors), Performance Considerations — latency budget·bandwidth utilization·Roofline 적용, Compliance Testing (Ch 14) — 표준 test case·Compliance Mode DOE·Extended Metadata Capability test, 실 운용 사례 — `cxl health`·event log·bpftrace 추적, 시리즈 마무리."
  ],
];

const STUB_TEMPLATE = (title, desc, outline) => `---
title: "${title}"
date: TBD
description: "${desc}"
series: "CXL 4.0 Internals"
seriesOrder: 0
tags: [cxl, cxl-4, internals]
draft: true
---

> Outline — ${outline}
>
> 이 글은 *CXL 4.0 spec*을 *참고 자료*로 활용하되 *공개 자료 (CXL Consortium 발표·Linux drivers/cxl/·QEMU 소스·hyperscale 연구 논문)를 1차 자료*로 사용합니다. spec 문서 자체의 wording·table·figure를 *재생산하지 않습니다*.
>
> 시리즈 출처 안내는 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position) footer 참고.
`;

let renamed = 0;
let added = 0;
let removed = 0;

// Files to delete (not in new structure)
const TO_DELETE = [
  'chapter08-ml-accelerator.md',   // covered in HBM·GDDR Ch 8·9
  'chapter09-cxl-3.md',            // covered in Ch 4·5
];

for (const [oldFile, newFile, order, title, date, desc, outline] of RENAMES) {
  const oldPath = oldFile ? join(DIR, oldFile) : null;
  const newPath = join(DIR, newFile);

  let content;
  if (oldPath && existsSync(oldPath)) {
    content = readFileSync(oldPath, 'utf8');
    // Update frontmatter
    content = content.replace(/^title: .*$/m, `title: "${title}"`);
    content = content.replace(/^date: .*$/m, `date: ${date}`);
    content = content.replace(/^description: .*$/m, `description: "${desc}"`);
    content = content.replace(/^series: .*$/m, `series: "CXL 4.0 Internals"`);
    content = content.replace(/^seriesOrder: .*$/m, `seriesOrder: ${order}`);
    // Update outline body
    const fmEnd = content.indexOf('---', 4) + 3;
    const newOutline = `\n\n> Outline — ${outline}\n>\n> 이 글은 *CXL 4.0 spec*을 *참고 자료*로 활용하되 *공개 자료 (CXL Consortium 발표·Linux drivers/cxl/·QEMU 소스·hyperscale 연구 논문)를 1차 자료*로 사용합니다. spec 문서 자체의 wording·table·figure를 *재생산하지 않습니다*.\n`;
    content = content.slice(0, fmEnd) + newOutline;
    if (!DRY) {
      writeFileSync(newPath, content);
      if (oldPath !== newPath && existsSync(oldPath)) unlinkSync(oldPath);
    }
    console.log(`[RENAME] ${oldFile} → ${newFile}  (order ${order})`);
    renamed++;
  } else {
    content = STUB_TEMPLATE(title, desc, outline);
    content = content.replace(/^seriesOrder: 0$/m, `seriesOrder: ${order}`);
    content = content.replace(/^date: TBD$/m, `date: ${date}`);
    if (!DRY) writeFileSync(newPath, content);
    console.log(`[NEW]    ${newFile}  (order ${order})`);
    added++;
  }
}

// Delete unneeded files
for (const f of TO_DELETE) {
  const p = join(DIR, f);
  if (existsSync(p)) {
    if (!DRY) unlinkSync(p);
    console.log(`[DELETE] ${f}`);
    removed++;
  }
}

console.log(`\n${DRY ? 'DRY RUN' : 'APPLIED'}: renamed=${renamed} new=${added} deleted=${removed}`);
