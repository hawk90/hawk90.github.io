---
title: "Ch 3: Verilator — Open Source SV Simulator"
date: 2026-05-17T03:00:00
description: "RTL → C++ — driver code와 link되는 가장 빠른 simulator."
series: "Driver-RTL Co-simulation"
seriesOrder: 3
tags: [verilator, simulator, open-source, c-plus-plus, cosim]
draft: true
---

**Verilator**는 SystemVerilog/Verilog를 *cycle-accurate C++ 클래스*로 변환하는 open-source compiler입니다. 결과물이 C++이라는 점이 결정적입니다. driver C 코드와 *같은 binary*에 link해서 cosim 환경을 native 속도로 돌릴 수 있고, GitHub Actions 같은 CI에 그대로 태울 수 있습니다.

이 장은 Verilator의 모델·빌드 흐름·DPI 사용·한계를 다룹니다. 다음 장(CocoTB)까지 따라가려면 이 장의 빌드 파이프라인이 머릿속에 있어야 합니다.

## 어떤 문제를 푸는가

상용 simulator(VCS·Questa·Xcelium)는 강력하지만 라이선스 비용이 높고, *내 PC에서 곧바로 못 돌리는* 환경 의존성이 있습니다. 학생·open-source 기여자·startup의 첫 prototype 단계에서는 진입장벽 자체가 문제입니다. 또 상용 도구는 *closed binary*라 CI에 통합할 때 라이선스 서버 의존성을 끌고 들어옵니다.

Verilator는 다음 셋을 동시에 해결합니다.

- **무료** — open-source, GPLv3 + LGPLv3 라이선스. 상용 SoC 빌드에도 사용 가능.
- **빠름** — RTL → 최적화된 C++ → native 컴파일. 일반적으로 상용 simulator 대비 *2~5×* 빠릅니다.
- **휴대성** — Linux/macOS/Windows에서 빌드. CI runner에 apt-get/brew 한 줄로 설치.

대가가 하나 있습니다. **synthesizable subset**만 지원. 즉 X/Z 4-state·delays·non-synthesizable construct는 제한적입니다. 4-state는 newer 버전(5.x)에서 점진적으로 지원이 늘고 있지만, 본격적 X-propagation 분석이라면 상용 도구가 여전히 우위입니다. driver-RTL cosim 용도(2-state·동기 RTL 검증)에는 거의 항상 충분합니다.

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

핵심은 `eval()`. 이 함수가 *RTL의 모든 신호를 새 cycle 값으로 안정화*시킵니다. `clk` 멤버를 토글하고 `eval()`을 부르면 한 cycle 진행한 셈이 됩니다.

## 가장 작은 cosim 예제

DPI 없이 단순히 `Vtop` 클래스를 main에서 굴려 봅시다.

```cpp
// main.cpp
#include "Vtop.h"
#include "verilated.h"
#include "verilated_vcd_c.h"
#include <memory>

int main(int argc, char **argv) {
  Verilated::commandArgs(argc, argv);
  auto dut = std::make_unique<Vtop>();

  // Waveform 켜기
  Verilated::traceEverOn(true);
  auto tfp = std::make_unique<VerilatedVcdC>();
  dut->trace(tfp.get(), 99);
  tfp->open("wave.vcd");

  // Reset
  dut->rst = 1;
  for (int i = 0; i < 4; i++) {
    dut->clk = !dut->clk;
    dut->eval();
    tfp->dump(i);
  }
  dut->rst = 0;

  // 100 cycle 시뮬레이션
  for (int t = 4; t < 200; t++) {
    dut->clk = !dut->clk;
    dut->eval();
    tfp->dump(t);
  }

  tfp->close();
  dut->final();
  return 0;
}
```

빌드는 한 줄.

```bash
verilator --cc --exe --trace top.sv main.cpp
make -j -C obj_dir -f Vtop.mk Vtop
./obj_dir/Vtop
```

결과로 `wave.vcd` 파일이 생기고, GTKWave 같은 viewer로 열어 신호를 봅니다. 이 골격이 *어떤 cosim 환경에도* 변형 없이 들어가는 출발점입니다.

## DPI-C를 통한 driver 연결

이제 driver C 코드를 같이 link합시다. SV 쪽에서 import 선언을 두고, C 쪽에서 함수를 정의합니다.

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

Verilator는 *event-driven*이 아니라 *2-state evaluation*입니다. clock edge를 사용자가 *명시적으로 토글*해야 진행합니다.

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

이 패턴이 cosim 환경의 표준 루프입니다. driver 쪽에서 `mmio_write`를 부르면 *그 호출이 끝난 후* tick으로 RTL을 진행시킵니다.

## Waveform — VCD vs FST

Verilator는 두 가지 waveform 포맷을 지원합니다.

