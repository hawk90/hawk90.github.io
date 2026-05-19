---
title: "Ch 10: Reusable Software"
date: 2026-05-18T10:00:00
description: "COTS·SOI·기존 SW 재사용 — DO-178C가 허용하는 방식."
series: "Developing Safety-Critical Software"
seriesOrder: 10
tags: [avionics, do-178c, reusable, cots, soi]
draft: true
---

## 한 줄 요약

> **"재사용 = 비용 절감 + evidence 부담"** — RTOS·라이브러리 인증 패키지 활용.

## 왜 재사용이 어려운가

```text
DO-178C 요구:
  *모든 SW에 evidence* 필요
  Code → review·test·analysis·coverage
  
재사용 SW도 *동일 evidence*:
  - HLR·LLR·design 문서
  - Test cases·procedures·results
  - Coverage achieved
  - Reviews·analyses
  - Trace matrix
  
"이미 동작 검증된 SW"라도
  → 인증 frame 안에서 *재증명* 필요
```

재사용 ≠ free. *evidence 비용*은 여전.

## 재사용 SW 유형

```text
1. PDS (Previously Developed Software):
   회사 내부 — 이전 project 자산
   Re-certify 또는 update

2. COTS (Commercial Off-The-Shelf):
   상업 SW — RTOS·middleware·라이브러리
   예 — VxWorks·INTEGRITY-178·LynxOS-178
   
3. SOI (Software of Independent Origin):
   Open source — 외부 origin
   예 — FreeRTOS·NASA cFS·F-Prime
   
4. Modified PDS·COTS·SOI:
   기존 + 수정
   가장 일반적 case
```

각 유형별 *evidence 요구 차이*.

## DO-178C §12 — Reusable Software

```text
§12 specific guidance:
  
  §12.1 Reusable Software Component (RSC):
    Standalone component
    Re-use across projects
    
  §12.2 PDS:
    Re-use evidence + gap analysis
    
  §12.3 Tool Qualification:
    Tool reuse (Ch 9 참고)
    
  §12.4 Alternative Methods:
    Formal methods·MBD·OOP (DO-331·332·333)
```

각 *use case별* 산출물 요구.

## RSC — Reusable Software Component

```text
RSC 정의:
  Self-contained component
  Defined interface
  Re-use evidence package
  
RSC package:
  - Plans (PSAC·SDP·SVP·SCMP·SQAP)
  - Standards (SRS·SDS·SCS)
  - Requirements (HLR·LLR)
  - Architecture·design
  - Source code
  - Tests (cases·procedures·results)
  - Coverage report
  - Reviews·analyses
  - Trace matrix
  - SAS
  - PSAC update (project-specific)
  
사용자 (integrator):
  - Component requirement integration
  - Configuration·environment 명시
  - Gap analysis
  - Integration test
  - Plan update (PSAC reference)
```

RSC = *certification-ready component*. Plug-and-play.

## RSC 대표 예 — VxWorks 653·INTEGRITY-178

```text
VxWorks 653 (Wind River):
  ARINC-653 partitioning OS
  DO-178C Level A package
  Used in:
    Boeing 787
    Airbus A350·A380
    Lockheed F-35 (older variants)
    
  Package:
    Kernel + ARINC-653 layer
    DO-178C Level A SAS·plans·evidence
    BSP for specific hardware
    
INTEGRITY-178 tuMP (Green Hills):
  Multi-core ARINC-653 RTOS
  DO-178C Level A
  Used in F-35, Boeing 777X, Airbus A350
  
LynxOS-178 (Lynx Software):
  Linux 호환 + ARINC-653 + DO-178C
  Used in F-22, Boeing 787

PikeOS (SYSGO):
  Multi-core hypervisor
  유럽 강세 — Airbus A350, Eurofighter
```

각 OS — *수십만 달러+ license*. 인증 package 포함.

## COTS — 비인증 상용 SW

