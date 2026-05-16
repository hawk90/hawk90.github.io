---
title: "Ch 1: RSP — GDB Remote Serial Protocol"
date: 2025-09-01T01:00:00
description: "GDB가 원격 스텁과 주고받는 ASCII 패킷의 모든 것. 패킷 형식, qSupported 협상, vCont, 멀티 패킷, RLE."
tags: [gdb, rsp, embedded, protocol]
series: "Embedded Debugging"
seriesOrder: 1
draft: false
---

임베디드 디버깅이 *왜 가능한가*의 답은 **RSP**(Remote Serial Protocol)에 있습니다. 호스트의 GDB와 타깃의 *스텁*(gdbserver든 OpenOCD든 J-Link 펌웨어든 모두) 사이를 흐르는 ASCII 텍스트 프로토콜. 한 번이라도 이 프로토콜을 들여다보면, *GDB 명령이 칩 안에서 어떻게 일어나는지*가 또렷해집니다.

이 시리즈의 첫 장은 RSP의 정체부터 시작합니다. 패킷 형식·체크섬·ACK 핸드셰이크·feature 협상·멀티 패킷 동작 — 이후 모든 챕터(JTAG/SWD, OpenOCD, J-Link)가 결국 이 패킷 위에서 일어납니다.

:::tldr
GDB와 원격 스텁이 *`$payload#checksum`* 형태의 ASCII 패킷을 주고받으며 메모리·레지스터·BP·실행 제어를 수행하는 단순 프로토콜.
:::

## 왜 알아야 하나

- 디버거가 *멈춰 있는 것 같은* 상태(`Remote replied "Eff"`, `Packet too long`)를 만나면 결국 RSP를 봐야 합니다.
- 자체 스텁을 만들 때 (예: RISC-V softcore, JIT, custom FPGA 디버그) RSP가 인터페이스 명세.
- OpenOCD/J-Link/Black Magic Probe가 *왜 GDB와 호환되는지*의 답.
- `set debug remote 1`로 *모든 디버깅의 안쪽*을 들여다볼 수 있습니다.

## 역사

1989년 GDB 4.x에 처음 도입. 당시 워크스테이션 ↔ 임베디드 보드 시리얼 케이블이 9600bps였던 점이 설계에 그대로 반영됐습니다 — *짧고 ASCII로*. 35년이 지나도 같은 프로토콜이 USB 3.0 위에서 동작합니다. 단순함의 위력.

## 패킷 형식

![RSP 패킷 구조](/images/blog/tools/diagrams/rsp-packet-format.svg)

`$<payload>#<checksum>`.

- `$` — 시작 문자.
- `<payload>` — 명령 또는 응답 본문 (ASCII).
- `#` — 종료 문자.
- `<checksum>` — payload 바이트의 8-bit 합 `% 256`, 16진 두 자리.

### 체크섬 계산

```c
uint8_t cksum = 0;
for (size_t i = 0; i < payload_len; i++)
    cksum += payload[i];   // 자연스러운 8-bit overflow
```

`g` 한 글자 패킷의 체크섬은 `0x67`. 따라서 와이어 위는 `$g#67`. 노이즈 많은 시리얼선에서는 *체크섬 오류*가 잦으므로 8-bit이라도 작은 보호막 역할.

### ACK 핸드셰이크

![RSP ACK / NACK 핸드셰이크](/images/blog/tools/diagrams/rsp-handshake.svg)

체크섬이 깨지거나 패킷이 잘리면 `-`(NACK)로 재전송 요청. TCP 위에선 거의 안 깨지지만 시리얼선에선 일상.

대부분의 USB 기반 프로브(J-Link, ST-Link, CMSIS-DAP)에서 ACK는 자동 처리됩니다. 사용자는 보통 의식하지 않습니다.

### NoAck 모드

핸드셰이크가 *왕복 1회*씩 추가되는 오버헤드. RSP는 `qSupported`에서 `QStartNoAckMode+`로 *ACK 생략* 협상이 가능합니다.

