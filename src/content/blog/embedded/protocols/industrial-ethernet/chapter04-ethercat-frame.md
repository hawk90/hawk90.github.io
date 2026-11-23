---
title: "EtherCAT 프레임 구조 분석 — Datagram·WKC·Address 모드"
slug: "embedded/protocols/industrial-ethernet/chapter04-ethercat-frame"
date: 2026-05-13T09:04:00
description: "EtherCAT 프레임 헤더·datagram·명령 코드·WKC·mailbox 헤더를 Beckhoff ESC 데이터시트로 정리하고, SOEM이 veth로 보낸 실제 프레임과 합성 LRW·CoE 프레임을 tshark와 Node parser로 풉니다."
series: "Industrial Ethernet 심화"
seriesOrder: 4
tags: [ethercat, frame, datagram, wkc]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **"EtherCAT 프레임은 표준 Ethernet 프레임 안에 *여러 개의 datagram*을 *체인*으로 담는다. 각 datagram에는 *명령·주소·데이터·WKC*가 있다."** WKC(Working Counter)는 슬레이브들이 그 datagram을 몇 번 성공적으로 처리했는지 마스터에 알려 주는 카운터입니다.

EtherCAT은 표준 Ethernet 위에 *자기 EtherType*을 얹습니다. TCP/IP를 거치지 않는 L2 통신입니다. 그 안에 *datagram chain*이 들어 있고, 각 datagram이 명령 하나를 나타냅니다. 기차에 비유하면 Ethernet 프레임은 기관차와 차량 전체, datagram은 칸 하나하나, WKC는 각 칸 끝에 달린 "몇 역에서 짐을 내리고 실었는지" 세는 계수기입니다.

이 장은 Beckhoff ESC 데이터시트 Section I v2.3의 2장을 바탕으로 프레임의 *바이트 단위 구조*를 정리합니다. 그다음 Debian VM에서 SOEM v1.4.0이 실제로 보낸 프레임과 손으로 만든 LRW·CoE 프레임을 veth로 보내고, tshark 4.0.17의 EtherCAT dissector와 Node.js parser로 같은 바이트를 읽어 봅니다.

## Ethernet 프레임 안에 EtherCAT

![EtherCAT 프레임 — Ethernet II에서 시작하여 Payload가 EtherCAT Header + Datagram chain으로 확장되고, 각 datagram은 Cmd/Idx/Address/Len/IRQ/Data/WKC 구조](/images/blog/industrial-ethernet/diagrams/ch04-ethercat-frame.svg)

EtherType `0x88A4`가 EtherCAT의 시그니처입니다. SOEM v1.4.0도 `ethercattype.h` 459행에 `ETH_P_ECAT 0x88A4`를 정의하고, Linux에서 이 값으로 raw socket을 엽니다.

EtherCAT header는 2 byte입니다(데이터시트 Figure 2, Table 2). little-endian으로 읽은 16 bit 값의 비트 배치는 다음과 같습니다.

```text
EtherCAT Header (2 byte, little-endian)
  bit 15-12: Type     (0x1 = EtherCAT command)
  bit 11   : Reserved (0)
  bit 10-0 : Length   (뒤따르는 datagram chain의 byte 수, FCS 제외)
```

데이터시트는 ESC가 Type 0x1만 지원한다고 적고, header의 Length는 ESC가 무시하고 datagram 안의 길이 필드만 따른다고 주석을 답니다. SOEM은 이 값을 `EC_ECATTYPE 0x1000`(60행)으로 둡니다. 같은 Figure 2는 EtherCAT을 UDP/IP 안에 넣는 방식(UDP 목적지 포트 0x88A4)도 정의합니다. 이 글은 VLAN 태그 없는 Ethernet II 형식만 다룹니다.

## Datagram 구조

datagram은 10 byte header, 0~1486 byte data, 2 byte WKC로 이루어집니다(데이터시트 Figure 3, Table 3).

| 필드 | 크기 | 의미 |
|---|---|---|
| Cmd | 1 B | 명령 코드 (다음 표) |
| Idx | 1 B | 마스터가 중복·손실 datagram을 식별하는 번호. 슬레이브는 바꾸지 않습니다. |
| Address | 4 B | 명령에 따라 position+offset, station address+offset, 또는 32 bit logical address |
| Len | 11 bit | 뒤따르는 data 길이 |
| R | 3 bit | Reserved, 0 |
| C | 1 bit | Circulating frame. 프레임이 한 바퀴 돌았으면 1 |
| M | 1 bit | More. 뒤에 datagram이 더 있으면 1, 마지막이면 0 |
| IRQ | 2 B | 모든 슬레이브의 EtherCAT Event Request를 logical OR한 값 |
| Data | n B | 읽기/쓰기 데이터 |
| WKC | 2 B | Working Counter |

