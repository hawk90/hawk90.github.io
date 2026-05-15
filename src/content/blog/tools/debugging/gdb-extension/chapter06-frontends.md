---
title: "Ch 6: 프런트엔드 — TUI, cgdb, dashboard, gef, IDE"
date: 2025-09-03T06:00:00
description: "터미널부터 IDE까지. 내장 TUI, cgdb, gdb-dashboard, gef/pwndbg, VSCode, nvim-dap, Cortex-Debug 비교."
tags: [gdb, tui, cgdb, gef, vscode, neovim, frontend]
series: "GDB Extension and IDE"
seriesOrder: 6
draft: false
---

GDB는 본질이 명령줄이지만 *실제 작업 환경*은 다양합니다. 가벼운 한 화면 분할부터 풀 IDE까지 — 이 장은 각 프런트엔드의 특징과 *언제 어느 것을 선택*할지를 다룹니다.

## 내장 TUI

```text
(gdb) tui enable
(gdb) layout src         # 소스 + 명령
(gdb) layout asm         # 어셈블리 + 명령
(gdb) layout regs        # 레지스터 패널
(gdb) layout split       # 소스 + 어셈블리
```

토글 단축키 `Ctrl-x a`. 한 번 켜면 화면이 분할.

### 동작 원리

`ncurses` 위에 구현. 정지·재개 이벤트마다 GDB가 현재 PC·소스·레지스터를 다시 받아 화면 갱신.

### 단축키

| 키 | 동작 |
|------|------|
| `Ctrl-x a` | TUI on/off 토글 |
| `Ctrl-x 1` | 한 윈도 |
| `Ctrl-x 2` | 두 윈도 |
| `Ctrl-x o` | 다음 패널 포커스 |
| `Ctrl-l` | 다시 그리기 |
| `Ctrl-x s` | TUI SingleKey (s=step, n=next 등) |
| `+` / `-` | 활성 윈도 크기 |
| `<` / `>` | 소스 좌우 스크롤 |
| PgUp / PgDn | 소스 스크롤 |

### 제약

- 윈도 깨짐 잦음 — GDB가 ncurses 화면 위에 `print` 출력을 그대로 던지면서 망가짐.
- 마우스 안 됨.
- 변수·watch 패널 없음.
- 컬러 일부 환경 제한.

가벼운 디버깅용. 외부 설치 없으니 *최초 접근*에는 편함.

## cgdb

