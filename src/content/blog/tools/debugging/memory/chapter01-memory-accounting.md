---
title: "리눅스 메모리 회계 — RSS·VSS·PSS·smaps 해석"
slug: "tools/debugging/memory/chapter01-memory-accounting"
date: 2026-05-31T09:01:00
description: "VSS·RSS·PSS·USS를 Debian 12 VM에서 직접 재 보며 /proc/[pid]/status·smaps_rollup·smaps·pmap·OOM 로그를 읽는 법."
tags: [memory, linux, rss, pss, smaps]
series: "Memory Diagnostics"
seriesOrder: 1
draft: false
topics: ["tools", "tools/debugging"]
---

"이 프로세스가 메모리를 얼마나 쓰나?"라는 질문에는 답이 네 개 있습니다. VSS, RSS, PSS, USS 중 무엇을 묻느냐에 따라 숫자가 다릅니다. 같은 프로세스를 두고도 `ps`는 RSS가 130,112 kB라고 하고 `smaps_rollup`은 PSS가 107,810 kB라고 합니다. 어느 숫자를 봐야 하는지 모르면 OOM 원인도, 누수 여부도 엉뚱한 곳에서 찾게 됩니다.

이 시리즈는 정확한 회계에서 시작해 heaptrack, jemalloc·tcmalloc, glibc 진단 도구, 운영 누수 진단, CXL·계층 메모리까지 다룹니다. 첫 장에서는 작은 프로그램 하나를 VM에서 돌려 놓고 `/proc`의 숫자를 하나씩 맞춰 봅니다.

:::tldr
`/proc/[pid]/status`의 `VmRSS`는 빠르지만 커널 6.1에서는 스레드별 캐시 카운터 때문에 정확한 값이 아닙니다. 정확한 RSS·PSS는 `smaps_rollup`, 매핑별 분해는 `smaps`나 `pmap -X`에서 봅니다.
:::

## 실험 환경과 프로그램

이 장의 출력은 모두 Debian 12.15 arm64 nocloud 이미지를 QEMU(HVF 가속)로 띄운 VM에서 얻었습니다. 커널은 `6.1.0-56-arm64`, vCPU 4개, 메모리 4 GiB이고, QEMU 옵션으로 2 GiB씩 NUMA 노드 두 개를 만들었습니다. swap은 없습니다. 숫자는 이 VM의 값이며 실제 서버의 기준값이 아닙니다.

측정 대상 프로그램은 일부러 네 숫자가 모두 달라지게 만들었습니다. `heap` 모드는 100 MiB를 `malloc`하고 그중 80 MiB만 씁니다. 두 모드 모두 48 MiB 파일을 `MAP_SHARED`로 매핑해 모든 페이지를 한 번씩 읽습니다.

```c
/* acct.c: ./acct heap   -> malloc 100 MiB, touch 80 MiB, map+read a 48 MiB file
 *         ./acct maponly -> only map+read the same 48 MiB file              */
#define MiB (1024UL * 1024)

int main(int argc, char **argv) {
    if (argc > 1 && strcmp(argv[1], "heap") == 0) {
        char *heap = malloc(100 * MiB);
        memset(heap, 1, 80 * MiB);          /* touch only 80 MiB */
    }
    int fd = open("/root/shared.bin", O_RDONLY);
    char *shared = mmap(NULL, 48 * MiB, PROT_READ, MAP_SHARED, fd, 0);
    volatile char sum = 0;
    for (size_t i = 0; i < 48 * MiB; i += 4096)
        sum += shared[i];                   /* fault in every page */
    printf("%d ready\n", getpid());
    fflush(stdout);
    pause();
    return 0;
}
```

`./acct heap`(이하 A)과 `./acct maponly`(이하 B)를 동시에 띄우면, 48 MiB 파일 페이지는 두 프로세스가 나눠 갖고 80 MiB 익명 페이지는 A 혼자 갖습니다.

## 네 가지 메모리 크기

결과부터 봅니다. 아래 표의 값은 모두 A의 `/proc/[pid]/status`와 `smaps_rollup`에서 읽었습니다.

