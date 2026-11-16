---
title: "Vivado 사용법 — Project·Constraint·Synth·Impl·Bitstream"
slug: "embedded/modern-recipes/part11-02-vivado-usage"
date: 2026-04-20T09:01:00
description: "Arty A7-35 보드를 예로 Vivado project 생성, XDC, synthesis·implementation, timing·utilization report, JTAG·flash programming, ILA를 Tcl 한 벌로 묶는 방법을 AMD UG835·UG903·UG904·UG906·UG908 기준으로 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 124
tags: [recipes, fpga, vivado, xilinx]
topics: ["embedded"]
---

## 한 줄 요약

> **"Vivado는 HDL에서 bitstream까지 가는 AMD FPGA의 전체 toolchain입니다."** GUI로 익히고 나면, 같은 흐름을 Tcl 스크립트 한 벌로 묶어 *다시 돌려도 같은 결과가 나오는 빌드*로 만드는 것이 이 글의 목표입니다.

## 어떤 상황에서 쓰나

[앞 편](/blog/embedded/modern-recipes/part11-01-fpga-basics)에서 본 synthesis → place & route → bitstream 흐름을 실제 도구로 돌리는 단계입니다. GUI 버튼으로 한 번 빌드하는 것과, CI가 매번 같은 스크립트로 빌드하는 것은 다른 일입니다. 버튼으로 바꾼 설정은 기억에만 남지만 Tcl은 저장소에 남습니다.

비유하면 GUI는 손으로 요리하는 것이고, Tcl 스크립트는 레시피 카드입니다. 처음엔 손으로 익히고, 맛이 정해지면 카드로 적어 둡니다.

### 이 글의 전제와 출처

- 보드는 Digilent **Arty A7-35**입니다. Digilent의 Vivado board file(`vivado-boards`, arty-a7-35 E.0/1.1)이 이 보드의 FPGA를 `xc7a35ticsg324-1L`로 적고 있고, 핀 번호는 Digilent가 공개한 `Arty-A7-35-Master.xdc`(digilent-xdc 저장소, commit `c8644a9`)에서 가져왔습니다.
- **Vivado는 이 환경에 설치할 수 없어 돌리지 않았습니다.** 그래서 이 글에는 Vivado가 낸 출력이 없습니다. 모든 Tcl 명령과 옵션은 AMD 문서에서 확인했습니다: UG835 v2026.2(Tcl Command Reference), UG903 v2026.1(Using Constraints), UG901 v2026.1(Synthesis), UG904 v2026.2(Implementation), UG906 v2026.1(Design Analysis and Closure Techniques), UG908 v2026.2(Programming and Debugging), UG994 v2026.1(IP Integrator).
- Tcl 스크립트는 Vivado 명령을 인자만 출력하는 빈 함수로 바꿔 macOS 기본 `tclsh`로 돌려, Tcl 문법 오류 없이 끝까지 실행되는지만 확인했습니다. 명령이 Vivado에서 성공하는지는 확인한 것이 아닙니다.

## Project 생성

GUI에서는 New Project wizard로 RTL Project를 만들고 소스(`.v`, `.sv`, `.vhd`), constraint(`.xdc`), target part를 차례로 고릅니다. 같은 일을 Tcl로 하면 네 줄입니다. UG894(v2026.1) 1장의 예제 스크립트도 `create_project` → `add_files` → `launch_runs` → `wait_on_run` 순서입니다.

```tcl
create_project arty_blink ./build -part xc7a35ticsg324-1L
add_files -fileset sources_1 ./src/top.v ./src/uart.v
add_files -fileset constrs_1 ./constr/arty.xdc
set_property top top [current_fileset]
```

`-part`의 이름은 보드마다 다릅니다. 같은 XC7A35T라도 패키지와 speed grade가 다르면 다른 part이므로, 보드 제조사가 낸 board file이나 회로도에서 그대로 옮깁니다.

## XDC Constraint

XDC(Xilinx Design Constraints)는 HDL 포트가 *어느 핀*에 붙는지, 그 핀의 *I/O standard*가 무엇인지, *clock 주기*가 얼마인지를 Vivado에 알려 줍니다. 아래는 Arty A7-35 master XDC에서 필요한 줄의 주석만 풀고 포트 이름을 맞췄습니다.

