---
title: "Ch 2: 실시간 요구사항 — Determinism·Cycle Time"
date: 2026-05-16T02:00:00
description: "Soft·Firm·Hard real-time — 산업 자동화의 시간 등급."
series: "Industrial Ethernet 심화"
seriesOrder: 2
tags: [real-time, jitter, latency, cycle-time]
draft: false
---

## 한 줄 요약

> **"결정성은 평균 지연이 아니라 *최악 지연의 상한*이다."** 산업 제어망의 설계는 jitter 예산 분배와 시계 동기, 두 축으로 정해집니다.

산업용 이더넷 책을 처음 펴면 "1 ms 사이클", "sub-μs jitter" 같은 숫자가 쏟아집니다. 어디서 나온 숫자이고, 무엇을 보장한다는 의미인지 정량적으로 정리하지 않으면 표준 비교가 *느낌의 비교*로 끝납니다.

이 장은 cycle time과 jitter의 정의를 명확히 하고, 어디서 jitter가 생기는지 분해한 다음, IEEE 1588 PTP가 어떻게 모든 노드의 시계를 sub-μs로 맞추는지 풀어봅니다.

## Cycle time — 어디서 결정되는가

cycle time은 *제어 알고리즘이 한 번 도는 데 걸리는 시간*입니다. 보통 *제어 대상의 물리 시정수*가 정합니다.

| 대상 | 물리 시정수 | 권장 cycle time |
|------|------------|----------------|
| 화학 공정 (탱크 온도) | 분 단위 | 100 ms ~ 1 s |
| 컨베이어 모터 | 100 ms | 10~50 ms |
| 일반 PLC I/O | 10 ms | 1~10 ms |
| 서보 모터 위치 제어 | 1 ms | 250 μs ~ 1 ms |
| 토크 전류 루프 | 100 μs | 31.25~125 μs |
| 안전 (E-stop) | 즉시 | 1~10 ms (별도 채널) |

cycle time을 *물리 시정수의 1/10 이하*로 잡는 것이 일반 원칙입니다. 시정수 1 ms인 서보를 250 μs cycle로 도는 이유가 여기 있습니다. 더 빠르게 돌면 *제어 성능은 그대로*인데 *망 부하만 늘어납니다*. 너무 느리게 돌면 *위상 지연*으로 발진이 일어납니다.

```text
서보 위치 제어 루프 예
  Nyquist:        시정수 1 ms → 최소 샘플 500 μs
  실용 안전 마진:  시정수의 1/4 = 250 μs cycle
  표준 EtherCAT:   125 μs로도 가능 (DC 활용)
```

## Jitter — 평균이 아니라 분산

jitter는 *cycle 간 도착 시각의 편차*입니다. 평균 250 μs cycle인데, 어떤 사이클은 240 μs 만에, 다른 사이클은 260 μs 만에 도착하면 jitter는 ±10 μs입니다.

제어 이론에서 jitter는 *시간 변동성*으로 작용합니다. 위치 제어 PID 입장에서 cycle 간격이 매번 다른 것은 *제어 주기가 흔들리는 것*과 같습니다. 결과는 *진동* 또는 *위치 오차 누적*입니다.

```text
jitter가 미치는 영향 (모션 컨트롤)
  ±1 μs:    무시 가능 (EtherCAT DC, PROFINET IRT)
  ±10 μs:   미세한 진동, 대부분 무해
  ±100 μs:  표면 거칠기, 정밀 가공 불가
  ±1 ms:    가시적 진동, 조작자가 체감
  ±10 ms:   제어 발진, 안전 회로 작동
```

각 산업 표준의 *광고 문구*에 나오는 "1 μs jitter"는 *worst-case*를 의미합니다. p99.9 또는 그 이상의 백분위로 측정한 값입니다. 평균이 1 μs라는 뜻이 아닙니다.

## Jitter 예산 분해

망의 전체 jitter는 여러 *원천*의 합입니다. 결정적 망의 설계는 각 원천에 *예산*을 배정하는 일입니다.

