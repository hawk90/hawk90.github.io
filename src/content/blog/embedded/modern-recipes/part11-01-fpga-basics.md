---
title: "FPGA 기초 분석 — LUT·FF·BRAM·DSP 자원 구조"
slug: "embedded/modern-recipes/part11-01-fpga-basics"
date: 2026-04-20T09:00:00
description: "AMD 7 series 데이터시트로 LUT·FF·BRAM·DSP48E1·clock region·I/O bank를 정리하고, 같은 RTL을 Yosys로 xc7에 합성해 각 자원에 어떻게 매핑되는지 확인합니다."
series: "Modern Embedded Recipes"
seriesOrder: 123
tags: [recipes, fpga, basics]
topics: ["embedded"]
---

## 한 줄 요약

> **"FPGA는 *programmable 논리 회로*입니다."** SW 개발자에게는 병렬 datapath를 직접 배선하는 fabric입니다. 이 글은 AMD(구 Xilinx) 7 series 데이터시트로 자원 구조를 정리하고, 작은 RTL 다섯 개를 오픈소스 합성기 Yosys로 `xc7`에 합성해 *어떤 코드가 어떤 자원이 되는지*를 실제 출력으로 보여 줍니다.

## 어떤 상황에서 쓰나

CPU는 명령을 하나씩 가져와 실행합니다. 같은 일을 매 clock 동시에 해야 하거나, 입력에서 출력까지 걸리는 clock 수가 늘 같아야 하거나, 표준 주변장치에 없는 bus·protocol을 받아야 할 때 FPGA를 붙입니다. 회로를 다시 합성해 bitstream을 바꾸면 같은 칩이 다른 회로가 된다는 점이 ASIC과의 차이입니다.

비유하면 CPU는 요리사 한 명이 레시피를 한 줄씩 읽으며 요리하는 주방이고, FPGA는 요리마다 전용 조리대를 깔아 둔 공장 라인입니다. 라인을 바꾸려면 레시피를 고치는 대신 조리대 배치를 다시 해야 합니다.

### 이 글의 실행 환경

- 데이터시트 수치: AMD DS180 v2.6.1(7 Series Overview), DS190 v1.11.1(Zynq-7000), DS891 v1.11.1(Zynq UltraScale+ MPSoC), UG472 v1.14(Clocking), UG471 v1.10(SelectIO), UG479 v1.10(DSP48E1)에서 옮겼습니다.
- 같은 계열 문서로 UG474 v1.9(CLB)도 인용합니다.
- 합성 출력: Yosys 0.71(`yowasp-yosys` 패키지)의 `synth_xilinx -family xc7`입니다. **Vivado는 이 환경에 설치할 수 없어 돌리지 않았습니다.** Vivado의 동작은 UG901·UG906 문서로만 인용합니다. Yosys 결과는 "RTL이 7 series primitive로 어떻게 매핑되는지"를 보여 주는 예시이고, Vivado가 같은 개수를 낸다는 뜻은 아닙니다.
- 시뮬레이션·lint: Icarus Verilog 13.0, Verilator 5.054.

## 핵심 구성 요소

7 series fabric의 기본 블록은 아래와 같습니다. 크기 숫자는 모두 DS180의 각 절에서 가져왔습니다.

| 약어 | 이름 | 7 series에서의 실제 모습 |
|------|------|------|
| LUT | Look-Up Table | 6-input LUT 1개 또는 입력을 공유하는 5-input LUT 2개 |
| FF | Flip-Flop | slice당 8개. 그중 4개는 latch로도 설정 가능 |
| Slice / CLB | Configurable Logic Block | LUT 4개 + FF 8개 + mux + carry logic = slice, slice 2개 = CLB |
| BRAM | Block RAM | 36 Kb dual-port. 독립된 18 Kb 두 개로 나눠 쓸 수 있음 |
| DSP48E1 | DSP slice | pre-adder + 25 × 18 multiplier + adder + 48-bit accumulator |
| IOB | I/O Block | bank당 50 SelectIO 핀(예외 있음) |
| CMT | Clock Management Tile | MMCM 1개 + PLL 1개 |