```tcl
# 100 MHz 보드 clock (E3)
set_property -dict { PACKAGE_PIN E3  IOSTANDARD LVCMOS33 } [get_ports CLK100MHZ]
create_clock -add -name sys_clk_pin -period 10.00 -waveform {0 5} [get_ports CLK100MHZ]

# LED LD4, LD5
set_property -dict { PACKAGE_PIN H5  IOSTANDARD LVCMOS33 } [get_ports {led[0]}]
set_property -dict { PACKAGE_PIN J5  IOSTANDARD LVCMOS33 } [get_ports {led[1]}]

# USB-UART (포트 이름은 master XDC 그대로)
set_property -dict { PACKAGE_PIN A9  IOSTANDARD LVCMOS33 } [get_ports uart_txd_in]
set_property -dict { PACKAGE_PIN D10 IOSTANDARD LVCMOS33 } [get_ports uart_rxd_out]

# chipKIT reset 버튼
set_property -dict { PACKAGE_PIN C2  IOSTANDARD LVCMOS33 } [get_ports ck_rst]
```

master XDC는 모든 줄이 주석 처리된 채로 배포되고, 파일 머리말이 "쓸 핀의 주석을 풀고 `get_ports` 뒤의 이름을 top-level 신호 이름에 맞추라"고 안내합니다. 위 블록은 그 지시를 따랐습니다.

XDC에 핀이 빠진 포트가 있으면 어떻게 될까요. UG906 p.48에 따르면 위치가 없는 I/O는 DRC에서 critical warning으로 보고되고, `write_bitstream` 단계에서 error로 올라가 bitstream 생성을 막습니다. 즉 빠진 핀은 빌드가 잡아 줍니다. 잡아 주지 못하는 것은 *틀린* 핀입니다. 다른 보드의 XDC를 복사하면 문법도 DRC도 통과하므로, part 이름과 XDC가 같은 보드 것인지 먼저 확인합니다.

## Synthesis 실행

GUI에서는 Flow Navigator의 **Run Synthesis**를 누르고, 끝나면 **Open Synthesized Design**으로 utilization과 timing을 미리 봅니다. Tcl로는 run을 띄우고 기다린 뒤 결과를 열어 report를 파일로 씁니다.

```tcl
launch_runs synth_1 -jobs 8
wait_on_run synth_1

open_run synth_1
report_utilization -file synth_util.rpt
report_timing_summary -file synth_timing.rpt
close_design
```

UG835에 따르면 `launch_runs`의 `-jobs` 기본값은 1입니다. 이 단계의 timing은 아직 배선 전 추정값이므로 참고만 하고, 판단은 implementation 뒤의 report로 합니다.

## Implementation 실행

Implementation은 netlist를 실제 site에 배치(`place_design`)하고 배선(`route_design`)하는 단계입니다.

```tcl
launch_runs impl_1 -jobs 8
wait_on_run impl_1

open_run impl_1
report_timing_summary -file impl_timing.rpt
report_utilization -file impl_util.rpt
```

UG904 p.122의 `phys_opt_design` directive 설명은 Hold-Fixing이 일정 threshold를 넘는 hold 위반만 고치고, 그보다 작은 위반은 router가 고칠 것으로 본다고 적습니다. route 뒤에도 남은 setup·hold 위반은 다음 절의 report로 확인합니다.

## Timing Report 읽기

`report_timing_summary`의 Design Timing Summary에서 먼저 보는 값은 네 개입니다. UG906 p.153~154의 정의를 옮기면 다음과 같습니다.

| 값 | 뜻 | 통과 조건 |
|----|----|----|
| WNS (Worst Negative Slack) | max delay(setup·recovery) 분석 경로 중 최악의 slack | 0 이상 |
| TNS (Total Negative Slack) | endpoint별 최악 위반의 합 | 모든 setup 제약을 만족하면 0 |
| WHS (Worst Hold Slack) | min delay(hold·removal) 분석 경로 중 최악의 slack | 0 이상 |
| THS (Total Hold Slack) | endpoint별 최악 hold 위반의 합 | 모든 hold 제약을 만족하면 0 |

WNS가 음수면 실패한 경로를 열어 봅니다. 경로 report에서 UG906 p.88이 설명하는 필드 두 개가 원인을 좁혀 줍니다.

- **Data Path Delay**: 경로의 논리 구간에서 누적된 지연입니다. clock을 데이터로 쓰는 경우가 아니면 clock 지연은 포함하지 않습니다.
- **Logic Levels**: 데이터 경로에 있는 primitive의 종류별 개수입니다. 시작점과 끝점 셀은 빼고 셉니다.

