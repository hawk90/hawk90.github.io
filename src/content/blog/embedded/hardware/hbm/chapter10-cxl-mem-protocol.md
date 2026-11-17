---
title: "CXL.mem 프로토콜 분해 — 왕복 횟수가 만드는 지연, 링크가 만드는 대역폭"
slug: "embedded/hardware/hbm/chapter10-cxl-mem-protocol"
date: 2026-06-15T09:02:00
description: "CXL 1.1의 접근 흐름과 연구의 측정 범위를 구분하고, 동시 요청량과 interleave 배치를 계산합니다."
series: "HBM·GDDR 심화"
seriesOrder: 10
tags: [cxl, cxl-mem, hdm-decoder, cache-coherency]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"CXL.mem의 *지연은 왕복 경로*가 정하고, *대역폭은 링크 폭*이 정합니다. 이 둘이 따로 논다는 점이 CXL.mem을 *메모리 계층의 독립된 한 단*으로 만듭니다."** — 링크 세대를 올리면 대역폭은 늘지만 *load 한 번의 지연*은 링크를 오가는 경로와 컨트롤러가 정합니다. 그래서 CXL.mem은 *용량과 대역폭을 사는 tier*이지 *지연을 사는 tier*가 아닙니다.

[Ch 9](/blog/embedded/hardware/hbm/chapter09-cxl-mem)에서 *CXL.mem이 DDR과 SSD 사이에 끼는 새 tier*라는 것을 봤습니다. 이 장은 *그 tier의 지연과 대역폭이 무엇으로 정해지는지*를 메모리 계층 관점에서 정리합니다.

M2S/S2M 채널 구성, HDM Decoder 레지스터, BISnp 상태 전이, flit 포맷 같은 메시지·필드 수준의 메커니즘은 [CXL 4.0 Internals Ch 8](/blog/embedded/hardware/cxl/chapter08-cxl-mem)이 담당합니다. 여기서는 *그 메커니즘이 메모리로서의 성질에 무엇을 하는지*만 봅니다.

## 지연 예산 — load 한 번에 무엇이 붙는가

CPU의 load가 cache miss로 CXL 장치까지 진행하면, local DDR 접근에는 없던 단계가 앞뒤로 붙습니다.

| 단계 | DDR 접근과의 차이 |
|------|------------------|
| MMU 변환 | 차이 없음 |
| HDM Decoder 판정 (주소 → 어느 디바이스) | DDR의 채널 디코드에 해당 |
| 요청이 링크를 지나 디바이스로 | 신규 |
| 디바이스 측 컨트롤러 → DRAM read | 디바이스 안의 DRAM 접근 |
| 응답이 링크를 지나 host로 | 신규 |

