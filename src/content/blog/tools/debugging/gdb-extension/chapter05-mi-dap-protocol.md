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

VS Code·Neovim·Emacs가 같은 GDB에 붙을 수 있는 것은 두 프로토콜 덕입니다. *MI*(GDB/MI, GDB Machine Interface)는 GDB가 정의한 *기계용 명령·응답 형식*이고, *DAP*(Debug Adapter Protocol)는 Microsoft가 공개한 *편집기 ↔ 디버그 어댑터* 규약입니다. 국제 우편에 비유하면 DAP는 모든 나라가 받아 주는 국제 우편 양식이고, MI는 GDB라는 한 우체국의 내부 양식입니다. 어댑터가 그 사이에서 양식을 옮겨 적습니다.

이 장은 두 프로토콜을 실제 트래픽으로 봅니다. MI는 `gdb --interpreter=mi3`에, DAP는 GDB 16.3에 내장된 DAP 서버(`gdb -i=dap`)에 직접 메시지를 보내 받은 응답을 그대로 실었습니다. 모두 Debian 13 arm64 VM의 GDB 16.3(Debian 16.3-1)에서 돌렸습니다.

:::tldr
![Debug protocol stack — IDE ↔ DAP ↔ Adapter ↔ MI/RSP ↔ GDB/LLDB/debugpy](/images/blog/gdb-extension/diagrams/ch05-protocol-stack.svg)

DAP가 편집기 쪽 호환을 만들고, MI(또는 디버거 고유 API)가 디버거 쪽 호환을 만듭니다. GDB 16.3은 `-i=dap`으로 그 자신이 DAP 어댑터가 됩니다.
:::

실습 프로그램 `vecprog.cpp`는 `main()`이 `handle(i)`를 세 번(i = 0, 1, 2) 부르고, `handle()`이 `std::vector<int> vec = {1, 2, 3}`을 만들어 `process(vec, i)`를 부릅니다. `process()`의 7행이 `printf`입니다.

```cpp title="vecprog.cpp (발췌)"
int process(const std::vector<int> &vec, int i) {
    int x = vec[0] + i;
    std::printf("x=%d\n", x);       // 7행
    return x;
}
int handle(int i) {
    std::vector<int> vec = {1, 2, 3};
    return process(vec, i);           // 12행
}
```

## GDB/MI — Machine Interface

CLI(`(gdb)` 프롬프트의 일반 명령)는 사람용입니다. `info breakpoints`의 열 배치는 버전마다 바뀔 수 있고 파싱 규칙이 정해져 있지 않습니다. MI는 기계용이라 모든 응답이 정해진 문법(GDB 16.3 매뉴얼 GDB/MI Output Syntax 절)을 따릅니다.

### 활성화

GDB 16.3 매뉴얼 Command Interpreters 장에 따르면 `mi`는 가장 새 MI(현재 `mi3`)이고, `mi3`는 GDB 9.1에서, `mi2`는 GDB 6.0에서 도입됐습니다. `gdb -q -nx --interpreter=mi3 ./vecprog`을 띄우면 처음 나오는 줄입니다.

```text
=thread-group-added,id="i1"
~"Reading symbols from ./vecprog...\n"
(gdb)
```

`(gdb)` 프롬프트처럼 보이는 줄은 MI 문법에서 "응답 하나가 끝났다"는 구분자입니다.

### 명령 형식

```text
[token]-command [args]
```

`token`은 선택 사항인 숫자입니다. 응답 앞에 같은 숫자가 붙어 돌아오므로, 클라이언트는 여러 명령을 보내 놓고 응답을 짝지을 수 있습니다. 아래 세션의 `1^done`, `2^running`이 그 예입니다.

```text
1-break-insert vecprog.cpp:7
1^done,bkpt={number="1",type="breakpoint",disp="keep",enabled="y",addr="0x0000000000000b54",func="process(std::vector<int, std::allocator<int> > const&, int)",file="vecprog.cpp",fullname="/root/ext/ch05/vecprog.cpp",line="7",thread-groups=["i1"],times="0",original-location="vecprog.cpp:7"}
(gdb)
2-exec-run
=thread-group-started,id="i1",pid="4686"
=thread-created,id="1",group-id="i1"
=library-loaded,id="/lib/ld-linux-aarch64.so.1",...
2^running
*running,thread-id="all"
(gdb)
```

### 응답 종류

매뉴얼 GDB/MI Result Records·Stream Records·Async Records 절의 구분입니다.

| Prefix | 의미 |
|--------|------|
| `^done,...` | 명령 성공 + 결과 |
| `^running` | 매뉴얼상 `^done`과 같음 (실행을 시작한 명령의 응답) |
| `^connected` | 원격 타깃 연결 |
| `^error,msg=...` | 오류 |
| `^exit` | GDB 종료 |
| `*stopped,...` / `*running,...` | 실행 상태 비동기 레코드 |
| `=...` | 알림 비동기 레코드 (스레드, 라이브러리 로드, breakpoint 변경 등) |
| `~"..."` | console 출력 (CLI가 보여 줄 텍스트) |
| `@"..."` | target 출력 (디버기 출력) |
| `&"..."` | log 출력 (GDB 내부 메시지) |

