---
title: "Ch 1: 메모리 회계 — RSS / VSS / PSS / smaps"
date: 2025-09-07T01:00:00
description: "프로세스 메모리의 실제 정체. VSS vs RSS vs PSS, /proc/[pid]/{status,smaps}."
tags: [memory, linux, rss, pss, smaps]
series: "Memory Diagnostics"
seriesOrder: 1
draft: false
---

"이 프로세스가 메모리를 얼마나 쓰나?" 답이 *RSS, VSS, PSS, USS* 중 어느 것이냐에 따라 *4가지*입니다. 잘못 답하면 OOM이 일어났을 때 *왜*인지 알 수 없고, 누수 디버깅도 헛수고. 이 시리즈는 *메모리 진단의 처음부터* — 정확한 회계, 누수 도구, glibc/jemalloc/tcmalloc profiling까지 다룹니다.

## 한 줄 요약

`/proc/[pid]/status`의 VmRSS는 *대략*. 진짜 누수 추적은 `/proc/[pid]/smaps_rollup`의 PSS 또는 `/proc/[pid]/smaps`의 영역별 분해.

## 4가지 메모리 크기

```c
// 프로세스가 100MB를 malloc → 그 중 80MB만 touch
// 그리고 50MB의 .so를 다른 프로세스와 공유
```

| 종류 | 의미 | 위 예시 값 |
|------|------|------------|
| **VSS** (VSZ) | virtual size — 매핑된 *모든* 가상 메모리 | 100MB + 50MB = 150MB |
| **RSS** | resident set — *실제 메모리*에 올라온 (page table 포함) | 80MB + 50MB = 130MB |
| **PSS** | proportional set — 공유 메모리를 *공유 N분의 1*로 | 80MB + 50/N |
| **USS** | unique set — 이 프로세스만의 (private) | 80MB |

OOM 시 *합산해 OOM*인지 보려면 PSS가 정확 (공유분 중복 계산 안 함). 누수 추적엔 USS 또는 PSS.

## 출처 — /proc/[pid]/

```bash
$ cat /proc/12345/status | grep -E "Vm|Rss"
VmPeak:    150000 kB
VmSize:    140000 kB     # = VSS
VmLck:          0 kB
VmPin:          0 kB
VmHWM:     130000 kB     # = RSS의 최고치
VmRSS:     128000 kB     # = RSS (현재)
RssAnon:   105000 kB     # heap, stack (private)
RssFile:    20000 kB     # mmap된 파일
RssShmem:    3000 kB     # 공유 메모리
VmData:    120000 kB
VmStk:        132 kB
VmExe:        152 kB
VmLib:      10000 kB
VmPTE:        260 kB     # page table 자체
VmSwap:      2000 kB
```

대부분 도구(`top`, `ps`, `htop`)가 *VmRSS*를 표시. 빠르지만 *공유 메모리 중복 카운트*.

## PSS — 정확한 회계

```bash
$ sudo cat /proc/12345/smaps_rollup
55a9b3f000-7ffd8c5f6000 ---p 00000000 00:00 0  [rollup]
Rss:              128000 kB
Pss:              120000 kB     # ← 이게 더 정확
Pss_Anon:         105000 kB
Pss_File:          12000 kB     # 공유 .so의 비율 분
Pss_Shmem:          3000 kB
Shared_Clean:      15000 kB
Shared_Dirty:          0 kB
Private_Clean:      8000 kB
Private_Dirty:    105000 kB     # ← *내가 진짜 갖고 있는 변경된 메모리*
Referenced:       125000 kB
Anonymous:        105000 kB
LazyFree:              0 kB
AnonHugePages:      4096 kB
Swap:               2000 kB
SwapPss:            1800 kB
```

핵심:
- **PSS** = "이 프로세스의 *공정한 몫*". 모든 프로세스 PSS 합 = 시스템 메모리 사용.
- **Private_Dirty** = "이 프로세스만의 *수정된* 페이지". heap 같은 누수 추적의 핵심.

```bash
# 모든 프로세스 PSS 정렬
$ for pid in $(pgrep -f .); do
    pss=$(sudo cat /proc/$pid/smaps_rollup 2>/dev/null | grep "^Pss:" | awk '{print $2}')
    comm=$(cat /proc/$pid/comm 2>/dev/null)
    echo "$pss $pid $comm"
  done | sort -n -r | head -10
```

## smaps — 영역별 분해

```bash
$ sudo cat /proc/12345/smaps | head -40
55a9b3f00000-55a9b3f01000 r--p 00000000 fe:01 12345  /usr/local/bin/myprog
Size:                   4 kB
KernelPageSize:         4 kB
MMUPageSize:            4 kB
Rss:                    4 kB
Pss:                    4 kB
Shared_Clean:           0 kB
Shared_Dirty:           0 kB
Private_Clean:          4 kB
Private_Dirty:          0 kB
Referenced:             4 kB
Anonymous:              0 kB
LazyFree:               0 kB
AnonHugePages:          0 kB
ShmemPmdMapped:         0 kB
FilePmdMapped:          0 kB
Shared_Hugetlb:         0 kB
Private_Hugetlb:        0 kB
Swap:                   0 kB
SwapPss:                0 kB
Locked:                 0 kB
THPeligible:            0
ProtectionKey:          0
VmFlags: rd mr mw me

55a9b3f01000-55a9b3f03000 r-xp 00001000 fe:01 12345  /usr/local/bin/myprog
[Size, Rss, Pss, ...]
...
```

