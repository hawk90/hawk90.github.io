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

> **"CXL.mem의 *지연은 왕복 횟수*가 정하고, *대역폭은 링크 폭*이 정합니다. 이 둘이 따로 논다는 점이 CXL.mem을 *메모리 계층의 독립된 한 단*으로 만듭니다."** — 링크 세대를 올리면 대역폭은 두 배가 되지만 *load 한 번의 지연은 거의 그대로*입니다. 그래서 CXL.mem은 *용량과 대역폭을 사는 tier*이지 *지연을 사는 tier*가 아닙니다.

[Ch 9](/blog/embedded/hardware/hbm/chapter09-cxl-mem)에서 *CXL.mem이 DDR과 SSD 사이에 끼는 새 tier*라는 것과, *지연 170~220 ns·대역폭 30~120 GB/s*라는 숫자를 봤습니다. 이 장은 *그 숫자가 왜 그렇게 나오는지*를 봅니다. 지연이 *DDR의 두 배쯤*에서 멈추는 이유, switch가 한 단 끼면 *왜 하필 3배*가 되는지, 링크 대역폭이 이론값의 *80% 언저리*에 머무는 이유, 그리고 *큐를 깊게 파도 어느 지점부터 대역폭이 더 안 늘고 지연만 늘어나는* 현상까지를 *메모리 계층 관점*에서 정리합니다.

M2S/S2M 채널 구성, HDM Decoder 레지스터, BISnp 상태 전이, flit 포맷 같은 메시지·필드 수준의 메커니즘은 [CXL 4.0 Internals Ch 8](/blog/embedded/hardware/cxl/chapter08-cxl-mem)이 담당합니다. 여기서는 *그 메커니즘이 메모리로서의 성질에 무엇을 하는지*만 봅니다.

## 지연 예산 — load 한 번에 무엇이 붙는가

CPU가 CXL 영역에 `mov rax, [addr]` 한 줄을 던지면, DDR 접근에는 없던 단계가 앞뒤로 붙습니다. *어느 단계가 시간을 먹는지*로 나눠 보면 이렇습니다.

| 단계 | 시간 성격 | DDR 접근과의 차이 |
|------|----------|------------------|
| MMU 변환 | DDR과 동일 | 차이 없음 |
| HDM Decoder 판정 (SPA → 어느 디바이스) | 고정 비용, 작음 | DDR의 채널·rank 디코드에 해당 |
| 요청 직렬화 + 링크 통과 (host → device) | *링크 폭·세대 의존* | 신규 |
| 디바이스 측 컨트롤러 큐 → DRAM read | DDR과 같은 성격 | 디바이스 안의 DRAM 지연은 DDR과 큰 차이 없음 |
| 응답 직렬화 + 링크 통과 (device → host) | *링크 폭·세대 의존* | 신규 |

핵심은 *마지막에서 세 번째·첫 번째 항목*입니다. **DRAM 자체 지연은 DDR이나 CXL이나 비슷합니다.** CXL이 느린 이유는 *DRAM이 느려서가 아니라*, *링크를 한 번 왕복*하고 *그 양쪽 끝에서 프로토콜 계층을 통과*하기 때문입니다.

Ch 9의 실측 표를 *hop 수*로 다시 읽으면 규칙이 보입니다.

| 시나리오 | 지연 (Ch 9) | 링크 통과 횟수 |
|---------|------------|---------------|
| local DDR5 | 80~100 ns | 0 |
| CXL.mem (direct attached) | 170~220 ns | 2 (요청 1 + 응답 1) |
| CXL.mem (through switch) | 250~350 ns | 4 (switch를 양방향 각 1회씩 더) |
| CXL.mem (pooled, 2-hop fabric) | 400~600 ns | 6 |

*지연이 계단식으로 오르는* 이유가 여기 있습니다. **switch 한 단은 "장비 하나 추가"가 아니라 "왕복 경로에 통과 지점 두 개 추가"입니다.** pooling으로 얻는 유연성의 값이 *지연 100 ns 단위로 청구*되는 구조입니다.

## 왕복 한 번으로 끝나는 것과 두 번 드는 것

지연 예산이 *왕복 횟수*로 정해진다면, 관심사는 *어떤 접근이 왕복 몇 번인가*입니다.

