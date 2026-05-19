---
title: "11-14: Intel Quartus 사용법 — Platform Designer·Nios II·HLS"
date: 2026-05-17T16:00:00
description: "Intel Quartus Prime·Platform Designer(Qsys)·Nios II soft processor·Intel HLS·partial reconfig 사용법."
series: "Modern Embedded Recipes"
seriesOrder: 136
tags: [recipes, fpga, quartus, intel, altera]
---

## 한 줄 요약

> **"Quartus Prime은 Intel(구 Altera) FPGA의 toolchain입니다."** 흐름은 Vivado와 비슷하지만 *Platform Designer(Qsys)*와 *Nios II*가 Intel만의 색깔입니다.

## 어떤 상황에서 쓰나

Cyclone 10, Cyclone V, Arria 10, Stratix 10, Agilex 등 Intel FPGA를 다룰 때 Quartus가 표준입니다. DE10-Nano, DE0-Nano 같은 학습 보드부터 Stratix 10 GX 양산 시스템까지 같은 toolchain. Quartus Prime은 Lite (무료) / Standard / Pro 세 edition.

```text
Lite        : Cyclone 10 LP, MAX 10 — 무료
Standard    : Cyclone V, Arria V, Stratix V — 유료
Pro         : Arria 10, Stratix 10, Agilex — 유료
```

## Project 생성

GUI:

```text
File → New Project Wizard
  - location, name
  - target device family + part (예: 10CL025YU256C8G)
  - EDA tool (ModelSim, Synplify 등 선택)
  - Finish
```

TCL:

```tcl
project_new myproj -overwrite
set_global_assignment -name FAMILY "Cyclone 10 LP"
set_global_assignment -name DEVICE 10CL025YU256C8G
set_global_assignment -name TOP_LEVEL_ENTITY top
set_global_assignment -name VERILOG_FILE src/top.v
set_global_assignment -name SDC_FILE constr/top.sdc
project_close
```

## SDC Constraint

Quartus는 *Synopsys Design Constraints (SDC)*. XDC와 표기 비슷.

```tcl
# Clock
create_clock -period 20.000 -name clk_50 [get_ports clk_50]

# Generated clock
derive_pll_clocks
derive_clock_uncertainty

# False path
set_false_path -from [get_ports reset_n]

# I/O timing
set_input_delay  -clock clk_50 -max 2 [get_ports rx]
set_output_delay -clock clk_50 -max 2 [get_ports tx]
```

Pin assignment는 `.qsf` 파일에:

```tcl
set_location_assignment PIN_M9 -to clk_50
set_location_assignment PIN_A15 -to "led[0]"
set_location_assignment PIN_A13 -to "led[1]"
set_instance_assignment -name IO_STANDARD "3.3-V LVTTL" -to clk_50
```

또는 Pin Planner GUI.

## Compile

```text
Processing → Start Compilation
```

TCL:

```tcl
load_package flow
execute_flow -compile
```

Compilation = Analysis & Synthesis + Fitter (P&R) + Assembler + TimeQuest.

## TimeQuest — Timing Analysis

```text
Tools → TimeQuest Timing Analyzer

Setup summary:
  Worst-case slack:  0.523 ns   ← positive면 OK
  Total negative slack: 0.000

Hold summary:
  Worst-case slack:  0.087 ns
```

Vivado의 WNS와 동일 개념. Slack 음수 path는 *highlight* 후 *resynthesize* 또는 pipeline 추가.

## Bitstream Programming

```text
Tools → Programmer
  - Mode: JTAG
  - Add File: output_files/top.sof
  - Start
```

CLI:

```bash
quartus_pgm -m jtag -o "p;output_files/top.sof"
```

`.sof`는 SRAM bitstream (volatile). `.pof`는 flash. `.jic`은 EPCS/EPCQ serial flash.

```bash
# .sof → .jic 변환 (flash 용)
quartus_cpf -c convert.cof
quartus_pgm -m jtag -o "p;top.jic"
```

