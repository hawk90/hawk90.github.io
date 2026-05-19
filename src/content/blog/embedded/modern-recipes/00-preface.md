---
title: "Modern Embedded Recipes: 서문"
date: 2026-05-12T01:00:00
description: "임베디드 엔지니어를 위한 체계적인 학습 경로. 하드웨어 기초부터 프로세서, 소프트웨어, RTOS, 디버깅까지 100개 이상의 레시피로 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 0
tags: [embedded, recipes, troubleshooting, hardware, rtos, linux, arm, risc-v]
type: tech
featured: true
---

## 이 시리즈를 쓰는 이유

임베디드 시스템 개발은 **하드웨어와 소프트웨어의 경계**에서 일어납니다.

회로도를 볼 줄 알아야 하고, 데이터시트를 읽을 줄 알아야 하고, 어셈블리를 이해해야 하고, OS 커널도 알아야 합니다. 범위가 넓고 깊습니다.

문제는 이 지식들이 **파편화**되어 있다는 것입니다:
- 하드웨어 책은 소프트웨어를 다루지 않고
- OS 책은 bare-metal을 다루지 않고
- ARM 책은 RISC-V를 다루지 않고
- 튜토리얼은 "왜"를 설명하지 않습니다

이 시리즈는 **임베디드 시스템의 전체 그림**을 그립니다. 하드웨어 기초부터 시작해서 프로세서 아키텍처, 빌드 시스템, bare-metal 프로그래밍, RTOS, Linux, 성능 최적화, 디버깅까지 — 실무에서 필요한 모든 것을 **체계적으로** 정리합니다.

## 대상 독자

1. **임베디드 입문자**
   - 컴퓨터공학/전자공학 전공자
   - 임베디드 분야로 진입하려는 분

2. **주니어 임베디드 엔지니어** (1-3년차)
   - HAL 함수는 호출하지만 내부 동작이 궁금한 분
   - "왜 안 되지?"에서 막히는 분

3. **시니어로 성장하려는 분**
   - 깊이 있는 시스템 이해가 필요한 분
   - 트러블슈팅 능력을 체계화하고 싶은 분

4. **FPGA/가속기/AI 하드웨어와 협업하는 분**
   - HW/SW 경계에서 일하는 분

## 시리즈 구성

**총 11개 Part, 148개 레시피**로 구성됩니다.

임베디드 레시피의 구조를 참고하여, 하드웨어 기초부터 프로세서, RTOS, Linux, FPGA, Edge AI까지 체계적인 학습 경로를 제공합니다.

---

### Part 1: Hardware Foundation (15개)

하드웨어를 이해하지 않으면 임베디드 소프트웨어를 제대로 작성할 수 없습니다.

| # | 레시피 | 핵심 내용 |
|---|--------|----------|
| 1-01 | 전자회로 기초 | 전압, 전류, 저항, 옴의 법칙 |
| 1-02 | 디지털 로직 | AND, OR, NOT, 플립플롭 |
| 1-03 | 메모리 종류와 특성 | SRAM, DRAM, Flash, EEPROM |
| 1-04 | 클럭과 타이밍 | 클럭 트리, PLL, 타이밍 다이어그램 |
| 1-05 | 버스 아키텍처 | AHB, APB, AXI 기초 |
| 1-06 | 인터럽트 하드웨어 | NVIC, GIC, 인터럽트 컨트롤러 |
| 1-07 | GPIO 내부 구조 | 풀업/풀다운, 오픈드레인, 드라이브 강도 |
| 1-08 | UART 하드웨어 | 보드레이트, 패리티, FIFO |
| 1-09 | SPI 하드웨어 | 모드, 클럭 극성, 칩셀렉트 |
| 1-10 | I2C 하드웨어 | 어드레싱, ACK/NACK, 클럭 스트레칭 |
| 1-11 | ADC/DAC 원리 | 샘플링, 양자화, 분해능 |
| 1-12 | 전원 시스템 | LDO, DCDC, 파워 시퀀싱 |
| 1-13 | PCB 기초 | 레이어, 그라운드, 신호 무결성 |
| 1-14 | 회로도 읽기 | 심볼, 넷, 파트 넘버 |
| 1-15 | 데이터시트 읽기 | 타이밍 스펙, 절대 최대 정격 |

---

### Part 2: Processor Architecture (12개)

ARM과 RISC-V 아키텍처의 핵심을 이해합니다.

