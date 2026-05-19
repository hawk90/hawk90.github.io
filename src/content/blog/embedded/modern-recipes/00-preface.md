---
title: "Modern Embedded Recipes: 서문"
date: 2026-05-07T01:00:00
description: "HW interface 기초부터 ARM·빌드·드라이버·peripheral·RTOS·Linux·메모리·동시성·디버깅·FPGA·Edge AI까지 임베디드 12 Part 종합 cookbook 148편."
series: "Modern Embedded Recipes"
seriesOrder: 0
tags: [embedded, recipes, cookbook, arm, linux, rtos, fpga, edge-ai]
type: tech
featured: true
---

## 이 시리즈가 다루는 것

임베디드 분야는 *기초 튜토리얼*과 *심화 internals* 사이에 큰 골이 있습니다. GPIO 깜빡이기는 어디나 있고, 커널 내부와 RTOS 스케줄러 분석도 좋은 자료가 있습니다. 그런데 둘 사이 — *현장에서 실제로 부딪히는* 전반을 한자리에 모은 자료는 드뭅니다.

이 시리즈는 그 사이를 채웁니다. **HW 인터페이스 동작 원리부터 Edge AI 배포까지** 임베디드 12개 영역을 *cookbook 형태*로 정리합니다. 한 레시피가 한 문제를 풀고, 다음 레시피로 자연스럽게 이어집니다.

- "GPIO의 push-pull과 open-drain은 회로상 무엇이 다른가?"
- "ARM Cortex-M의 vector table은 어떻게 구성하고, MPU region은 어떻게 잡는가?"
- "링커 스크립트의 LMA·VMA는 .data 복사와 어떻게 연결되는가?"
- "Bare-metal에서 UART 드라이버를 polling·interrupt·DMA로 각각 작성하면 무엇이 달라지는가?"
- "RTOS에서 priority inversion이 발생할 때 어떻게 진단하고 inheritance를 적용하는가?"
- "Linux kernel 모듈을 작성해 PCIe FPGA를 user space로 mmap하려면?"
- "Jetson Orin에서 카메라부터 NPU까지 zero-copy 파이프라인을 어떻게 묶는가?"

## 대상 독자

이 시리즈는 *임베디드 입문~중급* 모두를 대상으로 합니다.

1. **임베디드 입문자** — Part 1~5 (HW interface·ARM·toolchain·bare-metal·peripheral)
2. **임베디드 중급** — Part 6~9 (RTOS·Linux embedded·memory/perf·concurrency)
3. **임베디드 전문 영역** — Part 10~12 (debugging·FPGA·Edge AI)

각 Part는 비교적 독립적이라 *관심 있는 Part부터* 선택해 읽어도 무리가 없습니다. 다만 Part 1~5는 입문자라면 순서대로 보는 편이 학습에 좋습니다.

## 시리즈 구성

**총 12 Parts, 148 레시피**로 구성됩니다.

### 한눈에 보는 12 Parts

| Part | 영역 | 편수 | seriesOrder |
|------|------|------|-------------|
| 1 | HW Interface 동작 원리 | 12 | 1~12 |
| 2 | ARM 아키텍처 실용 관점 | 10 | 13~22 |
| 3 | 빌드 toolchain 깊이 | 12 | 23~34 |
| 4 | Bare-Metal 드라이버 작성 | 14 | 35~48 |
| 5 | Peripheral 제어 | 14 | 49~62 |
| 6 | RTOS 실전 활용 | 12 | 63~74 |
| 7 | Linux Embedded 기초 | 14 | 75~88 |
| 8 | Memory & 성능 실전 | 12 | 89~100 |
| 9 | Concurrency 응용 | 10 | 101~110 |
| 10 | 디버깅 & 트러블슈팅 | 12 | 111~122 |
| 11 | FPGA & 가속기 | 14 | 123~136 |
| 12 | Edge AI & 보안 | 12 | 137~148 |
| **합** |  | **148** |  |

---

### Part 1 — HW Interface 동작 원리 (12편)