[cgdb](https://cgdb.github.io/) — 위 vi 키 바인딩 소스 뷰어 + 아래 GDB 명령창의 *진짜* TUI.

```bash
$ cgdb ./my_prog
```

### 동작 원리

GDB를 *서브프로세스*로 띄우고 stdin/stdout을 가로챔. *MI* 명령으로 *현재 PC, 소스, 콜스택*을 받아 자체 ncurses UI 그리기. 내장 TUI보다 *훨씬 안정적*.

### 키

- `Esc` — 소스 패널.
- `i` — 명령 패널.
- 소스에서 vi 키 (`j`/`k`/`/`).
- 마우스 휠 스크롤.

### 설정

```
~/.cgdb/cgdbrc:
  set winminheight=3
  set winsplit=top_big
  set syntax=on
  set color=on
  map <C-n> :gdb next<CR>
```

내장 TUI를 대체하는 1순위.

## gdb-dashboard

[cyrus-and/gdb-dashboard](https://github.com/cyrus-and/gdb-dashboard) — 한 Python 스크립트로 멀티 패널.

```bash
$ wget -O ~/.gdbinit https://raw.githubusercontent.com/cyrus-and/gdb-dashboard/master/.gdbinit
$ gdb ./my_prog
```

기본 패널: source / assembly / stack / registers / variables / breakpoints / expressions / threads / memory / history.

### 어떻게 그리나

`gdb.events.stop`에 훅 → 매 정지마다 *각 패널의 콘텐츠*를 Python으로 수집·print. ncurses 없으니 화면 깨짐 없음.

### 명령

```
>>> dashboard -layout source assembly stack registers variables
>>> dashboard memory watch 0x7fff0000 64
>>> dashboard expressions watch "i + j" "buffer.size"
>>> dashboard source -style style 'monokai'
>>> dashboard breakpoints -style border-style 'roundbox'
```

### 모듈 추가

```python
# ~/.gdbinit-dashboard-mod.py
class MyPanel(Dashboard.Module):
    def label(self):
        return "my-panel"
    def lines(self, term_width, term_height, style_changed):
        v = int(gdb.parse_and_eval("g_counter"))
        return [f"counter = {v}"]
```

팀 표준 환경 구축에 최고.

## gef / pwndbg / peda

보안·CTF 전용 Python 확장. *정지마다 자동 표시*되는 컨텍스트.

| | 특징 |
|---|------|
| [gef](https://github.com/bata24/gef) | 한 파일 스크립트, 가벼움, ARM/MIPS/PPC 지원 |
| [pwndbg](https://github.com/pwndbg/pwndbg) | 가장 활발한 유지보수, 힙 분석 깊음 |
| [peda](https://github.com/longld/peda) | 가장 오래됨, x86 중심 |

```bash
# gef
$ wget -O ~/.gdbinit-gef.py https://gef.blah.cat/py
$ echo "source ~/.gdbinit-gef.py" >> ~/.gdbinit

# pwndbg
$ git clone https://github.com/pwndbg/pwndbg
$ cd pwndbg && ./setup.sh
```

### 공통 명령

| 명령 | 용도 |
|------|------|
| `context` | 종합 컨텍스트 다시 그리기 |
| `vmmap` | 매핑 영역 |
| `heap` | glibc heap chunk / bin / arena |
| `bins` | tcache / fastbin / smallbin / largebin |
| `xinfo <addr>` | 주소 영역 정보 |
| `pattern create 100` | cyclic pattern (BOF 오프셋용) |
| `pattern search 0x6161616a` | 오프셋 검색 |
| `checksec` | NX/PIE/Canary/RELRO |
| `ropper` / `ropgadget` | ROP gadget 검색 |
| `aslr` | ASLR on/off |

### 일반 디버깅엔 시끄러움

매 정지마다 *대규모 컨텍스트* 출력. 보안 분석엔 좋지만 일반 디버깅엔 *너무 많은 정보*. CTF/exploit 외엔 gdb-dashboard나 cgdb가 어울림.

## VSCode + cppdbg / CodeLLDB

`.vscode/launch.json`.

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "GDB launch",
      "type": "cppdbg",
      "request": "launch",
      "program": "${workspaceFolder}/build/my_prog",
      "args": ["arg1"],
      "cwd": "${workspaceFolder}",
      "MIMode": "gdb",
      "setupCommands": [
        {"text": "-enable-pretty-printing", "ignoreFailures": true}
      ]
    },
    {
      "name": "LLDB launch",
      "type": "lldb",
      "request": "launch",
      "program": "${workspaceFolder}/build/my_prog"
    },
    {
      "name": "Attach to PID",
      "type": "cppdbg",
      "request": "attach",
      "program": "${workspaceFolder}/build/my_prog",
      "processId": "${command:pickProcess}",
      "MIMode": "gdb"
    },
    {
      "name": "Remote GDB",
      "type": "cppdbg",
      "request": "launch",
      "program": "${workspaceFolder}/build/my_prog",
      "MIMode": "gdb",
      "miDebuggerServerAddress": "192.168.1.20:2345",
      "stopAtEntry": false,
      "cwd": "${workspaceFolder}",
      "setupCommands": [
        {"text": "set sysroot /opt/target-rootfs"}
      ]
    },
    {
      "name": "Core dump",
      "type": "cppdbg",
      "request": "launch",
      "program": "${workspaceFolder}/build/my_prog",
      "coreDumpPath": "/var/crash/core.my_prog.123",
      "MIMode": "gdb"
    }
  ]
}
```

- `cppdbg` — Microsoft 익스텐션. GDB/LLDB를 MI로.
- `CodeLLDB` — LLDB 전용. SB API 직접. macOS·Rust에 우수.

### 단축키

| 키 | 동작 |
|------|------|
| `F5` | 시작/계속 |
| `F10` | next |
| `F11` | step in |
| `Shift+F11` | step out |
| `F9` | BP 토글 |
| `Shift+F5` | 종료 |
| `Ctrl+Shift+F5` | 재시작 |
| `Ctrl+K Ctrl+I` | hover (변수 보기) |

### 조건부 BP / Logpoint

BP 점 우클릭 → Edit Breakpoint.

- **Expression** — `count > 10 && status == "error"`.
- **Hit Count** — `>= 5`, `% 10`.
- **Log Message** — `"x = {x}"` — 멈추지 않고 출력.

Logpoint가 *코드 수정 없이 임시 로깅*의 표준. GDB 측은 `commands silent printf`로 변환.

### Watch / Variables

자동으로 *Locals / Args / Static / Registers* 분류. 호버로 변수. 큰 구조체는 트리 펼치기.

### 한계

- stdin 콘솔 입력 까다로움 — `externalConsole: true`로 해결.
- 멀티프로세스(fork) 추적이 GDB CLI보다 거침.
- 일부 macro·conditional BP가 MI 한계로 다르게 동작.

## Neovim — nvim-dap

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
      return vim.fn.input('Path: ', vim.fn.getcwd() .. '/', 'file')
    end,
    cwd = '${workspaceFolder}',
    stopOnEntry = false,
  },
  {
    name = 'Attach',
    type = 'lldb',
    request = 'attach',
    pid = require('dap.utils').pick_process,
  },
}

dap.configurations.c = dap.configurations.cpp
dap.configurations.rust = dap.configurations.cpp
```

`nvim-dap-ui`로 VSCode 비슷한 UI.

```lua
local dapui = require('dapui')
dapui.setup()
dap.listeners.after.event_initialized['dapui_config'] = dapui.open
dap.listeners.before.event_terminated['dapui_config'] = dapui.close
dap.listeners.before.event_exited['dapui_config'] = dapui.close
```

키맵.

```lua
vim.keymap.set('n', '<F5>', dap.continue)
vim.keymap.set('n', '<F10>', dap.step_over)
vim.keymap.set('n', '<F11>', dap.step_into)
vim.keymap.set('n', '<S-F11>', dap.step_out)
vim.keymap.set('n', '<F9>', dap.toggle_breakpoint)
vim.keymap.set('n', '<leader>B', function()
  dap.set_breakpoint(vim.fn.input('Condition: '))
end)
vim.keymap.set('n', '<leader>dr', dap.repl.open)
vim.keymap.set('n', '<leader>dl', dap.run_last)
vim.keymap.set('n', '<leader>du', dapui.toggle)
```

Vim 키 유지 + IDE급 디버깅.

### 통합 — Telescope·Trouble

```lua
require('telescope').load_extension('dap')
:Telescope dap commands           # 명령 검색
:Telescope dap configurations     # 설정 선택
:Telescope dap breakpoints        # BP 목록
```

## Emacs — dap-mode

```elisp
(use-package dap-mode
  :after lsp-mode
  :config
  (dap-auto-configure-mode)
  (require 'dap-cpptools)
  (require 'dap-lldb))

(dap-register-debug-template
 "C++ Launch"
 (list :type "cppdbg"
       :request "launch"
       :name "C++ Launch"
       :MIMode "gdb"
       :program "${workspaceFolder}/build/my_prog"))
```

Doom Emacs는 `lsp +debugger` 모듈 한 줄로.

## Cortex-Debug — 임베디드 IDE

[Cortex-Debug](https://marketplace.visualstudio.com/items?itemName=marus25.cortex-debug) — VSCode 익스텐션. OpenOCD/J-Link/ST-Link를 *자동으로* 띄우고 GDB 연결.

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
      {"port": 0, "type": "console", "label": "RTT0"}
    ]
  }
}
```

핵심 기능.

- **SVD 파싱** — ARM SVD 파일에서 peripheral 레지스터 자동 인식. RCC, GPIO, USART 등을 비트 단위로 펼쳐 표시.
- **RTT 콘솔** — Segger RTT가 IDE 내장 콘솔에 자동 출력.
- **Live Watch** — CPU 정지 없이 백그라운드 SWD로 변수 갱신 (J-Link 한정).
- **Disassembly + Source 동기**.

Cortex-M 펌웨어 디버깅의 IDE 표준.

## 데이터·메모리 시각화

- **VSCode Hex Editor + memoryview** — 메모리 hex 그리드.
- **gef memoryview** — 색칠된 메모리.
- **gdb-dashboard memory** — 직접 watch.
- 큰 NumPy 배열은 Python 명령으로 PNG 떨어뜨려 외부 뷰어.

### NumPy/이미지 시각화 (자체 명령)

```python
class ViewImage(gdb.Command):
    def __init__(self):
        super().__init__("view_image", gdb.COMMAND_USER)
    def invoke(self, arg, from_tty):
        v = gdb.parse_and_eval(arg)
        w = int(v['width']); h = int(v['height'])
        data = v['data']
        import numpy as np
        buf = gdb.selected_inferior().read_memory(int(data), w*h*3)
        arr = np.frombuffer(buf, dtype=np.uint8).reshape((h, w, 3))
        from PIL import Image
        Image.fromarray(arr).save('/tmp/view.png')
        import subprocess
        subprocess.Popen(['xdg-open', '/tmp/view.png'])