data의 최대 길이 1486 byte는 SOEM의 `EC_MAXLRWDATA`(54행) 정의로도 맞춰 볼 수 있습니다. `EC_MAXECATFRAME - 14 - 2 - 10 - 2 - 4`, 즉 1518에서 Ethernet header 14, EtherCAT header 2, datagram header 10, WKC 2, FCS 4를 뺀 값입니다.

## 명령 코드 — 핵심 표

명령 코드는 *주소 모드*와 *동작*의 조합입니다. 데이터시트 Table 6의 값입니다.

| Cmd | 이름 | 주소 모드 | 동작 |
|---|---|---|---|
| 0x00 | NOP | - | 슬레이브가 무시 |
| 0x01 | APRD | Auto Increment | Read |
| 0x02 | APWR | Auto Increment | Write |
| 0x03 | APRW | Auto Increment | Read+Write |
| 0x04 | FPRD | Configured Station Address | Read |
| 0x05 | FPWR | Configured Station Address | Write |
| 0x06 | FPRW | Configured Station Address | Read+Write |
| 0x07 | BRD | Broadcast | Read (메모리 값과 datagram 값의 OR) |
| 0x08 | BWR | Broadcast | Write |
| 0x09 | BRW | Broadcast | Read+Write |
| 0x0A | LRD | Logical | Read |
| 0x0B | LWR | Logical | Write |
| 0x0C | LRW | Logical | Read+Write |
| 0x0D | ARMW | Auto Increment | 주소가 0인 슬레이브는 Read, 나머지는 Write |
| 0x0E | FRMW | Configured Station Address | 주소가 일치하면 Read, 나머지는 Write |

주소 모드는 네 가지입니다(데이터시트 2.3절).

- **Auto Increment (AP)**: 마스터가 position을 *음수*로 넣으면 각 슬레이브가 지나가며 1씩 더하고, 값이 0이 된 슬레이브가 명령을 실행합니다. 데이터시트는 시작 시 망을 훑을 때와 새로 붙은 슬레이브를 찾을 때만 쓰라고 권합니다. 링크가 잠시 끊겼다 붙으면 position이 밀리기 때문입니다.
- **Configured Station Address (FP)**: 마스터가 시작 때 배정한 station address, 또는 마스터가 활성화한 경우 SII EEPROM에 저장된 alias로 슬레이브를 고릅니다. 이미 식별한 장치의 레지스터에 개별 접근할 때 씁니다.
- **Broadcast (B)**: 모든 슬레이브가 실행합니다. 초기화와 상태 일괄 확인에 씁니다.
- **Logical (L)**: FMMU 설정과 맞는 32 bit 논리 주소를 가진 슬레이브가 실행합니다. process data에 씁니다.

디바이스 주소 모드의 offset은 슬레이브의 16 bit 로컬 주소 공간을 가리킵니다. 0x0000~0x0FFF는 레지스터, 0x1000~0xFFFF는 process memory입니다.

## Working Counter (WKC) — 응답 채널

WKC는 *datagram 끝의 2 byte 카운터*입니다. 마스터가 0으로 보내고, 슬레이브의 ESC가 하드웨어로 증가시킵니다. 데이터시트 Table 5의 규칙입니다.

| 명령 | 결과 | 증가량 |
|------|------|------|
| Read | 성공 | +1 |
| Write | 성공 | +1 |
| ReadWrite | read만 성공 | +1 |
| ReadWrite | write만 성공 | +2 |
| ReadWrite | 둘 다 성공 | +3 |
| 모든 명령 | 실패 | 변화 없음 |

여기서 "성공"은 주소가 그 ESC를 가리키고, 해당 메모리에 접근할 수 있었다는 뜻입니다(2.4절). 같은 절은 multi-byte datagram에서 한 byte나 한 bit라도 성공하면 WKC가 오르므로, WKC만으로는 전부 성공했는지 일부만 성공했는지 알 수 없다고 적습니다.