| 포맷 | 크기 | 호환성 | 용도 |
|------|------|--------|------|
| VCD | 큼(text) | 모든 viewer | 단기 디버그 |
| FST | 작음(binary) | GTKWave, Surfer | long-running test, CI 저장 |

`--trace`는 VCD, `--trace-fst`는 FST. CI에서 모든 실패한 test의 waveform을 artifact로 남길 때는 FST가 훨씬 효율적입니다.

## Coverage·assertion·SVA

Verilator는 다음을 *부분적으로* 지원합니다.

- **Line/toggle coverage** — `--coverage-line --coverage-toggle`. 결과는 `coverage.dat`로 저장, `verilator_coverage` 명령으로 리포트 생성.
- **SVA(SystemVerilog Assertion)** — immediate assertion과 일부 concurrent assertion(`property/assert`)을 지원. 4-state 의존 SVA는 제한적.
- **Functional coverage(`covergroup`)** — 미지원. CocoTB 또는 외부 도구로 우회.

cosim 환경에서 driver-RTL boundary의 직선적 동작에는 충분합니다. 형식 검증급 SVA가 필요하다면 상용 도구.

## 한계 — synthesizable subset

Verilator가 거부하는 대표적 construct는 다음과 같습니다.

- `wait`, `#delay`, `force/release`(부분 지원)
- 비합성 `initial`(testbench-only) 의 4-state 의존
- UDP(User-Defined Primitive)
- `forever` 안의 시간 지연 없는 무한 루프(simulator hang)

해결책은 *testbench 쪽을 C++/Python으로 옮기는 것*입니다. clock·reset·stimulus를 SV에서 빼서 main.cpp에서 다루면 거의 모든 case가 풀립니다. driver-RTL cosim이 본래 그렇게 흘러갑니다.

## 생태계 — 어디서 쓰이나

Verilator는 실험실 장난감이 아닙니다. 본격 SoC 검증에서 다음이 표준 흐름의 일부입니다.

- **Chipyard** — Berkeley의 RISC-V SoC 생성기. 기본 simulator가 Verilator.
- **OpenROAD / OpenLane** — open-source RTL→GDS 흐름의 functional sim.
- **OpenTitan** — 보안 마이크로컨트롤러 프로젝트. CI에서 Verilator cosim 사용.
- **NVIDIA gen-AI sim** — 일부 internal training environment가 Verilator wrapper 위에 구축.
- **SiFive Freedom** — 회사 내부 검증에 활용.

Open-source가 *대안*이 아니라 *주류*가 된 영역입니다.

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
          verilator --cc --exe --trace-fst rtl/top.sv tb/main.cpp tb/driver_harness.c src/my_driver.c
          make -j -C obj_dir -f Vtop.mk Vtop
      - name: Run tests
        run: ./obj_dir/Vtop --scenario regression
      - name: Upload waveforms on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: waveforms
          path: '*.fst'
```

5분 안에 끝나는 단위 cosim이 *모든 PR*에 붙는 것이 Verilator가 가능하게 한 흐름입니다.

## 정리

- **Verilator는 SV를 cycle-accurate C++ 클래스로 변환**하는 open-source compiler. driver C 코드와 같은 binary에 link.
- 빌드 흐름: `verilator --cc --exe` → `obj_dir/`에 C++ 생성 → `make` → 실행. 5줄짜리 빌드 파이프라인.
- DPI-C로 driver 함수가 RTL과 *함수 호출 한 번* 거리. MMIO·IRQ injection을 직결.
- Clock은 사용자가 *명시적으로 토글*. event-driven이 아닌 evaluation-driven.
- Waveform은 VCD(디버그)·FST(CI/long-run) 둘 다 지원. Coverage·SVA도 부분 지원.
- 한계: synthesizable subset만. 4-state 의존 SVA·일부 timing construct는 상용 도구가 필요.
- Chipyard·OpenTitan·NVIDIA 등 *주류 SoC 흐름*에서 쓰이는 표준. CI 친화성 압도적.

## 다음 장 예고

다음 장에서는 Verilator 위에 *생산성*을 한 층 더 얹는 **CocoTB**를 다룹니다. C++ main.cpp 대신 Python coroutine으로 testbench를 짜고, pytest와 결합해 시나리오를 라이브러리화하는 흐름입니다.

## 관련 항목

- [Ch 2: SystemVerilog DPI-C 기초](/blog/tools/emulation/driver-cosim/chapter02-dpi-c-basics)
- [Ch 4: CocoTB — Python Testbench](/blog/tools/emulation/driver-cosim/chapter04-cocotb)
- [QEMU Internals — TCG Deep](/blog/tools/emulation/qemu-internals/chapter13-tcg-deep) — software-only 시뮬레이션과의 비교
- [FPGA Driver via QEMU+VFIO — QEMU Fake FPGA](/blog/tools/emulation/qemu-fpga-driver/chapter03-qemu-fake-fpga)
