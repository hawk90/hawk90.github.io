---
title: "Ch 10: TUI / 프런트엔드"
date: 2025-08-20T10:00:00
description: "TUI 모드, cgdb, gdb-dashboard, gef/pwndbg, VSCode, nvim-dap, DAP 프로토콜."
tags: [gdb, TUI, Frontend, DAP]
series: "GDB and LLDB"
seriesOrder: 10
draft: false
---

:::tip[Deep dive]
이 챕터는 빠른 참조입니다. 깊은 내부 메커니즘은 [GDB Extension and IDE 시리즈](/blog/tools/debugging/gdb-extension/chapter06-frontends)를 참고하세요 — TUI, cgdb, dashboard, gef/pwndbg, VSCode, nvim-dap, Cortex-Debug 비교.
:::


GDB는 기본적으로 명령줄입니다. 강력하지만 한 화면에 *지금 어디서 멈췄는지*, *변수가 얼마인지*, *콜스택*, *레지스터*를 동시에 보여 주지 못합니다. 이 장은 TUI(터미널 UI)와 외부 프런트엔드로 그 한계를 메우는 방법입니다.

내장 TUI에서 출발해 cgdb·gdb-dashboard·gef/pwndbg 같은 *터미널* 확장, VSCode·nvim-dap·Emacs 같은 *IDE 통합*, 마지막으로 모든 IDE가 공유하는 **DAP**(Debug Adapter Protocol)의 정체까지 살펴봅니다.

## GDB 내장 TUI

```text
(gdb) tui enable
(gdb) layout src         # 소스 + 명령
(gdb) layout asm         # 어셈블리 + 명령
(gdb) layout regs        # 레지스터 패널 추가
(gdb) layout split       # 소스 + 어셈블리 + 명령
```

토글 단축키 `Ctrl-x a`. 한 번 켜면 화면이 분할되어 위쪽엔 소스가, 아래쪽엔 명령창이 뜹니다. 화살표/PgUp으로 소스 스크롤, `Ctrl-x o`로 패널 포커스 전환, `Ctrl-l`로 다시 그리기.

### 동작 원리

TUI는 `ncurses` 위에 구현됐습니다. 정지·재개 이벤트마다 GDB가 현재 PC·소스·레지스터를 다시 받아 화면을 그립니다.

레이아웃은 *고정된 윈도 셋*의 조합.

| 윈도 | 단축 | 내용 |
|------|------|------|
| `src` | s | 소스 코드 |
| `asm` | a | 어셈블리 |
| `regs` | r | 레지스터 |
| `cmd` | c | 명령창 (항상 표시) |

### 자주 쓰는 단축키

| 단축키 | 동작 |
|--------|------|
| `Ctrl-x a` | TUI on/off 토글 |
| `Ctrl-x 1` | 한 윈도 |
| `Ctrl-x 2` | 두 윈도 |
| `Ctrl-x o` | 다음 패널로 포커스 |
| `Ctrl-l` | 다시 그리기 |
| `Ctrl-x s` | TUI SingleKey 모드(`s`=step, `n`=next 등) |
| `+` / `-` | 활성 윈도 크기 조절 |
| `<` / `>` | 소스 스크롤 좌우 |
| PgUp / PgDn | 소스 스크롤 |

### 제약

- 윈도 깨짐이 자주 일어남(`Ctrl-l` 자주 누르게 됨). 이유는 GDB가 ncurses 화면 위에 그대로 `print` 출력을 던지면서 화면이 망가지기 때문입니다. *Python으로* 직접 ncurses와 통합한 cgdb·dashboard가 더 안정적인 이유.
- 마우스 안 됨.
- 일부 환경에서 color 안 나옴.
- 변수·watch 패널 없음.

가벼운 디버깅에는 충분. 큰 코드베이스에선 곧 한계를 느낍니다.

## cgdb — 분할 화면 GDB

