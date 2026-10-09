---
title: "HBM 3D 스택 구조 분해 — TSV·Microbump·Base Die의 역할"
slug: "embedded/hardware/hbm/chapter02-hbm-stack"
date: 2026-05-16T09:02:00
description: "Base die + DRAM die stack — 3D 메모리의 구성요소와 TSV·microbump의 역할."
series: "HBM·GDDR 심화"
seriesOrder: 2
tags: [hbm, tsv, 3d-stack, base-die]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"HBM은 *DRAM die를 위로 쌓고*, *TSV*로 수직으로 신호를 통과시킵니다."** — 한 stack은 *base die 하나* 위에 *DRAM die 여러 장*을 쌓은 구조입니다. die들은 *TSV(Through-Silicon Via)*로 *수직 연결*되고, *base die*가 host 칩과 맞닿는 *PHY*를 담당합니다.

[Ch 1](/blog/embedded/hardware/hbm/chapter01-overview)에서 HBM이 *왜 GDDR과 갈렸는지*를 봤습니다. 핵심은 *1024-bit 광폭 bus*였습니다. 이번 장은 *그 1024-bit가 어떻게 한 stack 안에 들어가는지*입니다. *물리적으로 어떻게 적층*되는지, *전기 신호가 위로 어떻게 통과*하는지, *왜 yield가 어려운지*까지 봅니다.

## stack 단면

HBM3E 12-Hi stack 한 개를 *옆에서 잘라* 보면 다음과 같습니다.

![HBM3E 12-Hi stack 단면 — base die + 12 DRAM die + microbump](/images/blog/hardware/hbm/diagrams/ch02-stack.svg)

쌓는 die 수는 규격마다 정해져 있습니다. HBM3는 4·8·12-Hi(16-Hi 확장 조항), HBM4는 4·8·12·16-Hi입니다.

stack의 *총 높이*는 GPU/NPU die와 함께 *같은 cold plate*에 닿아야 하므로 *엄격한 제약*입니다. JEDEC 기준 nominal package 높이는 HBM3E까지 *720 μm*, HBM4 12·16-Hi는 *775 μm*로 완화됐습니다. SK hynix는 12-Hi HBM3E를 만들면서 DRAM die를 *40% 얇게* 해 8-Hi 제품과 *같은 두께*에 12장을 쌓았습니다.

## base die의 역할

stack 맨 아래에 있는 *base die*는 host 칩(GPU/NPU)과 맞닿는 die입니다. 1024-bit 데이터와 command/address 신호가 *base die의 PHY*를 거쳐 위의 DRAM die들로 갑니다.

base die를 *어떤 공정*으로 만드는지는 세대와 회사에 따라 다릅니다. SK hynix는 *HBM3E까지 자체 공정*으로 base die를 만들었고, *HBM4부터 TSMC의 로직 공정*으로 넘어갔습니다. base die에 넣는 로직과 제어 기능이 늘면서 로직 공정이 필요해졌기 때문입니다. 2024년 4월 두 회사가 이를 위한 MOU를 맺었습니다.

## TSV — 수직으로 통하는 신호

DRAM die가 *12장 쌓여 있는데*, 맨 위 die의 신호도 *base die까지 수직으로* 내려와야 합니다. 이것을 가능하게 하는 게 *TSV(Through-Silicon Via)*입니다.

![TSV 단면 — DRAM die 안의 수직 구리 기둥, 아래는 microbump로 다음 die에 연결](/images/blog/hardware/hbm/diagrams/ch02-tsv.svg)

TSV는 *실리콘 본체를 관통하는 구리 비아*입니다. die 하나 안의 수직 연결을 맡고, die와 die 사이는 *microbump*가 잇습니다. stack당 TSV 개수와 용도별 분배는 벤더가 공개하지 않습니다.

## microbump — die 간 연결

![microbump 단면 — die A의 TSV 출구 pad와 die B의 아랫면 pad가 솔더 bump로 결합](/images/blog/hardware/hbm/diagrams/ch02-microbump.svg)

die 사이는 *솔더 microbump*로 잇고, 그 틈을 *underfill*로 채웁니다. SK hynix는 이 과정에 *MR-MUF(Mass Reflow Molded Underfill)*를 씁니다.

솔더 없이 *구리끼리 직접 붙이는 hybrid bonding*은 bump보다 간격을 훨씬 좁힐 수 있어 높은 stack의 후보로 거론됐습니다. 하지만 JEDEC이 HBM4 높이를 775 μm로 완화하면서 *16-Hi HBM4도 기존 bonding 기술로 만들 수 있게* 됐고, HBM4는 *microbump를 유지*했습니다.

세대별 microbump pitch와 bump 직경은 벤더 공개 자료에서 확인하지 못했습니다.

## Channel과 Pseudo Channel

1024-bit bus는 *내부적으로 여러 channel*로 나뉩니다.

![HBM3 stack → 16 channels(64-bit) → 2 pseudo channels(32-bit) each](/images/blog/hardware/hbm/diagrams/ch02-channel-structure.svg)

