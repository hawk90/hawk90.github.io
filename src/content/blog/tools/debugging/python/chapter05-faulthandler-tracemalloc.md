---
title: "Python faulthandler·tracemalloc·objgraph — 죽음과 누수 진단"
slug: "tools/debugging/python/chapter05-faulthandler-tracemalloc"
date: 2026-05-30T09:05:00
description: "세그폴트 트레이스백, 메모리 할당 추적, 객체 그래프 시각화."
tags: [python, debugging, faulthandler, tracemalloc, objgraph]
series: "Python Debugging"
seriesOrder: 5
draft: false
topics: ["tools", "tools/debugging"]
---

마지막 장은 *비정상 종료*와 *서서히 새는 메모리* 진단입니다. C 확장이 세그폴트로 죽었을 때 어디서 죽었는지, 프로세스 메모리가 자꾸 늘 때 어떤 객체가 GC되지 않고 있는지를 표준 라이브러리 + 작은 외부 도구로 잡습니다.

## faulthandler — 세그폴트의 트레이스백

C 확장(NumPy, Pandas, sqlite3, 직접 작성한 cython)이 SEGV로 죽으면 평소엔 *그냥 죽습니다*. 트레이스백도 없이.

```python
import faulthandler
faulthandler.enable()
```

이 두 줄을 앱 진입점에 박아 두면, 세그폴트·버스 에러·illegal instruction이 일어났을 때 stderr에 *그 시점의* 파이썬 트레이스백이 떨어집니다.

```text
Fatal Python error: Segmentation fault

Current thread 0x00007f3c... (most recent call first):
  File "myapp.py", line 25 in process
  File "myapp.py", line 60 in main
  File "myapp.py", line 80 in <module>
```

faulthandler의 적용 여부는 출력 파일·서비스 운영 방식과 함께 결정합니다. 이 글은 오버헤드 수치를 측정하지 않았습니다.

### 환경 변수로

```bash
$ PYTHONFAULTHANDLER=1 python myapp.py
```

또는 `-X faulthandler`.

### 시그널로 dump

```python
import faulthandler, signal
faulthandler.register(signal.SIGUSR1)
```

```bash
$ kill -USR1 <pid>
# 모든 스레드의 콜스택을 stderr로
```

faulthandler.register는 프로세스 내부에서 시그널에 대한 스택 덤프를 준비합니다. 외부에서 시그널을 보내는 권한·플랫폼 지원·출력 파일의 유효성을 확인해야 하며 외부 메모리 읽기 방식의 py-spy와 같은 경로는 아닙니다.

### dump_traceback_later — 데드락 감지

```python
faulthandler.dump_traceback_later(timeout=30, repeat=True)
```

30초마다 모든 스레드 콜스택을 stderr에 출력. 운영 서비스가 가끔 멈출 때 dump를 자동 수집.

## tracemalloc — 메모리 할당 추적

내장 라이브러리. 어디서 메모리를 할당했는지 *콜스택과 함께* 추적합니다.

```python
import tracemalloc

tracemalloc.start(25)              # 콜스택 최대 25프레임 보존

# ... 의심 작업 ...
do_work()

snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')

for stat in top_stats[:10]:
    print(stat)
```

```text
/srv/app/cache.py:42: size=53.2 MiB, count=10421, average=5.2 KiB
/srv/app/db.py:88: size=12.1 MiB, count=8421, average=1.5 KiB
...
```

