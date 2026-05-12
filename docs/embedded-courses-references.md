# Embedded Engineering Courses - 레퍼런스 전수조사

> 작성일: 2026-05-12
> 목적: 4개 시리즈 집필을 위한 참고 자료 목록

---

## 시리즈 개요

| # | 시리즈명 | 난이도 | 시장 경쟁 |
|---|---------|--------|----------|
| 1 | Modern Embedded Recipes | Advanced | 중간 (차별화 가능) |
| 2 | Practical RTOS Internals | Advanced | 높음 |
| 3 | Embedded Performance Engineering | Expert | **없음 (블루오션!)** |
| 4 | Embedded C++ for Real Systems | Advanced | 높음 (2025년 신간 다수) |

---

## 1. Modern Embedded Recipes

> 실무에서 바로 쓰는 패턴/트러블슈팅

### Part 1: Hardware Bring-up

#### UART / 시리얼 통신
- **Linux Serial HOWTO**: https://tldp.org/HOWTO/Serial-HOWTO.html
- Linux Device Drivers (3rd ed), Chapter 18: TTY Drivers

#### DDR / 메모리 초기화
- **JEDEC DDR4 SDRAM Specification**: https://www.jedec.org/standards-documents
- U-Boot Memory Test Documentation

#### PCIe
- **PCI Express Base Specification**: https://pcisig.com/specifications
- **Haifux PCIe Tutorial**: https://www.haifux.org/
- **OSDev Wiki - PCI**: https://wiki.osdev.org/PCI
- Linux PCIe Driver Developer's Guide (kernel docs)

#### Device Tree
- **Official Device Tree Specification**: https://www.devicetree.org/specifications/
- **Linux Kernel Device Tree Documentation**: https://docs.kernel.org/devicetree/usage-model.html
- **"Device Tree for Dummies"** (Free Electrons PDF): https://events.static.linuxfound.org/sites/events/files/slides/petazzoni-device-tree-dummies.pdf
- **Toradex Device Tree Guide**: https://developer.toradex.com/software/linux-resources/device-tree/
- **NXP Application Note AN5125**: Device Tree introduction

#### Bootloader (U-Boot)
- **Official U-Boot Documentation**: https://docs.u-boot.org/
- **U-Boot GitHub Repository**: https://github.com/u-boot/u-boot
- **DENX Software Engineering**: https://www.denx.de/project/u-boot/
- **Gentoo Wiki U-Boot Guide**: https://wiki.gentoo.org/wiki/Embedded_Handbook/Bootloaders/Das_U-Boot

#### JTAG / 디버깅
- ARM Debug Interface v5 Architecture Specification (ARM IHI 0031)
- OpenOCD User's Guide: https://openocd.org/doc/html/index.html

### Part 2: RTOS & Concurrency

#### Lock-free / Wait-free Programming
- **"The Art of Multiprocessor Programming"** (2nd ed, 2012) - Herlihy & Shavit
  - Chapter 14: Skip Lists
  - Lock-free, wait-free, obstruction-free 정의
- **"C++ Concurrency in Action"** (2nd ed, 2019) - Anthony Williams
- **Herb Sutter Talks**: "atomic<> weapons" (2012)
- **awesome-lockfree GitHub**: https://github.com/rigtorp/awesome-lockfree
- **1024cores** (Dmitry Vyukov): http://www.1024cores.net/
- **xenium C++ library**: Lock-free data structures

#### Memory Barrier / Memory Model
- **cppreference - std::memory_order**: https://en.cppreference.com/w/cpp/atomic/memory_order.html
- **cppreference - std::atomic_thread_fence**: https://en.cppreference.com/w/cpp/atomic/atomic_thread_fence.html
- **C/C++11 mappings to processors** (Cambridge): https://www.cl.cam.ac.uk/~pes20/cpp/cpp0xmappings.html
- **ModernesCpp - Fences are Memory Barriers**: https://www.modernescpp.com/index.php/fences-as-memory-barriers/
- **Wikipedia - Memory barrier**: https://en.wikipedia.org/wiki/Memory_barrier

#### Hazard Pointers / Memory Reclamation
- **Maged M. Michael**: "Hazard pointers: Safe memory reclamation for lock-free objects" (2004)
- **"Every Data Structure Deserves Lock-Free Memory Reclamation"** (arXiv, 2018)

### Part 3: Performance