자원의 *비율*이 디바이스 성격을 정합니다. 아래 자원 비교 표로 계산하면 LUT 1,000개당 DSP 수는 XC7S6 2.7개, XC7A35T 4.3개, Z-7020 4.1개, ZU3EG 5.1개로 계열마다 다릅니다.

## LUT — 임의의 boolean 함수

LUT는 작은 SRAM 진리표입니다. 6-input LUT는 64개 entry를 갖고, 입력 6비트가 그 주소가 됩니다. DS180은 7 series LUT를 "6-input LUT(64-bit ROM) 하나 또는 주소를 공유하는 5-input LUT(32-bit ROM) 두 개"로 설명합니다. 입력이 6개 이하인 조합 논리는 무엇이든 LUT 하나에 들어갑니다.

다음 4-input 식을 합성해 보면 LUT 하나가 됩니다.

```verilog
module lut_demo(input wire a, b, c, d, output wire y);
    assign y = (a & b) | (~c & d);
endmodule
```

```bash
yowasp-yosys -q -p 'read_verilog lut.v; synth_xilinx -family xc7 -top lut_demo; tee -o lut_demo.stat stat'
```

```text
        6 cells
        4   IBUF
        1   LUT4
        1   OBUF
```

논리는 `LUT4` 하나이고, 나머지는 top-level 포트에 붙은 입력·출력 버퍼입니다.

LUT의 또 다른 쓰임은 메모리입니다. DS180에 따르면 slice의 25~50%가 LUT를 64-bit distributed RAM이나 32-bit shift register(SRL32)로 쓸 수 있습니다. UG474는 이런 slice를 SLICEM, 논리 전용 slice를 SLICEL이라고 부르고, 대략 3분의 2가 SLICEL이라고 적습니다.

## FF — 1-bit 레지스터

FF는 clock edge마다 D 입력을 저장합니다. 순차 회로는 전부 이 위에 섭니다. 7 series slice 하나에는 FF가 8개 있고 LUT 출력을 바로 받을 수 있어서, "LUT 한 단 + FF"가 파이프라인의 기본 단위가 됩니다.

```verilog
always @(posedge clk) begin
    q <= d;
end
```

## BRAM — on-chip SRAM

LUT RAM은 작고 흩어져 있습니다. 수 KB 이상의 buffer는 BRAM에 둡니다. DS180이 밝힌 7 series BRAM의 성질은 다음과 같습니다.

- 블록 하나가 36 Kb이고, 서로 독립인 18 Kb 두 개로 나눠 쓸 수 있습니다.
- 포트마다 32K × 1, 16K × 2, 8K × 4, 4K × 9(또는 8), 2K × 18(또는 16), 1K × 36(또는 32), 512 × 72(또는 64) 가운데 하나로 설정합니다. 72-bit 폭은 simple dual-port 모드에서만 됩니다.
- 두 포트는 저장된 데이터 말고는 공유하는 것이 없습니다. 읽기·쓰기 모두 clock에 동기입니다.

4096 × 8 메모리(32 Kb)를 동기 읽기로 기술하면 36 Kb 블록 하나를 4K × 9로 설정해 데이터 8비트만 쓰는 크기가 됩니다.

```verilog
module bram_demo(input wire clk, input wire we, input wire [11:0] addr,
                 input wire [7:0] din, output reg [7:0] dout);
    reg [7:0] mem [0:4095];
    always @(posedge clk) begin
        if (we) mem[addr] <= din;
        dout <= mem[addr];
    end
endmodule
```

```text
       32 cells
        1   BUFG
       22   IBUF
        8   OBUF
        1   RAMB36E1
```

Yosys는 이 배열을 `RAMB36E1` 하나로 추론했습니다. 같은 배열을 비동기 읽기(`assign dout = mem[addr];`)로 바꿔 합성하면 결과가 완전히 달라집니다.

