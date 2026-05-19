---
title: "Ch 7: Kernel Panic / Oops 메시지 해석"
date: 2026-05-17T07:00:00
description: "dmesg 한 줄로 정확한 위치 찾기. RIP, Call Trace, BUG, Tainted 디코딩."
tags: [kernel, panic, oops, dmesg, addr2line]
series: "Kernel Debugging"
seriesOrder: 7
draft: false
---

마지막 장 — *최소 정보로 가장 많이 추론*하는 기술. 운영 환경에서 vmcore 없이 *dmesg 한 줄*만으로 panic·oops를 해석합니다. 이게 모든 커널 디버깅의 *끝점*이자 *시작점*.

## Oops vs Panic

| | Oops | Panic |
|---|------|------|
| 의미 | 회복 가능 | 시스템 정지 |
| Tainted | T 비트 set | T 비트 set |
| 다음 | task 강제 종료 | reboot (or hang) |
| 발생 | NULL deref in process context | NULL deref in IRQ, BUG_ON, oops_count > limit |
| 메시지 | "Oops: 0000..." | "Kernel panic - not syncing: ..." |

`/proc/sys/kernel/panic_on_oops=1`로 oops를 panic으로 격상. 운영에서 *불안정 상태로 도는 것보다 죽는 게 안전*.

## Oops 메시지 구조

```
BUG: kernel NULL pointer dereference, address: 0000000000000010
#PF: supervisor read access in kernel mode
#PF: error_code(0x0000) - not-present page
PGD 0 P4D 0
Oops: 0000 [#1] PREEMPT SMP PTI
CPU: 2 PID: 1234 Comm: myprog Tainted: G        W  OE     6.5.0-...
Hardware name: Acme MyServer/Mainboard, BIOS 1.0 ...
RIP: 0010:my_function+0x42/0x80 [my_module]
Code: 41 57 41 56 41 55 41 54 53 48 83 ec 28 ...
RSP: 0018:ffff... EFLAGS: 00010246
RAX: 0000000000000000 RBX: ffff...
RCX: 0000000000000000 RDX: 0000000000000000
RSI: 0000000000000020 RDI: ffff...
RBP: ffff... R08: 0000000000000000 R09: 0000000000000000
R10: 0000000000000000 R11: 0000000000000001 R12: ffff...
R13: ffff... R14: 0000000000000000 R15: ffff...
FS:  00007f1234567890(0000) GS:ffff...(0000) knlGS:0000000000000000
CS:  0010 DS: 0000 ES: 0000 CR0: 0000000080050033
CR2: 0000000000000010 CR3: 0000000123456000 CR4: 0000000000350ef0
Call Trace:
 <TASK>
 ? show_regs+0x6e/0x80
 ? __die+0x29/0x70
 ? page_fault_oops+0x150/0x3b0
 ? exc_page_fault+0x7a/0x1a0
 ? asm_exc_page_fault+0x2c/0x40
 ? my_function+0x42/0x80 [my_module]
 some_handler+0x123/0x200 [my_module]
 ...
 </TASK>
Modules linked in: my_module xfs ...
CR2: 0000000000000010
```

각 줄을 해독합니다.

## 1. 첫 줄 — 원인

```
BUG: kernel NULL pointer dereference, address: 0000000000000010
```

- `NULL pointer dereference` — *NULL 포인터 + offset*에 접근. address가 *0xN10*이면 NULL인 구조체의 *offset N10* 멤버.
- `0x10` 보통 *struct의 두 번째 필드*. 어떤 struct?

다른 흔한 BUG 메시지:

| 메시지 | 의미 |
|--------|------|
| `unable to handle page fault for address: 0xN` | 매핑 안 됨 (높은 주소) |
| `unable to handle paging request at virtual address ...` | 같음 |
| `bad page state in process ...` | 페이지 reference count 깨짐 |
| `unable to handle kernel paging request` | 잘못된 커널 주소 |
| `BUG: scheduling while atomic` | atomic context에서 sleep |
| `BUG: sleeping function called from invalid context` | preempt off / IRQ context에서 sleep |
| `WARNING: CPU: N PID: M at ...` | WARN_ON 트리거 (panic 아님) |
| `BUG: spinlock recursion` | 같은 lock을 두 번 acquire |
| `BUG: held lock freed` | held lock의 객체가 free됨 |
| `BUG: KASAN: ...` | KASAN 검출 |

## 2. Page Fault 정보

```
#PF: supervisor read access in kernel mode
#PF: error_code(0x0000) - not-present page
```

`error_code` 비트:
- `[0]` P — present? (0 = not present, 1 = protection)
- `[1]` W — write?
- `[2]` U — user mode?
- `[3]` RSVD — reserved bit?
- `[4]` I — instruction fetch?

`0x0000` = supervisor + read + not-present. 가장 흔한 NULL deref.
`0x0002` = supervisor + write + not-present (NULL에 *쓰기*).
`0x0011` = user + write + protection (user RO에 쓰기).

## 3. Tainted

