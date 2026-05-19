---
title: "Modern Embedded Recipes: 서문"
date: 2026-05-12T01:00:00
description: "Bare-metal부터 Linux 커널, FPGA, Edge AI까지 임베디드 실전에서 자주 부딪히는 39개 advanced 레시피."
series: "Modern Embedded Recipes"
seriesOrder: 0
tags: [embedded, recipes, troubleshooting, fpga, edge-ai, linux-kernel, concurrency]
type: tech
featured: true
---

## 이 시리즈를 쓰는 이유

임베디드 *기초 튜토리얼*은 많습니다. GPIO 깜빡이기, UART 출력, FreeRTOS task 만들기. 그런데 실제 현장에서 부딪히는 문제는 그보다 한 단계 위에 있습니다.

- "UART가 안 찍히는데 무엇부터 봐야 하지?"
- "Lock-free ring buffer를 정확하게 구현하려면?"
- "PCIe BAR를 user space에서 mmap하려면?"
- "Cortex-A + Cortex-M 이기종 코어를 어떻게 통신시키지?"
- "Jetson Orin에서 카메라부터 NPU까지 zero-copy로 묶으려면?"

이 시리즈는 *그 단계*를 다룹니다. **이미 임베디드 기초는 알고 있는 엔지니어**가 advanced 영역에서 자주 만나는 문제를 각 chapter 한 편씩 *recipe* 형태로 정리합니다.

## 대상 독자

1. **임베디드 중급 이상**
   - Bare-metal과 Linux 양쪽 다 작업한 적 있음
   - 단순 GPIO/UART는 막힘 없이 짤 수 있음
2. **HW/SW 경계에서 일하는 분**
   - FPGA·accelerator와 통신하는 driver 작성
   - PCIe·AXI·DMA 같은 buslevel 디버깅
3. **Edge AI 도입자**
   - Jetson, Coral, Hailo 같은 edge inference 플랫폼
   - On-device LLM, quantization, thermal 제약 다루는 분

기초 입문(전자회로·CPU 아키텍처·기초 RTOS)은 *Practical RTOS Internals*나 *Embedded C++ for Real Systems* 시리즈가 더 적합합니다. 이 시리즈는 그 위에서 *실전 응용*을 다룹니다.

## 시리즈 구성

**총 6개 Part, 39개 레시피**로 구성됩니다.

각 Part는 임베디드 실전에서 *cross-cutting*하게 자주 등장하는 영역 하나씩 다룹니다. 순서 의존성이 약해서 관심 있는 Part부터 골라 읽어도 됩니다.

---

### Part 1: Hardware Debugging Recipes (6편)

부팅이 안 되거나 통신이 안 될 때 *어디부터* 봐야 하는지의 체크리스트입니다.

| # | 레시피 | 핵심 |
|---|--------|------|
| 1-01 | UART 안 찍힐 때 | bare-metal 체크리스트, 전기·핀·클럭·baud 순 |
| 1-02 | DDR 초기화 실패 | timing, calibration, walking bit test |
| 1-03 | PCIe BAR 매핑 | config space, enumeration, MMIO 접근 |
| 1-04 | Device Tree 실전 | DTS·DTB·overlay·phandle |
| 1-05 | Bootloader 체인 | BootROM·SPL·U-Boot·Kernel·Secure Boot |
| 1-06 | JTAG·SWD 안 붙을 때 | 핀·전압·속도·session |

---

### Part 2: Concurrency Recipes (6편)

ISR과 task 사이, multi-core 간 *공유 자원*을 정확하게 다루는 패턴.

| # | 레시피 | 핵심 |
|---|--------|------|
| 2-01 | ISR-Safe API 설계 | reentrant, atomic, defer |
| 2-02 | Lock-Free Ring Buffer | SPSC, power-of-2, memory order |
| 2-03 | Priority Inversion 진단 | Mars Pathfinder 사례, inheritance |
| 2-04 | Memory Barrier 실전 | DMB·DSB·ISB, DMA·MMIO 순서 |
| 2-05 | Wait-Free Signaling | atomic flag, sequence, latest-value |
| 2-06 | Timer Wheel | hashed, hierarchical, O(1) tick |

