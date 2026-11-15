---
title: "ESP32-C3 RISC-V 코어 분석 — RV32IMC·PMP·인터럽트 컨트롤러"
slug: "embedded/riscv/esp32-c3-mastering/chapter02-riscv-core"
date: 2026-05-20T09:02:00
description: "ESP32-C3의 RV32IMC·M/U-mode·PMP와 인터럽트 매트릭스를 ESP-IDF v5.4.2 소스로 대조합니다."
series: "ESP32-C3 Mastering"
seriesOrder: 2
tags: [risc-v, isa, pmp, interrupt, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **C3의 하드웨어 특권 지원과 ESP-IDF application이 실제 실행하는 모드를 구분합니다.** CPU는 M/U-mode를 지원하지만 보통의 ESP-IDF application을 task별 U-mode sandbox로 자동 분리한다는 뜻은 아닙니다.

이 장은 ESP-IDF v5.4.2 commit `f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0`와 [ESP32-C3 TRM v1.4](https://www.espressif.com/sites/default/files/documentation/esp32-c3_technical_reference_manual_en.pdf)의 CPU·PMP·Interrupt Matrix를 기준으로 합니다. 아래 cross-compile·산술 검사는 실제 칩에서의 fault·interrupt 측정과 구분합니다.

ESP-IDF가 가려 두는 부분이 *정확히 이 장의 주제*입니다. C에서 보이는 코어는 *그냥 32-bit MCU*지만, 부트로더·인터럽트 진입·PMP 설정·secure boot에서는 *RISC-V 특권 모델을 직접 만져야* 합니다. 이 장에서는 *꼭 알아야 하는 만큼*의 RISC-V를 정리합니다.

깊이는 *ESP-IDF 사용자가 부트 시퀀스를 읽고 인라인 어셈블리를 짤 수 있는 수준*까지입니다. RISC-V 사양 전체를 다루지는 않습니다. 그건 별도 시리즈로 떼어 둡니다.

## RV32IMC — 무엇이 들어 있나

C3 코어가 지원하는 명령어 집합은 *RV32IMC* 한 줄로 끝납니다. 무엇이 들어 있는지 풀어 봅니다.

| 확장 | 의미 | 코드에서 확인할 점 |
|------|------|------|
| I | 32-bit integer base | load/store·분기·정수 연산 |
| M | 정수 곱셈·나눗셈 | MUL·DIV·REM 계열 |
| C | 16-bit compressed encoding | 명령별 register·immediate 제약 |

C3에는 A·F/D·V 확장이 없습니다. 원자 연산은 toolchain·runtime이 제공하는 대상별 경로를 확인하고, FPU가 없는 부동소수점 연산은 soft-float 비용을 고려합니다. 모든 부동소수점 표현이 무조건 library call로 남는 것은 아니며 상수 접기 같은 최적화 결과를 disassembly로 확인합니다. ISA의 A 유무만으로 모든 SMP 구현 가능성을 일반화하지 않습니다.

### Compressed 명령어가 만드는 것

C 확장은 *자주 쓰는 명령어의 16-bit 버전*입니다. 코드가 작아지고 *I-cache 미스가 줄어듭니다*.

```asm title="c3-encoding.S"
.option push
.option norvc
# 일반 32-bit 명령
addi a0, a0, 1            # 0x00150513 (4 bytes)
sw   a0, 0(sp)            # 0x00a12023 (4 bytes)

# Compressed 16-bit 명령
.option rvc
c.addi a0, 1              # 0x0505 (2 bytes)
c.swsp a0, 0(sp)          # 0xc02a (2 bytes)
.option pop
```

GCC는 `-march=rv32imc`로 기본 사용합니다. disassembler가 alias를 쓰면 `c.` prefix 없이도16-bit 명령일 수 있으므로 instruction byte 길이를 확인합니다.

## 특권 모델 — 하드웨어 M/U와 SDK 실행 경로

TRM의 `misa.U`는1이고 `mstatus.MPP`는 U/M 복귀 모드를 표현합니다. S-mode는 구현하지 않습니다. 기존의 "M-mode만 구현하므로 U-mode 격리가 불가능"이라는 설명은 잘못됐습니다.

이 사실과 ESP-IDF의 task 실행 정책은 별개입니다. 일반 FreeRTOS task를 생성했다고 각 task가 자동으로 U-mode와 독립 PMP 영역을 받지는 않습니다. 특권 전환·trap·메모리 권한의 초기화와 runtime 관리를 포함해 격리 구성을 검증해야 합니다. ARM의 thread/handler 실행 상태와 privileged/unprivileged 구분도 같은 축으로 섞지 않습니다.

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

```c title="c3-csr.c"
#include <stdint.h>

uint32_t read_mcycle_low(void) {
    uint32_t cycles;
    __asm__ volatile ("csrr %0, mcycle" : "=r"(cycles));
    return cycles;
}

uint32_t irq_save_disable(void) {
    uint32_t previous;
    __asm__ volatile ("csrrci %0, mstatus, 8" : "=r"(previous) : : "memory");
    return previous;
}

void irq_restore(uint32_t previous) {
    if (previous & 8u)
        __asm__ volatile ("csrsi mstatus, 8" : : : "memory");
    else
        __asm__ volatile ("csrci mstatus, 8" : : : "memory");
}
```

기존 상태를 저장하지 않고 마지막에 항상 enable하면 중첩된 호출의 mask를 풀 수 있습니다. 위 코드는 MIE bit만 다루는 저수준 설명이며 ESP-IDF/FreeRTOS의 critical-section API를 대체하지 않습니다. low32 cycle 값은 wrap하며 clock/sleep 조건을 포함한 장시간 절대 시각이 아닙니다.

`csrr`은 `csrrs rd, csr, x0`의 축약입니다. `csrci`/`csrsi`는 *5-bit immediate*로 설정/해제를 한 번에 합니다.

### `mcause` 디코딩

trap이 발생하면 `mcause`에 *원인*이 담깁니다.

| 필드·값 | 의미 |
|---|---|
| `mcause[31]` | interrupt와 exception 구분 |
| `mcause[30:0]` | cause 번호; 대상의 vector 정의로 해석 |
| exception2 | illegal instruction |
| exception5 | load access fault |

C3의 peripheral source 번호, 매핑된 CPU interrupt 번호, exception cause를 같은 번호 공간으로 취급하지 않습니다. 표준 machine-timer cause를 모든 C3 tick 경로로 가정하지도 않습니다.

ESP-IDF의 `panic_handler.c`가 이 값을 읽어 *crash 메시지*를 출력합니다.

## PMP — Physical Memory Protection

PMP는 *코드/데이터 영역마다 R/W/X 권한*을 정합니다. MPU와 목적이 겹치지만 특권·matching·lock 동작은 구현별로 확인합니다.

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

### NAPOT은 먼저 산술만 검증

64 KiB 영역 `0x40000000`의 인코딩은 `(base >> 2) | ((size - 1) >> 3)`이므로 `0x10001fff`입니다. 다음 함수는 alignment·크기·32-bit 주소 범위를 검사하며 **CSR을 쓰지 않습니다**.

```c title="c3-napot.c"
#include <stdint.h>
#include <stdbool.h>

bool c3_napot_encode(uint32_t base, uint32_t size, uint32_t *encoded) {
    if (!encoded || size < 8 || size > (1u << 30) ||
        (size & (size - 1u)) || (base & (size - 1u)) ||
        (uint64_t)base + size > (UINT64_C(1) << 32))
        return false;
    *encoded = (base >> 2) | ((size - 1u) >> 3);
    return true;
}
```

`A=NAPOT,R=1`의 cfg byte `0x19`는 **L=0**입니다. M-mode 접근을 read-only로 제한했다는 의미가 아니며, M-mode에도 검사하려면 L의 의미를 포함해야 합니다. Lock 후에는 reset 전 변경할 수 없으므로 application에서 임의로 entry0을 재설정하는 예를 제공하지 않습니다.

### 실제 ESP-IDF 보호 초기화

기준 [cpu_region_protect.c](https://github.com/espressif/esp-idf/blob/f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0/components/esp_hw_support/port/esp32c3/cpu_region_protect.c)의 `esp_cpu_configure_region_protection()`은 비중첩 TOR 영역과 lock을 사용합니다. 일부 빈 주소 범위까지 묶는 제약을 주석·static assert로 기록합니다. C3는 overlapping PMP region의 표준 우선순위를 구현하지 않으므로 영역을 겹치지 않게 해야 합니다.

이 기본 주소 보호를 secure boot signature 검증, task별 sandbox 또는 flash 쓰기 금지와 동일시하지 않습니다. Flash 수정은 mapped 주소로의 CPU store와 flash driver가 수행하는 erase/program을 구분합니다. 실제 permission fault 검증에는 실행 모드·전체 entry 상태·alias·접근 종류와 reset 이후 복구까지 필요합니다.

## 인터럽트 컨트롤러 — Interrupt Matrix와 CPU interrupt

C3는 주변장치 source를 CPU interrupt로 매핑하는 자체 controller를 사용합니다. 이를 PLIC이나 CLIC의 호환 구현이라고 부르지 않습니다. 하드웨어 register와 ESP-IDF allocator의 지원 범위를 구분합니다.

### 구조

![ESP32-C3 interrupt flow — 주변장치 source가 Interrupt Matrix를 거쳐 CPU INT 1~31로 매핑되고 RV32 trap vector로 진입](/images/blog/riscv/esp32-c3-mastering/diagrams/ch02-interrupt-matrix.svg)

특이한 점은 *어떤 페리퍼럴 인터럽트가 어떤 CPU INT 번호가 될지*를 *런타임에 설정*한다는 것입니다. ESP-IDF의 `esp_intr_alloc()`이 이를 자동 처리합니다.

### `esp_intr_alloc` 예시

기준 API는 `esp_err_t esp_intr_alloc(int source, int flags, intr_handler_t handler, void *arg, intr_handle_t *ret_handle)`입니다. Timer 같은 주변장치는 해당 driver의 callback API를 우선 사용해 interrupt status의 확인·clear·enable·수명을 함께 관리합니다. source만 할당한 빈 ISR은 동작하는 timer 예제가 아닙니다.

`ESP_INTR_FLAG_IRAM`은 code를 IRAM으로 옮기는 linker 지시자가 아닙니다. ISR과 호출하는 모든 code, 접근 data가 cache-disabled 상태에서도 유효해야 합니다. `IRAM_ATTR` 하나로 전체 경로가 안전해지는 것은 아니며 allocator 오류도 확인해야 합니다. [v5.4.2 interrupt allocation](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/system/intr_alloc.html)은 shared interrupt를 level-triggered로 제한합니다.

### 하드웨어 우선순위와 API flag

TRM은 CPU interrupt1~31과 하드웨어 priority1~15를 설명합니다. 원래의 "1~7,6 reserved,7 NMI" 표는 C3 설명에서 제거했습니다. 하드웨어 숫자를 `ESP_INTR_FLAG_LEVELn`에 그대로 옮기지 말고 `intr_alloc.c`, `esp_cpu_intr.c`, RISC-V vector/FreeRTOS port의 지원 조건을 확인합니다. ISR에서 호출 가능한 API는 해당 SDK port와 API의 FromISR 계약을 따릅니다.

## 부트 시퀀스 — 어디서 어디로 가는가

ROM과2nd-stage bootloader가 application을 준비한 뒤 application startup에서 runtime·scheduler를 초기화합니다. 기준 `components/freertos/app_startup.c`는 main task를 생성하고 그 task가 `app_main()`을 호출합니다. `app_main()` 뒤에 scheduler를 시작한다는 기존 순서는 반대였습니다.

PMP 주소 보호의 정확한 호출 위치는 해당 startup 소스를 따라 확인합니다. 부트로더가 flash에 있던 영역을 application에서 덮어쓰면 무조건 PMP fault가 난다고 설명할 수 없습니다. Secure boot의 image 검증과 flash encryption은 Ch11의 별도 경로입니다.

## 자주 하는 실수

### "인라인 어셈블리에서 `csrr`이 컴파일 에러"

`-march=rv32imc`만으로는 *Zicsr*가 활성화되지 않는 GCC 버전이 있습니다. `-march=rv32imc_zicsr`로 명시하거나 ESP-IDF 기본 옵션을 그대로 둡니다.

### "PMP 설정 뒤 예상과 다른 결과"

CSR 값만 비교하지 말고 현재 M/U-mode, L bit, TOR 경계와 전체 영역의 중첩 여부를 확인합니다. Lock된 기존 entry를 application에서 다시 쓸 수 있다고 가정하지 않습니다. 실험은 복구 가능한 대상에서 전체 보호 구성을 고정해 진행합니다.

### "cycle count가 시간과 다름"

low32 wrap과 CPU clock 변화, sleep을 포함한 측정 구간을 구분합니다. 절대 microsecond 시각은 `esp_timer_get_time()`의 contract를 확인하며, cycle 값이 어떤 경로에서 reset되는지는 선택한 SDK·대상에서 관찰합니다. 근거 없이 light-sleep 후 항상 reset된다고 단정하지 않습니다.

### "ISR에서 출력이 멈춤"

일반 `printf`·blocking lock·task API를 ISR에서 호출하지 않습니다. ISR-safe 통지로 task에 넘기고, cache-disabled 경로라면 code와 data 배치를 함께 확인합니다. Xtensa의 level 구분을 C3에 그대로 적용하지 않습니다.

### "C++ exception이 안 잡힌다"

ESP-IDF는 *기본적으로 -fno-exceptions*입니다. `menuconfig`에서 활성화 가능하지만 *코드 크기가 크게 증가*합니다. 보통 비활성 유지하고 `expected<T, E>` 또는 `esp_err_t` 기반 에러 전달을 씁니다.

## 정리

C3의 ISA·특권·PMP·interrupt 번호는 각각 다른 계약입니다. U-mode의 하드웨어 지원과 SDK의 task 격리, PMP L bit와 M-mode 검사, peripheral source와 CPU interrupt, IRAM 표시와 전체 cache-safe 경로를 구분합니다. 인코딩·cross-compile 성공은 실제 보호·지연 측정의 대체물이 아닙니다.

## 다음 장 예고

다음 편은 **Ch 3: 메모리 맵·플래시·SPIFFS/LittleFS**입니다. *400 KB SRAM과 4 MB flash*가 *어떻게 영역으로 나뉘는지*, 파티션 테이블과 OTA 동작을 다룹니다.


## 관련 항목

- [Ch 1: ESP32-C3 — 왜 RISC-V로 갈아탔나](/blog/embedded/riscv/esp32-c3-mastering/chapter01-overview)
- [Ch 3: 메모리 맵·플래시·SPIFFS/LittleFS](/blog/embedded/riscv/esp32-c3-mastering/chapter03-memory-flash)
- [Ch 11: 보안·Secure Boot](/blog/embedded/riscv/esp32-c3-mastering/chapter11-security) — image 서명·flash encryption
- [원문 — RISC-V Privileged Spec](https://riscv.org/technical/specifications/)
- [원문 — ESP32-C3 Technical Reference Manual](https://www.espressif.com/sites/default/files/documentation/esp32-c3_technical_reference_manual_en.pdf)
