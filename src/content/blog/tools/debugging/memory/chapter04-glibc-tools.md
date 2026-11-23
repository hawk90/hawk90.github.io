---
title: "glibc 메모리 도구 — mtrace·mcheck·MALLOC_CHECK_"
slug: "tools/debugging/memory/chapter04-glibc-tools"
date: 2026-05-31T09:04:00
description: "glibc 2.36에서 libc_malloc_debug.so 없이는 꺼져 있는 MALLOC_CHECK_·mtrace·mcheck를 직접 돌려 보고, MALLOC_PERTURB_·mallinfo2·malloc_stats·malloc_info·malloc_trim·arena 한도를 실제 출력으로 확인합니다."
tags: [memory, glibc, mtrace, mcheck, malloc-check]
series: "Memory Diagnostics"
seriesOrder: 4
draft: false
topics: ["tools", "tools/debugging"]
---

allocator를 바꾸지 않아도 glibc malloc에는 진단 기능이 꽤 들어 있습니다. 다만 glibc 2.34에서 큰 변화가 있었습니다. `NEWS`(glibc 2.36 소스)의 2.34 항목은 `MALLOC_CHECK_` 환경 변수(또는 `glibc.malloc.check` tunable), `mtrace()`, `mcheck()`가 이제 기본 C 라이브러리에서 꺼져 있고, 쓰려면 새 디버그 라이브러리 `libc_malloc_debug.so`를 preload해야 한다고 적습니다. 이 사실을 모르면 환경 변수를 아무리 바꿔도 아무 일도 일어나지 않습니다.

이 장에서는 각 기능을 작은 C 프로그램 `gl.c`로 직접 돌려 봅니다. 환경은 앞 장들과 같은 Debian 12.15 arm64 VM이고 glibc는 `2.36-9+deb12u14`입니다. 소스 인용은 glibc `glibc-2.36` 태그 기준입니다.

:::tldr
glibc 2.34 이후 `MALLOC_CHECK_`·`mtrace()`·`mcheck()`는 `LD_PRELOAD=libc_malloc_debug.so.0`이 없으면 조용히 무시됩니다. 통계는 `mallinfo2()`·`malloc_stats()`·`malloc_info()`, 메모리 반환은 `malloc_trim()`, arena 수는 `MALLOC_ARENA_MAX`로 다룹니다.
:::

```text
$ ldd --version | head -1
ldd (Debian GLIBC 2.36-9+deb12u14) 2.36
$ ls /usr/lib/aarch64-linux-gnu/libc_malloc_debug*
/usr/lib/aarch64-linux-gnu/libc_malloc_debug.so
/usr/lib/aarch64-linux-gnu/libc_malloc_debug.so.0
```

## MALLOC_CHECK_ — preload가 없으면 효과 없음

`MALLOC_CHECK_`는 malloc을 덜 효율적인 대신 단순한 실수에 강한 구현으로 바꿉니다. glibc 매뉴얼(`manual/memory.texi`, 2.36)은 4보다 작은 0이 아닌 값을 주면 이 구현이 쓰이고, 같은 인자로 `free`를 두 번 부르거나 한 바이트를 넘겨 쓰는(off-by-one) 오류를 견디도록 설계됐지만 모든 오류를 막지는 못한다고 적습니다. 손상을 찾으면 프로세스를 바로 끝냅니다.

24바이트를 받고 25바이트를 쓴 뒤 `free`하는 `offbyone` 모드를 세 조건으로 돌렸습니다.

```text
$ ./gl offbyone
offbyone: survived
exit=0
$ MALLOC_CHECK_=3 ./gl offbyone
offbyone: survived
exit=0
$ LD_PRELOAD=/usr/lib/aarch64-linux-gnu/libc_malloc_debug.so.0 MALLOC_CHECK_=3 ./gl offbyone
free(): invalid pointer
exit=134
```

