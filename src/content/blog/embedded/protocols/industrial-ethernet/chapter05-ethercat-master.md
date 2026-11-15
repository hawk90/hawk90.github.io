---
title: "EtherCAT Master 구현 — SOEM API와 구성·검증의 경계"
slug: "embedded/protocols/industrial-ethernet/chapter05-ethercat-master"
date: 2026-05-13T09:05:00
description: "SOEM v1.4.0의 NIC 조회·WKC 계산을 실행하고, OP 전환·주기 실행·ESI/SII 구성에서 별도로 검증할 조건을 살펴봅니다."
series: "Industrial Ethernet 심화"
seriesOrder: 5
tags: [ethercat, soem, igh, twincat]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **"EtherCAT 마스터는 전용 하드웨어가 아니라 *일반 NIC + 결정적 소프트웨어*로 만든다."** SOEM(작고 portable), IgH(커널 모듈, 고성능), TwinCAT(상용 Windows) 셋 중 목적에 맞춰 고릅니다.

EtherCAT의 *경제성*을 떠받치는 핵심은 *마스터의 단순함*입니다. 슬레이브는 ASIC이 필요하지만, 마스터는 *일반 1 Gbps NIC + Linux PC*면 충분합니다. 이 비대칭이 EtherCAT을 빠르게 퍼뜨렸습니다.

이 장은 마스터 측 구현 세 가지를 비교하고, SOEM C API로 NIC 목록과 기대 WKC를 확인합니다. 실제 OP 주기 통신은 별도 검증 범위로 구분합니다. 마지막에 슬레이브 측의 ESC 칩 선택과 ENI/ESI XML 파일 구조를 정리합니다.

## 세 가지 마스터 — 한눈 비교

| 항목 | SOEM | IgH (EtherCAT Master) | TwinCAT |
|------|------|----------------------|---------|
| 라이선스 | v1.4.0 LICENSE의 GPLv2 + 예외·추가 기술 조건 확인 | 선택 버전의 license 확인 | 제품·기능별 상용 조건 |
| 형태 | 순수 C 라이브러리 | 커널 모듈 + userspace lib | Windows 통합 IDE |
| OS | Linux/Windows/RTOS | Linux (커널 패치) | Windows + RT extension |

세 가지 모두 *정상 동작*하지만 *지향점*이 다릅니다.

- **SOEM**: 가볍게 시작하고 싶을 때. 임베디드 RTOS(FreeRTOS, NuttX)에도 포팅 가능.
- **IgH**: production 수준의 결정성. CNC, 로봇 컨트롤러 등에 적합.
- **TwinCAT**: PLC 프로그래머가 익숙한 환경. *Beckhoff IO 모듈*과 매칭이 자연스러움.

