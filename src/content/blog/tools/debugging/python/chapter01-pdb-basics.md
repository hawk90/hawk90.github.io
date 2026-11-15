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

파이썬 디버깅의 진입점은 표준 라이브러리에 들어 있는 `pdb`입니다. 별도 설치 없이, 어디서나 한 줄로 멈출 수 있다는 게 가장 큰 강점입니다. 이 시리즈는 `pdb`에서 출발해 `ipdb`, `breakpoint()`, post-mortem 분석, 그리고 `debugpy`(VSCode 연결)와 `py-spy`(샘플링)로 확장됩니다.

## breakpoint() — Python 3.7+ 진입점

```python
def process(items):
    total = 0
    for item in items:
        breakpoint()                # ← 여기서 정지
        total += item.value
    return total
```

`breakpoint()`는 환경 변수 `PYTHONBREAKPOINT`가 지정한 모듈을 호출합니다. 기본은 `pdb.set_trace`.

```bash
$ python script.py
> /path/to/script.py(4)process()
-> total += item.value
(Pdb)
```

`(Pdb)` 프롬프트에서 GDB와 비슷한 명령들을 씁니다.

| 명령 | 단축 | 동작 |
|------|------|------|
| `help` | `h` | 명령 도움말 |
| `list` | `l` | 주변 소스 보기 |
| `next` | `n` | 다음 줄(함수는 들어가지 않음) |
| `step` | `s` | 다음 줄(함수에 들어감) |
| `return` | `r` | 현재 함수 끝까지 |
| `continue` | `c` | 실행 재개 |
| `p x` | `p` | 표현식 평가 |
| `pp x` | | pretty-print |
| `where` / `bt` | `w` | 콜스택 |
| `up` / `down` | `u` / `d` | 프레임 이동 |
| `args` | `a` | 현재 함수 인자 |
| `p locals()` | | 로컬 변수 dict |
| `break` | `b` | 브레이크포인트 |
| `quit` | `q` | 디버거 종료 |

GDB와 거의 같은 모델. 차이는 `print`가 표현식 평가이고 *그 자체로 파이썬 표현식*이라 `p [x for x in items if x.ok]`처럼 컴프리헨션도 됩니다.

## 진입 방법 셋

### 1. breakpoint() 박기

위와 같이 코드에 `breakpoint()`를 직접 박는 방법. *원하는 자리에 멈출 때* 가장 빠릅니다.

### 2. python -m pdb

```bash
$ python -m pdb script.py
> /path/to/script.py(1)<module>()
-> import os
(Pdb) b 10        # 10번 줄에 브레이크
(Pdb) c
```

스크립트의 *처음부터* 디버거 안에서 실행. 외부에서는 코드를 수정하기 싫을 때.

### 3. 예외에서 자동 진입 (post-mortem)

스크립트가 죽은 *그 자리*에서 디버깅을 시작.

```bash
$ python -m pdb -c continue script.py     # 정상 실행, 예외 시 post-mortem
```

또는 코드에서.

```python
import pdb, sys, traceback
try:
    main()
except Exception:
    traceback.print_exc()
    pdb.post_mortem(sys.exc_info()[2])
```

이미 죽은 *예외 트레이스백 위에서* 변수를 검사할 수 있습니다. 재실행 없이 분석 가능.

## 브레이크포인트

```text
(Pdb) b 25                        # 현재 파일 25번 줄
(Pdb) b my_module.py:30           # 다른 파일
(Pdb) b process                   # 함수 이름
(Pdb) b mymod.MyClass.method      # 클래스 메서드

(Pdb) b 25, total > 100           # 조건부
(Pdb) condition 1 total < 0       # 1번 BP의 조건 변경
(Pdb) ignore 1 10                 # 처음 10번 무시

(Pdb) b                            # 목록
Num Type         Disp Enb   Where
1   breakpoint   keep yes   at script.py:25
                              breakpoint already hit 3 times

(Pdb) cl 1                        # 1번 삭제
(Pdb) disable 1                   # 비활성
```

## 표현식 평가와 변수 조작

```text
(Pdb) p len(items)
42

(Pdb) pp config
{'host': 'localhost',
 'port': 5432,
 'pool_size': 10}

(Pdb) !x = 5                       # Python 문장으로 명시해 명령 이름 충돌 방지
(Pdb) interact                     # 일반 파이썬 REPL 진입
>>> import json
>>> json.dumps(config, indent=2)
>>> exit()                         # 디버거로 복귀
```

`interact`가 강력합니다 — 일반 REPL에서 모듈 임포트·복잡한 컴프리헨션·일회용 스크립트를 짜서 변수 상태를 분석한 뒤 디버거로 돌아옵니다.

## ipdb — IPython 통합

`pip install ipdb`. `pdb`와 인터페이스는 같지만 *IPython 셸* 기능을 얻습니다 — 컬러, 탭 자동 완성, magic 명령(`%timeit`), `?`로 객체 검사.

```python
import ipdb; ipdb.set_trace()
```

또는 `PYTHONBREAKPOINT=ipdb.set_trace`로 `breakpoint()` 기본을 바꿉니다.

```bash
$ export PYTHONBREAKPOINT=ipdb.set_trace
$ python script.py
[ipdb 프롬프트 — pdb와 거의 같지만 컬러, 자동완성]
```

`PYTHONBREAKPOINT=0`이면 `breakpoint()`가 *무시*됩니다 — 운영 코드에 박힌 채로도 자동으로 통과. 디버그 코드를 지우지 않고 비활성화하는 표준 방법.

