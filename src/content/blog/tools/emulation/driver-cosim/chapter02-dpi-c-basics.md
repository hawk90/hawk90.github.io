---
title: "SystemVerilog DPI-C 기초 — C와 RTL을 잇는 표준 인터페이스"
slug: "tools/emulation/driver-cosim/chapter02-dpi-c-basics"
date: 2026-05-22T09:02:00
description: "Import·export·data type — SV와 C 사이의 다리."
series: "Driver-RTL Co-simulation"
seriesOrder: 2
tags: [dpi-c, systemverilog, import-dpi, export-dpi, ffi]
draft: false
topics: ["tools", "tools/emulation"]
---

cosim에서 driver의 C 함수와 RTL의 SystemVerilog 사이를 이어 주는 표준 인터페이스가 **DPI-C**(Direct Programming Interface for C)입니다. SystemVerilog 표준 IEEE 1800의 일부이며, Verilator가 배포하는 C 쪽 헤더 `svdpi.h`는 첫머리에 "IEEE 1800-2023 Annex I"에서 가져왔다고 적습니다. 다만 "표준에 있다"와 "내 simulator가 지원한다"는 다른 문제입니다. 이 장에서 돌려 본 Icarus Verilog 13.0은 `import "DPI-C"` 줄을 syntax error로 거부했고, Verilator 5.054는 시간을 소모하는 export task를 거부했습니다.

이 장에서는 DPI-C를 *언어 차원*에서 보고, 각 규칙을 Verilator 5.054에서 직접 돌린 결과로 확인합니다. `import`/`export`의 의미, data type이 SV ↔ C에서 어떻게 매핑되는지, `context` 선언이 왜 필요한지, simulator별 차이를 차례로 다룹니다.

## DPI-C는 무엇이고 왜 표준에 들어갔나

C가 simulator에 닿는 또 하나의 표준 경로는 **VPI**(Verilog Procedural Interface)입니다. Verilator가 배포하는 `vpi_user.h`(첫머리에 "IEEE 1800-2023 Annex K"에서 왔다고 적음)를 보면, C 쪽은 `vpi_handle_by_name`(`:889`)·`vpi_handle`(`:896`)로 simulator object의 handle을 얻은 뒤 `vpi_get_value`(`:924`)로 값을 읽습니다. 값 하나를 넘기는 데에도 handle 조회와 값 조회를 거치는 구조입니다.

DPI-C는 그보다 *훨씬 좁은* foreign interface를 정의해 다음 셋만 다룹니다.

- SV에서 C 함수를 부르는 방법(**`import`**)
- C에서 SV task/function을 부르는 방법(**`export`**)
- 두 언어 사이의 *기본 data type 매핑*

비유하면 VPI가 "건물 도면을 받아 직접 방을 찾아가는 방식"이라면 DPI는 "정해진 창구에 서류를 내미는 방식"입니다. C 함수는 평범한 C 인자로 값을 받고, simulator 내부 구조는 몰라도 됩니다. 그래서 driver C 코드를 거의 그대로 RTL simulation에 붙이는 cosim의 다리로 쓰입니다.

## Import — SV가 C를 호출

RTL이나 testbench가 어떤 이벤트 시점에 C 함수를 부르고 싶을 때 씁니다. 아래는 이 장의 실행 예제 `top.sv`의 일부로, clock edge마다 write 요청이 있으면 C의 MMIO 함수를 부릅니다. C가 시간을 알 수 있도록 `$time`을 인자로 넘겼습니다.

