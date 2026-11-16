---
title: "Verilator 분석 — Open Source SystemVerilog Simulator"
slug: "tools/emulation/driver-cosim/chapter03-verilator"
date: 2026-05-22T09:03:00
description: "RTL을 C++ 모델로 변환하고 driver harness와 연결하는 빌드·시간·trace 계약."
series: "Driver-RTL Co-simulation"
seriesOrder: 3
tags: [verilator, simulator, open-source, c-plus-plus, cosim]
draft: false
topics: ["tools", "tools/emulation"]
---

**Verilator**는 SystemVerilog/Verilog를 *cycle-accurate C++ 클래스*로 변환하는 open-source compiler입니다. 결과물이 C++이라는 점이 결정적입니다. driver C 코드와 *같은 binary*에 link해서 RTL 모델을 host의 native 코드로 실행할 수 있고, GitHub Actions 같은 CI에 그대로 태울 수 있습니다.

이 장은 Verilator의 모델·빌드 흐름·DPI 사용·한계를 다룹니다. 예제는 모두 macOS 27.2.1(Apple M2 Pro)에서 Homebrew Verilator 5.054로 빌드·실행했고, 출력은 그 실행에서 그대로 옮겼습니다. 다음 장(CocoTB)까지 따라가려면 이 장의 빌드 파이프라인이 머릿속에 있어야 합니다.

## 어떤 문제를 푸는가

cosim을 매 push마다 돌리려면 simulator를 개인 PC와 CI runner 어디에나 설치할 수 있어야 합니다. 이 시리즈는 상용 simulator(VCS·Questa·Xcelium)를 쓰지 않았고, 그 라이선스 조건도 다루지 않습니다. Verilator가 이 자리에 맞는 이유는 다음 셋입니다.

- **Open source** — 저장소 README의 SPDX 표기가 `LGPL-3.0-only OR Artistic-2.0`입니다. Homebrew formula도 같은 라이선스를 표시합니다.
- **컴파일된 모델** — RTL을 C++로 변환해 host compiler로 최적화합니다. 아래 측정에서 32-bit counter 하나가 trace 없이 초당 1,600만 cycle 넘게 돌았습니다.
- **휴대성** — 설치 문서(`docs/guide/install.rst`)는 Apple OS-X, FreeBSD, Windows MSVC에서 테스트하고 Linux, WSL2, Cygwin, MinGW에서도 빌드된다고 적습니다. 이 장은 macOS에서 `brew install verilator` 한 줄로 설치했습니다.

언어 지원 범위는 "합성 가능한 subset만"이 아닙니다. Input Languages 문서는 `--timing`을 주면 모든 timing control(delay, event control, wait, fork)을 지원하고, 이때 C++20 coroutine을 지원하는 compiler가 필요하다고 적습니다. 반대로 Verilator는 "mostly a two-state simulator"라서 X/Z는 4-state simulator와 다르게 다룹니다(같은 문서 X/Z 절).

## 어떻게 동작하는가 — RTL → C++

Verilator는 *compiler*입니다. RTL을 받아 C++ 클래스를 *생성*하고, 사용자가 작성한 main에서 그 클래스를 instantiate해 simulation을 돌립니다. 비유하면 회로도를 받아 "이 회로처럼 동작하는 C++ 프로그램"을 써 주는 번역가입니다. 아래 counter 예제를 빌드한 뒤 `obj_dir/`에 남은 주요 파일입니다.

```text
obj_dir/
├── Vtop                          실행 binary
├── Vtop.h, Vtop.cpp              사용자가 쓰는 model 클래스
├── Vtop___024root.h, *__0*.cpp   설계 본체($root)
├── Vtop__Syms.h, *__Syms__Slow.cpp  symbol table
├── Vtop__Trace__0*.cpp, Vtop__TraceDecls__0__Slow.cpp  trace 코드
├── Vtop.mk, Vtop_classes.mk      make 빌드 파일
└── Vtop__ALL.a                   생성 코드 archive
```

DPI 선언이 없는 이 설계에서는 `Vtop__Dpi.h`가 생기지 않습니다. 아래 DPI 예제처럼 import가 있는 설계에서만 `Vtop__Dpi.h`·`Vtop__Dpi.cpp`가 추가됩니다.

생성된 `Vtop.h`에서 port와 평가 함수 부분만 옮기면 다음과 같습니다.

