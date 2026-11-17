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

> **"HBM은 *DRAM die를 위로 쌓고*, *TSV*로 수직으로 신호를 통과시킵니다."** — 한 stack은 *base die 하나* 위에 *DRAM die 여러 장*을 쌓은 구조입니다. die들은 *TSV(Through-Silicon Via)*와 *microbump*로 *수직 연결*되고, 맨 아래 *base die*가 GPU와 연결됩니다.

[Ch 1](/blog/embedded/hardware/hbm/chapter01-overview)에서 HBM이 *왜 GDDR과 갈렸는지*를 봤습니다. 핵심은 *1024-bit 광폭 bus*였습니다. 이번 장은 *그 1024-bit가 어떻게 한 stack 안에 들어가는지*입니다. *물리적으로 어떻게 적층*되는지, *전기 신호가 위로 어떻게 통과*하는지, *쌓는 장수가 늘면 수율 모델이 왜 불리해지는지*까지 봅니다.

## stack 단면

HBM3E 12-Hi stack 한 개를 *옆에서 잘라* 보면 다음과 같습니다. die 장수와 die 용량(24 Gb = 3 GB)은 [SK hynix의 2024년 9월 26일 12-Hi HBM3E 발표](https://news.skhynix.com/en/sk-hynix-begins-volume-production-of-the-world-first-12-layer-hbm3e/)의 *3 GB DRAM chip 12장* 구성을 따랐습니다.

![HBM3E 12-Hi stack 단면 — base die + 12 DRAM die + microbump](/images/blog/hardware/hbm/diagrams/ch02-stack.svg)

쌓는 die 수는 규격마다 정해져 있습니다. [JEDEC의 2022년 1월 27일 HBM3 발표](https://www.jedec.org/news/pressreleases/jedec-publishes-hbm3-update-high-bandwidth-memory-hbm-standard)는 4·8·12-Hi와 향후 16-Hi 확장 조항을 설명합니다. [2025년 4월 HBM4 발표](https://www.storagenewsletter.com/2025/04/17/jedec-and-industry-leaders-collaborate-to-release-jesd270-4-hbm4-standard/)는 4·8·12·16-Hi를 명시합니다. 그보다 앞선 [2018년 12월 17일 JESD235B 발표](https://www.jedec.org/news/pressreleases/jedec-updates-groundbreaking-high-bandwidth-memory-hbm-standard-0)는 HBM2에 2·4·8·12-Hi를 정의했습니다.

패키지 높이는 die 수만 늘려 해결할 수 없습니다. 앞의 SK hynix 발표는 12-Hi HBM3E의 DRAM die를 이전보다 *40% 얇게* 만들어, 8-Hi 제품과 *같은 두께*에 12장을 적층했다고 설명합니다. 이 수치는 해당 제품의 비교이며 모든 업체·세대에 적용되는 높이 규격은 아닙니다.

## base die의 역할

stack 맨 아래에 있는 *base die*는 host 칩(GPU/NPU)과 연결되는 die입니다. [SK hynix·TSMC의 2024년 4월 19일 발표](https://news.skhynix.com/en/sk-hynix-partners-with-tsmc-to-strengthen-hbm-technological-leadership/)는 HBM을 *TSV를 가진 base die 위에 core DRAM die를 쌓은 것*으로 설명하고, *맨 아래 base die가 HBM을 제어하는 GPU와 연결된다*고 적습니다. [Samsung의 2016년 1월 19일 HBM2 발표](https://news.samsung.com/global/samsung-begins-mass-producing-worlds-fastest-dram-based-on-newest-high-bandwidth-memory-hbm-interface)는 같은 die를 *buffer die*라고 부릅니다.

base die를 *어떤 공정*으로 만드는지도 같은 SK hynix 발표에 나옵니다. SK hynix는 HBM3E까지 base die를 *자체 기술*로 만들었고, 제한된 면적에 기능을 더 넣기 위해 HBM4 base die에 *TSMC의 로직 공정*을 채택할 계획이라고 밝혔습니다. 이는 2024년 당시 발표된 한 회사의 계획이며 다른 제조사의 공정 선택을 뜻하지 않습니다.

## TSV — 수직으로 통하는 신호

DRAM die가 *12장 쌓여 있는데*, 맨 위 die의 신호도 *base die까지 수직으로* 내려와야 합니다. 이것을 가능하게 하는 게 *TSV(Through-Silicon Via)*입니다.

![TSV 단면 — DRAM die를 관통하는 전극, 아래는 microbump로 다음 die에 연결](/images/blog/hardware/hbm/diagrams/ch02-tsv.svg)

SK hynix는 TSV를 *base logic chip과 DRAM chip을 수직으로 관통하는 전극으로 위아래 chip을 잇는 기술*로 정의합니다. 개수도 공개 자료에서 규모를 알 수 있습니다. SK hynix의 2024년 4월 발표는 *chip 설계에 따라 수천 개*라고 적고, Samsung의 2016년 발표는 8 Gb HBM2 die 하나에 *TSV hole이 5,000개 넘게* 있어 8 Gb TSV DDR4 die의 *36배 이상*이라고 밝힙니다. 같은 Samsung 발표는 die 사이를 *TSV hole과 microbump*로 수직 연결한다고 설명합니다.

## microbump — die 간 연결

![microbump 단면 — die A의 TSV 출구 pad와 die B의 아랫면 pad가 솔더 bump로 결합](/images/blog/hardware/hbm/diagrams/ch02-microbump.svg)

die 사이는 *microbump*로 잇고, 그 틈을 보호 재료로 채웁니다. SK hynix는 이 과정에 *MR-MUF(Mass Reflow Molded Underfill)*를 씁니다. 12-Hi HBM3E 발표의 정의에 따르면 MR-MUF는 chip을 쌓은 뒤 *액체 보호재를 chip 사이에 주입해 굳히는* 공정이고, chip마다 film형 재료를 까는 방식보다 열 방출에 유리하다고 합니다. 같은 발표는 Advanced MR-MUF로 *이전 세대 대비 열 방출 성능을 10%* 높였다고 적습니다.

이 글의 단면도는 microbump 접합을 그린 것입니다. bump의 pitch·직경은 이 글에서 연 벤더 발표문에 나오지 않아 그림에도 수치를 넣지 않았습니다. 구리끼리 직접 붙이는 hybrid bonding 같은 다른 접합 방식의 도입 여부는 제품별 발표문으로 확인할 사안이라, JEDEC 세대 이름만으로 정하지 않습니다.

## Channel과 Pseudo Channel

1024-bit bus는 *내부적으로 여러 channel*로 나뉩니다.

![HBM3 stack → 16 channels(64-bit) → 2 pseudo channels(32-bit) each](/images/blog/hardware/hbm/diagrams/ch02-channel-structure.svg)

| 세대 | Channel | Pseudo Channel | 출처 |
|------|---------|----------------|------|
| HBM2 | 128-bit × 8 | 64-bit × 16 | JESD235A·B 발표(8 channel, 1024-bit), [AMD PG276](https://docs.amd.com/r/en-US/pg276-axi-hbm/Features)(channel당 64-bit pseudo channel 2개) |
| HBM3 | 64-bit × 16 | 32-bit × 32 | JEDEC HBM3 발표(16 channel, channel당 PC 2개), [JESD238B.01 페이지](https://www.jedec.org/standards-documents/docs/jesd238a)(channel당 64-bit) |
| HBM4 | 64-bit × 32 (2048-bit) | 32-bit × 64 | HBM4 발표(32 channel, channel당 PC 2개), [JESD270-4A 페이지](https://www.jedec.org/standards-documents/docs/jesd270-4)(channel당 64-bit) |

HBM3·HBM4의 pseudo channel 폭 32-bit는 `64 ÷ 2`로 계산한 값입니다.

*Pseudo Channel*은 같은 channel을 *둘로 나눠 각자 명령*을 실행하게 한 구조입니다. AMD PG276은 HBM2 stack을 *독립 channel 8개*로, 각 channel을 *64-bit pseudo channel 2개*로 나누고, pseudo channel 하나는 *stack 용량의 1/16인 자기 구역*만 접근한다고 설명합니다. [JEDEC의 2016년 1월 12일 JESD235A 발표](https://www.jedec.org/news/pressreleases/jedec-updates-groundbreaking-high-bandwidth-memory-hbm-standard)는 pseudo channel 구조를 도입한 목적을 *유효 대역폭 개선*으로 적습니다.

## yield — 쌓을수록 불리해지는 수율 모델

수율을 생각할 때는 선별 전 die 확률과 선별 후 조립 수율을 구별해야 합니다. **각 die의 양품 확률이 독립적으로 95%이고, 선별·수리·접합 손실이 없다는 가상 모델**에서는 전체 die가 양품일 확률이 `0.95^N`(N = base + DRAM die 수)입니다. 다음 표는 실제 HBM 제조 수율이 아닙니다.

| stack | N (base+DRAM) | 가정상 yield |
|-------|---------------|-------------|
| 4-Hi | 5 | 77.4% |
| 8-Hi | 9 | 63.0% |
| 12-Hi | 13 | 51.3% |
| 16-Hi | 17 | 41.8% |

95%는 계산용 가정입니다. 이 모델은 die를 쌓기 전에 걸러 내는 선별 시험이나 결함 수리를 전혀 반영하지 않으므로, 실제 생산 수율로 읽으면 안 됩니다. 이 모델이 보여 주는 것은 *곱하는 항이 늘수록 결과가 지수적으로 줄어든다*는 형태뿐입니다.

다음 계산기는 독립 die 확률만 곱합니다. Node.js v24.21.0에서 실행한 결과가 위 표의 값입니다.

```js title="hbm-independent-yield.mjs"
export function independentYield(probability, dramDies) {
  if (!Number.isFinite(probability) || probability < 0 || probability > 1 ||
      !Number.isInteger(dramDies) || dramDies < 1 || dramDies > 16) {
    throw new RangeError('probability 0..1 and DRAM dies 1..16 required');
  }
  return probability ** (dramDies + 1); // base die 1개 포함
}
for (const n of [4, 8, 12, 16]) console.log(`${n}-Hi`, (100 * independentYield(0.95, n)).toFixed(1));
```

```text
$ node hbm-independent-yield.mjs
4-Hi 77.4
8-Hi 63.0
12-Hi 51.3
16-Hi 41.8
```

## 자주 하는 실수

### "더 많이 쌓으면 항상 좋다"

같은 밀도의 DRAM die를 쓴다면 12-Hi → 16-Hi는 *capacity가 `16 ÷ 12 ≈ 1.33`배* 늘지만, 위 가정(die 95%)에서는 stack yield가 51.3%에서 41.8%로 떨어집니다. 높이도 제약입니다. SK hynix가 12-Hi를 8-Hi 두께에 맞추려고 die를 40% 얇게 만든 것이 그 예입니다.

### base die가 *항상 로직 공정*이라는 오해

앞의 SK hynix 발표는 HBM3E까지 *자체 기술*로 base die를 만들었다고 밝힙니다. TSMC 로직 공정은 HBM4 base die에 대한 계획입니다. 다른 제조사의 공정을 이 사례에서 추론하면 안 됩니다.

### "HBM4부터 hybrid bonding을 쓴다"

JEDEC의 HBM4 발표에는 접합 방식이 나오지 않습니다. 접합 공정은 제조사별 제품 발표에서 확인하는 항목이며, 인터페이스 세대 이름과 같은 것으로 취급하면 안 됩니다.

### "HBM stack을 *socket에 꽂을 수 있다*"

SK hynix의 CoWoS 설명은 GPU와 HBM을 *interposer 위에서 하나의 module로 통합*하는 2.5D 패키징입니다. DIMM처럼 메모리만 따로 꽂고 빼는 구조가 아닙니다.

## 정리

- HBM stack은 *base die 하나 + DRAM die 여러 장*(HBM2 최대 12-Hi, HBM3 12-Hi와 16-Hi 확장 조항, HBM4 최대 16-Hi)의 적층 구조입니다.
- SK hynix의 12-Hi HBM3E는 die를 40% 얇게 만들어 이전 8-Hi와 같은 두께를 구현했습니다.
- *base die*는 GPU와 연결되는 맨 아래 die입니다. SK hynix는 HBM3E까지 자체 기술, HBM4에서 TSMC 로직 공정 채택 계획을 밝혔습니다.
- *TSV*는 die를 관통하는 전극(8 Gb HBM2 die에 5,000개 이상), *microbump*는 die 사이 연결입니다.
- 1024-bit bus는 HBM3에서 *64-bit channel 16개*, channel마다 *32-bit pseudo channel 2개*로 나뉩니다.
- 독립 die 확률의 거듭제곱 모델은 형태만 보여 주며 실제 생산 수율이 아닙니다.

## 다음 편

[Ch 3: HBM2/HBM2E/HBM3/HBM3E 스펙 비교](/blog/embedded/hardware/hbm/chapter03-hbm-generations)에서는 *세대별 발전*을 *bandwidth·capacity·feature* 척도로 정리합니다. *HBM4*가 pin rate 대신 *2048-bit 인터페이스*로 대역폭을 올린 방식도 함께 봅니다.

## 관련 항목

- [Ch 1: 고대역 메모리 개요](/blog/embedded/hardware/hbm/chapter01-overview)
- [Ch 3: HBM 세대 비교](/blog/embedded/hardware/hbm/chapter03-hbm-generations)
- [Ch 6: 열 설계와 전력 관리](/blog/embedded/hardware/hbm/chapter06-thermal-power)
