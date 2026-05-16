---
title: "Ch 6: crash + drgn — vmcore 분석"
date: 2025-09-06T06:00:00
description: "kdump로 만든 vmcore를 사후 분석. crash 명령, drgn Python API, 실전 흐름."
tags: [kernel, crash, drgn, vmcore, kdump]
series: "Kernel Debugging"
seriesOrder: 6
draft: false
---

커널 panic 후 시스템이 죽었습니다. 재현은 안 됩니다. *kdump*가 *재부팅 직전* RAM을 vmcore 파일로 저장해 줬다면 — **crash** 또는 **drgn**으로 부검합니다. 이건 user-space의 core dump 분석(`gdb exe core`)에 해당하는 *커널 버전*.

:::tldr
`/var/crash/.../vmcore` 파일 + `vmlinux` debuginfo = 전체 커널 상태 재구성. `crash` (전통)와 `drgn` (Python 기반 모던) 두 선택지.
:::

## kdump 셋업

vmcore를 만드는 건 *kdump*. 커널 패닉 직전에 *예약된 메모리*에서 *2차 커널*을 부팅해 RAM을 디스크로 저장.

### 활성화

```bash
# Fedora/RHEL
$ sudo dnf install kexec-tools
$ sudo systemctl enable --now kdump

# Ubuntu/Debian
$ sudo apt install kdump-tools linux-crashdump
$ sudo systemctl enable --now kdump-tools

# 부팅 옵션 — 예약 메모리
# /etc/default/grub
GRUB_CMDLINE_LINUX="... crashkernel=512M"
$ sudo update-grub
$ sudo reboot
```

`crashkernel=512M`이 *재부팅 시 2차 커널용 메모리* 예약. 너무 작으면 vmcore 못 만듦.

### 상태 확인

```bash
$ sudo kdumpctl status
kdump: Kdump is operational

$ cat /proc/iomem | grep Crash
  04000000-23ffffff : Crash kernel    # 예약된 영역
```

### 강제 패닉으로 테스트

```bash
$ echo c | sudo tee /proc/sysrq-trigger
[Sysrq: Trigger a crash]
[BUG: kernel NULL pointer dereference]
[panic +14s]
[kdump: kexec'ing into crash kernel]
[2차 커널 부팅, vmcore 저장]
[reboot]

# 재부팅 후
$ ls /var/crash/
127.0.0.1-2026-05-15-12:34:56/
$ ls /var/crash/127.0.0.1-*/
vmcore  vmcore-dmesg.txt  kexec-dmesg.log
```

`vmcore`가 본체 (수 GB), `vmcore-dmesg.txt`는 panic 직전 dmesg.

## crash — 전통 도구

```bash
$ sudo dnf install crash kernel-debuginfo-$(uname -r)

$ sudo crash /usr/lib/debug/.../vmlinux /var/crash/.../vmcore

      KERNEL: /usr/lib/debug/.../vmlinux
    DUMPFILE: /var/crash/.../vmcore  [PARTIAL DUMP]
        CPUS: 4
        DATE: Sun May 11 03:21:14 KST 2026
      UPTIME: 23:45:12
LOAD AVERAGE: 0.42, 0.30, 0.18
       TASKS: 234
    NODENAME: prod-01
     RELEASE: 6.5.0-...
     VERSION: ...
     MACHINE: x86_64
      MEMORY: 16 GB
       PANIC: "BUG: kernel NULL pointer dereference, address: 0000..."
         PID: 1234
     COMMAND: "myprog"
        TASK: ffff... [...]
         CPU: 2
       STATE: TASK_RUNNING (PANIC)

crash>
```

자동으로 *panic 원인·시간·메모리·CPU·죽은 task* 표시.

### 기본 명령

```
crash> bt                       # 현재 task의 콜스택
crash> bt -a                    # 모든 CPU
crash> ps                       # 프로세스 목록
crash> ps -k                    # 커널 스레드
crash> log                      # dmesg
crash> log | tail               # 마지막 로그
crash> sys                      # 시스템 정보
crash> mach                     # CPU 정보
crash> mount                    # 마운트
crash> net                      # 네트워크 디바이스
crash> files                    # 열린 파일
crash> vm <pid>                 # 그 task의 VM 정보
crash> task <pid>               # task_struct
crash> kmem -s                  # slab 통계
crash> kmem -i                  # 메모리 요약
crash> p <var>                  # 전역 변수
crash> rd <addr>                # 메모리 읽기
crash> dis <func>               # 디스어셈블
crash> struct task_struct <addr> # 구조체 출력
crash> list <addr>              # linked list 순회
crash> tree <addr>              # tree 순회 (rbtree)
```

### 한 예 — panic 원인 추적