```cpp
class alignas(VL_CACHE_LINE_BYTES) Vtop VL_NOT_FINAL : public VerilatedModel {
  ...
    VL_IN8(&clk,0,0);
    VL_IN8(&rst,0,0);
    VL_OUT(&count,31,0);
  ...
    explicit Vtop(VerilatedContext* contextp, const char* name = "TOP");
    void eval() { eval_step(); }
    void final();
```

`verilated_types.h:255`·`:268`이 `VL_IN8`을 `CData`(`uint8_t`), `VL_OUT`을 `IData`(`uint32_t`)로 정의합니다. 1-bit `clk`도 `uint8_t` 멤버가 되고, 32-bit `count`는 `uint32_t`입니다.

핵심은 `eval()`입니다. eval은 현재 입력 값으로 모델을 평가할 뿐 simulation 시간을 증가시키지 않습니다. 시간은 `VerilatedContext::timeInc()`로 main이 직접 올립니다. 그래서 clock 한 주기는 low/high 두 phase의 eval과 두 번의 시간 증가로 구성합니다.

## 가장 작은 cosim 예제

DPI 없이 `Vtop` 클래스를 main에서 굴려 봅시다. reset 두 주기 뒤 100 cycle을 돌리고 count가 100인지 확인한 다음 FST waveform을 남깁니다.

```systemverilog title="top.sv"
module top(input logic clk, input logic rst, output logic [31:0] count);
  always_ff @(posedge clk) begin
    if (rst) count <= 0;
    else count <= count + 1;
  end
endmodule
```

```cpp title="main.cpp"
#include "Vtop.h"
#include "verilated.h"
#include "verilated_fst_c.h"
#include <memory>
#include <iostream>
int main(int argc, char** argv) {
    auto context = std::make_unique<VerilatedContext>();
    context->commandArgs(argc, argv); context->traceEverOn(true);
    auto dut = std::make_unique<Vtop>(context.get());
    auto trace = std::make_unique<VerilatedFstC>();
    dut->trace(trace.get(), 8); trace->open("wave.fst");
    dut->clk = 0; dut->rst = 1; dut->eval();
    auto tick = [&] {
        dut->clk = 0; context->timeInc(5); dut->eval(); trace->dump(context->time());
        dut->clk = 1; context->timeInc(5); dut->eval(); trace->dump(context->time());
    };
    tick(); tick(); dut->rst = 0;
    for (unsigned cycle = 0; cycle < 100; ++cycle) tick();
    const bool ok = dut->count == 100;
    std::cout << "count=" << dut->count << '\n';
    dut->final(); trace->close();
    return ok ? 0 : 1;
}
```

첫 빌드는 Homebrew 환경에서 실패했습니다. FST writer가 `lz4.h`를 include하는데 Homebrew의 include 경로가 기본 검색 경로에 없기 때문입니다.

```text
$ verilator --cc --exe --build --top-module top --trace-fst top.sv main.cpp
/opt/homebrew/Cellar/verilator/5.054/share/verilator/include/fstcpp/fstcpp_writer.cpp:18:10: fatal error: 'lz4.h' file not found
%Error: 'make -C obj_dir -f Vtop.mk -j 1' exited with 2
```

include·library 경로를 넘기면 빌드와 실행이 통과합니다.

```text
$ time verilator --cc --exe --build -j 0 --top-module top --trace-fst -CFLAGS -I/opt/homebrew/include -LDFLAGS "-L/opt/homebrew/lib -llz4" top.sv main.cpp
real 2.46
user 5.07
sys 0.61
$ ./obj_dir/Vtop; echo "exit=$?"
count=100
exit=0
$ ls -l wave.fst
963 wave.fst
```

waveform은 trace object의 `open`/`dump`/`close`를 불러야 생깁니다. `--trace-fst`는 trace 코드를 생성할 뿐 파일을 자동으로 쓰지 않습니다. `timeInc(5)`의 단위는 설계의 time precision이고, timescale을 지정하지 않은 이 예제에서는 VCD header가 `$timescale 1ps $end`를 찍었습니다.

## DPI-C를 통한 driver 연결

이제 counter 대신 RTL이 driver 함수를 부르는 설계를 만들어 봅니다. reset 뒤 `step` 2에서 write, 3에서 read, 4에서 IRQ 상승, 6에서 IRQ 하강을 DPI로 C에 알립니다.