| 종류 | 정의 | A에서 읽은 곳 | A의 값 |
|------|------|---------------|--------|
| **VSS** (VSZ) | 매핑된 가상 주소 공간 전체 | `VmSize` | 153,748 kB |
| **RSS** | 지금 RAM에 올라와 있는 페이지. 공유 페이지도 통째로 셈 | `smaps_rollup`의 `Rss` | 133,504 kB |
| **PSS** | 공유 페이지를 공유한 프로세스 수로 나눠 더한 값 | `smaps_rollup`의 `Pss` | 107,810 kB |
| **USS** | 이 프로세스만 매핑한 페이지 | `Private_Clean` + `Private_Dirty` | 0 + 83,168 kB |

VSS 153,748 kB에는 `malloc`으로 받았지만 쓰지 않은 20 MiB도 들어 있습니다. RSS는 쓴 80 MiB와 파일 48 MiB(49,152 kB), 그리고 libc 같은 라이브러리 페이지를 더한 값입니다. PSS에서는 A와 B가 파일 페이지를 반씩 나눠 가지므로 파일 몫이 24,576 kB로 줄어듭니다(`Pss_File` 24,642 kB에는 libc 몫이 조금 더 들어 있습니다). USS 83,168 kB는 대부분 80 MiB 익명 영역입니다.

커널 문서(`Documentation/filesystems/proc.rst`, v6.1)는 PSS를 이렇게 정의합니다. 1000페이지를 혼자 갖고 1000페이지를 다른 프로세스 하나와 공유하면 PSS는 1500입니다. 같은 문서는 `MAP_SHARED` 매핑이라도 지금 pte가 하나만 매핑된 페이지는 공유가 아니라 private으로 센다고 적습니다. 그래서 B를 띄우기 전 A 혼자 파일을 매핑하고 있을 때는 그 48 MiB도 USS에 들어갑니다.

PSS는 회식비 나누기와 같습니다. 피자 한 판 값을 둘이 나눠 내면 각자 반 판 값만 낸 것으로 칩니다. 모든 프로세스의 PSS를 더하면 프로세스들이 매핑한 사용자 메모리의 합에 가까워지지만, 커널 slab, 페이지 테이블, 어느 프로세스도 매핑하지 않은 page cache는 들어가지 않습니다. 시스템 전체 사용량은 아래 `/proc/meminfo`에서 따로 봅니다.

## /proc/[pid]/status — 빠른 RSS와 그 오차

가장 먼저 보게 되는 파일은 `status`입니다. A에서 `Vm`과 `Rss`로 시작하는 줄만 골랐습니다.

```text
$ grep -E "^(Vm|Rss)" /proc/481/status
VmPeak:	  153748 kB
VmSize:	  153748 kB
VmLck:	       0 kB
VmPin:	       0 kB
VmHWM:	  130112 kB
VmRSS:	  130112 kB
RssAnon:	   83164 kB
RssFile:	   46948 kB
RssShmem:	       0 kB
VmData:	  102616 kB
VmStk:	     132 kB
VmExe:	       4 kB
VmLib:	    1744 kB
VmPTE:	     300 kB
VmSwap:	       0 kB
```

proc.rst는 `VmRSS = RssAnon + RssFile + RssShmem`이라고 적고, 위 값도 83,164 + 46,948 + 0 = 130,112로 맞습니다. `VmHWM`은 RSS의 최고치(high water mark)이고, `VmPTE` 300 kB는 이 프로세스의 페이지 테이블 크기입니다. 페이지 테이블은 RSS에 들어가지 않습니다.

이상한 점이 하나 있습니다. `VmRSS`는 130,112 kB인데, 같은 순간 `smaps_rollup`의 `Rss`는 133,504 kB입니다. `RssFile` 46,948 kB는 파일 하나만 해도 49,152 kB라는 사실과도 맞지 않습니다. 원인은 커널 6.1의 카운터 구조입니다. `include/linux/mm_types_task.h`(v6.1, 39~40행)는 split PTE lock을 쓰는 MMU 커널에서 `SPLIT_RSS_COUNTING`을 켜고, `mm/memory.c`(v6.1, 197~205행)는 스레드별로 쌓아 둔 카운터를 `TASK_RSS_EVENTS_THRESH`(64)번 이벤트마다 한 번 `mm`에 합칩니다. `man 5 proc`(man-pages 6.03)도 `VmRSS`·`RssAnon`·`RssFile`을 "inaccurate"라고 적고, 정확한 값이 필요하면 `smaps`나 `smaps_rollup`을 보라고 합니다. v6.12 소스에서는 이 카운터가 `percpu_counter`로 바뀌었습니다(`include/linux/mm.h`의 `get_mm_counter()`).

