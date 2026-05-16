---
title: "Ch 2: printk / dmesg / dynamic_debug"
date: 2025-09-06T02:00:00
description: "커널 로깅의 모든 것. log level, ring buffer, ratelimit, 런타임 토글."
tags: [kernel, printk, dmesg, dynamic-debug]
series: "Kernel Debugging"
seriesOrder: 2
draft: false
---

커널 디버깅의 *가장 빠른 도구*는 printk입니다. 너무 단순해 무시하기 쉽지만, *대부분의 커널 버그가 printk 한 줄로 잡힙니다*. 다만 잘 쓰려면 *log level*, *ring buffer*, *ratelimit*, *dynamic_debug*를 알아야 합니다.

## 한 줄 요약

`printk(KERN_INFO "...")` → 커널 ring buffer → `dmesg`. dynamic_debug로 런타임에 디버그 메시지 켜고 끄기.

## printk 기본

```c
#include <linux/kernel.h>

printk(KERN_INFO "module loaded, val=%d\n", val);
printk(KERN_ERR  "failed to alloc %zu bytes\n", size);
printk(KERN_DEBUG "verbose state: %s\n", name);
```

`KERN_*` 접두사가 *log level*. 출력은 *컴파일 시 결합* — 매크로가 문자열 앞에 `\001 N` (N = level)을 붙임.

## Log levels

| 매크로 | 값 | 의미 | 콘솔 출력 (기본) |
|--------|----|----|------|
| `KERN_EMERG`   | 0 | 시스템 사용 불가 | ✓ |
| `KERN_ALERT`   | 1 | 즉시 조치 필요 | ✓ |
| `KERN_CRIT`    | 2 | critical | ✓ |
| `KERN_ERR`     | 3 | error | ✓ |
| `KERN_WARNING` | 4 | warning | ✓ |
| `KERN_NOTICE`  | 5 | normal but significant | ✗ |
| `KERN_INFO`    | 6 | informational | ✗ |
| `KERN_DEBUG`   | 7 | debug | ✗ |
| `KERN_DEFAULT` | (현재 default) | (보통 4 = warning) | |
| `KERN_CONT`    | 특수 | 이전 메시지에 이어 출력 (no newline) | |

`KERN_CONT`로 한 줄을 여러 printk로 조합.

```c
printk(KERN_INFO "starting init... ");
do_init();
printk(KERN_CONT "done\n");
```

## printk 출력 경로

```
printk(...) → __log_buf (ring buffer) → ┬─ console (TTY/serial)
                                          └─ syslogd / journald
                                          └─ /proc/kmsg
                                          └─ /dev/kmsg
```

여러 destination이 동시에. *console*은 console_loglevel 이하만 표시 (기본 7 또는 4).

## dmesg

```bash
$ dmesg                 # 전체 출력
$ dmesg -T              # 타임스탬프 사람 읽기
$ dmesg -w              # follow (tail -f 비슷)
$ dmesg --level=err,warn  # 특정 level만
$ dmesg --facility=kern   # 커널만 (default)
$ dmesg --clear         # ring buffer 비우기
$ dmesg --notime        # 타임스탬프 숨김
$ dmesg --color=always  # 컬러
```

ring buffer 크기는 `CONFIG_LOG_BUF_SHIFT` (보통 16-17 = 64-128KB). 부팅 옵션 `log_buf_len=2M`로 늘림.

```bash
$ cat /sys/kernel/debug/log_buf_len
2097152
```

## 콘솔 loglevel 변경

```bash
# 현재 상태
$ cat /proc/sys/kernel/printk
4       4       1       7
# [현재] [기본] [최소] [부팅 시]

# 콘솔에 모든 메시지 출력 (디버깅 시)
$ echo 8 | sudo tee /proc/sys/kernel/printk

# dmesg -n N 도 같은 효과
$ sudo dmesg -n 7
```

위 4숫자.
1. *현재 console_loglevel* — 이 미만 level만 console로.
2. *default_message_loglevel* — KERN_DEFAULT의 의미.
3. *minimum_console_loglevel* — 사용자가 설정 가능한 최소.
4. *default_console_loglevel* — 부팅 시 초기값.

## 타임스탬프

```bash
$ dmesg | head -3
[    0.000000] Linux version 6.5.0-...
[    0.123456] BIOS-provided physical RAM map:
[    0.234567] x86/PAT: ...
```

부팅 후 *초.마이크로초*. `dmesg -T`면 사람 시각.