[cgdb](https://cgdb.github.io/)는 위에 vi 키 바인딩이 적용된 소스 뷰어, 아래에 GDB 명령창이 있는 *진짜* TUI.

```bash
$ cgdb ./my_program
```

- `Esc`로 소스 패널, `i`로 명령 패널.
- 소스 패널에서 vi 키(`j`/`k`/`/`)로 이동.
- 마우스 휠 스크롤 가능.
- 색상·구문 강조가 깔끔.

### 동작 원리

cgdb는 GDB를 *서브프로세스*로 띄우고 stdin/stdout을 가로챕니다. *MI*(머신 인터페이스) 명령을 보내 *현재 PC, 소스 파일, 콜스택*을 구조적으로 받아 자체 ncurses UI를 그립니다. GDB 내장 TUI보다 ncurses와 충돌이 적은 이유.

GDB 내장 TUI보다 *훨씬* 안정적입니다. 패키지 매니저로 바로 설치되므로 첫 선택지로 추천.

```
~/.cgdb/cgdbrc            # 설정
set winminheight=3
set winsplit=top_big
set syntax=on
set color=on
map <C-n> :gdb next<CR>
```

## gdb-dashboard — 깔끔한 단일 파이썬 스크립트

[cyrus-and/gdb-dashboard](https://github.com/cyrus-and/gdb-dashboard) — 한 파이썬 스크립트(`~/.gdbinit`에 source)로 콘솔에 멀티 패널을 그립니다.

```bash
$ wget -O ~/.gdbinit https://raw.githubusercontent.com/cyrus-and/gdb-dashboard/master/.gdbinit
$ gdb ./my_program
```

기본 패널: source / assembly / stack / registers / variables / breakpoints / expressions / threads / memory / history.

```text
>>> dashboard -layout source assembly stack registers variables
>>> dashboard memory watch 0x7fff0000 64
>>> dashboard expressions watch "i + j"
>>> dashboard source -style compact
>>> dashboard -style syntax_highlighting 'monokai'
```

### 어떻게 그리는가

`gdb.events.stop`에 훅을 걸어 정지마다 *각 패널의 콘텐츠*를 Python으로 수집해 print. ncurses를 쓰지 않으므로 화면 깨짐 없음. 매 정지마다 *위에서 아래로 다시 그려지는* 식이라 스크롤백을 잃지 않습니다.

장점 — Python 한 파일이라 설정/이식 쉬움. TUI 모드처럼 화면이 깨지지 않고, 매 정지마다 위쪽에 패널이 다시 그려집니다.

커스텀 모듈을 직접 추가할 수 있어 *팀별 디버깅 환경*을 표준화하기 좋습니다.

```python
# ~/.gdb/my_module.py
class MyPanel(Dashboard.Module):
    def label(self):
        return "my-counters"
    def lines(self, term_width, term_height, style_changed):
        cnt = int(gdb.parse_and_eval("g_counter"))
        return [f"counter = {cnt}"]
```

## gef / pwndbg / peda — 보안·exploit 디버깅

세 가지 모두 보안 분석가의 작업을 GDB 위에서 빠르게 하기 위한 Python 확장입니다.

| | 특징 | 권장 |
|---|------|------|
| **gef** | 한 파일 스크립트, 가벼움, ARM/MIPS/PPC도 지원 | 일반 보안 |
| **pwndbg** | 가장 활발한 유지보수, 힙 분석 깊음 | CTF/exploit |
| **peda** | 가장 오래됨, x86 중심 | 레거시 자료 호환 |

```bash
# gef
$ wget -O ~/.gdbinit-gef.py https://gef.blah.cat/py
$ echo "source ~/.gdbinit-gef.py" >> ~/.gdbinit

# pwndbg
$ git clone https://github.com/pwndbg/pwndbg
$ cd pwndbg && ./setup.sh
```

설치 후 정지할 때마다 레지스터·스택·디스어셈블·코드 컨텍스트가 자동으로 한 화면에 뜹니다. CTF·exploit 분석에 사실상 표준.

### 자주 쓰는 명령 (pwndbg/gef 공통)

| 명령 | 용도 |
|------|------|
| `context` | 종합 컨텍스트 다시 그리기 |
| `vmmap` | 매핑된 메모리 영역 |
| `heap` | glibc heap의 청크 / bin / arena |
| `bins` | tcache / fastbin / smallbin / largebin |
| `xinfo <addr>` | 주소가 어떤 영역인지 |
| `pattern create 100` | cyclic pattern 생성 (BOF 오프셋용) |
| `pattern search 0x6161616a` | 패턴에서 오프셋 검색 |
| `checksec` | NX / PIE / Canary / RELRO 확인 |
| `ropper / ropgadget` | gadget 검색 |
| `aslr` | ASLR on/off |
| `dt <struct>` | 구조체 시각화 |

CTF에서는 거의 `pwndbg + pwntools`가 표준 조합. exploit 스크립트와 디버거가 한 워크플로에 묶입니다.

> 일반 애플리케이션 디버깅에는 다소 시끄러울 수 있습니다. 보안 분석·CTF 외에는 gdb-dashboard나 cgdb가 더 어울립니다.

## VSCode + cppdbg / CodeLLDB

가장 많이 쓰는 IDE 프런트엔드. `launch.json` 한 파일로 설정.

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "GDB launch",
      "type": "cppdbg",
      "request": "launch",
      "program": "${workspaceFolder}/build/my_program",
      "args": ["arg1"],
      "stopAtEntry": false,
      "cwd": "${workspaceFolder}",
      "MIMode": "gdb",
      "setupCommands": [
        { "text": "set print pretty on" },
        { "text": "-enable-pretty-printing", "ignoreFailures": true }
      ],
      "environment": [
        { "name": "ASAN_OPTIONS", "value": "halt_on_error=1" }
      ]
    },
    {
      "name": "LLDB launch",
      "type": "lldb",
      "request": "launch",
      "program": "${workspaceFolder}/build/my_program",
      "args": [],
      "cwd": "${workspaceFolder}"
    },
    {
      "name": "GDB attach to PID",
      "type": "cppdbg",
      "request": "attach",
      "program": "${workspaceFolder}/build/my_program",
      "processId": "${command:pickProcess}",
      "MIMode": "gdb"
    },
    {
      "name": "GDB remote (gdbserver)",
      "type": "cppdbg",
      "request": "launch",
      "program": "${workspaceFolder}/build/my_program",
      "MIMode": "gdb",
      "miDebuggerServerAddress": "192.168.1.20:2345",
      "stopAtEntry": false,
      "cwd": "${workspaceFolder}",
      "setupCommands": [
        { "text": "set sysroot /opt/target-rootfs" }
      ]
    }
  ]
}
```

- `cppdbg` 익스텐션(C/C++) — Microsoft가 만든 cppdbg는 GDB/LLDB를 둘 다 다루지만 *MI 프로토콜*로 통신. 그래서 GDB와 더 잘 맞습니다.
- `CodeLLDB` 익스텐션 — LLDB의 *DAP 서버*를 직접 띄움. macOS·Rust·Swift 디버깅에 우수.

### 단축키

| 단축키 | 동작 |
|--------|------|
| `F5` | 시작/계속 |
| `F10` | next |
| `F11` | step in |
| `Shift+F11` | step out (finish) |
| `F9` | 줄에 브레이크포인트 토글 |
| `Shift+F5` | 종료 |
| `Ctrl+Shift+F5` | 재시작 |
| `Ctrl+K Ctrl+I` | 호버 |

### 조건부 BP / Logpoint (VSCode 고유)

소스 줄 옆 BP 점을 우클릭 → Edit Breakpoint.

- **Expression** — `count > 10 && status == "error"` 같은 조건.
- **Hit Count** — `>= 5`, `% 10` 등.
- **Log Message** — 메시지를 평가만 하고 *멈추지 않음*. `{varname}` 형태로 표현식 보간.

코드를 *전혀 수정하지 않고* 임시 로깅을 추가할 수 있어 운영에서도 강력. GDB 측에서는 `commands silent printf`로 자동 변환되어 들어갑니다.

### Watch / Data Inspection

좌측 Variables 패널에 *Locals*, *Args*, *Static*, *Registers*가 자동 분류. 마우스 호버로 변수 표시. 큰 구조체는 트리 펼치기. pretty-printer가 활성화되어 있으면 *그 출력*이 트리 노드로 보입니다.

### 한계

- 콘솔 입력이 필요한 프로그램(stdin)이 까다로움. `"externalConsole": true`로 별도 터미널.
- Conditional breakpoint의 표현식이 GDB와 미묘하게 다를 때가 있음 (cppdbg가 MI를 통해 전달하면서 일부 평가 차이).
- 멀티프로세스(fork) 추적은 cppdbg가 GDB만큼 정교하지 못함.
- core dump 분석은 별 설정 필요 (`coreDumpPath` 옵션).

## Neovim — nvim-dap

[nvim-dap](https://github.com/mfussenegger/nvim-dap)이 Debug Adapter Protocol(DAP) 클라이언트, [nvim-dap-ui](https://github.com/rcarriga/nvim-dap-ui)가 UI. VSCode와 *같은* 디버그 어댑터(cppdbg, CodeLLDB)를 그대로 씁니다.

```lua
local dap = require('dap')

