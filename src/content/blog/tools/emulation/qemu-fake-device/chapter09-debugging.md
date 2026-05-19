---
title: "Ch 9: 디버깅 — QEMU + GDB"
date: 2026-05-17T09:00:00
description: "QEMU와 GDB를 연동해 커널과 드라이버를 디버깅한다."
tags: [QEMU, GDB, Debugging, trace, ftrace]
series: "QEMU Fake Device Driver"
seriesOrder: 9
draft: true
---

driver 개발의 절반은 *디버깅*입니다. QEMU 환경의 강점이 *명령어 단위 디버깅·재현 가능성·trace 풍부*. 이 장은 GDB·dmesg·ftrace·QEMU trace event를 *어떻게 활용*해 driver bug를 찾는지 정리합니다.

## 디버깅 도구 정리

| 도구 | 역할 |
|------|------|
| **GDB** + QEMU stub | kernel/driver 명령어 단위 |
| **dmesg** | dev_info·dev_err 출력 |
| **ftrace** | function trace, latency |
| **kprobe** | runtime probe 추가 |
| **QEMU trace event** | device-side trace |
| **kdump** | kernel panic dump |
| **dynamic_debug** | log level 조정 |

각자 *다른 layer*에서 view 제공.

## GDB attach

QEMU `-s -S` + cross-GDB.

```bash
# 1. QEMU 시작 (대기)
./qemu-system-x86_64 -enable-kvm -m 1G -nographic \
    -kernel vmlinux \
    -append "console=ttyS0 nokaslr" \
    -device my-pci-device \
    -s -S
```

```bash
# 2. 다른 터미널에서 GDB
gdb vmlinux
(gdb) target remote :1234
(gdb) hbreak start_kernel
(gdb) continue
```

kernel 진입 직전부터 *모든 명령*을 GDB가 추적.

## Module symbol 추가

driver(`.ko`)는 *런타임 로드*되므로 GDB에 *별도 추가*.

```text
guest$ cat /sys/module/my_pci_driver/sections/.text
0xffffffffc0123000

# GDB
(gdb) add-symbol-file my_pci_driver.ko 0xffffffffc0123000
(gdb) hbreak my_pci_probe
(gdb) continue
```

probe·remove·IRQ handler에 breakpoint 가능.

## dmesg

`pr_*`·`dev_*` 매크로의 출력.

```c
dev_info(&pdev->dev, "DMA xfer %u bytes\n", len);
dev_err(&pdev->dev, "IDENT mismatch: 0x%x\n", ident);
dev_warn(&pdev->dev, "fallback path\n");
dev_dbg(&pdev->dev, "internal state: %d\n", state);   /* dynamic_debug */
```

| 매크로 | level |
|--------|-------|
| `dev_emerg` | 0 |
| `dev_alert` | 1 |
| `dev_crit` | 2 |
| `dev_err` | 3 |
| `dev_warn` | 4 |
| `dev_notice` | 5 |
| `dev_info` | 6 |
| `dev_dbg` | 7 (dynamic_debug 활성 시) |

guest에서:

```bash
guest$ dmesg | grep my_pci
my_pci 0000:00:04.0: probed
my_pci 0000:00:04.0: DMA xfer 4096 bytes
```

## dynamic_debug

`dev_dbg`는 *기본 비활성*. 동적으로 켜기.

```bash
guest$ echo 'module my_pci_driver +p' > /sys/kernel/debug/dynamic_debug/control
# 이후 모든 dev_dbg 출력

guest$ echo 'module my_pci_driver func my_pci_probe +p' > /sys/kernel/debug/dynamic_debug/control
# 특정 함수만
```

production driver에 *dev_dbg 점뿌*려 두면 디버깅 시 *runtime에 활성*.

## ftrace — function trace

```bash
guest$ cd /sys/kernel/debug/tracing
guest$ echo function > current_tracer
guest$ echo 'my_pci_*' > set_ftrace_filter
guest$ echo 1 > tracing_on

# (driver activity 발생)

guest$ echo 0 > tracing_on
guest$ cat trace
# ... my_pci_probe()
# ...   my_setup_irq()
# ...   my_create_chardev()
# my_dma_xfer()
# ...
```

함수 *call/return*이 모두 dump. latency까지.

## tracepoint — driver-side

```c
#include <linux/tracepoint.h>

DECLARE_TRACE(my_pci_dma_start, ...);
DECLARE_TRACE(my_pci_dma_done, ...);

static void my_dma_xfer(...) {
    trace_my_pci_dma_start(len);
    /* ... */
    trace_my_pci_dma_done(ret);
}
```

`trace-cmd`로 capture:

```bash
guest$ trace-cmd record -e 'my_pci:*' ./my_test
guest$ trace-cmd report
```

ftrace function trace보다 *낮은 overhead* + *custom field*.

## QEMU trace event

device 측 trace.

```c
/* hw/misc/my-pci-device.c */
#include "trace.h"

static void process_dma(MyPCIState *s) {
    trace_my_pci_dma_start(s->src_addr, s->dst_addr, s->dma_len);
    /* ... */
    trace_my_pci_dma_done(s->dma_len);
}
```

`hw/misc/trace-events`에 정의.

```text
my_pci_dma_start(uint64_t src, uint64_t dst, uint32_t len) "src=0x%lx dst=0x%lx len=%u"
my_pci_dma_done(uint32_t len) "len=%u"
```

QEMU 시작 시.

