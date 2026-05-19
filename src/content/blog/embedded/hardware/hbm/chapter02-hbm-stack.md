---
title: "Ch 2: HBM 스택 구조와 TSV"
date: 2026-05-16T02:00:00
description: "Base die + DRAM die stack — 3D 메모리의 구성요소와 TSV·microbump의 역할."
series: "HBM·GDDR 심화"
seriesOrder: 2
tags: [hbm, tsv, 3d-stack, base-die]
draft: false
---

## 한 줄 요약

> **"HBM은 *DRAM die를 위로 쌓고*, *TSV*로 수직으로 신호를 통과시킵니다."** — 한 stack은 *1개의 base die* 위에 *4·8·12·16개의 DRAM die*를 적층한 구조입니다. 모든 die가 *TSV(Through-Silicon Via)*로 *수직 연결*되고, *base die*가 *PHY와 채널 라우팅*을 담당합니다.

[Ch 1](/blog/embedded/hardware/hbm/chapter01-overview)에서 HBM이 *왜 GDDR과 갈렸는지*를 봤습니다. 핵심은 *1024-bit 광폭 bus*였습니다. 이번 장은 *그 1024-bit가 어떻게 한 stack 안에 들어가는지*입니다. *물리적으로 어떻게 적층*되는지, *전기 신호가 위로 어떻게 통과*하는지, *왜 yield가 이렇게 어려운지*까지 봅니다.

## stack 단면

HBM3E 12-Hi stack 한 개를 *옆에서 잘라* 보면 다음과 같습니다.

![HBM3E 12-Hi stack 단면 — base die + 12 DRAM die + microbump field](/images/blog/hardware/hbm/diagrams/ch02-stack.svg)

전체 높이는 *약 720 μm*입니다. die마다 *50~60 μm*로 갈아낸(thinned) 두께입니다. 12장을 쌓아도 *손가락 마디*보다 *얇습니다*.

JEDEC 표준 max height는 *720 μm (HBM3)*, *775 μm (HBM3E 12-Hi)*입니다. 세대별 실제 stack 높이는 다음과 같습니다.

| 세대 | stack height |
|------|--------------|
| HBM2 4-Hi | ~400 μm |
| HBM2E 8-Hi | ~720 μm |
| HBM3 12-Hi | ~720 μm (die 50 μm thinning) |
| HBM3E 12-Hi | ~775 μm |

GPU/NPU die의 *thickness*에 맞춰야 *cooling solution*이 *동일한 cold plate*에 닿습니다. 그래서 *총 높이*가 *엄격한 제약*입니다.

## base die의 역할

stack 맨 아래에 있는 *base die*는 *DRAM이 아닙니다*. *로직 공정*으로 만든 *전용 die*입니다.

![Base die 내부 — HBM PHY, Channel controller, Test, Repair, Refresh, ECC](/images/blog/hardware/hbm/diagrams/ch02-base-die.svg)

base die가 하는 일은 *네 가지*입니다.

1. **PHY** — host 칩(GPU/NPU)과의 *electrical interface*. 1024-bit 데이터 신호와 command/address를 *microbump*로 받아 *내부 신호*로 변환합니다.
2. **Channel 라우팅** — 16개 channel을 *어느 DRAM die*에 매핑할지 결정합니다.
3. **테스트·repair** — DRAM die의 *bad row/column*을 *redundancy*로 우회합니다. *KGSD(Known Good Stack Die)* 테스트는 base die의 *BIST*로 수행합니다.
4. **Refresh·power management** — refresh scheduling, self-refresh entry/exit를 base die가 결정합니다.

HBM4부터는 *base die에 더 많은 로직*을 넣는 방향으로 갑니다. *near-memory compute*나 *ECC stronger* 기능이 *base die의 logic budget*을 차지합니다.

## TSV — 수직으로 통하는 신호

DRAM die가 *12장 쌓여 있는데*, 신호는 *맨 위 die*도 *맨 아래 base die*까지 *수직으로* 와야 합니다. 이것을 가능하게 하는 게 *TSV(Through-Silicon Via)*입니다.

![TSV 단면 — DRAM die 안의 수직 구리 기둥, 아래는 microbump로 다음 die에 연결](/images/blog/hardware/hbm/diagrams/ch02-tsv.svg)

TSV는 *실리콘 본체를 관통하는 구리 비아*입니다. 제조 단계는 다음과 같습니다.

```text
TSV 제조 (via-middle 방식)

1. CMOS 공정 일부 진행 (active layer 형성)
2. Deep Si etch (수직 구멍 뚫기, ~50 μm)
3. SiO2 절연막 증착
4. Ta/TaN barrier + Cu seed 증착
5. Cu electroplating (구멍 채우기)
6. CMP로 표면 평탄화
7. 남은 CMOS 공정 진행 (BEOL)
8. wafer thinning (50 μm로 갈아내기)
9. 뒷면에 microbump 형성
```

