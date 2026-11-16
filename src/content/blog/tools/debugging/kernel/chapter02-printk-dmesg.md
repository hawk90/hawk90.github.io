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

`printk()`는 커널의 기본 로그 인터페이스입니다. 쓰기는 쉽지만, 메시지가 어느 버퍼에 남고 어느 조건에서 콘솔에 찍히는지, 폭주하면 무엇이 잘리는지를 알아야 증거로 쓸 수 있습니다. 이 장은 [Ch 1](/blog/tools/debugging/kernel/chapter01-user-kernel-boundary)과 같은 Debian 13.7 arm64 게스트(커널 `6.12.116+deb13-arm64`)에서 log level, ring buffer, dynamic_debug, ratelimit을 직접 확인합니다. 실습 모듈은 Ch 1의 `kdbg_demo.ko`이고, 소스 인용은 v6.12 기준입니다.

:::tldr
`printk` → 커널 ring buffer(`__log_buf`) → `/dev/kmsg` → `dmesg`·journald. 콘솔에는 level 숫자가 `console_loglevel`보다 작은 메시지만 나갑니다. dynamic_debug는 컴파일돼 있는 `pr_debug` 호출 지점을 재컴파일 없이 켭니다.
:::

## printk 기본

`printk`는 첫 인자의 앞머리로 level을 받습니다. 아래는 가장 기본 형태입니다.

```c
#include <linux/printk.h>

printk(KERN_INFO "module loaded, val=%d\n", val);
printk(KERN_ERR  "failed to alloc %zu bytes\n", size);
pr_debug("verbose state: %s\n", name);
```

`KERN_*`는 함수 인자가 아니라 문자열 접두사입니다. v6.12 `include/linux/kern_levels.h`는 `KERN_SOH`를 `"\001"`로 정의하고 `KERN_ERR`를 `KERN_SOH "3"`처럼 만듭니다. 컴파일러가 두 문자열을 이어 붙이므로 `"\0013failed to alloc..."` 한 덩어리가 됩니다.

## Log levels

| 매크로 | 값 | `kern_levels.h` 주석 |
|--------|----|----|
| `KERN_EMERG`   | 0 | system is unusable |
| `KERN_ALERT`   | 1 | action must be taken immediately |
| `KERN_CRIT`    | 2 | critical conditions |
| `KERN_ERR`     | 3 | error conditions |
| `KERN_WARNING` | 4 | warning conditions |
| `KERN_NOTICE`  | 5 | normal but significant condition |
| `KERN_INFO`    | 6 | informational |
| `KERN_DEBUG`   | 7 | debug-level messages |
| `KERN_DEFAULT` | `""` | 접두사 없음. `default_message_loglevel`이 적용됨 |
| `KERN_CONT`    | `KERN_SOH "c"` | 앞 줄에 이어 쓰기 |

`KERN_CONT`에는 같은 헤더에 단서가 붙어 있습니다. "core/arch 코드가 부팅 초기에만 쓸 것, 그 밖에서는 SMP-safe하지 않다"는 주석입니다. 여러 CPU가 동시에 찍으면 이어 쓴 조각 사이에 다른 메시지가 끼어들 수 있으므로, 드라이버에서는 한 번의 호출로 한 줄을 완성합니다.

```c
/* 회피: 다른 CPU의 메시지가 사이에 끼어들 수 있음 */
pr_info("starting init... ");
do_init();
pr_cont("done\n");

/* Good: 결과를 모아 한 번에 */
rc = do_init();
pr_info("init %s\n", rc ? "failed" : "done");
```

## printk 출력 경로

![printk fans out from __log_buf to console, syslogd, /proc/kmsg, /dev/kmsg](/images/blog/debugging/kernel/diagrams/ch02-printk-fanout.svg)

메시지는 먼저 `kernel/printk/printk.c:527`의 `__log_buf`에 기록되고, 그다음 콘솔과 사용자 공간 읽기 인터페이스로 갈라집니다. 콘솔로 나갈지는 `suppress_message_printing()`(같은 파일 1290~1293행)이 정합니다. `level >= console_loglevel`이면 콘솔에서 빠지고(부팅 인자 `ignore_loglevel`이 없을 때), ring buffer에는 그대로 남습니다. 그래서 "콘솔에 안 보였다"는 "기록되지 않았다"와 다릅니다.

이 게스트의 콘솔은 하나였습니다.

```text
$ cat /proc/consoles
ttyAMA0              -W- (EC  p a)  204:64
```

