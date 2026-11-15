---
title: "GDB MI와 DAP 프로토콜 — IDE 통합 인터페이스 분석"
slug: "tools/debugging/gdb-extension/chapter05-mi-dap-protocol"
date: 2026-05-27T09:05:00
description: "IDE ↔ 디버거 표준 — GDB/MI와 Debug Adapter Protocol의 정체."
tags: [gdb, mi, dap, ide, protocol]
series: "GDB Extension and IDE"
seriesOrder: 5
draft: false
topics: ["tools", "tools/debugging"]
---

VSCode·PyCharm·Neovim·Emacs가 모두 *같은 디버거*에 붙는 비결은 두 프로토콜에 있습니다. *MI* (GDB/MI — GDB Machine Interface)가 *GDB 측 표준*, *DAP* (Debug Adapter Protocol)가 *IDE 측 표준*. client와 adapter가 지원하는 capability·대상 runtime·실행 환경이 맞아야 연결할 수 있습니다. DAP adapter가 MI를 사용하는 것은 여러 구현 중 하나입니다.

이 장은 두 프로토콜의 정체와 그 사이 매개의 흐름을 다룹니다.

:::tldr
![Debug protocol stack — IDE ↔ DAP ↔ Adapter ↔ MI/RSP ↔ GDB/LLDB/debugpy](/images/blog/gdb-extension/diagrams/ch05-protocol-stack.svg)

DAP가 IDE 호환을 만들고, MI(또는 RSP)가 디버거 호환을 만듭니다.
:::

## GDB/MI — Machine Interface

CLI(`(gdb)` 프롬프트의 일반 명령)는 *사람용*. 출력이 자유로워 *기계 파싱이 어려움*. MI는 *기계용*: 구조화된 명령·응답.

### 활성화

```bash
$ gdb --interpreter=mi3 ./my_prog
=thread-group-added,id="i1"
=cmd-param-changed,param="pagination",value="off"
(gdb)
```

`(gdb)` 프롬프트가 보이지만 내부는 MI 모드. mi/mi2/mi3 interpreter와 버전별 출력 차이는 GDB manual 및 사용하는 adapter 요구에 맞춥니다. GDB17.2에서 MI3를 사용할 수 있다는 사실이 모든 client가 MI3를 요구한다는 뜻은 아닙니다.

### 명령 형식

```text
[token]-command [args]
```

- `token` — 옵션. 응답에서 같이 돌아와 *비동기 매핑*에 사용.
- `command` — MI 명령 (`-exec-run`, `-break-insert` 등).

```text
(gdb)
2-exec-run
2^running
*running,thread-id="all"
(gdb)
```

### 응답 종류

| Prefix | 의미 |
|--------|------|
| `^done,...` | 명령 성공 + 결과 |
| `^running` | 명령 시작 (비동기) |
| `^error,msg=...` | 오류 |
| `^exit` | GDB 종료 |
| `*stopped,...` | async stop event |
| `*running,...` | async start event |
| `=...` | 알림 (thread, library 로드 등) |
| `~"..."` | console 출력 (사용자 메시지) |
| `@"..."` | target 출력 (디버기 stdout) |
| `&"..."` | log 출력 |

`*stopped`/`*running`/`=...`이 *프로세스 측 이벤트*. IDE가 이를 받아 UI를 갱신.

### 자주 쓰이는 명령

```text
-exec-run                    : run
-exec-continue               : continue
-exec-interrupt              : 정지
-exec-step                   : step
-exec-next                   : next
-exec-finish                 : finish

-break-insert main           : break main
-break-insert -t main        : tbreak
-break-delete 1              : delete 1
-break-enable / -disable
-break-condition 1 i > 100

-stack-list-frames          : bt
-stack-list-arguments
-stack-list-variables
-stack-select-frame 2

-thread-list-ids
-thread-select 3
-thread-info

-data-evaluate-expression "x + 1"
-data-read-memory-bytes 0x401200 16
-data-write-memory-bytes 0x401200 ff

-var-create name * expression : watch 변수 생성
-var-update *                  : 모든 watch 갱신
-var-list-children name
-var-evaluate-expression name
-var-delete name

-file-exec-and-symbols ./prog
-target-attach 12345
-target-detach
```