HBM3에서 TSV 개수는 *stack당 약 1000~1500개*입니다. HBM4는 *2048-bit interface*가 되면서 *2000~3000개*로 늘어납니다.

HBM3 기준 stack당 총 TSV ≈ 1280개의 분담은 다음과 같습니다.

| 용도 | TSV 개수 |
|------|----------|
| data signal | 1024 |
| command / address | 80 |
| clock | 16 |
| power / ground | 100 (전류 capacity) |
| test / redundancy | 60 |

## microbump — die 간 연결

TSV가 *die 내부의 수직 연결*이라면, *microbump*는 *die와 die 사이의 연결*입니다.

![microbump 단면 — die A의 TSV 출구 pad와 die B의 아랫면 pad가 SnAg 솔더 bump로 결합](/images/blog/hardware/hbm/diagrams/ch02-microbump.svg)

micropump pitch는 *HBM3 기준 55 μm*입니다. *1280개 TSV*를 *모두 microbump로 연결*하려면 *stack 한 변*이 *55 μm × √1280 ≈ 1.97 mm*가 필요합니다. 실제 HBM3 stack은 *약 11 × 11 mm* 정사각형이므로 *충분한 면적*이 나옵니다.

| 세대 | pitch | bump 직경 |
|------|-------|-----------|
| HBM2 | 55 μm | 30 μm |
| HBM3 | 55 μm | 25 μm |
| HBM3E | 50 μm | 22 μm |
| HBM4 (hybrid bonding) | 9 μm | — (Cu-Cu direct) |

HBM4부터는 *hybrid bonding*으로 *솔더 없이* *구리끼리 직접 접합*합니다. *pitch가 한 자릿수 μm*로 떨어져 *2048-bit*도 *작은 면적*에 들어갑니다.

## Channel과 Pseudo Channel

1024-bit bus는 *내부적으로 16개 channel*로 나뉩니다.

```text
HBM3 channel 구조

stack (1024-bit)
├── Channel 0  (128-bit)
│   ├── PC0 (64-bit) ─┐
│   └── PC1 (64-bit) ─┴── 독립 명령 발행 가능
├── Channel 1  (128-bit)
├── Channel 2  (128-bit)
├── ...
└── Channel 15 (128-bit)

PC = Pseudo Channel
한 channel은 2개의 PC로 분할 동작
```

| 단위 | 폭 | 개수 | 용도 |
|------|-----|------|------|
| Stack | 1024-bit | 1 | 전체 |
| Channel | 128-bit | 8 (HBM2) / 16 (HBM3) | 독립 동작 |
| Pseudo Channel | 64-bit | 16 (HBM2) / 32 (HBM3) | 명령 인터리브 |

*Pseudo Channel*은 같은 channel 안에서 *반쪽씩 독립 명령*을 발행할 수 있게 한 구조입니다. *bank-level parallelism*을 *위층*으로 한 단계 끌어올린 셈입니다. *bank conflict*가 났을 때 *다른 PC*가 *대신 일을 합니다*.

## DRAM die layout

DRAM die 한 장 안에는 *여러 channel의 일부*가 들어 있습니다.

![HBM3 DRAM die top-down — TSV array가 중앙, 양쪽으로 channel별 bank array](/images/blog/hardware/hbm/diagrams/ch02-die-layout.svg)

TSV array가 *die 중앙*에 자리 잡고, 양쪽으로 *DRAM array*가 펼쳐집니다. *TSV에서 가까운 채널*이 *latency가 가장 짧고*, 멀어질수록 *RC 지연*이 늘어납니다. 그래서 PHY가 *training*으로 *per-channel timing*을 따로 잡습니다.

## yield — HBM의 큰 비용

HBM이 *비싸지는 이유* 한 가지는 *yield*입니다.

각 die yield 95%를 가정한 누적 효과는 다음과 같습니다 (stack yield = 0.95^N).

| stack | N (base+DRAM) | naive yield |
|-------|---------------|-------------|
| 4-Hi | 5 | 77.4% |
| 8-Hi | 9 | 63.0% |
| 12-Hi | 13 | 51.3% |
| 16-Hi | 17 | 41.8% |

실제로는 KGSD test와 repair로 보정하지만, *한 die가 불량이면 stack 전체가 불량*이 기본 위험입니다.

12-Hi에서 *base + DRAM 13장*이 모두 정상이어야 *stack 1개*가 나옵니다. 그래서 *Known Good Die(KGD) test*가 *die마다* 매우 엄격하게 들어갑니다.

```text
HBM 제조 flow

1. DRAM wafer 제조 (Samsung/SK 하이닉스 fab)
2. wafer-level test (probe card)
3. KGD를 골라 thinning (50 μm)
4. base die wafer 제조 (별도 로직 공정)
5. base die KGD test
6. die-to-die bonding (TSV+microbump)
7. 한 층씩 stacking
8. KGSD test (Known Good Stack Die)
9. encapsulation (mold)
10. 최종 test
11. CoWoS·interposer 패키징 (TSMC)
```

