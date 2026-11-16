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

임베디드 디버깅이 *왜 가능한가*의 답은 **RSP**(Remote Serial Protocol)에 있습니다. 호스트의 GDB와 타깃의 *스텁*(gdbserver, QEMU의 gdbstub, OpenOCD, J-Link GDB Server 등) 사이를 흐르는 텍스트 프로토콜입니다. 이 프로토콜을 한 번 들여다보면 `break main` 한 줄이 칩 쪽에서 어떤 요청으로 바뀌는지가 또렷해집니다.

이 장은 RSP를 *실제 패킷 로그*로 읽습니다. 패킷 형식·체크섬·ACK, feature 협상, 메모리·레지스터·브레이크포인트·실행 제어, 그리고 RLE와 escape까지 다룹니다. 이후 장(JTAG/SWD, OpenOCD, J-Link)은 모두 이 패킷 아래쪽에서 일어나는 일입니다.

:::tldr
GDB와 원격 스텁은 `$payload#checksum` 형태의 패킷을 주고받으며 메모리·레지스터·브레이크포인트·실행 제어를 수행합니다. 무엇을 쓸 수 있는지는 연결 직후 `qSupported` 응답이 정합니다.
:::

## 실험 환경

이 장의 로그는 모두 아래 환경에서 직접 받았습니다. 스텁이 두 종류인 이유는 *같은 GDB라도 상대 스텁에 따라 협상 결과가 크게 다르다*는 점을 보이기 위해서입니다.

| 항목 | 값 |
|------|-----|
| 호스트 GDB | GNU gdb (Debian 16.3-1) 16.3, `gdb-multiarch`와 `gdb` |
| 베어메탈 스텁 | QEMU 11.1.3 `qemu-system-arm -M netduinoplus2 -s -S` (Cortex-M4, STM32F405 모델) |
| Linux 스텁 | GNU gdbserver (Debian 16.3-1) 16.3, `gdbserver --multi :2345` |
| 펌웨어 | arm-none-eabi-gcc 16.2.0로 빌드한 `fw.elf` (5장에서 소스와 링커 스크립트를 다룹니다) |
| 게스트 OS | Debian 13.7 arm64 (QEMU `virt`, HVF) |

GDB 쪽 트래픽은 `set debug remote 1`로 봤습니다. 긴 패킷은 GDB가 `[333 bytes omitted]`처럼 잘라 보여 주므로 `set debug remote-packet-max-chars unlimited`를 함께 켰습니다.

## 왜 알아야 하나

- 디버거가 멈춘 것처럼 보이거나 `Cannot access memory at address ...` 같은 오류가 날 때, 어느 요청에 스텁이 무엇을 답했는지는 RSP 로그에만 남습니다.
- 자체 스텁을 만들 때(예: RISC-V softcore, FPGA 디버그 모듈) RSP가 곧 인터페이스 명세입니다.
- OpenOCD·J-Link·Black Magic Probe가 모두 GDB와 붙는 이유가 이 공통 프로토콜입니다.

## 연결 매체

RSP는 시리얼선과 TCP 위에서 모두 씁니다. 이 장의 두 스텁은 모두 TCP로 열려 있었고, `lsof`·`ss`로 보니 둘 다 *모든 인터페이스*에서 기다렸습니다.

```text
qemu-syst 73810 hawk   12u  IPv6 0xfa1374180c716c1b      0t0  TCP *:1234 (LISTEN)
LISTEN 0      1                  *:2345            *:*    users:(("gdbserver",pid=2457,fd=3))
```

이 점은 뒤의 보안 절에서 다시 다룹니다.

## 패킷 형식

![RSP 패킷 구조](/images/blog/tools/diagrams/rsp-packet-format.svg)

[GDB 매뉴얼 E.1 Overview](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Overview.html)가 정한 형식은 `$packet-data#checksum`입니다.

- `$` — 시작 문자.
- `packet-data` — 명령 또는 응답 본문.
- `#` — 종료 문자.
- `checksum` — `$`와 `#` 사이 모든 문자의 합을 256으로 나눈 나머지, 16진 두 자리.

### 체크섬 계산

```c
uint8_t cksum = 0;
for (size_t i = 0; i < payload_len; i++)
    cksum += payload[i];   // 8-bit overflow가 곧 % 256
```

`g`의 ASCII 값은 `0x67`이므로 와이어 위 패킷은 `$g#67`입니다. 실제 로그에도 `Sending packet: $g#67`이 그대로 찍힙니다.

### ACK 핸드셰이크

![RSP ACK / NACK 핸드셰이크](/images/blog/tools/diagrams/rsp-handshake.svg)

패킷을 받은 쪽은 먼저 `+`(정상 수신) 또는 `-`(재전송 요청)로 답합니다. 매뉴얼은 이 장치를 *시리얼선 같은 신뢰할 수 없는 전송*을 위한 것이라고 설명합니다([E.12 Packet Acknowledgment](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Packet-Acknowledgment.html)).

GDB와 gdbserver 사이에 TCP 프록시를 끼워 와이어 바이트를 그대로 떠 보면, 패킷마다 `+`가 붙어 오가는 모습이 보입니다(`->`는 GDB가 보낸 바이트, `<-`는 받은 바이트).

```text
-> +$vCont?#49
<- +$vCont;c;C;t;s;S;r#be
-> +$vMustReplyEmpty#3a
<- +$#00
```

