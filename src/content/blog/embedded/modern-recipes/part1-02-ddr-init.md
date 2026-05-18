---
title: "1-02: DDR 초기화 실패 — Timing·Calibration·Walking Bit Test"
date: 2026-05-13T19:00:00
description: "DDR3/4 초기화 sequence. ZQ calibration, write leveling, walking bit test, JESD79 사양."
series: "Modern Embedded Recipes"
seriesOrder: 2
tags: [recipes, ddr, sdram, memory, calibration]
draft: true
---

## 한 줄 요약

> **"DDR init = 수십 개 timing parameter 정확히"** — 하나 틀리면 *bit error 또는 crash*.

## DDR 종류와 속도

| 종류 | Data Rate | I/O Voltage | 사용 |
|---|---|---|---|
| DDR3 | 800-1600 MT/s | 1.5V (LV 1.35V) | 자동차·산업 |
| DDR3L | 1066-1600 | 1.35V | 임베디드 Linux |
| DDR4 | 1600-3200 | 1.2V | 모바일·서버 |
| LPDDR3 | 800-1866 | 1.2V | 모바일 |
| LPDDR4 | 1600-4266 | 1.1V | 스마트폰 |
| LPDDR5 | 4266-6400 | 1.05V | 최신 |
| DDR5 | 3200-8400 | 1.1V | 데스크탑·서버 |

LV는 *low voltage*, LP는 *low power* (다른 표준).

## JEDEC Init Sequence (DDR3)

```text
1. Power-on — VDD·VDDQ·VTT ramp (수 ms)
2. CKE pin = LOW 유지 200µs
3. CKE = HIGH, reset issue
4. PRECHARGE ALL
5. MR2 program (CWL, etc.)
6. MR3 program (MPR)
7. MR1 program (DLL enable, output drive)
8. MR0 program (CL, BL, DLL reset)
9. ZQCL — calibration
10. Self-refresh 잠시
11. Normal operation
```

순서·timing 다 맞아야 — *수 ms 이내 ~100개 step*.

## 핵심 Timing Parameter (DDR3-1600)

| 파라미터 | 값 (ns) | 의미 |
|---|---|---|
| tCK | 1.25 | clock cycle |
| tRCD | 13.75 | row → column delay |
| tRP | 13.75 | precharge |
| tRAS | 35 | active → precharge minimum |
| tRC | 48.75 | tRAS + tRP |
| tRFC | 260 | refresh cycle (1Gb chip) |
| tREFI | 7800 | refresh interval (max 7.8 µs) |
| CL | 11 cycle | CAS latency |

데이터시트의 *AC characteristics* 표 보고 *CLK 사이클 단위로 변환*:

```c
ddr->tRCD = ceil(13.75 / 1.25);   // = 11 cycle
ddr->tRP  = ceil(13.75 / 1.25);   // = 11
ddr->tRC  = ceil(48.75 / 1.25);   // = 39
```

## ZQ Calibration

```text
ZQ = Z (impedance) Q (quality)
온도·전압 변화로 *드라이버 임피던스 변화* → 주기적 재교정
ZQCL — long calibration (init time)
ZQCS — short calibration (운영 중)
```

```c
/* 256 ms마다 ZQCS 자동 (DDR controller 설정) */
ddr->ZQCTL = ZQCL_INTERVAL_256ms;
```

## Write Leveling

DDR3 fly-by topology — *각 chip별 신호 도착 시점 다름*. 보정:

```text
1. MRS — write leveling mode
2. DQS toggle, read CLK sample
3. CK ↑ 시점에 DQS ↑ 시점 일치할 때까지 *delay 조정*
4. 각 byte lane 별로 fine adjust
```

DDR controller가 *자동* — 그러나 *결과를 register에서 읽어 확인*.

## DQS Gate Training

```text
Read DQS gate — read 시 DQS pulse의 *valid window* 찾기
너무 일찍 열면 — preamble noise sample
너무 늦게 열면 — 첫 data 비트 놓침
```

```c
/* Vendor 별 자동 training */
WAIT_FOR_TRAINING_DONE();
status = ddr->TRAIN_STATUS;
if (status & TRAIN_FAIL) {
    /* 실패 — 보드 layout·terminator 확인 */
}
```

## Walking Bit Test — Bring-up 시 첫 검증

```c
void walking_bit_test(uint32_t *base, size_t words) {
    /* 1, 2, 4, 8, ... 한 비트만 켜기 */
    for (int bit = 0; bit < 32; bit++) {
        uint32_t pattern = 1U << bit;
        base[0] = pattern;
        if (base[0] != pattern) {
            printf("Bit %d failed: wrote 0x%x read 0x%x\n",
                   bit, pattern, base[0]);
        }
    }
}
```

`0x55555555`·`0xAAAAAAAA`·`0xCAFEBABE` 등 패턴도 시험.