```systemverilog
`timescale 1ns/1ps
module top;
  logic clk = 0;
  always #5 clk = ~clk;
  import "DPI-C" function void c_write_mmio(input int addr, input int data, input longint t);
  import "DPI-C" function int  c_read_mmio(input int addr);

  logic wr_req = 0;
  int   rdata;
  always @(posedge clk) if (wr_req) begin
    c_write_mmio(32'h10, 32'hCAFE, $time);
    rdata = c_read_mmio(32'h10);
    $display("[%0t] SV saw rdata=%h in the same time step", $time, rdata);
  end
  initial begin
    #12 wr_req = 1;
    #10 wr_req = 0;
  end
endmodule
```

C 쪽은 Verilator가 만든 `Vtop__Dpi.h`의 prototype에 맞춰 함수를 정의합니다. 여기서는 register 64개짜리 배열을 MMIO 대상으로 씁니다.

```c
#include "Vtop__Dpi.h"
#include <stdint.h>
#include <stdio.h>
static uint32_t regs[64];
void c_write_mmio(int addr, int data, long long t) {
    printf("[%lld] C c_write_mmio addr=0x%x data=0x%x\n", t, addr, data);
    regs[(unsigned)addr / 4 % 64] = (uint32_t)data;
}
int c_read_mmio(int addr) { return (int)regs[(unsigned)addr / 4 % 64]; }
```

`verilator --cc --exe --build -j 0 --timing top.sv harness.c main.cpp`로 빌드해 실행한 출력의 첫 두 줄입니다.

```text
[15] C c_write_mmio addr=0x10 data=0xcafe
[15000] SV saw rdata=0000cafe in the same time step
```

C가 받은 `$time`은 module 시간 단위(1 ns)로 15이고, SV의 `%0t`는 precision(1 ps)으로 찍어 15000입니다. 둘은 같은 시각입니다. 12 ns에 올라간 `wr_req`를 15 ns의 rising edge가 보고, 그 always 블록 안에서 C write와 C read가 끝난 뒤 SV가 결과를 출력했습니다. 22 ns에 `wr_req`가 내려가서 25 ns edge에서는 호출이 없습니다. **import function 호출은 simulation 시간을 쓰지 않고 그 자리에서 끝난다**는 것이 cosim의 출발점입니다.

### `function` vs `task`

`import "DPI-C"` 뒤에 올 수 있는 것은 두 가지입니다.

| 형태 | 시간 소모 | 이 장에서 확인한 것 |
|------|----------|-------------------|
| `function` | 없음 (0-time) | 위 실행에서 C 호출 전후의 SV 시각이 같음 |
| `task` | Verilator 5.054에서는 시간 제어가 있는 export task가 컴파일되지 않아 확인 못 함 | 아래 `%Error-UNSUPPORTED` 출력 |

이 시리즈는 driver의 `writel`을 `function`으로 둡니다. register write를 0-time event로 모델링하기 때문입니다. C 계산에 host 시간이 오래 걸린다고 task가 필요한 것은 아닙니다. host의 `sleep`이나 별도 thread는 simulation clock을 한 tick도 진행시키지 않습니다.

## Export — C가 SV를 호출

반대 방향도 필요합니다. driver 코드가 simulation 상태를 읽거나, C로 쓴 test가 RTL을 몇 cycle 진행시키고 싶을 때입니다. 교과서적인 예는 다음과 같은 "clock 진행" task입니다.

```systemverilog
export "DPI-C" task sv_advance_clock;

task sv_advance_clock(input int cycles);
  repeat (cycles) @(posedge clk);
endtask
```

C 쪽은 `Vtop__Dpi.h`에 생성된 `extern void sv_advance_clock(int cycles);`를 부릅니다. 그런데 이 task를 Verilator 5.054에 넣으면 빌드가 멈춥니다.

```text
$ verilator --cc --exe --build -j 0 --timing top.sv harness.c main.cpp
%Error-UNSUPPORTED: top.sv:19:21: Unsupported: Timing controls inside DPI-exported tasks
%Error: Exiting due to 1 error(s)
```

이 메시지는 Verilator 소스 `src/V3Timing.cpp:954`에 있습니다. 그래서 Verilator 기반 cosim에서는 C가 시간을 진행시키지 않고, C++ main loop가 clock을 돌리면서 C에 "다음 일"을 묻는 구조로 뒤집어야 합니다. 3장과 8장이 이 구조를 씁니다. 상용 simulator(VCS·Questa·Xcelium)는 실행하지 않았고, 그쪽 지원 여부를 확인한 1차 문서도 없어서 적지 않습니다.

시간을 쓰지 않는 export **function**은 Verilator에서도 동작합니다. 아래는 SV의 cycle counter를 C에 보여 주는 export와, 그것을 부르는 C 함수입니다.

```systemverilog
int cycle = 0;
always @(posedge clk) cycle <= cycle + 1;
import "DPI-C" context function int c_run_test();
export "DPI-C" function sv_cycle;
function int sv_cycle(); return cycle; endfunction
// 실행 예제의 initial 블록은 #12, #10 뒤에 #1000을 더 기다려 1022 ns에 호출
// #1000 void'(c_run_test());
```

```c
int c_run_test(void) {
    printf("C: c_run_test start, cycle=%d\n", sv_cycle());
    return 0;
}
```

```text
C: c_run_test start, cycle=102
[1022000] back in SV, cycle=102
```

## `context` — export를 부를 자격

export된 SV 함수는 어느 module instance의 것인지(scope)를 알아야 실행됩니다. import 선언에 `context`를 붙이면 그 C 함수가 실행되는 동안 import를 선언한 instance의 scope가 활성 scope가 되고, 그 안에서 export를 부르거나 `svGetScope()`로 scope를 얻을 수 있습니다. `svSetScope`로 바꾸지 않았다면 이 scope는 호출 위치가 아니라 선언 위치 기준입니다(`svdpi.h:294-298`). `svdpi.h:296-300`의 주석은 `svGetScope`가 "imported function이 아닌 C 코드에서 불리면 NULL을 반환한다"고 적고 있습니다.

`context`를 빼면 어떻게 되는지 같은 설계에서 한 단어만 지우고 돌렸습니다(`import "DPI-C" function int c_run_test();`).

```text
c_get_name() = aristos-bfm
%Error: unknown:0: Testbench C called 'sv_cycle' but scope wasn't set, perhaps due to dpi import call without 'context', or missing svSetScope (IEEE 1800-2023 35.5.3)
Aborting...
```

C++ `main()`에서 `svSetScope` 없이 `sv_cycle()`을 바로 불러도 같은 메시지로 멈춥니다. 정리하면 다음과 같습니다.

| 선언 | export 호출 | 이 장의 근거 |
|------|------------|------------|
| `context` | 가능 | 위 실행에서 `cycle=102` 반환 |
| 표시 없음 | scope가 없어 Verilator가 중단 | 위 `%Error` 출력 |
| `pure` | Verilator는 `--threads` 빌드에서 pure import를 thread-safe로 간주(`--threads-dpi pure`가 기본) | Verilator manual `--threads-dpi` 항목 |

## Data type 매핑

DPI-C가 *좁다*는 이유 중 하나가 data type 집합을 제한한다는 점입니다. 아래 표는 각 SV 타입을 인자로 받는 import를 하나씩 선언하고 `verilator --cc -Wno-SHORTREAL top.sv`가 만든 `obj_dir/Vtop__Dpi.h`의 prototype을 그대로 옮긴 것입니다.

| SystemVerilog 인자 | 생성된 C prototype | 비고 |
|----------------|---|------|
| `input byte` | `char` | |
| `input shortint` | `short` | |
| `input int` | `int` | |
| `input longint` | `long long` | |
| `input bit` | `svBit` | `svdpi.h`에서 `uint8_t` |
| `input logic` | `svLogic` | `uint8_t`, 값은 `sv_0`·`sv_1`·`sv_z`·`sv_x`(0~3) |
| `input real` | `double` | |
| `input shortreal` | `double` | Verilator가 `%Warning-SHORTREAL: Unsupported: shortreal being promoted to real`를 내고 double로 올림 |
| `input string` | `const char*` | |
| `input bit [255:0]` | `const svBitVecVal*` | `svBitVecVal`은 `uint32_t` |
| `input logic [127:0]` | `const svLogicVecVal*` | `aval`/`bval` 두 `uint32_t` |
| `input int v[]` (open array) | `const svOpenArrayHandle` | 런타임 핸들 |
| `output int` | `int*` | |
| `function string` 반환 | `const char*` | |

packed vector가 쓰는 word 수는 `svdpi.h:103`의 `SV_PACKED_DATA_NELEMS(WIDTH)`가 `((WIDTH) + 31) >> 5`로 정의합니다. 256-bit는 8 word, 127-bit도 4 word입니다. 4-state 값의 bit 하나를 다룰 때는 `svdpi.h:161`·`:165`의 `svGetBitselLogic`·`svPutBitselLogic`을 씁니다.

### Packed array 예시

256-bit 벡터를 DMA data로 넘기는 import입니다.

```systemverilog
import "DPI-C" function void c_dma_write(input bit [255:0] data, input int len);
initial c_dma_write(256'h0123456789ABCDEF_FEDCBA9876543210_00112233445566778899AABBCCDDEEFF, 8);
```

C 쪽은 32-bit word 배열을 byte로 풀어 driver에 넘깁니다. 낮은 bit를 낮은 byte 주소에 두는 little-endian byte 계약을 shift로 명시했기 때문에, host CPU의 endian과 무관하게 같은 byte 순서가 나옵니다. `len` 범위와 출력 buffer 길이를 먼저 검사합니다.

```c title="unpack-words.c"
#include <stdint.h>
#include <stddef.h>
int unpack_words(const uint32_t words[8], int len, uint8_t out[32]) {
    if (!words || !out || len < 0 || len > 32) return 0;
    for (int i = 0; i < len; ++i)
        out[i] = (uint8_t)(words[(unsigned)i / 4] >> (8 * ((unsigned)i % 4)));
    return 1;
}
```

```c
void c_dma_write(const svBitVecVal* data, int len) {
    uint8_t b[32];
    printf("words[0]=%08x words[1]=%08x words[7]=%08x\n", data[0], data[1], data[7]);
    if (!unpack_words(data, len, b)) return;
    printf("bytes[0..7]=");
    for (int i = 0; i < len; ++i) printf(" %02x", b[i]);
    printf("\n");
}
```

Verilator 실행 결과는 `words[0]`이 bit 31:0, `words[7]`이 bit 255:224라는 것을 보여 줍니다.

```text
words[0]=ccddeeff words[1]=8899aabb words[7]=01234567
bytes[0..7]= ff ee dd cc bb aa 99 88
```

helper 자체의 경계 처리는 simulator 없이 host에서 따로 검사했습니다.

```c title="unpack-check.c"
#include <stdint.h>
#include <assert.h>
#include <stdio.h>
int unpack_words(const uint32_t words[8], int len, uint8_t out[32]);
int main(void) {
    uint32_t words[8] = {0x78563412U, 0xEFCDAB90U}; uint8_t out[32] = {0};
    assert(unpack_words(words, 8, out));
    assert(out[0] == 0x12 && out[3] == 0x78 && out[4] == 0x90 && out[7] == 0xEF);
    assert(!unpack_words(words, 33, out) && !unpack_words(words, -1, out));
    assert(!unpack_words(0, 4, out) && !unpack_words(words, 4, 0));
    puts("packed word byte-order and bounds checks passed");
}
```

```text
$ clang -std=c11 -Wall -Wextra -g -fsanitize=address,undefined unpack-words.c unpack-check.c -o unpack-check && ./unpack-check
packed word byte-order and bounds checks passed
```

이 변환을 BFM 안에 캡슐화해 두면 driver 쪽은 byte buffer만 보면 됩니다.

## Lifecycle — 언제 호출되는가

DPI 함수는 SV 코드의 *어디서든* 부를 수 있습니다. 이 시리즈는 다음 세 자리에서 부릅니다. 아래 조각은 구조를 보여 주는 스케치이고, 함수들(`c_inject_irq` 등)의 C 구현이 없어 그대로 빌드되지는 않습니다.

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

// 패턴 3 — SV task가 시간을 진행하고 C는 0-time으로만 호출
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

이 시리즈의 배치는 다음과 같습니다.

- *MMIO write/read*는 패턴 1(clock-driven). 위 실행 예제가 이 형태입니다.
- *IRQ injection*은 패턴 1. C 쪽 thread에서 SV를 부르는 방식은 쓰지 않습니다(아래 함정 참고).
- *Test scenario*는 패턴 3. 시간 진행은 SV 쪽이 맡고, C는 0-time 함수로만 불립니다. Verilator가 시간 제어 있는 export task를 거부하기 때문입니다.

## Simulator별 차이

표준은 하나지만 이 장에서 돌려 본 두 simulator만 해도 지원 범위가 다릅니다.

| 대상 | 이 장에서 확인한 것 |
| --- | --- |
| Verilator 5.054 | import/export function, `context`, packed·open array 모두 빌드·실행. 시간 제어 있는 export task는 `%Error-UNSUPPORTED`. `shortreal`은 `double`로 승격 |
| Icarus Verilog 13.0 | `iverilog -g2012 -o top.vvp top.sv`가 DPI `import`/`export` 선언 줄마다 `syntax error` / `error: Invalid module item.`을 내고 rc=12로 끝남. DPI-C를 쓰는 cosim에는 쓸 수 없음 |
| VCS/Questa/Xcelium | 실행하지 않았고 vendor 문서도 대조하지 않아 적지 않음 |

Verilator로 DPI가 있는 RTL을 빌드하면 `obj_dir/`에 다음 파일이 생깁니다.

- `Vtop.h`, `Vtop.cpp` — RTL의 C++ 클래스
- `Vtop__Dpi.h` — DPI import/export prototype. DPI 선언이 하나도 없는 설계(3장의 counter)에서는 생기지 않습니다
- `Vtop.mk` — make 빌드 파일

C 쪽 파일은 그 헤더를 include해서 시그니처를 맞춥니다. prototype이 다르면 C 컴파일러가 바로 잡아 줍니다.

```c
#include "Vtop__Dpi.h"
#include "svdpi.h"

void c_write_mmio(int addr, int data, long long t) {
    // ... implementation
}
```

## 흔히 빠지는 함정

DPI-C를 처음 쓰면 자주 막히는 지점들입니다.

- **context 누락** — `context` 없이 import한 C 함수에서 export를 부르면 Verilator 5.054는 위의 `scope wasn't set` 메시지로 중단합니다. 반대로 vector bit helper(`svGetBitselLogic` 등)는 scope와 무관해서 context가 필요 없습니다.
- **packed array stride** — `bit [127:0]`은 C에서 32-bit word 4개입니다. 폭이 32의 배수가 아니면 마지막 word의 상위 bit는 쓰지 않는 bit입니다.
- **string 반환의 수명** — `function string c_get_name()`이 돌려주는 `const char*`는 C가 가진 메모리입니다. 이 장의 예제는 `static const char name[]`을 돌려줘서 수명 문제가 없습니다. 지역 배열을 돌려주면 반환 즉시 무효가 됩니다.
- **thread** — Verilator manual은 `--threads` 빌드에서 pure가 아닌 DPI import를 직렬화하고(`--threads-dpi pure`, 기본값), `--threads-dpi all`이면 "DPI libraries need appropriate mutexes"라고 적습니다. 별도 host thread에서 model eval이나 export를 부르는 구조는 이 계약 밖입니다. 이 시리즈는 simulator를 돌리는 thread 하나에서만 DPI를 부르고, 다른 thread는 요청 queue로만 넘깁니다.

## 정리

- **DPI-C는 IEEE 1800 표준**이지만 지원 범위는 simulator마다 다릅니다. Icarus 13.0은 문법부터 거부하고, Verilator 5.054는 시간 제어 있는 export task를 거부합니다.
- import function은 0-time입니다. 실행 예제에서 C 호출 전후의 SV 시각이 같았습니다.
- export를 부르는 C 함수는 `context`로 import해야 합니다. 빼면 Verilator가 scope 오류로 중단합니다.
- Data type 매핑은 생성된 `Vtop__Dpi.h`가 정답지입니다. packed vector는 `svBitVecVal`/`svLogicVecVal` word 배열이고 `words[0]`이 최하위 32 bit입니다.
- Lifecycle은 clock-driven · initial setup · task-driven scenario 세 자리이고, Verilator에서는 시간 진행을 SV나 C++ main loop가 맡습니다.

## 다음 장 예고

다음 장에서는 이 표준을 *실제로 돌리는* 가장 가벼운 도구인 **Verilator**를 다룹니다. RTL을 C++ 클래스로 변환해 host의 native 코드로 simulation을 돌리고, DPI-C를 통해 driver C 코드를 link하는 흐름까지.

## 1차 자료와 검증 범위

- [Verilator Connecting/DPI](https://verilator.org/guide/latest/connecting.html) — export scope(`svSetScope`)·context import
- Verilator 5.054 `docs/guide/exe_verilator.rst`의 `--threads-dpi` 항목, `src/V3Timing.cpp:954`
- Verilator 5.054 `include/vltstd/vpi_user.h` — IEEE 1800-2023 Annex K 헤더. `:889`, `:896`, `:924`
- Verilator 5.054 `include/vltstd/svdpi.h` — IEEE 1800-2023 Annex I 헤더. `:80-103` 타입, `:161`·`:165` bit helper, `:296-300` `svGetScope`
- [AMD UG900: open arrays](https://docs.amd.com/r/en-US/ug900-vivado-logic-simulation/Open-Arrays-in-DPI) — raw pointer와 open-array handle 구분

실행 환경은 macOS 27.2.1(Apple M2 Pro), Homebrew Verilator 5.054, Icarus Verilog 13.0, helper 검사용 Homebrew clang 23.1.5입니다(2026-11-16). 위 출력은 모두 이 환경에서 나온 것입니다. IEEE 1800 본문은 이 작업 환경에서 열 수 없어(IEEE GET Program 접근 불가) 표준 쪽은 Verilator가 배포하는 Annex I·K 헤더(`svdpi.h`·`vpi_user.h`)만 대조했습니다. 상용 simulator는 실행하지 않았습니다.

## 관련 항목

- [Ch 1: Why Pre-Silicon Driver Verification](/blog/tools/emulation/driver-cosim/chapter01-why-cosim)
- [Ch 3: Verilator — Open Source SV Simulator](/blog/tools/emulation/driver-cosim/chapter03-verilator)
- [Ch 7: Reference Model 공유](/blog/tools/emulation/driver-cosim/chapter07-uvm-c-model) — open-array adapter와 C API를 분리