UG906 p.257은 실패 경로를 이렇게 읽으라고 안내합니다. Logic Delay가 전체 경로 지연의 50%를 넘으면 logic depth와 셀 종류를 보고 RTL이나 합성 설정을 바꿉니다. Net Delay가 지배적이면 high fanout net이나 hold fix 우회 배선 같은 물리적 원인을 봅니다. 다만 같은 쪽에 "7 series에서는 LUT 지연이 net delay에 포함된다"는 주석이 있어서, Arty A7 같은 7 series에서는 Net Delay 비율이 원래 높게 나온다는 점을 감안해야 합니다.

## Bitstream 생성

GUI의 **Generate Bitstream**에 해당하는 Tcl은 implementation run을 `write_bitstream` 단계까지 진행시킵니다.

```tcl
launch_runs impl_1 -to_step write_bitstream -jobs 8
wait_on_run impl_1
```

앞 절의 `launch_runs impl_1` 대신 이 명령을 쓰면 implementation과 bitstream 생성을 한 번에 진행합니다. UG835는 `-to_step`을 "마지막으로 실행할 단계"로 설명합니다. 결과 `.bit`는 run 디렉터리(`<project>.runs/impl_1/<top>.bit`)에 생깁니다. UG835 p.121의 `boot_hw_device` 예제도 `./project_netlist.runs/impl_1/sinegen_demo.bit` 같은 경로를 `write_cfgmem`에 넘깁니다.

## Programming — JTAG으로 바로 올리기

DS180에 따르면 7 series는 설정을 SRAM 형태의 내부 latch에 저장하고, 이 저장소는 volatile입니다. 그래서 JTAG으로 올린 bitstream은 전원을 끄면 사라집니다. 개발 중 반복에 쓰는 방법입니다.

```tcl
open_hw_manager
connect_hw_server
open_hw_target

current_hw_device [lindex [get_hw_devices] 0]
set_property PROGRAM.FILE {./build/arty_blink.runs/impl_1/top.bit} [current_hw_device]
program_hw_devices [current_hw_device]
```

## Flash Programming — 전원을 켜면 스스로 올라오게

보드의 SPI flash에 넣어 두면 FPGA가 전원 인가 때 스스로 읽어 configure합니다. 두 단계입니다. 먼저 `.bit`를 flash 이미지(`.mcs`)로 바꿉니다.

```tcl
write_cfgmem -force -format MCS -interface SPIx4 -size 16 \
             -loadbit "up 0x0 ./build/arty_blink.runs/impl_1/top.bit" top.mcs
```

UG835 p.1992에 따르면 `-size`는 MB 단위(2의 거듭제곱)입니다. 128 Mbit flash면 16입니다. `-loadbit "up 0x0 <file>"`는 주소 0부터 위쪽으로 bitstream을 채운다는 뜻입니다.

다음으로 hw_cfgmem 객체를 만들어 flash에 씁니다. `create_hw_cfgmem`의 마지막 인자는 문자열이 아니라 `get_cfgmem_parts`가 돌려주는 객체여야 합니다(UG835 p.304). 아래는 UG835 p.1303(`readback_hw_cfgmem`)과 p.1248(`program_hw_cfgmem`)의 예제를 따른 순서입니다.

```tcl
create_hw_cfgmem -hw_device [current_hw_device] \
    [lindex [get_cfgmem_parts {n25q128-3.3v-spi-x1_x2_x4}] 0]
set cfgMem [current_hw_cfgmem]
set_property PROGRAM.FILES [list top.mcs] $cfgMem
set_property PROGRAM.ADDRESS_RANGE {use_file} $cfgMem
set_property PROGRAM.ERASE 1 $cfgMem
set_property PROGRAM.CFG_PROGRAM 1 $cfgMem
set_property PROGRAM.VERIFY 1 $cfgMem

# FPGA에 flash 접근용 bitstream을 먼저 올리고 flash를 씁니다
create_hw_bitstream -hw_device [current_hw_device] \
    [get_property PROGRAM.HW_CFGMEM_BITFILE [current_hw_device]]
program_hw_devices [current_hw_device]
program_hw_cfgmem $cfgMem
```

flash 부품 이름은 보드마다 다릅니다. Digilent board file은 Arty A7-35 E.0의 Quad SPI flash를 Micron `N25Q128A13ESF40`으로 적고 있어서 여기서는 `n25q128-3.3v`를 썼습니다. 다른 보드라면 회로도의 flash 부품 번호를 UG908 p.463부터의 Table 61(Supported Flash Memory Devices for Artix 7 SPI)과 맞춰 이름을 고릅니다. `PROGRAM.ADDRESS_RANGE {use_file}`은 파일이 차지하는 주소 범위만 지우고 쓰고 검증한다는 뜻이고, `{entire_device}`는 flash 전체입니다(UG835 p.1247).