`ps`도 같은 카운터를 씁니다. 이 VM에서 `ps -o pid,vsz,rss,comm`은 A를 `481 153748 130112 acct`로 보여 줘 `VmSize`·`VmRSS`와 같았습니다.

## smaps_rollup — 정확한 RSS와 PSS

`smaps_rollup`은 커널이 페이지 테이블을 직접 훑어 센 값입니다. A와 B를 나란히 놓았습니다.

```text
$ cat /proc/481/smaps_rollup          # A: heap
aaaad1c40000-ffffdc250000 ---p 00000000 00:00 0                          [rollup]
Rss:              133504 kB
Pss:              107810 kB
Pss_Dirty:         83170 kB
Pss_Anon:          83168 kB
Pss_File:          24642 kB
Pss_Shmem:             0 kB
Shared_Clean:      50332 kB
Shared_Dirty:          4 kB
Private_Clean:         0 kB
Private_Dirty:     83168 kB
Referenced:       133504 kB
Anonymous:         83168 kB
LazyFree:              0 kB
AnonHugePages:     81920 kB
...
Swap:                  0 kB
SwapPss:               0 kB
Locked:                0 kB

$ cat /proc/483/smaps_rollup          # B: maponly
...
Rss:               50424 kB
Pss:               24730 kB
Pss_Anon:             88 kB
Pss_File:          24642 kB
Shared_Clean:      50332 kB
Private_Dirty:        88 kB
...
```

두 프로세스의 `Pss_File`은 똑같이 24,642 kB입니다. 그중 24,576 kB는 `shared.bin` 49,152 kB를 A와 B가 반씩 나눈 몫이고, 나머지 66 kB는 여러 프로세스가 함께 쓰는 libc·ld.so 코드 페이지의 몫입니다. `Shared_Clean` 50,332 kB도 파일 49,152 kB에 libc·ld.so·vdso 1,180 kB를 더한 값입니다. A의 `Pss`는 `Pss_Anon + Pss_File + Pss_Shmem` = 83,168 + 24,642 + 0 = 107,810으로 정확히 맞습니다.

몇 가지 줄은 따로 읽어 둘 만합니다.

- **`Private_Dirty`**: 이 프로세스만 매핑하고 내용이 바뀐 페이지입니다. A에서는 `memset`한 80 MiB가 여기 들어갔습니다. 누수 조사에서 가장 먼저 보는 줄이지만, 정상적인 캐시도 여기 쌓이므로 값 하나로 누수를 가리지는 못합니다.
- **`AnonHugePages`**: 81,920 kB, 즉 80 MiB가 THP(투명 대형 페이지)로 잡혔습니다. 이 VM의 THP 설정에서 큰 익명 영역이 2 MiB 페이지로 채워진 결과입니다.
- **`Pss_Dirty`**: PSS 중 dirty 페이지 몫입니다. proc.rst는 `Pss_Clean`이 따로 없으니 `Pss - Pss_Dirty`로 구하라고 적습니다.

proc.rst는 `smaps_rollup`의 정보가 모두 `smaps`에도 있지만, 같은 값을 rollup으로 훨씬 싸게 얻을 수 있다고 설명합니다. 여러 프로세스를 PSS 순으로 정렬할 때도 rollup을 씁니다.

```bash
for pid in $(pgrep -f .); do
    pss=$(awk '/^Pss:/ {print $2}' /proc/$pid/smaps_rollup 2>/dev/null)
    [ -n "$pss" ] && echo "$pss $pid $(cat /proc/$pid/comm 2>/dev/null)"
done | sort -n -r | head -5
```

VM에서 A와 B를 다시 띄운 뒤(PID 613·614) 돌린 결과입니다(kB, PID, 이름). 새로 띄운 프로세스라 앞의 107,810 kB와 조금 다릅니다.

```text
108212 613 acct
24756 614 acct
10423 349 unattended-upgr
6712 584 sshd
5686 225 systemd-journal
```

## smaps — 매핑(VMA)별 분해

`smaps`는 같은 숫자를 VMA(가상 메모리 영역)마다 나눠 보여 줍니다. A의 매핑 머리줄만 뽑으면 프로세스 주소 공간의 지도가 됩니다.

