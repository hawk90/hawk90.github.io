---
title: "Ch 2: RISC-V 코어 — RV32IMC + PMP + 인터럽트 컨트롤러"
date: 2026-05-01T02:00:00
description: "ESP32-C3 코어의 ISA·특권 모델·인터럽트. 32-bit IMC, M-mode only, PMP 16 entries."
series: "ESP32-C3 Mastering"
seriesOrder: 2
tags: [riscv, isa, pmp, interrupt, esp32-c3]
draft: false
---

## 한 줄 요약

> **"C3의 코어는 M-mode만 도는 RV32IMC + PMP 16 entries + Espressif 자체 인터럽트 컨트롤러입니다."** 표준 RISC-V CLINT/PLIC 대신, *Xtensa 시절의 인터럽트 매트릭스*를 그대로 가져와 *RISC-V에 맞춰 재설계*한 변형 CLIC가 들어 있습니다.

ESP-IDF가 가려 두는 부분이 *정확히 이 장의 주제*입니다. C에서 보이는 코어는 *그냥 32-bit MCU*지만, 부트로더·인터럽트 진입·PMP 설정·secure boot에서는 *RISC-V 특권 모델을 직접 만져야* 합니다. 이 장에서는 *꼭 알아야 하는 만큼*의 RISC-V를 정리합니다.

깊이는 *ESP-IDF 사용자가 부트 시퀀스를 읽고 인라인 어셈블리를 짤 수 있는 수준*까지입니다. RISC-V 사양 전체를 다루지는 않습니다. 그건 별도 시리즈로 떼어 둡니다.

## RV32IMC — 무엇이 들어 있나

C3 코어가 지원하는 명령어 집합은 *RV32IMC* 한 줄로 끝납니다. 무엇이 들어 있는지 풀어 봅니다.

| 확장 | 의미 | 명령어 수 | 비고 |
|------|------|----------|------|
| I | Base integer (32-bit) | 약 40개 | LW/SW, ADD/SUB, BEQ/BNE 등 |
| M | Multiplication & division | 8개 | MUL, MULH, DIV, REM 등 |
| C | Compressed (16-bit) | 약 30개 | 코드 크기 ~25% 감소 |

C3에 *없는 것*도 분명히 해 둡니다.

```text
없음 — A (atomic)         → LR/SC, AMO 없음
없음 — F/D (float)        → 하드웨어 FPU 없음, soft-float
없음 — Zicsr 외 CSR 확장   → 표준 Zicsr는 있음
없음 — U-mode (user mode)  → M-mode only
없음 — S-mode (supervisor) → MMU 없음, OS-class 칩이 아님
없음 — V (vector)          → SIMD 없음
```

*atomic 없음*은 주의할 점입니다. FreeRTOS의 atomic primitive는 *인터럽트 mask*로 흉내냅니다. *진짜 LR/SC*가 없으니 멀티코어 SMP는 처음부터 *불가능*합니다(어차피 single-core이지만).

*FPU 없음*은 컴파일 옵션에 영향을 줍니다. `float`/`double` 연산이 *모두 라이브러리 호출*로 펼쳐집니다. 성능이 필요하면 *fixed-point* 또는 *정수 산술*로 가야 합니다.

### Compressed 명령어가 만드는 것

C 확장은 *자주 쓰는 명령어의 16-bit 버전*입니다. 코드가 작아지고 *I-cache 미스가 줄어듭니다*.

```asm
# 일반 32-bit 명령
addi a0, a0, 1            # 0x00150513 (4 bytes)
sw   a0, 0(sp)            # 0x00a12023 (4 bytes)

# Compressed 16-bit 명령
c.addi a0, 1              # 0x0505 (2 bytes)
c.sw   a0, 0(sp)          # 0xc02a (2 bytes)
```

GCC는 `-march=rv32imc`로 기본 사용합니다. 디스어셈블리에서 `c.` prefix가 보이면 compressed입니다.

## 특권 모델 — M-mode only

RISC-V는 *M (machine)*, *S (supervisor)*, *U (user)* 세 단계를 정의하지만, C3는 *M-mode만 구현*합니다. 모든 코드가 *최고 권한*에서 돕니다.

```text
RISC-V privilege levels
  M-mode  ← C3는 이것만
  S-mode  ← Linux 같은 OS가 사용 (C3에 없음)
  U-mode  ← user app (C3에 없음)
```

장단점이 분명합니다.

**장점**
- 특권 전환 오버헤드 없음 (ECALL 트랩 없음)
- 메모리 보호는 PMP로 충분
- 칩 면적·전력 절감