## Platform Designer (Qsys)

System Integration GUI. AXI/Avalon bus, Nios II processor, IP block을 GUI로 묶음.

```text
Tools → Platform Designer
  - Add IP from library: Nios II/e (economy core)
  - Add: On-Chip Memory (16 KB)
  - Add: JTAG UART
  - Add: PIO (parallel I/O)
  - Connect:
      Nios II data → onchip_memory s1
      Nios II instr → onchip_memory s1
      Nios II data → jtag_uart avalon_jtag_slave
      Nios II data → pio s1
  - Auto-assign base address
  - Generate HDL
  - Add wrapper to project
```

Vivado의 Block Design / IP Integrator와 같은 위치. *Avalon bus*는 Intel 독자 protocol (AXI와 유사).

## Nios II Soft Processor

```text
Nios II/e : 가장 작은 (~700 LE), no pipeline
Nios II/s : standard (~1500 LE), 5-stage pipeline
Nios II/f : fast (~2000 LE), branch predictor, cache
```

C/C++ 코드 작성:

```bash
nios2-bsp default board.bsp
cd board.bsp/app
# Eclipse 또는 Nios II Software Build Tools
```

```c
#include "sys/alt_stdio.h"
#include "altera_avalon_pio_regs.h"

int main(void) {
    while (1) {
        IOWR_ALTERA_AVALON_PIO_DATA(LED_PIO_BASE, 0x55);
        alt_printf("Hello\n");
    }
}
```

JTAG UART로 stdout이 host에 보임. Eclipse-based IDE 또는 CLI build.

## Intel HLS

Quartus와 함께 Intel HLS compiler (C++ → HDL):

```cpp
#include "HLS/hls.h"

component
int add(int a, int b) {
    return a + b;
}
```

```bash
i++ adder.cpp -o adder.fpga
```

Vivado HLS와 비슷. Pragma는 약간 다름:

```cpp
component
void vec_add(int *a, int *b, int *c, int n) {
    #pragma ii 1
    for (int i = 0; i < n; i++) {
        c[i] = a[i] + b[i];
    }
}
```

## Partial Reconfiguration

큰 design의 *일부 영역*만 runtime에 교체. Cyclone V/Arria V 이상에서 지원.

```text
1. PR region 정의 (Project → Assignments → PR Region)
2. Static region (기본 동작) + PR region (교체 대상) 분리
3. Persona별 .rbf 생성
4. Runtime에 PR_CONFIG_DATA에 .rbf write
```

```c
// Runtime API
alt_partial_reconfig_block(PR_CONTROLLER_BASE,
                            persona_a_bin, sizeof(persona_a_bin));
```

대표 사례. Neural network model을 runtime에 교체, 다른 codec을 동일 region에 load.

## Signal Tap — Internal Logic Analyzer

Vivado ILA의 Intel 버전.

```text
Tools → Signal Tap Logic Analyzer
  - Add nodes: 보고 싶은 signal
  - Trigger condition
  - Compile (Signal Tap이 design에 포함)
  - Program board
  - Capture
```

실제 hardware에서 wave를 잡습니다.

## ModelSim 통합

```text
Tools → Launch Simulation Library Compiler
  → Quartus 라이브러리를 ModelSim용으로 빌드

Project → Settings → EDA Tool Settings → Simulation:
  - Tool: ModelSim-Intel FPGA
  - Format: Verilog HDL

Tools → Run Simulation Tool → RTL Simulation
```

Testbench 작성 후 sim:

```verilog
module top_tb;
    reg clk_50 = 0;
    always #10 clk_50 = ~clk_50;

    top dut (.clk_50(clk_50), .led(led));

    initial begin
        $dumpfile("top.vcd");
        $dumpvars(0, top_tb);
        #10000 $finish;
    end
endmodule
```

## Vivado와의 비교