```text
aaaad1c40000-aaaad1c41000 r-xp 00000000 fe:01 85      /root/acct
aaaad1c5f000-aaaad1c60000 r--p 0000f000 fe:01 85      /root/acct
aaaad1c60000-aaaad1c61000 rw-p 00010000 fe:01 85      /root/acct
aaaae2340000-aaaae2361000 rw-p 00000000 00:00 0       [heap]
ffff8b200000-ffff8e200000 r--s 00000000 fe:01 33      /root/shared.bin
ffff8e2df000-ffff946e0000 rw-p 00000000 00:00 0
ffff946e0000-ffff9486c000 r-xp 00000000 fe:01 2077    /usr/lib/aarch64-linux-gnu/libc.so.6
...
ffff948d6000-ffff948d7000 r-xp 00000000 00:00 0       [vdso]
...
ffffdc22f000-ffffdc250000 rw-p 00000000 00:00 0       [stack]
```

100 MiB `malloc`이 `[heap]`이 아니라 이름 없는 `rw-p` 익명 매핑(`ffff8e2df000`, 102,404 kB)에 들어간 점을 눈여겨봅니다. `[heap]`은 132 kB밖에 안 됩니다. glibc가 큰 요청을 `brk`가 아니라 `mmap`으로 처리했기 때문이고, 그 임계값은 [Ch 4](/blog/tools/debugging/memory/chapter04-glibc-tools)에서 다룹니다. 권한 칸의 넷째 글자는 `p`(private)와 `s`(shared)를 구분합니다. `shared.bin`만 `r--s`입니다.

파일 매핑 한 개의 상세 항목은 이렇게 생겼습니다.

```text
ffff8b200000-ffff8e200000 r--s 00000000 fe:01 33                         /root/shared.bin
Size:              49152 kB
KernelPageSize:        4 kB
MMUPageSize:           4 kB
Rss:               49152 kB
Pss:               24576 kB
Pss_Dirty:             0 kB
Shared_Clean:      49152 kB
Shared_Dirty:          0 kB
Private_Clean:         0 kB
Private_Dirty:         0 kB
Referenced:        49152 kB
Anonymous:             0 kB
...
THPeligible:    0
VmFlags: rd mr me ms
```

`Pss` 24,576 kB는 정확히 `Rss`의 절반입니다. B가 같은 페이지를 매핑하고 있기 때문입니다.

`smaps`는 커널이 읽는 동안 락을 잡았다 놓았다 하며 만드는 출력이라, 그 사이 매핑이 바뀔 수 있습니다. proc.rst(v6.1)가 보장하는 것은 두 가지뿐입니다. 출력 주소가 뒤로 가지 않고, 읽는 내내 존재한 매핑은 반드시 출력됩니다. 한 시점의 완벽한 스냅샷은 아니라는 뜻입니다.

## pmap -X — smaps를 표로

`pmap -X`(procps 4.0.2)는 `smaps`를 한 줄 한 매핑의 표로 바꿔 줍니다. 열이 많아서 앞쪽만 남겼습니다.

```text
$ pmap -X 481
481:   ./acct heap
     Address Perm   Offset Device Inode   Size    Rss    Pss Pss_Dirty Referenced Anonymous ... Mapping
aaaad1c40000 r-xp 00000000  fe:01    85      4      4      2         2          4         0 ... acct
aaaae2340000 rw-p 00000000  00:00     0    132      8      8         8          8         8 ... [heap]
ffff8b200000 r--s 00000000  fe:01    33  49152  49152  24576         0      49152         0 ... shared.bin
ffff8e2df000 rw-p 00000000  00:00     0 102404  83076  83076     83076      83076     83076 ...
ffff946e0000 r-xp 00000000  fe:01  2077   1584   1020     55         0       1020         0 ... libc.so.6
...
                                        ====== ====== ====== =========
                                        153748 133504 107809     83170 ... KB
```

맨 아래 합계 153,748 / 133,504 / 107,809는 `VmSize`, `smaps_rollup`의 `Rss`, `Pss`와 맞습니다(PSS 1 kB 차이는 매핑별 반올림입니다). libc 코드 영역은 RSS 1,020 kB 중 PSS가 55 kB뿐인데, 이 VM의 여러 프로세스가 같은 libc 페이지를 나눠 쓰기 때문입니다.

## 큰 dirty 매핑 찾기

