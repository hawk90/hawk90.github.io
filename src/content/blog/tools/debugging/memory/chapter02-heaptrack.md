---
title: "heaptrack 분석 — 가벼운 heap profiler 활용"
slug: "tools/debugging/memory/chapter02-heaptrack"
date: 2026-05-31T09:02:00
description: "heaptrack 1.4.0으로 누수가 있는 C++ 프로그램을 추적하고 heaptrack_print의 네 섹션, attach, diff, 정적 바이너리 한계를 실제 실행 결과로 읽습니다."
tags: [memory, heaptrack, profiler, kde]
series: "Memory Diagnostics"
seriesOrder: 2
draft: false
topics: ["tools", "tools/debugging"]
---

[Ch 1](/blog/tools/debugging/memory/chapter01-memory-accounting)에서는 `/proc`으로 "어느 매핑이 큰가"까지 좁혔습니다. 그다음 질문은 "그 메모리를 어느 코드가 할당했나"입니다. 이 질문에는 콜스택이 필요하고, 그 콜스택을 가장 가볍게 모아 주는 도구 중 하나가 KDE의 **heaptrack**입니다.

heaptrack은 `LD_PRELOAD`로 `malloc`·`free` 계열 함수를 가로채 호출마다 콜스택을 기록합니다. 분석은 기록이 끝난 뒤 `heaptrack_print`나 `heaptrack_gui`가 합니다. 이 장에서는 누수를 일부러 심은 작은 C++ 프로그램을 heaptrack 1.4.0으로 추적하면서 출력을 한 섹션씩 읽습니다.

:::tldr
`heaptrack ./prog` → `heaptrack.prog.<pid>.zst` 생성 → `heaptrack_print`로 읽습니다. 누수 목록은 기본 출력에 없고 `--print-leaks 1`을 줘야 나옵니다. 정적 바이너리는 추적되지 않습니다.
:::

## 실험 환경과 대상 프로그램

출력은 모두 [Ch 1](/blog/tools/debugging/memory/chapter01-memory-accounting)과 같은 Debian 12.15 arm64 VM(QEMU HVF, 커널 `6.1.0-56-arm64`)에서 얻었습니다. Debian 12의 heaptrack 패키지는 1.4.0이고, 소스 인용도 heaptrack `v1.4.0` 태그 기준입니다.

```text
$ heaptrack --version
heaptrack 1.4.0
```

설치는 `apt install heaptrack`입니다. GUI는 `heaptrack-gui`라는 별도 패키지(같은 1.4.0-2)로 나뉘어 있어, 서버에는 CLI만 깔고 기록 파일을 데스크톱으로 가져와 GUI로 열 수도 있습니다. README는 임베디드 장치나 오래된 배포판에서는 `heaptrack`만 빌드하고, 데이터는 GUI 의존성이 있는 다른 머신에서 분석하라고 안내합니다.

대상 프로그램은 요청 처리 루프를 흉내 냅니다. 세 가지 할당 패턴을 섞었습니다. `parse_request()`는 문자열을 이어 붙이며 짧게 쓰고 버리는 할당을 만듭니다. `cache_add()`는 최근 1000개 키만 유지하는 정상 캐시입니다. `open_session()`은 짝수 id만 `delete`하는 진짜 누수입니다.

```cpp
// server.cpp (발췌)
struct Session { char buf[4096]; };

static std::map<int, std::string> g_cache;          // bounded cache: keeps last 1000 keys

std::string parse_request(int id) {
    std::string s = "GET /item/";                    // temporary allocations
    s += std::to_string(id);
    s += " HTTP/1.1 with a long enough header to leave SSO";
    return s;
}

void cache_add(int id, const std::string& req) {
    g_cache[id % 1000] = req;
}

Session* open_session(int id) {
    Session* s = new Session;                        // leaked on purpose for odd ids
    std::snprintf(s->buf, sizeof s->buf, "session %d", id);
    return s;
}

void handle_connection(int id) {
    std::string req = parse_request(id);
    cache_add(id, req);
    Session* s = open_session(id);
    if (id % 2 == 0) delete s;                       // bug: odd ids never freed
}
```

