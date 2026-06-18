---
title: "EtherCAT Master 구현 비교 — SOEM·IgH·TwinCAT 분석"
date: 2026-05-13T09:05:00
description: "SOEM·IgH·TwinCAT — 오픈소스와 상용 master 구현."
series: "Industrial Ethernet 심화"
seriesOrder: 5
tags: [ethercat, soem, igh, twincat]
draft: false
---

## 한 줄 요약

> **"EtherCAT 마스터는 전용 하드웨어가 아니라 *일반 NIC + 결정적 소프트웨어*로 만든다."** SOEM(작고 portable), IgH(커널 모듈, 고성능), TwinCAT(상용 Windows) 셋 중 목적에 맞춰 고릅니다.

EtherCAT의 *경제성*을 떠받치는 핵심은 *마스터의 단순함*입니다. 슬레이브는 ASIC이 필요하지만, 마스터는 *일반 1 Gbps NIC + Linux PC*면 충분합니다. 이 비대칭이 EtherCAT을 빠르게 퍼뜨렸습니다.

이 장은 마스터 측 구현 세 가지를 비교하고, SOEM C API로 *간단한 마스터 코드*를 직접 짜 봅니다. 마지막에 슬레이브 측의 ESC 칩 선택과 ENI/ESI XML 파일 구조를 정리합니다.

## 세 가지 마스터 — 한눈 비교

| 항목 | SOEM | IgH (EtherCAT Master) | TwinCAT |
|------|------|----------------------|---------|
| 라이선스 | 2-clause BSD | LGPL/GPL | Beckhoff 상용 |
| 형태 | 순수 C 라이브러리 | 커널 모듈 + userspace lib | Windows 통합 IDE |
| OS | Linux/Windows/RTOS | Linux (커널 패치) | Windows + RT extension |
| 최소 cycle | 1 ms (소프트) | 100 μs (RT 커널) | 50 μs (RTOS) |
| 라이브러리 코드량 | ~10K LoC | ~50K LoC | 비공개 |
| 학습 곡선 | 낮음 | 중간 | 낮음 (GUI) |
| 진입 비용 | 0 | 0 | 라이선스 비용 |

세 가지 모두 *정상 동작*하지만 *지향점*이 다릅니다.

- **SOEM**: 가볍게 시작하고 싶을 때. 임베디드 RTOS(FreeRTOS, NuttX)에도 포팅 가능.
- **IgH**: production 수준의 결정성. CNC, 로봇 컨트롤러 등에 적합.
- **TwinCAT**: PLC 프로그래머가 익숙한 환경. *Beckhoff IO 모듈*과 매칭이 자연스러움.

한국 시장은 셋 다 쓰입니다. 현대중공업 로봇팔은 IgH 기반, 두산의 협동로봇 일부는 SOEM 포팅판, 중소 자동화업체 데모기는 TwinCAT인 경우가 많습니다.

## SOEM — Simple Open EtherCAT Master

SOEM은 *학습용 + 임베디드용* 마스터의 표준입니다. 코드가 10K 줄 정도라서 *읽고 이해할 수 있는* 크기입니다.

### 빌드

```bash
$ git clone https://github.com/OpenEtherCATsociety/SOEM.git
$ cd SOEM
$ mkdir build && cd build
$ cmake .. && make
$ sudo make install

# 또는 시스템 패키지로
$ sudo apt install libsoem-dev
```

빌드 후 `libsoem.a`와 헤더 `ethercat.h`가 설치됩니다.

### 최소 마스터 코드

64-bit EtherCAT 슬레이브 한 개를 *Op 상태*로 끌어올리고 주기 process data를 주고받는 최소 예제입니다.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#include "ethercat.h"

#define IF_NAME "eth0"
#define EC_TIMEOUT 5000

static char IOmap[4096];