ViewImage()
```

CV·비디오 코덱·ML 디버깅에서 *콜스택 100번*보다 *시각 1번*이 빠름.

## Vimspector

[Vimspector](https://github.com/puremourning/vimspector) — DAP 클라이언트, vim 8/Neovim 둘 다.

```vim
let g:vimspector_configurations = {
\   "Launch": {
\     "adapter": "vscode-cpptools",
\     "configuration": {
\       "type": "cppdbg",
\       "request": "launch",
\       "program": "${workspaceFolder}/build/my_prog",
\       "MIMode": "gdb"
\     }
\   }
\ }
```

nvim-dap 대안. 설정이 *.vimspector.json*에 — VSCode launch.json과 호환.

## DDD — Data Display Debugger

GUI 디버거의 *조상*. 1990년대부터. 변수를 *그래프 노드*로 시각화.

```bash
$ ddd ./my_prog
```

활용도는 매우 낮지만 *시각적 자료 구조 디버깅*에는 여전히 강력. 한 번씩 꺼내 볼 만함.

## 어느 걸 골라야 하나

| 상황 | 추천 |
|------|------|
| 가벼운 한 번 디버깅 | GDB TUI (`Ctrl-x a`) |
| 일상 — 터미널만 | cgdb 또는 gdb-dashboard |
| 일상 — IDE 같이 | VSCode + cppdbg/CodeLLDB |
| Vim 사용자 | nvim-dap + dapui (또는 Vimspector) |
| Emacs 사용자 | dap-mode |
| CTF / exploit | pwndbg 또는 gef |
| 임베디드 Cortex-M | VSCode + Cortex-Debug |
| 자료구조 시각화 | DDD 또는 자체 Python 명령 |
| 자동화 / 헤드리스 | `gdb -batch` + Python |
| 원격 + 콘솔만 | cgdb over SSH |

대부분 사용자가 *둘 이상* 병용. VSCode를 일상, cgdb를 원격, pwndbg를 보안.

## 시리즈 정리

이 6장으로 GDB의 *확장성과 IDE 통합*을 다뤘습니다.

- **Ch 1** Python API 입문 — Value/Type/Frame.
- **Ch 2** 커스텀 명령 + 이벤트.
- **Ch 3** Pretty-printer 깊이.
- **Ch 4** FrameDecorator / Unwinder — JIT.
- **Ch 5** MI / DAP 프로토콜.
- **Ch 6** (이 장) 프런트엔드 비교.

GDB가 *디버거 SDK*임이 분명해집니다. CLI는 그 위의 한 사용자 인터페이스일 뿐.

## 관련 항목 (시리즈 전체)

- [Ch 1: Python API 입문](/blog/tools/debugging/gdb-extension/chapter01-python-api-basics)
- [Ch 2: 커스텀 명령](/blog/tools/debugging/gdb-extension/chapter02-commands-events)
- [Ch 3: Pretty-Printer](/blog/tools/debugging/gdb-extension/chapter03-pretty-printers)
- [Ch 4: FrameDecorator / Unwinder](/blog/tools/debugging/gdb-extension/chapter04-frame-unwinder)
- [Ch 5: MI / DAP 프로토콜](/blog/tools/debugging/gdb-extension/chapter05-mi-dap-protocol)

## 외부 자료

- [GDB and LLDB 시리즈](/blog/tools/gdb-lldb/chapter01-intro-and-install) — 기본
- [Embedded Debugging 시리즈](/blog/tools/debugging/embedded-debug/chapter01-rsp-protocol)
- [cgdb](https://cgdb.github.io/)
- [gdb-dashboard](https://github.com/cyrus-and/gdb-dashboard)
- [pwndbg](https://github.com/pwndbg/pwndbg)
- [gef](https://github.com/bata24/gef)
- [VSCode C/C++](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools)
- [CodeLLDB](https://marketplace.visualstudio.com/items?itemName=vadimcn.vscode-lldb)
- [nvim-dap](https://github.com/mfussenegger/nvim-dap)
- [Cortex-Debug](https://github.com/Marus/cortex-debug)
- [DAP 명세](https://microsoft.github.io/debug-adapter-protocol/)