```
호스트 → 스텁: QStartNoAckMode
스텁 → 호스트: OK
[이후 ACK 생략, 한 방향씩만 전송]
```

TCP/USB 환경의 거의 모든 현대 스텁이 이걸 켭니다. 성능 차이가 크진 않지만 (왕복 절반), 누적되면 *큰 코어 덤프 다운로드*에서 체감됩니다.

## 첫 번째 트래픽 보기

`set debug remote 1`로 GDB가 RSP 트래픽을 노출하게 합니다.

```text
(gdb) set debug remote 1
(gdb) target extended-remote :3333
[remote] Sending packet: $qSupported:multiprocess+;swbreak+;hwbreak+;...
[remote] Received Ack
[remote] Packet received: PacketSize=2000;qXfer:features:read+;...
[remote] Sending packet: $!#04           ← extended-remote
[remote] Packet received: OK
[remote] Sending packet: $?#3f           ← 현재 정지 사유
[remote] Packet received: T05thread:p1.1;
```

각 줄이 *한 패킷*. `Sending`/`Received` 짝으로 흐름이 보입니다.

`set remote-debug 1`이 LLDB의 같은 옵션. `gdb-remote.txt`로 로그를 떨어뜨릴 수도 있습니다.

```text
(gdb) set logging redirect on
(gdb) set logging file /tmp/rsp.log
(gdb) set logging on
```

## 자주 쓰이는 패킷 카탈로그

### 1. 정지 사유 보고 — `?`

```
$? → $T05thread:p1.1;
```

`T<sig>` 시그널 정지. `S<sig>`는 단순 시그널(deprecated). `W<exitcode>` 정상 종료. `X<sig>` 비정상 종료.

```
S05         ← SIGTRAP (잘 안 씀, 호환용)
T05thread:1;watch:7fff8000;reason:hwbreak
W00         ← exit 0
X0b         ← SIGSEGV로 죽음
N           ← 더 이상 정지된 스레드 없음
```

`T` 응답의 *키:값* 셀렉터.

| 셀렉터 | 의미 |
|--------|------|
| `thread:<id>` | 정지한 스레드 ID |
| `core:<n>` | 어느 CPU 코어 |
| `watch:<addr>` | watchpoint 트리거 주소 |
| `rwatch:<addr>` | read watchpoint |
| `awatch:<addr>` | access watchpoint |
| `library:` | 새 라이브러리 로드 |
| `fork:<id>` | fork 발생 |
| `vfork:<id>` | vfork 발생 |
| `exec:<file>` | exec 발생 |
| `swbreak:` | software BP |
| `hwbreak:` | hardware BP |
| `replaylog:begin/end` | rr 같은 replay 경계 |

GDB는 이 셀렉터를 보고 `info breakpoints`의 *Hit*를 올리거나 `catch fork`의 멈춤을 트리거.

### 2. 모든 레지스터 — `g` / `G`

```
$g → $0000000000000000ffffffffffffffff...      ← x86-64 모든 GPR + RIP + FLAGS
```

응답은 *바이트 순서대로* 16진. 길이는 아키텍처별로 다르고, `qXfer:features:read:target.xml`로 받은 XML이 각 레지스터의 *offset/size*를 정의.

```
$G<hex> → $OK                                   ← 전체 쓰기
```

대부분의 디버거는 *읽기*만 자주 하고 쓰기는 드물게 (`set $rax = 1` 같은 직접 조작 시).

### 3. 한 레지스터 — `p` / `P`

```
$p10 → $aabbccdd...                ← 레지스터 #16 읽기
$P10=00000000... → $OK             ← 레지스터 #16 쓰기
```

`g`와 달리 한 레지스터만 *효율적으로*. ARM처럼 레지스터가 많은 아키텍처에서 `p`가 자주 쓰입니다.

레지스터 번호는 XML의 *나열 순서*. x86-64는 RAX=0, RBX=1, ..., RIP=16. ARM은 R0=0, ..., PC=15.

### 4. 메모리 — `m` / `M`