int main(int argc, char *argv[]) {
    /* 1. EtherCAT 망 초기화 (NIC 이름으로 raw socket 오픈) */
    if (!ec_init(IF_NAME)) {
        printf("ec_init on %s failed\n", IF_NAME);
        return 1;
    }
    printf("ec_init succeeded\n");

    /* 2. 슬레이브 검색 + state machine 설정 */
    if (ec_config_init(FALSE) <= 0) {
        printf("No slaves found\n");
        ec_close();
        return 1;
    }
    printf("%d slaves found\n", ec_slavecount);

    /* 3. process data 매핑 (FMMU 자동 설정) */
    ec_config_map(&IOmap);

    /* 4. DC 동기 시작 (DC-capable slave만 적용됨) */
    ec_configdc();

    /* 5. Safe-Op 도달 대기 */
    ec_statecheck(0, EC_STATE_SAFE_OP, EC_TIMEOUT * 3);

    /* 6. Operational 요청 */
    ec_slave[0].state = EC_STATE_OPERATIONAL;
    ec_send_processdata();          /* dummy 송신: Op 진입 트리거 */
    ec_receive_processdata(EC_TIMEOUT);
    ec_writestate(0);

    /* 7. Op 도달까지 대기 (최대 200 ms) */
    int chk = 40;
    do {
        ec_send_processdata();
        ec_receive_processdata(EC_TIMEOUT);
        ec_statecheck(0, EC_STATE_OPERATIONAL, 50000);
    } while (chk-- && (ec_slave[0].state != EC_STATE_OPERATIONAL));

    if (ec_slave[0].state != EC_STATE_OPERATIONAL) {
        printf("Failed to reach OP state\n");
        ec_close();
        return 1;
    }

    /* 8. 주기 사이클 (간단 예: 1 ms cycle을 1000회 반복) */
    for (int i = 0; i < 1000; i++) {
        ec_send_processdata();
        int wkc = ec_receive_processdata(EC_TIMEOUT);
        if (wkc < ec_group[0].expectedWKC) {
            printf("cycle %d: WKC mismatch (%d / %d)\n",
                   i, wkc, ec_group[0].expectedWKC);
        }
        usleep(1000);              /* 1 ms */
    }

    /* 9. 종료 */
    ec_slave[0].state = EC_STATE_INIT;
    ec_writestate(0);
    ec_close();
    return 0;
}
```

코드의 핵심 함수 다섯입니다.

| 함수 | 역할 |
|------|------|
| `ec_init()` | NIC raw socket 오픈 |
| `ec_config_init()` | 슬레이브 검색, station address 부여 |
| `ec_config_map()` | FMMU/SM 설정, process image 매핑 |
| `ec_send_processdata()` | LRW 명령 비동기 전송 |
| `ec_receive_processdata()` | 응답 수신 + WKC 검증 |

빌드는 `gcc main.c -lsoem -lpthread -lrt`. 실행은 `sudo`가 필요합니다(raw socket 권한).

### 실행 예

```text
$ sudo ./simple_master
ec_init succeeded
4 slaves found
Slave 1: EK1100 - EtherCAT Coupler
Slave 2: EL1004 - 4 Ch Digital Input
Slave 3: EL2004 - 4 Ch Digital Output
Slave 4: EL3001 - 1 Ch Analog Input
SM/FMMU configured, IOmap size = 16 bytes
DC sync configured for 2 slaves
Reached OP state
cycle 250: data = 0x0a 0x00 0x42 0x18 ...
cycle 500: data = 0x0a 0x00 0x42 0x18 ...
...
```

### RT cycle thread

위 코드의 `usleep(1000)`은 *예시*입니다. *real cycle*은 `clock_nanosleep(CLOCK_MONOTONIC, TIMER_ABSTIME, ...)`로 *절대 시각 wakeup*을 씁니다.

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

여기에 *PREEMPT_RT 커널 + SCHED_FIFO + mlockall + IRQ affinity*를 모두 추가하면 *±10 μs* jitter 정도가 나옵니다. ns급이 필요하면 IgH 또는 dedicated NIC가 필요합니다.

## IgH EtherCAT Master

IgH(EtherCAT Master, Ingenieurgemeinschaft IgH가 개발)는 *커널 모듈 + userspace 라이브러리* 구조입니다.

![IgH 구조 — userspace API → ioctl → userspace lib → /dev/EtherCAT0 → 커널 모듈 → NIC](/images/blog/industrial-ethernet/diagrams/ch05-igh-stack.svg)

IgH가 SOEM보다 빠른 이유는 *NIC 드라이버 자체를 패치*해서 *DMA 경로*를 RT-friendly하게 만들기 때문입니다. e1000e, igb, r8169 같은 일반 드라이버에 *고유 패치*가 들어갑니다.

### 설치 (간단 요약)

```bash
$ git clone https://gitlab.com/etherlab.org/ethercat.git
$ cd ethercat
$ ./bootstrap
$ ./configure --prefix=/opt/etherlab \
              --enable-generic \
              --enable-e1000e