| 원천 | 표준 Ethernet | EtherCAT (DC) | PROFINET IRT |
|------|--------------|--------------|--------------|
| 마스터 송신 jitter | OS scheduler 의존 | <1 μs (DC ref) | <1 μs (hw) |
| 매체 전파 (100 m) | 500 ns | 500 ns | 500 ns |
| Switch store-and-forward | 5~50 μs/hop | (cut-through) | (cut-through) |
| Slave 처리 jitter | NIC 의존 (수 ms) | <100 ns (ASIC) | <1 μs (ASIC) |
| 슬레이브 응답 합성 | 큐 의존 | n/a (in-flight) | TDMA 슬롯 |
| **합계 (worst-case)** | **수 ms** | **<1 μs** | **<1 μs** |

핵심은 *마지막 행*입니다. 표준 Ethernet에서는 jitter 원천들이 *누적*되어 ms 단위가 됩니다. 결정적 망은 *각 원천을 0에 가깝게* 만듭니다. EtherCAT은 슬레이브를 *ASIC*으로 만들어 처리 jitter를 ns 단위로 줄이고, PROFINET IRT는 *시간 인식 스위치*로 큐 jitter를 없앱니다.

## IEEE 1588 PTP — 어떻게 ns 정밀로 동기하나

분산 시스템에서 시계 동기의 표준은 PTP(Precision Time Protocol)입니다. NTP가 ms 정밀이라면, PTP는 *ns 정밀*입니다. 같은 원리에 *하드웨어 타임스탬프*를 더한 결과입니다.

PTP에는 네 가지 메시지가 있습니다.

| 메시지 | 방향 | 역할 |
|--------|------|------|
| **Sync** | Master → Slave | 마스터의 현재 시각 t1 송신 |
| **Follow_Up** | Master → Slave | t1의 정확한 송신 시각 (옵션) |
| **Delay_Req** | Slave → Master | 슬레이브가 회신 시각 t3 |
| **Delay_Resp** | Master → Slave | 마스터의 t3 수신 시각 t4 |

이 네 메시지로 *클럭 오프셋*과 *전파 지연*을 분리해 계산합니다.

```text
Master                          Slave
  |                               |
  | Sync (t1 in msg)              |
  |------------------------------>| t2 (slave 측 수신 시각)
  | Follow_Up (precise t1)        |
  |------------------------------>|
  |                               |
  |                       Delay_Req
  | t4 (master 측 수신)       <--| t3 (slave 측 송신)
  | Delay_Resp (t4)              |
  |------------------------------>|

오프셋 = ((t2 - t1) - (t4 - t3)) / 2
지연   = ((t2 - t1) + (t4 - t3)) / 2
```

수식의 트릭은 *대칭 가정*입니다. master→slave 경로와 slave→master 경로의 지연이 *같다*고 가정하면, 두 식에서 오프셋과 지연을 *분리*할 수 있습니다. 비대칭이 큰 망(예: 다른 path를 거치는 경우)에서는 오차가 생깁니다.

### 하드웨어 타임스탬프

PTP의 ns 정밀은 *하드웨어 타임스탬프* 없이는 불가능합니다. OS 스택을 거치는 동안 jitter가 μs ~ ms로 쌓이기 때문입니다.

지원하는 NIC는 *MAC 레벨*에서 송수신 시각을 캡처합니다. Linux에서 확인합니다.

```bash
# NIC의 PTP hardware timestamp 지원 여부
$ ethtool -T eth0
Time stamping parameters for eth0:
Capabilities:
        hardware-transmit     (SOF_TIMESTAMPING_TX_HARDWARE)
        software-transmit
        hardware-receive      (SOF_TIMESTAMPING_RX_HARDWARE)
        software-receive
        software-system-clock
        hardware-raw-clock    (SOF_TIMESTAMPING_RAW_HARDWARE)
PTP Hardware Clock: 0
Hardware Transmit Timestamp Modes:
        off                   (HWTSTAMP_TX_OFF)
        on                    (HWTSTAMP_TX_ON)
```

`PTP Hardware Clock: 0`이 보이면 `/dev/ptp0`이 있다는 뜻입니다. `linuxptp`의 `ptp4l`이 이 장치를 *MAC clock*으로 사용해 ns 동기를 수행합니다.

```bash
# PTP slave로 동작 시작
$ sudo ptp4l -i eth0 -s -m

ptp4l[12.345]: selected /dev/ptp0 as PTP clock
ptp4l[12.456]: port 1: INITIALIZING to LISTENING on INIT_COMPLETE
ptp4l[13.123]: port 1: new foreign master 001122.fffe.334455-1
ptp4l[16.789]: selected best master clock 001122.fffe.334455
ptp4l[17.890]: master offset    -823 s2 freq    -12345 path delay     1234
ptp4l[18.890]: master offset      45 s2 freq    -12300 path delay     1234
ptp4l[19.890]: master offset     -12 s2 freq    -12290 path delay     1234
```

