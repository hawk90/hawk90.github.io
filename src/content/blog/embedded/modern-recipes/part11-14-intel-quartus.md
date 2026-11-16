---
title: "Intel Quartus 사용법 — Platform Designer·Nios II·HLS"
slug: "embedded/modern-recipes/part11-14-intel-quartus"
date: 2026-04-20T09:13:00
description: "Intel Quartus Prime·Platform Designer(Qsys)·Nios II soft processor·Intel HLS·partial reconfig 사용법."
series: "Modern Embedded Recipes"
seriesOrder: 136
tags: [recipes, fpga, quartus, intel, altera]
topics: ["embedded"]
---

## 한 줄 요약

> **"Quartus Prime은 Intel(현 Altera) FPGA의 vendor toolchain입니다."** 흐름은 Vivado와 같은 constraint → compile → timing 확인 → programming이지만, 이 글에서 직접 확인할 수 있었던 것은 그 앞뒤의 HDL과 시뮬레이션뿐이었습니다.

## 이 글이 확인한 범위

Quartus는 이 글을 쓴 환경(Apple Silicon Mac, Debian arm64 guest)에 설치할 수 없어 실행하지 않았습니다. 버전이 붙은 Intel/Altera 공식 문서도 확인하려 했지만, `intel.com/content/www/us/en/docs/programmable/...` 아래 Quartus·Nios II 문서 URL은 현재 404 redirect 또는 403을 돌려주고, 옮겨 간 `docs.altera.com`은 JavaScript 앱이라 본문을 받아 올 수 없었습니다.

그래서 이전 판에 있던 다음 내용은 1차 자료로 확인하지 못해 뺐습니다.

- edition(Lite/Standard/Pro)별 지원 device 목록
- Nios II/e·/s·/f의 LE 수와 pipeline 구성
- `quartus_pgm`·`quartus_cpf`·`quartus_sh` 명령의 옵션과 file format(`.sof`·`.pof`·`.jic`) 설명
- Intel HLS의 `i++` 명령과 pragma, Partial Reconfiguration API
- TimeQuest 보고서 예시 값, Cyclone V SoC bridge 주소

남은 것은 어느 FPGA toolchain에서나 쓰는 HDL과 testbench, 그리고 그것을 오픈소스 시뮬레이터로 돌린 결과입니다. Quartus 고유 기능은 Altera 문서에 접근할 수 있을 때 그 문서의 버전을 붙여 다시 씁니다.

## 어떤 상황에서 쓰나

Cyclone·Arria·Stratix·Agilex 계열 FPGA를 쓰는 프로젝트에서 vendor toolchain에 넣기 전에 RTL을 검증할 때입니다. Quartus에 들어가기 전 단계(RTL 작성, testbench 시뮬레이션, lint)는 vendor 도구 없이도 할 수 있고, 여기서 잡은 오류는 긴 compile을 기다리지 않고 고칠 수 있습니다.

## 예제 RTL

50 MHz clock을 100 분주해 2-bit LED 카운터를 올리는 작은 모듈입니다.

```verilog
module top (
    input  wire       clk_50,
    output reg  [1:0] led = 2'b00
);
    reg [7:0] div = 8'd0;
    always @(posedge clk_50) begin
        div <= div + 8'd1;
        if (div == 8'd99) begin
            div <= 8'd0;
            led <= led + 2'b01;
        end
    end
endmodule
```

## Testbench와 시뮬레이션

clock 주기 20 ns(50 MHz)로 10 µs를 돌리고, `led`가 바뀔 때마다 시각을 찍습니다.

```verilog
module top_tb;
    reg clk_50 = 0;
    wire [1:0] led;
    always #10 clk_50 = ~clk_50;

    top dut (.clk_50(clk_50), .led(led));

    initial begin
        $dumpfile("top.vcd");
        $dumpvars(0, top_tb);
        #10000 $finish;
    end
    always @(led) $display("t=%0t ns led=%b", $time, led);
endmodule
```

Icarus Verilog 13.0으로 돌린 결과입니다.

```text
$ iverilog -g2012 -o tb top.v top_tb.v && vvp -n tb
VCD info: dumpfile top.vcd opened for output.
t=1990 ns led=01
t=3990 ns led=10
t=5990 ns led=11
t=7990 ns led=00
t=9990 ns led=01
top_tb.v:11: $finish called at 10000 (1s)
```