#### Cache Optimization
- **"Memory Systems: Cache, DRAM, Disk"** (ACM Digital Library)
- **"Cache Optimization for Real-Time Embedded Systems"** - Abu Asaduzzaman (PhD Dissertation, 2009)
- **MIT - Memory Hierarchy Hardware-Software Co-design**: http://dspace.mit.edu/bitstream/handle/1721.1/7427/CS017.pdf
- **"Cache optimization for embedded processor cores"** (ACM TODAES)

#### DMA / Zero-Copy
- **Linux Kernel DMA Engine API Guide**: https://www.kernel.org/doc/html/latest/driver-api/dmaengine/client.html
- **DMA-API-HOWTO**: https://www.kernel.org/doc/Documentation/DMA-API-HOWTO.txt
- **Linux Journal - Using DMA**: https://www.linuxjournal.com/article/7104
- **LWN.net - Scatterlist chaining**: https://lwn.net/Articles/234617/
- **Xilinx/AMD Wiki - Linux DMA From User Space**: https://xilinx-wiki.atlassian.net/wiki/spaces/A/pages/18842418/Linux+DMA+From+User+Space

#### Profiling Tools
- **Brendan Gregg's Linux Performance**: https://www.brendangregg.com/linuxperf.html
- **perf Examples**: https://www.brendangregg.com/perf.html
- **eBPF Tools**: https://www.brendangregg.com/ebpf.html
- **perf-tools GitHub**: https://github.com/brendangregg/perf-tools
- **Official perf Wiki**: https://perfwiki.github.io/main/tutorial/
- **Red Hat eBPF Documentation**: https://docs.redhat.com/
- **"Systems Performance: Enterprise and the Cloud"** (2nd ed, 2020) - Brendan Gregg

### Part 4: Linux Embedded

#### Kernel Module Development
- **"Linux Device Drivers"** (3rd ed, 2005) - Corbet, Rubini, Kroah-Hartman
  - https://lwn.net/Kernel/LDD3/
- **"Linux Kernel Development"** (3rd ed, 2010) - Robert Love
- **"Understanding the Linux Kernel"** (3rd ed, 2005) - Bovet, Cesati
- **Linux Kernel Documentation**: https://docs.kernel.org/

#### mmap / UIO / VFIO
- Linux Device Drivers, Chapter 15: Memory Mapping and DMA
- **UIO Documentation**: https://www.kernel.org/doc/html/latest/driver-api/uio-howto.html
- **VFIO Documentation**: https://www.kernel.org/doc/html/latest/driver-api/vfio.html

#### Real-Time Linux (PREEMPT_RT)
- **Realtime Linux Organization**: https://realtime-linux.org/getting-started-with-preempt_rt-guide/
- **"The Real-Time Linux Kernel: A Survey on PREEMPT_RT"** (Polimi Paper)
- **ArchWiki - Realtime kernel**: https://wiki.archlinux.org/title/Realtime_kernel
- **Toradex Real-Time Linux Guide**: https://developer.toradex.com/software/real-time/real-time-linux/
- cyclictest, rtla (timerlat tracer)

### Part 5: FPGA / Accelerator

#### HLS (High Level Synthesis)
- **Vitis HLS User Guide (UG1399)**: https://www.xilinx.com/support/documents/sw_manuals/xilinx2022_2/ug1399-vitis-hls.pdf
- **Xilinx/AMD Vitis HLS Examples GitHub**: https://github.com/Xilinx/Vitis-HLS-Introductory-Examples
- **XUP HLS Design Flow Labs**: https://xilinx.github.io/xup_high_level_synthesis_design_flow/
- Udemy: FPGA Design with VIVADO HLS

#### AXI / PCIe Streaming
- **Green-Electrons AXI DMA Tutorial**: https://green-electrons.com/AXI_DMA/index.html
- Xilinx AXI DMA IP Product Guide (PG021)
- Xilinx XDMA Driver Documentation

### Part 6: Embedded AI

#### TensorRT / Edge Inference
- **NVIDIA TensorRT SDK**: https://developer.nvidia.com/tensorrt
- **TensorRT Documentation**: https://docs.nvidia.com/deeplearning/tensorrt/
- **Jetson Inference GitHub**: https://github.com/dusty-nv/jetson-inference
- **TensorRT Edge-LLM on Jetson**: https://www.jetson-ai-lab.com/tutorials/tensorrt-edge-llm/
- **JetPack Documentation**: https://developer.nvidia.com/embedded/jetpack

#### Quantization
- **TensorRT Quantization Guide**
- **"TensorRT Implementations of Model Quantization on Edge SoC"** (Texas State Paper)
- NVIDIA Quantization Toolkit (QAT/PTQ)

