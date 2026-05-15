# Embedded Engineering Courses - 레퍼런스 전수조사

> 작성일: 2026-05-12
> 목적: 4개 시리즈 집필을 위한 참고 자료 목록

---

## 사용 원칙

이 문서는 단순 링크 모음이 아니라, 실제 집필 시 다음 우선순위로 사용합니다:

1. **1차 자료 우선**
   - 공식 문서, 표준 문서, 커널/RTOS 소스, 벤더 매뉴얼
2. **검증 가능한 2차 자료**
   - 저자/기관이 명확한 서적, 기술 블로그, 강의 자료
3. **커뮤니티 자료는 보조로만 사용**
   - Stack Overflow, Reddit, 포럼 글은 아이디어 출발점으로만 활용

시리즈 서문과 본문에서 사실 단정이 필요한 경우에는 가능하면 1차 자료를 먼저 인용합니다.

## 현재 콘텐츠 상태

현재 `src/content/blog/embedded` 아래에는 각 시리즈의 `00-preface.md`만 작성되어 있습니다.

- Modern Embedded Recipes
- Practical RTOS Internals
- Embedded Performance Engineering
- Embedded C++ for Real Systems

따라서 이 레퍼런스 문서의 다음 실질적 용도는 **각 시리즈의 첫 본문(`part1-01-*`)을 쓰기 위한 참고 자료 선별**입니다.

## 시리즈 개요

| # | 시리즈명 | 난이도 | 집필 초점 |
|---|---------|--------|-----------|
| 1 | Modern Embedded Recipes | Advanced | 실전 트러블슈팅 절차 |
| 2 | Practical RTOS Internals | Advanced | 커널 내부 구조 분석 |
| 3 | Embedded Performance Engineering | Expert | 병목 원인 분석과 측정 |
| 4 | Embedded C++ for Real Systems | Advanced | 제약 환경에서의 안전한 C++ 활용 |

---

## 바이블

시리즈별로 자료는 많이 참조하겠지만, 아래 항목들은 **판단 기준이 흔들릴 때 다시 돌아올 원전**으로 취급합니다.

### 1. Modern Embedded Recipes

| 자료 | 분류 | 왜 바이블인가 | 주로 쓰는 위치 |
|---|---|---|---|
| ARM Architecture Reference Manual / Cortex-M, Cortex-A TRM | 1차 자료 | 인터럽트, 예외, 메모리 맵, 디버그 인터페이스 해석의 기준점 | bring-up, JTAG, fault 분석 |
| Linux Kernel Documentation | 1차 자료 | Device Tree, DMA, driver, IRQ, tracing 설명의 기준 문서 | Linux Embedded, DMA, debugfs |
| U-Boot Documentation | 1차 자료 | boot flow, board init, DDR bring-up, environment 해석의 기준 | bootloader, board bring-up |
| PCI Express Base Specification | 1차 자료 | BAR, config space, enumeration 같은 PCIe 용어와 동작 정의의 원전 | PCIe, accelerator 연결 |
| *The Linux Programming Interface* | 2차 자료 | userspace-system call 경계를 안정적으로 설명하기 좋음 | mmap, epoll, userspace integration |

### 2. Practical RTOS Internals

| 자료 | 분류 | 왜 바이블인가 | 주로 쓰는 위치 |
|---|---|---|---|
| FreeRTOS Kernel source | 1차 자료 | scheduler, list, queue, heap 구현 자체가 설명 대상 | scheduler, IPC, allocator |
| Zephyr source tree + docs | 1차 자료 | 보다 큰 RTOS 구조와 subsystem 분리를 보는 기준 | scheduler 비교, SMP, timing |
| ARMv7-M / ARMv8-M Architecture Reference Manual | 1차 자료 | PendSV, exception entry/exit, stack frame 설명의 기준 | context switch, ISR latency |
| RISC-V Privileged Specification | 1차 자료 | trap, interrupt, privilege 전환의 기준 | RISC-V RTOS 포팅 |
| *Operating Systems: Three Easy Pieces* / *Modern Operating Systems* | 2차 자료 | 커널 개념을 일반화해서 설명할 때 유용 | scheduler, IPC, memory model |

