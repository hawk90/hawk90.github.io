---
title: "PROFINET IO 모델 — Controller·Device·Supervisor 역할 추적"
slug: "embedded/protocols/industrial-ethernet/chapter07-profinet-io"
date: 2026-05-13T09:07:00
description: "PROFINET IO의 DCP·AR·CR·APDU status·data hold·alarm·MRP를 p-net public/v1.0.4 소스와 PI System Description으로 따라가고, 합성 DCP·RT 프레임을 tshark로 풀어 봅니다."
series: "Industrial Ethernet 심화"
seriesOrder: 7
tags: [profinet, profinet-io, dcp, rpc, mrp]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **PROFINET IO는 DCP로 장치를 찾고, AR 안에 통신 관계를 구성한 뒤, 각 provider가 주기 데이터를 보냅니다. consumer는 data hold 시간 안에 유효한 프레임이 오지 않으면 연결을 끊습니다.**

[앞 장](/blog/embedded/protocols/industrial-ethernet/chapter06-profinet)은 RT와 IRT의 전송 조건을 다뤘습니다. 이 장은 장치 하나가 망에 붙어 데이터를 주고받기까지의 단계를 따라갑니다. 이사에 비유하면 DCP는 집 주소를 받는 전입신고, AR은 이웃과 맺는 계약서, IO data CR은 매일 오가는 택배, alarm은 급할 때 누르는 초인종입니다.

