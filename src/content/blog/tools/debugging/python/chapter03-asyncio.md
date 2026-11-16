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

`asyncio` 코드를 디버거로 멈춰 보면 콜스택이 *이상하게 짧을 때가* 있습니다. 분명 `handle()`이 `fetch_user()`를 기다리고 있는데 스택에는 이벤트 루프 함수와 `fetch_user()`만 보입니다. 이 장은 그 이유를 실제 스택으로 확인하고, 디버그 모드와 3.14에 들어온 호출 그래프 도구로 끊어진 연결을 되찾는 방법을 다룹니다.

실행 환경은 1·2장과 같습니다. CPython 3.15.2(uv 빌드)를 Debian 13 arm64 게스트에서 돌렸고, 출력의 표준 라이브러리 경로 `/root/.local/share/uv/python/cpython-3.15.2-linux-aarch64-gnu/lib/python3.15/`는 `LIB/`로, 한 줄이 너무 긴 `repr`의 일부는 `<...>`나 `...`로 줄였습니다. yappi 비교만 macOS에서 3.13.18·3.14.10·3.15.2로 돌렸습니다.

## 짧은 콜스택 문제

먼저 "언제" 짧아지는지 정확히 해 둡니다. 코루틴을 `await`로 *직접* 부르면 호출자와 피호출자는 같은 Task 안에서 중첩된 프레임으로 실행됩니다. 반면 `create_task()`로 띄운 코루틴은 별도 Task라서 이벤트 루프가 처음부터 따로 실행합니다. 택배로 비유하면 직접 `await`는 같은 트럭에 실린 상자이고, Task는 다른 트럭에 실어 보낸 상자입니다. 상자를 열어 본 사람은 자기 트럭에 같이 실린 것만 볼 수 있습니다.

```python title="stack.py"
import asyncio, traceback

async def fetch_user(uid):
    await asyncio.sleep(0)
    print("--- inside fetch_user, sync stack:")
    traceback.print_stack(limit=4)
    return {"uid": uid}

async def handle_direct(uid):
    return await fetch_user(uid)

async def handle_task(uid):
    return await asyncio.create_task(fetch_user(uid))

async def main():
    print("== await fetch_user() directly")
    await handle_direct(1)
    print("== await create_task(fetch_user())")
    await handle_task(2)

asyncio.run(main())
```

```text
$ python stack.py
== await fetch_user() directly
--- inside fetch_user, sync stack:
  File "LIB/asyncio/events.py", line 94, in _run
    self._context.run(self._callback, *self._args)
  File "/root/py/ch03/stack.py", line 17, in main
    await handle_direct(1)
  File "/root/py/ch03/stack.py", line 10, in handle_direct
    return await fetch_user(uid)
  File "/root/py/ch03/stack.py", line 6, in fetch_user
    traceback.print_stack(limit=4)
== await create_task(fetch_user())
--- inside fetch_user, sync stack:
  File "LIB/asyncio/base_events.py", line 682, in run_forever
    self._run_once()
  File "LIB/asyncio/base_events.py", line 2073, in _run_once
    handle._run()
  File "LIB/asyncio/events.py", line 94, in _run
    self._context.run(self._callback, *self._args)
  File "/root/py/ch03/stack.py", line 6, in fetch_user
    traceback.print_stack(limit=4)
```

`await asyncio.sleep(0)`으로 한 번 양보하고 돌아온 뒤에도 직접 `await`한 경우에는 `main → handle_direct → fetch_user`가 모두 보입니다. 짧아지는 쪽은 Task 경계를 넘을 때입니다. 두 번째 경우 `handle_task`는 스택 어디에도 없습니다.