| 세대 | Channel | Pseudo Channel |
|------|---------|----------------|
| HBM2 | 128-bit × 8 | 64-bit × 16 |
| HBM3 | 64-bit × 16 | 32-bit × 32 |
| HBM4 | 64-bit × 32 (2048-bit) | channel당 2개 |

*Pseudo Channel*은 같은 channel을 *둘로 나눠 각자 명령*을 실행하게 한 구조입니다. 두 PC는 *address·command bus를 공유*하지만 명령은 *각자 해석*합니다. 한쪽 PC가 bank conflict로 멈춘 동안 *다른 PC가 일을 계속*할 수 있습니다.

## yield — HBM이 어려운 이유

die를 여러 장 쌓으면 *한 장만 불량이어도 stack이 불량*이 됩니다. 계산을 위해 die 하나의 양품률을 *95%로 가정*하면 stack 양품률은 `0.95^N`(N = base + DRAM die 수)입니다.

| stack | N (base+DRAM) | 가정상 yield |
|-------|---------------|-------------|
| 4-Hi | 5 | 77.4% |
| 8-Hi | 9 | 63.0% |
| 12-Hi | 13 | 51.3% |
| 16-Hi | 17 | 41.8% |

95%는 계산용 가정입니다. 실제로는 die를 쌓기 전에 *양품 die(KGD, Known Good Die)*만 골라내고, 불량 row·column을 *redundancy*로 대체해 보정합니다. 그래도 *쌓는 장수가 늘수록* 위험은 거듭제곱으로 커집니다.

```text
HBM 제조 흐름 (개략)

1. DRAM wafer 제조, wafer 단위 test
2. 양품 die(KGD) 선별
3. base die 제조와 test
4. die를 한 층씩 쌓아 TSV·microbump로 접합
5. 완성 stack test
6. GPU/NPU die와 함께 interposer 위에 패키징
```

완성 stack test에서 불량이 나면 *그 stack에 쓴 die 전부*를 잃습니다. 그래서 *쌓기 전 KGD 선별*이 중요합니다.

## 자주 하는 실수

### "더 많이 쌓으면 항상 좋다"

12-Hi → 16-Hi는 *capacity가 33%* 늘지만, 위 가정(die 95%)에서는 stack yield가 51.3%에서 41.8%로 떨어집니다. 쌓는 장수는 *용량과 수율·높이 제약*의 균형으로 정해집니다.

### base die가 *항상 로직 공정*이라는 오해

SK hynix는 HBM3E까지 base die를 *자체 공정*으로 만들었고, HBM4부터 *TSMC 로직 공정*을 씁니다. 세대와 회사마다 다릅니다.

### "HBM4부터 hybrid bonding을 쓴다"

JEDEC이 HBM4 높이를 775 μm로 완화하면서 HBM4는 *microbump*를 유지했습니다.

### "HBM stack을 *socket에 꽂을 수 있다*"

불가능합니다. HBM은 *interposer에 영구 접합*됩니다. *교체나 upgrade*가 안 되고, *불량 stack 하나*가 *GPU/NPU 패키지 전체*를 버리게 만들 수 있습니다. 그래서 *쌓기 전 test*가 비싸도 필수입니다.

## 정리

- HBM stack은 *base die 하나 + DRAM die 여러 장*(HBM3 4·8·12-Hi, HBM4 최대 16-Hi)의 적층 구조입니다.
- 총 높이는 *cold plate*에 맞춰진 엄격한 제약입니다. JEDEC nominal은 HBM3E까지 *720 μm*, HBM4 *775 μm*입니다.
- *base die*는 host와 맞닿는 *PHY*를 담당합니다. SK hynix는 HBM4부터 base die를 *TSMC 로직 공정*으로 만듭니다.
- *TSV*는 die 안의 수직 연결, *microbump*는 die 사이 연결입니다. HBM4도 microbump를 유지했습니다.
- 1024-bit bus는 HBM3에서 *64-bit channel 16개*, channel마다 *32-bit pseudo channel 2개*로 나뉩니다.
- yield는 *die 수의 거듭제곱*으로 떨어지므로 *쌓기 전 KGD 선별과 redundancy*가 필수입니다.
- HBM stack은 *interposer에 영구 접합*되어 *교체가 불가능*합니다.

## 다음 편

[Ch 3: HBM2/HBM2E/HBM3/HBM3E 스펙 비교](/blog/embedded/hardware/hbm/chapter03-hbm-generations)에서는 *세대별 발전*을 *bandwidth·capacity·feature* 척도로 정리합니다. *HBM4*의 *2048-bit 인터페이스*가 *왜 필요했는지*도 함께 봅니다.

## 관련 항목

- [Ch 1: 고대역 메모리 개요](/blog/embedded/hardware/hbm/chapter01-overview)
- [Ch 3: HBM 세대 비교](/blog/embedded/hardware/hbm/chapter03-hbm-generations)
- [Ch 6: 열 설계와 전력 관리](/blog/embedded/hardware/hbm/chapter06-thermal-power)
- UCIe Ch 6: 2.5D 패키징 — interposer 공유
- UCIe Ch 7: 3D 패키징 — hybrid bonding 심화
- BoW Ch 6: 패키징 — bump pitch와 yield