`g++ -O1 -g`로 빌드했습니다. `-g`가 없으면 콜스택에 파일·줄 번호가 나오지 않습니다.

## 기록 — heaptrack ./server

실행은 프로그램 앞에 `heaptrack`을 붙이기만 하면 됩니다.

```text
$ heaptrack ./server 20000
heaptrack output will be written to "/root/heaptrack.server.983.zst"
/usr/lib/heaptrack/libheaptrack_preload.so
starting application, this might take some time...
handled 20000
heaptrack stats:
	allocations:          	43002
	leaked allocations:   	10001
	temporary allocations:	10000
Heaptrack finished! Now run the following to investigate the data:

  heaptrack --analyze "/root/heaptrack.server.983.zst"
```

출력 파일 이름은 `heaptrack.<프로그램>.<pid>.<압축 확장자>`인데, 여기서 pid는 대상 프로그램이 아니라 heaptrack 스크립트 자신의 `$$`입니다(`heaptrack.sh.cmake` 197행). 그래서 아래 attach 예에서는 대상 pid가 1419인데 파일 이름은 1421입니다. 확장자는 실행 시점에 정해집니다. `src/track/heaptrack.sh.cmake`(v1.4.0, 257~265행)는 기본값을 `gz`로 두고, heaptrack이 zstd 지원으로 빌드됐고 `zstd` 명령이 PATH에 있을 때만 `zst`로 바꿉니다. 이 VM에는 `/usr/bin/zstd`가 있어 `.zst`가 나왔습니다. 다른 이름을 원하면 `-o`로 지정하고, `%h`(호스트 이름)와 `%p`(pid)를 쓸 수 있습니다.

`leaked allocations` 10001은 짝수만 지운 `Session` 10000개에 stdout 버퍼 하나가 더해진 값입니다. 캐시 문자열은 누수로 잡히지 않았습니다. `g_cache`가 정적 객체라 프로그램 종료 때 소멸자가 모두 해제하기 때문입니다.

## heaptrack_print — 네 섹션 읽기

`heaptrack_print`는 기록 파일을 읽어 텍스트 보고서를 냅니다. README(v1.4.0)에 따르면 기본 보고서는 `MOST CALLS TO ALLOCATION FUNCTIONS`, `PEAK MEMORY CONSUMERS`, `MOST TEMPORARY ALLOCATIONS` 세 섹션이고, 섹션마다 상위 10곳을 보여 줍니다. 누수 섹션 `MEMORY LEAKS`는 `--print-leaks`의 기본값이 `false`라(`heaptrack_print.cpp` 575행) 따로 켜야 합니다.

첫 섹션은 할당 함수 호출 횟수 순입니다.

```text
$ heaptrack_print heaptrack.server.983.zst
...
MOST CALLS TO ALLOCATION FUNCTIONS
20000 calls to allocation functions with 40.96M peak consumption from
open_session(int)
  at /root/server.cpp:25
  in /root/server
20000 calls with 40.96M peak consumption from:
    handle_connection(int)
      at /root/server.cpp:33
      in /root/server
    main
      at /root/server.cpp:41
      in /root/server

20000 calls to allocation functions with 0B peak consumption from
std::__cxx11::basic_string<>::_M_mutate(unsigned long, unsigned long, char const*, unsigned long)
  in /lib/aarch64-linux-gnu/libstdc++.so.6
20000 calls with 0B peak consumption from:
    ...
    parse_request[abi:cxx11](int)
      at /root/server.cpp:16
    ...
```

같은 2만 번이라도 무게가 전혀 다릅니다. `open_session()`은 최고 40.96M를 붙잡았고, `parse_request()` 안의 문자열 확장은 최고 사용량에 전혀 기여하지 않았습니다(0B). 호출 횟수만 보면 둘이 같은 문제처럼 보이므로, 이 섹션은 "할당이 잦은 곳", 즉 CPU 비용 쪽 후보를 찾는 데 씁니다.

두 번째 섹션은 최고 사용량 순입니다.

