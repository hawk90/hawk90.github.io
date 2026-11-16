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

마지막 장은 *비정상 종료*와 *서서히 새는 메모리*입니다. C 확장이 세그폴트로 죽었을 때 파이썬 코드의 어디서 죽었는지, 프로세스 메모리가 자꾸 늘 때 어떤 줄이 할당하고 어떤 참조가 객체를 붙잡는지를 표준 라이브러리와 작은 외부 도구로 찾습니다. 끝으로 GDB의 `py-bt`로 C 레벨에서 파이썬 스택을 읽습니다.

실행 환경은 앞 장들과 같은 Debian 13 arm64 게스트의 CPython 3.15.2(uv 빌드)입니다. GDB 절만 Debian 패키지 `/usr/bin/python3.13`(3.13.5)과 GDB 16.3을 썼습니다. 외부 패키지는 objgraph 3.7.0, memory_profiler 0.61.0입니다.

## faulthandler — 세그폴트의 트레이스백

세그폴트는 파이썬 예외가 아니라 OS 시그널이라서 `try/except`도 traceback도 거치지 않고 프로세스가 사라집니다. 비행기로 치면 블랙박스 없이 추락하는 셈입니다. `faulthandler`는 그 블랙박스를 답니다. `ctypes`로 잘못된 주소를 읽어 일부러 죽는 `crash.py`로 확인합니다.

```python title="crash.py"
import ctypes

def parse_record(buf_addr):
    return ctypes.string_at(buf_addr, 16)   # bad pointer -> SIGSEGV in C

def process(batch):
    for addr in batch:
        parse_record(addr)

process([8])
```

그냥 실행하면 셸(bash)이 남긴 한 줄과 종료 코드 139(128 + SIGSEGV 11)가 전부입니다.

```text
$ python crash.py
run.sh: line 5:  3542 Segmentation fault      python crash.py
[exit=139]
```

`-X faulthandler`를 붙이면 죽는 순간의 파이썬 스택이 stderr에 남습니다.

```text
$ python -X faulthandler crash.py
Fatal Python error: Segmentation fault

Current thread 0x0000ffff82654440 [python] (most recent call first):
  File "/root/.local/share/uv/python/cpython-3.15.2-linux-aarch64-gnu/lib/python3.15/ctypes/__init__.py", line 613 in string_at
  File "/root/py/ch05/crash.py", line 4 in parse_record
  File "/root/py/ch05/crash.py", line 8 in process
  File "/root/py/ch05/crash.py", line 10 in <module>

Current thread's C stack trace (most recent call first):
  Binary file "python", at _Py_DumpStack+0x34 [0xaaaac35652fc]
  ...
  Binary file "/lib/aarch64-linux-gnu/libc.so.6", at +0xa3364 [0xffff82363364]
  Binary file "python", at PyBytes_FromStringAndSize+0xb0 [0xaaaac2f98344]
  ...
```

