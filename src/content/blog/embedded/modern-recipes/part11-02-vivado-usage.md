---
title: "11-02: Vivado 사용법 — Project·Constraint·Synth·Impl·Bitstream"
date: 2026-05-17T04:00:00
description: "Vivado project 흐름·XDC constraint·synthesis/implementation·timing report·bitstream programming의 실전 패턴."
series: "Modern Embedded Recipes"
seriesOrder: 124
tags: [recipes, fpga, vivado, xilinx]
---

## 한 줄 요약

> **"Vivado는 HDL → bitstream까지의 전체 toolchain입니다."** GUI 익숙해지면 빠르지만, TCL script로 자동화하면 *재현 가능한 빌드*가 됩니다.

## 어떤 상황에서 쓰나

Xilinx 7-series, UltraScale, UltraScale+, Zynq, Versal 모두 Vivado로 빌드합니다 (Versal은 Vivado ML edition). Lattice는 Diamond/Radiant, Intel은 Quartus, Microchip은 Libero를 씁니다.

CI에서 자동 빌드, board 양산 시 자동 bitstream 생성, IP integration 등 모든 단계가 Vivado TCL로 묶을 수 있습니다.

## Project 생성

GUI 흐름:

```text
File → New Project
  - name, location
  - RTL Project
  - Add source files (.v, .vhd, .sv)
  - Add constraint (.xdc)
  - Select target part (예: xc7a35tcpg236-1)
  - Finish
```

TCL로 같은 일:

```tcl
create_project myproj ./myproj -part xc7a35tcpg236-1
add_files -fileset sources_1 ./src/top.v ./src/uart.v
add_files -fileset constrs_1 ./constr/top.xdc
set_property top top [current_fileset]
```

## XDC Constraint

XDC (Xilinx Design Constraints)는 *어느 핀에 어느 신호*, *clock 주파수*, *IO standard*를 지정합니다.

```tcl
# clock 100 MHz on E3
set_property -dict { PACKAGE_PIN E3 IOSTANDARD LVCMOS33 } [get_ports clk]
create_clock -period 10.000 -name sys_clk [get_ports clk]

# LED
set_property -dict { PACKAGE_PIN H17 IOSTANDARD LVCMOS33 } [get_ports {led[0]}]
set_property -dict { PACKAGE_PIN K15 IOSTANDARD LVCMOS33 } [get_ports {led[1]}]

# UART
set_property -dict { PACKAGE_PIN A9  IOSTANDARD LVCMOS33 } [get_ports uart_rx]
set_property -dict { PACKAGE_PIN D10 IOSTANDARD LVCMOS33 } [get_ports uart_tx]

# Reset
set_property -dict { PACKAGE_PIN C2  IOSTANDARD LVCMOS33 } [get_ports rst_n]
```

XDC가 *없으면* P&R이 임의 핀 배치 → 보드에 맞지 않음. Vendor가 board별 XDC 템플릿을 제공.

## Synthesis 실행

```text
Flow Navigator → Run Synthesis
  → 끝나면 "Open Synthesized Design"
  → utilization, timing 예비 확인
```

TCL:

```tcl
launch_runs synth_1 -jobs 8
wait_on_run synth_1

open_run synth_1
report_utilization -file synth_util.rpt
report_timing_summary -file synth_timing.rpt
close_design
```

Synthesis는 *HDL → netlist (LUT/FF/BRAM/DSP mapping)*. 일반적으로 몇 분.

## Implementation 실행

```text
Run Implementation → 끝나면 timing report 확인
```

```tcl
launch_runs impl_1 -jobs 8
wait_on_run impl_1

open_run impl_1
report_timing_summary -file impl_timing.rpt
report_utilization -file impl_util.rpt
```

Implementation = *Place + Route*. 보통 synthesis보다 *훨씬 오래* 걸립니다 (수십 분~수 시간 가능).

## Timing Report 읽기

