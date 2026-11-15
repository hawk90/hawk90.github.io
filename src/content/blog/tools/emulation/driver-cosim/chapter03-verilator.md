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

이 장은 Verilator의 모델·빌드 흐름·DPI 사용·한계를 다룹니다. 다음 장(CocoTB)까지 따라가려면 이 장의 빌드 파이프라인이 머릿속에 있어야 합니다.

## 어떤 문제를 푸는가

상용 simulator(VCS·Questa·Xcelium)는 강력하지만 라이선스 비용이 높고, *내 PC에서 곧바로 못 돌리는* 환경 의존성이 있습니다. 학생·open-source 기여자·startup의 첫 prototype 단계에서는 진입장벽 자체가 문제입니다. 또 상용 도구는 *closed binary*라 CI에 통합할 때 라이선스 서버 의존성을 끌고 들어옵니다.

Verilator는 다음 셋을 동시에 해결합니다.

- **Open source** — 사용·배포 조건과 예외는 고정한 release의 COPYING/라이선스 문서를 확인합니다.
- **컴파일된 모델** — RTL을 C++로 변환해 host compiler로 최적화합니다. 상대 속도는 RTL·trace·옵션·workload로 측정합니다.
- **휴대성** — Linux/macOS/Windows에서 빌드. CI runner에 apt-get/brew 한 줄로 설치.

지원되는 언어·timing·X/Z 동작은 release와 옵션에 따라 확인해야 합니다. 합성 가능한 subset만 지원한다고 일반화하면 --timing의 delay/event/wait 지원을 놓칩니다. host C++ 코드의 실행과 simulation 시간은 서로 다른 개념입니다.

## 어떻게 동작하는가 — RTL → C++

Verilator는 *compiler*입니다. RTL을 받아 C++ 클래스를 *생성*하고, 그 클래스를 사용자가 작성한 main에서 instantiate해 simulation을 돌립니다. 흐름을 한 장면으로 보면:

```text
top.sv ──▶ verilator --cc ──▶ obj_dir/
                                 ├─ Vtop.h       (C++ 클래스 선언)
                                 ├─ Vtop.cpp     (구현)
                                 ├─ Vtop__Syms.* (symbol table)
                                 ├─ Vtop__Dpi.h  (DPI 시그니처)
                                 └─ Vtop.mk      (Makefile)

main.cpp + driver.c ──▶ link ──▶ obj_dir/Vtop (실행 binary)
                                 │
                                 ▼
                              simulation 시작
```

자동 생성된 `Vtop.h`의 골자는 다음과 같습니다.

```cpp
class Vtop {
public:
  // RTL의 top-level port가 멤버 변수로 노출
  uint8_t  clk;
  uint8_t  rst;
  uint32_t cpu_addr;
  uint32_t cpu_wdata;
  uint32_t cpu_rdata;
  uint8_t  cpu_write_req;
  uint8_t  irq;
  // ...

  Vtop();
  void eval();   // 한 evaluation step
  void final();  // teardown
};
```

핵심은 `eval()`. eval은 현재 입력과 event에 대해 모델을 평가합니다. clock 한 번 토글은 반주기일 수 있으며 eval 호출 자체가 simulation 시간을 자동 증가시키지는 않습니다. 한 주기는 보통 low/high 두 phase와 명시적인 시간 진행으로 구성합니다.

## 가장 작은 cosim 예제

DPI 없이 단순히 `Vtop` 클래스를 main에서 굴려 봅시다.

아래 두 파일은 같은 top module/port와 FST 설정을 사용하도록 맞췄습니다. 이 환경에는 Verilator가 없어 실제 RTL 빌드·실행·waveform 생성을 수행하지 않았습니다. 명령과 기대값은 외부 환경에서 확인할 재현 절차이며 성공 로그가 아닙니다.

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

```bash
verilator --version
verilator --cc --exe --build --top-module top --trace-fst top.sv main.cpp
./obj_dir/Vtop
```

