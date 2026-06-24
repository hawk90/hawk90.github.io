---
title: "POWERLINK과 OpenSAFETY 분석 — 산업 안전 통신 프로토콜"
date: 2026-05-13T09:10:00
description: "B&R발 오픈소스 표준 산업 이더넷·통합 safety layer — slot polling으로 1ms 결정성을 만드는 법."
series: "Industrial Ethernet 심화"
seriesOrder: 10
tags: [powerlink, opensafety, br-automation, sil3, black-channel]
draft: false
---

## 한 줄 요약

> **"POWERLINK는 *MN이 모든 송신 권한을 줄로 세워* 결정성을 만들고, *OpenSAFETY*는 그 위에 *black channel*로 SIL 3까지 한 번에 올라갑니다."** — 표준 Ethernet 하드웨어 + 오픈소스 stack으로 EtherCAT급 사이클을 내는 *유일한* 옵션입니다.

POWERLINK는 *B&R Automation*이 2001년에 만들고 *EPSG(Ethernet POWERLINK Standardization Group)*가 표준화한 산업 이더넷입니다. EtherCAT(2003)보다 2년 먼저 나왔고, *오픈소스 stack(openPOWERLINK)*과 *오픈 표준*이라는 점에서 다른 모든 경쟁자와 다릅니다.

이 장은 POWERLINK의 *slot polling 메커니즘*과 그 위에 올라가는 *OpenSAFETY*(EN 50325-5 / IEC 61784-3)를 다룹니다. 둘이 합쳐지면 *별도의 safety bus 없이* 동일 이더넷 케이블로 SIL 3 safety가 가능합니다.

## 왜 POWERLINK인가

다른 산업 이더넷과 비교했을 때 POWERLINK의 *유일한 특징*은 *표준 100Mbps Ethernet 하드웨어로 1ms 사이클을 낸다*는 점입니다.

| 프로토콜 | 특수 hw 필요? | 사이클 | 오픈소스? |
|----------|--------------|--------|----------|
| EtherCAT | 예 (ESC ASIC) | 50µs~ | 마스터만 |
| PROFINET IRT | 예 (스위치 IRT) | 250µs~ | 부분 |
| EtherNet/IP | 아니오 | 10ms~ (RT) | 부분 |
| **POWERLINK** | **아니오** | **200µs~ (1ms 표준)** | **마스터·슬레이브 둘 다** |
| TSN | 예 (TSN switch) | 250µs~ | 부분 |

표준 Realtek RTL8169·Intel I210 같은 평범한 NIC으로도 POWERLINK MN/CN을 돌릴 수 있습니다. *Slot polling*이 핵심 트릭입니다.

## 두 역할 — MN과 CN

POWERLINK 네트워크에는 두 종류의 노드가 있습니다.

| 역할 | 약어 | 책임 |
|------|-----|------|
| Managing Node | MN | 마스터. *모든 송신을 polling으로 줄 세움*. 정확히 1대. |
| Controlled Node | CN | 슬레이브. MN의 *poll 요청을 받았을 때만* 송신. 최대 240대. |

MN이 *유일한 권한자*입니다. CN은 *동시 송신*을 절대 하지 않습니다. 충돌이 발생할 수 없으므로 *표준 hub·스위치 어느 것에서도* 결정성이 보장됩니다.

CN은 *실시간 시작 시점*에는 *발언권을 받아야* 합니다. MN이 매 사이클 모든 CN을 polling합니다. polling 순서가 *고정*이라 각 CN의 송신 시각이 *결정적*입니다.

## 사이클 — Cyclic vs Asynchronous

한 사이클은 두 구간으로 나뉩니다.

```text
|<------------------- cycle (1ms) ------------------>|
| Isochronous phase (cyclic) | Async phase | Idle    |

Isochronous:
  SoC -> PReq -> PRes -> PReq -> PRes -> ... -> SoA
                CN1            CN2

Async:
  ASnd (one chosen station per cycle, requested via SoA)
```

각 frame의 역할입니다.

