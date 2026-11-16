---
title: "End-to-End Driver + RTL Co-simulation — 실전 통합 흐름"
slug: "tools/emulation/driver-cosim/chapter08-end-to-end"
date: 2026-05-22T09:08:00
description: "Verilator + DPI-C + Linux driver — 통합 cosim flow."
series: "Driver-RTL Co-simulation"
seriesOrder: 8
tags: [cosim, end-to-end, verilator, driver-integration, ci]
draft: false
topics: ["tools", "tools/emulation"]
---

마지막 장입니다. 지금까지 다룬 Verilator·DPI-C·CocoTB·BFM·reference model을 *하나의 환경*으로 묶어 봅니다. NPU prototype을 검증한다고 가정한 통합 청사진을 그린 뒤, 그 축소판을 실제로 빌드해 pytest로 돌립니다. 축소판은 macOS 27.2.1(Apple M2 Pro)에서 Verilator 5.054, Apple clang 21.0.0, Python 3.13 venv의 pytest 9.2.0으로 실행했습니다.

## 목표 시나리오

가상의 NPU "Aristos-1"을 검증합니다. 설계 요구는 다음과 같습니다.

- AXI4 인터페이스 1개(control 32-bit)·AXI4 인터페이스 1개(data 256-bit DMA)
- IRQ line 4개(done·error·queue-empty·perf-counter overflow)
- Linux driver는 *진짜 .ko로 빌드 가능한 코드*
- pre-silicon에 다음을 검증:
  - register read/write 인코딩
  - DMA descriptor ring 한 바퀴
  - IRQ delivery + ISR 분기
  - matmul reference 일치 (7장의 C reference)
  - 긴 stress test
  - GitHub Actions에서 매 push마다 smoke

이 장에서 실제로 만든 축소판은 이 중 **AXI4-Lite control 인터페이스, IRQ 4개, ID/scratch/IRQ register**까지입니다. 256-bit DMA, descriptor ring, matmul datapath는 RTL에 넣지 않았습니다.

| 축소판 register | offset | 동작 |
|------|------|------|
| ID | 0x00 | 읽기 전용 `0xA1A1A101` |
| SCRATCH | 0x04 | 읽기/쓰기 |
| IRQ_RAISE | 0x08 | 쓴 bit의 IRQ line을 올림(test용) |
| IRQ_STATUS | 0x0C | 읽으면 현재 IRQ, 쓰면 해당 bit clear(W1C) |

## 아키텍처 한 장

![Cosim Process — End-to-End](/images/blog/driver-cosim/diagrams/ch08-cosim-process.svg)

요지는 *하나의 프로세스 안*에 driver·RTL·BFM이 모두 들어 있고, pytest가 시나리오를 흘린다는 것입니다. 2장과 6장에서 본 대로 Verilator 5.054는 시간 제어가 있는 DPI export task를 거부하므로, 이 축소판은 SV BFM 대신 **C++ BFM**을 씁니다. driver가 `readl`을 부르면 C++ BFM이 AXI-Lite 핀을 직접 구동하고 handshake가 끝날 때까지 model을 tick합니다. thread는 하나뿐입니다.

## Step 1 — RTL → Verilator

RTL을 Verilated library로 빌드합니다. 뒤에서 Python이 `ctypes`로 열 shared library에 넣으려면 `-fPIC`가 필요합니다. 생성 코드는 Verilator 기본값 `-Os` 대신 `-O2`로 빌드했습니다.

```bash
verilator --cc --build -j 0 -O3 -CFLAGS -fPIC \
    -MAKEFLAGS "OPT_FAST=-O2 OPT_SLOW=-O2 OPT_GLOBAL=-O2" rtl/aristos1.sv
```

`obj_dir/`에 `Varistos1__ALL.a`(설계)와 `libverilated.a`(runtime)가 생깁니다.

## Step 2 — Driver를 cosim-buildable로

Linux driver를 *그대로* 가져와 cosim에서 컴파일하려면 Linux kernel API의 일부를 shim해야 합니다. 축소판에서 실제로 쓴 shim입니다.

