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

cycle-accurate cosim은 signal과 cycle 동작을 모두 보여 주지만 그만큼 느립니다. 3장의 32-bit counter 하나가 trace 없이 초당 1,600만~2,000만 cycle이었으니, 실제 SoC 규모 RTL에서 Linux boot 같은 긴 workload를 돌리는 것은 현실적이지 않습니다. 이때 쓰는 선택지가 signal 대신 transaction을 단위로 모델링하는 **SystemC TLM**(Transaction-Level Modeling)입니다.

이 장은 SystemC와 TLM-2.0의 핵심 어휘, virtual platform이라는 개념, 그리고 cosim 환경에서 *RTL 영역과 TLM 영역을 섞는* mixed-abstraction 패턴을 다룹니다. 예제는 Homebrew SystemC 3.0.2(Accellera 구현)와 Verilator 5.054로 macOS 27.2.1(Apple M2 Pro)에서 빌드·실행했습니다.

## 어떤 문제를 푸는가

Driver 개발에서 다음 검증 시나리오는 cycle-accurate cosim으로 풀기 어렵습니다.

- **Boot sequence** — kernel boot + driver probe + module init 시퀀스
- **Multi-user/thread workload** — 여러 task가 동시에 같은 디바이스 사용
- **End-to-end pipeline** — application → user library → ioctl → driver → device
- **Long-running test** — 몇 시간짜리 stability, memory leak 검출

TLM은 signal 전이를 매 cycle 계산하지 않고 read/write 한 건을 함수 호출 한 번으로 처리합니다. 비유하면 cycle-accurate 모델이 택배 트럭의 모든 신호 대기와 차선 변경을 시뮬레이션한다면, TLM은 "물건이 출발해 10분 뒤 도착했다"만 기록합니다. 아래 측정에서 같은 register write가 RTL 경로로는 초당 329만 건, TLM 경로로는 초당 3,611만 건이었습니다. 그 대신 모델이 생략한 cycle-level 동작(handshake, backpressure)은 TLM 결과로 검증되지 않습니다.

## SystemC란 무엇인가

**SystemC**는 *C++ class library + simulation kernel*입니다. 별도 언어가 아니라 C++ 안에서 `#include <systemc.h>`로 쓰는 라이브러리이고, IEEE 1666이 표준입니다. 설치한 3.0.2의 `sysc/kernel/sc_ver.h:65-66`은 "compliancy with IEEE 1666-2023"과 `IEEE_1666_SYSTEMC 202301L`을 적고 있습니다. 핵심 어휘는 다음과 같습니다.

- **`SC_MODULE`** — Verilog의 `module`에 대응하는 C++ 클래스 매크로
- **`SC_THREAD`/`SC_METHOD`** — 모듈 내 process. `SC_THREAD`는 `wait()`로 시간을 진행할 수 있고, `SC_METHOD`는 호출될 때마다 끝까지 실행되고 반환합니다
- **`sc_signal<T>`** — 두 모듈을 잇는 신호. `wire`에 대응
- **`sc_clock`** — 클락 발생기
- **`sc_event`** — 명시적 wait/notify
- **`sc_time`** — 시간 단위(`SC_NS`, `SC_PS` 등)

작은 module 하나를 10 ns clock에 물리고 45 ns 동안 돌렸습니다. `blink`는 rising edge마다 LED를 뒤집고, `probe`는 LED가 바뀔 때마다 시각을 찍습니다.

```cpp
#include <systemc.h>
SC_MODULE(blink) {
  sc_in<bool> clk;
  sc_out<bool> led;
  SC_CTOR(blink) {
    SC_METHOD(toggle);
    sensitive << clk.pos();
    dont_initialize();
  }
  void toggle() { led.write(!led.read()); }
};
```

```text
$ ./blink
0 s led=1
10 ns led=0
20 ns led=1
30 ns led=0
40 ns led=1
stopped at 45 ns
```

`sc_clock`의 첫 rising edge가 0 s에 있어서 첫 토글도 0 s에 찍혔습니다. SystemC로 이렇게 cycle 단위 모델도 쓸 수 있지만, 이 장의 관심은 TLM입니다.

