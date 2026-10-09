---
title: "Ch 5: CXL 4.0의 핵심 새 기능 — 128 GT/s·Bundled Port"
slug: "embedded/hardware/cxl/chapter05-cxl-4-features"
date: 2026-05-16T09:05:00
description: "PCIe 7.0 기반 128 GT/s, Bundled Port·Streamlined Port의 동기와 효과."
series: "CXL 4.0 Internals"
seriesOrder: 5
tags: [cxl-4, pcie-7, bundled-port, streamlined-port, ppr]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"CXL 4.0은 *PCIe 7.0의 128 GT/s*로 *대역폭을 두 배*로 늘리고, *Bundled Port*로 *가속기 디바이스의 port를 묶어* 대역폭을 더 늘린 세대입니다."** — *256B flit 형식과 3.x 프로토콜*은 그대로 두고, *native x2 width*, *retimer 최대 4개*, *memory RAS 강화*를 더했습니다. 컨소시엄은 대역폭을 두 배로 하면서 *지연을 더하지 않았다*고 밝혔습니다.

[Ch 4](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)에서 *CXL 2.0~3.x의 fabric 진화*를 봤습니다. 이 장은 CXL 4.0 발표문(2025년 11월 18일)과 컨소시엄의 4.0 소개 웨비나(2025년 12월)를 기준으로 4.0의 변경을 정리합니다.

## 4.0의 변경

| 영역 | 주요 변경 |
|------|----------|
| 물리 계층 | *128 GT/s* (PCIe 7.0), *native x2 width*, *retimer 최대 4개* |
| 토폴로지 | *Bundled Port* (표준 port + Streamlined Port) |
| Memory RAS | 부팅 시 *Host-initiated PPR*, boot·deferred *memory sparing*, *patrol scrub* event·granularity |
| 호환성 | 256B flit 유지, CXL 3.x·2.0·1.1·1.0과 하위 호환 |

## 128 GT/s — PCIe 7.0 PHY

| 세대 | 데이터 속도 |
|------|-----------|
| CXL 1.1·2.0 | 32 GT/s |
| CXL 3.x | 64 GT/s |
| **CXL 4.0** | **128 GT/s** (PCIe 7.0) |

속도가 두 배가 되면서 x16 link의 원시 전송률(한 방향)도 *128 GB/s에서 256 GB/s*로 두 배가 됩니다. 컨소시엄 발표는 이 두 배의 대역폭을 *지연 추가 없이(zero added latency)* 얻었다고 설명합니다.

### Flit 형식은 그대로

4.0은 *3.x에서 도입한 256B flit 형식과 프로토콜 기능*을 그대로 유지합니다. 그래서 *CXL 3.x·2.0·1.1·1.0과 완전한 하위 호환*을 유지합니다. 자세한 flit 구조는 [Ch 9 Flit Format](/blog/embedded/hardware/cxl/chapter09-flit-format)에서 봅니다.

### Native x2 Width

CXL 3.1 규격까지 x2와 x1은 *degraded mode*에서만 쓰는 폭이었습니다. 4.0은 *x2를 native width*로 정의했습니다. 컨소시엄은 그 목적을 *플랫폼의 fan-out을 늘리기 위해서*라고 설명합니다.

| Lane 구성 | 원시 전송률 (128 GT/s, 한 방향) |
|----------|----------------------|
| x1 | 16 GB/s |
| x2 | 32 GB/s |
| x4 | 64 GB/s |
| x8 | 128 GB/s |
| x16 | 256 GB/s |

### Retimer 최대 4개

*Retimer*는 링크 중간에서 신호를 받아 다시 만들어 보내는 component로, 링크를 길게 늘이는 데 씁니다. 4.0은 *retimer를 최대 4개*까지 지원해 *channel reach를 늘렸습니다*.

## Bundled Port — 가속기 port 묶기

4.0의 가장 눈에 띄는 기능입니다. *가속기 디바이스*(Type 1·2와 가속기형 Type 3)의 *여러 CXL port를 논리적으로 묶어* 대역폭을 늘립니다. 컨소시엄은 *이종 워크로드가 요구하는 대역폭*을 그 동기로 듭니다.

| 항목 | 내용 (4.0 웨비나) |
|------|------------------|
| 구성 | 디바이스마다 묶음 하나 이상. 묶음마다 *표준(full-capability) port 하나 이상* + *Streamlined Port* 여러 개 |
| 각 port | *SLD-B(Single Logical Device)*를 노출. 묶음의 HDM 용량은 각 SLD-B의 합 |
| 기존 소프트웨어 | 각 port를 *따로* enumerate하고 관리할 수 있음 |
| 묶음 활용 | port 간 트래픽 interleave 같은 기능에는 *새 소프트웨어*가 필요 |
| Device ID | 묶음을 모르는 드라이버가 잡지 않도록 보통 *다른 Device ID*를 씀 |
| IOMMU | 묶음을 아는 소프트웨어가 모든 port가 같은 메모리 view를 갖도록 IOMMU를 구성 |
| 공통 제어 | CXL Reset·cache disable은 SLD-B 하나에 구현되어 묶음 전체에 적용. TSP·IDE 제어도 한 port로 모음 |
| 개별 동작 | 전원 관리·reset 관점에서는 각 port가 독립. 각 port가 CDAT를 따로 돌려줌 |

