---
title: "Ch 14: Security — IDE·SPDM·TSP·CXL TEE"
date: 2026-05-16T09:14:00
description: "CXL 보안 메커니즘 4종의 위치와 관계."
series: "CXL 4.0 Internals"
seriesOrder: 14
tags: [cxl-security, ide, spdm, tsp, tdisp]
draft: false
---

## 한 줄 요약

> **"CXL 보안은 *4가지 layer*로 구성됩니다."** — *SPDM*은 *디바이스 인증*, *IDE*는 *link 암호화*, *TSP*는 *fabric 통합 보안*, *CXL TEE (TDISP)*는 *TVM에 디바이스 안전 attach*. 각 layer가 *서로 다른 위협*에 대응하며 *조합되면 host CPU·link·device 메모리 전체*에 *Confidential Computing*이 적용됩니다.

[Ch 13](/blog/embedded/hardware/cxl/chapter13-switching-fabric)에서 *Fabric Manager의 control plane*을 봤습니다. 이 장은 *그 fabric의 보안*입니다. CXL은 *PCIe·DMTF·CCC 표준의 조합*으로 *layer별 보안*을 정의합니다.

## 위협 모델

CXL 환경의 *주요 위협*:

| 위협 | 시나리오 |
|------|---------|
| Link sniffing | 운영자가 *cable·interposer·protocol analyzer*로 link 트래픽 capture |
| MITM (Man-in-the-Middle) | *재전송·수정* 공격 |
| Device spoofing | *가짜 디바이스*가 정품처럼 인증 시도 |
| Firmware downgrade | *알려진 취약점 firmware*가 설치된 디바이스 |
| Co-tenant 도용 | 같은 host의 *다른 VM*이 *guest 자원* 도용 |
| Replay attack | 과거 패킷·메시지 재사용 |

이들이 *Confidential Computing의 신뢰 모델*에서 *반드시 막아야 할 위협*입니다.

## 4 Layer 방어 — 한눈에

| Layer | 표준 | 역할 |
|-------|------|------|
| **Authentication** | SPDM (DSP0274) | 디바이스 신원 확인·session 협상 |
| **Link Encryption** | IDE | link 트래픽 AES-GCM 암호화·무결성 |
| **Fabric Security** | TSP (CXL 3.1+) | fabric 통합 보안·multi-host coordination |
| **TEE Integration** | TDISP | TVM에 디바이스 안전 attach |

각 layer는 *서로 다른 attack surface*를 cover하며, *조합되어 end-to-end 보안*을 형성합니다.

## SPDM — 디바이스 인증

*SPDM (Security Protocol Data Model)*은 *DMTF DSP0274 표준*입니다.

| 항목 | 의미 |
|------|------|
| 정의 | DMTF DSP0274 |
| 전송 | PCIe DOE, MCTP, USB, I2C 등 |
| 용도 | 디바이스 인증·키 교환·session 협상 |
| CXL 사용 | DOE channel로 SPDM 메시지 흐름 |

표준 메시지 시퀀스 (요약):

| 단계 | 메시지 | 방향 |
|------|--------|------|
| 1 | GET_VERSION / VERSION | host ↔ device |
| 2 | GET_CAPABILITIES / CAPABILITIES | host ↔ device |
| 3 | NEGOTIATE_ALGORITHMS / ALGORITHMS | algorithm 협상 |
| 4 | GET_DIGESTS / DIGESTS | 인증서 chain hash |
| 5 | GET_CERTIFICATE / CERTIFICATE | X.509 chain |
| 6 | CHALLENGE / CHALLENGE_AUTH | nonce 기반 proof of possession |
| 7 | GET_MEASUREMENTS / MEASUREMENTS | firmware hash |
| 8 | KEY_EXCHANGE / FINISH | session 키 |

이 흐름 끝에 *host·device가 서로 신원 확인 + 공유 session 키*를 가집니다.

자세한 내용은 [Embedded Security Ch 12 SPDM과 CMA 인증](/blog/embedded/embedded-security/chapter12-spdm-cma).

## IDE — Link 암호화

*IDE (Integrity and Data Encryption)*는 *PCIe·CXL link 트래픽*을 *AES-GCM 256*으로 *암호화·인증*합니다.