GDB 쪽 디버그 로그에서는 같은 장면이 `Received Ack` 한 줄로 보입니다.

### NoAck 모드

TCP처럼 전송 자체가 신뢰할 수 있으면 `+`/`-`는 중복입니다. 스텁이 `qSupported` 응답에 `QStartNoAckMode+`를 넣으면 GDB가 `QStartNoAckMode`를 보내고, 스텁이 `OK`로 답한 뒤부터 양쪽 모두 ACK를 생략합니다. 매뉴얼은 GDB가 그 `OK`에 마지막 `+`를 하나 더 보낸다고 적고 있는데, 와이어 로그가 정확히 그렇습니다.

```text
-> +$QStartNoAckMode#b0
<- +$OK#9a
-> +$!#21
<- $OK#9a
```

`$!#21` 앞의 `+`가 그 마지막 ACK이고, 그 다음 응답 `$OK#9a`부터는 `+`가 붙지 않습니다. 체크섬은 NoAck 모드에서도 계속 붙습니다(수신 측이 무시해도 됩니다).

다만 NoAck는 스텁이 제안해야 켜집니다. QEMU 11.1.3의 `qSupported` 응답에는 `QStartNoAckMode+`가 없어서, QEMU와의 세션은 끝까지 패킷마다 ACK를 주고받았습니다. 반대로 GDB 쪽에서 협상을 끄려면 `set remote noack-packet off`를 쓰며, 이 설정은 *다음 연결부터* 적용됩니다.

## 첫 번째 트래픽 보기

QEMU를 `-s -S`(gdbstub을 1234에 열고 첫 명령 전에 정지)로 띄우고 `target remote`로 붙었을 때 GDB가 보낸 첫 요청들입니다. 출력은 일부 줄만 골랐고, 줄 자체는 고치지 않았습니다.

```text
(gdb) set debug remote 1
(gdb) target remote 10.0.2.2:1234
  [remote] Sending packet: $qSupported:multiprocess+;swbreak+;hwbreak+;qRelocInsn+;fork-events+;vfork-events+;exec-events+;vContSupported+;QThreadEvents+;QThreadOptions+;no-resumed+;memory-tagging+;xmlRegisters=i386;error-message+#14
  [remote] Received Ack
  [remote] Packet received: PacketSize=20020;qXfer:features:read+;vContSupported+;multiprocess+
  [remote] Sending packet: $vCont?#49
  [remote] Packet received: vCont;c;C;s;S
  [remote] Sending packet: $vMustReplyEmpty#3a
  [remote] Packet received: 
  [remote] Sending packet: $Hgp0.0#ad
  [remote] Packet received: OK
  [remote] Sending packet: $qXfer:features:read:target.xml:0,1000#0c
  ...
  [remote] Sending packet: $?#3f
  [remote] Packet received: T05core:01;
  [remote] Sending packet: $qfThreadInfo#bb
  [remote] Packet received: mp01.01
  [remote] Sending packet: $qsThreadInfo#c8
  [remote] Packet received: l
  [remote] Sending packet: $qAttached:1#fa
  [remote] Packet received: 1
  [remote] Sending packet: $Hc-1#09
  [remote] Packet received: OK
  [remote] Sending packet: $qC#b4
  [remote] Packet received: QCp01.01
```

흐름은 이렇습니다. 먼저 `qSupported`로 서로의 기능을 맞추고, `vCont?`로 지원하는 실행 제어 동작을 묻고, `qXfer:features:read`로 레지스터 정의(target description)를 받습니다. 그 다음 `?`로 *지금 왜 멈춰 있는지*, `qfThreadInfo`/`qsThreadInfo`로 스레드 목록, `qC`로 현재 스레드를 확인합니다. `vMustReplyEmpty`는 스텁이 모르는 패킷에 빈 응답을 돌려주는지 확인하는 시험 요청이고, 실제로 빈 응답이 왔습니다.

LLDB에서 같은 로그를 보려면 `log enable -f <파일> gdb-remote packets`를 씁니다. GDB의 `set logging`은 GDB 명령이라 LLDB에서는 쓰지 않습니다.

## 자주 쓰이는 패킷 카탈로그

### 1. 정지 사유 보고 — `?`

`?`에 대한 응답이 *stop reply*입니다. 형식은 [E.3 Stop Reply Packets](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Stop-Reply-Packets.html)에 정의돼 있습니다.

| 응답 | 의미 (매뉴얼 기준) |
|------|------|
| `S AA` | 시그널 AA로 정지. `n:r` 쌍이 없는 `T`와 같음 |
| `T AA n1:r1;n2:r2;...` | 시그널 AA로 정지, 추가 정보를 키:값으로 붙임 |
| `W AA` | 프로세스가 종료 코드 AA로 끝남 |
| `X AA` | 프로세스가 시그널 AA로 끝남 |
| `N` | 프로세스는 살아 있지만 *재개된 스레드가 하나도 남지 않음* |

이번 세션에서 실제로 받은 응답은 다음과 같습니다.