### Streamlined Port

*Streamlined Port*는 Bundled Port 안에서 *데이터 대역폭을 늘리려고 면적·전력을 줄인* port입니다. *256B flit 모드만* 쓰고, UIO에 최적화돼 있습니다(UIO가 아닌 VC0 트래픽 성능은 떨어질 수 있음).

## Memory RAS 강화

### Host-initiated PPR — 부팅 시 Repair

*PPR(Post Package Repair)*은 DRAM의 불량 row를 spare row로 대체하는 maintenance입니다. CXL 3.1에도 이미 host가 내리는 *Perform Maintenance* 명령(sPPR·hPPR)이 있습니다. 4.0은 여기에 *reset을 넘어 유지되는 설정 bit*로 *부팅 시* device가 PPR을 수행하게 하는 메커니즘을 더했습니다.

### Memory Sparing — Boot 또는 Deferred

*Memory sparing*은 fault가 난 영역을 spare 영역으로 대체하는 maintenance입니다. 4.0은 *device boot 시 sparing*과 *다음 boot로 미루는(deferred) sparing*을 정의해, device가 시작하는 sparing과 host가 미루는 sparing을 모두 지원합니다.

### Patrol Scrub과 CVME

*CVME(Corrected Volatile Memory Error)*는 휘발성 메모리에서 정정된 오류입니다. 4.0은 *patrol scrub cycle*에 대한 *granularity control과 event 생성*을 더해, general media event record에 오류 카운트 조건을 채울 수 있게 했습니다.

## 4.0이 *안 한* 것

| 영역 | 4.0에서 |
|------|-------------|
| Flit 형식 | 3.x의 256B flit 유지 |
| 프로토콜 기능 | 3.x에서 도입한 기능 유지 |
| 호환성 | 3.x·2.0·1.1·1.0과 하위 호환 |

## 자주 하는 실수

### "128 GT/s로 바뀌면서 지연도 늘었다"

컨소시엄 발표는 *지연 추가 없이* 대역폭을 두 배로 했다고 밝혔습니다. 다만 load 한 번의 지연은 PHY 속도보다 *경로와 컨트롤러*가 좌우합니다.

### "Bundled Port를 꽂으면 host가 알아서 한 device로 쓴다"

기존 소프트웨어는 port를 *각각* 봅니다. port 간 트래픽 분산 같은 묶음의 이점은 *Bundled Port를 아는 소프트웨어*가 있어야 얻습니다.

### "Streamlined Port는 Bundled Port의 간소화 모드다"

Streamlined Port는 Bundled Port *안에 들어가는 port 종류*입니다. 묶음에는 표준 port가 하나 이상 있어야 하고, Streamlined Port는 데이터 대역폭을 늘리는 역할을 합니다.

### "Host-initiated PPR은 4.0에서 처음 생겼다"

host가 PPR을 요청하는 *Perform Maintenance(sPPR·hPPR)*는 3.1에도 있습니다. 4.0이 더한 것은 *부팅 시 PPR*을 위한 지속 설정 bit입니다.

## 정리

- CXL 4.0은 *PCIe 7.0의 128 GT/s*로 대역폭을 두 배로 늘렸고, 컨소시엄은 *지연 추가 없음*을 밝혔습니다.
- *native x2 width*로 fan-out을, *retimer 최대 4개*로 channel reach를 늘렸습니다.
- *Bundled Port*는 가속기 디바이스의 port를 묶어 대역폭을 늘리고, *Streamlined Port*는 그 안의 면적·전력 최적화 port입니다.
- *부팅 시 PPR*, *boot·deferred sparing*, *patrol scrub event*로 memory RAS를 강화했습니다.
- *256B flit과 3.x 프로토콜*은 그대로라 이전 버전과 하위 호환입니다.

## 다음 편

[Ch 6: CXL.io — PCIe와의 차이·DOE·DVSEC](/blog/embedded/hardware/cxl/chapter06-cxl-io)에서 *CXL.io 프로토콜의 PCIe 호환성*과 *CXL 고유 확장*(DVSEC·DOE)을 본격적으로 분해합니다.

## 관련 항목

- [Ch 1: CXL의 자리와 진화](/blog/embedded/hardware/cxl/chapter01-cxl-position)
- [Ch 2: System Architecture](/blog/embedded/hardware/cxl/chapter02-system-architecture)
- [Ch 9: Flit Format](/blog/embedded/hardware/cxl/chapter09-flit-format)
- [Ch 15: RAS·Performance·Compliance](/blog/embedded/hardware/cxl/chapter15-ras-performance)

## 시리즈 자료 출처 안내

이 글은 CXL 4.0 발표문(2025-11-18)·웨비나(2025-12-03), CXL 3.1·1.1 spec를 근거로 합니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