파이썬 스택은 `crash.py` 4번 줄의 `string_at`을 정확히 가리킵니다. 아래의 C 스택은 3.14에서 추가된 기능입니다. [`faulthandler.enable()` 문서](https://docs.python.org/3.15/library/faulthandler.html#faulthandler.enable)에 따르면 `c_stack=True`(기본)면 파이썬 traceback 뒤에 C 스택도 찍습니다. 여기서는 libc 안에서 죽었고 그 호출자가 `PyBytes_FromStringAndSize`라는 것까지 보입니다. 심볼이 없는 프레임은 `+0x...` 오프셋만 나옵니다.

켜는 방법은 셋이고 결과는 같습니다. [`PYTHONFAULTHANDLER` 문서](https://docs.python.org/3.15/using/cmdline.html#envvar-PYTHONFAULTHANDLER)는 이 변수가 `-X faulthandler`와 같다고 적고, 실제로 `PYTHONFAULTHANDLER=1 python crash.py`도 같은 출력이었습니다. 코드에서 켜려면 진입점에 두 줄을 넣습니다.

```python
import faulthandler
faulthandler.enable()   # SIGSEGV, SIGFPE, SIGABRT, SIGBUS, SIGILL
```

`enable()`의 `file`은 핸들러가 꺼질 때까지 열려 있어야 합니다(문서의 "Issue with file descriptors" 절). 로그 파일로 보낸다면 그 파일 객체를 전역에 붙잡아 둡니다. 이 장에서 faulthandler의 오버헤드는 재지 않았습니다.

### 시그널로 dump

죽지는 않았지만 멈춘 프로세스의 스택이 궁금할 때는 `faulthandler.register()`로 사용자 시그널에 덤프를 겁니다.

```python title="sigdump.py"
import faulthandler, signal, os, time
faulthandler.register(signal.SIGUSR1)

def wait_for_job():
    time.sleep(3)

open("sigdump.pid", "w").write(str(os.getpid()))
wait_for_job()
```

```text
$ python sigdump.py & sleep 1; kill -USR1 $(cat sigdump.pid)
Current thread 0x0000ffffa3dd8440 [python] (most recent call first):
  File "/root/py/ch05/sigdump.py", line 5 in wait_for_job
  File "/root/py/ch05/sigdump.py", line 8 in <module>
[exit=0]
```

덤프 후에도 프로세스는 정상 종료했습니다. 3장의 asyncio 덤프와 달리 이벤트 루프가 돌 필요가 없고, 위 출력처럼 `time.sleep` 중인 `wait_for_job`도 찍혔습니다. 다만 이 방식은 프로세스 *안에* 미리 넣어 둬야 합니다. 준비 없이 밖에서 보려면 [4장의 py-spy](/blog/tools/debugging/python/chapter04-py-spy)를 씁니다.

### dump_traceback_later — 멈춤 감지

가끔만 멈추는 서비스라면 "N초 동안 진행이 없으면 스택을 남겨라"가 필요합니다. [`dump_traceback_later()`](https://docs.python.org/3.15/library/faulthandler.html#faulthandler.dump_traceback_later)는 감시 스레드로 이를 구현합니다. 잠금을 두 번 잡아 멈추는 스레드로 확인했습니다.

```python title="later.py"
import faulthandler, threading, time
faulthandler.dump_traceback_later(timeout=1, repeat=True)
lock = threading.Lock()
lock.acquire()

def stuck():
    lock.acquire()          # never released: simulated hang

t = threading.Thread(target=stuck, name="stuck", daemon=True); t.start()
time.sleep(2.5)
faulthandler.cancel_dump_traceback_later()
print("main done")
```

```text
$ python later.py
Timeout (0:00:01)!
Thread 0x0000ffffba1f3140 [stuck] (most recent call first):
  File "/root/py/ch05/later.py", line 7 in stuck
  File ".../threading.py", line 1161 in run
  ...

Thread 0x0000ffffbb05c440 [python] (most recent call first):
  File "/root/py/ch05/later.py", line 10 in <module>
Timeout (0:00:01)!
...
main done
```

2.5초 동안 1초 간격으로 두 번 덤프됐고, 스레드 이름(`[stuck]`)과 멈춘 줄이 함께 나왔습니다. 문서에 따르면 다시 호출하면 타이머가 초기화되므로, 작업 단위마다 `dump_traceback_later()`를 다시 불러 "작업 하나가 N초를 넘으면 덤프"하는 감시견으로 씁니다. `exit=True`를 주면 덤프 후 `_exit()`로 즉시 종료합니다.

## tracemalloc — 메모리 할당 추적

메모리가 계속 는다는 사실만으로는 누가 늘리는지 모릅니다. `tracemalloc`은 파이썬 메모리 할당기를 거치는 모든 블록에 "어느 줄에서 할당했나"라는 꼬리표를 붙입니다. 요청마다 1000바이트를 캐시에 넣고 지우지 않는 `leak.py`로 확인합니다.

```python title="leak.py"
import tracemalloc

class Cache:
    def __init__(self):
        self._store = {}
    def set(self, key, value):
        self._store[key] = value          # never evicted

cache = Cache()

def handle(i):
    payload = bytearray(1000)
    cache.set(f"req-{i}", payload)

tracemalloc.start(25)
for i in range(100):          # warm-up
    handle(i)
snap1 = tracemalloc.take_snapshot()
for i in range(100, 1100):
    handle(i)
snap2 = tracemalloc.take_snapshot()

print("== top 3 by lineno (snap2)")
for stat in snap2.statistics("lineno")[:3]:
    print(stat)
print("== compare_to(snap1, 'lineno') top 3")
for stat in snap2.compare_to(snap1, "lineno")[:3]:
    print(stat)
print("== statistics('traceback')[0]")
stat = snap2.statistics("traceback")[0]
print(f"{stat.count} blocks, {stat.size / 1024:.1f} KiB")
for line in stat.traceback.format()[-6:]:
    print(line)
cur, peak = tracemalloc.get_traced_memory()
print(f"traced current={cur} peak={peak}")
```

```text
== top 3 by lineno (snap2)
/root/py/ch05/leak.py:12: size=1178 KiB, count=2200, average=548 B
/root/py/ch05/leak.py:13: size=51.6 KiB, count=1100, average=48 B
/root/py/ch05/leak.py:7: size=25.4 KiB, count=1, average=25.4 KiB
```

12번 줄(`bytearray(1000)`)이 1100번 호출에 2200개 블록, 1178 KiB로 1위입니다. 블록은 호출당 2개, 평균 548 B였습니다. 13번 줄은 f-string 키(블록당 48 B), 7번 줄은 커지는 dict의 테이블 하나입니다. [`Statistic` 문서](https://docs.python.org/3.15/library/tracemalloc.html#tracemalloc.Statistic)대로 `size`는 지금 살아 있는 블록 크기의 합이고 `count`는 블록 수입니다. 누적 할당량이나 객체 수가 아닙니다.

### 누수 진단 — 두 시점 비교

한 시점의 순위는 "원래 큰 것"과 "자라는 것"을 구분하지 못합니다. 예열 뒤 스냅숏과 1000번 더 돈 뒤 스냅숏을 `compare_to()`로 비교합니다.

```text
== compare_to(snap1, 'lineno') top 3
/root/py/ch05/leak.py:12: size=1178 KiB (+1071 KiB), count=2200 (+2000), average=548 B
/root/py/ch05/leak.py:13: size=51.6 KiB (+47.0 KiB), count=1100 (+1000), average=48 B
/root/py/ch05/leak.py:7: size=25.4 KiB (+22.2 KiB), count=1 (+0), average=25.4 KiB
```

1000번 돌린 사이 12번 줄이 +1071 KiB(+2000 블록)입니다. 1000으로 나누면 요청당 약 1.07 KiB가 남았습니다. 7번 줄은 `count`가 그대로(+0)이고 `size`만 +22.2 KiB입니다. dict의 블록 하나가 더 큰 블록 하나로 바뀌었습니다. 순증가가 곧 누수라는 뜻은 아닙니다. 예열 없이 첫 스냅숏을 찍으면 캐시·지연 import 같은 일회성 할당이 섞이므로, 같은 작업을 반복해 증가가 *계속되는지* 봅니다.

### 콜스택 보기

같은 줄이라도 호출 경로가 여럿이면 어느 경로가 문제인지 알아야 합니다. `start(25)`로 프레임을 25개까지 보관했으므로 `statistics('traceback')`이 경로별로 묶어 줍니다.

```text
== statistics('traceback')[0]
2000 blocks, 1071.3 KiB
  File "/root/py/ch05/leak.py", line 20
    handle(i)
  File "/root/py/ch05/leak.py", line 12
    payload = bytearray(1000)
traced current=1412025 peak=1553334
```

1위 경로는 20번 줄(두 번째 루프)에서 온 2000 블록입니다. 예열 루프(17번 줄)에서 온 200 블록은 경로가 달라 따로 묶였습니다. `lineno` 통계의 1178 KiB가 이 둘의 합입니다.

### 환경 변수로

코드를 고치지 않고 켜려면 [`PYTHONTRACEMALLOC`](https://docs.python.org/3.15/using/cmdline.html#envvar-PYTHONTRACEMALLOC)을 씁니다. 값은 traceback마다 보관할 최대 프레임 수입니다. 3장에서 본 것처럼 이 변수를 켜면 "coroutine never awaited" 경고에 `Object allocated at` 스택이 붙습니다.

```bash
PYTHONTRACEMALLOC=10 python myapp.py
```

추적 범위에는 한계가 있습니다. 문서는 tracemalloc을 "파이썬이 할당한 메모리 블록"을 추적하는 도구로 정의하고, `take_snapshot()` 설명에서 추적 시작 전에 할당된 블록은 스냅숏에 들어가지 않는다고 적습니다.

## objgraph — 객체 참조 그래프

tracemalloc은 "어디서 할당했나"를 알려 주지만 "왜 아직 살아 있나"는 알려 주지 않습니다. 객체가 GC되지 않는 이유는 누군가 참조를 쥐고 있기 때문이고, [objgraph](https://mg.pov.lt/objgraph/)는 그 참조 사슬을 따라갑니다. 잃어버린 열쇠를 찾을 때 "마지막으로 누가 만졌나"를 거꾸로 추적하는 것과 같습니다. 이벤트 리스너 목록에 들어간 클로저가 세션을 붙잡는 `objg.py`입니다.

```python title="objg.py"
import gc, objgraph

class MySession:
    def __init__(self, sid):
        self.sid = sid

_listeners = []

def on_event(session):
    _listeners.append(lambda evt: (session, evt))   # closure keeps session alive

objgraph.show_growth(limit=3)
print("--")
for i in range(200):
    on_event(MySession(i))
objgraph.show_growth(limit=3)
print("--")
objgraph.show_most_common_types(limit=5)
print(f"{objgraph.count('MySession')} sessions alive")

def inspect_one():
    one = objgraph.by_type("MySession")[0]
    objgraph.show_backrefs([one], max_depth=5, filename="leak.dot")
    chain = objgraph.find_backref_chain(one, objgraph.is_proper_module)
    print(" -> ".join(type(x).__name__ for x in chain))

inspect_one()
```

```text
$ python objg.py
function     2185     +2185
dict         1718     +1718
tuple        1226     +1226
--
function      2385      +200
cell           411      +200
MySession      200      +200
--
function                   2385
dict                       1718
tuple                      1418
wrapper_descriptor         1157
builtin_function_or_method 914
200 sessions alive
Graph written to leak.dot (6 nodes)
module -> dict -> list -> function -> tuple -> cell -> MySession
```

첫 `show_growth()`는 기준점이라 모든 타입이 "증가"로 나옵니다. 두 번째 호출이 진짜 정보입니다. 200번 호출 사이에 `function`·`cell`·`MySession`이 정확히 200개씩 늘었습니다. 클로저 하나(`function`)가 셀 하나(`cell`)로 세션 하나를 붙잡는 구조가 숫자로 드러납니다. `show_most_common_types()`는 전체 개수 순위라서 `MySession`이 상위 5위 밖이었습니다. 누수 찾기에는 증가량을 보는 `show_growth()`가 맞습니다.

`find_backref_chain()`은 모듈에서 세션까지 이어지는 참조 사슬을 찾습니다. 결과 `module → dict → list → function → tuple → cell → MySession`을 `leak.dot`의 노드 이름과 맞춰 읽으면, 모듈 전역 공간(`dict`)의 `_listeners` 리스트가 `objg.py` 10번 줄의 lambda를 쥐고, lambda의 `__closure__` 튜플 안 셀이 세션을 붙잡고 있습니다. 첫 시도에서는 진단용으로 만든 전역 리스트(`leaked = [...]`)가 사슬에 끼어들어 `module → dict → list → MySession`이라는 엉뚱한 답이 나왔습니다. 조사용 참조는 위의 `inspect_one()`처럼 함수 안에 가둡니다. objgraph 문서에 따르면 그림을 그리려면 graphviz가 필요하고, 이 게스트에는 graphviz를 설치하지 않아 `.dot` 파일(6노드)까지만 만들었습니다.

### 누수 패턴 셋

위 예제가 셋 중 세 번째입니다. 나머지 둘도 같은 방법(`show_growth()`로 늘어나는 타입 찾기, `find_backref_chain()`으로 붙잡는 쪽 찾기)으로 접근합니다.

1. **전역 캐시에 키 누적** — tracemalloc 예제의 `Cache._store`처럼 지우는 경로가 없는 `dict`.
2. **클로저가 객체를 캡처** — 콜백이 `self`나 세션을 셀에 붙잡음.
3. **리스너 미해제** — 등록만 하고 해제하지 않는 전역 목록.

## gc 모듈로 강제 수집·통계

순환 참조는 참조 카운트만으로는 안 풀리고 순환 GC가 수집합니다. `gc` 모듈은 이 수집기를 직접 부르고 상태를 봅니다.

```python
import gc

gc.collect()          # 즉시 전체 수집
print(gc.get_count()) # 세대별 카운터
print(gc.get_stats()) # 세대별 통계
```

[`gc.DEBUG_SAVEALL` 문서](https://docs.python.org/3.15/library/gc.html#gc.DEBUG_SAVEALL)는 이 플래그를 켜면 도달 불가능한 객체를 *해제하지 않고* `gc.garbage`에 넣는다고 적습니다. 즉 이 모드의 `gc.garbage`에는 원래 정상적으로 수집될 객체도 들어갑니다. 자기 자신을 참조하는 `Node`로 확인했습니다.

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

출력은 `saved=True`, `released=True`입니다. SAVEALL 때문에 `gc.garbage`에 남았던 순환이, 플래그를 되돌리고 목록을 비운 뒤의 수집에서 회수됐습니다. SAVEALL로 모은 목록을 "수집 불가능한 누수 목록"으로 읽으면 틀립니다. 진단이 끝나면 플래그와 `gc.garbage`를 원래대로 돌립니다.

## memory_profiler — 줄 단위

memory_profiler는 함수의 줄마다 프로세스 메모리가 얼마나 변했는지 보여 줍니다. [PyPI의 0.61.0 설명](https://pypi.org/project/memory-profiler/)은 기본 백엔드 `psutil`이 RSS(Resident Set Size)를 잰다고 적고, 첫머리에 "더 이상 활발히 유지보수하지 않는다"고 밝힙니다.

```python title="memprof.py"
from memory_profiler import profile

@profile
def load_data():
    a = [0] * 10**7
    b = list(range(10**6))
    del a
    return b

load_data()
```

```text
$ python -m memory_profiler memprof.py
Filename: memprof.py

Line #    Mem usage    Increment  Occurrences   Line Contents
=============================================================
     3     34.7 MiB     34.7 MiB           1   @profile
     4                                         def load_data():
     5    111.0 MiB     76.3 MiB           1       a = [0] * 10**7
     6    149.2 MiB     38.2 MiB           1       b = list(range(10**6))
     7     72.9 MiB    -76.3 MiB           1       del a
     8     72.9 MiB      0.0 MiB           1       return b
```

5번 줄의 +76.3 MiB는 포인터 10⁷개(8바이트씩 80,000,000바이트)와 맞아떨어집니다. `del a` 뒤에 같은 양이 RSS에서 빠진 것도 보입니다. RSS는 프로세스 전체의 상주 메모리이므로 파이썬 할당기 밖의 메모리도 포함합니다. 반대로 어느 객체가 그 메모리를 쓰는지는 알려 주지 않습니다. 둘을 같이 씁니다.

## 직접 확인 — 순증가·해제와 명시적 덤프

앞 절들이 "어디서 자라는가"를 봤다면, 아래 두 파일은 tracemalloc 비교의 *방향*과 faulthandler 명시 덤프를 가장 작은 형태로 확인합니다.

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

출력은 `payload_bytes=32768`, `growth_positive=True`, `release_negative=True`입니다. 할당 줄의 `size_diff`가 할당 뒤에는 양수, 해제 뒤에는 음수로 바뀌었습니다. 32768은 페이로드 길이의 합이고 tracemalloc이 잰 크기가 아닙니다.

```python title="traceback-check.py"
import faulthandler

def capture():
    faulthandler.dump_traceback(all_threads=True)

capture()
print("traceback captured")
```

```text
$ python traceback-check.py
Current thread 0x0000ffff966d0440 [python] (most recent call first):
  File "/root/py/ch05/traceback-check.py", line 4 in capture
  File "/root/py/ch05/traceback-check.py", line 6 in <module>
traceback captured
```

`dump_traceback()`은 크래시 없이 지금 스택을 찍고 계속 진행합니다. 로그에 "여기 지나갔다"를 스택과 함께 남길 때 씁니다.

## GDB py-bt — C 레벨에서 파이썬 스택 읽기

C 확장 안에서 멈췄거나 코어 덤프만 남았다면 GDB로 들어가야 합니다. 그런데 GDB가 보여 주는 것은 `_PyEval_EvalFrameDefault` 같은 인터프리터 C 함수뿐입니다. [Debugging C API extensions and CPython Internals with GDB](https://docs.python.org/3.15/howto/gdb_helpers.html) 문서의 `python-gdb.py` 확장은 그 C 프레임 안의 파이썬 프레임을 꺼내 `py-bt`, `py-list`, `py-locals` 같은 명령으로 보여 줍니다. 문서는 Debian/Ubuntu에서 `gdb`와 `python3-dbg` 패키지를 설치하라고 안내하고, debuginfod가 심볼은 받아 와도 이 확장 자체는 설치하지 않는다고 적습니다.

Debian 13에서 `python3.13-dbg`를 설치하니 `/usr/share/gdb/auto-load/usr/bin/python3.13-gdb.py`가 생겼고, 같은 패키지의 `/usr/lib/debug/.build-id/9e/7f76...debug`가 strip된 `/usr/bin/python3.13`의 build-id(`9e7f76da...`)와 맞는 디버그 심볼이었습니다. 4장의 교착 상태 `hung.py`를 `/usr/bin/python3.13`으로 띄우고 붙었습니다.

```text
$ gdb -p 3586 -batch -ex 'thread apply all py-bt'
Thread 4 (Thread 0xffffb48b3160 (LWP 3588) "python3.13"):
Traceback (most recent call first):
  <built-in method __enter__ of _thread.lock object at remote 0xffffb4943410>
  File "/root/py/ch05/hung.py", line 9, in transfer
    with second:            # never gets here: the other thread holds it
  File "/usr/lib/python3.13/threading.py", line 994, in run
    self._target(*self._args, **self._kwargs)
  ...
Thread 3 (Thread 0xffffb40a3160 (LWP 3589) "python3.13"):
Traceback (most recent call first):
  <built-in method __enter__ of _thread.lock object at remote 0xffffb4943490>
  File "/root/py/ch05/hung.py", line 9, in transfer
  ...
Thread 1 (Thread 0xffffb4ea0ba0 (LWP 3586) "python3.13"):
Traceback (most recent call first):
  File "/usr/lib/python3.13/threading.py", line 1094, in join
    self._handle.join(timeout)
  File "/root/py/ch05/hung.py", line 21, in <module>
    t1.join()
```

py-spy와 같은 결론이 GDB 안에서 나왔고, 맨 위에 C로 구현된 `lock.__enter__`에서 막혀 있다는 정보가 더 붙었습니다. `py-up`으로 파이썬 프레임을 옮긴 뒤 `py-list`와 `py-locals`를 쓰면 소스와 지역 변수가 보입니다.

```text
$ gdb -p 3629 -batch -ex 'thread 3' -ex 'py-up' -ex 'py-list' -ex 'py-locals'
   6    def transfer(first, second, name):
   7        with first:
   8            time.sleep(0.1)
  >9            with second:            # never gets here: the other thread holds it
  10                print(name, "done")
Locals for transfer
first = <_thread.lock at remote 0xffff85c13410>
second = <_thread.lock at remote 0xffff85c13490>
name = 't2'
```

(같은 프로그램을 다시 띄운 별도 실행이라 PID와 주소가 위와 다릅니다. `py-list`의 앞뒤 몇 줄과 `py-locals`의 바깥 프레임 출력은 줄였습니다.) 확장이 로드되지 않으면 `py-bt`가 없습니다. `set auto-load python-scripts off`로 막고 실행하면 `Undefined command: "py-bt".`가 나왔습니다. 명령이 없을 때는 `info auto-load python-scripts`로 스크립트가 로드됐는지부터 봅니다. GDB 자체의 사용법은 [GDB and LLDB 시리즈](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install)를 참고합니다.

## sys.remote_exec — 실행 중인 프로세스에 코드 넣기 (3.14+)

1장의 `pdb -p`가 쓰고 2장의 `debugpy --pid`가 먼저 시도하는 것이 [PEP 768](https://peps.python.org/pep-0768/)의 [`sys.remote_exec(pid, script)`](https://docs.python.org/3.15/library/sys.html#sys.remote_exec)입니다. 문서에 따르면 이 함수는 즉시 반환하고, 대상의 메인 스레드가 "시그널을 처리하듯" 다음 기회에 스크립트 파일을 실행합니다. 언제 실행됐는지 알려 주는 인터페이스는 없고, 양쪽은 같은 major.minor 버전이어야 합니다. 1초에 열 번씩 카운터를 올리는 `remote.py`에 카운터를 읽는 스크립트를 넣었습니다.

```python title="inject.py"
import sys
code = "import __main__, sys\nprint(f'[injected] requests={__main__.state[\"requests\"]} modules={len(sys.modules)}', flush=True)\n"
open("/root/py/ch05/probe.py", "w").write(code)
sys.remote_exec(int(open("/root/py/ch05/remote.pid").read()), "/root/py/ch05/probe.py")
print("remote_exec returned", flush=True)
```

```text
$ python inject.py
remote_exec returned
# stdout of remote.py
[injected] requests=10 modules=32
```

주입한 코드는 대상 프로세스 안에서 돌아 `state`를 읽었습니다. 처음에는 `state`를 전역 이름으로 바로 썼다가 대상 쪽에 `NameError: name 'state' is not defined`가 찍혔습니다. 스크립트는 `__main__`의 전역 공간에서 실행되지 않았고, `import __main__`으로 접근해야 했습니다. 대상은 이후에도 정상 종료했습니다.

이 기능은 강력한 만큼 막는 방법도 알아 둡니다. 1장에서 본 것처럼 `PYTHON_DISABLE_REMOTE_DEBUG=1`이나 `-X disable-remote-debug`로 끄고, 권한은 [원격 디버깅 문서의 Permission requirements 절](https://docs.python.org/3.15/howto/remote_debugging.html#permission-requirements)을 따릅니다. 같은 목적의 외부 패키지 pyrasite도 PyPI에 있지만("Inject code into a running Python process") 이 글에서는 실행하지 않았습니다.

## 시리즈 정리

이 시리즈 5장에서 다룬 도구입니다. "필요한 준비"는 각 장에서 실제로 확인한 조건입니다.

| 도구 | 역할 | 필요한 준비 |
|------|------|------|
| `pdb` / `ipdb` | 코드 안 BP, post-mortem | 같은 프로세스와 입력 터미널. `-p`는 3.14+와 ptrace 권한 |
| `debugpy` | IDE 디버깅, 원격 attach | `listen` 포트(무인증) 또는 `--pid`와 ptrace 권한 |
| asyncio 디버그 모드·`asyncio ps/pstree` | 생성 위치, slow callback, Task 대기 사슬 | 환경 변수 / 3.14+와 ptrace 권한 |
| `py-spy` | 외부 샘플링·스택 dump | ptrace 권한(Linux), root(macOS) |
| `faulthandler` | 세그폴트·멈춤 시 traceback | 코드, `-X faulthandler`, 또는 환경 변수 |
| `tracemalloc` | 할당 위치 추적 | 코드 또는 `PYTHONTRACEMALLOC` |
| `objgraph` | 참조 사슬 추적 | 코드 안, 그림은 graphviz |
| `memory_profiler` | 줄별 RSS | 데코레이터. 유지보수 중단 상태 |
| GDB `py-bt` | C 레벨에서 파이썬 스택 | `python3-dbg` 계열 패키지와 ptrace 권한 |
| `sys.remote_exec` | 실행 중 프로세스에 코드 주입 | 3.14+, 같은 버전, ptrace 권한 |

선택 기준입니다.

- *개발 중 멈춰 보기* → `breakpoint()` + `pdb`/`ipdb`/`debugpy`.
- *운영 서비스가 멈춤* → `py-spy dump` 먼저, asyncio면 `python -m asyncio pstree`도.
- *세그폴트* → `-X faulthandler`로 파이썬 위치, 더 깊이는 코어 덤프 + GDB `py-bt`.
- *메모리 누수* → `tracemalloc` 두 스냅숏 비교로 줄을 찾고, `objgraph.show_growth`·`find_backref_chain`으로 붙잡는 참조를 찾음.
- *비동기 버그* → `PYTHONASYNCIODEBUG=1` + 호출 그래프.

## 정리

- faulthandler는 `-X faulthandler` 하나로 세그폴트 순간의 파이썬 스택을 남기고, 3.14+에서는 C 스택도 붙습니다. `register()`·`dump_traceback_later()`로 멈춤도 진단합니다.
- tracemalloc의 `size`·`count`는 현재 살아 있는 블록입니다. 예열 뒤 두 스냅숏의 `compare_to()`로 요청당 순증가를 구합니다.
- objgraph는 `show_growth()`의 증가량과 `find_backref_chain()`의 참조 사슬로 "왜 살아 있나"에 답합니다.
- `DEBUG_SAVEALL`의 `gc.garbage`는 정상 수집될 객체까지 담습니다.
- memory_profiler는 RSS를 재므로 C 확장 할당까지 보이지만 어느 객체인지는 모릅니다. 유지보수가 중단된 패키지입니다.
- GDB `py-bt`는 `python3-dbg` 계열의 `python-gdb.py`와 디버그 심볼이 있어야 동작합니다.

## 관련 항목 (시리즈 전체)

- [Ch 1: pdb 기본](/blog/tools/debugging/python/chapter01-pdb-basics)
- [Ch 2: debugpy / IDE](/blog/tools/debugging/python/chapter02-debugpy-ide)
- [Ch 3: asyncio 디버깅](/blog/tools/debugging/python/chapter03-asyncio)
- [Ch 4: py-spy 샘플링](/blog/tools/debugging/python/chapter04-py-spy)
- [GDB and LLDB 시리즈](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install) — C 확장은 GDB로
- [Valgrind Memcheck](/blog/tools/debugging/valgrind/chapter02-memcheck) — C/C++ 확장의 잘못된 메모리 접근을 확인하는 별도 도구

## 외부 자료

- [`tracemalloc` 공식 문서 (3.15)](https://docs.python.org/3.15/library/tracemalloc.html)
- [`faulthandler` 공식 문서 (3.15)](https://docs.python.org/3.15/library/faulthandler.html)
- [Debugging C API extensions and CPython Internals with GDB](https://docs.python.org/3.15/howto/gdb_helpers.html)
- [objgraph 문서](https://mg.pov.lt/objgraph/)