`MALLOC_CHECK_=3`만 준 두 번째 실행은 첫 번째와 똑같이 살아남았습니다. 매뉴얼 문장 그대로 "preload 없이 `MALLOC_CHECK_`를 설정하면 효과가 없습니다". 디버그 라이브러리를 preload하자 한 바이트 넘침을 잡고 abort(종료 코드 134)했습니다.

같은 `free`를 두 번 부르는 경우는 조금 다릅니다. 기본 malloc도 이 오류를 잡습니다.

```text
$ ./gl doublefree
free(): double free detected in tcache 2
exit=134
$ LD_PRELOAD=/usr/lib/aarch64-linux-gnu/libc_malloc_debug.so.0 MALLOC_CHECK_=3 ./gl doublefree
free(): invalid pointer
exit=134
```

기본 malloc은 스레드 캐시(tcache)에서 같은 블록이 두 번 들어오는 것을 확인하고 멈췄습니다. 이렇게 기본 경로에도 검사가 일부 있으므로, `MALLOC_CHECK_`가 추가로 잡는 것은 한 바이트 넘침처럼 기본 경로가 지나치는 손상입니다.

매뉴얼은 SUID·SGID 바이너리에서는 `MALLOC_CHECK_`가 기본으로 꺼진다고 적습니다. 표준 오류에 무언가를 쓰는 동작이 공격에 악용될 수 있기 때문입니다. 관리자가 `/etc/suid-debug` 파일(내용은 상관없음)을 만들면 다시 켜집니다.

## MALLOC_PERTURB_ — 새 메모리와 해제한 메모리를 칠하기

`malloc`이 돌려준 메모리는 내용이 정해져 있지 않습니다. 그런데 프로그램 초반에는 새로 받은 메모리가 0인 경우가 많아(아래 첫 실행도 0x00), 초기화를 빠뜨린 코드가 테스트에서는 우연히 0을 읽고 통과합니다. `MALLOC_PERTURB_`는 이 우연을 없앱니다.

매뉴얼의 `M_PERTURB` 항목은 0이 아니면 블록을 할당할 때(`calloc` 제외)와 해제할 때 이 값의 하위 비트에 따른 값으로 채운다고 적고, 해제한 블록이 특정 값을 갖는다는 보장은 하지 않는다고 덧붙입니다. 보장하는 것은 해제 전 내용이 덮어써진다는 점뿐입니다. 소스(`malloc/malloc.c`, 1997~2008행)를 보면 할당 때는 `perturb_byte ^ 0xff`로, 해제 때는 `perturb_byte`로 `memset`합니다.

```text
$ ./gl perturb
fresh byte: 0x00
$ MALLOC_PERTURB_=0xAB ./gl perturb
fresh byte: 0x54
$ MALLOC_PERTURB_=171 ./gl perturb
fresh byte: 0x54
```

171은 0xAB이고, 0xAB ^ 0xFF = 0x54입니다. 그래서 할당 직후 첫 바이트가 0x54로 나왔습니다. 소스대로입니다. `0xAB`처럼 16진수로 준 값도 같은 결과였습니다. 이 기능은 `libc_malloc_debug` 없이 기본 malloc에서 동작합니다.

이 테스트의 `p[0]` 읽기는 결과를 보여 주려고 넣은 것입니다. 실제 버그를 찾을 때는 `MALLOC_PERTURB_`를 켠 채 기존 테스트를 돌리고, 동작이 달라지는 곳을 MSan이나 Valgrind Memcheck로 짚습니다.

## mtrace — 할당·해제 기록

`mtrace()`는 `MALLOC_TRACE`가 가리키는 파일에 모든 할당과 해제를 기록하고, 같은 이름의 Perl 스크립트 `mtrace`가 그 기록에서 해제되지 않은 블록을 찾습니다. Debian에서 스크립트는 `libc-devtools` 패키지에 들어 있습니다.