`@` 레코드는 매뉴얼에 따르면 GDB의 이벤트 루프가 진짜 비동기일 때, 현재는 원격 타깃일 때만 나옵니다. 위 로컬 세션에서는 디버기의 `x=1` 같은 출력이 `@` 레코드가 아니라 GDB와 같은 stdout으로 그냥 섞여 나왔습니다.

### 자주 쓰이는 명령

아래 명령은 모두 GDB 16.3 매뉴얼에 `The -command Command` 절이 있는 것들입니다.

| 분류 | MI 명령 |
|------|---------|
| 실행 | `-exec-run`, `-exec-continue`, `-exec-interrupt`, `-exec-step`, `-exec-next`, `-exec-finish` |
| breakpoint | `-break-insert main`, `-break-insert -t main`(임시), `-break-delete 1`, `-break-enable`, `-break-disable`, `-break-condition 1 i > 100` |
| 스택 | `-stack-list-frames`, `-stack-list-arguments`, `-stack-list-variables`, `-stack-select-frame 2` |
| 스레드 | `-thread-list-ids`, `-thread-select 3`, `-thread-info` |
| 데이터 | `-data-evaluate-expression "x + 1"`, `-data-read-memory-bytes ADDR N`, `-data-write-memory-bytes ADDR HEX` |
| 변수 객체 | `-var-create`, `-var-update`, `-var-list-children`, `-var-evaluate-expression`, `-var-delete` |
| 파일·타깃 | `-file-exec-and-symbols ./prog`, `-target-attach PID`, `-target-detach` |