```text
      227 cells
        1   BUFG
       22   IBUF
       27   LUT2
        1   LUT3
       40   LUT6
        8   OBUF
      128   RAM256X1S
```

BRAM은 읽기도 clock에 동기라서(DS180) 비동기 읽기를 받을 수 없습니다. 그래서 Yosys는 32 Kb를 LUT 기반 distributed RAM(`RAM256X1S` 128개)과 읽기 mux용 `LUT6` 40개, write-enable decode용 `LUT2`·`LUT3` 28개로 풀었습니다. UG474(v1.9)에 따르면 `RAM256X1S` 하나가 LUT 4개를 쓰므로 LUT로만 약 580개입니다. 큰 buffer는 읽기를 레지스터에 거는 것만으로 BRAM 하나와 LUT 수백 개 사이의 차이가 납니다.

## DSP48E1 — multiply-accumulate

UG479는 DSP48E1을 25 × 18 two's-complement multiplier, 48-bit accumulator, pre-adder, pattern detector를 갖춘 slice로 설명합니다. 곱셈 결과는 25 + 18 = 43비트이고, 이를 48비트 누산기에 더합니다.

16 × 16 signed 곱을 40비트 누산기에 더하는 코드를 합성하면 곱셈기와 누산 레지스터가 DSP48E1 하나에 들어갑니다.

```verilog
module mac_demo(input wire clk, input wire signed [15:0] a, b,
                output reg signed [39:0] acc);
    always @(posedge clk) begin
        acc <= acc + a * b;
    end
endmodule
```

```text
       75 cells
        1   BUFG
        1   DSP48E1
       33   IBUF
       40   OBUF
```

FF가 하나도 없다는 점이 중요합니다. `acc` 레지스터 40비트가 fabric FF가 아니라 DSP48E1 내부의 P 레지스터로 흡수됐습니다. 곱셈 폭이 25 × 18을 넘으면 DSP 여러 개를 이어 붙여야 하므로, 계수 폭을 정할 때 이 경계를 의식하면 자원이 크게 달라집니다.

처리량 계산은 단순합니다. Zynq Z-7020은 DSP slice가 220개입니다(DS190). 모든 DSP가 매 clock MAC 하나씩을 100 MHz에서 한다면 상한은 220 × 100 M = 22 GMAC/s입니다. 실제로 이 값에 다가가려면 데이터를 매 clock 공급할 BRAM·메모리 대역폭과, 그 clock에서 timing이 닫히는지가 함께 맞아야 합니다.

## Clock Region — clock이 퍼지는 단위

FPGA는 칩 전체에 clock 하나를 깔지 않고 영역 단위로 분배합니다. UG472(v1.14) 1장이 정의하는 7 series clock region은 다음과 같습니다.

- 높이 50 CLB, 그리고 I/O bank 하나(50 I/O)에 해당하는 영역입니다. 가운데에 horizontal clock row(HROW)가 있고 위아래로 25 CLB씩 뻗습니다.
- 가로로는 디바이스의 한쪽 절반을 가로지릅니다.
- 한 region에는 column마다 CLB 50개, 36K BRAM 10개(PCIe 블록이 있으면 5개), DSP slice 20개가 있고, BUFH 12개, 해당되면 CMT 하나가 있습니다.
- region 수는 가장 작은 디바이스의 1개부터 가장 큰 디바이스의 24개까지입니다.

clock이 여러 개면 clock domain도 여러 개입니다. domain 사이를 오가는 신호는 받는 쪽 clock과 위상 관계가 없으므로 *clock domain crossing (CDC)* 처리가 필요합니다. 1-bit 레벨 신호라면 받는 쪽 clock으로 FF 두 단을 거치는 2-FF synchronizer가 기본입니다.