마스터는 *기대 WKC*를 계산해 두고 응답과 비교합니다. 예를 들어 16대가 모두 같은 LRW 안에 출력 FMMU와 입력 FMMU를 하나씩 가지면 기대 WKC는 16 × 3 = 48입니다.

- 응답이 45면 가중 증가량이 3 모자랍니다. 한 대가 통째로 빠졌을 수도, 세 대가 각각 read만 실패했을 수도 있습니다. 부족량만으로는 몇 대가 실패했는지 모릅니다.
- WKC가 0이면 성공한 접근이 하나도 없다는 뜻입니다. 프레임이 아예 돌아오지 않은 경우와는 구별됩니다. 그 경우 마스터는 응답 자체를 받지 못해 timeout을 봅니다.

어느 슬레이브가 문제인지는 WKC가 알려 주지 않으므로, 개별 FPRD로 AL Status(0x0130) 등을 읽어 찾습니다.

SOEM은 WKC를 *슬레이브 수 세기*에도 씁니다. `ecx_detect_slaves()`(`ethercatconfig.c` 128~133행)는 모든 슬레이브를 Init으로 돌리는 BWR을 보낸 뒤, 레지스터 0x0000(`ECT_REG_TYPE`)에 BRD를 보내고 돌아온 WKC를 그대로 슬레이브 수로 씁니다. BRD에서는 모든 슬레이브가 WKC를 1씩 올리기 때문입니다.

## 실제 프레임 — SOEM이 veth로 보낸 것

이 동작을 실제 바이트로 보겠습니다. Debian 12 VM(QEMU/HVF, kernel 6.1.0-56-arm64)에서 SOEM v1.4.0을 빌드하고(빌드 과정은 [Ch 5](/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master)), veth 한 쌍(`veth0`↔`veth1`)을 만든 뒤 `slaveinfo veth0`을 실행하면서 `veth1`에서 tshark로 잡았습니다. 반대편에 슬레이브가 없으므로 프레임은 돌아오지 않습니다.

```text
$ ./soem-build/test/linux/slaveinfo/slaveinfo veth0
SOEM (Simple Open EtherCAT Master)
Slaveinfo
Starting slaveinfo
ec_init on veth0 succeeded.
No slaves found!
End slaveinfo, close socket
End program
```

`veth1`에 찍힌 처음 네 EtherCAT 프레임입니다. 시각은 tshark를 켠 순간부터 센 값이고, 그 앞의 16개는 veth가 올라오며 커널이 보낸 IPv6 프레임입니다.

```text
   17 2.572107375 Private_01:01:01 → Broadcast    ECAT 29 'BWR': Len: 1, Adp 0x0, Ado 0x103, Wc 0
   18 2.580015095 Private_01:01:01 → Broadcast    ECAT 29 'BWR': Len: 1, Adp 0x0, Ado 0x120, Wc 0
   19 2.588073066 Private_01:01:01 → Broadcast    ECAT 29 'BWR': Len: 1, Adp 0x0, Ado 0x120, Wc 0
   20 2.596013786 Private_01:01:01 → Broadcast    ECAT 30 'BRD': Len: 2, Adp 0x0, Ado 0x0, Wc 0
...
```

위 `ecx_detect_slaves()` 코드와 한 줄씩 맞습니다. 0x0103(`ECT_REG_DLALIAS`)에 0을 쓰고, 0x0120(`ECT_REG_ALCTL`)에 Init+ACK(0x11)를 두 번 쓴 뒤, 0x0000에 BRD를 보냅니다. SOEM은 이 BWR마다 `EC_TIMEOUTRET3`(6 ms, `ethercattype.h` 66행)까지 응답을 기다리고, 이 VM에서는 프레임 간격이 7.9~8.1 ms로 찍혔습니다. BRD 프레임의 tshark 상세와 바이트는 다음과 같습니다.

```text
Ethernet II, Src: Private_01:01:01 (01:01:01:01:01:01), Dst: Broadcast (ff:ff:ff:ff:ff:ff)
    Type: EtherCAT frame (0x88a4)
EtherCAT frame header
    .... .000 0000 1110 = Length: 0x00e
    0001 .... .... .... = Type: EtherCAT command (0x1)
    EtherCAT datagram: Cmd: 'BRD' (7), Len: 2, Adp 0x0, Ado 0x0, Cnt 0
            Index: 0x04
...
        Working Cnt: 0
0000  ff ff ff ff ff ff 01 01 01 01 01 01 88 a4 0e 10   ................
0010  07 04 00 00 00 00 02 00 00 00 00 00 00 00         ..............
```

