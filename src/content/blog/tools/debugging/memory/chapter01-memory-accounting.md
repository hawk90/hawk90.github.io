---
title: "리눅스 메모리 회계 — RSS·VSS·PSS·smaps 해석"
slug: "tools/debugging/memory/chapter01-memory-accounting"
date: 2026-05-31T09:01:00
description: "프로세스 메모리의 실제 정체. VSS vs RSS vs PSS, /proc/[pid]/{status,smaps}."
tags: [memory, linux, rss, pss, smaps]
series: "Memory Diagnostics"
seriesOrder: 1
draft: false
topics: ["tools", "tools/debugging"]
---

"이 프로세스가 메모리를 얼마나 쓰나?" 답이 *RSS, VSS, PSS, USS* 중 어느 것이냐에 따라 *4가지*입니다. 잘못 답하면 OOM이 일어났을 때 *왜*인지 알 수 없고, 누수 디버깅도 헛수고. 이 시리즈는 *메모리 진단의 처음부터* — 정확한 회계, 누수 도구, glibc/jemalloc/tcmalloc profiling까지 다룹니다.

:::tldr
`/proc/[pid]/status`의 VmRSS는 *대략*. 진짜 누수 추적은 `/proc/[pid]/smaps_rollup`의 PSS 또는 `/proc/[pid]/smaps`의 영역별 분해.
:::

## 4가지 메모리 크기

```c
// 프로세스가 100MB를 malloc → 그 중 80MB만 touch
// 그리고 50MB의 .so를 다른 프로세스와 공유
```

| 종류 | 의미 | 위 예시 값 |
|------|------|------------|
| **VSS** (VSZ) | virtual size — 매핑된 *모든* 가상 메모리 | 100MB + 50MB = 150MB |
| **RSS** | 매핑된 페이지 중 현재 resident인 양 (page table 자체는 RSS에 포함되지 않음) | touch한 private 80MB + resident 공유 매핑 중 이 프로세스 몫 50MB |
| **PSS** | proportional set — 공유 메모리를 *공유 N분의 1*로 | 80MB + 50/N |
| **USS** | unique set — 이 프로세스만의 (private) | 80MB |

프로세스 간 공유분 중복을 줄여 비교할 때 PSS가 유용합니다. 시스템 OOM 원인을 확인할 때는 cgroup·커널 메모리·page cache와 다른 프로세스도 함께 봅니다. 누수 추적에는 같은 workload 조건의 PSS/USS 추세를 보조 지표로 사용합니다.

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

## PSS — 비례 회계

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
Private_Dirty:    105000 kB     # 비공유 dirty 페이지 회계값; 누수 여부는 별도 판단
Referenced:       125000 kB
Anonymous:        105000 kB
LazyFree:              0 kB
AnonHugePages:      4096 kB
Swap:               2000 kB
SwapPss:            1800 kB
```

핵심:
- **PSS** = 공유 페이지를 매핑 수로 나눈 프로세스별 비례 몫입니다. 프로세스들의 PSS 합은 프로세스 매핑 회계에 유용하지만 커널 메모리와 회수 가능한 page cache까지 포함한 시스템 전체 사용량과 같지는 않습니다.
- **Private_Dirty** = 현재 해당 매핑에 비공유로 회계되는 dirty 페이지입니다. 증가 추세는 조사 단서이지, 그 자체로 heap 누수의 증거는 아닙니다.

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

각 *VMA*(Virtual Memory Area)의 상세 회계입니다. 읽는 동안 매핑이 변할 수 있고 일부 대형 페이지 회계에는 근사치가 있으므로 모든 메모리 사용의 절대적으로 정확한 스냅샷은 아닙니다.

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

운영 조사에서 private dirty가 큰 매핑을 찾는 방법입니다. 결과는 후보 영역을 좁히는 데 쓰며, 큰 dirty mapping만으로 누수를 확정하지 않습니다.

## RssAnon vs RssFile vs RssShmem

```text
RssAnon:   105000 kB    # heap + stack + anonymous mmap
RssFile:    20000 kB    # 파일 매핑 (실행 + 공유 라이브러리)
RssShmem:    3000 kB    # tmpfs / POSIX shared memory
```

누수 진단의 *핵심 구분*:
- **RssAnon 증가** → heap 또는 익명 mmap 등의 후보. allocator retention과 정상 cache도 점검합니다.
- **RssFile 증가** → resident file-backed mapping 변화 후보. 매핑 수명과 page residency를 별도 확인합니다.
- **RssShmem 증가** → /dev/shm 또는 SysV shm 누수.

## OOM Killer — 어느 프로세스가 죽을까

```bash
# OOM 점수 (높을수록 죽을 후보)
$ cat /proc/12345/oom_score
234

$ cat /proc/12345/oom_score_adj
0          # -1000 ~ 1000, 사용자 조정 가능