전체 명세는 [GDB/MI 문서](https://sourceware.org/gdb/current/onlinedocs/gdb.html/GDB_002fMI.html)에 있습니다.

### 응답 예 — 정지와 backtrace

`2-exec-run` 뒤 7행 breakpoint에 걸리면 `*stopped` 비동기 레코드가 옵니다. IDE는 이 레코드 하나로 "어디서, 왜, 어느 스레드가 멈췄나"를 압니다.

```text
*stopped,reason="breakpoint-hit",disp="keep",bkptno="1",frame={addr="0x0000aaaaaaaa0b54",func="process",args=[{name="vec",value="std::vector of length 3, capacity 3 = {...}"},{name="i",value="0"}],file="vecprog.cpp",fullname="/root/ext/ch05/vecprog.cpp",line="7",arch="aarch64"},thread-id="1",stopped-threads="all",core="0"
(gdb)
3-stack-list-frames
3^done,stack=[frame={level="0",addr="0x0000aaaaaaaa0b54",func="process",file="vecprog.cpp",fullname="/root/ext/ch05/vecprog.cpp",line="7",arch="aarch64"},frame={level="1",addr="0x0000aaaaaaaa0bcc",func="handle",file="vecprog.cpp",fullname="/root/ext/ch05/vecprog.cpp",line="12",arch="aarch64"},frame={level="2",addr="0x0000aaaaaaaa0c38",func="main",file="vecprog.cpp",fullname="/root/ext/ch05/vecprog.cpp",line="17",arch="aarch64"}]
```

IDE는 `stack=[...]`의 각 `frame`을 콜스택 패널의 한 줄로 그립니다.

### 응답 — 변수 트리

`-enable-pretty-printing`을 먼저 보낸 세션입니다. [Ch 3](/blog/tools/debugging/gdb-extension/chapter03-pretty-printers)에서 본 대로 printer가 붙은 varobj는 `dynamic="1"`이고 자식 수는 `has_more`로만 알립니다.

```text
4-var-create v1 * vec
4^done,name="v1",numchild="0",value="std::vector of length 3, capacity 3",type="const std::vector<int, std::allocator<int> > &",thread-id="1",displayhint="array",dynamic="1",has_more="1"
5-var-list-children --all-values v1
5^done,numchild="3",displayhint="array",children=[child={name="v1.[0]",exp="[0]",numchild="0",value="1",type="int",thread-id="1"},child={name="v1.[1]",exp="[1]",numchild="0",value="2",type="int",thread-id="1"},child={name="v1.[2]",exp="[2]",numchild="0",value="3",type="int",thread-id="1"}],has_more="0"
```

`displayhint="array"`는 libstdc++ printer의 `display_hint()`가 돌려준 값입니다. 사용자가 트리 노드를 펼칠 때 IDE가 `-var-list-children`을 보내므로, 펼치지 않은 노드의 자식은 읽지 않습니다.

### 데이터·조건·오류

같은 세션의 나머지 명령입니다. `x`는 `vec[0] + 0 = 1`입니다.

```text
6-data-evaluate-expression "x + 1"
6^done,value="2"
7-data-read-memory-bytes &x 4
7^done,memory=[{begin="0x0000fffffffffa0c",offset="0x0000000000000000",end="0x0000fffffffffa10",contents="01000000"}]
9-break-condition 1 i == 2
9^done
10-exec-continue
10^running
*running,thread-id="all"
=breakpoint-modified,bkpt={number="1",...,cond="i == 2",times="2",...}
*stopped,reason="breakpoint-hit",disp="keep",bkptno="1",frame={...,args=[{name="vec",value="std::vector of length 3, capacity 3 = {...}"},{name="i",value="2"}],...},thread-id="1",stopped-threads="all",core="0"
11-stack-list-variables --all-values
11^done,variables=[{name="vec",arg="1",value="std::vector of length 3, capacity 3 = {1, 2, 3}"},{name="i",arg="1",value="2"},{name="x",value="3"}]
13-data-evaluate-expression nosuchvar
13^error,msg="No symbol \"nosuchvar\" in current context."
```

`-data-read-memory-bytes`의 `contents="01000000"`은 리틀 엔디언 `int` 1입니다. 조건을 단 뒤에는 `i == 2`인 세 번째 호출에서만 멈췄습니다. 프로그램이 끝나면 `*stopped,reason="exited-normally"`와 `=thread-group-exited,id="i1",exit-code="0"`이 왔습니다.

### Asynchronous notifications

`*stopped`의 `reason`은 IDE가 "왜 멈췄나"를 표시하는 근거입니다. 이 장에서 본 값은 `breakpoint-hit`와 `exited-normally`이고, 매뉴얼 GDB/MI Async Records 절은 이 밖에 `watchpoint-trigger`, `end-stepping-range`, `signal-received`, `exited-signalled`, `exited` 등을 정의합니다.

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

이름만 바뀐 것이 아닙니다. 같은 breakpoint 정보가 CLI에서는 사람이 읽을 표로, MI에서는 `bkpt={number="1",...}` 튜플로 나옵니다. 어댑터가 CLI 출력을 문자열로 파싱하지 않고 MI를 쓰는 이유입니다.

## DAP — Debug Adapter Protocol

MI가 GDB 쪽 규약이라면 DAP는 편집기 쪽 규약입니다. [DAP 명세](https://microsoft.github.io/debug-adapter-protocol/)가 클라이언트(편집기)와 어댑터 사이의 request·response·event를 정의하고, 편집기는 이 하나만 구현하면 됩니다. 어댑터가 DAP를 디버거 쪽 프로토콜(MI, LLDB API, 자체 구현)로 옮깁니다.

![IDE ↔ DAP ↔ Adapter ↔ Debugger ↔ Stub 체인](/images/blog/tools/diagrams/dap-ide-chain.svg)

### 전송

DAP 개요 문서의 Base Protocol 절에 따르면 메시지는 ASCII 헤더와 `\r\n\r\n`, 그리고 UTF-8 JSON 본문으로 이뤄지고, 유일한 필수 헤더 `Content-Length`는 본문의 *바이트* 수입니다. JSON-RPC가 아니라 `seq`/`type`(`request`/`response`/`event`)/`command` 등을 가진 DAP 자체 봉투(`ProtocolMessage`)를 씁니다.

아래 `dap-framing.mjs`는 헤더 하나만 허용하는 최소 framer입니다. 헤더·본문 크기에 상한을 두고, 잘못된 입력을 한 번 만나면 그 framer를 폐기합니다.

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

Node.js 24.21.0에서 시험했습니다. 한 바이트씩 쪼개 넣은 경우, 두 메시지를 한 덩어리로 넣은 경우, 잘린 스트림, 잘못된 헤더, 잘못된 UTF-8을 넣었습니다.

```text
header: "Content-Length: 98\r\n\r\n" total bytes: 120
UTF-8 body: JSON chars 64 -> header Content-Length: 68
byte-by-byte: 1 message(s), command = evaluate
coalesced: [ 1, 2 ]
truncated: failed/truncated stream
bad header: unsupported/duplicate header
after failure: discard failed framer
invalid utf-8: TypeError The encoded data was not valid for encoding utf-8
```

둘째 줄이 바이트 수 규칙입니다. `"한글"`이 든 JSON은 문자로 64개지만 한글 두 글자가 UTF-8로 3바이트씩이라 `Content-Length`는 68입니다. 문자열 길이로 헤더를 만들면 비ASCII 출력이 섞이는 순간 스트림이 어긋납니다. DAP 개요 문서의 예제에 나오는 `Content-Length: 119`도 그 예제 본문에만 맞는 값입니다.

### 메시지 종류

| `type` | 방향 | 뜻 |
|--------|------|-----|
| `request` | 클라이언트 → 어댑터 | 응답을 기대하는 요청 |
| `response` | 어댑터 → 클라이언트 | `request_seq`로 요청과 짝지어지는 답 |
| `event` | 어댑터 → 클라이언트 | 비동기 알림 |

이하의 트래픽은 직접 짠 83줄짜리 Python 클라이언트(`dapc.py`)를 `gdb -q -nx -i=dap`에 붙여 얻었습니다. `>>>`가 보낸 메시지, `<<<`가 받은 메시지이고, 긴 줄은 `...`로 줄였습니다.

### 초기 핸드셰이크

```text
>>> Content-Length: 179 {"seq": 1, "type": "request", "command": "initialize", "arguments": {"clientID": "demo", "adapterID": "gdb", "linesStartAt1": true, "columnsStartAt1": true, "pathFormat": "path"}}
<<< Content-Length: 1406 {"request_seq": 1, "type": "response", "command": "initialize", "success": true, "body": {"supportsTerminateRequest": true, "supportTerminateDebuggee": true, "supportsCancelRequest": true, "supportsLoadedSourcesRequest": true, "supportsLogPoints": true, "supportsConditionalBreakpoints": true, "supportsHitConditionalBreakpoints": true, "supportsFunctionBreakpoints": true, "supportsInstructionBreakpoints": true, "exceptionBreakpointFilters": [{"filter": "assert", "label": "Ada assertions", ...}, {"filter": "exception", "label": "Ada exceptions", ...}, {"filter": "throw", "label": "C++ exceptions, when thrown", ...}, {"filter": "rethrow", ...}, {"filter": "catch", ...}], "supportsExceptionFilterOptions": true, "supportsModulesRequest": true, "supportsDelayedStackTraceLoading": true, "supportsDisassembleRequest": true, "supportsValueFormattingOptions": true, "supportsEvaluateForHovers": true, "supportsSetExpression": true, "supportsSetVariable": true, "supportsConfigurationDoneRequest": true, "supportsBreakpointLocationsRequest": true, "supportsReadMemoryRequest": true, "supportsWriteMemoryRequest": true, "supportsSingleThreadExecutionRequests": true, "supportsSteppingGranularity": true}, "seq": 1}
>>> Content-Length: 102 {"seq": 2, "type": "request", "command": "launch", "arguments": {"program": "/root/ext/ch05/vecprog"}}
<<< Content-Length: 51 {"type": "event", "event": "initialized", "seq": 2}
```

`supports*`가 그 어댑터가 할 수 있는 일의 목록입니다. 편집기는 이 응답을 보고 UI를 맞춥니다. GDB 16.3의 목록에는 `supportsDataBreakpoints`가 없습니다. DAP 스키마에는 있는 capability이지만 GDB의 DAP 구현(`gdb/python/lib/gdb/dap/`)에는 그 요청 처리기가 없기 때문입니다. 실제로 `setDataBreakpoints`를 보내면 이렇게 실패합니다.

```text
>>> {"seq": 6, "type": "request", "command": "setDataBreakpoints", "arguments": {"breakpoints": [{"dataId": "x", "accessType": "write"}]}}
<<< {"request_seq": 6, "type": "response", "command": "setDataBreakpoints", "success": false, "message": "'setDataBreakpoints'", "seq": 14}
```

### Launch / Attach

`launch`·`attach`의 인자는 DAP 명세가 정하지 않고 어댑터마다 다릅니다. GDB 16.3 매뉴얼 Debugger Adapter Protocol 장이 GDB의 `launch` 인자로 정한 것은 `args`, `cwd`, `env`(객체), `program`, `stopAtBeginningOfMainSubprogram`, `stopOnEntry`이고, `attach`는 `pid`, `program`, `target`(`target remote`에 넘길 문자열)입니다.

같은 이름의 설정도 어댑터마다 다릅니다. VS Code의 `cppdbg`는 [launch.json 레퍼런스](https://code.visualstudio.com/docs/cpp/launch-json-reference)에 따르면 진입점 정지를 `stopAtEntry`로, 환경 변수를 `"environment": [{"name": "config", "value": "Debug"}]` 같은 배열로 받고, `MIMode`(`gdb` 또는 `lldb`)·`setupCommands`·`miDebuggerServerAddress` 같은 고유 키를 씁니다. 편집기 설정을 다른 어댑터로 옮길 때 키 이름부터 맞춰야 하는 이유입니다.

GDB의 `launch`는 응답이 바로 오지 않았습니다. 위 로그에서 `launch`(seq 2)의 응답은 `configurationDone`을 보내고 실행 파일을 읽은 뒤인 `"seq": 20`에 왔습니다.

### 브레이크포인트 설정

7행에 조건과 hit 조건을, 12행에 logpoint를 걸었습니다.

```text
>>> Content-Length: 240 {"seq": 3, "type": "request", "command": "setBreakpoints", "arguments": {"source": {"path": "/root/ext/ch05/vecprog.cpp"}, "breakpoints": [{"line": 7, "condition": "i > 0", "hitCondition": "1"}, {"line": 12, "logMessage": "handle i={i}"}]}}
<<< {"type": "event", "event": "output", "body": {"category": "stdout", "output": "Breakpoint 1 (-source /root/ext/ch05/vecprog.cpp -line 7) pending.\n"}, ...}
<<< {"request_seq": 3, "type": "response", "command": "setBreakpoints", "success": true, "body": {"breakpoints": [{"id": 1, "verified": false, "reason": "pending"}, {"id": 2, "verified": false, "reason": "pending"}]}, ...}
...
<<< {"type": "event", "event": "breakpoint", "body": {"reason": "changed", "breakpoint": {"id": 1, "verified": true, "source": {"name": "vecprog.cpp", "path": "/root/ext/ch05/vecprog.cpp"}, "line": 7, "instructionReference": "0xb54"}}, ...}
```

`launch` 응답보다 먼저 보낸 요청이라 아직 실행 파일이 읽히지 않았고, GDB는 `verified: false, reason: "pending"`으로 답했다가 실행 파일을 읽은 뒤 `breakpoint` 이벤트로 `verified: true`를 보냈습니다. DAP 스키마는 `verified`를 "breakpoint를 설정할 수 있었는가"로 정의하므로, `false`가 곧 영구 실패를 뜻하지는 않습니다.

`hitCondition`은 해석이 어댑터에 맡겨져 있습니다. DAP 스키마는 "breakpoint의 hit 중 몇 번을 무시할지 정하는 식이며 어댑터가 알아서 해석한다"고만 적습니다. GDB 16.3의 `dap/breakpoint.py` 186~188행은 이 문자열을 `parse_and_eval`로 계산해 GDB의 *ignore count*에 넣습니다. 그래서 `"1"`은 "조건이 참인 hit를 한 번 건너뛴다"입니다. 실제로 `i > 0`인 i = 1을 건너뛰고 i = 2에서 멈췄습니다. 처음에 `"2"`를 줬을 때는 i = 1, 2를 모두 건너뛰어 한 번도 멈추지 않았습니다. VS Code의 Hit Count 칸에 흔히 쓰는 `>= 5` 같은 식은 GDB에서 문법 오류입니다.

```text
>>> {"seq": 4, "type": "request", "command": "setBreakpoints", "arguments": {"source": {"path": "/root/ext/ch05/other.cpp"}, "breakpoints": [{"line": 3, "hitCondition": ">= 5"}]}}
<<< {"request_seq": 4, "type": "response", "command": "setBreakpoints", "success": true, "body": {"breakpoints": [{"verified": false, "reason": "failed", "message": "A syntax error in expression, near `>= 5'."}]}, "seq": 9}
```

logpoint는 멈추지 않고 출력만 냅니다. GDB는 이를 Python `gdb.Breakpoint` 서브클래스(`dap/breakpoint.py`의 `_PrintBreakpoint`)로 구현하고, `{}` 안의 식을 계산해 `console` 분류 `output` 이벤트로 보냈습니다.

```text
<<< {"type": "event", "event": "output", "body": {"category": "console", "output": "handle i=0"}, "seq": 35}
<<< {"type": "event", "event": "output", "body": {"category": "console", "output": "handle i=1"}, "seq": 36}
<<< {"type": "event", "event": "output", "body": {"category": "console", "output": "handle i=2"}, "seq": 38}
```

### Function breakpoint

```text
>>> {"seq": 5, "type": "request", "command": "setFunctionBreakpoints", "arguments": {"breakpoints": [{"name": "main"}]}}
<<< {"request_seq": 5, "type": "response", "command": "setFunctionBreakpoints", "success": true, "body": {"breakpoints": [{"id": 4, "verified": false, "reason": "pending"}]}, "seq": 11}
...
<<< {"type": "event", "event": "stopped", "body": {"threadId": 1, "allThreadsStopped": true, "hitBreakpointIds": [4], "reason": "breakpoint"}, "seq": 33}
```

### Data breakpoint (watchpoint)

DAP의 `setDataBreakpoints`는 위 핸드셰이크 절에서 본 대로 GDB 16.3 DAP에 없습니다. 같은 일을 하려면 `evaluate`의 `repl` 문맥(아래)에서 CLI `watch` 명령을 보내는 방법이 남습니다.

### Stack trace

`continue`로 7행(i = 2)에 멈춘 뒤의 `stackTrace`입니다.

```text
>>> {"seq": 9, "type": "request", "command": "stackTrace", "arguments": {"threadId": 1, "startFrame": 0, "levels": 20}}
<<< {"request_seq": 9, "type": "response", "command": "stackTrace", "success": true, "body": {"stackFrames": [{"id": 0, "line": 7, "column": 0, "instructionPointerReference": "0xaaaaaaaa0b54", "moduleId": "/root/ext/ch05/vecprog", "source": {"name": "vecprog.cpp", "path": "/root/ext/ch05/vecprog.cpp"}, "name": "process"}, {"id": 1, "line": 12, ..., "name": "handle"}, {"id": 2, "line": 17, ..., "name": "main"}]}, "seq": 41}
```

### Variables — 트리

변수 창은 `scopes` → `variables` → (펼치면) `variables`의 연쇄로 그려집니다. 응답의 `variablesReference`가 0이 아니면 펼칠 수 있는 노드이고, 그 번호로 다시 요청합니다. 탐색기에서 폴더를 열 때마다 그 폴더 내용만 가져오는 것과 같습니다.

```text
>>> {"seq": 10, "type": "request", "command": "scopes", "arguments": {"frameId": 0}}
<<< {... "body": {"scopes": [{"variablesReference": 1, "name": "Arguments", "presentationHint": "arguments", "expensive": false, "namedVariables": 2, ...}, {"variablesReference": 2, "name": "Locals", "presentationHint": "locals", "expensive": false, "namedVariables": 1, ...}, {"variablesReference": 3, "name": "Registers", "presentationHint": "registers", "expensive": false, "namedVariables": 263, ...}]}, "seq": 42}
>>> {"seq": 11, "type": "request", "command": "variables", "arguments": {"variablesReference": 1}}
<<< {... "body": {"variables": [{"variablesReference": 4, "name": "vec", "value": "std::vector of length 3, capacity 3", "indexedVariables": 3}, {"variablesReference": 0, "name": "i", "value": "2"}]}, "seq": 43}
>>> {"seq": 12, "type": "request", "command": "variables", "arguments": {"variablesReference": 4}}
<<< {... "body": {"variables": [{"variablesReference": 0, "name": "[0]", "value": "1"}, {"variablesReference": 0, "name": "[1]", "value": "2"}, {"variablesReference": 0, "name": "[2]", "value": "3"}]}, "seq": 44}
```

GDB는 인자와 지역 변수를 `Arguments`·`Locals`로 나누고, `Registers`는 263개를 `expensive: false`로 보냈습니다. `vec`의 `value`는 libstdc++ printer의 `to_string()`이고, `indexedVariables: 3`과 자식 `[0]`~`[2]`는 printer의 `children()`에서 나왔습니다. MI의 `displayhint="array"`에 해당하는 정보가 DAP에서는 `indexedVariables`로 표현된 셈입니다.

### Evaluate

DAP 스키마의 `context` 값은 `watch`, `repl`, `hover`, `clipboard`, `variables`입니다. 같은 `x + 1`을 세 문맥으로 보냈더니 하나가 달랐습니다.

```text
>>> {"seq": 13, "type": "request", "command": "evaluate", "arguments": {"expression": "x + 1", "frameId": 0, "context": "watch"}}
<<< {"request_seq": 13, "type": "response", "command": "evaluate", "success": true, "body": {"variablesReference": 0, "result": "4"}, "seq": 45}
>>> {"seq": 14, "type": "request", "command": "evaluate", "arguments": {"expression": "x + 1", "frameId": 0, "context": "repl"}}
<<< {"request_seq": 14, "type": "response", "command": "evaluate", "success": false, "message": "Cannot access memory at address 0x1", "seq": 46}
>>> {"seq": 15, "type": "request", "command": "evaluate", "arguments": {"expression": "x + 1", "frameId": 0, "context": "hover"}}
<<< {"request_seq": 15, "type": "response", "command": "evaluate", "success": true, "body": {"variablesReference": 0, "result": "4"}, "seq": 47}
```

GDB 16.3 매뉴얼 Debugger Adapter Protocol 장은 `repl` 문맥의 식을 *CLI 명령*으로 실행한다고 적습니다. 그래서 `x + 1`은 GDB의 `x`(examine) 명령으로 해석돼 주소 1을 읽으려다 실패했습니다. 대신 `repl`로 `info breakpoints`를 보내면 CLI 출력이 그대로 옵니다.

```text
>>> {"seq": 16, "type": "request", "command": "evaluate", "arguments": {"expression": "info breakpoints", "frameId": 0, "context": "repl"}}
<<< {... "body": {"result": "Num     Type           Disp Enb Address            What\n1       breakpoint     keep y   0x0000aaaaaaaa0b54 in process(std::vector<int, std::allocator<int> > const&, int) at vecprog.cpp:7\n\tstop only if i > 0\n\tbreakpoint already hit 2 times\n2       breakpoint     keep y   0x0000aaaaaaaa0bc0 in handle(int) at vecprog.cpp:12\n4       breakpoint     keep y   0x0000aaaaaaaa0c24 in main() at vecprog.cpp:15\n\tbreakpoint already hit 1 time\n", "variablesReference": 0}, "seq": 48}
```

breakpoint 1이 "2 times" 맞았는데 한 번만 멈춘 것이 ignore count 1의 결과입니다. 편집기의 Debug Console에 식을 쳤는데 엉뚱한 결과가 나온다면 어댑터가 `repl`을 어떻게 해석하는지부터 봅니다.

### 진행 명령

`next`·`continue`도 `threadId`를 받습니다. GDB는 `continue` 응답에 `allThreadsContinued: true`를 붙였고, `next` 뒤에는 `reason: "step"`인 `stopped` 이벤트가 왔습니다.

```text
>>> {"seq": 17, "type": "request", "command": "next", "arguments": {"threadId": 1}}
<<< {"request_seq": 17, "type": "response", "command": "next", "success": true, "seq": 49}
<<< {"type": "event", "event": "stopped", "body": {"threadId": 1, "allThreadsStopped": true, "reason": "step"}, "seq": 50}
>>> {"seq": 18, "type": "request", "command": "continue", "arguments": {"threadId": 1}}
<<< {"request_seq": 18, "type": "response", "command": "continue", "success": true, "body": {"allThreadsContinued": true}, "seq": 51}
```

GDB가 `supportsSingleThreadExecutionRequests`를 광고하므로, 스키마상 클라이언트는 `singleThread: true`를 붙여 한 스레드만 움직이라고 요청할 수 있습니다. 이 프로그램은 스레드가 하나라 그 차이를 시험하지 않았습니다.

### 이벤트

실행을 끝까지 보내면 디버기 출력, 스레드 종료, 프로세스 종료 이벤트가 차례로 옵니다.

```text
<<< {"type": "event", "event": "output", "body": {"category": "stdout", "output": "x=1\n"}, "seq": 52}
<<< {"type": "event", "event": "output", "body": {"category": "stdout", "output": "x=2\n"}, "seq": 53}
<<< {"type": "event", "event": "output", "body": {"category": "stdout", "output": "x=3\n"}, "seq": 54}
<<< {"type": "event", "event": "thread", "body": {"reason": "exited", "threadId": 1}, "seq": 55}
<<< {"type": "event", "event": "exited", "body": {"exitCode": 0}, "seq": 56}
>>> {"seq": 19, "type": "request", "command": "disconnect", "arguments": {"terminateDebuggee": true}}
<<< {"type": "event", "event": "terminated", "seq": 57}
```

DAP 스키마의 `stopped` 이벤트 `reason` 값은 `step`, `breakpoint`, `exception`, `pause`, `entry`, `goto`, `function breakpoint`, `data breakpoint`, `instruction breakpoint`입니다. GDB는 위의 `main` function breakpoint에서도 `"function breakpoint"`가 아니라 `"breakpoint"`를 보냈습니다.

## Adapter — DAP ↔ MI 매개

VS Code의 `cppdbg`는 Microsoft의 MIEngine입니다. [MIEngine README](https://github.com/microsoft/MIEngine)에 따르면 MIEngine은 MI를 이해하는 Visual Studio Debug Engine이고, 같은 저장소의 OpenDebugAD7이 DAP와 이 엔진 사이의 변환 계층입니다. 즉 VS Code → (DAP) → OpenDebugAD7 → MIEngine → (MI) → GDB 순서입니다. `cppdbg`의 `launch.json`에서 `MIMode`로 GDB와 LLDB를 고르고 `setupCommands`로 GDB 명령을 먼저 보낼 수 있는 것도 이 구조 때문입니다. 이 장에서는 VS Code를 실행하지 않았습니다.

### CodeLLDB는 다름

[CodeLLDB](https://github.com/vadimcn/codelldb)는 MI를 거치지 않고 LLDB를 직접 씁니다. 사용 설명서 MANUAL.md의 Launch Sequence 절은 launch 과정을 `initCommands` 실행 → [`SBTarget`](https://lldb.llvm.org/python_api/lldb.SBTarget.html) 생성 → 설정 적용 순서로 적는데, `SBTarget`은 LLDB의 SB API 객체입니다. README는 C++·Rust 표준 라이브러리 시각화기 내장, 조건부·함수 breakpoint와 logpoint, 하드웨어 watchpoint, 메모리 보기, Python 스크립팅, 원격 디버깅을 기능으로 듭니다.

### debugpy (Python)

[debugpy](https://github.com/microsoft/debugpy) README의 첫 줄은 "Python 3용 Debug Adapter Protocol 구현"입니다. 어댑터와 디버거가 한 몸이라 아래에 별도 디버거 프로토콜이 없습니다.

다른 언어도 각자 DAP 구현을 갖습니다. Go의 Delve는 `dlv dap` 명령으로 DAP 서버를 띄우고([dlv dap 문서](https://github.com/go-delve/delve/blob/master/Documentation/usage/dlv_dap.md)), Samsung의 netcoredbg는 README에서 .NET Core용 GDB/MI와 VS Code DAP를 함께 지원한다고 밝히며, Microsoft의 java-debug는 DAP 클라이언트가 접속할 포트를 여는 Java 디버그 서버입니다. Rust는 CodeLLDB 같은 LLDB 기반 어댑터를 씁니다. rust-analyzer는 README가 밝히듯 language server입니다.

## 직접 DAP 사용 — Neovim

[nvim-dap](https://github.com/mfussenegger/nvim-dap)은 Neovim용 DAP 클라이언트입니다. 도움말 `doc/dap.txt`에 따르면 `dap.adapters.<name>`에 `type = 'executable'`과 `command`를 주면 nvim-dap이 그 프로세스를 띄워 stdio로 대화합니다. 위에서 직접 돌려 본 `gdb -i=dap`을 그대로 쓸 수 있습니다.

```lua
local dap = require('dap')

dap.adapters.gdb = {
  type = 'executable',
  command = 'gdb',
  args = { '-q', '-nx', '-i=dap' },
}

dap.configurations.cpp = {
  {
    name = "Launch",
    type = "gdb",
    request = "launch",
    program = function()
      return vim.fn.input('Path to executable: ', vim.fn.getcwd() .. '/', 'file')
    end,
    cwd = '${workspaceFolder}',
    stopAtBeginningOfMainSubprogram = false,
  },
}
```

`dap.txt`는 필수 키 `type`·`request`·`name` 밖의 키를 "debug-adapter-specific" 옵션이라고 적습니다. `program`, `cwd`, `stopAtBeginningOfMainSubprogram`은 그 어댑터가 알아듣는 `launch` 인자여야 한다는 뜻입니다. 그래서 어댑터가 GDB면 위 GDB 매뉴얼의 키를, `cppdbg`(OpenDebugAD7)면 `MIMode`·`stopAtEntry` 같은 cpptools 키를 씁니다. 이 장에서 Neovim은 실행하지 않았고, 위 설정은 `dap.txt`의 형식과 GDB 매뉴얼의 `launch` 인자를 맞춘 것입니다.

## Emacs — dap-mode

[dap-mode](https://github.com/emacs-lsp/dap-mode) 문서의 Configuration 페이지는 `dap-auto-configure-mode`와 어댑터별 모듈을 설명합니다. 그중 `dap-gdb`는 기본으로 `gdb -i dap`을 띄우는 모듈이고(`dap-gdb-debug-program`으로 경로 변경), `dap-lldb`는 lldb-dap, `dap-cpptools`는 cpptools 어댑터를 씁니다.

```elisp
(use-package dap-mode
  :after lsp-mode
  :config
  (dap-auto-configure-mode)
  (require 'dap-gdb)
  (require 'dap-lldb))
```

## DAP 어댑터 만들기

위 실험에서 본 것만 꼽아도 어댑터가 할 일은 framing보다 훨씬 많습니다. `initialize`에서 capability를 광고하고, `launch` 응답을 `configurationDone` 뒤로 미루고, 실행 파일이 읽히기 전의 breakpoint를 `pending`으로 두었다가 이벤트로 확정하고, `hitCondition`·`logMessage`·`repl`을 자기 디버거의 개념에 맞게 해석해야 합니다. GDB 16.3은 이 모두를 Python으로 `gdb/python/lib/gdb/dap/`의 Python 파일 23개에 구현했습니다. 새 어댑터를 만든다면 이 디렉터리가 가장 가까운 참고서입니다.

## MI vs DAP 한 표

| | MI | DAP |
|---|-----|-----|
| 위치 | GDB 측 | 편집기 측 |
| 형식 | MI 레코드 문법 (`^done`, `*stopped`, `=...`) | `Content-Length` 헤더 + JSON 봉투 |
| 버전 | 인터프리터 이름 (`mi2`, `mi3`) | capability 협상 (`supports*`) |
| 비동기 | `*`·`=` 레코드 | `event` 메시지 |
| 변수 트리 | `-var-create` / `-var-list-children` | `scopes` / `variables` + `variablesReference` |
| 정의 주체 | GDB 매뉴얼 | Microsoft의 DAP 명세 |
| 이 장에서 본 구현 | GDB 16.3 `--interpreter=mi3` | GDB 16.3 `-i=dap` |

## 정리

- MI는 GDB의 기계용 인터페이스입니다. `token`으로 응답을 짝짓고, `^`·`*`·`=`·`~` 접두사로 레코드 종류를 구분합니다.
- pretty-printer는 MI에서 `-enable-pretty-printing` 뒤에 `displayhint`와 dynamic varobj로, DAP에서 `value`와 `indexedVariables`로 나타납니다.
- DAP 메시지의 `Content-Length`는 바이트 수입니다. 한글 두 글자가 든 64자 JSON은 68바이트였습니다.
- GDB 16.3은 `-i=dap`으로 DAP 어댑터가 되지만, `setDataBreakpoints`는 지원하지 않습니다.
- GDB DAP의 `hitCondition`은 ignore count이고, `>= 5` 같은 식은 문법 오류입니다.
- GDB DAP의 `repl` 문맥은 CLI 명령을 실행하므로 `x + 1`이 `x` 명령이 됩니다.
- `launch` 인자는 어댑터마다 다릅니다. GDB는 `stopAtBeginningOfMainSubprogram`, cppdbg는 `stopAtEntry`·`environment` 배열입니다.
- cppdbg는 OpenDebugAD7 + MIEngine으로 MI를, CodeLLDB는 LLDB SB API를, debugpy는 자체 구현을 씁니다.

## 다음 장 예고

[Ch 6](/blog/tools/debugging/gdb-extension/chapter06-frontends)(마지막) — 프런트엔드 비교. TUI / cgdb / dashboard / gef / VS Code / nvim-dap / Cortex-Debug.

## 관련 항목

- [Ch 4: FrameDecorator / Unwinder](/blog/tools/debugging/gdb-extension/chapter04-frame-unwinder)
- [Ch 6: 프런트엔드](/blog/tools/debugging/gdb-extension/chapter06-frontends)
- [GDB and LLDB Ch 10: TUI와 프런트엔드](/blog/tools/debugging/gdb-lldb/chapter10-tui-frontends) — lldb-dap과 GDB DAP 비교
- [GDB/MI 공식 문서](https://sourceware.org/gdb/current/onlinedocs/gdb.html/GDB_002fMI.html)
- [Debug Adapter Protocol 명세](https://microsoft.github.io/debug-adapter-protocol/)
- [DAP overview & implementations](https://microsoft.github.io/debug-adapter-protocol/implementors/adapters/)

## 검증 기준

MI와 DAP 트래픽은 Debian 13 arm64 VM의 GDB 16.3(Debian 16.3-1)에 `vecprog.cpp`(`g++ -g -O0`)를 걸고 `--interpreter=mi3`와 `-i=dap`으로 받은 것입니다. `dap-framing.mjs`는 macOS의 Node.js 24.21.0에서 시험했습니다. GDB 쪽은 GDB 16.3 tarball의 `gdb/doc/gdb.texinfo`(Command Interpreters, GDB/MI Output Syntax·Result/Stream/Async Records·Variable Objects, Debugger Adapter Protocol 장)와 `gdb/python/lib/gdb/dap/`(`breakpoint.py`, `evaluate.py`, `launch.py`)로, DAP 쪽은 [DAP overview](https://microsoft.github.io/debug-adapter-protocol/overview)의 Base Protocol 절과 [protocol schema](https://github.com/microsoft/debug-adapter-protocol/blob/main/debugAdapterProtocol.json)(`SourceBreakpoint`, `Breakpoint.verified`, `EvaluateArguments.context`, `StoppedEvent.reason`)로 대조했습니다. 어댑터 설명은 cpptools launch.json 레퍼런스, MIEngine README, CodeLLDB README·MANUAL, debugpy README, Delve `dlv dap` 문서, netcoredbg·java-debug README, nvim-dap `doc/dap.txt`, dap-mode Configuration 문서에서 확인했습니다.
