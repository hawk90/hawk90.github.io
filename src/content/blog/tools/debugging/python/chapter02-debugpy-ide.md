---
title: "debugpy 활용 — VSCode·DAP·원격 attach 통합"
slug: "tools/debugging/python/chapter02-debugpy-ide"
date: 2026-05-30T09:02:00
description: "debugpy로 IDE 디버깅, 원격 프로세스 attach, justMyCode, 멀티프로세스."
tags: [python, debugging, debugpy, vscode]
series: "Python Debugging"
seriesOrder: 2
draft: false
topics: ["tools", "tools/debugging"]
---

`pdb`가 콘솔의 도구라면 [`debugpy`](https://github.com/microsoft/debugpy)는 IDE 뒤에서 도는 디버거입니다. [debugpy README](https://github.com/microsoft/debugpy#readme)는 자신을 "Python 3용 Debug Adapter Protocol(DAP) 구현"이라고 소개합니다. [VS Code Python 디버깅 문서](https://code.visualstudio.com/docs/python/debugging)에 따르면 Python Debugger 확장은 Python 확장과 함께 자동으로 설치되고, 그 디버깅 기능이 debugpy로 동작합니다.

DAP는 IDE와 디버거 사이의 공용 언어입니다. 식당으로 치면 IDE는 손님 앞의 주문 화면이고, debugpy는 주방이고, DAP는 둘 사이를 오가는 주문표 양식입니다. 양식만 맞으면 어느 화면에서 주문해도 같은 주방이 요리합니다. 그래서 이 장은 VSCode 화면 대신 *주문표 자체*를 직접 써 봅니다. 50줄 남짓한 파이썬 DAP 클라이언트로 debugpy에 `setBreakpoints`·`stackTrace`·`evaluate` 같은 요청을 보내고, 돌아온 응답과 이벤트를 그대로 기록했습니다.

| 항목 | 값 |
| --- | --- |
| debugpy | 1.8.22 |
| Python | CPython 3.15.2 (uv 빌드), Debian 13 arm64 게스트 |
| 기타 | Flask 3.1.3 / Werkzeug 3.1.9, IPython 9.18.1 |
| 확인하지 않은 것 | VSCode·Neovim·PyCharm 화면 자체. IDE 쪽 설명은 각 공식 문서를 인용합니다 |

## launch.json — VSCode 기본

VSCode는 `.vscode/launch.json`의 설정을 DAP 요청으로 바꿔 debugpy에 보냅니다. 아래는 스크립트 실행, 모듈 실행, 원격 attach의 세 가지 기본형입니다. 키 이름은 VS Code 문서의 "Set configuration options" 절을 따릅니다.

```json title="launch.json"
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: 현재 파일",
      "type": "debugpy",
      "request": "launch",
      "program": "${file}",
      "console": "integratedTerminal",
      "justMyCode": true
    },
    {
      "name": "Python: 모듈로 실행",
      "type": "debugpy",
      "request": "launch",
      "module": "myapp.main",
      "args": ["--config", "dev.yaml"]
    },
    {
      "name": "Python: 원격 attach",
      "type": "debugpy",
      "request": "attach",
      "connect": { "host": "127.0.0.1", "port": 5678 },
      "pathMappings": [
        {
          "localRoot": "${workspaceFolder}",
          "remoteRoot": "/srv/app"
        }
      ]
    }
  ]
}
```

`launch`는 IDE가 프로세스를 직접 띄워 시작부터 디버깅합니다. `attach`는 이미 debugpy를 띄운 프로세스에 연결하므로 컨테이너나 다른 머신의 프로세스에 씁니다. `pathMappings`는 원격의 파일 경로(`remoteRoot`)를 로컬 소스(`localRoot`)에 대응시킵니다. VS Code 문서의 원격 디버깅 예제는 양쪽에 같은 소스가 있어야 한다고 적습니다.

## 원격 attach — 프로세스 쪽 준비

attach하려면 대상 프로세스 안에서 debugpy가 접속을 기다리고 있어야 합니다. README의 "Import usage" 절이 설명하는 API는 세 가지입니다. `listen()`은 접속을 받을 주소를 열고, `wait_for_client()`는 클라이언트가 붙을 때까지 막고, `breakpoint()`는 클라이언트가 붙어 있을 때만 멈춥니다.

```python title="debug-start.py"
import os

if os.getenv("DEBUGPY_ENABLE") == "1":
    import debugpy
    endpoint = debugpy.listen(("127.0.0.1", int(os.getenv("DEBUGPY_PORT", "5678"))))
    print(f"debugpy listening: {endpoint}", flush=True)
    debugpy.breakpoint()
    print("debugpy.breakpoint() returned without a client", flush=True)

print("application ready", flush=True)
```

환경 변수 없이 실행하면 debugpy를 import하지도 않습니다. `DEBUGPY_PORT=0`을 주면 `listen()`이 빈 포트를 골라 실제 주소를 반환하고, 클라이언트가 없으니 `debugpy.breakpoint()`는 그냥 지나갑니다. 이 동작은 README의 "`breakpoint()` function" 절과 같습니다.

```text
$ python debug-start.py
application ready
$ DEBUGPY_ENABLE=1 DEBUGPY_PORT=0 python debug-start.py
0.00s - Debugger warning: It seems that frozen modules are being used, which may
0.00s - make the debugger miss breakpoints. Please pass -Xfrozen_modules=off
0.00s - to python to disable frozen modules.
0.00s - Note: Debugging will proceed. Set PYDEVD_DISABLE_FILE_VALIDATION=1 to disable this validation.
debugpy listening: ('127.0.0.1', 36795)
debugpy.breakpoint() returned without a client
application ready
```

첫 네 줄은 3.15.2에서 debugpy를 켤 때마다 나온 경고입니다. 표준 라이브러리 일부가 frozen 모듈이라 그 안의 브레이크포인트를 놓칠 수 있다는 뜻이고, 경고 문구대로 `python -Xfrozen_modules=off`로 다시 띄우자 경고 없이 `debugpy listening:` 줄부터 출력됐습니다.

코드를 고치지 않으려면 debugpy CLI로 스크립트를 감쌉니다. README에 따르면 `--wait-for-client`를 주면 클라이언트가 붙기 전에는 사용자 코드를 실행하지 않습니다. 컨테이너라면 이렇게 씁니다.

```dockerfile
RUN pip install debugpy
EXPOSE 5678
CMD ["python", "-m", "debugpy", "--listen", "0.0.0.0:5678", \
     "--wait-for-client", "main.py"]
```

`--listen`의 호스트를 생략하면 127.0.0.1이고, `0.0.0.0`은 모든 인터페이스에서 받습니다. README는 바로 이어서 "이 포트에 접속할 수 있는 누구나 디버깅 중인 프로세스에서 임의의 코드를 실행할 수 있다"고 경고합니다. 컨테이너 밖에서는 `docker run -p 127.0.0.1:5678:5678 ...`처럼 호스트의 loopback에만 묶습니다.

### 이미 도는 프로세스에 주입 (`--pid`)

debugpy를 넣지 않고 띄운 프로세스에도 붙을 수 있습니다. README의 "Attaching to a running process by ID" 절은 `--pid`가 대상에 디버거를 주입해, 명령이 끝나면 처음부터 `-m debugpy`로 띄운 것처럼 서버가 돈다고 설명합니다. debugpy 1.8.22의 `debugpy/server/cli.py`(475~502행)는 `sys.remote_exec`이 있으면(3.14+, [PEP 768](https://peps.python.org/pep-0768/)) 그걸 먼저 쓰고, 실패하면 기존 pydevd 방식으로 다시 시도합니다.

1장의 `loop.py`(0.2초마다 `tick()`)를 그냥 띄운 뒤 주입하고, DAP로 `pause`·`stackTrace`·`evaluate`를 보냈습니다.

```text
$ python -m debugpy --listen 127.0.0.1:5679 --pid 2355
(exit=0)
# DAP pause → stackTrace
tick /root/py/ch01/loop.py:4
<module> /root/py/ch01/loop.py:7
# evaluate "n" in the top frame
6
# loop.py alive after disconnect: True
```

위 블록은 클라이언트 로그에서 응답 값만 추린 것입니다. 이 게스트는 `kernel.yama.ptrace_scope`가 0이라 같은 root 사용자 프로세스에 바로 주입됐습니다. VS Code 문서의 Troubleshooting 절은 Linux에서 attach가 "timed out"으로 실패하면 `echo 0 | sudo tee /proc/sys/kernel/yama/ptrace_scope`를 임시로 쓰라고 적습니다.

## justMyCode — 라이브러리 안으로 들어갈까

`step in`을 눌렀는데 `json.dumps` 내부로 들어가 버리면 내 버그를 찾는 데 방해가 됩니다. 반대로 라이브러리 버그를 쫓을 때는 들어가야 합니다. VS Code 문서는 `justMyCode`를 생략하거나 `true`로 두면(기본값) 사용자 코드만 디버깅하고, `false`면 표준 라이브러리까지 들어간다고 설명합니다. 아래 `target.py`의 5번 줄에서 두 설정을 비교했습니다.

```python title="target.py"
import json

def handle(i, items):
    current = items[i]
    payload = json.dumps({"i": i, "v": current})
    return payload

def main():
    items = list(range(100, 120))
    out = []
    for i in range(len(items)):
        out.append(handle(i, items))
    print(f"done {len(out)}", flush=True)

main()
```

| 설정 | 5번 줄에서 `stepIn` 후 최상위 프레임 | 비고 |
| --- | --- | --- |
| `justMyCode: true` | `handle` `target.py:6` | `json.dumps`를 건너뜀 |
| `justMyCode: false` | `dumps` `.../lib/python3.15/json/__init__.py:230` | 표준 라이브러리 안으로 들어감 |

`true`일 때 debugpy는 건너뛰었다는 사실을 `output` 이벤트(category `important`)로 알려 줍니다.

```text
Frame skipped from debugging during step-in.
Note: may have been skipped because of "justMyCode" option (default == true). Try setting "justMyCode": false in the debug configuration (e.g., launch.json).
```

## 조건부 BP / Hit count / 로그포인트

반복문이 1만 번 도는데 문제는 7번째에서만 난다면 매번 멈추는 브레이크포인트는 쓸모가 없습니다. DAP의 `setBreakpoints`는 브레이크포인트마다 조건식(`condition`), 적중 횟수 조건(`hitCondition`), 로그 메시지(`logMessage`)를 붙일 수 있고, VSCode의 브레이크포인트 편집 UI가 이 세 필드를 채웁니다. `target.py` 5번 줄(`i`가 0~19)에 각각 걸어 봤습니다.

| 요청 필드 | 값 | 실제 결과 |
| --- | --- | --- |
| `condition` | `i == 7` | 한 번 정지, `evaluate`로 `i`=7, `current`=107 |
| `hitCondition` | `>=15` | 15번째 적중에서 정지, `i`=14 |
| `logMessage` | `current={current} i={i}` | 정지 없이 `current=100 i=0` … `current=119 i=19`의 20줄 `output` 이벤트 |
| `logMessage` | `current={current!r}` | 정지 없이 `invalid syntax (<string>, line 1)`이 20번 출력 |

마지막 줄이 함정입니다. 중괄호 안이 식으로 평가되기는 하지만 f-string처럼 `!r` 변환을 붙이면 1.8.22에서는 구문 오류가 납니다. `repr()`이 필요하면 `{repr(current)}`처럼 함수 호출로 적습니다. Hit count 문법은 VS Code 문서의 "Conditional breakpoints" 절에 따라 정수 또는 `==`, `>`, `>=`, `<`, `<=`, `%` 접두 정수입니다.

로그포인트는 [GDB Ch 5](/blog/tools/debugging/gdb-lldb/chapter05-breakpoints-watchpoints)의 `commands` + `silent` + `printf` 조합과 같은 역할을 합니다. 코드를 고치거나 재배포하지 않고 임시 로그를 얻을 수 있습니다.

## 멀티프로세스 / 서브프로세스

`multiprocessing`이나 `subprocess`로 자식을 띄우는 프로그램은 부모만 디버깅해서는 자식 안의 브레이크포인트에 걸리지 않습니다. debugpy CLI로 띄운 부모가 자식을 만들 때 무슨 일이 생기는지 아래 `parent.py`로 확인했습니다.

```python title="parent.py"
import multiprocessing, subprocess, sys, os

def work(n):
    print(f"mp child pid={os.getpid()} n={n}", flush=True)

if __name__ == "__main__":
    p = multiprocessing.Process(target=work, args=(1,))
    p.start(); p.join()
    subprocess.run([sys.executable, "-c", "import os; print(f'popen child pid={os.getpid()}', flush=True)"])
    print("parent done", flush=True)
```

| 실행 | DAP 클라이언트가 받은 것 | 프로그램 출력 |
| --- | --- | --- |
| `python -m debugpy --listen ... --wait-for-client parent.py` | `debugpyAttach` 이벤트 2개 (`"request": "attach"`, multiprocessing의 forkserver·resource_tracker 프로세스 PID와 접속 주소) | 없음. 클라이언트가 자식에 붙지 않자 15초 동안 진행하지 않음 |
| 같은 명령 + `--configure-subProcess False` | 자식 관련 이벤트 없음 | `mp child ...`, `popen child ...`, `parent done` |

CLI로 띄우면 서브프로세스 추적이 기본으로 켜져 있었습니다(1.8.22 `cli.py`의 기본 설정 `"subProcess": True`). 두 이벤트의 PID를 `/proc/PID/cmdline`으로 확인하니 3.15.2의 Linux 기본 시작 방식인 forkserver 프로세스와 resource_tracker 프로세스였습니다. 둘 다 debugpy를 싣고 시작해 클라이언트의 attach를 기다렸고, 부모는 `py-spy dump`로 보니 `p.start()`(`parent.py:8`) 안의 `ForkServer.connect_to_new_process`에서 forkserver의 응답을 기다리고 있었습니다. `work`를 실행할 자식은 만들어지지도 않았습니다. IDE가 `debugpyAttach`를 받아 자식 세션을 열어 줘야 진행됩니다. README의 "Ignoring subprocesses" 절에 있는 `--configure-subProcess False`를 주면 자식은 디버거 없이 바로 실행됩니다.

`launch.json`에서는 키가 `subProcess`입니다. VS Code 문서는 이 값의 기본을 `false`라고 적고, attach 설정에서는 클라이언트가 붙기 전에 정해야 하는 속성이라 `--configure-subProcess`로 넘긴다고 설명합니다. 같은 설정 이름이어도 CLI의 기본값(위 실행에서 켜짐)과 VSCode `launch`의 기본값(문서상 꺼짐)이 다르다는 점을 기억해 둡니다.

## Django / Flask

웹 프레임워크의 자동 리로더는 앱을 *자식 프로세스*에서 다시 띄웁니다. 바로 앞 절의 서브프로세스 문제가 그대로 나타납니다. Flask로 직접 확인했습니다.

```python title="app.py"
from flask import Flask
app = Flask(__name__)

@app.get("/user/<int:uid>")
def user(uid):
    name = f"user{uid}"
    return {"uid": uid, "name": name}
```

6번 줄에 브레이크포인트를 걸고 `/user/7`을 요청했습니다. 리로더를 끈 실행은 `user` 함수의 6번 줄에서 멈췄고, `continue` 뒤 `{"name":"user7","uid":7}`가 응답됐습니다. `--debug`(리로더 켬)로 띄운 실행은 `* Restarting with stat` 뒤 `debugpyAttach` 이벤트 2개가 왔습니다. 같은 실행을 다시 해 PID의 명령줄을 보니 하나는 리로더가 다시 띄운 `flask ... run --debug` 프로세스, 다른 하나는 multiprocessing의 resource_tracker였습니다. 그리고 자식에 붙지 않은 클라이언트 쪽에서는 브레이크포인트도 응답도 없이 HTTP 요청이 10초 만에 시간 초과됐습니다.

```text
$ python -m debugpy --listen 127.0.0.1:5701 --wait-for-client -m flask --app app run --port 6701 --no-debugger --no-reload
# STOP user app.py:6
# HTTP response: {"name":"user7","uid":7}
$ python -m debugpy --listen 127.0.0.1:5702 --wait-for-client -m flask --app app run --port 6702 --debug
 * Restarting with stat
<< event debugpyAttach {"connect": {"host": "127.0.0.1", "port": 5702}, "name": "Subprocess 2444", "subProcessId": 2444, "request": "attach"}
<< event debugpyAttach {"connect": {"host": "127.0.0.1", "port": 5702}, "name": "Subprocess 2445", "subProcessId": 2445, "request": "attach"}
# no stop within 8 s
# HTTP response: TimeoutError('timed out')
```

VS Code 문서의 "Flask debugging" 절이 제시하는 설정은 다음과 같습니다. `flask run --help`에 따르면 `--debug`를 주면 리로더와 Flask 자체 디버거가 함께 켜지고, `--no-debugger`·`--no-reload`로 각각 끕니다. `"jinja": true`는 Jinja 템플릿 디버깅을 켭니다.

```json
{
  "name": "Python Debugger: Flask",
  "type": "debugpy",
  "request": "launch",
  "module": "flask",
  "env": { "FLASK_APP": "app.py" },
  "args": ["run", "--no-debugger"],
  "jinja": true
}
```

Django는 같은 문서의 "Debugging specific app types" 절에 따라 `program`을 `manage.py`로, `args`를 `["runserver"]`로 두고 `"django": true`로 템플릿 디버깅을 켭니다. Django는 이 글에서 실행하지 않았습니다.

```json
{
  "type": "debugpy",
  "request": "launch",
  "program": "${workspaceFolder}/manage.py",
  "args": ["runserver"],
  "django": true
}
```

## IPython / Jupyter의 %pdb

노트북에서는 IPython의 `%pdb` 매직이 예외 시 자동으로 디버거를 엽니다. IPython 9.18.1 셸에서 실행한 결과입니다. 노트북 화면 자체는 이 글에서 확인하지 않았습니다.

```text
In [1]: %pdb on
Automatic pdb calling has been turned ON

In [2]: x = 0

In [3]: 1 / x
---------------------------------------------------------------------------
ZeroDivisionError                         Traceback (most recent call last)
Cell In[3], line 1
----> 1 1 / x

ZeroDivisionError: division by zero
> <ipython-input-3-d03992758f9d>(1)<module>()
----> 1 1 / x

ipdb> p x
0
```

프롬프트가 `ipdb>`인 것에서 보이듯 IPython 디버거가 열립니다.

## 보안 — 운영 환경 주의

debugpy의 `--listen` 포트에는 인증이 없습니다. 연결한 쪽은 디버거 명령뿐 아니라 임의의 파이썬 식을 실행할 수 있습니다. 앞의 조건부 브레이크포인트 세션에서 `evaluate`로 `__import__('os').getpid()`를 보내자 디버깅 중인 프로세스의 PID(2172)가 그대로 돌아왔습니다. 이 식 자리에 파일 삭제나 셸 실행이 들어가도 막는 장치가 없습니다.

1.8.22 CLI에는 `--adapter-access-token`이 있지만 `cli.py`(243~244행)는 이 옵션을 `--connect` 모드에서만 받습니다. debugpy가 IDE 쪽으로 *먼저 접속*하는 방향이라 `--listen`의 무인증 포트를 보호하지는 않습니다. 그래서 다음 세 가지를 지킵니다.

- `--listen`은 127.0.0.1에 묶고, 원격에서는 SSH 터널로 접근합니다. VS Code 문서도 127.0.0.1·localhost가 아닌 호스트를 쓰면 다른 머신에 포트를 여는 것이라며 SSH 터널을 권합니다.
- 컨테이너는 `-p 127.0.0.1:5678:5678`처럼 호스트 loopback에만 포트를 엽니다.
- 운영 코드에서는 `debug-start.py`처럼 환경 변수로 켤 때만 import·listen합니다.

```bash
ssh -L 5678:localhost:5678 user@server
# 로컬 VSCode는 localhost:5678에 attach
```

## DAP — IDE 호환성

debugpy를 쓰는 클라이언트는 VSCode만이 아닙니다. Neovim의 [nvim-dap-python README](https://github.com/mfussenegger/nvim-dap-python)는 debugpy가 설치된 인터프리터를 `setup()`에 넘기라고 안내하고, 그 인터프리터로 `python -m debugpy --version`이 동작해야 한다고 적습니다.

```lua
require("dap-python").setup("/path/to/venv/bin/python")
```

PyCharm은 경로가 다릅니다. [PyCharm 원격 디버깅 문서](https://www.jetbrains.com/help/pycharm/remote-debugging-with-product.html)의 "Python Debug Server" 설정은 원격 쪽에 `pydevd-pycharm` 패키지를 PyCharm 버전에 맞춰 설치하고 IDE로 접속하게 합니다. debugpy와는 설치 패키지와 접속 방향이 달라서 같은 `launch.json`이나 같은 서버 코드를 그대로 쓸 수 없습니다.

## 자주 만나는 문제

아래 증상은 모두 이 장의 실행에서 직접 봤거나 VS Code 문서의 Troubleshooting 절에 있는 것입니다.

| 증상 | 원인 / 해법 | 근거 |
|------|-------------|------|
| `Debugger warning: It seems that frozen modules are being used` | 표준 라이브러리 frozen 모듈. `-Xfrozen_modules=off`로 실행 | 실행 |
| `Frame skipped from debugging during step-in` | `justMyCode: true`. 라이브러리 안으로 가려면 `false` | 실행 |
| 로그포인트가 `invalid syntax`만 출력 | `{expr!r}` 같은 f-string 변환. `{repr(expr)}`로 | 실행 |
| 리로더를 켠 Flask에서 요청이 멈춤 | 리로더 자식이 attach를 기다림. `--no-reload` 또는 클라이언트가 서브프로세스에 붙도록 설정 | 실행 |
| Linux에서 attach가 "timed out" | ptrace 제한. `kernel.yama.ptrace_scope` 확인 | VS Code 문서 |
| `"type": "python"` 설정이 동작하지 않음 | 지원 중단된 값. `"debugpy"`로 바꿈 | VS Code 문서 |

## 정리

- debugpy는 DAP 구현이며 VSCode의 Python Debugger 확장과 nvim-dap-python이 이를 씁니다. PyCharm 원격 디버깅은 `pydevd-pycharm`을 쓰는 별도 절차입니다.
- `launch`는 IDE가 띄우고, `attach`는 `listen()`/`--listen`/`--pid`로 준비된 프로세스에 붙습니다. 3.14+에서 `--pid`는 `sys.remote_exec`을 먼저 시도합니다.
- 조건(`i == 7`), Hit count(`>=15`), 로그포인트(`{expr}`)로 코드 수정 없이 정지 지점을 좁힙니다. 로그포인트에 `!r`은 쓰지 않습니다.
- CLI로 띄우면 서브프로세스 추적이 켜져 있고, 자식은 클라이언트가 붙을 때까지 기다립니다. 리로더가 있는 웹 서버가 멈춘 듯 보이는 원인입니다.
- `--listen` 포트는 인증 없이 임의 코드 실행을 허용합니다. loopback + SSH 터널로만 엽니다.

## 다음 장 예고

Ch 3은 `asyncio` 디버깅입니다. 코루틴 콜스택이 언제 짧아지는지 실제 스택으로 확인하고, 디버그 모드의 slow callback·생성 위치 추적, 3.14의 `asyncio` 호출 그래프와 `python -m asyncio ps`를 다룹니다.

## 관련 항목

- [Ch 1: pdb 기본](/blog/tools/debugging/python/chapter01-pdb-basics)
- [Ch 3: asyncio 디버깅](/blog/tools/debugging/python/chapter03-asyncio)
- [GDB Ch 10: TUI / 프런트엔드](/blog/tools/debugging/gdb-lldb/chapter10-tui-frontends) — DAP는 IDE와 디버거 사이의 표준
- [debugpy GitHub](https://github.com/microsoft/debugpy)
- [VS Code — Python debugging](https://code.visualstudio.com/docs/python/debugging)