```bash
# 운영에서 디버거 호출 방지
$ PYTHONBREAKPOINT=0 python script.py
```

## 콜스택 이동

```text
(Pdb) w
  /path/to/main.py(40)<module>()
-> main()
  /path/to/main.py(20)main()
-> process(items)
> /path/to/process.py(5)process()
-> total += item.value

(Pdb) u
> /path/to/main.py(20)main()
-> process(items)
(Pdb) p items
[Item(1), Item(2), Item(3)]

(Pdb) d
> /path/to/process.py(5)process()
-> total += item.value
```

GDB의 `up`/`down`과 같습니다. 호출자가 *어떤 인자로 불렀나*를 보려면 `up` 후 `args`.

## display — 자동 갱신

```text
(Pdb) display total
display total: 0
(Pdb) n
> ...
display total: 5    [old: 0]
```

`display <expr>`로 등록된 표현식이 매 정지마다 자동 출력. 변화량 추적에 편리합니다.

## 자주 만나는 패턴

### 함수 첫 줄에 BP

```text
(Pdb) b process
(Pdb) c
```

### 특정 조건에서만

```text
(Pdb) b process, item.id == 42
```

### 예외 시 자동 진입

```python
import sys, pdb, traceback

def excepthook(type, value, tb):
    traceback.print_exception(type, value, tb)
    pdb.post_mortem(tb)

sys.excepthook = excepthook
```

sys.excepthook은 인터프리터 최상위의 미처리 예외를 다룹니다. 별도 스레드의 threading.excepthook이나 unraisable 예외까지 같은 훅이 처리하는 것은 아닙니다. [sys.excepthook](https://docs.python.org/3.15/library/sys.html#sys.excepthook)의 범위를 확인합니다.

### 시그널로 외부에서 진입

```python
import signal, pdb

def handler(signum, frame):
    pdb.Pdb().set_trace(frame)

signal.signal(signal.SIGUSR1, handler)
```

```bash
$ kill -USR1 <pid>
```

이 방식은 시그널 지원과 연결 가능한 입력 터미널이 있는 Unix 프로세스를 전제로 합니다. 입력을 받을 수 없는 서비스에 대화형 디버거를 열기 전에 [4장의 py-spy](/blog/tools/debugging/python/chapter04-py-spy)나 5장의 비대화형 traceback dump를 검토합니다. 다음 장은 debugpy입니다.

## pdb의 한계

- *멀티 스레드 정지 시점*이 흔들립니다. 한 스레드가 멈춰도 다른 스레드는 계속 실행 — GIL 때문에 결정적 디버깅이 어렵습니다.
- 비동기(`asyncio`)는 `await`가 코루틴을 떠나는 순간 컨텍스트가 사라져 콜스택이 짧게 보입니다 (Ch 3에서 다룸).
- 원격·운영 서비스에 콘솔 진입은 위험 — `py-spy`나 `debugpy` 쪽이 안전.
- 큰 객체 출력은 범위를 제한합니다. `p items[:5]`나 타입·길이부터 확인하며, set_trace의 header는 정지 안내 문자열이지 객체 출력 제한 기능이 아닙니다.

## 직접 확인 — 예외 훅에서 실제 로컬 변수 검사

다음 파일은 CPython 3.15.0·macOS에서 실행했습니다. traceback 임포트가 빠지면 원래 예외를 분석하기 전에 훅 자체가 NameError로 실패하므로 임포트와 진입을 함께 확인합니다.

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

`python3 postmortem.py`를 실행하고 Pdb에서 `p numerator`를 입력하면 42를 읽습니다. `where`로 divide 프레임을 확인하고 `continue`로 빠져나옵니다. 프로그램은 원래의 미처리 ZeroDivisionError로 실패 종료하며, 디버거를 방문했다고 오류가 복구되는 것은 아닙니다. 스크립트 전체 재실행 대신 실패 당시 traceback의 변수를 검사하는 예입니다. [post_mortem 문서](https://docs.python.org/3.15/library/pdb.html#pdb.post_mortem)를 참고합니다.

## 정리

- 표준 라이브러리 `pdb` + `breakpoint()`가 가장 빠른 진입.
- `PYTHONBREAKPOINT` 환경 변수로 디버거 선택·비활성화.
- 명령은 GDB와 거의 같음 — `n`/`s`/`c`/`p`/`w`/`u`/`d`.
- Python 문장은 `!`로 명시해 디버거 명령과 구분하고 interact로 일반 REPL에 진입합니다.
- 운영 친화: `ipdb`로 컬러·자동 완성, `PYTHONBREAKPOINT=0`으로 비활성.
- 예외 자동 진입(`sys.excepthook` / `pdb.post_mortem`)이 *사후 분석* 표준 패턴.

## 다음 장 예고

Ch 2 — `debugpy`로 VSCode·PyCharm 같은 IDE에 연결. 원격 프로세스에 attach, 멀티프로세스 디버깅, justMyCode 옵션.

## 관련 항목

- [Ch 2: debugpy와 IDE 통합](/blog/tools/debugging/python/chapter02-debugpy-ide)
- [GDB Ch 9: Python 스크립팅](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting) — GDB *안의* Python (방향이 반대)
- [`pdb` 공식 문서](https://docs.python.org/3/library/pdb.html)
- [`ipdb` GitHub](https://github.com/gotcha/ipdb)