다음 코드는 두 블록을 잡고, 하나를 `realloc`한 뒤 해제하고, 다른 하나는 해제하지 않습니다.

```c
mtrace();
char *a = malloc(100), *b = malloc(200);
a = realloc(a, 300);
free(a);
(void)b;                                /* b is never freed */
muntrace();
```

preload 없이 돌리면 기록 파일이 아예 생기지 않았습니다. preload하면 이렇게 남습니다.

```text
$ MALLOC_TRACE=/root/mt.log ./gl mtrace
$ ls -la mt.log
ls: cannot access 'mt.log': No such file or directory

$ LD_PRELOAD=/usr/lib/aarch64-linux-gnu/libc_malloc_debug.so.0 MALLOC_TRACE=/root/mt.log ./gl mtrace
$ cat mt.log
= Start
@ ./gl:[0x1050] + 0xaaaae53634a0 0x64
@ ./gl:[0x105c] + 0xaaaae5363510 0xc8
@ ./gl:[0x106c] < 0xaaaae53634a0
@ ./gl:[0x106c] > 0xaaaae53635e0 0x12c
@ ./gl:[0x1078] - 0xaaaae53635e0
= End
```

한 줄이 한 사건입니다. `+`는 할당(주소, 크기 16진수), `-`는 해제, `<`와 `>`는 `realloc`의 이전 블록과 새 블록입니다. `[0x1050]`은 호출한 코드의 주소입니다. 크기 0x64·0xc8·0x12c는 100·200·300바이트입니다.

```text
$ mtrace ./gl mt.log

Memory not freed:
-----------------
           Address     Size     Caller
0x0000aaaae5363510     0xc8  at /root/gl.c:43
exit=1
```

`mtrace` 스크립트는 바이너리의 디버그 정보로 호출 주소를 `gl.c:43`(`malloc(200)` 줄)으로 풀어 줬습니다. `-g` 없이 빌드하면 이 칸이 `at ??:?`로 나오고, 바이너리 인자 없이 `mtrace mt.log`로 돌리면 `at 0x105c`처럼 주소만 남습니다. 해제하지 않은 블록이 있으면 종료 코드가 1이라 스크립트로 검사하기 쉽습니다.

`mtrace`는 기록 파일에 매 호출을 쓰므로 할당이 많은 프로그램에서는 파일 크기와 실행 시간이 크게 늘어납니다. 시작과 끝을 `mtrace()`·`muntrace()`로 좁혀 의심 구간만 기록하는 편이 낫습니다.

## mcheck — 블록 경계 검사

`mcheck()`는 블록 앞뒤에 표식을 두고 `free` 때 그 표식이 망가졌는지 봅니다. 매뉴얼에 따르면 `mcheck()`는 첫 `malloc` 전에 불러야 하고, 너무 늦게 부르면 아무것도 하지 않습니다. 그리고 2.34부터는 이것도 `libc_malloc_debug`를 preload해야 동작합니다.

16바이트를 받고 17번째 바이트에 쓴 뒤 `free`했습니다. 콜백은 받은 상태값을 출력합니다.

```c
static void report(enum mcheck_status st) {
    fprintf(stderr, "mcheck callback: status %d\n", st);
}
...
printf("mcheck() = %d\n", mcheck(report));
char *p = malloc(16);
p[16] = 'X';                            /* write past the end */
free(p);
```

```text
$ ./gl mcheck
mcheck() = -1
mcheck: after free
exit=0

$ LD_PRELOAD=/usr/lib/aarch64-linux-gnu/libc_malloc_debug.so.0 ./gl mcheck
mcheck() = 0
mcheck: after free
mcheck callback: status 3
exit=0

$ LD_PRELOAD=/usr/lib/aarch64-linux-gnu/libc_malloc_debug.so.0 ./gl mchecklate
mcheck() after malloc = -1
```