매핑이 수백 개인 프로세스에서는 `Private_Dirty`가 큰 매핑부터 봅니다. 다음 awk는 1 MiB를 넘는 매핑만 출력합니다.

```bash
awk '/^[0-9a-f]+-/ { mapping=$0 }
     /^Private_Dirty:/ { if ($2 > 1024) print $2 " " mapping }' \
    /proc/481/smaps | sort -n -r | head
```

```text
83076 ffff8e2df000-ffff946e0000 rw-p 00000000 00:00 0
```

A에서는 `malloc`한 익명 매핑 하나만 걸렸습니다. 이렇게 나온 매핑은 조사 대상을 좁혀 줄 뿐입니다. 그 메모리를 누가 할당했는지는 다음 장의 heaptrack이나 allocator 프로파일러가 알려 줍니다.

## RssAnon·RssFile·RssShmem — 무엇이 늘었나

`status`의 세 줄은 메모리 종류를 나눕니다. proc.rst(v6.1)의 정의는 다음과 같습니다.

| 항목 | proc.rst 정의 | A의 내용 |
|------|---------------|----------|
| `RssAnon` | resident 익명 메모리 | 80 MiB `memset` 영역, 스택 |
| `RssFile` | resident 파일 매핑 | `shared.bin`, 실행 파일, libc |
| `RssShmem` | resident shmem. SysV shm, tmpfs 매핑, 공유 익명 매핑 포함 | 없음 |

어느 줄이 자라느냐에 따라 다음 단계가 달라집니다. `RssAnon`이 자라면 heap이나 익명 `mmap`을 의심하고 allocator 도구로 넘어갑니다. `RssFile`이 자라면 어떤 파일 매핑이 커졌는지 `smaps`에서 찾습니다. `RssShmem`이 자라면 `/dev/shm`이나 SysV shm 세그먼트를 봅니다. 다만 위에서 봤듯 6.1에서는 이 세 값이 근사치이므로, 추세는 `smaps_rollup`의 `Pss_Anon`·`Pss_File`·`Pss_Shmem`으로 확인하는 편이 정확합니다.

## OOM Killer — 누가 죽는가

`/proc/[pid]/oom_score`는 OOM killer가 희생자를 고를 때 쓰는 점수를 보여 줍니다. A의 값은 688이었습니다.

```text
$ cat /proc/481/oom_score /proc/481/oom_score_adj
688
0
```

이 숫자는 `fs/proc/base.c`(v6.1, 549~568행)의 `proc_oom_score()`가 만듭니다. `mm/oom_kill.c`의 `oom_badness()`(v6.1, 201행~)가 RSS, swap 엔트리, 페이지 테이블 페이지 수를 더하고 `oom_score_adj`를 반영한 badness를 돌려주면, `proc_oom_score()`가 `(1000 + badness * 1000 / totalpages) * 2 / 3`으로 바꿉니다. `totalpages`는 RAM과 swap 페이지의 합입니다. A는 4 GiB VM에서 `VmRSS` 130,112 kB(약 127 MiB)를 쓰니 badness가 작고, 점수는 1000의 2/3 근처인 688이 됩니다.

`oom_score_adj`는 -1000부터 1000까지 받습니다. proc.rst는 -1000(`OOM_SCORE_ADJ_MIN`)이 그 프로세스의 OOM kill을 사실상 끄는 값이라고 적고, `oom_badness()`도 이 값이면 `LONG_MIN`을 돌려줘 후보에서 뺍니다. 정말 그런지 VM에서 시험했습니다. A의 `oom_score_adj`를 -1000으로 바꾸고, 64 MiB씩 끝없이 `memset`하는 `hog`를 돌렸습니다.

```text
$ cat /proc/574/oom_score /proc/574/oom_score_adj
0
-1000
$ ./hog
bash: line 10:   578 Killed                  ./hog
```

커널 로그에는 이렇게 남았습니다.