## IP Integrator — Block Design

Zynq PS, MicroBlaze, AXI 주변장치처럼 표준 bus로 묶는 설계는 block design으로 그리는 편이 빠릅니다. UG994(v2026.1)가 설명하는 흐름을 순서대로 적으면 다음과 같습니다.

1. **Create Block Design**으로 빈 block design을 만듭니다.
2. Zynq7 Processing System이나 custom AXI IP를 추가합니다.
3. **Run Connection Automation**(UG994 p.31)으로 AXI interconnect, clock, reset 연결을 자동으로 만듭니다.
4. **Validate Design**(p.81)으로 연결 검사를 돌립니다.
5. **Generate Output Products**(p.114)로 IP의 합성용 파일을 만듭니다.
6. **Create HDL Wrapper**(p.125)로 block design을 감싸는 top-level HDL을 만듭니다.

AXI 버스 자체는 [11-04](/blog/embedded/modern-recipes/part11-04-axi)에서, PS와 PL 사이 연결은 [11-05](/blog/embedded/modern-recipes/part11-05-ps-pl-communication)에서 다룹니다.

## Tcl로 full 빌드 스크립트

지금까지의 조각을 한 파일로 묶으면 CI에서 그대로 돌릴 수 있습니다.

```tcl
# build.tcl
create_project -force arty_blink ./build -part xc7a35ticsg324-1L
add_files ./src
add_files -fileset constrs_1 ./constr/arty.xdc
set_property top top [current_fileset]

launch_runs synth_1 -jobs 8
wait_on_run synth_1

launch_runs impl_1 -to_step write_bitstream -jobs 8
wait_on_run impl_1

if {[get_property PROGRESS [get_runs impl_1]] != "100%"} {
    puts "ERROR: impl_1 failed"
    exit 1
}

open_run impl_1
report_utilization -file ./build/util.rpt
report_timing_summary -file ./build/timing.rpt
file copy -force ./build/arty_blink.runs/impl_1/top.bit ./build/top.bit
```

```bash
vivado -mode batch -source build.tcl
```

중간의 `PROGRESS` 검사가 중요합니다. UG835 p.1973은 `wait_on_run`이 run이 *끝났다*는 것만 알려 주고 *성공했는지*는 알려 주지 않는다고 설명하며, 같은 `PROGRESS != "100%"` 검사를 예로 듭니다. 그래서 run마다 `PROGRESS`로 성공 여부를 따로 확인합니다.

## Utilization 보기

`report_utilization`은 자원 종류별로 사용량(Used)과 가용량(Available), 그 비율(Util%)을 냅니다. UG906 p.103의 Table 8은 디바이스 전체 report에서 Util%를 Used ÷ Available로 계산한다고 적습니다. Available 열은 데이터시트 값과 같으므로 앞 편의 자원 표로 미리 가늠할 수 있습니다. 예를 들어 XC7A35T는 36 Kb BRAM 50개, DSP 90개이고, slice 5,200개 × LUT 4·FF 8로 계산하면 LUT 20,800개, FF 41,600개입니다(DS180 Table 4와 표 주석 1).

LUT 사용률만으로 "몇 %까지 안전하다"는 기준은 AMD 문서에 없습니다. 사용률은 timing report와 함께 보고, WNS가 음수인데 사용률도 높다면 그때 배치 혼잡을 의심합니다.

## 빌드 시간과 strategy

Vivado는 미리 정의된 strategy로 각 단계의 directive를 한 번에 바꿉니다. UG904 p.234~236의 implementation strategy 표와 UG901 Table 3의 synthesis strategy 표에 있는 이름입니다.

```tcl
# 빠른 반복용
set_property strategy Flow_RuntimeOptimized [get_runs synth_1]
set_property strategy Flow_RuntimeOptimized [get_runs impl_1]

# timing이 안 닫힐 때
set_property strategy Performance_ExplorePostRoutePhysOpt [get_runs impl_1]
```

UG904는 `Flow_RuntimeOptimized`를 "각 단계가 성능을 runtime과 맞바꾸고 phys_opt_design을 끈다"고, `Performance_ExplorePostRoutePhysOpt`를 "Performance_Explore에 route 뒤 phys_opt_design(Explore)을 더한 것"이라고 설명합니다. 큰 설계에서는 하위 모듈을 out-of-context로 따로 합성해 두는 방법도 있습니다. UG901 p.28은 synthesis 설정의 More Options에 `-mode out_of_context`를 주면 그 모듈에 I/O buffer를 넣지 않는다고 설명합니다.