| 접근 | 왕복 | 왜 |
|------|------|-----|
| Read (load) | 1 | 요청이 나가고 데이터가 돌아옵니다 |
| Write (store) | 1 | 명령과 데이터를 *한 번에 실어* 보내고 완료 응답만 받습니다 |
| Partial write (64 B 미만) | 1 | write mask를 함께 보내므로 read-modify-write 왕복이 추가되지 않습니다 |
| Device-Bias 영역을 host가 접근 | 2 | 무효화를 주고받은 *다음에야* 데이터가 옵니다 |

여기서 자주 뒤집히는 직관이 하나 있습니다. **write가 read보다 비쌀 것 같지만, 왕복 횟수는 같습니다.** 데이터가 명령에 실려 나가기 때문에 host는 완료 응답만 기다리면 되고, 그 응답에는 payload가 없어 *직렬화 시간도 짧습니다*. CXL.mem에서 write-heavy 워크로드가 생각보다 잘 견디는 이유입니다.

비싼 쪽은 마지막 줄입니다. Type 2 가속기처럼 *디바이스도 자기 메모리를 캐시*하는 경우, host가 디바이스 쪽이 소유한 라인을 건드리면 *무효화 왕복이 데이터 왕복 앞에 하나 더* 붙습니다. 지연이 그대로 두 배가 됩니다.

CXL이 이 비용을 줄이는 방식이 *bias*입니다. 영역 단위로 "지금은 host가 주로 쓴다 / 지금은 device가 주로 쓴다"를 선언해 두고, *그 phase 동안은 무효화 왕복 없이* 접근합니다. 전환 자체는 *수 µs*가 들지만, 전환 후 *수 ms~수 초* 동안 왕복 한 번으로 끝납니다. LLM inference처럼 *weight 적재 → 연산 → 결과 회수*로 phase가 뚜렷한 워크로드에서 이득이 크고, phase가 잘게 쪼개지면 전환 비용이 이득을 먹습니다.

> **메모** — bias 전환의 상태 기계와 BISnp 메시지 자체의 동작은 [CXL Ch 8](/blog/embedded/hardware/cxl/chapter08-cxl-mem)과 [CXL Ch 3](/blog/embedded/hardware/cxl/chapter03-coherency-model)에서 다룹니다. 이 장에서 필요한 것은 *"왕복이 하나 더 붙는다"*는 사실 하나입니다.

## 대역폭은 링크에 묶이고, 지연은 묶이지 않는다

Ch 9의 대역폭 표를 다시 봅니다.

| 링크 | 이론 대역폭 (단방향) | 실측 메모리 처리량 (read) |
|------|---------------------|--------------------------|
| PCIe 5.0 x8 | 32 GB/s | 24~28 GB/s |
| PCIe 5.0 x16 | 64 GB/s | 50~58 GB/s |
| PCIe 6.0 x16 | 128 GB/s | 100~120 GB/s |

레인을 두 배로 늘리면 대역폭이 두 배가 됩니다. 세대를 올려도 두 배가 됩니다. **그런데 지연 표에는 링크 폭·세대 항목이 아예 없습니다.** Ch 9의 지연은 *direct / switch / pooled*로만 갈립니다.

이유는 앞 절의 분해에 있습니다. 링크 폭을 늘리면 *한 메시지를 밀어내는 직렬화 시간*은 줄지만, 64 B 한 줄은 애초에 작아서 그 시간이 예산의 큰 몫이 아닙니다. 예산을 지배하는 것은 *양쪽 끝의 프로토콜 계층 통과*와 *디바이스 DRAM 접근*이고, 이 둘은 레인 수와 무관합니다.

이 비대칭이 CXL.mem tier의 성격을 결정합니다.

| 확장하면 좋아지는 것 | 확장해도 그대로인 것 |
|---------------------|---------------------|
| 총 처리량 (레인·세대·디바이스 수) | load 한 번의 지연 |
| 용량 (카드 추가·pooling) | dependent load 체인의 진행 속도 |

Ch 9에서 *KV cache pool·in-memory DB의 cold tier*는 잘 맞고 *HPC tight loop*는 안 맞는다고 정리했던 것의 근거가 이것입니다. 앞의 둘은 *처리량이 목적*이라 확장이 그대로 이득이 되고, 뒤는 *dependent load 체인*이라 아무리 링크를 넓혀도 나아지지 않습니다.

