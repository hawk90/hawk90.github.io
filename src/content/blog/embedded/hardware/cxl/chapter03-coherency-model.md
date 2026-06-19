---
title: "Ch 3: 메모리 일관성 모델 — HDM-DB·HDM-D·Bias·BISnp"
date: 2026-05-16T09:03:00
description: "Host-managed Device Memory 두 종류와 일관성 메커니즘."
series: "CXL 4.0 Internals"
seriesOrder: 3
tags: [cxl, coherency, hdm-db, hdm-d, bias, bisnp]
draft: false
---

## 한 줄 요약

> **"Type 2 가속기의 *device memory*는 *host와 device 양쪽이 캐시*할 수 있어 일관성 메커니즘이 필요합니다."** — CXL은 *두 가지 모델*을 정의합니다. *HDM-D는 Bias 전환*으로 *snoop 오버헤드를 회피*하고, *HDM-DB는 Back-Invalidation Snoop*으로 *device가 host cache를 명시적 무효화*합니다. Bias가 *경량 위주*라면 BISnp는 *정확성 위주*입니다.

[Ch 2](/blog/embedded/hardware/cxl/chapter02-system-architecture)에서 *Type 2 가속기가 양방향 cache coherent*하다는 걸 봤습니다. 이 장은 *그 일관성이 어떻게 유지되는지*를 분해합니다. 핵심은 *HDM (Host-managed Device Memory)*의 두 가지 변형입니다.

## HDM이란

*HDM (Host-managed Device Memory)*은 *디바이스의 메모리를 host의 system physical address (SPA) 공간에 매핑*한 영역입니다. host CPU의 *load·store instruction*이 *직접 device 메모리에 도달*합니다.

| 항목 | 의미 |
|------|------|
| Mapping | HDM Decoder가 SPA → device physical address (DPA) 변환 |
| Visibility | host의 모든 코어가 같은 SPA로 접근 |
| Caching | host CPU cache (L1·L2·L3)에 *normal load/store처럼* 캐시됨 |

Type 3 메모리 expander의 *모든 메모리*가 HDM입니다. Type 2 가속기는 *attached 메모리의 일부 또는 전부*를 HDM으로 노출합니다.

## HDM-D vs HDM-DB

CXL은 *HDM을 두 가지 변형*으로 정의합니다.

| 변형 | 의미 | 일관성 메커니즘 | 주 사용처 |
|------|------|---------------|----------|
| **HDM-D** (Device-owned) | device가 *주된 사용자*. host는 *occasional access* | Bias 모드 전환 | Type 2 가속기의 *compute working set* |
| **HDM-DB** (Device-Backed) | host와 device가 *대등하게 접근* | BISnp (Back-Invalidation Snoop) | Type 2의 *shared data*, Type 3의 *주된 영역* |

HDM-D는 *single-owner 가정*. HDM-DB는 *multi-owner 가정*. 이 두 패턴에 *서로 다른 메커니즘*을 적용하는 게 CXL의 *효율성 비결*입니다.

## HDM-D — Bias 기반 일관성

HDM-D 영역은 *Bias 모드*가 *Host Bias 또는 Device Bias 중 하나*에 있습니다.

| Bias | 의미 | 적용 |
|------|------|------|
| **Host Bias** | host가 *주로 사용*. device 측은 *접근 시 snoop* 발생 | 데이터 로딩 단계 |
| **Device Bias** | device가 *주로 사용*. host는 *접근 시 snoop* 발생 | GPU compute 단계 |

*Bias 전환*은 *software가 trigger*합니다. LLM inference 시나리오에서:

| Phase | Bias | 트래픽 |
|-------|------|--------|
| 1. Weight loading | Host Bias | host → device 대량 (M2S RwD) |
| 2. GPU compute | Device Bias로 전환 | snoop 없음 (device 내부 local) |
| 3. Output 회수 | Host Bias로 다시 전환 | device → host (S2M DRS) |

*Bias 전환 자체*는 *수 µs*가 들지만, *적절한 bias 동안의 access는 snoop 없이 빠릅니다*. *큰 phase가 바뀔 때*만 전환하는 게 권장.

## HDM-DB — BISnp 기반 일관성

HDM-DB는 *Back-Invalidation Snoop (BISnp)* 메커니즘을 씁니다. CXL 3.0부터 추가됐습니다.

핵심 아이디어:

- *Device가 host의 cache를 명시적으로 무효화*하는 메시지를 보낼 수 있음
- *Host cache의 stale 데이터*가 *device update를 못 본 채 사용*되는 것을 방지

BISnp 시나리오 (Device-Bias HDM-DB 영역에 host가 접근):

| 단계 | 동작 |
|------|------|
| 1 | CPU가 cache line X 접근 |
| 2 | Host → Device: *M2S Req* MemRd, addr=X |
| 3 | Device → Host: *S2M BISnp* (host의 cache line X 무효화 요청) |
| 4 | Host → Device: invalidate 확인 응답 |
| 5 | Device가 자기 캐시에서 fresh data 준비 |
| 6 | Device → Host: *S2M DRS* MemData, addr=X |

*BISnp가 필요한 이유*는 *device가 자기 캐시를 update*했을 때 *host의 stale 캐시*를 *무효화*해야 *데이터 무결성이 유지*되기 때문입니다.

## Bias vs BISnp — 언제 어느 쪽?

