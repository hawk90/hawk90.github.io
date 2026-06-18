#!/usr/bin/env node
// Rename Modern Embedded Recipes titles.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const DIR = join(REPO_ROOT, 'src', 'content', 'blog', 'embedded', 'modern-recipes');
const DRY = process.argv.includes('--dry-run');

// [seriesOrder, file, newTitle, day, minute]
const PLAN = [
  // Preface + Part 1 — 신호·하드웨어 기초 (2026-04-10)
  [  0, '00-preface.md',                       'Modern Embedded Recipes — 모던 임베디드 실전 레시피 시리즈 소개',                      '2026-04-10', 0],
  [  1, 'part1-01-digital-signal-basics.md',   '디지털 신호 기초 — Voltage Level·Edge·Setup/Hold 분석',                                 '2026-04-10', 1],
  [  2, 'part1-02-clock-timing.md',            '임베디드 클럭과 타이밍 — Skew·Jitter·PLL·MMCM 분석',                                    '2026-04-10', 2],
  [  3, 'part1-03-gpio-internals.md',          'GPIO 내부 구조 분해 — Push-Pull·Open-Drain·Schmitt Trigger',                            '2026-04-10', 3],
  [  4, 'part1-04-uart-hardware.md',           'UART 하드웨어 동작 분석 — Baud Rate·Framing·FIFO',                                       '2026-04-10', 4],
  [  5, 'part1-05-spi-hardware.md',            'SPI 하드웨어 분석 — Clock Mode·MOSI/MISO·Chip Select',                                  '2026-04-10', 5],
  [  6, 'part1-06-i2c-hardware.md',            'I2C 하드웨어 분석 — Open-Drain·Clock Stretching·Arbitration',                            '2026-04-10', 6],
  [  7, 'part1-07-adc-principles.md',          'ADC 동작 원리 — SAR·Sigma-Delta·Pipelined 비교',                                          '2026-04-10', 7],
  [  8, 'part1-08-dac-principles.md',          'DAC 동작 원리 — R-2R Ladder·Sigma-Delta·Settling Time',                                  '2026-04-10', 8],
  [  9, 'part1-09-pwm-signal.md',              'PWM 신호 생성 분석 — Duty·Frequency·Dead Time·Center-Aligned',                           '2026-04-10', 9],
  [ 10, 'part1-10-can-electrical.md',          'CAN 버스 전기적 특성 — Differential·Termination·Dominant/Recessive',                      '2026-04-10', 10],
  [ 11, 'part1-11-rs485-rs422.md',             'RS-485·RS-422 차동 신호 분석 — Termination·Biasing·Topology',                             '2026-04-10', 11],
  [ 12, 'part1-12-lvds-differential.md',       'LVDS 차동 신호 분석 — Common-Mode·Impedance·Eye Pattern',                                  '2026-04-10', 12],

  // Part 2 — ARM 아키텍처 (2026-04-11)
  [ 13, 'part2-01-cortex-m-comparison.md',     'ARM Cortex-M 시리즈 비교 — M0·M3·M4·M7·M33·M55 분석',                                    '2026-04-11', 13],
  [ 14, 'part2-02-cortex-a-comparison.md',     'ARM Cortex-A 시리즈 비교 — A53·A55·A72·A78·X1 분석',                                       '2026-04-11', 14],
  [ 15, 'part2-03-arm-registers.md',           'ARM 레지스터 구조 분석 — R0~R15·CPSR·SPSR·Banked Registers',                                '2026-04-11', 15],
  [ 16, 'part2-04-cortex-m-exceptions.md',     'Cortex-M 예외 처리 — Vector Table·NVIC·Tail-Chaining 추적',                                 '2026-04-11', 16],
  [ 17, 'part2-05-arm-memory-map.md',          'ARM 메모리 맵 분석 — Normal·Device·Strongly-Ordered Region',                                '2026-04-11', 17],
  [ 18, 'part2-06-arm-cache.md',               'ARM L1·L2 캐시 분석 — Set Associative·Inclusive·Maintenance',                                '2026-04-11', 18],
  [ 19, 'part2-07-arm-mpu.md',                 'ARM MPU 활용 — Region·Attribute·Privilege Separation',                                       '2026-04-11', 19],
  [ 20, 'part2-08-arm-mmu.md',                 'ARM MMU 기초 분석 — Translation Table·TLB·ASID',                                              '2026-04-11', 20],
  [ 21, 'part2-09-trustzone-m.md',             'ARM TrustZone-M 기초 — Secure/Non-Secure·NSC·MPC',                                            '2026-04-11', 21],
  [ 22, 'part2-10-memory-barrier.md',          'ARM Memory Barrier 실전 — DMB·DSB·ISB·DMA·MMIO',                                              '2026-04-11', 22],

  // Part 3 — 빌드 체인 (2026-04-12)
  [ 23, 'part3-01-cross-compiler.md',          '임베디드 크로스 컴파일러 분석 — GCC·Clang·Sysroot 구성',                                       '2026-04-12', 23],
  [ 24, 'part3-02-compile-pipeline.md',        'C 컴파일 4단계 — Preprocess·Compile·Assemble·Link 추적',                                       '2026-04-12', 24],
  [ 25, 'part3-03-elf-format.md',              'ELF 파일 구조 분석 — Section·Segment·Symbol Table·DWARF',                                       '2026-04-12', 25],
  [ 26, 'part3-04-linker-script-basics.md',    '링커 스크립트 기초 — SECTIONS·MEMORY·entry point',                                              '2026-04-12', 26],
  [ 27, 'part3-05-linker-script-advanced.md',  '링커 스크립트 고급 — Overlay·BSS·init_array·LMA/VMA',                                            '2026-04-12', 27],
  [ 28, 'part3-06-startup-code.md',            '임베디드 스타트업 코드 분석 — Reset_Handler·Vector Table·SystemInit',                            '2026-04-12', 28],
  [ 29, 'part3-07-c-runtime.md',               'C 런타임 crt0 분석 — Stack·BSS Zero·Data Copy·atexit',                                            '2026-04-12', 29],
  [ 30, 'part3-08-memory-layout.md',           '임베디드 메모리 레이아웃 — .text·.rodata·.data·.bss·.heap·.stack',                               '2026-04-12', 30],
  [ 31, 'part3-09-compiler-optimization.md',   '임베디드 컴파일러 최적화 분석 — -O0~-O3·-Os·-LTO 비교',                                          '2026-04-12', 31],
  [ 32, 'part3-10-map-file-analysis.md',       'Map 파일 분석 — Symbol·Section·Size 추적으로 코드 크기 진단',                                     '2026-04-12', 32],
  [ 33, 'part3-11-make-cmake-cross.md',        'Make·CMake 크로스 컴파일 — Toolchain File·Sysroot 통합',                                          '2026-04-12', 33],
  [ 34, 'part3-12-bootloader-chain.md',        '임베디드 Bootloader 체인 — BootROM·SPL·U-Boot·Kernel·Secure Boot',                                '2026-04-12', 34],

  // Part 4 — 베어메탈 드라이버 (2026-04-13)
  [ 35, 'part4-01-first-baremetal.md',         '첫 bare-metal 프로그램 작성 — Linker·Startup·main의 최소 구성',                                    '2026-04-13', 35],
  [ 36, 'part4-02-mmio-access.md',             'MMIO 레지스터 직접 접근 — volatile·Memory Map·Aliasing 분석',                                      '2026-04-13', 36],
  [ 37, 'part4-03-gpio-driver.md',             'GPIO 드라이버 직접 구현 — STM32 HAL 없이 레지스터로',                                              '2026-04-13', 37],
  [ 38, 'part4-04-clock-setup.md',             '임베디드 클럭 설정 분석 — HSE·PLL·SYSCLK·AHB/APB 분주',                                            '2026-04-13', 38],
  [ 39, 'part4-05-interrupt-handling.md',      'Cortex-M 인터럽트 핸들링 — NVIC·Priority·Vector·EXTI',                                              '2026-04-13', 39],
  [ 40, 'part4-06-systick-timer.md',           'SysTick 타이머 활용 — 24-bit Counter·1ms Tick·delay 구현',                                          '2026-04-13', 40],
  [ 41, 'part4-07-uart-driver.md',             'UART 드라이버 구현 — polling·interrupt·DMA 3가지 방식 비교',                                        '2026-04-13', 41],
  [ 42, 'part4-08-spi-driver.md',              'SPI 드라이버 구현 — Master·Slave·CRC·DMA',                                                            '2026-04-13', 42],
  [ 43, 'part4-09-i2c-driver.md',              'I2C 드라이버 구현 — Master·7-bit/10-bit·Clock Stretching 처리',                                       '2026-04-13', 43],
  [ 44, 'part4-10-dma-basics.md',              '임베디드 DMA 기초 — Memory-to-Memory·Peripheral·Circular Mode',                                       '2026-04-13', 44],
  [ 45, 'part4-11-low-power-modes.md',         '저전력 모드 분석 — Sleep·Stop·Standby·Wake-up Source',                                                '2026-04-13', 45],
  [ 46, 'part4-12-watchdog.md',                'IWDG·WWDG 워치독 구현 — Independent vs Window 비교',                                                  '2026-04-13', 46],
  [ 47, 'part4-13-flash-programming.md',       '임베디드 Flash 프로그래밍 — Erase·Program·Read While Write',                                          '2026-04-13', 47],
  [ 48, 'part4-14-ddr-init-failure.md',        'DDR 초기화 실패 진단 — Timing·Calibration·Walking Bit Test',                                          '2026-04-13', 48],

  // Part 5 — 페리페럴 활용 (2026-04-14)
  [ 49, 'part5-01-pwm-output.md',              'PWM 출력 실전 — LED 밝기·모터 속도 제어',                                                              '2026-04-14', 49],
  [ 50, 'part5-02-dc-motor.md',                'DC 모터 제어 — H-Bridge·PWM Duty·Encoder Feedback',                                                     '2026-04-14', 50],
  [ 51, 'part5-03-stepper-motor.md',           '스테퍼 모터 제어 — Full Step·Half Step·Microstepping',                                                  '2026-04-14', 51],
  [ 52, 'part5-04-servo-motor.md',             '서보 모터 제어 — PWM 1ms~2ms·Closed Loop·PID',                                                          '2026-04-14', 52],
  [ 53, 'part5-05-character-lcd.md',           'Character LCD 제어 — HD44780·4-bit Mode·Custom Char',                                                   '2026-04-14', 53],
  [ 54, 'part5-06-spi-oled.md',                'SPI OLED 제어 — SSD1306·Frame Buffer·Page 단위 갱신',                                                   '2026-04-14', 54],
  [ 55, 'part5-07-tft-display.md',             'TFT 디스플레이 구동 — RGB565·FSMC·LTDC·DMA2D',                                                          '2026-04-14', 55],
  [ 56, 'part5-08-environmental-sensors.md',   '환경 센서 활용 — BME280 온습압·SHT3x·BMP180 비교',                                                       '2026-04-14', 56],
  [ 57, 'part5-09-imu-sensor.md',              'IMU 센서 활용 — MPU6050·LSM6DSO·Sensor Fusion',                                                          '2026-04-14', 57],
  [ 58, 'part5-10-can-communication.md',       'CAN 통신 구현 — bxCAN·Filter·Mailbox·CAN-FD',                                                            '2026-04-14', 58],
  [ 59, 'part5-11-usb-device.md',              'USB Device 기초 — Descriptor·Enumeration·Endpoint·HID/CDC',                                              '2026-04-14', 59],
  [ 60, 'part5-12-ethernet-mac-phy.md',        'Ethernet MAC+PHY 통합 — RMII·lwIP·DMA Descriptor',                                                       '2026-04-14', 60],
  [ 61, 'part5-13-sd-card-fatfs.md',           'SD Card + FatFs 구현 — SPI/SDIO 모드·CSD/CID·Wear',                                                       '2026-04-14', 61],
  [ 62, 'part5-14-rtc-utilization.md',         'RTC 활용 — Calendar·Alarm·Wake-up Timer·Backup Domain',                                                  '2026-04-14', 62],

  // Part 6 — RTOS 활용 (2026-04-15)
  [ 63, 'part6-01-rtos-decision.md',           'RTOS 도입 결정 분석 — Super Loop vs RTOS 트레이드오프',                                                  '2026-04-15', 0],
  [ 64, 'part6-02-task-design.md',             'RTOS Task 설계 패턴 — 우선순위·스택·State Machine',                                                       '2026-04-15', 1],
  [ 65, 'part6-03-scheduler-internals.md',     'RTOS Scheduler 동작 분석 — Tick·Context Switch·Yield',                                                    '2026-04-15', 2],
  [ 66, 'part6-04-semaphore-usage.md',         'RTOS Semaphore 활용 — Binary·Counting·ISR Give',                                                          '2026-04-15', 3],
  [ 67, 'part6-05-mutex-usage.md',             'RTOS Mutex 활용 — Recursive·Priority Inheritance 적용',                                                   '2026-04-15', 4],
  [ 68, 'part6-06-queue-usage.md',             'RTOS Queue 활용 — By-Value·By-Reference·Timeout 패턴',                                                    '2026-04-15', 5],
  [ 69, 'part6-07-event-group.md',             'RTOS Event Group 활용 — Bit Wait·Sync·Notify',                                                            '2026-04-15', 6],
  [ 70, 'part6-08-software-timer.md',          'RTOS Software Timer 활용 — One-shot·Auto-reload·Daemon Task',                                             '2026-04-15', 7],
  [ 71, 'part6-09-isr-api.md',                 'ISR-Safe API 설계 — Reentrant·Atomic·Defer 패턴',                                                          '2026-04-15', 8],
  [ 72, 'part6-10-priority-inversion.md',      'Priority Inversion 진단·예방 — Mars Pathfinder Lesson 추적',                                              '2026-04-15', 9],
  [ 73, 'part6-11-timer-services.md',          'Timer Wheel 분석 — Hashed·Hierarchical·O(1) Tick',                                                        '2026-04-15', 10],
  [ 74, 'part6-12-rtos-debugging.md',          'RTOS 디버깅 기법 — Tracealyzer·SystemView·Stack 추적',                                                    '2026-04-15', 11],

  // Part 7 — 임베디드 리눅스 (2026-04-16)
  [ 75, 'part7-01-linux-boot-flow.md',         '임베디드 Linux 부팅 흐름 분석 — BootROM·U-Boot·Kernel·init',                                              '2026-04-16', 0],
  [ 76, 'part7-02-uboot-usage.md',             'U-Boot 활용 — bootcmd·env·tftp·boot.scr 분석',                                                            '2026-04-16', 1],
  [ 77, 'part7-03-device-tree-basics.md',      'Device Tree 실전 — DTS·DTB·Overlay·Phandle 추적',                                                          '2026-04-16', 2],
  [ 78, 'part7-04-device-tree-overlay.md',     'Device Tree Overlay 적용 — Runtime fragment·dtoverlay',                                                  '2026-04-16', 3],
  [ 79, 'part7-05-kernel-build.md',            '임베디드 커널 빌드 — defconfig·menuconfig·Image·zImage',                                                   '2026-04-16', 4],
  [ 80, 'part7-06-kernel-module.md',           '커널 모듈 기초 — init/exit·Parameter·KBuild·DKMS',                                                          '2026-04-16', 5],
  [ 81, 'part7-07-char-driver.md',             '캐릭터 드라이버 작성 — file_operations·cdev·register_chrdev',                                              '2026-04-16', 6],
  [ 82, 'part7-08-platform-driver.md',         'Platform 드라이버 작성 — probe·remove·of_match·DT 바인딩',                                                  '2026-04-16', 7],
  [ 83, 'part7-09-mmap.md',                    'mmap 4가지 모드 — Anonymous·File·Shared·Huge Page',                                                        '2026-04-16', 8],
  [ 84, 'part7-10-epoll.md',                   'epoll 실전 — LT·ET·ONESHOT·EXCLUSIVE 비교',                                                                '2026-04-16', 9],
  [ 85, 'part7-11-uio-vfio.md',                'UIO·VFIO 분석 — User-Space Driver와 IOMMU 격리',                                                           '2026-04-16', 10],
  [ 86, 'part7-12-sysfs.md',                   'sysfs·configfs 활용 — kobject 기반 User 인터페이스',                                                       '2026-04-16', 11],
  [ 87, 'part7-13-irq-affinity.md',            'IRQ Affinity 튜닝 — smp_affinity·isolcpus·irqbalance',                                                     '2026-04-16', 12],
  [ 88, 'part7-14-rootfs-buildroot.md',        '루트 파일시스템 구축 — Buildroot 기초·Package·Toolchain',                                                  '2026-04-16', 13],

  // Part 8 — 메모리·성능 최적화 (2026-04-17)
  [ 89, 'part8-01-dynamic-memory.md',          '임베디드 동적 메모리 — malloc 위험·결정성·대안 분석',                                                       '2026-04-17', 0],
  [ 90, 'part8-02-memory-alignment.md',        '메모리 정렬과 패딩 분석 — Natural·Strict Alignment·Trap',                                                  '2026-04-17', 1],
  [ 91, 'part8-03-cache-alignment.md',         'Cache Line Alignment — alignas·Padding·SoA 적용',                                                          '2026-04-17', 2],
  [ 92, 'part8-04-dma-allocator.md',           'DMA-Friendly Allocator — dma_alloc_coherent·IOMMU·Pool',                                                  '2026-04-17', 3],
  [ 93, 'part8-05-zero-copy.md',               'Zero-Copy Pipeline — DMA-BUF·sendfile·io_uring·splice',                                                   '2026-04-17', 4],
  [ 94, 'part8-06-numa.md',                    'NUMA Memory Topology — numactl·numa_alloc·HBM 적용',                                                       '2026-04-17', 5],
  [ 95, 'part8-07-simd.md',                    'SIMD 활용 분석 — Intrinsics·Auto-Vectorization·OpenMP SIMD',                                                '2026-04-17', 6],
  [ 96, 'part8-08-neon.md',                    'ARM NEON 심화 — Matrix Multiply·FFT·Image Filter 적용',                                                    '2026-04-17', 7],
  [ 97, 'part8-09-stack-analysis.md',          '임베디드 스택 분석 — high-water·overflow 탐지',                                                              '2026-04-17', 8],
  [ 98, 'part8-10-code-size-optimization.md',  '임베디드 코드 크기 최적화 — -Os·LTO·Section Garbage Collection',                                            '2026-04-17', 9],
  [ 99, 'part8-11-power-optimization.md',      '임베디드 전력 최적화 — Sleep Mode·Clock Gating·DVFS',                                                       '2026-04-17', 10],
  [100, 'part8-12-wcet-analysis.md',           'WCET 분석 기법 — Static·Measurement·Hybrid 방법론',                                                         '2026-04-17', 11],

  // Part 9 — 동시성 (2026-04-18)
  [101, 'part9-01-lock-free-ring.md',          'Lock-Free Ring Buffer 구현 — SPSC·Power-of-2·Memory Order',                                                '2026-04-18', 0],
  [102, 'part9-02-wait-free.md',               'Wait-Free Signaling — Atomic Flag·Sequence·Latest-Value',                                                  '2026-04-18', 1],
  [103, 'part9-03-rcu-basics.md',              'RCU (Read-Copy-Update) 기초 — Quiescent State·Grace Period',                                                '2026-04-18', 2],
  [104, 'part9-04-hazard-pointer.md',          'Hazard Pointer 분석 — Lock-Free Memory Reclamation',                                                       '2026-04-18', 3],
  [105, 'part9-05-cas-patterns.md',            'Compare-And-Swap 패턴 — Stack·Counter·Linked List 적용',                                                    '2026-04-18', 4],
  [106, 'part9-06-atomic-cost.md',             'Atomic Operation 비용 분석 — Fence·Cache Line·Contention',                                                  '2026-04-18', 5],
  [107, 'part9-07-spinlock-vs-mutex.md',       'Spinlock vs Mutex 결정 가이드 — Context Switch·Hold Time',                                                  '2026-04-18', 6],
  [108, 'part9-08-aba-problem.md',             'ABA 문제 회피 — Tagged Pointer·Hazard·Generation Counter',                                                 '2026-04-18', 7],
  [109, 'part9-09-false-sharing.md',           'False Sharing 해결 — Cache Line Padding·SoA 적용',                                                          '2026-04-18', 8],
  [110, 'part9-10-mpmc-queue.md',              'MPMC Queue 구현 — Multi-producer Multi-consumer Lock-Free',                                                '2026-04-18', 9],

  // Part 10 — 디버깅 (2026-04-19)
  [111, 'part10-01-debug-mindset.md',          '임베디드 디버깅 마인드셋 — 가설·격리·재현·이분탐색',                                                       '2026-04-19', 0],
  [112, 'part10-02-jtag-swd.md',               'JTAG·SWD 안 붙을 때 — 핀·전압·속도·세션 진단',                                                              '2026-04-19', 1],
  [113, 'part10-03-gdb-remote-debug.md',       'GDB 원격 디버깅 — OpenOCD·J-Link·target remote 구성',                                                       '2026-04-19', 2],
  [114, 'part10-04-hardfault-analysis.md',     'Cortex-M 하드폴트 분석 — Stacked Frame·CFSR 읽기',                                                          '2026-04-19', 3],
  [115, 'part10-05-uart-not-printing.md',      'UART 안 찍힐 때 — Bare-metal 체크리스트',                                                                    '2026-04-19', 4],
  [116, 'part10-06-boot-failure.md',           '임베디드 부팅 실패 진단 — 단계별 Isolation',                                                                 '2026-04-19', 5],
  [117, 'part10-07-interrupt-debugging.md',    '인터럽트 누락·중복 진단 — Priority·Pending·Re-entry 추적',                                                  '2026-04-19', 6],
  [118, 'part10-08-memory-corruption.md',      '메모리 오버플로우·오염 진단 — Canary·MPU·Pattern 분석',                                                     '2026-04-19', 7],
  [119, 'part10-09-timing-race-diag.md',       '타이밍·Race 진단 — Heisenbug 잡는 법',                                                                       '2026-04-19', 8],
  [120, 'part10-10-protocol-analyzer.md',      '통신 프로토콜 분석 — Logic Analyzer와 Protocol Decoder',                                                    '2026-04-19', 9],
  [121, 'part10-11-logging-system.md',         '임베디드 로깅 시스템 설계 — 레벨·버퍼·SWO·Deferred',                                                        '2026-04-19', 10],
  [122, 'part10-12-postmortem-analysis.md',    '임베디드 포스트모템 분석 — Core Dump와 Field Crash',                                                        '2026-04-19', 11],

  // Part 11 — FPGA·PCIe·AXI (2026-04-20)
  [123, 'part11-01-fpga-basics.md',            'FPGA 기초 분석 — LUT·FF·BRAM·DSP 자원 구조',                                                                '2026-04-20', 0],
  [124, 'part11-02-vivado-usage.md',           'Vivado 사용법 — Project·Constraint·Synth·Impl·Bitstream',                                                  '2026-04-20', 1],
  [125, 'part11-03-pcie-bar.md',               'PCIe BAR 매핑 분석 — Config Space·Enumeration·MMIO 접근',                                                    '2026-04-20', 2],
  [126, 'part11-04-axi.md',                    'AXI 인터페이스 — AXI4·AXI4-Lite·AXI-Stream 비교',                                                            '2026-04-20', 3],
  [127, 'part11-05-ps-pl-communication.md',    'Zynq PS-PL 통신 — GP·HP·ACP 인터페이스 선택',                                                                '2026-04-20', 4],
  [128, 'part11-06-mailbox.md',                'Mailbox Protocol 분석 — Host와 Accelerator를 잇는 Doorbell',                                                 '2026-04-20', 5],
  [129, 'part11-07-cq-sq.md',                  'Command Queue·Submission Queue — NVMe·XDMA 공통 패턴',                                                       '2026-04-20', 6],
  [130, 'part11-08-dma-completion.md',         'DMA Completion 메커니즘 — Interrupt·Polling·Completion Ring',                                                '2026-04-20', 7],
  [131, 'part11-09-pcie-streaming.md',         'PCIe Streaming 분석 — BAR Type·MSI-X·Kernel Bypass',                                                         '2026-04-20', 8],
  [132, 'part11-10-hls.md',                    'Vitis HLS 분석 — Pragma·Pipeline II·Dataflow 실전 감각',                                                     '2026-04-20', 9],
  [133, 'part11-11-hls-optimization.md',       'HLS 최적화 기법 — Pipeline·Unroll·Partition·Dataflow',                                                       '2026-04-20', 10],
  [134, 'part11-12-vitis-ai.md',               'Vitis AI 분석 — DPU·xmodel·VART',                                                                            '2026-04-20', 11],
  [135, 'part11-13-opencl-fpga.md',            'OpenCL on FPGA — Kernel·Channel·Burst Memory 분석',                                                          '2026-04-20', 12],
  [136, 'part11-14-intel-quartus.md',          'Intel Quartus 사용법 — Platform Designer·Nios II·HLS',                                                       '2026-04-20', 13],

  // Part 12 — Edge AI·IoT (2026-04-21)
  [137, 'part12-01-edge-inference.md',         'Edge Inference 분석 — Cloud vs Edge·Latency·Privacy',                                                       '2026-04-21', 0],
  [138, 'part12-02-npu-architecture.md',       'NPU 아키텍처 분석 — Ethos·Hexagon·Systolic Array 비교',                                                     '2026-04-21', 1],
  [139, 'part12-03-quantization.md',           '딥러닝 Quantization 분석 — PTQ·QAT·INT8·INT4·Calibration',                                                  '2026-04-21', 2],
  [140, 'part12-04-tensorrt.md',               'TensorRT 분석 — ONNX→Engine·FP16·INT8·DLA·Multi-Stream',                                                    '2026-04-21', 3],
  [141, 'part12-05-tflite-micro.md',           'TFLite Micro 분석 — Op Resolver·Tensor Arena·Cortex-M',                                                     '2026-04-21', 4],
  [142, 'part12-06-onnx-runtime.md',           'ONNX Runtime 분석 — Execution Provider와 Cross-Platform 배포',                                                '2026-04-21', 5],
  [143, 'part12-07-thermal.md',                'Edge Thermal Management — Throttling·DVFS·Fan Curve·Sustained',                                              '2026-04-21', 6],
  [144, 'part12-08-jetson.md',                 'NVIDIA Jetson 분석 — Nano·Xavier·Orin·Thor·JetPack·DLA·VPI',                                                  '2026-04-21', 7],
  [145, 'part12-09-zero-copy-camera.md',       'Zero-Copy Camera Pipeline — V4L2·DMA-BUF·GPU Import·NPU 직결',                                               '2026-04-21', 8],
  [146, 'part12-10-on-device-llm.md',          '온디바이스 LLM 추론 — llama.cpp·GGUF·MLX·KV Cache·NPU Backend',                                              '2026-04-21', 9],
  [147, 'part12-11-tfm-trustzone.md',          'Cortex-M33 TF-M·TrustZone — Secure Firmware·PSA·MCUboot',                                                   '2026-04-21', 10],
  [148, 'part12-12-matter-thread.md',          'Matter·Thread 분석 — IoT 통합 표준·Commissioning·Multi-Fabric',                                              '2026-04-21', 11],
];