```text
COTS RTOS (비인증):
  - FreeRTOS (free)
  - Embedded Linux
  - Zephyr
  - RT-Thread
  
인증 부담 — 사용자에:
  Full DO-178C evidence package 필요
  
방법:
  1. Self-certify (full work)
  2. SafeRTOS (FreeRTOS의 인증 fork)
  3. Linux + qualified subset (VOSS·BR-Linux)
  
COTS library:
  - libc·libm
  - STL
  - JSON·XML parser
  - Crypto library
  → 보통 *자체 wrapping + test*
```

비인증 COTS — *self-cert 비용 큼*. 보통 회피.

## SOI — Software of Independent Origin

```text
SOI 정의:
  Open source 또는 외부 origin
  Documentation·process 불명
  
대표 SOI:
  - FreeRTOS
  - NASA cFS (NASA released)
  - F-Prime (JPL released)
  - GCC·libc
  - Linux kernel
  - Various open source
  
인증 도전:
  - Source review (가능)
  - Test 부족 또는 비일치
  - Design 문서 부족
  - History 추적 불완전
  - Update frequency
  
방법:
  1. Self-cert (모든 evidence 생성)
  2. Commercial fork (CertiFlight·SafeRTOS)
  3. Re-implement (subset만)
  4. Output verification approach
```

NASA cFS — *재사용 의도* 설계. F-Prime 유사.

## NASA cFS — SOI 재사용 사례

```text
NASA cFS:
  NASA Goddard 공개
  Used in:
    LADEE (lunar mission)
    OSIRIS-REx
    Cygnus (cargo)
    Lunar Gateway
  
인증 status:
  NASA NPR 7150.2 Class B/A 수준
  FAA DO-178C *not direct certified*
  → DAL 인증 필요 시 *re-cert*
  
구조:
  - cFE (Core Flight Executive) — kernel-like
  - Apps (CFDP·Telemetry·Command·Health)
  - Tables (config data)
  - 50+ apps available

재사용 효율:
  Architecture 재사용 ↑
  Code 재사용 부분적 (인증 시 re-verify)
```

cFS = NASA *재사용 표준*. DO-178C는 별도.

## PDS — Previously Developed Software

```text
PDS 시나리오:
  Project A — Level B 인증
  Project B (다른 LRU) — 같은 모듈 재사용 — Level A 필요
  
필요:
  1. Gap analysis (Level B → A)
     - Statement coverage 100% — 이미
     - Decision coverage — 이미
     - MC/DC coverage — 추가 test
     - Object coverage — 추가
  
  2. Re-verification of changes
  
  3. New trace matrix
  
  4. New PSAC

비용:
  Full re-cert 대비 30~50% 절감
```

PDS — *역사 있는 모듈*. 인증 frame upgrade.

## Modified Reusable Component

```text
가장 일반적 — *기존 + modify*:

예:
  Open source FreeRTOS
  + 자체 task scheduler tweak
  + new IPC mechanism
  
DO-178C 처리:
  Modified part — full DO-178C
  Unmodified part — re-verify (interface 영향 분석)
  
산출물:
  - Impact analysis
  - Modified requirement·design·code
  - Modified test
  - Regression test (full or selected)
```

*Impact analysis* — *어디까지 영향 미치는가* 핵심.

## Reusable Approach — Architecture Trick

```text
Strategy:
  ARINC-653 partition으로 분리:
    Partition A — Level A (control)
    Partition B — Level C (data logging)
    Partition C — Level D (UI·debug)
  
  Level C·D는 *Level A 부담 없음*
  
재사용:
  Level C·D partition — open source RTOS·library 자유
  Level A partition — 인증 RSC

비용:
  Mixed-DAL = 비용 ↓
  설계 복잡 ↑ (partition 통신)
```

ARINC-653 + partition — *재사용 + 비용 최적화*. F-35·787 사례.

## SafeRTOS — FreeRTOS 인증 Fork

