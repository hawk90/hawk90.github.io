---
title: "Ch 5: kdb / kgdb — 인터랙티브 커널 디버깅"
date: 2025-09-06T05:00:00
description: "별 머신 또는 시리얼로 커널을 step-debug. kgdb 셋업, gdb 연결, 실전 흐름."
tags: [kernel, kgdb, kdb, serial, vm-debug]
series: "Kernel Debugging"
seriesOrder: 5
draft: false
---

ftrace·eBPF는 *관찰*만 합니다. *실시간으로 멈추고 변수를 검사*하려면 **kgdb**가 답입니다. 커널이 *자기 자신을 디버깅할 수 없으므로* 별 머신 (호스트) 또는 시리얼 콘솔이 필요합니다. 가상화 시대엔 QEMU + virtio serial이 표준.

:::tldr
타깃 머신 (또는 VM)에 *kgdb stub*을 켜고, 호스트의 *gdb*가 serial/TCP로 연결 → user-space와 같은 step debug.
:::

## 두 가지 모드

| 모드 | 사용 |
|------|------|
| **kdb** | 타깃 콘솔에서 *바로* 디버그 (kgdb 없이) |
| **kgdb** | 호스트 gdb가 *원격* 연결 |

kdb는 *간단한 명령* (bt, ps, mem 등). kgdb는 *full gdb*. 함께 활성화 가능.

## 빌드 옵션

```
CONFIG_KGDB=y
CONFIG_KGDB_SERIAL_CONSOLE=y
CONFIG_KGDB_KDB=y          # kdb도
CONFIG_DEBUG_INFO=y
CONFIG_FRAME_POINTER=y     # 콜스택 안정성 ↑
CONFIG_KGDB_LOW_LEVEL_TRAP=y
```

배포판 커널은 보통 *비활성*. 자체 빌드 또는 *debug build* 사용.

## QEMU + 자체 커널

```bash
# 1. 커널 빌드 (위 CONFIG_*)
$ make -j$(nproc)

# 2. QEMU 실행 — kgdb on serial + console
$ qemu-system-x86_64 \
    -kernel arch/x86/boot/bzImage \
    -append "console=ttyS0 kgdbwait kgdboc=ttyS1,115200 nokaslr" \
    -serial mon:stdio \
    -serial tcp::4444,server,nowait \
    -hda rootfs.img \
    -m 1G
```

부팅 옵션 핵심.

- `kgdbwait` — *부팅 초기*에 디버거 대기 (안 켜면 부팅 진행).
- `kgdboc=ttyS1,115200` — kgdb를 두 번째 시리얼에.
- `nokaslr` — KASLR 비활성 (디버깅 시 주소 일관성).
- `console=ttyS0` — 첫 시리얼에 콘솔.

QEMU의 *두 번째 시리얼* (-serial tcp::4444)이 *호스트 4444 포트*로 연결.

## 호스트 gdb 연결

```bash
$ cd linux-source-tree
$ gdb vmlinux
(gdb) target remote :4444
Remote debugging using :4444
0xffffffff8108b234 in default_idle ()
(gdb) bt
#0  default_idle at arch/x86/kernel/process.c:551
#1  arch_cpu_idle at arch/x86/kernel/process.c:557
#2  cpuidle_idle_call at kernel/sched/idle.c:154
#3  do_idle at kernel/sched/idle.c:262
...
(gdb) break sys_read
Breakpoint 1 at 0xffffffff812345a0: file fs/read_write.c, line 678.
(gdb) continue
```

user-space gdb와 *같은 인터페이스*. step/next/bt/print 모두.

```bash
(gdb) info threads        # 모든 CPU
* 1    Thread 1 (CPU#0 [running])  ...
  2    Thread 2 (CPU#1 [running])  ...
```

각 CPU가 *thread*로 보임. CPU 1 디버깅 → `thread 2`.

## 실 하드웨어 + 시리얼

```
[디버그 호스트]                [타깃 머신]
   gdb vmlinux                  kgdb stub
       |                            |
       └─── USB-Serial cable ───────┘
         (ttyUSB0)            (ttyS0)
```

타깃의 `/etc/default/grub`에 옵션 추가:

