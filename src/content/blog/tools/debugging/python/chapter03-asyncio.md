---
title: "asyncio 디버깅 — 짧은 콜스택과 slow callback 추적"
slug: "tools/debugging/python/chapter03-asyncio"
date: 2026-05-30T09:03:00
description: "코루틴 콜스택 추적, asyncio debug=True, slow callback, race condition."
tags: [python, debugging, asyncio]
series: "Python Debugging"
seriesOrder: 3
draft: false
topics: ["tools", "tools/debugging"]
---

`asyncio` 코드를 평소 디버거(`pdb`/`debugpy`)로 멈춰 보면 콜스택이 *이상하게 짧습니다*. `await`를 만난 순간 코루틴 컨텍스트는 이벤트 루프로 돌아가고, 다음 깨어남에서 *새로운 콜스택*으로 시작합니다. 이 장은 비동기 코드만의 함정과 도구를 다룹니다.

## 짧은 콜스택 문제

```python
async def fetch_user(uid):
    async with session.get(url) as resp:
        return await resp.json()    # ← 여기서 멈춤

async def handle(req):
    user = await fetch_user(req.uid)
    return user

# 호출 트리: handle → fetch_user → session.get
```

`fetch_user`에서 정지하면 콜스택에 `handle`이 *없을 수 있습니다*. await 지점이 yield point가 되어 호출자의 스택이 잠시 사라졌다가 깨어남에서 복원되기 때문입니다.

디버그 모드는 생성 위치와 느린 콜백을 진단하는 보조 수단입니다. 켠다고 모든 태스크의 논리적 await 호출 체인을 일반 스레드 콜스택으로 복원하지는 않습니다.

## asyncio.run(..., debug=True)

```python
asyncio.run(main(), debug=True)
```

또는 환경 변수로.

```bash
$ PYTHONASYNCIODEBUG=1 python main.py
```

활성화되면.

1. *코루틴 생성 위치*가 트레이스백에 포함됨.
2. `await` 안 한 코루틴 경고.
3. *slow callback* 경고 (100 ms 이상 동기 블록).
4. 일부 비스레드 안전 API를 잘못된 스레드에서 호출한 경우의 진단.

```text
Task was destroyed but it is pending!
task: <Task pending name='Task-3' coro=<fetch_user() running at app.py:12>>
created at:
  File "app.py", line 30, in start
    asyncio.create_task(fetch_user(42))
```

생성 위치(`File "app.py", line 30`)가 핵심. 디버그 모드 아니면 이 정보가 안 떠 추적이 매우 어려움.

## "coroutine never awaited"

```python
async def save(data): ...

def handler(req):
    save(req.data)             # ← await 없음! 그냥 함수처럼 호출
    return "ok"
```

```text
RuntimeWarning: coroutine 'save' was never awaited
```

이 경고는 디버그 모드든 아니든 뜨지만, `tracemalloc`을 켜면 *코루틴이 생성된 정확한 위치*까지 보여 줍니다.

```bash
$ PYTHONTRACEMALLOC=10 python main.py
```

## slow callback 검출

이벤트 루프는 *모든* 동기 블록이 짧다고 가정합니다. CPU 무거운 동기 호출이 끼면 다른 태스크가 모두 멈춥니다.

```python
async def handle(req):
    img = compute_thumbnail(req.image)    # ← 500 ms 걸리는 동기 작업
    return img
```

디버그 모드에서.

```text
Executing <Task ...> took 0.523 seconds
```

해법.

- `asyncio.to_thread(compute_thumbnail, req.image)` — 별도 스레드로.
- `loop.run_in_executor(None, ...)` — 동일.
- 진짜 CPU 바운드면 `ProcessPoolExecutor`.

## 콜스택 보기 — Task.get_stack

