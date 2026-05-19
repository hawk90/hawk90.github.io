---
title: "Ch 2: debugpy — VSCode / PyCharm / 원격 attach"
date: 2026-05-17T02:00:00
description: "debugpy로 IDE 디버깅, 원격 프로세스 attach, justMyCode, 멀티프로세스."
tags: [python, debugging, debugpy, vscode]
series: "Python Debugging"
seriesOrder: 2
draft: false
---

`pdb`가 콘솔의 도구라면 [`debugpy`](https://github.com/microsoft/debugpy)는 IDE의 디버거입니다. Microsoft가 만들고 VSCode의 Python 익스텐션이 기본으로 깔아 두는 그 디버거. DAP(Debug Adapter Protocol)를 말하므로 VSCode·PyCharm·Neovim 모두 같은 어댑터를 씁니다.

## launch.json — VSCode 기본

`.vscode/launch.json`.

```json
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
      "connect": { "host": "192.168.1.20", "port": 5678 },
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

`launch` vs `attach`.

- `launch` — IDE가 *직접* 프로세스를 띄움. 시작부터 디버깅.
- `attach` — *이미 도는* 프로세스에 연결. 운영 디버깅·컨테이너 안 디버깅의 표준.

## 원격 attach — 코드에 박는 한 줄

운영 서버나 컨테이너의 파이썬 프로세스에 연결하려면 *그 프로세스가* debugpy 서버를 시작해야 합니다.

```python
# 앱 시작 시
import debugpy
debugpy.listen(("0.0.0.0", 5678))
print("debugpy listening on 5678", flush=True)

# (선택) 클라이언트가 붙을 때까지 기다림
debugpy.wait_for_client()

# 또는 한 곳에서만 멈추고 싶을 때
debugpy.breakpoint()         # IDE가 attach 안 되어 있으면 그냥 통과
```

VSCode에서 위 `attach` 설정으로 연결합니다.

```text
[로컬] VSCode  ─DAP─>  [원격] debugpy (5678)  ─내부─>  파이썬 프로세스
```

### 컨테이너 안에서

```dockerfile
RUN pip install debugpy
EXPOSE 5678
CMD ["python", "-m", "debugpy", "--listen", "0.0.0.0:5678", \
     "--wait-for-client", "main.py"]
```

`python -m debugpy --listen ... --wait-for-client script.py`는 *그 자체로* 앱을 띄우면서 5678에서 클라이언트를 기다립니다. `--wait-for-client`가 있으면 IDE가 연결되기 전까지 첫 줄도 실행 안 합니다.

`docker run -p 5678:5678 myimage` 후 VSCode에서 attach.

## justMyCode — 라이브러리 안으로 들어갈까

```json
{ "justMyCode": true }     // 기본
```

`step in` 시 표준 라이브러리·`site-packages` 코드를 건너뜁니다. 일상 개발에선 이게 빠르지만, 라이브러리 버그를 추적할 땐 `false`로 두고 들어갑니다.

## 조건부 BP / Hit count / 로그포인트

VSCode IDE의 강력한 기능. *코드를 수정하지 않고도* 정지 조건을 입힙니다.

| | 설정 |
|---|------|
| 조건부 | "Expression": `len(items) > 100` |
| Hit count | "Hit count": `>= 10` (10번째 호출부터) |
| Logpoint | "Log message": `current={current!r}` — 멈추지 않고 디버그 콘솔에 출력 |

특히 *Logpoint*가 GDB Ch 5의 `commands silent printf`와 같은 역할 — 정지 없이 출력만 떨어집니다. 운영 환경에서 코드 수정 없이 임시 로깅 추가에 매우 유용.

## 멀티프로세스 / 서브프로세스

`multiprocessing.Process`, `subprocess.Popen`, `os.fork`로 새 프로세스가 만들어지면 자동 attach.

```json
{
  "subProcess": true
}
```

가장 흔한 사례: gunicorn/uvicorn 워커.

```python
# gunicorn config
import debugpy
debugpy.listen(("0.0.0.0", 5678))
```

워커가 fork되면 각 워커가 자기 포트로 서버를 띄우므로 포트 충돌이 일어납니다. 해법.

```python
import os, debugpy
port = 5678 + os.getpid() % 1000
debugpy.listen(("0.0.0.0", port))
```

또는 `--multiprocess` 옵션과 함께 VSCode의 multi-target 디버깅 기능을 씁니다.

## Django / Flask / FastAPI

웹 프레임워크는 보통 `werkzeug`나 `uvicorn`이 자동 리로드를 하므로 디버거가 잘 안 붙습니다. 옵션.

### Flask

```python
if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)   # 리로더 끄기
```

또는 VSCode의 Flask 디버깅 설정.

```json
{
  "type": "debugpy",
  "request": "launch",
  "module": "flask",
  "env": { "FLASK_APP": "app.py", "FLASK_ENV": "development" },
  "args": ["run", "--no-debugger", "--no-reload"],
  "jinja": true
}
```

### FastAPI / uvicorn

```json
{
  "type": "debugpy",
  "request": "launch",
  "module": "uvicorn",
  "args": ["main:app", "--reload"],
  "jinja": false
}
```

`--reload`는 보통 *디버거와 충돌*하므로 단일 워커로 디버깅.

### Django

```json
{
  "type": "debugpy",
  "request": "launch",
  "program": "${workspaceFolder}/manage.py",
  "args": ["runserver", "0.0.0.0:8000", "--noreload"],
  "django": true
}
```

`"django": true`로 템플릿 디버깅 활성화.

## Jupyter / Notebook

VSCode의 Jupyter 익스텐션이 debugpy를 통합. 셀에 BP를 찍고 "Debug Cell"로 실행. 또는 `%pdb` 매직으로 셀 실행 후 예외 시 자동 진입.

```python
%pdb on
1 / 0
# → ZeroDivisionError 후 자동 pdb 진입
```

## 보안 — 운영 환경 주의

debugpy의 listen 포트는 *인증이 없습니다*. 누구든 연결되면 임의 코드 실행 가능.

- 방화벽으로 외부 차단.
- SSH 터널로만 노출.

```bash
$ ssh -L 5678:localhost:5678 user@server
# 로컬에서 VSCode가 localhost:5678에 attach
```

- 운영 코드에 `debugpy.listen`을 *항상* 켜두지 말 것. 환경 변수로 gating.

```python
if os.getenv("DEBUGPY_ENABLE") == "1":
    debugpy.listen(("0.0.0.0", 5678))
