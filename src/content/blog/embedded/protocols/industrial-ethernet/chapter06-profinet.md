---
title: "Ch 6: PROFINET 개요 — RT·IRT 클래스"
date: 2026-05-16T06:00:00
description: "Siemens 표준 산업 이더넷 — RT vs IRT."
series: "Industrial Ethernet 심화"
seriesOrder: 6
tags: [profinet, siemens, rt, irt]
draft: false
---

## 한 줄 요약

> **"PROFINET은 *세 등급의 conformance class*로 결정성을 단계적으로 보장한다. RT(우선순위 큐)와 IRT(시간 인식 스위치)가 그 두 축이다."** Siemens 생태계를 거치는 거의 모든 산업 자동화에서 만나는 표준입니다.

EtherCAT이 *Beckhoff/ETG*의 색채라면, PROFINET은 *Siemens/PI(PROFIBUS International)*의 색채입니다. 두 표준 모두 *결정적 이더넷*이지만 *철학*이 다릅니다. EtherCAT은 *master polling + ASIC slave*로 극단의 결정성을 추구하고, PROFINET은 *표준 Ethernet 인프라*와의 호환성을 더 중시합니다.

이 장은 PROFINET의 conformance class(CC-A·CC-B·CC-C), RT와 IRT의 차이, application 모델(Controller·Device·Supervisor), 그리고 슬레이브 명세 파일인 GSDML XML을 정리합니다.

## PROFIBUS에서 PROFINET으로

PROFINET의 이름이 어색한 이유는 *PROFIBUS의 이더넷 후속*이기 때문입니다.

| 표준 | 매체 | 연도 | 특징 |
|------|------|------|------|
| PROFIBUS DP | RS-485 | 1989 | 12 Mbps 직렬 |
| PROFIBUS PA | 2-wire (위험구역) | 1995 | 공정 자동화용 |
| **PROFINET** | Ethernet | 2003 | DP의 후속 |

PROFIBUS의 *application 개념(Controller, Device, GSD 파일)*을 그대로 이어받았습니다. 사용자 입장에서 *Step 7 / TIA Portal*에서 보이는 화면 구조는 PROFIBUS와 거의 같습니다. *전송 매체*만 RS-485에서 Ethernet으로 바뀐 셈입니다.

이 *연속성*이 PROFINET의 빠른 채택 동인이었습니다. PLC 프로그래머가 *재학습*할 필요가 적었습니다.

## Conformance Class — 세 등급

PROFINET은 *모든 슬레이브가 같은 결정성*을 요구하지 않습니다. 슬레이브와 망 인프라의 능력에 따라 *세 등급*으로 나뉩니다.

| 등급 | 이름 | 결정성 | 망 요구 | 전형적 cycle |
|------|------|--------|--------|------------|
| **CC-A** | Unsynchronized RT | 우선순위 큐 | 표준 switch 가능 | 100 ms |
| **CC-B** | Synchronized RT | + diagnostic | 표준 switch + PTP | 10~100 ms |
| **CC-C** | IRT (Isochronous RT) | hw schedule | IRT-aware switch 필수 | 31.25 μs~1 ms |

CC-A와 CC-B는 *RT* 묶음입니다. *VLAN 802.1Q 우선순위*를 활용합니다. CC-C는 *IRT*입니다. *시간 인식 스위치(time-aware shaper)*가 *각 슬롯의 전송 시각*을 정확히 통제합니다.

![PROFINET CC-C IRT Cycle (1 ms)](/images/blog/industrial-ethernet/diagrams/ch06-profinet-cycle.svg)

빨간 단계의 *각 전송 시각*은 *컴파일 시점*에 *engineering tool* (TIA Portal 등)이 *전체 토폴로지를 분석해서 스케줄*합니다. 노드 추가/삭제 시마다 *재스케줄*이 필요합니다.

## RT — Priority Queue 방식

CC-A/CC-B의 RT는 *VLAN 802.1Q 우선순위 큐*를 활용합니다. EtherType은 표준 IP(0x0800)가 아니라 *0x8892* (PROFINET RT 전용)입니다.

![PROFINET RT Frame Layout](/images/blog/industrial-ethernet/diagrams/ch06-profinet-rt-frame.svg)

