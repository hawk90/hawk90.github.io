---
title: "CXL.mem 프로토콜 분해 — 왕복 횟수가 만드는 지연, 링크가 만드는 대역폭"
slug: "embedded/hardware/hbm/chapter10-cxl-mem-protocol"
date: 2026-06-15T09:02:00
description: "Ch 9의 지연·대역폭 수치가 왜 그렇게 나오는지 — 왕복 횟수로 본 지연 예산, 링크에 묶인 대역폭, credit 고갈이 만드는 throughput 절벽, interleave granularity의 유불리."
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

CPU가 CXL 영역에 `mov rax, [addr]` 한 줄을 던지면, local DDR 접근에는 없던 단계가 앞뒤로 붙습니다.

| 단계 | DDR 접근과의 차이 |
|------|------------------|
| MMU 변환 | 차이 없음 |
| HDM Decoder 판정 (주소 → 어느 디바이스) | DDR의 채널 디코드에 해당 |
| 요청이 링크를 지나 디바이스로 | 신규 |
| 디바이스 측 컨트롤러 → DRAM read | 디바이스 안의 DRAM 접근 |
| 응답이 링크를 지나 host로 | 신규 |

CXL이 local DDR보다 느린 이유는 *링크를 한 번 왕복*하고 *양쪽 끝에서 프로토콜 계층과 컨트롤러를 통과*하기 때문입니다. 그 비용은 *컨트롤러 설계*에 크게 좌우됩니다. Intel Xeon 6430 서버에서 실제 CXL 메모리 디바이스 3종을 잰 연구(Sun et al., MICRO 2023)에서는 load 지연이 *원격 소켓 DDR5보다 35% 긴 것부터 약 3배까지* 디바이스마다 크게 달랐습니다.

경로에 switch가 끼면 *통과 지점*이 늘어납니다.

| 구성 | 요청·응답 경로의 통과 지점 |
|------|---------------------------|
| local DDR | 링크 없음 |
| CXL.mem (direct attached) | host ↔ 디바이스 링크를 한 번 왕복 |
| CXL.mem (switch 1단) | 왕복 경로에 switch를 양방향으로 한 번씩 더 통과 |

**switch 한 단은 "장비 하나 추가"가 아니라 "왕복 경로에 통과 지점 두 개 추가"입니다.** pooling으로 얻는 유연성의 값이 *지연으로 청구*되는 구조입니다. 구성별 실제 지연은 TBD입니다.

## 왕복 한 번으로 끝나는 것

CXL 1.1 규격의 CXL.mem 흐름을 보면 기본 접근은 모두 *요청 하나, 응답 하나*입니다.

| 접근 | host → 디바이스 | 디바이스 → host |
|------|----------------|----------------|
| Read (load) | `MemRd` | `MemData` (데이터) |
| Write (store) | `MemWr` + 데이터 | `Cmp` (완료, 데이터 없음) |
| Partial write (64 B 미만) | `MemWrPtl` + 데이터 + Byte Enable(64 bit) | `Cmp` |

여기서 자주 뒤집히는 직관이 하나 있습니다. **write가 read보다 비쌀 것 같지만, 왕복 횟수는 같습니다.** 데이터가 명령과 함께 나가고 host는 완료 응답 `Cmp`만 기다리면 됩니다. 부분 쓰기도 Byte Enable을 실어 보내 디바이스가 병합하므로, host가 먼저 읽어 오는 *read-modify-write 왕복*이 링크에 붙지 않습니다.

## bias — 디바이스도 자기 메모리를 쓸 때

Type 2 가속기처럼 *디바이스도 자기 메모리를 캐시*하는 경우, CXL 1.1은 *bias 기반 일관성 모델*을 둡니다. device-attached memory에 두 상태가 있습니다.

| 상태 | 언제 | 성질 |
|------|------|------|
| Host Bias | 작업을 넣을 때, 결과를 읽을 때 | host 접근이 빠릅니다. 디바이스가 접근하려면 host를 거쳐야 합니다 |
| Device Bias | 디바이스가 작업을 실행하는 동안 | 디바이스가 host 일관성 엔진을 거치지 않고 접근합니다. host도 접근할 수 있지만 성능이 떨어집니다 |

Type 2 디바이스는 bias를 *page 단위*(예: 4 KB당 1 bit)로 Bias Table에 기록하고, *Transition Agent*가 host 캐시를 정리하며 bias를 바꿉니다. LLM inference처럼 *weight 적재 → 연산 → 결과 회수*로 phase가 뚜렷한 작업이 이 모델에 맞습니다. phase가 잘게 쪼개지면 전환 비용이 이득을 먹습니다. 전환 비용의 구체적인 크기는 TBD입니다.