디지털 신호·클럭·GPIO·통신 버스의 *전기적 동작*을 정리합니다. 소프트웨어로 driver를 쓰기 전에 *왜 그렇게 동작하는가*를 이해합니다.

| # | 레시피 | 핵심 |
|---|--------|------|
| 1-01 | 디지털 신호 기초 | TTL/CMOS·noise margin·signal integrity |
| 1-02 | 클럭과 타이밍 | PLL·jitter·skew·setup/hold |
| 1-03 | GPIO 내부 구조 | push-pull·open-drain·pull·drive strength |
| 1-04 | UART 하드웨어 동작 | framing·baud generator·FIFO·RS-232 levels |
| 1-05 | SPI 하드웨어 | MOSI/MISO/SCK/CS·mode 0~3·daisy-chain |
| 1-06 | I2C 하드웨어 | open-drain·addressing·clock stretching |
| 1-07 | ADC 동작 원리 | sampling·SAR vs Σ-Δ·ENOB |
| 1-08 | DAC 동작 원리 | R-2R·Σ-Δ·glitch·monotonicity |
| 1-09 | PWM 신호 생성 | duty·frequency·dead-time |
| 1-10 | CAN 버스 전기적 특성 | differential·termination·bit timing |
| 1-11 | RS-485 / RS-422 | multi-drop·fail-safe biasing |
| 1-12 | LVDS / 차동 신호 | LVDS·LVPECL·impedance matching |

### Part 2 — ARM 아키텍처 실용 관점 (10편)

Cortex-M/A 코어를 소프트웨어 관점에서 다룹니다. 레지스터·exception·메모리 맵·캐시·MPU·MMU·TrustZone·memory barrier.

| # | 레시피 | 핵심 |
|---|--------|------|
| 2-01 | Cortex-M 시리즈 비교 | M0/M3/M4/M7/M33/M55/M85 |
| 2-02 | Cortex-A 시리즈 비교 | A53/A72/A78/Neoverse |
| 2-03 | ARM 레지스터 구조 | R0-R15·xPSR·CONTROL·PRIMASK |
| 2-04 | Cortex-M 예외 처리 | NVIC·vector table·tail-chaining |
| 2-05 | ARM 메모리 맵 | bitband·strongly-ordered/device/normal |
| 2-06 | ARM 캐시 (L1/L2) | write-through vs write-back·DMA coherency |
| 2-07 | MPU 활용 | region·attributes·fault analysis |
| 2-08 | MMU 기초 | page table·TLB·virtual address |
| 2-09 | TrustZone-M 기초 | Secure/Non-Secure·SAU·NSC |
| 2-10 | Memory Barrier 실전 | DMB·DSB·ISB |

### Part 3 — 빌드 toolchain 깊이 (12편)

크로스 컴파일러·ELF·링커 스크립트·startup·C 런타임·메모리 레이아웃·맵 파일·CMake·bootloader 체인.

| # | 레시피 | 핵심 |
|---|--------|------|
| 3-01 | 크로스 컴파일러 | arm-none-eabi·sysroot·multilib |
| 3-02 | 컴파일 4단계 | preprocess·compile·assemble·link |
| 3-03 | ELF 파일 구조 | header·sections·symbols·readelf |
| 3-04 | 링커 스크립트 기초 | MEMORY·SECTIONS·alignment |
| 3-05 | 링커 스크립트 고급 | LMA vs VMA·KEEP·AT>·overlay |
| 3-06 | 스타트업 코드 분석 | Reset_Handler·vector table·main 진입 |
| 3-07 | C 런타임 (crt0) | .data 복사·.bss·ctors·atexit |
| 3-08 | 메모리 레이아웃 | stack/heap/static |
| 3-09 | 컴파일러 최적화 | -O0~-O3·-Os·-Og·LTO |
| 3-10 | 맵 파일 분석 | memory usage·dead code |
| 3-11 | Make와 CMake (cross-compile) | toolchain file·preset |
| 3-12 | Bootloader 체인 | BootROM·SPL·U-Boot·Kernel·Secure Boot |