```
crash> bt
PID: 1234     TASK: ffff... CPU: 2  COMMAND: "myprog"
 #0 [ffff...] machine_kexec at ffffffff8104a123
 #1 [ffff...] __crash_kexec at ffffffff8108b456
 #2 [ffff...] panic at ffffffff8108c789
 #3 [ffff...] oops_end at ffffffff8102d012
 #4 [ffff...] no_context at ffffffff8106f345
 #5 [ffff...] __do_page_fault at ffffffff8106f678
 #6 [ffff...] do_page_fault at ffffffff8106f9ab
 #7 [ffff...] page_fault at ffffffff819c5678
    [exception RIP: my_driver_handler+0x42]
    RIP: ffffffffc0123456 RSP: ffff...
    RAX: 0000000000000000 ...
 #8 [ffff...] __handle_irq_event_percpu at ffffffff810abc01
 ...

crash> dis my_driver_handler
0xffffffffc0123410 <my_driver_handler>:  push %rbp
...
0xffffffffc0123456 <my_driver_handler+0x42>:  mov 0x10(%rax),%rcx
                                              ^^^ %rax = 0 → NULL deref

crash> sym ffffffffc0123456
my_driver_handler+0x42 at drivers/my_module.c:42
```

NULL 역참조 위치 + 소스 줄. `my_module.c:42`의 `*(p + 0x10)`에서 `p == NULL`.

### list 순회 — 자료구조

```
crash> p init_task
init_task = $1 = {
  state = 0,
  ...
  tasks = {
    next = 0xffff...,
    prev = 0xffff...
  },
  ...
}

crash> list -H init_task.tasks task_struct.tasks -s task_struct.comm | head
ffff...
  comm = "init"
ffff...
  comm = "kthreadd"
...
```

linked list 순회 + struct member 추출.

## drgn — Python 기반 모더 도구