```verilog
module sync2 (
    input  wire clk_b,
    input  wire async_in,   // clk_a 도메인에서 온 1-bit 레벨 신호
    output wire sync_out
);
    (* ASYNC_REG = "TRUE" *) reg s1;
    (* ASYNC_REG = "TRUE" *) reg s2;
    always @(posedge clk_b) begin
        s1 <= async_in;
        s2 <= s1;
    end
    assign sync_out = s2;
endmodule
```

`ASYNC_REG`는 Vivado에 "이 레지스터는 비동기 데이터를 받는 동기화 체인"이라고 알리는 속성입니다. UG901(v2026.1)에 따르면 Vivado 합성은 이를 DONT_TOUCH처럼 다뤄 체인이 구현 단계 끝까지 그대로 남게 합니다. 다만 2-FF synchronizer는 1-bit 신호용입니다. 여러 비트의 bus를 비트마다 동기화하면 비트마다 다른 clock에 넘어가 값이 섞이므로, bus는 handshake나 async FIFO로 넘깁니다.

## I/O Bank

UG471(v1.10)은 I/O bank를 이렇게 정의합니다.

- 예외를 빼면 bank 하나에 SelectIO 핀이 50개 있습니다.
- 한 bank의 VCCO 핀은 모두 같은 전원에 연결해야 하므로, bank 안의 I/O는 모두 같은 VCCO를 씁니다. VCCO는 그 bank에 배정한 I/O standard의 요구와 맞아야 하고, 틀린 VCCO는 기능 상실이나 소자 손상으로 이어질 수 있다고 UG471은 경고합니다.
- HP(high-performance) bank는 1.8V 이하 standard용이고, HR(high-range) bank는 3.3V까지 지원합니다.

그래서 3.3V LVCMOS 신호와 1.8V 메모리 인터페이스를 한 bank에 섞을 수 없습니다. 보드 설계 단계에서 어떤 핀이 어느 bank에 속하는지, 그 bank의 VCCO를 몇 V로 할지를 먼저 정합니다.

## Soft Processor

LUT와 FF로 CPU 자체를 만들 수도 있습니다. AMD의 MicroBlaze(UG984)는 32-bit와 64-bit 구성이 있는 soft processor이고, 오픈소스로는 PicoRV32·VexRiscv·NEORV32 같은 RISC-V 코어가 있습니다.

soft core가 fabric을 얼마나 쓰는지 감을 잡기 위해 PicoRV32(YosysHQ/picorv32, commit `ef203c2`, 기본 파라미터)를 같은 방식으로 합성했습니다.

```text
     2128 cells
        1   BUFG
       96   CARRY4
      571   FDRE
        3   FDSE
      102   IBUF
        9   INV
      226   LUT2
       59   LUT3
      186   LUT4
      429   LUT5
      127   LUT6
      307   OBUF
       12   RAM32M
```

LUT2~LUT6을 더하면 1,027개이고, register file은 distributed RAM(`RAM32M` 12개, UG474 기준 LUT 48개)으로 들어가 LUT는 모두 약 1,075개입니다. FF는 574개입니다. LUT 수로는 아래 표의 Spartan-7 XC7S6(LUT 3,752개)에도 들어가지만, 이 합성은 코어 포트 409개를 모두 I/O 버퍼로 뺀 top이라 XC7S6의 최대 I/O 100개를 넘습니다. 실제로는 메모리·주변장치와 함께 칩 안에 넣어 씁니다. 이 숫자는 Yosys 0.71 기준이고, Vivado나 다른 파라미터 설정에서는 달라집니다.

hard SoC(Zynq 등)는 Arm 코어가 실리콘에 들어 있어 fabric을 쓰지 않습니다. soft core는 fabric만 있으면 어느 디바이스에나 넣을 수 있다는 것이 장점입니다.

## FPGA 자원 비교

데이터시트 표의 "Logic Cells"는 LUT 개수가 아닙니다. 7 series는 slice당 LUT 4개·FF 8개이므로(DS180 Table 2·4 주석) LUT = slice × 4, FF = slice × 8로 계산합니다. Zynq UltraScale+는 DS891이 CLB LUT와 FF를 직접 적어 둡니다.