현재 루프에서 끝나지 않은 태스크를 all_tasks()로 열거하고 get_stack()을 확인합니다. 중단된 코루틴은 한 스택 프레임만 반환하므로 이를 전체 awaiter 체인으로 간주하지 않습니다. [Task.get_stack](https://docs.python.org/3.15/library/asyncio-task.html#asyncio.Task.get_stack)의 반환 범위를 확인합니다.

```python
import asyncio, traceback

async def dump_tasks():
    for t in asyncio.all_tasks():
        print(f"=== {t.get_name()} ===")
        for frame in t.get_stack():
            traceback.print_stack(frame, limit=5)
```

이 함수를 SIGUSR1 핸들러로 등록하면 *외부에서* 모든 태스크의 콜스택을 덤프할 수 있습니다.

```python
import signal

def dump(_sig, _frame):
    asyncio.get_running_loop().create_task(dump_tasks())

signal.signal(signal.SIGUSR1, dump)
```

```bash
$ kill -USR1 <pid>
[stdout에 모든 태스크 콜스택 출력]
```

이벤트 루프가 콜백을 실행할 수 있을 때의 진단입니다. 루프가 동기 호출에 막혀 있으면 예약한 dump 태스크도 실행되지 않으므로 별도 faulthandler나 외부 스택 덤프와 구분합니다.

## debugpy + asyncio

debugpy에서 비동기 코드를 멈출 수 있지만 모든 중단 태스크의 awaiter 체인을 항상 합성한다고 보장하지 않습니다. 아래는 디버그 모드를 켜는 launch 설정이며 IDE의 태스크 표시 범위는 실제 Python·debugpy·확장 버전에서 확인합니다.

```json
{
  "type": "debugpy",
  "request": "launch",
  "program": "main.py",
  "env": { "PYTHONASYNCIODEBUG": "1" }
}
```

VSCode 측에서 *Pause* 버튼이 의외로 유용 — 멈춰서 모든 코루틴 상태를 볼 수 있습니다.

## 자주 보이는 버그 패턴

### 1. `gather()`의 예외 무시

```python
results = await asyncio.gather(
    fetch_a(), fetch_b(), fetch_c(),
    return_exceptions=True
)
# results에 Exception 객체가 섞여 있을 수 있음
for r in results:
    if isinstance(r, Exception):
        log.exception("failed", exc_info=r)
```

`return_exceptions=False`(기본)면 한 코루틴이 죽었을 때 *나머지가 어떻게 됐는지*가 모호. 명시적으로 처리.

### 2. fire-and-forget Task의 예외 사라짐

```python
asyncio.create_task(do_work())     # ← 결과·예외가 어디로?
```

예외를 회수하지 않은 태스크는 event loop의 예외 처리 경로로 보고될 수 있습니다. 보고 시점을 GC에 의존하지 않으려면 태스크를 보관하고 결과를 await하거나 완료 콜백에서 확인합니다. 취소된 태스크에는 exception()이 CancelledError를 발생시키므로 따로 처리합니다.

```python
task = asyncio.create_task(do_work())
def report_task(t):
    if t.cancelled():
        return
    exc = t.exception()
    if exc is not None:
        log.error("task failed", exc_info=(type(exc), exc, exc.__traceback__))

task.add_done_callback(report_task)
```

또는 `asyncio.gather(*tasks)`로 명시적으로 await.

### 3. cancellation 중 cleanup 실패

```python
async def work():
    conn = await db.connect()
    try:
        await use(conn)
    finally:
        await conn.close()        # 단일 취소를 finally에서 처리하며 await 가능
```

취소가 한 번 전달된 뒤 finally 안에서 await하는 것 자체가 즉시 실패하는 것은 아닙니다. 추가 취소가 정리 중에 다시 들어오는 상황과 구분합니다. shield는 내부 작업을 외부 취소로부터 보호하지만 호출자에게 오는 CancelledError까지 없애거나 정리 완료를 자동 대기하는 보장은 아닙니다.

```python
finally:
    await asyncio.shield(conn.close())
```

또는 동기 cleanup을 별도 메서드로.

### 4. event loop 충돌

```python
asyncio.run(main())                # 새 루프에서 실행하고 닫음
asyncio.run(main())                # 순차 호출 자체는 허용됨
```

asyncio.run의 순차 호출은 허용됩니다. 같은 스레드에서 이미 실행 중인 이벤트 루프 안에서 중첩 호출하면 RuntimeError가 납니다. 이전 루프에 종속된 세션·Future·자원을 다음 루프에서 재사용하는 문제도 별개입니다. [Runner 문서](https://docs.python.org/3.15/library/asyncio-runner.html#running-an-asyncio-program)를 기준으로 구분합니다.

```python
# pytest-asyncio가 알아서 처리
@pytest.mark.asyncio
async def test_something():
    ...
```

## 직접 확인 — 순차 실행과 중첩 실행

다음 세 파일은 CPython 3.15.0·macOS에서 실행했습니다. 외부 라이브러리를 설치하지 않습니다. 첫 파일은 순차 run 두 번과 실행 중인 루프 안의 중첩 호출을 구분합니다.

```python title="runners.py"
import asyncio

async def value():
    return 1

print(f"sequential={asyncio.run(value())},{asyncio.run(value())}")

async def nested():
    coro = value()
    try:
        asyncio.run(coro)
    except RuntimeError:
        print("nested=blocked")
    finally:
        coro.close()

asyncio.run(nested())
```

결과는 sequential=1,1과 nested=blocked입니다. 생성해 둔 coro는 중첩 호출에서 소비되지 않으므로 finally에서 닫아 never-awaited 경고를 만들지 않습니다.

## 직접 확인 — 취소 뒤 finally의 await

두 번째 파일은 태스크가 대기에 들어간 뒤 취소를 한 번 전달합니다. 취소가 작업을 중단시켜도 finally의 비동기 정리가 완료되는지 확인합니다.

```python title="cancellation.py"
import asyncio

async def main():
    started = asyncio.Event()
    cleaned = asyncio.Event()
    async def worker():
        try:
            started.set()
            await asyncio.Future()
        finally:
            await asyncio.sleep(0)
            cleaned.set()
    task = asyncio.create_task(worker())
    await started.wait()
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        print(f"cleanup={cleaned.is_set()}")

asyncio.run(main())
```

출력은 cleanup=True입니다. 반복 취소나 외부 I/O 장애까지 이 한 예제로 해결했다고 판단하지 않습니다.

## 직접 확인 — await 사이의 갱신 유실

단일 스레드의 이벤트 루프에서도 읽기와 쓰기 사이에 await가 있으면 다른 태스크가 같은 값을 읽을 수 있습니다. 세 번째 파일은 같은 입력을 잠금 없이, 잠금 안에서 각각 실행합니다.

```python title="race.py"
import asyncio

async def count(use_lock):
    total = 0
    lock = asyncio.Lock()
    async def increment():
        nonlocal total
        if use_lock:
            async with lock:
                old = total
                await asyncio.sleep(0)
                total = old + 1
        else:
            old = total
            await asyncio.sleep(0)
            total = old + 1
    await asyncio.gather(increment(), increment())
    return total

async def main():
    print(f"unlocked={await count(False)}")
    print(f"locked={await count(True)}")

asyncio.run(main(), debug=True)
```

`python3 race.py`는 unlocked=1, locked=2를 출력합니다. 두 태스크가 같은 옛 값을 읽는 지점이 문제이며 debug=True가 경쟁 조건을 자동으로 수정해 주지는 않습니다. 보호 범위는 읽기부터 쓰기까지입니다.

## aiomonitor — 운영 중 콘솔

[aiomonitor](https://github.com/aio-libs/aiomonitor)를 띄우면 동작 중인 이벤트 루프를 *원격 콘솔*로 검사.

```python
import aiomonitor

async def main():
    with aiomonitor.start_monitor(loop=asyncio.get_event_loop()):
        await app()
```

```bash
$ python -m aiomonitor.cli
> ps           # 모든 태스크
> where 42     # 태스크 42의 콜스택
> cancel 42    # 태스크 취소
```

운영 환경에서 *멈춘 듯한* 서비스 진단에 강력합니다.

## yappi / aiomisc — 비동기 프로파일링

평소의 `cProfile`은 *동기* 함수 단위 — 비동기 코드의 *대기*는 보이지 않습니다.

```bash
$ pip install yappi
```

```python
import yappi
yappi.set_clock_type("wall")     # CPU 시간이 아니라 벽시계
yappi.start()
asyncio.run(main())
yappi.stop()
yappi.get_func_stats().save("profile.out", type="callgrind")
```

KCachegrind / qcachegrind로 시각화.

## 정리

- 짧은 콜스택 문제 — `asyncio.run(debug=True)` 또는 `PYTHONASYNCIODEBUG=1`.
- `slow callback` 검출은 디버그 모드만 켜면 자동.
- await 안 한 코루틴은 `tracemalloc=10`으로 생성 위치 추적.
- 모든 태스크 콜스택은 `Task.get_stack()` + SIGUSR1.
- Task.get_stack과 IDE 표시가 모든 논리적 awaiter 체인을 복원한다는 가정은 피합니다.
- fire-and-forget 태스크의 예외는 명시적으로 캡처.
- 운영 콘솔은 `aiomonitor`.
- 프로파일링은 `yappi` (wall-clock 모드).

## 다음 장 예고

Ch 4 — `py-spy` 샘플링 프로파일러. 운영 프로세스의 콜스택을 외부에서 수집하는 도구. 권한과 인터프리터 지원 범위도 확인합니다.

## 관련 항목

- [Ch 2: debugpy / IDE](/blog/tools/debugging/python/chapter02-debugpy-ide)
- [Ch 4: py-spy 샘플링](/blog/tools/debugging/python/chapter04-py-spy)
- [GDB Ch 6: 멀티스레드 / 멀티프로세스](/blog/tools/debugging/gdb-lldb/chapter06-multithread-multiprocess)
- [PEP 567 — Context Variables](https://peps.python.org/pep-0567/)
- [`asyncio` 디버그 모드 문서](https://docs.python.org/3/library/asyncio-dev.html)