---

## 2. Practical RTOS Internals

> RTOS를 구현/분석하는 법

### Core References

#### 교과서 / 기본서
- **"Operating System Concepts"** (10th ed) - Silberschatz, Galvin, Gagne
- **"Real-Time Systems"** - Jane W. S. Liu
- **"Hard Real-Time Computing Systems"** - Buttazzo

#### FreeRTOS
- **FreeRTOS Kernel Book** (Official): https://www.freertos.org/Documentation/
- **FreeRTOS GitHub**: https://github.com/FreeRTOS/FreeRTOS-Kernel
- **AOSA Book - FreeRTOS Chapter**: https://aosabook.org/en/v1/freertos.html
- **Memfault FreeRTOS Blogs**: Context switch, stack analysis

#### Zephyr RTOS
- **Official Zephyr Documentation**: https://docs.zephyrproject.org/
- **Zephyr GitHub**: https://github.com/zephyrproject-rtos/zephyr
- Kernel Services: Threads, Scheduling, Interrupts, Timing

#### VxWorks (참고용)
- Wind River VxWorks Programmer's Guide
- VxWorks Kernel Programmer's Guide

### Scheduler / Context Switch
- **FreeRTOS xTaskCreate 분석**
- **Zephyr K_THREAD_DEFINE 분석**
- ARM Cortex-M PendSV Handler 구현
- Context switch assembly (ARM, RISC-V)

### Interrupt Handling
- ARM Cortex-M NVIC (Nested Vectored Interrupt Controller)
- **ARM Technical Reference Manuals**: https://documentation-service.arm.com/
- ISR latency measurement

### Real-Time Memory Allocator
- TLSF (Two-Level Segregated Fit)
- FreeRTOS heap implementations (heap_1 ~ heap_5)
- Zephyr memory allocation

---

## 3. Embedded Performance Engineering

> "왜 느린가?" - **블루오션 시리즈**

### Core References

#### 성능 분석 바이블
- **"Systems Performance"** (2nd ed, 2020) - Brendan Gregg
  - Chapter 6: CPU
  - Chapter 7: Memory
  - Chapter 8: File Systems
  - Chapter 9: Disks
- **Brendan Gregg's Website**: https://www.brendangregg.com/

#### CPU / Pipeline
- **"Computer Architecture: A Quantitative Approach"** (6th ed) - Hennessy & Patterson
- ARM Cortex-A Series Programmer's Guide
- Intel Optimization Reference Manual

#### Cache Analysis
- **"What Every Programmer Should Know About Memory"** - Ulrich Drepper (2007)
  - https://people.freebsd.org/~lstewart/articles/cpumemory.pdf
- **"Memory Systems: Cache, DRAM, Disk"**
- Valgrind Cachegrind
- perf stat (cache-misses, cache-references)

#### Profiling Tools Deep Dive
- **perf**: https://www.brendangregg.com/perf.html
- **ftrace**: Function tracer, kernel tracing
- **eBPF/bpftrace**: https://www.brendangregg.com/ebpf.html
- **Flamegraphs**: https://www.brendangregg.com/flamegraphs.html
- **NVIDIA Nsight Systems**: GPU profiling

#### Bus / Memory Contention
- PCIe bandwidth analysis
- DDR bandwidth utilization
- False sharing detection (perf c2c)

#### ARM-Specific
- ARM PMU (Performance Monitoring Unit)
- ARM DS-5 Streamline
- ARM Neon Intrinsics Guide

---

## 4. Embedded C++ for Real Systems

> 어디까지 C++ 써도 되는가

### Core References

#### 기본서
- **"The C++ Programming Language"** (4th ed, 2013) - Bjarne Stroustrup
- **"Effective Modern C++"** (2014) - Scott Meyers
- **"C++ Core Guidelines"**: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines

#### Embedded C++ 전문서
- **"Embedded C++ for Real-Time Operating Systems (RTOS)"** - Richard M. Ponds (2024)
  - Zero-cost abstractions, no-exception, no-heap
  - RAII for resource management
- **"C++ in Embedded Systems: A practical transition from C to modern C++"** - Amar Mahmutbegović (2025)
  - Templates, strong typing, ETL
- **"Real-Time C++: Efficient Object-Oriented and Template Microcontroller Programming"** - Christopher Kormanyos