dap.adapters.lldb = {
  type = 'executable',
  command = '/usr/bin/lldb-vscode',
  name = 'lldb',
}

dap.configurations.cpp = {
  {
    name = 'Launch',
    type = 'lldb',
    request = 'launch',
    program = function()
      return vim.fn.input('Path to executable: ', vim.fn.getcwd() .. '/', 'file')
    end,
    cwd = '${workspaceFolder}',
    stopOnEntry = false,
    args = {},
  },
  {
    name = 'Attach to PID',
    type = 'lldb',
    request = 'attach',
    pid = require('dap.utils').pick_process,
    args = {},
  },
}

dap.configurations.c = dap.configurations.cpp
dap.configurations.rust = dap.configurations.cpp
```

```lua
vim.keymap.set('n', '<F5>', dap.continue)
vim.keymap.set('n', '<F10>', dap.step_over)
vim.keymap.set('n', '<F11>', dap.step_into)
vim.keymap.set('n', '<S-F11>', dap.step_out)
vim.keymap.set('n', '<F9>', dap.toggle_breakpoint)
vim.keymap.set('n', '<leader>B', function()
  dap.set_breakpoint(vim.fn.input('Condition: '))
end)
vim.keymap.set('n', '<leader>dl', dap.run_last)
vim.keymap.set('n', '<leader>dt', dap.terminate)
```

dap-ui가 *VSCode와 거의 같은 패널 레이아웃*을 그립니다.

```lua
local dapui = require('dapui')
dapui.setup()
dap.listeners.after.event_initialized['dapui_config'] = dapui.open
dap.listeners.before.event_terminated['dapui_config'] = dapui.close
```

Neovim 안에서 디버그 패널 띄우고, REPL로 표현식 평가. Vim 키를 유지하면서 IDE 수준의 경험을 가져갑니다.

## DAP — 표준 프로토콜의 의미

VSCode·Neovim·Emacs(dap-mode)·Sublime·Helix가 모두 *같은* DAP를 씁니다. 따라서 한 어댑터(`cppdbg`)를 설치하면 어느 에디터든 동일한 디버깅 경험을 얻을 수 있습니다. RSP가 *디버거 ↔ 타깃* 표준이라면 DAP는 *IDE ↔ 디버거* 표준.

```
[에디터] ← DAP → [adapter (예: cppdbg)] ← MI → [GDB]
                                              ↑ RSP
                                            [gdbserver / OpenOCD]