## 주소 라인 검증 — March Test

```c
/* Address line short/open 검증 */
void address_test(uint32_t *base, size_t words) {
    for (int i = 0; i < log2(words); i++) {
        uint32_t addr = 1U << i;
        base[addr] = addr;
    }
    /* Read back */
    for (int i = 0; i < log2(words); i++) {
        uint32_t addr = 1U << i;
        if (base[addr] != addr) {
            printf("Address bit %d failure\n", i);
        }
    }
}
```

A0~An line *짧음/단선* 시 — 다른 address에 같은 data 쓰기 → 검출.

## 실측 — 데이터 무결성

```c
/* MemTester 스타일 — 표준 테스트 */
void full_dram_test(uint32_t *base, size_t mb) {
    size_t words = mb * 1024 * 1024 / 4;
    
    /* Test 1: 0xFF / 0x00 alternating */
    for (size_t i = 0; i < words; i++) base[i] = (i & 1) ? 0xFFFFFFFF : 0;
    for (size_t i = 0; i < words; i++) {
        uint32_t expected = (i & 1) ? 0xFFFFFFFF : 0;
        if (base[i] != expected) error(i);
    }
    
    /* Test 2: address as data */
    for (size_t i = 0; i < words; i++) base[i] = i;
    for (size_t i = 0; i < words; i++) if (base[i] != i) error(i);
    
    /* Test 3: random */
    /* ... */
}
```

운영 시 *Linux MemTest86* 또는 *u-boot memtest 명령*.

## 보드 디자인 — Length Matching

```text
DDR signal lines:
  CLK 차분 pair — 길이 정확
  ADDR/CMD — CLK ± 50 mil (수밀)
  DQ byte lane — group 안 ± 20 mil
  DQS - DQ — 25 mil 이내
```

Length mismatch → *skew* → high-speed 실패.

> ⚠️ DDR4 1600 MT/s 이상에선 *수 mil 차이*도 marginal.

## 종단 — VTT·ODT

DDR3/4 — *ODT* (On-Die Termination):
- Write 시 — slave (DRAM) ODT enable
- Read 시 — master (controller) ODT enable

```c
mr1.ODT = ODT_60_OHM;       // 60Ω
mr1.OUTPUT_DRIVE = DRV_34;   // 34Ω driver
```

VTT (terminator 전압) = VDDQ / 2. 약간 잘못되면 *eye diagram 변형* — bit error.

## DDR PHY와 Controller

```text
[CPU] ─ AXI ─ [Memory Controller] ─ PHY ─ [DRAM chip]
                  │                  │
                  └ scheduling       └ analog (PLL, IO buf)
                    refresh
                    arbiter
```

Cortex-A SoC (i.MX·STM32MP1·Zynq) — Synopsys uMCTL2 + DDR PHY가 표준.

## Eye Diagram 측정

```text
Oscilloscope (수 GHz BW) + DDR probe + signal trigger
→ data eye = *signal stable 영역*
→ 폭 좁으면 *jitter* 심함 → speed 낮추거나 layout 수정
```

전문 도구 — Tektronix BERTScope·Keysight UXR.

## 자주 하는 실수

> ⚠️ Cold boot first read 안 동작

```c
init_ddr();
*((volatile uint32_t*)0x80000000) = 0xDEADBEEF;   // ← bus fault
```

DDR init 후 *짧은 settle time* 필요 (~수 µs). PHY가 안정될 때까지.

> ⚠️ Refresh interval 짧음

```c
tREFI = 1000 ns;   // ← 너무 짧음 → bandwidth 손실
tREFI = 7800 ns;   // ← 표준
```

너무 길면 *데이터 손실*. 너무 짧으면 *throughput 손실*. JEDEC 따름.

> ⚠️ Temperature 무시

```text
DRAM 85°C 이상 — refresh rate 2x 필요 (tREFI 절반)
```

Industrial·자동차 grade — 105°C까지 지원. 그 외 *temperature compensation* 필수.

> ⚠️ 8-bit×4 칩과 16-bit×2 칩 혼용

같은 보드에 *organization 다른 chip* → controller 설정 깨짐. *동일 device 사용*.

## 정리

- DDR init = **JEDEC sequence + timing parameter** 정확히.
- **ZQ calibration·write leveling·DQS training** — controller 자동, 결과 확인.
- **Walking bit + March test**로 bring-up 검증.
- 보드 *length matching*이 high-speed 핵심.
- 자동차·산업은 *temperature compensation* 필수.

다음 편은 **PCIe BAR 매핑**.

## 관련 항목

- [1-01: UART 디버깅](/blog/embedded/modern-recipes/part1-01-uart-debugging)
- [1-03: PCIe BAR](/blog/embedded/modern-recipes/part1-03-pcie-bar)