`master offset`이 *수렴된 동기 오차*입니다. 단위는 ns. 100 ns 안쪽으로 들어가면 정상입니다.

### Boundary Clock vs Transparent Clock

망에 *스위치*가 끼면 PTP 정확도가 떨어집니다. 스위치 큐의 지연이 *비대칭*하기 때문입니다. 해결책 두 가지.

| 모델 | 동작 | 정확도 |
|------|------|--------|
| **Boundary Clock** | 스위치 자체가 PTP slave + master로 동작 | <100 ns/hop |
| **Transparent Clock** | 패킷 통과 시간을 *correctionField*에 누적 | <30 ns/hop |

산업용 스위치는 Transparent Clock을 표준 지원합니다. 일반 IT 스위치는 PTP를 *모르는* 경우가 많아 정확도가 떨어집니다. 산업용 망에서는 *PTP-aware 스위치*가 필수입니다.

## EtherCAT Distributed Clock — PTP의 변형

EtherCAT은 PTP를 그대로 쓰지 않습니다. *Distributed Clock(DC)*이라는 자체 방식을 씁니다. 원리는 비슷하지만 *마스터가 아니라 첫 슬레이브가 reference clock*이라는 점이 다릅니다.

```text
EtherCAT DC 동기 절차
  1. 마스터가 BRD(0x900) 명령으로 모든 슬레이브에 *현재 시각*을 broadcast 읽기
  2. 첫 번째 DC-capable 슬레이브의 시각을 reference로 채택
  3. 각 슬레이브의 offset = reference - local
  4. 마스터가 ARMW(Auto-increment + Read-Multiple-Write)로 offset을 분배
  5. 슬레이브 ASIC이 그 offset만큼 자신의 clock을 자동 조정
```

결과는 sub-μs 수준입니다. 64축 모터가 모두 *동일한 절대 시각*에 다음 위치로 움직입니다. 1번 모터가 12.5 μs 먼저 움직이고 64번이 늦게 움직이는 일이 없습니다.

DC가 PTP와 비교해 갖는 강점은 *마스터의 OS jitter에 둔감*하다는 점입니다. 마스터가 보낸 *프레임 자체의 도착 시각*은 흔들려도, 슬레이브들 *사이*의 동기는 ASIC이 유지합니다. PTP는 마스터 jitter가 전체 slave에 *전파*되지만, DC는 *슬레이브 간 동기*만 보장하는 대신 그것을 *완벽하게* 보장합니다.

## TDMA — 시간 슬롯 분할

POWERLINK와 SERCOS III가 쓰는 방식입니다. 한 사이클을 *고정 슬롯*으로 나눕니다.

```text
POWERLINK 한 cycle (예: 1 ms)
  ┌────────────┬─────────────────────────────┬──────────────┐
  │ SoC (start)│  Isochronous (PReq+PRes×N)  │ Asynchronous │
  └────────────┴─────────────────────────────┴──────────────┘
   ← MN 송신   ←     hard real-time          ← TCP/IP 등 →
   (50 μs)        (800 μs)                    (150 μs)
```

`SoC` (Start of Cycle)는 *모든 노드의 시계를 맞추는 동기 신호*를 겸합니다. Isochronous 단계에서는 마스터(MN)가 각 슬레이브(CN)에게 *PReq*를 보내고, 슬레이브가 *PRes*로 응답합니다. *고정 순서*입니다. 끝나면 Asynchronous 단계로 일반 IP 트래픽이 흐릅니다.

TDMA의 장점은 *결정성이 명시적*이라는 점입니다. 어느 시각에 어느 노드가 송신하는지 *config에 박혀* 있습니다. 단점은 *유연성 부족*입니다. 노드를 추가/제거할 때마다 *전체 스케줄을 재계산*해야 합니다.

## 동기 방식 비교