**단점**
- "user mode"에서 코드를 격리할 수 없음
- 일부 보안 시나리오에서 sandboxing 불가

ARMv7-M의 thread/handler mode 구분과 *비슷한 단순함*입니다. 실시간 MCU에서는 흔한 선택입니다.

## CSR — Control and Status Registers

CSR은 코어의 *제어판*입니다. 인터럽트 enable, trap 핸들러 주소, PMP, cycle counter 등이 모두 CSR로 노출됩니다. CSR 접근은 *전용 명령어*로 합니다.

```asm
# CSR 읽기/쓰기 원자 명령
csrrw rd, csr, rs1     # rd ← csr, csr ← rs1
csrrs rd, csr, rs1     # rd ← csr, csr ← csr | rs1   (Set bits)
csrrc rd, csr, rs1     # rd ← csr, csr ← csr & ~rs1  (Clear bits)
```

C3에 있는 주요 CSR입니다.

| CSR | 주소 | 의미 |
|-----|------|------|
| `mstatus` | 0x300 | global 인터럽트 enable, privilege |
| `misa` | 0x301 | 구현된 ISA 비트맵 (RV32IMC) |
| `mie` | 0x304 | 인터럽트별 enable mask |
| `mtvec` | 0x305 | trap vector 베이스 주소 |
| `mscratch` | 0x340 | trap handler temp 저장소 |
| `mepc` | 0x341 | trap 발생 시 PC |
| `mcause` | 0x342 | trap 원인 |
| `mtval` | 0x343 | trap 부가 정보 (잘못된 주소 등) |
| `mip` | 0x344 | 인터럽트 pending 비트 |
| `pmpcfg0~3` | 0x3A0~0x3A3 | PMP 설정 (4 entries per CSR) |
| `pmpaddr0~15` | 0x3B0~0x3BF | PMP base address |
| `mcycle` | 0xB00 | cycle counter (low 32) |
| `mcycleh` | 0xB80 | cycle counter (high 32) |
| `minstret` | 0xB02 | 실행된 instruction 수 |

### 인라인 어셈블리로 CSR 읽기

ESP-IDF에서 cycle counter를 읽는 *가장 짧은 방법*입니다.

```c
static inline uint32_t read_mcycle(void) {
    uint32_t cycles;
    asm volatile ("csrr %0, mcycle" : "=r"(cycles));
    return cycles;
}

static inline void disable_interrupts(void) {
    asm volatile ("csrci mstatus, 0x8");   // MIE bit clear
}

static inline void enable_interrupts(void) {
    asm volatile ("csrsi mstatus, 0x8");   // MIE bit set
}
```

`csrr`은 `csrrs rd, csr, x0`의 축약입니다. `csrci`/`csrsi`는 *5-bit immediate*로 설정/해제를 한 번에 합니다.

### `mcause` 디코딩

trap이 발생하면 `mcause`에 *원인*이 담깁니다.

```text
mcause[31]     Interrupt (1) or Exception (0)
mcause[30:0]   원인 코드

예시:
  0x00000002   Illegal instruction
  0x00000005   Load access fault
  0x80000007   Machine timer interrupt
  0x8000001F   External interrupt (Espressif custom)
```

ESP-IDF의 `panic_handler.c`가 이 값을 읽어 *crash 메시지*를 출력합니다.

## PMP — Physical Memory Protection

PMP는 *코드/데이터 영역마다 R/W/X 권한*을 정합니다. ARM의 MPU와 *기능적으로 동일*하되 *설정 방식*이 다릅니다.

### Entry 구조

PMP entry (총 16개) — `pmpcfgN` 8 bit + `pmpaddrN` 32 bit:

![PMP Entry — pmpcfg + pmpaddr](/images/blog/esp32-c3/diagrams/ch02-pmp-entry.svg)

A field (address matching mode):

| 값 | 모드 | 의미 |
|----|------|------|
| `00` | OFF | 엔트리 사용 안 함 |
| `01` | TOR | Top-Of-Range — 이전 entry의 addr ~ 현재 addr |
| `10` | NA4 | Naturally Aligned 4-byte |
| `11` | NAPOT | Naturally Aligned Power-Of-Two |

`pmpcfg0` 한 CSR이 *entry 0~3의 cfg 4개*를 담고, `pmpcfg1`이 4~7, ... `pmpcfg3`이 12~15를 담습니다.

### NAPOT으로 영역 지정

NAPOT은 *주소 + 크기를 한 32-bit 워드*에 인코딩합니다.