각 *VMA*(Virtual Memory Area)의 *완전한 회계*. 무엇이 메모리를 잡고 있는지 *정확히*.

VMA 종류:
- `r--p ... /path/to/exe` — 실행 파일 .text (RO + private)
- `rw-p ... [heap]` — heap (mmap된 small allocs는 별개)
- `rw-p ... [stack]` — main 스레드 stack
- `r--p ... /lib/libc.so.6` — 공유 라이브러리 RO
- `rw-p ...` (anon) — anonymous mmap, malloc 큰 영역
- `rw-s ... /dev/shm/...` — POSIX shared memory

## 도구 — pmap

```bash
$ pmap -X 12345 | head
12345:   /usr/local/bin/myprog
         Address Perm   Offset Device   Inode    Size     Rss     Pss Referenced Anonymous LazyFree ShmemPmdMapped FilePmdMapped Shared_Hugetlb Private_Hugetlb Swap SwapPss Locked THPeligible Mapping
    55a9b3f00000 r--p 00000000  fe:01   12345       4       4       4          4         0        0              0             0              0               0    0       0      0           0 myprog
    55a9b3f01000 r-xp 00001000  fe:01   12345     128     128     128        128         0        0              0             0              0               0    0       0      0           0 myprog
    ...
                                                =========================
                                                 140000   128000  120000
```

smaps 와 같은 정보를 *표 형식*. `-X` 옵션이 모든 컬럼.

## 큰 mmap 찾기

```bash
# 어떤 매핑이 크고 dirty인가
$ sudo cat /proc/12345/smaps | awk '
  /^[0-9a-f]+-/ { mapping=$0 }
  /^Private_Dirty:/ {
    if ($2 > 1024) print $2 " " mapping
  }' | sort -n -r | head
```

운영 누수 진단의 빠른 방법 — *어느 영역*에서 메모리 누수.

## RssAnon vs RssFile vs RssShmem

```
RssAnon:   105000 kB    # heap + stack + anonymous mmap
RssFile:    20000 kB    # 파일 매핑 (실행 + 공유 라이브러리)
RssShmem:    3000 kB    # tmpfs / POSIX shared memory
```

누수 진단의 *핵심 구분*:
- **RssAnon 증가** → heap 또는 mmap 누수 (앱 코드 문제).
- **RssFile 증가** → 매핑 *후 unmap 안 함*.
- **RssShmem 증가** → /dev/shm 또는 SysV shm 누수.

## OOM Killer — 어느 프로세스가 죽을까

```bash
# OOM 점수 (높을수록 죽을 후보)
$ cat /proc/12345/oom_score
234

$ cat /proc/12345/oom_score_adj
0          # -1000 ~ 1000, 사용자 조정 가능

# 우선 보호
$ echo -1000 | sudo tee /proc/12345/oom_score_adj   # 절대 안 죽음
```

`oom_score`는 *RSS + 일부 휴리스틱*. PSS 아님 — 공유 메모리 많은 프로세스가 *부풀어 보임*.

## OOM 로그 — dmesg

```
Out of memory: Killed process 12345 (myprog) total-vm:8000000kB, anon-rss:7000000kB, file-rss:50000kB, shmem-rss:0kB
[oom selection scoring]
[memory state at OOM time]
```

`total-vm` = VSS, `anon-rss` + `file-rss` + `shmem-rss` = RSS 분해. 어느 종류가 폭주했는지.

## /proc/meminfo — 시스템 전체

```bash
$ cat /proc/meminfo | head -20
MemTotal:       16777216 kB
MemFree:         1024000 kB
MemAvailable:    3072000 kB    # ← 사용자 코드가 *알아야 할* 값
Buffers:          128000 kB
Cached:          5000000 kB    # page cache
SwapCached:        20000 kB
Active:          7000000 kB
Inactive:        3000000 kB
Active(anon):    5000000 kB
Inactive(anon):  2000000 kB
Active(file):    2000000 kB
Inactive(file):  1000000 kB
Unevictable:           0 kB
Mlocked:               0 kB
SwapTotal:       8000000 kB
SwapFree:        7900000 kB
Dirty:             50000 kB
Writeback:             0 kB
AnonPages:       7000000 kB    # 모든 anon (heap+stack 등)
Mapped:          1500000 kB
Shmem:            500000 kB
```

- **MemAvailable** = `MemFree + reclaimable cache`. 새 alloc이 *어디까지 가능*한가의 답.
- **MemFree**만 보면 안 됨 — 캐시 회수 가능.