preload가 없으면 `mcheck()`가 -1을 돌려주고 손상도 잡지 못했습니다. preload하면 0을 돌려주고, `free`에서 콜백이 상태 3으로 불렸습니다. `malloc/mcheck.h`(2.36, 27~34행)의 열거형에서 3은 `MCHECK_TAIL`, 즉 블록 뒤쪽이 덮어써졌다는 뜻입니다. 콜백 줄이 "after free" 뒤에 찍힌 것은 `printf`(stdout, 파이프라 버퍼링됨)와 콜백의 `fprintf(stderr)`가 따로 비워졌기 때문입니다. 콜백 자체는 `free` 안에서 불렸습니다. 첫 `malloc` 뒤에 `mcheck()`를 부른 `mchecklate`는 -1이 나왔습니다.

| `enum mcheck_status` | 값 | 뜻 (`mcheck.h` 주석) |
|----------------------|----|----------------------|
| `MCHECK_DISABLED` | -1 | 검사가 켜져 있지 않음 |
| `MCHECK_OK` | 0 | 블록 정상 |
| `MCHECK_FREE` | 1 | 두 번 해제 |
| `MCHECK_HEAD` | 2 | 블록 앞 메모리 손상 |
| `MCHECK_TAIL` | 3 | 블록 뒤 메모리 손상 |

매뉴얼은 `MALLOC_CHECK_`와 `-lmcheck`가 같은 종류의 버그를 찾도록 돼 있고, `MALLOC_CHECK_`는 다시 컴파일할 필요가 없다는 점이 다르다고 적습니다. 어느 쪽도 범위 밖 *읽기*나 해제 후 사용을 접근 순간에 잡지는 못하므로, 그런 오류에는 [ASan](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)이 맞습니다.

## mallinfo2·malloc_stats·malloc_info — 통계 세 가지

통계 함수는 셋입니다. 차이를 보려고 8개 스레드가 1000바이트 블록 100개씩을 잡고 절반을 해제하게 한 뒤, 메인 스레드가 1 MiB 블록을 하나 잡고 세 함수를 차례로 불렀습니다.

`mallinfo2()`는 glibc 2.33에서 추가됐습니다. 2.33 `NEWS`는 `mallinfo`와 같은 통계를 더 넓은 필드로 돌려준다고 적고, 같은 릴리스에서 `mallinfo`를 deprecated로 표시했습니다. 옛 `mallinfo`는 필드가 `int`라 2 GiB를 넘는 값을 담지 못합니다.

```text
arena=1216512 ordblks=409 hblks=1 hblkhd=1052672 uordblks=424208 fordblks=792304 keepcost=132208
```

| 필드 | 매뉴얼(2.36)의 정의 | 이 실행 |
|------|----------------------|---------|
| `arena` | `sbrk`로 얻은 메모리 총량 | 1,216,512 (arena 9개 × 135,168) |
| `ordblks` | 쓰지 않는 chunk 수 | 409 |
| `hblks` | `mmap`으로 할당한 chunk 수 | 1 (1 MiB 블록) |
| `hblkhd` | `mmap`으로 할당한 바이트 | 1,052,672 |
| `uordblks` | 내준 chunk가 차지한 바이트 | 424,208 |
| `fordblks` | 빈 chunk가 차지한 바이트 | 792,304 |
| `keepcost` | heap 끝의 반환 가능한 맨 위 chunk 크기 | 132,208 |

이 실행에서 `arena`는 이름과 달리 메인 arena만이 아니라 스레드 arena 8개까지 합한 값이었습니다. `uordblks + fordblks` = 1,216,512로 `arena`와 정확히 같습니다. `mmap`으로 받은 1 MiB 블록은 `arena`에 들어가지 않고 `hblkhd`에 따로 잡힙니다.

`malloc_stats()`는 arena별 요약을 표준 오류에 씁니다.