## TLM-2.0 — Transaction-Level Modeling

**TLM-2.0**은 SystemC 위에 *bus transaction*을 추상화한 API입니다. 설치판의 `share/doc/systemc/tlm/tlm_README.md`는 함께 배포된 TLM-2.0 코드를 IEEE 1666-2023 LRM이 정의한 것으로 소개합니다. 핵심은 *signal 한 토글 한 토글이 아니라 read/write 한 건을 단위로* 모델링한다는 점입니다.

### 두 가지 timing 추상

| 추상 | 의미 | 용도 |
|------|------|------|
| **LT** (Loosely-Timed) | `b_transport` 한 번에 transaction 완료, 지연은 `sc_time` annotation으로 표현 | software 검증, boot |
| **AT** (Approximately-Timed) | `nb_transport_fw`/`_bw`로 request·response phase를 나누어 latency·contention 모델링 | performance 평가 |

LT 모델의 실행 시간이 짧아도 그것이 확인해 주는 것은 기능 계약입니다. 실제 cycle timing이나 성능은 annotation에 넣은 숫자만큼만 맞습니다. AT도 선택한 latency·contention 가정을 표현할 뿐, RTL cycle과 일치한다고 보려면 따로 상관 검증이 필요합니다.

### 핵심 어휘

initiator(driver 역할)와 target(device 역할)이 socket으로 연결됩니다. 아래는 이 장의 실행 예제 `lt.cpp`의 뼈대입니다.

```cpp
#include <tlm.h>
#include <tlm_utils/simple_initiator_socket.h>
#include <tlm_utils/simple_target_socket.h>

SC_MODULE(driver_master) {
  tlm_utils::simple_initiator_socket<driver_master> socket;
  SC_CTOR(driver_master) : socket("socket") { SC_THREAD(run); }
  void run();
};

SC_MODULE(device_target) {
  tlm_utils::simple_target_socket<device_target> socket;
  SC_CTOR(device_target) : socket("socket") {
    socket.register_b_transport(this, &device_target::b_transport);
  }
  void b_transport(tlm::tlm_generic_payload& trans, sc_time& delay);
};
```

**`tlm_generic_payload`**가 transaction 본체입니다. initiator는 매 접근마다 다음 필드를 채워 `b_transport`를 부르고, 돌아온 response status를 확인합니다.

```cpp
trans.set_command(cmd);
trans.set_address(addr);
trans.set_data_ptr(reinterpret_cast<unsigned char*>(&value));
trans.set_data_length(4);
trans.set_streaming_width(4);
trans.set_byte_enable_ptr(nullptr);
trans.set_dmi_allowed(false);
trans.set_response_status(tlm::TLM_INCOMPLETE_RESPONSE);
socket->b_transport(trans, delay);
return trans.get_response_status();
```

target은 4-byte 정렬된 0x0~0xC만 받고 나머지는 `TLM_ADDRESS_ERROR_RESPONSE`로 거절합니다. 실행하면 정상 read와 범위 밖 write가 각각 다음 status를 돌려줍니다.

```text
read 0x4 status=1 value=0x11223344
write 0x40 status=-2 (TLM_ADDRESS_ERROR_RESPONSE=-2)
```

`tlm_gp.h:98-100`이 `TLM_INCOMPLETE_RESPONSE = 0`, `TLM_ADDRESS_ERROR_RESPONSE = -2`로 정의하고, `TLM_OK_RESPONSE`는 1입니다.

## blocking vs non-blocking transport

TLM은 두 transport 방식을 제공합니다.

- **`b_transport`** — blocking. 한 호출이 *완료*될 때까지 반환하지 않습니다. LT에 맞습니다.
- **`nb_transport_fw`/`nb_transport_bw`** — non-blocking. request·response를 분리하고 `tlm_phase.h:36-39`의 `BEGIN_REQ`·`END_REQ`·`BEGIN_RESP`·`END_RESP` 네 phase로 진행합니다. AT에 맞습니다.