$ make all modules
$ sudo make modules_install install

# /etc/sysconfig/ethercat에서 MASTER0_DEVICE 설정
# systemctl start ethercat
```

`./configure --enable-XXX`로 *어떤 NIC 드라이버*를 패치할지 선택합니다. `generic`은 *일반 socket*으로 동작(성능 낮음). production은 *전용 드라이버 패치*를 활성화합니다.

### IgH userspace API 예

```c
#include <ecrt.h>

static ec_master_t *master;
static ec_domain_t *domain;
static ec_slave_config_t *sc;

int main(void) {
    master = ecrt_request_master(0);
    domain = ecrt_master_create_domain(master);

    sc = ecrt_master_slave_config(master, 0, 1, 0x00000002, 0x044C2C52);
    /* PDO 매핑 등 설정 생략 */

    ecrt_master_activate(master);

    /* RT loop */
    while (1) {
        ecrt_master_receive(master);
        ecrt_domain_process(domain);
        /* control */
        ecrt_domain_queue(domain);
        ecrt_master_send(master);
    }
}
```

SOEM의 `ec_send_processdata` / `ec_receive_processdata`와 의미가 같지만, 함수 이름 prefix가 `ecrt_*`입니다.

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

라이선스 비용은 보통 *프로젝트당 수백만 원* 수준입니다. ROI는 *통합된 도구 환경*에서 옵니다.

## 슬레이브 ESC 칩 — 선택 가이드

슬레이브 측 ESC 칩 선택은 시스템 비용과 성능의 핵심입니다.

| 칩 | 포트 수 | FMMU | SM | DPRAM | 호스트 IF | 특징 |
|----|--------|------|-----|-------|---------|------|
| ET1100 | 4 | 8 | 8 | 8KB | 8/16 bit μC, SPI | Beckhoff 원조 |
| ET1200 | 3 | 3 | 4 | 1KB | 8/16 bit μC, SPI | 저가형 |
| LAN9252 | 3 | 8 | 4 | 4KB | SPI, HBI | Microchip, 가성비 |
| LAN9253 | 3 | 8 | 4 | 8KB | SPI, HBI | LAN9252 후속 |
| AX58100 | 2 | 8 | 8 | 8KB | SPI | ASIX, ET1100 호환 |
| ESC IP core | 가변 | 가변 | 가변 | 가변 | 자유 | FPGA로 통합 |

대부분의 슬레이브 보드는 *MCU 한 개 + ESC 칩 한 개* 구조입니다.

![EtherCAT 슬레이브 보드 — RJ45 IN/OUT, LAN9252 ESC, SPI로 STM32F4 연결](/images/blog/industrial-ethernet/diagrams/ch05-slave-hw.svg)

STM32 측 application은 *EtherCAT Slave Stack*을 돌립니다. Beckhoff가 *Slave Stack Code (SSC)* tool로 자동 생성 코드를 제공합니다. ETG 가입사라면 무료로 받을 수 있습니다.

### ESI (EtherCAT Slave Information) XML

각 슬레이브 모델은 *ESI XML*을 가집니다. 슬레이브 제조사가 *모델별로 발행*합니다. 마스터는 이 XML을 읽어 *어떤 PDO를 매핑할지, 어떤 mailbox 프로토콜이 지원되는지* 알아냅니다.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<EtherCATInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Vendor>
    <Id>#x00000002</Id>             <!-- Beckhoff Vendor ID -->
    <Name>Beckhoff Automation GmbH</Name>
  </Vendor>
  <Descriptions>
    <Devices>
      <Device Physics="YY">
        <Type ProductCode="#x044C2C52" RevisionNo="#x00100000">EL1004</Type>
        <Name>EL1004 4 Ch. Dig. Input 24V, 3ms</Name>
        <Info>
          <VendorSpecific>
            <TwinCAT>
              <PdoSize>2</PdoSize>
            </TwinCAT>
          </VendorSpecific>
        </Info>
        <Fmmu>Inputs</Fmmu>
        <Sm Enable="1" StartAddress="#x1000" ControlByte="#x00" DefaultSize="0">MBoxOut</Sm>
        <Sm Enable="1" StartAddress="#x1080" ControlByte="#x00" DefaultSize="0">MBoxIn</Sm>
        <Sm Enable="1" StartAddress="#x1100" ControlByte="#x00" DefaultSize="0">Inputs</Sm>
        <TxPdo Fixed="true" Mandatory="true" Sm="3">
          <Index>#x1A00</Index>
          <Name>Channel 1</Name>
          <Entry>
            <Index>#x6000</Index>
            <SubIndex>1</SubIndex>
            <BitLen>1</BitLen>
            <Name>Input</Name>
            <DataType>BOOL</DataType>
          </Entry>
        </TxPdo>
      </Device>
    </Devices>
  </Descriptions>
</EtherCATInfo>
```