이 글은 [SOEM v1.4.0 LICENSE](https://github.com/OpenEtherCATsociety/SOEM/blob/abbf0d42e38d6cfbaa4c1e9e8e07ace651c386fd/LICENSE)·[EtherLab 1.6 API](https://docs.etherlab.org/ethercat/1.6/doxygen/group__ApplicationInterface.html)를 기준으로 구현 경계를 구분합니다. Cycle·jitter·지역별 채택률·라이선스 비용을 같은 조건으로 측정하거나 조사한 비교는 아닙니다.

## SOEM — Simple Open EtherCAT Master

SOEM은 *학습용 + 임베디드용* 마스터의 표준입니다. 이 글은 tag v1.4.0의 API에 한정합니다. 이후 버전의 구조·라이선스·예제는 별도로 확인해야 합니다.

### 빌드

아래는 소스 버전을 고정해 임시 build directory에 라이브러리만 만드는 예입니다. 시스템 install이나 slave 상태 변경을 포함하지 않습니다.

```bash
git clone --branch v1.4.0 --depth 1 https://github.com/OpenEtherCATsociety/SOEM.git
cmake -S SOEM -B soem-build -DCMAKE_POLICY_VERSION_MINIMUM=3.5
cmake --build soem-build --target soem --parallel 2
```

`CMAKE_POLICY_VERSION_MINIMUM`은 구형 CMakeLists를 새 CMake에서 configure할 때의 호환 설정입니다. 생성된 static library의 경로·OS library·include 경로는 실제 build 결과로 확인합니다. 이 작업의 검증은 macOS port의 library build이며 Linux RT 실행과 다릅니다.

### NIC 목록 조회 예제

다음 완결된 C 프로그램은 adapter 목록을 조회하고 해제합니다. `ec_init()`·`ec_config_init()`·PDO 송신·OP 요청을 호출하지 않습니다. NIC를 찾았다는 사실은 slave 연결이나 주기 통신 성공을 뜻하지 않습니다.

```c title="soem-adapter-list.c"
#include <stdio.h>
#include "ethercat.h"
int main(void) {
    ec_adaptert *head = ec_find_adapters();
    if (!head) {
        fputs("No adapter list available\n", stderr);
        return 1;
    }
    for (ec_adaptert *adapter = head; adapter; adapter = adapter->next) {
        printf("%s\t%s\n", adapter->name, adapter->desc);
    }
    ec_free_adapters(head);
    return 0;
}
```

Linux에서는 port에 맞는 pthread·rt 등의 link library가, macOS에서는 pthread·pcap과 실제 SOEM include 경로가 필요합니다. 출력은 실제 환경에서 확인하며 고정 slave 목록을 실행 결과로 제시하지 않습니다.

### OP 초기화는 별도의 시험 범위입니다

[공식 simple_test](https://github.com/OpenEtherCATsociety/SOEM/blob/abbf0d42e38d6cfbaa4c1e9e8e07ace651c386fd/test/linux/simple_test/simple_test.c)는 discovery·mapping·SAFE_OP·process data·OP 흐름을 보여 줍니다. 다만 `ec_config_map()`은 호출자 buffer의 용량을 인자로 받지 않습니다. 고정4096 B IOmap을 임의의 실기에 넘기고 반환값을 나중에 검사해도 이미 발생한 overflow를 막을 수는 없습니다. 선택한 slave/PDO의 필요 용량과 mapping 구현을 확인한 시험 구성이 필요합니다.

실행할 master는 statecheck 반환값·초기 output·timeout·WKC 부족과 상태 이상 시 처리·종료와 복귀를 개별적으로 설계해야 합니다. 40회×50,000 μs의 상태 대기만 약2초이고 송수신·재시도도 더해지므로 이를200 ms 상한이라고 부를 수는 없습니다. 여기서는 실제 OP 전환이나 output 제어를 실행하지 않습니다.

### 기대 WKC 계산

v1.4.0의 `ec_groupt`에 `expectedWKC` field는 없습니다. [공식 예제](https://github.com/OpenEtherCATsociety/SOEM/blob/abbf0d42e38d6cfbaa4c1e9e8e07ace651c386fd/test/linux/simple_test/simple_test.c)는 `outputsWKC*2 + inputsWKC`을 계산합니다. 다음 순수 함수는 실제 타입을 사용합니다.

```c title="soem-expected-wkc.c"
#include <stdbool.h>
#include "ethercat.h"
bool expected_wkc(const ec_groupt *group, int *result) {
    if (!group || !result) return false;
    *result = 2 * (int)group->outputsWKC + (int)group->inputsWKC;
    return true;
}
```

예를 들어 input/output이 각1회이면 기대값은3이며 input만 성공한 값1은 그1/3입니다. WKC 부족량만으로 고장 slave 수나 특정 SM 번호를 유일하게 추정할 수는 없습니다.

### RT cycle thread

상대 sleep의 누적 drift를 줄이는 한 방법으로 `clock_nanosleep(CLOCK_MONOTONIC, TIMER_ABSTIME, ...)`로 *절대 시각 wakeup*을 씁니다.

```c
struct timespec next_cycle;
clock_gettime(CLOCK_MONOTONIC, &next_cycle);

while (running) {
    next_cycle.tv_nsec += 1000000;  /* 1 ms */
    if (next_cycle.tv_nsec >= 1000000000) {
        next_cycle.tv_sec++;
        next_cycle.tv_nsec -= 1000000000;
    }
    clock_nanosleep(CLOCK_MONOTONIC, TIMER_ABSTIME, &next_cycle, NULL);

    ec_send_processdata();
    ec_receive_processdata(EC_TIMEOUT);

    /* control logic here */
}
```

위 block은 실행 가능한 전체 프로그램이 아닌 Linux의 주기 대기 흐름 발췌입니다. 반환값·EINTR·overrun·late cycle 처리와 종료 조건이 필요합니다. 절대 시각 대기는 누적 drift를 줄이는 수단이며 특정 jitter·deadline을 보장하지 않습니다.

## IgH EtherCAT Master

IgH(EtherCAT Master, Ingenieurgemeinschaft IgH가 개발)는 *커널 모듈 + userspace 라이브러리* 구조입니다.

![IgH 구조 — userspace API → ioctl → userspace lib → /dev/EtherCAT0 → 커널 모듈 → NIC](/images/blog/industrial-ethernet/diagrams/ch05-igh-stack.svg)

IgH는 선택한 kernel·장치에 맞는 native driver 또는 generic driver 경로를 확인해야 합니다. 두 경로의 대역폭·jitter 우열은 구성과 측정 없이 고정하지 않습니다.

### 구성과 API의 경계

[EtherLab 공식 문서](https://etherlab.org/en_GB/ethercat)는 stable-1.6 문서를 제공합니다. Kernel·driver 조합과 설치 방식은 그 버전에 맞춰 정하며 여기서는 모듈 설치나 서비스 시작을 실행하지 않습니다.

[1.6 application API](https://docs.etherlab.org/ethercat/1.6/doxygen/group__ApplicationInterface.html)에서 request master→create domain→slave config/PDO entry 등록→activate→domain data 접근을 구분합니다. 주기에는 receive→domain process→application 처리→domain queue→send가 필요합니다. NULL·오류 반환·PDO offset·working counter·release·실행 주기를 생략한 busy loop를 완성 master로 제시하면 안 됩니다. API 이름이 비슷하다는 사실만으로 SOEM과 lifecycle·threading 계약이 같지는 않습니다.

## TwinCAT (Beckhoff)

TwinCAT은 *Windows + RT extension* 위에서 동작합니다. *PLC 프로그래머의 도구*입니다. ladder logic, structured text, motion control NC가 *동일 IDE*에 통합되어 있습니다.

```text
TwinCAT 구조
  Visual Studio + TwinCAT IDE (개발)
       ↓
  TwinCAT XAE / XAR (Runtime)
       ↓
  Windows + RT extension (kernel-level scheduler)
       ↓
  Intel NIC (TwinCAT real-time driver)
       ↓
  EtherCAT 망
```

TwinCAT의 강점은 *모션·CNC·visualization 통합*입니다. SOEM/IgH는 *EtherCAT만* 다룹니다. PLC 로직과 HMI는 별도로 구현해야 합니다. TwinCAT은 *한 IDE*에서 모두를 합칩니다.

가격은 선택한 runtime·기능·target 조건의 공식 견적을 기준으로 확인해야 합니다. 이 글은 비용이나 ROI를 산정하지 않습니다.

## 슬레이브 ESC 칩 — 선택 가이드

슬레이브 측 ESC 칩 선택은 시스템 비용과 성능의 핵심입니다.

선정할 ESC의 자원 차이는 [Ch 3의 ET1100/LAN9252 비교](/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture)를 참조합니다. 가격·바이너리 호환성·미확인 자원 수를 일괄 표로 추정하지 않습니다.

대부분의 슬레이브 보드는 *MCU 한 개 + ESC 칩 한 개* 구조입니다.

![EtherCAT 슬레이브 보드 — RJ45 IN/OUT, LAN9252 ESC, SPI로 STM32F4 연결](/images/blog/industrial-ethernet/diagrams/ch05-slave-hw.svg)

STM32 측 application은 *EtherCAT Slave Stack*을 돌립니다. Beckhoff가 *Slave Stack Code (SSC)* tool로 자동 생성 코드를 제공합니다. ETG 가입사라면 무료로 받을 수 있습니다.

### ESI (EtherCAT Slave Information) XML

각 슬레이브 모델은 *ESI XML*을 가집니다. 슬레이브 제조사가 *모델별로 발행*합니다. 마스터는 이 XML을 읽어 *어떤 PDO를 매핑할지, 어떤 mailbox 프로토콜이 지원되는지* 알아냅니다.

ESI/ENI 파일은 장치 제조사와 engineering tool이 발행한 원본을 schema·firmware revision과 함께 확인해야 합니다. 아래에서 다루는 개념은 실제 EL1004나 TwinCAT의 유효한 XML 파일을 재현한 것이 아닙니다.

`ProductCode`와 `RevisionNo`는 *슬레이브 칩의 EEPROM*에 저장되어 있어, 마스터가 *읽어서* 어떤 ESI XML과 매칭할지 결정합니다.

### ENI (EtherCAT Network Information) XML

ENI는 *마스터가 사용하는 망 전체 구성 파일*입니다. 어떤 슬레이브가 *어떤 순서*로 있는지, 어떤 PDO를 매핑할지, DC 설정은 어떻게 할지 등을 모두 담습니다. TwinCAT은 ESI들을 모아 ENI를 *자동 생성*합니다.

ESI/ENI 파일은 장치 제조사와 engineering tool이 발행한 원본을 schema·firmware revision과 함께 확인해야 합니다. 아래에서 다루는 개념은 실제 EL1004나 TwinCAT의 유효한 XML 파일을 재현한 것이 아닙니다.

ESI는 XML, SII는 ESC의 구성·식별 EEPROM 데이터입니다. SOEM v1.4.0의 자동 구성은 SII/CoE 등의 경로를 사용하며 일반 ENI importer를 제공한다고 가정하지 않습니다. TwinCAT·IgH의 실제 구성 방식과 파일 import 지원은 각 tool/version에서 확인해야 합니다.

## EEPROM — 슬레이브 측 ID 저장

EEPROM/SII 저장 방식·용량은 ESC별 사양입니다. SOEM v1.4.0의 `ECT_SII_MANUF=0x0008`, `ECT_SII_ID=0x000A`, `ECT_SII_REV=0x000C`는 **16-bit word 주소**입니다. 따라서 vendor ID의 byte offset은0x10, product code는0x14, revision은0x18입니다. 이를 byte 주소0x08·0x0C·0x10으로 적으면 다른 데이터를 읽게 됩니다. SII와 실제 장치 revision·PDO·SM 구성을 함께 확인해야 합니다.

## 자주 하는 실수

### "raw socket 권한이 없어서 안 된다"

`sudo` 또는 *CAP_NET_RAW* capability가 필요합니다. systemd unit에서 `AmbientCapabilities=CAP_NET_RAW`를 주는 것이 일반적입니다. 컨테이너면 `--cap-add=NET_RAW`.

### "ec_init 성공인데 슬레이브가 0개 발견된다"

NIC가 *promiscuous mode*가 아니거나, 케이블이 *상류/하류*가 바뀌어 꽂혔거나, 슬레이브의 *EEPROM이 비어* 있는 경우입니다. `ethtool eth0`로 link, `ethtool -i eth0`로 driver를 구별해 확인합니다. 케이블·전원·link mode·상태·SII를 관측하지 않고 한 원인으로 단정하지 않습니다.

### "WKC가 expected의 절반이다"

Input/output 성공 가중치를 따로 봐야 합니다. 각1회 기대값3에서 output만 빠지면 관측1, 즉1/3입니다. 누락량만으로 output 문제나 고정 SM 번호를 단정할 수는 없습니다.

### "DC 동기 후 1초마다 drift가 보인다"

주기 보정 누락을 포함한 여러 원인을 확인해야 합니다. 슬레이브 clock의 *drift*를 보정하려면 선택한 master의 reference clock·offset/delay·주기 DC datagram을 확인해야 합니다. SOEM v1.4.0의 DC 설정 후 주기 코드가 FRMW를 추가하지만, *수동 LRW 만 보낸다*면 별도 DC datagram을 chain해야 합니다.

### "TwinCAT으로 만든 ENI를 SOEM에 그대로 못 쓴다"

SOEM v1.4.0은 일반 ENI importer를 제공하는 API로 문서화되어 있지 않습니다. ESI XML·SII·수동 설정·특정 importer의 지원 범위를 구분하고 존재가 확인되지 않은 `ec_ENI`를 안내하지 않습니다.

## 정리

- EtherCAT 마스터는 *전용 하드웨어 없이 일반 NIC + 소프트웨어*로 구현됩니다.
- 세 가지 주류는 SOEM(가벼움), IgH(고성능, 커널 모듈), TwinCAT(상용 통합 환경)입니다.
- SOEM의 핵심 API는 `ec_init`, `ec_config_init`, `ec_config_map`, `ec_send_processdata`, `ec_receive_processdata`입니다.
- Master 구현만으로 jitter가 정해지지 않으며 host·NIC·망·slave의 측정 조건이 필요합니다.
- 슬레이브 ESC 칩은 LAN9252·ET1100·AX58100이 대표. MCU + ESC 한 쌍이 표준 구성입니다.
- ESI XML은 *슬레이브 모델별 명세*, ENI XML은 *마스터의 망 구성*입니다.
- 슬레이브 EEPROM에는 Vendor ID, Product Code, 기본 설정이 저장되어 마스터가 *런타임에 자동 매핑*합니다.
- NIC 조회·source build·실제 OP 통신과 성능 검증은 서로 다른 범위입니다.

다음 편은 **Ch 6: PROFINET 개요 — RT·IRT 클래스**입니다. Siemens 진영의 PROFINET이 어떻게 RT와 IRT 두 등급으로 결정성을 만드는지, GSDML XML이 무엇인지 풀어봅니다.

## 관련 항목

- [Ch 3: EtherCAT 아키텍처 — Processing on the Fly](/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture)
- [Ch 4: EtherCAT 프레임 — Datagram·WKC](/blog/embedded/protocols/industrial-ethernet/chapter04-ethercat-frame)
- [Ch 6: PROFINET 개요 — RT·IRT 클래스](/blog/embedded/protocols/industrial-ethernet/chapter06-profinet)
- [Practical RTOS Internals Part 1.4: Preemption](/blog/embedded/rtos/practical-internals/part1-04-preemption) — 마스터 cycle thread 설계
- [Modern Embedded Recipes: IRQ affinity](/blog/embedded/modern-recipes/part7-13-irq-affinity)
- [원문 — SOEM GitHub](https://github.com/OpenEtherCATsociety/SOEM)
- [원문 — EtherLab IgH Master](https://etherlab.org/en/ethercat/)
