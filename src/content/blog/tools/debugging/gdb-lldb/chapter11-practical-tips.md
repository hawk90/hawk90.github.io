---
title: "Ch 11: 실전 팁 — STL / 최적화 코드 / 시간 역행"
date: 2026-05-17T11:00:00
description: "STL pretty-printers, -O2 디버깅, .gdbinit 추천, rr time-travel. 시리즈 마무리."
tags: [gdb, STL, Optimization, rr]
series: "GDB and LLDB"
seriesOrder: 11
draft: false
---

마지막 장에서는 매일의 답답함을 줄여 주는 작은 팁을 모았습니다. STL이 줄줄이 보이지 않는 문제, `-O2` 코드의 "value optimized out", `.gdbinit` 합리적 기본값, 그리고 GDB의 가장 새로운 무기인 *시간 역행 디버깅*.

## STL — 알아서 예쁘게

최신 GDB(>= 7.0)는 libstdc++ pretty-printer를 *자동으로* 활성화합니다. 보통은 별 설정 없이 다음처럼 나옵니다.

```text
(gdb) print v
$1 = std::vector of length 3, capacity 4 = {1, 2, 3}

(gdb) print m
$2 = std::map with 2 elements = {[1] = "one", [2] = "two"}

(gdb) print s
$3 = "hello"
```

배포판이 자동 로드를 안 했다면 Ch 9의 `~/.gdbinit` 설정으로 직접 등록.

### 벡터 내용을 N개만

```text
(gdb) print *v._M_impl._M_start@10
$4 = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
```

`@n` 연산자가 *연속한 n개* 요소를 배열처럼 표시. pretty-printer가 막혔거나, 길이 5000짜리 벡터의 머리만 보고 싶을 때 씁니다.

### 큰 컨테이너의 머리만

pretty-printer 출력 길이 제한.

```text
(gdb) set print elements 20
(gdb) print huge_vector
$5 = std::vector of length 10000, capacity 10000 = {0, 1, 2, ..., 19, ...}
```

`set print elements 0`이면 무제한.

### 깊은 중첩

```text
(gdb) set print pretty on
(gdb) print *graph
```

`pretty on`으로 들여쓰기 보기. `set print depth N`으로 nested 깊이 제한.

## "value optimized out" — 최적화 코드

`-O2`로 빌드된 코드에서 변수를 찍으면 자주 만나는 메시지.

```text
(gdb) print x
$6 = <optimized out>
```

컴파일러가 변수를 레지스터에 두지 않거나, 식을 인라인 후 *없애* 버린 결과입니다. 해법 셋.

### 1. -Og로 다시 빌드

`-O0`은 "변수가 다 살아 있지만 너무 느림", `-O2`는 "빠르지만 변수가 사라짐". `-Og`가 *디버깅 친화적 최적화* — 변수 보존을 우선합니다.

```bash
$ gcc -Og -g3 -fno-omit-frame-pointer ...
```

프로덕션 빌드 그대로 디버깅해야 한다면 다음 단계.

### 2. -g3로 더 많은 정보

`-g`는 기본 레벨, `-g3`는 매크로 정의·인라인 함수 정보까지 포함. 인라인된 함수도 디버거가 인지합니다.

### 3. 레지스터 직접 보기

`<optimized out>`이지만 실제 값은 어디엔가 있습니다. 디스어셈블로 어느 레지스터에 있는지 찾아 그 레지스터를 직접 봅니다.

```text
(gdb) disas
=> 0x55... <+24>: mov    %rdi,%r12
                 0x55... <+27>: mov    %esi,%ebp
(gdb) print $r12
(gdb) print (int)$ebp
```

귀찮지만 강력. ARM이면 `$r0`-`$r3`이 인자.

### 4. 인라인 함수 step-in

`-O2`로 인라인된 함수는 같은 줄에 여러 호출이 압축됩니다. `step`이 어디로 갈지 헷갈리면 `info line`으로 PC ↔ 소스 매핑을 확인.

```text
(gdb) info line *0x55555558a3a2
```

## frame info — 진짜 어디서 멈췄나