```text
Arena 0:
system bytes     =     135168
in use bytes     =       7072
Arena 1:
system bytes     =     135168
in use bytes     =      52656
...
Arena 8:
system bytes     =     135168
in use bytes     =      52656
Total (incl. mmap):
system bytes     =    2269184
in use bytes     =    1480992
max mmap regions =          1
max mmap bytes   =    1052672
```

`malloc_info(0, stdout)`는 같은 정보를 XML로 더 자세히 냅니다. arena마다 `<heap nr="N">`이 있고, 빈 chunk가 어느 크기 구간에 몇 개 있는지(`<sizes>`)까지 나옵니다.

```text
<malloc version="1">
<heap nr="0">
...
</heap>
<heap nr="1">
<sizes>
  <unsorted from="1009" to="1665" total="51106" count="50"/>
</sizes>
<total type="fast" count="0" size="0"/>
<total type="rest" count="51" size="82562"/>
<system type="current" size="135168"/>
...
</heap>
...
<total type="mmap" count="1" size="1052672"/>
<system type="current" size="1216512"/>
...
</malloc>
```

스레드마다 해제한 50개 블록이 `unsorted` 50개로 보입니다. 기계가 읽기 좋은 형식이라 주기적으로 수집해 단편화 추세를 보기에 알맞습니다.

## arena 수와 MALLOC_ARENA_MAX

arena는 malloc이 스레드 경합을 줄이려고 나눠 둔 별도의 힙입니다. 계산대가 여러 개인 마트를 떠올리면 됩니다. 계산대가 많으면 줄은 짧아지지만, 계산대마다 잔돈(빈 chunk)을 따로 쥐고 있어 전체 보유량이 늘어납니다.

glibc tunables 매뉴얼(`manual/tunables.texi`, 2.36)은 `glibc.malloc.arena_max`의 기본값 0이 "CPU 코어 수로 한도를 정한다"는 뜻이고, 64비트에서는 온라인 코어 수의 8배, 32비트에서는 2배라고 적습니다. 이 VM(4코어)의 한도는 32개입니다. 위 실험에서 8개 스레드가 동시에 할당하자 메인 arena를 포함해 9개가 생긴 것은 한도 안에서 스레드마다 arena가 하나씩 붙었기 때문입니다.

한도를 2로 줄이면 arena가 둘만 생깁니다. 환경 변수와 tunable 두 방식 모두 결과가 같았습니다.

```text
$ MALLOC_ARENA_MAX=2 ./gl stats | grep -c "^Arena"
2
$ GLIBC_TUNABLES=glibc.malloc.arena_max=2 ./gl stats | grep -c "^Arena"
2
```

매뉴얼상 `glibc.malloc.arena_max` tunable은 `MALLOC_ARENA_MAX` 환경 변수를 대체하고, 기능은 같습니다. arena를 줄이면 보유 메모리는 줄지만 같은 arena를 쓰는 스레드끼리 락을 다투게 됩니다. 어느 쪽이 나은지는 실제 서비스의 RSS와 지연을 함께 재서 정합니다.

## mmap 임계값은 움직인다

큰 요청은 heap이 아니라 별도 `mmap`으로 처리됩니다. 매뉴얼의 `M_MMAP_THRESHOLD` 항목은 이 값을 따로 설정하지 않으면 기본 128 KiB에서 시작해 프로그램의 할당 패턴에 맞춰 동적으로 조정되고, 설정하면 동적 조정이 꺼진다고 적습니다. 그 조정이 어떻게 일어나는지는 소스에 있습니다. `free()`(`malloc.c`, 3364~3371행)는 `mmap`으로 받은 chunk를 해제할 때, 그 크기가 현재 임계값보다 크고 `DEFAULT_MMAP_THRESHOLD_MAX`(64비트에서 4 MiB × `sizeof(long)` = 32 MiB, 970~972행) 이하면 임계값을 그 크기로 올리고 trim 임계값을 그 두 배로 맞춥니다.