```

### DAP 메시지

JSON-RPC over TCP/stdio. 모든 메시지가 *request / response / event* 셋.

```json
// 요청
{"seq": 1, "type": "request", "command": "initialize",
 "arguments": {"clientID": "vscode", "linesStartAt1": true}}

// 응답
{"seq": 2, "type": "response", "request_seq": 1, "success": true,
 "command": "initialize",
 "body": {"supportsConfigurationDoneRequest": true, ...}}

// 이벤트
{"seq": 3, "type": "event", "event": "stopped",
 "body": {"reason": "breakpoint", "threadId": 1}}
```

주요 명령.

| Command | 동작 |
|---------|------|
| `initialize` | 핸드셰이크 |
| `launch` / `attach` | 시작 / 부착 |
| `setBreakpoints` | 파일별 BP 일괄 설정 |
| `setFunctionBreakpoints` | 함수명 BP |
| `setDataBreakpoints` | watchpoint |
| `threads` | 스레드 목록 |
| `stackTrace` | 콜스택 |
| `scopes` | 한 프레임의 스코프 (Local/Arg/Reg) |
| `variables` | 한 스코프의 변수들 |
| `continue` / `next` / `stepIn` / `stepOut` | 진행 |
| `evaluate` | 표현식 평가 |

VSCode의 변수 트리는 *재귀적인 `variables` 호출*입니다. 사용자가 트리 노드를 펼칠 때마다 그 노드의 `variablesReference`를 인자로 다시 호출. 결과적으로 *깊은 객체도 지연 로드*되어 IDE가 빠릅니다.

## Emacs — dap-mode / gud

전통적으로 Emacs는 `M-x gdb`로 GUD(GDB UI mode)를 썼습니다. 요즘은 `dap-mode`로 같은 DAP 어댑터를 공유.

```elisp
(use-package dap-mode
  :after lsp-mode
  :config (dap-auto-configure-mode))