```c title="cosim_shim.h"
#ifndef COSIM_SHIM_H
#define COSIM_SHIM_H
#ifdef COSIM_BUILD
  #include <stdint.h>
  #include <stdio.h>
  #include <stdlib.h>
  int bfm_read(uintptr_t addr, uint32_t *data);
  int bfm_write(uintptr_t addr, uint32_t data);
  static inline uint32_t readl(volatile void *addr) {
    uint32_t v = 0;
    if (bfm_read((uintptr_t)addr, &v) != 0) abort();
    return v;
  }
  static inline void writel(uint32_t val, volatile void *addr) {
    if (bfm_write((uintptr_t)addr, val) != 0) abort();
  }
  #define dev_info(d, fmt, ...)  printf("[driver] " fmt, ##__VA_ARGS__)
  #define dev_err(d, fmt, ...)   fprintf(stderr, "[driver] " fmt, ##__VA_ARGS__)
#else
  #include <linux/io.h>
  #include <linux/device.h>
#endif
#endif
```

driver의 probe는 ID register를 읽어 맞지 않으면 `-19`(`-ENODEV`)를 돌려주고, ISR은 자기 line을 IRQ_STATUS에 써서 ack합니다.

```c
int aristos1_probe(void) {
    uint32_t id = readl(g_dev.regs + REG_ID);
    if (id != ARISTOS1_ID) { dev_err(0, "bad id 0x%08x\n", id); return -19; /* -ENODEV */ }
    dev_info(0, "probe ok, id=0x%08x\n", id);
    return 0;
}
void aristos1_isr(unsigned vector) {
    g_dev.irq_count[vector]++;
    writel(1u << vector, g_dev.regs + REG_IRQ_STAT);
}
```

이 shim은 주소 폭과 오류 전달을 보여 주는 host용입니다. 실제 Linux `readl`/`writel`의 계약은 kernel 문서 *Bus-Independent Device Accesses*(docs.kernel.org/driver-api/device-io)에 있습니다. 그 문서는 MMIO 주소가 `__iomem` pointer이고 "in portable code, it must only be passed from and to functions that explicitly operated on an `__iomem` token"이라고 적고, read/write 함수는 "defined to be ordered"이며 ioremap 경로의 write는 "On many platforms and buses (e.g. PCI), writes issued through ioremap() mappings are posted"라고 설명합니다. 이 shim은 `__iomem`도, posted write도 모델링하지 않으므로 이 shim으로 빌드한 코드가 kernel module과 동등하다고 볼 수 없습니다. 이 장에서 같은 소스를 `.ko`로 빌드하지는 않았습니다.

## Step 3 — IRQ sampling과 재진입

RTL의 `irq` 4 bit는 C++ harness의 `tick()`이 매 cycle 읽습니다. 이전 cycle 대비 새로 올라온 bit만 pending에 모읍니다.

```cpp
static uint8_t newly_pending(uint8_t current, uint8_t previous) {
  return current & (uint8_t)~previous;
}
static void tick() {
  dut->clk = 0; ctx->timeInc(5); dut->eval();
  dut->clk = 1; ctx->timeInc(5); dut->eval();
  ++cycles;
  const uint8_t cur = dut->irq;
  pending |= newly_pending(cur, prev_irq);
  prev_irq = cur;
}
```

여기서 바로 ISR을 부르고 싶어지지만, 그러면 안 됩니다. `tick()`은 BFM이 bus access 도중에 부르는 함수이고, ISR은 ack를 위해 다시 `writel`을 부릅니다. bus access 안에서 또 다른 bus access가 시작되는 것입니다. 실제로 `tick()` 안에서 ISR을 부르는 판(`-DNAIVE_ISR`)을 만들어 같은 test를 돌리면, 앞의 두 test는 통과하고 IRQ test에서 Python 프로세스가 통째로 죽습니다.

```text
$ pytest -q test_naive.py -m "not slow"   # ISR called from inside tick()
..Fatal Python error: Aborted
rc=134
```

같은 호출을 C main에서 lldb로 돌린 backtrace가 원인을 보여 줍니다. IRQ_RAISE에 쓰는 `bfm_write(addr=8, data=5)`가 아직 끝나지 않은 상태에서 `tick()`이 ISR을 불렀고, ISR 안의 `writel`이 실패해 shim의 `abort()`가 호출됐습니다.