```systemverilog title="top.sv"
module top(input logic clk, input logic rst, output logic irq);
  import "DPI-C" function int  c_read_mmio(input int addr);
  import "DPI-C" function void c_write_mmio(input int addr, input int data);
  import "DPI-C" function void c_irq_inject(input bit level);
  logic [3:0] step;
  int rdata;
  always_ff @(posedge clk) begin
    if (rst) begin step <= 0; irq <= 0; end
    else begin
      step <= step + 1;
      if (step == 2) c_write_mmio(32'h8, 32'h1234);
      if (step == 3) rdata <= c_read_mmio(32'h8);
      if (step == 4) begin irq <= 1; c_irq_inject(1'b1); end
      if (step == 6) begin irq <= 0; c_irq_inject(1'b0); end
    end
  end
endmodule
```

C 쪽 harness는 생성된 prototype을 그대로 받아 driver 함수에 위임합니다. `bit` 인자는 `svBit`로 생성됩니다.

```c title="driver_harness.c"
#include "Vtop__Dpi.h"
int  my_driver_read(int addr);
void my_driver_write(int addr, int data);
void my_driver_irq_handler(int rising);
int  c_read_mmio(int addr) { return my_driver_read(addr); }
void c_write_mmio(int addr, int data) { my_driver_write(addr, data); }
void c_irq_inject(svBit level) { my_driver_irq_handler(level != 0); }
```

`my_driver.c`는 register 16개 배열에 읽고 쓰며 호출마다 한 줄을 찍는 stub driver이고, main은 counter 예제의 tick을 8번 돌립니다. driver 파일을 빌드 명령에 추가하면 Verilator가 같은 make 파일로 함께 컴파일합니다.

```text
$ verilator --cc --exe --build -j 0 top.sv main.cpp driver_harness.c my_driver.c
$ ./obj_dir/Vtop
driver write 0x08 <- 0x1234
driver read  0x08 -> 0x1234
driver irq rise
driver irq fall
t=90 irq=0
```

RTL의 clock edge가 driver의 `my_driver_write`를 *함수 호출 하나*로 트리거합니다. 둘이 같은 binary에 들어 있기 때문입니다.

## Timing model — 신호를 어떻게 진행시키나

앞의 두 예제는 main이 clock을 직접 구동하고 시간을 `timeInc`로 올렸습니다. 동기 RTL에서는 이 방식이 가장 단순하고, driver 요청과 cycle stepping을 main이 명시적으로 조정할 수 있습니다.

RTL 안에 `#delay`가 있으면 달라집니다. 다음 testbench는 `always #5 clk = ~clk`로 clock을 스스로 만들고 100 ns 뒤에 끝납니다.

```systemverilog
`timescale 1ns/1ps
module tdelay;
  logic clk = 0;
  always #5 clk = ~clk;
  int edges = 0;
  always @(posedge clk) edges++;
  initial begin
    #100;
    $display("[%0t] edges=%0d", $time, edges);
    $finish;
  end
endmodule
```

옵션 없이 빌드하면 Verilator가 timing 처리 방식을 정하라고 멈춥니다.

```text
%Error-NEEDTIMINGOPT: tdelay.sv:4:10: Use --timing or --no-timing to specify how delays should be handled
%Error-NEEDTIMINGOPT: tdelay.sv:8:5: Use --timing or --no-timing to specify how delays should be handled
```

`--timing`으로 빌드하면 main은 clock을 건드리지 않고 다음 event 시각으로 건너뛰기만 합니다.

```cpp
while (!ctx->gotFinish()) {
  top->eval(); ++evals;
  if (!top->eventsPending()) break;
  ctx->time(top->nextTimeSlot());
}
```

```text
$ ./obj_dir/Vtdelay
[100000] edges=10
- tdelay.sv:10: Verilog $finish
evals=21 final_time=100000
```

100 ns 동안 rising edge 10번, eval 21번이었습니다. 직접 구동 방식과 event 방식 중 어느 쪽을 쓰든, 다음 event time·eval·시간 증가·trace dump의 순서를 main loop 하나에 고정해 둡니다.

## Waveform — VCD vs FST

Verilator는 두 가지 waveform 포맷을 씁니다. `--trace`는 VCD(text), `--trace-fst`는 FST(binary)를 선택합니다. 같은 counter를 1,000,000 cycle 돌리며 trace 없이, VCD로, FST로 각각 세 번씩 측정했습니다(`-O3`, trace depth 8).

| trace | 처리 속도 (3회) | 파일 크기 |
|------|------|------|
| 없음 | 16.64 / 17.52 / 19.60 Mcycle/s | — |
| VCD | 2.80 / 2.86 / 2.94 Mcycle/s | 46,729,603 byte |
| FST | 3.17 / 4.96 / 6.32 Mcycle/s | 5,010,353 byte |

이 설계에서 FST는 VCD의 약 1/9 크기였습니다. 세 번의 평균으로 보면 trace 없이 17.9, VCD 2.87, FST 4.82 Mcycle/s라서 VCD는 trace 없는 경우의 약 1/6, FST는 약 1/4 속도였습니다. FST 속도가 세 번 사이에 두 배 가까이 흔들린 것도 측정 결과 그대로입니다. signal이 세 개뿐인 counter의 수치이므로 실제 RTL의 비율은 그 설계로 다시 재야 합니다. VCD는 text라 바로 열어 볼 수 있습니다.

```text
$version Generated by VerilatedVcd $end
$timescale 1ps $end
 $scope module TOP $end
  $var wire 1 " clk $end
  $var wire 1 # rst $end
  $var wire 32 $ count [31:0] $end