| 상황 | 받은 응답 |
|------|-----------|
| QEMU에 처음 붙음 | `T05core:01;` |
| QEMU에서 브레이크포인트 도달 | `T05thread:p01.01;` |
| QEMU에서 쓰기 watchpoint 도달 | `T05thread:p01.01;watch:20000000;` |
| gdbserver `--multi`, 아직 프로세스 없음 | `W00` |
| gdbserver에서 브레이크포인트 도달 | `T05swbreak:;1d:f0f7ffffffff0000;1f:f0f7ffffffff0000;20:2005fcf7ffff0000;thread:p93a.93a;core:1;` |

gdbserver의 응답에는 `1d`·`1f`·`20` 같은 *레지스터 번호:값* 쌍이 섞여 있습니다. 정지 직후 GDB가 꼭 필요로 하는 레지스터(AArch64에서는 x29, sp, pc)를 미리 실어 보내 `g` 요청 하나를 아끼는 방식입니다. 또 gdbserver는 `swbreak:`를 붙였고 QEMU는 붙이지 않았습니다. 이 차이는 협상에서 나옵니다. GDB가 `swbreak+;hwbreak+`를 제안했을 때 gdbserver는 응답에 `swbreak+;hwbreak+`를 넣었고, QEMU 응답에는 없었습니다.

`T` 응답에 붙을 수 있는 키 가운데 자주 보는 것들입니다(모두 E.3에 정의).

| 키 | 의미 |
|----|------|
| `thread:<id>` | 정지한 스레드 ID |
| `core:<n>` | 그 스레드가 돌던 코어 |
| `watch:<addr>` / `rwatch:<addr>` / `awatch:<addr>` | 쓰기·읽기·접근 watchpoint가 걸린 주소 |
| `swbreak:` / `hwbreak:` | 소프트웨어·하드웨어 브레이크포인트로 정지 |
| `library:` | 공유 라이브러리 목록이 바뀜 |
| `fork:<id>` / `vfork:<id>` / `exec:<file>` | 자식 프로세스·exec 이벤트 |
| `replaylog:begin` / `replaylog:end` | 기록된 실행을 재생하다 로그의 처음·끝에 닿음 |

### 2. 모든 레지스터 — `g` / `G`

`g` 응답은 레지스터 값을 *타깃 바이트 순서대로* 16진으로 늘어놓은 것입니다. QEMU Cortex-M4에서 리셋 직후 받은 응답입니다.

```text
[remote] Sending packet: $g#67
[remote] Packet received: 0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008240020ffffffff4400000800000041
```

리틀 엔디언이므로 끝부분을 4바이트씩 뒤집어 읽습니다. `08240020`은 SP `0x20002408`, `ffffffff`는 LR, `44000008`은 PC `0x08000044`(`Reset_Handler`), `00000041`은 xPSR `0x41000000`입니다. 같은 시점에 `info registers pc sp`가 `pc 0x8000044 <Reset_Handler>`, `sp 0x20002408`을 보여 줬으니 해석이 맞습니다.

이 바이트열의 레지스터 순서와 크기는 `qXfer:features:read`로 받은 target description이 정합니다. QEMU가 보낸 XML에는 `org.gnu.gdb.arm.m-system` feature 안에 `<reg name="msp" bitsize="32" regnum="43" type="int"/>` 같은 정의가 있었습니다. `G`는 같은 형식으로 전체를 쓰는 요청입니다.

### 3. 한 레지스터 — `p` / `P`

`p n`은 레지스터 번호 n 하나를 읽습니다. 위 target description에서 MSP가 `regnum="43"`(0x2b), PSP가 44(0x2c)였는데, 브레이크포인트에서 멈춘 직후 GDB가 정확히 그 둘을 따로 읽었습니다.

```text
[remote] Sending packet: $p2b#04
[remote] Packet received: f8230020
[remote] Sending packet: $p2c#05
[remote] Packet received: 00000000
```

MSP는 `0x200023f8`, PSP는 0입니다. 이 펌웨어는 PSP를 쓰지 않으니 맞는 값입니다. 레지스터 번호는 아키텍처마다 고정된 표가 아니라 target description의 `regnum`(생략하면 앞 레지스터 번호 + 1)을 따릅니다.

### 4. 메모리 — `m` / `M` / `x` / `X`

`m addr,length`는 메모리를 16진으로 읽습니다. 리셋 직후 `.data` 변수 `counter`(0x20000000)를 읽으면 아직 startup 코드가 초기값을 복사하기 전이라 0이 나옵니다.

```text
[remote] Sending packet: $m20000000,4#4f
[remote] Packet received: 00000000
```

브레이크포인트를 지나 `Reset_Handler`가 복사를 마친 뒤에는 `2a000000`, 즉 42가 읽혔습니다.

읽을 수 없는 주소면 오류 응답이 옵니다. netduinoplus2 모델에서 매핑되지 않은 0x60000000을 읽었을 때입니다.

```text
0x60000000:	[remote] Sending packet: $m60000000,4#53
[remote] Packet received: E14
Cannot access memory at address 0x60000000
```

`E14`의 숫자는 프로토콜이 의미를 정하지 않습니다. 매뉴얼은 "거의 모든 경우 오류 번호의 의미를 정하지 않으며 GDB는 대개 무시한다"고 적고 있습니다([E.2 Standard Replies](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Standard-Replies.html)). 같은 절에 텍스트 오류 응답 `E.errtext`도 정의돼 있고, GDB 16.3은 `qSupported`에 `error-message+`를 실어 이를 받을 수 있다고 알립니다.

#### 바이너리 형식 — `X`와 `x`