`ProductCode`와 `RevisionNo`는 *슬레이브 칩의 EEPROM*에 저장되어 있어, 마스터가 *읽어서* 어떤 ESI XML과 매칭할지 결정합니다.

### ENI (EtherCAT Network Information) XML

ENI는 *마스터가 사용하는 망 전체 구성 파일*입니다. 어떤 슬레이브가 *어떤 순서*로 있는지, 어떤 PDO를 매핑할지, DC 설정은 어떻게 할지 등을 모두 담습니다. TwinCAT은 ESI들을 모아 ENI를 *자동 생성*합니다.

```xml
<?xml version="1.0"?>
<EtherCATConfig>
  <Config>
    <Master>
      <Info>
        <Name>Device 1 (EtherCAT)</Name>
        <Source>10.1.1.4</Source>
      </Info>
      <Cyclic>
        <CycleTime>1000000</CycleTime>     <!-- 1 ms = 1000000 ns -->
        <Priority>1</Priority>
        <Frame>
          <Cmd>
            <State>2</State>               <!-- 2 = Op 상태에서 -->
            <Cmd>10</Cmd>                  <!-- LRW (0x0A?) -->
            <Adp>0</Adp>
            <Ado>0</Ado>
            <Addr>#x10000000</Addr>
            <Data>...</Data>
            <Cnt>0</Cnt>
          </Cmd>
        </Frame>
      </Cyclic>
    </Master>
    <Slave>
      <Info>
        <Name>EL1004</Name>
        <PhysAddr>1001</PhysAddr>
        <AutoIncAddr>0</AutoIncAddr>
      </Info>
      <!-- PDO mapping, FMMU config, SM config -->
    </Slave>
  </Config>
</EtherCATConfig>
```

SOEM은 ENI를 *명시적으로 안 씁니다*. 슬레이브에서 ESI EEPROM을 읽어 *런타임에 자동 설정*합니다. IgH도 비슷합니다. ENI 파일이 *반드시* 필요한 것은 TwinCAT 워크플로뿐입니다.

## EEPROM — 슬레이브 측 ID 저장

각 ESC는 *외부 SPI EEPROM* (보통 16~64 KB)을 가집니다. 여기에 *Vendor ID, Product Code, Revision*, 그리고 *기본 SM/FMMU 설정*이 저장됩니다.

```text
EEPROM 영역 (간단)
  0x00~0x07: ESC config
  0x08~0x0B: Vendor ID
  0x0C~0x0F: Product Code
  0x10~0x13: Revision
  0x14~0x17: Serial Number
  0x18~...:  Category data (PDOs, strings, SM, FMMU)
```

마스터의 첫 단계가 EEPROM read입니다. SOEM의 `ec_config_init()`이 자동으로 수행합니다. EEPROM이 *비어 있거나 손상*되면 슬레이브가 *Init 상태*에서 못 벗어납니다. 슬레이브 보드 양산 시 EEPROM 프로그래밍이 *공정 항목*입니다.

