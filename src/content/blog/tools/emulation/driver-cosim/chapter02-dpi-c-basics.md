---
title: "SystemVerilog DPI-C 기초 — C와 RTL을 잇는 표준 인터페이스"
date: 2026-05-22T09:02:00
description: "Import·export·data type — SV와 C 사이의 다리."
series: "Driver-RTL Co-simulation"
seriesOrder: 2
tags: [dpi-c, systemverilog, import-dpi, export-dpi, ffi]
draft: false
---

cosim에서 driver의 C 함수와 RTL의 SystemVerilog 사이를 이어 주는 표준 인터페이스가 **DPI-C**(Direct Programming Interface for C)입니다. SystemVerilog LRM(IEEE 1800)에 *언어 표준의 일부*로 들어가 있어서, 어느 simulator를 쓰든 같은 syntax로 코드를 작성할 수 있습니다(세부 사항은 vendor마다 조금씩 다르지만, syntax는 통합).

이 장에서는 DPI-C를 *언어 차원*에서 봅니다. `import`/`export`의 의미, data type이 SV ↔ C에서 어떻게 매핑되는지, context vs pure의 차이, 그리고 simulator별 세부 차이까지 정리합니다.

## DPI-C는 무엇이고 왜 표준에 들어갔나

전통적으로 SV에서 C 코드를 호출하려면 **VPI**(Verilog Procedural Interface)나 **VHPI**(VHDL용)를 거쳐야 했습니다. 강력하지만 API 표면적이 넓고, simulator마다 미묘하게 달라 코드가 깨지기 쉬웠습니다. 또 모든 호출이 simulator의 내부 데이터 구조를 거쳐 가서 성능 비용도 컸습니다.

DPI-C는 *훨씬 좁은* foreign interface를 정의해 다음 셋만 다룹니다.

- SV에서 C 함수를 부르는 방법(**`import`**)
- C에서 SV task/function을 부르는 방법(**`export`**)
- 두 언어 사이의 *기본 data type 매핑*

좁기 때문에 빠르고 휴대가능합니다. 그래서 driver-RTL cosim의 표준 다리로 자리잡았습니다.

## Import — SV가 C를 호출

가장 흔한 사용 사례. RTL이 어떤 이벤트 시점에 C 함수를 부르고 싶을 때 씁니다.

```systemverilog
// SystemVerilog 쪽
import "DPI-C" function int  c_read_mmio(input int addr);
import "DPI-C" function void c_write_mmio(input int addr, input int data);

module tb;
  always @(posedge clk) begin
    if (cpu_write_req) begin
      c_write_mmio(cpu_addr, cpu_wdata);
    end
    if (cpu_read_req) begin
      cpu_rdata <= c_read_mmio(cpu_addr);
    end
  end
endmodule
```

C 쪽에서는 같은 시그니처로 함수를 노출합니다.

```c
// C 쪽 (driver harness)
#include <stdint.h>

int c_read_mmio(int addr) {
    return driver_mmio_read(addr);  // driver의 함수
}

void c_write_mmio(int addr, int data) {
    driver_mmio_write(addr, data);
}
```

이로써 RTL의 `cpu_write_req` 신호가 토글되면 driver의 `mmio_write`가 *같은 cycle 안에* 호출됩니다. cosim의 본질이 이 한 장면에 들어 있습니다.

### `function` vs `task`

`import "DPI-C"` 뒤에 올 수 있는 것은 두 가지입니다.

| 형태 | 시간 소모 가능 | 비고 |
|------|----------------|------|
| `function` | 불가 (0-time) | C 함수가 즉시 반환해야 함 |
| `task` | 가능 (waiting OK) | C 함수가 simulation 시간 진행시킬 수 있음 |

cosim에서 driver의 `writel`을 부를 때는 보통 `function`을 씁니다. *register write는 0-time event*로 모델링하기 때문입니다. 반면 *long-running C 함수*(예: image decode를 reference model로 돌릴 때)는 `task`로 선언합니다.

## Export — C가 SV를 호출

반대 방향도 필요합니다. 예를 들어 driver thread가 simulation을 진행시키거나, BFM이 SV의 task를 trigger해야 할 때입니다.

```systemverilog
export "DPI-C" task sv_advance_clock;

task sv_advance_clock(input int cycles);
  repeat (cycles) @(posedge clk);
endtask
```

C 쪽에서는 *동일한 시그니처*의 extern 선언으로 받아서 부릅니다.

