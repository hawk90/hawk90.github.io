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

GDB의 본질은 명령줄이지만 그 위에 얹는 화면은 여럿입니다. 한 터미널을 나누는 내장 TUI부터, 정지할 때마다 상태판을 찍는 Python 스크립트, 편집기 안의 디버그 패널까지 있습니다. 엔진은 같고 계기판만 다른 자동차와 비슷합니다. 이 장은 각 프런트엔드가 GDB와 *어떤 경로로* 이어지는지, 그래서 무엇을 기대할 수 있는지를 봅니다. 앞 장의 언어로 말하면, 내장 TUI는 GDB 안의 curses 화면이고, gdb-dashboard·GEF는 [Ch 2](/blog/tools/debugging/gdb-extension/chapter02-commands-events)의 이벤트 훅 위의 Python이며, IDE는 [Ch 5](/blog/tools/debugging/gdb-extension/chapter05-mi-dap-protocol)의 MI·DAP 위에 있습니다.

직접 돌린 것은 GDB 16.3 내장 TUI, cgdb 0.8.0, 그리고 메모리를 PPM 파일로 내보내는 Python 명령입니다. Debian 13 arm64 VM에서 실습 프로그램 `img.c`로 확인했고, 화면은 `tmux capture-pane`으로 떴습니다. gdb-dashboard·GEF·pwndbg·PEDA·VS Code 확장·Neovim·Emacs·Cortex-Debug·Vimspector·DDD는 실행하지 않았으므로 각 프로젝트의 공식 문서와 소스를 근거로 적습니다.

```c title="img.c (발췌)"
struct image { int width; int height; unsigned char *data; };

int render(struct image *img) {
    int lit = 0;
    for (int y = 0; y < img->height; y++)
        for (int x = 0; x < img->width; x++)
            for (int c = 0; c < 3; c++) {
                img->data[(y * img->width + x) * 3 + c] = checker(x, y, c);
                lit += img->data[(y * img->width + x) * 3 + c] > 128;
            }
    return lit;                         /* 19행: break here */
}
```

`main()`이 32×16 RGB 버퍼를 `malloc`해 `render()`에 넘기고, `render()`가 8픽셀 격자 무늬를 칠합니다.

## 내장 TUI

```text
(gdb) tui enable
(gdb) layout src         # 소스 + 명령
(gdb) layout asm         # 어셈블리 + 명령
(gdb) layout regs        # 레지스터 창 추가
(gdb) layout split       # 소스 + 어셈블리 + 명령
```

19행에 멈춘 뒤 `tui enable`을 친 화면입니다. 110열 화면에서 뜬 것이라 오른쪽 여백과 테두리는 잘라 냈습니다. 현재 줄의 `B+>`는 breakpoint(`B`)가 걸린 현재 위치(`>`)라는 표시이고, 아래 상태 줄에 함수·줄·PC가 나옵니다.

```text
┌─img.c───────────────────────────────────────────────────────────────────────┐
│       11 int render(struct image *img) {
...
│       16                 img->data[(y * img->width + x) * 3 + c] = checker(x, y, c);
│       17                 lit += img->data[(y * img->width + x) * 3 + c] > 128;
│       18             }
│B+>    19     return lit;                         /* 19행: break here */
│       20 }
...
multi-thre Thread 0xfffff7ff00 (src) In: render                  L19   PC: 0xaaaaaaaa09e4
(gdb)
```

`layout asm`은 같은 자리를 `B+>0xaaaaaaaa09e4 <render+308>     ldr     w0, [sp, #60]`처럼 명령 단위로 보여 줬습니다. `layout regs`는 직전 레이아웃(asm) 위에 `Register group: general` 창을 얹었고, `layout split` 뒤의 `info win`은 다음과 같았습니다.

```text
(gdb) info win
Name       Lines Columns Focus
src           10     110
asm           11     110 (has focus)
status         1     110
cmd           11     110
```

### 동작 원리

GDB 16.3 매뉴얼 TUI 장에 따르면 TUI는 curses 라이브러리로 소스·어셈블리·레지스터를 텍스트 창에 그리는, GDB 자체에 들어 있는 인터페이스입니다. `info win`이 보여 주듯 창은 `src`·`asm`·`regs`·`status`·`cmd` 같은 이름을 갖고, 레이아웃은 그 창들의 조합입니다. 같은 프로세스 안이라 MI나 DAP를 거치지 않습니다.

