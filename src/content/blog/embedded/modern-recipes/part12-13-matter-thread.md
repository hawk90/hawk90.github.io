---
title: "Matter·Thread 분석 — IoT 통합 표준·Commissioning·Multi-Fabric"
slug: "embedded/modern-recipes/part12-13-matter-thread"
date: 2026-04-21T09:11:00
description: "Apple·Google·Amazon·Samsung이 공동으로 만든 Matter 1.3/1.4와 Thread 1.3 mesh를 합쳐 IoT device를 한 번에 모든 ecosystem에 등록하는 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 149
tags: [recipes, iot, matter, thread, openthread, csa]
topics: ["embedded"]
---

## 한 줄 요약

> **"Matter는 여러 생태계가 같이 쓰는 IoT application-layer 표준이고, Thread는 그 아래에서 저전력 장치를 IPv6 mesh로 묶는 transport입니다."** 아래에서 OpenThread simulation으로 leader·router·sleepy child 세 node를 띄워 보니, sleepy child까지의 ping 왕복 시간이 poll period에 그대로 묶였습니다.

## 이 글의 실행 환경과 출처

- OpenThread `main` commit `5251dce`(2026-11-15). Debian 13 arm64 guest에서 `./script/cmake-build simulation`으로 빌드한 `ot-cli-ftd`·`ot-cli-mtd`를 Python script로 조작했습니다.
- Matter 쪽은 실행하지 않았습니다. `project-chip/connectedhomeip`(commit `e0a616e`)와 `espressif/esp-matter`(commit `80fc466`)의 소스·문서와 대조했습니다. Matter 명세 본문은 열어 보지 못했으므로, 명세 수준의 값은 SDK의 data model XML에 적힌 것만 옮겼습니다.

## 어떤 상황에서 쓰나

조명·잠금장치·센서처럼 집이나 건물에서 여러 브랜드의 controller와 함께 동작해야 하는 장치입니다. 장치 하나가 여러 생태계의 controller에 동시에 등록될 수 있어야 하고, 배터리 장치는 오래 잠들어 있어야 합니다.

## 핵심 개념

### Matter

| 층 | 구성 |
|----|------|
| Application | Data Model: Endpoint·Cluster·Attribute·Command |
| Security | PASE(setup code 기반 commissioning session), CASE(operational certificate 기반 session) |
| Transport | IPv6. Thread·Wi-Fi·Ethernet |

장치 하나가 여러 fabric(생태계별 관리 영역)에 들어갈 수 있고, fabric마다 별도의 NOC(Node Operational Certificate)를 받습니다. Operational Credentials cluster의 data model XML은 `SupportedFabrics` attribute를 `min="5" max="254"`로 정의하고, connectedhomeip SDK의 기본값은 `CHIP_CONFIG_MAX_FABRICS 16`입니다.

### Thread

Thread는 IEEE 802.15.4 위의 IPv6 mesh입니다. OpenThread CLI의 `state`는 `leader`, `router`, `child` 등으로 node의 역할을 보여 주고, `mode`로 child의 성격(수신기를 항상 켤지, FTD인지)을 정합니다. 수신기를 끈 child(Sleepy End Device)는 parent에게 주기적으로 poll해서 쌓인 message를 받습니다.

OpenThread는 `include/openthread/thread.h`에 Thread version을 `OT_THREAD_VERSION_1_1`~`1_4`로 두고, CSL transmitter 같은 기능을 `OPENTHREAD_CONFIG_THREAD_VERSION >= OT_THREAD_VERSION_1_2`일 때만 켭니다. 아래 simulation의 neighbor table에서 version은 5(= 1.4)로 나왔습니다.

## 코드 / 실제 사용 예

### OpenThread simulation — leader, router, sleepy child

```bash
git clone --depth 1 https://github.com/openthread/openthread.git
cd openthread
git submodule update --init --recursive --depth 1    # mbedtls and its own submodule
./script/cmake-build simulation
./build/simulation/examples/apps/cli/ot-cli-ftd 1    # node id 1; nodes talk over the simulated radio
```

`--recursive` 없이 submodule을 받으면 mbedtls 안의 submodule이 비어 CMake 단계에서 "CMakeLists.txt not found"로 멈춥니다.

script는 node마다 프로세스를 띄우고 CLI 명령을 보냅니다. node 1이 새 dataset으로 network를 만들고, node 2(FTD)와 node 3(MTD)이 같은 dataset으로 들어옵니다.