```
CPU: 2 PID: 1234 Comm: myprog Tainted: G        W  OE     6.5.0-...
```

- `G` — proprietary 모듈 안 로드 (이게 정상)
- `W` — 이전 warning 있었음
- `O` — out-of-tree 모듈
- `E` — unsigned 모듈

`G W OE` 의미: 이전 warn + out-of-tree (signed 안 된) 모듈 로드. *vanilla 커널 아님*. 버그 리포트 시 *재현 환경* 명시 필수.

## 4. RIP — 죽은 명령

```
RIP: 0010:my_function+0x42/0x80 [my_module]
```

- `0010` — CS 레지스터 (kernel mode).
- `my_function+0x42/0x80` — my_function 시작 + 0x42 offset, 함수 크기 0x80.
- `[my_module]` — 어느 모듈.

**여기가 원인 위치**. `addr2line`으로 변환:

```bash
$ addr2line -e /lib/modules/.../my_module.ko -f \
    $(printf "0x%x" $(objdump -d /lib/modules/.../my_module.ko | \
                       awk '/<my_function>:/ {print strtonum("0x"$1)+0x42}'))
my_function
drivers/my_module/foo.c:42
```

또는 *모듈을 알면* 직접:

```bash
$ objdump -d /lib/modules/.../my_module.ko --start-address=0xN --stop-address=0xM
```

## 5. Code — 명령 hex dump

```
Code: 41 57 41 56 41 55 41 54 53 48 83 ec 28 ...
```

RIP 주변 ~10바이트. 디스어셈블해 *정확히 어떤 명령*에서 죽었는지.

```bash
$ echo "41 57 41 56 41 55 41 54 53 48 83 ec 28" | \
    awk '{for(i=1;i<=NF;i++) printf("\\x%s", $i); printf("\n")}' | \
    xxd -r -p > /tmp/code.bin
$ objdump -D -b binary -m i386:x86-64 -M intel /tmp/code.bin
```

