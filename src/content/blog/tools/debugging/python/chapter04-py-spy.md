---
title: "py-spy 운영 분석 — 코드 수정 없이 프로세스 검사"
slug: "tools/debugging/python/chapter04-py-spy"
date: 2026-05-30T09:04:00
description: "py-spy로 콜스택 dump, 샘플링 프로파일링, flamegraph, 외부 attach."
tags: [python, debugging, py-spy, profiling]
series: "Python Debugging"
seriesOrder: 4
draft: false
topics: ["tools", "tools/debugging"]
---

`pdb`/`debugpy`는 *프로세스 안*에서 동작합니다. 운영 서비스에 디버그 코드를 넣을 수 없거나 이미 멈춘 듯한 프로세스를 진단해야 할 때는 [py-spy](https://github.com/benfred/py-spy)를 씁니다. README의 "How does py-spy work?" 절에 따르면 py-spy는 Linux에서는 `process_vm_readv`, macOS에서는 `vm_read`로 대상 프로세스의 메모리를 직접 읽어 인터프리터 상태와 프레임을 따라가며 콜스택을 재구성합니다. 대상 프로세스 안에서 코드를 실행하지 않습니다.

비유하자면 pdb는 환자의 몸에 들어가는 내시경이고, py-spy는 밖에서 찍는 X선입니다. 환자를 깨우거나 수술할 필요는 없지만 찍는 순간 잠깐 움직이지 말라고는 합니다(아래 `--nonblocking` 절).

이 장의 실행은 모두 Debian 13 arm64 게스트에서 py-spy 0.4.3으로 했습니다. 대상은 주로 CPython 3.15.2(uv 빌드)이고, Debian의 `/usr/bin/python3.13`(3.13.5)도 한 번 붙여 봤습니다. macOS에서는 권한 오류만 확인했습니다.

## 설치

py-spy는 Rust 바이너리이고 PyPI 휠로 배포됩니다. 이 장은 `pip install py-spy`(uv로 설치)를 썼습니다.

```bash
pip install py-spy
py-spy --version     # py-spy 0.4.3
```

권한 조건은 OS마다 다릅니다. README의 "When do you need to run as sudo?" 절은 macOS는 *항상* root가 필요하고, Linux는 py-spy가 직접 띄운 자식이 아닌 프로세스에 붙을 때 보통 root가 필요하다고 적습니다. 실제로 macOS의 일반 사용자 셸에서는 바로 거부됐습니다.

```text
$ py-spy dump --pid 62554
This program requires root on OSX.
Try running again with elevated permissions by going 'sudo !!'
```

Linux 쪽은 아래 "권한 문제" 절에서 직접 재현합니다.

## 세 가지 모드

py-spy의 하위 명령은 세 개입니다. 0.4.3의 `--help` 출력입니다.

```text
$ py-spy --help
Sampling profiler for Python programs

Usage: py-spy <COMMAND>

Commands:
  record  Records stack trace information to a flamegraph, speedscope or raw file
  top     Displays a top like view of functions consuming CPU
  dump    Dumps stack traces for a target program to stdout
  help    Print this message or the help of the given subcommand(s)
```

세 모드를 비교하기 위해 CPU를 계속 쓰는 스레드(`worker`)와 1초마다 자는 스레드(`idle`)를 함께 띄우는 `busy.py`를 대상으로 삼았습니다.

```python title="busy.py"
import threading, time

def parse_json(n):
    s = 0
    for i in range(n):
        s += hash(str(i))
    return s

def worker():
    while True:
        parse_json(200000)

def idle():
    while True:
        time.sleep(1)

threading.Thread(target=worker, name="worker", daemon=True).start()
threading.Thread(target=idle, name="idle", daemon=True).start()
time.sleep(3600)
```

### top — 실시간

`top`은 `htop`처럼 화면을 갱신하며 함수별 샘플 비율을 보여 줍니다. 갱신 주기는 `--delay`(기본 1.0초)입니다. 약 4초 수집한 뒤의 화면입니다.

```text
$ py-spy top --pid 3389
Collecting samples from '/root/v315/bin/python busy.py' (python v3.15.2)
Total Samples 400
GIL: 100.00%, Active: 120.00%, Threads: 3

  %Own   %Total  OwnTime  TotalTime  Function (filename)
100.00% 100.00%    4.00s     4.00s   parse_json (busy.py)
 10.00%  10.00%   0.330s    0.330s   <module> (busy.py)
 10.00%  10.00%   0.150s    0.150s   idle (busy.py)
  0.00% 110.00%   0.000s     4.15s   Thread.run (threading.py)
  0.00% 110.00%   0.000s     4.15s   Thread._bootstrap_inner (threading.py)
  0.00% 110.00%   0.000s     4.15s   Thread._bootstrap (threading.py)
  0.00% 100.00%   0.000s     4.00s   worker (busy.py)
```

`%Own`은 그 함수 자신에서 잡힌 비율, `%Total`은 그 함수 아래 호출까지 포함한 비율입니다. 자고 있어야 할 `<module>`과 `idle`도 10%씩 잡혔습니다. README의 "How do you detect if a thread is idle or not?" 절은 py-spy가 OS의 스레드 상태(Linux는 `/proc/PID/stat`)를 읽은 뒤 스택을 읽기 때문에 그 사이 상태가 바뀌는 경쟁이 있고, 그래서 쉬는 스레드가 활성으로 잡힐 수 있다고 설명합니다.

### record — Flamegraph

`record`는 일정 시간 샘플을 모아 파일로 씁니다. 형식은 `--format`으로 고르고 0.4.3이 받는 값은 `flamegraph`(기본, SVG), `raw`, `speedscope`, `chrometrace`입니다. 샘플링 속도는 `--rate`(기본 초당 100)입니다.

```bash
py-spy record -o profile.svg --pid 12345 --duration 30
py-spy record -o profile.json -f speedscope --pid 12345
py-spy record -o profile.txt -f raw --pid 12345
```

`raw` 형식은 한 줄에 "세미콜론으로 이은 스택 + 샘플 수"를 씁니다. `busy.py`를 5초 기록한 결과를 샘플 수 순으로 정렬하면 이렇게 됩니다.

```text
$ py-spy record -f raw -d 5 --pid 3216
py-spy> Wrote raw flamegraph data to '/tmp/r.txt'. Samples: 511 Errors: 0
467 Thread._bootstrap (threading.py:1181);Thread._bootstrap_inner (threading.py:1219);Thread.run (threading.py:1161);worker (busy.py:11);parse_json (busy.py:6)
32 Thread._bootstrap (threading.py:1181);Thread._bootstrap_inner (threading.py:1219);Thread.run (threading.py:1161);worker (busy.py:11);parse_json (busy.py:5)
8 Thread._bootstrap (threading.py:1181);Thread._bootstrap_inner (threading.py:1219);Thread.run (threading.py:1161);idle (busy.py:15)
4 <module> (busy.py:19)
```

flamegraph SVG는 이 스택들을 쌓은 그림입니다. 박스 폭은 그 프레임이 포함된 샘플 수에 비례하고, 부모 박스는 자식 샘플까지 포함하며, 가로축은 시간 순서가 아니라 알파벳순 정렬입니다([Brendan Gregg의 Flame Graphs 설명](https://www.brendangregg.com/flamegraphs.html)). 위 데이터라면 `parse_json` 6번 줄(`s += hash(str(i))`)이 가장 넓은 박스가 됩니다.

### dump — 한 번의 콜스택

`dump`는 모든 스레드의 현재 스택을 한 번 찍고 끝납니다. 스레드마다 `active`/`idle`과 GIL 보유 여부가 붙습니다.

```text
$ py-spy dump --pid 3216
Process 3216: python busy.py
Python v3.15.2 (/root/.local/share/uv/python/cpython-3.15.2-linux-aarch64-gnu/bin/python3.15)

Thread 3216 (idle): "MainThread"
    <module> (busy.py:19)
Thread 3218 (active+gil): "worker"
    parse_json (busy.py:6)
    worker (busy.py:11)
    Thread.run (threading.py:1161)
    Thread._bootstrap_inner (threading.py:1219)
    Thread._bootstrap (threading.py:1181)
Thread 3219 (idle): "idle"
    idle (busy.py:15)
    ...
```

`--locals`(`-l`)를 주면 프레임마다 인자와 지역 변수도 찍습니다. `--core`로 코어 덤프 파일에서 파이썬 스택을 읽는 옵션도 0.4.3의 `dump --help`에 있습니다. 이 장에서 코어 덤프는 시험하지 않았습니다.

### 대상은 멈추는가

README의 "How can I avoid pausing the Python program?" 절에 따르면 py-spy는 기본적으로 샘플을 읽는 동안 대상을 *잠깐 멈춥니다*. `--nonblocking`을 주면 멈추지 않고 읽는 대신, 메모리 읽기가 원자적이지 않아 오류나 일부 잘린 스택이 섞일 수 있다고 적습니다. `busy.py` 5초 기록에서는 두 방식 모두 `Errors: 0`이었고 샘플 분포도 거의 같았습니다(`parse_json:6` 467 대 465). 오류가 드러날 만큼 스택이 빠르게 바뀌는 프로그램은 아니었다는 뜻입니다.

## 실전 — 멈춘 프로세스 진단

응답이 없는 서비스에서 가장 먼저 할 일은 "각 스레드가 지금 어디 서 있나"를 보는 것입니다. 두 스레드가 잠금 두 개를 반대 순서로 잡는 교착 상태를 만들어 `dump`로 들여다봤습니다.

```python title="hung.py"
import threading, time, os

a = threading.Lock()
b = threading.Lock()

def transfer(first, second, name):
    with first:
        time.sleep(0.1)
        with second:            # never gets here: the other thread holds it
            print(name, "done")

def poll_forever():
    while True:
        time.sleep(1)

t1 = threading.Thread(target=transfer, args=(a, b, "t1"), name="t1")
t2 = threading.Thread(target=transfer, args=(b, a, "t2"), name="t2")
t3 = threading.Thread(target=poll_forever, name="poller", daemon=True)
for t in (t1, t2, t3): t.start()
print(f"pid={os.getpid()}", flush=True)
t1.join()
```

```text
$ py-spy dump --pid 3209 --locals
Process 3209: python hung.py
Python v3.15.2 (/root/.local/share/uv/python/cpython-3.15.2-linux-aarch64-gnu/bin/python3.15)

Thread 3209 (idle): "MainThread"
    Thread.join (threading.py:1270)
    ...
Thread 3211 (idle): "t1"
    transfer (hung.py:9)
        Arguments:
            first: <_thread.lock at 0xffff9492b3d0>
            second: <_thread.lock at 0xffff94929950>
            name: "t1"
    ...
Thread 3212 (idle): "t2"
    transfer (hung.py:9)
        Arguments:
            first: <_thread.lock at 0xffff94929950>
            second: <_thread.lock at 0xffff9492b3d0>
            name: "t2"
    ...
```

`t1`과 `t2`가 모두 9번 줄 `with second:`에 서 있고, `--locals`로 보면 `t1`의 `second`가 `t2`의 `first`(`...9950`)이고 그 반대도 성립합니다. 서로 상대가 쥔 잠금을 기다리는 교착 상태가 코드 수정 없이 드러났습니다. 두 스레드가 `idle`로 표시된 것도 단서입니다. CPU를 쓰지 않고 잠금에서 블록되어 있다는 뜻입니다. 같은 방식으로 여러 워커 프로세스를 하나씩 `dump`해 보면 모두가 같은 줄에서 기다리는지, 일부만 그런지 구분됩니다.

## subprocess 추적

`multiprocessing` 풀이나 워커를 포크하는 서버는 실제 일이 자식에서 일어납니다. README의 "How can I profile subprocesses?" 절은 `--subprocesses`를 주면 새로 생기는 자식 파이썬 프로세스를 자동으로 붙이고, record 결과에서 자식이 부모 아래에 PID·명령줄과 함께 나타난다고 설명합니다. 3초씩 CPU를 쓰는 작업 둘을 `Pool(2)`에 넘겨 확인했습니다.

```python title="mp.py"
import multiprocessing as m, time

def burn(n):
    t = time.time(); x = 0
    while time.time() - t < 3:
        x += 1
    return n

if __name__ == "__main__":
    with m.Pool(2) as p:
        print(p.map(burn, [1, 2]))
```

```bash
py-spy record -o mp.txt -f raw --subprocesses -- python mp.py
```

raw 결과에서 샘플이 가장 많은 스택의 앞부분은 `process 3291:"python mp.py";process 3297:"/root/v315/bin/python -c import sys; from multiprocessing.forkserver import main; ..."`였습니다. 3.15.2의 Linux 기본 시작 방식인 forkserver 프로세스 아래에 워커가 달려 있다는 뜻입니다. 워커 두 개가 각각 약 270 샘플(100 Hz × 3초)을 남겼고, 전체는 677 샘플이었습니다.

## ASGI / asyncio

py-spy가 읽는 것은 *스레드의 실제 프레임*입니다. 3장에서 본 것처럼 `await`로 쉬고 있는 코루틴은 스레드 스택에 없으므로 `dump`에도 나오지 않습니다. 3장의 `psdemo.py`(Task 다섯 개가 모두 `asyncio.sleep`에서 대기)에 `dump`를 해 보면 이벤트 루프가 `select`에서 쉬는 모습만 나옵니다.

```text
$ py-spy dump --pid 3451
Process 3451: /root/v315/bin/python psdemo.py
Python v3.15.2 (/root/.local/share/uv/python/cpython-3.15.2-linux-aarch64-gnu/bin/python3.15)

Thread 3451 (idle): "MainThread"
    EpollSelector.select (selectors.py:452)
    BaseEventLoop._run_once (asyncio/base_events.py:2032)
    BaseEventLoop.run_forever (asyncio/base_events.py:682)
    BaseEventLoop.run_until_complete (asyncio/base_events.py:711)
    Runner.run (asyncio/runners.py:128)
    run (asyncio/runners.py:205)
    <module> (psdemo.py:19)
```

`fetch_user`·`query_db`는 어디에도 없습니다. 같은 프로그램을 3장에서 `python -m asyncio pstree PID`(3.14+)로 읽었을 때는 Task 다섯 개의 대기 사슬이 모두 나왔습니다. 어느 Task가 CPU를 쓰는지는 py-spy, 어느 Task가 무엇을 기다리는지는 `pstree`로 나눠 봅니다.

## --idle / --gil

기본 출력은 쉬는 스레드를 뺍니다. 같은 `busy.py`를 5초씩 세 옵션으로 기록해 총 샘플 수를 비교했습니다.

| 옵션 | 총 샘플 | 포함된 스택 |
| --- | ---: | --- |
| 기본 | 511 | `worker` 499, `idle` 8, `<module>` 4 |
| `--idle` | 1497 | `worker` 499, `idle` 499, `<module>` 499 |
| `--gil` | 499 | `worker` 499만 |

`--idle`은 세 스레드를 매 샘플 모두 포함해 약 세 배가 됐습니다. `--gil`은 README의 "How does GIL detection work?" 절대로 GIL을 쥔 스레드의 스택만 남겼습니다. 같은 절은 GIL을 풀고 일하는 C 확장의 활동은 이 필터에서 빠진다고 경고합니다. 숫자 계산 라이브러리처럼 GIL을 놓고 도는 코드를 보려면 `--gil`을 빼야 합니다.

## C 확장 같이 보기

`--native`는 C/C++/Cython 확장의 네이티브 프레임을 파이썬 프레임 사이에 끼워 보여 줍니다. README의 "Can py-spy profile native extensions?" 표는 Linux의 x86-64·ARM·Aarch64와 Windows x86-64에서만 지원한다고 적고, macOS 칸은 비어 있습니다. 이 게스트(Linux aarch64)에서 `busy.py`에 써 본 결과입니다.

```text
$ py-spy dump --pid 3216 --native
Thread 3216 (idle): "MainThread"
    0xffff9808f228 (libc.so.6)
    0xffff980828b8 (libc.so.6)
    0xffff980828b8 (libc.so.6)
    <module> (busy.py:19)
Thread 3218 (active+gil): "worker"
    thread_run (python3.15)
    0xffff980861d8 (libc.so.6)
    0xffff980861d8 (libc.so.6)
    parse_json (busy.py:6)
    ...
```

네이티브 프레임이 섞여 나오기는 했지만 libc 프레임은 심볼 없이 주소만 나왔습니다. README가 "확장은 심볼을 넣어 빌드하라"고 권하는 이유가 여기 있습니다. 심볼이 없는 라이브러리는 주소만으로는 어느 함수인지 알 수 없습니다.

## 권한 문제

Linux에서 attach를 막는 것은 보통 Yama의 `ptrace_scope`입니다. 이 Debian 게스트의 기본값은 0이었으므로 일부러 1로 올리고, 일반 사용자 `spy`로 다시 해 봤습니다.

```text
$ cat /proc/sys/kernel/yama/ptrace_scope
1
$ py-spy dump --pid 3354   # as user spy, not a child
Permission Denied: Try running again with elevated permissions by going 'sudo env "PATH=$PATH" !!'
$ py-spy record -d 1 -o p.svg -- python workload.py --rounds 500   # as user spy, spawn
py-spy> Sampling process 100 times a second for 1 seconds. Press Control-C to exit.

checksum=166641667500000

py-spy> Stopped sampling because process exited
py-spy> Wrote flamegraph data to 'p.svg'. Samples: 10 Errors: 0
```

같은 사용자의 프로세스라도 자식이 아니면 거부됐고, py-spy가 직접 띄운 프로세스는 root 없이 기록됐습니다. README의 설명 그대로입니다. 해결책은 세 가지입니다.

1. `sudo py-spy ...`로 실행합니다. 오류 문구가 권하는 형태는 `sudo env "PATH=$PATH" py-spy ...`입니다.
2. 영향 범위를 이해하고 `ptrace_scope`를 낮춥니다. 1장에서 인용한 Python 원격 디버깅 문서도 이 설정이 시스템 보안을 약하게 만든다고 경고합니다.
3. 처음부터 `py-spy record -- python app.py`처럼 py-spy가 띄우게 합니다.

컨테이너는 따로입니다. README의 Docker 절은 root여도 Docker가 `process_vm_readv`를 막아 권한 오류가 날 수 있고 `--cap-add SYS_PTRACE`로 풀거나 호스트에서 py-spy를 돌리라고 안내합니다. Kubernetes 절은 기본으로 `SYS_PTRACE`가 빠지므로 `securityContext.capabilities.add`에 넣으라고 적습니다. 이 장에서 컨테이너 환경은 실행하지 않았습니다.

## attach vs spawn

py-spy는 이미 도는 프로세스에 붙거나(`--pid`), 명령을 직접 띄웁니다(`--` 뒤에 명령). 위 권한 실험처럼 spawn은 root 없이도 되므로 CI에서 짧은 스크립트 전체를 프로파일할 때 편합니다.

```bash
py-spy record -o p.svg -- python my_script.py    # spawn: 시작부터 추적
py-spy record -o p.svg --pid 12345               # attach: 이미 도는 프로세스
```

## 비교 — cProfile vs py-spy

비용 차이는 직접 재 봤습니다. 정수 제곱합을 2000번 반복하는 `workload.py`를 그대로, py-spy로 감싸서, `python -m cProfile`로 각각 세 번 돌리고 `/usr/bin/time`의 경과 시간을 적었습니다.

```python title="workload.py"
import argparse

def checksum(rounds):
    total = 0
    for _ in range(rounds):
        total += sum(n * n for n in range(10000))
    return total

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--rounds", type=int, default=20)
    args = parser.parse_args()
    print(f"checksum={checksum(args.rounds)}")
```

| 실행 (`--rounds 2000`) | 경과 시간 3회 | 비고 |
| --- | --- | --- |
| `python workload.py` | 0.46 / 0.47 / 0.46 s | `checksum=666566670000000` |
| `py-spy record -- python workload.py` | 0.47 / 0.47 / 0.53 s | 샘플 43 / 54 / 45개 |
| `python -m cProfile -o ... workload.py` | 2.55 / 2.58 / 2.53 s | 약 5.5배 |

세 경우 모두 checksum은 같았습니다. py-spy 쪽은 차이가 측정 흔들림 수준이었고, cProfile은 이 작업에서 5배 넘게 느려졌습니다. 반대로 py-spy가 남긴 샘플은 0.5초 동안 50개 안팎뿐입니다. `--rounds 200`(약 0.05초)으로 speedscope를 기록했을 때는 `Samples: 0`이 나왔습니다. 짧게 끝나는 코드는 샘플러로는 볼 수 없습니다.

| | cProfile | py-spy |
|---|----------|--------|
| 작동 방식 | 함수 호출·반환에 훅 (결정적) | 밖에서 주기적으로 스택을 읽음 (샘플링) |
| 이 장의 비용 | 2.5 s (기본 0.46 s) | 0.47~0.53 s |
| 결과 | 정확한 호출 수와 누적 시간 | 샘플 비율, 짧은 실행은 샘플이 부족함 |
| 코드 수정 | `python -m cProfile`로 수정 없이 실행 | 수정 없음, 이미 도는 프로세스에도 attach |
| C 확장 | 확장 함수 호출 단위 | `--native`로 네이티브 프레임 (지원 플랫폼만) |
| asyncio | 코루틴을 짧은 호출 여러 번으로 셈 (3장) | 실행 중인 프레임만 보임 |

정리하면 "몇 번 불렸나"가 궁금하면 cProfile, "운영 중인 프로세스가 지금 어디서 시간을 쓰나"가 궁금하면 py-spy입니다.

## 정리

- py-spy는 대상 메모리를 밖에서 읽는 샘플러입니다. 기본은 읽는 동안 대상을 잠깐 멈추고, `--nonblocking`은 멈추지 않는 대신 불완전한 샘플을 감수합니다.
- `dump`(한 번), `top`(실시간), `record`(flamegraph·speedscope·raw·chrometrace) 세 모드입니다. `dump --locals`로 교착 상태의 잠금 객체까지 보입니다.
- `--subprocesses`는 forkserver 아래의 풀 워커까지 따라갔습니다. `--idle`은 쉬는 스레드를 포함하고 `--gil`은 GIL 보유 스레드만 남깁니다.
- `--native`는 Linux·Windows x86-64와 Linux ARM/Aarch64에서만 지원됩니다. 심볼이 없으면 주소만 나옵니다.
- 권한: macOS는 항상 root, Linux는 자식이 아닌 프로세스에 `ptrace_scope`가 걸리면 root 또는 spawn 방식, 컨테이너는 `SYS_PTRACE`가 필요합니다.
- 이 장의 측정에서 py-spy 비용은 측정 흔들림 수준, cProfile은 5.5배였습니다. 대신 0.05초짜리 실행은 샘플이 0개였습니다.

## 다음 장 예고

Ch 5(시리즈 마지막)는 `faulthandler`, `tracemalloc`, `objgraph`입니다. 세그폴트로 죽는 순간의 트레이스백, 메모리가 새는 줄 찾기, 그리고 GDB의 `py-bt`로 C 레벨에서 파이썬 스택을 읽는 방법을 실제 크래시로 확인합니다.

## 관련 항목

- [Ch 3: asyncio 디버깅](/blog/tools/debugging/python/chapter03-asyncio)
- [Ch 5: faulthandler / tracemalloc / objgraph](/blog/tools/debugging/python/chapter05-faulthandler-tracemalloc)
- [CMake 타겟과 라이브러리](/blog/tools/build/cmake/chapter03-targets) — 심볼을 포함한 검사 대상 빌드 설정의 출발점
- [py-spy GitHub](https://github.com/benfred/py-spy)
- [Brendan Gregg — Flamegraphs](https://www.brendangregg.com/flamegraphs.html)
