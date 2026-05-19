---
title: "Ch 14: Semihosting"
date: 2026-05-17T14:00:00
description: "Host I/O on bare-metal — UART 없이 printf하기."
tags: [QEMU, semihosting, baremetal, arm-semihosting, BKPT]
series: "QEMU Embedded Emulation"
seriesOrder: 14
draft: true
---

UART도 없는 bare-metal MCU에서 printf 디버깅이 가능할까요? **Semihosting**이 그 답입니다 — guest가 특수 명령을 trigger하면 host(QEMU 또는 debugger)가 *자기 syscall*을 빌려 줍니다. UART 설정·driver 없이 *즉시* 콘솔 입출력이 가능하고, CI에서 firmware test의 exit code를 host로 받는 데에도 핵심.

## 어떤 문제를 푸는가

펌웨어 개발 초기에 자주 겪는 상황.

- UART가 *아직 초기화 안 됨* — clock·pinmux 설정 전인데 printf 필요.
- 보드에 *UART 핀 없음* — Cortex-M0 같은 minimal 칩.
- *unit test* 결과를 host로 받고 싶음 — JTAG 없이.
- *CI*에서 firmware의 exit code로 test pass/fail.

세 경우 모두 semihosting이 *한 줄*로 해결합니다.

## 동작 원리

```text
Guest (bare-metal)               Host (QEMU)
─────────────────────            ─────────────
1. r0 = op number               
2. r1 = arg block pointer
3. BKPT 0xAB (or SVC #0x123456)
                       ─────▶
                                4. Trap intercept
                                5. host의 stdio·file system 사용
                                6. r0에 결과 set
                       ◀─────
4. continue with r0 result
```

guest가 *trap을 일으키고*, host가 *그 trap을 가로채* host syscall로 위임합니다.

## ARM Semihosting trap

architecture별로 trigger 방식.

| Architecture | Trigger |
|--------------|---------|
| ARM A/R-profile (AArch32) | `SVC #0x123456` |
| ARM A/R-profile (AArch64) | `HLT #0xF000` |
| ARM M-profile (Cortex-M) | `BKPT 0xAB` |
| RISC-V | `slli x0,x0,0x1f` + `ebreak` + `srai x0,x0,7` (3-instr seq) |

## Register convention

```text
ARM A-profile:
  r0 (또는 x0) = operation number
  r1 (또는 x1) = argument block pointer
  복귀 시 r0 = return value
```

operation number는 *표준화*되어 있습니다.

| Op | Number | 의미 |
|----|--------|------|
| `SYS_OPEN` | 0x01 | 파일 열기 |
| `SYS_CLOSE` | 0x02 | 파일 닫기 |
| `SYS_WRITEC` | 0x03 | char 1개 stdout |
| `SYS_WRITE0` | 0x04 | NUL-terminated string |
| `SYS_WRITE` | 0x05 | buffer |
| `SYS_READ` | 0x06 | 파일 읽기 |
| `SYS_ISTTY` | 0x09 | TTY 여부 |
| `SYS_TIME` | 0x11 | wall clock |
| `SYS_CLOCK` | 0x10 | tick count |
| `SYS_EXIT` | 0x18 | guest 종료 + exit code |

## 가장 작은 예제

Cortex-M3에서 *직접 호출*.

```c
/* hello.c */
static inline int sh_write0(const char *s) {
    register int r0 asm("r0") = 0x04;          /* SYS_WRITE0 */
    register const char *r1 asm("r1") = s;
    asm volatile("bkpt #0xAB" : "+r"(r0) : "r"(r1) : "memory");
    return r0;
}

static inline void sh_exit(int code) {
    register int r0 asm("r0") = 0x18;          /* SYS_EXIT */
    register int r1 asm("r1") = code;
    asm volatile("bkpt #0xAB" :: "r"(r0), "r"(r1));
    while (1);
}

void main(void) {
    sh_write0("Hello from bare-metal\n");
    sh_exit(0);
}
```

빌드·실행.

```bash
arm-none-eabi-gcc -mcpu=cortex-m3 -mthumb \
    -nostartfiles -nostdlib -T mps2.ld \
    -o hello.elf start.S hello.c

qemu-system-arm -M mps2-an385 -nographic -semihosting \
    -kernel hello.elf
# stdout: "Hello from bare-metal"
# QEMU exits with code 0
```

## QEMU 옵션

```bash
# 기본 활성
-semihosting

# 세부 설정
-semihosting-config enable=on,target=native,arg=foo,arg=bar
```

| 옵션 | 의미 |
|------|------|
| `target=native` | host syscall 직접 |
| `target=gdb` | gdb 통해(디버거가 처리) |
| `arg=...` | argv처럼 전달, guest의 `SYS_GET_CMDLINE`에서 받음 |

`target=gdb`는 *디버거에서 semihosting 출력*을 보고 싶을 때.

## Newlib + semihosting

`bkpt` 인라인 어셈블리를 매번 쓸 필요는 없습니다. **Newlib**의 *librdimon*이 표준 `_write`·`_read`·`_open`을 semihosting으로 wrap해 줍니다.

