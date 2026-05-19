---
title: "2-02: Cortex-A 시리즈 비교"
date: 2026-05-12T14:00:00
description: "A53/A72/A78/Neoverse — 임베디드 Linux용 application 코어."
series: "Modern Embedded Recipes"
seriesOrder: 14
tags: [recipes, arm, cortex-a]
draft: false
---

## 한 줄 요약

> **"Cortex-A는 Linux를 돌리는 ARM 코어입니다."** MMU와 SMP를 갖고, big.LITTLE로 전력과 성능을 양손에 쥡니다.

## 어떤 상황에서 쓰나

- 임베디드 Linux 보드 SoC 선택
- 산업용 게이트웨이, IoT edge 디바이스
- 자동차 IVI(In-Vehicle Infotainment)
- 라즈베리파이, BeagleBone 같은 SBC

## 핵심 개념

### 1) Cortex-A 패밀리 한눈에

| 코어 | ARM 버전 | 파이프라인 | 동시 issue | 캐시 (L1 / L2) | 대표 SoC |
| --- | --- | --- | --- | --- | --- |
| A7 | v7-A | 8 단 in-order | 2 | 32K / 256K | Allwinner H3 |
| A9 | v7-A | 8 단 OoO | 2 | 32K / 1M | i.MX6 |
| A53 | v8-A | 8 단 in-order | 2 | 32K / shared 1M | RPi3, Allwinner |
| A55 | v8.2-A | 8 단 in-order | 2 | 32K / shared 256K | Snapdragon 855 little |
| A72 | v8-A | 15 단 OoO | 3 | 48K / shared 2M | RPi4, i.MX8 |
| A76 | v8.2-A | 13 단 OoO | 4 | 64K / shared | Snapdragon 855 big |
| A78 | v8.2-A | 13 단 OoO | 4 | 64K / shared | Snapdragon 888 |
| Neoverse N1 | v8.2-A | 11 단 OoO | 4 | 64K / 1M | AWS Graviton2 |
| Neoverse V1 | v8.4-A | 15 단 OoO | 8 | 64K / 1M | AWS Graviton3 |

### 2) In-order vs Out-of-Order

In-order는 명령을 순서대로 실행합니다. 단순하고 전력 효율이 좋지만 stall에 약합니다. Out-of-Order는 의존성 없는 명령을 먼저 실행해 stall을 숨깁니다.

```text
In-order (A53):     LDR, ADD, MUL → LDR 대기 시 모두 멈춤
OoO (A72):          LDR(미해결) → MUL(LDR 후) → ADD(병행 가능 시 먼저)
```

A53, A55가 little core로 자주 쓰이는 이유는 전력 효율과 가격입니다.

### 3) big.LITTLE 구성

같은 SoC에 빠른 코어(big)와 느린 코어(LITTLE)를 함께 둡니다. Linux scheduler가 작업의 부담에 따라 둘 사이에서 마이그레이션 합니다.

```text
RK3588 예시
  4 × Cortex-A76 (big, 2.4 GHz)
  4 × Cortex-A55 (LITTLE, 1.8 GHz)

가벼운 작업 → A55
무거운 작업 → A76
대기 시 LITTLE만 active → 전력 절감
```

DynamIQ 기술로 같은 cluster에 big과 LITTLE을 섞을 수도 있습니다.

### 4) ARMv8 64-bit ISA (AArch64)

Cortex-A53 이후는 모두 64-bit를 지원합니다. AArch64는 AArch32와 별개의 ISA입니다.

| 차이 | AArch32 (32-bit) | AArch64 (64-bit) |
| --- | --- | --- |
| 범용 레지스터 | 16 | 31 (X0 ~ X30) |
| Stack pointer | R13 | SP (별도) |
| Link register | R14 | LR (별도) |
| 명령 길이 | 32 / 16 bit (Thumb) | 32 bit 고정 |
| 가상 주소 | 32 bit | 48 bit (또는 52 bit) |

레지스터가 많아 spill이 줄어들고, 명령 디코딩이 단순해져 성능이 좋아집니다.

### 5) Neoverse — 서버용 ARM

Neoverse는 서버/클라우드용 ARM 코어 브랜드입니다. AWS Graviton, Ampere Altra가 사용합니다. Cortex-A와 같은 ARMv8 ISA지만 throughput과 SIMD에 더 최적화돼 있습니다.

