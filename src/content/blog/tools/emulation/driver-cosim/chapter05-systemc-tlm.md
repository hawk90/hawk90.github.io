---
title: "Ch 5: SystemC TLM — Transaction-Level Modeling"
date: 2026-05-17T05:00:00
description: "Cycle-accurate 너머 — high-speed virtual platform."
series: "Driver-RTL Co-simulation"
seriesOrder: 5
tags: [systemc, tlm, virtual-platform, abstraction, vp]
draft: true
---

cycle-accurate cosim은 *RTL의 진실*을 보여 주지만 느립니다. Hz~kHz 수준의 시뮬레이션 속도로는 Linux 한 번 boot시키기가 *몇 시간*이 걸리죠. driver의 *상위 레이어*(파일시스템 통합·user-space ioctl·multi-thread workload)를 검증하려면 이보다 *천 배 빠른* 환경이 필요합니다. 그 자리에 **SystemC TLM**(Transaction-Level Modeling)이 들어갑니다.

이 장은 SystemC와 TLM 2.0의 핵심 어휘, virtual platform이라는 개념, 그리고 cosim 환경에서 *RTL 영역과 TLM 영역을 섞는* mixed-abstraction 패턴을 다룹니다.

## 어떤 문제를 푸는가

Driver 개발에서 다음 검증 시나리오는 cycle-accurate cosim으로 풀기 어렵습니다.

- **Boot sequence** — kernel boot + driver probe + module init 시퀀스
- **Multi-user/thread workload** — 여러 task가 동시에 같은 디바이스 사용
- **End-to-end pipeline** — application → user library → ioctl → driver → device
- **Long-running test** — 24시간 stability, memory leak 검출

cycle-accurate에서는 Linux 한 번 boot에 *수 시간~수일*입니다. TLM은 *transaction*을 단위로 모델링해 같은 환경을 *몇 분 안에* 돌립니다.

## SystemC란 무엇인가

**SystemC**는 *C++ class library + simulation kernel*입니다. 별도 언어가 아니라, C++ 안에서 `#include <systemc.h>`로 쓰는 라이브러리. 핵심 어휘:

- **`SC_MODULE`** — Verilog의 `module`에 대응. C++ 클래스 매크로.
- **`SC_THREAD`/`SC_METHOD`** — 모듈 내 process. `SC_THREAD`는 시간 진행 가능, `SC_METHOD`는 0-time.
- **`sc_signal<T>`** — 두 모듈을 잇는 신호. `wire`에 대응.
- **`sc_clock`** — 클락 발생기.
- **`sc_event`** — 명시적 wait/notify.
- **`sc_time`** — 시간 단위(`SC_NS`, `SC_PS` 등).

작은 module 하나:

```cpp
#include <systemc.h>

SC_MODULE(blink) {
  sc_in<bool> clk;
  sc_out<bool> led;

  SC_CTOR(blink) {
    SC_METHOD(toggle);
    sensitive << clk.pos();
  }

  void toggle() {
    led.write(!led.read());
  }
};
```

SystemC 자체는 cycle-accurate에도 쓰일 수 있지만, *그 진가는 TLM과 결합할 때* 나옵니다.

## TLM 2.0 — Transaction-Level Modeling

**TLM 2.0**(IEEE 1666)은 SystemC 위에 *bus transaction*을 추상화한 표준 API입니다. 핵심은 *signal 한 토글 한 토글이 아니라 read/write 한 건을 단위로* 모델링한다는 점입니다.

### 두 가지 timing 추상

| 추상 | 의미 | 속도 | 용도 |
|------|------|------|------|
| **LT** (Loosely-Timed) | transaction = 즉시 완료, 명목적 time annotation | 빠름(MHz~GHz 수준) | software 검증, boot |
| **AT** (Approximately-Timed) | request·response phase 분리, latency 모델링 | 중간 | performance 평가 |

LT는 *기능 정확*하되 *언제 일어났는가*는 명목적입니다. driver가 register를 100개 write하면 100번 호출되지만, 실 시간 진행은 거의 없죠. boot/functional 검증에 충분합니다.

AT는 *latency·throughput*을 어느 정도 보여 줍니다. 실제 cycle은 아니지만 *상대적 지연*은 의미가 있습니다. performance modeling에 적합.

### 핵심 어휘