```text
PEAK MEMORY CONSUMERS
40.96M peak memory consumed over 20000 calls from
open_session(int)
  at /root/server.cpp:25
  in /root/server
...
122.78K peak memory consumed over 2000 calls from
std::__cxx11::basic_string<>::_M_assign(std::__cxx11::basic_string<> const&)
  in /lib/aarch64-linux-gnu/libstdc++.so.6
122.78K consumed over 2000 calls from:
    ...
    cache_add(int, std::__cxx11::basic_string<> const&)
```

캐시는 2000번 할당해 최고 122.78K에 머물렀습니다. 상한이 있는 캐시는 이렇게 호출 수가 늘어도 최고값이 작습니다.

세 번째 섹션의 "temporary"는 이름만 보고 짐작하면 틀리기 쉽습니다. `src/interpret/heaptrack_interpret.cpp`(v1.4.0, 492~493행)는 `free`된 포인터가 바로 직전 할당의 포인터와 같을 때만 temporary로 셉니다. 비교용 값은 `free`가 올 때마다 지워지므로, 그 사이에 다른 할당이나 해제가 하나라도 끼면 temporary가 아닙니다.

```text
MOST TEMPORARY ALLOCATIONS
10000 temporary allocations of 20000 allocations in total (50.00%) from
open_session(int)
  at /root/server.cpp:25
  in /root/server
...
```

그래서 짝수 id에서 `new` 직후 바로 `delete`한 `Session` 1만 개가 temporary로 잡혔습니다. 정작 "쓰고 버리는" 문자열을 만드는 `parse_request()`는 그 사이에 다음 할당(`cache_add`, `open_session`)이 끼어들어 temporary로 잡히지 않습니다. 이 섹션은 "할당 직후 해제하는 곳"을 찾아 스택 버퍼나 재사용으로 바꿀 후보를 보여 줍니다.

마지막으로 누수 섹션을 켭니다.

```text
$ heaptrack_print --print-leaks 1 --print-peaks 0 --print-allocators 0 --print-temporary 0 heaptrack.server.983.zst
...
MEMORY LEAKS
40.96M leaked over 20000 calls from
open_session(int)
  at /root/server.cpp:25
  in /root/server
...
4.10K leaked over 1 calls from
__GI__IO_file_doallocate
  at ./libio/filedoalloc.c:101
  in /lib/aarch64-linux-gnu/libc.so.6
...

total runtime: 0.12s.
calls to allocation functions: 43002 (352475/s)
temporary memory allocations: 10001 (81975/s)
peak heap memory consumption: 41.23M
peak RSS (including heaptrack overhead): 44.90M
total memory leaked: 40.96M
```

"40.96M leaked over 20000 calls"의 20000은 그 위치의 호출 전체이지, 새어 나간 블록 수가 아닙니다. 실제로 남은 블록은 홀수 id 1만 개(4096 B × 10000 = 40.96M)입니다. 두 번째 항목은 `printf`가 처음 쓸 때 잡은 stdout 버퍼 4.10K입니다. 종료 시점에 해제되지 않았다는 점은 같지만 프로세스 수명 동안 하나만 쓰는 버퍼라 고칠 대상이 아닙니다. `MEMORY LEAKS`는 종료 시점에 남은 블록의 목록이고, 그중 무엇이 버그인지는 코드를 보고 가립니다.

보고서 끝 요약의 `peak RSS (including heaptrack overhead)`는 heaptrack 자신의 메모리까지 포함한 값이라 힙 최고치(41.23M)와 따로 표시됩니다.

## heaptrack_gui

GUI는 같은 파일을 열어 보여 줍니다. README가 꼽는 기능은 요약 페이지, bottom-up·top-down 트리, flame graph, 시간에 따른 할당 비용 그래프입니다. 1.4.0의 `mainwindow.ui`에 정의된 탭 이름은 Summary, Bottom-Up, Caller / Callee, Top-Down, Flame Graph입니다. 이 장의 VM에는 GUI를 설치하지 않았으므로 화면은 싣지 않습니다.

`heaptrack --analyze <파일>`은 `heaptrack_gui`가 있으면 GUI를, 없으면 `heaptrack_print`를 엽니다(`heaptrack.sh.cmake`의 usage 문구).

## Massif·Memcheck와 비용 비교