| # | 레시피 | 핵심 내용 |
|---|--------|----------|
| 2-01 | CPU 기초 | 레지스터, ALU, 컨트롤 유닛 |
| 2-02 | 파이프라인 | Fetch, Decode, Execute, 해저드 |
| 2-03 | ARM Cortex-M 아키텍처 | M0/M3/M4/M7/M33/M55/M85 비교 |
| 2-04 | ARM Cortex-A 아키텍처 | A-profile vs M-profile |
| 2-05 | RISC-V 아키텍처 | RV32I, 확장, 에코시스템 |
| 2-06 | 레지스터 뱅크 | 범용 레지스터, 특수 레지스터 |
| 2-07 | 예외 처리 메커니즘 | 벡터 테이블, 우선순위, 테일체이닝 |
| 2-08 | 메모리 맵 | 주소 공간, peripheral 매핑 |
| 2-09 | 캐시 아키텍처 | L1/L2, write-through vs write-back |
| 2-10 | MPU/MMU 기초 | 보호 영역, 접근 권한 |
| 2-11 | DSP/SIMD 명령어 | ARM Helium, RISC-V V extension |
| 2-12 | TrustZone 기초 | Secure/Non-secure 월드 |

---

### Part 3: Software Build System (12개)

컴파일부터 링킹, 바이너리 생성까지 빌드 과정을 완전히 이해합니다.

| # | 레시피 | 핵심 내용 |
|---|--------|----------|
| 3-01 | 크로스 컴파일러 | arm-none-eabi-gcc, toolchain 구성 |
| 3-02 | 컴파일 과정 | 전처리, 컴파일, 어셈블, 링크 |
| 3-03 | 오브젝트 파일 분석 | ELF 구조, 섹션, 심볼 |
| 3-04 | 링커 스크립트 기초 | MEMORY, SECTIONS, 배치 |
| 3-05 | 링커 스크립트 고급 | KEEP, ALIGN, LMA vs VMA |
| 3-06 | 스타트업 코드 분석 | Reset_Handler, 초기화 순서 |
| 3-07 | C 런타임 초기화 | .data 복사, .bss 초기화, 생성자 호출 |
| 3-08 | 메모리 레이아웃 설계 | 스택, 힙, 정적 변수 배치 |
| 3-09 | 최적화 옵션 | -O0/-O2/-Os/-Og, LTO |
| 3-10 | 맵 파일 분석 | 메모리 사용량, 심볼 위치 |
| 3-11 | Make와 CMake | 빌드 시스템 구성 |
| 3-12 | 디버그 정보 | DWARF, -g 옵션, 심볼 스트리핑 |

---

### Part 4: Bare-Metal Programming (14개)

OS 없이 하드웨어를 직접 제어하는 방법을 배웁니다.

| # | 레시피 | 핵심 내용 |
|---|--------|----------|
| 4-01 | 첫 번째 bare-metal 프로그램 | LED 깜빡이기, 부트 과정 |
| 4-02 | 레지스터 직접 접근 | volatile, 메모리 매핑 I/O |
| 4-03 | GPIO 제어 | 입력/출력, 인터럽트 |
| 4-04 | 클럭 설정 | PLL, 시스템 클럭, peripheral 클럭 |
| 4-05 | 인터럽트 핸들링 | NVIC 설정, ISR 작성 |
| 4-06 | 타이머 활용 | SysTick, 하드웨어 타이머 |
| 4-07 | UART 드라이버 작성 | 폴링, 인터럽트, DMA |
| 4-08 | SPI 드라이버 작성 | 마스터/슬레이브, DMA |
| 4-09 | I2C 드라이버 작성 | 마스터/슬레이브, 에러 핸들링 |
| 4-10 | DMA 기초 | 채널, 트리거, 완료 인터럽트 |
| 4-11 | 저전력 모드 | Sleep, Stop, Standby |
| 4-12 | 워치독 타이머 | IWDG, WWDG, 리셋 처리 |
| 4-13 | Flash 프로그래밍 | 내부 Flash 읽기/쓰기 |
| 4-14 | 부트로더 기초 | 부트 모드, 점프, 업데이트 |

---

### Part 5: Peripheral & Device Control (14개)

다양한 페리퍼럴과 외부 디바이스를 제어하는 방법을 다룹니다.