### 3. Embedded Performance Engineering

| 자료 | 분류 | 왜 바이블인가 | 주로 쓰는 위치 |
|---|---|---|---|
| *Systems Performance* - Brendan Gregg | 2차 자료 | 측정-분석-최적화 프레임을 가장 실전적으로 제공 | perf, ftrace, flamegraph |
| *Computer Architecture: A Quantitative Approach* | 2차 자료 | CPU, cache, memory hierarchy를 구조적으로 설명하는 기준 | cache miss, branch, pipeline |
| *What Every Programmer Should Know About Memory* | 2차 자료 | 메모리 계층과 locality 설명에 매우 밀도 높음 | cache, DRAM, NUMA 성격 문제 |
| perf / ftrace / rtla 공식 문서 | 1차 자료 | 도구 사용법과 이벤트 의미를 잘못 해석하지 않게 해줌 | profiling, latency tracing |
| ARM / Intel Optimization Manual | 1차 자료 | PMU counter와 microarchitecture-specific 해석의 기준 | PMU, pipeline, branch |

### 4. Embedded C++ for Real Systems

| 자료 | 분류 | 왜 바이블인가 | 주로 쓰는 위치 |
|---|---|---|---|
| *The C++ Programming Language* | 2차 자료 | 언어 규칙 자체를 다시 확인할 기준 | core language, type system |
| *Effective Modern C++* | 2차 자료 | modern C++ idiom의 장단점을 설명하기 좋음 | move, auto, forwarding, ownership |
| C++ Core Guidelines | 1.5차 자료 | 실무 규칙과 설계 원칙을 문서화한 기준점 | RAII, API 설계, ownership |
| *Real-Time C++* - Christopher Kormanyos | 2차 자료 | 임베디드 맥락에서 C++ 적용 사례가 직접적 | constexpr, templates, MCU examples |
| MISRA C++ / AUTOSAR C++ Guidelines | 1차에 가까운 실무 기준 | 안전/제약 환경에서 허용 범위를 정하는 기준 | no-exception, restricted subset |

### 사용 메모

- 1차 자료가 있으면 먼저 그것으로 사실 관계를 고정합니다.
- 2차 자료는 설명 구조를 만들 때 사용합니다.
- 블로그/포럼은 예시나 현업 감각 보강용으로만 씁니다.

## 추가 리뷰 대상

아래 책들은 현재 문서의 바이블 목록을 보강하는 **우선 리뷰 후보**입니다.  
이미 일부는 간접적으로 반영되어 있지만, 본문 작성 전에 챕터 단위로 다시 검토할 가치가 있습니다.

| 자료 | 주 대상 시리즈 | 왜 추가 리뷰가 필요한가 |
|---|---|---|
| *The Linux Programming Interface* - Michael Kerrisk | Modern Embedded Recipes | userspace/kernel boundary, file descriptor, `mmap`, `epoll`, signal, process model 설명을 안정적으로 정리할 수 있음 |
| *Operating Systems: Three Easy Pieces* | Practical RTOS Internals | scheduler, IPC, memory abstraction을 교과서적으로 재정리할 때 가장 설명력이 좋음 |
| *Embedded Systems Architecture, 2nd Edition* - Tammy Noergaard | Modern Embedded Recipes | board, bus, I/O, memory, driver 관점을 폭넓게 묶어 서문 이후 시리즈 확장에 유리함 |
| *Systems Performance, 2nd Edition* - Brendan Gregg | Embedded Performance Engineering | 측정-분석-최적화 프레임을 본문 전체에 일관되게 적용할 기준서 역할 |
| *Large-Scale C++* - John Lakos | Embedded C++ for Real Systems | 언어 기능 소개를 넘어서 의존성, 경계, 빌드 구조, 인터페이스 설계를 다룰 때 유용함 |