확인할 결과는 count=100, exit0, 유효한 wave.fst입니다. --trace-fst만 켠다고 자동 파일이 생기는 것은 아니며 trace object의 open/dump/close가 필요합니다. 위 tick은 clock을 직접 구동하는 동기 RTL 예제입니다. SV #delay 등이 있는 --timing 모델은 eventsPending/nextTimeSlot을 포함한 시간 scheduling 계약도 확인합니다.

## DPI-C를 통한 driver 연결

다음 DPI 코드는 위 counter top과 다른 MMIO interface를 가정한 연결 조각입니다. my_driver API·bus port·BFM 동작을 별도로 구현해야 하며, 앞의 counter 재현 명령으로 자동 통합되는 예제가 아닙니다. SV 쪽에서 import 선언을 두고, C 쪽에서 함수를 정의합니다.

```systemverilog
// top.sv
import "DPI-C" function int  c_read_mmio(input int addr);
import "DPI-C" function void c_write_mmio(input int addr, input int data);
import "DPI-C" function void c_irq_inject(input bit level);

module top (input wire clk, input wire rst, output wire irq);
  // ...
  always @(posedge clk) begin
    if (write_req)
      c_write_mmio(addr, wdata);
    if (read_req)
      rdata <= c_read_mmio(addr);
  end
  // irq 신호도 같은 식
endmodule
```

C 쪽에서는 시그니처를 그대로 받아서 driver 함수에 위임합니다.

```c
// driver_harness.c
#include "Vtop__Dpi.h"
#include "svdpi.h"
#include "my_driver.h"   // 우리 driver의 헤더

int c_read_mmio(int addr) {
    return my_driver_read(addr);
}

void c_write_mmio(int addr, int data) {
    my_driver_write(addr, data);
}

void c_irq_inject(unsigned char level) {
    my_driver_irq_handler(level ? IRQ_RISE : IRQ_FALL);
}
```

빌드 명령에 driver 파일을 추가합니다.

```bash
verilator --cc --exe --trace top.sv main.cpp driver_harness.c my_driver.c
make -j -C obj_dir -f Vtop.mk Vtop
./obj_dir/Vtop
```

이로써 RTL의 `cpu_write_req` pulse가 driver의 `my_driver_write`를 *함수 호출 하나만큼의 거리*에서 트리거합니다. 둘이 같은 binary에 들어 있기 때문입니다.

## Timing model — 신호를 어떻게 진행시키나

직접 구동한 clock은 host가 phase와 시간을 진행시킵니다. --timing 지원과 event scheduling이 있으므로 Verilator를 단순히 event-driven이 아니라고 설명하지 않습니다. 아래는 이미 설정된 simulation loop 안에서 synchronous clock phase만 보여 주는 조각입니다. 독립 실행 가능한 loop가 아니며 `--timing` event queue 처리나 trace 기록을 대신하지 않습니다.

```cpp
auto tick = [&](int cycles) {
  for (int i = 0; i < cycles; i++) {
    dut->clk = 0; dut->eval();
    dut->clk = 1; dut->eval();
  }
};

tick(10);                 // 10 cycle 진행
dut->cpu_write_req = 1;
tick(1);
dut->cpu_write_req = 0;
tick(50);
```

동기 RTL harness는 driver 요청과 cycle stepping을 명시적으로 조정할 수 있습니다. `--timing`을 쓰거나 다른 scheduler와 결합한다면 다음 event time, eval, time increment, trace dump의 순서를 고정한 별도 main loop가 필요합니다.

## Waveform — VCD vs FST

Verilator는 두 가지 waveform 포맷을 지원합니다.

| 포맷 | 크기 | 호환성 | 용도 |
|------|------|--------|------|
| VCD | 큼(text) | 널리 지원됨 | 단기 디버그 |
| FST | 작음(binary) | GTKWave, Surfer | long-running test, CI 저장 |

`--trace`는 VCD, `--trace-fst`는 FST를 선택합니다. FST 크기 이점과 viewer 호환성은 선택한 버전·도구로 확인하고, 필요한 dump signal과 trace depth를 설정합니다.

## Coverage·assertion·SVA

Verilator는 다음을 *부분적으로* 지원합니다.