`led`는 100 clock(2 µs)마다 1씩 증가합니다. 첫 변화가 2,000 ns가 아니라 1,990 ns인 것은 clock이 0에서 시작해 첫 상승 edge가 10 ns에 오기 때문입니다. `top.vcd`를 GTKWave 같은 viewer로 열면 같은 내용을 파형으로 봅니다.

이전 판의 testbench에는 `wire [1:0] led;` 선언이 없었습니다. Verilog는 선언하지 않은 이름을 1-bit implicit net으로 만들기 때문에, Icarus는 컴파일은 하되 다음 경고를 냅니다.

```text
top_tb_orig.v:5: warning: Port 2 (led) of module top expects 2 bit(s), given 1.
top_tb_orig.v:5:        : Padding 1 high bits of the port.
```

이 상태로는 `led[1]`이 testbench에서 보이지 않습니다. testbench 첫 줄에 `` `default_nettype none ``을 두면 이런 오타가 경고가 아니라 오류가 됩니다.

## Lint

같은 RTL을 Verilator 5.054의 `--lint-only -Wall`로 검사하면 선언 초기값에 대한 경고가 나옵니다. 아래는 출력의 일부이고, 실제 출력은 source 발췌와 도움말 줄, 마지막의 `%Error: Exiting due to 2 warning(s)`을 더 담고 있습니다.

```text
%Warning-PROCASSINIT: top.v:3:29: Procedural assignment to declaration with initial value: 'led'
                      top.v:10:13: ... Location of variable process write
                                 : ... Perhaps should initialize instead using a reset in this process
%Warning-PROCASSINIT: top.v:5:21: Procedural assignment to declaration with initial value: 'div'
```

선언에서 준 초기값(`= 2'b00`)은 시뮬레이션에서는 동작하지만, 실제 FPGA에서 그 값으로 시작하는지는 device와 toolchain이 power-up 초기값을 지원하느냐에 달렸고, 이 글에서는 Quartus 문서로 확인하지 못했습니다. Verilator가 권하는 대로 reset 입력을 두고 `always` 안에서 초기화하면 toolchain과 무관하게 같은 동작을 얻습니다.

## Quartus로 넘어갈 때

Quartus 단계에서 할 일은 Vivado와 같은 순서입니다([11-02 Vivado 사용법](/blog/embedded/modern-recipes/part11-02-vivado-usage)). timing constraint는 SDC 파일에 두고, pin 배정은 project 설정에 두며, compile 뒤 timing 보고서의 slack이 음수인 path가 없는지 봅니다. 각 단계의 정확한 명령·메뉴·옵션은 사용하는 Quartus 버전의 Altera 문서를 보고 적어야 하고, 이 글은 그 문서를 열지 못했으므로 적지 않았습니다.

## 자주 보는 함정

> ⚠️ testbench의 선언 누락

위 실행처럼 선언하지 않은 신호는 1-bit net이 되어 경고 한 줄로 지나갑니다. `` `default_nettype none ``으로 오류로 바꿉니다.

> ⚠️ 선언 초기값에 의존한 RTL

시뮬레이션에서는 초기값이 보이지만, 하드웨어 power-up 동작은 device와 toolchain의 지원에 달려 있습니다. reset으로 초기화합니다.

## 정리

- Quartus는 실행하지 못했고 Altera 공식 문서도 열 수 없어, Quartus 고유 명령·옵션·자원 수치는 이 판에서 뺐습니다.
- vendor toolchain에 넣기 전에 Icarus Verilog 시뮬레이션과 Verilator lint로 RTL을 먼저 검증할 수 있습니다.
- 선언 누락은 implicit 1-bit net이 되고, 선언 초기값은 lint 경고 대상입니다.

다음 편은 **Part 12 시작 — Edge Inference 분석**입니다.

## 관련 항목

- [11-01: FPGA 기초](/blog/embedded/modern-recipes/part11-01-fpga-basics)
- [11-02: Vivado 사용법](/blog/embedded/modern-recipes/part11-02-vivado-usage)
- [11-13: OpenCL on FPGA](/blog/embedded/modern-recipes/part11-13-opencl-fpga)
- [12-03: NPU 아키텍처](/blog/embedded/modern-recipes/part12-03-npu-architecture)