# 우선 보호
$ echo -1000 | sudo tee /proc/12345/oom_score_adj   # OOM 선택에서 크게 보호하지만 모든 OOM 상황의 절대 생존을 보장하지는 않음
```

`oom_score`는 커널의 OOM badness 평가값이며 단순 RSS 수식이 아닙니다. 메모리 cgroup 등 선택 범위와 커널 정책을 함께 확인합니다.

## OOM 로그 — dmesg

```text
Out of memory: Killed process 12345 (myprog) total-vm:8000000kB, anon-rss:7000000kB, file-rss:50000kB, shmem-rss:0kB
[oom selection scoring]
[memory state at OOM time]
```

`total-vm`과 RSS 분류는 OOM 로그가 기록한 시점의 회계입니다. 이를 프로세스의 완전한 메모리 사용량이나 원인 증명으로 해석하지 않습니다.

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

- **MemAvailable**은 커널이 계산하는 추정치로, 새 할당에 쓸 수 있는 여유를 나타내려는 값입니다. 단순히 `MemFree + cache`를 더한 값은 아닙니다.
- **MemFree**만 보면 안 됨 — 캐시 회수 가능.

## 캐시 vs 진짜 메모리

```bash
$ free -h
              total        used        free      shared  buff/cache   available
Mem:            16Gi        7Gi          1Gi         500Mi       8Gi          8.5Gi
Swap:           8Gi         100Mi        7.9Gi
```

`used`는 이 `free` 출력의 계산값입니다. `buff/cache` 전체가 즉시 회수된다고 볼 수 없고 `available` 역시 커널의 회수 가능 메모리 추정치이지 실제 free와 같은 값은 아닙니다.

`drop_caches`는 진단 지표를 바꾸고 시스템 성능을 흔들 수 있으므로, 평상시 메모리 회계나 누수 확인 절차에 넣지 않습니다. 재현 가능한 실험 환경에서만 효과와 부작용을 알고 사용합니다.
```bash
$ sudo sh -c 'sync; echo 3 > /proc/sys/vm/drop_caches'
```

## swappiness — swap 사용 성향

```bash
$ cat /proc/sys/vm/swappiness
60    # 기본
```

- 값은 익명 메모리와 page cache 중 어느 쪽을 회수할지 조정하는 상대적 선호도입니다. 값만으로 swap 사용 여부나 애플리케이션 성능을 단정하지 말고, 워크로드에서 측정합니다.

swap 자체가 항상 나쁜 것은 아닙니다. 적절한 설정은 워크로드, 메모리 압력, 커널 정책에 따라 달라지므로 고정 권장값 대신 pressure와 latency를 함께 관찰합니다.

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

- **AddressSanitizer**의 leak detector ([Sanitizers Ch 3](/blog/tools/debugging/sanitizers/chapter03-lsan-leaks))
- **Valgrind Memcheck** ([Valgrind Ch 1](/blog/tools/debugging/valgrind/chapter02-memcheck))
- **heaptrack** (이 시리즈 Ch 2)
- **glibc mtrace** (이 시리즈 Ch 4)
- **jemalloc/tcmalloc profiling** (Ch 3)

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| RSS는 안 늘어났는데 VSS는 늘어남 | mmap만 하고 touch 안 함. 위험은 *future swap thrashing* |
| RSS도 정상인데 OOM | 다른 프로세스가 부풀어. `top` 정렬 |
| RSS 줄지 않음 (free 후) | allocator가 메모리를 보유하거나 매핑·페이지 상태가 달라졌을 수 있음. allocator 통계와 매핑을 확인 |
| `free` 출력 `used`가 큼 | 캐시 포함. `available` 봐야 |
| 한 프로세스의 PSS << RSS | 공유 라이브러리 많음. 누수 아님 |
| Shared 갑자기 증가 | mmap 공유 영역 (DB 페이지 캐시 등) |
| /proc/.../smaps 너무 큼 | smaps_rollup 사용 (5.0+) |
| THP huge page 매핑 | `AnonHugePages`로 별도 카운트 |

## 정리

- VSS/RSS/PSS/USS 구분 필수. PSS는 공유 매핑을 나눈 *비례 몫*이며 시스템 전체 회계와는 다릅니다.
- `/proc/[pid]/status`가 빠른 RSS, `smaps_rollup`이 PSS.
- `smaps`로 *영역별 분해*. pmap도 같은 정보.
- RssAnon vs RssFile vs RssShmem이 누수 종류 구분.
- OOM 선택에는 커널 badness 평가와 cgroup 범위가 관여합니다. `oom_score_adj`는 선택에 영향을 주는 값입니다.
- `MemAvailable`은 추정치이며 `MemFree`와 다릅니다.
- NUMA 시스템은 노드별 회계 필수.

## 다음 장 예고

Ch 2 — heaptrack. Valgrind보다 가벼운 heap profiler. 운영 환경에도 적용 가능.

## 관련 항목

- [Ch 2: heaptrack](/blog/tools/debugging/memory/chapter02-heaptrack)
- [Sanitizers Ch 3: LSan](/blog/tools/debugging/sanitizers/chapter03-lsan-leaks)
- [Valgrind Ch 5: Massif](/blog/tools/debugging/valgrind/chapter05-suppressions)
- [Kernel Ch 6: crash / drgn](/blog/tools/debugging/kernel/chapter06-crash-drgn) — kernel 측 메모리
- `man 5 proc` — /proc 전체
- [Brendan Gregg — Linux memory tools](https://www.brendangregg.com/Slides/SCaLE15x_Linux_perf_tools.pdf)
- [`Documentation/admin-guide/cgroup-v2.rst` — memory controller](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html#memory)

## 공식 자료

- [Linux `/proc` 문서 — status, smaps, smaps_rollup](https://docs.kernel.org/filesystems/proc.html)
- [Linux cgroup v2 memory controller](https://docs.kernel.org/admin-guide/cgroup-v2.html#memory)