실측할 때도 두 성질은 *다른 벤치마크*로 재야 합니다. 지연은 다음 주소가 이전 read 결과에 의존하는 pointer chase로, 대역폭은 의존이 없는 순차 스트리밍으로 잽니다.

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

같은 CXL 영역을 대상으로 이 둘을 돌리면 *지연은 DDR의 두 배쯤, 대역폭은 링크 상한 근처*라는 서로 다른 결론이 나옵니다. 둘 중 하나만 재고 "CXL은 느리다 / 쓸 만하다"를 결론내는 것이 흔한 실수입니다.

## 큐가 대역폭을 만든다 — credit 고갈과 throughput 절벽

지연과 대역폭이 따로 논다고 했지만, *완전히* 무관하지는 않습니다. 둘을 잇는 것이 *동시에 링크 위에 떠 있는 요청 수*입니다.

CXL.mem은 *credit 기반 흐름 제어*를 씁니다. host는 디바이스가 허용한 slot 수만큼만 요청을 내보내고, 응답이 돌아와 credit이 반환되어야 다음 요청을 넣습니다. 그러면 *뽑을 수 있는 대역폭 = 동시 요청 수 × 64 B ÷ 왕복 지연*이 됩니다. 뒤집으면, **어떤 대역폭을 뽑으려면 그 대역폭 × 왕복 지연만큼의 데이터가 항상 비행 중이어야 합니다.**

Ch 9의 수치로 direct attached (170~220 ns) 기준을 계산하면 이렇습니다.

| 링크 | 실측 처리량 | 필요한 in-flight 데이터 | 64 B 라인 수 |
|------|------------|------------------------|-------------|
| PCIe 5.0 x8 | 24~28 GB/s | 약 4.1~6.2 KB | 약 64~96 |
| PCIe 5.0 x16 | 50~58 GB/s | 약 8.5~12.8 KB | 약 130~200 |
| PCIe 6.0 x16 | 100~120 GB/s | 약 17~26 KB | 약 270~410 |

(Ch 9의 대역폭·지연 값을 곱해 얻은 값입니다. 실제 필요한 credit 수는 구현마다 다릅니다.)

읽어야 할 것은 절대값이 아니라 *추세*입니다. **링크가 빨라질수록, 그리고 지연이 길어질수록, 상한을 채우는 데 필요한 동시 요청 수가 늘어납니다.** switch를 한 단 끼워 지연이 250~350 ns가 되면 같은 링크에서도 필요한 in-flight 양이 그만큼 더 늘어납니다. *pooling으로 지연을 산 대가가 대역폭 쪽에서도 청구되는* 셈입니다.

이 관계가 성능 곡선의 모양을 만듭니다.

| 동시 요청 수 | 관찰되는 현상 |
|-------------|--------------|
| 필요량보다 적음 | credit이 남는데도 요청이 없어 링크가 놉니다. 대역폭이 요청 수에 *비례해* 오릅니다 |
| 필요량 근처 | 링크가 포화합니다. 여기가 무릎입니다 |
| 필요량 초과 | 대역폭은 더 안 늘고, 요청이 큐에서 기다리는 시간만 붙어 *지연이 선형으로* 오릅니다 |

throughput 절벽처럼 보이는 현상의 정체가 대개 이 세 번째 구간입니다. credit이 고갈되면 요청은 *거부되는 게 아니라 대기*하고, 대기 시간이 왕복 지연에 더해집니다. 그러면 위의 식에서 *분모가 커져* 같은 동시 요청 수로 뽑히는 대역폭이 오히려 줄고, 이 되먹임이 곡선을 급격히 꺾습니다. 스레드를 늘릴수록 좋아지다가 어느 지점부터 *더 늘리면 나빠지는* 그래프를 만나면 무릎을 이미 지난 것입니다.

HBM 쪽에서 [Ch 7](/blog/embedded/hardware/hbm/chapter07-memory-controller)의 큐 깊이 튜닝과 같은 구조의 문제입니다. 다만 CXL.mem은 *왕복 지연이 두 배 이상*이라 무릎이 훨씬 깊은 곳에 생깁니다.