heaptrack README(v1.4.0)는 Massif와 비교한 장점으로 두 가지를 듭니다. 멀티스레드 프로그램을 직렬화하지 않고, 할당할 때만 비용을 내므로 CPU 계산 구간은 느려지지 않습니다. 또 Massif가 보고서를 쓰기 전에 데이터를 집계해 버리는 것과 달리, heaptrack은 원시 기록을 남겨 할당 횟수와 temporary 할당 위치까지 분석할 수 있습니다. 반대로 Massif만 되는 일도 적혀 있습니다. 페이지 할당을 heap처럼 프로파일할 수 있어 `malloc`을 우회하는 풀 allocator도 잡고, 스택 할당도 프로파일합니다.

같은 `server`를 20만 요청으로 돌려 VM에서 시간과 최대 RSS를 쟀습니다(`/usr/bin/time`, 두 번 실행).

| 실행 | 1회차 | 2회차 | 최대 RSS (1회차) |
|------|-------|-------|------------------|
| 그냥 실행 | 0.13 s | 0.08 s | 404,568 KB |
| heaptrack | 0.32 s | 0.30 s | 405,684 KB |
| Valgrind Massif 3.19 | 0.63 s | 0.62 s | 449,960 KB |
| Valgrind Memcheck 3.19 (`--leak-check=no`) | 1.44 s | 1.39 s | 603,692 KB |

이 프로그램은 거의 할당만 하는 루프라 heaptrack에 가장 불리한 경우입니다. 그래도 Massif의 절반, Memcheck의 1/4에 못 미치는(약 22%) 시간이 걸렸습니다. 실행 시간이 0.1초 단위인 VM 데모라 배율을 다른 프로그램에 그대로 옮길 수는 없습니다. 계산이 많은 프로그램일수록 heaptrack의 상대 비용은 작아지고, Valgrind는 모든 명령을 계측하므로 그대로 무겁습니다. 이 실행의 heaptrack 기록 파일은 50만 3천 번 할당에 9,017 바이트였습니다.

## 실행 중인 프로세스에 붙이기 — heaptrack -p

이미 떠 있는 프로세스에는 `-p`로 붙습니다. heaptrack은 GDB로 프로세스를 멈추고 `libheaptrack_inject.so`를 `dlopen`시킨 뒤 분리합니다. usage 문구가 직접 경고합니다.

```text
  -p, --pid PID  The process ID of a running process into which
                 heaptrack will be injected. This only works with
                 applications that already link against libdl.
  WARNING: Runtime-attaching heaptrack is UNSTABLE and can lead to CRASHES
           in your application, especially after you detach heaptrack again.
           You are hereby warned, use it at your own risk!
```

비유하면 달리는 차에 정비사를 태우는 일입니다. 차를 세우고(GDB attach) 사람을 태운 뒤(inject) 다시 출발시키는데, 태우고 내리는 순간이 가장 위험합니다. 그래서 운영 프로세스보다 재현 환경에서 먼저 써 봅니다.

요청 하나마다 2 ms씩 쉬며 6000개를 처리하는 `server`를 띄우고 2초 뒤에 붙였습니다.

```text
$ heaptrack -p 1419

heaptrack output will be written to "/root/heaptrack.server.1421.zst"
/usr/lib/heaptrack/libheaptrack_preload.so
injecting heaptrack into application via GDB, this might take some time...
48	../sysdeps/unix/sysv/linux/clock_nanosleep.c: No such file or directory.
injection finished
heaptrack stats:
	allocations:          	11673
	leaked allocations:   	3753
	temporary allocations:	2584
removing heaptrack injection via GDB, this might take some time...
ptrace: No such process.
...
```

할당 수는 1만 1673입니다. 처음부터 기록했다면 2만 요청에 43,002였으니 6000요청이면 약 1만 2900이어야 하는데, 그보다 적습니다. 붙기 전의 할당은 보지 못하기 때문입니다. attach 전에 할당된 포인터의 `free`는 `heaptrack_interpret`가 짝을 찾지 못해 버립니다(`heaptrack_interpret.cpp`, 494~497행). 이 실행에서는 프로세스가 먼저 끝나 분리 단계가 `ptrace: No such process`로 끝났지만 기록 파일은 정상이었습니다. Debian 12 VM의 `kernel.yama.ptrace_scope`는 0이었습니다. 이 값이 0보다 크면 heaptrack은 "Cannot runtime-attach, you need to set /proc/sys/kernel/yama/ptrace_scope to 0"을 출력하고 멈춥니다(`heaptrack.sh.cmake` 126~127행).