| 표준 | 동기 방식 | 정확도 | reference |
|------|----------|--------|-----------|
| 표준 NTP | software polling | 1~10 ms | 외부 NTP server |
| 표준 PTP | hw timestamp | <100 ns | grandmaster |
| EtherCAT DC | ASIC + ARMW | <100 ns | 첫 DC slave |
| PROFINET IRT | hw schedule | <1 μs | IRT controller |
| TSN gPTP | hw + 802.1AS | <100 ns | grandmaster |

PTP가 가장 *일반 표준*이고, EtherCAT DC와 TSN gPTP가 그 *변형/계승*입니다. PROFINET IRT는 다른 노선을 따라가는데, 최근 TSN과 통합되는 흐름입니다.

## 자주 하는 실수

### "PREEMPT_RT만 켜면 1 μs jitter다"

호스트 OS jitter는 줄지만, *NIC 인터럽트 → 커널 스택 → 사용자 코드* 경로의 jitter는 여전히 수십 μs입니다. ns급 동기는 *NIC 하드웨어 타임스탬프*가 있어야 가능합니다. PREEMPT_RT + 하드웨어 PTP + IRQ affinity 셋이 모두 필요합니다.

### "PTP는 NTP의 빠른 버전이다"

원리는 닮았지만, NTP는 *소프트웨어*이고 PTP는 *하드웨어*입니다. NTP의 정밀도 한계는 OS 스택의 jitter입니다. PTP는 MAC 레벨에서 타임스탬프를 캡처하므로 이 한계를 우회합니다. 같은 1 ms 망에서 NTP는 ms 정밀, PTP는 ns 정밀입니다.

### "스위치가 끼면 PTP 정확도가 절반이다"

PTP-aware 스위치(Boundary 또는 Transparent Clock)면 거의 손실 없습니다. *일반 IT 스위치*에 PTP를 흘리면 스위치 큐 jitter가 그대로 오차로 들어옵니다. 산업용 망에서 *general purpose 스위치*는 금기입니다.

### "Jitter 사양이 ±1 μs면 항상 1 μs 이내다"

벤더 사양은 *전형적인 worst-case*입니다. 망 부하, 토폴로지, 슬레이브 수에 따라 더 나빠질 수 있습니다. *실제 측정*이 필수입니다. EtherCAT은 `ec_dcsync0` 호출 후 `ec_DCtime`을 로깅하면 측정할 수 있습니다.

## 정리

- cycle time은 *물리 시정수의 1/10 이하*가 일반 원칙입니다.
- jitter는 *평균이 아니라 worst-case*로 명세됩니다. p99.9 이상의 백분위입니다.
- 망 jitter는 *마스터 송신, 매체 전파, switch 큐, slave 처리* 네 원천의 합입니다.
- IEEE 1588 PTP는 *하드웨어 타임스탬프*로 sub-μs 동기를 달성합니다. Sync·Follow_Up·Delay_Req·Delay_Resp 네 메시지를 씁니다.
- EtherCAT DC는 *첫 슬레이브가 reference*인 변형으로, 마스터 OS jitter에 둔감합니다.
- TDMA(POWERLINK·SERCOS III)는 *시간 슬롯*으로 hard 트래픽과 best-effort를 분리합니다.
- 산업용 망에는 *PTP-aware 스위치*가 필수입니다.
- ns 정밀 동기는 *PREEMPT_RT + 하드웨어 PTP + IRQ affinity* 셋이 모두 갖춰져야 합니다.

다음 편은 **Ch 3: EtherCAT 아키텍처 — Processing on the Fly**입니다. 슬레이브가 어떻게 프레임을 *통과시키면서* 데이터를 읽고 쓰는지, FMMU와 Sync Manager가 무엇인지 풀어봅니다.

## 관련 항목

- [Ch 1: 산업용 이더넷 개요](/blog/embedded/protocols/industrial-ethernet/chapter01-overview)
- [Ch 3: EtherCAT 아키텍처 — Processing on the Fly](/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture)
- [Practical RTOS Internals Part 1.4: Preemption](/blog/embedded/rtos/practical-internals/part1-04-preemption)
- [Modern Embedded Recipes Part 4.6: IRQ affinity](/blog/embedded/modern-recipes/part4-06-irq-affinity) — PTP 패킷 처리를 RT core로 고정
- [원문 — IEEE 1588-2019 PTP](https://standards.ieee.org/standard/1588-2019.html)
- [원문 — linuxptp project](https://linuxptp.sourceforge.net/)