## Interleave granularity — 접근 패턴이 유불리를 가른다

디바이스를 여러 장 묶으면 대역폭이 합쳐지지만, *어느 단위로 번갈아 쓸지*에 따라 실제로 합쳐지는 정도가 달라집니다. 이 단위가 *interleave granularity*이고, 64 B(cache line)부터 16 KB까지 고를 수 있습니다.

| granularity | 한 번의 순차 접근이 하는 일 | 유리한 패턴 |
|------------|---------------------------|-----------|
| 64 B (작음) | 라인마다 디바이스가 바뀌어 *모든 디바이스에 부하가 흩어짐* | random — locality가 없으니 분산이 그대로 이득 |
| 4 KB~16 KB (큼) | 한 디바이스 안에서 *연속 영역이 이어짐* | sequential — row·bank locality와 prefetch가 살아남 |

가치 판단이 갈리는 지점은 *접근에 locality가 있는가*입니다. Sequential bulk read는 큰 granularity에서 *한 디바이스가 연속 영역을 연달아 읽으므로* DRAM 쪽 row hit이 유지되고 prefetcher도 맞아떨어집니다. 반대로 작은 granularity를 주면 같은 스트림이 디바이스 여러 장으로 찢어져 *어느 쪽에서도 locality가 남지 않습니다*.

Random access는 정반대입니다. 어차피 locality가 없으니 잃을 것이 없고, 작은 granularity가 *요청을 골고루 흩어* 디바이스 병렬성을 최대로 씁니다. 큰 granularity를 주면 hot 영역이 한 디바이스에 몰려 *나머지가 놀게* 됩니다.

**잘못 고르면 대역폭이 절반만 나옵니다.** 그리고 이 설정은 region을 만들 때 정해지므로, 워크로드를 바꾸려면 *영역을 다시 만들어야* 합니다. 앞 절의 무릎 위치도 함께 움직입니다 — 디바이스 병렬성이 줄면 같은 in-flight로 뽑히는 대역폭이 줄기 때문입니다.

granularity 값별 상세 비교표와 Linux에서 region을 만들며 이 값을 지정하는 절차는 [CXL Ch 8](/blog/embedded/hardware/cxl/chapter08-cxl-mem)에 있습니다.

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

*대역폭만 늘어납니다*. Ch 9의 지연 표에는 *링크 세대 항목이 없고* direct·switch·pooled로만 갈립니다. 지연을 줄이는 유일한 수단은 *경로에서 통과 지점을 빼는 것*, 즉 *switch·fabric 단수를 줄이는 것*입니다. 지연이 문제라면 링크를 넓히지 말고 *토폴로지를 줄여야* 합니다.

### "큐를 깊게 하면 대역폭이 계속 늘어난다"

*무릎까지만*입니다. 그 지점을 넘으면 요청은 큐에서 대기하고, 대기 시간이 왕복 지연에 더해져 *지연만 오릅니다*. 심하면 늘어난 지연 때문에 대역폭이 도로 줄어드는 구간이 생깁니다. 스레드 수를 올리며 대역폭·지연을 함께 기록해 *무릎을 찾는 것*이 튜닝의 실질입니다.

### "write가 read보다 비싸다"

*왕복 횟수는 같습니다*. 명령과 데이터가 한 번에 나가고 완료 응답만 돌아옵니다. 응답에 payload가 없어 오히려 *돌아오는 쪽이 가볍습니다*. 64 B 미만 부분 쓰기도 write mask를 실어 보내므로 read-modify-write 왕복이 추가되지 않습니다.

### "접근할 때마다 링크 트래픽이 생긴다"

*아닙니다*. CPU의 L1·L2·L3가 CXL.mem 데이터를 그대로 캐시합니다. *cache hit이면 링크 트래픽 0*이고 지연도 DDR과 동일합니다. 앞의 지연 표는 *miss일 때의 값*입니다. 그래서 CXL.mem 워크로드의 실효 지연은 *cache hit rate에 좌우*되고, hit rate가 높으면 tier 간 지연 차이가 평균에서 상당 부분 씻깁니다.

### "interleave granularity는 무조건 작을수록 좋다"