function fmt(day, minute) {
  return `${day}T09:${minute.toString().padStart(2, '0')}:00`;
}

function applyEdit(filePath, newTitle, newDate) {
  const raw = readFileSync(filePath, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`no frontmatter: ${filePath}`);
  const [, fm, body] = m;

  let newFm = fm;
  newFm = newFm.replace(/^title:\s*.*$/m, `title: "${newTitle}"`);
  newFm = newFm.replace(/^date:\s*.*$/m, `date: ${newDate}`);

  if (!/^title:/m.test(newFm) || !/^date:/m.test(newFm)) {
    throw new Error(`missing title/date after replace: ${filePath}`);
  }

  const out = `---\n${newFm}\n---\n${body}`;
  if (!DRY) writeFileSync(filePath, out);
}

let count = 0;
for (const [order, file, title, day, minute] of PLAN) {
  const path = join(DIR, file);
  const date = fmt(day, minute);
  if (count < 3 || count >= PLAN.length - 3) {
    console.log(`[${order.toString().padStart(3)}] ${file}`);
    console.log(`     → ${title}`);
    console.log(`     → date: ${date}`);
  } else if (count === 3) {
    console.log('     ...');
  }
  applyEdit(path, title, date);
  count++;
}
console.log(`\n${DRY ? 'DRY RUN' : 'APPLIED'}: ${count} files`);
