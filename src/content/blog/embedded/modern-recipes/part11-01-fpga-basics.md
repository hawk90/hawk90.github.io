---
title: "FPGA 기초 분석 — LUT·FF·BRAM·DSP 자원 구조"
date: 2026-04-20T09:00:00
description: "LUT·Flip-Flop·BRAM·DSP slice·clock region·IO bank — FPGA 구성 요소를 임베디드 관점에서 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 123
tags: [recipes, fpga, basics]
---

## 한 줄 요약

> **"FPGA는 *programable 논리 회로*입니다."** SW 개발자에게는 "thread를 무한히 띄울 수 있는 board"로 보입니다. 단, 각 thread는 *clock cycle 단위로 결정적*입니다.

## 어떤 상황에서 쓰나

CPU 한 코어로는 못 따라가는 *완전 병렬* 작업, *deterministic latency*가 필요한 작업, *custom protocol* 처리에 FPGA가 답입니다. 카메라 8대 동시 전처리, 100 Gbps 패킷 처리, motor control의 PWM, DSP filter chain, custom bus bridge가 대표 사례입니다.

MCU/SoC에 FPGA를 붙이는 이유는 *flexibility*와 *parallelism* 둘 다. ASIC은 빠르지만 한 번 굽고 나면 못 바꿉니다. FPGA는 다시 굽기만 하면 회로 자체가 바뀝니다.

## 핵심 구성 요소

FPGA fabric은 다음 블록으로 짜여 있습니다.

| 약어 | 이름 | 역할 |
|------|------|------|
| LUT | Look-Up Table | 임의의 boolean 함수 (조합 회로) |
| FF | Flip-Flop | 1-bit 레지스터 (순차 회로) |
| CLB | Configurable Logic Block | LUT + FF + carry chain 묶음 |
| BRAM | Block RAM | 18~36 Kbit on-chip SRAM |
| DSP slice | DSP48 등 | 18×18 또는 25×18 multiplier + accumulator |
| IOB | I/O Block | 핀과의 인터페이스 |
| PLL/MMCM | — | Clock 합성 |
| Routing | — | switch matrix |

이 셋의 *비율*이 FPGA의 *성격*을 결정합니다. Xilinx Artix-7은 LUT 위주, Kintex는 DSP/BRAM 풍부, Zynq UltraScale+는 DSP+SoC 결합형입니다.

## LUT — 임의의 boolean

```text
4-LUT: 4 input → 1 output
  truth table 16 entry = 16-bit SRAM

예: AND
  abcd  →  out
  ----     ---
  1111     1
  나머지   0
```

6-LUT(Xilinx 7-series 이상)는 6 input → 1 output, SRAM 64 bit. 임의의 조합 회로를 만들 수 있습니다.

```verilog
// 이 한 줄이 1개 LUT
assign y = (a & b) | (~c & d);
```

## FF — 1-bit memory

```verilog
always @(posedge clk) begin
    q <= d;
end
```

매 clock의 rising edge에 d 값을 q에 저장. 순차 회로의 기본.

## BRAM — 큰 메모리

```text
Xilinx 7-series BRAM:
  36 Kbit per block (또는 두 개의 18 Kbit)
  configurable: 32K×1, 16K×2, 8K×4, 4K×9, 2K×18, 1K×36
  dual-port (각각 read/write)
```

```verilog
// 1 BRAM = 4096×8 SRAM 또는 2048×16 SRAM
reg [7:0] mem [0:4095];
always @(posedge clk) begin
    if (we) mem[addr] <= din;
    dout <= mem[addr];
end
```

작은 buffer는 LUT를 distributed RAM으로 쓰고, 큰 buffer는 BRAM에 자동 매핑됩니다.

## DSP slice — multiply-accumulate

```text
Xilinx DSP48E1:
  25-bit × 18-bit = 43-bit multiply
  + 48-bit accumulator
  pre-adder, ALU, pattern detector 내장
```

MAC 한 cycle에 한 번. FIR filter, matrix multiply, FFT, neural network이 DSP slice를 가득 채워 사용합니다.

