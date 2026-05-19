---
title: "Ch 8: End-to-End — Driver + RTL Co-sim"
date: 2026-05-17T08:00:00
description: "Verilator + DPI-C + Linux driver — 통합 cosim flow."
series: "Driver-RTL Co-simulation"
seriesOrder: 8
tags: [cosim, end-to-end, verilator, driver-integration, ci]
draft: true
---

마지막 장입니다. 지금까지 다룬 Verilator·DPI-C·CocoTB·BFM·reference model을 *하나의 환경*으로 묶어 봅니다. 실제 NPU prototype을 검증한다고 가정한 통합 청사진과 CI 파이프라인까지 그립니다. 시리즈 8장의 어휘를 모두 한 번에 쓰는 셈입니다.

## 목표 시나리오

가상의 NPU "Aristos-1"을 검증합니다. 다음 요건:

- AXI4 인터페이스 1개(control 32-bit)·AXI4 인터페이스 1개(data 256-bit DMA)
- IRQ line 4개(done·error·queue-empty·perf-counter overflow)
- Linux driver는 *진짜 .ko로 빌드 가능한 코드*
- pre-silicon에 다음을 모두 검증해야 함:
  - register read/write 인코딩
  - DMA descriptor ring 한 바퀴
  - IRQ delivery + ISR 분기
  - matmul reference 일치 (UVM C reference)
  - 30분 stress test
  - GitHub Actions에서 매 push마다 smoke

이 요건을 *5분짜리 smoke + 1시간짜리 nightly*로 분리해 cosim 환경에 태우는 게 목표입니다.

## 아키텍처 한 장

```text
┌─────────────────────────────────────────────────────────────────┐
│                  Cosim Process (Linux host)                     │
│                                                                 │
│   ┌────────────────────┐                                        │
│   │  pytest runner     │ ── parametrize: smoke / stress / edge  │
│   └─────────┬──────────┘                                        │
│             │                                                   │
│             ▼                                                   │
│   ┌────────────────────┐    DPI    ┌──────────────────────┐    │
│   │ Linux driver (.so) │ ────────▶ │  Varistos1 (RTL)     │    │
│   │  - probe/init      │           │  Verilator C++ class │    │
│   │  - ioctl handlers  │           │                      │    │
│   │  - ISR             │           │  + AXI Master BFM    │    │
│   │  - DMA ring mgmt   │           │  + AXI Slave BFM(RAM)│    │
│   └─────────┬──────────┘           └──────────────────────┘    │
│             │                                  ▲                │
│             │ matmul_ref()                     │ irq toggling   │
│             ▼                                  │                │
│   ┌────────────────────┐                       │                │
│   │ reference_model.c  │                       │                │
│   │ (matmul, conv2d)   │                       │                │
│   └────────────────────┘                       │                │
│                                                │                │
│   ┌────────────────────────────────────────────┴────────────┐  │
│   │     IRQ injection thread (poll RTL irq pin)              │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│   wave.fst (on failure) ───────────────▶ CI artifact            │
└─────────────────────────────────────────────────────────────────┘
```

요지: *하나의 프로세스 안*에 driver·RTL·BFM·reference가 모두 들어 있고, pytest가 시나리오를 흘립니다.

## Step 1 — RTL → Verilator

```bash
verilator --cc --exe --trace-fst \
    -I rtl \
    rtl/aristos1.sv rtl/axi_master_bfm.sv rtl/axi_slave_bfm.sv \
    sim/main.cpp sim/driver_harness.c \
    src/driver/aristos1_driver.c src/algo/matmul_ref.c \
    -CFLAGS "-O2 -Isrc -DCOSIM_BUILD" \
    --top-module aristos1_tb
make -j -C obj_dir -f Varistos1_tb.mk Varistos1_tb
```

핵심 옵션:
- `--trace-fst`: 실패 시 dump 보존, CI artifact용
- `-CFLAGS -DCOSIM_BUILD`: driver 코드 안에서 *kernel header가 아닌 cosim shim header*를 include하도록 분기
- `--top-module aristos1_tb`: testbench wrapper(BFM 묶음)

## Step 2 — Driver를 cosim-buildable로

Linux driver를 *그대로* 가져와 cosim에서 컴파일하려면 *Linux kernel API의 일부를 shim*해 줘야 합니다.

