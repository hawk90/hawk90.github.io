---
title: "GDB Remote Serial Protocol 분석 — 디버거-타겟 통신 메커니즘"
slug: "tools/debugging/embedded/chapter01-rsp-protocol"
date: 2026-05-26T09:01:00
description: "GDB와 원격 스텁의 packet framing·ACK·qSupported 협상, 메모리·실행·스레드 명령과 RLE를 설명합니다."
tags: [gdb, rsp, embedded, protocol]
series: "Embedded Debugging"
seriesOrder: 1
draft: false
topics: ["tools", "tools/debugging"]
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

RSP는 serial transport뿐 아니라 TCP 등에서도 쓰입니다. 오래된 framing과 ACK 방식에 feature 협상·binary 전송·멀티프로세스 확장이 더해졌으므로 ASCII 명령만 처리하는 스텁으로 모든 연결을 지원할 수는 없습니다.

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

```text
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
[remote] Sending packet: $!#21           ← extended-remote
[remote] Packet received: OK
[remote] Sending packet: $?#3f           ← 현재 정지 사유
[remote] Packet received: T05thread:p1.1;
```

각 줄이 *한 패킷*. `Sending`/`Received` 짝으로 흐름이 보입니다.

LLDB는 `log enable -f /tmp/lldb-rsp.log gdb-remote packets`로 패킷 로그를 켭니다. 아래의 `set logging`은 GDB 명령이며 LLDB 명령이 아닙니다.

```text
(gdb) set logging redirect on
(gdb) set logging file /tmp/rsp.log
(gdb) set logging on
```

## 자주 쓰이는 패킷 카탈로그

### 1. 정지 사유 보고 — `?`

```text
$? → $T05thread:p1.1;
```

`T<sig>` 시그널 정지. `S<sig>`는 추가 필드가 없는 단순 시그널 응답입니다. `W<exitcode>` 정상 종료. `X<sig>` 비정상 종료.

| 응답 | 의미 |
|------|------|
| `S05` | 추가 필드가 없는 SIGTRAP |
| `T05thread:1;watch:7fff8000;reason:hwbreak` | watchpoint hardware BP 정지 |
| `W00` | exit 0 |
| `X0b` | SIGSEGV로 죽음 |
| `N` | 더 이상 정지된 스레드 없음 |

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

```text
$g → $0000000000000000ffffffffffffffff...      ← x86-64 모든 GPR + RIP + FLAGS
```

응답은 *바이트 순서대로* 16진. 길이는 아키텍처별로 다르고, `qXfer:features:read:target.xml`로 받은 XML이 각 레지스터의 *offset/size*를 정의.

```text
$G<hex> → $OK                                   ← 전체 쓰기
```

대부분의 디버거는 *읽기*만 자주 하고 쓰기는 드물게 (`set $rax = 1` 같은 직접 조작 시).

### 3. 한 레지스터 — `p` / `P`

| 요청 → 응답 | 동작 |
|-------------|------|
| `$p10 → $aabbccdd...` | 레지스터 #16 읽기 |
| `$P10=00000000... → $OK` | 레지스터 #16 쓰기 |

`g`와 달리 한 레지스터만 *효율적으로*. ARM처럼 레지스터가 많은 아키텍처에서 `p`가 자주 쓰입니다.

레지스터 번호는 target description의 `regnum`과 생략 시 연속 번호 규칙을 따릅니다. x86-64는 RAX=0, RBX=1, ..., RIP=16. ARM은 R0=0, ..., PC=15.

### 4. 메모리 — `m` / `M`

| 요청 → 응답 | 동작 |
|-------------|------|
| `$m400000,10 → $4889e5...` | `0x400000`부터 16바이트 hex 인코딩 |
| `$M400000,4:48c7c001 → $OK` | 4바이트 쓰기 |

길이 제한은 `PacketSize`(qSupported 응답). 스텁별 값과 hex 인코딩으로 늘어난 길이를 확인합니다. 큰 메모리 영역을 받으려면 *여러 패킷*으로 나뉘어 자동 분할됩니다.

#### binary 형식 — `X`

`M`은 hex라 *바이트당 2글자*. `X`(uppercase 다른 명령)는 *바이너리 직송* — 2배 효율적.

```text
$X400000,4:<raw 4 bytes>           ← OpenOCD/J-Link가 일반적으로 선호
```

다만 `$`/`#`/`}` 같은 바이트는 `}` 뒤에 원래 바이트 XOR `0x20`로 *escape*해야 합니다 (`}`이 escape 문자). 양쪽 모두 escape 디코딩 구현 필수.