`M`은 데이터 1바이트를 16진 두 글자로 보냅니다. `X addr,length:XX…`는 같은 쓰기를 *바이너리*로 보내므로 와이어 위 길이가 약 절반입니다. 읽기 쪽에도 바이너리 형식 `x addr,length`가 있으며, 스텁이 `qSupported`에 `binary-upload+`를 넣었을 때만 GDB가 씁니다. gdbserver 16.3은 `binary-upload+`를 광고했고, 실제로 GDB는 `$xfffff7ec924c,4#d7`처럼 `x`로 메모리를 읽었습니다. 응답은 `b` 뒤에 원시 바이트가 오는 형식입니다.

바이너리 데이터 안의 `#`·`$`·`}`(그리고 스텁이 보내는 응답에서는 `*`까지)는 escape해야 합니다. 규칙은 아래 escape 절에서 다룹니다.

### 5. 실행 제어 — `c` / `s` / `vCont`

`c`(continue)와 `s`(step)는 단일 스레드 타깃을 위한 단순 명령입니다. 매뉴얼은 멀티스레드 타깃을 다루는 스텁이라면 `vCont`를 지원해야 한다고 적고 있고, GDB 16.3은 두 스텁 모두에서 `vCont`를 썼습니다.

```text
[remote] Sending packet: $vCont;c:p1.-1#0f      ← 프로세스 1의 모든 스레드 continue
[remote] Sending packet: $vCont;s:p1.1#f2       ← 스레드 1.1만 한 명령 step
```

스레드 ID는 `p<pid>.<tid>` 형식이고 `-1`은 "전부"입니다. 스텁이 어떤 동작을 지원하는지는 `vCont?`로 묻습니다. 두 스텁의 답이 달랐습니다.

| 스텁 | `vCont?` 응답 |
|------|---------------|
| QEMU 11.1.3 | `vCont;c;C;s;S` |
| gdbserver 16.3 | `vCont;c;C;t;s;S;r` |

`t`는 스레드 정지, `r start,end`는 PC가 그 범위를 벗어날 때까지 step하는 *range step*입니다([E.4 Packets](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Packets.html)의 `vCont` 항목). QEMU 11.1.3은 둘 다 광고하지 않았습니다.

### 6. 브레이크포인트 — `Z` / `z`