| Frame | 약어 | 보내는 쪽 | 용도 |
|-------|-----|----------|------|
| **SoC** (Start of Cyclic) | SoC | MN → multicast | 사이클 시작 신호, 모든 CN 동기화 |
| **PReq** (Poll Request) | PReq | MN → CN(unicast) | "CN_x야, 너 데이터 보내라" + MN→CN output |
| **PRes** (Poll Response) | PRes | CN → multicast | CN의 input data, 모든 노드가 들음 |
| **SoA** (Start of Async) | SoA | MN → multicast | 비동기 phase 시작, 1 노드에게 *발언권* 부여 |
| **ASnd** (Asynchronous Send) | ASnd | 선택된 노드 → unicast/multicast | SDO, NMT, 진단, IP 트래픽 |

흐름의 *핵심 발상*은 다음입니다.

1. MN이 SoC로 *모든 CN에게 사이클 시작*을 알린다.
2. CN1에게 PReq를 보낸다 (output data 동봉).
3. CN1이 PRes로 답한다 (input data 동봉). 다른 모든 CN도 *이 PRes를 듣는다* (cross traffic, publisher-subscriber).
4. CN2 동일.
5. 모든 CN의 polling이 끝나면 MN이 SoA로 *async phase 시작*.
6. SoA가 *발언권을 1 노드에게* 줌. 그 노드만 ASnd 송신.
7. async phase가 *남은 시간을 채우고 끝* → 다음 cycle의 SoC.

이 흐름이 *충돌을 원천 차단*합니다. 동시에 송신하는 두 노드가 *물리적으로 존재할 수 없습니다*.

## 200µs 사이클 — 어떻게?

100Mbps Ethernet의 *최소 프레임*은 64B = 약 6.7µs 송신 시간입니다(IFG + preamble 포함). 32-노드 시스템에서 모두 *최소 프레임 PReq/PRes*만 주고받아도:

```text
SoC:          ~6.7 µs
32 × PReq:    32 × 6.7 = ~214 µs
32 × PRes:    32 × 6.7 = ~214 µs
SoA:          ~6.7 µs
Total iso:    ~442 µs
```

200µs 사이클은 8 노드 정도가 한계입니다. 16 노드면 400~500µs, 32 노드면 1ms가 타깃이 됩니다. *노드 수와 사이클*은 직접적인 trade-off입니다.

성능 limit를 끌어올리는 방법:

- *Gigabit Ethernet* (1Gbps) — 10배 단축. 단, 산업 인프라가 100Mbps에 맞춰 있어 보급은 천천히.
- *Multiplexed slots* — 빠른 CN은 매 사이클 polling, 느린 CN은 *N사이클마다 한 번* polling.
- *Poll Response Chaining (PRC)* — CN1의 PRes를 들은 CN2가 *MN 응답을 기다리지 않고* 바로 PRes 송신. 트리 토폴로지에서 효과적.

B&R의 *최신 POWERLINK*는 200µs 사이클 + 32 CN을 *gigabit + PRC*로 보장합니다.

## BS-Frame 구조

POWERLINK 프레임은 *표준 Ethernet frame*입니다. EtherType `0x88AB`를 씁니다.

```text
+----------+----------+----------+--------+---------+--------+-----+
| dst MAC  | src MAC  | EtherType| message| dest ID | src ID | ... payload ... | CRC
| 6B       | 6B       | 0x88AB   | 1B     | 1B      | 1B     |
+----------+----------+----------+--------+---------+--------+-----+

message types:
  0x01  SoC
  0x03  PReq
  0x04  PRes
  0x05  SoA
  0x06  ASnd
```

destination/source ID는 *POWERLINK 노드 ID(1~240)*입니다. MAC 주소와 별개로 *각 CN에 1~240 사이의 NodeID*를 할당합니다. NodeID 240(`F0`)이 MN입니다.

payload는 *PDO(Process Data Object)*를 담습니다. CANopen의 PDO 모델을 그대로 가져왔습니다. POWERLINK의 application layer는 사실상 *CANopen over Ethernet*입니다. EDS 파일·SDO 통신·NMT 상태기계가 모두 CANopen 기반입니다.