```text
영역 0x40000000~0x4000FFFF (64 KB) 를 read-only로 보호:

pmpaddr0 = (0x40000000 >> 2) | ((0x10000 - 1) >> 3)
         = 0x10000000 | 0x1FFF
         = 0x10001FFF

pmpcfg0 byte0 = A=NAPOT(0b11) | X=0 | W=0 | R=1
             = 0b00011001
             = 0x19
```

### 인라인 어셈블리로 PMP 설정

ESP-IDF의 secure boot가 비슷한 작업을 *부트로더 단계*에서 합니다.

```c
static void set_pmp_region0_readonly(void) {
    // 0x40000000~0x4000FFFF read-only
    uint32_t addr = (0x40000000 >> 2) | (0xFFFF >> 3);
    uint32_t cfg  = 0x19;   // NAPOT | R

    asm volatile ("csrw pmpaddr0, %0" : : "r"(addr));
    asm volatile ("csrrs x0, pmpcfg0, %0" : : "r"(cfg));
}
```

쓰기 시도 시 *load/store access fault*가 발생하며 panic handler로 진입합니다.

> **메모**: PMP의 `L` 비트(Lock)를 set하면 *다음 reset까지* 그 엔트리를 *수정할 수 없습니다*. secure boot에서 *bootloader 영역 보호*에 사용합니다.

## 인터럽트 컨트롤러 — Espressif CLIC 변형

표준 RISC-V는 *PLIC*(Platform-Level Interrupt Controller)을 정의하지만, Espressif는 *Xtensa 시절의 인터럽트 매트릭스*를 RISC-V에 *그대로 가져왔습니다*. CLIC(Core Local Interrupt Controller)와 *비슷하지만 호환되지 않는* 자체 구현입니다.

### 구조

```text
ESP32-C3 인터럽트 구조
  31개의 외부 인터럽트 소스
       ↓
  Interrupt Matrix (CPU INT 매핑)
       ↓
  CPU INT 0~30 (vectored 또는 single)
       ↓
  RV32 trap vector
```

특이한 점은 *어떤 페리퍼럴 인터럽트가 어떤 CPU INT 번호가 될지*를 *런타임에 설정*한다는 것입니다. ESP-IDF의 `esp_intr_alloc()`이 이를 자동 처리합니다.

### `esp_intr_alloc` 예시

```c
#include "esp_intr_alloc.h"
#include "driver/timer.h"

static void IRAM_ATTR my_isr(void *arg) {
    // ISR 본문
}

void setup_timer_isr(void) {
    esp_intr_alloc(
        ETS_TG0_T0_LEVEL_INTR_SOURCE,   // 페리퍼럴 인터럽트 소스
        ESP_INTR_FLAG_LEVEL3 | ESP_INTR_FLAG_IRAM,
        my_isr,
        NULL,
        NULL
    );
}
```

`ESP_INTR_FLAG_IRAM`은 *ISR 본문이 IRAM에 위치*하도록 강제합니다. flash 캐시 미스가 발생해도 ISR이 *지연 없이 실행*됩니다.

### 인터럽트 우선순위

```text
CPU INT priority levels (1~7, 높을수록 우선)
  Level 1~3   일반 ISR
  Level 4~5   고우선 ISR (FreeRTOS critical section 위)
  Level 6     예약 (NMI 유사)
  Level 7     non-maskable (디버거)
```

C로 작성하는 ISR은 *Level 1~3*까지만 가능합니다. Level 4 이상은 *어셈블리로 작성*해야 합니다(FreeRTOS API 호출 불가).

## 부트 시퀀스 — 어디서 어디로 가는가

C3의 부트는 *3단계*입니다.

**1. ROM Bootloader (0x40000000)**

- 칩에 내장된 immutable 코드
- SPI flash에서 2nd-stage bootloader 로드
- secure boot 검증 (활성화 시)

**2. 2nd-stage Bootloader (flash 0x0000)**

- ESP-IDF가 빌드한 코드
- 파티션 테이블 읽기
- factory 또는 ota_N 파티션 선택
- application 로드 + 검증
- PMP 초기 설정

**3. Application**

- app_main() 호출
- FreeRTOS 시작

PMP는 *2단계*에서 설정되어 *application 시작 시점에는 이미 활성*입니다. application 코드가 부트로더 영역에 *쓰기 시도*하면 즉시 trap이 발생합니다.

## 자주 하는 실수

### "인라인 어셈블리에서 `csrr`이 컴파일 에러"