```
$m400000,10 → $4889e5...           ← 0x400000부터 16바이트 hex 인코딩
$M400000,4:48c7c001 → $OK          ← 4바이트 쓰기
```

길이 제한은 `PacketSize`(qSupported 응답). 보통 16KB. 큰 메모리 영역을 받으려면 *여러 패킷*으로 나뉘어 자동 분할됩니다.

#### binary 형식 — `X`

`M`은 hex라 *바이트당 2글자*. `X`(uppercase 다른 명령)는 *바이너리 직송* — 2배 효율적.

```
$X400000,4:<raw 4 bytes>           ← OpenOCD/J-Link가 일반적으로 선호
```

다만 `$`/`#`/`}` 같은 바이트는 `0x7d ^ byte`로 *escape*해야 합니다 (`}`이 escape 문자). 양쪽 모두 escape 디코딩 구현 필수.

### 5. 실행 제어 — `c` / `s` / `vCont`

```
$c → (실행 후 정지 시 stop 패킷)              ← continue
$c401200 → ...                                ← 0x401200부터 continue
$s → ...                                       ← single step
$s401200 → ...                                ← 그 주소부터 step
```

`c`/`s`는 *현재 스레드*만 다룸. 멀티스레드를 정교하게 제어하려면 `vCont`.

```
$vCont;c                          ← 모든 스레드 continue
$vCont;c:p1.2                     ← thread 2만 continue, 나머지 정지
$vCont;s:p1.2;c                   ← thread 2만 step, 나머지 continue
$vCont;t                          ← 모든 스레드 정지
```

`p<pid>.<tid>` 형식. multiprocess 모드에서 PID도 의미 있음.

`vCont?`로 스텁이 무엇을 지원하는지.

```
$vCont? → $vCont;c;C;s;S;t;r
```

`r`은 step-range — 주소 범위 안에서만 step. step over inline에 사용.

### 6. 브레이크포인트 — `Z` / `z`

```
$Z0,401200,1 → $OK            ← software BP at 0x401200, 1-byte instruction
$Z1,401200,4 → $OK            ← hardware BP
$Z2,7fff0000,4 → $OK          ← write watchpoint, 4 bytes
$Z3,7fff0000,4 → $OK          ← read watchpoint
$Z4,7fff0000,4 → $OK          ← access watchpoint
$z0,401200,1 → $OK            ← BP 제거
```

Z0의 *kind* 인자(`1`)는 *명령어 길이*. ARM Thumb는 `2`, ARM은 `4`. x86은 항상 `1` (가변 길이지만 INT3=1바이트 패치이므로). 잘못된 kind면 스텁이 잘못된 위치를 패치할 수 있음.

스텁이 hardware BP를 못 만들면 `Z1`에 빈 응답(`$$#00`)을 줍니다 — GDB는 *software BP로 대체*합니다.

### 7. 스레드 — `H` / `T` / `qfThreadInfo`

```
$Hg0 → $OK                    ← 다음 g 명령을 위한 thread context = 0 (현재)
$Hc-1 → $OK                   ← continue 시 모든 스레드
$T1 → $OK                     ← thread 1이 살아 있나? (alive check)
$qfThreadInfo → $mp1.1,p1.2,p1.3       ← 첫 번째 스레드 목록 페이지
$qsThreadInfo → $l                     ← 다음 페이지 없음 (lowercase L)
$qThreadExtraInfo,p1.1 → $Worker_thread_1   ← 이름
```

GDB의 `info threads`가 이 셋(`qfThreadInfo` + `qsThreadInfo` + `qThreadExtraInfo`)으로 구성됩니다. 페이지네이션이 있는 이유는 PacketSize 한계 때문 — 천 개 스레드는 한 패킷에 안 들어갑니다.

### 8. 능력 협상 — `qSupported`

연결 직후 첫 패킷이 `qSupported`. 상호 능력을 협상합니다.