```text
Worst Negative Slack (WNS):     0.214 ns      ← positive면 OK
Total Negative Slack (TNS):     0.000 ns
Number of failing paths:        0

Worst Hold Slack (WHS):         0.052 ns
Total Hold Slack (THS):         0.000 ns
Number of failing hold paths:   0
```

WNS 음수면 setup time 위반. WHS 음수면 hold time 위반. Setup은 *clock 낮추기·pipeline 추가·routing 최적화*로 해결. Hold는 보통 tool이 처리하지만 가끔 buffer 삽입이 필요.

```text
실패 path 분석:
Path:        4.825 ns (required 10.000 - clock skew, setup time = 4.611 ns)
Source:      cpu/reg_file_reg[0]/C
Destination: alu/result_reg[0]/D
Data Path Delay: 4.611 ns (LUT × 8 + net × 7)
Logic Levels: 8

→ LUT depth가 8단계. Pipeline register 추가로 4-4 분할.
```

## Bitstream 생성

```text
Generate Bitstream → .bit 파일
```

```tcl
launch_runs impl_1 -to_step write_bitstream -jobs 8
wait_on_run impl_1
```

`./myproj/myproj.runs/impl_1/top.bit` 생성.

## Programming

GUI:

```text
Hardware Manager → Open Target → Auto Connect
  → Program Device → 위 .bit 파일 선택
```

TCL:

```tcl
open_hw_manager
connect_hw_server
open_hw_target

current_hw_device [lindex [get_hw_devices] 0]
set_property PROGRAM.FILE {./myproj.runs/impl_1/top.bit} [current_hw_device]
program_hw_devices [current_hw_device]
```

JTAG으로 FPGA SRAM에 즉시 load. 전원이 꺼지면 사라집니다. 영구 저장은 *flash programming*.

## Flash Programming

```tcl
# .bit → .mcs (flash 형식)
write_cfgmem -force -format MCS -interface SPIx4 -size 16 \
             -loadbit "up 0x0 top.bit" top.mcs

# flash에 write
create_hw_cfgmem -hw_device [current_hw_device] -mem_dev "s25fl128sxxxxxx0-spi-x1_x2_x4"
set_property PROGRAM.ADDRESS_RANGE  use_file [current_hw_cfgmem]
set_property PROGRAM.FILES top.mcs [current_hw_cfgmem]
program_hw_cfgmem [current_hw_cfgmem]
```

이제 전원 인가 시 flash → FPGA로 자동 load.

## IP Integrator — Block Design

Zynq, MicroBlaze, AXI peripheral 등은 GUI block diagram으로 더 빠릅니다.

```text
IP Integrator → Create Block Design
  → Add Zynq7 Processing System
  → Add AXI Lite slave (custom)
  → Run Connection Automation
  → Validate Design
  → Generate Output Products
  → Create HDL Wrapper
```

자동으로 AXI interconnect, clock, reset 회로가 만들어집니다. Hand-written보다 *훨씬 빠릅니다*.

## TCL로 full 빌드 script

```tcl
# build.tcl
create_project -force build_proj ./build -part xc7z020clg400-1
add_files ./src
add_files -fileset constrs_1 ./constr/board.xdc
set_property top top [current_fileset]

launch_runs synth_1 -jobs 8
wait_on_run synth_1

launch_runs impl_1 -to_step write_bitstream -jobs 8
wait_on_run impl_1

# Reports
open_run impl_1
report_utilization -file ./build/util.rpt
report_timing_summary -file ./build/timing.rpt
file copy -force ./build/build_proj.runs/impl_1/top.bit ./build/top.bit
```

```bash
vivado -mode batch -source build.tcl
```

CI/CD에 그대로 들어갑니다.

## Utilization 보기