| 기준 | Bias 기반 (HDM-D) | BISnp 기반 (HDM-DB) |
|------|-------------------|-------------------|
| Owner 가정 | single (device 또는 host) | multi |
| Snoop 횟수 | 낮음 (적절한 bias 동안) | 매 access마다 가능 |
| Trigger | software (bias 전환) | hardware (BISnp 자동) |
| Phase 명확 | 워크로드 phase 명확할 때 | phase 불분명·혼재할 때 |
| Latency | bias 동안 best (snoop 없음) | BISnp 발생 시 추가 latency |
| 적합 워크로드 | GPU compute·batch ML | shared cache·DB·real-time |

LLM training 같은 *명확한 weight/compute/output phase*는 HDM-D가 효율적. *shared in-memory database* 같은 *동시 다중 owner*는 HDM-DB가 필요.

## Snoop Filter — Device 측 최적화

BISnp가 *모든 cache line마다 발생*하면 부담이 큽니다. Device는 *snoop filter*로 *host가 어떤 cache line을 hold*하고 있는지 추적해 *불필요한 BISnp 회피*합니다.

| 메커니즘 | 역할 |
|---------|------|
| Snoop Filter | host cache의 line 보유 상태 추적 |
| Inclusive / Exclusive | filter가 host cache의 superset이면 inclusive |
| Miss 처리 | filter miss = "host가 hold 안 함" = BISnp 안 보냄 |

snoop filter의 크기·hit rate가 *Type 2 디바이스 설계의 핵심 파라미터*. 너무 작으면 *false snoop*이 늘고, 너무 크면 *die area 낭비*.

## Linux 측 — `cxl-cli`에서의 노출

CXL 디바이스가 *HDM-DB·HDM-D 중 어느 변형을 지원*하는지는 *capability 표시*로 노출됩니다.

```bash
$ cxl list -m mem0 -i
{
  "memdev":"mem0",
  "ram_size":274877906944,
  "capabilities": {
    "hdm_dynamic_capacity": true,
    "hdm_dc_back_invalidation": true,   # BISnp 지원 (HDM-DB)
    "hdm_dc_bias_mode": false           # Bias 미지원 (Type 3는 보통)
  }
}
```

*Type 3 memory expander*는 보통 *BISnp만 또는 별도 일관성 메커니즘 없음* (host 단독 caching). *Type 2 가속기*가 *Bias 또는 BISnp 또는 둘 다*를 노출합니다.

## 자주 하는 실수

### "BISnp가 Bias보다 항상 좋다"

*아닙니다*. BISnp는 *매 access마다 동적 invalidation 가능성*이라 *워크로드 phase가 명확*하면 *Bias의 snoop-free access*가 *훨씬 빠릅니다*. *워크로드 패턴 분석*이 우선.

### "Bias 전환은 단순한 flag"

*OS·driver·application 협조*가 필요합니다. CUDA·ROCm·oneAPI의 *고수준 API*가 *bias hint*를 *드라이버에 전달*하고, 드라이버가 *device로 전환 명령*을 보냅니다. *단일 instruction*이 아님.

### "HDM-DB는 host가 어디든 빠르게 접근 가능"

*아닙니다*. BISnp 메커니즘은 *동작은 정확*하지만 *지연 페널티가 있음*. *cache line ping-pong* (host·device가 같은 line 번갈아 update)이 발생하면 *throughput이 무너집니다*.

### "Snoop filter가 크면 무조건 좋다"

*die area·power* 비용이 큼. *filter hit rate*와 *false snoop 빈도*의 *균형점*이 *워크로드 의존*. 일반화된 best size 없음.

### "Type 3는 BISnp 신경 안 써도 됨"

*거의 그렇지만 일부 Type 3*가 *device-internal cache*를 가질 수 있고 (rare), 그 경우 *BISnp 지원*이 필요합니다. *cxl-cli capability 확인*이 권장.

## 정리

- *HDM (Host-managed Device Memory)*는 device memory를 *host SPA 공간에 매핑*한 영역입니다.
- *HDM-D*는 *device-owned* — *Bias 모드 전환*으로 *snoop 회피*. 워크로드 phase 명확할 때 효율적.
- *HDM-DB*는 *device-backed* — *BISnp*로 *device가 host cache를 명시적 무효화*. multi-owner·shared 영역에 적합.
- Bias 전환은 *software trigger*, BISnp는 *hardware-driven dynamic*.
- *Snoop filter*가 *Type 2 디바이스 설계의 핵심* — false snoop과 die area의 균형.

## 다음 편

[Ch 4: Pooling·GFAM·Fabric — Multi-host 메모리 공유](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)에서 *CXL 2.0 pooling*과 *3.0 coherent fabric*, 그리고 *GFAM (Global Fabric Attached Memory)*가 *어떻게 다중 host 메모리 공유*를 가능하게 하는지를 본격적으로 분해합니다.

## 관련 항목

- [Ch 2: System Architecture — Type 1·2·3·MLD·MH-MLD](/blog/embedded/hardware/cxl/chapter02-system-architecture)
- [Ch 8: CXL.mem — M2S·S2M·HDM Decoder](/blog/embedded/hardware/cxl/chapter08-cxl-mem) — HDM Decoder의 mapping 구조
- [HBM·GDDR 심화 Ch 10: CXL.mem 프로토콜 분해](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol) — Bias·BISnp의 message 흐름

## 시리즈 자료 출처 안내

본 글은 *CXL Consortium 공개 자료·Linux drivers/cxl/ 소스·hyperscale 연구*를 1차 자료로 합니다. CXL 4.0 Specification은 *§ navigation aid*로만 인용. 자세한 spec 인용 정책은 [Ch 1 footer](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내) 참고.