```c
// cosim_shim.h — kernel header 대신
#ifdef COSIM_BUILD
  #include <stdint.h>
  #include <stdio.h>
  #include <stdlib.h>
  #include <string.h>

  static inline uint32_t readl(volatile void *addr) {
    extern void bfm_read(int addr, int *data);
    int v; bfm_read((int)(intptr_t)addr, &v);
    return (uint32_t)v;
  }
  static inline void writel(uint32_t val, volatile void *addr) {
    extern void bfm_write(int addr, int data);
    bfm_write((int)(intptr_t)addr, (int)val);
  }

  #define dev_info(d, fmt, ...)  printf("[driver] " fmt, ##__VA_ARGS__)
  #define dev_err(d, fmt, ...)   fprintf(stderr, "[driver] " fmt, ##__VA_ARGS__)
  // dma_map_single, kmalloc, ... 등도 shim
#else
  #include <linux/io.h>
  #include <linux/device.h>
#endif
```

driver 본체는 `cosim_shim.h`를 통해 빌드되면 cosim용, kernel에서 빌드되면 *원래의 .ko*로 컴파일됩니다. 같은 source.

## Step 3 — IRQ injection

RTL의 `irq` pin을 driver의 ISR에 *직접* 연결하는 thread.

```cpp
// sim/main.cpp
#include "Varistos1_tb.h"
#include <thread>
#include <atomic>

extern "C" void aristos1_isr(int vector);  // driver의 ISR
std::atomic<bool> sim_running{true};
Varistos1_tb *dut;

void irq_thread() {
  uint8_t prev = 0;
  while (sim_running.load()) {
    uint8_t cur = dut->irq;
    if (cur && !prev) {
      // rising edge → 가장 낮은 set bit를 vector로
      for (int i = 0; i < 4; i++) {
        if (cur & (1 << i)) aristos1_isr(i);
      }
    }
    prev = cur;
    std::this_thread::sleep_for(std::chrono::microseconds(10));
  }
}

int main(int argc, char **argv) {
  Verilated::commandArgs(argc, argv);
  dut = new Varistos1_tb();

  std::thread t(irq_thread);

  // pytest로부터 시나리오 신호 받기
  // ... (구현 생략)

  sim_running.store(false);
  t.join();
  delete dut;
}
```

driver의 ISR이 *우리가 띄운 thread*에서 호출됩니다. driver 코드는 자신이 진짜 IRQ를 받고 있다고 가정해도 동작합니다.

## Step 4 — Pytest 시나리오

```python
# test_aristos1.py
import pytest
import ctypes

driver = ctypes.CDLL("./obj_dir/Varistos1_tb")
driver.cosim_probe.restype = ctypes.c_int

@pytest.fixture(scope="module")
def dut():
    rc = driver.cosim_probe()
    assert rc == 0
    yield
    driver.cosim_remove()

class TestSmoke:
    def test_register_id(self, dut):
        val = driver.cosim_read_id()
        assert val == 0xA1A1A101

    def test_simple_matmul(self, dut):
        rc = driver.cosim_run_matmul_2x2()
        assert rc == 0

class TestStress:
    @pytest.mark.slow
    def test_dma_throughput_30min(self, dut):
        rc = driver.cosim_dma_loop(seconds=1800)
        assert rc == 0
```

```bash
pytest -v test_aristos1.py -m "not slow"        # smoke
pytest -v test_aristos1.py -m slow              # nightly
```

mark로 빠른 test와 느린 test가 *같은 코드 베이스*에서 분리됩니다.

## Step 5 — CI 파이프라인

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
        run: pip install cocotb cocotbext-axi pytest
      - name: Build
        run: ./scripts/build_cosim.sh
      - name: Smoke
        run: pytest -v test_aristos1.py -m "not slow"
      - name: Upload waves on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: waves
          path: '*.fst'

  nightly:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest-4-cores   # 더 큰 runner
    timeout-minutes: 120
    steps:
      - uses: actions/checkout@v4
      - name: Install ...
      - name: Build ...
      - name: Nightly
        run: pytest -v test_aristos1.py -m slow
      - name: Coverage report
        run: ./scripts/cov_report.sh
      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with: { name: coverage, path: coverage.xml }
