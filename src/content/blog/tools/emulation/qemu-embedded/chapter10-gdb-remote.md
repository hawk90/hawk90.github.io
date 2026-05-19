---
title: "Ch 10: GDB 원격 디버깅"
date: 2026-05-17T10:00:00
description: "QEMU GDB 서버로 커널과 펌웨어를 원격 디버깅한다."
tags: [QEMU, GDB, Debugging, RSP, vmlinux]
series: "QEMU Embedded Emulation"
seriesOrder: 10
draft: true
---

JTAG·ICE 같은 외부 디버거 없이도 QEMU의 *내장 GDB 서버*가 kernel·firmware·user app을 *명령어 단위*로 디버깅하게 해 줍니다. JTAG 환경 셋업 비용이 0에 가까워 학습·CI·일상 개발에서 표준 도구.

## QEMU GDB stub

QEMU에 `-s -S` 두 옵션이 핵심.

| 옵션 | 의미 |
|------|------|
| `-s` | GDB 서버 활성, 포트 1234(`-gdb tcp::1234`의 단축) |
| `-S` | CPU 시작 시 *정지* — GDB 대기 |
| `-gdb tcp::5555` | 명시적 포트 |
| `-gdb unix:/tmp/gdb.sock,server` | unix socket |

```bash
qemu-system-aarch64 -M virt -cpu cortex-a72 -m 2G -nographic \
    -kernel vmlinux \
    -append "console=ttyAMA0 nokaslr" \
    -s -S
```

QEMU가 *시작 직후 정지*. GDB가 attach할 때까지 대기.

## GDB 연결

Cross GDB를 사용.

```bash
# Ubuntu
sudo apt install gdb-multiarch
# 또는 architecture별
sudo apt install gcc-aarch64-linux-gnu  # aarch64-linux-gnu-gdb 포함
```

ELF에 디버그 심볼 필요 — kernel은 `vmlinux`, user binary는 `-g`로 빌드된 ELF.

```bash
aarch64-linux-gnu-gdb vmlinux
```

연결.

```text
(gdb) target remote :1234
Remote debugging using :1234
0x0000000040080000 in ?? ()
(gdb)
```

## Kernel 디버깅 — 핵심 patterns

### Breakpoint at start_kernel

```text
(gdb) hbreak start_kernel
Hardware assisted breakpoint 1 at 0xffff80001000fae0: file init/main.c, line 884.

(gdb) continue
Continuing.

Breakpoint 1, start_kernel () at init/main.c:884
884	{
```

`hbreak` 권장 — RAM에 *kernel이 풀리기 전*에 거는 경우가 많기 때문.

### Source listing

```text
(gdb) list
884	{
885		char *command_line;
886		char *after_dashes;
887
888		set_task_stack_end_magic(&init_task);
...
```

소스 트리를 GDB가 찾을 수 있도록 ` directory ...`로 추가하거나 GDB를 *kernel build dir*에서 실행.

### Variable inspection

```text
(gdb) print init_task
$1 = {thread_info = {...}, ...}

(gdb) print init_task.comm
$2 = "swapper/0", ...

(gdb) print/x init_task.pid
$3 = 0x0
```

### Step

```text
(gdb) step           # 한 줄 (또는 함수 안으로)
(gdb) next           # 한 줄 (함수는 통째로)
(gdb) stepi / nexti  # 명령어 단위
(gdb) finish         # 함수 끝까지
(gdb) continue       # 다음 breakpoint까지
```

### Backtrace

```text
(gdb) bt
#0  start_kernel () at init/main.c:884
#1  0xffff800010001000 in __primary_switched ()
#2  0x0000000000000000 in ?? ()
```

## Module 디버깅

kernel module(`.ko`)은 *런타임 로드*되므로 GDB에 *심볼 추가*가 필요.

```text
guest$ insmod my_driver.ko
guest$ cat /proc/modules
my_driver 16384 0 - Live 0xffff800008a00000

# GDB로 돌아와서
(gdb) add-symbol-file my_driver.ko 0xffff800008a00000
(gdb) hbreak my_driver_probe
(gdb) continue
```

`0xffff800008a00000`이 module의 *text 시작 주소*. `/sys/module/my_driver/sections/.text`에서도 확인 가능.

## User process 디버깅

kernel과 user process를 같이 디버깅하려면 `gdbserver`를 user-space에 실행.

```bash
# guest
guest$ gdbserver :1235 ./my_program
Process ./my_program created; pid = 123
Listening on port 1235
```