---

### Part 3: Memory & Performance Recipes (6편)

캐시·DMA·SIMD를 활용해 *데이터 이동과 연산 효율*을 끌어올리는 방법.

| # | 레시피 | 핵심 |
|---|--------|------|
| 3-01 | Cache Line Alignment | alignas, padding, SoA |
| 3-02 | DMA-Friendly Allocator | coherent vs streaming, IOMMU, pool |
| 3-03 | Zero-Copy Pipeline | DMA-BUF, sendfile, io_uring, splice |
| 3-04 | NUMA Memory Topology | numactl, libnuma, HBM·CXL |
| 3-05 | SIMD 활용 | intrinsics, auto-vectorization, OpenMP SIMD |
| 3-06 | ARM NEON 심화 | matmul, FFT, image filter, MVE |

---

### Part 4: Linux Kernel Side (6편)

커널 모듈을 작성하거나 user space에서 hardware에 직접 접근할 때 필요한 기법.

| # | 레시피 | 핵심 |
|---|--------|------|
| 4-01 | Kernel Module 기초 | init/exit, parameter, KBuild, DKMS |
| 4-02 | mmap 네 가지 모드 | anonymous, file-backed, shared, huge page |
| 4-03 | epoll 실전 | LT vs ET, ONESHOT, EXCLUSIVE |
| 4-04 | UIO·VFIO | user-space driver, IOMMU 격리 |
| 4-05 | sysfs·configfs | kobject 기반 user 인터페이스 |
| 4-06 | IRQ Affinity | smp_affinity, isolcpus, irqbalance |

---

### Part 5: FPGA & Accelerator (6편)

PCIe로 붙은 FPGA·NPU·NVMe와 host CPU 간 통신을 *프로토콜 레벨*에서 다룹니다.

| # | 레시피 | 핵심 |
|---|--------|------|
| 5-01 | Mailbox Protocol | host·accelerator doorbell 채널 |
| 5-02 | Command Queue·SQ | NVMe·XDMA 공통 패턴, multi-queue |
| 5-03 | DMA Completion | interrupt·polling·completion ring |
| 5-04 | PCIe Streaming | BAR type, MSI-X, kernel bypass |
| 5-05 | Vitis HLS | pragma, pipeline II, dataflow |
| 5-06 | AXI 인터페이스 | AXI4·AXI4-Lite·AXI-Stream |

---

### Part 6: Edge AI & Security (9편)

Edge에서 inference를 돌리고 IoT 표준 + 보안을 만족시키는 modern 영역.

| # | 레시피 | 핵심 |
|---|--------|------|
| 6-01 | Edge Inference 개요 | cloud vs edge, latency·privacy·HW spectrum |
| 6-02 | TensorRT | ONNX→engine, FP16·INT8, DLA, multi-stream |
| 6-03 | Quantization | PTQ·QAT, INT8·INT4, calibration |
| 6-04 | Thermal Management | throttling, DVFS, fan curve, sustained 성능 |
| 6-05 | Jetson | Nano·Xavier·Orin·Thor, JetPack, DLA·VPI |
| 6-06 | Zero-Copy Camera | V4L2·DMA-BUF·GPU import·NPU 직결 |
| 6-07 | 온디바이스 LLM | llama.cpp·GGUF·MLX·KV cache·NPU backend |
| 6-08 | TF-M·TrustZone | Cortex-M33 secure firmware, PSA, MCUboot |
| 6-09 | Matter·Thread | IoT 통합 표준, commissioning, multi-fabric |

---

## 학습 로드맵

순서 의존성이 약해서 *관심 있는 Part부터* 보면 됩니다. 다음 조합을 참고하세요.

- **HW/SW 경계 디버깅** — Part 1 (HW debug) → Part 4 (kernel side) → Part 5 (FPGA)
- **고성능 동시성** — Part 2 (concurrency) → Part 3 (memory) → Part 4-06 (IRQ affinity)
- **Edge AI 도입** — Part 6 (edge AI) → Part 3-03 (zero-copy) → Part 5-04 (PCIe streaming)
- **IoT 보안** — Part 6-08 (TF-M) → Part 6-09 (Matter) → Part 1-05 (Secure Boot)