`-march=rv32imc`만으로는 *Zicsr*가 활성화되지 않는 GCC 버전이 있습니다. `-march=rv32imc_zicsr`로 명시하거나 ESP-IDF 기본 옵션을 그대로 둡니다.

### "PMP 설정 후 즉시 fault"

`pmpcfg`를 *먼저 쓰면* 안 됩니다. `pmpaddr`를 먼저 *유효한 값*으로 쓰고 그 다음 `pmpcfg`의 `A` 필드를 *NAPOT/TOR로 활성화*해야 합니다. 순서가 바뀌면 *현재 PC*가 보호 영역 밖으로 떨어져 즉시 trap합니다.

### "FreeRTOS 안에서 `mcycle`이 자꾸 0으로 리셋된다"

`mcycle`은 *CPU local* counter이지만, ESP-IDF의 *light-sleep 진입/탈출* 시점에 *재설정될 수 있습니다*. 절대 시간이 필요하면 `esp_timer_get_time()`을 쓰고, *정밀 cycle count*는 `mcycle`을 쓰되 *sleep을 피합니다*.

### "Level 4+ ISR에서 printf가 안 나온다"

Level 4 이상은 *FreeRTOS API 호출 금지*입니다. `printf`는 내부적으로 mutex를 잡으므로 deadlock입니다. *어셈블리 minimal handler*에서 *flag만 set*하고 나머지를 deferred task로 넘기는 패턴을 씁니다.

### "C++ exception이 안 잡힌다"

ESP-IDF는 *기본적으로 -fno-exceptions*입니다. `menuconfig`에서 활성화 가능하지만 *코드 크기가 크게 증가*합니다. 보통 비활성 유지하고 `expected<T, E>` 또는 `esp_err_t` 기반 에러 전달을 씁니다.

## 정리

- C3 코어는 *RV32IMC + Zicsr + PMP 16 entries* 구성으로, *M-mode only*이며 U/S-mode와 atomic·FPU·vector 확장은 *없습니다*.
- CSR 접근은 `csrr`/`csrw`/`csrrs`/`csrrc` 전용 명령어로 수행하며, `mstatus`·`mcause`·`mtvec`·`pmpcfgN`·`pmpaddrN`이 자주 만지는 레지스터입니다.
- PMP는 *NAPOT·TOR·NA4* 매칭 모드로 영역을 정의하고 *R/W/X + L* 비트로 권한을 지정하며, secure boot에서 부트로더 영역을 *Lock*합니다.
- 인터럽트는 *표준 PLIC가 아닌* Espressif 자체 매트릭스로, 31개 외부 소스를 *런타임에 CPU INT*에 매핑하며 `esp_intr_alloc()`이 자동 처리합니다.
- Level 4 이상 고우선 ISR은 *어셈블리로 작성*해야 하고 *FreeRTOS API 호출 금지*입니다.
- 부트 시퀀스는 *ROM → 2nd-stage bootloader → application* 3단계이며 PMP는 *2단계에서 활성*됩니다.
- ESP-IDF 사용자는 *대부분 ISA를 몰라도 무방*하지만 *인라인 어셈블리·secure boot·panic 해석*에서 RISC-V 지식이 필요합니다.

다음 편은 **Ch 3: 메모리 맵·플래시·SPIFFS/LittleFS**입니다. *400 KB SRAM과 4 MB flash*가 *어떻게 영역으로 나뉘는지*, 파티션 테이블과 OTA 동작을 다룹니다.

## 관련 항목

- [Ch 1: ESP32-C3 — 왜 RISC-V로 갈아탔나](/blog/embedded/riscv/esp32-c3-mastering/chapter01-overview)
- [Ch 3: 메모리 맵·플래시·SPIFFS/LittleFS](/blog/embedded/riscv/esp32-c3-mastering/chapter03-memory-flash)
- [Ch 11: 보안·Secure Boot](/blog/embedded/riscv/esp32-c3-mastering/chapter11-secure-boot) — PMP Lock 비트 활용
- [Practical RTOS Internals Part 2.3: 인터럽트 모델](/blog/embedded/rtos/practical-internals/part2-03-interrupt-model)
- [Modern Embedded Recipes Part 3.5: 인라인 어셈블리](/blog/embedded/modern-recipes/part3-05-inline-assembly)
- [원문 — RISC-V Privileged Spec](https://riscv.org/technical/specifications/)
- [원문 — ESP32-C3 Technical Reference Manual](https://www.espressif.com/sites/default/files/documentation/esp32-c3_technical_reference_manual_en.pdf)