(use-package dap-cpptools)        ; cppdbg
(use-package dap-lldb)
```

```elisp
(dap-register-debug-template
 "C++ Launch"
 (list :type "cppdbg"
       :request "launch"
       :name "C++ Launch"
       :MIMode "gdb"
       :program "${workspaceFolder}/build/my_program"
       :cwd "${workspaceFolder}"))
```

자세한 설정은 dap-mode 문서. Doom Emacs는 `lsp +debugger` 모듈로 한 번에.

## 데이터·메모리 시각화

- **VSCode의 Hex Editor + memoryview** — 메모리 영역을 hex 그리드로.
- **gef의 `memoryview`** — 메모리 영역을 색칠해 표시.
- **gdb의 `dashboard memory`** — 직접 watch 영역 지정.
- **GDB 자체** — `x/100bx 0x...` 또는 Python으로 binary blob 시각화.

큰 버퍼·이미지 디버깅에서는 hex 뷰가 콜스택보다 더 자주 쓰입니다.

### NumPy/이미지 자체 시각화

GDB Python으로 NumPy 배열을 *PNG로 떨어뜨려* 외부 뷰어로 보기.

```python
class ViewImage(gdb.Command):
    def __init__(self):
        super().__init__("view_image", gdb.COMMAND_USER)
    def invoke(self, arg, from_tty):
        v = gdb.parse_and_eval(arg)
        w = int(v['width']); h = int(v['height'])
        data = v['data']
        # 메모리를 numpy로
        import numpy as np
        buf = gdb.selected_inferior().read_memory(int(data), w*h*3)
        arr = np.frombuffer(buf, dtype=np.uint8).reshape((h, w, 3))
        from PIL import Image
        Image.fromarray(arr).save('/tmp/view.png')
        import subprocess
        subprocess.Popen(['xdg-open', '/tmp/view.png'])

