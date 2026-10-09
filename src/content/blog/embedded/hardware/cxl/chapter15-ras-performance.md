---
title: "Ch 15: RAS·Performance·Compliance — 운용·검증의 마지막 단계"
slug: "embedded/hardware/cxl/chapter15-ras-performance"
date: 2026-05-16T09:15:00
description: "CXL RAS(event log·poison·CVME·viral), spec의 성능 목표, compliance 시험과 ndctl 운용 명령."
series: "CXL 4.0 Internals"
seriesOrder: 15
tags: [cxl, ras, compliance, performance, cvme]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"CXL 운용의 마지막 단계는 *RAS*(event log·poison·CVME·viral), *성능 목표*(spec §13), *compliance*(spec §14)입니다."** — RAS는 PCIe 위에 coherency·메모리용 기능을 더한 구조이고, spec은 컴포넌트별 지연 목표를 권고하며, compliance 장이 상호운용성 시험을 정의합니다. 시리즈의 마무리 장입니다.

[Ch 14](/blog/embedded/hardware/cxl/chapter14-security)에서 *보안*을 봤습니다. 마지막 장은 *RAS·Performance·Compliance*입니다.

## RAS 기능 목록

spec §12는 "CXL RAS는 PCIe 위에 쌓고, coherency와 메모리를 위한 기능을 더한다"고 시작합니다. Table 12-1의 주요 항목:

| 기능 | CXL.io | CXL.cache·CXL.mem |
|------|------|-----------|
| Link CRC·Retry | 필수 | 필수 |
| Link Retraining·Recovery | 필수 | 필수 |
| Data Poisoning | 필수 | 필수 |
| Viral | 해당 없음 | 필수 (§12.4) |
| CXL Isolation | 해당 없음 | 선택 (§12.3) |
| eDPC | 선택 | CXL.io 기능 활용. ERR_FATAL·ERR_NONFATAL로 알려 eDPC를 걸 수 있음 |

Linux 쪽 PCI error handler 흐름은 [Ch 11](/blog/embedded/hardware/cxl/chapter11-linux-driver)의 `cxl_error_detected()`에서 봤습니다.

## Event Log

메모리 디바이스는 이벤트를 심각도별 log에 쌓고, host는 *Get Event Records*(opcode 0100h)로 읽습니다. Linux의 구분(`drivers/cxl/cxlmem.h`):

| Log | 커널 상수 |
|------|------|
| Informational | `CXL_EVENT_TYPE_INFO` |
| Warning | `CXL_EVENT_TYPE_WARN` |
| Failure | `CXL_EVENT_TYPE_FAIL` |
| Fatal | `CXL_EVENT_TYPE_FATAL` |

커널은 레코드를 trace event로 내보냅니다. `drivers/cxl/core/trace.h`에 `cxl_general_media`, `cxl_dram`, `cxl_memory_module`, `cxl_memory_sparing`, `cxl_poison`, `cxl_aer_correctable_error`, `cxl_aer_uncorrectable_error` 등이 있습니다. `cxl monitor`가 이 trace event를 JSON으로 보여 줍니다.

## Poison

### Poison List

*Get Poison List*(opcode 4300h)는 디바이스가 아는 poison 주소 목록을 돌려줍니다. 커널 정의(`drivers/cxl/cxlmem.h`)로 본 레코드:

| 항목 | 내용 |
|------|------|
| 길이 단위 | 64 B |
| Source | Unknown, External, Internal, Injected, Vendor Specific |
| 커널 상한 | 한 번에 1024개 (`CXL_POISON_LIST_MAX`) |

시험용으로 poison을 넣고 지우는 명령도 있고, ndctl의 `cxl inject-media-poison`·`cxl clear-media-poison`이 이를 씁니다.

### Late Poison

Late Poison은 *링크 계층*의 기능입니다(§4.3.6.3). 데이터 메시지의 헤더를 이미 보낸 뒤에 오류를 알게 되면, Poison 하위 타입의 Error Control 메시지로 *아직 보내는 중인 데이터 메시지*에 poison을 표시합니다. 최대 8개의 활성 메시지 중 하나를 offset으로 지정합니다. 수신 측이 데이터를 다 받기 전에 전달하는 구현이면, 이미 넘어간 데이터는 보장 밖이고 표시 이후의 데이터에만 poison이 적용됩니다.

## CVME — Corrected Volatile Memory Error

*CVME*는 *휘발성 메모리에서 정정된 오류*입니다(spec Table 1-1 용어). 3.1에는 *Advanced Programmable CVME Threshold* 기능이 있어, 카운터가 임계값을 넘으면 디바이스가 이벤트 레코드를 만듭니다.