1 MiB 블록을 받았다 해제하기를 두 번 반복하면 이 동작이 보입니다.

```text
$ ./gl mmapthr
round 0: 1 MiB block at 0xffff8da7f010
round 1: 1 MiB block at 0xaaaace79c2b0
Arena 0:
system bytes     =    1187840
...
max mmap regions =          1
max mmap bytes   =    1052672
```

첫 블록은 `0xffff...` 쪽 `mmap` 영역에 생겼고, 해제하면서 임계값이 1 MiB 남짓으로 올라갔습니다. 그래서 두 번째 1 MiB 요청은 `0xaaaa...` 쪽 heap에서 나왔고, arena 0의 `system bytes`가 1,187,840으로 커졌습니다. 같은 크기의 큰 버퍼를 반복해서 잡고 놓는 서비스는 이 동작 때문에 처음 한 번 뒤로는 heap이 커진 채로 남습니다.

`mallopt(M_MMAP_THRESHOLD, 값)`이나 `MALLOC_MMAP_THRESHOLD_` 환경 변수로 값을 고정하면 이 동적 조정이 꺼집니다.

## malloc_trim — 쓰지 않는 페이지를 돌려주기

`free`한다고 메모리가 바로 운영체제로 돌아가지는 않습니다. heap 맨 위의 빈 공간만 `brk`를 줄여 돌려줄 수 있는데, 맨 위에 살아 있는 블록이 하나라도 있으면 그 아래가 다 비어도 줄일 수 없습니다. `malloc_trim()`은 여기서 한 걸음 더 갑니다. `man 3 malloc_trim`(man-pages 6.03)은 이 함수가 `sbrk(2)`나 `madvise(2)`로 빈 메모리를 돌려준다고 적고, 소스의 `mtrim()`(`malloc.c`, 5035~5075행)은 각 bin의 빈 chunk 안에서 한 페이지 이상 통째로 빈 구간을 찾아 `MADV_DONTNEED`로 돌려줍니다.

512바이트 블록 20만 개를 잡은 뒤 마지막 하나만 남기고 모두 해제하고, 그다음 `malloc_trim(0)`을 불렀습니다.

```text
$ ./gl trim
after malloc:   VmRSS 105272 kB
after free:     VmRSS 105272 kB
malloc_trim(0) = 1
after trim:     VmRSS 2760 kB
```

해제 직후에도 RSS는 105,272 kB 그대로였습니다. 마지막 블록이 heap 꼭대기를 막고 있어 자동 trim이 일어나지 않았기 때문입니다. `malloc_trim(0)`은 1(무언가 돌려줌)을 돌려주고 RSS를 2,760 kB로 줄였습니다. 반대로 살아 있는 작은 블록이 페이지마다 하나씩 흩어져 있으면 통째로 빈 페이지가 없어 `malloc_trim`도 돌려줄 것이 없습니다.

## tcache — 스레드 캐시

glibc 2.26 `NEWS`는 malloc에 스레드별 캐시가 추가됐고, 락 없이 접근하므로 작은 할당의 빠른 경로가 크게 빨라진다고 적습니다. 위 `doublefree` 실행의 "double free detected in tcache 2"가 이 캐시가 내는 메시지입니다.

tunables 매뉴얼(2.36)의 두 항목은 다음과 같습니다. `glibc.malloc.tcache_max`는 스레드 캐시로 처리할 수 있는 요청의 최대 크기이고 64비트 기본값(이자 최댓값)은 1032바이트입니다. `glibc.malloc.tcache_count`는 크기별로 캐시할 chunk 수이고 기본값은 7, 상한은 65535, 0으로 두면 캐시가 사실상 꺼집니다.

```bash
GLIBC_TUNABLES=glibc.malloc.tcache_count=0 ./myprog     # tcache 사실상 끄기
```

`ld.so --list-tunables`로 이 glibc가 받는 malloc tunable을 모두 볼 수 있습니다.