### 5. 실행 제어 — `c` / `s` / `vCont`

```text
$c → (실행 후 정지 시 stop 패킷)              ← continue
$c401200 → ...                                ← 0x401200부터 continue
$s → ...                                       ← single step
$s401200 → ...                                ← 그 주소부터 step
```

`c`/`s`는 H 패킷과 all-stop/non-stop 상태에 따른 실행 문맥을 사용합니다. 단순히 현재 스레드 하나만 실행한다고 가정하지 않습니다. 멀티스레드를 정교하게 제어하려면 `vCont`.

```text
$vCont;c                          ← 모든 스레드 continue
$vCont;c:p1.2                     ← thread 2만 continue, 나머지 정지
$vCont;s:p1.2;c                   ← thread 2만 step, 나머지 continue
$vCont;t                          ← 모든 스레드 정지
```

`p<pid>.<tid>` 형식. multiprocess 모드에서 PID도 의미 있음.

`vCont?`로 스텁이 무엇을 지원하는지.

```text
$vCont? → $vCont;c;C;s;S;t;r
```

`r`은 step-range — 주소 범위 안에서만 step. step over inline에 사용.

### 6. 브레이크포인트 — `Z` / `z`

```text
$Z0,401200,1 → $OK            ← software BP at 0x401200, 1-byte instruction
$Z1,401200,4 → $OK            ← hardware BP
$Z2,7fff0000,4 → $OK          ← write watchpoint, 4 bytes
$Z3,7fff0000,4 → $OK          ← read watchpoint
$Z4,7fff0000,4 → $OK          ← access watchpoint
$z0,401200,1 → $OK            ← BP 제거
```

Z0의 *kind* 인자(`1`)는 *명령어 길이*. ARM Thumb는 `2`, ARM은 `4`. x86은 항상 `1` (가변 길이지만 INT3=1바이트 패치이므로). 잘못된 kind면 스텁이 잘못된 위치를 패치할 수 있음.

스텁이 hardware BP를 못 만들면 `Z1`에 빈 응답(`$#00`)을 줍니다 — 스텁이 그 요청을 지원하지 않는다는 뜻입니다. 하드웨어 BP를 반드시 software BP로 대체한다고 보장하지 않으며 요청 종류·메모리 속성·다른 지원 경로에 따라 오류가 될 수 있습니다.

### 7. 스레드 — `H` / `T` / `qfThreadInfo`

| 요청 → 응답 | 동작 |
|-------------|------|
| `$Hg0 → $OK` | 다음 `g` 명령을 위한 thread context = 0 (현재) |
| `$Hc-1 → $OK` | continue 시 모든 스레드 |
| `$T1 → $OK` | thread 1이 살아 있나? (alive check) |
| `$qfThreadInfo → $mp1.1,p1.2,p1.3` | 첫 번째 스레드 목록 페이지 |
| `$qsThreadInfo → $l` | 다음 페이지 없음 (lowercase L) |
| `$qThreadExtraInfo,p1.1 → $576f726b65725f7468726561645f31` | 이름 |

GDB의 `info threads`가 이 셋(`qfThreadInfo` + `qsThreadInfo` + `qThreadExtraInfo`)으로 구성됩니다. 페이지네이션이 있는 이유는 PacketSize 한계 때문 — 천 개 스레드는 한 패킷에 안 들어갑니다.

### 8. 능력 협상 — `qSupported`

연결 직후 첫 패킷이 `qSupported`. 상호 능력을 협상합니다.