ViewImage()
```

컴퓨터 비전·비디오 코덱·머신러닝 디버깅에서 가시화는 *콜스택을 100번 들여다보는 것보다* 빠릅니다.

## Cortex-Debug — VSCode의 임베디드 확장

[Cortex-Debug](https://marketplace.visualstudio.com/items?itemName=marus25.cortex-debug)가 OpenOCD/J-Link/ST-Link/Black Magic Probe를 *자동으로* 띄우고 GDB를 연결합니다.

```json
{
  "type": "cortex-debug",
  "request": "launch",
  "name": "Debug nRF52",
  "executable": "${workspaceFolder}/build/firmware.elf",
  "servertype": "jlink",
  "device": "nRF52840_xxAA",
  "interface": "swd",
  "rtos": "FreeRTOS",
  "svdFile": "${workspaceFolder}/svd/nrf52840.svd",
  "rttConfig": {
    "enabled": true,
    "decoders": [
      { "port": 0, "type": "console", "label": "RTT0" }
    ]
  }
}
```

핵심 기능.

- **SVD 파싱** — `nrf52840.svd` 같은 ARM SVD 파일에서 peripheral 레지스터를 자동 인식. RCC, GPIO, USART 같은 MMIO를 *비트 단위로* 펼쳐 보여 줍니다.
- **RTT 콘솔** — 위 설정으로 Segger RTT가 IDE 내장 콘솔에 자동 출력.
- **Live Watch** — CPU 정지 없이 백그라운드 SWD로 변수 갱신 (J-Link 한정).
- **Disassembly + Source 동기** — `-Og`에서도 비교적 안정.

Cortex-M 펌웨어 디버깅의 IDE 표준 도구.

## 어느 걸 골라야 하나

| 상황 | 추천 |
|------|------|
| 가벼운 한 번 디버깅 | GDB TUI(`Ctrl-x a`) |
| 일상 — 터미널만 | cgdb 또는 gdb-dashboard |
| 일상 — IDE 같이 | VSCode + cppdbg/CodeLLDB |
| Vim 사용자 | nvim-dap + dapui |
| CTF / exploit | pwndbg 또는 gef |
| 임베디드 GDB (Cortex-M) | VSCode + Cortex-Debug |
| 자동화 / 헤드리스 | gdb -batch + Python |
| 원격 + 콘솔만 | cgdb over SSH |

## 정리

- 내장 TUI(`Ctrl-x a`)는 빠른 시각화, 화면 깨짐만 감수하면 충분.
- cgdb·gdb-dashboard가 터미널에서 가장 안정적.
- gef/pwndbg는 보안·CTF 용으로 강력하지만 일반 작업엔 시끄러움.
- IDE 통합은 VSCode + cppdbg/CodeLLDB 또는 nvim-dap.
- DAP가 IDE↔디버거 표준 — request/response/event 셋의 JSON-RPC.
- 변수 트리는 `variables` 재귀 호출로 지연 로드.
- Cortex-M은 VSCode Cortex-Debug 익스텐션이 자동으로 OpenOCD/J-Link까지 묶어 줌. SVD/RTT 통합.

## 다음 장 예고

Ch 11(시리즈 마지막) — 실전 팁. STL pretty-printer, -O2로 빌드된 코드 디버깅, `.gdbinit` 추천 설정, time-travel(rr)으로 마무리.

## 관련 항목

- [Ch 8: 원격 디버깅](/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging) — Cortex-Debug 익스텐션이 OpenOCD를 띄움
- [Ch 9: Python 스크립팅](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting) — dashboard도 Python 확장
- [DAP 명세](https://microsoft.github.io/debug-adapter-protocol/)
- [cgdb 공식](https://cgdb.github.io/)
- [gdb-dashboard](https://github.com/cyrus-and/gdb-dashboard)
- [pwndbg](https://github.com/pwndbg/pwndbg)
- [Cortex-Debug](https://github.com/Marus/cortex-debug)
- [nvim-dap](https://github.com/mfussenegger/nvim-dap)