```
GDB:  qSupported:multiprocess+;swbreak+;hwbreak+;qRelocInsn+;fork-events+;
      vfork-events+;exec-events+;vContSupported+;QThreadEvents+;no-resumed+;
      memory-tagging+;xmlRegisters=i386

Stub: PacketSize=2000;QPassSignals+;QProgramSignals+;QStartupWithShell+;
      QEnvironmentHashCheck+;QEnvironmentReset+;QEnvironmentUnset+;
      QEnvironmentSet+;QSetWorkingDir+;qXfer:features:read+;
      qXfer:libraries-svr4:read+;qXfer:auxv:read+;qXfer:exec-file:read+;
      qXfer:siginfo:read+;qXfer:siginfo:write+;QCatchSyscalls+;
      QPassSignals+;swbreak+;hwbreak+;ConditionalBreakpoints+;
      BreakpointCommands+;FastTracepoints+;TracepointSource+;...
```

`xxx+` = 지원, `xxx-` = 미지원, `xxx?` = 조건부. 이 한 줄로 GDB가 *이 스텁에서는 무엇을 할 수 있는지* 결정합니다.

#### 자주 보이는 feature

| feature | 의미 |
|---------|------|
| `PacketSize=<hex>` | 한 패킷 최대 크기 (양쪽 합의) |
| `multiprocess+` | 여러 inferior 지원 |
| `swbreak+` / `hwbreak+` | 정지 사유에 software/hardware BP 표시 |
| `vContSupported+` | `vCont;...` 사용 |
| `qXfer:features:read+` | `target.xml`로 아키텍처 정의 받기 |
| `qXfer:libraries-svr4:read+` | 로드된 .so 목록 받기 |
| `qXfer:memory-map:read+` | 메모리 영역 정의 (flash vs RAM) |
| `qXfer:exec-file:read+` | 실행 파일 경로 |
| `QNonStop+` | non-stop 모드 |
| `QStartNoAckMode+` | ACK 생략 |
| `fork-events+` / `vfork-events+` / `exec-events+` | 자식 추적 |
| `ConditionalBreakpoints+` | 조건부 BP 스텁측 평가 |
| `FastTracepoints+` | tracepoint 고속 모드 |
| `tracenz+` | non-null 추적 |
| `MemoryTagging+` | ARM MTE 메모리 태그 |

스텁이 무엇을 지원하느냐가 *디버깅 가능한 작업의 한계*. OpenOCD가 multiprocess를 안 지원하면 `fork` 추적이 안 됩니다.

### 9. 임의 XML 전송 — `qXfer`

```
$qXfer:features:read:target.xml:0,ffb → $l<target><architecture>i386:x86-64</architecture>...
```

`offset,length`로 청크 전송. 응답이 `l`로 시작하면 *마지막 청크*, `m`이면 *더 있음*. 큰 XML(예: 메모리 맵 + 모든 레지스터 정의)은 자동 분할.

```
qXfer 종류:
  features:read        - 아키텍처 정의 (target.xml)
  libraries-svr4:read  - 로드된 라이브러리 목록
  memory-map:read      - flash/RAM 영역 정의 (임베디드 핵심!)
  auxv:read            - auxv 벡터
  siginfo:read/write   - 시그널 정보
  exec-file:read       - 실행 파일 경로
  threads:read         - XML로 스레드 정보
  uib:read             - Unwind Info Block (Windows)
```

#### memory-map — 임베디드의 결정적 정보

```xml
<memory-map>
  <memory type="flash" start="0x08000000" length="0x100000">
    <property name="blocksize">0x4000</property>
  </memory>
  <memory type="ram" start="0x20000000" length="0x20000"/>
</memory-map>
```

GDB가 `load` 시 *주소가 flash인지 RAM인지*를 이걸 보고 결정. flash면 OpenOCD/J-Link의 *flash driver*를 거치고, RAM이면 단순 메모리 쓰기.

이게 없으면 GDB는 flash 영역에 사용자가 *직접 못 쓰는* 메모리로 보고 `M` 패킷을 거부합니다. 임베디드 디버깅에서 `monitor flash` 명령이 필요한 이유.

### 10. monitor — 패스스루

