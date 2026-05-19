---
title: "Ch 3: QEMU + GDB 디버깅"
date: 2026-05-17T21:00:00
description: "QEMU GDB 연동 — 브레이크포인트, 레지스터 검사, 싱글 스텝을 다룬다."
series: "RISC-V QEMU 심화"
seriesOrder: 3
tags: [RISC-V, QEMU, GDB, Debug, RSP]
draft: true
---

QEMU의 가장 강력한 기능 중 하나가 **내장 GDB stub**입니다. 실 보드의 JTAG 환경 없이도 GDB로 RISC-V 펌웨어·커널을 *명령어 단위* 디버깅할 수 있죠. JTAG 케이블·디버거 보드·OpenOCD 설정이 빠지므로 시작 비용이 0에 가깝습니다.

이 장은 QEMU GDB stub의 사용 흐름을 처음부터 끝까지 다룹니다 — 옵션, GDB 연결, 브레이크포인트·워치포인트, 레지스터·메모리 검사, TUI까지.

## QEMU GDB stub 어떻게 동작하나

QEMU는 시작 시 *GDB Remote Serial Protocol*(RSP)을 말하는 TCP 서버를 띄울 수 있습니다. GDB가 그 포트에 접속하면, GDB는 자신이 *원격 타깃*과 대화하고 있다고 인식하고, QEMU는 simulation을 *명령어 단위*로 진행시키며 응답합니다.

내부적으로 QEMU의 TCG(Tiny Code Generator)는 정상 simulation 도중 breakpoint hit이나 step 요청을 받으면 일시 중단하고, 레지스터·메모리 dump를 RSP 패킷으로 보냅니다. GDB는 이걸 *진짜 보드*에서 받는 것과 *구분하지 못합니다*. 같은 명령이 작동합니다.

## QEMU 측 옵션

```bash
qemu-system-riscv64 -machine virt -nographic \
    -kernel firmware.elf \
    -s -S
```

| 옵션 | 뜻 |
|------|------|
| `-s` | GDB 서버 활성, 포트 1234(`-gdb tcp::1234`의 단축) |
| `-S` | CPU 시작 시 *정지* — GDB가 attach할 때까지 진행 안 함 |
| `-gdb tcp::1234` | 명시적 포트 |
| `-gdb unix:/tmp/qemu.sock,server` | Unix socket(다른 host의 GDB와 분리할 때) |

`-S`를 빼면 QEMU가 그냥 진행해 버립니다. *초기 부트 시퀀스*를 보고 싶으면 거의 항상 `-S`를 줍니다.

## GDB 측 연결

RISC-V는 host와 ABI가 다르므로 *크로스 GDB*가 필요합니다.

```bash
# Ubuntu에서 패키지
sudo apt install gdb-multiarch
# 또는 RISC-V 전용
sudo apt install gcc-riscv64-linux-gnu  # gdb 포함
```

ELF에 디버그 심볼을 포함시키고(`-g`로 빌드), 그 ELF를 GDB가 읽도록 합니다.

```bash
riscv64-linux-gnu-gdb firmware.elf
```

GDB가 떴으면 원격 타깃에 연결.

```text
(gdb) target remote :1234
Remote debugging using :1234
0x0000000000001000 in ?? ()
(gdb)
```

`0x1000`은 virt 머신의 mrom 첫 명령어 위치입니다. 부트가 *여기서* 시작합니다.

ELF가 RAM에 *이미 로드*되어 있지 않다면(예: `-kernel`이 아니라 `-device loader,file=...`로 로딩하는 경우), `load` 명령으로 GDB가 직접 메모리에 쓸 수도 있습니다.

```text
(gdb) load
Loading section .text, size 0x... lma 0x80000000
Loading section .data, size 0x... lma 0x80001000
Start address 0x80000000, load size 4096
Transfer rate: ...
```

## 브레이크포인트

GDB의 표준 명령이 모두 작동합니다.

```text
(gdb) break main
Breakpoint 1 at 0x80000040: file main.c, line 12.

(gdb) break *0x80000100
Breakpoint 2 at 0x80000100

(gdb) info breakpoints
Num     Type           Disp Enb Address            What
1       breakpoint     keep y   0x0000000080000040 in main at main.c:12
2       breakpoint     keep y   0x0000000080000100

(gdb) delete 2
```

QEMU의 GDB stub은 *hardware breakpoint*와 *software breakpoint* 양쪽을 지원합니다.