| # | 레시피 | 핵심 내용 |
|---|--------|----------|
| 5-01 | PWM 출력 | 듀티 사이클, 주파수 조절, LED 밝기 |
| 5-02 | 모터 제어 | DC, 스테핑, 서보, H-브릿지 |
| 5-03 | LCD/OLED 제어 | Character LCD, SPI OLED, 폰트 |
| 5-04 | 그래픽 디스플레이 | SPI TFT, Parallel RGB, 프레임버퍼 |
| 5-05 | 센서 인터페이스 | 온도, 습도, 가속도, 자이로 |
| 5-06 | CAN 통신 | 프레임 구조, 필터, 자동차 네트워크 |
| 5-07 | USB 기초 | 디바이스 클래스, CDC, HID |
| 5-08 | Ethernet 기초 | MAC, PHY, lwIP 스택 |
| 5-09 | SD 카드 / 파일시스템 | SPI/SDIO, FatFs, 파일 I/O |
| 5-10 | RTC (Real-Time Clock) | 시간 유지, 배터리 백업, 알람 |
| 5-11 | 터치 스크린 | 저항식, 정전식, 컨트롤러 |
| 5-12 | Audio 출력 | I2S, DAC, 코덱 인터페이스 |
| 5-13 | 카메라 인터페이스 | DCMI, CSI, 이미지 캡처 |
| 5-14 | 외부 메모리 확장 | QSPI Flash, SDRAM, FMC |

---

### Part 6: RTOS Internals (16개)

RTOS의 내부 동작을 완전히 이해합니다.

| # | 레시피 | 핵심 내용 |
|---|--------|----------|
| 6-01 | RTOS가 필요한 이유 | 슈퍼루프의 한계 |
| 6-02 | Task와 스케줄러 | TCB, ready list, 스케줄링 알고리즘 |
| 6-03 | Context Switch 분석 | 레지스터 저장/복원, 스택 프레임 |
| 6-04 | 우선순위 기반 스케줄링 | Priority inversion, 해결책 |
| 6-05 | 세마포어 내부 구현 | counting, binary, 대기 큐 |
| 6-06 | 뮤텍스 내부 구현 | priority inheritance |
| 6-07 | 큐/메시지 패싱 | ISR-safe API, 복사 vs 포인터 |
| 6-08 | 이벤트 그룹 | 비트 플래그, AND/OR 대기 |
| 6-09 | 타이머 서비스 | software timer, tick hook |
| 6-10 | 메모리 관리 | heap_1/2/3/4/5, 정적 할당 |
| 6-11 | Tickless 모드 | 저전력, 타이머 보상 |
| 6-12 | ISR에서의 API 사용 | FromISR 함수, 지연 처리 |
| 6-13 | FreeRTOS 소스 분석 | 핵심 파일, 포팅 레이어 |
| 6-14 | Zephyr 소스 분석 | 커널, 드라이버 모델 |
| 6-15 | RTOS 포팅 | 포트 파일, 어셈블리 |
| 6-16 | RTOS 디버깅 | 스택 오버플로우, 데드락 탐지 |

---

### Part 7: Linux Embedded (14개)

Linux 기반 임베디드 시스템 개발을 다룹니다.

| # | 레시피 | 핵심 내용 |
|---|--------|----------|
| 7-01 | 임베디드 Linux 개요 | 부팅 과정, 컴포넌트 |
| 7-02 | 부트로더 (U-Boot) | 환경변수, 스크립트, 부팅 |
| 7-03 | Device Tree 기초 | 노드, 속성, 바인딩 |
| 7-04 | Device Tree 고급 | overlay, 런타임 수정 |
| 7-05 | 커널 빌드 | menuconfig, 모듈, 이미지 |
| 7-06 | 커널 모듈 기초 | init/exit, 파라미터, sysfs |
| 7-07 | 캐릭터 디바이스 드라이버 | file_operations, ioctl |
| 7-08 | Platform 드라이버 | probe/remove, 리소스 |
| 7-09 | 인터럽트 핸들링 | request_irq, threaded IRQ |
| 7-10 | DMA 엔진 | dma_request_channel, 매핑 |
| 7-11 | 메모리 매핑 | mmap, ioremap, 캐시 속성 |
| 7-12 | 루트 파일시스템 | Buildroot, Yocto 기초 |
| 7-13 | 시스템 최적화 | 부팅 시간, footprint 줄이기 |
| 7-14 | 보안 기초 | Secure Boot, 암호화 |

---

### Part 8: Performance & Memory (12개)

성능 분석과 메모리 관리의 핵심을 다룹니다.

