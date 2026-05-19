---
title: "Ch 5: faulthandler / tracemalloc / objgraph — 죽음과 누수"
date: 2026-05-17T05:00:00
description: "세그폴트 트레이스백, 메모리 할당 추적, 객체 그래프 시각화."
tags: [python, debugging, faulthandler, tracemalloc, objgraph]
series: "Python Debugging"
seriesOrder: 5
draft: false
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

운영 코드에 항상 켜 둘 수 있을 만큼 가벼움(거의 0 오버헤드).

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

`py-spy dump`와 비슷하지만 *프로세스 안에서* 동작하므로 권한 문제 없음. 다만 hung된 프로세스에는 시그널이 도달하지 않을 수도 있어 py-spy가 더 견고합니다.

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

`size=`이 누적 할당, `count=`가 객체 수. 큰 객체 1개인지 작은 객체 만 개인지가 한눈에.

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

```text
/srv/app/cache.py:42: size=+50.0 MiB (+1.0 MiB/cycle), count=+10000
```

*증가량*만 보여 줍니다. "한 사이클 돌릴 때마다 cache.py:42에서 50KB씩 안 풀린다" → 그 줄로 가서 *왜* 모이는지 분석.

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

# 순환 참조 객체 (수집 불가능한)
gc.set_debug(gc.DEBUG_SAVEALL)
gc.collect()
for o in gc.garbage:
    print(type(o), o)
```

`gc.garbage`는 `__del__`이 있어 GC가 수집을 미룬 객체들. Python 3.4+ 부터는 거의 비어 있지만 *오래된 코드*나 *순환 참조 + 파이널라이저* 조합은 여기로 떨어집니다.

## memory_profiler — 줄 단위

`pip install memory_profiler`. 함수의 *각 줄*에서 RSS가 얼마나 변하는지.

```python
from memory_profiler import profile

@profile
def load_data():
    a = [0] * 10**7       # ~80 MB
    b = list(range(10**6)) # ~30 MB
    return a, b
```

```bash
$ python -m memory_profiler script.py
Line #    Mem usage    Increment   Line Contents
================================================
     3     10.0 MiB     10.0 MiB   @profile
     4                             def load_data():
     5     90.0 MiB     80.0 MiB       a = [0] * 10**7
     6    120.0 MiB     30.0 MiB       b = list(range(10**6))
     7    120.0 MiB      0.0 MiB       return a, b
```

tracemalloc은 *Python 객체* 단위, memory_profiler는 *프로세스 RSS* 단위. NumPy 배열·C 확장 메모리는 후자가 보여 줍니다.

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

- `faulthandler.enable()` 두 줄을 모든 운영 코드에 박아 둘 것.
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
- [Valgrind Massif](/blog/tools/debugging/valgrind/chapter05-massif-callgrind) — RSS heap 시각화 (C 확장 포함)

## 외부 자료

- [`tracemalloc` 공식 문서](https://docs.python.org/3/library/tracemalloc.html)
- [`faulthandler` 공식 문서](https://docs.python.org/3/library/faulthandler.html)
- [objgraph 문서](https://mg.pov.lt/objgraph/)