```text
node 1: dataset init new / dataset channel 15 / dataset panid 0x1234
        dataset networkkey 00112233445566778899aabbccddeeff / dataset commit active
        ifconfig up / thread start
node 2: routerselectionjitter 1 / dataset set active <hex from node 1> / ifconfig up / thread start
node 3: mode - / pollperiod 5000 / dataset set active <hex> / ifconfig up / thread start
```

`mode -`는 수신기를 끄고(`r` 없음) MTD로 동작하는 sleepy child입니다. 결과입니다.

```text
[1] became leader after 7.7 s
[2] state router after 2.6 s
[3] state child after 1.5 s
[3] > mode
     -
[3] > pollperiod
     5000
[1] > child table
     | ID  | RLOC16 | Timeout    | Age        | LQ In | C_VN |R|D|N|Ver|CSL|QMsgCnt|Suprvsn| Extended MAC     |
     |   2 | 0x3c02 |        240 |          0 |     3 |  214 |0|0|0|  5| 0 |     0 |   129 | a2266e84e078ce9d |
[1] > neighbor table
     | Role | RLOC16 | Age | Avg RSSI | Last RSSI | LQ In |R|D|N| Extended MAC     | Version |
     |   C  | 0x3c02 |   0 |      -20 |       -20 |     3 |0|0|0| a2266e84e078ce9d |       5 |
     |   R  | 0xe000 |   1 |      -20 |       -20 |     3 |1|1|1| 12d308569ae7ff58 |       5 |
```

node 3은 leader(RLOC16 `0x3c00`)의 child `0x3c02`가 됐고, child table의 `R` 열이 0(수신기 꺼짐)입니다. node 2는 router `0xe000`입니다. router가 되는 데 걸린 2.6 s는 `routerselectionjitter 1`로 jitter를 1초로 줄였기 때문입니다. CLI README의 예시 출력에서 이 값은 120입니다.

### Sleepy child까지의 지연

leader에서 sleepy child의 ML-EID로 ping을 보냈습니다. OpenThread CLI의 ping 형식은 `ping <ipaddr> [size] [count] [interval] [hoplimit] [timeout]`입니다.

```text
### pollperiod 5000 ms: ping leader -> SED, 5 echo requests, 1 s interval, 10 s timeout
16 bytes from fd00:534a:f8ec:793b:658:72cd:abe5:6c49: icmp_seq=1 hlim=64 time=2803ms
16 bytes from fd00:534a:f8ec:793b:658:72cd:abe5:6c49: icmp_seq=2 hlim=64 time=1806ms
16 bytes from fd00:534a:f8ec:793b:658:72cd:abe5:6c49: icmp_seq=3 hlim=64 time=803ms
16 bytes from fd00:534a:f8ec:793b:658:72cd:abe5:6c49: icmp_seq=4 hlim=64 time=4800ms
16 bytes from fd00:534a:f8ec:793b:658:72cd:abe5:6c49: icmp_seq=5 hlim=64 time=3800ms
5 packets transmitted, 5 packets received. Packet loss = 0.0%. Round-trip min/avg/max = 803/2802.400/4800 ms.
### pollperiod 1000 ms: same ping
Round-trip min/avg/max = 3/211.000/1012 ms.
```

parent는 child가 poll할 때까지 message를 들고 있으므로, 왕복 시간은 0에서 poll period 사이로 퍼집니다. poll period 5 s에서는 0.8~4.8 s, 1 s에서는 3~1012 ms였습니다. 처음에 timeout을 주지 않고 ping했을 때는 3번 중 2번이 실패했는데, OpenThread의 기본 ping timeout(`OPENTHREAD_CONFIG_PING_SENDER_DEFAULT_TIMEOUT`)이 3000 ms로 poll period 5 s보다 짧기 때문입니다. sleepy 장치를 상대하는 application의 timeout도 같은 이유로 poll period보다 길어야 합니다.

### OpenThread C API

위 CLI 명령에 해당하는 API입니다. OpenThread header(`include/`, `examples/platforms/openthread-system.h`)로 컴파일만 했습니다.