## dmesg

`dmesg`(util-linux 2.41.5)는 `/dev/kmsg`에서 ring buffer를 읽습니다. 자주 쓰는 옵션은 다음과 같습니다.

```bash
dmesg -T                  # 사람이 읽는 시각
dmesg -w                  # follow
dmesg --level=err,warn    # 특정 level만
dmesg -C                  # ring buffer 비우기. 증거가 지워지므로 조사 중에는 쓰지 않음
```

이 게스트에서 `-T`로 본 마지막 두 줄은 이렇게 나왔습니다.

```text
$ dmesg -T | tail -2
[Mon Nov 16 09:42:07 2026] Showing busy workqueues and worker pools:
[Mon Nov 16 09:47:52 2026] hrtimer: interrupt took 35157630 ns
```

ring buffer 크기는 `CONFIG_LOG_BUF_SHIFT`로 정해지며, 이 커널은 17, 즉 128 KiB입니다. 부팅 인자 `log_buf_len=n[KMG]`(`kernel-parameters.txt:3182`)로 키울 수 있습니다. 크기를 읽는 debugfs 파일은 없습니다(`/sys/kernel/debug/log_buf_len`은 이 커널에 존재하지 않았습니다).

128 KiB가 얼마나 금방 차는지는 Ch 1에서 봤습니다. SysRq `t` 한 번이 task 106개의 스택을 쏟아냈고, 그 뒤 `dmesg --level=err,warn`의 마지막 줄은 scheduler 디버그 표의 꼬리였습니다. 부팅 초기 로그가 필요하면 덮이기 전에 journald가 디스크에 저장한 것을 봅니다(아래 journalctl 절).

## 콘솔 loglevel 변경

`/proc/sys/kernel/printk`의 네 숫자는 v6.12 `Documentation/admin-guide/sysctl/kernel.rst`(1047~1065행) 순서대로 `console_loglevel`, `default_message_loglevel`, `minimum_console_loglevel`, `default_console_loglevel`입니다.

```text
$ cat /proc/sys/kernel/printk
7	4	1	7
```

첫 값 7은 Debian 설정 `CONFIG_CONSOLE_LOGLEVEL_DEFAULT=7`에서 왔습니다. 부팅 인자에 `quiet`가 있으면 `CONFIG_CONSOLE_LOGLEVEL_QUIET=4`가 쓰이는데, 이 클라우드 이미지의 `/proc/cmdline`에는 `quiet`가 없었습니다. 따라서 이 게스트에서는 level 0~6이 콘솔에 나가고 `KERN_DEBUG`(7)만 빠집니다. 둘째 값 4는 `CONFIG_MESSAGE_LOGLEVEL_DEFAULT=4`로, level 없이 찍은 `printk`가 `KERN_WARNING`으로 기록된다는 뜻입니다.

`dmesg -n`은 첫 값만 바꿉니다.

```text
# dmesg -n 8; cat /proc/sys/kernel/printk
8	4	1	7
# dmesg -n 7; cat /proc/sys/kernel/printk
7	4	1	7
```

## 타임스탬프

각 줄 앞의 `[    0.000000]`은 부팅 후 초 단위 시각(소수점 6자리)입니다. `CONFIG_PRINTK_TIME=y`로 빌드됐고, 런타임 값은 모듈 파라미터로 보입니다.

```text
$ cat /sys/module/printk/parameters/time
Y
```

부팅 인자 `printk.time=`(`kernel-parameters.txt:4849`)으로 끄고 켤 수 있습니다.

## printk 변형

| 매크로 | 효과 |
|--------|------|
| `pr_emerg` … `pr_info` | `printk(KERN_* pr_fmt(fmt))`의 단축형 |
| `pr_debug` | `CONFIG_DYNAMIC_DEBUG`면 dynamic_debug 호출 지점으로 등록 (아래) |
| `dev_err`·`dev_info`·`dev_dbg(dev, …)` | 앞에 드라이버·장치 이름을 붙임 |
| `pr_warn_once` | 호출 지점마다 한 번만 출력 |
| `pr_warn_ratelimited` | 호출 지점마다 rate limit 적용 (아래) |
| `WARN_ON(cond)` | 조건이 참이면 `WARNING:` + 레지스터 + 스택을 찍고 **계속 실행** |
| `BUG_ON(cond)` / `BUG()` | oops를 일으킴. task는 죽지만 시스템은 설정에 따라 계속 돔 |
| `panic("...")` | 시스템 정지 |