```text
frame #2: libsystem_c.dylib`abort + 148
frame #3: naive_main`aristos1_isr + 68
frame #4: naive_main`tick() at harness_naive.cpp:33:68
frame #5: naive_main`bfm_write(addr=8, data=5) at harness_naive.cpp:58:42
frame #6: naive_main`aristos1_raise + 28
frame #7: naive_main`cosim_irq(bits=5) at harness_naive.cpp:88:3
```

그래서 ISR dispatch는 bus access 바깥에서, 재진입 guard를 두고 합니다.

```cpp
static void dispatch_irqs() {        // never re-entered from inside a bus access
  if (in_isr) return;
  in_isr = true;
  while (pending) {
    for (unsigned bit = 0; bit < 4; ++bit)
      if (pending & (1u << bit)) { pending &= (uint8_t)~(1u << bit); aristos1_isr(bit); }
  }
  in_isr = false;
}
```

bit mask는 IRQ 0이 이미 high일 때 IRQ 1이 새로 올라오는 경우도 보존합니다. 이 harness는 Linux interrupt controller·ISR context·level/edge 정책을 재현하지 않습니다. 실제 모델에서는 그 정책을 따로 정의합니다.

## Step 4 — Pytest 시나리오

Python은 `ctypes`로 `libcosim.so`를 엽니다. 이 library에는 harness가 export하는 C ABI(`cosim_probe`, `cosim_read_id`, `cosim_irq` 등)가 들어 있습니다. 실행 파일은 `ctypes.CDLL`로 열 수 없으므로 처음부터 shared library로 빌드했습니다.

```bash
cc -std=c11 -O2 -fPIC -DCOSIM_BUILD -Isrc/driver -c src/driver/aristos1_driver.c -o obj_dir/aristos1_driver.o
c++ -std=c++17 -O2 -fPIC -shared -Iobj_dir -I$VL -I$VL/vltstd sim/harness.cpp obj_dir/aristos1_driver.o \
    obj_dir/Varistos1__ALL.a obj_dir/libverilated.a \
    -Wl,-U,__Z15vl_time_stamp64v,-U,__Z13sc_time_stampv,-U,_vlog_startup_routines -o libcosim.so
```

마지막 줄의 `-Wl,-U,...`가 없으면 macOS linker가 `Undefined symbols ... "sc_time_stamp()"`로 실패합니다. `libverilated.a`가 사용자가 선택적으로 정의하는 legacy 시간 함수 `sc_time_stamp()`·`vl_time_stamp64()`와 VPI의 `vlog_startup_routines`를 weak symbol로 참조하기 때문입니다(`verilated_funcs.h:436-441`). Verilator의 `include/verilated.mk:128-131`도 macOS에서 "specify all weak symbols as dynamic_lookup"이라는 주석과 함께 같은 `-Wl,-U` 옵션을 붙입니다.

```python
# test_aristos1.py
@pytest.fixture(scope="module")
def dut():
    assert driver.cosim_probe() == 0
    yield
    driver.cosim_remove()

class TestSmoke:
    def test_register_id(self, dut):
        assert driver.cosim_read_id() == 0xA1A1A101

    def test_scratch_high_bit(self, dut):
        assert driver.cosim_scratch(0x80000001) == 0

    def test_irq_while_other_pending(self, dut):
        # raise 0 and 2 together, then 1: every ISR must run once and ack
        assert driver.cosim_irq(0b0101) == 0
        assert driver.cosim_irq(0b0010) == 0
        assert [driver.cosim_irq_count(i) for i in range(4)] == [1, 1, 1, 0]

class TestStress:
    @pytest.mark.slow
    def test_scratch_loop(self, dut):
        rate = driver.cosim_scratch_loop(200000)
        print(f"\nscratch loop: {driver.cosim_cycles()} cycles total, {rate/1e6:.2f} Mcycle/s")
        assert rate > 0
```

```text
$ pytest -v test_aristos1.py -m "not slow"
test_aristos1.py::TestSmoke::test_register_id PASSED                     [ 33%]
test_aristos1.py::TestSmoke::test_scratch_high_bit PASSED                [ 66%]
test_aristos1.py::TestSmoke::test_irq_while_other_pending PASSED         [100%]
======================= 3 passed, 1 deselected in 0.28s ========================
[driver] probe ok, id=0xa1a1a101
$ pytest -v -s test_aristos1.py -m slow
scratch loop: 1000004 cycles total, 3.62 Mcycle/s
======================= 1 passed, 3 deselected in 0.35s ========================
```

`-m slow`는 `pytest.ini`에 `slow` marker를 등록해 두고 씁니다. 이 축소판의 "slow" test는 scratch write/read 20만 쌍(100만 cycle)이라 1초도 걸리지 않았습니다. 30분짜리 stress는 실행하지 않았습니다.

## Step 5 — CI 파이프라인

아래 workflow는 위 축소판을 GitHub Actions에 올리는 형태입니다. 이 workflow는 실행하지 않았습니다.

```yaml
# .github/workflows/cosim.yml
name: cosim
on:
  push: { branches: [main, develop, "feat/**"] }
  pull_request: { branches: [main] }
  schedule:
    - cron: "0 18 * * *"   # nightly 03:00 KST