```

## DAP — IDE 호환성

VSCode·PyCharm·Neovim(dap-python)이 모두 같은 debugpy를 어댑터로 씁니다. Neovim 설정 예.

```lua
require('dap-python').setup('/usr/bin/python3')
```

`launch.json`이 없으면 `dap.configurations.python`을 Lua로 직접 정의. 인터페이스는 VSCode와 같습니다.

## 자주 만나는 문제

| 증상 | 원인 / 해법 |
|------|-------------|
| `Timeout waiting for response` | 포트 막힘 / 호스트 잘못 / debugpy.wait_for_client 누락 |
| 브레이크포인트가 회색 | 소스 매핑 잘못 — `pathMappings` 확인 |
| `justMyCode` 켰는데 step in이 라이브러리로 | 가상환경 경로 정확히 확인 |
| 자동 리로드 시 디버거 끊김 | `--no-reload` / `--reload-dir` 명시 |
| C 확장 호출 안으로 못 들어감 | debugpy는 순수 파이썬만 — GDB로 따로 |
| Pandas DataFrame이 출력 폭주 | `pd.set_option('display.max_rows', 20)` |

## 정리

- `debugpy`가 VSCode·PyCharm·Neovim 공용 어댑터.
- `launch`/`attach` 구분 — 운영은 attach + listen.
- 조건부 BP, Hit count, Logpoint로 코드 수정 없이 진단.
- 멀티프로세스는 `subProcess: true` + 포트 분배.
- 보안 — debugpy 포트는 인증 없음, SSH 터널 필수.
- 같은 DAP 어댑터이므로 IDE 간 이식 쉽다.

## 다음 장 예고

Ch 3 — `asyncio` 디버깅. 코루틴 콜스택의 짧음 문제, `asyncio.run(..., debug=True)`, slow callback 검출, 비동기 race 추적.

## 관련 항목

- [Ch 1: pdb 기본](/blog/tools/debugging/python/chapter01-pdb-basics)
- [Ch 3: asyncio 디버깅](/blog/tools/debugging/python/chapter03-asyncio)
- [GDB Ch 10: TUI / 프런트엔드](/blog/tools/debugging/gdb-lldb/chapter10-tui-frontends) — DAP는 IDE↔디버거 표준
- [debugpy GitHub](https://github.com/microsoft/debugpy)