[drgn](https://github.com/osandov/drgn) — Meta가 만든 *Python interactive*.

```bash
$ sudo dnf install drgn
# 또는
$ pip install drgn
```

### 진입

```bash
$ sudo drgn -k -c /var/crash/.../vmcore  # vmcore
$ sudo drgn                              # 라이브 커널 (/proc/kcore)

>>> 
```

Python REPL. 모든 *커널 변수·구조체*에 직접 접근.

```python
>>> from drgn.helpers.linux import *

# 현재 init_task
>>> init = prog['init_task']
>>> init.comm
(char [16])"swapper/0"

# 모든 task 순회
>>> for task in for_each_task(prog):
...     print(task.pid.value_(), task.comm.string_().decode())
0 swapper/0
1 init
2 kthreadd
3 rcu_gp
...
```

### Helper 함수

drgn에 *수많은 helper*. `drgn.helpers.linux.*`:

```python
from drgn.helpers.linux import (
    for_each_task,
    for_each_online_cpu,
    list_for_each_entry,
    find_task,
    pid_for_each_thread,
    find_inode_by_path,
    block_device_name,
    ...
)

# 특정 PID
task = find_task(prog, 1234)
print(task.comm.string_())

# 그 task의 fd
from drgn.helpers.linux.fs import fget
file = fget(task, 3)        # fd 3
print(file.f_path.dentry.d_name.name.string_())
```

### 콜스택

```python
>>> task = find_task(prog, 1234)
>>> for frame in task.stack_trace():
...     print(frame)
#0  page_fault+0x...  at arch/x86/kernel/...
#1  do_page_fault+0x...  at arch/x86/mm/...
#2  my_function+0x42  at drivers/foo.c:42
...
```

### vs crash

| | crash | drgn |
|---|-------|------|
| 언어 | 자체 DSL | Python |
| 표현력 | 제한적 | 무제한 |
| 학습 곡선 | 중 | 낮음 (Python 알면) |
| 자료구조 | bt/list/tree 등 | for, dict, list comprehension |
| 자체 도구 | bash + crash 스크립트 | Python 함수 |
| 속도 | 빠름 | 비슷 |
| 커뮤니티 | 옛, 안정 | 활발 (Meta·Red Hat) |

drgn이 *작성하기 쉽고* Python 생태계와 자연스럽게 통합. crash는 *전통 사용자*가 익숙.

### 자체 분석 스크립트

```python
#!/usr/bin/env drgn
# crash-info.py — vmcore 진단 자동화

from drgn.helpers.linux import for_each_task

print(f"Kernel: {prog['linux_banner'].string_().decode().strip()}")
print(f"Uptime: ...")
print()

# CPU별 콜스택
print("=== Per-CPU active task ===")
for cpu in for_each_online_cpu(prog):
    task = per_cpu(prog['current_task'], cpu)
    print(f"CPU {cpu}: {task.comm.string_().decode()} pid={task.pid.value_()}")

# blocked task (D state)
print("\n=== Tasks in D state (uninterruptible) ===")
for task in for_each_task(prog):
    if task.__state.value_() == 0x2:  # TASK_UNINTERRUPTIBLE
        print(f"  {task.comm.string_().decode()} pid={task.pid.value_()}")
```

```bash
$ sudo drgn -k -c vmcore -s crash-info.py
```

운영 환경에서 *모든 panic*에 같은 분석을 자동 실행.

## 라이브 디버깅 — drgn on /proc/kcore

```bash
$ sudo drgn

# 라이브 커널의 task list (운영 서비스 분석에 유용)
>>> for t in for_each_task(prog):
...     if t.__state.value_() == 0x2:
...         print(t.comm.string_(), t.pid.value_())
```

vmcore 없이 *동작 중 시스템* 분석. 커널 패닉 안 일으키므로 안전.

## 자주 만나는 사고 유형

### NULL 역참조

```
PANIC: "BUG: kernel NULL pointer dereference, address: 0000000000000010"
```

→ `bt`로 콜스택, `dis`로 명령, RAX/RDI 등으로 *어떤 포인터가 NULL*인지.

### Soft lockup

```
PANIC: "Kernel panic - not syncing: softlockup: hung tasks"
```

→ `bt -a`로 모든 CPU. 한 CPU가 *한 함수에서 영원히 무한 루프*.

### Hung task

```
PANIC: "Kernel panic - not syncing: hung_task: blocked tasks"
```

→ D state task 추적 (drgn 스크립트 위 참고).

### Use-after-free

```
PANIC: "BUG: KASAN: use-after-free in ..."
```

→ KASAN 빌드여야. shadow memory에 alloc/free 사이트.

### Out of memory

```
PANIC: "Out of memory: Killed process N (myprog) ..."
```

→ `kmem -i`로 메모리 요약. `vm <pid>`로 oom-killed task의 메모리.

## kdump-anon — clouddump

운영 환경에서 vmcore를 *디스크 대신 네트워크*로.

```bash
# /etc/kdump.conf
nfs <nfs-server>:/path/to/dumps
# 또는
ssh user@<remote-server>
ssh_key /root/.ssh/kdump_rsa
```

panic 시 2차 커널이 NFS 마운트 → vmcore 업로드. 자체 디스크가 없는 클라우드 VM에서.

## kpoke — debugfs 디버깅 헬퍼

debugfs 안에 *커널 구조체를 보기 좋게 출력*하는 인터페이스. drivers/는 이걸 활용해 *자체 상태*를 노출.

```bash
$ ls /sys/kernel/debug/
$ cat /sys/kernel/debug/tracing/trace
$ cat /sys/kernel/debug/btrfs/<uuid>/...
$ cat /sys/kernel/debug/kprobes/list
```

각 서브시스템이 자체적으로 출력. 자체 driver 작성 시 debugfs로 *디버그 인터페이스* 제공.

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| `crash: cannot read vmlinux` | debuginfo 패키지 안 깔림 |
| vmcore 크기 0 | crashkernel= 옵션 안 켰음 |
| kdump 서비스 실패 | crashkernel 메모리 너무 작음 또는 부팅 옵션 누락 |
| crash가 *wrong kernel* 거부 | vmlinux build-id ≠ vmcore의 |
| `drgn: cannot determine kernel version` | `-k`로 커널 모드 명시 |
| 모듈 심볼 없음 | 해당 모듈의 debuginfo 별도 |
| vmcore 매우 큼 (수십 GB) | `makedumpfile -d 31`로 user pages 제외 |

## 정리

- kdump가 panic 직전 RAM을 vmcore로.
- crash (전통) 와 drgn (Python) 두 도구.
- crash는 자체 DSL, drgn은 Python — 표현력 ↑.
- helper 함수로 모든 task / cpu / fd / inode 순회.
- live 분석은 `/proc/kcore` + drgn.
- 사고 유형: NULL deref / softlockup / hung / use-after-free / OOM.
- 클라우드 환경은 NFS·SSH로 vmcore 업로드.

## 다음 장 예고

Ch 7 (마지막) — Kernel panic / Oops 메시지 해석. crash 없이 dmesg만으로 분석.

## 관련 항목

- [Ch 5: kdb / kgdb](/blog/tools/debugging/kernel/chapter05-kdb-kgdb)
- [Ch 7: Panic / Oops 해석](/blog/tools/debugging/kernel/chapter07-panic-oops)
- [Postmortem Debugging 시리즈](/blog/tools/debugging/postmortem/chapter01-core-generation) — user-space core
- [drgn 공식](https://drgn.readthedocs.io/)
- [crash 매뉴얼](https://crash-utility.github.io/)
- [`Documentation/admin-guide/kdump/kdump.rst`](https://www.kernel.org/doc/html/latest/admin-guide/kdump/kdump.html)