```

## Coverage·assertion·SVA

Input Languages 문서는 assertion과 functional coverage를 모두 "partially supports"라고 적습니다. 5.054에서 실제로 어디까지 되는지 작은 accumulator로 확인했습니다. op 0~2만 구동하고 3(`default` 분기)은 한 번도 주지 않았습니다.

```systemverilog
  a_inc: assert property (@(posedge clk) disable iff (rst) (op == 2'd1) |=> (acc != $past(acc)))
    else $error("acc did not change after increment");
  covergroup cg @(posedge clk);
    cp_op: coverpoint op { bins nop = {0}; bins inc = {1}; bins dec = {2}; bins set = {3}; }
  endgroup
  cg cg_i = new;
```

```text
$ verilator --cc --exe --build -j 0 --assert --coverage-line --coverage-toggle --coverage-user --top-module cov cov.sv main.cpp
$ ./obj_dir/Vcov; echo exit=$?
exit=0
$ verilator_coverage coverage.dat
Coverage Summary:
  line       :  26.9% ( 7/26)
  toggle     :  50.0% (12/24)
  ...
  covergroup :  75.0% ( 3/ 4)
```

`verilator_coverage --annotate`는 한 번도 실행되지 않은 `default` 줄에 `%000000`을 붙였고, covergroup 4개 bin 중 `set` 하나가 비어 75%가 됐습니다. 그러니 "covergroup 미지원"은 5.054에는 맞지 않습니다. 다음으로 increment 분기를 `acc <= acc;`로 바꾼 버그 버전을 돌리면 concurrent assertion이 30 ps 시각에 잡습니다.

```text
[30] %Error: cov_bug.sv:13: Assertion failed in TOP.cov.a_inc: acc did not change after increment
%Error: cov_bug.sv:13: Verilog $stop
Aborting...
exit=1
```

여기서 확인한 것은 `|=>`·`$past`·`disable iff`를 쓰는 property 하나와 coverpoint 하나입니다. 이 장에서 돌리지 않은 SVA·coverage 기능(sequence 연산자 전체, cross, transition bin 등)은 문서의 "partially"를 그대로 남깁니다.

## 언어 지원과 선택한 검증 범위

공식 Input Languages 문서는 `--timing`으로 delay·event control·wait·fork를 지원한다고 설명하고, C++20 coroutine을 지원하는 host compiler를 조건으로 둡니다. 위 `NEEDTIMINGOPT` 오류처럼, 옵션 없이 실패한 것과 언어 construct를 지원하지 않는 것은 다릅니다. 반대로 2장에서 본 "시간 제어가 있는 DPI export task"는 `--timing`을 줘도 `%Error-UNSUPPORTED`입니다.

trace도 공짜가 아닙니다. 위 표에서 trace가 속도를 1/4~1/6로 떨어뜨렸으니, CI의 smoke test는 trace 없이 돌리고 실패한 test만 trace를 켜서 다시 돌리는 구성이 시간 예산에 맞습니다. 비교 성능은 같은 RTL·입력·trace 조건으로 재야 합니다.

## CI에 태우기 — GitHub Actions 예시

다음은 매 push마다 cosim test를 도는 최소 워크플로입니다. 파일을 `rtl/top.sv`·`tb/main.cpp`로 배치한 counter 프로젝트를 전제로 합니다.

```yaml
name: cosim
on: [push, pull_request]
jobs:
  verilator-cosim:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Verilator
        run: |
          sudo apt-get update
          sudo apt-get install -y verilator gtkwave
      - name: Build cosim binary
        run: |
          verilator --cc --exe --trace-fst --top-module top rtl/top.sv tb/main.cpp
          make -j -C obj_dir -f Vtop.mk Vtop
      - name: Run tests
        run: ./obj_dir/Vtop
      - name: Upload waveforms on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: waveforms
          path: '*.fst'
```

이 workflow는 실행하지 않았고, 각 줄은 다음 1차 자료와 대조했습니다.

- `runs-on: ubuntu-latest` — actions/runner-images README의 표가 `ubuntu-latest`를 Ubuntu 24.04로 적습니다.
- `apt-get install verilator gtkwave` — packages.ubuntu.com의 noble(24.04) 판은 `verilator (5.020-1)`, `gtkwave (3.3.116-1build2)`입니다. 이 장에서 쓴 5.054보다 오래된 판이므로, 이 장의 출력이 그대로 나온다고 보지 않습니다.
- `actions/checkout@v4`, `actions/upload-artifact@v4` — 두 저장소에 `v4` tag가 있습니다(GitHub API `git/refs/tags/v4`).
- `if: failure()` — GitHub의 workflow syntax 문서는 `if: ${{ failure() }}`가 붙은 step이 "only runs when the previous step of a job fails"라고 설명합니다.

## 정리

- **Verilator는 SV를 cycle-accurate C++ 클래스로 변환**하는 open-source compiler(LGPL-3.0-only OR Artistic-2.0)입니다. driver C 코드와 같은 binary에 link합니다.
- 빌드는 `verilator --cc --exe --build` 한 줄입니다. Homebrew macOS에서 FST를 쓰려면 lz4 include·library 경로를 넘겨야 했습니다.
- DPI-C로 RTL의 clock edge가 driver 함수를 직접 부릅니다. 예제에서 write·read·IRQ rise/fall이 순서대로 찍혔습니다.
- `eval()`은 시간을 올리지 않습니다. 직접 구동이면 `timeInc`, `--timing`이면 `eventsPending`/`nextTimeSlot` loop를 씁니다.
- counter 측정에서 trace 없이 16.6~19.6, VCD 2.8~2.9, FST 3.2~6.3 Mcycle/s였고, FST 파일은 VCD의 약 1/9이었습니다.
- 5.054는 concurrent assertion과 covergroup을 돌렸습니다. 문서가 "partially"라고 하는 나머지 범위는 쓰기 전에 그 기능으로 확인합니다.

## 다음 장 예고

다음 장에서는 Verilator 위에 *생산성*을 한 층 더 얹는 **CocoTB**를 다룹니다. C++ main.cpp 대신 Python coroutine으로 testbench를 짜고, pytest와 결합해 시나리오를 라이브러리화하는 흐름입니다.

## 1차 자료와 실행 한계

- [Verilator Input Languages](https://verilator.org/guide/latest/languages.html) — timing, X/Z(two-state), assertion·coverage "partially supports"
- [Connecting to Verilated Models](https://verilator.org/guide/latest/connecting.html) — eval·time·DPI 경계
- [Verilator repository](https://github.com/verilator/verilator) v5.054 — README SPDX 라이선스, `docs/guide/install.rst` 플랫폼 목록
- Verilator 5.054 설치판 `include/verilated_types.h:255`, `:268`
- [actions/runner-images README](https://github.com/actions/runner-images), [packages.ubuntu.com noble/verilator](https://packages.ubuntu.com/noble/verilator), [noble/gtkwave](https://packages.ubuntu.com/noble/gtkwave), [GitHub Docs: Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)

실행 환경은 macOS 27.2.1, Apple M2 Pro, Homebrew Verilator 5.054, Apple clang 21.0.0입니다(2026-11-16). GitHub Actions workflow와 Linux에서의 빌드는 실행하지 않았습니다.

## 관련 항목

- [Ch 2: SystemVerilog DPI-C 기초](/blog/tools/emulation/driver-cosim/chapter02-dpi-c-basics)
- [Ch 4: CocoTB — Python Testbench](/blog/tools/emulation/driver-cosim/chapter04-cocotb)
- [Ch 8: 통합 검증](/blog/tools/emulation/driver-cosim/chapter08-end-to-end) — host 실행과 RTL 검증 경계를 분리