```bash
arm-none-eabi-gcc -mcpu=cortex-m3 -mthumb \
    --specs=rdimon.specs -lrdimon \
    -T mps2.ld -o hello.elf start.S hello.c
```

```c
#include <stdio.h>

int main(void) {
    printf("printf works via semihosting!\n");   // → SYS_WRITE
    fprintf(stderr, "error message\n");          // → SYS_WRITE stderr
    return 42;                                    // → exit 42
}
```

`--specs=rdimon.specs`가 *startup 코드*도 semihosting backend로 link.

## picolibc

newlib의 *최소 변형*. embedded에 더 적합.

```bash
arm-none-eabi-gcc -specs=picolibc.specs -lc -lsemihost \
    -T mps2.ld -o hello.elf hello.c
```

## RISC-V Semihosting

RISC-V는 *3-instruction sequence*로 trigger.

```asm
.macro sh_call
    slli x0, x0, 0x1f
    ebreak
    srai x0, x0, 7
.endm

.global sh_write0
sh_write0:
    li a0, 0x04             # SYS_WRITE0
    # a1 = string pointer (caller's arg0)
    mv a1, a0
    sh_call
    ret
```

```bash
qemu-system-riscv64 -M virt -nographic -semihosting \
    -kernel hello.elf
```

RISC-V semihosting은 ARM과 *호환되는 op 번호*를 씁니다.

## CI에서의 결정적 패턴

firmware unit test의 결과를 *exit code로* 받기.

```c
int main(void) {
    int passed = run_unit_tests();
    sh_exit(passed ? 0 : 1);
}
```

```yaml
# .github/workflows/firmware.yml
- name: Run firmware test
  run: |
    qemu-system-arm -M mps2-an385 -nographic -semihosting \
        -kernel test.elf
    echo "Exit code: $?"

- name: Fail if non-zero
  if: ${{ failure() }}
  run: echo "Firmware test failed"
```

CI runner가 *firmware 자체의 통과·실패*를 그대로 본다. JTAG·HW 없이 *전체 단위 test가 자동화*.

## SYS_GET_CMDLINE — argv 전달

```c
char buf[256];
register char *r0 asm("r0") = buf;
register int r1 asm("r1") = sizeof(buf);
asm("bkpt #0xAB" : "+r"(r0) : "r"((int)0x15) : "memory");
// buf now holds cmdline from QEMU's -semihosting-config arg=...
```

```bash
qemu-system-arm -M mps2-an385 -nographic \
    -semihosting-config enable=on,arg=mytest,arg=fast \
    -kernel test.elf
```

firmware가 *"mytest fast"*를 받아 다른 시나리오로 동작.

## 한계

- *매우 느림* — vmexit 비용. high-throughput I/O에 부적합.
- *실 HW에서 안 됨* — QEMU 또는 OpenOCD/J-Link 같은 debugger 환경에서만.
- *boundary 보안* — host file system 접근 가능. production 빌드에서 *반드시* 제거.

production용 firmware는 semihosting을 *완전히* 빼야 합니다. 개발/CI 빌드와 production 빌드의 *분리*가 권장.

## 흔한 함정

- **`-semihosting` 누락** — `BKPT 0xAB`이 hard fault. infinite reset.
- **stdout이 stderr** — `SYS_WRITE` 시 `SYS_OPEN`으로 stderr를 미리 open 안 했으면 fail.
- **production에 leak** — `bkpt` 명령이 *실 칩*에서 hard fault. release build에서 제거.
- **gdb target에서 작동 안 함** — `-semihosting-config target=gdb`로 명시.

## 정리

- **Semihosting**으로 UART 없는 bare-metal에서 printf·file I/O 가능. host의 syscall 빌려 씀.
- Trigger: ARM은 `BKPT 0xAB`(M-profile)·`SVC #0x123456`(A-profile), RISC-V는 3-instr sequence.
- Register convention: r0=op, r1=arg block. op은 표준화.
- 자주 쓰는 op: WRITE0(string)·WRITE(buffer)·EXIT(code)·OPEN/READ/CLOSE.
- Newlib librdimon으로 `printf` *그냥 작동* — `--specs=rdimon.specs`.
- CI에서 firmware test exit code를 host로 — JTAG 없는 자동화.
- 한계: 느림·실 HW 부재·security. production에서 반드시 제거.

## 다음 장 예고

다음 장은 *heterogeneous multi-core* — **OpenAMP/RPMsg**. Cortex-A(Linux) + Cortex-M(FreeRTOS)이 같은 SoC에서 통신하는 표준 framework.

## 관련 항목

- [Ch 11: 베어메탈 펌웨어](/blog/tools/emulation/qemu-embedded/chapter11-baremetal)
- [Ch 13: 벤더 머신](/blog/tools/emulation/qemu-embedded/chapter13-vendor-machines)
- [Ch 15: OpenAMP·RPMsg](/blog/tools/emulation/qemu-embedded/chapter15-openamp-rpmsg)
- [Ch 20: CI matrix](/blog/tools/emulation/qemu-embedded/chapter20-ci-matrix)
