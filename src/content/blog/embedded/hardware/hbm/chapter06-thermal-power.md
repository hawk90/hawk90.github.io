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

> **"HBM은 *작은 면적에 die를 여러 장 쌓은* 메모리라 열이 빠지기 어렵습니다."** — 온도가 오르면 DRAM은 *refresh를 더 자주* 해야 하고, GPU는 메모리 온도가 한계를 넘으면 *clock을 낮춥니다*. 그래서 HBM 시스템에서는 *cooling이 곧 대역폭 관리*입니다. GPU를 rack 하나에 많이 몰아넣는 시스템(GB200 NVL72)은 *liquid cooling*으로 설계됐습니다.

[Ch 5](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)에서 *bandwidth가 어디서 깎이는지*를 봤습니다. 이번 장에서는 *그 bandwidth를 유지하는 데 드는 전력*과 *그 전력이 만드는 열*을 봅니다.

## 전압부터

JEDEC HBM3(JESD238)는 core 전압을 *1.1 V*로 낮추고, I/O는 *0.4 V low-swing* 신호를 씁니다. HBM4(JESD270-4)는 core 전압(VDDC)이 *1.0 V 또는 1.05 V*, I/O 전압(VDDQ)은 *0.7·0.75·0.8·0.9 V* 중 벤더가 고릅니다. 수치는 [HBM3 최초 발표](https://www.businesswire.com/news/home/20220127005320/en/)와 [HBM4 최초 발표](https://www.businesswire.com/news/home/20250416843598/en/)의 범위입니다. 0.4 V 신호 진폭과 VDDQ 전원 전압을 같은 항목으로 비교하면 안 됩니다. 세대가 바뀔 때마다 전압을 낮추는 이유는 같은 대역폭을 *더 적은 전력*으로 내기 위해서입니다. stack 하나의 세부 전력 분해는 벤더가 공개하지 않습니다.

## stack의 열 구조

HBM stack은 *base die 위에 DRAM die를 여러 장* 쌓고, 그 위를 cold plate가 덮는 구조입니다.

![HBM stack 단면 — cold plate, DRAM die, base die, interposer](/images/blog/hardware/hbm/diagrams/ch06-heat-flow.svg)

die를 여러 장 쌓았기 때문에 *상부 냉각 경로만 단순화하면 아래쪽 die의 열은 위의 die들을 거쳐* cold plate에 닿습니다. 실제 온도 분포는 재료·계면 열저항·전력 분포·상하부 열 경로의 모델과 측정이 필요합니다. 그림만으로 특정 die가 가장 뜨겁다고 결론낼 수는 없습니다.

## Refresh — 온도와 맞물리는 비용

DRAM 데이터는 *capacitor*에 *전하 형태*로 저장됩니다. *시간이 지나면 leakage*로 사라지므로 *주기적인 refresh*로 다시 채웁니다. leakage는 *온도가 오를수록 빨라지므로*, 뜨거운 DRAM은 *refresh를 더 자주* 해야 합니다. refresh 중인 bank는 read·write를 받을 수 없으니, 온도가 오르면 *쓸 수 있는 대역폭이 줄고* refresh 전력은 늘어납니다.

이 장에서는 특정 HBM part의 온도 구간·refresh interval·소요 시간을 검증하지 않았습니다. 따라서 온도만으로 refresh 손실의 백분율을 계산하지 않습니다.

## Cooling 솔루션

HBM은 *interposer 위*에 *GPU/NPU 옆*에 붙어 있어서, cooling이 *GPU die와 HBM을 함께* 처리해야 합니다.

![lid가 있는 GPU 패키지의 cooling stack 예 — cold plate에서 BGA까지 단면](/images/blog/hardware/hbm/diagrams/ch06-cooling-stack.svg)

| 제품 | TDP / 전력 | Cooling |
|------|-----------|---------|
| NVIDIA A100 (SXM) | 400 W | TBD |
| NVIDIA H100 SXM | 최대 700 W | TBD |
| NVIDIA DGX B200 (B200 × 8) | 시스템 최대 약 14.3 kW | 공랭(air-cooled) 구성 |
| NVIDIA GB200 NVL72 | TBD | rack 단위 liquid cooling (Blackwell GPU 72개) |

B200을 쓴다고 해서 곧바로 liquid cooling이 필요한 것은 아닙니다. [DGX B200 제품 사양](https://www.nvidia.com/en-eu/data-center/dgx-b200/)은 공랭 구성과 시스템 최대 약 14.3 kW를 설명하며, [GB200 NVL72](https://www.nvidia.com/en-us/data-center/gb200-nvl72/)는 72 GPU liquid-cooled rack 설계입니다. 이는 두 제품의 설계 사례이며 모든 시스템의 냉각 방식을 rack 밀도 하나로 결정하는 규칙은 아닙니다.

## Thermal throttling

GPU는 메모리 온도가 최대 동작 온도를 넘지 않도록 *clock을 낮춥니다*. NVIDIA GPU에서는 `nvidia-smi`로 메모리 온도와 clock 제한 사유를 함께 볼 수 있습니다.

먼저 driver와 지원 query를 확인합니다. [nvidia-smi 문서](https://docs.nvidia.com/deploy/nvidia-smi/index.html)는 모든 제품이 메모리 온도 센서를 지원하지 않음을 명시합니다. 아래는 지원 query가 확인된 버전용 명령이며 출력은 이 환경에서 수집하지 않았습니다.

```bash
nvidia-smi --version
nvidia-smi --help-query-gpu
nvidia-smi --query-gpu=temperature.memory,clocks_event_reasons.active --format=csv
```

지원하지 않는 field·N/A·수집 실패를 온도 0 또는 제한 없음으로 처리하면 안 됩니다. 구버전의 이름은 로컬 help에서 확인합니다.

`clocks_event_reasons.active`는 비트마스크입니다. [NVIDIA NVML 헤더](https://github.com/NVIDIA/nvidia-settings/blob/main/src/nvml.h)의 정의 중 세 비트만 설명합니다.

| 비트 | 이름 | 의미 |
|------|------|------|
| `0x04` | SwPowerCap | 소프트웨어 전력 제한 |
| `0x20` | SwThermalSlowdown | GPU 온도 또는 *메모리 온도*가 최대 동작 온도를 넘지 않도록 clock을 낮춤 |
| `0x40` | HwThermalSlowdown | 온도가 너무 높아 하드웨어가 core clock을 절반 이하로 낮춤 |

`0x20`은 GPU 또는 메모리의 소프트웨어 열 제한을 뜻하므로, 이 비트 하나로 **HBM이 원인이라고 특정할 수 없습니다**. `0x04`는 전력 제한 사유이며 열 제한과 동시에 켜질 수도 있습니다. 센서·한계 온도·시간 구간·다른 제한 사유를 함께 확인합니다.

다음 코드는 수집한 64-bit hex mask에서 세 비트와 나머지 비트를 구별합니다. 원인 진단기는 아니며 Node.js로 실행할 수 있습니다.

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
```

## 자주 하는 실수

### "B200부터는 liquid cooling이 필수다"

NVIDIA DGX B200은 *공랭* 구성입니다. liquid cooling이 필요한 것은 GB200 NVL72처럼 *rack 하나에 GPU를 많이 몰아넣는* 설계입니다.

### clock 제한 비트를 잘못 읽기

`0x04`(SwPowerCap)를 보고 열 문제로 판단하면 틀립니다. `0x20`만으로 GPU core와 메모리 중 어느 쪽 온도가 원인인지 알 수 없습니다. `0x40`은 별도의 하드웨어 열 제한 사유입니다.

### *RTX 카드의 GDDR cooling*과 *HBM cooling*을 동일시

GDDR은 *카드 PCB 위 여러 칩*으로 흩어져 있고, HBM은 *GPU die 옆 좁은 면적*에 die를 쌓아 모여 있습니다. 열이 모이는 방식이 다르니 *cooling 설계도 달라집니다*.

## 정리

- HBM3는 core 1.1 V·I/O 0.4 V low-swing, HBM4는 VDDC 1.0·1.05 V로 전압을 낮춰 왔습니다.
- die를 쌓은 구조라 *아래 die의 열이 위 die를 지나* cold plate로 갑니다.
- 온도가 오르면 *refresh가 잦아지고*, 그만큼 *쓸 수 있는 대역폭이 줄어듭니다*.
- 냉각 방식은 rack 밀도로 갈립니다. DGX B200은 공랭, GB200 NVL72는 liquid cooling입니다.
- NVML의 `SwThermalSlowdown`(0x20)은 GPU 또는 메모리 열 제한이며 HBM 원인 단정에 충분하지 않습니다.

## 다음 편

[Ch 7: 메모리 컨트롤러 인터페이스](/blog/embedded/hardware/hbm/chapter07-memory-controller)에서는 *bank·row·column 계층*, *command scheduling*, *address mapping* 같은 *컨트롤러 설계*의 핵심을 다룹니다.

## 관련 항목

- [Ch 2: HBM 스택 구조와 TSV](/blog/embedded/hardware/hbm/chapter02-hbm-stack)
- [Ch 5: 대역폭 계산과 병목 분석](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)
- [Ch 7: 메모리 컨트롤러 인터페이스](/blog/embedded/hardware/hbm/chapter07-memory-controller)