```text
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

`xxx+` = 지원, `xxx-` = 미지원, `xxx?` = 해당 feature에 대한 추가 질의를 요청하는 형식입니다. 각 feature의 개별 정의를 따릅니다. 이 한 줄로 GDB가 *이 스텁에서는 무엇을 할 수 있는지* 결정합니다.

#### 자주 보이는 feature

| feature | 의미 |
|---------|------|
| `PacketSize=<hex>` | 스텁이 받을 수 있는 packet-data 최대 크기 (16진수) |
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

```text
$qXfer:features:read:target.xml:0,ffb → $l<target><architecture>i386:x86-64</architecture>...
```

`offset,length`로 청크 전송. 응답이 `l`로 시작하면 *마지막 청크*, `m`이면 *더 있음*. 큰 XML(예: 메모리 맵 + 모든 레지스터 정의)은 자동 분할.

**qXfer 종류:**

- features:read        - 아키텍처 정의 (target.xml)
- libraries-svr4:read  - 로드된 라이브러리 목록
- memory-map:read      - flash/RAM 영역 정의 (임베디드 핵심!)
- auxv:read            - auxv 벡터
- siginfo:read/write   - 시그널 정보
- exec-file:read       - 실행 파일 경로
- threads:read         - XML로 스레드 정보
- uib:read             - Unwind Info Block (Windows)

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

memory-map을 제공하지 않는다고 GDB가 모든 flash 쓰기를 반드시 거부하는 것은 아닙니다. 자동 flash 처리에는 메모리 속성 정보와 vFlash 계열 지원, 대상 flash driver 등이 함께 필요하므로 서버의 설정·지원 패킷을 확인합니다.

### 10. monitor — 패스스루

`qRcmd` 패킷 한 줄로 monitor 명령을 보낸다.

```text
$qRcmd,72657365742068616c74 → $OK
```

`72657365742068616c74`는 `"reset halt"`의 hex 인코딩.

`qRcmd`(remote command)가 GDB의 `monitor <cmd>`. 인자가 hex 인코딩된 ASCII. 스텁의 TCL 인터프리터(OpenOCD) 또는 자체 명령 핸들러(J-Link)로 전달됩니다.

```text
(gdb) monitor reset halt
[remote] Sending: qRcmd,72657365742068616c74
[remote] Received: OK
```

OpenOCD의 `monitor flash erase_address`, J-Link의 `monitor reg`, gdbserver의 `monitor set debug 1` 등 모두 같은 메커니즘.

### 11. extended-remote 명령 — `R` / `vAttach` / `vRun`

```text
$R0 → (응답 없음)                  ← restart (extended only)
$vAttach;1234 → $T05thread:p1.1;   ← PID 1234에 attach
$vRun;<arg0>;<arg1> → $T05...      ← 새 프로세스 시작
$D → $OK                            ← detach
$k → (없음)                         ← kill
```

OpenOCD에서 `monitor reset` + `load` + `monitor reset` 시퀀스가 일반적인 이유 — `R`로 재시작이 안 되거나 어색해서 `monitor`로 우회.

## RLE 압축 — 한 응답 안의 반복 인코딩

RLE는 여러 패킷을 합치는 기능이 아니라 packet-data 안의 반복 문자 인코딩입니다. `*` 뒤 한 바이트의 ASCII 값에서 29를 뺀 수만큼 직전 문자를 추가 반복합니다. 예를 들어 `0* `의 마지막 문자는 공백(32)이므로 추가3회, 총 `0000`으로 복원합니다. 숫자 두 자리 hex로 횟수를 읽는 방식이 아닙니다.

허용되는 반복 횟수·금지된 count 문자와 binary escaping 순서도 명세를 따라야 합니다. 아래 오프라인 예제로 checksum·escaping·RLE의 경계를 나눠 확인합니다.

## escape — `}` 메타바이트

`X` 패킷(binary memory write) 등에서 *프로토콜 메타 바이트*(`$`, `#`, `*`, `}`)가 데이터 안에 있으면 *escape*.

```text
data byte X (= $, #, *, } 중 하나):
  와이어 위에 '}' (0x7d) + (X XOR 0x20)
  
예: 0x23 (#) → 0x7d 0x03
    0x7d (})  → 0x7d 0x5d
```

GDB와 스텁 모두 디코더가 필요. 자체 스텁 구현 시 자주 빼먹는 부분.

## PacketSize 협상

`qSupported` 응답의 `PacketSize=<hex>`는 스텁의 수신 packet-data 용량입니다. 호스트의 응답 수신 용량을 같은 값으로 협상한 것으로 해석하지 않습니다. hex 메모리 쓰기는 데이터 바이트 하나가 두 문자이므로 주소·길이·구분자까지 포함해 패킷을 구성해야 합니다.

예를 들어 0x400은 1024, 0x2000은8192입니다. OpenOCD Tcl 변수 `_PacketSize`를 임의로 정하는 것만으로 서버 구현의 용량이 바뀌지 않으며 해당 버전이 제공하는 설정·패킷 동작을 확인합니다.

## file I/O — `F` 패킷

`semihosting`이나 `qFileIO`로 *스텁 측에서* 호스트의 파일 시스템에 접근하는 메커니즘.

```text
스텁 → 호스트: $Fopen,filename,flags,mode#cs
호스트 → 스텁: $F<fd>#cs                    ← 호스트가 open 결과 반환
```

ARM semihosting의 `SYS_OPEN` 등이 결국 이 패킷으로 변환됩니다.

## 에러 응답