```text
$ /lib/aarch64-linux-gnu/ld-linux-aarch64.so.1 --list-tunables | grep malloc
glibc.malloc.trim_threshold: 0x0 (min: 0x0, max: 0xffffffffffffffff)
glibc.malloc.perturb: 0 (min: 0, max: 255)
...
glibc.malloc.arena_max: 0x0 (min: 0x1, max: 0xffffffffffffffff)
glibc.malloc.mmap_threshold: 0x0 (min: 0x0, max: 0xffffffffffffffff)
glibc.malloc.tcache_count: 0x0 (min: 0x0, max: 0xffffffffffffffff)
...
glibc.malloc.tcache_max: 0x0 (min: 0x0, max: 0xffffffffffffffff)
glibc.malloc.check: 0 (min: 0, max: 3)
```

## __malloc_hook은 없어졌다

옛 자료에는 `__malloc_hook`으로 할당을 가로채는 예제가 많습니다. 2.34 `NEWS`에 따르면 `__malloc_hook`·`__realloc_hook`·`__memalign_hook`·`__free_hook`은 API에서 빠졌습니다. 옛 프로그램을 위한 호환 심볼만 남아 있어 새 프로그램은 링크할 수 없고, 남은 심볼도 glibc 동작에 영향을 주지 않습니다. `libc_malloc_debug.so`가 당분간 hook을 지원하지만 과도기 조치라 나중에 없어질 수 있습니다. 그래서 `NEWS`는 hook 대신 malloc interposition 라이브러리를 직접 만들어 preload하라고 안내합니다. [Ch 2](/blog/tools/debugging/memory/chapter02-heaptrack)의 heaptrack이 바로 그런 interposition 라이브러리입니다.

## 운영에서 mallinfo2 내보내기

서비스가 주기적으로 `mallinfo2()`를 읽어 지표로 내보내면, RSS와 나란히 놓고 "앱이 쓰는 양"과 "allocator가 쥔 양"을 구분할 수 있습니다. 다음은 Prometheus 텍스트 형식으로 세 값을 쓰는 C 함수입니다.

```c
#include <malloc.h>
#include <stdio.h>

void write_malloc_metrics(FILE *out) {
    struct mallinfo2 mi = mallinfo2();
    fprintf(out, "app_heap_in_use_bytes %zu\n", mi.uordblks);
    fprintf(out, "app_heap_free_bytes %zu\n", mi.fordblks);
    fprintf(out, "app_heap_mmap_bytes %zu\n", mi.hblkhd);
}
```

`app_heap_free_bytes`가 계속 크고 `malloc_trim()`으로 RSS가 줄어든다면 누수가 아니라 allocator 보유분입니다. 반대로 `app_heap_in_use_bytes`가 같은 부하에서 계속 오른다면 [Ch 5](/blog/tools/debugging/memory/chapter05-prod-leak-diagnosis)의 누수 진단으로 넘어갑니다. `man 3 mallinfo`의 ATTRIBUTES 표는 `mallinfo2()`를 MT-Unsafe(`init const:mallopt`)로 표시합니다. 그래서 요청 경로가 아니라 별도 주기로 한 스레드에서 부르는 편이 안전합니다.

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| `MALLOC_CHECK_`를 줘도 아무 변화 없음 | glibc 2.34 이후 `libc_malloc_debug.so` preload가 필요 |
| `MALLOC_TRACE` 파일이 안 생김 | 같은 이유. 또는 `mtrace()` 호출이 없음 |
| `mcheck()`가 -1 | preload 없음, 또는 첫 `malloc` 뒤에 호출 |
| SUID 바이너리에서 `MALLOC_CHECK_` 무시 | 보안상 기본 꺼짐. `/etc/suid-debug`로 켬 |
| mtrace 출력에 `??:?`나 주소만 | 디버그 정보 없이 빌드, 또는 바이너리 인자 생략 |
| `mallinfo` 값이 음수(2 GiB 초과) | `int` 필드. `mallinfo2`를 씀 |
| `free` 후에도 RSS가 그대로 | heap 꼭대기를 살아 있는 블록이 막음. `malloc_trim(0)` |
| 큰 버퍼가 두 번째부터 heap에 생김 | 동적 mmap 임계값 상승. 값을 고정하면 꺼짐 |
| arena가 스레드 수만큼 늘어남 | 64비트 한도는 코어 수의 8배. `MALLOC_ARENA_MAX`로 줄임 |

