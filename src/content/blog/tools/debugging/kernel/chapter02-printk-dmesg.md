---
title: "printk·dmesg·dynamic_debug 분석 — 커널 로그 추적"
slug: "tools/debugging/kernel/chapter02-printk-dmesg"
date: 2026-05-25T09:02:00
description: "커널 로깅의 모든 것. log level, ring buffer, ratelimit, 런타임 토글."
tags: [kernel, printk, dmesg, dynamic-debug]
series: "Kernel Debugging"
seriesOrder: 2
draft: false
topics: ["tools", "tools/debugging"]
---

`printk()`는 커널의 기본 로그 인터페이스입니다. 관찰 지점과 메시지 빈도를 신중히 정해야 합니다. 특히 legacy console의 핫패스에서 과도하게 호출하면 지연이나 lockup을 일으킬 수 있습니다. log level, ring buffer, ratelimit, dynamic_debug의 동작을 함께 살펴봅니다.

:::tldr
`printk(KERN_INFO "...")` → 커널 ring buffer → `/dev/kmsg` 등 사용자 공간 인터페이스 → `dmesg`. dynamic_debug는 컴파일된 디버그 호출 지점을 조건에 따라 활성화합니다.
:::

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
| `KERN_DEFAULT` | 명시되지 않은 메시지의 기본 수준 | 커널 설정·부팅 인자에 따라 다름 | |
| `KERN_CONT`    | 특수 | 이전 메시지에 이어 출력 (no newline) | |

`KERN_CONT`는 이어지는 로그 조각에 사용되지만, 동시 실행 환경에서 임의의 여러 `printk()`를 하나의 원자적 줄로 묶어 주지는 않습니다. 가능하면 한 번의 호출로 메시지를 기록합니다.

```c
printk(KERN_INFO "starting init... ");
do_init();
printk(KERN_CONT "done\n");
```

## printk 출력 경로

![printk fans out from __log_buf to console, syslogd, /proc/kmsg, /dev/kmsg](/images/blog/debugging/kernel/diagrams/ch02-printk-fanout.svg)

메시지는 커널 ring buffer에 기록되고, console은 우선순위 숫자가 현재 `console_loglevel`보다 작은 메시지를 표시합니다. 실제 destination과 보존 여부는 설정에 따릅니다.

## dmesg

```bash
$ dmesg                 # 전체 출력
$ dmesg -T              # 타임스탬프 사람 읽기
$ dmesg -w              # follow (tail -f 비슷)
$ dmesg --level=err,warn  # 특정 level만
$ dmesg --facility=kern   # 커널만 (default)
$ dmesg --clear         # ring buffer를 비움 (기존 증거가 삭제되므로 진단 중 주의)
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
2. *default_message_loglevel* — 명시적 수준이 없는 메시지의 기본값.
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

```text
WARNING: CPU: 2 PID: 1234 at drivers/foo.c:42 my_function+0x10/0x80
[hardware info]
RIP: 0010:my_function+0x10/0x80
[register dump]
Call Trace:
 ...
```

## dynamic_debug

`pr_debug` / `dev_dbg` 호출이 dynamic debug로 등록되어 있고 관련 커널 설정이 켜져 있으면 런타임에 선택적으로 활성화할 수 있습니다. 실행 중인 커널에 해당 호출 지점이 컴파일되어 있어야 하며, 로그량·민감 정보 노출·성능 영향을 검토해야 합니다.

### 활성화

```bash
$ sudo mount -t debugfs none /sys/kernel/debug  # 보통 자동
$ cat /sys/kernel/debug/dynamic_debug/control | head -3
drivers/usb/core/devio.c:1234 [usbcore]usb_revoke =_ "...message format..."
fs/btrfs/super.c:567 [btrfs]btrfs_check_super =_ "...format..."
```

각 줄: `file:line [module]function = <flag> "format"`.
- `=` 뒤의 플래그에서 `p`는 해당 호출 지점을 출력하도록 활성화한다. 실제 표시 필드는 `f`, `l`, `m`, `t` 등 별도 플래그로 선택한다.

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
| `+_` | 플래그 전체 초기화 |

### 부팅 시

```text
boot cmdline:
dyndbg="module btrfs +p; module xfs +p"
```

또는 module 로드 시.

```bash
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

커널 기본 ratelimit은 *5초 간격, burst 10회*입니다. `DEFINE_RATELIMIT_STATE`로 만든 개별 제한은 전달한 interval·burst 값이 적용됩니다. 제한을 넘긴 로그는 생략될 수 있습니다. 변경:

```c
static DEFINE_RATELIMIT_STATE(my_rs, 5 * HZ, 100);  // 5초에 100회

if (__ratelimit(&my_rs))
    pr_warn("...");
```

또는 `/proc/sys/kernel/printk_ratelimit*`로 시스템 전체 조정.

## Trace prints — printk가 너무 느릴 때

printk의 비용은 호출 빈도, 콘솔 드라이버, 설정과 커널 선점 모델에 따라 달라집니다. legacy console의 고빈도 핫패스 출력은 긴 동기식 flush로 lockup까지 유발할 수 있으므로, 무조건적인 시간 수치 대신 rate-limited 로그나 tracing을 검토합니다.

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

```text
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
| 핫패스 로그로 지연·lockup | legacy console은 printk 출력 중 동기화·console flush 비용이 생길 수 있음. 호출률 제한 또는 trace 도구를 검토 |
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
# 기존 로그를 보존한 채 문제를 재현하고 새 메시지를 관찰
$ dmesg --follow --human
my_device probing
my_driver:my_probe:42 init value: 0x12345678
my_device device locked, value=0xdeadbeef
```

## 정리

- printk는 커널 기본 로그 도구이며, 호출 빈도와 console 경로에 따라 성능·지연 영향이 달라집니다.
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
- strace-tracing Ch 9: ftrace
- [Linux Kernel — printk docs](https://www.kernel.org/doc/html/latest/core-api/printk-basics.html)
- [`Documentation/admin-guide/dynamic-debug-howto.rst`](https://www.kernel.org/doc/html/latest/admin-guide/dynamic-debug-howto.html)