```
$qRcmd,72657365742068616c74 → $OK     ← "reset halt"를 hex 인코딩해 monitor로
```

`qRcmd`(remote command)가 GDB의 `monitor <cmd>`. 인자가 hex 인코딩된 ASCII. 스텁의 TCL 인터프리터(OpenOCD) 또는 자체 명령 핸들러(J-Link)로 전달됩니다.

```text
(gdb) monitor reset halt
[remote] Sending: qRcmd,72657365742068616c74
[remote] Received: OK
```

OpenOCD의 `monitor flash erase_address`, J-Link의 `monitor reg`, gdbserver의 `monitor set debug 1` 등 모두 같은 메커니즘.

### 11. extended-remote 명령 — `R` / `vAttach` / `vRun`

```
$R0 → (응답 없음)                  ← restart (extended only)
$vAttach;1234 → $T05thread:p1.1;   ← PID 1234에 attach
$vRun;<arg0>;<arg1> → $T05...      ← 새 프로세스 시작
$D → $OK                            ← detach
$k → (없음)                         ← kill
```

OpenOCD에서 `monitor reset` + `load` + `monitor reset` 시퀀스가 일반적인 이유 — `R`로 재시작이 안 되거나 어색해서 `monitor`로 우회.

## 멀티 패킷 — RLE 압축

레지스터 같은 *반복 바이트가 많은* 응답에는 RLE(Run-Length Encoding)이 적용됩니다.

```
$0000000000000000000000000000000000000000  ← 일반
$0000000000000000*0d                        ← RLE
                  ↑
                  '*' 다음에 +29 (40 - 4 + 0x20)
```

`*<count_plus_29>`: 바로 앞 문자를 *N+29회* 반복. 14자 → 4자로 줄어듭니다. 시리얼 환경에서는 의미 있는 절감.

ASCII 32~127 사이를 쓰기 위해 +29 오프셋. 디코딩이 복잡하지만 옛 시리얼 환경의 잔재.

## escape — `}` 메타바이트

`X` 패킷(binary memory write) 등에서 *프로토콜 메타 바이트*(`$`, `#`, `*`, `}`)가 데이터 안에 있으면 *escape*.

```
data byte X (= $, #, *, } 중 하나):
  와이어 위에 '}' (0x7d) + (X XOR 0x20)
  
예: 0x23 (#) → 0x7d 0x03
    0x7d (})  → 0x7d 0x5d
```

GDB와 스텁 모두 디코더가 필요. 자체 스텁 구현 시 자주 빼먹는 부분.

## PacketSize 협상

`qSupported`의 `PacketSize=<hex>`가 양쪽이 *받을 수 있는 최대*. 보내는 쪽이 한 패킷을 그 크기로 잘라야 합니다.

```
PacketSize=400        ← 1024 바이트 (32-bit MCU 흔함)
PacketSize=2000       ← 8192 (PC gdbserver)
PacketSize=10000      ← 65536 (USB 고속)
```

작은 PacketSize면 큰 `load`(코드 굽기)는 *수백 패킷*으로 잘려 느립니다. ESP32 같은 일부 환경에서 OpenOCD가 작은 PacketSize를 통보해 굽는 시간이 길어집니다 — 가능하면 USB 고속 + PacketSize=4000 이상이 좋습니다.

```text
(openocd config)
set _PacketSize 0x4000
```

## file I/O — `F` 패킷

`semihosting`이나 `qFileIO`로 *스텁 측에서* 호스트의 파일 시스템에 접근하는 메커니즘.

```
스텁 → 호스트: $Fopen,filename,flags,mode#cs
호스트 → 스텁: $F<fd>#cs                    ← 호스트가 open 결과 반환
```

ARM semihosting의 `SYS_OPEN` 등이 결국 이 패킷으로 변환됩니다.

## 에러 응답

```
$E01 → ...              ← 일반 오류 (1번)
$ENN → ...              ← errno 인코딩
$E.<error_text>         ← textual error (GDB 12+)
```

