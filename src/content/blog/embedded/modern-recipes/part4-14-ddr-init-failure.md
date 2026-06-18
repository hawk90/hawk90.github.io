---
title: "DDR 초기화 실패 진단 — Timing·Calibration·Walking Bit Test"
date: 2026-04-13T09:48:00
description: "DDR3/4 초기화 sequence. ZQ calibration, write leveling, walking bit test, JESD79 사양."
series: "Modern Embedded Recipes"
seriesOrder: 48
tags: [recipes, ddr, sdram, memory, calibration]
draft: false
---

## 한 줄 요약

> **"DDR init은 수십 개 timing parameter를 정확히 맞추는 작업입니다."** 하나라도 틀리면 bit error가 발생하거나 시스템이 crash합니다.

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

LV는 low voltage를 의미하고, LP는 low power를 의미합니다. 둘은 다른 표준입니다.

## JEDEC Init Sequence (DDR3)

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

순서와 timing이 모두 맞아야 합니다. 수 ms 이내에 약 100개의 step을 순서대로 실행해야 합니다.

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

데이터시트의 AC characteristics 표를 보고 CLK 사이클 단위로 변환합니다.

```c
ddr->tRCD = ceil(13.75 / 1.25);   // = 11 cycle
ddr->tRP  = ceil(13.75 / 1.25);   // = 11
ddr->tRC  = ceil(48.75 / 1.25);   // = 39
```

## ZQ Calibration

**ZQ** = Z (impedance) Q (quality). 온도·전압 변화로 *드라이버 임피던스가 변화*해 주기적 재교정이 필요하다.

| 명령 | 시점 |
|------|------|
| `ZQCL` | long calibration (init time) |
| `ZQCS` | short calibration (운영 중) |

```c
/* 256 ms마다 ZQCS 자동 (DDR controller 설정) */
ddr->ZQCTL = ZQCL_INTERVAL_256ms;
```

## Write Leveling

DDR3 fly-by topology에서는 각 chip별로 신호 도착 시점이 다릅니다. 이를 보정하는 절차는 다음과 같습니다.

1. MRS — write leveling mode
2. DQS toggle, read CLK sample
3. CK ↑ 시점에 DQS ↑ 시점 일치할 때까지 *delay 조정*
4. 각 byte lane 별로 fine adjust

DDR controller가 자동으로 수행하지만, 결과는 반드시 register에서 읽어 확인해야 합니다.

## DQS Gate Training

**Read DQS gate** — read 시 DQS pulse의 *valid window* 찾기.

| 시점 | 증상 |
|------|------|
| 너무 일찍 | preamble noise sample |
| 너무 늦게 | 첫 data 비트 놓침 |

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

`0x55555555`, `0xAAAAAAAA`, `0xCAFEBABE` 같은 패턴도 함께 시험합니다.

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

A0부터 An까지의 line이 짧거나 단선된 경우, 서로 다른 address에 같은 data가 기록되어 검출됩니다.

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

운영 시에는 Linux MemTest86이나 u-boot memtest 명령을 사용합니다.

## 보드 디자인 — Length Matching

**DDR signal lines:**

- CLK 차분 pair — 길이 정확
- ADDR/CMD — CLK ± 50 mil (수밀)
- DQ byte lane — group 안 ± 20 mil
- DQS - DQ — 25 mil 이내

Length mismatch는 skew를 만들어 high-speed 동작을 실패하게 합니다.

> ⚠️ DDR4 1600 MT/s 이상에서는 수 mil 차이도 marginal입니다.

## 종단 — VTT·ODT

DDR3/4는 ODT (On-Die Termination)를 사용합니다.
- Write 시에는 slave (DRAM) ODT를 enable합니다.
- Read 시에는 master (controller) ODT를 enable합니다.

```c
mr1.ODT = ODT_60_OHM;       // 60Ω
mr1.OUTPUT_DRIVE = DRV_34;   // 34Ω driver
```

VTT (terminator 전압)는 VDDQ / 2입니다. 약간만 잘못되어도 eye diagram이 변형되어 bit error가 발생합니다.

## DDR PHY와 Controller

| 블록 | 인접 연결 | 담당 기능 |
| --- | --- | --- |
| CPU | ↔ AXI | master 요청 |
| Memory Controller | AXI ↔ PHY | scheduling, refresh, arbiter |
| DDR PHY | controller ↔ DRAM | analog (PLL, IO buffer, training) |
| DRAM chip | ↔ PHY | 실제 storage |

Cortex-A SoC (i.MX, STM32MP1, Zynq)에서는 Synopsys uMCTL2와 DDR PHY 조합이 표준입니다.

## Eye Diagram 측정

Oscilloscope (수 GHz BW) + DDR probe + signal trigger로 측정. **data eye**는 *signal이 stable한 영역*. 폭이 좁으면 *jitter*가 심함 → speed를 낮추거나 layout 수정.

전문 도구로는 Tektronix BERTScope와 Keysight UXR가 있습니다.

## 자주 하는 실수

> ⚠️ Cold boot first read 안 동작

```c
init_ddr();
*((volatile uint32_t*)0x80000000) = 0xDEADBEEF;   // ← bus fault
```

DDR init 후 짧은 settle time이 필요합니다. PHY가 안정될 때까지 수 µs 정도 기다려야 합니다.

> ⚠️ Refresh interval 짧음

```c
tREFI = 1000 ns;   // ← 너무 짧음 → bandwidth 손실
tREFI = 7800 ns;   // ← 표준
```

너무 길면 데이터가 손실되고, 너무 짧으면 throughput이 손실됩니다. 항상 JEDEC 사양을 따릅니다.

> ⚠️ Temperature 무시

```text
DRAM 85°C 이상 — refresh rate 2x 필요 (tREFI 절반)
```

Industrial과 자동차 grade는 105°C까지 지원합니다. 그 외 환경에서는 temperature compensation이 필수입니다.

> ⚠️ 8-bit×4 칩과 16-bit×2 칩 혼용

같은 보드에 organization이 다른 chip을 섞으면 controller 설정이 깨집니다. 반드시 동일 device를 사용해야 합니다.

## 정리

- DDR init은 **JEDEC sequence와 timing parameter**를 정확히 맞추는 작업입니다.
- **ZQ calibration, write leveling, DQS training**은 controller가 자동 처리하지만 결과를 확인해야 합니다.
- **Walking bit 테스트와 March 테스트**로 bring-up을 검증합니다.
- 보드 length matching이 high-speed 동작의 핵심입니다.
- 자동차와 산업 환경에서는 temperature compensation이 필수입니다.

다음 편은 **PCIe BAR 매핑**입니다.

## 관련 항목

- [1-01: UART 디버깅](/blog/embedded/modern-recipes/part1-01-uart-debugging)
- [1-03: PCIe BAR](/blog/embedded/modern-recipes/part11-03-pcie-bar)