인라인 호출이 깊게 쌓이면 `bt`가 한 줄에 두세 함수를 같이 보여 줍니다 (`inlined by ...`).

```text
#0  0x55... in foo (inlined by bar at f.cpp:30)
                  (inlined by baz at f.cpp:50) at f.cpp:10
```

`info frame`으로 PC·SP·FP를 직접 확인하면 어디인지 모호함이 줄어듭니다 (Ch 4 참고).

## .gdbinit 추천

다음을 `~/.gdbinit`에 넣어 두면 매번 입력하지 않아도 됩니다.

```gdb
# 히스토리
set history save on
set history filename ~/.gdb_history
set history size 10000

# 출력
set print pretty on
set print object on
set print array on
set print array-indexes on
set print elements 200

# 자동 정지 동작
set pagination off
set confirm off

# 라이브러리 자동 로드 허용 (pretty-printer 등)
set auto-load safe-path /

# 색
set style sources on

# follow-fork
set follow-fork-mode parent
set detach-on-fork on

# C++ STL pretty-printer (배포판이 자동 등록하지 않은 경우)
python
import sys
sys.path.insert(0, '/usr/share/gcc-13/python')
try:
    from libstdcxx.v6.printers import register_libstdcxx_printers
    register_libstdcxx_printers(None)
except ImportError:
    pass
end
```

LLDB는 `~/.lldbinit`.

```
settings set target.skip-prologue false
settings set stop-line-count-after 5
settings set stop-line-count-before 5
settings set thread-format "thread #${thread.index}: tid=${thread.id}, '${thread.name}'\n"
```

## 빠른 작업 — 한 줄 디버깅

```bash
# 핵심 함수까지 자동으로 가서 멈춤
$ gdb -ex 'break main' -ex 'run' --args ./my_prog arg1

# 배치 모드 — 한 번 실행 후 종료
$ gdb -batch -ex 'run' -ex 'bt' --args ./my_prog
[자동으로 콜스택 출력]

# 스크립트로
$ gdb -batch -x my_script.gdb ./my_prog
```

CI에서 segfault난 바이너리를 자동으로 디버깅해 콜스택만 뽑는 데 유용합니다.

```bash
# 사후 분석 자동화
$ gdb -batch -ex 'bt' -ex 'info locals' -ex 'quit' \
    ./my_prog /tmp/core > /tmp/postmortem.log
```

## reverse-* — GDB 자체의 시간 역행

GDB는 자체적으로도 *record* 기능이 있습니다 (rr 없이).

```text
(gdb) target record-full
(gdb) continue
(gdb) reverse-step
(gdb) reverse-continue
```

원리는 모든 명령어 실행 전후를 기록 — 그래서 *엄청 느림*. 짧은 구간에서만 실용적입니다. 멀리 갈 거면 rr이 거의 모든 면에서 앞섭니다.

## rr — 진짜 time-travel