몇 가지가 눈에 띕니다. SOEM의 source MAC은 01:01:01:01:01:01이고, tshark는 group 비트가 선 source MAC이라고 경고합니다. 프레임은 30 byte로 Ethernet 최소 길이 60 byte(FCS 제외)보다 짧습니다. veth는 padding을 붙이지 않기 때문입니다. 데이터시트 2장 도입부는 Ethernet 프레임이 64 byte(FCS 포함)보다 짧으면 padding을 붙여야 한다고 적습니다.

## 합성 LRW 프레임을 바이트로 읽기

이번에는 process data용 LRW를 손으로 만들어 Python `AF_PACKET` 소켓으로 같은 veth에 보냈습니다. 논리 주소 0x10, data 16 byte, WKC 0인 44 byte 프레임입니다.

```text
ff ff ff ff ff ff 02 00 00 00 00 01 88 a4 1c 10
0c 01 10 00 00 00 10 00 00 00 00 00 00 00 00 00
00 00 00 00 00 00 00 00 00 00 00 00
```

| offset | 필드 | 해석 |
|---|---|---|
| 0x0C | EtherType | 88 a4 (network order) |
| 0x0E | EtherCAT header | 1c 10 → 0x101c, Type 1·chain 28 B |
| 0x10 | Cmd / Idx | 0x0C LRW / 1 |
| 0x12 | Logical address | 10 00 00 00 → 0x10 |
| 0x16 | Len/Flags | 10 00 → 16 B·C 0·M 0 |
| 0x18 | IRQ | 0 |
| 0x1A | Data | 16 B |
| 0x2A | WKC | 0 (송신 시) |

tshark는 이 바이트를 다음처럼 풉니다.

```text
EtherCAT frame header
    .... .000 0001 1100 = Length: 0x01c
    0001 .... .... .... = Type: EtherCAT command (0x1)
EtherCAT datagram(s): 'LRW': Len: 16, Adp 0x10, Ado 0x0, Wc 0
        Header
            Cmd        : 12 (Logical ReadWrite)
            Index: 0x01
            Log Addr: 0x00000010
            Length     : 16 (0x10) - No Roundtrip - Last Sub Command
...
        Data: 00000000000000000000000000000000
        Working Cnt: 0
```

다음 Node.js parser는 이 글의 범위, 즉 VLAN 태그 없는 Type 1 프레임 중 FCS를 뺀 길이가 1514 byte 이하인 것(datagram chain 최대 1498 byte)만 다룹니다. header의 Length와 각 datagram의 M 비트가 서로 맞는지까지 검사합니다.

```js title="ethercat-frame-parser.mjs"
export function parseEtherCAT(frame) {
  if (!Buffer.isBuffer(frame) || frame.length < 16 || frame.readUInt16BE(12) !== 0x88a4)
    throw new RangeError('untagged EtherCAT frame required');
  const header = frame.readUInt16LE(14), end = 16 + (header & 0x7ff);
  if ((header >>> 12) !== 1 || (header & 0x800) || end > frame.length || end > 1514)
    throw new RangeError('invalid EtherCAT header or length');
  const datagrams = [];
  let offset = 16;
  while (offset < end) {
    if (end-offset < 12) throw new RangeError('short datagram');
    const flags = frame.readUInt16LE(offset+6), length = flags & 0x7ff;
    const next = offset + 12 + length, more = Boolean(flags & 0x8000);
    if ((flags & 0x3800) || next > end || more !== (next < end))
      throw new RangeError('invalid datagram chain');
    datagrams.push({command:frame[offset], index:frame[offset+1],
      address:frame.readUInt32LE(offset+2), length, more,
      irq:frame.readUInt16LE(offset+8),
      data:Buffer.from(frame.subarray(offset+10,offset+10+length)),
      wkc:frame.readUInt16LE(offset+10+length)});
    offset = next;
  }
  if (!datagrams.length) throw new RangeError('empty command chain');
  return datagrams;
}
```

`flags & 0x3800`은 Reserved 3 bit가 0인지 보고, C 비트(0x4000)는 검사하지 않습니다. 캡처한 프레임 바이트를 그대로 넣은 결과입니다(Node v24.22.3).