### Part 4 — Bare-Metal 드라이버 작성 (14편)

CMSIS 헤더만 들고 driver를 작성합니다. GPIO·clock·NVIC·SysTick·UART·SPI·I2C·DMA·low-power·watchdog·flash·DDR.

| # | 레시피 | 핵심 |
|---|--------|------|
| 4-01 | 첫 bare-metal 프로그램 | LED toggle |
| 4-02 | 레지스터 직접 접근 | volatile·MMIO·packed struct |
| 4-03 | GPIO 드라이버 작성 | MODER/OTYPER/OSPEEDR/PUPDR/AFR |
| 4-04 | 클럭 설정 | HSE/HSI·PLL·peripheral clock enable |
| 4-05 | 인터럽트 핸들링 | NVIC·ISR·priority |
| 4-06 | SysTick 타이머 | 1ms tick·delay·jiffies |
| 4-07 | UART 드라이버 | polling·interrupt·DMA |
| 4-08 | SPI 드라이버 | master/slave·CPOL/CPHA·DMA |
| 4-09 | I2C 드라이버 | repeated start·NACK·timeout |
| 4-10 | DMA 기초 | channel·trigger·HT/TC·circular |
| 4-11 | 저전력 모드 | Sleep/Stop/Standby·wake-up |
| 4-12 | 워치독 (IWDG/WWDG) | refresh 전략·debug freeze |
| 4-13 | Flash 프로그래밍 | erase/write·dual bank·EEPROM emul |
| 4-14 | DDR 초기화 실패 | timing·calibration·walking bit |

### Part 5 — Peripheral 제어 (14편)

DC/스테퍼/서보 모터·LCD/OLED/TFT·환경 센서·IMU·CAN·USB·Ethernet·SD·RTC.

| # | 레시피 | 핵심 |
|---|--------|------|
| 5-01 | PWM 출력 | LED 밝기·모터 속도 |
| 5-02 | DC 모터 제어 | H-bridge·PWM·flyback |
| 5-03 | 스테퍼 모터 | full/half/micro-step·ramp |
| 5-04 | 서보 모터 | 50Hz·1~2ms duty |
| 5-05 | Character LCD (HD44780) | 4/8-bit·custom char |
| 5-06 | SPI OLED (SSD1306) | 128×64·framebuffer·page mode |
| 5-07 | TFT 디스플레이 | RGB parallel·LTDC·vsync |
| 5-08 | 환경 센서 | BME280·SHT3x·calibration |
| 5-09 | IMU | MPU6050·BMI270·sensor fusion 입력 |
| 5-10 | CAN 통신 | frame·filter·bit timing·CAN-FD |
| 5-11 | USB Device | CDC·HID·TinyUSB |
| 5-12 | Ethernet MAC + PHY | RMII·MDIO·lwIP·DHCP |
| 5-13 | SD card + FatFs | SPI/SDIO·long filename |
| 5-14 | RTC 활용 | VBAT backup·alarm·tamper |

### Part 6 — RTOS 실전 활용 (12편)

Super-loop를 넘어 RTOS로. Task·scheduler·semaphore·mutex·queue·event·timer·ISR-safe·priority inversion·디버깅.

| # | 레시피 | 핵심 |
|---|--------|------|
| 6-01 | RTOS 도입 결정 | super-loop vs RTOS |
| 6-02 | Task 설계 패턴 | periodic·event-driven·state machine |
| 6-03 | Scheduler 동작 이해 | preemptive·time-slice·priority |
| 6-04 | Semaphore 활용 | binary·counting·resource pool |
| 6-05 | Mutex 활용 | priority inheritance·recursive |
| 6-06 | Queue 활용 | producer-consumer·backpressure |
| 6-07 | Event Group | AND/OR 조건·multi-task sync |
| 6-08 | Software Timer | one-shot·auto-reload·timer task |
| 6-09 | ISR-Safe API | reentrant·atomic·defer |
| 6-10 | Priority Inversion 진단 | Mars Pathfinder·inheritance |
| 6-11 | Timer Wheel | hashed·hierarchical·O(1) tick |
| 6-12 | RTOS 디버깅 | stack overflow·deadlock·heap |