snapshot의 size는 추적 중인 메모리 블록의 현재 합이고 count는 해당 블록 수입니다. 지금까지의 누적 할당량이나 Python 객체 개수를 직접 뜻하지 않습니다. 시작 전에 할당한 메모리와 추적되지 않는 C 확장 할당은 별도입니다. [tracemalloc 통계](https://docs.python.org/3.15/library/tracemalloc.html#tracemalloc.Statistic)의 단위를 확인합니다.

### 누수 진단 — 두 시점 비교

```python
tracemalloc.start(25)

snap1 = tracemalloc.take_snapshot()
for _ in range(1000):
    do_work()         # 한 사이클
snap2 = tracemalloc.take_snapshot()

diff = snap2.compare_to(snap1, 'lineno')
for stat in diff[:10]:
    print(stat)
```

compare_to 결과의 size_diff와 count_diff를 확인합니다. 전체 증가량을 작업 횟수로 나누면 회당 순증가의 평균을 구할 수 있지만, 모든 증가가 누수라는 뜻은 아닙니다. 예열·캐시·관측 도구 자체의 할당을 구분하고 같은 작업을 반복해 증가 추세를 확인합니다.

### 콜스택 보기

```python
top_stats = snapshot.statistics('traceback')

stat = top_stats[0]
print(f"{stat.count} blocks, {stat.size / 1024:.1f} KiB")
for line in stat.traceback.format():
    print(line)
```

```text
12345 blocks, 50000.0 KiB
  File "/srv/app/cache.py", line 42
    self._store[key] = value
  File "/srv/app/cache.py", line 30
    self.set(req.key, req.payload)
  File "/srv/app/handler.py", line 88
    cache.update(req)
```

어느 *콜 패스*에서 모이는지가 보입니다.

### 환경 변수로

```bash
$ PYTHONTRACEMALLOC=10 python myapp.py
```

`10`은 콜스택 깊이. asyncio "coroutine never awaited" 같은 경고도 이 변수 덕에 *생성 위치*를 함께 보여 줍니다.

## objgraph — 객체 참조 그래프

`pip install objgraph`. *왜 이 객체가 GC되지 않나*를 시각화합니다.

```python
import objgraph

# 가장 흔한 타입 N개
objgraph.show_most_common_types(limit=10)
# dict        12345
# list         8123
# tuple        7000
# function     5234
# ...

# 특정 타입의 증가
objgraph.show_growth()
# tuple    +500
# dict     +200
```

### 한 객체의 *왜 살아 있는지*

```python
import gc, objgraph

leaked = [obj for obj in gc.get_objects() if isinstance(obj, MySession)]
print(f"{len(leaked)} sessions alive")

objgraph.show_backrefs(leaked[:3], max_depth=5, filename='leak.png')
```

`leak.png`에 *루트에서 이 객체까지의 참조 체인*이 그래프로. 보통 잘못된 캐시, 클로저, 등록된 콜백, 글로벌 dict가 범인입니다.

### 누수 패턴 셋

1. **글로벌 캐시에 키 누적** — `dict` 또는 `lru_cache`가 무한 증가.
2. **클로저가 self 캡처** — 콜백이 self를 잡아 사이클.
3. **이벤트 리스너 미해제** — 등록만 하고 unregister 안 함.

세 가지 모두 `show_backrefs`로 *시각적으로* 잡힙니다.

## gc 모듈로 강제 수집·통계

```python
import gc

gc.collect()                       # 즉시 수집
print(gc.get_count())              # (gen0, gen1, gen2) 카운터
print(gc.get_stats())              # 세대별 통계

# 진단용: 수집 가능한 객체도 garbage에 보존하는 모드
gc.set_debug(gc.DEBUG_SAVEALL)
gc.collect()
for o in gc.garbage:
    print(type(o), o)
```

DEBUG_SAVEALL은 수집 가능한 도달 불가 객체도 해제하지 않고 gc.garbage에 넣습니다. 이 모드의 목록을 모두 수집 불가능한 누수로 분류하면 틀립니다. Python의 정상적인 __del__ 순환도 항상 수집 불가능한 것은 아닙니다. [gc.garbage와 디버그 플래그](https://docs.python.org/3.15/library/gc.html#gc.garbage)를 확인하고 진단 뒤 플래그와 보존한 참조를 복원합니다.

## memory_profiler — 줄 단위

`pip install memory_profiler`. 함수의 *각 줄*에서 RSS가 얼마나 변하는지.

```python
from memory_profiler import profile

@profile
def load_data():
    a = [0] * 10**7       # 참조 목록의 실제 크기는 환경에서 측정
    b = list(range(10**6)) # 정수·목록 할당을 함께 관측
    return a, b
```

```bash
python -m memory_profiler script.py
```

출력의 Mem usage와 Increment를 해당 환경에서 비교합니다. 이 절의 외부 패키지는 이번 검증에서 실행하지 않았으므로 예측한 MiB 값을 실행 결과로 싣지 않습니다. tracemalloc은 추적된 메모리 블록을, memory_profiler의 기본 psutil 백엔드는 프로세스 RSS를 관찰합니다. C 확장의 모든 할당이 tracemalloc에 잡히는 것은 아니며, RSS 변화만으로 할당 원인을 확정할 수도 없습니다.

## 직접 확인 — 순증가·해제와 DEBUG_SAVEALL

아래 세 파일은 CPython 3.15.0·macOS에서 실행했습니다. 측정값을 임의의 MiB/cycle 출력으로 만들지 않고, 명시적으로 보관한 페이로드의 바이트 수와 추적된 증가·감소의 방향을 구분합니다.

```python title="memory-check.py"
import gc
import tracemalloc

def allocate():
    return [bytearray(4096) for _ in range(8)]

allocation_line = allocate.__code__.co_firstlineno + 1
def delta(new, old):
    return sum(stat.size_diff for stat in new.compare_to(old, "lineno")
               if stat.traceback[0].filename == __file__
               and stat.traceback[0].lineno == allocation_line)

tracemalloc.start()
before = tracemalloc.take_snapshot()
payload = allocate()
after = tracemalloc.take_snapshot()
print(f"payload_bytes={sum(map(len, payload))}")
print(f"growth_positive={delta(after, before) > 0}")
payload.clear()
gc.collect()
released = tracemalloc.take_snapshot()
print(f"release_negative={delta(released, after) < 0}")
tracemalloc.stop()
```

출력은 payload_bytes=32768, growth_positive=True, release_negative=True입니다. 32768은 페이로드 길이의 합이며 추적기의 오버헤드를 포함한 측정 크기가 아닙니다.

두 번째 파일은 SAVEALL이 수집 가능한 순환도 붙잡는 것을 보여 줍니다. 이 예제는 별도 프로세스에서 실행하며 진단 플래그를 원래대로 되돌립니다.

```python title="gc-check.py"
import gc

class Node:
    pass

previous = gc.get_debug()
try:
    gc.set_debug(gc.DEBUG_SAVEALL)
    node = Node()
    node.self = node
    node_id = id(node)
    del node
    gc.collect()
    print(f"saved={any(id(obj) == node_id for obj in gc.garbage)}")
    gc.set_debug(previous)
    gc.garbage.clear()
    collected = gc.collect()
    print(f"released={collected > 0}")
finally:
    gc.set_debug(previous)
    gc.garbage.clear()
```

saved=True는 실제 수집 불가능 판정이 아니라 SAVEALL의 보존 효과입니다. 플래그를 되돌리고 보존 참조를 비운 뒤 후속 수집이 객체를 회수하면 released=True가 됩니다. 약한 참조는 첫 수집에서 이미 지워질 수 있으므로 보존 여부 검사에 사용하지 않습니다. 실행 중인 서비스의 gc.garbage를 무작정 비우라는 절차는 아닙니다.

세 번째 파일은 실제 프로세스를 크래시시키지 않고 faulthandler 출력에 현재 함수가 잡히는지 검사합니다.

```python title="traceback-check.py"
import faulthandler

def capture():
    faulthandler.dump_traceback(all_threads=True)

capture()
print("traceback captured")
```

`python3 traceback-check.py`는 stderr에 capture와 호출 위치를 남기고 정상 종료합니다. 이것은 명시적 dump의 검증이며 실제 C 확장의 SIGSEGV나 프로덕션 데드락을 재현한 기록은 아닙니다.

## pyrasite / pyringe — 외부에서 코드 주입

운영 프로세스 안에서 *임의 파이썬 코드*를 실행하고 싶을 때.

```bash
$ pip install pyrasite
$ pyrasite-shell <pid>
>>> import gc, objgraph
>>> objgraph.show_most_common_types(limit=5)
```

내부에서 `gdb`를 통해 코드를 주입합니다 — 위험하지만 강력. 운영에서는 가급적 *읽기 전용* py-spy로 진단하고, 코드 주입은 마지막 수단.

## 시리즈 정리

이 시리즈 5장에서 다룬 도구.

| 도구 | 역할 | 권한 |
|------|------|------|
| `pdb` / `ipdb` | 코드 안 BP | 같은 프로세스 |
| `debugpy` | IDE 디버깅, 원격 attach | 포트 |
| `asyncio debug=True` | 비동기 워닝 | 환경변수 |
| `py-spy` | 외부 샘플링·콜스택 dump | ptrace |
| `faulthandler` | 세그폴트 트레이스백 | 코드 또는 env |
| `tracemalloc` | 할당 추적 | 코드 또는 env |
| `objgraph` | 참조 그래프 시각화 | 코드 안 |
| `memory_profiler` | 줄별 RSS | 코드 데코레이터 |
| `pyrasite` | 외부 코드 주입 | ptrace, 위험 |

선택 기준.

- *개발 중 멈춰 보기* → `breakpoint()` + `pdb`/`ipdb`/`debugpy`.
- *운영 서비스 진단* → `py-spy dump` 먼저, 그다음 `faulthandler` 켜기.
- *메모리 누수* → `tracemalloc` 비교 + `objgraph.show_backrefs`.
- *비동기 버그* → `PYTHONASYNCIODEBUG=1` + `Task.get_stack()`.

## 정리

- faulthandler는 비정상 종료·명시적 덤프의 출력 경로와 프로세스 조건을 확인해 적용합니다.
- `tracemalloc`의 두 스냅샷 비교가 누수 진단의 표준.
- `objgraph.show_backrefs`로 *왜* 살아 있는지 시각화.
- `memory_profiler`는 줄 단위 RSS — NumPy/C 확장도 포함.
- 운영 외부 진단은 py-spy, 안에서는 faulthandler + SIGUSR1.

## 관련 항목 (시리즈 전체)

- [Ch 1: pdb 기본](/blog/tools/debugging/python/chapter01-pdb-basics)
- [Ch 2: debugpy / IDE](/blog/tools/debugging/python/chapter02-debugpy-ide)
- [Ch 3: asyncio 디버깅](/blog/tools/debugging/python/chapter03-asyncio)
- [Ch 4: py-spy 샘플링](/blog/tools/debugging/python/chapter04-py-spy)
- [GDB and LLDB 시리즈](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install) — C 확장은 GDB로
- [Valgrind Memcheck](/blog/tools/debugging/valgrind/chapter02-memcheck) — C/C++ 확장의 잘못된 메모리 접근을 확인하는 별도 도구

## 외부 자료

- [`tracemalloc` 공식 문서](https://docs.python.org/3/library/tracemalloc.html)
- [`faulthandler` 공식 문서](https://docs.python.org/3/library/faulthandler.html)
- [objgraph 문서](https://mg.pov.lt/objgraph/)
