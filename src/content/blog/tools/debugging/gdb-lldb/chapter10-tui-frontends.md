---
title: "GDB·LLDB TUI와 프런트엔드 — gdb-dashboard·gef·pwndbg·VS Code"
slug: "tools/debugging/gdb-lldb/chapter10-tui-frontends"
date: 2026-05-24T09:10:00
description: "TUI 모드, cgdb, gdb-dashboard, gef/pwndbg, VSCode, nvim-dap, DAP 프로토콜."
tags: [gdb, TUI, Frontend, DAP]
series: "GDB and LLDB"
seriesOrder: 10
draft: false
topics: ["tools", "tools/debugging"]
---

:::tip[Deep dive]
이 챕터는 빠른 참조입니다. 깊은 내부 메커니즘은 [GDB Extension and IDE 시리즈](/blog/tools/debugging/gdb-extension/chapter06-frontends)를 참고하세요 — TUI, cgdb, dashboard, gef/pwndbg, VSCode, nvim-dap, Cortex-Debug 비교.
:::


GDB는 기본적으로 명령줄입니다. 강력하지만 한 화면에 *지금 어디서 멈췄는지*, *변수가 얼마인지*, *콜스택*, *레지스터*를 동시에 보여 주지는 않습니다. 이 장은 TUI(터미널 UI)와 외부 프런트엔드로 그 빈자리를 메우는 방법을 다룹니다. 계기판 없는 자동차에 속도계와 연료계를 달아 주는 일과 비슷합니다. 엔진(GDB·LLDB)은 그대로이고 보여 주는 방식만 바뀝니다.

이 장에서 직접 돌린 것은 GDB 16.3의 내장 TUI, cgdb 0.8.0, 그리고 DAP(Debug Adapter Protocol)로 lldb-dap 19.1.7과 GDB 16.3의 내장 DAP에 말을 거는 작은 클라이언트입니다. 모두 Debian 13 arm64 VM에서 [Ch 1](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install)의 `hello.c`로 확인했고, 화면은 `tmux capture-pane`으로 떴습니다. gdb-dashboard, gef/pwndbg/peda, VS Code 확장, Cortex-Debug는 실행하지 않았으므로 각 프로젝트의 README와 공식 문서를 근거로 적습니다.

## GDB 내장 TUI

```text
(gdb) tui enable
(gdb) layout src         # 소스 + 명령
(gdb) layout asm         # 어셈블리 + 명령
(gdb) layout regs        # 레지스터 패널 추가
(gdb) layout split       # 소스 + 어셈블리 + 명령
```

`factorial`에 멈춘 상태에서 `tui enable`을 치면 위쪽 창에 `hello.c`가 뜨고, 현재 줄에 `B+>`(breakpoint가 걸린 현재 위치)가 붙습니다. 아래 상태 줄에는 현재 함수·줄·PC가 나옵니다.

```text
│B+>     5     if (n <= 1) return 1;
...
multi-thre Thread 0xfffff7fef0 (src) In: factorial                                   L5    PC: 0xaaaaaaaa07b4
```

`layout asm`은 같은 자리를 `B+>0xaaaaaaaa07b4 <factorial+12>   ldr     w0, [sp, #28]`처럼 명령 단위로 보여 주고, `layout regs`는 직전 레이아웃(여기서는 asm) 위에 `Register group: general` 창을 얹었습니다. `layout split` 뒤 `info win`으로 창 구성을 확인했습니다.

```text
(gdb) info win
Name       Lines Columns Focus
src           11     110
asm           12     110 (has focus)
status         1     110
cmd           11     110
```

### 동작 원리

GDB 매뉴얼 TUI 절은 TUI를 `curses` 라이브러리로 소스·어셈블리·레지스터를 텍스트 창에 보여 주는 인터페이스라고 설명합니다. `info win`이 보여 주듯 창은 `src`, `asm`, `regs`, `status`, `cmd` 같은 이름을 갖고, 레이아웃은 이 창들의 조합입니다.

### 자주 쓰는 단축키