```bash
# host (다른 terminal)
aarch64-linux-gnu-gdb my_program
(gdb) target remote 10.0.2.15:1235
(gdb) break main
(gdb) continue
```

guest의 IP는 `hostfwd`로 redirect 시 `localhost:1235`로 접근.

## TUI 모드

GDB의 *Text User Interface*가 source·disassembly·register를 동시에 보여 줍니다.

```text
(gdb) tui enable
(gdb) layout src       # source
(gdb) layout asm       # disassembly
(gdb) layout regs      # disassembly + 레지스터
(gdb) focus next       # 패널 이동
(gdb) Ctrl-L           # 화면 갱신
```

`layout src`가 kernel C 코드 디버깅에서 가장 자연스럽습니다.

## 자주 쓰는 명령

| 명령 | 의미 |
|------|------|
| `info registers` | 모든 레지스터 |
| `info registers x0 x1 lr` | 일부만 |
| `print/x $pc` | PC를 hex로 |
| `set $x0 = 0x1234` | 레지스터 수정 |
| `x/16xb 0x40000000` | 메모리 hex byte 16개 |
| `x/10i $pc` | 다음 명령어 10개 disassembly |
| `info threads` | 모든 thread |
| `thread N` | thread 전환 |
| `info breakpoints` | 모든 breakpoint |
| `delete N` | breakpoint 삭제 |
| `watch *0xaddr` | watchpoint |

## CONFIG_DEBUG_INFO

GDB로 *소스 레벨* 디버깅하려면 kernel을 *debug info 포함*해 빌드.

```bash
make menuconfig
# Kernel hacking → Compile-time checks → CONFIG_DEBUG_INFO=y
# Kernel hacking → CONFIG_DEBUG_INFO_DWARF5=y
# Kernel hacking → CONFIG_FRAME_POINTER=y
make -j$(nproc)
```

`vmlinux`가 *수백 MB*로 커지지만 GDB가 *line-level*에서 소스를 매핑할 수 있게 됩니다.

## VS Code 통합

GUI로 편하게 — VS Code Native Debug.

`.vscode/launch.json`:

```json
{
    "version": "0.2.0",
    "configurations": [{
        "name": "QEMU AArch64 kernel",
        "type": "cppdbg",
        "request": "launch",
        "program": "${workspaceFolder}/linux/vmlinux",
        "miDebuggerServerAddress": "localhost:1234",
        "miDebuggerPath": "/usr/bin/aarch64-linux-gnu-gdb",
        "MIMode": "gdb",
        "cwd": "${workspaceFolder}/linux",
        "setupCommands": [
            { "text": "set architecture aarch64" },
            { "text": "add-symbol-file vmlinux 0xffff800010000000" }
        ]
    }]
}
```

QEMU를 별도 터미널에서 `-s -S`로 띄우고 F5. breakpoint·step·variable inspect가 GUI로.

## 흔한 함정

- **`target remote :1234` 실패** — QEMU가 안 뜸 또는 `-s` 누락. `lsof -i :1234`로 확인.
- **소스 매핑 안 됨** — gdb를 *build dir*에서 실행하거나 `directory ...` 추가.
- **stripped binary** — symbol 부재. `nm vmlinux | head`로 확인.
- **KASLR로 주소 랜덤화** — `nokaslr` cmdline으로 비활성.

## 정리

- QEMU `-s -S`로 GDB 서버 시작. cross-GDB로 `target remote :1234` 접속.
- *Hardware breakpoint*(`hbreak`)가 RAM에 풀리기 전 코드(ROM 영역)에 권장.
- Module 디버깅은 *런타임* symbol 추가 (`add-symbol-file`).
- User process는 *guest에서 `gdbserver`* 실행 후 별도 포트로 연결.
- TUI(`layout src`)로 소스·disassembly·register 동시 표시.
- `CONFIG_DEBUG_INFO=y` + `nokaslr`이 source-level 디버깅의 전제.
- VS Code 통합으로 GUI 디버깅. launch.json 10줄.

## 다음 장 예고

다음 장은 *OS 없는* 환경 — **베어메탈 펌웨어**. linker script, reset vector, semihosting의 출발점.

## 관련 항목

- [Ch 9: 네트워킹](/blog/tools/emulation/qemu-embedded/chapter09-networking)
- [Ch 11: 베어메탈 펌웨어](/blog/tools/emulation/qemu-embedded/chapter11-baremetal)
- [QEMU RISC-V — GDB 디버깅](/blog/tools/emulation/qemu-riscv/chapter03-gdb-debugging)
- [GDB and LLDB](/blog/tools/debugging/gdb-lldb/chapter01-overview)