```c
otInstance *thread_init(void) {
    otInstance *ot = otInstanceInitSingle();
    otOperationalDataset ds;
    memset(&ds, 0, sizeof ds);
    ds.mActiveTimestamp.mSeconds = 1;
    ds.mComponents.mIsActiveTimestampPresent = true;
    memcpy(ds.mNetworkKey.m8, network_key, sizeof network_key);
    ds.mComponents.mIsNetworkKeyPresent = true;
    ds.mChannel = 15;
    ds.mComponents.mIsChannelPresent = true;
    otDatasetSetActive(ot, &ds);
    otIp6SetEnabled(ot, true);
    otThreadSetEnabled(ot, true);
    return ot;
}

void make_sleepy(otInstance *ot) {
    otLinkModeConfig mode = { .mRxOnWhenIdle = false, .mDeviceType = false, .mNetworkData = false };
    otThreadSetLinkMode(ot, mode);
    otLinkSetPollPeriod(ot, 5000);
}

void dump_neighbors(otInstance *ot) {
    otNeighborInfoIterator it = OT_NEIGHBOR_INFO_ITERATOR_INIT;
    otNeighborInfo info;
    while (otThreadGetNextNeighborInfo(ot, &it, &info) == OT_ERROR_NONE)
        printf("neighbor rloc=%04x rssi=%d lq_in=%d\n", info.mRloc16, info.mAverageRssi, info.mLinkQualityIn);
}

void main_loop(otInstance *ot) {
    for (;;) { otTaskletsProcess(ot); otSysProcessDrivers(ot); }
}
```

이전 판은 network key 외에 PAN ID·network name 같은 항목을 두지 않은 dataset이었습니다. 위 simulation은 `dataset init new`가 나머지 항목을 채운 뒤 일부만 바꿨습니다. 실제 장치에서는 commissioning으로 받은 dataset 전체를 씁니다.

### Matter SDK 빌드 (Linux example)

connectedhomeip `docs/guides/BUILDING.md`와 `examples/lighting-app/linux/README.md`의 순서입니다. 이 글에서는 실행하지 않았습니다.

```bash
git clone https://github.com/project-chip/connectedhomeip
cd connectedhomeip
./scripts/checkout_submodules.py --shallow --platform linux
source scripts/activate.sh
cd examples/lighting-app/linux
gn gen out/debug
ninja -C out/debug
```

### Attribute 변경 callback

On/Off command 자체는 SDK의 cluster server가 처리하고, application은 attribute가 바뀐 뒤 불리는 `MatterPostAttributeChangeCallback`에서 hardware를 움직입니다. `examples/lighting-app/linux/main.cpp`의 구현입니다.

```cpp
void MatterPostAttributeChangeCallback(const chip::app::ConcreteAttributePath & attributePath, uint8_t type, uint16_t size,
                                       uint8_t * value)
{
    if (attributePath.mClusterId == OnOff::Id && attributePath.mAttributeId == OnOff::Attributes::OnOff::Id)
    {
        LightingMgr().InitiateAction(*value ? LightingManager::ON_ACTION : LightingManager::OFF_ACTION);
    }
}
```

### esp-matter

esp-matter의 `examples/light/main/app_main.cpp`는 node를 만들고 light endpoint를 붙인 뒤 Matter stack을 시작합니다. 아래는 그 구조를 on/off light로 줄인 것이고, 함수 선언은 esp-matter header와 대조했습니다.

```cpp
node::config_t node_config;
node_t *node = node::create(&node_config, app_attribute_update_cb, app_identification_cb);

on_off_light::config_t light_config;
endpoint_t *endpoint = on_off_light::create(node, &light_config, ENDPOINT_FLAG_NONE, light_handle);

esp_matter::start(app_event_cb);
```

`on_off_light::create`의 선언은 `endpoint_t *create(node_t *node, config_t *config, uint8_t flags, void *priv_data)`이고(`data_model/legacy/esp_matter_endpoint_impl.h`), 예제는 `extended_color_light::create`를 같은 형태로 부릅니다.

### Commissioning 순서

connectedhomeip controller의 `CommissioningDelegate.h`에 있는 commissioning 단계 중 주요한 것입니다.

| 단계 | 내용(소스 주석) |
|------|----------------|
| `kSecurePairing` | Establish a PASE session with the device |
| `kArmFailSafe` | ArmFailSafe command |
| `kSendPAICertificateRequest`, `kSendDACCertificateRequest` | PAI·DAC CertificateChainRequest |
| `kSendAttestationRequest`, `kAttestationVerification` | AttestationRequest를 보내고 응답 검증 |
| `kAttestationRevocationCheck` | DAC chain의 폐기 여부 확인 |
| `kSendOpCertSigningRequest`, `kValidateCSR` | CSRRequest와 응답 검증 |
| `kSendTrustedRootCert`, `kSendNOC` | AddTrustedRootCertificate, AddNOC |
| `kThreadNetworkSetup` / `kWiFiNetworkSetup` | AddOrUpdateThreadNetwork / AddOrUpdateWiFiNetwork |
| `kThreadNetworkEnable` / `kWiFiNetworkEnable` | ConnectNetwork |
| `kFindOperationalForCommissioningComplete` | operational discovery와 CASE session |
| `kSendComplete` | CommissioningComplete |