### Part 7 — Linux Embedded 기초 (14편)

부팅·U-Boot·Device Tree·커널 빌드·모듈·캐릭터/플랫폼 드라이버·mmap·epoll·UIO/VFIO·sysfs·IRQ affinity·Buildroot.

| # | 레시피 | 핵심 |
|---|--------|------|
| 7-01 | 임베디드 Linux 부팅 흐름 | BootROM → Kernel → Init |
| 7-02 | U-Boot 활용 | env·script·net boot·fastboot |
| 7-03 | Device Tree 실전 | DTS·DTB·phandle |
| 7-04 | Device Tree overlay | symbol·fragment·동적 로딩 |
| 7-05 | 커널 빌드 | menuconfig·defconfig·deb-pkg |
| 7-06 | Kernel module 기초 | init/exit·param·KBuild·DKMS |
| 7-07 | 캐릭터 드라이버 작성 | cdev·file_operations·copy_to/from_user |
| 7-08 | Platform 드라이버 | DT match·probe·resource 획득 |
| 7-09 | mmap 네 가지 모드 | anonymous·file-backed·shared·huge page |
| 7-10 | epoll 실전 | LT vs ET·ONESHOT·EXCLUSIVE |
| 7-11 | UIO·VFIO | user-space driver·IOMMU |
| 7-12 | sysfs·configfs | kobject 기반 user 인터페이스 |
| 7-13 | IRQ Affinity | smp_affinity·isolcpus·irqbalance |
| 7-14 | 루트 파일시스템 (Buildroot) | BR2_*·post-build·Yocto와 비교 |

### Part 8 — Memory & 성능 실전 (12편)

동적 메모리·정렬·캐시·DMA·zero-copy·NUMA·SIMD·NEON·스택·코드 크기·전력·WCET.

| # | 레시피 | 핵심 |
|---|--------|------|
| 8-01 | 동적 메모리 (malloc 위험) | fragmentation·pool·arena |
| 8-02 | 메모리 정렬과 패딩 | alignment·packed·unaligned penalty |
| 8-03 | Cache Line Alignment | alignas·padding·SoA |
| 8-04 | DMA-Friendly Allocator | coherent vs streaming·IOMMU |
| 8-05 | Zero-Copy Pipeline | DMA-BUF·sendfile·io_uring·splice |
| 8-06 | NUMA Memory Topology | numactl·libnuma·HBM·CXL |
| 8-07 | SIMD 활용 | intrinsics·auto-vectorization·OpenMP SIMD |
| 8-08 | ARM NEON 심화 | matmul·FFT·image filter·MVE |
| 8-09 | 스택 분석 | high-water·canary·MPU guard |
| 8-10 | 코드 크기 최적화 | -Os·LTO·section gc |
| 8-11 | 전력 최적화 | sleep·clock gating·DVFS·tickless |
| 8-12 | WCET 분석 | measurement vs static·cache 영향 |

### Part 9 — Concurrency 응용 (10편)

Lock-free·wait-free·RCU·hazard pointer·CAS·atomic 비용·spinlock vs mutex·ABA·false sharing·MPMC.

| # | 레시피 | 핵심 |
|---|--------|------|
| 9-01 | Lock-Free Ring Buffer | SPSC·power-of-2·memory order |
| 9-02 | Wait-Free Signaling | atomic flag·sequence·latest-value |
| 9-03 | RCU 기초 | grace period·reader 비용 |
| 9-04 | Hazard Pointer | 메모리 회수·ABA 회피 |
| 9-05 | Compare-And-Swap 패턴 | strong vs weak·exponential backoff |
| 9-06 | Atomic operation 비용 | memory order별 비용·LSE 명령어 |
| 9-07 | Spinlock vs Mutex 결정 | hold time·UP vs SMP·MCS lock |
| 9-08 | ABA 문제 회피 | tagged pointer·version counter |
| 9-09 | False sharing 해결 | alignas·padding·per-CPU |
| 9-10 | MPMC 큐 | Vyukov·Disruptor·bounded vs unbounded |