임베디드 영역에서도 5G base station, edge AI에 사용이 늘고 있습니다.

## 코드 / 실제 사용 예

Linux에서 코어 정보를 확인하는 방법입니다.

```bash
# /proc/cpuinfo
cat /proc/cpuinfo | head -20

# 코어별 ISA 기능
lscpu

# CPU governor 확인 (big.LITTLE 시 코어별)
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# Affinity 설정 — taskset
taskset -c 4-7 ./mybinary    # big core만 사용 (4~7)
```

C 코드에서 affinity:

```c
#define _GNU_SOURCE
#include <sched.h>
#include <pthread.h>

void pin_to_big(void) {
    cpu_set_t set;
    CPU_ZERO(&set);
    for (int i = 4; i < 8; i++) CPU_SET(i, &set);    // big core
    pthread_setaffinity_np(pthread_self(), sizeof(set), &set);
}
```

## 측정 / 비교

| 코어 | DMIPS/MHz | SPECint2006 (1 core) | 전형 frequency |
| --- | --- | --- | --- |
| A7 | 1.9 | — | 1.0 GHz |
| A9 | 2.5 | — | 1.5 GHz |
| A53 | 2.3 | 12 | 1.5 GHz |
| A55 | 2.5 | 16 | 1.8 GHz |
| A72 | 4.7 | 27 | 2.0 GHz |
| A76 | 6.0 | 50 | 2.4 GHz |
| A78 | 6.5 | 55 | 2.8 GHz |
| Neoverse N1 | 5.0 | 45 | 2.5 ~ 3.0 GHz |

| big.LITTLE 운영 | 평균 전력 | peak 성능 |
| --- | --- | --- |
| LITTLE only | 0.3 W | A55 만 |
| big only | 1.5 W | A76 만 |
| 자동 마이그레이션 | 0.5 W | 둘 다 활용 |

## 자주 보는 함정

> ⚠️ A53과 A72를 같이 보드에 쓰지만 Linux scheduler 비활성

CPU governor를 powersave로 둔 채 big core를 활용 못하면 A55만으로 동작합니다. `cpupower frequency-info`로 확인.

> ⚠️ 32-bit user space를 64-bit kernel에 올림

가능하지만 transition cost가 있고, 64-bit 라이브러리 호출이 어려워집니다. 새 시스템은 둘 다 64-bit로 통일 권장.

> ⚠️ Cache coherency 가정한 SMP 코드를 PE 사이 비대칭 cluster에서 사용

big.LITTLE의 일부 SoC는 L2 cache가 cluster별로 분리됩니다. write-back cache 정책에 주의가 필요합니다.

> ⚠️ Thermal throttling 무시

SBC는 보통 heatsink가 약합니다. 60℃ 이상이면 governor가 frequency를 떨어뜨립니다. benchmark 시 sustained vs peak를 구분합니다.

> ⚠️ Neoverse를 Cortex-A처럼 다룸

Neoverse는 server workload 최적화입니다. embedded 워크로드(긴 latency, 작은 working set)에는 효율이 떨어질 수 있습니다.

## 정리

- Cortex-A는 MMU와 SMP를 갖는 Linux용 ARM 코어입니다.
- A53/A55는 little, A72/A76/A78은 big, Neoverse는 server용입니다.
- big.LITTLE은 Linux scheduler가 자동으로 마이그레이션합니다.
- AArch64는 32-bit 레지스터의 두 배, 단순한 명령 인코딩으로 성능이 향상됐습니다.
- Thermal throttling으로 SBC의 sustained 성능이 peak와 다를 수 있습니다.

다음 편에서는 **ARM 레지스터 구조**를 다룹니다. Cortex-M의 R0 ~ R15와 special register들입니다.

## 관련 항목

- [2-01: Cortex-M 시리즈 비교](/blog/embedded/modern-recipes/part2-01-cortex-m-comparison)
- [2-03: ARM 레지스터 구조](/blog/embedded/modern-recipes/part2-03-arm-registers)
- [2-08: MMU 기초](/blog/embedded/modern-recipes/part2-08-arm-mmu)
- [3-12: Bootloader 체인](/blog/embedded/modern-recipes/part3-12-bootloader-chain)