```text
[  115.629715] hog invoked oom-killer: gfp_mask=0x400dc0(GFP_KERNEL_ACCOUNT|__GFP_ZERO), order=0, oom_score_adj=0
...
[  115.648451] Tasks state (memory values in pages):
[  115.648652] [  pid  ]   uid  tgid total_vm      rss pgtables_bytes swapents oom_score_adj name
...
[  115.654785] [    574]     0   574    38437    20758   315392        0         -1000 acct
[  115.655036] [    578]     0   578   950878   942570  7598080        0             0 hog
[  115.655323] oom-kill:constraint=CONSTRAINT_NONE,nodemask=(null),cpuset=/,mems_allowed=0-1,global_oom,task_memcg=/user.slice/user-0.slice/session-15.scope,task=hog,pid=578,uid=0
[  115.656137] Out of memory: Killed process 578 (hog) total-vm:3803512kB, anon-rss:3770276kB, file-rss:4kB, shmem-rss:0kB, UID:0 pgtables:7420kB oom_score_adj:0
```

`hog`가 죽고 A는 살아남았습니다. 로그는 이 순서로 읽습니다. 첫 줄은 누가 할당하다 OOM을 불렀는지 알려 줍니다. `oom-kill:` 줄의 `constraint`와 `global_oom`으로 시스템 전체 OOM인지 cgroup OOM인지 가립니다. 마지막 줄에는 희생자와 그 순간의 RSS 분류가 나옵니다. `Tasks state` 표의 `rss`는 페이지 단위입니다. A의 `rss`가 20,758페이지(약 81 MiB)로 평소 `VmRSS` 130,112 kB보다 작은 데도 이유가 있습니다. 메모리 압박 중에 깨끗한 파일 페이지 48 MiB가 회수됐기 때문입니다. 익명 페이지는 swap이 없으니 회수할 수 없었습니다.

## /proc/meminfo와 free — 시스템 전체

프로세스 숫자를 다 더해도 시스템 전체가 되지는 않습니다. 시스템 관점은 `/proc/meminfo`에서 봅니다. 앞 실험을 띄우기 전 VM의 앞부분입니다.

```text
$ head -21 /proc/meminfo
MemTotal:        4021572 kB
MemFree:         3642892 kB
MemAvailable:    3660516 kB
Buffers:           12356 kB
Cached:           186028 kB
SwapCached:            0 kB
Active:           108868 kB
Inactive:         117676 kB
Active(anon):        252 kB
Inactive(anon):    28524 kB
Active(file):     108616 kB
Inactive(file):    89152 kB
Unevictable:           0 kB
Mlocked:               0 kB
SwapTotal:             0 kB
SwapFree:              0 kB
Zswap:                 0 kB
Zswapped:              0 kB
Dirty:               408 kB
Writeback:             0 kB
AnonPages:         28044 kB
```

proc.rst(v6.1)는 `MemAvailable`을 swap 없이 새 애플리케이션을 띄우는 데 쓸 수 있는 메모리의 추정치라고 정의합니다. 계산에는 `MemFree`, `SReclaimable`, 파일 LRU 크기, 존별 low watermark가 들어갑니다. 시스템이 돌아가려면 page cache가 어느 정도 있어야 하고 회수 가능한 slab도 다 회수되지는 않는다는 점까지 감안한 값입니다. 위 VM에서 `MemAvailable` 3,660,516 kB는 `MemFree`+`Cached`(3,828,920 kB)보다 168,404 kB 작습니다.

`free`는 같은 파일을 읽어 요약합니다.

```text
$ free -h
               total        used        free      shared  buff/cache   available
Mem:           3.8Gi       352Mi       3.5Gi       608Ki       212Mi       3.5Gi
Swap:             0B          0B          0B
```

`available` 칸이 `MemAvailable`입니다. "메모리가 남았나"를 물을 때는 `free` 칸이 아니라 `available` 칸을 봅니다. `buff/cache`는 `man free`(procps 4.0.2)에 따르면 `/proc/meminfo`의 `Buffers`·`Cached`·`SReclaimable`의 합이고, 그 전부가 회수 가능하지는 않다는 점이 `available`에 이미 반영돼 있습니다.

캐시를 버리는 `echo 3 > /proc/sys/vm/drop_caches`로 `used`를 줄여 보고 싶어질 수 있지만, 이 파일은 캐시 크기를 관리하는 수단이 아닙니다. 커널 문서(`Documentation/admin-guide/sysctl/vm.rst`, v6.1)에 따르면 커널은 필요할 때 캐시를 알아서 회수하고, 버린 객체를 다시 만드느라 I/O와 CPU를 크게 쓸 수 있으므로 테스트·디버깅 환경 밖에서는 권장하지 않습니다. dirty 객체는 버리지 않으므로 먼저 `sync`를 하면 더 많이 버릴 수 있습니다.