```c
extern void sv_advance_clock(int cycles);

void run_test(void) {
    driver_init();
    sv_advance_clock(100);        // RTL을 100 cycle 진행
    driver_send_packet();
    sv_advance_clock(50);
    assert(driver_check_done());
}
```

`export task`는 *반드시* C가 *SV context*에서 호출되어야 합니다. context의 의미는 다음 절에서 다룹니다.

## Context vs pure function

DPI 표준은 import C 함수에 두 가지 qualifier를 둡니다.

```systemverilog
import "DPI-C" pure    function int c_compute(input int x);
import "DPI-C" context function int c_log_state();
```

- **`pure`** — 함수는 *순수*. 인자만으로 결과가 결정되고, 외부 state·simulation state에 접근하지 않음. 어디서든 호출 가능하고 simulator가 호출 결과를 캐시할 수도 있음.
- **`context`** — 함수가 *호출한 SV context*에 접근 가능. 즉 `export`된 SV task를 그 안에서 다시 부를 수 있고, simulator scope·hierarchy 정보를 쓸 수 있음.

지정 안 하면 `pure`도 `context`도 아닌 *중간*. *외부 state는 건드릴 수 있지만 SV context는 못 본다*가 기본입니다.

| 분류 | SV context 접근 | side effect | 캐시 가능 | 예 |
|------|------------------|--------------|-----------|----|
| `pure` | ✗ | ✗ | ✓ | math helper, CRC 계산 |
| 기본 | ✗ | ✓ | ✗ | printf, malloc |
| `context` | ✓ | ✓ | ✗ | export된 task 호출, scope inspection |

driver-RTL cosim에서 자주 쓰는 것은 *기본*과 *context*입니다. `pure`는 reference model 일부에서 쓸 수 있고요.

## Data type 매핑

DPI-C가 *좁다*는 이유 중 하나가 data type 집합을 제한한다는 점입니다. 핵심 매핑은 다음과 같습니다.

| SystemVerilog | C | 비고 |
|----------------|---|------|
| `byte` | `char` | signed 8-bit |
| `shortint` | `short int` | signed 16-bit |
| `int` | `int` | signed 32-bit |
| `longint` | `long long` | signed 64-bit |
| `bit` | `unsigned char` | 0/1 |
| `logic`(4-state) | `svLogic` | 0/1/X/Z, 헤더 typedef |
| `real` | `double` | |
| `shortreal` | `float` | |
| `string` | `const char *` | NUL-terminated |
| packed array `[N-1:0]` | `svBitVecVal[N/32]` | 32-bit chunk array |
| 4-state packed | `svLogicVecVal[N/32]` | aval/bval 쌍 |
| open array `[]` | `svOpenArrayHandle` | 런타임 핸들 |

`logic`(4-state)을 C 쪽에서 다룰 때는 simulator가 제공하는 헤더(`svdpi.h`)를 include해야 합니다. 그 안에 `svGetBitselLogic`·`svPutBitselLogic` 같은 helper가 들어 있습니다.

### Packed array 예시

```systemverilog
import "DPI-C" function void c_dma_write(input bit [255:0] data, input int len);
```

이 함수는 C 쪽에서 256-bit 벡터를 받는 식이 됩니다.

```c
#include "svdpi.h"

void c_dma_write(const svBitVecVal *data, int len) {
    // 256-bit data는 32-bit chunk 8개로 packed.
    uint8_t bytes[32];
    for (int i = 0; i < 8; i++) {
        uint32_t chunk = data[i];
        memcpy(&bytes[i*4], &chunk, 4);
    }
    driver_dma_write(bytes, len);
}
```

256-bit를 받을 때 C는 32-bit chunk 8개로 풀어서 봅니다. 이 변환을 BFM 안에 캡슐화해 두면 driver 쪽은 byte buffer만 보면 됩니다.

## Lifecycle — 언제 호출되는가

DPI 함수는 SV 코드의 *어디서든* 부를 수 있지만, 실제로는 몇 가지 패턴이 굳어 있습니다.

```systemverilog
// 패턴 1 — clock edge에서 호출 (RTL이 driver 알림)
always @(posedge clk) begin
  if (irq_pending) begin
    c_inject_irq();
  end
end

// 패턴 2 — initial 블록 (test setup)
initial begin
  c_driver_init();
  #100ns;
  c_driver_send_packet();
end

// 패턴 3 — task에서 호출 (sequence)
task run_scenario;
  begin
    c_set_config(MODE_FAST);
    @(posedge clk);
    c_kick_dma();
    @(posedge done);
    c_check_result();
  end
endtask
```