## 자주 하는 실수

### "raw socket 권한이 없어서 안 된다"

`sudo` 또는 *CAP_NET_RAW* capability가 필요합니다. systemd unit에서 `AmbientCapabilities=CAP_NET_RAW`를 주는 것이 일반적입니다. 컨테이너면 `--cap-add=NET_RAW`.

### "ec_init 성공인데 슬레이브가 0개 발견된다"

NIC가 *promiscuous mode*가 아니거나, 케이블이 *상류/하류*가 바뀌어 꽂혔거나, 슬레이브의 *EEPROM이 비어* 있는 경우입니다. `ethtool -i eth0`로 link 상태부터 확인합니다.

### "WKC가 expected의 절반이다"

대부분 *output PDO가 매핑되지 않은* 경우입니다. 슬레이브가 *input만* 처리해서 +1, *output*은 +2를 못 더해 +1만 됩니다. SM3(output) 설정을 확인합니다.

### "DC 동기 후 1초마다 drift가 보인다"

ARMW를 한 번만 보내고 끝낸 경우입니다. 슬레이브 clock의 *drift*를 보정하려면 ARMW를 *주기적으로* (보통 매 사이클) 재전송해야 합니다. SOEM의 `ec_send_processdata`가 자동으로 처리하지만, *수동 LRW 만 보낸다*면 별도 DC datagram을 chain해야 합니다.

### "TwinCAT으로 만든 ENI를 SOEM에 그대로 못 쓴다"

원칙적으로는 호환되지만, SOEM은 *ENI보다 슬레이브 EEPROM의 ESI를 우선시*합니다. SOEM에서 ENI를 사용하려면 `ec_ENI` 등 *별도 라이브러리*가 필요합니다.

## 정리

- EtherCAT 마스터는 *전용 하드웨어 없이 일반 NIC + 소프트웨어*로 구현됩니다.
- 세 가지 주류는 SOEM(가벼움), IgH(고성능, 커널 모듈), TwinCAT(상용 통합 환경)입니다.
- SOEM의 핵심 API는 `ec_init`, `ec_config_init`, `ec_config_map`, `ec_send_processdata`, `ec_receive_processdata`입니다.
- IgH는 NIC 드라이버 자체를 패치해 *DMA 경로 RT화*로 ±1 μs jitter를 노립니다.
- 슬레이브 ESC 칩은 LAN9252·ET1100·AX58100이 대표. MCU + ESC 한 쌍이 표준 구성입니다.
- ESI XML은 *슬레이브 모델별 명세*, ENI XML은 *마스터의 망 구성*입니다.
- 슬레이브 EEPROM에는 Vendor ID, Product Code, 기본 설정이 저장되어 마스터가 *런타임에 자동 매핑*합니다.
- 한국 시장에서 IgH는 중대형 로봇·CNC, SOEM은 협동로봇/소형 모션, TwinCAT은 데모기·라인 통합에 자주 보입니다.

다음 편은 **Ch 6: PROFINET 개요 — RT·IRT 클래스**입니다. Siemens 진영의 PROFINET이 어떻게 RT와 IRT 두 등급으로 결정성을 만드는지, GSDML XML이 무엇인지 풀어봅니다.

## 관련 항목

- [Ch 3: EtherCAT 아키텍처 — Processing on the Fly](/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture)
- [Ch 4: EtherCAT 프레임 — Datagram·WKC](/blog/embedded/protocols/industrial-ethernet/chapter04-ethercat-frame)
- [Ch 6: PROFINET 개요 — RT·IRT 클래스](/blog/embedded/protocols/industrial-ethernet/chapter06-profinet)
- [Practical RTOS Internals Part 1.4: Preemption](/blog/embedded/rtos/practical-internals/part1-04-preemption) — 마스터 cycle thread 설계
- [Modern Embedded Recipes Part 4.6: IRQ affinity](/blog/embedded/modern-recipes/part7-13-irq-affinity)
- [원문 — SOEM GitHub](https://github.com/OpenEtherCATsociety/SOEM)
- [원문 — EtherLab IgH Master](https://etherlab.org/en/ethercat/)