`Z type,addr,kind`에서 type 0은 소프트웨어 BP, 1은 하드웨어 BP, 2·3·4는 쓰기·읽기·접근 watchpoint입니다. `kind`는 아키텍처가 정하는데, ARM은 [ARM Breakpoint Kinds](https://sourceware.org/gdb/current/onlinedocs/gdb.html/ARM-Breakpoint-Kinds.html)에서 다음과 같이 정의합니다.

| kind | 의미 |
|------|------|
| 2 | 16-bit Thumb 명령 위치 |
| 3 | 32-bit Thumb(Thumb-2) 명령 위치 |
| 4 | 32-bit ARM 명령 위치 |

실제 세션에서 두 kind가 모두 나왔습니다.

```text
Breakpoint 1 at 0x80000a8: file main.c, line 7.
[remote] Sending packet: $Z0,80000a8,3#a6
[remote] Packet received: OK
...
Hardware assisted breakpoint 2 at 0x8000128: file sensor.c, line 5.
[remote] Sending packet: $Z1,8000128,2#78
[remote] Packet received: OK
...
Hardware watchpoint 3: counter
[remote] Sending packet: $Z2,20000000,4#9a
[remote] Packet received: OK
```

`worker`의 첫 명령은 `push.w`라 4바이트(`2de9f041`)여서 kind 3이 갔고, `sensor_read`의 첫 명령은 16비트(`044b`)라 kind 2가 갔습니다. GDB는 `Z0`을 보내기 직전에 `$m80000a8,2`로 그 위치의 명령을 먼저 읽어 길이를 판단했습니다.

로그에는 한 가지 흥미로운 순서도 남았습니다. `worker`의 BP에 멈춘 상태에서 `continue`하면 GDB는 곧바로 `vCont;c`를 보내지 않고 *먼저 BP를 빼고 한 명령 step한 뒤 다시 넣고* continue합니다.

```text
[remote] Sending packet: $vCont;s:p1.1#f2
  [remote] Packet received: T05thread:p01.01;
[remote] Sending packet: $Z0,80000a8,3#a6
[remote] Packet received: OK
[remote] Sending packet: $vCont;c:p1.-1#0f
```

BP가 걸린 명령 위에서 그대로 재개하면 같은 BP에 즉시 다시 걸리기 때문입니다. 정지할 때마다 GDB는 `z0`·`z1`로 BP를 모두 빼고, 재개할 때 다시 넣었습니다.

QEMU에서 `Z1`이 `OK`를 받은 것은 QEMU가 하드웨어 BP를 에뮬레이터 안에서 흉내 내기 때문입니다. 실제 Cortex-M에서는 같은 `Z1`이 스텁 쪽에서 FPB 비교기 하나로 바뀝니다. OpenOCD의 `cortex_m_set_breakpoint()`(`src/target/cortex_m.c`)는 빈 비교기가 없으면 `Can not find free FPB Comparator!`를 남기고 `ERROR_TARGET_RESOURCE_NOT_AVAILABLE`을 돌려주며, `gdb_breakpoint_watchpoint_packet()`(`src/server/gdb_server.c`)이 이를 오류 응답으로 GDB에 보냅니다. FPB는 다음 장에서 다룹니다. 매뉴얼은 스텁이 모르는 `Z` type에는 빈 응답을 돌려줘야 한다고 정합니다.

### 7. 스레드 — `H` / `T` / `qfThreadInfo` / `qXfer:threads`

| 요청 → 응답 (실제 로그) | 동작 |
|-------------|------|
| `$Hgp0.0` → `OK` | 이후 `g`/`p`가 읽을 스레드 선택(`0`은 아무 스레드) |
| `$Hc-1` → `OK` | 이후 `c`/`s`가 다룰 스레드 선택(`-1`은 전부) |
| `$qfThreadInfo` → `mp01.01` | 스레드 목록 첫 페이지 |
| `$qsThreadInfo` → `l` | 다음 페이지 없음(소문자 L) |
| `$qC` → `QCp01.01` | 현재 스레드 |
| `$Tp93a.93b` → `OK` | 그 스레드가 살아 있는지 확인 |

QEMU는 CPU 하나를 스레드 하나로 보여 주므로 `info threads`가 `Thread 1.1 (CPU#0 [running])` 한 줄입니다.

gdbserver에서는 GDB 16.3이 `qfThreadInfo` 대신 `qXfer:threads:read`로 스레드 목록을 XML로 한 번에 받았습니다. 스레드 두 개를 만든 Linux 프로그램에서 받은 응답입니다.

```text
[remote] Sending packet: $qXfer:threads:read::0,1000#92
[remote] Packet received: l<threads>\n<thread id="p93a.93a" core="1" name="thr" handle="2000fff7ffff0000"/>\n<thread id="p93a.93b" core="0" name="thr" handle="80f1def7ffff0000"/>\n<thread id="p93a.93c" core="3" name="thr" handle="80f15df7ffff0000"/>\n</threads>\n
```

`info threads`의 세 줄(`Thread 2362.2362`, `.2363`, `.2364`)이 이 XML에서 나옵니다. 0x93a는 10진 2362입니다. 이후 스레드마다 `Hgp93a.93b`로 문맥을 바꾸고 `g`로 레지스터를 읽어 각 스레드의 현재 프레임을 찍었습니다.

### 8. 능력 협상 — `qSupported`

연결 직후 첫 패킷이 `qSupported`입니다. GDB가 자기 기능을 나열하면 스텁이 자기 기능을 답합니다. 같은 GDB 16.3에 대해 두 스텁이 돌려준 응답 전체입니다.

QEMU 11.1.3:

```text
PacketSize=20020;qXfer:features:read+;vContSupported+;multiprocess+
```

gdbserver 16.3:

```text
PacketSize=2001f;QPassSignals+;QProgramSignals+;QStartupWithShell+;QEnvironmentHexEncoded+;QEnvironmentReset+;QEnvironmentUnset+;QSetWorkingDir+;binary-upload+;QCatchSyscalls+;qXfer:libraries-svr4:read+;augmented-libraries-svr4-read+;qXfer:auxv:read+;qXfer:siginfo:read+;qXfer:siginfo:write+;qXfer:features:read+;QStartNoAckMode+;qXfer:osdata:read+;multiprocess+;fork-events+;vfork-events+;exec-events+;QNonStop+;QDisableRandomization+;qXfer:threads:read+;ConditionalTracepoints+;TraceStateVariables+;TracepointSource+;DisconnectedTracing+;FastTracepoints+;StaticTracepoints+;InstallInTrace+;qXfer:statictrace:read+;qXfer:traceframe-info:read+;EnableDisableTracepoints+;QTBuffer:size+;tracenz+;ConditionalBreakpoints+;BreakpointCommands+;QAgent+;swbreak+;hwbreak+;qXfer:exec-file:read+;vContSupported+;QThreadOptions=3;QThreadEvents+;no-resumed+
```

`name+`는 지원, `name-`는 미지원, `name=value`는 값이 있는 feature입니다. 베어메탈 에뮬레이터는 레지스터 정의와 기본 실행 제어만 광고했고, Linux 프로세스용 gdbserver는 공유 라이브러리 목록·시그널 전달·fork 추적·tracepoint까지 광고했습니다. **이 한 줄이 그 스텁으로 할 수 있는 디버깅의 범위**입니다. QEMU에 `fork-events+`가 없으니 `catch fork`가 의미 없고, `QStartNoAckMode+`가 없으니 ACK 왕복이 끝까지 남습니다.

자주 보는 feature를 [E.4 General Query Packets](https://sourceware.org/gdb/current/onlinedocs/gdb.html/General-Query-Packets.html)의 `qSupported` 설명에 맞춰 정리하면 다음과 같습니다.

| feature | 의미 |
|---------|------|
| `PacketSize=<hex>` | 스텁이 받을 수 있는 packet-data 최대 바이트(프레임·체크섬 제외) |
| `multiprocess+` | `p<pid>.<tid>` 형식의 스레드 ID 사용 |
| `swbreak+` / `hwbreak+` | 정지 응답에 `swbreak:`/`hwbreak:` 사유 표시 |
| `vContSupported+` | 스텁이 `vCont`를 지원 |
| `qXfer:features:read+` | target description XML 제공 |
| `qXfer:libraries-svr4:read+` | 로드된 공유 라이브러리 목록 제공 |
| `qXfer:memory-map:read+` | flash/RAM 영역 정의 제공 |
| `qXfer:threads:read+` | 스레드 목록을 XML로 제공 |
| `QStartNoAckMode+` | ACK 생략 모드 지원 |
| `QNonStop+` | non-stop 모드 지원 |
| `binary-upload+` | 바이너리 메모리 읽기 `x` 지원 |
| `fork-events+` / `vfork-events+` / `exec-events+` | 자식 프로세스·exec 이벤트 보고 |
| `ConditionalBreakpoints+` | 브레이크포인트 조건을 스텁이 평가 |
| `tracenz+` | tracepoint bytecode `tracenz`(문자열 수집) 지원 |
| `memory-tagging+` | 메모리 태그 접근 지원(GDB가 보내는 쪽 이름도 같음) |

### 9. 청크 전송 — `qXfer`

`qXfer:object:read:annex:offset,length`는 큰 XML을 조각으로 받습니다. 응답이 `m`으로 시작하면 *뒤에 더 있음*, `l`로 시작하면 *마지막 조각*입니다. gdbserver에서 AArch64 target description을 받을 때 실제로 세 번에 나눠 받았습니다(와이어 로그에서 발췌).

```text
-> $qXfer:features:read:target.xml:0,1000#0c
<- $m<?xml version="1.0"?>\n<!DOCTYPE target SYSTEM "gdb-target.dtd">\n<target>\n  <architecture>aarch64</architecture>...
-> $qXfer:features:read:target.xml:1000,1000#9d
<- $m>\n *"<field name="s" type="v2i"/>...
-> $qXfer:features:read:target.xml:2000,1000#9e
<- $l="v25" bitsize="128" type="aarch64v" regnum="59"/>...
```

QEMU는 반대로 `target.xml`이 다른 파일을 `xi:include`하는 구조라 `arm-m-profile.xml`, `arm-vfp.xml`, `system-registers.xml`, `arm-m-system.xml`을 차례로 따로 요청받았고, 모두 한 번에 `l`로 끝났습니다.

매뉴얼이 정의한 `qXfer` object 가운데 임베디드에서 중요한 것은 다음과 같습니다.

- `features` — target description(레지스터 정의).
- `memory-map` — flash/RAM/ROM 영역 정의.
- `threads` — 스레드 목록.
- `libraries-svr4` — 로드된 공유 라이브러리(Linux).
- `auxv`, `siginfo`, `exec-file` — Linux 프로세스 정보.

#### memory-map — flash가 어디 있는지 알려 주는 정보

[E.17 Memory Map Format](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Memory-Map-Format.html)이 정한 형식은 다음과 같습니다. 아래 주소와 크기는 STM32F405 같은 부품을 가정한 예입니다.

```xml
<memory-map>
  <memory type="flash" start="0x08000000" length="0x100000">
    <property name="blocksize">0x4000</property>
  </memory>
  <memory type="ram" start="0x20000000" length="0x20000"/>
</memory-map>
```

매뉴얼은 *flash에 쓰려면 GDB가 타깃의 memory map을 받아야 한다*고 적고, memory map에 없는 영역은 RAM으로 보고 일반 `M`/`X`로 쓴다고 설명합니다. 즉 GDB의 `load`가 flash 영역에 대해 `vFlashErase`·`vFlashWrite`를 쓰려면 스텁이 memory map을 제공해야 합니다. QEMU 11.1.3은 `qXfer:memory-map:read+`를 광고하지 않았고, `-kernel`로 이미 이미지를 올려 두므로 이 장에서 flash 쓰기는 다루지 않았습니다.

### 10. monitor — `qRcmd`

`monitor <cmd>`는 `qRcmd,<hex>` 패킷 하나로 바뀝니다. 명령 문자열은 16진으로 인코딩되고, 스텁은 최종 응답 전에 `O<hex>` 패킷으로 콘솔 출력을 여러 번 보낼 수 있습니다. QEMU에서 `monitor info registers`를 보냈을 때입니다.

```text
[remote] Sending packet: $qRcmd,696e666f20726567697374657273#5a
[remote] Packet received: O0d0a
[remote] Packet received: O43505523300d0a
[remote] Packet received: O5230303d3030303030303030205230313d3030303030303030205230323d3030303030303030205230333d30303030303030300d0a
...
[remote] Packet received: OK
```

`696e666f20726567697374657273`는 `info registers`, `43505523300d0a`는 `CPU#0\r\n`입니다. GDB 화면에는 디코딩된 `R00=00000000 R01=00000000 ...` 줄이 찍혔습니다. QEMU는 이렇게 받은 문자열을 자기 HMP 모니터 명령으로 처리했습니다. OpenOCD는 같은 경로로 Tcl 명령을, J-Link GDB Server는 자기 monitor 명령을 받습니다. 매뉴얼은 이 기능이 스텁의 인터프리터를 열어 주므로 *보안 영향이 있을 수 있다*고 따로 적어 두었습니다.

### 11. extended-remote — `!` / `vRun` / `vKill` / `D`

`target extended-remote`로 붙으면 GDB가 `!`로 extended 모드를 켜고, `run`이 `vRun`이 됩니다. 인자(실행 파일 경로)는 16진입니다.

```text
[remote] Sending packet: $vRun;2f726f6f742f636830312f746872#9a
[remote] Packet received: T051d:0000000000000000;1f:50fcffffffff0000;20:c092fdf7ffff0000;thread:p93a.93a;core:1;
...
[remote] Sending packet: $vKill;93a#0a
[remote] Packet received: OK
```

`2f726f6f742f...`은 `/root/ch01/thr`입니다. `detach`는 `D`가 되며, QEMU 세션 끝에서 `$D;1#b0` → `OK`를 받았습니다.

## 와이어 위의 RLE

RSP 응답은 반복 문자를 *run-length encoding*으로 줄일 수 있습니다. 반복할 문자 뒤에 `*`와 *반복 횟수 + 29*에 해당하는 문자 하나를 붙이는 방식입니다. 매뉴얼의 예로 `0* `는 `0000`입니다. 공백(32)에서 29를 빼면 3이므로 앞의 `0`을 3번 더 붙입니다. 매뉴얼은 `#`(6회)과 `$`(7회)은 count 문자로 쓰면 안 되고, 126보다 큰 값도 쓰지 않는다고 정합니다.

GDB의 `set debug remote` 로그는 RLE를 *이미 푼 뒤의* 내용을 보여 줍니다. 그래서 와이어를 직접 떠야 RLE가 보입니다. gdbserver가 `$g#67`에 답한 실제 바이트입니다.

```text
<- $0*}0*}0*}0*}0*}0*'50fcf*"ff0* c092fdf7f* 0*"10*}0*}0*}0*}0*}0*}0*}0*}0*}0*}0*s7f0**7f0*>#25
```

`}`는 125이므로 `0*}`는 `0` 뒤에 96개를 더 붙인 `0` 97개입니다. 이 패킷을 Node로 풀어 체크섬을 검증하면 다음과 같습니다.

```text
wire chars 88 -> decoded hex chars 1640 = 820 bytes
```

와이어 위 88글자가 레지스터 820바이트(16진 1640글자)를 실어 나른 셈입니다. 체크섬은 RLE를 *풀기 전* 와이어 문자로 계산하며, 위 패킷의 `#25`가 그 값과 일치했습니다.

## escape — `}` 메타바이트

`X`나 `x`처럼 바이너리 데이터를 싣는 패킷에서는 프로토콜 메타 바이트를 escape합니다. 규칙은 E.1에 있습니다.

- escape 문자는 `}`(0x7d)이고, 원래 바이트를 0x20과 XOR해 뒤에 붙입니다.
- `#`(0x23), `$`(0x24), `}`(0x7d)는 항상 escape합니다.
- 스텁이 보내는 응답은 RLE 시작으로 오해되지 않게 `*`(0x2a)도 escape합니다.

예를 들어 0x7d는 `0x7d 0x5d`, 0x23은 `0x7d 0x03`으로 나갑니다. 자체 스텁을 만들 때 가장 자주 빠뜨리는 부분이 이 디코더입니다.

## PacketSize 해석

`PacketSize`는 *스텁이 받을 수 있는* packet-data 크기이며, 프레임(`$`, `#`, 체크섬)은 포함하지 않습니다. 매뉴얼은 GDB가 이보다 큰 패킷을 *보내지 않는다*고 정하고, 스텁이 이 feature를 주지 않으면 GDB가 `g` 응답 크기로 추정한다고 설명합니다. 값은 16진이므로 QEMU의 `20020`은 131104, gdbserver의 `2001f`는 131103바이트입니다.

hex로 메모리를 쓰는 `M`은 데이터 1바이트에 두 글자가 들므로, 한 패킷에 실을 수 있는 데이터는 `PacketSize`의 절반보다 조금 적습니다(`M`, 주소, 쉼표, 길이, 콜론이 앞에 붙습니다).

## File-I/O — `F` 패킷

RSP에는 스텁이 *GDB에게* 호스트 시스템 콜을 부탁하는 방향의 확장도 있습니다([E.14 File-I/O Remote Protocol Extension](https://sourceware.org/gdb/current/onlinedocs/gdb.html/File_002dI_002fO-Remote-Protocol-Extension.html)). 요청 형식은 `Fcall-id,parameter…`이고, `write`라면 `Fwrite,fd,bufptr,count`입니다.

QEMU는 Arm semihosting 호출을 이 경로로 넘길 수 있습니다. 같은 펌웨어를 `-semihosting-config enable=on,target=gdb`로 띄우자, 펌웨어의 `SYS_WRITE0`(`"boot\n"` 출력)가 정지 응답 자리에 `F` 요청으로 나타났습니다.

```text
[remote] Sending packet: $vCont;c:p1.-1#0f
  [remote] Packet received: Fwrite,2,8000150,5
  [remote] Sending packet: $Hgp0.0#ad
  [remote] Packet received: OK
  [remote] Sending packet: $m8000150,5#2c
  [remote] Packet received: 626f6f740a
boot
  [remote] Sending packet: $F5#7b
```

스텁이 "fd 2에 0x08000150부터 5바이트를 써 달라"고 부탁하면, GDB가 `m`으로 그 5바이트(`626f6f740a` = `boot\n`)를 읽어 자기 쪽에 출력하고 `F5`(5바이트 씀)로 답합니다. `target=native`로 띄우면 QEMU가 직접 호스트에 출력하므로 이 패킷은 나오지 않습니다. 즉 semihosting이 `F` 패킷이 되는지는 *스텁 구현과 설정*에 달린 문제이며, OpenOCD나 J-Link는 6장에서 보듯 자기 쪽에서 semihosting을 처리합니다.

## 자체 스텁을 만들기 — 최소 구현

E.1 Overview는 스텁의 최소 요구를 직접 정해 둡니다. `?`, `g`/`G`, `m`/`M`은 필수이고, 단일 스레드 타깃은 `c`와(하드웨어 single-step이 있으면) `s`로 실행 제어를 할 수 있으며, 멀티스레드 타깃을 다루는 스텁은 `vCont`를 지원해야 합니다. 나머지는 모두 선택입니다.

| 패킷 | 매뉴얼상 위치 | 비고 |
|------|-------|------|
| `?` | 필수 | 정지 사유 |
| `g` / `G` | 필수 | 레지스터 |
| `m` / `M` | 필수 | 메모리 |
| `c` / `s` | 단일 스레드 타깃의 실행 제어 | `s`는 하드웨어 single-step이 있을 때 |
| `vCont` | 멀티스레드 타깃이면 지원 | `vCont?`로 지원 동작 광고 |
| `Z0` / `z0` | 선택 | 모르는 type이면 빈 응답 |
| `qSupported` | 선택 | 안 주면 GDB는 feature마다 정해진 기본값을 씀 |
| `qXfer:features:read` | 선택 | 레지스터 정의(target description) |
| `qXfer:memory-map:read` | 선택 | flash `load`에 필요 |
| `qRcmd` | 선택 | `monitor` 명령 |

QEMU 11.1.3의 짧은 `qSupported` 응답이 이 최소 구성의 좋은 실례입니다. 그 정도만으로도 위 세션의 BP·watchpoint·step이 모두 동작했습니다.

## 보안

RSP에는 인증이 없습니다. 연결만 되면 임의 메모리 읽기·쓰기와 실행 제어가 가능하고, `qRcmd`는 스텁의 인터프리터까지 엽니다. 위 실험에서 QEMU의 `-s`와 `gdbserver --multi :2345`는 둘 다 `*:포트`, 즉 모든 인터페이스에서 기다렸습니다.

- 외부에서 닿는 네트워크라면 방화벽으로 막습니다. OpenOCD의 기본 GDB 포트는 3333(`src/server/gdb_server.c`의 `gdb_port = strdup("3333")`)이고, 이 장의 gdbserver는 2345에 열었습니다.
- 원격 보드는 SSH 터널로만 붙습니다.
- QEMU는 `-gdb tcp:127.0.0.1:1234`처럼 주소를 지정하면 루프백에만 엽니다. 같은 펌웨어로 띄워 보니 `lsof`에 `TCP 127.0.0.1:1234 (LISTEN)`으로 나왔습니다.

## 실전 디버깅 — RSP 로그로 원인 찾기

### 사례 1. `Cannot access memory at address ...`

위 4절의 0x60000000처럼 스텁이 `E14`를 돌려준 경우입니다. 로그에서 *어떤 `m` 요청*이 실패했는지 보면, 주소 자체가 틀렸는지(심볼 해석 오류, 잘못된 포인터), 스텁이 그 영역에 접근할 수 없는지(전원이 꺼진 주변장치, 접근 권한)를 나눌 수 있습니다.

### 사례 2. 기능이 조용히 빠짐

`catch fork`가 반응하지 않거나 `info threads`가 한 줄만 나온다면, 먼저 `qSupported` 응답을 봅니다. QEMU 세션처럼 `fork-events+`나 `qXfer:threads:read+`가 아예 없다면 GDB 설정이 아니라 스텁의 범위 문제입니다.

### 사례 3. `continue`가 돌아오지 않음

`vCont;c` 뒤로 정지 응답이 오지 않으면 타깃이 정말로 계속 실행 중인지부터 확인합니다. 이 장의 첫 실험에서 `counter++`만 도는 무한 루프에 `watch counter`를 걸고 `continue`했더니 정지 응답이 오지 않았습니다. `-O1`로 빌드한 그 루프는 `counter`를 레지스터에만 두고 메모리에 다시 쓰지 않아 watchpoint가 걸릴 일이 없었습니다. 스텁이 응답하지 않는 것과 타깃이 멈출 이유가 없는 것은 로그만으로 구분됩니다. 앞쪽이라면 `vCont;c`의 ACK(`+`)조차 오지 않습니다.

### 사례 4. flash 주소에 `load`가 실패

memory map이 없으면 GDB는 flash 영역도 RAM으로 보고 `M`/`X`로 씁니다. flash 컨트롤러를 거치지 않은 쓰기는 반영되지 않습니다. 스텁의 `qSupported`에 `qXfer:memory-map:read+`가 있는지, OpenOCD라면 `flash banks`에 해당 영역이 등록돼 있는지 확인합니다.

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

Node 24.21.0에서 `node rsp-check.mjs`를 실행하면 `PASS checksum, escaping, RLE, corrupt and truncated inputs`가 출력됩니다. `$g#67`·`$!#21`·`$#00`은 위 실제 로그에 나온 패킷과 같은 바이트입니다. 이 코드는 설명한 경계 검사용이며 production RSP parser가 아닙니다.

RSP가 프로브를 거쳐 타깃의 디버그 회로로 이어지는 과정은 다음 장 [JTAG·SWD·CoreSight](/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight)에서 다룹니다.