| # | 레시피 | 핵심 내용 |
|---|--------|----------|
| 8-01 | 성능 분석 방법론 | 측정 → 분석 → 최적화 |
| 8-02 | 캐시 미스 분석 | L1/L2 미스, 프리페치 |
| 8-03 | 브랜치 예측 | misprediction, 힌트 |
| 8-04 | 메모리 정렬 | 정렬 요구사항, 패딩 |
| 8-05 | False Sharing | 캐시라인, 구조체 배치 |
| 8-06 | DMA 최적화 | scatter-gather, 더블 버퍼링 |
| 8-07 | 동적 메모리 관리 | 단편화, 풀 할당자 |
| 8-08 | 스택 분석 | 최대 깊이, 오버플로우 탐지 |
| 8-09 | 코드 크기 최적화 | -Os, 섹션 제거, LTO |
| 8-10 | 전력 최적화 | 클럭 게이팅, 저전력 모드 |
| 8-11 | 실시간 분석 | latency, jitter, WCET |
| 8-12 | 프로파일링 도구 | perf, ftrace, Trace Compass |

---

### Part 9: Debugging & Troubleshooting (12개)

실전 디버깅 기법을 체계적으로 정리합니다.

| # | 레시피 | 핵심 내용 |
|---|--------|----------|
| 9-01 | 디버깅 마인드셋 | 가설-검증 사이클 |
| 9-02 | JTAG/SWD 기초 | 프로브, 연결, 프로토콜 |
| 9-03 | GDB 활용 | 원격 디버깅, 스크립트 |
| 9-04 | 하드폴트 분석 | 레지스터, 스택 프레임 |
| 9-05 | UART 안 찍힐 때 | 체크리스트, 진단 순서 |
| 9-06 | 부팅 안 될 때 | 단계별 진단 |
| 9-07 | 인터럽트 문제 | 누락, 중복, 우선순위 |
| 9-08 | 메모리 문제 | 오버플로우, 댕글링, 오염 |
| 9-09 | 타이밍 문제 | 레이스, 데드락, 우선순위 역전 |
| 9-10 | 통신 문제 | 프로토콜 분석, 로직 애널라이저 |
| 9-11 | 로깅 시스템 설계 | 레벨, 버퍼, 비동기 |
| 9-12 | 포스트모템 분석 | 코어 덤프, 크래시 로그 |

---

### Part 10: FPGA & Accelerators (14개)

FPGA, 가속기, 이기종 시스템과의 통합을 다룹니다.

| # | 레시피 | 핵심 내용 |
|---|--------|----------|
| 10-01 | FPGA 기초 | LUT, FF, 블록 RAM, 클럭 |
| 10-02 | Xilinx Vivado 기초 | 프로젝트 생성, 합성, 구현 |
| 10-03 | Intel Quartus 기초 | Altera FPGA 개발 환경 |
| 10-04 | AXI 인터페이스 | AXI-Lite, AXI-Full, AXI-Stream |
| 10-05 | PS-PL 통신 (Zynq) | ARM + FPGA, AXI 인터커넥트 |
| 10-06 | PCIe 엔드포인트 | BAR, DMA, 인터럽트 |
| 10-07 | 메일박스 프로토콜 | 호스트-가속기 통신 |
| 10-08 | Command Queue 설계 | CQ/SQ 아키텍처, doorbell |
| 10-09 | DMA Completion | 완료 알림, 폴링 vs 인터럽트 |
| 10-10 | Virtual JTAG | JOP, Etherlink, 원격 디버깅 |
| 10-11 | HLS 기초 | High-Level Synthesis, 지시어 |
| 10-12 | HLS 최적화 | 파이프라인, 언롤링, 파티셔닝 |
| 10-13 | Xilinx Vitis AI | DPU, 모델 배포 |
| 10-14 | OpenCL on FPGA | Xilinx/Intel OpenCL 런타임 |

---

### Part 11: Edge AI & NPU (13개)

Edge AI와 NPU 활용을 다룹니다.