## openPOWERLINK — 오픈소스 stack

`openPOWERLINK`는 LGPL/BSD로 풀려 있는 *완성된* MN·CN stack입니다. EPSG가 직접 유지합니다.

```bash
git clone https://github.com/OpenAutomationTechnologies/openPOWERLINK_V2
cd openPOWERLINK_V2

# Build MN on Linux
cd stack/build/linux
cmake -DCFG_KERNEL_STACK=Userspace -DCFG_DEMO=mn_console ../..
make
```

지원 OS와 인터페이스가 광범위합니다.

| 호스트 | NIC 인터페이스 |
|--------|---------------|
| Linux (userspace) | pcap, raw socket |
| Linux (kernel) | edrv 모듈 (Intel 8255x, 82573, RTL8139) |
| Windows | WinPcap/Npcap |
| VxWorks | edrv |
| Bare-metal Xilinx Zynq | FPGA based MAC |
| FreeRTOS / no-OS | edrv with PRU/ENET |

가장 빠른 사이클이 필요한 경우 *Xilinx Zynq + openPOWERLINK FPGA design*을 씁니다. PRU/PHY ts로 jitter를 sub-µs로 끌어내립니다.

CN 코드는 더 단순합니다. *EDS 파일*을 만들고, 그에 맞춰 *PDO callback*만 채우면 됩니다.

```c
// CN: process incoming PDO from MN, fill outgoing PDO
tOplkError processSync(void)
{
    // Read input PDO from MN (output channel)
    UINT16 cmd;
    oplk_readPdo(0x6000, 0x00, &cmd, sizeof(cmd));

    // Update local state
    motor_set_target(cmd);

    // Fill output PDO (input channel back to MN)
    UINT16 status = motor_get_status();
    oplk_writePdo(0x6001, 0x00, &status, sizeof(status));

    return kErrorOk;
}
```

`processSync`는 매 사이클 *PRes 송신 직전*에 호출됩니다. 사이클 안에 *반드시* 끝나야 합니다.

## openCONFIGURATOR — XML 기반 설정 도구

openPOWERLINK의 짝꿍 도구입니다. 모든 노드의 EDS·CDC·CN 설정을 *XML*로 만들고, *Java GUI* + *CLI*로 export합니다.

```text
$ openconfigurator-cli --project my_project.xml --output stack/

generates:
  stack/mnobd.cdc      ← MN의 binary configuration
  stack/mnobd.txt      ← human-readable form
  stack/cn001.xdc      ← CN1 configuration
  ...
```

`mnobd.cdc`는 MN이 부팅 시 읽어 *모든 CN을 어떻게 다룰지* 알아내는 binary blob입니다. 노드 추가는 *XML 수정 + 재export*만으로 끝납니다.

GUI에서 *각 CN의 PDO mapping*을 드래그&드롭으로 짭니다. CANopen에서 그대로 가져온 *Index/SubIndex* 표현입니다.

**MN node F0:**

- cycle: 1000 µs
- async slot: 200 µs

**CN node 01 (motor drive):**

- TPDO 0x1800 -> mapping object 0x6041:00 (statusword)
- 0x6064:00 (position actual)
- RPDO 0x1400 -> mapping object 0x6040:00 (controlword)
- 0x607A:00 (target position)

이 매핑이 *PReq/PRes payload의 byte layout*을 정합니다.

## OpenSAFETY — black channel으로 SIL 3

POWERLINK는 *통신을 빠르게* 만들 뿐, *safety*는 별개 문제입니다. *OpenSAFETY*가 그 위에 *safety message*를 얹는 layer입니다.

핵심 발상은 *black channel*입니다.

```text
Application Layer (safety)
  - safety message with SADR, SDN, CRC, sequence
                |
                | "treat the network as a black box"
                v
Transport (POWERLINK, EtherCAT, PROFINET, Modbus...)
  - any underlying network; no guarantees needed
                |
                v
Physical (Ethernet)
```

