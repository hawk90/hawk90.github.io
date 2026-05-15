---
title: "Ch 10: TUI / 프런트엔드"
date: 2025-08-20T10:00:00
description: "TUI 모드, cgdb, gdb-dashboard, gef/pwndbg, VSCode, nvim-dap."
tags: [gdb, TUI, Frontend, DAP]
series: "GDB and LLDB"
seriesOrder: 10
draft: false
---

GDB는 기본적으로 명령줄입니다. 강력하지만 한 화면에 *지금 어디서 멈췄는지*, *변수가 얼마인지*, *콜스택*, *레지스터*를 동시에 보여 주지 못합니다. 이 장은 TUI(터미널 UI)와 외부 프런트엔드로 그 한계를 메우는 방법입니다.

## GDB 내장 TUI

```text
(gdb) tui enable
(gdb) layout src         # 소스 + 명령
(gdb) layout asm         # 어셈블리 + 명령
(gdb) layout regs        # 레지스터 패널 추가
(gdb) layout split       # 소스 + 어셈블리 + 명령
```

토글 단축키 `Ctrl-x a`. 한 번 켜면 화면이 분할되어 위쪽엔 소스가, 아래쪽엔 명령창이 뜹니다. 화살표/PgUp으로 소스 스크롤, `Ctrl-x o`로 패널 포커스 전환, `Ctrl-l`로 다시 그리기.

### 자주 쓰는 단축키

| 단축키 | 동작 |
|--------|------|
| `Ctrl-x a` | TUI on/off 토글 |
| `Ctrl-x 1` | 한 윈도 |
| `Ctrl-x 2` | 두 윈도 |
| `Ctrl-x o` | 다음 패널로 포커스 |
| `Ctrl-l` | 다시 그리기 |
| `Ctrl-x s` | TUI SingleKey 모드(`s`=step, `n`=next 등) |

### 제약

- 윈도 깨짐이 자주 일어남(`Ctrl-l` 자주 누르게 됨).
- 마우스 안 됨.
- 일부 환경에서 color 안 나옴.

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

GDB 내장 TUI보다 *훨씬* 안정적입니다. 패키지 매니저로 바로 설치되므로 첫 선택지로 추천.

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
```

장점 — Python 한 파일이라 설정/이식 쉬움. TUI 모드처럼 화면이 깨지지 않고, 매 정지마다 위쪽에 패널이 다시 그려집니다.

## gef / pwndbg / peda — 보안·exploit 디버깅

세 가지 모두 보안 분석가의 작업을 GDB 위에서 빠르게 하기 위한 Python 확장입니다.

| | 특징 |
|---|------|
| **gef** | 한 파일 스크립트, 가벼움, ARM/MIPS/PPC도 지원 |
| **pwndbg** | 가장 활발한 유지보수, 힙 분석 깊음 |
| **peda** | 가장 오래됨, x86 중심 |

```bash
# gef
$ wget -O ~/.gdbinit-gef.py https://gef.blah.cat/py
$ echo "source ~/.gdbinit-gef.py" >> ~/.gdbinit

# pwndbg
$ git clone https://github.com/pwndbg/pwndbg
$ cd pwndbg && ./setup.sh
```

설치 후 정지할 때마다 레지스터·스택·디스어셈블·코드 컨텍스트가 자동으로 한 화면에 뜹니다. CTF·exploit 분석에 사실상 표준.

`context`, `vmmap`, `heap`, `xinfo`, `pattern create/search`(buffer overflow 오프셋) 같은 명령이 매우 강력합니다.

> 일반 애플리케이션 디버깅에는 다소 시끄러울 수 있습니다. 보안 분석·CTF 외에는 gdb-dashboard나 cgdb가 더 어울립니다.

## VSCode + cppdbg / CodeLLDB

가장 많이 쓰는 IDE 프런트엔드. `launch.json` 한 파일로 설정.

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "GDB attach",
      "type": "cppdbg",
      "request": "launch",
      "program": "${workspaceFolder}/build/my_program",
      "args": ["arg1"],
      "stopAtEntry": false,
      "cwd": "${workspaceFolder}",
      "MIMode": "gdb",
      "setupCommands": [
        { "text": "set print pretty on" }
      ]
    },
    {
      "name": "LLDB launch",
      "type": "lldb",
      "request": "launch",
      "program": "${workspaceFolder}/build/my_program",
      "args": [],
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

- `cppdbg` 익스텐션(C/C++) — GDB·LLDB 모두 지원하지만 GDB와 더 잘 맞음.
- `CodeLLDB` 익스텐션 — LLDB 전용, macOS·Rust 디버깅에 우수.

### 단축키

| 단축키 | 동작 |
|--------|------|
| `F5` | 시작/계속 |
| `F10` | next |
| `F11` | step in |
| `Shift+F11` | step out (finish) |
| `F9` | 줄에 브레이크포인트 토글 |
| `Shift+F5` | 종료 |

마우스 호버로 변수 표시, 좌측에 변수·콜스택·브레이크포인트·watch 패널이 자동으로 정리됩니다. 가장 입문 부담이 낮은 길.

### 한계

- 콘솔 입력이 필요한 프로그램(stdin)이 까다로움.
- Conditional breakpoint의 표현식이 GDB와 미묘하게 다를 때가 있음.
- 멀티프로세스(fork) 추적은 cppdbg가 GDB만큼 정교하지 못함.

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
}
```