`BUG()`를 panic과 같은 것으로 적은 자료가 많지만 arm64 v6.12에서는 다릅니다. `arch/arm64/kernel/traps.c`의 `die()`는 인터럽트 문맥이면(232행) 또는 `panic_on_oops`가 켜져 있으면(233~234행) `panic()`을 부르고, 그 밖에는 `make_task_dead(SIGSEGV)`(239행)로 현재 task만 끝냅니다. 이 게스트는 `panic_on_oops=0`이었습니다. 실제 oops는 Ch 7에서 봅니다.

`pr_fmt`를 정의하면 모든 `pr_*` 앞에 접두사가 붙습니다. 실습 모듈은 `#define pr_fmt(fmt) KBUILD_MODNAME ": " fmt`를 써서 메시지가 `kdbg_demo:`로 시작합니다.

`WARN_ON`이 실제로 남기는 것은 다음과 같습니다. 실습 모듈의 `warn` 트리거로 얻은 출력이고, 레지스터 줄은 생략했습니다.

```text
------------[ cut here ]------------
WARNING: CPU: 0 PID: 7761 at /root/mod/kdbg_demo.c:80 trigger_write+0x190/0x230 [kdbg_demo]
Modules linked in: kdbg_demo(OE) dm_mod vsock_loopback ...
CPU: 0 UID: 0 PID: 7761 Comm: bash Tainted: G           OE      6.12.116+deb13-arm64 #1  Debian 6.12.116-1
Tainted: [O]=OOT_MODULE, [E]=UNSIGNED_MODULE
Hardware name: QEMU QEMU Virtual Machine, BIOS edk2-stable202408-prebuilt.qemu.org 08/13/2024
pstate: 01400005 (nzcv daif +PAN -UAO -TCO +DIT -SSBS BTYPE=--)
pc : trigger_write+0x190/0x230 [kdbg_demo]
lr : trigger_write+0xd4/0x230 [kdbg_demo]
sp : ffff8000896fb900
...
Call trace:
 trigger_write+0x190/0x230 [kdbg_demo]
 full_proxy_write+0x68/0xc8
 vfs_write+0xdc/0x3b0
 ksys_write+0x7c/0x120
 __arm64_sys_write+0x24/0x38
 invoke_syscall+0x60/0xe0
 el0_svc_common.constprop.0+0x48/0xf0
 do_el0_svc+0x24/0x38
 el0_svc+0x38/0x148
 el0t_64_sync_handler+0xc8/0xe0
 el0t_64_sync+0x190/0x198
---[ end trace 0000000000000000 ]---
```

첫 줄에 소스 파일과 줄 번호(`kdbg_demo.c:80`)가 바로 나옵니다. 스택은 debugfs의 `full_proxy_write`를 거쳐 `write(2)` 시스템 콜(`__arm64_sys_write`)까지 이어지고, WARN 뒤에도 `bash`는 계속 돌았습니다. 대신 taint에 `W`가 더해집니다(Ch 1).

## dynamic_debug

`pr_debug`·`dev_dbg`는 보통 꺼져 있습니다. 운영 중인 커널에서 특정 드라이버의 디버그 메시지만 켜고 싶을 때 재빌드하지 않고 켜는 장치가 dynamic_debug입니다. 이 게스트는 `CONFIG_DYNAMIC_DEBUG=y`입니다.

### 호출 지점 목록

v6.12 `Documentation/admin-guide/dynamic-debug-howto.rst`(11행)에 따르면 `/proc/dynamic_debug/control`이 있으면 dynamic debug가 켜진 커널입니다. debugfs 쪽 `/sys/kernel/debug/dynamic_debug/control`도 같은 파일입니다.

```text
$ wc -l /proc/dynamic_debug/control
2981 /proc/dynamic_debug/control
$ head -3 /proc/dynamic_debug/control
# filename:lineno [module]function flags format
init/main.c:1160 [main]initcall_blacklisted =p "initcall %s blacklisted\n"
init/main.c:1121 [main]initcall_blacklist =p "blacklisting initcall %s\n"
$ grep 'drivers/cxl' /proc/dynamic_debug/control | head -1
drivers/cxl/core/region.c:2904 [cxl_core]cxl_is_hpa_in_chunk =_ "Addr trans fail: hpa 0x%llx not in expected chunk\n"
```

