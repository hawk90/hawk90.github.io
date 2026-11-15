---
title: "GDB 프런트엔드 비교 — TUI·cgdb·dashboard·gef·IDE"
slug: "tools/debugging/gdb-extension/chapter06-frontends"
date: 2026-05-27T09:06:00
description: "터미널부터 IDE까지. 내장 TUI, cgdb, gdb-dashboard, gef/pwndbg, VSCode, nvim-dap, Cortex-Debug 비교."
tags: [gdb, tui, cgdb, gef, vscode, neovim, frontend]
series: "GDB Extension and IDE"
seriesOrder: 6
draft: false
topics: ["tools", "tools/debugging"]
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
| `winheight src +3` / `winheight src -3` | 명령창에서 소스 창 높이 조절 |
| 왼쪽 / 오른쪽 화살표 | 활성 창 가로 스크롤 |
| PgUp / PgDn | 소스 스크롤 |

### 제약

- 터미널 출력과 화면 상태가 어긋나면 `Ctrl-l`로 다시 그립니다.
- curses와 터미널이 지원하면 클릭으로 포커스를 바꾸고 휠로 스크롤할 수 있습니다. `set tui mouse-events off`로 터미널의 마우스 동작에 돌려줄 수 있습니다.
- 기본 레이아웃에는 IDE식 watch 트리가 없습니다. Python TUI 창 확장으로 표시를 추가할 수 있습니다.
- 키 전달과 색상은 터미널·SSH·tmux 설정에 따라 확인해야 합니다.

GDB 17.2 매뉴얼의 TUI 키·마우스 계약을 기준으로 했습니다. 실제 키 입력과 화면 갱신은 사용하는 터미널에서 확인합니다.

## cgdb