| 종류 | 명령 | 메모리 |
|------|------|--------|
| Software | `break` | EBREAK 명령으로 패치(writable memory에서만) |
| Hardware | `hbreak` | trace HW가 별도 — read-only memory(ROM)에서도 작동 |

부트 ROM에 breakpoint를 걸려면 `hbreak`를 써야 합니다.

## 실행 제어

```text
(gdb) continue           # 또는 c  — 다음 breakpoint까지
(gdb) stepi              # 또는 si — 명령어 1개 단위
(gdb) nexti              # 또는 ni — 함수 호출은 한 번에 건너뛰고
(gdb) step               # 또는 s  — line 1개 (소스 사용 가능 시)
(gdb) next               # 또는 n  — line, 함수 건너뜀
(gdb) finish             # 현재 함수 끝까지
(gdb) until <line>       # 해당 line까지
```

부트 디버깅에서는 *stepi*가 거의 항상 적합합니다. C 코드 진입 후엔 *step* / *next*로 옮깁니다.

## 레지스터 검사

RISC-V 레지스터 전체:

```text
(gdb) info registers
ra             0x80000000          0x80000000 <_start>
sp             0x80200000          0x80200000
gp             0x80100000          0x80100000
tp             0x0                 0x0
t0             0x0                 0
t1             0x0                 0
...
pc             0x80000040          0x80000040 <main+4>
```

특정 레지스터만:

```text
(gdb) info registers pc sp ra
(gdb) p/x $pc
$1 = 0x80000040
(gdb) p/x $a0
$2 = 0x1
```

CSR도 GDB가 RSP를 통해 접근합니다.

```text
(gdb) info registers csr
mstatus        0x80006080
mtvec          0x80000200
mepc           0x80000048
mcause         0x0
mtval          0x0
satp           0x0
...
```

`mcause`와 `mepc`는 *trap 발생 시점*을 잡는 핵심 레지스터입니다. trap이 의심되면 `info reg mcause mepc`가 첫 디버깅 명령이 됩니다.

수정도 가능합니다.

```text
(gdb) set $a0 = 0x1234
(gdb) set $pc = 0x80000100
```

## 메모리 검사

```text
(gdb) x/10i $pc                  # 다음 명령어 10개 (disassembly)
=> 0x80000040 <main+4>:  addi   sp,sp,-32
   0x80000044 <main+8>:  sd     ra,24(sp)
   0x80000048 <main+12>: sd     s0,16(sp)
   ...

(gdb) x/4xw 0x80000000           # 4 word를 hex로
0x80000000 <_start>: 0x00000297 0x80828293 0x30529073 0x14002073

(gdb) x/s 0x80100000             # NULL-terminated string
0x80100000:  "Hello, RISC-V"

(gdb) x/16xb 0x80100000          # 16 bytes
0x80100000: 0x48 0x65 0x6c 0x6c 0x6f 0x2c 0x20 0x52
0x80100008: 0x49 0x53 0x43 0x2d 0x56 0x00 0x00 0x00
```

format specifier 요약:

| spec | 의미 |
|------|------|
| `b` | byte |
| `h` | halfword (2 bytes) |
| `w` | word (4 bytes) |
| `g` | giant (8 bytes) |
| `x` | hex |
| `d` | decimal |
| `i` | instruction |
| `s` | string |
| `c` | char |

## 워치포인트

특정 메모리 위치에 *접근이 일어날 때* 멈춥니다. 자료구조가 어디서 손상되는지 추적할 때 가장 강력한 도구입니다.

```text
(gdb) watch *(int *)0x80002000      # write watch
(gdb) rwatch *(int *)0x80002000     # read watch
(gdb) awatch *(int *)0x80002000     # access watch (read or write)
```

watchpoint는 QEMU의 *hardware breakpoint* 메커니즘에 매핑됩니다. 개수에 제약이 있을 수 있지만 일반적으로 충분.

## TUI 모드

GDB의 *Text User Interface*가 소스·disassembly·레지스터를 동시에 보여 줍니다.

```text
(gdb) tui enable
(gdb) layout asm           # disassembly
(gdb) layout regs          # disassembly + 레지스터
(gdb) layout split         # 소스 + disassembly
(gdb) focus next           # 패널 사이 이동
(gdb) Ctrl-L               # 화면 갱신
```

`layout regs`가 부트 디버깅 중 가장 자주 쓰는 모드입니다. `stepi` 한 번에 PC가 어떻게 이동하고 어떤 레지스터가 갱신되는지가 한 화면에 보입니다.