#### RAII
- **C++ Core Guidelines - RAII**: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rr-raii
- **ModernesCpp - When RAII breaks**: https://www.modernescpp.com/index.php/c-core-guidelines-when-raii-breaks/

#### constexpr / Compile-time Computation
- **Andreas Fertig's Blog**: https://andreasfertig.com/blog/2025/02/cpp-for-embedded-systems-constexpr-and-consteval/
- **cppreference - constexpr**: https://en.cppreference.com/w/cpp/language/constexpr
- C++20 consteval, C++23 improvements

#### No Exception / No RTTI
- `-fno-exceptions`, `-fno-rtti` compiler flags
- Error handling alternatives: `std::expected`, `std::optional`
- MISRA C++ Guidelines

#### Memory Management
- Static allocation patterns
- Custom allocators (`std::pmr`)
- **Embedded Template Library (ETL)**: https://www.etlcpp.com/

#### Lock-free Smart Pointers
- `std::atomic<std::shared_ptr>` (C++20)
- Hazard pointer integration
- Reference counting in embedded

### Blogs & Online Resources
- **Embedded Artistry**: https://embeddedartistry.com/
- **Interrupt Blog (Memfault)**: https://interrupt.memfault.com/
- **Barr Group**: https://barrgroup.com/embedded-systems/how-to

---

## 공통 참고 자료

### ARM Architecture
- **ARM Cortex-M Technical Reference Manuals**: https://documentation-service.arm.com/
- **ARMv7-M Architecture Reference Manual** (ARM DDI 0403)
- **Introduction to Armv8-M Architecture**: https://documentation-service.arm.com/static/64b7f5c638511951cb79fc45
- **Cortex-M Resources Hub**: https://developer.arm.com/

### RISC-V
- **RISC-V Specifications**: https://riscv.org/technical/specifications/
- **RISC-V Privileged Specification**

### Linux Kernel
- **Linux Kernel Documentation**: https://docs.kernel.org/
- **LWN.net**: https://lwn.net/ (kernel news & articles)
- **Bootlin Training Materials**: https://bootlin.com/docs/

### 온라인 강의 플랫폼
- **Udemy**: Embedded Linux, FPGA, RTOS courses
- **Coursera**: Computer Architecture, Real-Time Systems
- **edX**: Embedded Systems courses

### 커뮤니티 / 포럼
- **Stack Overflow** (embedded, arm, linux-kernel tags)
- **Reddit** (r/embedded, r/FPGA)
- **Electronics Stack Exchange**
- **ARM Community Forums**

---

## 경쟁 도서 분석

### 국내 시장 (한국어)

| 분야 | 도서명 | 출판년도 | 비고 |
|-----|-------|---------|------|
| 임베디드 리눅스 | 임베디드 리눅스 프로그래밍 완전정복 | 2023 | Yocto 중심 |
| RTOS | FreeRTOS 완벽 가이드 | 2022 | API 중심 |
| 성능 | **없음** | - | **기회!** |
| Embedded C++ | **없음** | - | **기회!** |

### 해외 시장 (영문)

| 분야 | 도서명 | 출판년도 | 비고 |
|-----|-------|---------|------|
| Embedded Linux | Mastering Embedded Linux Programming (3rd ed) | 2024 | Yocto, Buildroot |
| Bare-Metal | Bare-Metal STM32 Programming | 2024 | STM32 특화 |
| RTOS | Embedded Systems with RTOS | 2023 | FreeRTOS/Zephyr |
| Performance | Systems Performance (2nd ed) | 2020 | **일반 Linux** |
| Embedded C++ | Embedded C++ for RTOS | 2024 | 신간 |
| Embedded C++ | C++ in Embedded Systems | 2025 | 신간 |

### 결론
- **Embedded Performance Engineering**: 국내/해외 모두 경쟁 없음 (가장 큰 기회)
- **Modern Embedded Recipes**: 실전 트러블슈팅 중심으로 차별화 가능
- **RTOS Internals**: 구현/분석 관점으로 차별화 가능
- **Embedded C++**: 경쟁 심함, 한국어 시장은 비어있음

---

## 작성 우선순위 제안

1. **Embedded Performance Engineering** (블루오션, 시장 독점 가능)
2. **Modern Embedded Recipes** (실전 중심 차별화)
3. **Embedded C++ for Real Systems** (한국어 시장 비어있음)
4. **Practical RTOS Internals** (경쟁 있지만 수요 높음)

---

---

## 2025-2026 최신 트렌드

### Edge AI / TinyML (기본 기능화)