| 항목 | Vivado | Quartus |
|---|---|---|
| Constraint | XDC (Synopsys-like) | SDC + QSF |
| Block design | IP Integrator | Platform Designer (Qsys) |
| Bus | AXI | Avalon (AXI 지원도) |
| Soft CPU | MicroBlaze | Nios II, Nios V |
| HLS | Vitis HLS | Intel HLS |
| ILA | ChipScope/ILA | Signal Tap |
| Bitstream | .bit, .mcs | .sof, .pof, .jic |
| TCL | Vivado TCL | Quartus TCL |
| OpenCL | Vitis | Intel FPGA OpenCL |

흐름은 거의 동일. 명령어와 file extension만 다릅니다.

## TCL 자동화

```tcl
# build.tcl
project_open myproj.qpf

# Compile
load_package flow
execute_flow -compile

# Report
load_report
set wns [get_timing_analysis_summary_info -wns -setup]
puts "Worst slack: $wns"
unload_report

project_close
```

```bash
quartus_sh -t build.tcl
```

CI/CD에 그대로 연결.

## Cyclone V SoC — Hard ARM + Fabric

Cyclone V SoC는 *dual-core ARM Cortex-A9 + fabric*. Zynq 7000과 같은 위치.

**Hard processor system (HPS):**

- 2× Cortex-A9
- L1/L2 cache
- DDR3 controller
- GMAC, USB, SD, UART, ...

**FPGA fabric:**

- LUT, FF, BRAM, DSP
- HPS-FPGA bridge (Lightweight HPS-to-FPGA, HPS-to-FPGA, FPGA-to-HPS)

HPS-FPGA bridge가 Zynq의 GP/HP/ACP에 해당.

```c
// Linux 측
#include <hwlib.h>
volatile uint32_t *regs = mmap(..., 0xC0000000);   // lwhps2fpga
regs[0] = 0x1234;
```

## 자주 보는 함정

> Edition 차이

Cyclone V는 Standard에서만. Lite는 안 됨. Stratix 10은 Pro에서만. Family/edition 매핑 확인.

> Pin assignment 잊음

QSF 또는 Pin Planner에서 핀 지정. 없으면 자동 배치 → 보드 신호 불일치.

> Avalon vs AXI

같은 design에 Avalon과 AXI 섞이면 bridge 필요. Platform Designer가 자동 삽입.

> Nios II 코드 영역

소형 Nios II/e + 16KB on-chip RAM이면 code/data가 모두 안 들어가는 경우. SDRAM controller IP를 추가하고 BSP에서 linker script 조정.

> Signal Tap 빼는 걸 잊음

Production build에서 Signal Tap이 LE를 잡아먹음. 분리된 build configuration 사용.

> .pof vs .jic

CFM (configuration flash memory)에 따라 format 다름. EPCS/EPCQ serial flash는 .jic, MAX 10 internal은 .pof.

## 정리

- Quartus Prime은 Intel FPGA toolchain. Lite/Standard/Pro edition.
- Constraint는 SDC (timing) + QSF (pin, project setting).
- Platform Designer (Qsys)가 block design / IP integration.
- Nios II soft processor: /e/s/f 세 등급.
- Intel HLS: Vivado HLS와 비슷, pragma만 다름.
- Signal Tap이 Vivado ILA에 해당.
- Cyclone V SoC = Zynq 7000과 같은 hard ARM + fabric 구조.
- TCL `quartus_sh`로 CI 자동화.

다음 편은 **Part 12 시작 — NPU 아키텍처**입니다.

## 관련 항목

- [11-01: FPGA 기초](/blog/embedded/modern-recipes/part11-01-fpga-basics)
- [11-02: Vivado 사용법](/blog/embedded/modern-recipes/part11-02-vivado-usage)
- [11-13: OpenCL on FPGA](/blog/embedded/modern-recipes/part11-13-opencl-fpga)
- [12-02: NPU 아키텍처](/blog/embedded/modern-recipes/part12-02-npu-architecture)