### Part 10 — 디버깅 & 트러블슈팅 (12편)

체계적 hypothesis-driven 진단·JTAG/SWD·GDB·hardfault·UART 진단·부팅 실패·인터럽트·메모리 오염·race·로직 애널라이저·로깅·포스트모템.

| # | 레시피 | 핵심 |
|---|--------|------|
| 10-01 | 디버깅 마인드셋 | hypothesis·이분탐색·rubber duck |
| 10-02 | JTAG·SWD 안 붙을 때 | 핀·전압·속도·session |
| 10-03 | GDB 원격 디버깅 | OpenOCD·pyOCD·script |
| 10-04 | 하드폴트 분석 | xPSR·stacked PC·CFSR·HFSR |
| 10-05 | UART 안 찍힐 때 | 전기·핀·클럭·baud·코드 |
| 10-06 | 부팅 안 될 때 | 전원·reset·vector·entry point |
| 10-07 | 인터럽트 누락/중복 진단 | pending·priority·level vs edge |
| 10-08 | 메모리 오염 진단 | canary·MPU guard·watchpoint·asan |
| 10-09 | 타이밍/race 진단 | Heisenbug·SWO·DWT·non-intrusive |
| 10-10 | 통신 프로토콜 분석 | Saleae·DSO·protocol decoder |
| 10-11 | 로깅 시스템 설계 | level·circular buffer·SWO·deferred |
| 10-12 | 포스트모템 분석 | core dump·MCU mini-dump·Memfault |

### Part 11 — FPGA & 가속기 (14편)

FPGA 기초·Vivado/Quartus·AXI·PCIe·Zynq PS-PL·mailbox·CQ/SQ·DMA·HLS·Vitis AI·OpenCL.

| # | 레시피 | 핵심 |
|---|--------|------|
| 11-01 | FPGA 기초 | LUT·FF·BRAM·DSP slice |
| 11-02 | Vivado 사용법 | XDC·synth/impl·bitstream |
| 11-03 | PCIe BAR 매핑 | config space·enumeration·MMIO |
| 11-04 | AXI 인터페이스 | AXI4·AXI4-Lite·AXI-Stream |
| 11-05 | PS-PL 통신 (Zynq) | GP/HP/ACP·coherent vs non-coherent |
| 11-06 | Mailbox Protocol | host·accelerator doorbell 채널 |
| 11-07 | Command Queue·SQ | NVMe·XDMA 공통 패턴·multi-queue |
| 11-08 | DMA Completion | interrupt·polling·completion ring |
| 11-09 | PCIe Streaming | BAR type·MSI-X·kernel bypass |
| 11-10 | Vitis HLS | pragma·pipeline II·dataflow |
| 11-11 | HLS 최적화 | array partition·resource trade-off |
| 11-12 | Vitis AI | DPU·xmodel·VART·throughput vs latency |
| 11-13 | OpenCL on FPGA | kernel·channel·burst memory |
| 11-14 | Intel Quartus 사용법 | Platform Designer·Nios II·partial reconfig |

### Part 12 — Edge AI & 보안 (12편)

Edge inference·NPU·quantization·TensorRT·TFLite Micro·ONNX·thermal·Jetson·zero-copy camera·LLM·TF-M·Matter.

| # | 레시피 | 핵심 |
|---|--------|------|
| 12-01 | Edge Inference 개요 | cloud vs edge·latency·privacy |
| 12-02 | NPU 아키텍처 | Ethos·Hexagon·systolic·MAC array |
| 12-03 | Quantization | PTQ·QAT·INT8·INT4·calibration |
| 12-04 | TensorRT | ONNX→engine·FP16·INT8·DLA |
| 12-05 | TFLite Micro | op resolver·tensor arena·MCU |
| 12-06 | ONNX Runtime | EP·CUDA/TensorRT/DML·minimal |
| 12-07 | Thermal Management | throttling·DVFS·fan curve |
| 12-08 | Jetson | Orin/Thor·JetPack·DLA·VPI |
| 12-09 | Zero-Copy Camera | V4L2·DMA-BUF·GPU·NPU |
| 12-10 | 온디바이스 LLM | llama.cpp·GGUF·MLX·NPU backend |
| 12-11 | TF-M·TrustZone | Cortex-M33 secure·PSA·MCUboot |
| 12-12 | Matter·Thread | IoT 통합·commissioning·multi-fabric |