```cpp
#include <tlm.h>
#include <tlm_utils/simple_initiator_socket.h>
#include <tlm_utils/simple_target_socket.h>

// Initiator (driver 역할)
SC_MODULE(driver_master) {
  tlm_utils::simple_initiator_socket<driver_master> socket;
  SC_CTOR(driver_master) : socket("socket") {
    SC_THREAD(run);
  }
  void run();
};

// Target (device 역할)
SC_MODULE(device_target) {
  tlm_utils::simple_target_socket<device_target> socket;
  SC_CTOR(device_target) : socket("socket") {
    socket.register_b_transport(this, &device_target::b_transport);
  }
  void b_transport(tlm::tlm_generic_payload &trans, sc_time &delay);
};
```

**`tlm_generic_payload`**가 transaction 본체입니다.

```cpp
trans.set_command(tlm::TLM_WRITE_COMMAND);
trans.set_address(0x1000);
trans.set_data_ptr(reinterpret_cast<unsigned char *>(&value));
trans.set_data_length(4);
trans.set_streaming_width(4);
trans.set_byte_enable_ptr(nullptr);
trans.set_dmi_allowed(false);
trans.set_response_status(tlm::TLM_INCOMPLETE_RESPONSE);

sc_time delay = SC_ZERO_TIME;
socket->b_transport(trans, delay);

if (trans.get_response_status() != tlm::TLM_OK_RESPONSE) {
  SC_REPORT_ERROR("driver", "transaction failed");
}
```

## blocking vs non-blocking transport

TLM은 두 transport 방식을 제공합니다.

- **`b_transport`** — blocking. 한 호출이 *완료*될 때까지 반환 안 함. LT에 자연스러움.
- **`nb_transport_fw`/`nb_transport_bw`** — non-blocking. request·response가 분리, 중간에 BEGIN_REQ/END_REQ/BEGIN_RESP/END_RESP 4-phase로 진행. AT에 자연스러움.

대부분의 driver 검증은 `b_transport`로 충분합니다. *AT가 필요한 시점*은 bus contention/QoS를 보거나, NoC interconnect를 모델링할 때입니다.

## Virtual Platform — Linux를 boot시키다

**Virtual Platform**(VP)이란 *CPU + 메모리 + 디바이스*가 모두 SystemC/TLM으로 모델링된 환경입니다. ISS(Instruction Set Simulator) 또는 fast-model CPU 위에서 *진짜 Linux kernel*이 boot됩니다.

```text
┌──────────────────────────────────────────┐
│         Virtual Platform (SystemC)        │
│                                          │
│   ┌───────┐    ┌──────────────────────┐  │
│   │ CPU   │───▶│   TLM bus(AXI)        │  │
│   │ (QEMU │    └──┬────────┬───────┬──┘  │
│   │  ISS) │       │        │       │      │
│   └───────┘       ▼        ▼       ▼      │
│              ┌──────┐ ┌──────┐ ┌─────────┐│
│              │ UART │ │  RAM │ │ MY-NPU  ││
│              │ TLM  │ │ TLM  │ │ TLM/RTL ││
│              └──────┘ └──────┘ └─────────┘│
└──────────────────────────────────────────┘
                    ▲
                    │
              Linux boots here
              driver loads as .ko
```

CPU 모델은 보통 *QEMU의 TCG*를 SystemC TLM bridge로 감싸 씁니다. ARM의 *Fast Models*가 이 패턴의 표준 도구이며, AMD/Intel의 internal VP도 비슷한 구조입니다.

이 환경에서는 driver 검증이 *진짜 Linux* 위에서 일어납니다. `insmod my_driver.ko`가 정상적으로 통하고, `cat /proc/interrupts`로 IRQ를 확인하고, user-space에서 `ioctl`을 호출할 수 있습니다. cycle-accurate가 *아니지만* functional 검증에는 압도적입니다.

## Mixed-abstraction — TLM과 RTL 섞기

핵심 패턴: *디바이스 일부*는 RTL로(verilator를 통해), *나머지*는 TLM으로 두는 것.

```cpp
SC_MODULE(my_device_target) {
  tlm_utils::simple_target_socket<my_device_target> socket;
  Vmy_rtl *rtl_block;   // Verilator-generated DUT

  SC_CTOR(my_device_target) : socket("socket") {
    rtl_block = new Vmy_rtl();
    socket.register_b_transport(this, &my_device_target::b_transport);
  }

  void b_transport(tlm::tlm_generic_payload &trans, sc_time &delay) {
    if (is_critical_path_register(trans.get_address())) {
      // 중요한 register는 실 RTL을 거침
      rtl_block->addr = trans.get_address();
      rtl_block->wdata = *reinterpret_cast<uint32_t *>(trans.get_data_ptr());
      rtl_block->write_req = 1;
      tick_rtl();  // 몇 cycle 진행
    } else {
      // 나머지는 빠른 functional model
      do_functional_write(trans);
    }
    trans.set_response_status(tlm::TLM_OK_RESPONSE);
  }
};
```