```
GRUB_CMDLINE_LINUX="kgdboc=ttyS0,115200 console=ttyS0,115200"
```

```bash
$ sudo update-grub
$ sudo reboot
```

호스트에서:
```bash
$ stty -F /dev/ttyUSB0 115200 cs8 -cstopb -parenb -hupcl
$ gdb vmlinux
(gdb) set serial baud 115200
(gdb) target remote /dev/ttyUSB0
```

## 외부에서 kgdb 진입

타깃이 정상 실행 중이면 *언제 디버거로 들어가게 할까*.

### Method 1 — magic sysrq

```bash
$ echo g | sudo tee /proc/sysrq-trigger    # kgdb 진입
```

`g`가 kgdb. *어디서든* 즉시 break — 호스트의 대기 중인 gdb가 prompt.

### Method 2 — 부팅 시 wait

`kgdbwait`가 부팅 초기에 정지. 호스트 gdb 연결 후에야 부팅 진행.

### Method 3 — 코드에 명시 break

```c
#include <linux/kgdb.h>
kgdb_breakpoint();    // 또는 KGDB_BREAKPOINT 매크로
```

특정 위치에서 무조건 break.

## kdb 사용

kgdb 없이 *타깃 콘솔에서 직접* 디버그.

```bash
$ echo kbd | sudo tee /sys/module/kgdboc/parameters/kgdboc
$ echo g | sudo tee /proc/sysrq-trigger
[Entering kdb (current=...) on processor 0 due to Keyboard Entry]
kdb> ?
```

명령들.

| kdb 명령 | 의미 |
|----------|------|
| `bt` | 현재 콜스택 |
| `btp <pid>` | 특정 프로세스의 콜스택 |
| `ps` | 프로세스 목록 |
| `ps A` | 모든 task |
| `cpu N` | CPU N으로 |
| `mem <addr>` | 메모리 dump |
| `md <addr>` | hex dump |
| `mds <addr>` | symbolic dump |
| `mm <addr> <val>` | 메모리 변경 |
| `rd` | 모든 레지스터 |
| `bp <addr>` | breakpoint |
| `bph <addr>` | hardware BP |
| `bc <bp>` | clear BP |
| `dmesg` | dmesg 출력 |
| `go` | 계속 |
| `kgdb` | kgdb 모드로 (호스트 gdb 진입) |
| `reboot` | 즉시 reboot |

GUI 없는 임베디드·서버 디버깅에서 *시리얼 콘솔만으로* 분석.

## VMware / VirtualBox

VMware에서 *named pipe* 시리얼:

```
# .vmx
serial0.present = "TRUE"
serial0.fileType = "pipe"
serial0.fileName = "/tmp/vmware-serial"
serial0.tryNoRxLoss = "FALSE"
serial0.pipe.endPoint = "server"
```

호스트:
```bash
$ socat - PIPE:/tmp/vmware-serial
# 또는 gdb의 target remote가 named pipe 안 받으므로:
$ socat -d -d PIPE:/tmp/vmware-serial TCP-LISTEN:4444,reuseaddr,fork
$ gdb vmlinux
(gdb) target remote :4444
```

VirtualBox는 *VBoxManage modifyvm "vm" --uart1 0x3f8 4 --uartmode1 server /tmp/vbox-serial*.

## ramoops — 사후 분석

kgdb 못 쓰는 환경 (실 서버)에서 panic 시 *ring buffer를 ramoops*에 저장 → 재부팅 후 읽기.

```bash
# 부팅 옵션
ramoops.mem_address=0x80000000 ramoops.mem_size=0x100000 ramoops.ecc=1

# 부팅 후
$ sudo mount -t pstore none /sys/fs/pstore
$ ls /sys/fs/pstore/
dmesg-ramoops-0
$ cat /sys/fs/pstore/dmesg-ramoops-0
[이전 부팅의 panic 직전 dmesg]
```

특정 메모리 영역을 *부팅 간 보존* → ring buffer 저장. NV-SRAM 또는 보호된 영역 사용.

## kgdboe — Ethernet

시리얼 대신 *UDP over Ethernet*. 매우 빠름.

```
kgdbwait kgdboe=@<host-ip>/eth0,@<target-ip>
```