```text
lrw.pcapng 44 [{"command":12,"index":1,"address":16,"length":16,"more":false,"irq":0,"data":"00000000000000000000000000000000","wkc":0}]
lrw.pcapng 44 [{"command":5,"index":2,"address":268439553,"length":16,"more":false,"irq":0,"data":"0a00000000130020237a6000e8030000","wkc":0}]
...
soem-veth.pcapng 30 [{"command":7,"index":4,"address":0,"length":2,"more":false,"irq":0,"data":"0000","wkc":0}]
```

두 번째 줄의 address 268439553은 0x10001001입니다. FPWR 같은 디바이스 주소 명령은 4 byte 중 하위 2 byte가 station address(0x1001), 상위 2 byte가 offset(0x1000)이므로, 논리 주소가 아닌 명령에서는 이 값을 둘로 나눠 읽어야 합니다.

## Logical Addressing — FMMU의 역할

`LRD`/`LWR`/`LRW`는 32 bit *논리 주소*를 씁니다. 공간은 4 GB이지만 실제로는 슬레이브들의 process data를 줄지어 놓은 작은 구간만 씁니다.

SOEM v1.4.0의 `ecx_config_map_group()`은 모든 슬레이브의 출력을 먼저, 입력을 그 뒤에 이어 붙입니다. 출력 매핑(`ethercatconfig.c` 1205행)이 입력 매핑(1265행)보다 먼저 돌고 매번 비어 있는 다음 FMMU를 쓰므로, 출력과 입력이 모두 있는 슬레이브에서는 FMMU 0이 출력(`FMMUtype = 2`), FMMU 1이 입력(`FMMUtype = 1`)을 맡습니다. 슬레이브 두 대가 각각 출력 4·8 byte, 입력 4·8 byte를 가진다면 배치는 다음과 같습니다. 물리 주소는 예시이며 SOEM 기본 mailbox(0x1000~0x10FF)를 피해 잡았습니다.

| 슬레이브 | FMMU | 방향 | 논리 주소 | 물리 주소 |
|---|---|---|---|---|
| 1 | 0 | 출력(write) | 0x00~0x03 | 0x1100~0x1103 |
| 2 | 0 | 출력(write) | 0x04~0x0B | 0x1100~0x1107 |
| 1 | 1 | 입력(read) | 0x0C~0x0F | 0x1180~0x1183 |
| 2 | 1 | 입력(read) | 0x10~0x17 | 0x1180~0x1187 |

마스터가 논리 주소 0에서 24 byte짜리 LRW 하나를 보내면 각 슬레이브가 *자기 구간만* 읽고 씁니다. 마스터는 연속된 24 byte 메모리를 다루는 셈입니다. 이 경우 두 대가 모두 출력과 입력에 성공하면 기대 WKC는 2 × 3 = 6입니다.

## Mailbox — CoE·SoE·FoE·EoE·AoE

주기 process data는 *작고 매 주기 바뀌는* 데이터입니다. 파라미터 설정이나 펌웨어처럼 *크고 가끔 오가는* 데이터는 mailbox SyncManager를 거칩니다. mailbox header는 6 byte입니다(데이터시트 Table 27).

| 필드 | 크기 | 의미 |
|---|---|---|
| Length | 2 B | mailbox header를 뺀 길이 |
| Address | 2 B | 보낸 쪽의 station address |
| Channel / Priority | 6 bit / 2 bit | channel은 0, priority 0(낮음)~3(높음) |
| Type | 4 bit | 0x1 vendor specific(Beckhoff AoE), 0x2 EoE, 0x3 CoE, 0x4 FoE, 0x5 SoE, 0xF VoE |
| Ctr | 3 bit | 중복 검출용 순번 |

SOEM v1.4.0의 `ec_mbxheadert`(`ethercatmain.h` 316~322행)도 `length`, `address`, `priority`, `mbxtype` 네 필드 6 byte이고, `ECT_MBXT_*` 열거형이 같은 Type 값을 씁니다.

| Type | 약자 | 데이터시트 8.2.1절의 정의 |
|------|------|------|
| 0x2 | **EoE** | Ethernet 프레임을 EtherCAT 위로 터널링 |
| 0x3 | **CoE** | CAN application layer object dictionary 접근, Emergency·PDO 메시지 |
| 0x4 | **FoE** | 펌웨어와 파일의 download/upload |
| 0x5 | **SoE** | IEC 61800-7 식별자 접근 |
| 0x1 | **AoE** | ADS(Automation Device Specification) 메시지 교환 |

