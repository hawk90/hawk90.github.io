---
title: "DDR 초기화 실패 진단 — Timing·Calibration·Walking Bit Test"
slug: "embedded/modern-recipes/part4-14-ddr-init-failure"
date: 2026-04-13T09:48:00
description: "DDR3/4 초기화 sequence. ZQ calibration, write leveling, walking bit test, JESD79 사양."
series: "Modern Embedded Recipes"
seriesOrder: 48
tags: [recipes, ddr, sdram, memory, calibration]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"DDR init은 수십 개 timing parameter를 정확히 맞추는 작업입니다."** 하나라도 틀리면 bit error가 발생하거나 시스템이 crash합니다.

## DDR 종류와 속도

| 종류 | JEDEC 표준 data rate | I/O 전압 (VDDQ) |
|---|---|---|
| DDR3 | 800-2133 MT/s (JESD79-3F) | 1.5V |
| DDR3L | TBD | 1.35V |
| DDR4 | 최대 3200 MT/s | 1.2V |
| DDR5 | 최대 8800 MT/s (JESD79-5C, 2024. 처음 표준은 6400) | 1.1V |
| LPDDR4 | 최대 4266 MT/s | 1.1V (LPDDR4X 0.6V) |
| LPDDR5 | 최대 6400 MT/s | 0.5V (코어 VDD2H 1.05V) |

DDR3L의 L은 low voltage, LPDDR의 LP는 low power를 뜻합니다. 둘은 다른 표준입니다.

## JEDEC Init Sequence (DDR3)

1. 전원 인가 — RESET#을 LOW로 둔 채 VDD·VDDQ를 올림
2. 전원이 안정된 뒤 RESET# LOW를 최소 200µs 유지. CKE는 RESET#을 풀기 전에 LOW로 둠
3. RESET# 해제 후 500µs 기다린 다음 CKE = HIGH
4. tXPR 대기
5. MR2 program (CWL 등)
6. MR3 program (MPR)
7. MR1 program (DLL enable, output drive, Rtt_Nom)
8. MR0 program (CL, BL, DLL reset)
9. ZQCL — 초기 calibration (tZQinit 동안 대기)
10. Normal operation

순서와 대기 시간이 모두 맞아야 합니다. 실제로는 SoC의 DDR controller와 PHY가 이 순서를 대신 실행하고, 펌웨어는 그 전에 timing 레지스터를 채웁니다.

## 핵심 Timing Parameter (DDR3-1600)

| 파라미터 | 값 (ns) | 의미 |
|---|---|---|
| tCK | 1.25 | clock cycle |
| tRCD | 13.75 | row → column delay |
| tRP | 13.75 | precharge |
| tRAS | 35 | active → precharge minimum |
| tRC | 48.75 | tRAS + tRP |
| tRFC | 260 | refresh cycle (4Gb chip. 1Gb 110, 2Gb 160, 8Gb 350) |
| tREFI | 7800 | refresh interval (TC ≤ 85°C에서 max 7.8 µs) |
| CL | 11 cycle | CAS latency |

데이터시트의 AC characteristics 표를 보고 CLK 사이클 단위로 변환합니다.

```c
ddr->tRCD = ceil(13.75 / 1.25);   // = 11 cycle
ddr->tRP  = ceil(13.75 / 1.25);   // = 11
ddr->tRC  = ceil(48.75 / 1.25);   // = 39
```

## ZQ Calibration

ZQ calibration은 DRAM의 ZQ 핀에 연결된 정밀 저항(240Ω)을 기준으로 출력 드라이버와 ODT 임피던스를 맞추는 절차입니다. 온도와 전압이 바뀌면 임피던스가 흘러가므로 운영 중에도 주기적으로 다시 맞춥니다.

| 명령 | 시점 |
|------|------|
| `ZQCL` | long calibration (초기화) |
| `ZQCS` | short calibration (운영 중 주기적으로) |

ZQCS 주기는 DDR controller 레지스터로 설정합니다. 값은 DRAM 데이터시트의 온도·전압 drift 사양과 보드의 온도 변화 폭을 보고 정합니다.

## Write Leveling

DDR3 fly-by topology에서는 각 chip별로 신호 도착 시점이 다릅니다. 이를 보정하는 절차는 다음과 같습니다.

1. MR1로 write leveling mode 진입
2. controller가 DQS를 toggle하면 DRAM이 DQS 상승 에지에서 CK를 sample해 그 값을 DQ로 돌려줌
3. DQ 값이 0에서 1로 바뀌는 지점(DQS ↑가 CK ↑와 맞는 지점)까지 DQS *delay 조정*
4. byte lane마다 반복

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

