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

규범과 목표 수치는 [CXL 3.1 §12~14](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf), 구현은 Linux v6.12와 ndctl v81을 기준으로 설명합니다. RAS 쪽은 QEMU 11.1.3의 QMP 오류 주입으로 Debian 13 arm64 게스트(커널 6.12.116)에서 실제로 돌렸고, 지연·대역폭과 compliance 시험은 하드웨어가 없어 돌리지 않았습니다. 자동차 정비로 치면 이 장은 경고등(event), 부품 결함 기록(poison), 주행 성능 기준(§13), 차량 검사(§14)를 차례로 봅니다.

## RAS 기능 목록

CXL 3.1 §12는 PCIe RAS에 coherency·메모리 기능을 더해 설명합니다. 아래는 이 판의 Table 12-1을 발췌한 것이며, 모든 CXL 세대·모드에 그대로 적용하는 표는 아닙니다.

| 기능 | CXL.io | CXL.cache·CXL.mem |
|------|------|-----------|
| Link CRC·Retry | 필수 | 필수 |
| Link Retraining·Recovery | 필수 | 필수 |
| Data Poisoning | 필수 | 필수 |
| Viral | 해당 없음 | 필수 (§12.4) |
| CXL Isolation | 해당 없음 | 선택 (§12.3) |
| eDPC | 선택 | CXL.io 기능 활용. ERR_FATAL·ERR_NONFATAL로 알려 eDPC를 걸 수 있음 |

QEMU 게스트에서 `cxl-inject-uncorrectable-errors`로 CXL.mem 데이터 ECC 오류를 넣었을 때, 기본 AER mask 상태에서는 아무 것도 보고되지 않았고, internal error mask를 `setpci`로 푼 뒤에는 `frozen state error detected, disable CXL.mem` → link reset → `restart CXL.mem after slot reset` → `device recovery successful` 순서로 복구됐습니다. 소스 경로와 로그는 [Ch 11](/blog/embedded/hardware/cxl/chapter11-linux-driver)의 `cxl_error_detected()` 절에 있습니다.

## Event Log

메모리 디바이스는 이벤트를 심각도별 log에 쌓고, host는 *Get Event Records*(opcode 0100h)로 읽습니다. Linux의 구분(`drivers/cxl/cxlmem.h`):

| Log | 커널 상수 |
|------|------|
| Informational | `CXL_EVENT_TYPE_INFO` |
| Warning | `CXL_EVENT_TYPE_WARN` |
| Failure | `CXL_EVENT_TYPE_FAIL` |
| Fatal | `CXL_EVENT_TYPE_FATAL` |

Linux v6.12는 레코드를 trace event로 내보냅니다. 이 판의 [`drivers/cxl/core/trace.h`](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/core/trace.h)에 `cxl_aer_uncorrectable_error`(51행), `cxl_aer_correctable_error`(99행), `cxl_overflow`, `cxl_generic_event`, `cxl_general_media`(316행), `cxl_dram`(424행), `cxl_memory_module`, `cxl_poison`(682행)이 있습니다. 심각도 상수는 `cxlmem.h:651`부터입니다.

QEMU의 `cxl-inject-general-media-event`(Informational log)와 `cxl-inject-dram-event`(Warning log)로 `mem0`에 이벤트를 넣었더니, Debian `cxl` 패키지가 켜 둔 `cxl-monitor.service`의 journal에 다음 JSON이 남았습니다(필드 일부를 줄였습니다).

```json
{"system":"cxl","event":"cxl_general_media","memdev":"mem0","host":"0000:0f:00.0","log":0,"hdr_flags":1,"dpa":4096,"descriptor":3,"type":0,"transaction_type":192,"channel":1,"device":5,"hpa":18446744073709551615,"rank":0,"region_name":""}
{"system":"cxl","event":"cxl_dram","memdev":"mem0","host":"0000:0f:00.0","log":1,"hdr_flags":1,"dpa":8192,"descriptor":1,"type":2,"transaction_type":192,"channel":2,"column":4,"row":3,"rank":1,"bank_group":1,"bank":2,"region_name":""}
```