## 캐시 vs 진짜 메모리

```bash
$ free -h
              total        used        free      shared  buff/cache   available
Mem:            16Gi        7Gi          1Gi         500Mi       8Gi          8.5Gi
Swap:           8Gi         100Mi        7.9Gi
```

`used` = `total - free - buff/cache`. `buff/cache`는 *언제든 회수* 가능 — `available`이 진짜 free.

캐시 강제 비우기 (디버깅용):
```bash
$ sudo sh -c 'sync; echo 3 > /proc/sys/vm/drop_caches'
```

## swappiness — swap 사용 성향

```bash
$ cat /proc/sys/vm/swappiness
60    # 기본
```

- 0: 거의 swap 안 함 (DB 서버 권장).
- 60: 기본.
- 100: 적극 swap.

swap이 *나쁜 게* 아니라 *잘못된 page를 swap*하면 느려짐. 운영에서는 swap 자체를 끄거나 `vm.swappiness=10` 정도.

## NUMA — 멀티 노드

```bash
$ numactl --hardware
available: 2 nodes (0-1)
node 0 cpus: 0 1 2 3
node 0 size: 8000 MB
node 0 free: 1500 MB
node 1 cpus: 4 5 6 7
node 1 size: 8000 MB
node 1 free: 6000 MB

$ numastat -p 12345
                           Node 0          Node 1           Total
                  --------------- --------------- ---------------
Huge                         0.00            0.00            0.00
Heap                       150.00         5500.00         5650.00
Stack                        0.00            0.00            0.00
Private                  12000.00            0.00        12000.00
----------------  --------------- --------------- ---------------
Total                    12150.00         5500.00        17650.00
```

NUMA 시스템에서 *어느 노드*에 메모리가 있는지. 잘못된 노드에 있으면 *cross-node access*로 느림.

```bash
$ numactl --cpunodebind=0 --membind=0 ./myprog    # node 0 고정
```

## valgrind / asan / heaptrack — 다음 장들

위는 *어떤 영역*이 메모리를 쓰는지 *큰 그림*. 누수의 *정확한 라인*은:

- **AddressSanitizer**의 leak detector ([Sanitizers Ch 3](/blog/tools/debugging/sanitizers/chapter03-lsan-leak))
- **Valgrind Memcheck** ([Valgrind Ch 1](/blog/tools/debugging/valgrind/chapter01-memcheck))
- **heaptrack** (이 시리즈 Ch 2)
- **glibc mtrace** (이 시리즈 Ch 4)
- **jemalloc/tcmalloc profiling** (Ch 3)

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| RSS는 안 늘어났는데 VSS는 늘어남 | mmap만 하고 touch 안 함. 위험은 *future swap thrashing* |
| RSS도 정상인데 OOM | 다른 프로세스가 부풀어. `top` 정렬 |
| RSS 줄지 않음 (free 후) | glibc free가 *반환 안 함*. malloc_trim 또는 jemalloc 사용 |
| `free` 출력 `used`가 큼 | 캐시 포함. `available` 봐야 |
| 한 프로세스의 PSS << RSS | 공유 라이브러리 많음. 누수 아님 |
| Shared 갑자기 증가 | mmap 공유 영역 (DB 페이지 캐시 등) |
| /proc/.../smaps 너무 큼 | smaps_rollup 사용 (5.0+) |
| THP huge page 매핑 | `AnonHugePages`로 별도 카운트 |

## 정리

- VSS/RSS/PSS/USS 구분 필수. PSS가 *공정한* 회계.
- `/proc/[pid]/status`가 빠른 RSS, `smaps_rollup`이 PSS.
- `smaps`로 *영역별 분해*. pmap도 같은 정보.
- RssAnon vs RssFile vs RssShmem이 누수 종류 구분.
- OOM 점수는 RSS 기반. 보호하려면 `oom_score_adj`.
- `MemAvailable`이 실제 free, `free`는 캐시 회수 가능량 모름.
- NUMA 시스템은 노드별 회계 필수.

## 다음 장 예고

Ch 2 — heaptrack. Valgrind보다 가벼운 heap profiler. 운영 환경에도 적용 가능.

## 관련 항목

- [Ch 2: heaptrack](/blog/tools/debugging/memory/chapter02-heaptrack)
- [Sanitizers Ch 3: LSan](/blog/tools/debugging/sanitizers/chapter03-lsan-leak)
- [Valgrind Ch 5: Massif](/blog/tools/debugging/valgrind/chapter05-massif-callgrind)
- [Kernel Ch 6: crash / drgn](/blog/tools/debugging/kernel/chapter06-crash-drgn) — kernel 측 메모리
- `man 5 proc` — /proc 전체
- [Brendan Gregg — Linux memory tools](https://www.brendangregg.com/Slides/SCaLE15x_Linux_perf_tools.pdf)
- [`Documentation/admin-guide/cgroup-v2.rst` — memory controller](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html#memory)
