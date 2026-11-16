---
title: "pdb 기본 사용법과 breakpoint() 빌트인 — 스크립트 디버깅"
slug: "tools/debugging/python/chapter01-pdb-basics"
date: 2026-05-30T09:01:00
description: "표준 라이브러리 pdb. breakpoint(), 핵심 명령, ipdb, postmortem."
tags: [python, debugging, pdb]
series: "Python Debugging"
seriesOrder: 1
draft: false
topics: ["tools", "tools/debugging"]
---

파이썬 디버깅의 진입점은 표준 라이브러리에 들어 있는 `pdb`입니다. 별도 설치 없이 코드 한 줄로 멈출 수 있다는 게 가장 큰 강점입니다. 이 시리즈는 `pdb`에서 출발해 `ipdb`, `breakpoint()`, post-mortem 분석, 그리고 `debugpy`(IDE 연결)와 `py-spy`(외부 샘플링)로 확장됩니다.

이 장의 출력은 모두 아래 환경에서 직접 돌린 것입니다. 경로가 짧게 보이도록 예제 파일을 게스트의 `/root/py/ch01/`에 두었습니다. 대화형 세션은 `pexpect`로 명령을 입력하며 그대로 기록했고, 명령 설명은 [Python 3.15 `pdb` 문서](https://docs.python.org/3.15/library/pdb.html)를 기준으로 합니다.

| 항목 | 값 |
| --- | --- |
| Python | CPython 3.15.2 (uv가 설치한 빌드) |
| OS | Debian 13 arm64, Linux 6.12.116 (QEMU 게스트) |
| 비교용 | macOS의 Homebrew CPython 3.15.2 (원격 attach 권한 확인) |

## breakpoint() — Python 3.7+ 진입점

코드 안에 멈출 자리를 직접 적는 방법이 가장 빠릅니다. 아래 `process.py`는 반복문 안에 `breakpoint()`를 넣은 작은 예제입니다.

```python title="process.py"
class Item:
    def __init__(self, value):
        self.value = value
    def __repr__(self):
        return f"Item({self.value})"

def process(items):
    total = 0
    for item in items:
        breakpoint()
        total += item.value
    return total

def main():
    items = [Item(1), Item(2), Item(3)]
    print(process(items))

main()
```

[`breakpoint()` 문서](https://docs.python.org/3.15/library/functions.html#breakpoint)에 따르면 이 빌트인은 `sys.breakpointhook()`을 부르고, 기본 훅이 `pdb.set_trace()`를 호출합니다. 3.7에 추가됐습니다. 실행하면 `breakpoint()`가 있는 10번 줄에서 멈춥니다.

```text
$ python process.py
> /root/py/ch01/process.py(10)process()
-> breakpoint()
(Pdb) p item
Item(1)
```

`->`가 가리키는 줄이 `total += item.value`가 아니라 `breakpoint()` 자신이라는 점을 눈여겨봅니다. `pdb.set_trace()` 문서는 3.13부터 "다음 줄이 아니라 즉시 디버거에 들어간다"고 적고 있습니다. 3.12 이하의 튜토리얼 출력과 줄 번호가 하나 다르게 보이는 이유입니다.

`(Pdb)` 프롬프트에서 쓰는 명령은 GDB와 비슷합니다. 아래 표의 단축형은 문서의 `h(elp)`, `w(here)` 같은 표기를 따릅니다.

| 명령 | 단축 | 동작 |
|------|------|------|
| `help` | `h` | 명령 도움말 |
| `list` / `longlist` | `l` / `ll` | 주변 11줄 / 현재 함수 전체 소스 |
| `next` | `n` | 다음 줄(호출한 함수 안에서는 멈추지 않음) |
| `step` | `s` | 다음 줄(호출한 함수 안으로 들어감) |
| `return` | `r` | 현재 함수가 반환할 때까지 |
| `continue` | `c` | 다음 브레이크포인트까지 실행 |
| `p expr` | | 표현식 평가 |
| `pp expr` | | `pprint`로 출력 |
| `whatis expr` | | 타입 출력 |
| `where` | `w` (`bt`도 같은 명령) | 콜스택 |
| `up` / `down` | `u` / `d` | 프레임 이동 |
| `args` | `a` | 현재 함수 인자 |
| `break` | `b` | 브레이크포인트 |
| `quit` | `q` | 디버거 종료 |

`bt`는 문서 목록에는 없지만 3.15.2 `pdb.py`에 `do_bt = do_where`로 정의되어 있어서 GDB 습관대로 쳐도 됩니다. `p` 뒤에는 파이썬 표현식이 그대로 들어가므로 컴프리헨션도 평가됩니다.

```text
(Pdb) p [i.value for i in items if i.value > 1]
[2, 3]
(Pdb) whatis item
<class '__main__.Item'>
```

## 진입 방법 셋

디버거에 들어가는 길은 세 가지입니다. 코드를 고칠 수 있는지, 처음부터 따라가고 싶은지, 이미 죽은 자리를 보고 싶은지에 따라 고릅니다. 집에 들어가는 방법으로 치면 열쇠로 문 열기(`breakpoint()`), 처음부터 안내인과 같이 들어가기(`python -m pdb`), 사고 현장에 나중에 출동하기(post-mortem)입니다.

### 1. breakpoint() 넣기

위 예제처럼 코드에 직접 넣습니다. 멈추고 싶은 자리가 정해져 있을 때 가장 빠릅니다.

### 2. python -m pdb

코드를 건드리지 않고 스크립트의 첫 줄부터 디버거 안에서 실행합니다. 아래 `bp.py`를 예제로 씁니다.

```python title="bp.py"
def score(item_id, value):
    bonus = value * 2
    return bonus + 1

def run():
    total = 0
    for item_id in range(1, 6):
        total += score(item_id, item_id * 10)
    return total

print(run())
```

```text
$ python -m pdb bp.py
> /root/py/ch01/bp.py(1)<module>()
-> def score(item_id, value):
(Pdb) b 8
Breakpoint 1 at /root/py/ch01/bp.py:8
(Pdb) c
> /root/py/ch01/bp.py(8)run()
-> total += score(item_id, item_id * 10)
(Pdb) p total
0
```

문서의 Command-line interface 절은 이렇게 띄운 프로그램이 정상 종료하면 pdb가 프로그램을 *다시 시작*한다고 적습니다. 실제로 끝까지 `c`를 치면 `305`를 출력한 뒤 `The program finished and will be restarted`가 나오고 1번 줄로 돌아왔습니다. 브레이크포인트 같은 상태는 재시작 후에도 남습니다.

### 3. 예외에서 자동 진입 (post-mortem)

스크립트가 죽은 *그 자리*에서 디버깅을 시작하는 방법입니다. 아래 `crash.py`는 설정 파일의 포트가 문자열로 들어와 `+ 1`에서 죽습니다.

```python title="crash.py"
import json

def load(raw):
    cfg = json.loads(raw)
    return cfg["port"] + 1

def main():
    raw = '{"host": "localhost", "port": "5432"}'
    print(load(raw))

main()
```

`-c continue`를 주면 곧바로 실행하다가 예외가 나는 순간 post-mortem으로 들어갑니다. `-c`는 `.pdbrc`에 적은 것처럼 명령을 미리 실행하는 옵션입니다. 아래는 pdb 자체의 프레임 몇 줄을 생략한 출력입니다.

```text
$ python -m pdb -c continue crash.py
Traceback (most recent call last):
  ...
  File "/root/py/ch01/crash.py", line 5, in load
    return cfg["port"] + 1
           ~~~~~~~~~~~~^~~
TypeError: can only concatenate str (not "int") to str
Uncaught exception. Entering post mortem debugging
Running 'cont' or 'step' will restart the program
> /root/py/ch01/crash.py(5)load()
-> return cfg["port"] + 1
(Pdb) p cfg
{'host': 'localhost', 'port': '5432'}
(Pdb) p type(cfg["port"])
<class 'str'>
```

재실행 없이 실패 당시의 `cfg`를 바로 읽어 원인(`'5432'`가 문자열)을 확인했습니다. 코드에서 직접 부를 때는 `pdb.post_mortem()`을 씁니다. 3.13부터 traceback 객체뿐 아니라 예외 객체도 받습니다([`pdb.post_mortem`](https://docs.python.org/3.15/library/pdb.html#pdb.post_mortem)).

```python title="pm_exc.py"
import json, pdb

def load(raw):
    cfg = json.loads(raw)
    return cfg["port"] + 1

try:
    load('{"host": "localhost", "port": "5432"}')
except Exception as exc:
    pdb.post_mortem(exc)
```

```text
$ python pm_exc.py
> /root/py/ch01/pm_exc.py(5)load()
-> return cfg["port"] + 1
(Pdb) p cfg
{'host': 'localhost', 'port': '5432'}
```

## 브레이크포인트

브레이크포인트는 줄 번호, 함수 이름, 조건식으로 겁니다. 같은 줄을 수천 번 지나는 반복문이라면 조건과 무시 횟수(`ignore`)가 손으로 `c`를 누르는 수고를 덜어 줍니다. 다음은 `bp.py`에서 실제로 친 명령과 출력입니다.

```text
(Pdb) b 8
Breakpoint 1 at /root/py/ch01/bp.py:8
(Pdb) b score
Breakpoint 2 at /root/py/ch01/bp.py:2
(Pdb) b 2, item_id == 4
Breakpoint 3 at /root/py/ch01/bp.py:2
(Pdb) b
Num Type         Disp Enb   Where
1   breakpoint   keep yes   at /root/py/ch01/bp.py:8
2   breakpoint   keep yes   at /root/py/ch01/bp.py:2
3   breakpoint   keep yes   at /root/py/ch01/bp.py:2
	stop only if item_id == 4
```

`b score`처럼 함수 이름을 주면 그 함수의 첫 실행 문장(2번 줄)에 걸립니다. 다른 파일은 `b mymod.py:30`이나 `b package.module:30`처럼 적고, 문서에 따르면 파일은 `sys.path`에서 찾습니다. 이어서 2번을 지우고 1번에 조건을 붙였습니다.

```text
(Pdb) cl 2
Deleted breakpoint 2 at /root/py/ch01/bp.py:2
(Pdb) condition 1 total > 50
New condition set for breakpoint 1.
(Pdb) c
> /root/py/ch01/bp.py(8)run()
-> total += score(item_id, item_id * 10)
(Pdb) p item_id, total
(3, 62)
(Pdb) b
Num Type         Disp Enb   Where
1   breakpoint   keep yes   at /root/py/ch01/bp.py:8
	stop only if total > 50
	breakpoint already hit 3 times
3   breakpoint   keep yes   at /root/py/ch01/bp.py:2
	stop only if item_id == 4
	breakpoint already hit 1 time
(Pdb) disable 1 3
Disabled breakpoint 1 at /root/py/ch01/bp.py:8
Disabled breakpoint 3 at /root/py/ch01/bp.py:2
```

`total`이 처음으로 50을 넘는 3번째 반복에서 멈췄습니다. `disable`은 목록에 남긴 채 끄고, `enable`로 다시 켭니다.

`ignore`는 "처음 N번은 그냥 지나가라"입니다. 새 세션에서 `score`에 걸고 3번 무시하게 했더니 네 번째 호출에서 멈췄습니다. `tbreak`는 한 번 멈추면 스스로 지워지는 임시 브레이크포인트입니다.

```text
(Pdb) b score
Breakpoint 1 at /root/py/ch01/bp.py:2
(Pdb) ignore 1 3
Will ignore next 3 crossings of breakpoint 1.
(Pdb) c
> /root/py/ch01/bp.py(2)score()
-> bonus = value * 2
(Pdb) a
item_id = 4
value = 40
(Pdb) tbreak 3
Breakpoint 2 at /root/py/ch01/bp.py:3
(Pdb) c
Deleted breakpoint 2 at /root/py/ch01/bp.py:3
> /root/py/ch01/bp.py(3)score()
-> return bonus + 1
```

## 표현식 평가와 변수 조작

멈춘 김에 값을 고쳐 보고 싶을 때가 많습니다. 문서에 따르면 pdb는 자기 명령이 아닌 입력을 파이썬 문장으로 실행합니다. 함정은 변수 이름이 명령과 겹칠 때입니다. `crash.py`의 5번 줄에서 멈춘 뒤 `n = 1`을 치면 `next` 명령으로 해석됩니다.

```text
(Pdb) n = 1
*** Invalid argument: = 1
      Usage: n(ext)
(Pdb) p n
*** NameError: name 'n' is not defined
(Pdb) !n = 2
(Pdb) p n
2
```

`!`를 앞에 붙이면 명령 해석을 건너뛰고 파이썬 문장으로 실행됩니다. 여러 줄짜리 분석이 필요하면 `interact`로 일반 REPL에 들어갑니다.

```text
(Pdb) interact
*pdb interact start*
>>> import json
>>> print(json.dumps(cfg, indent=2))
{
  "host": "localhost",
  "port": "5432"
}
>>> cfg["port"] = int(cfg["port"])
>>> exit()

*exit from pdb interact command*
(Pdb) p cfg["port"] + 1
5433
```

`interact` 안에서의 *이름 대입*은 원래 프레임에 반영되지 않습니다. 문서는 새 네임스페이스를 만들기 때문이라고 설명하고, 다만 참조하는 가변 객체를 고치면 원래 쪽에도 보인다고 덧붙입니다. 위에서 `cfg["port"]`를 정수로 바꾼 것이 pdb로 돌아온 뒤에도 남아 `5433`이 계산된 이유입니다.

## ipdb — IPython 통합

`ipdb`는 `pip install ipdb`로 설치하는 별도 패키지입니다. [ipdb README](https://github.com/gotcha/ipdb#use)는 IPython 디버거에 탭 완성, 구문 강조, 더 나은 traceback과 introspection을 붙이고 인터페이스는 `pdb`와 같다고 소개합니다. `breakpoint()`의 대상을 바꿀 때는 [`PYTHONBREAKPOINT`](https://docs.python.org/3.15/using/cmdline.html#envvar-PYTHONBREAKPOINT)에 점 표기 경로를 줍니다.

```text
$ PYTHONBREAKPOINT=ipdb.set_trace python process.py
> /root/py/ch01/process.py(10)process()
      9     for item in items:
---> 10         breakpoint()
     11         total += item.value

ipdb> p item
Item(1)
```

ipdb 0.13.13에서 돌렸고, 원래 출력에 있던 색 코드는 지웠습니다. pdb와 달리 위아래 문맥 줄을 함께 보여 줍니다. README는 이 줄 수를 `set_trace(context=5)`나 `IPDB_CONTEXT_SIZE`로 바꿀 수 있다고 적습니다.

`PYTHONBREAKPOINT=0`이면 `sys.breakpointhook()`이 아무것도 하지 않고 바로 반환합니다([`sys.breakpointhook`](https://docs.python.org/3.15/library/sys.html#sys.breakpointhook)). 코드에 `breakpoint()`가 남아 있어도 멈추지 않습니다.

```text
$ PYTHONBREAKPOINT=0 python process.py
6
```

이름을 잘못 적으면 디버거 없이 그냥 진행됩니다. 경고 한 줄만 남기 때문에 "왜 안 멈추지?"의 흔한 원인이 됩니다.

```text
$ PYTHONBREAKPOINT=nosuchmod.set_trace python process.py
/root/py/ch01/process.py:10: RuntimeWarning: Ignoring unimportable $PYTHONBREAKPOINT: "nosuchmod.set_trace"
  breakpoint()
6
```

같은 문서는 프로그램이 `sys.breakpointhook`을 직접 바꿔 놓았다면 `PYTHONBREAKPOINT`를 보지 않는다고도 적습니다. 환경 변수로 끄는 방법은 기본 훅일 때만 통합니다.

## 콜스택 이동

멈춘 함수만 봐서는 "누가 이런 인자로 불렀나"를 알 수 없습니다. `w`로 스택을 보고 `u`로 호출자 프레임에 올라가 그 프레임의 변수를 읽습니다. `process.py`에서 실제로 움직인 결과입니다.

```text
(Pdb) w
  /root/py/ch01/process.py(18)<module>()
-> main()
  /root/py/ch01/process.py(16)main()
-> print(process(items))
> /root/py/ch01/process.py(10)process()
-> breakpoint()
(Pdb) u
> /root/py/ch01/process.py(16)main()
-> print(process(items))
(Pdb) p items
[Item(1), Item(2), Item(3)]
(Pdb) d
> /root/py/ch01/process.py(10)process()
-> breakpoint()
```

GDB의 `up`/`down`과 같은 모델입니다. 가장 최근 프레임이 맨 아래이고 `>`가 현재 프레임입니다. 3.14부터 `w 2`처럼 개수를 주면 최근 프레임 몇 개만 보여 줍니다.

## display — 자동 갱신

반복문에서 값이 어떻게 변하는지 매번 `p`로 치기는 번거롭습니다. `display <expr>`로 등록하면 그 프레임에서 멈출 때마다 값이 *바뀐 경우에만* 새 값과 옛 값을 보여 줍니다.

```text
(Pdb) display total
display total: 0
(Pdb) n
> /root/py/ch01/process.py(11)process()
-> total += item.value
(Pdb) n
> /root/py/ch01/process.py(9)process()
-> for item in items:
display total: 1  [old: 0]
```

`n`을 두 번 친 사이 첫 번째 정지에서는 `total`이 아직 0이라 출력이 없었습니다. 문서는 가변 객체를 제자리에서 고치면 비교 대상도 같이 바뀌어 변화를 못 잡는다고 경고하고, `display lst[:]`처럼 복사본을 등록하는 우회법을 보여 줍니다.

3.14 What's New의 pdb 절에 따르면 `breakpoint()`로 다시 들어갈 때 가장 최근 `Pdb` 인스턴스를 재사용하므로 `display` 같은 설정이 유지됩니다. 실제로 `c`로 다음 반복의 `breakpoint()`에 다시 들어왔을 때 `display total: 3  [old: 1]`이 그대로 출력됐습니다.

## 자주 만나는 패턴

### 예외 시 자동 진입

`python -m pdb`로 띄울 수 없는 프로그램이라면 `sys.excepthook`을 바꿔 미처리 예외에서 디버거를 엽니다. [`sys.excepthook` 문서](https://docs.python.org/3.15/library/sys.html#sys.excepthook)의 대상은 인터프리터 최상위까지 올라온 미처리 예외입니다. `Thread.run()` 안의 미처리 예외는 [`threading.excepthook`](https://docs.python.org/3.15/library/threading.html#threading.excepthook)이 따로 처리하므로 이 훅으로는 잡히지 않습니다.

```python title="postmortem.py"
import pdb
import sys
import traceback

def excepthook(exc_type, value, tb):
    traceback.print_exception(exc_type, value, tb)
    pdb.post_mortem(tb)

def divide():
    numerator = 42
    denominator = 0
    return numerator / denominator

sys.excepthook = excepthook
divide()
```

```text
$ python postmortem.py
Traceback (most recent call last):
  File "/root/py/ch01/postmortem.py", line 15, in <module>
    divide()
    ~~~~~~^^
  File "/root/py/ch01/postmortem.py", line 12, in divide
    return numerator / denominator
           ~~~~~~~~~~^~~~~~~~~~~~~
ZeroDivisionError: division by zero
> /root/py/ch01/postmortem.py(12)divide()
-> return numerator / denominator
(Pdb) p numerator, denominator
(42, 0)
(Pdb) c
```

`c`로 빠져나오면 프로세스는 종료 코드 1로 끝났습니다. 디버거를 거쳤다고 예외가 복구되지는 않습니다.

### 시그널로 외부에서 진입

오래 도는 프로세스를 원하는 순간에 세우고 싶다면 시그널 핸들러에서 `set_trace`를 부릅니다. 핸들러가 받은 `frame`을 넘기면 시그널이 도착했을 때 실행 중이던 프레임에서 멈춥니다.

```python title="sig.py"
import os, signal, pdb, time

def handler(signum, frame):
    pdb.Pdb().set_trace(frame)

signal.signal(signal.SIGUSR1, handler)
open("sig.pid", "w").write(str(os.getpid()))
counter = 0
while counter < 100:
    counter += 1
    time.sleep(0.1)
```

터미널 앞에서 실행한 프로세스에 1초 뒤 `SIGUSR1`을 보내자 루프 안에서 멈췄습니다.

```text
$ (sleep 1; kill -USR1 $(cat sig.pid)) & exec python sig.py
> /root/py/ch01/sig.py(11)<module>()
-> time.sleep(0.1)
(Pdb) p counter
10
```

조건은 디버거가 읽을 입력이 있어야 한다는 것입니다. 같은 프로그램을 셸의 백그라운드 작업(`python sig.py &`)으로 돌리고 시그널을 보냈을 때는 프롬프트가 뜨자마자 입력이 끊겨 `bdb.BdbQuit` traceback과 함께 종료 코드 1로 끝났습니다. 입력을 받을 수 없는 서비스라면 다음 절의 원격 attach나 [4장의 py-spy](/blog/tools/debugging/python/chapter04-py-spy), [5장의 faulthandler](/blog/tools/debugging/python/chapter05-faulthandler-tracemalloc)를 씁니다.

### 3.14+: 실행 중인 프로세스에 pdb 붙이기

3.14부터는 코드를 고치지 않고도 실행 중인 프로세스에 붙을 수 있습니다. [What's New in 3.14의 pdb 절](https://docs.python.org/3.15/whatsnew/3.14.html#pdb)에 따르면 `python -m pdb -p PID`는 [PEP 768](https://peps.python.org/pep-0768/)과 새 `sys.remote_exec()`로 대상 프로세스에 들어갑니다. 0.2초마다 `tick()`을 부르는 `loop.py`에 붙여 봤습니다.

```python title="loop.py"
import time
def tick(n):
    time.sleep(0.2)
    return n + 1
n = 0
while True:
    n = tick(n)
```

```text
$ python -m pdb -p 2112
> /root/py/ch01/loop.py(3)tick()
-> time.sleep(0.2)
(Pdb) w
  /root/py/ch01/loop.py(7)<module>()
-> n = tick(n)
> /root/py/ch01/loop.py(3)tick()
-> time.sleep(0.2)
(Pdb) p n
5
(Pdb) q
```

`q`로 나온 뒤에도 `loop.py`는 계속 돌고 있었습니다. 문서는 대상이 시스템 콜이나 I/O에서 막혀 있으면 다음 바이트코드가 실행되거나 시그널을 받을 때까지 붙지 않는다고 적습니다. 위 예제는 0.2초마다 `sleep`에서 깨어나므로 곧바로 붙었습니다.

권한은 플랫폼마다 다릅니다. [Remote debugging attachment protocol 문서의 Permission requirements 절](https://docs.python.org/3.15/howto/remote_debugging.html#permission-requirements)은 Linux에서 ptrace 제한(Yama)을, macOS에서는 다른 프로세스 디버깅이 기본으로 막혀 있어 Python 바이너리에 `get-task-allow` 서명을 하거나 `sudo`가 필요하다고 설명합니다. 이 Debian 게스트의 `kernel.yama.ptrace_scope`는 0이라 같은 사용자 프로세스에 바로 붙었습니다. 반대로 macOS의 Homebrew 3.15.2에서는 일반 사용자로 바로 거부됐습니다.

```text
$ python -m pdb -p 62554
Error: The specified process cannot be attached to due to insufficient permissions.
See the Python documentation for details on required privileges and troubleshooting:
https://docs.python.org/3.14/howto/remote_debugging.html#permission-requirements
```

대상 프로세스를 `PYTHON_DISABLE_REMOTE_DEBUG=1`로 띄우면 원격 attach가 꺼집니다. 이때 3.15.2가 내는 오류는 "권한"이 아니라 프로세스와 버전을 확인하라는 문구여서 헷갈리기 쉽습니다.

```text
$ PYTHON_DISABLE_REMOTE_DEBUG=1 python loop.py &
$ python -m pdb -p 2084
Cannot attach to pid 2084, please make sure that the process exists and is using the same Python version.
```

## pdb의 한계

pdb는 편하지만 모든 상황에 맞지는 않습니다. 아래 네 가지는 이 장의 실행과 문서로 확인한 한계입니다.

- **멈추는 것은 한 스레드뿐입니다.** 백그라운드 스레드가 10 ms마다 `ticks`를 올리는 `threads.py`에서 메인 스레드가 `breakpoint()`에 들어갈 때 `ticks`는 5였습니다. 프롬프트에서 `p ticks`를 친 시점에는 22, `c` 직후 메인 스레드가 읽은 값은 27이었습니다. 메인 스레드가 프롬프트에 서 있는 동안에도 다른 스레드는 계속 돈 것입니다.
- **asyncio의 콜스택은 태스크 경계에서 끊깁니다.** `await`로 직접 부른 코루틴은 호출자가 스택에 보이지만, 별도 Task로 띄운 코루틴은 이벤트 루프 프레임 위에서 시작합니다. 3장에서 실제 스택으로 비교합니다.
- **입력 채널이 필요합니다.** 위 시그널 예제처럼 표준 입력이 없으면 프롬프트가 곧바로 끝납니다. 원격 attach(`-p`)는 이 문제를 풀지만 ptrace 권한이 필요합니다.
- **큰 객체 출력은 직접 줄여야 합니다.** `p len(items)`, `p items[:5]`처럼 범위를 줄여 출력합니다. `set_trace(header=...)`의 `header`는 정지 직전에 찍는 안내 문자열일 뿐입니다.

## 정리

- 표준 라이브러리 `pdb`와 `breakpoint()`가 가장 빠른 진입입니다. 3.13부터 `breakpoint()` 줄 자체에서 멈춥니다.
- `PYTHONBREAKPOINT`로 디버거를 바꾸거나(`ipdb.set_trace`) 끕니다(`0`). 이름이 틀리면 경고만 남기고 지나갑니다.
- 명령은 GDB와 거의 같습니다(`n`/`s`/`c`/`p`/`w`/`u`/`d`, `bt`도 동작). 조건·`ignore`·`tbreak`로 정지 횟수를 줄입니다.
- 명령 이름과 겹치는 문장은 `!`로 실행하고, 긴 분석은 `interact`로 합니다.
- 사후 분석은 `python -m pdb -c continue` 또는 `sys.excepthook` + `pdb.post_mortem`입니다.
- 3.14+에서는 `python -m pdb -p PID`로 코드 수정 없이 붙습니다. 권한 조건은 OS마다 다릅니다.

## 다음 장 예고

Ch 2는 `debugpy`입니다. IDE가 쓰는 DAP로 debugpy에 직접 요청을 보내 조건부 브레이크포인트, Hit count, Logpoint, `justMyCode`, 서브프로세스 attach가 실제로 어떻게 동작하는지 확인합니다.

## 관련 항목

- [Ch 2: debugpy와 IDE 통합](/blog/tools/debugging/python/chapter02-debugpy-ide)
- [GDB Ch 9: Python 스크립팅](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting) — GDB *안의* Python (방향이 반대)
- [`pdb` 공식 문서 (3.15)](https://docs.python.org/3.15/library/pdb.html)
- [PEP 768 — Safe external debugger interface for CPython](https://peps.python.org/pep-0768/)
- [`ipdb` GitHub](https://github.com/gotcha/ipdb)