| 항목 | 값 |
|------|-----|
| 알고리즘 | AES-GCM 256 |
| Counter | 96-bit nonce |
| MAC | 96-bit GMAC |
| 모드 | Selective IDE (특정 stream) 또는 Link IDE (전체) |

CXL 환경에서는 *Link IDE 기본* — 모든 트래픽 (CXL.io·CXL.cache·CXL.mem) 암호화.

성능 영향:

| 항목 | 평문 | IDE 활성 | 차이 |
|------|------|---------|------|
| Throughput | baseline | -5% | flit 헤더에 MAC 추가 |
| Latency | baseline | +17 ns | AES-GCM 가속기 처리 |
| Power | baseline | +1.5~2 W | 가속기 추가 |

자세한 내용은 [Embedded Security Ch 11 PCIe·CXL IDE 분석](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide).

## TSP — Fabric Security (CXL 3.1+)

*TSP (Trusted Security Protocol)*는 CXL 3.1부터 추가된 *fabric 통합 보안 표준*입니다.

| 항목 | 의미 |
|------|------|
| 도입 | CXL 3.1 |
| 적용 | Multi-host fabric, GFAM |
| 책임 | fabric 내 multi-host secure coordination |
| 메커니즘 | IDE·SPDM 기반 위에 fabric layer 보안 |

TSP가 푸는 문제:

| 문제 | TSP 해결 |
|------|---------|
| 같은 fabric의 다른 host가 데이터 도용 시도 | host 별 *coherency domain 격리* |
| Fabric switch firmware 신뢰성 | switch attestation + secure routing |
| GFAM의 multi-host access | per-host *region access control* |
| Fabric Manager 자체 신뢰성 | FM authentication + secure command channel |

*Fabric scale에서 IDE·SPDM만으로는 부족*한 *multi-host coordination*을 TSP가 담당합니다.

## CXL TEE — TDISP 통합

*TEE (Trusted Execution Environment)*가 *CXL 디바이스까지 확장*된 게 *CXL TEE*입니다. *TDISP (TEE Device Interface Security Protocol)*가 표준입니다.

| 항목 | 의미 |
|------|------|
| 정의 | PCI-SIG ECN + CXL Consortium ECN |
| 적용 | Confidential Computing + CXL device |
| 의존 | SPDM·IDE 필수 |
| 목표 | TVM에 device를 *hypervisor 격리 상태로 attach* |

각 CPU 벤더의 *TVM 구현*:

| CPU 벤더 | TVM 구현 | CXL 통합 |
|---------|---------|---------|
| AMD | SEV-SNP | SEV-TIO (Trusted I/O) |
| Intel | TDX | TDX Connect |
| ARM | CCA (Realm) | Realm Memory Manager + CXL |

TDISP가 *벤더 무관*하게 동작 — *PCI-SIG·CXL·CCC가 공동 정의한 표준*.

자세한 내용은 [Embedded Security Ch 13 CXL TEE 확장](/blog/embedded/embedded-security/chapter13-cxl-tee).

## TDISP 상태 머신

디바이스는 *TDISP의 4가지 상태*로 lifecycle:

| 상태 | 의미 | 진입 조건 |
|------|------|----------|
| UNLOCKED | 기본 상태. 누구나 접근 가능 | 초기·detach 후 |
| CONFIG_LOCKED | 설정 잠김. 변경 불가하지만 사용 가능 | TDI lock 명령 |
| RUN | TVM에 attach되어 동작 중 | START_INTERFACE_REQUEST |
| ERROR | 에러 발생, 격리 | violation 감지 |

상태 전이는 *out-of-band control*로 trigger되며, *각 전이마다 SPDM 검증* 또는 *firmware attestation* 필요.

## 4 Layer 통합 — Confidential Computing 흐름

전체 보안 흐름:

| 단계 | Layer | 동작 |
|------|-------|------|
| 1 | SPDM | host가 디바이스 인증·firmware measurement 검증 |
| 2 | SPDM | session 키 교환 |
| 3 | IDE | session 키 기반 link AES-GCM 활성 |
| 4 | TSP | fabric 내 coordination 보안 (multi-host 환경) |
| 5 | TDISP | TVM이 device attach 요청 → LOCKED → RUN |
| 6 | IDE + TDISP | 모든 link 트래픽 암호화 + TVM 격리 |
| 7 | Periodic | IDE 키 refresh, SPDM re-attestation |