VLAN tag의 *PCP* 필드(3 bit)가 우선순위입니다. PROFINET RT는 보통 *PCP=6*을 씁니다. 스위치가 *우선순위 6 큐를 먼저 비웁니다*. best-effort 트래픽이 *뒤로 밀립니다*.

이 방식의 결정성은 *스위치의 큐 정책*에 의존합니다. *strict priority* 큐를 가진 스위치라면 RT가 *항상 먼저* 나갑니다. *weighted round-robin* 큐라면 *가끔* best-effort에 밀립니다. 산업용 스위치는 표준적으로 *strict priority + multiple queues*를 지원합니다.

RT의 한계는 *스위치 hop마다 ~수 μs jitter*가 더해지는 점입니다. 4 hop이면 *수십 μs*. 31.25 μs cycle은 *불가능*합니다. 그래서 CC-A/B는 *수 ms 사이클*이 한계입니다.

## IRT — 시간 인식 스위치

IRT는 *스위치 자체가 시간을 알고* *지정된 시각에 지정된 포트로* 패킷을 보냅니다. 표준 IT 스위치로는 불가능합니다. *Siemens SCALANCE X-200IRT 같은 IRT-aware 스위치*가 필수입니다.

```text
IRT 스위치의 내부 동작 (단순화)
  매 1 ms cycle:
    t=0:    포트 1 → 포트 3 으로 32 byte 전송  (스케줄)
    t=50:   포트 2 → 포트 3 으로 64 byte 전송  (스케줄)
    t=110:  포트 3 → 포트 1 으로 32 byte 전송  (스케줄)
    ...
    t=200:  best-effort 큐 비우기 (green phase 시작)
```

스케줄 자체는 *engineering tool*이 생성합니다. *전체 망의 토폴로지와 각 슬레이브의 cycle*을 입력받아 *충돌 없는 schedule*을 계산합니다. 이 계산 자체가 어려운 *NP-hard 문제*에 가까워, *Siemens 같은 벤더의 도구*가 거의 독점합니다.

IRT의 jitter는 *<1 μs*입니다. EtherCAT DC와 비슷한 수준입니다. *cycle은 31.25 μs까지* 내려갑니다.

## Application 모델 — Controller·Device·Supervisor

PROFINET은 *역할*을 세 가지로 정의합니다.

| 역할 | 의미 | 예 |
|------|------|-----|
| **IO-Controller** | PLC, 마스터에 해당 | S7-1500, S7-1200 |
| **IO-Device** | 슬레이브, 필드 디바이스 | ET 200SP, 가속도 센서, 드라이브 |
| **IO-Supervisor** | 진단/조작용 PC | TIA Portal, Step 7 |

EtherCAT의 *master-slave*가 명확한 역할 구분이라면, PROFINET은 *Supervisor*라는 *제3자*를 추가로 둡니다. 이게 *PLC 프로그래머 워크플로*와 잘 맞습니다. *PC에서 PLC와 슬레이브를 모니터링하면서 디버깅*하는 절차가 표준화되어 있습니다.

![PROFINET application 흐름 — Supervisor(PC)는 TCP/IP로 Controller에, Controller는 RT/IRT로 Device들에 연결](/images/blog/industrial-ethernet/diagrams/ch06-profinet-hierarchy.svg)

Controller-Device 사이는 *주기 PDO*가, Supervisor는 *비주기 진단*이 흐릅니다.

## GSDML — Device 명세 XML