`log`는 0이 Informational, 1이 Warning이고, QMP로 넣은 DPA·channel·rank·bank 값이 그대로 돌아왔습니다. `hpa`가 `18446744073709551615`(모든 비트 1)이고 `region_name`이 비어 있는 것은 이 DPA를 HPA로 바꿔 줄 commit된 region이 없기 때문입니다([Ch 8](/blog/embedded/hardware/cxl/chapter08-cxl-mem)). [Postmortem Ch 5](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)의 관찰과 같습니다.

## Poison

### Poison List

*Get Poison List*(opcode 4300h)는 디바이스가 아는 poison 주소 목록을 돌려줍니다. 커널 정의(`drivers/cxl/cxlmem.h`)로 본 레코드:

| 항목 | 내용 |
|------|------|
| 길이 단위 | 64 B |
| Source | Unknown, External, Internal, Injected, Vendor Specific |
| 커널 요청 단위 상한 | v6.12의 한 번 조회에서 최대 1024개 (`CXL_POISON_LIST_MAX`). 디바이스 전체 poison 주소 수의 상한은 아님 |

poison 목록은 두 경로로 채워 봤습니다. 하나는 QEMU가 장치 내부 오류를 흉내 내는 QMP `cxl-inject-poison`(DPA `0x1000`, 128 B)이고, 다른 하나는 커널 debugfs의 `inject_poison`입니다. 후자는 v6.12 `drivers/cxl/mem.c:86-94`가 `cxl_inject_poison()`(`core/memdev.c:279`)을 불러 장치에 Inject Poison 명령을 보내는 경로입니다.

```bash
echo 0x2000 > /sys/kernel/debug/cxl/mem0/inject_poison
cxl list -m mem0 -L -u
```

출력의 `media_errors` 항목은 줄바꿈만 정리했습니다.

```json
{
  "memdev":"mem0",
  "ram_size":"256.00 MiB (268.44 MB)",
  "serial":"0x10",
  "host":"0000:0f:00.0",
  "firmware_version":"BWFW VERSION 00",
  "media_errors":[
    { "offset":"0x2000", "length":64, "source":"Injected" },
    { "offset":"0x1000", "length":128, "source":"Internal" }
  ]
}
```

같은 동작이 `cxl_poison` trace event로도 남았습니다. `trace_type`은 `core/core.h:99-103`의 enum에서 0이 List, 1이 Inject이고, `source`는 `cxlmem.h:740-744`에서 2가 Internal, 3이 Injected입니다. debugfs 주입 직후에는 `trace_type 1`·DPA 8192 event가, 이어진 목록 조회에서는 `trace_type 0` event 두 개가 기록됐습니다. 주입 기록은 debugfs 쓰기 자체를 남기므로 진단 기록 조회와 구분됩니다.

### Late Poison

Late Poison은 *링크 계층*의 기능입니다(§4.3.6.3). 데이터 메시지의 헤더를 이미 보낸 뒤에 오류를 알게 되면, Poison 하위 타입의 Error Control 메시지로 *아직 보내는 중인 데이터 메시지*에 poison을 표시합니다. 최대 8개의 활성 메시지 중 하나를 offset으로 지정합니다. 수신 측이 데이터를 다 받기 전에 전달하는 구현이면, 이미 넘어간 데이터는 보장 밖이고 표시 이후의 데이터에만 poison이 적용됩니다.

## CVME — Corrected Volatile Memory Error

*CVME*는 *휘발성 메모리에서 정정된 오류*입니다(spec Table 1-1 용어). 3.1에는 *Advanced Programmable CVME Threshold* 기능이 있어, 카운터가 임계값을 넘으면 디바이스가 이벤트 레코드를 만듭니다.

| 카운터 단위 (3.1) | 내용 |
|------|------|
| Full HDM Range | 디바이스 HDM 전체에 카운터 하나. 모든 메모리 디바이스가 지원(Set Alert Configuration) |
| Per Memory Media FRU | 지원 flag가 있는 경우 DIMM 등 memory media FRU마다 카운터 |
| Per Rank | 지원 flag가 있는 경우 rank마다 카운터 |