```text
$E01 → ...              ← 일반 오류 (1번)
$ENN → ...              ← errno 인코딩
$E.<error_text>         ← textual error (GDB 12+)
```

스텁이 명령을 이해 못 하면 *빈 응답* `$#00`. GDB는 이를 *불지원*으로 해석하고 다른 방법을 시도.

## 자체 스텁을 만들기 — 최소 구현

새 아키텍처(예: RISC-V softcore on FPGA)의 디버그 스텁을 만든다면 *최소* 다음 패킷만 구현해도 GDB가 동작.

| 패킷 | 필수? | 비고 |
|------|-------|------|
| `?` | ✅ | 정지 사유 |
| `g` / `G` | ✅ | 레지스터 |
| `m` / `M` | ✅ | 메모리 |
| `c` / `s` | ✅ | 실행 |
| `Z0` / `z0` | ✅ | software BP |
| `qSupported` | 권장 | 지원하지 않으면 빈 응답; 기능별 요구 확인 |
| `qXfer:features:read:target.xml` | 대상별 | 기본 아키텍처 레지스터 정의로 충분한지에 따라 다름 |
| `vCont`/`vCont?` | 기능별 | 세밀한 스레드별 실행 제어 |
| `qXfer:memory-map:read` | 권장 | 자동 flash 처리에 필요한 속성 정보 |
| `qRcmd` (monitor) | 선택 | 디버그 보조 |

[GDB RSP 명세](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Remote-Protocol.html)와 대상 아키텍처 레지스터 규칙을 기준으로 필요한 패킷을 정합니다. 위 표는 모든 타깃에 동일하게 강제되는 최소 명세가 아닙니다.

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

## 작은 예제 — 와이어 바이트 검사

다음은 실제 GDB 세션이 아닌 로컬 인코딩 검사입니다. 바이너리 escaping은 wire payload에 적용하고 checksum도 wire payload로 계산합니다.

```js title="rsp-check.mjs"
import assert from 'node:assert/strict';
const sum = data => [...data].reduce((n,b)=>(n+b)&255,0);
function frame(data) {
    const body=Buffer.from(data);
    return Buffer.concat([Buffer.from('$'),body,Buffer.from('#'+sum(body).toString(16).padStart(2,'0'))]);
}
function verify(packet) {
    const end=packet.length-3;
    assert(packet[0]===36 && packet[end]===35);
    const body=packet.subarray(1,end);
    assert.equal(sum(body),parseInt(packet.subarray(end+1).toString(),16));
    return body;
}
function escape(data) {
    const out=[];
    for(const b of data) { if([35,36,42,125].includes(b)) out.push(125,b^32); else out.push(b); }
    return Buffer.from(out);
}
function unescape(data) {
    const out=[];
    for(let i=0;i<data.length;i++) {
        if(data[i]===125) { assert(i+1<data.length); out.push(data[++i]^32); }
        else out.push(data[i]);
    }
    return Buffer.from(out);
}
function rle(text) {
    let out='';
    for(let i=0;i<text.length;i++) {
        if(text[i]!=='*') out+=text[i];
        else {
            assert(out.length && i+1<text.length);
            const count=text.charCodeAt(++i)-29;
            assert(count>=3 && count<=97);
            out+=out.at(-1).repeat(count);
        }
    }
    return out;
}
assert.equal(frame('g').toString(),'$g#67');
assert.equal(frame('!').toString(),'$!#21');
assert.equal(frame('').toString(),'$#00');
const raw=Buffer.from([35,36,42,125,0,255]);
assert.deepEqual(unescape(verify(frame(escape(raw)))),raw);
assert.equal(rle('0* '),'0000');
assert.throws(()=>verify(Buffer.from('$g#00')));
assert.throws(()=>unescape(Buffer.from([125])));
assert.throws(()=>rle('* '));
console.log('PASS checksum, escaping, RLE, corrupt and truncated inputs');
```

Node 24.21.0에서 named 검사 코드를 실행했습니다. 이 코드는 설명한 경계 검사이며 production RSP parser가 아닙니다. [GDB framing/escaping/RLE](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Overview.html)와 [feature 협상](https://sourceware.org/gdb/current/onlinedocs/gdb.html/General-Query-Packets.html)을 기준으로 했습니다. 프로브·GDB 서버 연결과 실제 전송량은 검증하지 않았습니다.

RSP가 프로브를 통해 타깃의 디버그 회로로 연결되는 과정은 다음 장 [JTAG·SWD·CoreSight](/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight)에서 이어집니다.