```verilog
// → DSP slice 1개
always @(posedge clk) begin
    acc <= acc + a * b;
end
```

## Clock Region — 시간의 단위

```text
Clock region (Xilinx 7-series):
  ~50 CLB 폭 × ~50 CLB 높이
  자체 clock buffer (BUFR, BUFH)
  하나의 region은 같은 clock skew
```

FPGA는 *전체*에 하나의 clock을 깔지 않고 *region 단위*로 나눕니다. 큰 design은 여러 clock domain을 갖고, 도메인 사이는 *clock domain crossing (CDC)* 처리가 필수.

```verilog
// 잘못된 CDC — metastability
always @(posedge clk_a) data_a <= source;
always @(posedge clk_b) data_b <= data_a;  // ← 위험

// 올바른 — 2-FF synchronizer
always @(posedge clk_b) begin
    data_b_sync1 <= data_a;
    data_b_sync2 <= data_b_sync1;
end
```

## IO Bank

```text
한 IO bank는 같은 VCCIO 전압 (1.8V / 2.5V / 3.3V)
같은 bank의 핀들은 *같은 logic level standard*

다양한 standard: LVCMOS, LVDS, SSTL, HSTL, LVPECL
```

PCB 설계 시 *어느 핀이 어느 bank에 속하는지*를 알아야 합니다. 한 bank에 3.3V CMOS와 1.8V DDR 신호를 섞을 수 없습니다.

## Routing — Switch matrix

FPGA의 *대부분의 영역*은 logic이 아닌 routing입니다. Switch matrix가 LUT 출력을 다른 LUT 입력에 연결합니다. Place & Route 단계에서 routing이 잘 안 되면 *timing 위반* 또는 *resource 부족*이 발생합니다.

## Soft Processor

LUT/FF로 *CPU 자체*를 만들 수 있습니다.

```text
Xilinx MicroBlaze    : 32-bit RISC, ~1000 LUT
Intel Nios II        : 32-bit RISC
RISC-V soft core     : VexRiscv, PicoRV32, NEORV32
```

Hard SoC(Zynq, Cyclone V SoC)는 *ARM*이 실리콘으로 박혀 있어 빠르지만, soft processor는 FPGA 자원만 있으면 어디서나 만듭니다.

## Typical FPGA 자원 비교

| Chip | LUT | FF | BRAM Kb | DSP slice | 가격 |
|------|-----|----|----|----|------|
| Lattice iCE40UP5K | 5K | ~5K | 120 | 8 | 5~10$ |
| Xilinx Spartan-7 S6 | 6K | 12K | 180 | 10 | 15$ |
| Xilinx Artix-7 A35 | 33K | 41K | 1800 | 90 | 40$ |
| Xilinx Zynq Z-7020 | 53K | 106K | 4480 | 220 | 100$ |
| Xilinx Zynq US+ ZU3EG | 154K | 307K | 7560 | 360 | 400$ |
| Xilinx Zynq US+ ZU19EG | 1143K | 2286K | 34560 | 1968 | 5000$ |
| Intel Cyclone 10 LP | 25K | ~25K | 608 | 66 | 30$ |

Hobbyist 보드 (Tang Nano 9K, Arty A7 등)는 30~100달러 범위입니다.

## 개발 흐름

1. Verilog/VHDL 또는 HLS C++
2. Synthesis: HDL → netlist (LUT/FF로 매핑)
3. Place & Route: netlist → physical placement
4. Timing analysis: setup/hold time 검증
5. Bitstream 생성: `.bit` / `.sof`
6. Programming: JTAG으로 FPGA에 load

Synthesis는 software의 compile에 해당. P&R은 *physical layout*까지 결정. Build 한 번에 분~수 시간이 걸립니다.

## 작은 예시 — LED 점멸

```verilog
module blink(
    input  wire clk,    // 100 MHz
    output wire led
);
    reg [25:0] cnt = 0;
    always @(posedge clk) cnt <= cnt + 1;
    assign led = cnt[25];     // ~1.5 Hz
endmodule
```

