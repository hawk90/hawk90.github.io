---
title: "PROFINET IO 모델 — Controller·Device·Supervisor 역할 추적"
slug: "embedded/protocols/industrial-ethernet/chapter07-profinet-io"
date: 2026-05-13T09:07:00
description: "PROFINET IO 통신 모델 — AR·CR·DCP·alarm·MRP redundancy까지 한 번에."
series: "Industrial Ethernet 심화"
seriesOrder: 7
tags: [profinet, profinet-io, dcp, rpc, mrp]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **PROFINET IO는 DCP로 장치를 찾고, AR 안에 통신 관계를 구성한 뒤, 각 provider가 주기 데이터를 보냅니다. 장애 감시 시간은 연결에서 협의한 조건으로 판단합니다.**

[앞 장](/blog/embedded/protocols/industrial-ethernet/chapter06-profinet)은 RT와 IRT의 전송 조건을 다뤘습니다. 이 장에서는 발견·연결·데이터 교환·장애 감시의 각 단계에서 무엇을 확인할지 살펴봅니다. 특정 ET 200SP 모델의 기본 주기나 LED 동작을 모든 PROFINET 장치의 규칙으로 사용하지 않습니다.

구현 대조에는 공개 IO-Device 스택 [p-net의 고정 commit `ca4f37c5`](https://github.com/rtlabs-com/p-net/tree/ca4f37c5d66b5378a8cf9349b9084df0612043da)를 사용합니다. 이 코드는 필드 값과 소프트웨어 동작을 확인하는 자료이며, 아래 예제 검증은 PLC 연결이나 인증 시험 결과가 아닙니다.

## 역할과 소유권

| 역할 | 이 장에서 추적할 책임 |
|---|---|
| IO-Controller | 제어 애플리케이션을 실행하고 Device와 통신 관계를 구성합니다. |
| IO-Device | IO 데이터를 제공·소비하고 설정·진단 서비스를 처리합니다. |
| IO-Supervisor | 엔지니어링과 진단 서비스를 사용합니다. |

주기 입력과 출력은 각 provider가 설정된 주기에 독립적으로 보냅니다. 따라서 “Device는 Controller의 요청에만 응답한다”는 polling 모델과 다릅니다. AR 연결이 있어도 두 방향의 데이터 유효성은 따로 살펴야 합니다.

Shared Device는 지원되는 장치의 **서브모듈을 Controller별로 배정**하는 기능입니다. 슬롯 전체를 무조건 한 owner로 묶으면 서로 다른 서브모듈의 배정을 설명할 수 없습니다. Shared Input은 여러 Controller가 같은 입력을 읽는 별도 기능이므로 지원 여부와 설정을 구분합니다.

## DCP: IP가 없는 장치도 발견하기

DCP는 EtherType `0x8892`를 사용하는 L2 프로토콜입니다. 출하 장치에 이름이나 IP가 이미 설정되어 있을 수도 있습니다. 발견 시에는 현재 응답 값을 확인하고, 빈 이름만으로 모든 출하 상태나 고장 원인을 판정하지 않습니다.

![DCP Identify와 Set의 개념 순서. 영구 저장 여부는 요청 조건과 장치 구현에 따릅니다.](/images/blog/industrial-ethernet/diagrams/ch07-dcp-discovery-seq.svg)

[p-net의 `pf_dcp.c`](https://github.com/rtlabs-com/p-net/blob/ca4f37c5d66b5378a8cf9349b9084df0612043da/src/common/pf_dcp.c)의 FrameID 정의는 다음과 같습니다. Identify의 요청·응답과 Get/Set을 모두 `0xFEFE`라고 부르면 패킷을 잘못 분류합니다.

| DCP 메시지 | FrameID |
|---|---|
| Hello | `0xFEFC` |
| Get/Set | `0xFEFD` |
| Identify request | `0xFEFE` |
| Identify response | `0xFEFF` |

Identify request는 multicast로 장치를 찾을 수 있고 응답은 요청자에게 돌아옵니다. Set 성공이 항상 flash 영구 저장을 뜻하지는 않습니다. 요청의 block qualifier, 이름과 IP 각각의 저장 정책, 장치 지원 범위를 확인합니다. 재기동 후 유지 여부는 해당 조건으로 별도 시험해야 합니다.

장치가 보이지 않을 때는 선택한 NIC, 링크와 VLAN 경로, multicast 필터, 실제 송수신 프레임을 차례로 확인합니다. “VLAN 0를 명시적으로 허용하면 된다”는 보편 설정법은 없습니다. 설정을 바꾸기 전에 스위치가 priority tag를 어떻게 처리하는지 확인합니다.

## AR과 CR: 연결을 구성하는 단계

AR(Application Relation)은 Controller와 Device 사이의 통신 관계를 묶습니다. 그 안에 IOCR, RecordDataCR, AlarmCR 등의 관계가 들어갑니다. RPC의 Connect와 파라미터 전달, 준비 상태 교환이 어느 단계에서 실패하는지를 나누어 보면 원인을 좁힐 수 있습니다.

![Connect, 파라미터 전달과 Application Ready의 개념 순서. 응답 세부와 cyclic 시작 시점은 단순화했습니다.](/images/blog/industrial-ethernet/diagrams/ch07-ar-connect-seq.svg)

| 관계 | 데이터 성격 | 관찰할 내용 |
|---|---|---|
| IOCR | 주기 입력·출력 | FrameID, 갱신 주기, 데이터와 status |
| RecordDataCR | 비주기 read/write | API·slot·subslot·index와 응답 오류 |
| AlarmCR | 사건과 확인 응답 | priority, sequence와 ACK·재전송 |

DCE/RPC를 사용한다고 해서 모든 장치의 서비스 포트가 고정 UDP 49152인 것은 아닙니다. 실제 endpoint와 Connect 응답을 확인해야 합니다. LED 색상 역시 제조사별 표시이므로 AR 성공의 유일한 증거로 삼지 않습니다.

## IOCR: 주기와 APDU status 읽기

갱신 간격은 **31.25 μs × send clock factor × reduction ratio**로 계산합니다. 아래 프로그램은 단위 환산만 수행하며, 입력 조합이 특정 장치에서 허용되는지는 판정하지 않습니다. GSDML의 지원 값, 연결 협의와 실제 전송이 모두 맞아야 합니다.

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

`updateTimeNs(32, 1)`은 1,000,000 ns, `(2, 4)`는 250,000 ns입니다. `31.25 μs × reduction ratio`만 적으면 send clock factor를 빠뜨립니다. 또한 최소 장치 간격이 1 ms라면 250 μs 설정을 단위 환산만으로 정당화할 수 없습니다.

주기 프레임의 IO 데이터 위치와 길이는 설정된 IOCR의 데이터 배치에 따라 읽습니다. APDU status는 CycleCounter 2 B, DataStatus 1 B, TransferStatus 1 B입니다. Ethernet padding까지 포함한 프레임의 마지막 4 B를 무조건 status로 해석하면 안 됩니다.

다음 예제는 **IOCR 설정으로 이미 찾아낸 정확히 4 B의 status 조각**만 받습니다. Ethernet 프레임 탐색기나 전체 PROFINET 검증기는 아닙니다. TransferStatus와 나머지 DataStatus 비트는 원시 값으로 보존합니다.

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

예를 들어 합성 바이트 `12 34 35 00`은 counter `0x1234`, 위 네 비트가 모두 참인 status를 뜻합니다. `stationNormal`의 1은 정상이며, 0은 문제 표시입니다. 실제 캡처에서 얻은 바이트라는 주장은 하지 않습니다.

CycleCounter는 단순한 “송신 프레임 번호 +1”이 아닙니다. p-net의 `pf_ppm_calculate_next_cyclecounter()`는 send clock factor와 reduction ratio의 곱에 맞춰 다음 값을 만들고 16 bit로 반환합니다. `(2,4)`의 정렬된 값은 0, 8, 16으로 증가하며 끝에서는 wrap합니다. 누락을 판단할 때는 주기 조건과 wrap을 고려해야 합니다.

소비자의 data hold 감시는 협의된 인자와 스택 구현에 따릅니다. 보편적인 “2회 누락” 또는 “3회 누락” 규칙을 둘 수 없습니다. 통신 상실 시 대체 출력, 애플리케이션 오류와 기능 안전 동작도 별도 조건입니다. 일반 PROFINET timeout을 곧바로 안전 기능 완료로 해석하지 않습니다.

## Record와 alarm: 서로 다른 오류 경로

Record read/write에는 API, slot, subslot, index와 데이터가 관여합니다. index의 범위는 레코드의 적용 범위와 사양 판에 맞춰 해석해야 합니다. 예를 들어 `0xC000~0xF7FF` 전체를 vendor-specific이라고 쓰면 표준 레코드와 겹칩니다.

| 레코드 예 | 이 장의 해석 범위 |
|---|---|
| `0xAFF0` | I&M 0 식별 정보 |
| `0xAFF1` | I&M 1. 지원 여부와 필드 의미를 확인합니다. |
| `0xAFF2`~`0xAFF5` | 정의된 I&M 레코드들입니다. 모두 사용자 임의 형식인 것은 아닙니다. |
| 그 밖의 index | 장치 문서와 해당 레코드 정의를 대조합니다. |

[p-net의 `pf_alarm.c`](https://github.com/rtlabs-com/p-net/blob/ca4f37c5d66b5378a8cf9349b9084df0612043da/src/common/pf_alarm.c)는 high priority alarm FrameID를 `0xFC01`, low priority를 `0xFE01`로 정의합니다. 기존의 `0xC008`/`0xC009`는 이 값이 아닙니다. 사건 종류와 priority 설정은 별도로 확인하며, high를 모든 process alarm과 무조건 일치시키지 않습니다.

Alarm은 ACK와 재전송을 갖는 비주기 경로입니다. 진단 발생·해소나 모듈 pull/plug를 관찰할 때는 동일 사건의 반복과 ACK 누락을 구분합니다. 엔지니어링 도구의 진단 버퍼 표시가 네트워크상의 모든 alarm을 그대로 보존한다고 가정하지 않습니다.

## MRP와 MRPD: 복구 시간을 해석하기

MRP(Media Redundancy Protocol)는 링의 정상 상태에서 루프를 막고 장애 시 전달 경로를 재구성합니다. MRM은 링을 감시하고 MRC가 링에 참여합니다. 실제 링에는 해당 기능을 지원하고 올바르게 구성된 경로가 필요합니다.

[PI System Description의 §6.7](https://www.profibus.de/fileadmin/media/downloadsection/technical_description_%26_books/PROFINET_System_Description_engl_2018_Update.pdf)은 MRP의 전형적 재구성 시간을 200 ms 미만으로 설명합니다. 이 값은 모든 제품·프로파일·고장 조건에서의 고정 복구 시간이 아닙니다. IO 유지 시간과 복구 시간을 비교해야 하며, “3회 누락이므로 cycle ≥70 ms여야 한다”는 계산은 성립하지 않습니다.

MRPD의 이름은 **Media Redundancy for Planned Duplication**입니다. IRT 데이터를 계획된 두 경로로 중복 전송하고 수신 측에서 중복을 처리하는 방식이며 MRP와 함께 사용됩니다. 빠른 주기를 설정했다는 이유만으로 모든 장치에 MRPD가 필요하거나 지원된다고 단정하지 않습니다.

## 연결 실패를 좁히는 순서

1. DCP 응답의 이름·식별자와 실제 대상 장치를 확인합니다. 중복 이름이나 다른 NIC에서의 응답을 구분합니다.
2. Connect의 예상 모듈·서브모듈과 실제 장치 구성이 일치하는지 봅니다. 제품·펌웨어에 맞는 GSDML인지 확인합니다.
3. 파라미터 write와 Application Ready 단계의 응답 오류를 확인합니다. 무조건 기존 GSDML부터 삭제하지 않습니다.
4. 두 방향의 cyclic 데이터를 각각 확인합니다. FrameID, 배치, status, 갱신 간격과 data hold 설정을 함께 봅니다.
5. 링 장애라면 MRP 상태와 실제 단절·복구 시간을 비교합니다. 링크 복구와 애플리케이션의 유효 데이터 복귀는 같은 사건이 아닙니다.

## 정리

- DCP는 L2이며 Identify 요청·응답과 Get/Set의 FrameID가 다릅니다.
- AR 안에서 주기 IO, record 접근과 alarm의 역할을 구분합니다.
- 갱신 간격 계산에는 send clock factor와 reduction ratio가 모두 필요합니다.
- APDU status는 설정된 위치에서 읽고, counter 간격과 wrap을 고려합니다.
- 장애 감시는 협의한 조건으로 판단하며 기능 안전 완료를 뜻하지 않습니다.
- Shared Device의 소유권 단위는 서브모듈이며, MRP와 MRPD의 복구 원리는 다릅니다.

다음 [Ch 8: TSN](/blog/embedded/protocols/industrial-ethernet/chapter08-tsn)에서는 시간 동기화와 트래픽 제어를 표준 이더넷 기능으로 구성하는 방법을 살펴봅니다.

## 관련 항목

- [Ch 6: PROFINET 개요](/blog/embedded/protocols/industrial-ethernet/chapter06-profinet)
- [Ch 5: EtherCAT Master 구현](/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master)
- [p-net: provider 구현과 cycle counter](https://github.com/rtlabs-com/p-net/blob/ca4f37c5d66b5378a8cf9349b9084df0612043da/src/common/pf_ppm.c)
- [p-net: DataStatus 비트 정의](https://github.com/rtlabs-com/p-net/blob/ca4f37c5d66b5378a8cf9349b9084df0612043da/include/pnet_api.h)