스텁이 명령을 이해 못 하면 *빈 응답* `$$#00`. GDB는 이를 *불지원*으로 해석하고 다른 방법을 시도.

## 자체 스텁을 만들기 — 최소 구현

새 아키텍처(예: RISC-V softcore on FPGA)의 디버그 스텁을 만든다면 *최소* 다음 패킷만 구현해도 GDB가 동작.

| 패킷 | 필수? | 비고 |
|------|-------|------|
| `?` | ✅ | 정지 사유 |
| `g` / `G` | ✅ | 레지스터 |
| `m` / `M` | ✅ | 메모리 |
| `c` / `s` | ✅ | 실행 |
| `Z0` / `z0` | ✅ | software BP |
| `qSupported` | ✅ | feature 협상 |
| `qXfer:features:read:target.xml` | ✅ | 아키텍처 정의 |
| `vCont`/`vCont?` | 권장 | 멀티스레드면 필수 |
| `qXfer:memory-map:read` | 권장 | flash 있으면 필수 |
| `qRcmd` (monitor) | 선택 | 디버그 보조 |

[gdbstub.c 미니멀 구현](https://github.com/bigchungus/embedded-gdb-stub) 같은 오픈 예제를 참고.

## 보안

RSP는 *암호도 인증도 없습니다*. 누구든 연결되면 임의 메모리 읽기·쓰기·실행. 운영 환경에서 노출되면 즉시 RCE.

- 방화벽으로 외부 차단 (특히 3333, 2345, 2331).
- SSH 터널로만.
- 컨테이너에서 gdbserver는 *내부 네트워크 한정*.

## 실전 디버깅 — RSP가 답을 알려주는 사례

### 사례 1. `Packet too long`

```text
Remote replied: Packet too long
```

`set remote memory-write-packet-size 1024`로 호스트가 보내는 패킷 크기 강제. PacketSize 협상이 잘못된 경우.

### 사례 2. `Reply contains invalid hex digit`

스텁이 *RLE*나 *escape*를 잘못 보냄. `set debug remote 1`로 정확한 응답 바이트를 보고 디코딩 검증.

### 사례 3. `target remote` 후 침묵

스텁이 ACK를 안 보내거나 패킷 형식이 깨짐. 시리얼 baud rate, NoAck 협상 실패, 또는 USB 드라이버 문제.

```text
(gdb) set remoteflow off       ← 일부 USB 시리얼에서 도움
(gdb) set remote noack-packet off
```

### 사례 4. Memory write at flash address fails

`memory-map`이 없거나 잘못 — flash 드라이버가 안 깸. OpenOCD에서 `flash banks` 확인.

## 정리

- RSP = `$payload#cs` ASCII 패킷 + 양방향 ACK.
- `qSupported`로 능력 협상 → 이후 모든 동작이 그 능력 범위 안.
- 메모리는 `m`(hex) 또는 `X`(binary), 큰 영역은 자동 분할.
- 실행은 `c`/`s`/`vCont` — 멀티스레드는 `vCont` 필수.
- BP는 `Z0`(sw) / `Z1`(hw) / `Z2~4`(watch).
- 임베디드의 *flash vs RAM* 결정은 `qXfer:memory-map:read`.
- `monitor` 명령은 `qRcmd`로 스텁의 자체 인터프리터 호출.
- `set debug remote 1`이 디버깅의 디버깅 도구.
- 자체 스텁 구현은 10여 개 패킷이면 시작 가능.

## 다음 장 예고

Ch 2 — JTAG / SWD / CoreSight. RSP의 *아래*에서 실제로 칩 안 디버그 회로를 두드리는 물리·논리 계층.

## 관련 항목

- [Ch 2: JTAG / SWD / CoreSight](/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight)
- [GDB and LLDB Ch 1: 소개](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install)
- [GDB RSP 공식 명세](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Remote-Protocol.html)
- [LLDB GDB-Remote Protocol 확장](https://github.com/llvm/llvm-project/blob/main/lldb/docs/lldb-gdb-remote.txt)
- `set debug remote 1` — GDB 트래픽 노출