이로써 *검증하고 싶은 모듈*은 cycle-accurate RTL로, *나머지*는 빠른 TLM으로 두는 절충이 가능합니다. NPU vendor가 *연산 datapath만 RTL로 검증하고 control/memory subsystem은 TLM으로* 가는 흐름이 그 예입니다.

## 산업 표준 도구

상용·반공개 VP 도구의 큰 그림.

| 도구 | 제공사 | 특징 |
|------|--------|------|
| **Fast Models** | Arm | Cortex-A/M ISS + AMBA TLM. ARM SoC 표준 |
| **Synopsys Platform Architect** | Synopsys | NoC·power 모델링 강화 |
| **QEMU SystemC bridge** | Xilinx/AMD | QEMU TCG를 SystemC initiator로 |
| **Imperas riscvOVPsim** | Synopsys | RISC-V ISS + TLM |
| **OSCI Reference** | Accellera | 표준 reference impl |

NPU/accelerator vendor 사이에서 *Fast Models + 사내 RTL* 조합이 *de facto* 표준이라 봐도 무리가 없습니다.

## NPU pre-RTL driver development

전형적 시나리오:
1. **연산 spec 확정** → C reference model 작성.
2. **TLM device skeleton** → register map 정의, b_transport에 reference model wiring.
3. **VP에 Linux boot** → driver를 *진짜 Linux kernel module*로 빌드, insmod, ioctl 시험.
4. **RTL 도착** → critical register/datapath만 RTL로 교체, 나머지는 TLM 유지.
5. **End-to-end run** → user-space inference app까지.

이 흐름이 *RTL 도착 전*에 driver의 상위 stack을 *완전히* 검증해 둡니다. 도착 뒤에는 register encoding/IRQ timing 같은 *RTL boundary* 버그만 남겨 cosim에서 잡으면 됩니다.

## 흔한 함정

- **`b_transport`의 `delay`** — 인자로 받은 `sc_time delay`를 *증가시킨 후 wait* 해야 정상. 안 그러면 progress 0인 무한 호출.
- **DMI(Direct Memory Interface)** — RAM 모델에서 빠른 접근을 위한 hint. driver가 DMA로 RAM에 접근할 때 *DMI 허용 영역*과 *MMIO 영역*을 구분해야 함.
- **endianness** — TLM의 `data_ptr`은 host endian. 디바이스 endian이 다르면 byte swap 명시.
- **race** — `SC_THREAD` 두 개가 같은 신호에 동시 접근하면 깨짐. `sc_event`로 직렬화.

## 정리

- **SystemC**는 C++ 라이브러리 + simulation kernel. **TLM 2.0**은 그 위의 transaction-level 표준 API.
- LT(loosely-timed)는 *기능*, AT(approximately-timed)는 *latency*. 대부분 cosim은 LT.
- 핵심: `tlm_generic_payload`·`b_transport`·initiator/target socket.
- **Virtual Platform**은 CPU+RAM+디바이스가 모두 SystemC인 환경. *진짜 Linux*가 boot되고 driver가 `.ko`로 로드됨.
- **Mixed-abstraction**으로 *중요한 영역은 RTL(Verilator), 나머지는 TLM*. NPU vendor의 일반적 흐름.
- 산업 표준: Arm Fast Models·Synopsys Platform Architect·QEMU SystemC bridge.
- pre-RTL driver dev 5-step: spec → TLM skeleton → VP boot → RTL 교체 → end-to-end.

## 다음 장 예고

다음 장은 RTL과 driver 사이의 *세부 protocol*을 캡슐화하는 **BFM**(Bus Functional Model)을 다룹니다. AXI/PCIe/AHB BFM이 어떻게 구성되고, protocol assertion·timing checker가 어떻게 testbench에 녹는지.

## 관련 항목

- [Ch 4: CocoTB](/blog/tools/emulation/driver-cosim/chapter04-cocotb)
- [Ch 6: Bus Functional Model](/blog/tools/emulation/driver-cosim/chapter06-bfm)
- [QEMU Internals — TCG Deep](/blog/tools/emulation/qemu-internals/chapter13-tcg-deep) — fast functional CPU model
- [QEMU Embedded — ARM virt](/blog/tools/emulation/qemu-embedded/chapter02-arm-virt) — virtual platform 비교