```

이로써 PR마다 smoke가, 매일 밤 stress가 자동으로 돕니다. 실패하면 waveform이 artifact로 남아 *그 다음 날 아침* 분석 가능.

## Performance — cycle-accurate cosim의 속도

cosim의 *근본 제약*은 RTL이 cycle-accurate라는 점입니다. 대략 다음 정도의 throughput:

| 구성 | cycle/sec | 의미 |
|------|-----------|------|
| Verilator + 작은 RTL(<10k gate) | 50,000~200,000 | sub-millisecond test가 빠름 |
| Verilator + 큰 RTL(>100k gate) | 1,000~10,000 | 1 ms 시뮬레이션에 100ms~1s |
| Verilator + multi-thread | 위의 1.5~3× | host CPU 활용 |
| Commercial(VCS optimized) | 10,000~50,000 | 일반적으로 Verilator보다 느림(!) |

이로부터 *어떤 시나리오를 cosim에 두고 어떤 시나리오를 다른 도구로 보내야* 하는지가 결정됩니다.

| 시나리오 | 권장 도구 |
|----------|-----------|
| register 검증·짧은 transaction | Verilator cosim |
| DMA descriptor ring·IRQ scenario | Verilator cosim |
| 1초 이상 stress·throughput | FPGA prototype |
| Linux boot end-to-end | SystemC VP |
| User-space app + driver | FPGA prototype 또는 QEMU + functional model |

cosim은 *특정 깊이의 검증*에 최적입니다. 그 깊이 안에서는 다른 도구가 못 따라옵니다.

## 시리즈 마무리

8장을 돌아보면.

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

8장이 끝났을 때 머릿속에 남아야 할 것은 *조립 사고*입니다. cosim은 단일 도구가 아니라 *Verilator + DPI-C + driver + BFM + reference + pytest + CI*의 조립체입니다. 어느 부품이 빠지면 다른 부품으로 메우거나(예: Verilator 대신 Icarus, BFM 대신 SV task), 비용이 부족하면 축소(예: SystemC VP는 나중에)할 수 있습니다.

NPU·chiplet·SoC가 가는 길에서 *pre-silicon driver 검증*은 더 이상 *옵션*이 아닙니다. 이 시리즈가 그 길의 어휘를 빌려 드리는 글이 되었으면 합니다.

## 정리

- 통합 cosim 청사진: Verilator(RTL → C++ 클래스) + Linux driver shim + DPI-C BFM + reference model + pytest + CI.
- driver는 `cosim_shim.h`로 *동일 source가 .ko와 cosim binary 양쪽으로* 빌드되게 함.
- IRQ injection은 별도 thread에서 `dut->irq` rising edge를 polling. driver ISR을 *직접* 호출.
- pytest mark로 *smoke*(PR마다)·*nightly*(stress) 분리. waveform은 실패 시 artifact.
- Cycle-accurate 한계: 작은 RTL에서 200k cycle/s, 큰 RTL에서 10k 미만. stress·boot은 다른 도구로.
- 시리즈가 가르치는 것은 *조립 사고*: 8개 어휘를 상황에 맞게 결합.
- pre-silicon driver 검증은 NPU/chiplet/SoC의 표준 작업.

## 다음 장 예고

시리즈 마무리입니다. 더 깊이 들어가고 싶다면 다음 자료가 자연스러운 다음 단계입니다.

- Verilator 공식 manual의 multithreading·DPI scoping
- *SystemVerilog for Verification* (Spear) — UVM 학습용
- OpenTitan/Chipyard 저장소의 cosim 디렉터리 — 실제 산업 예제

## 관련 항목

- [Ch 7: UVM C Reference Model](/blog/tools/emulation/driver-cosim/chapter07-uvm-c-model)
- [Ch 1: Why Pre-Silicon Driver Verification](/blog/tools/emulation/driver-cosim/chapter01-why-cosim) — 시리즈 다시 보기
- [QEMU Fake Device — Test Automation](/blog/tools/emulation/qemu-fake-device/chapter10-test-automation)
- [FPGA Driver via QEMU+VFIO — VFIO Basics](/blog/tools/emulation/qemu-fpga-driver/chapter09-vfio-basics) — post-cosim 단계
- [Embedded Performance Engineering — Methodology](/blog/embedded/performance-engineering/part1-01-methodology)