머리줄을 빼면 호출 지점 2,980개가 등록돼 있습니다. `=_`는 꺼짐, `=p`는 켜짐입니다. Ch 8에서 쓸 `drivers/cxl`의 `dev_dbg`도 여기 있습니다.

### 토글

실습 모듈에는 `pr_debug`가 두 개 있습니다(`trigger_write`의 73행, `kdbg_init`의 102행). 모듈 파라미터 `dyndbg=+p`로 로드하면 init의 디버그 메시지부터 보입니다.

```text
# insmod /root/mod/kdbg_demo.ko dyndbg=+p
# dmesg | tail -2
[  881.112110] kdbg_demo: loaded
[  881.112258] kdbg_demo: debug message from init
# grep kdbg_demo /proc/dynamic_debug/control
/root/mod/kdbg_demo.c:73 [kdbg_demo]trigger_write =p "trigger=%s len=%zu\n"
/root/mod/kdbg_demo.c:102 [kdbg_demo]kdbg_init =p "debug message from init\n"
```

끄고, 함수 하나만 장식 플래그와 함께 다시 켜 봤습니다. `x`는 모듈이 모르는 단어라 `write`가 `EINVAL`로 실패하지만, 그 전에 `pr_debug`가 실행됩니다.

```text
# echo 'module kdbg_demo -p' > /proc/dynamic_debug/control
# echo 'func trigger_write +pflmt' > /proc/dynamic_debug/control
# grep trigger_write /proc/dynamic_debug/control
/root/mod/kdbg_demo.c:73 [kdbg_demo]trigger_write =pmflt "trigger=%s len=%zu\n"
# echo -n x > /sys/kernel/debug/kdbg_demo/trigger
bash: echo: write error: Invalid argument
# dmesg | tail -1
[  881.153516] [47724] kdbg_demo:trigger_write:73: kdbg_demo: trigger=x len=1
```

`[47724]`는 `t`(thread ID), `kdbg_demo:`는 `m`, `trigger_write:`는 `f`, `73:`은 `l`이 붙인 것입니다. 뒤의 `kdbg_demo:`는 `pr_fmt`가 붙인 접두사입니다. `module kdbg_demo =_`로 플래그를 모두 지우면 원래대로 돌아갑니다.

플래그 정의는 howto 문서 207~230행에 있습니다.

| 플래그 | 의미 |
|--------|------|
| `+` / `-` / `=` | 추가 / 제거 / 지정한 값으로 설정 |
| `p` | 호출 지점 켜기 |
| `f` | 함수 이름 |
| `l` | 줄 번호 |
| `m` | 모듈 이름 |
| `s` | 소스 파일 이름 |
| `t` | thread ID (인터럽트 문맥이면 `<intr>`) |
| `_` | 플래그 없음 |

### 부팅 시

부팅 인자로는 `dyndbg="QUERY"`나 `module.dyndbg="QUERY"`를 씁니다(howto 239행). 아직 로드되지 않은 모듈의 `foo.dyndbg`도 저장됐다가 모듈이 올라올 때 적용되고, 맨 `dyndbg=`는 부팅 때만 처리됩니다(257~259행).

```text
dyndbg="file init/* +p #cmt ; func parse_one +p"
btrfs.dyndbg="+p"
```

## Ratelimit

루프 안의 printk가 폭주하면 128 KiB ring buffer가 금방 덮입니다. 그래서 반복될 수 있는 경로의 경고는 rate limit을 겁니다. 방법이 두 가지라 헷갈리기 쉬운데, 실습 모듈의 `rl` 트리거는 두 방식을 한 번에 20번씩 호출합니다.

```c
static DEFINE_RATELIMIT_STATE(rs, 5 * HZ, 3);   /* 5초에 3번 */

for (i = 0; i < 20; i++)
	if (__ratelimit(&rs))
		pr_warn("burst message %d\n", i);
for (i = 0; i < 20; i++)
	pr_warn_ratelimited("global-ratelimited message %d\n", i);
```

`rl`을 한 번 쓰고 6초 뒤 한 번 더 쓴 결과입니다.

```text
[  899.750837] kdbg_demo: burst message 0
[  899.751152] kdbg_demo: burst message 1
[  899.751278] kdbg_demo: burst message 2
[  899.751404] kdbg_demo: global-ratelimited message 0
...
[  899.753047] kdbg_demo: global-ratelimited message 9
[  905.781415] kdbg_ratelimit: 17 callbacks suppressed
[  905.781423] kdbg_demo: burst message 0
...
[  905.803200] kdbg_ratelimit: 10 callbacks suppressed
[  905.803201] kdbg_demo: global-ratelimited message 0
```

