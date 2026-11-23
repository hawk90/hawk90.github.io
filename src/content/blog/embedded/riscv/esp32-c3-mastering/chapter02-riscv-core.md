---
title: "ESP32-C3 RISC-V 코어 분석 — RV32IMC·PMP·인터럽트 컨트롤러"
slug: "embedded/riscv/esp32-c3-mastering/chapter02-riscv-core"
date: 2026-05-20T09:02:00
description: "ESP32-C3 TRM v1.4의 CSR 목록·PMP·인터럽트 컨트롤러를 ESP-IDF v5.4.2 소스와 대조하고, QEMU에서 PMP store fault와 CSR 값을 직접 읽어 봅니다."
series: "ESP32-C3 Mastering"
seriesOrder: 2
tags: [risc-v, isa, pmp, interrupt, esp32-c3]
draft: false
topics: ["embedded", "embedded/riscv"]
---

## 한 줄 요약

> **C3 코어는 표준 RISC-V를 따르되 CSR 목록, PMP 우선순위, 인터럽트 컨트롤러가 Espressif 고유 방식입니다.** 다른 RISC-V 칩에서 쓰던 `mcycle`·`mie`·PLIC 코드를 그대로 가져오면 C3에서는 맞지 않습니다.

ESP-IDF로 `app_main()`을 쓰는 동안 코어는 그냥 32-bit MCU처럼 보입니다. RISC-V 특권 모델이 드러나는 곳은 panic 로그, 인라인 어셈블리, 부트로더가 걸어 두는 PMP, 인터럽트 진입 경로입니다. 이 장은 그 네 곳을 읽을 수 있을 만큼만 다룹니다.