또는 [공식 decoder](https://github.com/torvalds/linux/blob/master/scripts/decode_stacktrace.sh).

## 6. 레지스터

```
RAX: 0000000000000000  ← NULL!
RDI: ffff...
...
CR2: 0000000000000010  ← page fault 주소
```

`CR2`가 *접근하려 한 주소*. NULL + 0x10 → 어떤 구조체의 멤버 offset 0x10 = 두 번째 64-bit 필드.

`my_function`이 *어떤 인자*를 받는지 알면 (RDI = 1번 인자, RSI = 2번, ..., x86-64 SysV ABI) 어느 변수가 NULL인지 추정.

## 7. Call Trace — 콜스택

```
Call Trace:
 <TASK>
 ? show_regs+0x6e/0x80
 ? __die+0x29/0x70
 ? page_fault_oops+0x150/0x3b0
 ? exc_page_fault+0x7a/0x1a0
 ? asm_exc_page_fault+0x2c/0x40
 ? my_function+0x42/0x80 [my_module]
 some_handler+0x123/0x200 [my_module]
 ...
 </TASK>
```

위에서 아래 = 안에서 바깥. `<TASK>`/`</TASK>`는 task context (vs `<IRQ>`).

`?` 접두사 = *unreliable* (frame pointer 안 일치). frame pointer 없는 빌드에서 흔함.

`asm_exc_page_fault` 전이 *진짜 사고 위치*. 위는 exception handler.

이 콜스택을 *각 줄 addr2line*:

```bash
$ for line in 'my_function+0x42' 'some_handler+0x123'; do
    echo $line
done | xargs -I{} ... # 위 변환
```

또는 *공식 decoder*:

```bash
$ ./scripts/decode_stacktrace.sh vmlinux < dmesg.txt
[/proc/kallsyms와 debuginfo로 모든 주소 → file:line]
```

## 8. Modules linked in

```
Modules linked in: my_module xfs nf_conntrack ...
```

panic 시 로드된 *모든 모듈*. 의심되는 모듈 (my_module) 외에 *최근 로드된* 것도 검토.

## 9. CR2

```
CR2: 0000000000000010
```

다시 한번 *page fault 주소*. 메시지 끝에도 나옴.

## Soft Lockup

```
watchdog: BUG: soft lockup - CPU#2 stuck for 22s! [myprog:1234]
[register dump]
RIP: 0010:my_busy_loop+0x10/0x40 [my_module]
[Call Trace ...]
```

22초간 *같은 CPU에서 같은 함수*. 무한 루프 또는 *너무 긴 critical section*.

`/proc/sys/kernel/softlockup_panic=1`로 panic으로.

## Hard Lockup

```
NMI watchdog: Watchdog detected hard LOCKUP on cpu 3
[NMI로 강제 진입한 콜스택]
```

*IRQ도 안 받는* 완전 잠김. 보통 spinlock with IRQ disabled에서 무한 루프. NMI watchdog가 *유일*하게 진입.

## Hung Task

```
INFO: task myprog:1234 blocked for more than 120 seconds.
[register dump]
RIP: 0010:schedule+0x...
Call Trace:
 schedule
 schedule_timeout
 wait_for_completion
 ...
```

D state로 *120초 이상*. dead lock 또는 *외부 응답 대기 무한*. `/proc/sys/kernel/hung_task_*`로 임계값 조정.

## KASAN report

```
==================================================================
BUG: KASAN: use-after-free in my_function+0x42 [my_module]
Read of size 8 at addr ffff... by task myprog/1234

CPU: 2 ...
Call Trace:
 dump_stack
 print_address_description
 kasan_report
 my_function       ← 사고 위치
 ...

Allocated by task 5678:
 kasan_save_stack
 __kasan_kmalloc
 kmem_cache_alloc
 my_alloc
 ...

Freed by task 9012:
 kasan_save_stack
 kasan_set_track
 kmem_cache_free
 my_free
 ...
==================================================================
```

KASAN 빌드면 *alloc 사이트 + free 사이트* + 사고 위치 모두. user-space ASan과 같은 풍부함.

## 자동 decode — decode_stacktrace.sh

`/path/to/linux-source/scripts/decode_stacktrace.sh`.

```bash
$ dmesg | grep -A 50 "Call Trace" > /tmp/trace.txt
$ ./decode_stacktrace.sh /usr/lib/debug/.../vmlinux \
    < /tmp/trace.txt
```

각 `function+0xN/0xM`을 *파일:줄*로.

## 실전 — 한 사고

상황: 운영 서버에서 random oops. dmesg에:

```
Oops: 0000 [#1] PREEMPT SMP PTI
RIP: 0010:btrfs_submit_bio+0x42/0x180 [btrfs]
RAX: 0000000000000000
RDI: ffff883456789abc
```

분석:
1. `btrfs_submit_bio` 위치 = btrfs 모듈.
2. RAX=NULL → 보통 *반환값 체크 빼먹은* 함수의 결과.
3. `addr2line`:
   ```
   fs/btrfs/disk-io.c:1234
   ```
4. 그 소스:
   ```c
   bio = bio_alloc(...);
   bio->bi_iter.bi_sector = ...;  // ← +0x42 위치
   ```
5. `bio_alloc`이 *NULL 반환* (OOM 등) → 검사 없이 *bio*->* 접근.
6. btrfs git log에서 *같은 버그 fix* 검색 → 이미 fix 됐는지 또는 새 보고.

## 시리즈 정리

7장으로 *Linux 커널 디버깅의 전체 흐름*을 다뤘습니다.

- **Ch 1** User/Kernel 경계, /proc, kallsyms.
- **Ch 2** printk + dmesg + dynamic_debug.
- **Ch 3** ftrace + tracepoints.
- **Ch 4** eBPF / bpftrace / BCC.
- **Ch 5** kdb / kgdb 인터랙티브.
- **Ch 6** crash / drgn — vmcore postmortem.
- **Ch 7** (이 장) panic / oops 메시지 해석.

운영 흐름:
1. dmesg 모니터링 (Ch 7 패턴 인식).
2. 의심 시 dynamic_debug + ftrace로 verbose (Ch 2-3).
3. 깊이 분석 필요 시 bpftrace (Ch 4).
4. panic 시 vmcore + crash/drgn (Ch 6).
5. 재현 가능한 버그는 kgdb (Ch 5).

## 정리

- Oops·Panic 메시지의 각 줄에 의미가 있다.
- RIP + CR2 + RAX/RDI가 사고 위치 + 원인.
- Call Trace는 위→아래 (안→바깥). `?` = unreliable.
- decode_stacktrace.sh로 자동 file:line 변환.
- Soft/Hard lockup·Hung task는 별 메시지 형식.
- KASAN report에 alloc+free 사이트.

## 관련 항목 (시리즈 전체)

- [Ch 1: User/Kernel 경계](/blog/tools/debugging/kernel/chapter01-user-kernel-boundary)
- [Ch 2: printk + dmesg + dynamic_debug](/blog/tools/debugging/kernel/chapter02-printk-dmesg)
- [Ch 3: ftrace + tracepoints](/blog/tools/debugging/kernel/chapter03-ftrace-tracepoints)
- [Ch 4: eBPF for kernel](/blog/tools/debugging/kernel/chapter04-ebpf-kernel)
- [Ch 5: kdb / kgdb](/blog/tools/debugging/kernel/chapter05-kdb-kgdb)
- [Ch 6: crash + drgn](/blog/tools/debugging/kernel/chapter06-crash-drgn)

## 외부 자료

- [Postmortem Debugging](/blog/tools/debugging/postmortem/chapter01-core-generation) — user-space core
- [Sanitizers](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan) — KASAN의 user-space 버전
- [Linux Kernel Crash Book](http://www.dedoimedo.com/computers/blogs/crashbook.html)
- [Brendan Gregg — Linux Performance](https://www.brendangregg.com/linuxperf.html)
- [`Documentation/admin-guide/bug-hunting.rst`](https://www.kernel.org/doc/html/latest/admin-guide/bug-hunting.html)
- `dmesg(1)`, `addr2line(1)`