이 시리즈의 driver 검증 예제는 모두 `b_transport`로 짭니다. register 의미와 driver 흐름을 보는 데는 transaction 완료 여부와 annotation이면 되기 때문입니다. bus contention·QoS나 NoC interconnect를 모델링하려면 AT가 필요하며, AT 예제는 이 장에서 실행하지 않았습니다.

## Virtual Platform — Linux를 boot시키다

**Virtual Platform**(VP)이란 *CPU + 메모리 + 디바이스*를 모두 소프트웨어 모델로 만든 환경입니다. CPU 모델(ISS, Instruction Set Simulator) 위에서 *진짜 Linux kernel*이 boot됩니다.

![SystemC Virtual Platform](/images/blog/driver-cosim/diagrams/ch05-virtual-platform.svg)

CPU 모델을 어디서 가져오는지는 VP마다 다릅니다. 그림의 구성처럼 QEMU를 CPU로 쓰는 예가 AMD(Xilinx)의 libsystemctlm-soc입니다. README는 이 라이브러리를 "SystemC/TLM-2.0 modules that enable co-simulation of Xilinx QEMU"라고 소개하고, QEMU와는 libremote-port의 "socket based transaction protocol"로 연결한다고 적습니다. Arm Fast Models는 QEMU가 아니라 Arm 자체 CPU 모델이고, Fast Models User Guide 11.28의 5장 "SystemC Export with Multiple Instantiation"이 그 모델을 TLM-2.0 port를 가진 SystemC component로 내보내는 방법을 다룹니다.

이런 환경에서는 driver를 진짜 Linux 위에서 `.ko`로 로드하고, `/proc/interrupts`로 IRQ를 확인하고, user-space에서 `ioctl`을 부를 수 있습니다. 이 장에서는 VP 위의 Linux boot를 실행하지 않았습니다.

## `b_transport` 시간 계약

`b_transport`에 전달되는 `delay`는 initiator와 target 사이의 annotated local time입니다. target은 지연을 annotation에 더할 수도 있고, `wait`로 kernel 시간을 실제로 진행할 수도 있습니다. 양쪽 방식을 동시에 쓰면 같은 지연을 두 번 셉니다. 이것을 직접 확인하려고 target에 세 가지 모드를 두었습니다.

```cpp
if (mode == ANNOTATE || mode == BOTH) delay += sc_time(10, SC_NS);
if (mode == WAIT || mode == BOTH) wait(sc_time(10, SC_NS));
```

initiator는 `b_transport`가 돌아온 뒤 `wait(delay)`로 annotation을 소비합니다.

```text
ANNOTATE: kernel time advanced 0 s inside b_transport, annotation=10 ns, total after wait(delay)=10 ns
WAIT: kernel time advanced 10 ns inside b_transport, annotation=0 s, total after wait(delay)=10 ns
BOTH: kernel time advanced 10 ns inside b_transport, annotation=10 ns, total after wait(delay)=20 ns
```

10 ns짜리 register 접근이 BOTH 모드에서 20 ns가 됐습니다. target이 annotation과 `wait` 중 어느 쪽을 쓰는지 initiator와 계약으로 정해 두지 않으면 이런 이중 계상이 조용히 들어갑니다. 이 시리즈의 target은 annotation만 씁니다.

annotation만 쓰면 initiator가 `wait` 횟수를 줄여 빠르게 돌 수 있습니다. 위 target에 write 1,000,000건을 보내면서 1,000건마다 한 번만 `wait`한 결과입니다(`clang++ -O2`).

```text
1000000 LT writes in 0.028 s wall = 36.32 M transactions/s, sim time 10000050 ns
```

## Mixed-abstraction — TLM과 RTL 섞기

핵심 패턴은 *디바이스 일부*는 Verilator로 만든 RTL로, *나머지*는 TLM으로 두는 것입니다. 실행 예제의 RTL `regblk`는 write를 받은 뒤 3 cycle 동안 `busy`를 올렸다가 register에 반영합니다. target은 0x00~0x0C를 RTL로, 0x10~0x1C를 C++ 배열로 처리하고, RTL에서 실제로 돈 cycle 수 × 10 ns를 annotation에 더합니다.