## 다른 시리즈와의 관계

이 시리즈는 *cross-cutting recipe*에 집중합니다. *깊이 있는 internals*는 자매 시리즈에서 다룹니다.

| 주제 | 이 시리즈 | 깊이 있는 시리즈 |
|------|----------|----------------|
| RTOS scheduler 내부 | — | [Practical RTOS Internals](/blog/embedded/rtos/practical-internals) |
| 성능 분석 방법론·도구 | — | [Embedded Performance Engineering](/blog/embedded/performance-engineering) |
| C++ on MCU | — | [Embedded C++ for Real Systems](/blog/embedded/embedded-cpp) |
| 보안 인증·표준 | 6-08 TF-M 한 편 | (별도 시리즈 없음 — 6-08 + Practical RTOS 4-11) |

## 사전 지식

- C/C++ 중급
- Linux user space 사용 경험
- 기초 RTOS (task·semaphore·mutex 개념)
- ARM 또는 RISC-V 어셈블리 기초 (선택)

기초가 부족하면 *Practical RTOS Internals*의 Part 1부터 보는 편이 좋습니다.

## 집필 원칙

1. **현장 문제부터** — 추상적 개념이 아니라 실제 부딪히는 시나리오로 시작합니다.
2. **측정 수치 포함** — "빠르다"가 아니라 "Cortex-A72에서 1.4 초 → 0.14 초".
3. **trade-off 명시** — 어떤 상황에서 안 좋은지도 같이.
4. **다른 series cross-link** — 깊이 들어가야 하면 RTOS Internals·Perf Engineering·Embedded C++로.

## 예제 환경

| 플랫폼 | 용도 |
|--------|------|
| STM32U5·STM32H7 | Cortex-M33 + TrustZone, M7 고성능 |
| NXP i.MX 8M | Cortex-A53 + M4 heterogeneous |
| RP2040 / RP2350 | dual-core, hardware spinlock |
| Raspberry Pi 4·5 | Cortex-A 가벼운 server |
| NVIDIA Jetson Orin | edge AI |
| Xilinx Zynq UltraScale+ | PS+PL, AXI |

특정 보드에 종속되지 않도록 *원리 + 한 가지 구체 예*를 함께 보입니다.

## 레퍼런스

**서적**
- *Linux Device Drivers* (3rd ed) — Corbet, Rubini, Kroah-Hartman
- *Understanding the Linux Kernel* — Bovet, Cesati
- *FPGA Prototyping by SystemVerilog Examples* — Pong P. Chu
- *The Art of Multiprocessor Programming* — Herlihy, Shavit
- *Programming with POSIX Threads* — Butenhof

**공식 문서**
- Linux Kernel Documentation
- ARM AMBA AXI Specification
- PCIe Base Specification 6.0
- NVIDIA Jetson Documentation
- Vitis HLS User Guide
- Matter Specification 1.4

**커뮤니티**
- [LWN.net](https://lwn.net) — Linux 커널 변경 추적
- [Interrupt Blog (Memfault)](https://interrupt.memfault.com) — embedded debugging
- [Embedded Artistry](https://embeddedartistry.com)

## 이 시리즈의 목표

완주하면 다음을 할 수 있습니다.

- HW debugging 시 *체계적인 hypothesis-driven 진단*이 가능합니다.
- Multi-core concurrency 코드를 *정확하게* 작성하고 검증할 수 있습니다.
- Linux kernel과 user space의 *경계를 의도적으로* 설계할 수 있습니다.
- FPGA·NPU·NVMe 같은 가속기를 *PCIe와 AXI 레벨*에서 다룰 수 있습니다.
- Edge AI inference를 *zero-copy + INT8 quantization*까지 최적화할 수 있습니다.
- TrustZone·Matter 같은 *modern 보안·IoT 표준*을 도입할 수 있습니다.

---

다음 글: [Part 1-01: UART 안 찍힐 때](/blog/embedded/modern-recipes/part1-01-uart-debugging)