구현 대조에는 공개 IO-Device 스택 [p-net public/v1.0.4](https://github.com/rtlabs-com/p-net/tree/public/v1.0.4)를, 개념 설명에는 PI의 [PROFINET System Description(2018 판)](https://www.profibus.de/fileadmin/media/downloadsection/technical_description_%26_books/PROFINET_System_Description_engl_2018_Update.pdf)을 씁니다. 프레임 해석은 Debian 12 VM의 veth로 보낸 합성 프레임을 tshark 4.0.17로 풀어 확인했습니다. PLC와 연결한 시험이나 인증 시험 결과는 아닙니다.

## 역할과 소유권

| 역할 | System Description 2.1절의 정의 |
|---|---|
| IO-Controller | 보통 PLC. 출력 데이터의 provider, 입력 데이터의 consumer |
| IO-Device | 분산 IO 장치. 입력 데이터의 provider, 출력 데이터의 consumer |
| IO-Supervisor | 시운전·진단용 PG·PC·HMI |

PROFINET은 provider/consumer 모델이라 Controller와 Device가 각자 주기 데이터를 보냅니다. 그래서 두 방향의 데이터 유효성을 따로 봐야 합니다. 출력이 잘 가도 입력이 끊길 수 있고, 그 반대도 있습니다.

System Description 6.1절은 한 장치를 여러 Controller가 쓰는 방법을 둘로 나눕니다. **Shared device**는 서로 다른 Controller가 같은 장치의 *서로 다른 모듈·서브모듈*에 접근하는 방식이고, **Shared input**은 여러 Controller가 *같은 입력*을 함께 읽는 방식입니다. 둘 다 선택 기능이라 장치의 GSD 파일에서 지원 여부를 확인합니다.

## DCP: IP가 없는 장치도 발견하기

새 장치에는 아직 이름도 IP도 없을 수 있습니다. DCP(Discovery and basic Configuration Protocol)는 IP 없이 L2에서 장치를 찾고, 이름과 IP를 설정합니다(System Description 2.5절). EtherType은 주기 데이터와 같은 `0x8892`이고, FrameID로 서비스를 구분합니다.

![DCP Identify와 Set의 개념 순서. 영구 저장 여부는 요청 조건과 장치 구현에 따릅니다.](/images/blog/industrial-ethernet/diagrams/ch07-dcp-discovery-seq.svg)

[p-net의 `pf_dcp.c`](https://github.com/rtlabs-com/p-net/blob/public/v1.0.4/src/common/pf_dcp.c) 65~68행의 FrameID 정의입니다.

| DCP 메시지 | FrameID | p-net 상수 |
|---|---|---|
| Hello | `0xFEFC` | `PF_DCP_HELLO_FRAME_ID` |
| Get/Set | `0xFEFD` | `PF_DCP_GET_SET_FRAME_ID` |
| Identify request | `0xFEFE` | `PF_DCP_ID_REQ_FRAME_ID` |
| Identify response | `0xFEFF` | `PF_DCP_ID_RES_FRAME_ID` |

Identify request는 multicast로 보내 모든 장치를 한 번에 찾습니다. VM에서 목적지 MAC `01:0e:cf:00:00:00`, FrameID `0xFEFE`, "All" selector 블록을 담은 Identify 요청을 만들어 veth로 보낸 뒤 tshark로 풀었습니다.

```text
Ethernet II, Src: 02:00:00:00:00:02 (02:00:00:00:00:02), Dst: PN-MC_00:00:00 (01:0e:cf:00:00:00)
    Type: PROFINET (0x8892)
PROFINET acyclic Real-Time, ID:0xfefe, Len:  44
    FrameID: 0xfefe (Real-Time: DCP (Dynamic Configuration Protocol) identify multicast request)
PROFINET DCP, Ident Req, Xid:0x1, All
    ServiceID: Identify (5)
    ServiceType: Request (0)
    Xid: 0x00000001
    ResponseDelay: 1
    DCPDataLength: 4
    Block: All/All
        Option: All Selector (255)
        Suboption: ALL Selector (255)
        DCPBlockLength: 0
```

tshark가 `01:0e:cf:00:00:00`을 "PN-MC"(PROFINET multicast)로 표시합니다. p-net은 Hello에 그다음 주소 `01:0e:cf:00:00:01`을 씁니다(`pf_dcp.c` 111~112행 `dcp_mc_addr_hello`). 장치는 Identify에 FrameID `0xFEFF`로 응답하고, 여기에 장치 이름·IP·vendor/device ID 같은 블록을 싣습니다.

## AR과 CR: 연결을 구성하는 단계

장치를 찾고 이름을 줬으면 Controller가 연결을 만듭니다. System Description 2.6절에 따르면 Controller는 시스템을 올릴 때 구성된 장치마다 AR(Application Relation)을 하나 만들고, 그 안에 CR(Communication Relation)을 정합니다. AR은 계약서, CR은 그 안의 조항입니다.

![Connect, 파라미터 전달과 Application Ready의 개념 순서. 응답 세부와 cyclic 시작 시점은 단순화했습니다.](/images/blog/industrial-ethernet/diagrams/ch07-ar-connect-seq.svg)

| 관계 | 데이터 성격 | 관찰할 내용 |
|---|---|---|
| IO data CR | 주기 입력·출력, 확인 응답 없음 (3.1절) | FrameID, 갱신 주기, 데이터와 status |
| Record data CR | 비주기 read/write, UDP 기반 (3.2절) | API·slot·subslot·index와 응답 오류 |
| Alarm CR | 사건과 확인 응답 | priority, sequence와 ACK |

Connect와 record 접근은 UDP 위의 DCE/RPC로 오갑니다. p-net은 RPC 요청 소켓을 UDP 포트 `0x8894`(34964)로 엽니다(`src/pf_types.h` 62행 `PF_RPC_SERVER_PORT`, `src/device/pf_cmrpc.c` 5584행). Connect가 실패하면 RPC 응답의 오류 코드가 단계와 원인을 알려 줍니다. 예상 모듈·서브모듈이 실제 장치와 달라도 p-net은 Connect를 받아들이고, 차이를 응답의 ModuleDiffBlock에 싣습니다(`pf_cmdev_generate_module_diff()`, `pf_cmdev.c` 4291행). 빈 슬롯은 NO_MODULE, 다른 모듈은 SUBSTITUTE로 표시합니다(4340~4354행). Connect 자체가 거부되는 것은 IOCR 파라미터 같은 요청 블록 검사에서 걸릴 때입니다.

## IOCR: 주기와 APDU status 읽기

[Ch 6](/blog/embedded/protocols/industrial-ethernet/chapter06-profinet)에서 본 대로 갱신 간격은 **31.25 μs × send clock factor × reduction ratio**입니다. 다음 함수는 이 값을 정수 ns로 계산합니다. p-net이 RT class 1~3의 Connect에서 허용하는 조합(send clock factor는 1~128 중 2의 거듭제곱, reduction ratio는 1..512이되 256 이상이면 send clock factor 64 이하, 512면 32 이하, `pf_cmdev.c` 3152~3185행)을 이 함수가 검사하지는 않습니다.

```js title="profinet-update-time.mjs"
export function updateTimeNs(sendClockFactor, reductionRatio) {
  for (const value of [sendClockFactor, reductionRatio]) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new RangeError('positive safe integers required');
    }
  }
  const ns = 31250n * BigInt(sendClockFactor) * BigInt(reductionRatio);
  if (ns > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('result exceeds exact Number range');
  }
  return Number(ns);
}
```

Node v24.22.3에서 실행한 결과입니다. 마지막 줄 (32, 512)는 p-net이 받아들이는 조합이고, System Description 3.1절의 RT 상한 512 ms와 같습니다.

```text
updateTimeNs(32,1) = 1000000
updateTimeNs(2,4)  = 250000
updateTimeNs(32,512) = 512000000
```

주기 프레임에서 IO 데이터 뒤에는 APDU status 4 byte가 옵니다. CycleCounter 2 byte, DataStatus 1 byte, TransferStatus 1 byte입니다. 프레임 끝에 Ethernet padding이 붙을 수 있으므로, status 위치는 프레임 끝이 아니라 IOCR 설정의 데이터 길이로 찾습니다. 다음 예제는 이미 찾아낸 4 byte만 받습니다.

```js title="profinet-apdu-status.mjs"
export function decodeApduStatus(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length !== 4) {
    throw new TypeError('exactly four APDU-status bytes required');
  }
  const status = bytes[2];
  return {
    cycleCounter: bytes[0] * 256 + bytes[1],
    rawDataStatus: status,
    primary: Boolean(status & 0x01),
    dataValid: Boolean(status & 0x04),
    providerRun: Boolean(status & 0x10),
    stationNormal: Boolean(status & 0x20),
    transferStatus: bytes[3],
  };
}
```

비트 위치는 p-net `include/pnet_api.h` 473~493행의 `PNET_DATA_STATUS_BIT_*` 열거형을 따릅니다. bit 0 State(primary), bit 1 Redundancy, bit 2 DataValid, bit 4 ProviderState, bit 5 StationProblemIndicator, bit 7 Ignore입니다. 합성 바이트 `12 34 35 00`을 넣으면 다음이 나옵니다.

```text
{
  cycleCounter: 4660,
  rawDataStatus: 53,
  primary: true,
  dataValid: true,
  providerRun: true,
  stationNormal: true,
  transferStatus: 0
}
```

같은 status를 VLAN priority 6 태그가 붙은 RT 프레임(FrameID 0x8000, IO 데이터 40 byte)에 실어 veth로 보내면 tshark는 비트마다 이름을 붙여 풉니다.

```text
802.1Q Virtual LAN, PRI: 6, DEI: 0, ID: 0
    110. .... .... .... = Priority: Internetwork Control (6)
    Type: PROFINET (0x8892)
PROFINET cyclic Real-Time, RTC1, ID:0x8000, Len:  40, Cycle: 4660 (Valid,Primary,Ok,Run)
    FrameID: 0x8000 (0x8000-0xBBFF: Real-Time(class=1 unicast): non redundant, normal)
    CycleCounter: 4660
    DataStatus: 0x35 (Frame: Valid and Primary, Provider: Ok and Run)
        0... .... = Ignore (1:Ignore/0:Evaluate): 0x0
        .0.. .... = Reserved_2 (should be zero): 0x0
        ..1. .... = StationProblemIndicator (1:Ok/0:Problem): 0x1
        ...1 .... = ProviderState (1:Run/0:Stop): 0x1
        .... 0... = Reserved_1 (should be zero): 0x0
        .... .1.. = DataValid (1:Valid/0:Invalid): 0x1
...
        .... ...1 = State (1:Primary/0:Backup): 0x1
    TransferStatus: 0x00 (OK)
```

tshark도 `stationNormal`에 해당하는 비트를 "1:Ok/0:Problem"으로 풉니다. 이름은 Problem Indicator지만 1이 정상입니다.

### CycleCounter는 프레임 번호가 아닙니다

CycleCounter는 31.25 μs 단위의 시간 눈금입니다. p-net의 `pf_ppm_calculate_next_cyclecounter()`(`pf_ppm.c` 1061행)는 이전 값을 전송 간격(send clock factor × reduction ratio)으로 나눈 몫에 1을 더하고 다시 간격을 곱합니다. 이 함수만 떼어 컴파일해 돌린 결과입니다.

```text
scf=2 rr=4: 8 16 24 32
from 65528 (scf=2 rr=4) -> 0
from 65520 (scf=32 rr=1) -> 0
```

`(2, 4)`에서는 프레임마다 8씩 늘고, 16 bit 끝에서 0으로 돌아갑니다. 받는 쪽의 `pf_cpm_check_cycle()`(`pf_cpm.c` 181행)은 새 값과 이전 값의 차이를 16 bit로 계산해 1~61440이면 새 프레임으로 받고, 그 밖이면 오래되었거나 중복된 프레임으로 봅니다. 그래서 wrap은 정상 동작이고, 차이가 0인 프레임은 버립니다.

### Data hold — 언제 연결을 끊는가

System Description 3.1절은 consumer가 주기 데이터의 도착을 감시하고, 감시 시간 안에 오지 않으면 애플리케이션에 오류를 알린다고 설명합니다. 감시 시간은 update time의 배수입니다. p-net 구현에서 그 배수가 `data_hold_factor`입니다.

| 항목 | p-net public/v1.0.4 |
|---|---|
| 감시 주기 | `control_interval = send_clock_factor × reduction_ratio × 1000 / 32` μs (`pf_cpm.c` 236~239행), 즉 update time |
| 카운터 증가 | 감시 주기마다 `dht++` (`pf_cpm_driver_sw.c` 82행) |
| 카운터 리셋 | 프레임 구조·cycle 검사를 통과하고 DataValid=1인 프레임을 받으면 `dht = 0` (344~382행) |
| 끊는 조건 | `dht >= data_hold_factor`이면 AR abort, 오류 코드 `..._CONSUMER_DHT_EXPIRED` (66~71행) |
| 허용 범위 | `data_hold_factor` 1..0x1E00 (`pf_cmdev.c` 3238~3239행) |

타이머는 카운터를 올리기 전에 먼저 `dht >= data_hold_factor`를 검사하므로, 마지막 유효 프레임 뒤 data_hold_factor+1번째 감시 주기에서 끊깁니다. 예를 들어 update time 1 ms, data hold factor 3이면 유효한 프레임이 약 3~4 ms 동안 오지 않을 때 연결이 끊깁니다. DataValid가 0인 프레임은 도착해도 무시되어 카운터를 리셋하지 않습니다(350~357행). 몇 번 놓치면 끊기는지는 정해진 값이 없고, IOCR마다 Connect에서 정한 data hold factor가 결정합니다. 연결이 끊긴 뒤 출력을 어떤 값으로 둘지는 장치 애플리케이션이 정합니다.

## Record와 alarm: 서로 다른 오류 경로

Record read/write는 API, slot, subslot, index로 대상을 고릅니다. 표준 레코드 중 하나가 I&M(Identification & Maintenance)입니다. System Description 3.2절은 I&M을 IM0~IM5 여섯 블록으로 나눕니다.

| 레코드 | index (p-net `pf_types.h` 666~671행) | System Description 3.2절 |
|---|---|---|
| IM0 | `0xAFF0` | 하드웨어·펌웨어 버전. 모든 장치가 지원해야 함 |
| IM1~IM3 | `0xAFF1`~`0xAFF3` | 설치 위치·날짜 같은 시스템 정보. 구성 시 장치에 씀 |
| IM4 | `0xAFF4` | PROFIsafe 서명 |
| IM5 | `0xAFF5` | 별도 통신 모듈의 정보. 그런 모듈이 있으면 필수 |

System Description의 여섯 블록과 별도로, p-net은 IM6~IM15에 해당하는 `0xAFF6`~`0xAFFF` index 상수도 정의합니다.

Alarm은 따로 오는 비주기 경로입니다. [p-net의 `pf_alarm.c`](https://github.com/rtlabs-com/p-net/blob/public/v1.0.4/src/common/pf_alarm.c) 75~76행은 high priority alarm FrameID를 `0xFC01`, low priority를 `0xFE01`로 정의합니다. System Description 3장의 기본 기능 목록은 alarm을 세 단계로 나눕니다. maintenance required, maintenance demanded(urgent), diagnostics입니다. 3.3절은 maintenance required의 전형적인 예로 media redundancy를 잃은 경우를 듭니다. 이중화 경로 하나가 끊겨도 모든 노드에 아직 닿으므로, 당장의 고장이 아니라 정비가 필요한 상태로 봅니다.

## MRP와 MRPD: 복구 시간을 해석하기

선을 고리로 닫으면 한 곳이 끊겨도 반대쪽으로 돌아갈 수 있습니다. 다만 고리는 그대로 두면 프레임이 계속 도는 루프가 되므로 링 위의 장치 하나가 한 곳을 막아 두어야 합니다.

System Description 6.7절의 두 방식은 다음과 같습니다.

| 방식 | 동작 | 복구 |
|---|---|---|
| MRP (IEC 62439-2) | MRM(Media Redundancy Manager)이 링을 감시하고 MRC(Client)들이 참여합니다. 장애가 나면 경로를 재구성합니다. | TCP/IP·RT 프레임의 전형적 재구성 시간 200 ms 미만 |
| MRPD (Media Redundancy for Planned Duplication) | IRT용. Controller가 IO 데이터를 링의 양방향으로 동시에 보내고, 받는 쪽이 중복 프레임을 버립니다. MRP와 함께 씁니다. | 경로 전환 대기 없이 남은 방향의 데이터를 씀 |

MRP의 200 ms는 상한 보장이 아니라 전형적인(typical) 값입니다. MRP만 쓰는 링에서는 재구성하는 동안 RT 데이터가 끊길 수 있고, 그 시간이 data hold 시간보다 길면 AR이 끊깁니다. 예를 들어 update time 1 ms, data hold factor 3이면 감시 시간이 3~4 ms라 200 ms 재구성을 견디지 못합니다. 링 장애에도 연결을 유지하려면 data hold 시간을 재구성 시간보다 길게 잡거나, IRT라면 MRPD를 씁니다. MRPD는 시동할 때 Controller가 두 방향의 통신 경로 정보를 링의 각 노드에 미리 내려 보내므로, 어느 노드가 고장 나도 남은 경로의 "schedule"이 이미 있습니다.

## 연결 실패를 좁히는 순서

1. DCP Identify 응답의 이름·vendor/device ID가 대상 장치와 맞는지 봅니다. 같은 이름에 두 장치가 응답하면 이름 중복입니다.
2. Connect 응답의 오류와 ModuleDiffBlock을 봅니다. 예상 모듈·서브모듈이 다르면 여기에 차이가 나옵니다.
3. 파라미터 write와 Application Ready 단계의 응답을 봅니다.
4. 두 방향의 cyclic 데이터를 각각 봅니다. FrameID, APDU status의 DataValid·ProviderState, CycleCounter 간격이 기대 update time과 맞는지 확인합니다.
5. AR이 주기적으로 끊기면 abort 원인 코드를 봅니다. p-net 기준으로 `CONSUMER_DHT_EXPIRED`라면 감시 시간 안에 유효 프레임이 오지 않았다는 뜻입니다.

## 정리

- DCP는 EtherType 0x8892의 L2 서비스이고, Identify 요청 0xFEFE·응답 0xFEFF·Get/Set 0xFEFD·Hello 0xFEFC로 구분합니다.
- AR 안에 IO data CR(주기, 확인 응답 없음), Record data CR(UDP RPC), Alarm CR이 있습니다. p-net은 RPC를 UDP 34964에서 받습니다.
- APDU status는 CycleCounter·DataStatus·TransferStatus 4 byte이고, DataStatus bit 5의 1은 정상입니다.
- CycleCounter는 31.25 μs 눈금이며 wrap이 정상입니다. 받는 쪽은 차이 1~61440만 새 프레임으로 받습니다.
- consumer는 약 update time × data hold factor 동안 유효 프레임이 없으면 AR을 끊습니다(p-net은 그다음 감시 주기에 끊음).
- MRP의 전형적 재구성 시간은 200 ms 미만이고, 그보다 짧은 감시 시간을 쓰려면 IRT에서 MRPD를 써야 합니다.

다음 [Ch 8: TSN](/blog/embedded/protocols/industrial-ethernet/chapter08-tsn)에서는 시간 동기화와 트래픽 제어를 IEEE 802.1 표준 기능으로 구성하는 방법을 살펴봅니다.

## 관련 항목

- [Ch 6: PROFINET 개요](/blog/embedded/protocols/industrial-ethernet/chapter06-profinet)
- [Ch 5: EtherCAT Master 구현](/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master)
- [p-net: provider 구현과 cycle counter](https://github.com/rtlabs-com/p-net/blob/public/v1.0.4/src/common/pf_ppm.c)
- [p-net: DataStatus 비트 정의](https://github.com/rtlabs-com/p-net/blob/public/v1.0.4/include/pnet_api.h)
- [p-net: consumer data hold 감시](https://github.com/rtlabs-com/p-net/blob/public/v1.0.4/src/common/pf_cpm_driver_sw.c)
- [PI PROFINET System Description, 2018 update](https://www.profibus.de/fileadmin/media/downloadsection/technical_description_%26_books/PROFINET_System_Description_engl_2018_Update.pdf)