## swappiness — 회수 쪽 선택

```text
$ cat /proc/sys/vm/swappiness
60
```

vm.rst(v6.1)에 따르면 `swappiness`는 swap과 파일 페이징의 상대적 I/O 비용을 0~200 사이로 알려 주는 값입니다. 100이면 두 비용을 같게 보고 page cache와 swap 대상 페이지에 같은 압력을 주며, 값이 낮을수록 swap I/O를 비싸게 봅니다. 기본값은 60이고, 문서는 최적값이 실험으로 정해지며 워크로드에 따라 다르다고 적습니다. zram·zswap처럼 swap이 파일 시스템보다 빠르면 100보다 큰 값도 고려하라는 예와, swap 장치의 랜덤 I/O가 파일 시스템보다 평균 2배 빠르면 133이라는 계산 예도 함께 있습니다.

## NUMA — 어느 노드에 있나

노드가 여럿인 시스템에서는 "얼마나"에 "어디에"가 더해집니다. 이 VM은 QEMU `-numa` 옵션으로 노드 두 개를 만든 것입니다. `-numa dist`를 주지 않아 ACPI SLIT 테이블이 없으므로, 노드 사이 거리 20은 커널 기본값 `REMOTE_DISTANCE`(`include/linux/topology.h`)입니다. 실제 하드웨어의 지연 차이를 흉내 내지는 않습니다.

```text
$ numactl --hardware
available: 2 nodes (0-1)
node 0 cpus: 0 1
node 0 size: 1984 MB
node 0 free: 1790 MB
node 1 cpus: 2 3
node 1 size: 1942 MB
node 1 free: 1852 MB
node distances:
node   0   1
  0:  10  20
  1:  20  10
```

아무 정책 없이 띄운 A는 메모리가 두 노드에 흩어졌습니다(numactl 2.0.16의 `numastat`, 단위 MB).

```text
$ numastat -p 481

Per-node process memory usage (in MBs) for PID 481 (acct)
                           Node 0          Node 1           Total
                  --------------- --------------- ---------------
Huge                         0.00            0.00            0.00
Heap                         0.00            0.01            0.01
Stack                        0.00            0.01            0.01
Private                     49.15           81.20          130.35
----------------  --------------- --------------- ---------------
Total                       49.15           81.22          130.37
```

이 표의 `Private` 행은 "private 페이지"라는 뜻이 아닙니다. numactl `numastat.c`(v2.0.16, 74~77행)는 `numa_maps` 줄을 `huge`·`heap`·`stack` 표시로 나누고 나머지를 모두 `Private`에 넣습니다. `numastat.c`의 MB는 1024×1024바이트(49행 `MEGABYTE`)입니다. 그래서 이 실행에서는 노드 0의 49.15 MB 대부분이 공유 파일 `shared.bin`(48 MiB)이고, 익명 80 MiB는 노드 1에 있습니다.

`numactl`로 CPU와 메모리를 노드 0에 묶고 다시 띄우면 이렇게 바뀝니다.

```text
$ numactl --cpunodebind=0 --membind=0 ./acct heap &
$ numastat -p 608
...
Private                    128.38            1.02          129.41
----------------  --------------- --------------- ---------------
Total                      128.40            1.02          129.42
```

노드 1에 남은 1.02 MB는 `/proc/608/numa_maps`에서 원인이 보입니다.

```text
ffffba9d0000 bind:0 file=/usr/lib/aarch64-linux-gnu/libc.so.6 mapped=253 mapmax=13 N0=23 N1=230 kernelpagesize_kB=4
...
ffffbab80000 bind:0 file=/usr/lib/aarch64-linux-gnu/ld-linux-aarch64.so.1 mapped=39 mapmax=9 N0=7 N1=32 kernelpagesize_kB=4
```

libc·ld.so 코드 페이지 262개(230 + 32, 약 1.02 MiB)는 다른 프로세스가 이미 노드 1에 올려 둔 page cache입니다. `--membind`는 새로 할당하는 페이지의 위치를 정할 뿐, 이미 메모리에 있는 공유 페이지를 옮기지 않습니다.

## 자주 만나는 함정