GDB 16.3 매뉴얼 TUI Keys 절의 키입니다.

| 단축키 | 동작 |
|--------|------|
| `C-x a` (`C-x C-a`, `C-x A`) | TUI 모드 켜기/끄기 |
| `C-x 1` | 창 하나짜리 레이아웃 (source 또는 assembly) |
| `C-x 2` | 창 둘 이상인 레이아웃, 다시 누르면 다음 두 창 레이아웃 |
| `C-x o` | 다음 창으로 포커스 이동 |
| `C-x s` | TUI SingleKey 모드 켜기/끄기 |
| `PgUp` / `PgDn` | 활성 창 한 페이지 스크롤 |
| `Up` / `Down` / `Left` / `Right` | 활성 창 한 줄·한 칸 스크롤 |
| `C-L` | 화면 다시 그리기 |

같은 절은 TUI에서 화살표 키가 활성 창 스크롤에 쓰이므로, 명령 창에 포커스가 없을 때 명령 히스토리는 `C-p`·`C-n` 같은 readline 키로 다뤄야 한다고 적습니다.

### 마우스와 제약

GDB 16.3 매뉴얼은 curses 라이브러리가 지원하면 TUI도 마우스를 지원하고, `set tui mouse-events`가 기본 `on`이라고 적습니다. 마우스 클릭을 터미널의 텍스트 선택에 쓰고 싶으면 이 설정을 끕니다. TUI에는 변수 감시 창이 따로 없어서, 변수는 `cmd` 창에서 `print`·`display`로 봅니다.

## cgdb — 분할 화면 GDB

