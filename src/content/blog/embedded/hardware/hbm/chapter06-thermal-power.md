---
title: "HBM의 열과 냉각 — 온도 관측과 Clock 제한 사유 해석"
slug: "embedded/hardware/hbm/chapter06-thermal-power"
date: 2026-05-16T09:06:00
description: "HBM stack의 전압·열 구조, 온도와 refresh, 냉각 방식과 thermal throttling."
series: "HBM·GDDR 심화"
seriesOrder: 6
tags: [hbm, thermal, power, refresh]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"HBM은 *작은 면적에 die를 여러 장 쌓은* 메모리라 열 관리가 설계 항목이 됩니다."** — HBM 컨트롤러는 *온도에 따라 refresh 빈도를 바꾸고*, NVIDIA GPU는 메모리 온도가 최대 동작 온도를 넘지 않도록 *clock을 낮춥니다*. GPU 72개를 rack 하나에 묶은 GB200 NVL72는 *liquid-cooled* 설계입니다.

[Ch 5](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)에서 *bandwidth가 어디서 깎이는지*를 봤습니다. 이번 장에서는 *그 bandwidth를 유지하는 데 드는 전력*과 *그 전력이 만드는 열*을 봅니다.

## 전압부터

JEDEC HBM3(JESD238)는 동작 전압(operating voltage)을 *1.1 V*로 낮추고, I/O는 *0.4 V low-swing* 신호를 씁니다. HBM4(JESD270-4)는 core 전압(VDDC)이 *1.0 V 또는 1.05 V*, I/O 전압(VDDQ)은 *0.7·0.75·0.8·0.9 V* 중 벤더가 고릅니다. 수치는 [JEDEC의 2022년 1월 27일 HBM3 발표](https://www.jedec.org/news/pressreleases/jedec-publishes-hbm3-update-high-bandwidth-memory-hbm-standard)와 [2025년 4월 HBM4 발표](https://www.storagenewsletter.com/2025/04/17/jedec-and-industry-leaders-collaborate-to-release-jesd270-4-hbm4-standard/)의 범위입니다. 0.4 V 신호 진폭과 VDDQ 전원 전압을 같은 항목으로 비교하면 안 됩니다. HBM3 발표는 이 전압들의 목적을 *에너지 효율 개선*으로, HBM4 발표는 *전력 소비 감소와 에너지 효율 개선*으로 적습니다. stack 하나의 세부 전력 분해는 이 글에서 연 발표문에 나오지 않습니다.

## stack의 열 구조

HBM stack은 *base die 위에 DRAM die를 여러 장* 쌓은 구조입니다. 아래 그림은 그 위를 cold plate가 덮는다고 둔 단순화 단면입니다. SK hynix는 [12-Hi HBM3E 발표](https://news.skhynix.com/en/sk-hynix-begins-volume-production-of-the-world-first-12-layer-hbm3e/)에서 die 사이를 채우는 Advanced MR-MUF 공정으로 *이전 세대보다 열 방출 성능을 10%* 높였다고 밝혀, 적층 사이의 재료가 열 경로의 일부라는 것을 보여 줍니다.

![HBM stack 단면 — cold plate, DRAM die, base die, interposer](/images/blog/hardware/hbm/diagrams/ch06-heat-flow.svg)

이 단순화 모델에서는 *아래쪽 die의 열이 위의 die들을 거쳐* cold plate에 닿습니다. 그림은 위쪽 경로 하나만 그렸으므로, 그림만으로 특정 die가 가장 뜨겁다고 결론낼 수는 없습니다.

## Refresh — 온도와 맞물리는 비용

DRAM은 데이터를 유지하려고 주기적으로 *refresh*합니다. HBM에서 온도와 refresh가 맞물린다는 것은 두 1차 자료에 나옵니다.

| 자료 | 내용 |
|------|------|
| [JEDEC JESD235A 발표 (2016-01-12)](https://www.jedec.org/news/pressreleases/jedec-updates-groundbreaking-high-bandwidth-memory-hbm-standard) | DRAM 온도가 *신뢰 동작 수준을 넘으면 controller에 알리는* 기능을 새로 정의 |
| [AMD PG276](https://docs.amd.com/r/en-US/pg276-axi-hbm/Features) HBM 컨트롤러 | *refresh cycle은 controller가 처리*, *temperature controlled refresh rates*, overhead를 줄이는 *hidden single row refresh* 옵션 |

컨트롤러가 온도에 따라 refresh 빈도를 바꾸고 refresh overhead를 줄이는 옵션까지 두는 것은, refresh가 대역폭을 쓰는 작업이기 때문입니다. HBM part별 온도 구간·refresh interval·소요 시간은 JEDEC 표준 원문에 있고 이 글에서는 열지 않았으므로, 온도에 따른 refresh 손실 백분율은 계산하지 않습니다.

## Cooling 솔루션

HBM은 *interposer 위*에 *GPU/NPU 옆*에 붙어 있어서, cooling이 *GPU die와 HBM을 함께* 처리해야 합니다.

![lid가 있는 GPU 패키지의 cooling stack 예 — cold plate에서 BGA까지 단면](/images/blog/hardware/hbm/diagrams/ch06-cooling-stack.svg)

| 제품 | 출처가 밝힌 전력·냉각 |
|------|-----------|
| NVIDIA A100 (SXM4) | TDP 400 W ([Ampere 백서](https://images.nvidia.com/aem-dam/en-zz/Solutions/data-center/nvidia-ampere-architecture-whitepaper.pdf)) |
| NVIDIA H100 SXM / H100 NVL | SXM 최대 700 W, NVL(PCIe) 350~400 W·*dual-slot air-cooled* ([H100 사양](https://www.nvidia.com/en-us/data-center/h100/)) |
| NVIDIA DGX B200 (B200 × 8) | 시스템 최대 약 14.3 kW, *air-cooled* |
| NVIDIA GB200 NVL72 | rack 단위 *liquid-cooled* (Blackwell GPU 72개) |

A100 SXM4와 H100 SXM의 냉각 방식, GB200 NVL72의 rack 전력은 인용한 NVIDIA 자료에 나오지 않아 적지 않았습니다.

B200을 쓴다고 해서 곧바로 liquid cooling이 필요한 것은 아닙니다. [DGX B200 제품 사양](https://www.nvidia.com/en-eu/data-center/dgx-b200/)은 시스템 최대 *~14.3 kW*를 적고, 성능 비교 각주에서 비교 대상을 *DGX B200 air-cooled*로 부릅니다. [GB200 NVL72](https://www.nvidia.com/en-us/data-center/gb200-nvl72/)는 *Grace CPU 36개와 Blackwell GPU 72개를 묶은 rack-scale liquid-cooled 설계*입니다. 같은 Blackwell 세대에서 두 냉각 방식이 모두 나온 사례입니다.

## Thermal throttling

GPU는 메모리 온도가 최대 동작 온도를 넘지 않도록 *clock을 낮춥니다*. [nvidia-smi 문서](https://docs.nvidia.com/deploy/nvidia-smi/index.html)는 *Memory Current Temp*를 *지원하는 장치에서만* 제공한다고 적고, *Memory Max Operating T.Limit Temp*를 *GPU SW가 열 조건에 맞춰 메모리 clock을 최적화하기 시작하는 온도*로 정의합니다. 같은 문서는 `-q`의 `-d` 표시 항목으로 TEMPERATURE와 PERFORMANCE를 두고, clock을 낮추는 이유를 *Clocks Event Reasons* 항목으로 설명합니다. 이 글은 NVIDIA GPU가 없는 환경이라 아래 명령의 출력을 싣지 않습니다.

```bash
nvidia-smi -q -d TEMPERATURE,PERFORMANCE
```

문서는 Clocks Event Reasons가 모두 *Not Active*이면 clock이 가능한 최고로 돌고 있다는 뜻이라고 설명합니다. 센서를 지원하지 않는 장치의 N/A를 온도 0이나 제한 없음으로 처리하면 안 됩니다.

API로 받는 제한 사유는 비트마스크입니다. [NVIDIA NVML 헤더(nvidia-settings 620.70.06)](https://github.com/NVIDIA/nvidia-settings/blob/505c69475ed90a19c97660dc4217449ef07705fc/src/nvml.h)의 정의 중 세 비트만 설명합니다.

| 비트 | 이름 | 의미 |
|------|------|------|
| `0x04` | `nvmlClocksEventReasonSwPowerCap` | 소프트웨어 전력 제한 |
| `0x20` | `nvmlClocksEventReasonSwThermalSlowdown` | GPU 온도와 *메모리 온도*가 각자의 최대 동작 온도를 넘지 않도록 clock을 조정 |
| `0x40` | `nvmlClocksThrottleReasonHwThermalSlowdown` | 온도가 너무 높아 core clock을 *2배 이상* 낮춤 |

nvml.h의 주석은 `0x20`이 *GPU 온도*와 *메모리 온도* 두 조건을 함께 지킨다고 적으므로, 이 비트 하나로 **HBM이 원인이라고 특정할 수 없습니다**. 각 비트는 독립이라 `0x04`와 `0x20`이 한 mask에 함께 켜질 수 있습니다(`0x24`).

다음 코드는 수집한 64-bit hex mask에서 세 비트와 나머지 비트를 구별합니다. 원인 진단기는 아닙니다.

```js title="hbm-clock-mask.mjs"
export function clockMask(text) {
  if (typeof text !== "string" || !/^0x[0-9a-f]{1,16}$/i.test(text)) {
    throw new RangeError("64-bit hexadecimal mask required");
  }
  const mask = BigInt(text);
  return {
    swPowerCap: (mask & 4n) !== 0n,
    swThermal: (mask & 32n) !== 0n,
    hwThermal: (mask & 64n) !== 0n,
    otherBits: mask & ~100n
  };
}
for (const m of ["0x0000000000000024", "0x0000000000000004", "0x0000000000000061"]) console.log(m, clockMask(m));
```

Node.js v24.21.0에서 세 mask를 넣은 출력입니다. 100은 `4 + 32 + 64`라 `~100n`이 세 비트를 뺀 나머지를 남깁니다. 세 번째 mask의 남은 `1n`은 nvml.h에서 `0x1`인 `nvmlClocksEventReasonGpuIdle`입니다.

```text
$ node hbm-clock-mask.mjs
0x0000000000000024 { swPowerCap: true, swThermal: true, hwThermal: false, otherBits: 0n }
0x0000000000000004 { swPowerCap: true, swThermal: false, hwThermal: false, otherBits: 0n }
0x0000000000000061 { swPowerCap: false, swThermal: true, hwThermal: true, otherBits: 1n }
```

## 자주 하는 실수

### "B200부터는 liquid cooling이 필수다"

NVIDIA는 DGX B200을 *air-cooled*로 부릅니다. liquid-cooled로 나온 것은 GB200 NVL72처럼 *GPU 72개를 rack 하나에 묶은* 설계입니다.

### clock 제한 비트를 잘못 읽기

`0x04`(SwPowerCap)는 nvidia-smi 문서상 *전력을 너무 많이 써서* clock을 낮추는 사유입니다. 열 문제가 아닙니다. `0x20`만으로 GPU core와 메모리 중 어느 쪽 온도가 원인인지 알 수 없습니다. `0x40`은 별도의 하드웨어 열 제한 사유입니다.

### *RTX 카드의 GDDR cooling*과 *HBM cooling*을 동일시

RTX 4090의 GDDR6X는 32-bit 컨트롤러 12개에 붙는 *PCB 위 개별 칩*이고([Ch 4](/blog/embedded/hardware/hbm/chapter04-gddr)), H100 SXM의 HBM3는 *패키지 안 stack 5개*에 DRAM die를 쌓아 모은 형태입니다([Ch 2](/blog/embedded/hardware/hbm/chapter02-hbm-stack)). 같은 메모리 용량이라도 열원이 놓이는 위치와 밀도가 다릅니다.

## 정리

- HBM3는 동작 전압 1.1 V·host 인터페이스 0.4 V low-swing, HBM4는 VDDC 1.0·1.05 V로 전압을 낮춰 왔습니다.
- 위쪽 cold plate만 둔 단순화 모델에서는 *아래 die의 열이 위 die를 지나* cold plate로 갑니다.
- HBM 컨트롤러는 *온도에 따라 refresh 빈도를 바꾸고*(AMD PG276), JESD235A는 DRAM 과열을 controller에 알리는 기능을 정의했습니다.
- 같은 Blackwell 세대에서 DGX B200은 air-cooled, GPU 72개를 묶은 GB200 NVL72는 liquid-cooled입니다.
- NVML의 `SwThermalSlowdown`(0x20)은 GPU 또는 메모리 열 제한이며 HBM 원인 단정에 충분하지 않습니다.

## 다음 편

[Ch 7: 메모리 컨트롤러 인터페이스](/blog/embedded/hardware/hbm/chapter07-memory-controller)에서는 *bank·row·column 계층*, *command scheduling*, *address mapping* 같은 *컨트롤러 설계*의 핵심을 다룹니다.

## 관련 항목

- [Ch 2: HBM 스택 구조와 TSV](/blog/embedded/hardware/hbm/chapter02-hbm-stack)
- [Ch 5: 대역폭 계산과 병목 분석](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)
- [Ch 7: 메모리 컨트롤러 인터페이스](/blog/embedded/hardware/hbm/chapter07-memory-controller)