### 단축키

GDB 16.3 매뉴얼 TUI Keys 절의 키입니다. 창 높이는 키가 아니라 `winheight`(= `tui window height`) 명령으로 바꿉니다.

| 키 | 동작 |
|------|------|
| `C-x a` (`C-x C-a`, `C-x A`) | TUI on/off 토글 |
| `C-x 1` | 창 하나짜리 레이아웃 |
| `C-x 2` | 창 둘 이상인 레이아웃, 다시 누르면 다음 조합 |
| `C-x o` | 다음 창으로 포커스 |
| `C-x s` | TUI SingleKey 모드 (`s`=step, `n`=next 등) |
| `PgUp` / `PgDn` | 활성 창 한 페이지 스크롤 |
| `Up` / `Down` / `Left` / `Right` | 활성 창 한 줄·한 칸 스크롤 |
| `C-L` | 화면 다시 그리기 |
| `winheight src +3` / `winheight src -3` | 명령창에서 `src` 창 높이 조절 |

### 제약

- 매뉴얼 TUI Mouse Support 절에 따르면 curses 라이브러리가 마우스를 지원하면 휠로 커서 아래 창을 스크롤할 수 있고, TUI 자체는 마우스 복사·붙여넣기를 지원하지 않습니다. 위 세션의 `show tui mouse-events`는 `TUI mouse events are on.`이었고, 이 설정을 끄면 마우스 클릭이 터미널로 돌아갑니다.
- 기본 창에는 IDE식 변수 감시 트리가 없습니다. 변수는 `cmd` 창에서 `print`·`display`로 봅니다. 매뉴얼 TUI Windows In Python 절의 API로 Python 창을 직접 추가할 수는 있습니다.
- 출력이 화면을 깨뜨리면 `C-L`로 다시 그립니다.

## cgdb