| 카운터 단위 (3.1) | 내용 |
|------|------|
| Full HDM Range | 디바이스 HDM 전체에 카운터 하나. 모든 메모리 디바이스가 지원(Set Alert Configuration) |
| Per Memory Media FRU | 예: DIMM마다 카운터 |
| Per Rank | rank마다 카운터 |

CXL 4.0 웨비나는 메모리 RAS 개선으로 *CVME granularity 제어*와 *Patrol Scrub cycle 이벤트 생성*을 꼽습니다. PPR 쪽 변화는 [Ch 5](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)에서 다뤘습니다.

ndctl의 `cxl list -H` 출력에는 `ext_corrected_volatile`(정상·경고 상태)와 `volatile_errors` 같은 health 필드가 있습니다.

## Performance Considerations (spec §13)

spec 13장은 성능 속성과 권고 지연 목표를 둡니다. 3.1 기준 x16 링크:

| 링크 | 총 대역폭 |
|------|------|
| 16 GT/s | 32 GB/s |
| 32 GT/s | 64 GB/s |
| 64 GT/s | 128 GB/s |

실제 대역폭은 프로토콜과 payload 크기에 달려 있고, spec은 CXL.cache·CXL.mem에서 60~90% 효율을 예상합니다.

권고 지연 목표(Table 13-2). 아무 일도 없는 시스템에서 컴포넌트 핀 기준으로 잰 평균이고, x16·64 GT/s·IDE 끔이 전제입니다.

| 컴포넌트 | 받는 메시지 → 보내는 메시지 | 목표 |
|------|------|------|
| Type 1·2 (CXL.cache) | H2D Snoop (miss) → D2H Snoop Response | 90~150 ns |
| Type 1·2 (CXL.cache) | H2D WritePull → D2H Data | 65 ns |
| Type 3 DDR (CXL.mem) | M2S MemRd → S2M DRS MemData | 80 ns |
| Type 3 DDR (CXL.mem) | M2S MemWr → S2M NDR Cmp | 40 ns |
| Host | S2M BISnp → M2S BIRsp | 90 ns |

Type 3 목표는 DDR DIMM에 견줄 만한 단순·소형·저전력 디바이스를 상정한 값입니다. 느린 미디어나 pooled·multi-port 디바이스는 더 깁니다. 실제 디바이스 측정은 [Embedded Performance Engineering Ch 54](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)와 [Ch 8](/blog/embedded/hardware/cxl/chapter08-cxl-mem)의 MICRO 2023 결과를 보세요.

spec은 이와 함께 디바이스가 CDAT로 지연·대역폭을 보고하고, *QoS Telemetry*(§3.3.4)로 host가 요청 속도를 조절할 수 있다고 설명합니다.

## CHMU — Hot-Page Monitoring Unit (CXL 3.2)

CXL 3.2 발표문은 *메모리 tiering을 위한 CXL Hot-Page Monitoring Unit(CHMU)*을 새 기능으로 꼽습니다. 어떤 페이지가 자주 쓰이는지를 디바이스가 세어 OS의 tiering 결정에 쓰게 하는 장치입니다.

v7.3-rc6 mainline 커널(`drivers/cxl`, `drivers/perf`)과 QEMU master에는 아직 CHMU 코드가 없습니다.

이 측정은 [HBM Ch 8](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)에서 본 hot/warm/cold 티어링을 *추정이 아니라 측정*으로 돌리는 토대가 됩니다.

## Compliance Testing (spec §14)

spec 14장의 시험 영역(3.1):

| 절 | 영역 |
|------|------|
| §14.3 | CXL.io·CXL.cache 애플리케이션·트랜잭션 계층 |
| §14.4 | Link Layer |
| §14.5 | ARB/MUX |
| §14.6 | Physical Layer |
| §14.7 | Switch |
| §14.8 | Configuration Register |

시험용 DOE 객체 타입으로 *Compliance*(type 0)가 있습니다([Ch 6](/blog/embedded/hardware/cxl/chapter06-cxl-io)). 컨소시엄 웨비나(2025-12)에 따르면 2023년 4월 이후 compliance 이벤트가 9회 열렸고, Integrators List에는 CXL 1.1 디바이스 30개, CXL 2.0 디바이스 30개가 올라 있습니다.

## 실 운용 — ndctl 명령

```bash
# health 정보
$ cxl list -m mem0 -H

# poison 목록 (media error)
$ cxl list -m mem0 -L

# 커널 CXL trace event를 JSON으로
$ cxl monitor

# correctable AER 빈도를 1분마다
$ bpftrace -e '
  tracepoint:cxl:cxl_aer_correctable_error { @[probe] = count(); }
  interval:s:60 { print(@); clear(@); }
'
```

`cxl list -H`의 필드 예시는 ndctl `cxl-list` 문서에 있습니다: `life_used_percent`, `temperature`, `dirty_shutdowns`, `volatile_errors`, `pmem_errors`, `ext_life_used`, `ext_temperature`, `ext_corrected_volatile` 등. `-L`(`--media-errors`)은 libtracefs를 켜고 빌드한 ndctl에서만 됩니다.