[cgdb](https://cgdb.github.io/) — 위 vi 키 바인딩 소스 뷰어 + 아래 GDB 명령창의 터미널 프런트엔드.

```bash
$ cgdb ./my_prog
```

### 동작 원리

GDB를 별도 프로세스로 실행하고 gdbwire 계층을 통해 통신합니다. 소스 창과 GDB 명령창을 나누므로 GDB CLI를 유지하면서 소스 위치를 볼 수 있습니다. 통신 세부와 지원 명령은 설치한 cgdb/GDB 버전에 맞춰 확인합니다.

### 키

- `Esc` — 소스 패널.
- `i` — 명령 패널.
- 소스에서 vi 키 (`j`/`k`/`/`).
- 마우스 동작은 설치 버전과 터미널에서 확인.

### 설정

`~/.cgdb/cgdbrc`에서 분할 높이·문법 강조·키 매핑을 조정합니다. 설치 버전의 `:help`와 [cgdb 매뉴얼](https://cgdb.github.io/docs/cgdb.html)의 설정 이름을 맞춥니다. 아래는 기본 분할 설정 예입니다.

```text
set winminheight=3
set winsplit=top_big
set syntax=on
```

vi식 소스 탐색과 GDB 명령창을 함께 쓰려는 경우 검토할 수 있습니다.

## gdb-dashboard

[cyrus-and/gdb-dashboard](https://github.com/cyrus-and/gdb-dashboard) — 한 Python 스크립트로 멀티 패널.

프로젝트의 `.gdbinit` 스크립트를 **검토한 commit**에서 별도 경로에 보관한 뒤 명시적으로 source합니다. 기존 `~/.gdbinit`을 다운로드 대상으로 덮어쓰지 않습니다.

```text
(gdb) source /absolute/path/to/reviewed-dashboard.gdbinit
(gdb) help dashboard
```

기본 패널: source / assembly / stack / registers / variables / breakpoints / expressions / threads / memory / history.

### 어떻게 그리나

`gdb.events.stop`에 훅 → 매 정지마다 *각 패널의 콘텐츠*를 Python으로 수집·print. ncurses 없이 텍스트로 렌더링합니다. 터미널 폭, 다른 출력, remote 환경에 따른 표시 상태는 별도로 확인합니다.

### 명령

```text
(gdb) dashboard -layout source assembly stack registers variables
(gdb) help dashboard memory
(gdb) help dashboard expressions
```

세부 style과 사용자 모듈 API는 사용 중인 commit의 도움말·소스와 맞춥니다. 위 명령은 UI 기능 소개이며 GUI 세션에서 실행한 결과를 뜻하지 않습니다.

## gef / pwndbg / peda

보안·CTF 전용 Python 확장. *정지마다 자동 표시*되는 컨텍스트.

| | 특징 |
|---|------|
| [GEF](https://github.com/hugsy/gef) | Python 기반 디버깅 확장; 지원 대상은 해당 릴리스 문서 확인 |
| [pwndbg](https://github.com/pwndbg/pwndbg) | 컨텍스트·메모리·allocator 분석 기능 |
| [peda](https://github.com/longld/peda) | x86 중심 Python 확장; GDB/Python 버전 호환 확인 |

GEF와 GEF의 fork는 설치 경로와 명령이 다를 수 있습니다. 여기서는 hugsy/gef를 가리킵니다. 각 프로젝트의 설치 지침에서 Python/GDB 요구 버전과 의존성을 확인하고, 여러 컨텍스트 확장을 한 세션에 동시에 source하기 전에 훅·명령 충돌을 확인합니다.

### 명령은 확장마다 확인

`context`, `vmmap`, `heap`, cyclic pattern 검색 같은 기능은 확장별 이름과 옵션이 다릅니다. `bins`, `pattern`, `xinfo`를 세 도구의 공통 명령으로 가정하면 안 됩니다. glibc heap 분석에는 대상 allocator 버전과 심볼이 필요하며 Linux x86 예를 다른 ABI에 그대로 적용하지 않습니다.

일반 디버깅에서도 사용할 수 있지만 자동 출력량과 필요한 분석 항목을 먼저 조정합니다. 보안 분석 외의 용도라는 이유만으로 특정 확장을 배제할 필요는 없습니다.

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
- `CodeLLDB` — LLDB 전용. LLDB API를 사용하는 adapter. 대상·플랫폼·언어별 기능을 확인합니다.

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

Logpoint는 코드 수정 없이 값을 기록하는 기능입니다. 실제 중단·평가·출력 방식은 adapter 구현에 달려 있습니다. 조건과 hit count 문법도 해당 adapter 문서를 따릅니다.

### Watch / Variables

자동으로 *Locals / Args / Static / Registers* 분류. 호버로 변수. 큰 구조체는 트리 펼치기.

### 한계

- stdin 입력 경로는 OS·adapter·콘솔 설정에 따라 다릅니다. `externalConsole` 지원 여부와 터미널 연결을 확인합니다.
- 멀티프로세스(fork) 추적이 GDB CLI보다 거침.
- macro·조건식·프로세스 추적은 GDB 자체 지원과 adapter 구현을 함께 확인합니다.

## Neovim — nvim-dap

```lua
local dap = require('dap')
local lldb_dap = vim.fn.exepath('lldb-dap')
assert(lldb_dap ~= '', 'install lldb-dap or configure its absolute path')

dap.adapters.lldb = {
  type = 'executable',
  command = lldb_dap,
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
dap.listeners.after.event_initialized['dapui_config'] = function() dapui.open() end
dap.listeners.before.event_terminated['dapui_config'] = function() dapui.close() end
dap.listeners.before.event_exited['dapui_config'] = function() dapui.close() end
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
```

telescope-dap 확장을 설치한 뒤 Vim 명령창에서 실행합니다.

```vim
:Telescope dap commands
:Telescope dap configurations
:Telescope dap breakpoints
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

Emacs/Doom 설정은 설치 버전의 모듈·adapter 의존성을 확인합니다. 위 예는 dap-mode와 cpptools adapter가 설치된 환경을 전제로 합니다.

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
- **Live Watch** — 실행 중 변수 읽기는 지원 서버·프로브·대상 메모리 접근 조건을 확인합니다. J-Link만 지원한다고 일반화하지 않습니다.
- **Disassembly + Source 동기**.

RTOS 인식은 GDB server의 RTOS 지원·펌웨어 심볼에 달려 있습니다. SVD 레지스터 읽기는 read-to-clear 등 주변장치 부작용을 확인한 뒤 사용합니다. 이 설정의 실제 nRF52·J-Link 세션은 별도 하드웨어 검증이 필요합니다.

## 데이터·메모리 시각화

- **VSCode Hex Editor + memoryview** — 메모리 hex 그리드.
- **gef memoryview** — 색칠된 메모리.
- **gdb-dashboard memory** — 직접 watch.
- 큰 NumPy 배열은 Python 명령으로 PNG 떨어뜨려 외부 뷰어.

### RGB 메모리를 PPM으로 내보내기

다음 예는 `width`, `height`, `data`를 가진 구조체에서 **padding 없는 RGB8** 버퍼만 처리합니다. YUV·BGR·stride가 있는 영상에는 그대로 쓸 수 없습니다. 대상이 정지한 시점에 유효한 버퍼인지 호출자가 확인해야 합니다.

```python title="view-rgb.py"
import gdb

def rgb_layout(width, height):
    if not (1 <= width <= 4096 and 1 <= height <= 4096):
        raise ValueError("dimensions must be 1..4096")
    size = width * height * 3
    if size > 16 * 1024 * 1024:
        raise ValueError("image exceeds 16 MiB")
    return size

class ViewRGB(gdb.Command):
    def __init__(self):
        super().__init__("view_rgb", gdb.COMMAND_DATA)
    def invoke(self, arg, from_tty):
        self.dont_repeat()
        argv = gdb.string_to_argv(arg)
        if len(argv) != 2:
            raise gdb.GdbError("usage: view_rgb EXPR NEW_OUTPUT.ppm")
        try:
            value = gdb.parse_and_eval(argv[0])
            width, height = int(value["width"]), int(value["height"])
            size = rgb_layout(width, height)
            data = value["data"]
            if data.type.strip_typedefs().code != gdb.TYPE_CODE_PTR:
                raise ValueError("data must be a pointer")
            address = int(data)
            bits = data.type.sizeof * 8
            if address <= 0 or address + size > (1 << bits):
                raise ValueError("invalid target address range")
            pixels = bytes(gdb.selected_inferior().read_memory(address, size))
            with open(argv[1], "xb") as output:
                output.write(f"P6\n{width} {height}\n255\n".encode("ascii"))
                output.write(pixels)
        except (gdb.error, ValueError, OSError) as error:
            raise gdb.GdbError(str(error))

ViewRGB()
```

`view_rgb image /chosen/new-file.ppm`로 새 파일에만 기록합니다. 기존 파일은 덮어쓰지 않으며 외부 뷰어를 자동 실행하지 않습니다. 메모리 읽기 성공은 영상 형식·버퍼 수명·색 공간의 정확성까지 보장하지 않습니다.

## Vimspector

[Vimspector](https://github.com/puremourning/vimspector) — DAP 클라이언트, vim 8/Neovim 둘 다.

프로젝트의 `.vimspector.json` 예입니다. `vscode-cpptools` gadget 설치가 선행되어야 합니다.

```json title=".vimspector.json"
{
  "configurations": {
    "Launch": {
      "adapter": "vscode-cpptools",
      "configuration": {
        "request": "launch",
        "program": "${workspaceRoot}/build/my_prog",
        "cwd": "${workspaceRoot}",
        "MIMode": "gdb"
      }
    }
  }
}
```

Vimspector는 자체 설정 schema와 변수 치환 규칙을 사용합니다. VSCode `launch.json` 파일을 그대로 호환한다고 가정하지 않습니다. Neovim 지원 범위도 프로젝트 문서에서 확인합니다.

## DDD — Data Display Debugger

GUI 디버거의 *조상*. 1990년대부터. 변수를 *그래프 노드*로 시각화.

```bash
$ ddd ./my_prog
```

변수 간 관계를 그래프로 탐색하려는 경우 검토할 수 있습니다. 대상 OS의 설치 가능 버전과 GDB 연동을 먼저 확인합니다.

## 작업 환경별 확인 항목

| 상황 | 검토할 조합 |
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

위 표는 성능·안정성 순위가 아닙니다. 같은 실행 파일에서 breakpoint, 변수 확장, stdin, remote 연결, 종료·재연결을 확인한 뒤 작업에 맞춰 선택합니다.

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

- [GDB and LLDB 시리즈](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install) — 기본
- [Embedded Debugging 시리즈](/blog/tools/debugging/embedded/chapter01-rsp-protocol)
- [cgdb](https://cgdb.github.io/)
- [gdb-dashboard](https://github.com/cyrus-and/gdb-dashboard)
- [pwndbg](https://github.com/pwndbg/pwndbg)
- [gef](https://github.com/hugsy/gef)
- [VSCode C/C++](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools)
- [CodeLLDB](https://marketplace.visualstudio.com/items?itemName=vadimcn.vscode-lldb)
- [nvim-dap](https://github.com/mfussenegger/nvim-dap)
- [Cortex-Debug](https://github.com/Marus/cortex-debug)
- [DAP 명세](https://microsoft.github.io/debug-adapter-protocol/)


## 확인 범위

TUI 키·마우스는 [GDB 17.2 소스와 매뉴얼](https://sourceware.org/pub/gdb/releases/gdb-17.2.tar.xz), frontend 설정은 [nvim-dap 문서](https://github.com/mfussenegger/nvim-dap/blob/master/doc/dap.txt), [Vimspector 설정](https://github.com/puremourning/vimspector#configuration), [Cortex-Debug 속성](https://github.com/Marus/cortex-debug/blob/master/debug_attributes.md)을 기준으로 대조했습니다. JSON 문법·이미지 크기 경계 검사는 GUI·프로브 연결 성공과 구분합니다. 외부 확장은 설치한 릴리스와 commit을 기록해 다시 확인해야 합니다.
