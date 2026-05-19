---
title: "Ch 5: rr / Pernosco / TSan / Helgrind 통합 워크플로"
date: 2026-05-17T05:00:00
description: "재현 불가 race를 기록하고 시간 역행. rr 깊이, Pernosco 인덱싱, TSan/Helgrind와의 분담."
tags: [rr, pernosco, tsan, helgrind, time-travel, record-replay]
series: "Concurrency Debugging"
seriesOrder: 5
draft: true
---

이 시리즈의 마지막 장은 *재현 불가 race·heisenbug*에 대한 답입니다. **rr**로 *한 번이라도 재현된 버그*를 영원히 보존하고, **Pernosco**로 trace를 클라우드 인덱싱, **TSan**·**Helgrind**가 *어디가 진짜 race인지* 알려 주는 통합 워크플로.

:::tldr
rr이 *비결정성을 결정성으로*. TSan/Helgrind가 *race 위치 진단*. 둘이 보완.
:::

## rr — record and replay

[rr](https://rr-project.org/)은 Mozilla가 만든 *record-and-replay 디버거*. 한 번 기록된 trace를 *완전히 결정적으로* 재생.

### 동작 원리

1. **단일 코어 모드** — 모든 디버기 스레드를 한 CPU에 묶음. 컨텍스트 스위치가 결정적.
2. **시스템 콜 기록** — 모든 syscall 결과(read, gettimeofday, recv, ...)를 trace에 저장.
3. **시그널 위치 기록** — 시그널이 도달한 *정확한 명령*.
4. **재생 시** — 시스템 콜 응답을 *기록 그대로* 주입, 스케줄도 *같은 순서*.

![rr record/replay — trace 저장과 시간 역행](/images/blog/tools/diagrams/rr-record-replay.svg)

```bash
# 1. 기록
$ rr record ./my_prog
[...버그 발생...]
rr: Saving execution to trace directory '/home/me/.local/share/rr/my_prog-0'.

# 2. 재생 (몇 번이고)
$ rr replay
GNU gdb 14.0.50.20230324-git
Reading symbols from /home/me/.local/share/rr/my_prog-0/mmap_pack_...
(rr) continue
```

GDB 인터페이스가 그대로. *모든 GDB 명령*이 동작 — 추가로 `reverse-*`.

### reverse 명령

```text
(rr) reverse-continue          ← 시간 역행 (이전 정지 지점까지)
(rr) reverse-step
(rr) reverse-next
(rr) reverse-finish
(rr) reverse-stepi
```

`reverse-continue`가 *마법*. 변수가 *언제 잘못된 값으로 바뀌었는지* 찾는 표준 패턴.

```text
(rr) print my_var
$1 = 42                        ← 잘못된 값
(rr) watch -l my_var
Hardware watchpoint 2: -location my_var
(rr) reverse-continue
[my_var = 42로 *바뀐 직전*에 정지]
(rr) bt
[그 시점의 콜스택]
```

`-l` 옵션 — 메모리 위치 기준 watchpoint (값이 아니라 *주소*).

## rr 워크플로

### 1. 재현 안 되는 버그를 기록

```bash
# 재현이 가끔만 → 루프
$ while ! rr record --no-syscall-buffer ./test_case; do :; done
[재현될 때까지 무한 반복]
```

평균 10번에 1번 재현이면 30분 안에 trace 확보.

### 2. trace 분석

```bash
$ rr replay /home/me/.local/share/rr/my_prog-0
(rr) bt        # 어디서 죽었나
(rr) reverse-continue
```

같은 trace를 *원하는 만큼* 재생. 변수·BP·watchpoint *바꿔 가며* 분석.

### 3. 동료에게 공유

```bash
$ tar czf trace.tar.gz ~/.local/share/rr/my_prog-0/
$ scp trace.tar.gz colleague:
```

동료가 *완전히 같은 실행*을 재생. 회사에서 *한 trace로 여러 사람 분석* 가능.

## rr 옵션

```bash
# 기록 옵션
$ rr record \
    --no-syscall-buffer \      # syscall 버퍼링 비활성 (안정성↑, 속도↓)
    --chaos \                  # 비결정적 스케줄 흉내 (race 재현률↑)
    --bind-to-cpu=2 \          # 특정 CPU 코어
    ./my_prog arg1

# 재생 옵션
$ rr replay --debugger=lldb \   # GDB 대신 LLDB
            --onfork=child \    # fork 시 자식 따라감
            --serve-files \     # cloud용 (소스 파일을 trace에 묶기)
            /path/to/trace
```

`--chaos`가 *race 잡기*에 효과적. 일반 record는 *컨텍스트 스위치를 거의 안 함* (단일 코어) → race가 *덜 일어남*. `--chaos`는 *인위적으로 스위치 다양화*.

```bash
# 재현률 비교
$ rr record ./race_test          # 1/100 재현
$ rr record --chaos ./race_test  # 1/10 재현
```

## rr의 제약

| 제약 | 영향 |
|------|------|
| x86 Linux만 | ARM/macOS/Windows 미지원 |
| 단일 코어 시뮬 | *진짜* 멀티 코어 메모리 reorder race는 재현 안 됨 |
| 일부 명령 (RDTSC, AVX-512) | 기록 안 됨 |
| 5-10x 느림 | 운영 환경 부적합 |
| trace 크기 | GB 단위 (메모리·syscall 많을 때) |
| 일부 syscall 미지원 | 새 Linux 기능 (io_uring 등) 점진 추가 |

그래도 *재현 불가 버그*엔 거의 유일한 무기.

## --chaos 모드 깊이

rr이 *어떻게* 스케줄 다양화하나.

```c
// 디버기 측 syscall 직후 마다 rr이 끼어듦
// 비결정적 priority로 다음 실행 스레드 결정
priority = (random() % N) * decay_factor;
```

선택 가능한 *priority 분포*가 race를 *덜 일관된 순서*로 노출. 한 race가 *100번 실행에 한 번* 일어나도 chaos로 *10번 실행에 한 번*까지 끌어올림.

## Pernosco — rr trace의 클라우드 인덱싱

[Pernosco](https://pernos.co/) — rr trace를 업로드하면 *전체 실행을 인덱스*해 웹 UI에서 *어디서나 검색*.

```
이 변수가 마지막으로 X 값을 가진 시점은?
→ 클릭으로 정확한 PC.

이 메모리 주소가 처음 alloc된 곳은?
→ 콜스택 즉답.

이 락이 마지막으로 풀린 시점은?
→ 정확한 명령.
```

큰 codebase에서 *팀이 같은 trace*를 분석. 매우 강력하지만 *상용 서비스*.

```bash
$ pernosco-submit upload <trace_dir>
[URL 제공, 브라우저에서 분석]
```

## TSan 통합 — race 위치 진단

rr은 *언제·어떻게* 일어났는지 보여 주지만 *왜 race인지*는 사용자가 분석. TSan이 *static·dynamic으로 race 위치 자동 검출*.

```bash
# 1. TSan으로 빌드 + 실행
$ clang -fsanitize=thread -g ./prog.c -o prog
$ ./prog
==================
WARNING: ThreadSanitizer: data race (pid=12345)
  Atomic write of size 4 at 0x7b... by thread T1:
    #0 increment counter.cpp:12

  Previous read of size 4 at 0x7b... by main thread:
    #0 main counter.cpp:50
==================

# 2. 그 위치를 rr로 재현·분석
$ rr record ./prog        # *TSan 없이 다시 빌드*
$ rr replay
(rr) break counter.cpp:12
(rr) ...
```

TSan + rr의 결합 — *위치는 TSan*, *동적 상태는 rr*.

## TSan 옵션

```bash
$ TSAN_OPTIONS="halt_on_error=1:second_deadlock_stack=1" ./prog
```

| 옵션 | 효과 |
|------|------|
| `halt_on_error=1` | 첫 race 검출 즉시 종료 |
| `second_deadlock_stack=1` | 데드락 두 콜스택 모두 출력 |
| `report_destroy_locked=1` | 잠긴 락 destroy 보고 |
| `history_size=N` | 추적 깊이 (기본 2) |
| `report_thread_leaks=0` | thread 누수 보고 끄기 |
| `flush_memory_ms=1000` | shadow 메모리 정리 주기 |
| `suppressions=file` | 무시할 패턴 |

큰 프로그램에선 TSan shadow 메모리가 *5-10x* 더 사용. OOM 주의.

## TSan suppressions

3rd party 라이브러리의 known race를 무시.

```
# tsan.supp
race:libsqlite3.so
race:libssl.so
deadlock:libfoo.so
```

```bash
$ TSAN_OPTIONS="suppressions=tsan.supp" ./prog
```

## Helgrind / DRD — Valgrind의 race detector

TSan과 같은 일을 *recompile 없이*.

```bash
$ valgrind --tool=helgrind ./prog
$ valgrind --tool=drd ./prog
```

차이:

| | Helgrind | DRD |
|---|----------|-----|
| race | ✓ | ✓ |
| 데드락 (lock order) | ✓ | ✓ |
| pthread API 오용 | ✓ | ✓ |
| 속도 | 매우 느림 (20-50x) | 약간 빠름 (10-30x) |
| 메모리 | 매우 큼 | 적음 |

`drd`가 *약간 빠르고 메모리 적음*. 큰 프로그램엔 권장.

```bash
$ valgrind --tool=helgrind --history-level=full ./prog
$ valgrind --tool=drd --check-stack-var=yes ./prog
```

상용 바이너리에 *추가 컴파일 없이* 적용 가능 — TSan 대비 장점.

## ThreadSanitizer vs Helgrind — 어느 게 좋나

| | TSan | Helgrind |
|---|------|----------|
| 정확도 | 더 높음 | 보통 |
| False positive | 적음 | 좀 있음 |
| 속도 | 5-15x 느림 | 20-50x |
| 빌드 변경 | 필요 | 불필요 |
| 메모리 | 많음 | 매우 많음 |
| C++ 표준 atomic | 완벽 지원 | 부분 |

가능하면 TSan, 안 되면 Helgrind.

## 통합 워크플로 — 실전

상황: 운영에서 가끔 *Hang* 발생.

### Step 1 — 증거 수집

```bash
$ py-spy dump --pid <hung_pid>          # 또는 GDB attach + bt
[모든 스레드 콜스택 캡처]
```

### Step 2 — 데드락인지 race인지

`__lll_lock_wait`이 사이클 → *데드락*. 어떤 thread도 lock 안 잡고 있는데 일관성 깨짐 → *race*.

### Step 3 — 데드락이면

콜스택과 mutex 주소로 *순서 역전* 위치 찾기. 코드 검토 + fix.

### Step 4 — race이면

```bash
# CI에 TSan 빌드 추가
$ clang -fsanitize=thread -O1 -g ... ./test_suite
$ TSAN_OPTIONS="halt_on_error=1" ctest
```

TSan이 *정확한 두 줄*을 알려 줌.

### Step 5 — 가끔만 race

```bash
$ rr record --chaos ./test_suite
[루프로 재현]
$ rr replay
(rr) reverse-continue
```

rr의 trace에 *완전한 시간 흐름*. reverse로 race 시점 분석.

### Step 6 — Pernosco 클라우드

```bash
$ pernosco-submit upload <trace>
```

웹 UI에서 *변수가 언제 잘못된 값으로 바뀌었는지* 즉답.

## 정적 분석 — Coverity / clang-tidy

런타임이 아닌 *컴파일 시* race 검출.

```bash
$ clang-tidy --checks='-*,bugprone-not-null-terminated-result,concurrency-*' \
             prog.c
```

```bash
$ scan-build clang -c prog.c
```

False positive가 많지만 *어느 패턴*이 위험한지 코드 검토 시작점.

상용 Coverity는 더 정교. 큰 코드베이스의 *모든 lock pattern*을 정적 검사.

## 모델 체커 — TLA+ / Spin

알고리즘 자체의 *수학적 검증*. C 코드가 아닌 *모델*을 작성하고 *모든 인터리빙*을 탐색.

```tla
EXTENDS Naturals
VARIABLES x, y

Init == x = 0 /\ y = 0

ProcA == x' = x + 1
ProcB == y' = y + x

Next == ProcA \/ ProcB

Inv == y <= x
Spec == Init /\ [][Next]_<<x, y>>
```

TLC 모델 체커가 *모든 가능 상태*를 탐색해 *불변 위반* 검출. lock-free 알고리즘 설계에 필수.

Amazon AWS는 모든 핵심 분산 알고리즘을 TLA+로 검증.

## 시리즈 정리

5장으로 *Linux 스레드의 정체*부터 *클라우드 trace 인덱싱*까지 다뤘습니다.

- **Ch 1** Linux 스레드 / futex — 기반 메커니즘.
- **Ch 2** GDB 멀티스레드 명령 — 일상 도구.
- **Ch 3** fork / 멀티프로세스 — 다중 inferior, 컨테이너.
- **Ch 4** 데드락 / race 방법론 — 분류와 회피.
- **Ch 5** (이 장) rr / Pernosco / TSan / Helgrind 통합.

동시성 디버깅의 *전체 스펙트럼*. 운영 환경의 race는 *한 도구로* 해결되지 않습니다 — 여러 도구를 *상황에 맞게* 조합하는 게 핵심.

## 관련 항목 (시리즈 전체)

- [Ch 1: Linux 스레드 / futex](/blog/tools/debugging/concurrency/chapter01-linux-threads-futex)
- [Ch 2: GDB 멀티스레드](/blog/tools/debugging/concurrency/chapter02-gdb-threads)
- [Ch 3: fork / 멀티프로세스](/blog/tools/debugging/concurrency/chapter03-fork-multiprocess)
- [Ch 4: 데드락 / race 방법론](/blog/tools/debugging/concurrency/chapter04-deadlock-race-methodology)

## 외부 자료

- [Sanitizers — TSan / MSan](/blog/tools/debugging/sanitizers/chapter04-tsan)
- [Valgrind — Helgrind / DRD](/blog/tools/debugging/valgrind/chapter04-helgrind-drd)
- [rr 공식](https://rr-project.org/)
- [Pernosco](https://pernos.co/)
- [TSan 매뉴얼](https://clang.llvm.org/docs/ThreadSanitizer.html)
- [TLA+ Toolbox](https://lamport.azurewebsites.net/tla/toolbox.html)
- [Preshing on Programming — concurrency series](https://preshing.com/archives/)