jobs:
  smoke:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - name: Install
        run: sudo apt-get update && sudo apt-get install -y verilator python3-pip
      - name: pip
        run: pip install pytest
      - name: Build
        run: ./scripts/build_cosim.sh
      - name: Smoke
        run: pytest -v test_aristos1.py -m "not slow"

  nightly:
    if: github.event_name == 'schedule'
    runs-on: cosim-large        # 조직에서 만든 larger runner 이름
    timeout-minutes: 120
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: ./scripts/build_cosim.sh
      - name: Nightly
        run: pytest -v test_aristos1.py -m slow
```

이 workflow는 실행하지 않았으므로 각 줄을 1차 문서와 대조했습니다.

- `schedule` — GitHub Docs *Events that trigger workflows*: "By default, scheduled workflows run in UTC." 그래서 `0 18 * * *`이 한국 시간 03:00입니다.
- `timeout-minutes` — *Workflow syntax*: "The maximum number of minutes to let a job run before GitHub automatically cancels it. Default: 360".
- `if: github.event_name == 'schedule'` — *Workflow syntax*의 `jobs.<job_id>.if`는 "prevent a job from running unless a condition is met"입니다.
- `runs-on: ubuntu-latest` — actions/runner-images README가 Ubuntu 24.04로 적습니다. 그 판의 Ubuntu 패키지는 `verilator (5.020-1)`(packages.ubuntu.com noble)이라 이 장의 5.054와 다릅니다.
- larger runner — GitHub Docs *Use larger runners*: "Larger runners are automatically assigned a workflow label that matches the runner name." 이름은 조직이 runner를 만들 때 정하므로 `cosim-large`는 예시 이름입니다. 이전 판의 `ubuntu-latest-4-cores`는 그런 label이 미리 있다는 전제였습니다.
- link 옵션 — 위 `-Wl,-U,...`는 Verilator `include/verilated.mk:130-131`이 `ifeq ($(UNAME_S),Darwin)` 안에서만 붙이는 옵션입니다. Linux의 `build_cosim.sh`에는 넣지 않습니다. 이 장에서 Linux 빌드는 하지 않았습니다.

## Performance — cycle-accurate cosim의 속도

cosim의 근본 제약은 RTL이 cycle 단위로 계산된다는 점입니다. 이 시리즈에서 같은 macOS host로 잰 수치를 모으면 다음과 같습니다.

| 구성 | 측정값 | 측정한 장 |
|------|-----------|------|
| 32-bit counter, trace 없음 | 16.6~19.6 Mcycle/s | 3장 |
| 32-bit counter, VCD trace | 2.80~2.94 Mcycle/s | 3장 |
| Aristos-1 축소판, C++ BFM으로 scratch write/read 반복 | 3.62 / 3.82 / 5.18 Mcycle/s (3회) | 이 장 |
| SystemC TLM register write | 36.3 M transaction/s | 5장 |
| 상용 simulator | 측정하지 않음 | — |

축소판은 AXI-Lite slave RTL과 C++ BFM handshake가 들어간 다른 구성이라 counter보다 느렸습니다(원인별 분해는 측정하지 않았습니다). 이 수치로 시나리오의 자리를 대략 정할 수 있습니다. 1 GHz로 도는 hardware의 1초는 10억 cycle이고, 이 축소판 속도(약 4 Mcycle/s)로도 250초가 걸립니다.

| 시나리오 | 이 시리즈가 보내는 곳 |
|----------|-----------|
| register 검증·짧은 transaction | Verilator cosim |
| IRQ scenario | Verilator cosim (이 장에서 실행) |
| DMA descriptor ring | Verilator cosim (이 장에서는 구현하지 않음) |
| hardware 시간 1초 이상의 stress·throughput | FPGA prototype |
| Linux boot end-to-end | SystemC VP |
| User-space app + driver | FPGA prototype 또는 QEMU + functional model |

## 시리즈 마무리

8장을 돌아보면 다음과 같습니다.

| 장 | 어휘 | 무엇을 풀었나 |
|----|------|----------------|
| 1 | cosim, pre-silicon | 왜 |
| 2 | DPI-C | SV↔C 다리 |
| 3 | Verilator | open-source 도구 |
| 4 | CocoTB | Python testbench |
| 5 | SystemC TLM | 추상화 위 단계, VP |
| 6 | BFM | protocol adapter |
| 7 | UVM C reference | single source of truth |
| 8 | end-to-end | 통합 청사진 |

8장이 끝났을 때 머릿속에 남아야 할 것은 *조립 사고*입니다. cosim은 단일 도구가 아니라 *Verilator + driver shim + BFM + reference + pytest + CI*의 조립체입니다. 어느 부품이 도구의 한계에 막히면 다른 부품으로 메웁니다. 이 장에서 Verilator가 timed export task를 거부하자 SV BFM을 C++ BFM으로 바꾼 것이 그 예입니다.

## 정리

- 통합 cosim 청사진: Verilator(RTL → C++ 클래스) + driver shim + BFM + reference model + pytest + CI. 축소판은 control 경로와 IRQ까지 실제로 돌렸습니다.
- driver는 `cosim_shim.h`로 `readl`/`writel`을 BFM 호출로 바꿉니다. 같은 소스의 `.ko` 빌드는 이 장에서 하지 않았습니다.
- IRQ는 simulator thread의 `tick()`에서 sampling하고, ISR dispatch는 bus access 바깥에서 합니다. 안에서 부르면 test 프로세스가 `abort()`로 죽었습니다.
- pytest mark로 *smoke*(PR마다)와 *slow*(nightly)를 나눕니다. 축소판 smoke는 0.28초에 3개 test를 통과했습니다.
- 축소판 속도는 3.6~5.2 Mcycle/s였고, 이 수치가 cosim·FPGA·VP 사이의 경계를 정하는 근거입니다.

## 다음 장 예고

시리즈 마무리입니다. 더 깊이 들어가고 싶다면 다음 자료가 다음 단계입니다.

- Verilator 공식 manual의 multithreading·DPI scoping(`--threads-dpi`, `svSetScope`)
- lowRISC Ibex 저장소의 `dv/cosim/` — `cosim.h:68-69`의 `step()` 주석이 "Step the co-simulator, checking register write and PC of executed instruction match the supplied values"라고 적고, `spike_cosim.h:23`의 `SpikeCosim`이 그 interface를 Spike로 구현합니다(master 3d524f1)
- lowRISC OpenTitan 저장소의 `hw/dv/dpi/` — `uartdpi`·`jtagdpi`·`spidpi` 등. 예를 들어 `uartdpi/uartdpi.sv:24-37`은 `uartdpi_create`·`uartdpi_read`·`uartdpi_write`를 `import "DPI-C"`로 선언합니다(master 4ced702)

## 1차 자료와 실행 환경

- [GitHub Docs: Use larger runners](https://docs.github.com/en/actions/how-tos/manage-runners/larger-runners/use-larger-runners), [Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [Linux kernel: Bus-Independent Device Accesses](https://docs.kernel.org/driver-api/device-io.html)
- [actions/runner-images README](https://github.com/actions/runner-images), [packages.ubuntu.com noble/verilator](https://packages.ubuntu.com/noble/verilator)
- Verilator 5.054 `include/verilated.mk:128-131`
- GitHub contents API(2026-11-16) — `lowRISC/ibex` `dv/cosim/`, `lowRISC/opentitan` `hw/dv/dpi/` 파일 목록

실행 환경은 macOS 27.2.1, Apple M2 Pro, Verilator 5.054, Apple clang 21.0.0, Python 3.13 venv, pytest 9.2.0입니다(2026-11-16). GitHub Actions workflow, Linux 빌드, `.ko` 빌드, DMA·matmul RTL, 30분 stress, 상용 simulator는 실행하지 않았습니다.

## 관련 항목

- [Ch 7: UVM C Reference Model](/blog/tools/emulation/driver-cosim/chapter07-uvm-c-model)
- [Ch 1: Why Pre-Silicon Driver Verification](/blog/tools/emulation/driver-cosim/chapter01-why-cosim) — 시리즈 다시 보기
- QEMU Fake Device — Test Automation
- FPGA Driver via QEMU+VFIO — VFIO Basics — post-cosim 단계
- [Embedded Performance Engineering — Methodology](/blog/embedded/performance-engineering/part1-01-methodology)
- [PCIe Ch 11: DMA·IOMMU](/blog/embedded/hardware/pcie/chapter11-linux-dma) — cosim에서 shim으로 대신한 dma_map_single이 실제 커널에서 하는 일