---

## 학습 로드맵

148편이 부담스러우면 단계별로 접근하세요.

### 입문 (Part 1~5, 62편)

처음 임베디드를 시작하거나 Bare-metal 기초가 약하다면 여기부터.

- **Part 1** — 디지털 신호·GPIO·UART/SPI/I2C 회로 동작
- **Part 2** — Cortex-M 레지스터·NVIC·MPU
- **Part 3** — 컴파일러·링커 스크립트·startup·C 런타임
- **Part 4** — Bare-metal driver 작성 (GPIO·clock·interrupt·UART·SPI·I2C·DMA·flash)
- **Part 5** — 모터·LCD/OLED·센서·CAN·USB·Ethernet·SD·RTC

### 응용 (Part 6~9, 48편)

기초가 잡힌 뒤 RTOS·Linux·메모리·동시성으로 확장.

- **Part 6** — RTOS task·sync·디버깅
- **Part 7** — Linux 부팅·Device Tree·커널 모듈·driver·mmap·epoll·UIO/VFIO
- **Part 8** — 메모리 정렬·캐시·DMA·SIMD·NEON·전력
- **Part 9** — Lock-free·wait-free·RCU·CAS·MPMC

### 전문 (Part 10~12, 38편)

현장 트러블슈팅과 modern 영역.

- **Part 10** — 체계적 디버깅 방법론
- **Part 11** — FPGA·AXI·PCIe·HLS·Vitis AI
- **Part 12** — Edge AI·TensorRT·TFLite·LLM·TF-M·Matter

## 다른 시리즈와의 관계

이 시리즈는 *cookbook (실전 통합)*에 집중합니다. *deep internals*는 자매 시리즈에서 더 깊이 다룹니다.

| 주제 | 이 시리즈 (cookbook) | 깊이 있는 시리즈 (internals) |
|------|---------------------|----------------------------|
| RTOS scheduler·sync internals | Part 6 (8편 응용) | [Practical RTOS Internals](/blog/embedded/rtos/practical-internals) |
| 성능 측정·프로파일링 방법론 | Part 8 (12편 적용) | [Embedded Performance Engineering](/blog/embedded/performance-engineering) |
| C++ on MCU (template·RAII·constexpr) | 일부 코드 예시 | [Embedded C++ for Real Systems](/blog/embedded/embedded-cpp) |
| 보안 인증·표준 | Part 12 (TF-M·Matter) | (Practical RTOS Part 4-11 + Modern Recipes 12-11) |

**조합 예**:

- *RTOS 깊이 학습* — Modern Recipes Part 6 (실전) + Practical RTOS Internals (이론·소스 분석)
- *고성능 코드* — Modern Recipes Part 8 (cookbook) + Performance Engineering (측정 방법론)
- *Cortex-M에서 C++ 쓰기* — Modern Recipes Part 4·Part 6 (C 기반) + Embedded C++ (C++ 적용)

## 사전 지식

- C 중급 (포인터·구조체·매크로 자유롭게)
- 기초 디지털 논리 (AND/OR/Flip-Flop 이해)
- Linux 기본 명령 (Part 7 이후)
- ARM 또는 RISC-V 어셈블리 기초 (선택)

순수 전자회로 이론(R·L·C·op-amp)은 다루지 않습니다. 디지털 인터페이스 동작에 필요한 *최소한*만 Part 1에서 정리합니다.

## 집필 원칙