PASE로 시작해 DAC chain으로 장치를 확인하고, NOC를 설치한 뒤 운영 network에 붙이고, CASE로 다시 접속해 끝냅니다. DAC가 없거나 검증에 실패하면 attestation 단계에서 멈춥니다.

### OTA

connectedhomeip data model XML에서 OTA Software Update Provider cluster는 `0x0029`, Requestor cluster는 `0x002A`입니다. Provider cluster에는 `QueryImage`, `ApplyUpdateRequest`, `NotifyUpdateApplied` command가 있고, `QueryImageResponse`에 `ImageURI`가 들어가며, 전송 방식으로 `BDXSynchronous`·`BDXAsynchronous`가 정의되어 있습니다. 장치 안에서 받은 image를 검증·설치하는 것은 platform bootloader의 몫이고, TF-M 장치라면 [12-12](/blog/embedded/modern-recipes/part12-12-tfm-trustzone)의 MCUboot가 그 역할을 합니다.

## 측정 / 성능 비교

위 ping 실험이 이 글의 측정입니다. simulation은 radio 환경을 흉내 내지 않으므로 mesh 성능 숫자로 쓰지 않습니다. 설치 환경에서는 다음을 잽니다.

| 지표 | 측정 방법 |
|------|-----------|
| commissioning 시간 | controller log의 단계별 timestamp |
| command 지연(hop 수별) | controller 송신 → attribute report |
| sleepy 장치 응답 시간 | poll period·CSL 설정별(위 실험처럼 poll period가 상한) |
| router 제거 뒤 회복 시간 | route 재수렴까지 |
| 배터리 수명 | 평균 전류 = sleep 전류와 poll·송신·센서 burst의 시간 가중 평균, 수명 ≈ 유효 용량 / 평균 전류 |

## 자주 보는 함정

> ⚠️ application timeout이 poll period보다 짧음

sleepy child로 가는 응답은 최대 poll period만큼 늦습니다. 위 실험에서 기본 ping timeout 3 s는 poll period 5 s에서 실패했습니다.

> ⚠️ poll period를 너무 짧게

1 s로 줄이면 지연이 1 s 안으로 들어오지만 그만큼 radio를 자주 켭니다. 지연 요구와 배터리 계산을 같이 보고 정합니다.

> ⚠️ OpenThread submodule을 재귀로 받지 않음

`git submodule update --init --recursive`를 빼면 mbedtls의 하위 submodule이 비어 빌드가 멈춥니다.

> ⚠️ fabric 한도

`SupportedFabrics`의 최소값은 5이고 SDK 기본값은 16입니다. `CommissionedFabrics`로 현재 수를 보고, 쓰지 않는 fabric을 지울 수 있게 합니다.

> ⚠️ DAC 없이 출하

commissioning의 attestation 단계(`kSendDACCertificateRequest`~`kAttestationVerification`)에서 실패합니다. 장치마다 공장에서 DAC chain을 넣고, private key는 보호된 저장소에 둡니다.

> ⚠️ OTA를 받아도 되돌릴 수 없음

OTA cluster는 image를 전달할 뿐입니다. 새 image가 부팅하지 못할 때 되돌리려면 bootloader가 이전 image를 보존하도록 업데이트 전략을 고릅니다([12-12](/blog/embedded/modern-recipes/part12-12-tfm-trustzone)).

## 정리

- Matter는 Data Model·PASE/CASE·IPv6 transport로 이루어지고, 장치는 fabric마다 NOC를 받습니다. `SupportedFabrics`는 최소 5, SDK 기본 한도는 16입니다.
- Thread의 sleepy child는 parent에 poll해서 message를 받으므로, 지연의 상한이 poll period입니다(simulation에서 5 s → 최대 4.8 s, 1 s → 최대 1.012 s).
- OpenThread simulation으로 leader·router·sleepy child를 PC에서 바로 재현할 수 있습니다.
- commissioning은 PASE → attestation(DAC chain) → CSR·NOC 설치 → network 설정 → CASE → CommissioningComplete 순서이고, SDK의 `CommissioningDelegate.h`가 그 단계를 정의합니다.
- OTA cluster(`0x0029`/`0x002A`)는 image 전달까지이고, 검증·설치·rollback은 bootloader가 맡습니다.

## 관련 항목

- [12-12: TF-M TrustZone](/blog/embedded/modern-recipes/part12-12-tfm-trustzone)
- [12-01: Edge Inference](/blog/embedded/modern-recipes/part12-01-edge-inference)
- [RTOS 4-11: TrustZone·TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