*하부 네트워크가 무엇이든 신뢰하지 않습니다*. 메시지 자체가 *모든 검증 코드*를 안에 들고 다닙니다. 받는 쪽은 *내용물의 무결성·신선도·출처*를 독립적으로 검증합니다.

safety message의 구성요소입니다.

| 필드 | 길이 | 의미 |
|------|-----|------|
| **SADR** (Safety Address) | 10bit | 송신 safety 노드 ID |
| **SDN** (Safety Domain Number) | 16bit | 도메인 식별자 |
| **SCT** (Safety Cycle Time) | watchdog | 다음 message가 와야 할 시간 |
| **TXN** (Sequence number) | 8bit | 순서 보장 |
| **Payload** | 1~254B | 실제 safety data |
| **CRC8 / CRC16** | duplicate | *두 가지 다른 CRC*로 잡음 검출 |

특이한 것은 *두 가지 CRC*입니다. CRC8과 CRC16(또는 CRC32) *서로 다른 다항식*을 사용해 *시스템적 비트 오류*까지 잡습니다. 표준 Ethernet의 CRC32가 흐른 *뒤*에도 OpenSAFETY 자체 CRC가 한 번 더 검증합니다.

```c
// Pseudo-code: receiver checks
bool process_safety_frame(safety_frame_t *f) {
    // 1. CRC1 must match
    if (crc8(f->payload, len) != f->crc1) return drop_and_fault();

    // 2. CRC2 must match (different polynomial)
    if (crc16(f->payload, len) != f->crc2) return drop_and_fault();

    // 3. Source must be expected SADR
    if (f->sadr != expected_sadr) return drop_and_fault();

    // 4. SCT not expired (watchdog)
    if (now() > last_rx_time + sct) return enter_safe_state();

    // 5. Sequence number consistent
    if (!sequence_check(f->txn)) return drop_and_fault();

    return accept(f);
}
```

이 검증 시퀀스가 *IEC 61508 SIL 3* 인증의 핵심입니다. *통신 채널의 무결성을 가정하지 않는다*는 점이 black channel의 정의입니다.

## 실용 예 — 같은 케이블에 motion + safety

OpenSAFETY가 POWERLINK 위에서 어떻게 흐르는지 보면 다음과 같습니다.

```text
| SoC | PReq(CN1) | PRes(CN1) | PReq(CN2) | PRes(CN2) | ... | SoA | ASnd |
                              ^
                              |
              PRes payload    | OpenSAFETY frame (in PDO)
              -----------------------------------------
              | normal motion data (40B)               |
              | OpenSAFETY message (16B)               |
              |   SADR=12, SDN=1, payload=safety_state |
              |   CRC1, CRC2                           |
              -----------------------------------------
```

safety data가 *cyclic PDO의 일부*로 들어갑니다. *통신은 POWERLINK*가, *safety 보장은 OpenSAFETY*가 합니다. *별도 safety 케이블 / 별도 safety PLC가 필요 없습니다*.

물리적으로는 *safety I/O 모듈*과 *safety PLC*가 *normal PLC와 같은 망에 공존*합니다. 시리즈 인증을 받은 B&R *X20 SLC*가 가장 흔한 safety PLC, *X20 SI8100* 같은 모듈이 safety I/O입니다.

## EN 50325-5 / IEC 61784-3 — safety 표준 매핑

OpenSAFETY가 다른 산업 이더넷 위에도 올라갑니다. *transport-independent*가 핵심입니다.

| Lower layer | OpenSAFETY profile name |
|------------|------------------------|
| POWERLINK | OpenSAFETY on POWERLINK |
| EtherCAT | Safety over EtherCAT (FSoE) — 별도지만 black channel 모델 동일 |
| PROFINET | PROFIsafe — 별도 표준이지만 컨셉 동일 |
| Modbus TCP | OpenSAFETY on Modbus |
| Sercos III | OpenSAFETY on Sercos |

PROFIsafe는 *PROFIBUS·PROFINET 공식 safety layer*이고, FSoE는 *EtherCAT 공식 safety layer*입니다. OpenSAFETY는 *EPSG 표준이지만 underlying을 가리지 않습니다*. *transport agnostic*이 OpenSAFETY의 차별점입니다.