전체 명세는 [GDB/MI 문서](https://sourceware.org/gdb/current/onlinedocs/gdb.html/GDB_002fMI.html). 이 글의 예는 record 형식 설명이며 실제 target transcript가 아닙니다.

### 응답 예 — backtrace

```text
3-stack-list-frames
3^done,stack=[
  frame={level="0",addr="0x000055555555581a",func="process",
         file="main.cpp",fullname="/home/me/main.cpp",line="42"},
  frame={level="1",addr="0x000055555555591b",func="handle",
         file="main.cpp",fullname="/home/me/main.cpp",line="60"},
  frame={level="2",addr="0x0000555555555a12",func="main",
         file="main.cpp",fullname="/home/me/main.cpp",line="10"}
]
```

IDE는 이 구조에서 *각 frame*을 추출해 콜스택 패널에 표시.

### 응답 — 변수 트리

```text
4-var-create v1 * vec
4^done,name="v1",numchild="3",value="std::vector of size 3",
       type="std::vector<int, std::allocator<int> >",
       has_more="0",displayhint="array"
```

`displayhint="array"`가 pretty-printer가 알려 준 정보. IDE는 트리 형태로.

사용자가 노드 펼치면.

```text
5-var-list-children v1
5^done,numchild="3",children=[
  child={name="v1.0",exp="[0]",numchild="0",value="1",type="int"},
  child={name="v1.1",exp="[1]",numchild="0",value="2",type="int"},
  child={name="v1.2",exp="[2]",numchild="0",value="3",type="int"}
]
```

지연 로드 패턴 — *펼친 노드만* 다시 요청.

### Asynchronous notifications

```text
*stopped,reason="breakpoint-hit",disp="keep",bkptno="1",
   thread-id="1",frame={addr="0x...",func="main",file="main.cpp",line="10"},
   stopped-threads="all",core="3"
```

정지 시 IDE에 *상세 정보* 전송. `reason`은 `breakpoint-hit`, `watchpoint-trigger`, `end-stepping-range`, `signal-received`, `exited`, `exited-signalled` 등.

## CLI ↔ MI 매핑

| CLI 명령 | MI 명령 |
|---------|---------|
| `run` | `-exec-run` |
| `continue` | `-exec-continue` |
| `break main` | `-break-insert main` |
| `info threads` | `-thread-info` |
| `bt` | `-stack-list-frames` |
| `print x` | `-data-evaluate-expression x` |
| `next` | `-exec-next` |

표는 대표 대응이며 state/argument/result·async handling은 별도입니다. CLI 출력 parse나 단순 1:1 문자열 치환만으로 올바른 adapter가 되지는 않습니다.

## DAP — Debug Adapter Protocol

MI가 *GDB 측*이라면 DAP는 *IDE 측*. Microsoft의 공개 DAP specification이 client/adapter 사이 request·response·event를 정의합니다.

핵심 아이디어: *IDE가 한 프로토콜만 알면 어떤 디버거도 쓸 수 있게*. 어댑터가 DAP ↔ 디버거 프로토콜(MI/RSP/자체)을 매개.

![IDE ↔ DAP ↔ Adapter ↔ Debugger ↔ Stub 체인](/images/blog/tools/diagrams/dap-ide-chain.svg)

### 전송

DAP는 JSON-RPC 2.0 wire format이 아닙니다. seq/type/command 또는 event/request_seq/success 등의 **DAP envelope**를 사용합니다. stdio/TCP 등의 byte stream에서 ASCII Content-Length header와 UTF-8 JSON body를 분리합니다. 길이는 문자 수가 아니라 **body byte 수**입니다.

```js title="dap-framing.mjs"
import {TextDecoder} from 'node:util';
const LIMIT = 1024 * 1024;
function validate(message) {
    if (!message || !Number.isSafeInteger(message.seq) || message.seq < 1 || message.seq > 2147483647)
        throw new TypeError('invalid seq');
    if (message.type === 'request') {
        if (typeof message.command !== 'string' || !message.command) throw new TypeError('command');
    } else if (message.type === 'response') {
        if (typeof message.command !== 'string' || !message.command ||
            !Number.isSafeInteger(message.request_seq) || message.request_seq < 1 || message.request_seq > 2147483647 ||
            typeof message.success !== 'boolean') throw new TypeError('response');
    } else if (message.type === 'event') {
        if (typeof message.event !== 'string' || !message.event) throw new TypeError('event');
    } else throw new TypeError('type');
    return message;
}
export function encodeDAP(message) {
    validate(message);
    const body = Buffer.from(JSON.stringify(message), 'utf8');
    if (body.length > LIMIT) throw new RangeError('body too large');
    return Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, 'ascii'), body]);
}
export class DAPFramer {
    constructor() { this.buffer = Buffer.alloc(0); this.failed = false; }
    push(chunk) {
        if (this.failed) throw new Error('discard failed framer');
        try {
            this.buffer = Buffer.concat([this.buffer, chunk]);
            const messages = [];
            for (;;) {
                const end = this.buffer.indexOf('\r\n\r\n');
                if (end < 0) {
                    if (this.buffer.length > 8192) throw new RangeError('header too large');
                    break;
                }
                if (end > 8192) throw new RangeError('header too large');
                const headerBytes = this.buffer.subarray(0, end);
                if (headerBytes.some(byte => byte > 127)) throw new TypeError('non-ASCII header');
                const header = headerBytes.toString('ascii');
                const match = /^Content-Length: ([0-9]+)$/.exec(header);
                if (!match) throw new TypeError('unsupported/duplicate header');
                const length = Number(match[1]);
                if (!Number.isSafeInteger(length) || length <= 0 || length > LIMIT)
                    throw new RangeError('invalid length');
                if (this.buffer.length < end + 4 + length) break;
                const body = this.buffer.subarray(end + 4, end + 4 + length);
                messages.push(validate(JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(body))));
                this.buffer = this.buffer.subarray(end + 4 + length);
            }
            return messages;
        } catch (error) { this.failed = true; this.buffer = Buffer.alloc(0); throw error; }
    }
    finish() { if (this.failed || this.buffer.length) throw new Error('failed/truncated stream'); }
}
```

이 예는 한 Content-Length header만 허용하는 bounded 기본 형식이며 full DAP schema/state machine은 아닙니다. transport read chunk 크기도 호출자가 제한해야 하며 connection 종료 시 finish로 잘린 body를 확인합니다. 본문에 제시한 119 같은 고정 길이를 임의 JSON에 복사하지 않고 encode 결과로 계산합니다.

### 메시지 종류

```text
request   : 클라이언트 → 어댑터, 응답 기대
response  : 어댑터 → 클라이언트, request에 대한 답
event     : 어댑터 → 클라이언트, 비동기 알림
```

이하 JSON block은 request/response body의 발췌입니다. comment·ellipsis는 설명용이며 실제 전송 시 seq/type·response correlation과 완전한 JSON을 구성합니다.

### 초기 핸드셰이크

```text
// 1. Initialize
{"seq": 1, "type": "request", "command": "initialize",
 "arguments": {"clientID": "vscode", "adapterID": "cppdbg",
               "linesStartAt1": true, "columnsStartAt1": true,
               "pathFormat": "path"}}

// 어댑터 응답
{"seq": 2, "type": "response", "request_seq": 1, "success": true,
 "command": "initialize",
 "body": {
   "supportsConfigurationDoneRequest": true,
   "supportsFunctionBreakpoints": true,
   "supportsConditionalBreakpoints": true,
   "supportsHitConditionalBreakpoints": true,
   "supportsEvaluateForHovers": true,
   "exceptionBreakpointFilters": [],
   "supportsStepBack": false,
   "supportsSetVariable": true,
   "supportsRestartFrame": false,
   "supportsGotoTargetsRequest": false,
   "supportsStepInTargetsRequest": false,
   "supportsCompletionsRequest": true,
   "supportsModulesRequest": true,
   ...
 }}

// 어댑터가 보내는 첫 이벤트
{"seq": 3, "type": "event", "event": "initialized"}
```

`supports*` 응답이 *그 어댑터가 무엇을 지원하는지*. VSCode가 UI를 적응 — 미지원 기능 버튼이 회색.

### Launch / Attach

```text
{"seq": 4, "type": "request", "command": "launch",
 "arguments": {
   "program": "/path/to/my_prog",
   "args": ["arg1", "arg2"],
   "cwd": "/home/me",
   "env": {"DEBUG": "1"},
   "stopOnEntry": false,
   "MIMode": "gdb",                       // cppdbg 특수
   "setupCommands": [
     {"text": "-enable-pretty-printing"}
   ]
 }}

// Attach
{"command": "attach",
 "arguments": {"processId": 12345}}
```

### 브레이크포인트 설정

```text
{"command": "setBreakpoints",
 "arguments": {
   "source": {"path": "/home/me/main.cpp"},
   "breakpoints": [
     {"line": 42, "condition": "i > 100", "hitCondition": ">= 5"},
     {"line": 60, "logMessage": "x = {x}"}     // logpoint
   ]
 }}

// 응답
{"command": "setBreakpoints",
 "body": {
   "breakpoints": [
     {"verified": true, "line": 42, "id": 1},
     {"verified": true, "line": 60, "id": 2}
   ]
 }}
```

logMessage는 DAP의 logpoint 요청입니다. 지원 capability와 expression escaping·target side effects/로그 비용은 adapter별로 다릅니다. 모든 adapter가 같은 GDB commands/printf로 변환하지 않습니다.

verified=false는 아직 검증/설정되지 않은 상태일 수 있으며 module load 뒤 breakpoint event로 바뀔 수도 있습니다. 영구 설치 실패와 즉시 동일시하지 않습니다.

### Function breakpoint

```text
{"command": "setFunctionBreakpoints",
 "arguments": {"breakpoints": [{"name": "main"}, {"name": "process"}]}}
```

### Data breakpoint (watchpoint)

```text
{"command": "setDataBreakpoints",
 "arguments": {"breakpoints": [
   {"dataId": "x@0x7fffffff", "accessType": "write"}
 ]}}
```

### Stack trace

```text
{"command": "stackTrace",
 "arguments": {"threadId": 1, "startFrame": 0, "levels": 20}}

// 응답
{"body": {
   "stackFrames": [
     {"id": 1000, "name": "process(args)", "line": 42,
      "column": 1, "source": {"path": "/home/me/main.cpp"},
      "instructionPointerReference": "0x401234"},
     ...
   ],
   "totalFrames": 3
}}
```

### Variables — 트리

```text
// 1. 프레임의 스코프
{"command": "scopes", "arguments": {"frameId": 1000}}

// 응답
{"body": {"scopes": [
  {"name": "Locals", "variablesReference": 1001, "expensive": false},
  {"name": "Arguments", "variablesReference": 1002, "expensive": false},
  {"name": "Registers", "variablesReference": 1003, "expensive": true}
]}}

// 2. 스코프 안의 변수
{"command": "variables", "arguments": {"variablesReference": 1001}}

// 응답
{"body": {"variables": [
  {"name": "i", "value": "42", "type": "int", "variablesReference": 0},
  {"name": "v", "value": "std::vector of size 3", "type": "std::vector<int>",
   "variablesReference": 2001, "namedVariables": 0, "indexedVariables": 3}
]}}

// 3. 사용자가 v를 펼치면
{"command": "variables", "arguments": {"variablesReference": 2001}}
{"body": {"variables": [
  {"name": "[0]", "value": "1", "type": "int", "variablesReference": 0},
  {"name": "[1]", "value": "2", "type": "int", "variablesReference": 0},
  {"name": "[2]", "value": "3", "type": "int", "variablesReference": 0}
]}}
```

*재귀적 variables 요청*이 VSCode의 변수 트리를 *지연 로드*로 그리는 메커니즘.

display hint는 모양 힌트입니다. indexedVariables=3이라는 원소 수가 hint 문자열만으로 계산되지는 않습니다. adapter가 실제 child count/varobj와 target 정보를 매개하며 reference 수명·paging도 관리합니다.

### Evaluate

```text
{"command": "evaluate",
 "arguments": {"expression": "x + 1", "frameId": 1000, "context": "watch"}}

// 응답
{"body": {"result": "43", "type": "int", "variablesReference": 0}}
```

`context`: `"watch"` (Watch 패널), `"repl"` (Debug Console), `"hover"` (마우스 호버), `"clipboard"`.

### 진행 명령

```text
{"command": "continue", "arguments": {"threadId": 1}}
{"command": "next", "arguments": {"threadId": 1}}
{"command": "stepIn", "arguments": {"threadId": 1, "targetId": 0}}
{"command": "stepOut", "arguments": {"threadId": 1}}
{"command": "pause", "arguments": {"threadId": 1}}
```

threadId와 singleThread 지원·all-stop/non-stop, response/event의 allThreadsContinued 등을 함께 해석합니다. threadId가 있다는 사실만으로 다른 thread가 항상 정지한 채 남는 것은 아닙니다.

### 이벤트

```text
// 정지
{"type": "event", "event": "stopped",
 "body": {"reason": "breakpoint", "threadId": 1, "allThreadsStopped": true,
          "hitBreakpointIds": [1]}}

// 진행
{"type": "event", "event": "continued",
 "body": {"threadId": 1, "allThreadsContinued": true}}

// 출력
{"type": "event", "event": "output",
 "body": {"category": "stdout", "output": "Hello\n"}}

// 스레드 변경
{"type": "event", "event": "thread",
 "body": {"reason": "started", "threadId": 5}}

// 종료
{"type": "event", "event": "terminated"}
{"type": "event", "event": "exited", "body": {"exitCode": 0}}
```

`reason`: `step`, `breakpoint`, `exception`, `pause`, `entry`, `goto`, `function breakpoint`, `data breakpoint`, `instruction breakpoint`.

## Adapter — DAP ↔ MI 매개

VSCode의 *cppdbg* 어댑터가 어떻게 동작하는가.

cppdbg는 DAP request를 MIEngine/GDB 상태에 맞춰 매개할 수 있습니다. launch 초기화·symbol·breakpoint 설정과 실행 순서는 adapter/config별입니다. stackTrace/evaluate를 대응 MI request로 바꿀 때 thread/frame 선택, error와 async stop·request token·reference lifetime도 관리해야 합니다.

### CodeLLDB는 다름

`CodeLLDB` 어댑터는 *직접 LLDB SB API*를 호출. MI를 거치지 않음. 직접 SB API를 쓴다는 구조만으로 속도·안정성 우열을 단정하지 않습니다. target/toolchain·symbol format과 adapter release별로 검증합니다.

```text
VSCode  ─DAP─>  CodeLLDB adapter  ─SB API─>  lldb
```

### debugpy (Python)

Python의 `debugpy`도 DAP 어댑터 + Python 디버거 내장.

```text
VSCode  ─DAP─>  debugpy  ─PyFrame inspection─>  사용자 Python 코드
```

거의 모든 언어가 *자체 DAP 어댑터*를 제공: Go (`delve --dap`), Rust (CodeLLDB 같은 debug adapter; rust-analyzer는 주로 language server), C# (`netcoredbg`), Java (`java-debug`), ...

## 직접 DAP 사용 — Neovim

`nvim-dap`은 DAP 클라이언트. VSCode 설정과 거의 같은 *configuration*.

```lua
local dap = require('dap')

dap.adapters.cppdbg = {
  id = 'cppdbg',
  type = 'executable',
  command = '/usr/bin/OpenDebugAD7',
}

dap.configurations.cpp = {
  {
    name = "Launch",
    type = "cppdbg",
    request = "launch",
    program = function()
      return vim.fn.input('Path to executable: ', vim.fn.getcwd() .. '/', 'file')
    end,
    cwd = '${workspaceFolder}',
    stopAtEntry = false,
    MIMode = 'gdb',
  },
}
```

Lua로 `launch.json` 동치를 정의. 같은 adapter를 재사용해도 client가 구현한 capability/UI·configuration 차이와 extension version을 확인합니다.

## Emacs — dap-mode

```elisp
(use-package dap-mode
  :after lsp-mode
  :config
  (dap-auto-configure-mode)
  (require 'dap-cpptools)
  (require 'dap-lldb))
```

DAP 클라이언트 + UI. `dap-cpptools`/`dap-lldb` 모듈이 어댑터 등록.

## DAP 어댑터 만들기

adapter는 framing뿐 아니라 initialize/capability, launch/attach와 configurationDone 순서, breakpoint lifecycle·request cancellation/errors, stop/continue와 thread/frame/variable reference 수명을 구현해야 합니다. stdio stdout에는 protocol 외 log를 섞지 않고 diagnostics는 별도 채널로 보냅니다.

@vscode/debugadapter 같은 공식 library를 사용할 수 있지만 package/version을 고정해야 합니다. 미정의 startDebugger·ellipsis import가 든 TypeScript 조각은 실행 가능한 adapter로 제시하지 않습니다. 새 adapter를 만들었다고 모든 DAP client가 모든 기능을 즉시 지원하는 것도 아닙니다.

## MI vs DAP 한 표

| | MI | DAP |
|---|-----|-----|
| 위치 | GDB 측 | IDE 측 |
| 형식 | MI record grammar | DAP JSON envelope + byte framing |
| scope | GDB interpreter version | DAP specification/capability |
| Async | `*notification` | event |
| 변수 트리 | `-var-*` 명령 | variables 재귀 |
| 표준 | GDB가 정의 | MS가 정의 |
| 구현 디버거 | GDB, LLDB(부분) | GDB(via cppdbg), LLDB(via lldb-dap), debugpy, delve, ... |

## 정리

- MI = GDB의 *기계용* 인터페이스. 거의 모든 명령에 `-cmd` 형식.
- DAP = IDE ↔ 디버거 protocol (DAP envelope).
- IDE 어댑터가 DAP ↔ MI (또는 SB API, 자체 프로토콜) 매개.
- 변수 트리는 *재귀적 variables 요청*으로 지연 로드.
- `displayhint = "array"` 같은 pretty-printer 메타가 IDE 트리 모양 결정.
- cppdbg = GDB/LLDB via MI. CodeLLDB = LLDB via SB. debugpy = Python 내장.
- Neovim·Emacs도 *같은 DAP 어댑터*로 동일 경험.
- 새 언어 디버거는 *자체 DAP 어댑터*로 client capability와 구현에 맞춰 통합.

## 다음 장 예고

Ch 6 (마지막) — 프런트엔드 비교. TUI / cgdb / dashboard / gef / VSCode / nvim-dap / Cortex-Debug.

## 관련 항목

- [Ch 4: FrameDecorator / Unwinder](/blog/tools/debugging/gdb-extension/chapter04-frame-unwinder)
- [Ch 6: 프런트엔드](/blog/tools/debugging/gdb-extension/chapter06-frontends)
- [GDB/MI 공식 문서](https://sourceware.org/gdb/current/onlinedocs/gdb.html/GDB_002fMI.html)
- [Debug Adapter Protocol 명세](https://microsoft.github.io/debug-adapter-protocol/)
- [DAP overview & implementations](https://microsoft.github.io/debug-adapter-protocol/implementors/adapters/)

## 검증 기준

GDB17.2 source/manual의 MI record·varobj와 [DAP 공식 overview](https://microsoft.github.io/debug-adapter-protocol/overview)·[protocol schema](https://github.com/microsoft/debug-adapter-protocol/blob/main/debugAdapterProtocol.json)를 대조합니다. framing helper의 split/coalesced·UTF-8·invalid/truncated 검사는 실제 adapter/IDE launch 검증과 구분합니다.