```cpp
void b_transport(tlm::tlm_generic_payload& trans, sc_time& delay) {
  const uint64_t a = trans.get_address();
  uint32_t v; std::memcpy(&v, trans.get_data_ptr(), 4);
  if (is_rtl_register(a)) {                 // 0x00-0x0C: Verilated RTL
    const unsigned start = rtl_cycles;
    if (trans.is_write()) {
      rtl->addr = a; rtl->wdata = v; rtl->write_req = 1; tick(); rtl->write_req = 0;
      while (rtl->busy) tick();
    } else {
      rtl->addr = a; rtl->eval(); v = rtl->rdata; std::memcpy(trans.get_data_ptr(), &v, 4);
    }
    delay += sc_time(10.0 * (rtl_cycles - start), SC_NS);
  } else if (a < 0x20) {                    // 0x10-0x1C: functional model
    uint32_t& r = fast_regs[(a - 0x10) / 4];
    if (trans.is_write()) r = v; else std::memcpy(trans.get_data_ptr(), &r, 4);
    delay += sc_time(10, SC_NS);
  } else { trans.set_response_status(tlm::TLM_ADDRESS_ERROR_RESPONSE); return; }
  trans.set_response_status(tlm::TLM_OK_RESPONSE);
}
```

SystemC 프로그램 전체를 Verilator 빌드에 넣어 한 binary로 만들었습니다.

```text
$ verilator --cc --exe --build -j 0 -O3 -MAKEFLAGS "OPT_FAST=-O2 OPT_SLOW=-O2 OPT_GLOBAL=-O2" regblk.sv mixed.cpp -CFLAGS "-std=c++17 -I$SC/include" -LDFLAGS "-L$SC/lib -lsystemc -Wl,-rpath,$SC/lib"
$ ./obj_dir/Vregblk
RTL write 0x8 annotated 40 ns, readback 0xcafef00d
TLM write 0x18 annotated 10 ns, readback 0x12345678
RTL path (0x00-0x0C): 200000 writes, 0.061 s wall, 3.29 M writes/s, annotated 8 ms
TLM path (0x10-0x1C): 200000 writes, 0.006 s wall, 36.11 M writes/s, annotated 2 ms
```

RTL 경로의 write는 요청 1 cycle + busy 3 cycle로 40 ns가 annotation됐고, 같은 driver 코드가 TLM 경로보다 약 11배 느렸습니다. 이로써 *검증하고 싶은 블록*만 RTL로 두고 *나머지*는 TLM으로 두는 절충의 비용이 숫자로 보입니다.

## 산업 표준 도구

상용·오픈소스 VP 도구 중 이 장에서 1차 자료를 확인한 것들입니다. 이 장에서 실행한 것은 Accellera 구현뿐입니다.

| 도구 | 제공사 | 1차 자료에서 확인한 내용 |
|------|--------|------|
| **Fast Models** | Arm | User Guide 11.28 5장: SystemC Export, TLM 2.0 bus protocol port |
| **libsystemctlm-soc** | AMD(Xilinx) | README: Xilinx QEMU와 SystemC/TLM-2.0 co-simulation, RTL은 Verilator 같은 도구로 변환 |
| **SystemC reference implementation** | Accellera | GitHub `accellera-official/systemc`, 이 장의 3.0.2 |

Imperas의 RISC-V ISS·virtual prototype은 2023년 12월 Synopsys가 인수했다고 보도됐습니다(Design & Reuse). 각 제품의 TLM 지원 범위는 이 장에서 확인하지 않았습니다.

## NPU pre-RTL driver development

TLM으로 RTL보다 먼저 driver를 시작하는 흐름은 다음과 같습니다.

1. **연산 spec 확정** → C reference model 작성.
2. **TLM device skeleton** → register map 정의, `b_transport`에 reference model wiring.
3. **VP에 Linux boot** → driver를 *진짜 Linux kernel module*로 빌드, insmod, ioctl 시험.
4. **RTL 도착** → 검증할 register/datapath만 RTL로 교체(위 mixed 예제), 나머지는 TLM 유지.
5. **End-to-end run** → user-space app까지.