## 두 기록 비교 — heaptrack_print -d

수정 전후를 비교하는 기능이 `heaptrack_print`에 있습니다(`--diff`, `-d`). 누수를 고친 `server-fixed`(`delete s;`를 무조건 실행)를 같은 입력으로 기록해 비교했습니다.

```text
$ heaptrack_print -d heaptrack.server.983.zst ht-fixed.zst
...
-20000 calls to allocation functions with -40.96M peak consumption from
open_session(int)
  at /root/server.cpp:25
  in /root/server
...
peak heap memory consumption: -40.96M
total memory leaked: -40.96M
```

누수 40.96M가 사라진 것이 바로 보입니다. 다만 이번에는 바이너리 이름이 달라(`server`와 `server-fixed`) 같은 `open_session()`이 서로 다른 위치로 취급돼, 출력에 `server-fixed.cpp:25`의 20000 항목과 `server.cpp:25`의 -20000 항목이 따로 나왔습니다. 비교할 때는 같은 경로·이름으로 빌드한 바이너리를 쓰는 편이 읽기 쉽습니다.

## 원시 기록만 남기기 — --raw

기본 동작에서 heaptrack은 기록과 해석을 동시에 합니다. 프리로드 라이브러리가 FIFO로 보내는 원시 데이터를 `heaptrack_interpret`가 받아 심볼을 풀고 압축합니다(`heaptrack.sh.cmake` 273~276행). 심볼 해석이 부담스러운 작은 장치에서는 `-r`(`--raw`)로 원시 데이터만 남기고, 해석은 나중에 다른 머신에서 할 수 있습니다. 1.4.0의 기록 쪽 옵션은 `-r`, `-d`(GDB 안에서 실행), `--use-inject`, `-o`뿐이고 `--record-only`라는 옵션은 없습니다.

## 동작 원리와 한계

`heaptrack.sh.cmake`(322행)는 `LD_PRELOAD`에 `libheaptrack_preload.so`를 넣고 프로그램을 실행합니다. 프리로드 라이브러리(`heaptrack_preload.cpp`, 171~192행)는 `malloc`, `free`, `calloc`, `realloc`, `posix_memalign`, `aligned_alloc`, `valloc`, `dlopen`·`dlclose`, mimalloc의 `mi_*` 함수까지 가로챕니다. 콜스택은 Debian 패키지에서 libunwind로 풉니다(`libheaptrack_preload.so`가 `libunwind.so.8`에 링크돼 있습니다).

이 구조에서 한계가 그대로 나옵니다.

- **정적 바이너리는 안 됩니다.** `LD_PRELOAD`는 동적 로더가 처리하므로 정적 링크 바이너리에는 적용되지 않습니다. VM에서 `g++ -static`으로 빌드한 `server-static`을 heaptrack으로 돌리자 프로그램은 `handled 2000`을 출력하고 끝났지만 heaptrack 스크립트는 FIFO에 아무도 쓰지 않아 기다리기만 했습니다. 직접 끊은 뒤 남은 파일은 13바이트였고, `heaptrack_print`로 읽으면 할당이 0건(`calls to allocation functions: 0`)이었습니다.
- **풀 allocator 내부는 안 보입니다.** README는 `malloc`을 우회하는 메모리 풀은 풀 구현에 주석(annotation)을 다는 코드 수정이 있어야 프로파일할 수 있다고 적습니다. heaptrack이 보는 것은 풀이 시스템에서 큰 덩어리를 받아 가는 순간뿐입니다.
- **gold 링커로 링크하면 backtrace가 틀릴 수 있습니다.** README는 오래된 gold 링커로 링크한 코드에서 libunwind가 엉뚱한 backtrace를 낼 수 있고, 그럴 때는 `ld.bfd`로 다시 링크하라고 적습니다.

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| 기본 출력에 누수 목록이 없음 | `--print-leaks` 기본값이 `false`. `--print-leaks 1`을 줌 |
| temporary가 예상과 다른 곳에 잡힘 | 직전 할당을 바로 `free`한 경우만 temporary로 셈 |
| 콜스택에 파일·줄 번호 없음 | `-g` 없이 빌드했거나 디버그 심볼이 없음 |
| `-p`가 "Cannot runtime-attach"로 멈춤 | `kernel.yama.ptrace_scope`가 0보다 큼 |
| attach 기록의 할당 수가 적음 | attach 전 할당은 기록되지 않음 |
| 정적 바이너리에서 heaptrack이 끝나지 않고 기록이 0건 | `LD_PRELOAD`가 적용되지 않음. 동적 링크로 다시 빌드 |
| diff 결과가 같은 함수를 둘로 나눔 | 두 기록의 바이너리 경로가 다름 |
| 파일 확장자가 `.gz`/`.zst`로 다름 | 빌드의 zstd 지원과 `zstd` 명령 유무로 결정 |