```text
+----------------------------+------+-------+-----------+-------+
|          Site Type         | Used | Fixed | Available | Util% |
+----------------------------+------+-------+-----------+-------+
| Slice LUTs                 | 8521 |     0 |     53200 | 16.02 |
|   LUT as Logic             | 8210 |     0 |     53200 | 15.43 |
|   LUT as Memory            |  311 |     0 |     17400 |  1.78 |
| Slice Registers            | 9874 |     0 |    106400 |  9.28 |
| Block RAM Tile             |   12 |     0 |       140 |  8.57 |
| DSPs                       |   45 |     0 |       220 | 20.45 |
+----------------------------+------+-------+-----------+-------+
```

LUT 80% 넘어가면 P&R이 어려워집니다. 90% 넘으면 *routing congestion*으로 timing 못 맞춤. Resource 여유를 두고 설계.

## 시간 단축 팁

```tcl
# 빠른 빌드 (timing 무시)
set_property strategy "Flow_RuntimeOptimized" [get_runs synth_1]
set_property strategy "Flow_RuntimeOptimized" [get_runs impl_1]

# vs. 최고 성능
set_property strategy "Performance_ExplorePostRoutePhysOpt" [get_runs impl_1]
```

개발 중에는 빠른 strategy, release 직전 최적화 strategy.

## Cross-probe & ILA

내장 logic analyzer로 *실제 동작 중인 FPGA*의 신호를 잡습니다.

```tcl
# 디버그할 net 표시
set_property MARK_DEBUG true [get_nets {data[*]}]
set_property MARK_DEBUG true [get_nets valid]

# 합성 후 ILA 삽입
# Run synthesis → Open Synth Design → Set Up Debug
```

Bitstream에 ILA가 포함됩니다. Hardware Manager에서 *trigger 조건*을 설정해 *실제 hardware*에서 wave를 잡습니다.

## 자주 보는 함정

> XDC 누락

핀 assignment가 없으면 *어느 핀이든* 배치. 보드의 LED 핀이 다른 신호와 연결될 수 있음.

> Clock 안 정의

```tcl
create_clock -period 10.000 -name sys_clk [get_ports clk]
```

없으면 *timing analysis가 무의미*. Internal-derived clock도 `create_generated_clock`으로 명시.

> CDC를 모르고 사용

서로 다른 clock domain 간 신호를 직접 연결. Vivado가 warning을 내지만 무시하면 *간헐적 fail*. False path 또는 max delay constraint 추가 + synchronizer.

> Reset 종류 혼합

```verilog
always @(posedge clk or negedge rst_n)   // async reset
...
always @(posedge clk)                     // sync reset
    if (!rst_n) ...
```

한 design에 두 종류가 섞이면 timing 분석이 어려워짐. 한 종류로 통일.

> Out-of-context build 안 함

큰 design은 모듈별 *out-of-context synthesis*로 시간을 줄임. Top-level만 P&R 재실행.

> ILA 빼는 걸 잊고 release

ILA가 들어간 채 release하면 LUT 수천 개 낭비. Production build에서는 자동 disable되도록 conditional.

## 정리

- Vivado는 Xilinx FPGA의 전체 toolchain. GUI + TCL 둘 다.
- XDC로 핀·clock·IO standard 명시. 없으면 P&R이 의미 없음.
- Synthesis → Implementation (P&R) → Bitstream.
- WNS (Worst Negative Slack) 음수면 절대 굽지 않음.
- Block Design / IP Integrator는 SoC·AXI에 빠름.
- TCL script로 CI 자동화. `vivado -mode batch -source build.tcl`.
- ILA로 실제 hardware에서 wave 잡기.
- LUT 사용률 80% 이내가 안전. 90% 넘으면 routing 망함.

다음 편은 **PCIe BAR**입니다.

## 관련 항목

- [11-01: FPGA 기초](/blog/embedded/modern-recipes/part11-01-fpga-basics)
- [11-03: PCIe BAR](/blog/embedded/modern-recipes/part11-03-pcie-bar)
- [11-04: AXI 인터페이스](/blog/embedded/modern-recipes/part11-04-axi)
- [11-14: Intel Quartus 사용법](/blog/embedded/modern-recipes/part11-14-intel-quartus)