[cgdb](https://cgdb.github.io/)는 위에 vi 키를 쓰는 소스 창, 아래에 GDB 명령창을 두는 별도 터미널 프런트엔드입니다. Debian 13의 cgdb 0.8.0으로 19행에 멈춘 화면입니다.

```text
17│                 lit += img->data[(y * img->width + x) * 3 + c] > 128;
18│             }
19├───> return lit;                         /* 19행: break here */
20│ }
...
/root/ext/ch06/img.c
Starting program: /root/ext/ch06/img
[Thread debugging using libthread_db enabled]
Using host libthread_db library "/lib/aarch64-linux-gnu/libthread_db.so.1".

Breakpoint 1, render (img=0xfffffffff9d8) at img.c:19
19          return lit;                         /* 19행: break here */
(gdb)
```

### 동작 원리

cgdb 매뉴얼(`info cgdb`)은 GDB와의 통신을 gdbwire 라이브러리가 맡는다고 적습니다. 창을 `gdb_big`으로 바꿨을 때 GDB 창 맨 위에 `New UI allocated`가 보이는데, 이는 GDB 16.3 `gdb/ui.c`의 `new-ui` 명령이 찍는 메시지입니다. cgdb가 GDB 안에 별도 UI를 하나 더 열어 쓴다는 흔적입니다.

### 키

cgdb 매뉴얼에 따르면 `cgdbmodekey`(기본 `Esc`)가 소스 창으로, `i`가 GDB 창으로 포커스를 옮깁니다. 소스 창에서는 `j`/`k`/`/` 같은 vi 키로 움직입니다. 위 세션에서 cgdb는 GDB 창에 포커스를 둔 채 시작했습니다.

### 설정

cgdb는 `$CGDB_DIR/cgdbrc`, 없으면 `~/.cgdb/cgdbrc`의 각 줄을 시작할 때 상태 줄에 친 것처럼 실행합니다(cgdb 매뉴얼). 아래는 위 세션에서 쓴 파일입니다.

```text
set winminheight=3
set winsplit=src_big
set syntax=on
```

매뉴얼이 정한 `winsplit` 값은 `src_full`, `src_big`, `even`, `gdb_big`, `gdb_full` 다섯 가지입니다. 실행 중에 `:set winsplit=top_big`을 쳤더니 화면이 그대로였고, `:set winsplit=gdb_big`은 GDB 창을 키웠습니다. 목록에 없는 값은 아무 일도 하지 않으므로 오타가 있어도 눈치채기 어렵습니다.

## gdb-dashboard

[cyrus-and/gdb-dashboard](https://github.com/cyrus-and/gdb-dashboard)는 README에 따르면 GDB Python API로 쓴 독립 `.gdbinit` 파일 하나이고, 대상이 멈출 때마다 대시보드가 나타나며, GDB 명령을 재정의하지 않고 모든 기능을 `dashboard` 명령 아래 둡니다. 이 장에서는 실행하지 않았습니다. 대신 2026-07-17 커밋 `7b9b126`의 `.gdbinit`(2389줄)을 받아 읽었습니다.

README의 설치 방법은 `wget -P ~ https://github.com/cyrus-and/gdb-dashboard/raw/master/.gdbinit`으로 홈의 `.gdbinit`에 바로 받는 것입니다. 기존 `~/.gdbinit`이 있다면 덮어쓰게 되므로, 커밋을 고정해 다른 경로에 받아 두고 명시적으로 source하는 방법도 있습니다.

```text
(gdb) source /absolute/path/to/dashboard.gdbinit
(gdb) help dashboard
```

받은 파일에서 `Dashboard.Module`을 상속한 모듈 클래스는 `Source`, `Assembly`, `Variables`, `Stack`, `History`, `Memory`, `Registers`, `Threads`, `Expressions`, `Breakpoints` 열 개였습니다.

### 어떻게 그리나

같은 파일 462~464행의 `enable()`이 `gdb.events.cont`·`gdb.events.stop`·`gdb.events.exited`에 콜백을 연결하고, `on_stop`이 화면을 다시 그립니다. [Ch 2](/blog/tools/debugging/gdb-extension/chapter02-commands-events)의 이벤트 훅과 같은 구조입니다. 출력은 `gdb.write()`로 ANSI escape가 든 텍스트를 쓰는 방식이고, `curses`는 Windows에서 터미널 크기를 잴 때만 import합니다(604~610행). TUI처럼 창을 관리하지 않고 정지할 때마다 새로 찍는 셈이라, 스크롤해 올라가면 이전 정지의 대시보드가 남아 있습니다.

### 명령

```text
(gdb) dashboard -layout source assembly stack registers variables
(gdb) help dashboard memory
(gdb) help dashboard expressions
```

`dashboard -layout`은 같은 파일 951행에 정의된 하위 명령입니다. 모듈별 옵션은 `help dashboard <모듈>`로 봅니다.

## gef / pwndbg / peda

세 도구 모두 보안·exploit 분석 쪽에서 출발한 GDB 확장입니다. 이 장에서는 실행하지 않았고, 각 README가 밝히는 성격은 다음과 같습니다. [GDB and LLDB Ch 10](/blog/tools/debugging/gdb-lldb/chapter10-tui-frontends)의 표와 같은 출처입니다.

| 도구 | README의 설명 |
|---|------|
| [GEF](https://github.com/hugsy/gef) | x86/64, ARM, MIPS, PowerPC, SPARC용 명령 모음. exploit 개발자와 리버스 엔지니어용이며 GDB 10.0 이상과 Python 3.10 이상 바인딩이 필요 |
| [pwndbg](https://github.com/pwndbg/pwndbg) | GDB와 LLDB 플러그인. GDB에는 Python 모듈로 로드되고 LLDB에는 REPL 인터페이스로 동작. LLDB 구현은 아직 초기 단계라고 명시. qemu-user 에뮬레이션은 GDB에서만 |
| [PEDA](https://github.com/longld/peda) | Linux/Unix exploit 개발용 Python GDB 스크립트. README의 버전 1.0은 Black Hat USA 2012 공개판이고 요구 사항이 GDB 7.x와 Python 2.6+ |

PEDA의 요구 사항(Python 2.6+)은 Python 3을 내장한 최근 GDB와 맞지 않습니다. Debian 13의 GDB 16.3은 Python 3.13.5를 내장합니다([Ch 1](/blog/tools/debugging/gdb-extension/chapter01-python-api-basics)).

### 명령은 확장마다 다름

GEF 2026.01 릴리스의 `gef.py`(11945줄)를 받아 등록된 명령을 세어 보니 `_cmdline_`이 102개였고, 그중에는 `context`, `vmmap`, `xinfo`, `pattern`, `checksec`, `hexdump`, `memory watch`, `heap`, `heap bins` 등이 있었습니다. 예를 들어 glibc bin 목록은 GEF에서 `heap bins`입니다. 다른 확장의 같은 기능은 이름과 인자가 다르므로 확장을 바꾸면 명령도 그 문서에서 다시 찾습니다. 여러 컨텍스트 확장을 한 세션에 동시에 source하면 둘 다 `stop` 이벤트에 출력을 붙이고 프롬프트를 바꾸려 하므로(gef.py 4140·11894행, dashboard `.gdbinit` 463·639행), 한 번에 하나만 씁니다.

## VSCode + cppdbg / CodeLLDB

`.vscode/launch.json`의 다섯 구성 예입니다. 키는 cpptools의 [launch.json 레퍼런스](https://code.visualstudio.com/docs/cpp/launch-json-reference)와 CodeLLDB 사용 설명서(MANUAL.md)에 있는 것만 썼습니다. 이 장에서 VS Code는 실행하지 않았습니다.

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

| 키 | 레퍼런스의 설명 |
|----|-----------------|
| `type` | GDB·LLDB면 `cppdbg` (Windows 디버거는 `cppvsdbg`) |
| `MIMode` | 연결할 디버거. `gdb` 또는 `lldb` |
| `setupCommands` | GDB 또는 LLDB를 준비하려고 실행할 명령의 JSON 배열 |
| `processId` | 기본값 `${command:pickProcess}`가 붙을 프로세스 목록을 띄움 |
| `miDebuggerServerAddress` | 원격 디버깅용 디버거 서버(예: gdbserver) 주소 |
| `coreDumpPath` | `launch` 구성에서 분석할 core dump 파일 경로 |

`setupCommands`의 `-enable-pretty-printing`은 [Ch 3](/blog/tools/debugging/gdb-extension/chapter03-pretty-printers)에서 본 MI 명령 그대로입니다. 이것이 없으면 변수 창의 `std::vector`가 `{...}`로 보입니다. `cppdbg`는 MI로 GDB/LLDB에 붙고(MIEngine), `type: "lldb"`인 CodeLLDB는 LLDB를 직접 씁니다. 두 경로의 차이는 [Ch 5](/blog/tools/debugging/gdb-extension/chapter05-mi-dap-protocol)의 어댑터 절에 있습니다.

### 단축키

VS Code Linux용 키보드 단축키 표(code.visualstudio.com/shortcuts/keyboard-shortcuts-linux.pdf)의 Debug 칸입니다.

| 키 | 동작 |
|------|------|
| `F5` | Start / Continue |
| `F10` | Step over |
| `F11` / `Shift+F11` | Step into / out |
| `F9` | Toggle breakpoint |
| `Shift+F5` | Stop |
| `Ctrl+K Ctrl+I` | Show hover |

재시작은 이 표에 없고, VS Code 디버깅 문서의 디버그 툴바 표에 `workbench.action.debug.restart` 명령으로 나옵니다.

### 조건부 BP / Logpoint

VS Code 디버깅 문서의 Conditional breakpoints 절에 따르면 breakpoint에는 세 가지 조건을 붙일 수 있습니다.

- **Expression** — 식이 참일 때 멈춥니다.
- **Hit count** — 정해진 횟수만큼 도달한 뒤 멈춥니다. 문서는 "지원 문법이 디버거마다 다르다"고 적습니다.
- **Wait for breakpoint** — 다른 breakpoint가 걸린 뒤에야 활성화됩니다(triggered breakpoint).

Logpoint는 같은 문서의 별도 절입니다. 멈추지 않고 Debug Console에 메시지를 쓰며, `{}` 안의 식이 치환되고, 디버거 확장이 구현했을 때만 쓸 수 있습니다.

Hit Count 문법이 디버거마다 다르다는 경고는 실제로 크게 갈립니다. [Ch 5](/blog/tools/debugging/gdb-extension/chapter05-mi-dap-protocol)에서 GDB의 내장 DAP는 hit 조건을 GDB의 ignore count로 해석해 `">= 5"`를 문법 오류로 거부했습니다.

### Watch / Variables

VS Code 디버깅 문서는 Run and Debug 뷰의 VARIABLES·WATCH·CALL STACK과 Debug Console을 설명합니다. 이 뷰는 [Ch 5](/blog/tools/debugging/gdb-extension/chapter05-mi-dap-protocol)의 `scopes` → `variables` 요청으로 채워지므로, 어떤 범위(인자·지역·레지스터)가 보일지는 어댑터가 정합니다. GDB 내장 DAP는 `Arguments`·`Locals`·`Registers` 세 범위를 보냈습니다.

### 한계

- stdin이 필요한 프로그램은 콘솔 설정을 봅니다. 레퍼런스에 따르면 `externalConsole`은 Linux에서 `true`면 외부 콘솔을, `false`면 VS Code의 통합 터미널을 쓰고, macOS의 `lldb-mi`는 통합 터미널을 지원하지 않습니다.
- `setupCommands`로 GDB 명령을 보낼 수 있으므로 `set follow-fork-mode` 같은 GDB 설정도 넣을 수 있습니다.

## Neovim — nvim-dap

[nvim-dap](https://github.com/mfussenegger/nvim-dap)은 Neovim용 DAP 클라이언트입니다. 도움말 `doc/dap.txt`의 `type = 'executable'` 형식에 lldb-dap을 넣은 설정입니다. 이 장에서 Neovim은 실행하지 않았습니다.

```lua
local dap = require('dap')
local lldb_dap = vim.fn.exepath('lldb-dap')
assert(lldb_dap ~= '', 'install lldb-dap or configure its absolute path')

dap.adapters.lldb = {
  type = 'executable',
  command = lldb_dap,
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

Debian 13의 `lldb` 패키지(1:19.0-63)를 설치해 보니 실행 파일은 `/usr/bin/lldb-dap-19`뿐이고 PATH에 `lldb-dap`이라는 이름은 없었습니다([GDB and LLDB Ch 10](/blog/tools/debugging/gdb-lldb/chapter10-tui-frontends)도 같은 이름을 씁니다). Debian에서는 위 설정의 `'lldb-dap'`을 `'lldb-dap-19'`로 바꿉니다. `dap.txt`의 `pick_process` 절은 이 함수를 프로세스 pid를 고르는 프롬프트라고 적습니다. [Ch 5](/blog/tools/debugging/gdb-extension/chapter05-mi-dap-protocol)의 `gdb -i=dap` 설정으로 바꿔 쓸 수도 있습니다.

위 설정의 키 출처는 이렇습니다. 어댑터의 `type`·`command`는 `dap.txt`의 `executable` 옵션이고, 구성의 `name`·`type`·`request`는 `dap.txt`의 필수 키, `${workspaceFolder}`는 `dap.txt`의 변수 목록에 있습니다. `program`·`cwd`·`stopOnEntry`(launch)와 `pid`(attach)는 lldb-dap README의 Configuration Settings Reference 표에 있는 키입니다.

[nvim-dap-ui](https://github.com/rcarriga/nvim-dap-ui) README는 nvim-dap의 listener에 `dapui.open()`·`dapui.close()`를 연결하는 다음 형태를 예로 듭니다.

```lua
local dapui = require('dapui')
dapui.setup()
dap.listeners.before.attach.dapui_config = function() dapui.open() end
dap.listeners.before.launch.dapui_config = function() dapui.open() end
dap.listeners.before.event_terminated.dapui_config = function() dapui.close() end
dap.listeners.before.event_exited.dapui_config = function() dapui.close() end
```

`dap.txt`의 MAPPINGS 절은 nvim-dap이 충돌을 피하려고 기본 키 매핑을 하나도 정하지 않는다고 적습니다. 아래는 VS Code의 F키 배치를 흉내 낸 매핑입니다. `dap.txt`의 매핑 예와 달리 step out을 `<F12>` 대신 `<S-F11>`에 두고, `<leader>B`에서 조건식을 입력받습니다.

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

`dap.set_breakpoint({condition}, {hit_condition}, {log_message})`의 첫 인자가 조건식입니다. `continue`·`step_over`·`step_into`·`step_out`·`toggle_breakpoint`·`repl.open`·`run_last`도 모두 `dap.txt`에 함수 항목이 있고, `dapui.toggle()`은 nvim-dap-ui README에 있습니다.

### 통합 — Telescope

[telescope-dap.nvim](https://github.com/nvim-telescope/telescope-dap.nvim) README의 설정과 명령입니다.

```lua
require('telescope').load_extension('dap')
```

```vim
:Telescope dap commands
:Telescope dap configurations
:Telescope dap list_breakpoints
:Telescope dap variables
:Telescope dap frames
```

breakpoint 목록은 `breakpoints`가 아니라 `list_breakpoints`입니다.

## Emacs — dap-mode

[dap-mode](https://github.com/emacs-lsp/dap-mode)의 Configuration 문서는 `dap-auto-configure-mode`와 어댑터별 모듈(`dap-gdb`, `dap-lldb`, `dap-cpptools` 등), 그리고 디버그 구성을 등록하는 `dap-register-debug-template`을 설명합니다. `dap-cpptools`가 등록하는 디버거 타입은 `cpptools`입니다. 이 장에서 Emacs는 실행하지 않았습니다.

```elisp
(dap-auto-configure-mode 1)
(require 'dap-cpptools)
(require 'dap-lldb)

(dap-register-debug-template
 "C++ Launch"
 (list :type "cpptools"
       :request "launch"
       :name "C++ Launch"
       :MIMode "gdb"
       :program (expand-file-name "~/src/my_prog/build/my_prog")))
```

`:type "cpptools"`는 `dap-cpptools` 절이 밝힌 디버거 타입이고, 같은 절은 나머지 설정 키를 cpptools의 launch.json 레퍼런스에서 찾으라고 적습니다. `:request`·`:MIMode`·`:program`이 그 레퍼런스의 키이고, `:name`과 `expand-file-name`은 문서의 Python 템플릿 예와 같은 형식입니다. 문서에 변수 치환 규칙이 없어서 `${workspaceFolder}` 대신 경로를 직접 씁니다.

같은 문서에 따르면 `dap-cpptools`는 `M-x dap-cpptools-setup`으로 cpptools 어댑터를 받아 설치하고, `dap-gdb`는 GDB의 내장 DAP(`gdb -i dap`)를 씁니다.

## Cortex-Debug — 임베디드 IDE

[Cortex-Debug](https://github.com/Marus/cortex-debug)는 ARM Cortex-M용 VS Code 확장입니다. README에 따르면 J-Link, OpenOCD GDB Server, ST-LINK GDB server, pyOCD, Black Magic Probe를 지원하고, GDB 서버를 띄운 뒤 GDB를 연결합니다. 이 장에서는 하드웨어를 붙이지 않았습니다.

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

위 JSON의 키는 모두 Cortex-Debug `package.json`의 `cortex-debug` 디버거 launch 스키마에 있습니다. `servertype`의 enum에 `jlink`, `interface`의 enum에 `swd`가 있고, `rttConfig.decoders` 항목의 `port`(0~15)·`type`(`console` 또는 `binary`)·`label`도 같은 스키마에 정의돼 있습니다. `type`·`request`·`name`은 VS Code `launch.json`의 공통 키입니다. `debug_attributes.md`의 속성 설명은 다음과 같습니다.

| 속성 | 설명 |
|------|------|
| `servertype` | GDB 서버 종류. `jlink`, `openocd`, `pyocd`, `pe`, `stlink`, `stutil`, `qemu`, `bmp`, `external` |
| `interface` | 연결 방식(기본 SWD). J-Link·ST-LINK·BMP 프로브에 쓰임 |
| `rtos` | J-Link면 Azure, ChibiOS, embOS, FreeRTOS, NuttX, Zephyr 또는 플러그인 경로. OpenOCD면 `auto`(권장), FreeRTOS, ThreadX 등 |
| `svdFile` | 별도 확장 `mcu-debug.peripheral-viewer`가 제공하는 XPERIPHERALS 창에 쓰임 |
| `rttConfig` | SEGGER RTT 설정. J-Link와 OpenOCD가 지원 |
| `liveWatch.enabled` | Live Watch 켜기. 이 속성 설명은 "OpenOCD에만 적용"이라고 적음 |

README가 꼽는 기능은 SVD 기반 Peripheral 뷰, OpenOCD·J-Link를 통한 RTT, CALL STACK 창의 RTOS 스레드 표시(J-Link, OpenOCD, pyOCD. 지원 RTOS는 GDB 서버에 달림), 지원 GDB 서버에서의 Live Watch(README는 OpenOCD, J-Link, STLink로 시험했다고 적음)입니다. README는 RTOS 스케줄러가 시작되기 전에 스텝 명령을 쓰면 GDB 서버가 크래시하거나 불안정해지는 경우가 많다고 경고하고, 칩 벤더가 자체 OpenOCD를 배포하면 그것만 쓰라고 권합니다.

## 데이터·메모리 시각화

터미널 GDB에서 메모리는 `x` 명령으로 보지만, 영상 버퍼처럼 *모양*이 의미인 데이터는 숫자로 봐서는 알 수 없습니다. VS Code에는 [Hex Editor](https://github.com/microsoft/vscode-hexeditor) 확장이 있고, GEF에는 `hexdump`·`memory watch` 명령이 있습니다. 직접 만들 수도 있습니다. 버퍼를 이미지 파일로 내보내 이미지 뷰어로 여는 것입니다.

### RGB 메모리를 PPM으로 내보내기

다음 명령은 `width`, `height`, `data`를 가진 구조체에서 **padding 없는 RGB8** 버퍼만 처리합니다. YUV·BGR·stride가 있는 영상에는 그대로 쓸 수 없습니다. 크기 상한을 두고, 기존 파일은 덮어쓰지 않도록 `"xb"` 모드로 엽니다.

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

`render()`의 19행에 멈춰 두 번 실행했습니다.

```text
(gdb) source view-rgb.py
(gdb) view_rgb *img /root/ext/ch06/out.ppm
(gdb) view_rgb *img /root/ext/ch06/out.ppm
[Errno 17] File exists: '/root/ext/ch06/out.ppm'
$ ls -l out.ppm; file out.ppm
-rw-r--r-- 1 root root 1549 Nov 16 10:13 out.ppm
out.ppm: Netpbm image data, size = 32 x 16, rawbits, pixmap
```

1549바이트는 헤더 `P6\n32 16\n255\n` 13바이트와 픽셀 32 × 16 × 3 = 1536바이트의 합입니다. 두 번째 실행은 같은 파일이 있어서 거부됐습니다. 이 명령이 확인하는 것은 *메모리를 읽을 수 있었다*는 것까지이고, 그 버퍼가 실제로 RGB8인지는 호출하는 사람이 압니다.

## Vimspector

[Vimspector](https://github.com/puremourning/vimspector)는 Vim과 Neovim용 DAP 클라이언트입니다. README가 밝히는 요구 사항은 Python 3.10 이상과 함께 Vim 8.2.4797 이상(huge 빌드) 또는 Neovim 0.8이고, Neovim은 마우스 hover 풍선을 지원하지 않는 등의 제약이 있습니다. 이 장에서는 실행하지 않았습니다.

프로젝트의 `.vimspector.json` 예입니다. README의 C·C++ 예와 같이 `vscode-cpptools` gadget을 씁니다(`:VimspectorInstall vscode-cpptools` 또는 `install_gadget.py --enable-c`로 설치).

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

키는 README의 C++ 예(`configurations` → 이름 → `adapter`·`configuration`, 그 안의 `request`·`program`·`cwd`·`MIMode`)에서 그대로 가져왔습니다. Vimspector는 자체 설정 형식을 씁니다. 위처럼 `configurations` 아래 이름마다 `adapter`와 `configuration`을 두고, 변수도 VS Code의 `${workspaceFolder}` 대신 README가 설명하는 `${workspaceRoot}`를 씁니다. `configuration` 안의 `MIMode` 같은 키는 cpptools 어댑터의 것이라 VS Code와 같습니다.

## DDD — Data Display Debugger

[GNU DDD](https://www.gnu.org/software/ddd/)는 GNU 프로젝트 페이지의 설명으로 GDB 같은 명령줄 디버거의 그래픽 프런트엔드이고, 자료구조를 그래프로 보여 주는 대화형 데이터 표시가 특징입니다. 같은 페이지는 현재 안정판을 3.4.1(2024-08-12 공개)로 적고, 최근 Debian은 최신 DDD 패키지를 싣지 않는다고 밝힙니다. 실제로 Debian 13의 `apt-cache policy ddd` 후보 버전은 `1:3.3.12-5.4+b2`였습니다. GUI라 이 장에서는 실행하지 않았습니다.

```bash
ddd ./my_prog
```

## 작업 환경별 확인 항목

| 상황 | 검토할 조합 | 이 장에서 본 근거 |
|------|------|------|
| 가벼운 한 번 디버깅 | GDB TUI (`C-x a`) | GDB 내장, `layout split`으로 소스·어셈블리 동시 표시 |
| 일상 — 터미널만 | cgdb 또는 gdb-dashboard | cgdb는 vi식 소스 창, dashboard는 정지마다 출력 |
| 일상 — IDE 같이 | VS Code + cppdbg/CodeLLDB | MI(cppdbg) 또는 LLDB 직접(CodeLLDB) |
| Vim 사용자 | nvim-dap + dapui (또는 Vimspector) | DAP 클라이언트, 어댑터는 따로 설치 |
| Emacs 사용자 | dap-mode | `dap-gdb`는 GDB 내장 DAP |
| CTF / exploit | pwndbg 또는 GEF | 해당 용도로 만든 도구 (README) |
| 임베디드 Cortex-M | VS Code + Cortex-Debug | SVD·RTT·RTOS 스레드 (README) |
| 자료구조 시각화 | DDD 또는 자체 Python 명령 | `view_rgb`처럼 파일로 내보내기 |
| 자동화 / 헤드리스 | `gdb -batch` + Python | [Ch 2](/blog/tools/debugging/gdb-extension/chapter02-commands-events)의 batch 절 |
| 원격 + 콘솔만 | cgdb 또는 TUI over SSH | 둘 다 터미널만으로 동작 |

위 표는 성능·안정성 순위가 아닙니다. 같은 실행 파일에서 breakpoint, 변수 확장, stdin, 원격 연결, 종료·재연결을 직접 해 보고 작업에 맞춰 고릅니다.

## 시리즈 정리

이 6장으로 GDB의 *확장성과 IDE 통합*을 다뤘습니다.

- **Ch 1** Python API 입문 — Value/Type/Frame.
- **Ch 2** 커스텀 명령 + 이벤트.
- **Ch 3** Pretty-printer 깊이.
- **Ch 4** FrameDecorator / Unwinder — JIT.
- **Ch 5** MI / DAP 프로토콜.
- **Ch 6** (이 장) 프런트엔드 비교.

내장 TUI, Python 대시보드, IDE가 모두 같은 GDB 위에 서 있고, 서로 다른 것은 GDB에 닿는 경로(같은 프로세스, 이벤트 훅, MI, DAP)입니다. CLI는 그 위의 사용자 인터페이스 하나입니다.

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

TUI와 cgdb 화면은 Debian 13 arm64 VM의 GDB 16.3과 cgdb 0.8.0에서 `tmux capture-pane`으로 떴고, `view_rgb`도 같은 VM에서 돌렸습니다. TUI 키·마우스는 GDB 16.3 tarball의 `gdb/doc/gdb.texinfo`(TUI Keys, TUI Mouse Support, TUI Commands 절), cgdb는 Debian 패키지의 `info cgdb`, gdb-dashboard는 커밋 `7b9b126`의 `.gdbinit`, GEF는 2026.01 릴리스의 `gef.py`를 읽어 확인했습니다. 실행하지 않은 도구는 각 README와 [cpptools launch.json 레퍼런스](https://code.visualstudio.com/docs/cpp/launch-json-reference), VS Code 디버깅 문서와 Linux 단축키 표, CodeLLDB MANUAL, [nvim-dap 문서](https://github.com/mfussenegger/nvim-dap/blob/master/doc/dap.txt), nvim-dap-ui·telescope-dap README, dap-mode Configuration 문서, [Vimspector README](https://github.com/puremourning/vimspector#configuration), [Cortex-Debug 속성](https://github.com/Marus/cortex-debug/blob/master/debug_attributes.md), GNU DDD 페이지를 근거로 적었습니다.