```text
SafeRTOS (WITTENSTEIN high integrity systems):
  FreeRTOS의 인증 version
  
인증:
  - DO-178C Level B (full)
  - DO-178C Level A (subset)
  - IEC 61508 SIL3
  - ISO 26262 ASIL D
  - IEC 62304 (medical)
  
가격:
  License — 수십만~ 달러
  + customization
  
사용:
  Automotive·industrial·aerospace
  Falcon 9·Cygnus 일부
```

FreeRTOS 코어 — *동일 API*. 인증 + safety 보강.

## Tool Qualification — Reuse Synergy

```text
Tool 재사용:
  Compiler·debugger·test framework
  → Project 간 *같은 qualified tool*
  → Re-qualification 비용 절감
  
RSC + Qualified Tool:
  Tool은 한 번 qualify
  RSC도 한 번 cert
  → 새 project — gap analysis만
  
부담:
  Tool version freeze across projects
  RSC version control 엄격
```

재사용 효과 — *long-term*. 짧은 project 보단 series of projects.

## License·IP Issue

```text
Reusable SW license:

Commercial RSC (VxWorks·INTEGRITY):
  Per-product·per-unit license
  Source escrow 가능
  Modification 제한
  
Open source RSC:
  GPL — 위험 (source release 의무)
  LGPL — 보통 OK (dynamic linking)
  MIT·BSD·Apache — 자유
  
방산 IP:
  ITAR·EAR (수출 통제)
  국가 보안
  Open source 사용 시 *주의*
  
한국 — 방사청 IP 명시:
  Source 한국 측 보유
  Commercial RSC — license 별 검토
```

License — *법적·인증 둘 다 영향*.

## Korean Reusable SW

```text
한국 우주·방산:
  KARI:
    Mission별 자체 개발 위주
    NASA cFS 도입 검토
    KSLV-II — 자체 RTOS·flight SW
  
한화에어로스페이스·LIG:
  Commercial RTOS (VxWorks·INTEGRITY) 일부
  자체 framework
  방산 IP 보안 우선
  
방사청 SW 신뢰성시험:
  - 재사용 SW 명시
  - 한국 측 IP·source 권리
  - 자체 verification 수행
```

한국 — *자체 개발 위주*. 국제 RSC 검토 진행.

## 자주 하는 실수

> ⚠️ "이미 검증되었다" — re-cert 무시

```text
"FreeRTOS 동작 입증 — 그대로 사용"
→ DO-178C evidence 없음
→ Audit fail
```

→ Self-cert 또는 *qualified fork*.

> ⚠️ Modify 영향 분석 누락

```text
RTOS 일부 modify
→ "modify 부분만 test"
→ 영향 받는 다른 part 미검증
```

→ *Impact analysis + regression*.

> ⚠️ Mixed-DAL without partition

```text
Open source library + safety-critical code 같은 partition
→ Open source 부분도 Level A 부담
```

→ ARINC-653 *partition 분리*.

> ⚠️ License·IP 무시

```text
Commercial RTOS — 정부 보안 SW에 사용
→ Source escrow 부재
→ 향후 vendor 문제 시 lock-in
```

→ License + escrow + IP review.

## 정리

- DO-178C §12 — *Reusable Software guidance*.
- RSC — *self-contained certification package*.
- COTS RTOS — VxWorks·INTEGRITY·LynxOS·PikeOS·SafeRTOS.
- SOI — open source, *self-cert 또는 commercial fork*.
- PDS — gap analysis로 *DAL upgrade*.
- ARINC-653 — mixed-DAL *재사용 + 비용 최적화*.
- 한국 — *자체 개발 + 일부 commercial RSC*.

다음 편은 **Model-Based Development (DO-331)**.

## 관련 항목

- [Ch 9: Tool Qualification](/blog/embedded/avionics/developing-safety-critical/chapter09-tool-qualification)
- [Ch 11: Model-Based Development](/blog/embedded/avionics/developing-safety-critical/chapter11-mbd)
- [Practical RTOS — FreeRTOS](/blog/embedded/rtos/practical-internals/part5-01-freertos-source)