| 증상 | 원인과 확인 방법 |
|------|------------------|
| `VmRSS`와 `smaps_rollup`의 `Rss`가 다름 | 6.1의 `SPLIT_RSS_COUNTING` 근사치. 이 VM에서 3,392 kB 차이. 정확한 값은 rollup |
| VSS는 큰데 RSS는 작음 | `malloc`·`mmap` 후 쓰지 않은 영역. A의 VSS에는 안 쓴 20 MiB가 들어 있음 |
| 큰 `malloc`이 `[heap]`에 안 보임 | glibc가 큰 요청을 익명 `mmap`으로 처리. 이름 없는 `rw-p` 매핑을 봄 |
| PSS가 RSS보다 훨씬 작음 | 공유 페이지가 많음. 공유 라이브러리·공유 파일 매핑이면 누수가 아님 |
| `free`의 `free`가 거의 0 | page cache가 메모리를 쓰는 정상 상태. `available`을 봄 |
| `numastat -p`의 `Private`에 파일이 섞임 | 이 행은 Heap·Stack·Huge가 아닌 매핑 전부를 모음 |
| `--membind`했는데 다른 노드에 페이지가 있음 | 이미 메모리에 있던 공유 page cache는 옮기지 않음 |
| `oom_score`가 0 | `oom_score_adj`가 -1000이면 후보에서 빠짐 |

## 정리

- VSS·RSS·PSS·USS는 공유 페이지와 쓰지 않은 페이지를 어떻게 세느냐의 차이입니다. 실험 프로그램 A에서는 153,748 / 133,504 / 107,810 / 83,168 kB였습니다.
- `status`의 `VmRSS`·`RssAnon`·`RssFile`은 6.1에서 스레드별 카운터 때문에 근사치입니다. 정확한 값은 `smaps_rollup`에서 읽습니다.
- `smaps`와 `pmap -X`는 매핑별로 나눠 보여 줍니다. 큰 `malloc`은 `[heap]`이 아니라 익명 `mmap` 매핑에 나타납니다.
- OOM 점수는 `oom_badness()`가 RSS·swap·페이지 테이블로 계산하고, `oom_score_adj` -1000은 프로세스를 후보에서 뺍니다.
- 시스템 여유 메모리는 `MemAvailable`(`free`의 `available`)로 봅니다.
- NUMA 시스템에서는 `numastat -p`와 `numa_maps`로 노드별 위치를 봅니다.

## 다음 장 예고

Ch 2에서는 heaptrack을 다룹니다. 이 장에서 "어느 매핑이 큰가"까지 왔다면, heaptrack은 "그 메모리를 어느 콜스택이 할당했나"에 답합니다.

## 관련 항목

- [Ch 2: heaptrack](/blog/tools/debugging/memory/chapter02-heaptrack)
- [Sanitizers Ch 3: LSan](/blog/tools/debugging/sanitizers/chapter03-lsan-leaks)
- [Valgrind Ch 2: Memcheck](/blog/tools/debugging/valgrind/chapter02-memcheck)
- [Valgrind Ch 5: Suppression과 실무 운용](/blog/tools/debugging/valgrind/chapter05-suppressions)
- [Kernel Ch 6: crash / drgn](/blog/tools/debugging/kernel/chapter06-crash-drgn) — 커널 쪽 메모리
- `man 5 proc` — /proc 전체

## 공식 자료

- [Linux v6.1 `Documentation/filesystems/proc.rst`](https://github.com/torvalds/linux/blob/v6.1/Documentation/filesystems/proc.rst) — status, smaps, smaps_rollup, meminfo, oom_score_adj
- [Linux v6.1 `fs/proc/base.c` — `proc_oom_score()`](https://github.com/torvalds/linux/blob/v6.1/fs/proc/base.c#L549)
- [Linux v6.1 `mm/oom_kill.c` — `oom_badness()`](https://github.com/torvalds/linux/blob/v6.1/mm/oom_kill.c#L201)
- [Linux v6.1 `mm/memory.c` — `TASK_RSS_EVENTS_THRESH`](https://github.com/torvalds/linux/blob/v6.1/mm/memory.c#L197)
- [Linux v6.1 `Documentation/admin-guide/sysctl/vm.rst`](https://github.com/torvalds/linux/blob/v6.1/Documentation/admin-guide/sysctl/vm.rst) — swappiness, drop_caches
- [Linux v6.1 cgroup v2 memory controller](https://github.com/torvalds/linux/blob/v6.1/Documentation/admin-guide/cgroup-v2.rst)