직접 만든 state는 3번, `pr_warn_ratelimited`는 10번 찍혔습니다. 버린 개수(20−3=17, 20−10=10)는 그때가 아니라 **다음 창이 열릴 때** `<함수>: N callbacks suppressed`로 보고됩니다(`lib/ratelimit.c:54~61`). 로그에서 이 줄을 보면 바로 앞 창에서 그만큼이 사라졌다는 뜻입니다.

`pr_warn_ratelimited`의 10번은 `include/linux/printk.h:677~685`의 `printk_ratelimited` 정의에서 옵니다. 호출 지점마다 `static DEFINE_RATELIMIT_STATE(_rs, DEFAULT_RATELIMIT_INTERVAL, DEFAULT_RATELIMIT_BURST)`를 만들고, 두 값은 `include/linux/ratelimit_types.h:9~10`에서 `5 * HZ`와 10입니다. 호출 지점마다 상태가 따로이므로 sysctl `kernel.printk_ratelimit`·`printk_ratelimit_burst`(이 게스트 5, 10)로는 바뀌지 않습니다. 이 sysctl은 `kernel/printk/sysctl.c:31~44`에서 보듯 `printk_ratelimit_state` 하나, 즉 옛 `printk_ratelimit()` 함수에만 연결돼 있습니다.

## Trace prints — printk가 너무 많을 때

ring buffer와 콘솔을 아끼려면 ftrace ring buffer로 보내는 `trace_printk()`가 있습니다. 실습 모듈의 `tp` 트리거 결과입니다.

```text
# echo tp > /sys/kernel/debug/kdbg_demo/trigger
# tail -1 /sys/kernel/tracing/trace
            bash-47724   [000] .....   887.218192: trigger_write: kdbg trace_printk len=3
```

출력은 dmesg가 아니라 `/sys/kernel/tracing/trace`에 남았고, 호출한 함수 이름이 자동으로 붙었습니다. 대가도 있습니다. `trace_printk`를 쓰는 모듈을 로드하는 순간 dmesg에 다음 경고가 찍혔습니다.

```text
** trace_printk() being used. Allocating extra memory.  **
**                                                      **
** This means that this is a DEBUG kernel and it is     **
** unsafe for production use.                           **
```

그래서 `trace_printk`는 디버깅 중 임시로만 쓰고, 제출할 코드에는 Ch 3의 tracepoint를 씁니다. eBPF 프로그램 안에서 같은 역할을 하는 것이 `bpf_trace_printk()`입니다(Ch 4).

## printk 출력 destination — 부팅 옵션

콘솔 장치는 `console=` 인자로 정합니다. 이 게스트(QEMU `virt`, PL011 UART)에서는 `ttyAMA0`입니다.

```text
console=ttyAMA0,115200     # arm64 PL011
console=ttyS0,115200       # x86 8250
earlycon                   # DT stdout-path 또는 ACPI SPCR을 따라 아주 이른 출력
```

`earlyprintk=`는 v6.12 `kernel-parameters.txt:1389`에서 `[X86,SH,ARM,M68k,S390,UM,EARLY]` 전용으로 표시돼 있어 arm64에는 해당하지 않습니다. arm64에서 부팅 초기 출력이 필요하면 `earlycon=`(1253행)을 씁니다. 이 게스트는 `ACPI: SPCR: console: pl011,mmio32,0x9000000,9600` 줄처럼 ACPI SPCR 테이블에서 콘솔을 찾았습니다.

## 운영 디버깅 — journalctl

ring buffer는 메모리에만 있고 128 KiB에서 덮입니다. systemd-journald(systemd 257)는 man 페이지에 적힌 대로 "Kernel log messages, via kmsg"를 수집하고, 이 게스트처럼 `/var/log/journal`이 있으면(`Storage=auto`) 디스크에 저장합니다. 그래서 덮여서 dmesg에서 사라진 부팅 초기 로그도 남아 있습니다.

```text
$ journalctl -k -b --no-pager | head -3
Nov 16 09:37:04 localhost kernel: Booting Linux on physical CPU 0x0000000000 [0x610f0000]
Nov 16 09:37:04 localhost kernel: Linux version 6.12.116+deb13-arm64 (debian-kernel@lists.debian.org) ...
Nov 16 09:37:04 localhost kernel: KASLR disabled due to lack of seed
```