### 추가 리뷰 우선순위

1. **즉시 본문 생산용**
   - *The Linux Programming Interface*
   - *Operating Systems: Three Easy Pieces*
   - *Systems Performance*

2. **시리즈 깊이 보강용**
   - *Embedded Systems Architecture*
   - *Large-Scale C++*

### 메모

- `Modern Embedded Recipes`는 TLPI와 Noergaard를 같이 보면 실전 절차와 시스템 배경 설명의 균형이 좋아집니다.
- `Practical RTOS Internals`는 FreeRTOS/Zephyr 소스가 1차 자료이고, OSTEP은 설명 구조를 다듬는 용도입니다.
- `Embedded Performance Engineering`은 Gregg를 기준축으로 잡고, 아키텍처 책과 PMU 문서를 옆에 두는 방식이 가장 안정적입니다.
- `Embedded C++ for Real Systems`는 *Effective Modern C++*만으로는 설계 경계 설명이 부족할 수 있어서 Lakos 축을 추가하는 편이 좋습니다.

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

### Part 1 본문 우선순위 메모

Modern Embedded Recipes의 첫 글은 현재 서문 기준으로 **UART 안 찍힐 때 체크리스트**입니다.  
우선 사용할 레퍼런스 우선순위는 다음과 같습니다:

1. MCU reference manual의 UART chapter
2. board schematic / pinmux 문서
3. vendor app note
4. Linux Serial HOWTO 같은 보조 설명 자료

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

### Part 1 본문 우선순위 메모

Practical RTOS Internals의 첫 글은 **scheduler 자료구조 분석**이므로,  
레퍼런스 우선순위는 다음처럼 잡습니다:

1. FreeRTOS kernel source
2. Zephyr scheduler source
3. ARM/RISC-V architecture manual
4. 교과서형 운영체제 서적

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

> "왜 느린가?"를 설명하는 측정/분석 중심 시리즈

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

### Part 1 본문 우선순위 메모

Embedded Performance Engineering의 첫 글은 **Cache Miss 분석**이므로,
다음 자료를 먼저 소화하고 본문을 쓰는 것이 좋습니다:

1. Hennessy & Patterson
2. Drepper 문서
3. perf / cachegrind 실측 예제
4. ARM core-specific optimization guide
5. perf stat 실측 예제 (cache-misses, cache-references)

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
- **"Real-Time C++: Efficient Object-Oriented and Template Microcontroller Programming"** - Christopher Kormanyos

#### RAII
- **C++ Core Guidelines - RAII**: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rr-raii
- **ModernesCpp - When RAII breaks**: https://www.modernescpp.com/index.php/c-core-guidelines-when-raii-breaks/

#### constexpr / Compile-time Computation
- **Andreas Fertig's Blog**: https://andreasfertig.com/blog/
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

## 후속 조사 메모

아래 주제들은 시리즈 확장 시 다룰 가치가 있지만, 현재 문서에서는 수치 예측이나 시장성 단정 대신 **공식 문서와 표준 스펙 중심으로 다시 검증한 뒤** 본문에 반영하는 것을 권장합니다.

- Edge AI / TinyML
- NPU / DPU / SmartNIC
- RISC-V 생태계
- ARM Helium / PMU / trace 도구
- Virtual JTAG / remote debug
- CXL / UCIe / chiplet
- Matter / Thread
- Rust Embedded

즉, 이 문서의 현재 역할은 "최신 트렌드 요약"이 아니라 **바로 본문 집필에 사용할 수 있는 안정적인 레퍼런스 목록**입니다.

---

## 업데이트 이력

- 2026-05-12: 초안 작성
- 2026-05-12: 시간 민감한 수치/시장성/예측 문구 정리