각 IO-Device는 *GSDML* (General Station Description, Markup Language) 파일을 가집니다. EtherCAT의 ESI XML과 같은 역할입니다.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ISO15745Profile xmlns="http://www.profibus.com/GSDML/2003/11/DeviceProfile"
                 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">

  <ProfileHeader>
    <ProfileIdentification>PROFINET Device Profile</ProfileIdentification>
    <ProfileRevision>1.20</ProfileRevision>
    <ProfileName>Device Profile for PROFINET Devices</ProfileName>
  </ProfileHeader>

  <ProfileBody>
    <DeviceIdentity VendorID="0x002A" DeviceID="0x0301">
      <InfoText TextId="IDT_INFO_DEV"/>
      <VendorName Value="Siemens AG"/>
    </DeviceIdentity>

    <DeviceFunction>
      <Family MainFamily="I/O" ProductFamily="ET 200SP"/>
    </DeviceFunction>

    <ApplicationProcess>
      <DeviceAccessPointList>
        <DeviceAccessPointItem ID="DAP_1"
                               PNIO_Version="V2.31"
                               PhysicalSlots="0..63"
                               ModuleIdentNumber="0x00000001"
                               MinDeviceInterval="32"
                               ImplementationType="Conformance Class C">
          <ModuleInfo>
            <Name TextId="IDT_NAME_DAP"/>
            <InfoText TextId="IDT_INFO_DAP"/>
            <OrderNumber Value="6ES7155-6AU01-0BN0"/>
          </ModuleInfo>
          <UseableModules>
            <ModuleItemRef ModuleItemTarget="DI_8x24V" AllowedInSlots="1..63"/>
            <ModuleItemRef ModuleItemTarget="DO_8x24V" AllowedInSlots="1..63"/>
          </UseableModules>
        </DeviceAccessPointItem>
      </DeviceAccessPointList>

      <ModuleList>
        <ModuleItem ID="DI_8x24V" ModuleIdentNumber="0x00000010">
          <ModuleInfo>
            <Name TextId="IDT_NAME_DI8"/>
            <OrderNumber Value="6ES7131-6BF00-0CA0"/>
          </ModuleInfo>
          <VirtualSubmoduleList>
            <VirtualSubmoduleItem ID="SUB_DI8" SubmoduleIdentNumber="0x00000010">
              <IOData>
                <Input>
                  <DataItem DataType="Unsigned8" TextId="IDT_NAME_DI8_BYTE0"/>
                </Input>
              </IOData>
            </VirtualSubmoduleItem>
          </VirtualSubmoduleList>
        </ModuleItem>
      </ModuleList>
    </ApplicationProcess>
  </ProfileBody>
</ISO15745Profile>
```

GSDML의 핵심 정보:

- `VendorID` + `DeviceID`: device 식별자.
- `MinDeviceInterval="32"`: 최소 cycle = 32 × 31.25 μs = 1 ms (CC-C에서).
- `ImplementationType`: CC-A·CC-B·CC-C 중 무엇.
- `Module`/`Submodule`: 슬롯별 *I/O 모듈*. ET 200SP 같은 모듈러 슬레이브는 *기본 단말 + 모듈 슬롯들*로 구성.

TIA Portal에서 *GSDML 파일을 import*하면 해당 device가 *project 라이브러리*에 들어와 *드래그-드롭*으로 토폴로지에 추가할 수 있습니다.

## PROFINET vs EtherCAT — 짧은 비교

| 항목 | PROFINET (CC-C IRT) | EtherCAT |
|------|---------------------|----------|
| 결정성 만드는 방식 | Time-aware switch + schedule | on-the-fly + DC |
| 인프라 비용 | IRT 스위치 필수 (비쌈) | 일반 케이블 daisy-chain |
| 슬레이브 비용 | IRT NIC 또는 ERTEC ASIC | LAN9252/ET1100 ASIC |
| 토폴로지 | star, tree (스위치 기반) | line (daisy-chain) |
| 최소 cycle | 31.25 μs (CC-C) | 12.5 μs |
| 슬레이브 수 한계 | 망 토폴로지 의존 | 65535 (이론), 256+ (실용) |
| 표준 IP 통합 | 자연 (CC-A는 표준 switch) | EoE 터널 필요 |
| 한국 시장 채택 | LS ELECTRIC, 두산 일부 | 현대중공업, 협동로봇 |

선택의 갈림길은 *기존 인프라*입니다. Siemens PLC + TIA Portal 환경이라면 PROFINET. *모션 컨트롤러를 처음부터 짜는* 흐름이면 EtherCAT이 *master 비용 절감*에서 유리합니다.

## Siemens 생태계 — 한국 적용 예

LS ELECTRIC의 PLC(XGT 시리즈)는 PROFINET과 EtherNet/IP를 *모두 지원*합니다. 대우조선의 선박 자동화 시스템은 *PROFINET 기반 ET 200SP*로 분산 IO를 구성하고, *S7-1500*이 IO-Controller 역할입니다. *공정 데이터*는 PROFINET RT(10 ms cycle)면 충분합니다. *모션*이 들어가는 부분은 PROFINET CC-C IRT나 *EtherCAT 별도 segment*로 분리하는 게 일반적입니다.

```text
대우조선 선박 자동화 구성 (간단 예)
  공정 영역:        S7-1500 + PROFINET RT
                      └ ET 200SP × 12 (분산 IO)
  모션 영역 (개별):  EtherCAT segment (Beckhoff)
                      └ AX5000 servo × 4
  두 망 연결:        Gateway 모듈 (PROFINET ↔ EtherCAT)