driver-RTL cosim에서는 보통:
- *MMIO write/read*는 패턴 1 형태(clock-driven)
- *IRQ injection*은 패턴 1 또는 별도 thread에서 sv task 호출
- *Test scenario*는 패턴 3

으로 둡니다.

## Simulator별 차이

표준은 깔끔하지만 vendor마다 빌드 명령과 일부 옵션이 다릅니다.

| Simulator | 빌드 옵션 | C 헤더 위치 | 비고 |
|-----------|-----------|--------------|------|
| Verilator | `--cc --exe driver.c` | `obj_dir/Vtop_dpi.h` | open-source, 가장 빠름 |
| Synopsys VCS | `-debug_access+all` + `-cflags` | `${VCS_HOME}/include/svdpi.h` | 산업 표준, 4-state 지원 |
| Mentor Questa | `vlog -dpiheader top_dpi.h` + `vsim -c` | auto-generated | 4-state, partial reload |
| Cadence Xcelium | `-sv -dpiheader top_dpi.h` | auto-generated | UVM 친화 |
| Icarus Verilog | `-g2012 -tdll`, VPI 대안 | 기본 DPI 부분 지원 | DPI-C는 일부만 |

Verilator의 경우, RTL을 `verilator --cc top.sv --exe main.cpp driver.c`로 빌드하면 다음이 자동으로 생긴다:

- `obj_dir/Vtop.h`, `Vtop.cpp` — RTL의 C++ 클래스
- `obj_dir/Vtop__Dpi.h` — DPI import/export 시그니처
- `obj_dir/Vtop.mk` — make 빌드 파일

C 쪽 파일은 그 헤더를 include해서 시그니처를 맞춥니다.

```c
#include "Vtop__Dpi.h"
#include "svdpi.h"

void c_write_mmio(int addr, int data) {
    // ... implementation
}
```

## 흔히 빠지는 함정

DPI-C를 처음 쓰면 자주 막히는 지점들.

- **scope 누락** — `context` 안 붙이고 `svGetScope()` 같은 SV scope 함수 호출 → 미정의 동작. 4-state vector를 다루는 거의 모든 함수가 context를 요구합니다.
- **packed array stride** — SV에서 `bit [127:0]`은 C에서 32-bit chunk 4개. 4 ≠ 16/4가 아니라 *128/32 = 4*. 처음 한두 번 헷갈립니다.
- **string lifetime** — `import "DPI-C" function string c_get_name()` 형태로 C가 string을 반환하면, 그 메모리는 *C가 관리*. SV 쪽이 보관하려면 즉시 복사해야 합니다.
- **race 보호** — IRQ injection thread에서 DPI 호출할 때, simulator의 내부 state에 동시 접근하면 깨집니다. *clock edge 동기화* 또는 *mutex 사용*. Verilator는 single-thread이므로 보통 큰 문제 없지만, 멀티스레드 simulator는 주의.

## 정리

- **DPI-C는 SV LRM 표준**이라 어느 simulator에서나 같은 syntax. import(SV→C)·export(C→SV)·data type 매핑이 세 축.
- `function`은 0-time, `task`는 시간 진행 가능. driver MMIO는 보통 `function`.
- `pure`/기본/`context` 세 단계. context가 가장 강력하고 가장 흔히 씁니다.
- Data type 매핑은 32-bit chunk(packed array)와 svBitVecVal/svLogicVecVal에 익숙해지면 충분.
- Lifecycle 패턴: clock-driven · initial setup · task-driven scenario.
- Vendor마다 빌드 명령은 다르지만 *코드*는 그대로 휴대. Verilator가 가장 빠르고 open-source.

## 다음 장 예고

다음 장에서는 이 표준을 *실제로 돌리는* 가장 가벼운 도구인 **Verilator**를 다룹니다. RTL을 C++ 클래스로 변환해 native 속도로 simulation을 돌리고, DPI-C를 통해 driver C 코드를 link하는 흐름까지.

## 관련 항목

- [Ch 1: Why Pre-Silicon Driver Verification](/blog/tools/emulation/driver-cosim/chapter01-why-cosim)
- [Ch 3: Verilator — Open Source SV Simulator](/blog/tools/emulation/driver-cosim/chapter03-verilator)
- QEMU Internals — QOM Deep Dive — functional model과의 비교