| 디바이스 | 출처 | LUT | FF | BRAM | DSP slice |
|------|------|-----|----|----|----|
| Spartan-7 XC7S6 | DS180 Table 2 (slice 938) | 3,752 | 7,504 | 5 × 36 Kb = 180 Kb | 10 |
| Artix-7 XC7A35T | DS180 Table 4 (slice 5,200) | 20,800 | 41,600 | 50 × 36 Kb = 1,800 Kb | 90 |
| Zynq-7000 Z-7020 | DS190 Table 1 | 53,200 | 106,400 | 140 × 36 Kb (4.9 Mb) | 220 |
| Zynq US+ ZU3EG | DS891 Table 3 | 70,560 | 141,120 | 216 블록 (7.6 Mb) | 360 |

같은 표에서 Logic Cells 값은 XC7S6이 6,000, XC7A35T가 33,280입니다. "A35T는 33K LUT"처럼 Logic Cells를 LUT 수로 읽으면 실제보다 60% 크게 잡게 됩니다(33,280 / 20,800 = 1.6).

## 개발 흐름

1. RTL(Verilog/VHDL) 또는 HLS C++로 회로를 기술합니다.
2. Synthesis: RTL을 LUT·FF·BRAM·DSP 같은 primitive netlist로 바꿉니다. 위의 Yosys 출력이 이 단계의 결과입니다.
3. Place & Route: primitive를 실제 site에 놓고 배선합니다.
4. Timing analysis: 모든 경로가 constraint 안에 들어오는지 확인합니다.
5. Bitstream 생성: AMD Vivado는 `.bit` 파일을 만듭니다.
6. Programming: JTAG으로 FPGA 설정 메모리에 load하거나 flash에 씁니다.

Synthesis는 SW의 compile에, P&R은 link와 배치를 합친 단계에 해당합니다. Vivado에서 각 단계를 돌리는 방법은 [다음 편](/blog/embedded/modern-recipes/part11-02-vivado-usage)에서 다룹니다.

## 작은 예시 — LED 점멸

26-bit 카운터의 최상위 비트로 LED를 켜고 끄는 가장 작은 설계입니다.

```verilog
module blink(
    input  wire clk,    // 100 MHz
    output wire led
);
    reg [25:0] cnt = 0;
    always @(posedge clk) cnt <= cnt + 1;
    assign led = cnt[25];
endmodule
```

`cnt[25]`는 2^26 clock마다 한 주기를 돌므로 100 MHz에서 100 × 10^6 / 2^26 ≈ 1.49 Hz로 깜빡입니다(켜짐·꺼짐이 각각 약 0.34초). 레지스터 초기값 `= 0`은 FPGA에서는 configuration 때 값으로 들어가지만, Verilator `-Wall`은 이를 `PROCASSINIT` 경고로 표시하므로 lint는 `-Wall` 없이 돌렸습니다.

```text
       37 cells
        1   BUFG
        7   CARRY4
       26   FDRE
        1   IBUF
        1   INV
        1   OBUF
```

26비트 카운터는 FF 26개(`FDRE`)와 carry chain `CARRY4` 7개(4비트씩, 26비트를 덮으려면 7개)로 매핑됐습니다. 덧셈을 LUT로 풀지 않고 slice의 전용 carry logic에 태운 결과입니다.

## CPU와의 차이

| 축 | CPU | FPGA |
|----|-----|------|
| 실행 모델 | 명령을 하나씩 fetch·decode·execute | 합성된 회로 전체가 매 clock 동시에 동작 |
| latency | cache·분기 예측·인터럽트에 따라 변함 | 파이프라인 단 수로 clock 단위가 고정 |
| 수정 | 소스를 고쳐 다시 빌드하고 실행 | 다시 합성·P&R·bitstream 생성 후 다시 load |
| clock | 칩과 OS가 정하는 clock | 설계마다 timing closure로 정해지는 clock |