**CoE**는 CANopen의 *object dictionary*를 그대로 가져와 16 bit *index*와 8 bit *subindex*로 객체를 식별합니다. 서보 드라이브는 CiA 402 프로파일 객체를 씁니다. Beckhoff [EP7211 표준 객체 문서](https://infosys.beckhoff.com/content/1033/ep7211/7005500299.html)의 PDO 매핑 항목에서 다음 index를 확인할 수 있습니다.

| index | 객체 |
|---|---|
| 0x6040 | Controlword |
| 0x6041 | Statusword |
| 0x607A | Target position |
| 0x6064 | Position actual value |
| 0x60FF | Target velocity |
| 0x6071 | Target torque |

### CoE SDO 요청 — Hex 예

SOEM v1.4.0의 `ecx_SDOwrite()`(`ethercatcoe.c` 330행부터)는 4 byte 이하 값을 expedited download로 보냅니다. mailbox Length에 `0x000a`, priority 0, Type에 `ECT_MBXT_COE + (cnt << 4)`, CoE header에 `ECT_COES_SDOREQ << 12`, SDO command에 `ECT_SDO_DOWN_EXP`(0x23)를 넣습니다. 이 규칙대로 0x607A:00에 1000을 쓰는 mailbox payload 16 byte를 만들고, station address 0x1001의 mailbox(0x1000)로 가는 FPWR에 실어 veth로 보냈습니다.

```text
0a 00 00 00 00 13 00 20 23 7a 60 00 e8 03 00 00
```

처음 6 byte가 mailbox header입니다. Length 10은 CoE header 2 byte와 SDO 8 byte를 더한 값이고, 0x13은 Type 3(CoE)과 Ctr 1입니다. SOEM의 `ec_nextmbxcnt()`는 카운터를 1~7로 돌리고 0은 건너뜁니다. tshark는 이를 다음처럼 풉니다.

```text
EtherCAT datagram(s): 'FPWR': Len: 16, Adp 0x1001, Ado 0x1000, Wc 0
        EtherCAT Mailbox Protocol:CoE SDO Req : 'Initiate Download' (1) Idx=0x607a Sub=0
            Header
                Length: 10
                .... ..00 = Priority: 0
                Type: CoE (CANopen over EtherCAT) (3)
                Counter: 1
            CoE
                Number: 0
                Type: SDO Req (2)
                SDO Req : 'Initiate Download' (1) Idx=0x607a Sub=0
                    Initiate Download: 0x23
                        .... ...1 = Size Ind.: Set
                        .... ..1. = Expedited: Set
...
                Index: 0x607a
                SubIndex: 0x00
                Data: 0x000003e8
```

0x23은 size indicated와 expedited 비트가 선 download 요청이고, data 0x000003e8은 1000입니다. 슬레이브가 없으니 응답은 없습니다. 실제 드라이브라면 SDO 응답이 다음 mailbox read로 돌아오고, SOEM은 응답의 Type·service·index·subindex가 요청과 맞는지 확인합니다.

### FoE — 펌웨어 전송

FoE는 mailbox로 파일을 나눠 보냅니다. SOEM v1.4.0의 `ecx_FOEwrite()`(`ethercatfoe.c` 199행)를 보면 segment 크기는 슬레이브 mailbox 길이에서 12 byte를 뺀 값(`maxdata = mbx_l - 12`)입니다. WRITE 요청 후 ACK를 받을 때마다 DATA를 하나씩 보내고, packet number를 붙입니다. 파일 끝은 별도 플래그가 아니라 "maxdata보다 짧은 DATA"로 표시합니다(코드 주석 "EOF is defined as packetsize < full packetsize"). 그래서 파일 크기가 maxdata의 정확한 배수면 마지막에 길이 0인 DATA를 한 번 더 보냅니다(`dofinalzero`). BUSY를 받으면 데이터 포인터와 packet number를 되돌려, 다음 ACK에서 그 segment를 다시 보냅니다.

### EoE — 보조 IP 채널

EoE는 EtherCAT 망 위로 *Ethernet 프레임*을 터널링합니다. mailbox를 거치므로 process data와 같은 링크 시간을 나눠 씁니다.

## 자주 하는 실수

### "WKC가 기대값이면 모든 게 정상이다"

데이터시트 2.4절에 따르면 WKC는 한 byte라도 접근에 성공하면 오릅니다. FMMU 구간을 잘못 잡아 엉뚱한 byte를 읽고 써도 WKC는 오를 수 있습니다. WKC는 *접근*을 확인할 뿐 *의미*를 확인하지 않습니다.

### "LRW 한 번이면 모든 슬레이브의 모든 데이터를 다 본다"

FMMU에 *매핑된 구간만* 다룹니다. 매핑되지 않은 논리 주소에서는 ESC가 프레임의 데이터를 건드리지 않습니다(데이터시트 7장). AL Status 같은 레지스터는 FPRD로 따로 읽습니다.

### "Mailbox는 process data와 같은 datagram에 실린다"

SOEM에서는 아닙니다. `ecx_mbxsend()`는 슬레이브의 mailbox 쓰기 주소(`mbx_wo`)로 FPWR을 따로 보내고(`ethercatmain.c` 982행), 응답은 SM1 상태를 FPRD로 확인한 뒤 읽습니다. process data의 LRW와는 다른 프레임입니다.

### "EtherType 0x88A4 프레임은 라우터를 넘을 수 없으니 EtherCAT은 L2에서만 쓴다"

Ethernet II 형식은 L2라 라우터를 넘지 못하는 것이 맞습니다. 다만 데이터시트 2.6절은 EtherCAT datagram을 UDP/IP에 넣는 형식도 정의합니다. ESC는 UDP 목적지 포트 0x88A4인 IPv4 프레임을 EtherCAT으로 처리하고, 프레임 내용을 고치면서 checksum을 갱신할 수 없으므로 UDP checksum을 0으로 지웁니다.

### "Datagram은 얼마든지 길게 만들 수 있다"

데이터시트 Figure 3의 datagram data는 0~1486 byte이고, SOEM의 `EC_MAXLRWDATA`도 1486입니다. 더 큰 process image는 여러 datagram이나 여러 프레임으로 나눕니다.

## 정리

- EtherCAT 프레임은 EtherType `0x88A4`로 표준 Ethernet 위에 얹히고, ESC는 header Type 0x1만 처리합니다.
- EtherCAT header(2 byte) 뒤에 10 byte header·data·2 byte WKC로 된 datagram이 체인으로 오고, M 비트가 마지막을 표시합니다.
- 명령 코드는 *주소 모드(AP·FP·B·L)*와 *동작(R·W·RW·RMW)*의 조합입니다.
- WKC는 read +1, write +1, read/write +3으로 오르고, 부족량만으로는 실패 장치 수를 알 수 없습니다. WKC가 맞아도 *접근*이 성공했다는 뜻일 뿐 데이터가 맞다는 보장은 없습니다.
- SOEM은 BRD의 WKC로 슬레이브 수를 셉니다. veth 캡처에서 그 프레임 순서를 그대로 확인했습니다.
- mailbox header는 6 byte이고 Type으로 EoE·CoE·FoE·SoE·AoE를 구분합니다. tshark가 합성 CoE SDO 요청을 0x607A:00 = 1000으로 풀었습니다.

다음 편은 **Ch 5: EtherCAT Master/Slave — SOEM·IgH**입니다. SOEM을 Debian VM에서 빌드하며 만난 경고, adapter 조회 결과, IgH의 구조, 슬레이브 측 SII·ESI를 다룹니다.

## 관련 항목

- [Ch 3: EtherCAT 아키텍처 — Processing on the Fly](/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture)
- [Ch 5: EtherCAT Master/Slave — SOEM·IgH](/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master)
- [Ch 6: PROFINET 개요 — RT·IRT 클래스](/blog/embedded/protocols/industrial-ethernet/chapter06-profinet)
- [Beckhoff EtherCAT Slave Controller Section I — Technology v2.3](https://download.beckhoff.com/download/document/io/ethercat-development-products/ethercat_esc_datasheet_sec1_technology_2i3.pdf)
- [SOEM v1.4.0 `ethercattype.h`](https://github.com/OpenEtherCATsociety/SOEM/blob/v1.4.0/soem/ethercattype.h)
- [원문 — Wireshark EtherCAT dissector](https://wiki.wireshark.org/EtherCAT)
- [원문 — CiA 402 servo profile](https://www.can-cia.org/can-knowledge/canopen/cia402/)