Ch 6에서도 언급한 [rr](https://rr-project.org/). 다시 짧게.

```bash
$ rr record ./my_prog
$ rr replay
(rr) continue
(rr) watch -l my_var
(rr) reverse-continue        # my_var 마지막 쓰기까지 거꾸로
```

같은 명령어 흐름이 *완전히* 재현되므로 비결정적 버그·race를 잡는 거의 유일한 도구. x86 Linux 전용 제약은 있지만 그만한 가치는 있습니다.

## 자주 만나는 함정 모음

| 증상 | 원인 / 해법 |
|------|-------------|
| `??` 함수 이름 | 디버그 심볼 없음 → `-g` 추가, stripped면 별도 debuginfo |
| `value optimized out` | `-Og` 또는 레지스터 직접 보기 |
| `No symbol "x" in current context` | 스코프 밖 (블록 종료 또는 인라인) |
| 브레이크포인트가 무시됨 | 다른 단위·다른 인라인 사본에 걸림 — `info breakpoints`로 위치 확인 |
| 콜스택 끝이 `0x0` | 스택 손상 또는 `-fno-omit-frame-pointer` 없음 |
| `(gdb)` 명령에 색이 없다 | `set style sources on` / GDB 8.0+ 필요 |
| GDB 자체가 무한 정지 | `Ctrl-C` 한 번, 그래도 안 풀리면 `kill -USR2` |
| ASLR로 주소가 매번 달라짐 | `set disable-randomization on`(기본 on) |
| signals가 그냥 빠져나감 | `handle SIGPIPE nostop noprint` 등으로 무시 (Ch 5) |

## 빌드 옵션 권장 정리

```bash
# 평소 디버깅 빌드
-O0 -g3 -fno-omit-frame-pointer -fno-inline -fno-optimize-sibling-calls

# 프로덕션이지만 디버깅도 가능
-Og -g3 -fno-omit-frame-pointer

# 프로덕션 + 별도 debuginfo
-O2 -g                          # 컴파일
$ objcopy --only-keep-debug a.out a.debug
$ strip --strip-debug a.out
$ objcopy --add-gnu-debuglink=a.debug a.out
```

마지막 패턴이 배포 빌드의 표준. 출시본은 stripped, debuginfo는 서버 보관 → core dump 시 build-id로 매칭.

## 마지막으로 — 더 깊게

이 시리즈 다음에 보면 좋은 것들.

- **Sanitizer**(`AddressSanitizer`/`UBSan`/`TSan`) — 디버거의 *대체*가 아닌 *짝*. 메모리·UB·race 자동 검출.
- **Valgrind Memcheck** — 검출 정밀도는 ASan 이상, 속도는 더 느림.
- **perf** — 디버거가 아니라 *사후 통계*. hot path / cache miss / branch miss.
- **eBPF + bpftrace** — 커널·사용자 공간 trace.
- **rr / Pernosco** — 시간 역행 + 클라우드 분석.

## 정리 (시리즈 전체)

- GDB·LLDB는 *어떻게* 실행 중인 프로세스를 들여다보고 *왜* 그렇게 됐는지 묻는 도구.
- 브레이크포인트·워치포인트는 정적 검사로 못 잡는 동적 사실을 본다.
- 콜스택·프레임은 "지금 어떻게 여기까지 왔나"의 지도.
- 멀티스레드·core dump·원격·임베디드는 *같은 GDB*가 형태만 바꿔 다룬다.
- Python 확장이 디버거의 진짜 천장이다.
- 적절한 빌드 플래그(`-Og -g3 -fno-omit-frame-pointer`)가 디버거의 행복을 결정한다.

이 시리즈로 일상 디버깅의 80%를 덮었습니다. 나머지 20%는 직접 손을 더럽혀야 알게 됩니다.

## 관련 항목 (시리즈 전체)

- [Ch 1: 소개와 설치](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install)
- [Ch 2: 기본 명령 — 10가지](/blog/tools/debugging/gdb-lldb/chapter02-basic-commands)
- [Ch 3: 상태 검사](/blog/tools/debugging/gdb-lldb/chapter03-inspecting-state)
- [Ch 4: 콜스택과 프레임](/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames)
- [Ch 5: 브레이크포인트와 워치포인트](/blog/tools/debugging/gdb-lldb/chapter05-breakpoints-watchpoints)
- [Ch 6: 멀티스레드 / 멀티프로세스](/blog/tools/debugging/gdb-lldb/chapter06-multithread-multiprocess)
- [Ch 7: core dump 분석](/blog/tools/debugging/gdb-lldb/chapter07-core-dump)
- [Ch 8: 원격 / 임베디드 디버깅](/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging)
- [Ch 9: Python 스크립팅](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting)
- [Ch 10: TUI / 프런트엔드](/blog/tools/debugging/gdb-lldb/chapter10-tui-frontends)
- 다음: [Ch 12: DWARF 디버그 정보](/blog/tools/debugging/gdb-lldb/chapter12-dwarf)

## 외부 자료

- [Sanitizer 시리즈](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)
- [Valgrind 시리즈](/blog/tools/debugging/valgrind/chapter02-memcheck)
- [rr 프로젝트](https://rr-project.org/)
- [GDB 공식 매뉴얼](https://sourceware.org/gdb/current/onlinedocs/gdb.html/)
- [LLDB 튜토리얼](https://lldb.llvm.org/use/tutorial.html)
