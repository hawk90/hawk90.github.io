---
title: "Ch 3: asyncio 디버깅 — 짧은 콜스택과 slow callback"
date: 2025-08-21T03:00:00
description: "코루틴 콜스택 추적, asyncio debug=True, slow callback, race condition."
tags: [python, debugging, asyncio]
series: "Python Debugging"
seriesOrder: 3
draft: false
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

해결: `asyncio` 디버그 모드.

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
4. 컨텍스트 누수 검출.

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

`asyncio.all_tasks()`로 현재 태스크 목록을 얻은 뒤 각 태스크의 `get_stack()`을 호출.

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

데드락·hung 상태일 때 가장 빠른 진단.

## debugpy + asyncio

`debugpy`는 `asyncio` 콜스택을 잘 표현합니다 — VSCode의 *Call Stack* 패널에 awaiter 체인이 합성되어 나옵니다.

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

태스크가 죽으면 *어디서도* 보고되지 않습니다(태스크가 GC될 때 경고만 뜸). 해법.

```python
task = asyncio.create_task(do_work())
task.add_done_callback(lambda t: t.exception() and log.exception("task failed", exc_info=t.exception()))
```

또는 `asyncio.gather(*tasks)`로 명시적으로 await.

### 3. cancellation 중 cleanup 실패

```python
async def work():
    conn = await db.connect()
    try:
        await use(conn)
    finally:
        await conn.close()        # ← cancellation 중에는 await가 즉시 CancelledError
```

해법: `asyncio.shield`로 cleanup 보호.

```python
finally:
    await asyncio.shield(conn.close())
```

또는 동기 cleanup을 별도 메서드로.

### 4. event loop 충돌

```python
asyncio.run(main())                # 새 루프
asyncio.run(main())                # ← RuntimeError: Event loop is closed
```

`asyncio.run`은 매번 새 루프를 만들고 닫습니다. 여러 번 호출하면 에러. 보통 진입점이 한 번이라 문제 없지만, *테스트 코드*에서 자주 만남.

```python
# pytest-asyncio가 알아서 처리
@pytest.mark.asyncio
async def test_something():
    ...
```

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
- debugpy가 코루틴 awaiter 체인을 IDE에 합성해 보여 준다.
- fire-and-forget 태스크의 예외는 명시적으로 캡처.
- 운영 콘솔은 `aiomonitor`.
- 프로파일링은 `yappi` (wall-clock 모드).

## 다음 장 예고

Ch 4 — `py-spy` 샘플링 프로파일러. 운영 프로세스의 콜스택을 *수정 없이* 1초 만에 캡처하는 도구.

## 관련 항목

- [Ch 2: debugpy / IDE](/blog/tools/debugging/python/chapter02-debugpy-ide)
- [Ch 4: py-spy 샘플링](/blog/tools/debugging/python/chapter04-py-spy)
- [GDB Ch 6: 멀티스레드 / 멀티프로세스](/blog/tools/debugging/gdb-lldb/chapter06-multithread-multiprocess)
- [PEP 567 — Context Variables](https://peps.python.org/pep-0567/)
- [`asyncio` 디버그 모드 문서](https://docs.python.org/3/library/asyncio-dev.html)