## ILA — 실제 보드에서 신호 보기

시뮬레이션에서 안 보이던 문제는 실제 하드웨어에서 신호를 잡아야 보입니다. ILA(Integrated Logic Analyzer)는 FPGA 안에 넣는 logic analyzer입니다. 디버그할 net에 `MARK_DEBUG`를 걸고, 합성 뒤 **Set Up Debug** wizard로 ILA를 넣습니다(UG908의 "Using the Set Up Debug Wizard to Insert Debug Cores").

```tcl
set_property MARK_DEBUG true [get_nets {data[*]}]
set_property MARK_DEBUG true [get_nets valid]
```

ILA는 bitstream에 포함되는 회로라 fabric 자원을 씁니다. UG908은 ILA의 `C_DATA_DEPTH`(기본 1024 샘플)를 늘리면 ILA가 block RAM을 더 쓰고 설계 성능에 영향을 줄 수 있다고 적습니다. Hardware Manager에서 trigger 조건을 걸면 실제 동작 중인 신호의 파형을 받아 볼 수 있습니다. release 빌드에서는 `MARK_DEBUG`와 ILA를 뺀 constraint 세트를 따로 두면 디버그 회로가 제품 bitstream에 섞이지 않습니다.

## 자주 보는 함정

> 다른 보드의 XDC나 part 이름을 섞어 씀

핀이 *빠지면* Vivado가 bitstream 생성을 막지만(UG906 p.48), 다른 보드의 핀으로 *채우면* 그대로 통과합니다. part 이름과 XDC가 같은 보드 리비전에서 나왔는지 확인합니다.

> clock을 정의하지 않음

```tcl
create_clock -add -name sys_clk_pin -period 10.00 -waveform {0 5} [get_ports CLK100MHZ]
```

clock이 정의되지 않은 레지스터는 timing 분석에서 빠지므로, WNS가 양수로 나와도 그 경로는 검증되지 않았습니다. `check_timing`의 `no_clock` 항목이 정의된 clock이 닿지 않는 clock pin을 보고합니다(UG906 p.157). MMCM·PLL·BUFR 출력은 master clock만 정의하면 Vivado가 자동으로 유도합니다(UG903 p.88). 로직으로 나눈 clock은 이 목록에 없으므로 `create_generated_clock`으로 직접 정의합니다.

> CDC 경로를 제약 없이 둠

서로 다른 비동기 clock 사이의 경로를 그대로 두면 slack 계산 자체가 의미가 없습니다. UG903 p.45는 이런 경로에 `set_clock_groups`, `set_false_path`, `set_max_delay -datapath_only` 같은 timing exception을 두고, 동시에 metastability를 막는 CDC 회로를 넣으라고 권고합니다. `report_cdc`(UG906 p.207~208)로 synchronizer가 없는 crossing을 찾습니다.

> 스크립트가 실패를 삼킴

앞에서 본 것처럼 `wait_on_run`만으로는 run 실패가 스크립트 실패가 되지 않습니다(UG835 p.1973). run마다 `PROGRESS`를 검사하고 실패면 `exit 1`로 끝냅니다.

## 정리

- Project, XDC, synthesis, implementation, bitstream, programming까지 전 과정을 Tcl로 묶을 수 있고, `vivado -mode batch -source build.tcl`로 CI에서 돌립니다.
- part 이름과 XDC는 보드 제조사 자료(Digilent board file, master XDC)에서 그대로 가져옵니다.
- 핀이 빠지면 Vivado가 막아 주지만 틀린 핀은 막지 못합니다.
- timing은 implementation 뒤 WNS·WHS가 0 이상인지로 판단하고, 실패 경로는 Logic Levels와 Data Path Delay로 원인을 좁힙니다.
- flash는 `write_cfgmem`으로 `.mcs`를 만들고, `get_cfgmem_parts`로 고른 부품으로 `program_hw_cfgmem`합니다.
- strategy 이름과 동작은 UG901·UG904 표에서 확인하고 고릅니다.

다음 편은 **PCIe BAR**입니다.

## 관련 항목

- [11-01: FPGA 기초](/blog/embedded/modern-recipes/part11-01-fpga-basics)
- [11-03: PCIe BAR](/blog/embedded/modern-recipes/part11-03-pcie-bar)
- [11-04: AXI 인터페이스](/blog/embedded/modern-recipes/part11-04-axi)
- [11-14: Intel Quartus 사용법](/blog/embedded/modern-recipes/part11-14-intel-quartus)