1. **원리 + 한 가지 구체 예** — 추상 개념과 실제 코드를 같이.
2. **측정 수치 포함** — "빠르다"가 아니라 "Cortex-M4 @72MHz에서 N µs".
3. **trade-off 명시** — 어떤 상황에서 안 좋은지도 같이.
4. **cross-link** — 깊이 들어가야 하면 자매 시리즈로.
5. **draft 우선** — 본문이 완성되지 않은 stub은 `draft: true`로 두고 단계적으로 채웁니다.

## 예제 환경

| 플랫폼 | 용도 |
|--------|------|
| STM32F4·STM32H7·STM32U5 | Cortex-M4/M7/M33 — Part 2~6의 주력 |
| RP2040 / RP2350 | dual-core·hardware spinlock — 동시성 데모 |
| NXP i.MX 8M | Cortex-A53 + M4 heterogeneous — Part 7·11 |
| Raspberry Pi 4·5 | Cortex-A 가벼운 server — Part 7~9 |
| NVIDIA Jetson Orin | edge AI — Part 12 |
| Xilinx Zynq UltraScale+ | PS+PL·AXI — Part 11 |

특정 보드에 종속되지 않게 *원리 + 한 가지 구체 예*를 함께 보입니다.

## 레퍼런스

**서적**

- *Linux Device Drivers* (3rd ed) — Corbet, Rubini, Kroah-Hartman
- *Understanding the Linux Kernel* — Bovet, Cesati
- *Modern Embedded Systems Programming* — Quantum Leaps (Miro Samek)
- *Making Embedded Systems* — Elecia White
- *The Art of Multiprocessor Programming* — Herlihy, Shavit
- *Programming with POSIX Threads* — Butenhof
- *FPGA Prototyping by SystemVerilog Examples* — Pong P. Chu

**공식 문서**

- Arm Architecture Reference Manual (ARMv7-M·ARMv8-M·ARMv8-A)
- Linux Kernel Documentation
- ARM AMBA AXI Specification
- PCIe Base Specification 6.0
- NVIDIA Jetson Documentation
- Vitis HLS / Vitis AI User Guide
- Matter Specification 1.4

**커뮤니티**

- [LWN.net](https://lwn.net) — Linux 커널 변경 추적
- [Interrupt Blog (Memfault)](https://interrupt.memfault.com) — embedded debugging
- [Embedded Artistry](https://embeddedartistry.com) — embedded best practice
- [Hackaday](https://hackaday.com) — HW 프로젝트

## 이 시리즈를 완주하면

- HW interface (GPIO·UART·SPI·I2C·CAN)의 *동작 원리*를 회로 수준에서 설명할 수 있습니다.
- ARM Cortex-M/A 아키텍처의 *레지스터·exception·캐시·MPU·MMU·TrustZone*을 활용할 수 있습니다.
- 링커 스크립트·startup·C 런타임을 *수정해서 custom layout*을 만들 수 있습니다.
- Bare-metal에서 *driver*를 polling·interrupt·DMA 어느 방식으로도 작성할 수 있습니다.
- RTOS의 *task·sync·priority·timer*를 정확하게 사용할 수 있습니다.
- Linux 커널 모듈·캐릭터/플랫폼 driver·mmap·UIO/VFIO를 *현장 수준*으로 작성할 수 있습니다.
- 메모리·캐시·DMA·SIMD를 활용한 *성능 최적화*를 할 수 있습니다.
- Lock-free·wait-free·RCU·CAS 패턴을 *정확하게* 적용할 수 있습니다.
- HW 디버깅 시 *체계적인 hypothesis-driven 진단*이 가능합니다.
- FPGA·NPU·NVMe 같은 가속기를 *PCIe와 AXI 레벨*에서 다룰 수 있습니다.
- Edge AI inference를 *zero-copy + INT8 quantization*까지 최적화할 수 있습니다.
- TrustZone·Matter 같은 *modern 보안·IoT 표준*을 도입할 수 있습니다.

---

다음 글: [Part 1-01: 디지털 신호 기초](/blog/embedded/modern-recipes/part1-01-digital-signal-basics)