## 오래 지켜볼 지표

| 지표 | 출처 |
|------|------|
| poison 개수 추이 | `cxl list -L` |
| `life_used_percent` | `cxl list -H` |
| `dirty_shutdowns` | `cxl list -H` |
| `temperature` | `cxl list -H` |
| CVME 경고 상태·`volatile_errors` | `cxl list -H`, DRAM·General Media event |

## 자주 하는 실수

### "Late Poison은 지연 통보 모드"

*아닙니다*. 링크 계층에서, 헤더를 이미 보낸 데이터 메시지에 나중에 poison을 붙이는 메커니즘입니다(§4.3.6.3). 3.1 spec에 이미 있습니다.

### "CVME는 CXL Virtual Memory Errors"

*Corrected Volatile Memory Error*입니다.

### "`cxl health`로 상태를 본다"

ndctl에 `cxl health` 명령은 없습니다. `cxl list -H`입니다.

### "spec 지연 목표 = 실제 디바이스 지연"

Table 13-2는 *권고 목표*이고, 측정 조건(idle, 핀 기준, IDE 끔)이 붙어 있습니다. 실 디바이스는 측정으로 확인합니다.

## 정리

- CXL RAS는 PCIe 위에 *Viral(필수)·Isolation(선택)·Data Poisoning* 등을 더합니다.
- 이벤트는 Informational·Warning·Failure·Fatal log에 쌓이고, Linux는 trace event로 내보냅니다.
- *Poison List*는 64 B 단위, source 다섯 종. *Late Poison*은 링크 계층 기능.
- *CVME*(Corrected Volatile Memory Error) 임계값은 3.1에서 HDM 전체·FRU·rank 단위.
- spec §13: x16 64 GT/s 128 GB/s, 효율 60~90%, Type 3 MemRd 80 ns 등 권고 목표.
- *CHMU*(3.2)는 hot page 측정용. mainline 커널·QEMU 구현은 아직 없음.
- 운용 명령은 `cxl list -H`·`cxl list -L`·`cxl monitor`.

## 시리즈 마무리 — 15편 회고

본 시리즈는 *CXL 4.0의 핵심 동작과 구현*을 *15편*으로 풀었습니다.

| Part | Ch | 주제 |
|------|-----|------|
| 개념·아키텍처 | 1-5 | CXL의 자리·진화, Type 분류, 일관성, fabric, 4.0 새 기능 |
| 프로토콜 | 6-10 | CXL.io·CXL.cache·CXL.mem·Flit·ARB/MUX |
| 구현·운용 | 11-15 | Linux 드라이버·QEMU·Switch·Security·RAS/Performance |

*공개 자료 (CXL Consortium spec·발표문·웨비나, Linux GPL, QEMU GPL, 측정 논문)*를 1차 자료로 사용했습니다.

다음 단계의 *CXL 깊이 학습*은 *기존 다른 시리즈*에 *분산 추가*된 챕터들이 받습니다:

- [HBM·GDDR 심화 Ch 9~12](/blog/embedded/hardware/hbm/chapter09-cxl-mem) — 메모리 산업 관점
- [Embedded Performance Engineering Ch 54~56](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency) — 성능 측정·튜닝
- [Embedded Security Ch 11~13](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide) — 보안 깊이
- [Modern Embedded Recipes Ch 149~151](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl) — 임베디드·implementation
- [Bootloader Internals Ch 34~36](/blog/embedded/bootloader/chapter34-pcie-enumeration) — 부팅·UEFI
- 4개 디버깅 시리즈의 CXL 추가 챕터들

## 관련 항목

- [Ch 1: CXL의 자리와 진화](/blog/embedded/hardware/cxl/chapter01-cxl-position) — 시리즈 시작
- [Embedded Performance Engineering Ch 54: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
- [Memory Diagnostics Ch 6: CXL 메모리 진단](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)
- [Embedded Debugging Ch 9: CXL 디바이스 트러블슈팅](/blog/tools/debugging/embedded/chapter09-cxl-device-troubleshoot)
- [Postmortem Debugging Ch 5: CXL 디바이스 Core Dump 분석](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)

## 시리즈 자료 출처 안내

이 글은 CXL 3.1 spec(§4.3.6.3, §12~14), CXL 3.2 발표문, CXL 4.0 웨비나, ndctl 문서, Linux v7.3-rc6 `drivers/cxl/` 소스, Sun et al. MICRO 2023을 근거로 합니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.

> CXL® and Compute Express Link® are trademarks of the Compute Express Link Consortium, Inc.
> spec 인용은 Compute Express Link Consortium, Inc.의 저작권을 따릅니다.