호스트:
```bash
$ gdb vmlinux
(gdb) target remote udp:<target-ip>:6443
```

매우 새 기능. 시리얼이 표준.

## 실전 — 한 흐름

상황: NFS 마운트가 hang. 어디서 멈췄나?

```bash
# 타깃 (NFS hang 상태)
$ echo g | sudo tee /proc/sysrq-trigger  # kgdb 진입

# 호스트
(gdb) info threads     # 모든 CPU 콜스택
(gdb) thread apply all bt
[모든 콜스택 dump]
```

NFS 함수에서 멈춘 스레드 발견 → 그 콜스택의 *대기 객체* 검사.

```bash
(gdb) thread 3
(gdb) bt
#0  schedule
#1  schedule_timeout
#2  rpc_wait_bit_killable
#3  __rpc_execute
#4  rpc_run_task
#5  nfs4_call_sync_sequence
...
(gdb) frame 5
(gdb) print *task
[NFS task 구조체 출력]
```

서버 측 응답 누락 → 네트워크 문제 확인.

## kgdb의 한계

| 문제 | 비고 |
|------|------|
| 디버그 빌드 필요 | 운영 환경에 안 맞음 |
| 시리얼 필요 | 클라우드 환경에선 어려움 |
| kgdb 진입 시 *전체 시스템 정지* | RT/네트워크 응답 못 함 |
| KASLR 충돌 | `nokaslr` 옵션 |
| SMP 디버깅 까다로움 | thread 간 동기화 보장 어려움 |

평소엔 *ftrace/eBPF*로 보고, *재현 가능한 버그*에만 kgdb. 또는 *vmcore + crash*가 더 실용적 (다음 장).

## 가상화 + KGDB 정리

| 환경 | 진입 |
|------|------|
| QEMU | `-serial tcp::PORT,server` |
| VMware | named pipe + socat |
| VirtualBox | VBoxManage --uartmode server |
| Cloud VM (AWS, GCP) | 시리얼 콘솔 (cloud-init), 또는 ksm/vsock |
| 실 서버 | USB-serial 케이블 |

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| `target remote` 응답 없음 | kgdbwait 안 켰음, 또는 시리얼 포트 잘못 |
| 콜스택이 깨짐 | CONFIG_FRAME_POINTER 안 켜져 있거나 inline 많음 |
| 주소가 안 맞음 | nokaslr 안 켜졌음 |
| 부팅 후 응답 없음 | kgdboc=ttyS1인데 console=ttyS1로 충돌 |
| `Could not find vmlinux` | gdb가 -g 없는 vmlinux 사용. debuginfo 별 패키지 |
| step 한 줄에 *수십 명령* | 인라인 + 최적화. CONFIG_DEBUG_INFO_REDUCED 끄기 |

## 정리

- kgdb = 원격 gdb로 커널 디버그. 시리얼 또는 TCP.
- kdb = 타깃 콘솔에서 직접. 시리얼 콘솔만으로.
- 빌드: CONFIG_KGDB + CONFIG_DEBUG_INFO + nokaslr.
- 부팅: `kgdbwait kgdboc=ttyS1,115200`.
- 진입: 부팅 wait / magic sysrq `g` / 코드 kgdb_breakpoint().
- QEMU + virtio serial이 가장 쉬운 환경.
- ramoops로 panic 후 dmesg 보존.
- 운영에선 ftrace/eBPF/crash가 현실적.

## 다음 장 예고

Ch 6 — crash + drgn. vmcore를 *postmortem 분석*하는 표준 도구.

## 관련 항목

- [Ch 4: eBPF for kernel debugging](/blog/tools/debugging/kernel/chapter04-ebpf-kernel)
- [Ch 6: crash + drgn](/blog/tools/debugging/kernel/chapter06-crash-drgn)
- [GDB and LLDB Ch 8: 원격 디버깅](/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging) — RSP 프로토콜
- [`Documentation/dev-tools/kgdb.rst`](https://www.kernel.org/doc/html/latest/dev-tools/kgdb.html)
- [`Documentation/admin-guide/pstore-blk.rst`](https://www.kernel.org/doc/html/latest/admin-guide/pstore-blk.html) — ramoops