- **Line/toggle coverage** — `--coverage-line --coverage-toggle`. 결과는 `coverage.dat`로 저장, `verilator_coverage` 명령으로 리포트 생성.
- **SVA(SystemVerilog Assertion)** — immediate assertion과 일부 concurrent assertion(`property/assert`)을 지원. 4-state 의존 SVA는 제한적.
- **Functional coverage(`covergroup`)** — 미지원. CocoTB 또는 외부 도구로 우회.

cosim 환경에서 driver-RTL boundary의 직선적 동작에는 충분합니다. 형식 검증급 SVA가 필요하다면 상용 도구.

## 언어 지원과 선택한 검증 범위

공식 Input Languages 문서는 --timing으로 delay·event control·wait·fork 관련 지원을 설명하며 C++20 coroutine 등 host compiler 조건을 구분합니다. X/Z 표현과 X-propagation, 지원되는 assertion/coverage 기능도 설치한 판의 manual로 확인합니다. 도구가 옵션 없이 실패한 것과 언어 construct를 전혀 지원하지 않는 것은 다릅니다.

모든 내부 signal이 자동으로 보이거나 모든 testcase가 같은 속도로 실행되는 것은 아닙니다. trace depth·public signal·최적화·보호 IP와 시나리오를 기록하고, 비교 성능은 같은 RTL·입력·waveform 조건으로 측정해야 합니다.

## CI에 태우기 — GitHub Actions 예시

다음은 매 push마다 cosim test를 도는 최소 워크플로입니다.

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

CI 예시는 파일을 rtl/top.sv·tb/main.cpp로 배치한 counter 프로젝트를 전제로 합니다. 설치판을 기록하고 실행 시간 budget과 trace artifact 한계를 프로젝트에서 정합니다. 이 workflow는 여기서 실행하지 않았습니다.

## 정리

- **Verilator는 SV를 cycle-accurate C++ 클래스로 변환**하는 open-source compiler. driver C 코드와 같은 binary에 link.
- 빌드 흐름: `verilator --cc --exe` → `obj_dir/`에 C++ 생성 → `make` → 실행. 5줄짜리 빌드 파이프라인.
- DPI-C로 driver 함수가 RTL과 *함수 호출 한 번* 거리. MMIO·IRQ injection을 직결.
- 직접 구동한 clock phase와 simulation 시간 증가를 구분하며 --timing event가 있다면 scheduler 계약을 따릅니다.
- Waveform은 VCD(디버그)·FST(CI/long-run) 둘 다 지원. Coverage·SVA도 부분 지원.
- timing·X/Z·assertion 지원은 설치한 판의 manual과 옵션으로 확인합니다.
- 상대 성능과 CI 실행 시간은 실제 RTL·host·옵션·trace 조건으로 측정합니다.

## 다음 장 예고

다음 장에서는 Verilator 위에 *생산성*을 한 층 더 얹는 **CocoTB**를 다룹니다. C++ main.cpp 대신 Python coroutine으로 testbench를 짜고, pytest와 결합해 시나리오를 라이브러리화하는 흐름입니다.

## 1차 자료와 실행 한계

- [Verilator Input Languages](https://verilator.org/guide/latest/languages.html) — 2026-10-22 확인한 문서 표시판 5.052의 timing/언어 지원
- [Connecting to Verilated Models](https://verilator.org/guide/latest/connecting.html) — eval·time·DPI 경계
- [Verilator repository](https://github.com/verilator/verilator) — 고정 release의 라이선스와 예제 확인

이 장은 소스/명령/문서 정합성을 수정했습니다. Verilator executable·generated header가 없어 실제 RTL compile/run·FST·DPI·CI는 **검증 대기**이며 C++ stub으로 대체해 통과했다고 주장하지 않습니다.

## 관련 항목

- [Ch 2: SystemVerilog DPI-C 기초](/blog/tools/emulation/driver-cosim/chapter02-dpi-c-basics)
- [Ch 4: CocoTB — Python Testbench](/blog/tools/emulation/driver-cosim/chapter04-cocotb)
- [Ch 8: 통합 검증](/blog/tools/emulation/driver-cosim/chapter08-end-to-end) — host 실행과 RTL 검증 경계를 분리