이 한 모듈을 합성하면 26 FF + 1 carry chain + 1 LUT 정도 사용. FPGA 자원의 0.001%도 안 씁니다.

## CPU와의 차이

| 축 | CPU | FPGA |
|----|-----|------|
| 실행 모델 | 명령을 *순차적*으로 실행 (한 cycle 한 명령) | *모든 회로가 동시*에 동작 (한 cycle 모든 회로) |
| Clock·latency | clock 빠름 (GHz), latency 가변 | clock 느림 (수백 MHz), latency 결정적 |
| 수정 | SW로 알고리즘 수정 가능 | 알고리즘 = 회로 → 재합성 필요 |
| Overhead | 매 명령 fetch/decode overhead | fetch/decode 없음 — 회로가 그 자체 |

100 MHz FPGA의 *한 cycle*에 1000개 MAC을 동시에 실행할 수 있다면 *throughput*은 100 GMAC/s. 같은 일을 1 GHz CPU로 하려면 100배 더 빠른 cycle이 필요합니다.

## SoC FPGA — Hard core + Fabric

Zynq UltraScale+, Intel Stratix 10 SoC, Microchip PolarFire SoC는 *ARM 또는 RISC-V*가 실리콘에 박혀 있고 *fabric*이 옆에 붙어 있습니다.

```text
[ARM Cortex-A53 quad]  ← Linux 도는 곳
   ↕  AXI bus
[FPGA fabric]          ← custom logic
```

CPU에서 Linux 돌리면서 fabric은 video pipeline 처리. 가장 흔한 임베디드 가속기 구조입니다.

## 자주 보는 함정

> Clock domain crossing 누락

```verilog
always @(posedge clk_b)
    out <= signal_from_clk_a;   /* metastability 위험 */
```

CDC는 항상 *2-FF synchronizer* 또는 *async FIFO*.

> 합성 결과 != HDL 의도

```verilog
reg [7:0] x;
always @(*) x = x + 1;   /* combinational loop — synthesizer 거부 */
```

Combinational loop, latch (intended가 아닌), unintended initialization. Synthesis warning을 항상 읽기.

> Timing 위반 무시

```text
WARNING: Slack -2.3 ns
```

Slack 음수는 *setup time 위반*. 그대로 굽고 돌리면 *간헐적* 동작 불량. P&R을 다시, 또는 pipeline 추가.

> Reset deassert race

```verilog
always @(posedge clk or negedge rst_n)
    if (!rst_n) q <= 0;
    else q <= d;
```

Asynchronous reset의 *deassert*가 clock edge에 가까우면 metastability. Reset synchronizer 사용.

> Pin assignment 누락

Pinout이 XDC/SDC 파일에 없으면 P&R이 *임의로* 배치합니다. 보드에 맞는 핀에 묶이지 않으면 *전혀 다른 신호*가 나옵니다.

## 정리

- FPGA = LUT + FF + BRAM + DSP + IOB + routing.
- 모든 회로가 *동시에 동작*. CPU의 sequential과 본질이 다릅니다.
- 100 MHz × 1000 MAC = 100 GMAC/s 같은 *완전 병렬* 처리.
- Clock region이 시간의 단위. CDC는 항상 synchronizer.
- BRAM이 on-chip buffer, DSP가 MAC, LUT/FF가 조합/순차 회로.
- SoC FPGA는 ARM/RISC-V hard core + fabric을 묶은 형태.
- Synthesis → P&R → bitstream의 분~시간 단위 빌드.
- Timing slack 음수는 절대 안 됨. 합성 warning을 항상 읽기.

다음 편은 **Vivado 사용법**입니다.

## 관련 항목

- [11-02: Vivado 사용법](/blog/embedded/modern-recipes/part11-02-vivado-usage)
- [11-04: AXI 인터페이스](/blog/embedded/modern-recipes/part11-04-axi)
- [11-05: PS-PL 통신](/blog/embedded/modern-recipes/part11-05-ps-pl-communication)
- [11-14: Intel Quartus 사용법](/blog/embedded/modern-recipes/part11-14-intel-quartus)