이 흐름이 *cloud operator·hypervisor·co-tenant·network attacker를 모두 적*으로 가정한 *Confidential Computing 모델*을 *CXL device까지 확장*합니다.

## 한국 메모리 산업의 위치

CXL Consortium의 *공개 자료* 기준:

| 회사 | 관여 |
|------|------|
| Samsung | CXL Consortium IDE Working Group 참여, CMM-D 양산 디바이스에 IDE 활성 |
| SK Hynix | Niagara 양산, IDE 지원 |
| Astera Labs | Leo 카드, IDE + SPDM 통합 |

*IDE의 AES-GCM 가속기*가 *디바이스 controller die 내부에 통합*되어 *firmware update만으로 활성화*. *한국 두 회사가 CXL 보안 WG의 코어 멤버*.

## 자주 하는 실수

### "IDE만 켜면 데이터센터가 안전"

IDE는 *link만* 보호. *디바이스 안의 메모리·캐시·레지스터*는 *별도 보호 메커니즘* 필요. CXL 메모리 디바이스에 저장된 *plain DRAM 내용*은 *physical attack에 그대로 노출*. *TEE 영역*이 필요.

### "SPDM 한 번 인증 = 영구 신뢰"

*Counter overflow·session 만료*에 따라 *주기적 re-attestation* 필요. CXL 3.0 fabric의 *128 GB/s 링크*는 *분 단위 key refresh* 권장.

### "TSP는 IDE의 단순 확장"

*Layer가 다릅니다*. IDE는 *링크별 암호화*, TSP는 *fabric 내 multi-host coordination*. 둘은 *상호 보완·필수 동시 사용*.

### "TDISP가 IDE·SPDM 대체"

*완전 보완 관계*. TDISP는 *디바이스 lock·TVM attach*, IDE는 *링크 트래픽*, SPDM은 *인증*. *셋 다 활성*해야 confidential.

### "Side-channel 공격은 자동 차단"

*Power·timing·EM* 채널은 *CXL 보안 영역 밖*. [Embedded Security Ch 7 Side-channel 공격](/blog/embedded/embedded-security/chapter07-side-channel) 영역.

## 정리

- CXL 보안은 *4 layer 표준 조합* — SPDM·IDE·TSP·TDISP.
- *SPDM (DSP0274)*: 디바이스 인증·키 교환·session.
- *IDE*: link 트래픽 AES-GCM 256 암호화. -5% throughput, +17 ns latency cost.
- *TSP* (CXL 3.1+): fabric 통합 보안·multi-host coordination.
- *TDISP*: TVM에 device 안전 attach. AMD SEV-TIO·Intel TDX Connect·ARM CCA 통합.
- *Full Confidential Computing*은 *4 layer 모두 활성* + *주기적 re-attestation* 필요.
- *Side-channel·physical attack*은 *CXL 보안 영역 밖* — 별도 메커니즘.

## 다음 편

[Ch 15: RAS·Performance·Compliance — 운용·검증의 마지막 단계](/blog/embedded/hardware/cxl/chapter15-ras-performance)에서 *Reliability·Availability·Serviceability*, *Performance Considerations*, *Compliance Testing*을 분해하고 *시리즈 마무리*합니다.

## 관련 항목

- [Ch 13: Switching·Fabric Manager](/blog/embedded/hardware/cxl/chapter13-switching-fabric)
- [Embedded Security Ch 11: PCIe·CXL IDE 분석](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)
- [Embedded Security Ch 12: SPDM과 CMA 인증 흐름](/blog/embedded/embedded-security/chapter12-spdm-cma)
- [Embedded Security Ch 13: CXL TEE 확장](/blog/embedded/embedded-security/chapter13-cxl-tee)

## 시리즈 자료 출처 안내

본 글은 *CXL Consortium·DMTF·PCI-SIG·CCC 공개 자료*를 1차 자료로 합니다. CXL 4.0 Specification은 *§ navigation aid*로만 인용. 자세한 spec 인용 정책은 [Ch 1 footer](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내) 참고.