clock 숫자만으로 CPU와 비교하면 안 되는 이유는 매 clock 하는 일의 양이 다르기 때문입니다. 앞의 Z-7020 예처럼 처리량은 "DSP 수 × clock × DSP당 연산"으로 상한을 계산하고, 그다음 메모리 대역폭과 timing으로 깎아 나갑니다.

## SoC FPGA — Hard core + Fabric

Zynq 계열은 Arm 코어를 실리콘으로 넣은 processing system(PS)과 fabric(programmable logic, PL)을 한 칩에 묶습니다. DS190에 따르면 Zynq-7000은 Cortex-A9 기반 PS를 갖고, DS891에 따르면 Zynq UltraScale+ MPSoC EG 디바이스는 quad-core Cortex-A53과 dual-core Cortex-R5F를 갖습니다. PS에서 Linux를 돌리고 PL에 전용 datapath를 두는 구조이며, 둘 사이는 AXI로 연결합니다. PS와 PL 사이 통신은 [11-05](/blog/embedded/modern-recipes/part11-05-ps-pl-communication)에서 다룹니다.

## 자주 보는 함정

> Clock domain crossing 누락

```verilog
always @(posedge clk_b)
    out <= signal_from_clk_a;   /* synchronizer 없이 다른 domain 신호를 바로 래치 */
```

이 코드는 문법상 아무 문제가 없어서 합성도 시뮬레이션도 통과합니다. 받는 쪽 FF의 setup/hold 창 안에서 입력이 바뀌면 metastability가 생기므로, 신호 종류에 맞춰 앞의 2-FF synchronizer, handshake, async FIFO 중 하나를 씁니다.

> 합성 결과가 HDL 의도와 다름 — combinational loop

```verilog
module loop_demo(output reg [7:0] x);
    always @(*) x = x + 1;
endmodule
```

출력이 자기 입력으로 되먹임되는 조합 회로입니다. 도구마다 반응이 다릅니다.

- Verilator 5.054 `--lint-only -Wall`: `%Warning-UNOPTFLAT: ... Circular combinational logic: 'x'`를 내고 종료 코드 1로 멈춥니다.
- Yosys 0.71 `synth_xilinx`: `Warning: found logic loop in module loop_demo`를 8번(비트마다) 낸 뒤, abc9 단계에서 `ERROR: Assert 'no_loops' failed`로 합성이 중단됩니다.
- Vivado(돌리지 않음): UG906(v2026.1) p.363의 methodology check `TIMING-23: Combinational Loop Found`는 Vivado가 loop 안의 timing arc 하나를 끊어 분석한다고 설명합니다. 즉 거부하지 않고 진행합니다. UG901(v2026.1)의 RTL linter도 `INFER-4`(combinational loop detection) 규칙으로 이를 표시합니다.

결국 "합성기가 막아 주겠지"는 도구에 따라 맞지 않습니다. 의도하지 않은 loop라면 RTL을 고치는 것이 UG906의 권고입니다.

> Timing 위반 무시

UG906(v2026.1) p.153~154는 timing summary의 WNS(Worst Negative Slack)를 "max delay로 분석한 모든 경로 중 최악의 slack"이라고 정의하고, TNS는 모든 setup 제약을 만족하면 0, 위반이 있으면 음수라고 적습니다. WNS가 음수라는 것은 setup 요구를 만족하지 못하는 경로가 하나 이상 남았다는 뜻입니다. 원인 경로에 pipeline을 넣거나 clock을 낮춰 WNS를 0 이상으로 만든 뒤에 굽습니다.

> Reset deassert race