이 흐름으로 RTL 도착 전에 driver의 상위 stack을 먼저 돌려 볼 수 있습니다. 다만 TLM 모델이 RTL과 다르게 동작하는 부분은 그대로 남으므로, RTL이 도착한 뒤 register encoding·IRQ timing 같은 *RTL boundary*를 cosim으로 다시 확인합니다. 이 장에서 실행한 것은 2·4단계의 축소판입니다.

## 흔한 함정

- **`b_transport`의 `delay`** — annotation 증가와 kernel `wait`는 다른 시간 모델입니다. 위 BOTH 모드처럼 둘 다 쓰면 10 ns가 20 ns가 됩니다.
- **DMI(Direct Memory Interface)** — RAM 모델이 initiator에게 포인터를 직접 내주는 빠른 경로입니다. MMIO register처럼 접근 자체에 side effect가 있는 영역은 DMI를 허용하면 안 됩니다. 예제는 `set_dmi_allowed(false)`로 둡니다.
- **endianness** — 예제의 initiator는 `uint32_t` 0x11223344의 주소를 `data_ptr`로 넘겼고, target은 byte 순서 `44 33 22 11`을 받았습니다(arm64 little-endian host). 디바이스의 byte 순서가 다르면 변환을 명시해야 하며, SystemC는 `tlm_helpers.h:40`의 `get_host_endianness()` 같은 helper를 제공합니다.

## 정리

- **SystemC**는 C++ 라이브러리 + simulation kernel(IEEE 1666)이고, **TLM-2.0**은 그 위의 transaction-level API입니다.
- LT는 `b_transport`와 annotation, AT는 `nb_transport`와 4 phase입니다. 이 시리즈는 LT를 씁니다.
- `delay` annotation과 `wait` 중 하나만 써야 합니다. 둘 다 쓰면 실행에서 10 ns가 20 ns가 됐습니다.
- 측정에서 TLM 경로는 초당 약 3,600만 transaction, Verilated RTL을 거치는 경로는 약 330만 transaction이었습니다.
- **Virtual Platform**의 CPU 모델은 QEMU(libsystemctlm-soc)일 수도, 벤더 자체 모델(Arm Fast Models)일 수도 있습니다.
- pre-RTL driver dev 5-step: spec → TLM skeleton → VP boot → RTL 교체 → end-to-end.

## 다음 장 예고

다음 장은 RTL과 driver 사이의 *세부 protocol*을 캡슐화하는 **BFM**(Bus Functional Model)을 다룹니다. AXI BFM이 어떻게 구성되고, protocol assertion·timing checker가 어떻게 testbench에 녹는지.

## 1차 자료와 실행 환경

- Accellera SystemC 3.0.2 설치판 헤더 — `sysc/kernel/sc_ver.h:65-66`, `tlm_core/tlm_2/tlm_generic_payload/tlm_gp.h:98-100`, `tlm_phase.h:36-39`, `tlm_helpers.h:40`
- 설치판 `share/doc/systemc/tlm/tlm_README.md:4`
- [Xilinx/libsystemctlm-soc README](https://github.com/Xilinx/libsystemctlm-soc)
- [Arm Fast Models User Guide 11.28 (100965_1128_00_en)](https://documentation-service.arm.com/static/67b60876ce2747241fce8b48) 5장
- [Design & Reuse: Synopsys Acquires RISC-V Processor Simulation Tools Firm](https://design-reuse.com/news/55442/synopsys-imperas-acquisition.html)

실행 환경은 macOS 27.2.1, Apple M2 Pro, Homebrew SystemC 3.0.2, Verilator 5.054, Apple clang 21.0.0입니다(2026-11-16). IEEE 1666 본문, AT 모델, VP 위의 Linux boot, 상용 VP 도구는 실행·대조하지 않았습니다.

## 관련 항목

- [Ch 4: CocoTB](/blog/tools/emulation/driver-cosim/chapter04-cocotb)
- [Ch 6: Bus Functional Model](/blog/tools/emulation/driver-cosim/chapter06-bfm)
- QEMU Internals — TCG Deep — fast functional CPU model
- QEMU Embedded — ARM virt — virtual platform 비교
