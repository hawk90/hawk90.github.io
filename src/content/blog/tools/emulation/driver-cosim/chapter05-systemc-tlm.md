---
title: "SystemC TLM 분석 — Transaction-Level Modeling으로 빠른 검증"
slug: "tools/emulation/driver-cosim/chapter05-systemc-tlm"
date: 2026-05-22T09:05:00
description: "Cycle-accurate 너머 — high-speed virtual platform."
series: "Driver-RTL Co-simulation"
seriesOrder: 5
tags: [systemc, tlm, virtual-platform, abstraction, vp]
draft: false
topics: ["tools", "tools/emulation"]
---

cycle-accurate cosim은 signal과 cycle 동작을 관찰할 수 있지만 실행 시간은 설계·host·trace 조건에 따라 달라집니다. Linux boot나 긴 workload를 빠르게 시험하고 싶을 때는 transaction-level 모델이 선택지가 됩니다. 다만 TLM의 속도와 정확도도 모델의 상세도와 workload에 따라 측정해야 합니다. 그 한 방법이 **SystemC TLM**(Transaction-Level Modeling)입니다.

이 장은 SystemC와 TLM 2.0의 핵심 어휘, virtual platform이라는 개념, 그리고 cosim 환경에서 *RTL 영역과 TLM 영역을 섞는* mixed-abstraction 패턴을 다룹니다.

## 어떤 문제를 푸는가

Driver 개발에서 다음 검증 시나리오는 cycle-accurate cosim으로 풀기 어렵습니다.

- **Boot sequence** — kernel boot + driver probe + module init 시퀀스
- **Multi-user/thread workload** — 여러 task가 동시에 같은 디바이스 사용
- **End-to-end pipeline** — application → user library → ioctl → driver → device
- **Long-running test** — 24시간 stability, memory leak 검출

cycle-accurate와 TLM의 실행 시간은 한 숫자로 일반화할 수 없습니다. TLM은 signal 전이를 매 cycle 계산하지 않고 transaction을 단위로 다뤄 상위 소프트웨어 흐름을 빠르게 돌릴 수 있지만, 모델이 생략한 cycle-level 동작은 이 결과로 검증되지 않습니다.

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

LT는 transaction 호출을 유지하면서 대기 시간을 `sc_time` annotation으로 표현할 수 있습니다. 실행 시간이 짧아도 모델의 기능 계약만 확인할 수 있으며, 실제 cycle timing이나 성능을 보장하지는 않습니다.

AT는 request·response phase와 annotation을 사용해 선택한 latency·contention 가정을 표현합니다. 실제 RTL cycle이나 성능과 일치한다고 보려면 별도 상관 검증이 필요합니다.

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

![SystemC Virtual Platform](/images/blog/driver-cosim/diagrams/ch05-virtual-platform.svg)

CPU 모델은 보통 *QEMU의 TCG*를 SystemC TLM bridge로 감싸 씁니다. ARM의 *Fast Models*가 이 패턴의 표준 도구이며, AMD/Intel의 internal VP도 비슷한 구조입니다.

이 환경에서는 driver 검증이 *진짜 Linux* 위에서 일어납니다. `insmod my_driver.ko`가 정상적으로 통하고, `cat /proc/interrupts`로 IRQ를 확인하고, user-space에서 `ioctl`을 호출할 수 있습니다. cycle-accurate가 *아니지만* functional 검증에는 압도적입니다.

## `b_transport` 시간 계약

`b_transport`에 전달되는 `delay`는 initiator와 target 사이의 annotated local time입니다. target은 지연을 annotation에 더하거나, 실제 kernel time을 `wait`로 진행할 수 있습니다. 양쪽 방식을 동시에 쓰면 같은 지연을 두 번 셀 수 있습니다. 다음 예시는 annotation만 사용하는 LT target입니다.

```cpp
void device_target::b_transport(tlm::tlm_generic_payload &trans, sc_time &delay) {
  if (!valid_payload(trans)) {
    trans.set_response_status(tlm::TLM_ADDRESS_ERROR_RESPONSE);
    return;
  }
  access_registers(trans);
  delay += sc_time(10, SC_NS);  // annotation만 증가
  trans.set_response_status(tlm::TLM_OK_RESPONSE);
}
```

initiator는 자신의 local-time 정책에 따라 annotation을 소비합니다. 간단한 target과 initiator가 모두 annotation을 쓰는지, target이 `wait`하는지 계약을 문서화하고 같은 transaction에서 중복 계상하지 마세요. TLM LRM §8.2.7의 blocking transport 규칙을 기준으로 합니다.

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

- **`b_transport`의 `delay`** — annotation 증가와 kernel `wait`는 서로 다른 시간 모델입니다. 어느 쪽을 소비하는지 initiator/target 계약을 정하고 같은 지연을 중복 적용하지 않습니다.
- **DMI(Direct Memory Interface)** — RAM 모델에서 빠른 접근을 위한 hint. driver가 DMA로 RAM에 접근할 때 *DMI 허용 영역*과 *MMIO 영역*을 구분해야 함.
- **endianness** — TLM의 `data_ptr`은 host endian. 디바이스 endian이 다르면 byte swap 명시.
- **race** — `SC_THREAD` 두 개가 같은 신호에 동시 접근하면 깨짐. `sc_event`로 직렬화.

## 정리

- **SystemC**는 C++ 라이브러리 + simulation kernel. **TLM 2.0**은 그 위의 transaction-level 표준 API.
- LT(loosely-timed)는 *기능*, AT(approximately-timed)는 *latency*. 대부분 cosim은 LT.
- 핵심: `tlm_generic_payload`·`b_transport`·initiator/target socket.
- **Virtual Platform**은 CPU+RAM+디바이스가 모두 SystemC인 환경. *진짜 Linux*가 boot되고 driver가 `.ko`로 로드됨.
- **Mixed-abstraction**으로 모델의 목적에 맞춰 일부 경계는 RTL, 나머지는 TLM으로 둡니다. 두 모델의 가정과 교체 시점을 기록합니다.
- 상용 VP·ISS 제품과 오픈소스 bridge는 제공 범위가 다르므로 실제 지원 문서로 선택합니다.
- pre-RTL driver dev 5-step: spec → TLM skeleton → VP boot → RTL 교체 → end-to-end.

## 다음 장 예고

다음 장은 RTL과 driver 사이의 *세부 protocol*을 캡슐화하는 **BFM**(Bus Functional Model)을 다룹니다. AXI/PCIe/AHB BFM이 어떻게 구성되고, protocol assertion·timing checker가 어떻게 testbench에 녹는지.

## 관련 항목

- [Ch 4: CocoTB](/blog/tools/emulation/driver-cosim/chapter04-cocotb)
- [Ch 6: Bus Functional Model](/blog/tools/emulation/driver-cosim/chapter06-bfm)
- QEMU Internals — TCG Deep — fast functional CPU model
- QEMU Embedded — ARM virt — virtual platform 비교