비동기 리셋의 해제도 clock에 대한 timing 검사 대상입니다. UG906 p.153~154는 setup 쪽에 recovery 검사를, hold 쪽에 removal 검사를 포함한다고 적습니다. 외부에서 들어오는 리셋 버튼은 clock과 관계없이 풀리므로 이 검사를 만족시킬 수 없습니다. 그래서 assert는 즉시, deassert는 clock에 맞추는 reset synchronizer를 둡니다.

```verilog
module rst_sync (
    input  wire clk,
    input  wire arst_n,     // 비동기 리셋 입력 (active low)
    output wire rst_n       // assert는 즉시, deassert는 clk에 맞춰
);
    (* ASYNC_REG = "TRUE" *) reg r1;
    (* ASYNC_REG = "TRUE" *) reg r2;
    always @(posedge clk or negedge arst_n) begin
        if (!arst_n) begin
            r1 <= 1'b0;
            r2 <= 1'b0;
        end else begin
            r1 <= 1'b1;
            r2 <= r1;
        end
    end
    assign rst_n = r2;
endmodule
```

10 ns clock(5 ns에 첫 상승 edge)으로 23 ns에 리셋을 풀고 63 ns에 다시 건 Icarus 시뮬레이션 결과입니다.

```text
$ iverilog -g2012 -o rst tb_rst.v rst_sync.v && vvp -n rst
0 ns arst_n=0 rst_n=x
5 ns arst_n=0 rst_n=0
23 ns arst_n=1 rst_n=0
35 ns arst_n=1 rst_n=1
63 ns arst_n=0 rst_n=0
```

해제는 23 ns에 들어왔지만 `rst_n`은 두 번째 상승 edge인 35 ns에야 1이 되고, 다시 걸면 63 ns에 clock을 기다리지 않고 바로 0이 됩니다. 0 ns에 `x`인 이유는 `arst_n`이 처음부터 0이라 `negedge`가 없었기 때문이고, 첫 clock edge(5 ns)에서 리셋 분기가 실행되며 0이 됩니다.

> Pin assignment 누락

XDC에 핀 위치(LOC)가 없는 포트가 있으면 Vivado는 이를 그냥 아무 핀에 놓고 끝내지 않습니다. UG906(v2026.1) p.48에 따르면 unconstrained I/O는 DRC에서 critical warning으로 보고되고, `write_bitstream` 단계에서 error로 올라가 bitstream 생성을 막습니다. 문제는 핀을 *틀리게* 지정했을 때입니다. 이 경우 DRC는 통과하므로 보드 회로도와 XDC를 한 줄씩 대조해야 합니다.

## 정리

- 7 series fabric은 6-input LUT, slice당 FF 8개, 36 Kb BRAM, 25 × 18 DSP48E1, bank당 50핀 I/O로 이뤄집니다.
- 데이터시트의 Logic Cells는 LUT 수가 아닙니다. 7 series는 slice × 4로 LUT를 계산합니다.
- 동기 읽기 배열은 BRAM으로, `acc <= acc + a*b`는 레지스터까지 DSP48E1 하나로 매핑됩니다(Yosys 0.71 xc7 합성 결과).
- clock region은 높이 50 CLB·가로 절반 영역입니다. clock domain 사이 1-bit 신호는 2-FF synchronizer, bus는 handshake나 async FIFO로 넘깁니다.
- combinational loop는 도구마다 반응이 다릅니다. Vivado는 timing arc를 끊고 진행하므로 RTL에서 없애야 합니다.
- WNS가 음수면 굽지 않습니다. 핀 지정이 빠지면 Vivado가 bitstream 생성을 막습니다.

다음 편은 **Vivado 사용법**입니다.

## 관련 항목

- [11-02: Vivado 사용법](/blog/embedded/modern-recipes/part11-02-vivado-usage)
- [11-04: AXI 인터페이스](/blog/embedded/modern-recipes/part11-04-axi)
- [11-05: PS-PL 통신](/blog/embedded/modern-recipes/part11-05-ps-pl-communication)
- [11-14: Intel Quartus 사용법](/blog/embedded/modern-recipes/part11-14-intel-quartus)