## 도구를 어떻게 이어 쓰나

heaptrack은 "어느 콜스택이 메모리를 붙잡고 있나"에 빠르게 답합니다. 메모리가 풀 allocator 안에 있거나 스택 사용량이 궁금하면 Massif로 넘어갑니다. 해제 후 사용이나 범위 밖 쓰기처럼 메모리 *오류*를 찾을 때는 heaptrack이 아니라 [ASan](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)이나 Memcheck가 맞는 도구입니다. heaptrack은 할당과 해제만 보지, 메모리 접근은 보지 않기 때문입니다.

## 정리

- heaptrack은 `LD_PRELOAD`로 할당 함수를 가로채고 libunwind로 콜스택을 기록합니다. Debian 12의 버전은 1.4.0입니다.
- 출력 파일 확장자는 zstd 지원과 `zstd` 명령이 있으면 `.zst`, 아니면 `.gz`입니다.
- `heaptrack_print`의 기본 세 섹션은 호출 수, 최고 사용량, temporary입니다. 누수는 `--print-leaks 1`로 켭니다.
- temporary는 직전 할당을 바로 해제한 경우만 셉니다.
- VM 데모에서 할당 위주 프로그램의 시간은 heaptrack 0.3초, Massif 0.6초, Memcheck 1.4초였습니다.
- `-p` attach는 GDB 주입 방식이고 usage가 직접 불안정하다고 경고합니다. attach 전 할당은 보이지 않습니다.
- `-d`로 두 기록을 비교하고, `-r`로 원시 기록만 남길 수 있습니다. 정적 바이너리는 추적되지 않습니다.

## 다음 장 예고

Ch 3에서는 allocator 자체에 들어 있는 진단 기능을 봅니다. jemalloc의 `MALLOC_CONF`·`stats_print`·heap profile과 gperftools TCMalloc의 heap profiler를 같은 프로그램에 적용합니다.

## 관련 항목

- [Ch 1: 메모리 회계](/blog/tools/debugging/memory/chapter01-memory-accounting)
- [Ch 3: jemalloc / tcmalloc profiling](/blog/tools/debugging/memory/chapter03-jemalloc-tcmalloc)
- [Valgrind Ch 5: Suppression과 실무 운용](/blog/tools/debugging/valgrind/chapter05-suppressions)
- [Sanitizers Ch 3: LSan](/blog/tools/debugging/sanitizers/chapter03-lsan-leaks)
- [heaptrack GitHub](https://github.com/KDE/heaptrack)
- [heaptrack v1.4.0 README](https://github.com/KDE/heaptrack/blob/v1.4.0/README.md)
- [heaptrack v1.4.0 `heaptrack.sh.cmake`](https://github.com/KDE/heaptrack/blob/v1.4.0/src/track/heaptrack.sh.cmake) — 옵션, 출력 이름, attach 경고
- [heaptrack v1.4.0 `heaptrack_print.cpp`](https://github.com/KDE/heaptrack/blob/v1.4.0/src/analyze/print/heaptrack_print.cpp) — 보고서 섹션과 옵션
- [KDE blog — heaptrack intro](https://milian.cc/heaptrack/)