> **메모** — bias 전환의 상태 기계와 BISnp 메시지 자체의 동작은 [CXL Ch 8](/blog/embedded/hardware/cxl/chapter08-cxl-mem)과 [CXL Ch 3](/blog/embedded/hardware/cxl/chapter03-coherency-model)에서 다룹니다.

## 대역폭은 링크에 묶이고, 지연은 묶이지 않는다

링크 원시 전송률은 `GT/s × lane 수 ÷ 8`로 어림합니다(한 방향, 인코딩 오버헤드 제외).

| 링크 | 원시 전송률 |
|------|------------|
| PCIe 5.0 x8 (32 GT/s) | 32 GB/s |
| PCIe 5.0 x16 | 64 GB/s |
| 64 GT/s x16 (CXL 3.0, PCIe 6.0 PHY) | 128 GB/s |

레인을 두 배로 늘리거나 세대를 올리면 원시 전송률이 두 배가 됩니다. 하지만 *load 한 번의 지연*은 그만큼 줄지 않습니다. 64 B 한 줄은 작아서 *직렬화 시간*이 지연 예산의 큰 몫이 아니고, 예산을 지배하는 *양쪽 끝의 프로토콜 계층과 컨트롤러 통과*는 레인 수와 무관하기 때문입니다.

| 확장하면 좋아지는 것 | 확장해도 그대로인 것 |
|---------------------|---------------------|
| 총 처리량 (레인·세대·디바이스 수) | load 한 번의 지연 |
| 용량 (카드 추가·pooling) | dependent load 체인의 진행 속도 |

Ch 9에서 *처리량이 목적인 워크로드*는 잘 맞고 *지연에 민감한 tight loop*는 안 맞는다고 정리했던 근거가 이것입니다.

실측할 때도 두 성질은 *다른 벤치마크*로 재야 합니다. 지연은 다음 주소가 이전 read 결과에 의존하는 pointer chase로, 대역폭은 의존이 없는 순차 스트리밍으로 잽니다. 위 연구도 지연은 pointer chase(Intel MLC)로 쟀습니다.

```c
// 지연 측정 — 다음 접근이 앞 결과에 의존하므로 왕복이 직렬화된다
uint64_t ChaseLatency(const size_t* ring, size_t steps) {
    size_t idx = 0;
    for (size_t i = 0; i < steps; ++i) {
        idx = ring[idx];          // 이전 load가 끝나야 다음 주소가 정해진다
    }
    return idx;
}

// 대역폭 측정 — 의존이 없어 여러 요청이 동시에 링크 위에 떠 있다
uint64_t StreamSum(const uint64_t* buf, size_t n) {
    uint64_t acc = 0;
    for (size_t i = 0; i < n; ++i) {
        acc += buf[i];            // 주소가 미리 정해져 있어 병렬 issue 가능
    }
    return acc;
}
```

둘 중 하나만 재고 "CXL은 느리다 / 쓸 만하다"를 결론내는 것이 흔한 실수입니다.

## 큐가 대역폭을 만든다 — credit과 throughput 절벽

지연과 대역폭을 잇는 것이 *동시에 링크 위에 떠 있는 요청 수*입니다.

CXL.cache와 CXL.mem은 *credit 기반 흐름 제어*를 씁니다(CXL 1.1 규격). 보내는 쪽은 받는 쪽이 허용한 만큼만 요청을 내보내고, credit이 반환되어야 다음 요청을 넣습니다. 그러면 *뽑을 수 있는 대역폭 = 동시 요청 수 × 64 B ÷ 왕복 지연*이 됩니다. 뒤집으면, **어떤 대역폭을 뽑으려면 그 대역폭 × 왕복 지연만큼의 데이터가 항상 비행 중이어야 합니다.**

예를 들어 왕복 지연을 200 ns로 가정하고 50 GB/s를 뽑으려면 `50 GB/s × 200 ns = 10 KB`, 곧 64 B 라인 *약 156개*가 늘 비행 중이어야 합니다. 링크가 빨라질수록, 그리고 지연이 길어질수록 필요한 동시 요청 수가 늘어납니다. switch를 끼워 지연이 늘면 같은 링크에서도 필요한 in-flight 양이 그만큼 늘어납니다.

| 동시 요청 수 | 관찰되는 현상 |
|-------------|--------------|
| 필요량보다 적음 | 링크가 놉니다. 대역폭이 요청 수에 *비례해* 오릅니다 |
| 필요량 근처 | 링크가 포화합니다. 여기가 무릎입니다 |
| 필요량 초과 | 대역폭은 더 안 늘고, 요청이 큐에서 기다리는 시간만 붙어 *지연이 오릅니다* |

스레드를 늘릴수록 좋아지다가 어느 지점부터 *더 늘려도 대역폭은 그대로이고 지연만 오르는* 그래프를 만나면 무릎을 이미 지난 것입니다. [Ch 7](/blog/embedded/hardware/hbm/chapter07-memory-controller)의 큐 깊이 문제와 같은 구조입니다.