*접근 패턴 의존*입니다. Random에는 작은 granularity가, sequential bulk에는 큰 granularity가 맞습니다. 워크로드와 반대로 고르면 *대역폭 절반*입니다. 그리고 region 생성 시점에 정해지므로 *나중에 바꾸려면 영역을 다시 만들어야* 합니다.

### "bias 전환은 비싸니 안 쓴다"

*전환은 µs, 이득은 phase 전체*입니다. 전환 후 그 영역 접근은 무효화 왕복 없이 *왕복 한 번*으로 끝납니다. weight load → inference → output read처럼 phase가 *수 ms 이상* 이어지면 이득이 확실하고, phase가 잘게 쪼개지면 전환 비용이 이득을 먹습니다. 판단 기준은 *phase 길이 대 µs*입니다.

## 정리

- CXL.mem의 지연은 *DRAM이 느려서가 아니라 링크를 왕복*하기 때문에 붙습니다. 디바이스 안의 DRAM 지연은 DDR과 큰 차이가 없습니다.
- Ch 9의 지연 계단(170~220 / 250~350 / 400~600 ns)은 *경로의 통과 지점 수*에 대응합니다. **switch 한 단은 왕복 경로에 통과 지점 두 개를 더합니다.**
- read·write 모두 *왕복 한 번*입니다. write가 더 비싸지 않습니다. 왕복이 두 번 드는 경우는 *device-bias 영역을 host가 건드릴 때*이고, bias는 그 왕복을 phase 단위로 상각하는 장치입니다.
- *대역폭은 링크 폭·세대에 비례*하지만 *지연은 그것과 무관*합니다. 그래서 CXL.mem은 *처리량·용량을 사는 tier*이고, dependent load 체인은 확장으로 구제되지 않습니다.
- 둘을 잇는 것이 *in-flight 요청 수*입니다. 링크가 빠를수록·지연이 길수록 상한을 채우는 데 더 많은 동시 요청이 필요합니다.
- credit 고갈은 *거부가 아니라 대기*로 나타나고, 대기가 왕복 지연에 더해지며 곡선을 꺾습니다. 무릎 너머에서는 대역폭이 아니라 지연만 늘어납니다.
- Interleave granularity는 *접근 패턴이 유불리를 가릅니다*. sequential은 크게, random은 작게. 반대로 고르면 대역폭 절반이고, region 재생성 없이는 못 바꿉니다.
- 메시지·레지스터·flit 수준의 메커니즘은 [CXL 4.0 Internals](/blog/embedded/hardware/cxl/chapter08-cxl-mem) 쪽에 있습니다.

## 다음 편

[Ch 11: CXL Type 1·2·3 디바이스 분류](/blog/embedded/hardware/hbm/chapter11-cxl-device-types)에서는 *디바이스 유형별로 어떤 트래픽 패턴*이 나오는지를 정리합니다. 이 장의 *왕복 횟수* 관점이 유형별로 어떻게 갈리는지, 그러니까 Type 2가 왜 bias를 필요로 하고 Type 3는 왜 필요 없는지를 실 제품 사례와 함께 봅니다.

## 관련 항목

- [Ch 9: CXL.mem 분석 — HBM·GDDR·DDR 다음의 메모리 계층](/blog/embedded/hardware/hbm/chapter09-cxl-mem) — 이 장이 설명한 지연·대역폭 수치의 출처
- [Ch 7: HBM 메모리 컨트롤러 분석](/blog/embedded/hardware/hbm/chapter07-memory-controller) — 큐 깊이와 대역폭의 같은 구조, HBM 쪽에서
- [Ch 11: CXL Type 1·2·3 디바이스 분류](/blog/embedded/hardware/hbm/chapter11-cxl-device-types) (다음 편)
- [Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric) — 통과 지점을 늘려 유연성을 사는 쪽의 이야기
- [CXL 4.0 Internals Ch 8: CXL.mem — M2S·S2M·HDM Decoder](/blog/embedded/hardware/cxl/chapter08-cxl-mem) — 같은 프로토콜을 메커니즘 쪽에서. 메시지 채널, HDM Decoder 프로그래밍, Linux region 생성
- [Embedded Performance Engineering Ch 54: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency) — 측정 방법과 도구
- [Modern Embedded Recipes Ch 149: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