## 정리

- glibc 2.34부터 `MALLOC_CHECK_`·`mtrace()`·`mcheck()`는 `libc_malloc_debug.so`를 preload해야 동작합니다. 없으면 조용히 무시됩니다.
- `MALLOC_CHECK_`는 기본 malloc이 놓치는 한 바이트 넘침을 잡았고, double free는 기본 tcache도 잡았습니다.
- `MALLOC_PERTURB_`는 할당 때 `값 ^ 0xff`, 해제 때 `값`으로 칠합니다. preload 없이 동작합니다.
- `mtrace` 스크립트는 기록에서 해제되지 않은 블록과 호출 줄을 찾고, 남은 블록이 있으면 1로 끝납니다.
- `mallinfo2()`·`malloc_stats()`·`malloc_info()`는 전체 합, arena별 요약, 크기 구간별 XML을 줍니다.
- mmap 임계값은 큰 블록을 해제할 때마다 올라갈 수 있고, `malloc_trim(0)`은 빈 페이지를 `MADV_DONTNEED`로 돌려줍니다.
- 64비트의 arena 한도는 코어 수의 8배이고 `MALLOC_ARENA_MAX`나 `glibc.malloc.arena_max`로 줄입니다.

## 다음 장 예고

Ch 5에서는 지금까지의 도구를 운영 환경에 맞춰 조합합니다. PSS 추세, cgroup `memory.max`·`memory.events`, PSI, 그리고 BCC `memleak`과 jemalloc dump를 실제 누수 프로그램에 적용합니다.

## 관련 항목

- [Ch 3: jemalloc / tcmalloc](/blog/tools/debugging/memory/chapter03-jemalloc-tcmalloc)
- [Ch 5: 운영 누수 진단](/blog/tools/debugging/memory/chapter05-prod-leak-diagnosis)
- [Sanitizers Ch 2: ASan·UBSan](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)
- [Valgrind Ch 2: Memcheck](/blog/tools/debugging/valgrind/chapter02-memcheck)
- `man 3 malloc_hook`, `man 3 mtrace`, `man 3 mcheck`, `man 3 mallinfo`, `man 3 malloc_trim`
- `man 1 mtrace`
- [glibc 2.36 `manual/memory.texi`](https://sourceware.org/git/?p=glibc.git;a=blob;f=manual/memory.texi;hb=refs/tags/glibc-2.36) — MALLOC_CHECK_, mcheck, mtrace, mallopt, mallinfo2
- [glibc 2.36 `manual/tunables.texi`](https://sourceware.org/git/?p=glibc.git;a=blob;f=manual/tunables.texi;hb=refs/tags/glibc-2.36) — arena_max, tcache_max, tcache_count
- [glibc 2.36 `NEWS`](https://sourceware.org/git/?p=glibc.git;a=blob;f=NEWS;hb=refs/tags/glibc-2.36) — 2.26 tcache, 2.33 mallinfo2, 2.34 libc_malloc_debug
- [glibc malloc tunables](https://www.gnu.org/software/libc/manual/html_node/Memory-Allocation-Tunables.html)
- [glibc malloc debugging and tracing](https://sourceware.org/glibc/manual/latest/html_node/Heap-Consistency-Checking.html)
- [glibc memory tracing](https://sourceware.org/glibc/manual/latest/html_node/Tracing-malloc.html)