CXL이 local DDR보다 느린 이유는 *링크를 한 번 왕복*하고 *양쪽 끝에서 프로토콜 계층과 컨트롤러를 통과*하기 때문입니다. [Sun 등의 MICRO 2023 논문 "Demystifying CXL Memory with Genuine CXL-Ready Systems and Devices"](https://tianyin.github.io/pub/cxl-mem.pdf)은 그 비용이 *CXL 컨트롤러 설계에 크게 의존한다*고 결론짓습니다. Xeon 6430 2소켓·Linux v6.2에서 Intel MLC의 pointer chasing으로 잰 load 지연이, 원격 소켓 DDR5(DDR5-R) 대비 CXL-A는 *35% 길고*, CXL-B는 *약 2배*, CXL-C는 *약 3배*였습니다.

경로에 switch가 끼면 *통과 지점*이 늘어납니다.

| 구성 | 요청·응답 경로의 통과 지점 |
|------|---------------------------|
| local DDR | 링크 없음 |
| CXL.mem (direct attached) | host ↔ 디바이스 링크를 한 번 왕복 |
| CXL.mem (switch 1단) | 왕복 경로에 switch를 양방향으로 한 번씩 더 통과 |

**switch 한 단은 "장비 하나 추가"가 아니라 "왕복 경로에 통과 지점 두 개 추가"입니다.** pooling으로 얻는 유연성의 값이 *지연으로 청구*되는 구조입니다. 위 논문 Table 1의 구성에는 switch가 없고, 인용한 다른 자료에도 switch 경유 지연 측정이 없습니다.

## 왕복 한 번으로 끝나는 것

[CXL 1.1 규격(2019년 6월)](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-1.1-Specification.pdf) §3.3의 기본 transaction입니다. M2S RwD opcode 표(Table 28)와 사용 표(Table 29)는 `MemWr`·`MemWrPtl`을 정의합니다. §3.5(Flows for Type 3 Devices)는 Type 3에서 *read에는 S2M NDR이 없고*(데이터는 S2M DRS의 `MemData`), *write는 항상 S2M NDR `Cmp`로 끝난다*고 적습니다. 아래 표는 이 Type 3 흐름입니다. Type 1·2에서는 `MemRd`에도 NDR이 함께 올 수 있습니다(Table 26). CPU store 명령 하나와 wire transaction 하나가 일대일로 대응하거나 모든 접근이 항상 같은 latency라는 뜻은 아닙니다. 캐시·write combining·ordering·snoop·backpressure가 추가로 관여합니다.

| 접근 | host → 디바이스 | 디바이스 → host |
|------|----------------|----------------|
| Read (load) | `MemRd` | `MemData` (데이터) |
| Write (store) | `MemWr` + 데이터 | `Cmp` (완료, 데이터 없음) |
| Partial write (64 B 미만) | `MemWrPtl` + 데이터 + byte enable 64개(byte당 1개) | `Cmp` |

여기서 자주 뒤집히는 직관이 하나 있습니다. Type 3 흐름에서 read와 write는 둘 다 요청 하나·응답 하나입니다. **이 사실만으로 read/write latency나 비용이 같다고 결론낼 수는 없습니다.** write는 데이터가 명령과 함께 나가고 장치 측 완료는 `Cmp`로 통지됩니다. CPU가 store 명령을 retire하는 시점·다른 agent에 보이는 시점·persistent media의 내구성 완료와 같은 의미는 아닙니다. 규격은 `MemWrPtl`을 *byte마다 enable이 하나씩, 64개*를 담은 쓰기로 정의하고, 장치 쪽 DCOH가 필요하면 *merge*한다고 적습니다. 그래서 host가 먼저 읽어 오는 *read-modify-write 왕복*이 링크에 붙지 않습니다.

## bias — 디바이스도 자기 메모리를 쓸 때

Type 2 가속기처럼 *디바이스도 자기 메모리를 캐시*하는 경우, CXL 1.1 §2.2.1은 *bias 기반 일관성 모델*을 둡니다. device-attached memory에 두 상태가 있습니다.

| 상태 | 언제 | 성질 |
|------|------|------|
| Host Bias | host가 operand를 쓰는 작업 제출 때, 완료 뒤 결과를 읽을 때 | host 접근은 high throughput. 디바이스 접근은 host를 거쳐야 해서 최적이 아님 |
| Device Bias | 디바이스가 작업을 실행하는 동안 | 디바이스가 host 일관성 엔진을 거치지 않고 접근. host도 접근할 수 있지만 *compromised performance* |

이 절은 CXL 1.1의 선택적 bias 모델입니다. §2.2.1.3은 별도 bias 관리를 구현하지 않고 전체가 Host Bias로 동작하는 경우도 명시합니다. bias를 구현하는 디바이스는 *page 단위*(규격의 예: 4 KB page당 1 bit)로 Bias Table에 기록하고, *Transition Agent*가 그 page에 속한 line을 host 캐시에서 flush하며 bias를 바꿉니다. 규격이 두 상태를 *작업 제출 → 실행 → 결과 회수* 주기에 맞춰 설명하므로, 이 주기가 긴 작업일수록 page마다 한 번 드는 전환이 적게 반복됩니다. 인용한 자료에는 전환 비용의 측정값이 없습니다.

> **메모** — bias 전환의 상태 기계와 BISnp 메시지 자체의 동작은 [CXL Ch 8](/blog/embedded/hardware/cxl/chapter08-cxl-mem)과 [CXL Ch 3](/blog/embedded/hardware/cxl/chapter03-coherency-model)에서 다룹니다.

## 대역폭은 링크에 묶이고, 지연은 묶이지 않는다

링크 원시 전송률은 `GT/s × lane 수 ÷ 8`로 어림합니다(한 방향, 인코딩 오버헤드 제외).

| 링크 | 원시 전송률 |
|------|------------|
| PCIe 5.0 x8 (32 GT/s) | 32 GB/s |
| PCIe 5.0 x16 | 64 GB/s |
| 64 GT/s x16 (CXL 3.0, PCIe 6.0 PHY) | 128 GB/s |

레인을 두 배로 늘리거나 세대를 올리면 원시 전송률이 두 배가 됩니다. 하지만 *load 한 번의 지연*은 그만큼 줄지 않습니다. 64 B 한 줄을 32 GB/s로 보내는 직렬화 시간은 `64 ÷ 32 = 2 ns`인데, Sun 등의 실측에서 장치별 지연 차이는 원격 DDR5 대비 35%~3배였고 그 차이를 논문은 *컨트롤러 설계*로 설명합니다. 레인 수가 바꾸는 것은 앞쪽 몇 ns입니다.

| 확장 목표 | 자동으로 비례 개선되지 않는 것 |
|---------------------|---------------------|
| 총 처리량 (레인·세대·디바이스 수) | load 한 번의 지연 |
| 용량 (카드 추가·pooling) | dependent load 체인의 진행 속도 |

Ch 9에서 *처리량이 목적인 워크로드*는 잘 맞고 *지연에 민감한 tight loop*는 안 맞는다고 정리했던 근거가 이것입니다.

실측할 때도 두 성질은 *다른 벤치마크*로 재야 합니다. 지연은 다음 주소가 이전 read 결과에 의존하는 pointer chase로, 대역폭은 의존이 없는 순차 스트리밍으로 잽니다. 위 논문도 지연을 Intel MLC의 pointer chasing으로 쟀고, 2소켓 Xeon의 *sub-NUMA clustering(SNC)* 모드가 결과에 영향을 준다고 따로 분석합니다. 아래 함수는 두 접근 형태를 보여 주는 **host 계산 예제**이며 시간 측정기나 CXL 벤치마크가 아닙니다.

```c title="cxl-access-shapes.c"
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
bool chase_index(const size_t *ring, size_t n, size_t steps, size_t *out) {
    if (!ring || !out || n == 0) return false;
    size_t idx = 0;
    for (size_t i = 0; i < steps; ++i) {
        size_t next = ring[idx];
        if (next >= n) return false;
        idx = next;
    }
    *out = idx;
    return true;
}
bool stream_sum(const uint64_t *buf, size_t n, uint64_t *out) {
    if (!out || (!buf && n != 0)) return false;
    uint64_t sum = 0;
    for (size_t i = 0; i < n; ++i) sum += buf[i];
    *out = sum; // uint64_t addition is modulo 2^64
    return true;
}
```

`ring = {2, 0, 3, 1}`로 3단계를 쫓고, `{1, 2, 3, UINT64_MAX}`를 더하는 `main`을 붙여 Apple clang 21.0.0 `-O2 -Wall`로 실행하면 다음과 같습니다. chase는 0 → 2 → 3 → 1로 *매 단계가 앞 단계의 결과를 기다리고*, stream은 순서와 무관하게 더해 `UINT64_MAX`가 2^64 modulo로 접혀 5가 됩니다.

```text
$ ./cxl-access-shapes
chase ok=1 idx=1, stream ok=1 sum=5
```

둘 중 하나만 재고 "CXL은 느리다 / 쓸 만하다"를 결론내는 것이 흔한 실수입니다.

## 큐가 대역폭을 만든다 — credit과 throughput 절벽

지연과 대역폭을 잇는 것이 *동시에 링크 위에 떠 있는 요청 수*입니다.

CXL.cache와 CXL.mem은 *credit 기반 흐름 제어*를 씁니다. CXL 1.1 규격은 link layer에 Request·Data·Response credit return 필드(Table 37)를 두고, CXL.mem의 Req와 RwD message class는 *각자 따로 credit을 받는다*고 적습니다(§3.3.6). 보내는 쪽은 받는 쪽이 허용한 만큼만 요청을 내보내고, credit이 반환되어야 다음 요청을 넣습니다. 단순 정상상태 모델에서는 outstanding line 수 × 64 B ÷ 평균 응답시간이 가능한 처리량의 한 제약이 됩니다. 이는 Little의 법칙에 따른 **필요 조건**이며, 프로토콜 credit 하나가 CPU 요청 하나와 같다는 뜻은 아닙니다. 뒤집으면, **어떤 대역폭을 뽑으려면 그 대역폭 × 왕복 지연만큼의 데이터가 항상 비행 중이어야 합니다.**

예를 들어 왕복 지연을 200 ns로 가정하고 50 GB/s를 뽑으려면 `50 GB/s × 200 ns = 10,000 B`, `10,000 ÷ 64 = 156.25`개의 64 B line입니다. 정수 request 슬롯 수로 올림하면 *최소 157개*가 필요하다는 모델입니다. 링크가 빨라질수록, 그리고 지연이 길어질수록 필요한 동시 요청 수가 늘어납니다. switch를 끼워 지연이 늘면 같은 링크에서도 필요한 in-flight 양이 그만큼 늘어납니다.

| 동시 요청 수 | 관찰되는 현상 |
|-------------|--------------|
| 필요량보다 적음 | 링크가 놉니다. 대역폭이 요청 수에 *비례해* 오릅니다 |
| 필요량 근처 | 링크가 포화합니다. 여기가 무릎입니다 |
| 필요량 초과 | 대역폭은 더 안 늘고, 요청이 큐에서 기다리는 시간만 붙어 *지연이 오릅니다* |

스레드를 늘릴수록 좋아지다가 어느 지점부터 *더 늘려도 대역폭은 그대로*인 그래프를 만나면 무릎을 지난 것입니다. [Ch 5](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)의 Triad 예(HBM·CXL이 아닌 LPDDR5 Mac에서 측정)도 같은 모양이었습니다. thread 1개 88.7 GB/s, 2개 144.4 GB/s 뒤로는 8개 153.0 GB/s, 12개 151.4 GB/s로 거의 늘지 않았습니다.

## Interleave granularity — 접근 패턴이 유불리를 가른다

디바이스를 여러 장 묶으면 대역폭이 합쳐지지만, *어느 단위로 번갈아 쓸지*에 따라 실제로 합쳐지는 정도가 달라집니다. 이 단위가 *interleave granularity*입니다. [Linux v6.12의 `granularity_to_eig()`](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/cxl.h)는 256 B~16 KiB의 2의 거듭제곱만 인코딩합니다. 하지만 [region.c](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/core/region.c)는 host bridge가 interleave된 경우 root granularity와의 일치도 검사합니다. 범위 안에 든다고 모든 장치·topology에서 선택 가능한 것은 아닙니다.

다음 학습용 배치 모델은 단일 interleave 단계에서 `target=floor(offset/granularity) mod ways`를 사용합니다. Linux의 전체 HPA→DPA decoder나 XOR 주소 매핑을 재현한 것은 아닙니다.

```js title="cxl-simple-stripe.mjs"
export function stripeTarget(offset, granularity, ways) {
  if (typeof offset !== 'bigint' || offset < 0n ||
      ![256,512,1024,2048,4096,8192,16384].includes(granularity) ||
      ![1,2,4,8,16].includes(ways)) throw new RangeError('invalid teaching model input');
  return Number((offset / BigInt(granularity)) % BigInt(ways));
}
```

2-way에서 offset 0·256·4096을 넣어 Node.js v24.21.0으로 실행한 결과입니다.

```js
for (const g of [256, 4096])
  console.log(`g=${g}`, [0n, 256n, 4096n].map(o => `${o}->${stripeTarget(o, g, 2)}`).join(' '));
```

```text
g=256 0->0 256->1 4096->0
g=4096 0->0 256->0 4096->1
```

0과 4096은 granularity 256에서 같은 target 0에, 4096에서 target 0·1로 갈립니다. 0과 256은 정반대입니다. 같은 granularity가 어떤 stride에는 분산을, 다른 stride에는 집중을 만듭니다.

granularity는 `cxl create-region -g`로 *region을 만들 때* 정합니다. 값별 상세 비교와 region 생성 절차는 [CXL Ch 8](/blog/embedded/hardware/cxl/chapter08-cxl-mem)에 있습니다.

## 메커니즘을 더 보고 싶다면

이 장은 *성질*만 다뤘습니다. 아래 항목이 필요해지면 CXL 시리즈로 넘어가는 편이 빠릅니다.

| 알고 싶은 것 | 어디 |
|-------------|------|
| M2S·S2M 채널 구성과 메시지 종류 | [CXL Ch 8](/blog/embedded/hardware/cxl/chapter08-cxl-mem) |
| HDM Decoder의 SPA → DPA 매핑, region 생성 절차 | [CXL Ch 8](/blog/embedded/hardware/cxl/chapter08-cxl-mem) |
| BISnp와 coherency 상태 전이 | [CXL Ch 3](/blog/embedded/hardware/cxl/chapter03-coherency-model) |
| flit 포맷과 세대별 차이 | [CXL Ch 9](/blog/embedded/hardware/cxl/chapter09-flit-format) |
| Linux `drivers/cxl/` 구현 | [CXL Ch 11](/blog/embedded/hardware/cxl/chapter11-linux-driver) |

## 자주 하는 실수

### "링크 세대를 올리면 지연도 줄어든다"

*대역폭이 늘어날 뿐*입니다. load 한 번의 지연은 *경로의 통과 지점과 컨트롤러*가 정합니다. 링크 폭·속도가 바꾸는 직렬화 시간은 64 B line에서 수 ns(32 GB/s에서 2 ns) 수준입니다.

### "큐를 깊게 하면 대역폭이 계속 늘어난다"

*무릎까지만*입니다. 그 지점을 넘으면 요청이 큐에서 대기하고, 대기 시간이 왕복 지연에 더해집니다. 스레드 수를 올리며 대역폭을 기록하면 무릎이 보입니다(Ch 5의 LPDDR5 Mac 예에서는 thread 2~8개 사이).

### "write가 read보다 비싸다"

*왕복 횟수는 같습니다*. `MemWr`는 데이터를 실어 나가고 `Cmp`만 돌아옵니다. 64 B 미만 부분 쓰기도 `MemWrPtl`이 Byte Enable을 실어 보내므로 host 쪽 read-modify-write 왕복이 붙지 않습니다.

### "접근할 때마다 링크 트래픽이 생긴다"

*아닙니다*. CPU의 캐시가 CXL.mem 데이터도 캐시합니다. *cache hit이면 링크를 건너지 않습니다*. 위에서 말한 지연은 *miss일 때*의 이야기입니다.

### "interleave granularity는 무조건 작을수록 좋다"

위 실행처럼 같은 granularity가 stride에 따라 분산도 집중도 만듭니다. 게다가 Linux v6.12 `region.c`는 host bridge가 interleave된 경우 region granularity가 root와 *같아야* 한다고 막습니다. 고를 수 있는 범위부터 topology가 정합니다.

### "CXL 메모리 지연은 제품마다 비슷하다"

Sun 등의 실측에서 같은 CPU에 붙인 디바이스 3종의 load 지연이 *원격 소켓 DDR5 대비 1.35배, 약 2배, 약 3배*로 갈렸습니다. 같은 DDR4 DRAM을 쓴 두 장치 사이에서도 67% 차이가 났습니다.

## 정리

- CXL.mem의 지연은 *링크 왕복과 양쪽 끝의 프로토콜·컨트롤러 통과*에서 붙습니다. Sun 등의 실측 지연은 *컨트롤러 설계*에 따라 원격 소켓 DDR5 대비 1.35배~약 3배로 갈렸습니다.
- **switch 한 단은 왕복 경로에 통과 지점 두 개를 더합니다.**
- read(`MemRd`→`MemData`)·write(`MemWr`→`Cmp`)·부분 write(`MemWrPtl`+Byte Enable) 모두 *왕복 한 번*입니다.
- Type 2 디바이스는 *Host Bias / Device Bias*로 자기 메모리의 일관성 비용을 phase 단위로 나눕니다.
- *대역폭은 링크 폭·세대에 비례*하지만 *지연은 그만큼 줄지 않습니다*. 그래서 CXL.mem은 *처리량·용량을 사는 tier*입니다.
- 둘을 잇는 것이 *in-flight 요청 수*입니다. credit 기반 흐름 제어에서 무릎 너머로는 대역폭이 아니라 지연만 늘어납니다.
- Interleave granularity는 *256 B~16 KB*이고 *접근 패턴*에 맞춰 region을 만들 때 고릅니다.
- 메시지·레지스터·flit 수준의 메커니즘은 [CXL 4.0 Internals](/blog/embedded/hardware/cxl/chapter08-cxl-mem) 쪽에 있습니다.

## 다음 편

[Ch 11: CXL Type 1·2·3 디바이스 분류](/blog/embedded/hardware/hbm/chapter11-cxl-device-types)에서는 *디바이스 유형별로 어떤 트래픽 패턴*이 나오는지를 정리합니다. Type 2가 왜 bias를 필요로 하고 Type 3는 왜 필요 없는지를 봅니다.

## 관련 항목

- [Ch 9: CXL.mem 분석 — HBM·GDDR·DDR 다음의 메모리 계층](/blog/embedded/hardware/hbm/chapter09-cxl-mem) — CPU 메모리 확장과 Linux 노출 모드의 개요
- [Ch 7: HBM 메모리 컨트롤러 분석](/blog/embedded/hardware/hbm/chapter07-memory-controller) — 큐 깊이와 대역폭의 같은 구조, HBM 쪽에서
- [Ch 11: CXL Type 1·2·3 디바이스 분류](/blog/embedded/hardware/hbm/chapter11-cxl-device-types) (다음 편)
- [Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric) — 통과 지점을 늘려 유연성을 사는 쪽의 이야기
- [CXL 4.0 Internals Ch 8: CXL.mem — M2S·S2M·HDM Decoder](/blog/embedded/hardware/cxl/chapter08-cxl-mem) — 같은 프로토콜을 메커니즘 쪽에서. 메시지 채널, HDM Decoder 프로그래밍, Linux region 생성
- [Embedded Performance Engineering Ch 54: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency) — 측정 방법과 도구
- [Modern Embedded Recipes: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