[cgdb](https://cgdb.github.io/)는 위에 vi 키를 쓰는 소스 창, 아래에 GDB 명령 창을 두는 별도 터미널 프런트엔드입니다. Debian 13의 cgdb 0.8.0으로 `factorial`에 멈춘 화면입니다.

```text
 4│ int factorial(int n) {
 5├───> if (n <= 1) return 1;
 6│     return n * factorial(n - 1);
...
/root/ch10/hello.c
Reading symbols from ./hello...
New UI allocated
(gdb) break factorial
Breakpoint 1 at 0x7b4: file hello.c, line 5.
(gdb) run
...
Breakpoint 1, factorial (n=5) at hello.c:5
```

cgdb 매뉴얼(`info cgdb`)에 따르면 소스 창과 GDB 창은 vi처럼 `Esc`와 `i`로 오가고, GDB와의 통신은 cgdb가 함께 만든 gdbwire 라이브러리가 맡습니다. 위 화면의 `New UI allocated`는 GDB 16.3 `gdb/ui.c`(237행)의 `new-ui` 명령 처리기가 찍는 메시지로, cgdb가 GDB에 `new-ui`로 별도 UI를 연 흔적입니다.

### 설정

cgdb는 `~/.cgdb/cgdbrc`(또는 `$CGDB_DIR/cgdbrc`)의 각 줄을 시작할 때 실행합니다. 아래 옵션 이름과 값은 cgdb 매뉴얼에서 확인했습니다. `winsplit`의 값은 `src_full`, `src_big`, `even`, `gdb_big`, `gdb_full` 중 하나입니다.

```text
set winminheight=3
set winsplit=src_big
set syntax=on
set color=on
map <C-n> :gdb next<CR>
```

## gdb-dashboard — 단일 파이썬 스크립트

이 절은 실행하지 않았습니다. [cyrus-and/gdb-dashboard](https://github.com/cyrus-and/gdb-dashboard) README는 이 도구를 GDB [Python API](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting)로 쓴 독립 `.gdbinit` 파일 하나라고 설명합니다. 홈 디렉터리에 `.gdbinit`을 두면 대상 프로그램이 멈출 때마다 대시보드가 나타나고, README는 GDB 명령을 재정의하지 않으며 모든 기능이 `dashboard` 명령 아래에 있다고 적습니다. 문법 강조는 Pygments를 설치하면 켜집니다.

```bash
wget -P ~ https://github.com/cyrus-and/gdb-dashboard/raw/master/.gdbinit
pip install pygments
```

모듈과 레이아웃 설정은 `help dashboard`와 프로젝트 wiki에 있습니다.

## gef / pwndbg / peda — 보안·exploit 디버깅

이 세 도구도 실행하지 않았습니다. 각 README가 밝히는 성격은 다음과 같습니다.

| 도구 | README의 설명 |
|------|------|
| [GEF](https://github.com/hugsy/gef) | x86/64, ARM, MIPS, PowerPC, SPARC용 명령 모음. exploit 개발자와 리버스 엔지니어를 돕고, GDB 10.0 이상과 Python 3.10 이상 바인딩이 필요 |
| [pwndbg](https://github.com/pwndbg/pwndbg) | 리버스 엔지니어링과 exploit 개발용. GDB와 LLDB를 모두 지원하지만 LLDB 구현은 아직 초기 단계라고 명시. qemu-user 에뮬레이션은 GDB에서만 |
| [PEDA](https://github.com/longld/peda) | Linux/Unix exploit 개발용 Python GDB 스크립트. README의 버전 1.0은 Black Hat USA 2012 공개판이고, 요구 사항이 GDB 7.x와 Python 2.6+ |

설치는 README대로 합니다. GEF는 `bash -c "$(curl -fsSL https://gef.blah.cat/sh)"` 같은 설치 스크립트를, pwndbg는 [설치 문서](https://pwndbg.re/stable/setup)를 안내합니다. 원격 스크립트를 셸로 바로 실행하는 방식이므로, 내용을 먼저 받아 읽어 본 뒤 실행하는 편이 안전합니다.

상세 비교는 [GDB Extension and IDE Ch 6: GDB 프런트엔드 비교](/blog/tools/debugging/gdb-extension/chapter06-frontends)에 있습니다.

## VSCode + cppdbg / CodeLLDB

이 절도 실행하지 않았습니다. GDB 사용자 입장에서 알아 둘 것은 *두 확장이 디버거와 대화하는 방식이 다르다*는 점입니다.

Microsoft C/C++ 확장의 `cppdbg`는 [launch.json 레퍼런스](https://code.visualstudio.com/docs/cpp/launch-json-reference)에 따르면 `MIMode`를 `gdb` 또는 `lldb`로 정해 그 디버거에 붙습니다. `setupCommands`는 "JSON array of commands to execute in order to set up the GDB or LLDB"이므로 `.gdbinit`에 넣던 명령을 여기 넣을 수 있고, 콘솔 입력이 필요한 프로그램은 `externalConsole`, core 파일 분석은 `coreDumpPath`로 지정합니다. 이름 그대로 MI를 쓰므로 [Ch 9](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting)에서 본 pretty-printer의 `displayhint`가 이 경로로 전달됩니다.

[CodeLLDB](https://github.com/vadimcn/codelldb)는 README에 따르면 LLDB 기반 확장으로, C++와 Rust 표준 라이브러리 타입의 시각화기를 내장하고 조건부 breakpoint·logpoint·하드웨어 watchpoint·메모리 뷰·원격 디버깅 등을 지원합니다.

`launch.json` 전체 예시는 [GDB Extension and IDE Ch 6](/blog/tools/debugging/gdb-extension/chapter06-frontends)에 정리돼 있습니다.

## Neovim — nvim-dap

[nvim-dap](https://github.com/mfussenegger/nvim-dap)은 Neovim용 DAP 클라이언트이고, README대로 언어마다 디버그 어댑터를 따로 설치해 설정합니다. 이 시리즈에서는 Neovim을 실행하지 않았습니다. 아래 설정은 nvim-dap 도움말(`doc/dap.txt`)의 `type = 'executable'` 어댑터 형식에 lldb-dap을 넣은 것입니다. lldb-dap은 아래 DAP 절에서 실제로 돌린 어댑터입니다.

```lua
local dap = require('dap')

dap.adapters.lldb = {
  type = 'executable',
  command = 'lldb-dap-19',   -- Debian 13의 실행 파일 이름
  name = 'lldb',
}

dap.configurations.c = {
  {
    name = 'Launch',
    type = 'lldb',
    request = 'launch',
    program = function()
      return vim.fn.input('Path to executable: ', vim.fn.getcwd() .. '/', 'file')
    end,
    cwd = '${workspaceFolder}',
    stopOnEntry = false,
  },
}
```

nvim-dap은 기본 키 매핑을 정하지 않습니다(`dap.txt`의 MAPPINGS 절). 같은 절이 예로 드는 매핑은 다음과 같습니다.

```lua
vim.keymap.set('n', '<F5>', function() require('dap').continue() end)
vim.keymap.set('n', '<F10>', function() require('dap').step_over() end)
vim.keymap.set('n', '<F11>', function() require('dap').step_into() end)
vim.keymap.set('n', '<F12>', function() require('dap').step_out() end)
vim.keymap.set('n', '<Leader>b', function() require('dap').toggle_breakpoint() end)
vim.keymap.set('n', '<Leader>dl', function() require('dap').run_last() end)
```

창 구성은 [nvim-dap-ui](https://github.com/rcarriga/nvim-dap-ui)가 맡고, README는 nvim-dap의 이벤트에 `dapui.open()`·`dapui.close()`를 연결하는 예를 듭니다.

```lua
local dap, dapui = require("dap"), require("dapui")
dapui.setup()
dap.listeners.before.launch.dapui_config = function() dapui.open() end
dap.listeners.before.event_terminated.dapui_config = function() dapui.close() end
```

## DAP — 표준 프로토콜의 의미

[Debug Adapter Protocol](https://microsoft.github.io/debug-adapter-protocol/)은 편집기(VS Code, Neovim 등)와 디버그 어댑터 사이의 규약입니다. RSP가 *디버거 ↔ 타깃*이라면 DAP는 *편집기 ↔ 디버거*입니다. 이 장에서 다룬 연결을 층으로 나누면 다음과 같습니다.

| 층 | 프로토콜 | 이 시리즈에서 본 예 |
|----|----------|--------------------|
| 편집기 ↔ 어댑터 | DAP | lldb-dap 19.1.7, `gdb -i=dap` (아래) |
| 어댑터 ↔ 디버거 | GDB/MI 등 | cppdbg의 `MIMode` ([Ch 9](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting)의 MI 세션) |
| 디버거 ↔ 타깃 | RSP | gdbserver, OpenOCD ([Ch 8](/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging)) |

GDB 16.3 매뉴얼은 Python 지원으로 빌드된 GDB가 DAP도 지원하며 `--interpreter=dap`으로 켠다고 적습니다. 즉 GDB 자신이 어댑터가 될 수 있습니다.

### DAP 메시지

DAP 개요 문서의 Base Protocol 절에 따르면 메시지는 `Content-Length` 헤더(ASCII, 유일한 필수 헤더)와 `\r\n\r\n` 뒤의 JSON 본문(UTF-8)으로 이루어지고, 본문은 request·response·event 셋 중 하나입니다. 이 형식을 그대로 쓰는 40줄짜리 Python 클라이언트(`dap_client.py`)로 lldb-dap 19.1.7에 `initialize` → `launch` → `setBreakpoints` → `configurationDone` → `stackTrace` → `scopes` → `variables`를 보냈습니다. 긴 응답은 줄였습니다.

```text
>>> Content-Length: 162

{"seq": 1, "type": "request", "command": "initialize", "arguments": {"clientID": "demo", "adapterID": "lldb-dap", "linesStartAt1": true, "columnsStartAt1": true}}
<<< Content-Length: 1270 {"body": {"__lldb": {"version": "lldb version 19.1.7"}, "completionTriggerCharacters": [".", " ", "\t"], "exceptionBreakpointFilters": [{"default": false, "filter": "cpp_catch", "label": "C++ Catch"}, ...
<<< Content-Length: 46 {"event": "initialized", "seq": 0, "type": "event"}
>>> {"seq": 3, "type": "request", "command": "setBreakpoints", "arguments": {"source": {"path": "/root/ch10/hello.c"}, "breakpoints": [{"line": 5}]}}
<<< {"body": {"breakpoints": [{"column": 8, "id": 1, "instructionReference": "0xAAAAAAAA07B4", "line": 5, "source": {"name": "hello.c", "path": "/root/ch10/hello.c"}, "verified": true}]}, "command": "setBreakpoints", "request_seq": 3, "seq": 0, "success": true, "type": "response"}
<<< {"body": {"allThreadsStopped": true, "description": "breakpoint 1.1", "hitBreakpointIds": [1], "preserveFocusHint": false, "reason": "breakpoint", "threadCausedFocus": true, "threadId": 2839}, "event": "stopped", "seq": 0, "type": "event"}
>>> {"seq": 6, "type": "request", "command": "scopes", "arguments": {"frameId": 524288}}
<<< {"body": {"scopes": [{"expensive": false, "name": "Locals", "namedVariables": 1, "presentationHint": "locals", "variablesReference": 1}, {"expensive": false, "name": "Globals", "namedVariables": 0, "variablesReference": 2}, {"expensive": false, "name": "Registers", ...
>>> {"seq": 7, "type": "request", "command": "variables", "arguments": {"variablesReference": 1}}
<<< {"body": {"variables": [{"$__lldb_extensions": {...}, "evaluateName": "n", "id": -1, "name": "n", "type": "int", "value": "5", "variablesReference": 0}]}, "command": "variables", ...
```

`Content-Length: 162`는 뒤따르는 JSON 본문의 바이트 수입니다. 편집기의 변수 창은 이 흐름 그대로 동작합니다. `scopes`가 `Locals`에 `variablesReference: 1`을 주면, 그 번호로 `variables`를 불러 `n = 5`를 받습니다. 값이 구조체라면 그 변수에 다시 0이 아닌 `variablesReference`가 붙고, 펼칠 때 같은 요청을 한 번 더 보냅니다.

같은 클라이언트를 `gdb -q -i=dap`에 붙여도 `factorial`에서 멈췄습니다. 어댑터마다 세부는 달랐습니다. GDB는 `configurationDone` 전에 `setBreakpoints`를 받자 `"verified": false, "reason": "pending"`으로 답한 뒤, 실행 파일을 읽고 나서 `breakpoint` 이벤트로 `verified: true`를 다시 보냈고, `scopes`의 첫 항목 이름이 `Locals`가 아니라 `Arguments`였습니다.

```text
<<< {"request_seq": 3, "type": "response", "command": "setBreakpoints", "success": true, "body": {"breakpoints": [{"id": 1, "verified": false, "reason": "pending"}]}, "seq": 3}
...
<<< {"type": "event", "event": "breakpoint", "body": {"reason": "changed", "breakpoint": {"id": 1, "verified": true, "source": {"name": "hello.c", "path": "/root/ch10/hello.c"}, "line": 5, "instructionReference": "0xaaaaaaaa07b4"}}, "seq": 12}
<<< {"type": "event", "event": "stopped", "body": {"threadId": 1, "allThreadsStopped": true, "hitBreakpointIds": [1], "reason": "breakpoint"}, "seq": 17}
```

프로토콜은 같아도 편집기가 받는 메시지의 순서와 이름은 어댑터에 따라 다르다는 것을 두 로그가 보여 줍니다.

## 데이터·메모리 시각화

터미널에서 메모리를 보는 기본 도구는 [Ch 3](/blog/tools/debugging/gdb-lldb/chapter03-inspecting-state)의 `x`와 LLDB의 `memory read`입니다. 위 DAP 절의 `scopes` 응답처럼 어댑터는 `Registers` 같은 범위도 함께 넘기므로, 편집기 쪽 레지스터·메모리 창은 이런 요청 위에 그려집니다. 큰 자료구조를 그림으로 보고 싶다면 [Ch 9](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting)의 `viz_tree`처럼 Python으로 DOT 파일을 떨어뜨리는 방법이 있습니다.

## Cortex-Debug — Cortex-M을 붙일 때

이 절은 실행하지 않았습니다. [Cortex-Debug](https://github.com/Marus/cortex-debug) README에 따르면 이 VS Code 확장은 J-Link, OpenOCD GDB Server, ST-LINK GDB server, pyOCD, Black Magic Probe를 지원하고, SVD 기반 Peripheral 뷰, OpenOCD와 J-Link를 통한 SEGGER RTT, GDB 서버가 지원하는 경우의 Live Watch, RTOS 스레드 표시 등을 제공합니다. README는 칩 벤더가 자체 OpenOCD를 배포하면 그것을 쓰라고 권합니다. [Ch 8](/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging)의 OpenOCD·J-Link 연결 흐름이 이 확장의 밑바닥입니다.

## 어느 걸 골라야 하나

이 장에서 확인한 성격을 기준으로 정리하면 다음과 같습니다.

| 상황 | 후보 | 근거 |
|------|------|------|
| 가벼운 한 번 디버깅 | GDB TUI(`C-x a`) | 별도 설치 없음, `layout split`으로 소스·어셈블리 동시 표시 |
| 터미널 + vi 키 | cgdb | vi식 소스 창 + GDB 창 |
| 정지할 때마다 상태 요약 | gdb-dashboard | 단일 `.gdbinit`, 정지마다 출력 (README) |
| CTF / exploit | pwndbg 또는 GEF | 해당 용도로 만든 도구 (README) |
| IDE | VS Code + cppdbg/CodeLLDB, nvim-dap | DAP·MI 위에 동작 |
| Cortex-M | VS Code + Cortex-Debug | SVD·RTT·Live Watch (README) |
| 자동화 / 헤드리스 | `gdb -batch` + Python | 이 시리즈의 모든 세션 |

## 정리

- GDB 16.3 TUI는 `src`·`asm`·`regs`·`cmd`·`status` 창을 레이아웃으로 묶고, `info win`이 구성을 보여 줍니다. 마우스는 `set tui mouse-events`(기본 on)로 지원됩니다.
- TUI 키는 매뉴얼 TUI Keys 절의 `C-x a`·`C-x 1`·`C-x 2`·`C-x o`·`C-x s`와 화살표·`C-L`입니다.
- cgdb 0.8.0은 vi식 소스 창과 GDB 창으로 나뉘고, `winsplit` 값은 `src_full`·`src_big`·`even`·`gdb_big`·`gdb_full`입니다.
- gdb-dashboard·GEF·pwndbg·PEDA·VS Code 확장·Cortex-Debug는 실행하지 않았고 README와 공식 문서로만 적었습니다.
- DAP 메시지는 `Content-Length` 헤더 + JSON 본문이고, 변수 창은 `scopes` → `variables`로 `variablesReference`를 따라갑니다.
- GDB 16.3은 `-i=dap`으로 그 자체가 DAP 어댑터가 됩니다. lldb-dap과는 breakpoint 확정 순서와 scope 이름이 달랐습니다.

## 다음 장 예고

[Ch 11: 실전 팁](/blog/tools/debugging/gdb-lldb/chapter11-practical-tips)은 STL 출력 조절, `-O2` 코드의 `<optimized out>`, `.gdbinit` 추천 설정, GDB의 `record full`을 이용한 역실행을 실제로 돌려 봅니다.

## 관련 항목

- [Ch 8: 원격 디버깅](/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging) — probe와 server 연결 설정
- [Ch 9: Python 스크립팅](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting) — dashboard도 Python 확장
- [DAP 명세](https://microsoft.github.io/debug-adapter-protocol/)
- [cgdb 공식](https://cgdb.github.io/)
- [gdb-dashboard](https://github.com/cyrus-and/gdb-dashboard)
- [pwndbg](https://github.com/pwndbg/pwndbg)
- [Cortex-Debug](https://github.com/Marus/cortex-debug)
- [nvim-dap](https://github.com/mfussenegger/nvim-dap)