기준 자료는 [ESP32-C3 TRM v1.4](https://www.espressif.com/sites/default/files/documentation/esp32-c3_technical_reference_manual_en.pdf)의 1장 ESP-RISC-V CPU와 8장 Interrupt Matrix, 그리고 [ESP-IDF v5.4.2](https://github.com/espressif/esp-idf/tree/v5.4.2) 소스입니다. 실행 결과는 Espressif QEMU(`esp_develop_9.0.0_20240606`, `-M esp32c3`)에서 얻었습니다. 아래에서 보듯 QEMU는 일부 CSR 값을 실제 칩과 다르게 보고하므로, QEMU 값과 TRM 값을 나란히 적습니다.

## RV32IMC — 무엇이 있고 무엇이 없나

TRM 1.1절은 코어를 "base integer (I), multiplication/division (M) and compressed (C) standard extensions"로 설명하고, 4단 in-order scalar 파이프라인이라고 적습니다. `misa` 리셋 값도 I·M·C·U만 1입니다(Ch 1 표 참조).

| 확장 | C3 | 코드에 미치는 영향 |
|------|----|------|
| I | 있음 | load/store·분기·정수 연산 |
| M | 있음 | `mul`·`div`·`rem`을 한 명령으로 실행 |
| C | 있음 | 자주 쓰는 명령을 16-bit로 인코딩 |
| A | 없음 | `lr`/`sc`·AMO 명령 없음 |
| F/D | 없음 | 부동소수점은 soft-float 라이브러리 호출 |

A 확장이 없으니 C11 `atomic_fetch_add()` 같은 연산은 어디선가 흉내 내야 합니다. ESP-IDF v5.4.2의 `components/newlib/priv_include/esp_stdatomic.h`는 `__riscv_atomic`이 정의되지 않으면 `HAS_ATOMICS_32`를 0으로 두고, 코어가 하나(`SOC_CPU_CORES_NUM == 1`)이면 `portSET_INTERRUPT_MASK_FROM_ISR()`로 인터럽트를 막은 채 값을 읽고 쓰는 방식으로 `__atomic_*` 함수를 구현합니다. C3에서 atomic 연산 하나는 인터럽트 마스크 설정과 해제를 동반한다는 뜻입니다.

### Compressed 명령 — 같은 연산, 절반 크기

C 확장은 자주 쓰는 명령을 2 byte로 줄인 별칭입니다. 같은 문장을 약어로 쓰는 것과 비슷해서, 뜻은 같고 길이만 짧습니다. 아래 파일은 같은 두 연산을 32-bit와 16-bit로 각각 인코딩합니다.

```asm title="c3-encoding.S"
.option push
.option norvc
addi a0, a0, 1
sw   a0, 0(sp)
.option rvc
c.addi a0, 1
c.swsp a0, 0(sp)
.option pop
```

`riscv32-esp-elf-as -march=rv32imc_zicsr_zifencei`로 어셈블하고 `objdump -d`로 풀면 다음과 같습니다.

```text
   0:	00150513          	addi	a0,a0,1
   4:	00a12023          	sw	a0,0(sp)
   8:	0505                	addi	a0,a0,1
   a:	c02a                	sw	a0,0(sp)
```

16-bit 명령도 disassembly에는 `c.` 접두사 없이 `addi`·`sw`로 찍힙니다. 명령 길이는 니모닉이 아니라 왼쪽의 인코딩 폭(4 byte `00150513`과 2 byte `0505`)으로 구분해야 합니다.

## 특권 모델 — M-mode와 U-mode

TRM Register 1.6의 `misa`는 U=1, S=0입니다. C3는 Machine mode와 User mode를 구현하고 Supervisor mode는 없습니다. Register 1.5 `mstatus`의 MPP 필드도 0x0(User)과 0x3(Machine) 두 값만 정의하고, "Only lower bit is writable"이라고 적습니다.

U-mode가 하드웨어에 있다는 것과 ESP-IDF가 U-mode를 쓴다는 것은 다른 이야기입니다. 이 장의 QEMU 실행에서 `app_main()` 안의 `mstatus`는 0x00000088(MIE와 MPIE가 1)이었고, `app_main()`이 `mstatus`·`pmpcfg` 같은 M-mode 전용 CSR을 읽어도 trap이 나지 않았습니다. 일반 FreeRTOS task가 M-mode에서 돈다는 뜻입니다.

## CSR — TRM이 나열한 것만 있다

CSR은 코어의 제어판입니다. 인터럽트 enable, trap 진입 주소, PMP 설정이 모두 여기에 있습니다. 다른 RISC-V 칩의 제어판에 익숙한 채로 C3를 보면, 있어야 할 스위치 몇 개가 빠져 있습니다. TRM 1.4.1절 Register Summary는 C3에 구현된 CSR을 다음과 같이 나열합니다.

| 분류 | CSR (주소) |
|------|------|
| Machine Information | `mvendorid`(0xF11), `marchid`(0xF12), `mimpid`(0xF13), `mhartid`(0xF14) |
| Trap Setup | `mstatus`(0x300), `misa`(0x301), `mtvec`(0x305) |
| Trap Handling | `mscratch`(0x340), `mepc`(0x341), `mcause`(0x342), `mtval`(0x343) |
| PMP | `pmpcfg0~3`(0x3A0~0x3A3), `pmpaddr0~15`(0x3B0~0x3BF) |
| Trigger | `tselect`(0x7A0), `tdata1`(0x7A1), `tdata2`(0x7A2), `tcontrol`(0x7A5) |
| Debug | `dcsr`(0x7B0), `dpc`(0x7B1), `dscratch0`(0x7B2), `dscratch1`(0x7B3) |
| 성능 카운터 (custom) | `mpcer`(0x7E0), `mpcmr`(0x7E1), `mpccr`(0x7E2) |
| GPIO 접근 (custom) | `cpu_gpio_oen`(0x803), `cpu_gpio_in`(0x804), `cpu_gpio_out`(0x805) |

표준 `mie`(0x304), `mip`(0x344), `mcycle`(0xB00), `minstret`(0xB02)는 이 목록에 없습니다. 인터럽트별 enable과 pending은 CSR이 아니라 인터럽트 컨트롤러의 메모리 맵 레지스터(`INTERRUPT_CORE0_CPU_INT_ENABLE_REG`, `INTERRUPT_CORE0_CPU_INT_EIP_STATUS_REG`)가 맡습니다. 같은 절에 따르면 RO CSR에 쓰려 하면 illegal instruction 예외가 납니다.

`mtvec`에도 C3만의 제약이 있습니다. Register 1.7은 MODE 필드를 "Only vectored mode 0x1 is available"로, BASE를 256 byte 정렬로 정의합니다. QEMU에서 읽은 `mtvec`은 0x40380001로, 256 byte 정렬된 0x40380000에 MODE=1이 붙은 값이었습니다. 0x40380000은 Ch 1 부팅 로그에서 app의 IRAM segment(`segment 2: ... vaddr=40380000`)가 올라간 첫 주소입니다.

### cycle count는 `mcycle`이 아니라 `mpccr`

cycle counter는 TRM이 custom CSR로 정의한 `mpccr`(0x7E2)입니다. ESP-IDF v5.4.2의 `components/riscv/include/riscv/rv_utils.h`는 `rv_utils_get_cycle_count()`에서 `SOC_CPU_HAS_CSR_PC`가 1이면 `CSR_PCCR_MACHINE`(0x7e2)을, 아니면 `mcycle`을 읽고, C3의 `soc_caps.h`는 `SOC_CPU_HAS_CSR_PC 1`을 선언합니다. TRM Register 1.12는 `mpcer`의 CYCLE 이벤트에 "Cycle count does not increment during WFI mode"라는 단서도 달아 두었습니다.

아래는 cycle count를 읽는 함수와, `mstatus.MIE`를 저장했다가 되돌리는 인터럽트 마스크 함수입니다. MIE는 Register 1.5에서 bit 3이므로 immediate 8을 씁니다.

```c title="c3-csr.c"
#include <stdint.h>

uint32_t read_cycle_count(void) {
    uint32_t cycles;
    __asm__ volatile ("csrr %0, 0x7e2" : "=r"(cycles));  /* mpccr */
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

`csrrci`는 이전 값을 돌려주면서 비트를 지우므로, 복원할 때 이전 상태를 보고 다시 켤지 정합니다. 무조건 다시 켜면 바깥 호출자가 이미 막아 둔 인터럽트까지 풀어 버립니다. 실제 코드에서는 `esp_cpu_get_cycle_count()`와 `portENTER_CRITICAL()`을 쓰면 되고, 위 함수는 그 아래에서 무슨 일이 일어나는지 보여 주는 용도입니다.

같은 방식의 함수를 `app_main()`에 넣고 빌드하면 `esp_cpu_get_cycle_count()`가 `csrr s0,0x7e2`로 컴파일됩니다. QEMU에서 실행한 결과입니다.

```text
mstatus.MIE before=1 inside=0 after=1
esp_cpu_get_cycle_count delta over vTaskDelay(10ms) = 1541000
```

MIE가 1에서 0이 됐다가 1로 돌아왔습니다. cycle 차이는 QEMU의 가상 시계 기준이라 실제 칩의 160 MHz 동작과 비교할 값은 아닙니다.

### `-march`에 `_zicsr`가 필요한 이유

`csrr` 같은 CSR 명령은 Zicsr 확장에 속합니다. 같은 한 줄짜리 파일을 GCC 14.2.0(`esp-14.2.0_20241119`)으로 두 번 컴파일하면 차이가 보입니다.

```text
$ riscv32-esp-elf-gcc -march=rv32imc -mabi=ilp32 -c z.c
z.c: Assembler messages:
z.c:1: Error: unrecognized opcode `csrr a5,mstatus', extension `zicsr' required
$ riscv32-esp-elf-gcc -march=rv32imc_zicsr -mabi=ilp32 -c z.c
$
```

ESP-IDF 빌드는 `-march=rv32imc_zicsr_zifencei`를 넘기므로(Ch 1), 컴포넌트 안에서 쓴 인라인 어셈블리는 이 문제를 만나지 않습니다. 직접 만든 Makefile이나 다른 툴체인으로 C3 코드를 빌드할 때 만나는 오류입니다.

### QEMU가 보고하는 CSR은 실제 칩과 다르다

TRM과 QEMU의 값이 갈리는 대표 사례가 `misa`와 ID CSR입니다.

| CSR | TRM v1.4 리셋 값 | QEMU 실행에서 읽은 값 |
|-----|------|------|
| `misa` | MXL=1, I·M·C·U만 1 (= 0x40101104) | 0x401411ad |
| `mvendorid` | 0x00000612 | 0x00000000 |
| `marchid` | 0x80000001 | 0x00000000 |

QEMU의 `misa`는 A·D·F·H·S 비트까지 켜져 있습니다. QEMU는 ESP-IDF 바이너리를 실행하는 데 필요한 동작을 흉내 낼 뿐, 실제 칩과 비트 단위로 같지는 않습니다. 이 시리즈에서 QEMU 값을 근거로 쓸 때는 항상 TRM 값과 함께 적습니다.

## `mcause` — trap 원인 읽기

trap이 나면 `mcause`가 원인을 담습니다. 진료 기록의 "주 증상" 칸과 같아서, panic 로그를 읽을 때 가장 먼저 봅니다. TRM Register 1.10은 bit 31을 Interrupt Flag로, 하위 5 bit를 Exception Code로 정의하고, C3가 내는 exception ID를 다음과 같이 나열합니다.

| ID | 원인 | `mtval` 내용 (Register 1.11) |
|----|------|------|
| 0x1 | PMP Instruction access fault | 실패한 명령 주소 |
| 0x2 | Illegal Instruction | 실패한 명령의 opcode |
| 0x3 | Hardware Breakpoint/Watchpoint 또는 EBREAK | — |
| 0x5 | PMP Load access fault | load 대상 주소 |
| 0x7 | PMP Store access fault | store 대상 주소 |
| 0x8 | ECALL from U mode | — |
| 0xb | ECALL from M mode | — |

같은 레지스터 설명은 instruction address misaligned(ID 0x0)가 없다고 밝힙니다. 명령을 가져올 때 주소의 최하위 비트를 항상 마스크하기 때문입니다. 인터럽트일 때는 bit 31이 1이 되고 하위 비트에 CPU interrupt 번호 1~31이 들어갑니다. TRM에 따르면 C3는 RISC-V 표준이 코어 내부 인터럽트용으로 남겨 둔 0~15번까지 외부 인터럽트에 씁니다. 그래서 표준의 machine timer interrupt(cause 7)를 기대하는 코드는 C3에서 맞지 않습니다.

ESP-IDF는 `components/esp_system/port/arch/riscv/panic_arch.c`에서 이 값을 문자열로 바꿉니다. 다음 절의 QEMU 실행이 그 결과를 보여 줍니다.

## PMP — 부트로더가 잠가 두는 보호막

PMP는 코어가 주소 구간마다 읽기·쓰기·실행 권한을 검사하는 장치입니다. C3에서는 부트로더가 이 설정을 미리 잠가 두기 때문에, application에서 보는 PMP는 바꿀 수 없는 결과물입니다. 그 결과물을 읽으려면 entry 구조부터 알아야 합니다.

### Entry 구조

PMP entry는 16개이고, 각 entry는 `pmpcfgN`의 8 bit와 `pmpaddrN` 32 bit로 이뤄집니다. `pmpcfg0` 한 CSR이 entry 0~3의 cfg 4개를 담고, `pmpcfg1`이 4~7, `pmpcfg2`가 8~11, `pmpcfg3`이 12~15를 담습니다. TRM 1.8.5절에 따르면 이 CSR들은 RISC-V Privileged Architecture v1.10의 정의를 그대로 따릅니다.

![PMP Entry — pmpcfg + pmpaddr](/images/blog/esp32-c3/diagrams/ch02-pmp-entry.svg)

| A 값 | 모드 | 범위 |
|----|------|------|
| `00` | OFF | 사용 안 함 |
| `01` | TOR | 이전 entry의 주소부터 현재 주소 직전까지 |
| `10` | NA4 | 4 byte |
| `11` | NAPOT | 2의 거듭제곱 크기, 크기에 맞춰 정렬 |

C3는 표준과 두 가지가 다릅니다(TRM 1.8.2). 겹치는 영역의 정적 우선순위가 없어 하나라도 허용하면 접근이 성공하고, NAPOT 범위는 최대 1 GB입니다.

### NAPOT 인코딩을 먼저 계산해 보기

NAPOT은 주소와 크기를 `pmpaddr` 하나에 함께 담습니다. 0x40000000에서 시작하는 64 KiB 영역이라면 `(base >> 2) | ((size - 1) >> 3)` = 0x10000000 | 0x1FFF = 0x10001FFF입니다. 아래 함수는 이 계산과 함께 정렬, 크기, TRM의 1 GB 상한을 검사합니다. CSR에는 쓰지 않습니다.

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

호스트에서 세 경우를 돌린 결과입니다.

```text
64KiB@0x40000000 ok=1 enc=0x10001fff
misaligned ok=0
2GiB ok=0
cfg A=NAPOT|R = 0x19
```

정렬이 어긋난 0x40008000과 1 GB를 넘는 2 GiB는 거부됩니다. 마지막 줄의 cfg byte 0x19는 A=NAPOT(0x18)과 R(0x01)만 켠 값이라 L=0입니다. TRM 1.8.3절에 따르면 L이 0인 entry는 M-mode 접근을 검사하지 않으므로, 이 값으로는 M-mode 코드를 read-only로 묶지 못합니다.

### 실제 ESP-IDF 보호 — 2nd-stage bootloader가 건다

PMP는 2nd-stage bootloader가 먼저 겁니다. v5.4.2의 C3 bootloader(`bootloader_esp32c3.c`)가 `bootloader_init_mem()`을 부르고, 이 함수(`components/bootloader_support/src/bootloader_mem.c`)는 `CONFIG_BOOTLOADER_REGION_PROTECTION_ENABLE`(기본값 y)이 켜져 있으면 `esp_cpu_configure_region_protection()`을 호출합니다. app의 `call_start_cpu0()`(`components/esp_system/port/cpu_start.c`)도 `Unicore app` 로그를 찍은 직후 같은 `bootloader_init_mem()`을 한 번 더 부르지만, 이때는 entry가 이미 잠겨 있어 bootloader가 쓴 값이 그대로 남습니다.

[`cpu_region_protect.c`](https://github.com/espressif/esp-idf/blob/v5.4.2/components/esp_hw_support/port/esp32c3/cpu_region_protect.c)는 entry 0~14를 TOR로, 마지막 entry 15를 주소 공간 끝 4 byte를 덮는 NA4로 쓰고, 16개 모두에 `PMP_L`을 붙입니다(Ch 1의 entry 표). Lock은 CPU reset으로만 풀리므로, application이 시작될 때는 이미 바꿀 수 없는 상태입니다. QEMU에서 `app_main()`이 읽은 값이 그 결과입니다.

```text
pmpcfg0=0x89888f88
pmpcfg1=0x888d898b
pmpcfg2=0x8f888d8f
pmpcfg3=0x90888b88
```

byte 단위로 풀면 `pmpcfg0`의 entry 0~3은 0x88, 0x8f, 0x88, 0x89입니다. 0x88은 L(0x80)+TOR(0x08)로 권한 없음, 0x8f는 RWX, 0x89는 R입니다. 소스의 entry 0(NONE), 1(RWX), 2(NONE), 3(R)과 정확히 맞습니다. `pmpcfg3`의 마지막 byte 0x90은 entry 15의 L+NA4입니다.

### QEMU에서 일부러 PMP fault 내기

entry 3은 flash의 read-only 데이터(DROM) 구간을 R로 묶습니다. 그렇다면 `const` 문자열에 값을 쓰는 순간 store access fault가 나야 합니다. 아래는 그 실험의 핵심 두 줄입니다.

```c title="c3-pmp-fault.c"
static const char kRodata[] = "flash rodata";
/* ... */
*(volatile char *)kRodata = 'F';
```

QEMU에서의 출력입니다.

```text
kRodata at 0x3c027850, writing...
Guru Meditation Error: Core  0 panic'ed (Store access fault). Exception was unhandled.

Core  0 register dump:
MEPC    : 0x42009906  RA      : 0x42009902  SP      : 0x3fc8f610  GP      : 0x3fc8c200  
...
MSTATUS : 0x00001880  MTVEC   : 0x40380001  MCAUSE  : 0x00000007  MTVAL   : 0x3c027850  
```

`MCAUSE` 7은 위 표의 PMP Store access fault이고, `MTVAL`은 쓰려던 주소 0x3c027850 그대로입니다. `MEPC`의 0x4200xxxx는 flash에서 실행 중이던 `app_main()` 안의 store 명령 위치입니다. `MSTATUS` 0x1880에서 MPP(bit 12:11)가 0b11이므로 trap 직전 모드가 Machine mode였다는 것도 함께 읽힙니다. M-mode 코드인데도 막힌 이유가 바로 L 비트입니다.

이 결과는 QEMU의 PMP 구현에서 나왔습니다. 실제 칩에서 같은 결과가 나는지는 이 장에서 확인하지 않았고, 근거는 TRM 1.8.3절의 설명과 소스의 entry 설정입니다.

## 인터럽트 컨트롤러 — Interrupt Matrix와 CPU interrupt

C3의 인터럽트는 두 단계를 거칩니다. 주변장치 인터럽트 source가 Interrupt Matrix를 거쳐 CPU interrupt 번호 하나에 연결되고, 코어 안의 인터럽트 컨트롤러(INTC)가 우선순위를 따져 trap을 일으킵니다. 전화 교환대가 외부 회선 62개를 내선 31개 중 하나로 이어 주는 구조와 비슷합니다.

![ESP32-C3 interrupt flow — 주변장치 source가 Interrupt Matrix를 거쳐 CPU INT 1~31로 매핑되고 RV32 trap vector로 진입](/images/blog/riscv/esp32-c3-mastering/diagrams/ch02-interrupt-matrix.svg)

TRM 8.1·8.3.2·8.3.3절이 숫자와 연결 방법을 정합니다.

- 주변장치 인터럽트 source는 62개(0~61)이고, CPU interrupt는 31개(1~31)입니다.
- source X를 CPU interrupt P에 연결하려면 `INTERRUPT_CORE0_SOURCE_X_MAP_REG`에 P를 씁니다. 여러 source를 같은 P에 연결할 수 있고, 0을 쓰면 연결이 끊깁니다.
- 8.3.2절은 C3가 RISC-V Privileged ISA 대신 자체 인터럽트 컨트롤러로 인터럽트를 구현한다고 명시합니다.

TRM 1.5.2절은 CPU interrupt마다 다섯 가지 속성을 둡니다.

| 속성 | 레지스터 | 내용 |
|------|------|------|
| Enable | `INTERRUPT_CORE0_CPU_INT_ENABLE_REG` | 인터럽트별 on/off |
| Type | `INTERRUPT_CORE0_CPU_INT_TYPE_REG` | 0 = level, 1 = edge |
| Priority | `INTERRUPT_CORE0_CPU_INT_PRI_n_REG` | 1(최저)~15(최고), 0이면 마스크 |
| Pending | `INTERRUPT_CORE0_CPU_INT_EIP_STATUS_REG` | 읽기 전용 pending 상태 |
| Clear | `INTERRUPT_CORE0_CPU_INT_CLEAR_REG` | edge 인터럽트의 pending 해제 |

우선순위가 `INTERRUPT_CORE0_CPU_INT_THRESH_REG`의 threshold보다 낮으면 마스크되고, 같은 우선순위끼리는 ID가 낮은 쪽이 먼저입니다. 인터럽트 ID i의 진입 주소는 `mtvec + 4i`이고, ID 0 자리(`mtvec + 0x00`)는 예외용으로 남겨 둡니다. 1.5.3.1절은 정상 상태에서 인터럽트가 들어온 뒤 CPU가 처리를 시작하기까지 정확히 4 cycle이 걸리고, 그 사이 최대 5개 명령이 더 실행될 수 있다고 적습니다.

### ESP-IDF의 `esp_intr_alloc()`이 하는 일

API는 `components/esp_hw_support/include/esp_intr_alloc.h`의 `esp_err_t esp_intr_alloc(int source, int flags, intr_handler_t handler, void *arg, intr_handle_t *ret_handle)`입니다. `intr_alloc.c`를 따라가면 비어 있는 CPU interrupt를 고른 뒤 `esp_rom_route_intr_matrix(cpu, source, intr)`로 matrix를 설정하고, C3처럼 `SOC_CPU_HAS_FLEXIBLE_INTC`가 1인 target에서는 `esp_cpu_intr_set_priority()`와 `esp_cpu_intr_set_type()`으로 우선순위와 level/edge를 씁니다.

C3에서 동작을 가르는 세부는 다음과 같습니다.

- **예약 번호**: `components/esp_hw_support/port/esp32c3/esp_cpu_intr.c`는 CPU interrupt 1을 Wi-Fi용, 6을 "permanently disabled interrupt"(`INT_MUX_DISABLED_INTNO`)로 예약합니다. 이 두 번호는 할당되지 않습니다.
- **우선순위 flag**: 헤더는 `ESP_INTR_FLAG_LEVEL1`~`LEVEL6`과 `ESP_INTR_FLAG_NMI`(Level 7)를 정의하고, `esp_intr_flags_to_level()`이 flag를 정수 level로 바꿉니다. 하드웨어는 1~15를 지원하지만 이 API로 지정할 수 있는 값은 1~7입니다.
- **공유 인터럽트**: [v5.4.2 Interrupt allocation 문서](https://docs.espressif.com/projects/esp-idf/en/v5.4.2/esp32c3/api-reference/system/intr_alloc.html)는 "Shared interrupts can only be level interrupts"라고 적고, edge로 공유하면 두 번째 주변장치의 인터럽트를 놓치는 시나리오를 설명합니다. `ESP_INTR_FLAG_SHARED`만 주면 priority level 1만 할당하고, `ESP_INTR_FLAG_LOWMED`를 더하면 2와 3까지 허용합니다.
- **`ESP_INTR_FLAG_IRAM`**: 같은 문서는 "Never register an interrupt handler with `ESP_INTR_FLAG_IRAM` flag if you are not 100% sure that all the code and data that the interrupt ever accesses are in IRAM (code) or DRAM (data)"라고 경고합니다. 이 flag는 코드를 옮겨 주지 않습니다. handler에 `IRAM_ATTR`를 붙이고, handler가 부르는 함수와 읽는 데이터까지 내부 메모리에 있어야 합니다.

## 부트 시퀀스 — ROM에서 `app_main()`까지

Ch 1의 QEMU 로그를 이 장의 내용으로 다시 읽으면 순서가 이렇습니다.

1. ROM(`ESP-ROM:esp32c3-api1-20210207`)이 flash에서 2nd-stage bootloader를 IRAM/DRAM에 올립니다.
2. bootloader가 `bootloader_init_mem()`에서 PMP 16개 entry를 잠그고(app의 `call_start_cpu0()`이 같은 함수를 한 번 더 호출), partition table을 읽어 app image의 segment를 올립니다.
3. app의 startup 코드가 `cpu_start` 로그를 찍고, `esp_startup_start_app()`(`components/freertos/app_startup.c`)이 `xTaskCreatePinnedToCore()`로 `main` task를 만든 뒤 `vTaskStartScheduler()`를 부릅니다.
4. scheduler가 `main_task`를 실행하고, 이 task가 `Calling app_main()` 로그를 찍은 뒤 `app_main()`을 호출합니다. `app_main()`이 return하면 `main_task`는 스스로 삭제됩니다.

scheduler가 먼저 시작되고, `app_main()`은 그 위에서 도는 task 하나일 뿐입니다. 그래서 `app_main()` 안에서 `vTaskDelay()`를 바로 쓸 수 있습니다. Secure boot의 서명 검증과 flash encryption은 이 순서의 1~2단계에 끼어드는 별도 기능이고, Ch 11에서 다룹니다.

## 자주 하는 실수

### "다른 RISC-V 칩의 `mcycle` 코드가 C3에서 이상하다"

C3 TRM의 CSR 목록에는 `mcycle`·`minstret`이 없습니다. cycle count는 `mpccr`(0x7E2)이고, `esp_cpu_get_cycle_count()`가 이를 읽습니다. 32-bit 값이라 160 MHz에서는 2^32 / 160,000,000 ≈ 26.8초마다 한 바퀴 돕니다.

### "`mie`로 인터럽트를 켰는데 반응이 없다"

C3에는 `mie` CSR이 없습니다. 인터럽트별 enable은 `INTERRUPT_CORE0_CPU_INT_ENABLE_REG`이고, 전역 enable은 `mstatus.MIE`입니다. 레지스터를 직접 만지기보다 `esp_intr_alloc()`·`esp_intr_enable()`을 쓰면 예약 번호 충돌까지 피할 수 있습니다.

### "PMP entry를 application에서 다시 쓰려 했다"

bootloader가 16개 entry를 모두 lock했으므로 application에서 `pmpcfg`·`pmpaddr`에 써도 바뀌지 않습니다. 보호 구성을 바꾸려면 bootloader의 `CONFIG_BOOTLOADER_REGION_PROTECTION_ENABLE` 설정부터 손봐야 합니다.

### "ISR에서 `printf`를 불렀더니 abort가 났다"

`printf`는 newlib의 stdio를 거치며 lock을 잡습니다. ESP-IDF v5.4.2의 `components/newlib/locks.c`는 ISR 안에서 recursive mutex를 잡으려 하면 `abort()`하고, 일반 mutex를 얻지 못해도 "rewrite your program to avoid libc interactions in ISRs!"라는 주석과 함께 `abort()`합니다. ISR에서는 `xQueueSendFromISR()`·`vTaskNotifyGiveFromISR()`처럼 `FromISR` 접미사가 붙은 API로 task에 일을 넘기고, 출력은 task에서 합니다. 디버그 출력이 꼭 필요하면 ROM 함수 `esp_rom_printf()`를 씁니다.

### "C++ exception이 안 잡힌다"

ESP-IDF v5.4.2의 `CONFIG_COMPILER_CXX_EXCEPTIONS`는 기본값이 n입니다. Kconfig 도움말은 이 상태에서 "any libstdc++ code which throws an exception will abort instead"라고 적고, 켜면 사용자 코드가 처음 exception을 던질 때 약 500 byte의 heap overhead가 더 든다고 밝힙니다. 끈 채로 쓴다면 `esp_err_t` 반환값으로 오류를 전달합니다.

## 정리

- C3 코어는 RV32IMC에 M/U-mode를 갖고, A·F·D·S가 없습니다. atomic 연산은 ESP-IDF가 인터럽트 마스크로 흉내 냅니다.
- 구현된 CSR은 TRM 1.4.1절 목록이 전부입니다. `mie`·`mip`·`mcycle`은 없고, cycle count는 custom `mpccr`(0x7E2)입니다.
- `mtvec`은 vectored mode만 지원하고 interrupt ID i의 진입점은 `mtvec + 4i`입니다.
- PMP 16개 entry는 2nd-stage bootloader가 모두 L로 잠급니다(0~14는 TOR, 15는 NA4). QEMU에서 flash rodata에 쓰면 `MCAUSE` 7, `MTVAL` = 대상 주소로 panic이 납니다.
- 62개 주변장치 source가 Interrupt Matrix를 거쳐 31개 CPU interrupt로 가고, 우선순위는 하드웨어 1~15, ESP-IDF flag로는 1~7입니다.
- QEMU의 `misa`·`mvendorid`는 TRM 값과 다르므로 QEMU 값만으로 하드웨어를 판단하지 않습니다.

## 다음 장 예고

다음 편은 **Ch 3: 메모리 맵·플래시·SPIFFS/LittleFS**입니다. 이 장에서 PMP 표로 본 DROM·DRAM·IRAM 경계를 `soc.h` 주소로 풀고, partition table과 OTA가 flash를 어떻게 나누는지 다룹니다.


## 관련 항목

- [Ch 1: ESP32-C3 — 왜 RISC-V로 갈아탔나](/blog/embedded/riscv/esp32-c3-mastering/chapter01-overview)
- [Ch 3: 메모리 맵·플래시·SPIFFS/LittleFS](/blog/embedded/riscv/esp32-c3-mastering/chapter03-memory-flash)
- [Ch 11: 보안·Secure Boot](/blog/embedded/riscv/esp32-c3-mastering/chapter11-security) — image 서명·flash encryption
- [원문 — RISC-V Privileged Spec](https://riscv.org/technical/specifications/)
- [원문 — ESP32-C3 Technical Reference Manual](https://www.espressif.com/sites/default/files/documentation/esp32-c3_technical_reference_manual_en.pdf)