pdb도 같은 스택을 봅니다. 같은 구조에서 `fetch_user` 안의 `breakpoint()`에 멈춰 `w`를 치면 `asyncio.run`부터 `events.py`의 `_run`까지 루프 프레임이 이어지고 바로 `fetch_user`가 나옵니다. 대신 3.14에서 추가된 `$_asynctask` 변수로 지금 어느 Task 안인지는 알 수 있습니다([pdb 문서의 convenience variables](https://docs.python.org/3.15/library/pdb.html#debugger-commands)).

```text
(Pdb) p $_asynctask
<Task pending name='fetch-2' coro=<fetch_user() running at /root/py/ch03/asyncpdb.py:5> cb=[Task.task_wakeup()]>
```

## 3.14+: 호출 그래프로 연결 되찾기

Task 사이의 "누가 누구를 기다리는가"를 일반 스택은 보여 주지 않습니다. 3.14부터는 asyncio가 이 관계를 직접 기록하고 보여 줍니다. [Call graph introspection 문서](https://docs.python.org/3.15/library/asyncio-graph.html)의 `asyncio.print_call_graph()`는 현재 Task의 스택과 그 Task를 기다리는 쪽(*awaited by*)을 함께 출력합니다.

```python title="graph.py"
import asyncio

async def fetch_user(uid):
    await asyncio.sleep(0)
    asyncio.print_call_graph()
    return {"uid": uid}

async def handle_task(uid):
    return await asyncio.create_task(fetch_user(uid), name=f"fetch-{uid}")

asyncio.run(handle_task(2))
```

```text
$ python graph.py
* Task(name='fetch-2', id=0xffff7f7496d0)
  + Call stack:
  |   File 'LIB/asyncio/graph.py', line 279, in print_call_graph()
  |   File '/root/py/ch03/graph.py', line 5, in async fetch_user()
  + Awaited by:
    * Task(name='Task-1', id=0xffff7f7498b0)
      + Call stack:
      |   File '/root/py/ch03/graph.py', line 9, in async handle_task()
```

앞에서 사라졌던 `handle_task`가 *Awaited by* 아래에 돌아왔습니다.

코드를 고칠 수 없는 프로세스라면 밖에서 봅니다. [What's New in 3.14의 "Asyncio introspection capabilities"](https://docs.python.org/3.15/whatsnew/3.14.html#asyncio-introspection-capabilities)와 [Command-line introspection tools 문서](https://docs.python.org/3.15/library/asyncio-tools.html)에 따르면 `python -m asyncio ps PID`와 `pstree PID`는 다른 프로세스의 Task 그래프를 *대상 안에서 코드를 실행하지 않고* 읽습니다. 권한 조건은 1장의 원격 attach와 같은 문서를 따릅니다. Task 두 단계를 `TaskGroup`으로 쌓은 `psdemo.py`를 띄워 놓고 읽어 봤습니다.

```python title="psdemo.py"
import asyncio, os

async def query_db(sql):
    await asyncio.sleep(3600)

async def fetch_user(uid):
    return await query_db(f"select {uid}")

async def handle(uid):
    async with asyncio.TaskGroup() as tg:
        tg.create_task(fetch_user(uid), name=f"fetch-{uid}")

async def main():
    print(f"pid={os.getpid()}", flush=True)
    async with asyncio.TaskGroup() as tg:
        for uid in (1, 2):
            tg.create_task(handle(uid), name=f"handle-{uid}")

asyncio.run(main())
```

```text
$ python -m asyncio pstree 2957
└── (T) Task-1
    └──  main /root/py/ch03/psdemo.py:15
        └──  TaskGroup.__aexit__ LIB/asyncio/taskgroups.py:75
            └──  TaskGroup._aexit LIB/asyncio/taskgroups.py:125
                ├── (T) handle-1
                │   └──  handle /root/py/ch03/psdemo.py:10
                │       └──  TaskGroup.__aexit__ LIB/asyncio/taskgroups.py:75
                │           └──  TaskGroup._aexit LIB/asyncio/taskgroups.py:125
                │               └── (T) fetch-1
                │                   └──  fetch_user /root/py/ch03/psdemo.py:7
                │                       └──  query_db /root/py/ch03/psdemo.py:4
                │                           └──  sleep LIB/asyncio/tasks.py:725
                └── (T) handle-2
                    └── ...
```

`(T)`가 Task이고, 각 Task 아래에 그 Task의 코루틴 스택이 이어집니다. `fetch-1`이 `query_db`의 `sleep`에서 기다리고 있고, 그것을 `handle-1`이, 다시 `Task-1`의 `main`이 기다린다는 사슬이 한눈에 보입니다. `ps`는 같은 정보를 표로 보여 줍니다.

```text
$ python -m asyncio ps 2957
tid        task id              task name            coroutine stack                                    awaiter chain                                      awaiter name    awaiter id
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
2957       0xffffa1289a90       Task-1               TaskGroup._aexit -> TaskGroup.__aexit__ -> main                                                                       0x0
2957       0xffffa12898b0       handle-1             TaskGroup._aexit -> TaskGroup.__aexit__ -> handle  TaskGroup._aexit -> TaskGroup.__aexit__ -> main    Task-1          0xffffa1289a90
2957       0xffffa12290a0       fetch-1              sleep -> query_db -> fetch_user                    TaskGroup._aexit -> TaskGroup.__aexit__ -> handle  handle-1        0xffffa12898b0
```

(`handle-2`·`fetch-2` 행은 생략했습니다.)

## asyncio.run(..., debug=True)

호출 그래프가 "지금 어디서 기다리나"를 보여 준다면, 디버그 모드는 "이 객체가 *어디서 만들어졌나*"와 "누가 루프를 오래 붙잡았나"를 기록합니다. [Developing with asyncio 문서의 Debug Mode 절](https://docs.python.org/3.15/library/asyncio-dev.html#debug-mode)은 켜는 방법으로 `PYTHONASYNCIODEBUG=1`, Python Development Mode(`-X dev`), `asyncio.run(..., debug=True)`, `loop.set_debug()`를 듭니다.

```python
asyncio.run(main(), debug=True)
```

같은 절이 나열하는 디버그 모드의 효과는 세 가지입니다. 스레드 안전하지 않은 API(`loop.call_soon()` 등)를 다른 스레드에서 부르면 예외를 냅니다. I/O selector가 오래 걸리면 기록합니다. 100 ms보다 오래 걸린 콜백을 기록합니다. 아래 실행에서는 여기에 더해 Task와 코루틴의 생성 위치가 메시지에 붙었습니다.

끝나지 않은 Task를 남긴 채 루프를 닫는 `pending.py`를 두 모드로 돌렸습니다.

```python title="pending.py"
import asyncio, gc

async def fetch_user(uid):
    await asyncio.sleep(3600)

def start(loop):
    loop.create_task(fetch_user(42))

loop = asyncio.new_event_loop()
start(loop)
loop.run_until_complete(asyncio.sleep(0))
loop.close()
```

```text
$ python pending.py
Task was destroyed but it is pending!
task: <Task pending name='Task-1' coro=<fetch_user() done, defined at /root/py/ch03/pending.py:3> wait_for=<Future pending cb=[Task.task_wakeup()]>>
$ PYTHONASYNCIODEBUG=1 python pending.py
Task was destroyed but it is pending!
source_traceback: Object created at (most recent call last):
  File "/root/py/ch03/pending.py", line 10, in <module>
    start(loop)
  File "/root/py/ch03/pending.py", line 7, in start
    loop.create_task(fetch_user(42))
task: <Task pending name='Task-1' coro=<fetch_user() done, defined at /root/py/ch03/pending.py:3> wait_for=<...> created at /root/py/ch03/pending.py:7>
```

일반 모드는 코루틴이 *정의된* 줄(3번)만 알려 줍니다. 디버그 모드는 Task를 *만든* 호출 경로(`start` 7번 줄)를 붙입니다. 같은 `fetch_user`를 여러 곳에서 띄우는 서비스라면 범인을 찾는 단서는 이쪽입니다.

## "coroutine never awaited"

`async def` 함수를 `await` 없이 부르면 코루틴 객체만 만들어지고 실행되지 않습니다. 저장했다고 믿었는데 실제로는 아무 일도 없었던 버그가 여기서 나옵니다.

```python title="never.py"
import asyncio

async def save(data):
    return data

async def handler(data):
    save(data)
    return "ok"

asyncio.run(handler({"k": 1}))
```

경고는 디버그 모드와 관계없이 뜹니다. 일반 모드에서는 경고가 난 줄만 보이고, 마지막 줄이 tracemalloc을 켜라고 안내합니다.

```text
$ python never.py
/root/py/ch03/never.py:7: RuntimeWarning: coroutine 'save' was never awaited
  save(data)
RuntimeWarning: Enable tracemalloc to get the object allocation traceback
```

생성 위치를 얻는 방법은 둘입니다. `PYTHONASYNCIODEBUG=1`이면 `Coroutine created at (most recent call last)` 아래 루프 프레임을 거쳐 `never.py`의 7번 줄 `handler`까지 이어진 스택이 붙습니다. [Detect never-awaited coroutines 절](https://docs.python.org/3.15/library/asyncio-dev.html#detect-never-awaited-coroutines)의 예시와 같은 형식입니다. `PYTHONTRACEMALLOC=10`이면 경고 모듈이 객체 할당 위치를 붙입니다.

```text
$ PYTHONTRACEMALLOC=10 python never.py
/root/py/ch03/never.py:7: RuntimeWarning: coroutine 'save' was never awaited
  save(data)
Object allocated at (most recent call last):
  File "/root/py/ch03/never.py", lineno 10
    asyncio.run(handler({"k": 1}))
  ...
  File "/root/py/ch03/never.py", lineno 7
    save(data)
```

`10`은 tracemalloc이 보관할 최대 프레임 수입니다. 위 실행에서는 스택 깊이가 8이라 8개 프레임이 모두 찍혔고, 가운데 `asyncio` 내부 프레임 6개를 `...`로 줄였습니다.

## slow callback 검출

이벤트 루프는 한 번에 한 콜백만 실행하는 단일 계산대입니다. 손님 하나가 계산대에서 10분을 끌면 뒤의 모든 손님이 기다립니다. [Running Blocking Code 절](https://docs.python.org/3.15/library/asyncio-dev.html#running-blocking-code)도 1초짜리 CPU 계산을 직접 부르면 모든 Task와 I/O가 1초 늦어진다고 설명합니다. `slow.py`는 0.5초 동안 막는 함수를 직접 부른 경우와 `asyncio.to_thread()`로 넘긴 경우를 차례로 실행합니다.

```python title="slow.py"
import asyncio, time

def compute_thumbnail(n):
    time.sleep(n)          # stands in for 0.5 s of CPU work
    return n

async def handle(n):
    return compute_thumbnail(n)

async def handle_offloaded(n):
    return await asyncio.to_thread(compute_thumbnail, n)

async def main():
    await handle(0.5)
    await handle_offloaded(0.5)

asyncio.run(main())
```

```text
$ python slow.py
$ PYTHONASYNCIODEBUG=1 python slow.py
Executing <Task pending name='Task-1' coro=<main() running at /root/py/ch03/slow.py:15> wait_for=<...> cb=[...] created at LIB/asyncio/runners.py:110> took 0.509 seconds
```

일반 모드는 아무것도 출력하지 않았습니다. 디버그 모드는 경고를 한 번만 냈고, 그것은 직접 부른 쪽이 루프를 0.509초 막은 구간입니다. `to_thread()`로 넘긴 0.5초는 다른 스레드에서 돌았기 때문에 경고가 없었습니다. 기준값 100 ms는 [`loop.slow_callback_duration`](https://docs.python.org/3.15/library/asyncio-eventloop.html#asyncio.loop.slow_callback_duration)으로 바꿉니다.

블로킹 코드를 옮기는 방법은 `asyncio.to_thread()`, `loop.run_in_executor()`(스레드·인터프리터·프로세스 풀)입니다. 문서는 CPU 계산을 다른 프로세스로 보내려면 `run_in_executor()`에 `ProcessPoolExecutor`를 넘기라고 안내합니다.

## 콜스택 보기 — Task.get_stack

`ps`/`pstree`는 3.14+ 전용입니다. 그 이전 버전이나 프로세스 안에서 직접 보려면 `asyncio.all_tasks()`로 Task를 모아 각자의 스택을 찍습니다. [`Task.get_stack()` 문서](https://docs.python.org/3.15/library/asyncio-task.html#asyncio.Task.get_stack)는 "중단된 코루틴에는 프레임을 하나만 반환한다"고 못 박습니다. 출력은 `Task.print_stack()`에 맡기는 편이 정확합니다. `traceback.print_stack(frame)`을 프레임마다 부르면 각 프레임까지의 스택 전체를 반복해서 찍게 됩니다.

```python title="dumptasks.py"
import asyncio, os, signal, traceback

async def dump_tasks():
    for t in asyncio.all_tasks():
        print(f"=== {t.get_name()} frames={len(t.get_stack())}", flush=True)
        t.print_stack()

async def leaf(n):
    await asyncio.sleep(3600)

async def middle(n):
    await leaf(n)

async def main():
    loop = asyncio.get_running_loop()
    loop.add_signal_handler(signal.SIGUSR1, lambda: loop.create_task(dump_tasks(), name="dumper"))
    tasks = [asyncio.create_task(middle(i), name=f"worker-{i}") for i in range(2)]
    await asyncio.sleep(0.1)
    os.kill(os.getpid(), signal.SIGUSR1)
    await asyncio.sleep(0.1)
    for t in tasks: t.cancel()

asyncio.run(main())
```

시그널 핸들러는 `loop.add_signal_handler()`로 등록했습니다. [문서](https://docs.python.org/3.15/library/asyncio-eventloop.html#asyncio.loop.add_signal_handler)에 따르면 이렇게 등록한 콜백은 루프가 다른 콜백과 함께 실행하고, `signal.signal()`로 건 핸들러와 달리 이벤트 루프와 상호작용해도 됩니다. 그래서 핸들러에서 바로 `create_task()`를 부릅니다. 결과 중 `worker-0` 부분입니다.

```text
=== worker-0 frames=1
Stack for <Task pending name='worker-0' coro=<middle() running at /root/py/ch03/dumptasks.py:12> wait_for=<Future pending cb=[Task.task_wakeup()]>> (most recent call last):
  File "/root/py/ch03/dumptasks.py", line 12, in middle
    await leaf(n)
```

문서대로 프레임이 하나뿐입니다. 실제로 기다리는 곳은 `leaf`의 `asyncio.sleep`인데 `middle`만 보입니다. 같은 실행에서 덤프를 찍는 `dumper` Task 자신은 실행 중이라 `frames=8`로 루프 프레임까지 전부 나왔습니다. 하나 더 조건이 있습니다. 이 방식은 루프가 `dump_tasks`를 실행할 수 있어야 동작합니다. 루프가 동기 호출에 막혀 있으면 덤프 Task도 돌지 못하므로, 그때는 [5장의 faulthandler](/blog/tools/debugging/python/chapter05-faulthandler-tracemalloc)나 [4장의 py-spy](/blog/tools/debugging/python/chapter04-py-spy)처럼 루프에 의존하지 않는 도구를 씁니다.

## debugpy + asyncio

IDE에서도 같은 원리가 적용됩니다. debugpy가 보여 주는 콜스택은 스레드의 실제 프레임이므로 위의 `stack.py`와 같은 기준으로 짧아집니다. 디버그 모드는 `launch.json`의 `env`로 켭니다.

```json
{
  "type": "debugpy",
  "request": "launch",
  "program": "main.py",
  "env": { "PYTHONASYNCIODEBUG": "1" }
}
```

이 글에서는 VSCode 화면에서 asyncio Task가 어떻게 표시되는지 확인하지 않았습니다. 프로세스 밖에서 Task 관계를 봐야 한다면 위의 `python -m asyncio pstree`를 씁니다.

## 자주 보이는 버그 패턴

### 1. `gather()`의 예외와 나머지 작업

[`asyncio.gather()` 문서](https://docs.python.org/3.15/library/asyncio-task.html#asyncio.gather)는 `return_exceptions=False`(기본)일 때 첫 예외가 곧바로 `gather()`를 기다리는 쪽으로 전파되고 *나머지 awaitable은 취소되지 않고 계속 돈다*고 적습니다. "하나 실패했으니 다 멈췄겠지"라고 생각하면 틀립니다.

```python title="gather.py"
import asyncio

async def ok(n):
    await asyncio.sleep(0.05)
    print(f"ok({n}) finished", flush=True)
    return n

async def bad():
    await asyncio.sleep(0.01)
    raise ValueError("bad")

async def main():
    tasks = [asyncio.ensure_future(ok(1)), asyncio.ensure_future(bad())]
    try:
        await asyncio.gather(*tasks)
    except ValueError as e:
        print(f"gather raised {e!r}; ok(1) done={tasks[0].done()}", flush=True)
    await asyncio.sleep(0.1)
    print(f"later: ok(1) done={tasks[0].done()} result={tasks[0].result()}")
    print(await asyncio.gather(ok(2), bad(), return_exceptions=True))

asyncio.run(main())
```

```text
$ python gather.py
gather raised ValueError('bad'); ok(1) done=False
ok(1) finished
later: ok(1) done=True result=1
ok(2) finished
[2, ValueError('bad')]
```

예외를 받은 시점에 `ok(1)`은 아직 돌고 있었고, 나중에 정상 완료됐습니다. `return_exceptions=True`면 예외가 결과 목록에 값처럼 섞여 돌아오므로 `isinstance(r, Exception)`으로 걸러 처리합니다. 하나가 실패하면 나머지를 함께 취소하고 싶다면 `asyncio.TaskGroup`을 씁니다. [Task Groups 절](https://docs.python.org/3.15/library/asyncio-task.html#task-groups)은 그룹의 Task가 `CancelledError` 이외의 예외로 처음 실패하면 남은 Task를 취소한다고 적습니다.

### 2. fire-and-forget Task의 예외

`create_task()`의 결과를 버리면 그 Task의 예외는 아무도 받지 않습니다.

```python title="fireforget.py"
import asyncio, gc

async def do_work():
    raise ValueError("boom")

async def main():
    asyncio.create_task(do_work())
    await asyncio.sleep(0.01)
    print("main finished; nobody awaited the task", flush=True)

asyncio.run(main())
```

실제로 돌려 보면 예외는 조용히 사라지지 않고 `Task exception was never retrieved`로 로그에 남았습니다. 다만 찍히는 시점과 위치가 원래 코드와 떨어져 있습니다.

```text
$ python fireforget.py
Task exception was never retrieved
future: <Task finished name='Task-2' coro=<do_work() done, defined at /root/py/ch03/fireforget.py:3> exception=ValueError('boom')>
Traceback (most recent call last):
  File "/root/py/ch03/fireforget.py", line 4, in do_work
    raise ValueError("boom")
ValueError: boom
main finished; nobody awaited the task
```

더 큰 문제는 결과를 버린 Task 자체입니다. [`asyncio.create_task()` 문서](https://docs.python.org/3.15/library/asyncio-task.html#asyncio.create_task)의 Important 상자는 이벤트 루프가 Task를 *약한 참조*로만 들고 있어 다른 곳에서 참조하지 않으면 끝나기 전에도 GC될 수 있다고 경고하고, Task를 집합에 보관하라고 안내합니다. 보관하면서 완료 콜백에서 예외를 확인하는 형태입니다. 취소된 Task에 `exception()`을 부르면 `CancelledError`가 나므로 먼저 걸러 냅니다.

```python
background_tasks = set()

def report_task(t):
    background_tasks.discard(t)
    if t.cancelled():
        return
    exc = t.exception()
    if exc is not None:
        log.error("task failed", exc_info=(type(exc), exc, exc.__traceback__))

task = asyncio.create_task(do_work())
background_tasks.add(task)
task.add_done_callback(report_task)
```

### 3. 취소 중 cleanup

취소는 대기 중인 `await` 지점에 `CancelledError`를 던집니다. `finally` 안에서 다시 `await`해 비동기 정리를 할 수 있는지 확인했습니다.

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

출력은 `cleanup=True`입니다. 취소가 한 번 들어온 뒤 `finally`의 `await`는 정상으로 끝났습니다. 정리 도중 *또* 취소가 들어오는 경우는 이 예제가 다루지 않습니다. [`asyncio.shield()` 문서](https://docs.python.org/3.15/library/asyncio-task.html#asyncio.shield)는 shield가 안쪽 작업을 바깥 취소로부터 보호하지만 *호출한 쪽은 여전히 취소되어* `await`에서 `CancelledError`를 받는다고 적습니다. 정리 작업을 끝까지 돌리고 싶을 때 쓰되 호출자의 취소까지 없애 주지는 않습니다.

```python
finally:
    await asyncio.shield(conn.close())
```

### 4. 이벤트 루프 중첩

[`asyncio.run()` 문서](https://docs.python.org/3.15/library/asyncio-runner.html#asyncio.run)는 "같은 스레드에서 다른 이벤트 루프가 실행 중일 때는 호출할 수 없다"고 적습니다. 순차 호출과 중첩 호출을 구분해 확인했습니다.

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

결과는 `sequential=1,1`과 `nested=blocked`입니다. 순차 호출은 매번 새 루프를 만들고 닫으므로 문제없고, 실행 중인 루프 안의 중첩 호출만 `RuntimeError`입니다. 중첩 호출에서 소비되지 않은 `coro`는 `finally`에서 닫아 never-awaited 경고를 막았습니다.

### 5. await 사이의 갱신 유실

단일 스레드 이벤트 루프에서도 읽기와 쓰기 사이에 `await`가 있으면 다른 Task가 끼어듭니다. 은행 창구 두 곳이 같은 잔고를 동시에 조회한 뒤 각자 입금 처리하는 상황과 같습니다.

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

`unlocked=1`, `locked=2`가 출력됐습니다. 두 Task가 같은 옛 값 0을 읽었기 때문입니다. `debug=True`로 돌렸지만 디버그 모드는 이 경쟁에 대해 아무 경고도 내지 않았습니다. 잠금은 읽기부터 쓰기까지를 감싸야 합니다.

## aiomonitor — 운영 중 콘솔

[aiomonitor](https://github.com/aio-libs/aiomonitor)는 앱 안에 텔넷 콘솔 서버를 띄워 실행 중인 루프의 Task를 보고 취소까지 할 수 있게 합니다. 0.7.1에서 `start_monitor(loop)`의 기본 포트는 20101(터미널 UI)이고, `python -m aiomonitor.cli`가 여기에 접속합니다(`aiomonitor/monitor.py`).

```python title="mon.py"
import asyncio, aiomonitor

async def query_db(sql):
    await asyncio.sleep(3600)

async def main():
    loop = asyncio.get_running_loop()
    with aiomonitor.start_monitor(loop):
        t = asyncio.create_task(query_db("select 1"), name="db-query")
        try:
            await t
        except asyncio.CancelledError:
            print("db-query cancelled", flush=True)

asyncio.run(main())
```

```text
$ python -m aiomonitor.cli
Asyncio Monitor: 2 tasks running
Type help for available commands
monitor >>> ps
2 tasks running
+-------------------------------------------------------------------------+
| Task ID          State    Name      Coroutine   Created Location  Since |
+-------------------------------------------------------------------------+
| 281472864025200  PENDING  Task-1    main()      -                 -     |
| 281472864723472  PENDING  db-query  query_db()  -                 -     |
+-------------------------------------------------------------------------+
monitor >>> where 281472864723472
...
Stack of <Task name=db-query coro=query_db()> (most recent call last)
  File "/root/py/ch03/mon.py", line 4, in query_db
    await asyncio.sleep(3600)
  File "LIB/asyncio/tasks.py", line 725, in sleep
    return await future
monitor >>> cancel 281472864723472
```

`cancel` 뒤 앱은 `db-query cancelled`를 찍고 끝났습니다. 원래 출력의 터미널 제어 코드는 지웠습니다. aiomonitor는 앱 코드에 미리 넣어야 하고 포트가 열린다는 점에서 2장의 debugpy `listen`과 같은 주의가 필요합니다. 코드를 바꿀 수 없다면 `python -m asyncio ps`가 대안입니다.

## yappi — 비동기 프로파일링

`cProfile`은 함수 호출과 반환을 세는 결정적 프로파일러입니다. 코루틴은 `await`마다 반환했다가 다시 들어오므로 cProfile이 보는 코루틴은 "아주 짧게 여러 번 불린 함수"입니다. [yappi README](https://github.com/sumerc/yappi)는 1.2부터 *coroutine profiling*으로 코루틴의 올바른 wall/CPU 시간과 호출 수를 잰다고 소개합니다. 0.2초 기다리는 `fetch()` 두 개와 0.05초 CPU를 쓰는 `crunch()`로 비교했습니다(macOS, yappi 1.7.6).

| 도구 / Python | `fetch` 호출 수 | `fetch` 시간 | `main` 시간 |
| --- | ---: | ---: | ---: |
| cProfile (3.13.18·3.14.10·3.15.2 동일) | 4 | 0.000 s | 0.050 s |
| yappi `wall`, 3.13.18 | 2 | 0.401 s | 0.251 s |
| yappi `wall`, 3.14.10 | 2 | 0.402 s | 0.251 s |
| yappi `wall`, 3.15.2 | 4 | 0.000 s | 0.050 s |

3.13·3.14에서 yappi는 `fetch`를 두 번 호출, 합계 0.4초로 정확히 셌습니다. 그런데 **3.15.2에서는 cProfile과 똑같이** 코루틴의 대기 시간을 놓쳤습니다. yappi 1.7.6의 PyPI 분류자도 3.14까지만 나열합니다. 비동기 대기를 프로파일링하려면 yappi가 지원하는 버전에서 돌리고, 결과가 cProfile과 같다면 먼저 버전을 의심합니다.

```python
import yappi
yappi.set_clock_type("wall")     # CPU 시간이 아니라 벽시계
yappi.start()
asyncio.run(main())
yappi.stop()
yappi.get_func_stats().save("profile.out", type="callgrind")
```

README에 따르면 결과는 callgrind나 pstat 형식으로 저장할 수 있습니다.

## 정리

- 콜스택이 짧아지는 것은 *Task 경계*에서입니다. 직접 `await`한 호출자는 스택에 보입니다.
- 3.14+에서는 `asyncio.print_call_graph()`로 프로세스 안에서, `python -m asyncio ps/pstree PID`로 밖에서 "누가 누구를 기다리는가"를 봅니다. pdb에서는 `$_asynctask`로 현재 Task를 확인합니다.
- 디버그 모드(`PYTHONASYNCIODEBUG=1` 등)는 Task·코루틴 *생성 위치*와 100 ms 이상 루프를 막은 콜백을 알려 줍니다. 경쟁 조건은 잡지 않습니다.
- never-awaited 코루틴의 위치는 디버그 모드나 `PYTHONTRACEMALLOC`로 얻습니다.
- `Task.get_stack()`은 중단된 Task에 프레임 하나만 줍니다. 출력은 `Task.print_stack()`으로 합니다.
- `gather()`는 첫 예외 뒤에도 나머지를 취소하지 않습니다. fire-and-forget Task는 집합에 보관합니다.
- 운영 콘솔은 aiomonitor, 비동기 프로파일링은 yappi `wall`입니다. yappi 1.7.6은 3.15.2에서 코루틴 시간을 재지 못했습니다.

## 다음 장 예고

Ch 4는 `py-spy`입니다. 코드를 고치지 않고 밖에서 콜스택을 덤프하고 샘플링하는 도구를 Linux에서 실제로 붙여 보고, 권한과 지원 버전 문제를 확인합니다.

## 관련 항목

- [Ch 2: debugpy / IDE](/blog/tools/debugging/python/chapter02-debugpy-ide)
- [Ch 4: py-spy 샘플링](/blog/tools/debugging/python/chapter04-py-spy)
- [GDB Ch 6: 멀티스레드 / 멀티프로세스](/blog/tools/debugging/gdb-lldb/chapter06-multithread-multiprocess)
- [`asyncio` 개발 가이드와 디버그 모드 (3.15)](https://docs.python.org/3.15/library/asyncio-dev.html)
- [Call graph introspection (3.15)](https://docs.python.org/3.15/library/asyncio-graph.html)