```bash
./qemu-system-x86_64 -trace "my_pci_*" -D /tmp/trace.log ...
```

`/tmp/trace.log`에 *timestamp + arg* dump.

## QEMU log mask

```bash
./qemu-system-x86_64 -d guest_errors,unimp -D /tmp/qemu.log ...
```

| flag | 의미 |
|------|------|
| `guest_errors` | guest의 잘못된 access(`LOG_GUEST_ERROR`) |
| `unimp` | 미구현 동작 |
| `in_asm` | guest assembly |
| `int` | interrupt |
| `mmu` | MMU |

device의 `qemu_log_mask(LOG_GUEST_ERROR, ...)`가 이 flag로 활성.

## kdump — panic dump

driver bug가 kernel panic 유발하면.

```bash
guest$ sudo apt install kdump-tools
guest$ sudo systemctl enable kdump-tools
```

panic 시 *vmcore*를 dump. `crash` tool로 분석.

```bash
host$ crash vmlinux vmcore
crash> bt
crash> log
crash> dis my_pci_probe
```

## Reproducible debugging — icount

```bash
./qemu-system-x86_64 -icount shift=0 -accel tcg ...
```

`icount`로 *결정론적 simulation*. 같은 input은 같은 timing. *재현 어려운 race*를 잡을 때.

## kgdb — guest의 kdb

가벼운 in-VM debugger.

```bash
guest$ echo g > /proc/sysrq-trigger
# kgdb prompt 진입 (sysrq 활성 시)
```

QEMU의 GDB stub보다 *제한적*이지만 *production kernel*에 사용 가능.

## KASAN — Address Sanitizer

driver의 *memory bug* 검출.

```bash
# kernel build with KASAN
make ARCH=... CONFIG_KASAN=y
```

driver에서 *out-of-bound*·*use-after-free* 발생 시 *상세 stack* 출력. 학습/test에 매우 유용.

## SLUB debugging

```bash
guest$ kernel cmdline에 slub_debug=ZPFU
```

`kmalloc`·`kfree` 정합성 검증. driver의 *double free*·*poisoning* 잡음.

## Race condition — lockdep

```bash
# kernel build with PROVE_LOCKING
CONFIG_PROVE_LOCKING=y
```

driver가 *deadlock 가능*한 lock 순서 사용 시 *런타임 warning*. 매우 강력.

## fault injection

artificial error.

```bash
guest$ echo 1 > /sys/kernel/debug/fail_make_request/probability
# block layer가 random fail
```

driver의 *error path*가 *동작하는지* 검증.

## Error injection via QMP

QEMU monitor에서.

```text
(qemu) qom-set /machine/peripheral-anon/device[0] inject_error 1
```

device-specific QOM property로 *fault 주입*. Ch 11 advanced scenarios.

## ASAN — userspace

user-space test tool은 *ASAN*.

```bash
gcc -fsanitize=address my_test.c -o my_test
./my_test
```

driver와 user-space의 *interface bug* 잡음.

## perf

```bash
guest$ perf stat ./my_test
guest$ perf record -e syscalls:sys_enter_ioctl ./my_test
guest$ perf report
```

driver의 *syscall pattern*·*cycle*·*cache miss* 분석.

## 흔한 디버깅 흐름

| 증상 | 첫 도구 |
|------|---------|
| probe 실패 | dmesg + GDB hbreak my_pci_probe |
| IRQ 안 옴 | `cat /proc/interrupts`, QEMU trace `msix_*` |
| DMA 결과 wrong | ftrace function trace + QEMU trace |
| 간헐적 fail | lockdep + KASAN |
| Kernel panic | kdump + crash |
| User-space race | perf + ASAN |
| 비결정적 | icount로 재현 |

## 흔한 함정

- **GDB symbol 없음** — `CONFIG_DEBUG_INFO=y` + 적절한 vmlinux 필요.
- **module reload 후 symbol stale** — `add-symbol-file`로 *재추가*.
- **ftrace overhead** — high-rate trace는 *system perturbation*. trace-cmd 권장.
- **QEMU trace event 빌드 시점** — meson에 새 event 추가 후 *re-configure*.

## 정리

- driver 디버깅은 *layer 별 도구* 조합 — kernel(GDB·dmesg·ftrace), QEMU(trace event·log mask), user-space(ASAN·perf).
- **GDB**로 명령어 단위. module은 `add-symbol-file`로 추가.
- **dynamic_debug**로 `dev_dbg`를 *런타임* 활성.
- **ftrace**·**tracepoint**·**trace-cmd**로 function/event-level trace.
- **QEMU `-trace`**·**`-d` log mask**가 device 측 view.
- **KASAN**·**lockdep**·**SLUB debug**로 *categorical bug class* 자동 검출.
- **icount**로 비결정적 race를 *재현 가능*하게.
- **fault injection**으로 error path 검증.

## 다음 장 예고

다음 장은 *디버깅을 자동화*로 — **test automation** + **CI 통합**.

## 관련 항목

- [Ch 8: Linux 드라이버 작성](/blog/tools/emulation/qemu-fake-device/chapter08-linux-driver)
- [Ch 10: Test Automation](/blog/tools/emulation/qemu-fake-device/chapter10-test-automation)
- [QEMU Embedded — GDB Remote](/blog/tools/emulation/qemu-embedded/chapter10-gdb-remote)
- [QEMU RISC-V — Tracing](/blog/tools/emulation/qemu-riscv/chapter10-tracing)