## Interleave granularity — 접근 패턴이 유불리를 가른다

디바이스를 여러 장 묶으면 대역폭이 합쳐지지만, *어느 단위로 번갈아 쓸지*에 따라 실제로 합쳐지는 정도가 달라집니다. 이 단위가 *interleave granularity*입니다. Linux 커널의 HDM decoder 코드는 *256 B부터 16 KB까지*(2의 거듭제곱)를 받습니다.

| granularity | 한 번의 순차 접근이 하는 일 | 유리한 패턴 |
|------------|---------------------------|-----------|
| 작음 (256 B 쪽) | 짧은 구간마다 디바이스가 바뀌어 *부하가 흩어짐* | random — locality가 없으니 분산이 그대로 이득 |
| 큼 (4 KB~16 KB) | 한 디바이스 안에서 *연속 영역이 이어짐* | sequential — row·bank locality와 prefetch가 살아남 |

Sequential bulk read는 큰 granularity에서 *한 디바이스가 연속 영역을 연달아 읽으므로* DRAM 쪽 row hit이 유지됩니다. Random access는 어차피 locality가 없으니 작은 granularity가 *요청을 골고루 흩어* 디바이스 병렬성을 최대로 씁니다. 워크로드와 반대로 고르면 대역폭이 덜 나옵니다.

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

*대역폭이 늘어날 뿐*입니다. load 한 번의 지연은 *경로의 통과 지점과 컨트롤러*가 정합니다. 지연이 문제라면 링크를 넓히지 말고 *switch·fabric 단수를 줄여야* 합니다.

### "큐를 깊게 하면 대역폭이 계속 늘어난다"

*무릎까지만*입니다. 그 지점을 넘으면 요청이 큐에서 대기하고, 대기 시간이 왕복 지연에 더해져 *지연만 오릅니다*. 스레드 수를 올리며 대역폭·지연을 함께 기록해 *무릎을 찾는 것*이 튜닝의 실질입니다.

### "write가 read보다 비싸다"

*왕복 횟수는 같습니다*. `MemWr`는 데이터를 실어 나가고 `Cmp`만 돌아옵니다. 64 B 미만 부분 쓰기도 `MemWrPtl`이 Byte Enable을 실어 보내므로 host 쪽 read-modify-write 왕복이 붙지 않습니다.

### "접근할 때마다 링크 트래픽이 생긴다"

*아닙니다*. CPU의 캐시가 CXL.mem 데이터도 캐시합니다. *cache hit이면 링크를 건너지 않습니다*. 위에서 말한 지연은 *miss일 때*의 이야기입니다.

### "interleave granularity는 무조건 작을수록 좋다"

*접근 패턴 의존*입니다. Random에는 작은 granularity가, sequential bulk에는 큰 granularity가 맞습니다. region을 만들 때 정하는 값이라 워크로드에 맞춰 골라야 합니다.

### "CXL 메모리 지연은 제품마다 비슷하다"

실측 연구에서 같은 CPU에 붙인 디바이스 3종의 load 지연이 *원격 소켓 DDR5 대비 1.35배에서 약 3배*까지 갈렸습니다. 컨트롤러 설계가 지연을 크게 좌우합니다.

## 정리

- CXL.mem의 지연은 *링크 왕복과 양쪽 끝의 프로토콜·컨트롤러 통과*에서 붙습니다. 실측 지연은 *컨트롤러 설계*에 따라 원격 소켓 DDR5 대비 1.35배~약 3배로 갈립니다.
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

- [Ch 9: CXL.mem 분석 — HBM·GDDR·DDR 다음의 메모리 계층](/blog/embedded/hardware/hbm/chapter09-cxl-mem) — 이 장이 설명한 지연·대역폭 수치의 출처
- [Ch 7: HBM 메모리 컨트롤러 분석](/blog/embedded/hardware/hbm/chapter07-memory-controller) — 큐 깊이와 대역폭의 같은 구조, HBM 쪽에서
- [Ch 11: CXL Type 1·2·3 디바이스 분류](/blog/embedded/hardware/hbm/chapter11-cxl-device-types) (다음 편)
- [Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric) — 통과 지점을 늘려 유연성을 사는 쪽의 이야기
- [CXL 4.0 Internals Ch 8: CXL.mem — M2S·S2M·HDM Decoder](/blog/embedded/hardware/cxl/chapter08-cxl-mem) — 같은 프로토콜을 메커니즘 쪽에서. 메시지 채널, HDM Decoder 프로그래밍, Linux region 생성
- [Embedded Performance Engineering Ch 54: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency) — 측정 방법과 도구
- [Modern Embedded Recipes Ch 149: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