[CXL 4.0 백서](https://computeexpresslink.org/wp-content/uploads/2025/11/CXL_4.0-White-Paper_FINAL.pdf)는 4.0의 메모리 RAS 개선으로 고급 CVME 보고, patrol scrub 주기의 세분화된 오류 검출과 event 생성을 꼽습니다. PPR 쪽 변화는 [Ch 5](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)에서 다뤘습니다.

ndctl v81 `cxl-list` 문서의 `--health` 예에는 `ext_corrected_volatile`(예: `"warning"`)과 `volatile_errors` 같은 health 필드가 있습니다.

## Performance Considerations (spec §13)

spec 13장은 성능 속성과 권고 지연 목표를 둡니다. 3.1 Table 13-1은 x16 링크의 "Total Bandwidth per link"를 적는데, 값은 `64 GT/s × 16 ÷ 8 = 128 GB/s`처럼 한 방향 raw rate의 산술값과 같습니다.

| 링크 | Total Bandwidth per link (Table 13-1) |
|------|------|
| 16 GT/s | 32 GB/s |
| 32 GT/s | 64 GB/s |
| 64 GT/s | 128 GB/s |

실제 대역폭은 프로토콜과 payload 크기에 달려 있고, spec의 표 각주는 CXL.cache·CXL.mem에서 60~90% 효율을 예상합니다. 이 범위는 프로토콜 효율에 관한 예상이며 측정 결과나 제품의 최소 보장치가 아닙니다.

권고 지연 목표(Table 13-2). 아무 일도 없는 시스템에서 컴포넌트 핀 기준으로 잰 평균이고, x16·64 GT/s·IDE 끔이 전제입니다.

주소는 무작위로 분산하며, 한 요청의 응답을 받은 다음 요청을 보냅니다. 따라서 CPU의 load-to-use 지연, 부하가 있을 때의 p99, switch를 포함한 전체 왕복 지연을 이 수치와 직접 비교하면 안 됩니다.

| 컴포넌트 | 받는 메시지 → 보내는 메시지 | 목표 |
|------|------|------|
| Type 1·2 (CXL.cache) | H2D Snoop (miss) → D2H Snoop Response | 90~150 ns |
| Type 1·2 (CXL.cache) | H2D WritePull → D2H Data | 65 ns |
| Type 3 DDR (CXL.mem) | M2S MemRd → S2M DRS MemData | 80 ns |
| Type 3 DDR (CXL.mem) | M2S MemWr → S2M NDR Cmp | 40 ns |
| Host | S2M BISnp → M2S BIRsp | 90 ns |

Type 3 목표는 DDR DIMM에 견줄 만한 단순·소형·저전력 DRAM 디바이스를 상정한 값입니다. WritePull은 보낼 데이터가 이미 출력 버퍼에 준비된 조건이며, Host BISnp 목표는 host가 해당 cache line을 캐시에 갖고 있지 않은 단순한 경우입니다. 느린 미디어나 pooled·multi-port 디바이스에 같은 목표를 강제할 수는 없습니다. 실제 디바이스 측정은 [Embedded Performance Engineering Ch 54](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)와 [Ch 8](/blog/embedded/hardware/cxl/chapter08-cxl-mem)의 MICRO 2023 결과를 보세요.

spec은 이와 함께 디바이스가 CDAT로 지연·대역폭을 보고하고, *QoS Telemetry*(§3.3.4)로 host가 요청 속도를 조절할 수 있다고 설명합니다.

## CHMU — Hot-Page Monitoring Unit (CXL 3.2)

CXL 3.2 발표문은 *메모리 tiering을 위한 CXL Hot-Page Monitoring Unit(CHMU)*을 새 기능으로 꼽습니다.

3.2 규격 본문은 열람하지 않았으므로 CHMU의 레지스터 구조는 다루지 않습니다. 이 시리즈의 환경에는 CHMU가 없습니다. Linux v6.12 `drivers/cxl/`과 QEMU 11.1.3의 `hw/`·`include/`에서 `chmu`를 대소문자 구분 없이 grep하면 둘 다 0건입니다. 티어별 배치의 배경은 [HBM Ch 8](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)을 참고하세요.

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

시험용 DOE 객체 타입으로 *Compliance*(type 0)가 있습니다([Ch 6](/blog/embedded/hardware/cxl/chapter06-cxl-io)). 이 시리즈의 환경에서는 compliance 시험을 돌리지 않았습니다. QEMU 11.1.3 Type 3 endpoint의 DOE가 처리하는 프로토콜은 Table Access(CDAT) 하나뿐이고(`hw/mem/cxl_type3.c:864-865`), 3.1 Table 8-3은 SLD에 Compliance DOE를 선택으로 둡니다.

## 실 운용 — ndctl 명령

아래 명령은 [ndctl v81의 `cxl-list`](https://github.com/pmem/ndctl/blob/v81/Documentation/cxl/cxl-list.txt)와 [`cxl-monitor`](https://github.com/pmem/ndctl/blob/v81/Documentation/cxl/cxl-monitor.txt) 문서에 있는 형식이고, 게스트의 `mem0`에서 모두 실행했습니다.

```bash
# health 정보
cxl list -m mem0 -H

# poison 목록 (media error)
cxl list -m mem0 -L

# 커널 CXL trace event를 JSON으로
cxl monitor
```

`-L`(`--media-errors`)과 `cxl monitor`는 위에서 본 결과를 냈습니다. `-H`는 health 필드 없이 memdev 기본 정보만 출력했습니다. libcxl debug 로그를 보면 Get Health Info 요청이 커널에서 `-ENOTTY`(-25)로 거부됐는데, QEMU 11.1.3이 이 명령을 구현하지 않아 Command Effects Log에 없기 때문입니다([Ch 11](/blog/embedded/hardware/cxl/chapter11-linux-driver)). 문서의 health 예에 있는 필드는 `life_used_percent`, `temperature`, `dirty_shutdowns`, `volatile_errors`, `pmem_errors`, `ext_life_used`, `ext_temperature`, `ext_corrected_volatile` 등입니다.

## 오류가 생긴 층부터 나누기

같은 “CXL 실패”라도 모델 구성, OS 초기화, 메모리 media와 link 오류는 증거가 다릅니다. [Ch 12의 guest 실험](/blog/embedded/hardware/cxl/chapter12-qemu-emulation#guest-linux에서-확인한-것)은 region commit이 cache 무효화 단계에서 거절된 사례이며, poison이나 PHY 오류를 주입한 결과가 아닙니다.

| 관찰 | 먼저 조사할 범위 | 확대 해석하면 안 되는 것 |
|------|------|------|
| QEMU가 잘못된 FMW 크기로 시작 실패 | 모델의 속성·정렬·topology 입력 | 실제 장치의 media 오류 |
| memdev는 있지만 commit이 실패 | sysfs 반환·kernel log·cache 무효화·decoder 구성 단계 | 즉시 불량 DRAM이나 link 장애로 확정 |
| event·poison 기록 발생 | 실제 record의 source·주소·범위·수명과 영향받는 사용자 | 로그 삭제나 reset만으로 data 복구 완료 |
| 지연·대역폭 저하 | 측정 경계·배치·traffic·queue·link와 media | 규격의 권고 목표를 제품의 보장값으로 적용 |

구성 오류를 고쳐 region이 생겼다는 사실과, 손상된 메모리에서 애플리케이션 data를 복구했다는 사실은 별도로 검증합니다. 이 구분을 유지해야 일반적인 설정 실패를 RAS 복구 실적으로 세지 않을 수 있습니다.

## 오래 지켜볼 지표

| 지표 | 출처 |
|------|------|
| poison 개수 추이 | `cxl list -L` |
| `life_used_percent` | `cxl list -H` |
| `dirty_shutdowns` | `cxl list -H` |
| `temperature` | `cxl list -H` |
| CVME 경고 상태·`volatile_errors` | `cxl list -H`, DRAM·General Media event |

QEMU 게스트의 `-H`처럼 필드가 아예 없는 경우를 오류 0개로 채우면 안 됩니다. 누적 counter는 재부팅·reset 여부와 관찰 기간을 같이 기록하고, 여러 log에서 같은 이벤트를 수집하면 중복을 구분해야 합니다. event log·trace buffer overflow가 있으면 관찰하지 못한 오류도 있으므로, “로그가 비었다”를 정상 판정으로 사용하지 않습니다. 추세를 비교할 때는 같은 디바이스 식별자·firmware·부하와 시간 구간을 유지합니다.

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

- CXL 3.1 Table 12-1은 cache·mem의 Viral 필수, Isolation 선택 등 RAS 요구를 정합니다.
- 이벤트는 Informational·Warning·Failure·Fatal log에 쌓이고, Linux는 trace event로 내보냅니다.
- *Poison List*는 64 B 단위, source 다섯 종. *Late Poison*은 링크 계층 기능.
- *CVME*(Corrected Volatile Memory Error) 임계값은 3.1에서 HDM 전체·FRU·rank 단위.
- spec §13: x16 64 GT/s 128 GB/s, 효율 60~90%, Type 3 MemRd 80 ns 등 권고 목표.
- *CHMU*(3.2)는 hot page 측정용이며, 실제 tiering에는 디바이스·OS·정책의 연동을 확인해야 합니다.
- 운용 명령은 `cxl list -H`·`cxl list -L`·`cxl monitor`.

## 시리즈 마무리 — 15편 회고

본 시리즈는 CXL 3.1의 프로토콜, 4.0의 공개된 변경 사항, Linux v6.12와 QEMU 11.1.3의 구현을 15편에서 구분해 살폈습니다. 실행은 QEMU arm64 게스트까지였고, CXL 4.0 하드웨어는 쓰지 않았습니다.

| Part | Ch | 주제 |
|------|-----|------|
| 개념·아키텍처 | 1-5 | CXL의 자리·진화, Type 분류, 일관성, fabric, 4.0 새 기능 |
| 프로토콜 | 6-10 | CXL.io·CXL.cache·CXL.mem·Flit·ARB/MUX |
| 구현·운용 | 11-15 | Linux 드라이버·QEMU·Switch·Security·RAS/Performance |

*공개 자료 (CXL Consortium spec·발표문·백서·공식 Q&A, Linux GPL 소스, QEMU GPL 소스, 측정 논문)*와 QEMU 게스트 실행 결과를 1차 자료로 사용했습니다.

다음 단계의 *CXL 깊이 학습*은 *기존 다른 시리즈*에 *분산 추가*된 챕터들이 받습니다:

- [HBM·GDDR 심화 Ch 9~12](/blog/embedded/hardware/hbm/chapter09-cxl-mem) — 메모리 산업 관점
- [Embedded Performance Engineering Ch 54~56](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency) — 성능 측정·튜닝
- [Embedded Security Ch 11~13](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide) — 보안 깊이
- [Modern Embedded Recipes: PCIe에서 CXL로](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl) — 임베디드·implementation
- [Bootloader Internals Ch 34~36](/blog/embedded/bootloader/chapter34-pcie-enumeration) — 부팅·UEFI
- 4개 디버깅 시리즈의 CXL 추가 챕터들

## 관련 항목

- [Ch 1: CXL의 자리와 진화](/blog/embedded/hardware/cxl/chapter01-cxl-position) — 시리즈 시작
- [Embedded Performance Engineering Ch 54: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
- [Memory Diagnostics Ch 6: CXL 메모리 진단](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)
- [Embedded Debugging Ch 9: CXL 디바이스 트러블슈팅](/blog/tools/debugging/embedded/chapter09-cxl-device-troubleshoot)
- [Postmortem Debugging Ch 5: CXL 디바이스 Core Dump 분석](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)

## 시리즈 자료 출처 안내

이 글은 위 CXL 3.1 spec(§4.3.6.3, §8.2.9.9.11.3, §12~14), CXL 4.0 백서, CXL 3.2 발표문, ndctl v81 문서, Linux v6.12 [`cxlmem.h`](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/cxlmem.h)·위 `trace.h`를 대조했습니다. CHMU의 발표 출처는 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내), 실제 디바이스 논문의 조건은 Ch 8을 참고하세요. RAS 출력은 QEMU 11.1.3 게스트(`cxl-monitor.service` journal, `cxl list -L`, dmesg)에서 얻었습니다.

> CXL® and Compute Express Link® are trademarks of the Compute Express Link Consortium, Inc.
> spec 인용은 Compute Express Link Consortium, Inc.의 저작권을 따릅니다.