```lua
vim.keymap.set('n', '<F5>', dap.continue)
vim.keymap.set('n', '<F10>', dap.step_over)
vim.keymap.set('n', '<F11>', dap.step_into)
vim.keymap.set('n', '<S-F11>', dap.step_out)
vim.keymap.set('n', '<F9>', dap.toggle_breakpoint)
```

Neovim 안에서 디버그 패널 띄우고, REPL로 표현식 평가. Vim 키를 유지하면서 IDE 수준의 경험을 가져갑니다.

## DAP — 표준 프로토콜의 의미

VSCode/Neovim/Emacs(dap-mode)가 모두 *같은* DAP를 씁니다. 따라서 한 어댑터(`cppdbg`)를 설치하면 어느 에디터든 동일한 디버깅 경험을 얻을 수 있습니다. RSP가 *디버거 ↔ 타깃* 표준이라면 DAP는 *IDE ↔ 디버거* 표준.

```
[에디터] ← DAP → [adapter (예: cppdbg)] ← MI → [GDB]
                                              ↑ RSP
                                            [gdbserver / OpenOCD]
```

## Emacs — dap-mode / gud

전통적으로 Emacs는 `M-x gdb`로 GUD(GDB UI mode)를 썼습니다. 요즘은 `dap-mode`로 같은 DAP 어댑터를 공유.

```elisp
(use-package dap-mode
  :after lsp-mode
  :config (dap-auto-configure-mode))
```

자세한 설정은 dap-mode 문서.

## 데이터·메모리 시각화

- **VSCode의 Hex Editor + memoryview** — 메모리 영역을 hex 그리드로.
- **gef의 `memoryview`** — 메모리 영역을 색칠해 표시.
- **gdb의 `dashboard memory`** — 직접 watch 영역 지정.

큰 버퍼·이미지 디버깅에서는 hex 뷰가 콜스택보다 더 자주 쓰입니다.

## 어느 걸 골라야 하나

| 상황 | 추천 |
|------|------|
| 가벼운 한 번 디버깅 | GDB TUI(`Ctrl-x a`) |
| 일상 — 터미널만 | cgdb 또는 gdb-dashboard |
| 일상 — IDE 같이 | VSCode + cppdbg/CodeLLDB |
| Vim 사용자 | nvim-dap + dapui |
| CTF / exploit | pwndbg 또는 gef |
| 임베디드 GDB (Cortex-M) | VSCode + Cortex-Debug 익스텐션, 또는 cgdb |

## 정리

- 내장 TUI(`Ctrl-x a`)는 빠른 시각화, 화면 깨짐만 감수하면 충분.
- cgdb·gdb-dashboard가 터미널에서 가장 안정적.
- gef/pwndbg는 보안·CTF 용으로 강력하지만 일반 작업엔 시끄러움.
- IDE 통합은 VSCode + cppdbg/CodeLLDB 또는 nvim-dap.
- DAP가 IDE↔디버거 표준 — 어댑터를 공유한다.
- Cortex-M은 VSCode Cortex-Debug 익스텐션이 자동으로 OpenOCD/J-Link까지 묶어 줌.

## 다음 장 예고

Ch 11(시리즈 마지막) — 실전 팁. STL pretty-printer, -O2로 빌드된 코드 디버깅, `.gdbinit` 추천 설정, time-travel(rr)으로 마무리.

## 관련 항목

- [Ch 8: 원격 디버깅](/blog/tools/gdb-lldb/chapter08-remote-debugging) — Cortex-Debug 익스텐션이 OpenOCD를 띄움
- [Ch 9: Python 스크립팅](/blog/tools/gdb-lldb/chapter09-python-scripting) — dashboard도 Python 확장
- [DAP 명세](https://microsoft.github.io/debug-adapter-protocol/)
- [cgdb 공식](https://cgdb.github.io/)
- [gdb-dashboard](https://github.com/cyrus-and/gdb-dashboard)