```bash
# 부팅 시 옵션으로 변경
printk.time=1  # default on
printk.time=0  # off
```

## printk 변형

| 매크로 | 효과 |
|--------|------|
| `pr_emerg/alert/crit/err/warn/notice/info/debug` | KERN_* 단축형 |
| `dev_emerg/.../dev_dbg(dev, ...)` | device 정보 prefix |
| `netdev_*(dev, ...)` | net device prefix |
| `pr_debug` | dynamic_debug 통합 (아래) |
| `pr_warn_once` / `pr_err_once` | 한 번만 출력 |
| `pr_warn_ratelimited` | rate-limit 적용 |
| `WARN_ON(cond)` | 조건이 참이면 warning + stack dump |
| `WARN(cond, fmt, ...)` | 위 + 메시지 |
| `BUG_ON(cond)` | 조건이 참이면 panic |
| `BUG()` | 즉시 panic |
| `panic("...")` | 명시적 panic |

`WARN_ON`은 *디버깅 친화*. 조건이 잘못됐을 때 stack trace 남기고 *계속 실행*.

```c
WARN_ON(some_invariant_broken);
```

```
WARNING: CPU: 2 PID: 1234 at drivers/foo.c:42 my_function+0x10/0x80
[hardware info]
RIP: 0010:my_function+0x10/0x80
[register dump]
Call Trace:
 ...
```

## dynamic_debug

`pr_debug` / `dev_dbg`로 작성된 메시지는 *컴파일 시* 코드는 포함되지만 *런타임에 토글* 가능. 운영 환경에서 *서비스 재시작 없이* 특정 모듈만 verbose.

### 활성화

```bash
$ sudo mount -t debugfs none /sys/kernel/debug  # 보통 자동
$ cat /sys/kernel/debug/dynamic_debug/control | head -3
drivers/usb/core/devio.c:1234 [usbcore]usb_revoke =_ "...message format..."
fs/btrfs/super.c:567 [btrfs]btrfs_check_super =_ "...format..."
```

각 줄: `file:line [module]function = <flag> "format"`.
- `=_` 비활성, `=p` 활성 (print), `=_p` 활성+stack.

### 토글

```bash
# 특정 파일의 모든 pr_debug 활성화
$ echo 'file fs/btrfs/super.c +p' | sudo tee /sys/kernel/debug/dynamic_debug/control

# 특정 모듈
$ echo 'module btrfs +p' | sudo tee /sys/kernel/debug/dynamic_debug/control

# 특정 함수
$ echo 'func btrfs_check_super +p' | sudo tee /sys/kernel/debug/dynamic_debug/control

# 비활성화
$ echo 'module btrfs -p' | sudo tee /sys/kernel/debug/dynamic_debug/control

# 메시지에 file:line / func / module 정보 추가
$ echo 'module btrfs +pfml' | sudo tee /sys/kernel/debug/dynamic_debug/control
```

플래그.

| 플래그 | 의미 |
|--------|------|
| `+p` | print (활성) |
| `-p` | 비활성 |
| `+f` | function name 추가 |
| `+l` | line number 추가 |
| `+m` | module name 추가 |
| `+t` | thread id 추가 |
| `+_` | 모두 끔 |

### 부팅 시

```
boot cmdline:
dyndbg="module btrfs +p; module xfs +p"
```

또는 module 로드 시.

```
$ sudo modprobe btrfs dyndbg=+p
```

대규모 운영 사고에서 *실시간으로 verbose 로깅 켜기* — 매우 강력. 일반 printk 추가는 *재컴파일* 필요하지만 dynamic_debug는 토글만.

## Ratelimit

루프 안의 printk가 *수천 줄 폭주* → ring buffer가 가득 차 다른 메시지 손실.

```c
if (some_error) {
    printk_ratelimited(KERN_WARNING "transient error: %d\n", err);
    // 또는
    pr_warn_ratelimited("...");
}
```

기본 rate: *10초에 10회*. 초과 메시지는 *조용히 drop*. 변경:

```c
static DEFINE_RATELIMIT_STATE(my_rs, 5 * HZ, 100);  // 5초에 100회

if (__ratelimit(&my_rs))
    pr_warn("...");
```

또는 `/proc/sys/kernel/printk_ratelimit*`로 시스템 전체 조정.

## Trace prints — printk가 너무 느릴 때

printk는 *console 출력 락*과 *string formatting*으로 *us~ms* 단위 비용. 핫 path (인터럽트, 스케줄러 내부)엔 부적합.