## 주소 라인 검증 — Address Bus Test

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

A0부터 An까지의 line이 단락(short)되거나 단선(open)되면 서로 다른 address가 같은 셀을 가리켜, 나중에 쓴 값이 앞의 값을 덮어쓰면서 검출됩니다. 셀 자체의 결함을 찾는 March C- 같은 March 테스트는 모든 주소를 정해진 순서로 읽고 쓰는 별개의 알고리즘입니다.

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

이미 있는 도구로는 Linux 사용자 공간의 memtester, 독립 부팅 이미지인 MemTest86, U-Boot의 `mtest` 명령이 있습니다.

## 보드 디자인 — Length Matching

DDR 배선은 신호 group마다 길이를 맞춥니다.

- CLK 차동 pair — pair 안 길이를 맞춤
- ADDR/CMD — CLK를 기준으로 맞춤 (fly-by)
- DQ — 같은 byte lane 안에서 맞춤
- DQS - DQ — 같은 byte lane의 DQS와 맞춤

Length mismatch는 skew를 만들어 high-speed 동작을 실패하게 합니다. 허용 오차는 SoC 벤더의 DDR layout guide에 data rate별로 나와 있으니, 그 문서의 값을 그대로 씁니다.

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

Cortex-A SoC 중 i.MX 8M과 STM32MP1은 Synopsys uMCTL2 controller에 DDR PHY를 붙인 구성이고(U-Boot `drivers/ddr/imx/imx8m`, `drivers/ram/stm32mp1`), Zynq·Zynq UltraScale+의 DDR controller도 Linux의 Synopsys EDAC 드라이버가 함께 지원합니다. 반면 i.MX6은 NXP 자체 MMDC를 씁니다.

## Eye Diagram 측정

Oscilloscope (수 GHz BW) + DDR probe + signal trigger로 측정. **data eye**는 *signal이 stable한 영역*. 폭이 좁으면 *jitter*가 심함 → speed를 낮추거나 layout 수정.

## 자주 하는 실수

> ⚠️ Cold boot first read 안 동작

```c
init_ddr();
*((volatile uint32_t*)0x80000000) = 0xDEADBEEF;   // ← bus fault
```

초기화 함수가 반환됐다고 바로 접근하면 안 됩니다. controller와 PHY가 초기화·training 완료를 알리는 status bit(예: STM32MP1 PHY의 `PGSR.IDONE`)를 확인한 뒤 첫 접근을 합니다.

> ⚠️ Refresh interval 짧음

```c
tREFI = 1000 ns;   // ← 너무 짧음 → bandwidth 손실
tREFI = 7800 ns;   // ← 표준
```

너무 길면 데이터가 손실되고, 너무 짧으면 throughput이 손실됩니다. 항상 JEDEC 사양을 따릅니다.

> ⚠️ Temperature 무시

DDR3는 case 온도 85°C까지 tREFI 7.8µs, 85°C 초과 95°C까지는 3.9µs(refresh 2배)를 요구합니다. 보드가 85°C를 넘을 수 있으면 refresh 주기를 절반으로 설정하고, 더 높은 온도는 그 범위를 보증하는 산업용·자동차용 등급 부품의 데이터시트를 따릅니다.

> ⚠️ 8-bit×4 칩과 16-bit×2 칩 혼용

같은 보드에 organization이 다른 chip을 섞으면 controller 설정이 깨집니다. 반드시 동일 device를 사용해야 합니다.

## 정리

- DDR init은 **JEDEC sequence와 timing parameter**를 정확히 맞추는 작업입니다.
- **ZQ calibration, write leveling, DQS training**은 controller가 자동 처리하지만 결과를 확인해야 합니다.
- **Walking bit(data bus)와 address bus 테스트**로 bring-up을 검증합니다.
- 보드 length matching이 high-speed 동작의 핵심입니다.
- 85°C를 넘는 환경에서는 refresh 주기를 절반(3.9µs)으로 줄입니다.

다음 편은 **PWM 출력**입니다.

## 관련 항목

- [5-01: PWM 출력](/blog/embedded/modern-recipes/part5-01-pwm-output)
- 더 깊이 — [Bootloader Internals: DDR Controller 프로그래밍과 PHY Training](/blog/embedded/bootloader/chapter09-dram-init)
- 더 깊이 — [Bootloader Internals: DDR Training과 PHY Calibration](/blog/embedded/bootloader/chapter26-ddr-training)
- [BSP Development: DDR 매개변수 결정](/blog/embedded/bsp/chapter05-ddr-params)