## 자주 하는 실수

### "표준 NIC인데 jitter가 100µs"

`tx_queue_len`이 큰 채로 두면 OS가 *전송 큐에서 시간을 못 박습니다*. POWERLINK MN을 돌릴 NIC는 다음을 적용합니다.

```bash
ip link set eth1 txqueuelen 0
ethtool -K eth1 gso off tso off ufo off lro off
```

`gso`/`tso`(generic/TCP segmentation offload)는 *큰 프레임을 NIC가 쪼개는* 기능이라 *시간 결정성을 깹니다*. 산업 NIC에서는 항상 끕니다.

### "openPOWERLINK MN이 CN을 못 찾는다"

대부분 *MAC 주소·NodeID 매핑*이 어긋났습니다. openCONFIGURATOR로 *CN의 NodeID와 MAC*을 확인하고, CN 측이 정말 그 NodeID로 부팅하는지 점검합니다.

### "안전을 위해 OpenSAFETY를 도입했는데 인증이 안 떨어진다"

stack 자체는 인증 가능하지만, *어떻게 통합했는가*가 IEC 61508 평가의 본체입니다. *safety PLC가 인증되어 있어야* OpenSAFETY까지 묶어서 SIL 3 인증이 나옵니다. B&R X20 SLC, Pilz PSS 4000 같은 *기성 safety PLC*를 함께 쓰는 것이 가장 빠른 길입니다.

### "Async phase가 모자라 SDO가 끝없이 누적된다"

async slot 시간이 너무 짧거나 *큰 SDO upload*를 사이클 중에 시도한 경우입니다. async를 *200µs → 400µs*로 늘리거나, *MN이 사이클을 잠시 늘려* SDO를 비웁니다. 진단 트래픽이 cyclic을 방해하지 않게 합니다.

### "사이클을 200µs로 잡았는데 PRes drop이 계속"

*노드 수 × frame 시간*이 이미 한계입니다. *PRC(Poll Response Chaining)*를 켜거나, 사이클을 500µs로 늘려야 합니다.

## 정리

- POWERLINK는 *표준 Ethernet hw + slot polling*으로 1ms 사이클을 만듭니다. *MN이 모든 송신 권한*을 줄 세웁니다.
- 사이클은 *Isochronous(SoC·PReq·PRes·SoA)* + *Async(ASnd)* 두 구간입니다.
- *openPOWERLINK*가 MN·CN 모두 오픈소스로 제공됩니다. *openCONFIGURATOR*가 XML 기반 설정.
- application layer는 *CANopen over Ethernet*입니다. EDS·PDO·SDO·NMT 그대로.
- *OpenSAFETY*가 위에 올라가면 IEC 61508 *SIL 3*가 가능합니다. *별도 safety bus 없음*.
- *Black channel* 모델 — 하부 네트워크를 신뢰하지 않고 *메시지 자체*가 모든 무결성 코드를 들고 다닙니다.
- 두 종류 *CRC*와 *SCT watchdog*, *sequence number*가 결합돼 systematic error까지 잡습니다.
- POWERLINK + OpenSAFETY는 *오픈 표준 + 오픈소스 stack*으로 *EtherCAT급 사이클 + SIL 3 safety*를 동시에 달성하는 유일한 조합입니다.

다음 편은 **Ch 11: 리눅스 실시간 — PREEMPT_RT·EtherCAT으로 마스터 만들기**입니다.

## 관련 항목

- [Ch 9: TSN 스케줄링 — Qbv·Qbu·동기화](/blog/embedded/protocols/industrial-ethernet/chapter09-tsn-scheduling)
- [Ch 11: 리눅스 실시간 — PREEMPT_RT·EtherCAT](/blog/embedded/protocols/industrial-ethernet/chapter11-linux-realtime)
- [Ch 3: EtherCAT 아키텍처](/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture)
- [원문 — EPSG POWERLINK Specification](https://www.ethernet-powerlink.org/)
- [원문 — IEC 61784-3 functional safety profiles](https://webstore.iec.ch/publication/26458)