## 부트 디버깅 시나리오 — 첫 명령어

OpenSBI를 디버깅하는 가장 작은 예.

```bash
# Terminal 1: QEMU
qemu-system-riscv64 -machine virt -nographic \
    -bios opensbi-fw_jump.elf -s -S
```

```bash
# Terminal 2: GDB
riscv64-linux-gnu-gdb opensbi-fw_jump.elf
```

```text
(gdb) target remote :1234
(gdb) info reg pc
pc             0x1000              0x1000
(gdb) x/4i $pc
=> 0x1000:  auipc   t0,0x0
   0x1004:  addi    a1,t0,32
   0x1008:  csrr    a0,mhartid
   0x100c:  ld      t0,24(t0)
(gdb) stepi
(gdb) stepi
(gdb) info reg pc t0 a1
pc             0x100c
t0             0x1000
a1             0x1020
(gdb) continue
```

이 짧은 시퀀스가 QEMU virt 머신의 *부트 ROM 첫 4 instruction*입니다. mhartid를 a0로 가져오고, DTB 포인터를 a1로 넘기고, jump destination을 t0로 로드합니다.

## 흔한 함정

- **`target remote :1234` 실패** — QEMU가 안 떴거나, `-s` 안 줬거나, 다른 포트. `lsof -i :1234`로 확인.
- **symbol 없음** — ELF가 stripped이거나 `-g` 없이 빌드. RISC-V toolchain에서 `riscv64-linux-gnu-objdump -h *.elf`로 `.debug_*` 섹션 확인.
- **`stepi` 무한 루프** — interrupt 안에서 stepi를 누르면 ISR 안만 돌 수 있음. `finish`로 빠져나오기.
- **CSR 접근 안 됨** — QEMU 버전에 따라 일부 CSR이 GDB stub에 미노출. 최신 QEMU로 업데이트.
- **macOS에서 gdb 부재** — macOS는 `lldb`가 표준. `lldb-multiarch`를 쓰거나 Docker로 우회.

## VS Code 통합

GDB를 직접 쓰는 게 부담스러우면 VS Code의 Native Debug 또는 Cortex-Debug(RISC-V도 지원)로 GUI 디버깅이 됩니다. `.vscode/launch.json` 예:

```json
{
  "version": "0.2.0",
  "configurations": [{
    "name": "QEMU RISC-V",
    "type": "cppdbg",
    "request": "launch",
    "program": "${workspaceFolder}/firmware.elf",
    "miDebuggerServerAddress": "localhost:1234",
    "miDebuggerPath": "/usr/bin/riscv64-linux-gnu-gdb",
    "MIMode": "gdb",
    "cwd": "${workspaceFolder}",
    "stopAtEntry": true
  }]
}
```

QEMU를 별도 터미널에서 `-s -S`로 띄워 두고 VS Code에서 F5를 누르면 됩니다.

## 정리

- QEMU의 `-s -S`로 GDB stub을 띄우고 cross-GDB로 `target remote :1234` 접속.
- 표준 GDB 명령이 *그대로* 작동합니다 — break/hbreak·step/stepi·watch.
- 부트 ROM에 break를 걸려면 `hbreak`. RAM은 `break`로 충분.
- 레지스터는 `info registers`, CSR도 같은 명령으로 노출. `mcause`/`mepc`가 trap 디버깅의 첫 단서.
- 메모리는 `x/<count><format><size>` syntax. 자주 쓰는 조합: `x/10i $pc`, `x/4xw addr`, `x/s addr`.
- TUI `layout regs`가 부트 디버깅에서 가장 유용.
- VS Code 통합도 5줄짜리 launch.json이면 동작.

## 다음 장 예고

다음 장은 *마이크로컨트롤러급* RISC-V를 다루는 머신 **sifive_e**를 분석합니다. SiFive HiFive1 호환 환경에서 baremetal 펌웨어를 어떻게 띄우고 디버깅하는지.

## 관련 항목

- [Ch 2: virt 머신 해부](/blog/tools/emulation/qemu-riscv/chapter02-virt-machine)
- [Ch 4: sifive_e 머신](/blog/tools/emulation/qemu-riscv/chapter04-sifive-e)
- [GDB and LLDB](/blog/tools/debugging/gdb-lldb/chapter01-overview) — GDB 일반 사용법
- [QEMU Embedded — GDB Remote](/blog/tools/emulation/qemu-embedded/chapter10-gdb-remote)