*stack 단계 8번*에서 불량이 나면 *12장 die가 통째로 폐기*됩니다. yield 1% 차이가 *stack 가격 수십 달러* 차이입니다.

## yield repair — redundancy의 역할

다행히 *완전 폐기는 아닙니다*. *row/column redundancy*가 *die마다* 있어 *몇 비트의 불량*은 *base die가 remap*합니다.

한 DRAM die에는 *normal row N개*와 *redundant row 32개* 정도가 함께 들어 있습니다. 불량 row가 나오면 *redundant row와 swap*하고, *remap 정보*를 *base die의 e-fuse*에 저장합니다. boot 시 *row decoder*가 자동으로 redundant로 redirect합니다.

PPR(Post-Package Repair)이라고 부르는 *런타임 repair*도 있습니다. *현장에서 ECC가 불량 row를 감지*하면 *redundant row로 영구 교체*합니다. *HBM3*부터는 *PPR이 표준*입니다.

## 자주 하는 실수

### "TSV가 그냥 작은 via다"

via와 *치수가 다릅니다*. 일반 BEOL via는 *100 nm*급, TSV는 *5 μm*급으로 *50배* 큽니다. 또 *깊이가 50 μm*에 달해 *aspect ratio 10:1*을 *etch와 fill*해야 합니다. 별도 공정 단계가 필요합니다.

### "더 많이 쌓으면 항상 좋다"

12-Hi → 16-Hi는 *capacity 33%* 증가지만 *yield가 18% 떨어집니다*. 게다가 *발열·신호 무결성*도 악화됩니다. *HBM3E는 12-Hi가 sweet spot*, *HBM4*에서 *16-Hi*가 본격화될 예정입니다.

### base die가 *DRAM*이라는 오해

base die는 *로직 공정*입니다. SK 하이닉스의 HBM3 base die는 *12 nm급 fin-FET 로직*, Samsung은 *14 nm급*입니다. *DRAM 공정*과는 *전혀 다른 fab line*에서 만들어집니다.

### TSV pitch와 microbump pitch를 *동일*하게 가정

TSV는 *die 내부*에서 *10 μm pitch*, microbump는 *die 간*에서 *55 μm pitch*입니다. die 내부에서 *TSV가 fan-out*되어 *microbump에 닿는* 구조입니다. *base die의 redistribution*이 그 매개입니다.

### "HBM stack을 *socket에 꽂을 수 있다*"

불가능합니다. HBM은 *interposer에 영구 접합*됩니다. *교체나 upgrade*는 불가능하고, *defective stack 하나*가 *GPU/NPU 전체를 폐기*시킬 수도 있습니다. 그래서 *KGSD*가 *비싸도 필수*입니다.

## 정리

- HBM stack은 *1 base die + 4·8·12·16 DRAM die*의 적층 구조입니다.
- 전체 stack 높이는 *720~775 μm*로 *cooling cold plate*에 맞춰진 엄격한 제약입니다.
- *base die*는 *로직 공정*으로 만든 *PHY·controller·test·refresh*의 집합입니다.
- TSV(Through-Silicon Via)는 *5 μm 직경, 50 μm 깊이*의 *수직 구리 비아*입니다. *stack당 1280~3000개*가 들어갑니다.
- microbump는 *die 간 연결*입니다. HBM3는 *55 μm pitch*, HBM4는 *9 μm hybrid bonding*입니다.
- *1024-bit bus*는 *16 channel × 2 pseudo channel*로 나뉘어 *명령 인터리브*를 가능하게 합니다.
- yield는 *die 수의 거듭제곱*으로 떨어지므로 *KGSD test와 redundancy repair*가 필수입니다.
- HBM stack은 *interposer에 영구 접합*되어 *교체가 불가능*합니다.

## 다음 편

[Ch 3: HBM2/HBM2E/HBM3/HBM3E 스펙 비교](/blog/embedded/hardware/hbm/chapter03-hbm-generations)에서는 *세대별 발전*을 *bandwidth·capacity·feature* 척도로 정리합니다. *HBM4*의 *2048-bit 인터페이스*가 *왜 필요했는지*도 함께 봅니다.

## 관련 항목

- [Ch 1: 고대역 메모리 개요](/blog/embedded/hardware/hbm/chapter01-overview)
- [Ch 3: HBM 세대 비교](/blog/embedded/hardware/hbm/chapter03-hbm-generations)
- [Ch 6: 열 설계와 전력 관리](/blog/embedded/hardware/hbm/chapter06-thermal-power)
- [UCIe Ch 6: 2.5D 패키징](/blog/embedded/hardware/ucie/chapter06-2-5d-packaging) — interposer 공유
- [UCIe Ch 7: 3D 패키징](/blog/embedded/hardware/ucie/chapter07-3d-packaging) — hybrid bonding 심화
- [BoW Ch 6: 패키징](/blog/embedded/hardware/bow/chapter06-packaging) — bump pitch와 yield