대안:
- **ftrace**의 `trace_printk()` — ring buffer만 (no console).
- **eBPF**의 `bpf_trace_printk()` — eBPF 프로그램용.

```c
// in-kernel
trace_printk("fast trace: val=%d\n", val);
```

```bash
$ sudo cat /sys/kernel/debug/tracing/trace_pipe
```

Ch 3에서 자세히.

## printk 출력 destination — 부팅 옵션

```
console=ttyS0,115200    # serial port
console=tty0            # vga
console=ttyUSB0
earlyprintk=ttyS0,115200  # 매우 초기 (printk 자체 못 쓸 때)
```

가상 머신 디버깅엔 *serial 콘솔*이 표준. dmesg + tail -f로 호스트에서 실시간.

```bash
$ qemu -serial mon:stdio ...     # qemu serial
```

## 운영 디버깅 — journalctl

systemd 환경에서 dmesg 대신.

```bash
$ journalctl -k                 # kernel only
$ journalctl -kf                # follow
$ journalctl -k --since "1 hour ago"
$ journalctl -k -p err          # priority error 이하
$ journalctl -k --until "2023-12-01 09:00" --since "2023-11-30"
```

journald는 ring buffer + 디스크 *영구 저장*. 부팅 간 보존.

## printk 함정

| 증상 | 원인 |
|------|------|
| 메시지 안 보임 | console_loglevel < message level |
| 일부 메시지만 보임 | ring buffer 가득 (log_buf_len ↑) |
| 부팅 초기 메시지 없음 | earlyprintk 옵션 없음 |
| dynamic_debug 비활성 | CONFIG_DYNAMIC_DEBUG 또는 debugfs 미마운트 |
| `pr_debug` 출력 안 됨 | CONFIG_DYNAMIC_DEBUG_CORE 필요 + 활성화 |
| 메시지 깨짐 | 멀티 CPU 동시 printk — 인터리브. printk 안에선 atomic이지만 *console UART는* 직렬 |
| WARN 후 시스템 정상 | 의도된 동작 (panic 아님) |

## 한 예 — Driver 디버깅 흐름

```c
static int my_probe(struct platform_device *pdev) {
    dev_info(&pdev->dev, "probing\n");
    
    val = readl(reg);
    dev_dbg(&pdev->dev, "init value: 0x%08x\n", val);  // dynamic
    
    if (val == 0xDEADBEEF) {
        dev_err(&pdev->dev, "device locked, value=0x%08x\n", val);
        return -ENODEV;
    }
    
    return 0;
}
```

실행 시:
```bash
# 일반 운영 — info, err만 보임
$ dmesg | grep my_device
my_device probing
# error 발생 시
my_device device locked, value=0xdeadbeef

# 사고 후 디버깅 — debug 메시지 켜기
$ echo 'module my_driver +pfl' | sudo tee /sys/kernel/debug/dynamic_debug/control
$ dmesg -c    # clear
$ # 문제 재현
$ dmesg
my_device probing
my_driver:my_probe:42 init value: 0x12345678
my_device device locked, value=0xdeadbeef
```

## 정리

- printk는 *가장 단순하고 빠른* 커널 디버그 도구.
- KERN_* 레벨이 *console 출력 여부* 결정.
- dmesg / journalctl -k로 ring buffer 읽기.
- dynamic_debug로 *재컴파일 없이* pr_debug 토글.
- WARN_ON은 stack dump + 계속, BUG_ON은 panic.
- ratelimit로 폭주 방지.
- 핫 path엔 trace_printk 또는 eBPF.
- earlyprintk + serial로 부팅 초기 디버깅.

## 다음 장 예고

Ch 3 — ftrace + tracepoints. printk 없이 *모든 함수 호출*을 보는 표준 도구.

## 관련 항목

- [Ch 1: 커널 디버깅 개론](/blog/tools/debugging/kernel/chapter01-user-kernel-boundary)
- [Ch 3: ftrace + tracepoints](/blog/tools/debugging/kernel/chapter03-ftrace-tracepoints)
- [strace-tracing Ch 9: ftrace](/blog/tools/strace-tracing/chapter09-ftrace)
- [Linux Kernel — printk docs](https://www.kernel.org/doc/html/latest/core-api/printk-basics.html)
- [`Documentation/admin-guide/dynamic-debug-howto.rst`](https://www.kernel.org/doc/html/latest/admin-guide/dynamic-debug-howto.html)