```

같은 공장 안에 PROFINET과 EtherCAT이 *gateway로 묶여* 공존하는 게 일반적입니다. 둘 중 하나가 *지배적*이지 않습니다.

## 자주 하는 실수

### "PROFINET RT면 1 ms cycle도 된다"

RT의 *cycle 하한*은 *스위치 hop 수와 큐 정책*에 의존합니다. 4 hop 망에서 *worst-case 10 ms*가 일반적입니다. 1 ms 이하가 필요하면 *IRT (CC-C)* 또는 *EtherCAT*을 봐야 합니다.

### "GSDML과 GSD는 같다"

GSD는 *PROFIBUS*용, GSDML은 *PROFINET*용입니다. 이름이 비슷하지만 XML schema가 다릅니다. *기존 PROFIBUS GSD를 PROFINET 마스터에 그대로 못 쓰는* 이유입니다.

### "IRT는 일반 IT 스위치로 동작한다"

IRT는 *시간 인식 스위치*가 필수입니다. SCALANCE, Hirschmann RSPE, MOXA EDS-G508A 같은 *PROFINET IRT 인증* 스위치만 가능합니다. 일반 데스크톱 스위치로는 *대역폭*은 되어도 *결정성*은 안 됩니다.

### "PROFINET은 IP 위에서 동작한다"

진단·configuration은 IP(예: DCP는 IPv4 multicast), 주기 RT/IRT는 *L2 EtherType 0x8892*입니다. RT 프레임은 *IP 헤더가 없습니다*. 라우터를 넘지 못합니다.

### "TSN이 나오면 PROFINET IRT는 사라진다"

PI(PROFIBUS International)는 *PROFINET over TSN* profile을 *공식 발표*했습니다. IRT의 자체 schedule 방식은 *TSN 802.1Qbv*로 *서서히 대체*될 전망입니다. 그러나 *현장의 설비 수명*이 10~20년이라 *완전 전환*은 오래 걸립니다.

## 정리

- PROFINET은 *PROFIBUS의 이더넷 후속*입니다. application 모델(Controller·Device·Supervisor)이 동일합니다.
- Conformance Class 셋(CC-A·CC-B·CC-C)이 *결정성 등급*을 정합니다.
- CC-A/B의 RT는 *VLAN 우선순위 큐*, CC-C의 IRT는 *시간 인식 스위치*가 핵심입니다.
- RT는 *수 ms cycle*, IRT는 *31.25 μs cycle*까지 가능합니다.
- IO-Device는 GSDML XML로 명세됩니다. EtherCAT의 ESI에 해당합니다.
- IRT 스위치는 *engineering tool*이 *컴파일 시점 스케줄*을 계산해 *주입*합니다.
- 한국 공장에는 PROFINET (공정·PLC)과 EtherCAT (모션)이 *gateway로 묶여* 공존합니다.
- TSN이 IRT의 schedule 메커니즘을 *공통 인프라*로 대체하는 흐름입니다.

이 글로 **Industrial Ethernet 심화** 시리즈의 1차 분량이 끝납니다. 후속 시리즈에서는 *EtherNet/IP·POWERLINK·SERCOS III·TSN*과 *gateway/protocol bridge* 설계를 다룰 예정입니다.

## 관련 항목

- [Ch 1: 산업용 이더넷 개요](/blog/embedded/protocols/industrial-ethernet/chapter01-overview)
- [Ch 2: 실시간 요구사항 — Determinism·Cycle Time](/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements)
- [Ch 5: EtherCAT Master/Slave — SOEM·IgH](/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master)
- [Practical RTOS Internals Part 1.4: Preemption](/blog/embedded/rtos/practical-internals/part1-04-preemption)
- [Modern Embedded Recipes Part 4.6: IRQ affinity](/blog/embedded/modern-recipes/part4-06-irq-affinity)
- [원문 — PROFINET International (PI)](https://www.profibus.com/)
- [원문 — Siemens TIA Portal documentation](https://support.industry.siemens.com/cs/products?dtp=Manual&pnid=14667&lc=en-WW)