> "By 2026, IoT semiconductors will hit a clear turning point as edge AI shifts from a niche feature to the default."

- **TensorRT-LLM Edge**: Jetson에서 LLM 실행 (JetPack 7.1)
- **NVIDIA Jetson T4000**: 차세대 Edge AI 플랫폼
- **STM32 Edge AI**: STM32Cube.AI 통합

### NPU (Neural Processing Unit)

**ARM Ethos 시리즈**:

| NPU | 성능 | 특징 |
|-----|-----|-----|
| Ethos-U55 | - | Cortex-M55와 480x ML 성능 향상 |
| Ethos-U65 | 2x U55 | Cortex-A/R/Neoverse 지원 |
| Ethos-U85 | 4 TOPs | Transformer 지원, 20% 효율 향상 |

**파트너 구현**:
- **Renesas RA8P1**: Cortex-M85 + Ethos-U55, 256 GOPS
- **Alif Ensemble/Balletto**: Cortex-M55 + Ethos, 2자릿수 성능 향상
- **NXP Ara240**: 16GB M.2 모듈, 2026년 6월 출시 예정

**레퍼런스**:
- [ARM Ethos-U85](https://www.arm.com/products/silicon-ip-cpu/ethos/ethos-u85)
- [Embedded AI Hardware 2026](https://promwad.com/news/embedded-ai-hardware-platforms-2026)

### DPU (Data Processing Unit)

**NVIDIA BlueField 시리즈**:

| 세대 | 대역폭 | CPU | 출시 |
|-----|-------|-----|-----|
| BlueField-2 | 200 Gbps | 8x A72 | 2021 |
| BlueField-3 | 400 Gbps | 16x A78 | 2023 |
| BlueField-4 | 800 Gbps | 64x Neoverse V2 | 2026 |

**핵심 기능**:
- Software-defined networking 오프로드
- Storage acceleration
- Security/encryption 오프로드
- DOCA SDK (CUDA와 유사한 프레임워크)

**레퍼런스**:
- [NVIDIA BlueField](https://www.nvidia.com/en-us/networking/products/data-processing-unit/)
- [BlueField-4 소개](https://www.hpcwire.com/2025/10/28/nvidia-cranks-its-bluefield-4-dpu-to-800-gbps/)

### RISC-V 주류 진입

> "By 2025, over 20 billion RISC-V cores will be in use worldwide"

- **SiFive, Andes, Microchip**: RISC-V 코어 상용화
- **NXP, Intel, Qualcomm**: 차세대 RISC-V SoC 투자
- **Zephyr/FreeRTOS**: RISC-V 완벽 지원
- **6% CPU 시장 점유율** (2025년 예상)

### Zephyr RTOS 산업 표준화

> "Zephyr has now become a staple for most embedded development projects"

- **Linux Foundation 후원**: Intel, NXP, Nordic, ST 참여
- **기여자 5배 증가** (2017년 대비)
- **RISC-V 레퍼런스 보드**: SiFive HiFive 지원

### ARM Cortex-M85 + Helium MVE

최신 MCU 아키텍처:

| 제품 | 코어 | 클럭 | 특징 |
|-----|-----|------|-----|
| STM32V8 | Cortex-M85 | 800 MHz | 18nm FD-SOI, SpaceX 채택 |
| Renesas RA8P1 | Cortex-M85 | 1 GHz | Ethos-U55 NPU 탑재 |
| Renesas RA8D2/M2 | Cortex-M85 | - | 7,300+ CoreMarks |

**Helium 성능**:
- ML 성능: Cortex-M7 대비 **4배**
- DSP 성능: Cortex-M7 대비 **3배**
- Cortex-M55 대비 **20% 향상**

### Virtual JTAG / Remote Debug

Intel/Altera FPGA 최신 디버깅:

- **JTAG-Over-Protocol (JOP)**: Avalon-MM 버스 통한 디버그
- **Etherlink**: 이더넷 기반 JTAG (UIO 드라이버)
- **Quartus Pro 24.3/25.1**: Agilex 5/7 지원
- **mmlink vs etherlink**: 커스텀 vs 표준 드라이버

**참고 자료**:
- [Altera FPGA Remote Debug](https://altera-fpga.github.io/rel-25.1/)
- [Intel Virtual JTAG IP Core](https://www.intel.com/content/www/us/en/docs/programmable/683705/)

### CXL (Compute Express Link)

> "90% of newly shipped servers now CXL-capable" (2026)

**스펙 발전**:
- CXL 3.2 (2024.12): 메모리 RAS 강화
- CXL 4.0 (2025.11): 128GT/s, PCIe 7.0 기반
- CXL 4.0 (2027 예정): 멀티랙 패브릭

**핵심 프로토콜**:
- **CXL.io**: I/O 프로토콜 (PCIe 호환)
- **CXL.cache**: 코히런트 캐싱
- **CXL.mem**: 직접 메모리 접근

**성능**:
- DDR 대비 2-3x 레이턴시 (CXL DRAM)
- 128 GB/s 양방향 throughput (x16 링크)
- 70ns 컨트롤러 딜레이 (Montage MXC)

**적용 분야**:
- AI 데이터센터 메모리 확장
- GPU 메모리 풀링
- 서버 메모리 disaggregation

**레퍼런스**:
- [CXL 공식 사이트](https://computeexpresslink.org/)
- [ACM Computing Surveys - CXL 소개](https://dl.acm.org/doi/full/10.1145/3669900)
- [IEEE Micro - CXL 논문](https://dl.acm.org/doi/abs/10.1109/MM.2022.3228561)

### UCIe (Universal Chiplet Interconnect Express)

**스펙 발전**:
- UCIe 1.0 (2022.03): 최초 스펙
- UCIe 1.1 (2023.08): 개선
- UCIe 2.0 (2024.08): 3D 패키징 지원
- UCIe 3.0 (2025.08): 48/64 GT/s, AI/HPC 최적화

**컨소시엄**: 120+ 멤버 (Intel, AMD, TSMC, Samsung, ARM, Meta, Google)

**광학 인터커넥트**: Ayar Labs UCIe 광학 칩렛 (8 Tbps)

**2026년 병목**:
1. HBM 공급 할당
2. CoWoS 용량 (TSMC 리드타임 6-9개월)
3. ABF 기판 공급
4. KGD 테스트 인프라

**레퍼런스**:
- [UCIe Consortium](https://www.uciexpress.org/)
- [UCIe 3.0 Specification](https://www.uciexpress.org/specifications)

### Chiplet / 모듈러 설계

> "The industry has been shifting away from monolithic SoCs toward partitioned, modular designs using chiplets."

- **개발 비용 절감**: NRE(Non-Recurring Engineering) 감소
- **개발 주기 단축**: 모듈 재사용
- **유연한 구성**: 도메인별 최적화
- **CXL 연동**: 칩렛 간 메모리 공유
- **UCIe 표준**: 칩렛 인터커넥트 통일

### Matter / Thread (IoT 프로토콜)

**Matter**:
- CSA(Connectivity Standards Alliance) 표준
- Apple, Amazon, Google, Samsung 참여
- Matter 1.4.2 (2025.08): NFC 온보딩
- Matter 1.5 (2025.11): 카메라, 에너지 관리

**Thread**:
- IEEE 802.15.4 기반 메시 네트워크
- IPv6 지원, 저전력
- 1000+ Thread 인증 제품 (2025년)

**하드웨어**:
- Silicon Labs EFR32MG26: Matter/Thread/Zigbee 동시 지원
- Nordic nRF54: Thread 배터리 수명 개선

**레퍼런스**:
- [Matter (CSA-IoT)](https://csa-iot.org/all-solutions/matter/)
- [Thread Group](https://www.threadgroup.org/)

### Rust Embedded

> "Rust adoption in embedded systems has increased by 15% in a single year"

**현황**:
- 상업 프로젝트 28% 성장 (2년)
- 스타트업 주도 채택
- 의료/항공/보안 분야 증가

**장점**:
- 컴파일 타임 메모리 안전성
- Buffer overflow, race condition 방지
- C와 FFI 호환

**과제**:
- 43개 MCU 패밀리 중 16개만 peripheral crate 지원 (37%)
- 기존 C/C++ 코드베이스 통합 복잡성

**예측**: 10년 내 임베디드 시스템 10%+ Rust 점유

**레퍼런스**:
- [Rust for Embedded Systems (ACM)](https://dl.acm.org/doi/10.1145/3658644.3690275)
- [Embedded Rust](https://docs.rust-embedded.org/)
- [JetBrains State of Rust 2025](https://blog.jetbrains.com/rust/2026/02/11/state-of-rust-2025/)

---

## 업데이트 이력

- 2026-05-12: 초안 작성, 웹 조사 완료
- 2026-05-12: 2025-2026 최신 트렌드 추가 (RISC-V, Helium, Edge AI, Virtual JTAG)