| # | 레시피 | 핵심 내용 |
|---|--------|----------|
| 11-01 | Edge AI 개요 | 클라우드 vs Edge, 제약 조건 |
| 11-02 | NPU 아키텍처 | ARM Ethos, Qualcomm Hexagon |
| 11-03 | 모델 양자화 | INT8, INT4, 정확도 trade-off |
| 11-04 | TensorRT 활용 | NVIDIA Jetson 최적화 |
| 11-05 | TFLite Micro | 초소형 MCU 추론 |
| 11-06 | ONNX Runtime | 크로스 플랫폼 추론 |
| 11-07 | 전처리/후처리 | 이미지, 텐서 변환 |
| 11-08 | Zero-copy 파이프라인 | 카메라 → NPU → 출력 |
| 11-09 | Thermal 관리 | 발열, 스로틀링 |
| 11-10 | 벤치마킹 | FPS, latency, 전력 측정 |
| 11-11 | 온디바이스 LLM | llama.cpp·GGML·MLX, 4/5/8-bit quantization, KV cache |
| 11-12 | TF-M·TrustZone | Cortex-M33/M55 secure firmware, PSA Certified |
| 11-13 | Matter·Thread | IoT 표준 프로토콜, OpenThread, 802.15.4 mesh |

---

## 학습 로드맵

### 입문자 (0-6개월)

**Part 1 (HW 기초) → Part 2 (프로세서) → Part 4 (Bare-Metal) → Part 5 (페리퍼럴)**

하드웨어와 프로세서 기초를 익힌 후, bare-metal과 페리퍼럴 제어로 실습합니다.

### 중급자 (6개월-2년)

**Part 3 (빌드) → Part 6 (RTOS) → Part 8 (성능) → Part 9 (디버깅)**

빌드 시스템을 이해하고, RTOS 내부를 공부하고, 성능 분석과 디버깅을 시작합니다.

### 고급자 (2년+)

**Part 7 (Linux) → Part 10 (FPGA) → Part 11 (Edge AI)**

Linux 드라이버 개발, FPGA/가속기 통합, Edge AI 배포를 익힙니다.

### FPGA/가속기 전문

**Part 10 (FPGA) → Part 8 (성능) → Part 11 (Edge AI)**

Xilinx/Intel FPGA, AXI 인터페이스, HLS, NPU 활용을 집중 학습합니다.

## 집필 원칙

1. **"왜"를 먼저 설명한다**: 동작 원리부터 시작합니다
2. **체계적으로 구성한다**: 기초 → 중급 → 고급 순서
3. **실제 코드를 보여준다**: 복사해서 바로 써볼 수 있는 예제
4. **트러블슈팅을 포함한다**: "안 될 때" 체크리스트
5. **아키텍처를 비교한다**: ARM vs RISC-V, FreeRTOS vs Zephyr

## 예제 환경

| 플랫폼 | 용도 |
|--------|------|
| STM32F4/F7/H7 | Cortex-M 실습 |
| Raspberry Pi | Cortex-A / Linux |
| ESP32-C3 | RISC-V 실습 |
| Xilinx Zynq | PS-PL 통합, AXI |
| Intel Cyclone/Arria | Quartus, PCIe |
| NVIDIA Jetson | Edge AI, TensorRT |
| QEMU | 에뮬레이션 |

특정 보드에 종속되지 않도록 **원리 중심**으로 설명합니다.

## 레퍼런스

**핵심 서적**
- *Computer Organization and Design (RISC-V Edition)* - Patterson & Hennessy
- *ARM System Developer's Guide* - Sloss, Symes, Wright
- *The Definitive Guide to ARM Cortex-M* - Joseph Yiu
- *Linux Device Drivers* (3rd ed) - Corbet, Rubini, Kroah-Hartman
- *Real-Time Concepts for Embedded Systems* - Qing Li
- *FPGA Prototyping by Verilog Examples* - Pong P. Chu

**공식 문서**
- ARM Architecture Reference Manual
- RISC-V Specifications
- FreeRTOS / Zephyr Documentation
- Linux Kernel Documentation
- Xilinx Vivado / Vitis Documentation
- Intel Quartus Documentation
- AMBA AXI Protocol Specification

**커뮤니티**
- Interrupt Blog (Memfault)
- Embedded Artistry
- LWN.net
- 임베디드 레시피 (recipes.tistory.com)
- Xilinx/AMD Developer Forums
- Intel FPGA Community

## 이 시리즈의 목표

이 시리즈를 완주하면:

- **시스템 전체를 이해**합니다 (하드웨어 ↔ 소프트웨어)
- **문제를 체계적으로 분석**할 수 있습니다
- **아키텍처 독립적으로 사고**할 수 있습니다
- **깊이 있는 기술 토론**에 참여할 수 있습니다
- **시니어 엔지니어로 성장**하는 기반을 갖춥니다

---

다음 글: [Part 1-01: 전자회로 기초](/blog/embedded/modern-recipes/part1-01-electronics-basics)