Ch 1의 `KASLR disabled` 줄은 SysRq 덤프 뒤 `dmesg`에서는 이미 사라졌지만 `journalctl -k`에는 있었습니다. 옵션은 `-k`(커널만), `-b`(이번 부팅), `-b -1`(직전 부팅), `-p warning`(warning 이상), `-f`(follow)를 주로 씁니다. `journald.conf(5)`에 따르면 `Storage=auto`는 `/var/log/journal`이 없을 때 `/run/log/journal`(메모리)에만 쓰므로, 직전 부팅을 볼 수 있는지는 이 디렉터리가 있는지로 갈립니다.

## printk 함정

| 증상 | 원인 (이 장에서 확인한 것) |
|------|------|
| 콘솔에 안 보임 | level ≥ `console_loglevel` (`suppress_message_printing()`). dmesg에는 있음 |
| dmesg에서 부팅 초기 로그가 사라짐 | 128 KiB ring buffer가 덮임. `journalctl -k -b`나 `log_buf_len=` |
| `pr_debug`가 안 나옴 | dynamic_debug 호출 지점이 `=_`. `/proc/dynamic_debug/control`에서 `+p` |
| `printk_ratelimit` sysctl을 바꿨는데 효과 없음 | `pr_*_ratelimited`는 호출 지점별 state를 씀 |
| `N callbacks suppressed` | 직전 창에서 N개가 버려짐 |
| level 없이 찍은 printk가 warning으로 분류됨 | `default_message_loglevel`=4 |
| arm64에서 `earlyprintk=`가 무시됨 | x86 등 전용. `earlycon` 사용 |

## 한 예 — 드라이버 디버깅 흐름

위 실험을 순서대로 묶으면 장애 조사 흐름이 됩니다. 실습 모듈을 대상으로 했던 것을 그대로 적으면 다음과 같습니다.

1. 증상이 난 뒤 `dmesg`를 지우지 않고 `journalctl -k -b > before.txt`로 보존합니다.
2. 의심 모듈의 호출 지점을 확인합니다: `grep kdbg_demo /proc/dynamic_debug/control`.
3. 함수 단위로 켭니다: `echo 'func trigger_write +pflmt' > /proc/dynamic_debug/control`.
4. 재현하고 새 줄만 봅니다: `dmesg -w` 또는 `journalctl -kf`.
5. 끝나면 `=_`로 되돌립니다. 켜 둔 채로 두면 로그량이 늘어 ring buffer가 더 빨리 덮입니다.

## 정리

- `KERN_*`는 문자열 접두사(`"\001" "3"`)이고, level 숫자가 `console_loglevel`보다 작아야 콘솔에 나갑니다. ring buffer에는 모두 남습니다.
- 이 게스트의 printk sysctl은 `7 4 1 7`, ring buffer는 128 KiB입니다. 덮인 로그는 journald에서 찾습니다.
- `WARN_ON`은 스택을 찍고 계속 돌고 taint `W`를 남깁니다. `BUG()`는 oops이고, panic이 되는 것은 인터럽트 문맥이거나 `panic_on_oops`일 때입니다.
- dynamic_debug는 컴파일된 `pr_debug` 2,980개 중 원하는 것만 `+p`로 켜고 `ftlm` 플래그로 문맥을 덧붙입니다.
- `pr_*_ratelimited`는 호출 지점마다 5초에 10번이고, 버린 개수는 다음 창에서 보고됩니다.
- `trace_printk`는 ftrace 버퍼로 가지만 로드 시 "DEBUG kernel" 경고를 남깁니다.

## 다음 장 예고

Ch 3 — ftrace + tracepoints. printk를 넣지 않고 함수 호출과 정적 이벤트를 보는 방법을 같은 게스트에서 실행합니다.

## 관련 항목

- [Ch 1: 커널 디버깅 개론](/blog/tools/debugging/kernel/chapter01-user-kernel-boundary)
- [Ch 3: ftrace + tracepoints](/blog/tools/debugging/kernel/chapter03-ftrace-tracepoints)
- [Linux Kernel — printk basics (v6.12)](https://www.kernel.org/doc/html/v6.12/core-api/printk-basics.html)
- [`Documentation/admin-guide/dynamic-debug-howto.rst` (v6.12)](https://www.kernel.org/doc/html/v6.12/admin-guide/dynamic-debug-howto.html)
