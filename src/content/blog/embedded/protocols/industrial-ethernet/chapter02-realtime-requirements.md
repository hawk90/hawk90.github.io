---
title: "산업용 통신 실시간 요구사항 — Determinism·Jitter·Cycle Time"
slug: "embedded/protocols/industrial-ethernet/chapter02-realtime-requirements"
date: 2026-05-13T09:02:00
description: "cycle time과 jitter를 정의하고, linuxptp 소스의 PTP 오프셋 계산과 VM에서 돌린 software timestamp ptp4l 로그, SOEM의 EtherCAT DC 설정 코드를 나란히 비교합니다."
series: "Industrial Ethernet 심화"
seriesOrder: 2
tags: [realtime, jitter, latency, cycle-time]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **"결정성은 평균 지연이 아니라 *최악 지연의 상한*이다."** 산업 제어망의 설계는 jitter 예산 분배와 시계 동기, 두 축으로 정해집니다.

산업용 이더넷 자료를 처음 펴면 "1 ms 사이클", "sub-μs jitter" 같은 숫자가 쏟아집니다. 그 숫자가 무엇을 재서 나왔는지 모르면 표준 비교가 *느낌의 비교*로 끝납니다.

이 장은 cycle time과 jitter의 정의를 먼저 정리하고, jitter가 어디서 생기는지 나눠 봅니다. 그다음 IEEE 1588 PTP의 오프셋 계산을 linuxptp 소스로 확인하고, Debian VM에서 실제로 ptp4l을 돌려 software timestamp의 한계를 봅니다. 마지막으로 EtherCAT의 Distributed Clocks(DC)가 PTP와 어떻게 다른지 SOEM 코드와 Beckhoff ESC 데이터시트로 비교합니다.

## Cycle time — 무엇의 주기인가

"cycle time 250 μs"라는 말에는 세 가지 다른 뜻이 섞여 있을 수 있습니다. 센서를 읽는 샘플링 주기, 프레임이 오가는 통신 주기, 제어 연산이 끝나야 하는 deadline입니다. 버스 배차 간격이 5분이라고 승객의 이동 시간이 5분은 아니듯, 세 값은 서로 다른 양입니다.

통신 주기를 250 μs로 정했다면 한 주기 안에 "sample → 계산 → 전송 → 출력"의 최악 시간과 여유가 모두 들어가야 합니다. 예를 들어 각 단계의 최악값이 40·80·60·30 μs라면 합은 210 μs이고 여유는 40 μs입니다. 이 숫자는 예산을 나누는 방법을 보이기 위한 가정이며, 특정 설비의 권고값이 아닙니다.

## Jitter — 평균이 아니라 분산

jitter는 *예정 시각 대비 실제 시각의 흔들림*입니다. 평균 250 μs 주기인데 어떤 사이클은 240 μs, 다른 사이클은 260 μs 간격으로 도착하면 연속 간격의 편차는 ±10 μs입니다.

주기가 흔들리면 제어기는 박자가 매번 바뀌는 메트로놈에 맞춰 연주하는 셈이 됩니다. PID 제어기는 고정된 샘플 간격을 전제로 미분·적분 항을 계산하므로, 간격이 흔들리면 그 계산 자체가 틀어집니다.

jitter를 보고할 때는 정의를 함께 적습니다. 예정 시각 대비 오차인지, 연속 간격의 편차인지, peak-to-peak인지에 따라 같은 측정도 숫자가 달라집니다.

**관측 p99.9와 worst-case 보장은 다릅니다.** 백분위는 유한 표본의 통계이고, 상한 보장은 명세된 조건 안의 모든 경우를 다룹니다. [Ch 1](/blog/embedded/protocols/industrial-ethernet/chapter01-overview)의 VM ping 실험에서 5000회 중 최대값이 평균의 67배였듯이, 표본을 더 모으면 더 큰 값이 나올 수 있습니다.

## Jitter 예산 분해

망 전체의 jitter는 여러 *원천*의 합입니다. 결정적 망을 설계한다는 것은 각 원천에 *예산*을 나눠 주는 일입니다.

| 원천 | 흔들리는 양 |
|---|---|
| host release / scheduling | task가 예정 시각보다 늦게 깨어난 시간 |
| 송수신 경로 | IRQ·queue 대기, timestamp를 찍는 지점까지의 처리 |
| 전파·device 처리 | 고정 지연은 크지만 변동은 작음 |
| clock 동기 | clock offset·drift와 경로 비대칭 |

고정 지연과 변동은 따로 셉니다. 100 m 구리선의 전파 지연은 매 주기 거의 같으므로 jitter가 아니라 오프셋으로 보정할 대상입니다. Beckhoff ET1100 데이터시트(v2.1, Table 91)는 MII 포트 사이의 처리 지연을 min 280 ns, average 305 ns, max 335 ns로 적습니다(FIFO size 7, TX shift 00, ESC 포트 사이 값이라 PHY 지연은 따로 더해야 합니다). 이 경우 평균 305 ns는 보정할 고정분이고, 그 폭 55 ns가 jitter 예산에 들어갑니다.

## IEEE 1588 PTP — 네 개의 timestamp

분산 시스템에서 시계를 맞추는 표준은 PTP(Precision Time Protocol)입니다. 원리는 전화로 시계를 맞추는 것과 비슷합니다. 상대에게 "지금 10시"라고 말해도 목소리가 가는 데 걸린 시간만큼 오차가 생기므로, 한 번 왕복해서 걸린 시간을 재고 그 절반을 더해 줍니다.

E2E(end-to-end) delay mechanism은 네 메시지를 씁니다.

| 메시지 | 방향 | 실어 나르는 값 |
|--------|------|------|
| **Sync** | Master → Slave | 송신 시각 t1 (one-step이면 직접, two-step이면 Follow_Up으로) |
| **Follow_Up** | Master → Slave | two-step 장치가 송신 후에 확정한 정확한 t1 |
| **Delay_Req** | Slave → Master | slave가 t3에 송신, master가 t4에 수신 |
| **Delay_Resp** | Master → Slave | master가 기록한 t4 |

t2는 slave가 Sync를 받은 시각입니다. 네 값이 모이면 slave는 오프셋과 경로 지연을 따로 구할 수 있습니다. linuxptp v4.4의 `tsproc.c`는 이를 다음처럼 계산합니다.

```c title="linuxptp-v4.4/tsproc.c (발췌)"
/* delay = ((t2 - t3) * rr + (t4 - t1)) / 2 */        /* 128행, get_raw_delay() */
/* offset = t2 - t1 - delay */                         /* 212행, tsproc_update_offset() */
```

`rr`(clock rate ratio)이 1이면 두 식을 정리해 다음을 얻습니다.

- 평균 경로 지연 = `((t2−t1)+(t4−t3))/2`
- offset(slave−master) = `((t2−t1)−(t4−t3))/2`

다음 Node.js 함수는 같은 식을 정수 ns BigInt로 계산합니다. 반 ns를 잃지 않도록 두 배 값을 돌려주며, servo나 필터는 구현하지 않습니다.

```js title="ptp-four-timestamps.mjs"
export function ptpExchange(t1, t2, t3, t4) {
  if (![t1,t2,t3,t4].every(x => typeof x === "bigint" && x >= 0n) ||
      t3 < t2 || t4 < t1) throw new RangeError("invalid exchange timestamps");
  const forward = t2 - t1, reverse = t4 - t3;
  if (forward + reverse < 0n) throw new RangeError("negative path delay");
  return {offsetTimesTwoNs: forward-reverse, pathDelayTimesTwoNs: forward+reverse};
}
```

두 가지 입력을 넣어 봤습니다. 첫째는 slave가 300 ns 앞서 있고 경로가 양방향 1500 ns로 같은 경우, 둘째는 실제 오프셋이 0인데 송신 방향만 2000 ns, 수신 방향은 1000 ns인 비대칭 경우입니다.

```text
$ node ptp-test.mjs        # Node v24.22.3
sym { offsetTimesTwoNs: 600n, pathDelayTimesTwoNs: 3000n }
asym { offsetTimesTwoNs: 1000n, pathDelayTimesTwoNs: 3000n }
```

첫 결과는 오프셋 300 ns, 경로 1500 ns로 정답입니다. 둘째는 실제 오프셋이 0인데 500 ns로 나옵니다. 계산이 *경로가 대칭*이라고 가정하기 때문에, 방향별 지연 차이 1000 ns의 절반이 그대로 오프셋 오차가 됩니다. 이 오차는 PTP 메시지만으로는 검출할 수 없습니다. 경로 비대칭은 케이블 길이·PHY·스위치 큐에서 생기며, 높은 정확도가 필요한 시스템은 이 값을 따로 재서 보정합니다.

### Software timestamp의 한계 — VM에서 돌린 ptp4l

timestamp를 *어디서* 찍는지가 정확도를 좌우합니다. 실제로 얼마나 흔들리는지 보기 위해 Debian 12 VM(QEMU/HVF, kernel 6.1.0-56-arm64, linuxptp 3.1.1) 안에 network namespace 두 개를 veth 한 쌍으로 이은 뒤 양쪽에서 ptp4l을 돌렸습니다. 먼저 veth가 지원하는 timestamp 방식을 확인합니다.

```text
# ip netns exec sl ethtool -T vsl
Time stamping parameters for vsl:
Capabilities:
	software-transmit
	software-receive
	software-system-clock
PTP Hardware Clock: none
Hardware Transmit Timestamp Modes: none
Hardware Receive Filter Modes: none
```

veth에는 PHC(PTP Hardware Clock)가 없으므로 `-S`(software timestamp)만 쓸 수 있습니다. linuxptp v4.4의 `ptp4l.8`에 따르면 `-S`는 software timestamping, `-2`는 IEEE 802.3 transport, `-s`는 clientOnly, `-m`은 표준출력 로그입니다. grandmaster 쪽은 `ptp4l -i vgm -S -2 -m`, slave 쪽은 `ptp4l -i vsl -S -2 -s -m`으로 실행했습니다.

```text
ptp4l[779.121]: port 1: LISTENING to UNCALIBRATED on RS_SLAVE
ptp4l[780.128]: master offset         62 s0 freq   +2107 path delay      1396
ptp4l[781.129]: master offset        844 s0 freq   +2107 path delay      1364
...
ptp4l[788.154]: master offset       4146 s0 freq   +2107 path delay      1645
...
ptp4l[790.163]: master offset       4313 s0 freq   +2107 path delay      1770
...
ptp4l[792.165]: master offset       4261 s0 freq   +2107 path delay      2031
...
ptp4l[796.186]: port 1: UNCALIBRATED to SLAVE on MASTER_CLOCK_SELECTED
...
ptp4l[802.205]: master offset         84 s2 freq   +2038 path delay      1249
ptp4l[803.205]: master offset       -146 s2 freq   +2015 path delay      1104
```

두 namespace는 같은 VM의 같은 `CLOCK_REALTIME`을 공유하므로 *실제 오프셋은 정의상 0*입니다. 그런데도 ptp4l은 최대 4313 ns의 오프셋을 보고했고, 길이가 사실상 0인 veth의 path delay를 1.1~2.7 μs로 쟀습니다. 이 수 μs는 전부 커널 스택과 VM 스케줄링이 timestamp에 섞인 값입니다. VM의 숫자라 실제 장비의 정확도와 비교할 수는 없지만, software timestamp가 왜 μs 단위 오차를 갖는지는 보여 줍니다. servo 상태가 `s2`(locked)로 바뀐 직후에도 −1802 ns까지 흔들렸고, 마지막 몇 초에도 수백 ns가 남습니다.

### 하드웨어 timestamp

NIC가 PHC를 갖고 있으면 MAC이나 PHY 근처에서 송수신 시각을 찍어 OS 지연을 timestamp에서 뺍니다. `ethtool -T`의 출력에 `hardware-transmit`·`hardware-receive`와 `PTP Hardware Clock: N`이 보이면 `/dev/ptpN`을 쓸 수 있고, ptp4l은 `-H`로 그 경로를 씁니다. 이 VM에는 그런 NIC가 없어 hardware timestamp 실험은 하지 않았습니다.

### Boundary Clock vs Transparent Clock

망에 *스위치*가 끼면 스위치 안의 큐 대기가 방향마다 달라 경로 비대칭이 커집니다. 해결책은 두 가지입니다.

| 모델 | 동작 | linuxptp v4.4 `clock_type` |
|------|------|--------|
| **Boundary Clock** | 스위치가 상류 포트에서는 slave, 하류 포트에서는 master로 동작 | `BC` |
| **Transparent Clock** | 패킷이 스위치 안에 머문 시간을 *correctionField*에 더해 넘김 | `E2E_TC`, `P2P_TC` |

linuxptp `config.c`(168~172행)의 `clock_type` 열거형이 위 값을 받고, `tc.c`는 메시지의 `header.correction`을 읽어 체류 시간을 더한 뒤 다시 씁니다. 릴레이로 치면 boundary clock은 구간마다 새 주자가 시계를 받아 다시 맞추는 방식이고, transparent clock은 바통을 그대로 넘기면서 "여기서 몇 ns 지체"라는 메모를 붙이는 방식입니다.

## EtherCAT Distributed Clock — PTP와 다른 방식

EtherCAT은 PTP를 그대로 쓰지 않고 *Distributed Clocks(DC)*라는 자체 방식을 씁니다. Beckhoff ESC 데이터시트 Section I(v2.3) 9.1절의 정의는 다음과 같습니다.

- system time은 2000-01-01 0시부터 센 64 bit 값이고 단위는 1 ns입니다. 하위 32 bit는 약 4.2초마다 한 바퀴 돕니다.
- reference clock은 보통 마스터 다음에 오는 *첫 DC 지원 ESC*입니다. 마스터가 아닙니다.
- 동기는 전파 지연 측정, 오프셋 보정, time control loop 리셋, drift 보정 순으로 진행합니다.

SOEM v1.4.0의 `ecx_configdc()`(`soem/ethercatdc.c`)는 이 순서를 그대로 코드로 옮깁니다.

| 단계 | SOEM v1.4.0 코드 | ESC 데이터시트 |
|---|---|---|
| 수신 시각 latch | 270행 `ecx_BWR(..., ECT_REG_DCTIME0, ...)` | 9.1.2: Receive Time Port 0(0x0900)에 broadcast write |
| epoch 맞추기 | 272행 `mastertime.sec -= 946684800UL` | system time은 2000-01-01 기준 |
| reference 고르기 | 279~285행, 첫 `hasdc` slave를 `DCnext`로 연결 | "first ESC with DC capability" |
| 각 slave 읽기 | 296행 `ecx_FPRD(..., ECT_REG_DCTIME0, ...)` | 포트별 수신 시각 |
| 오프셋 쓰기 | 303행 `ecx_FPWR(..., ECT_REG_DCSYSOFFSET, ...)` | 9.1.3 offset compensation |
| 지연 쓰기 | 408행 `ecx_FPWR(..., ECT_REG_DCSYSDELAY, ...)` | System Time Delay 0x0928 |

각 slave의 로컬 시계는 서로 맞춰져 있지 않으므로, 전파 지연은 *한 slave의 포트 사이 수신 시각 차이*로 계산합니다(데이터시트 9.1.2). PTP가 메시지 왕복으로 지연을 재는 것과 달리, DC에서는 한 프레임이 각 포트를 지난 시각을 ESC 하드웨어가 latch해 두고, 마스터가 나중에 그 값을 모아 지연을 계산합니다.

drift 보정은 주기 통신에 섞여 들어갑니다. 데이터시트 9.1.5는 마스터가 reference clock의 system time을 ARMW나 FRMW로 주기적으로 배포하라고 하고, SOEM의 `ethercatmain.c` 1765·1803·1844행(LRD·LWR·LRW 경로)은 process data 프레임에 `EC_CMD_FRMW` datagram을 추가해 reference slave의 `ECT_REG_DCSYSTIME`을 읽고 다른 slave에 씁니다. 1941·1960행은 응답에서 읽은 값을 `ec_DCtime`에 저장합니다. 따라서 `ec_DCtime`은 reference clock의 system time 관측값이며, slave 사이의 동기 오차 자체가 아닙니다. 실제 동기 오차는 각 장치의 SYNC0 출력을 같은 계측기로 재야 보입니다.

## TDMA — 시간 슬롯 분할

POWERLINK와 Sercos가 쓰는 방식입니다. 한 사이클을 정해진 순서의 슬롯으로 나눕니다.

![POWERLINK Cycle (1 ms)](/images/blog/industrial-ethernet/diagrams/ch02-powerlink-cycle.svg)

`SoC`(Start of Cycle)가 주기를 시작합니다. Isochronous 단계에서는 MN(Managing Node)이 각 CN(Controlled Node)에 *PReq*를 보내고, CN은 *PRes*로 응답합니다. 이 단계가 끝나면 MN이 *SoA*로 Asynchronous 단계를 열고, 그 구간에 ASnd나 일반 IP 트래픽이 흐릅니다. 메시지 종류는 [Ch 10](/blog/embedded/protocols/industrial-ethernet/chapter10-powerlink)에서 openPOWERLINK 소스로 확인합니다.

TDMA의 장점은 *누가 언제 보내는지가 설정에 박혀 있다*는 점입니다. 단점도 같은 곳에서 나옵니다. 노드를 추가하면 주기 안의 PReq/PRes 순서와 시간 예산을 다시 짜야 합니다.

## 동기 방식 비교

| 메커니즘 | 지연 측정 방식 | reference |
|---|---|---|
| IEEE 1588 PTP | 메시지 왕복(E2E) 또는 인접 노드 왕복(P2P) | BMCA로 고른 grandmaster |
| EtherCAT DC | 한 프레임의 포트별 수신 시각 latch | 첫 DC 지원 ESC |
| IEEE 802.1AS (gPTP) | 인접 노드 사이 peer delay | BMCA로 고른 grandmaster |

세 방식은 와이어 형식도 서로 다릅니다. ESC 데이터시트 9.1("Definition of the Reference Clock")은 DC의 reference clock을 IEEE 1588 grandmaster 같은 외부 기준에 맞출 수 있다고만 적고, 그 방법은 정하지 않습니다.

## 자주 하는 실수

### "PREEMPT_RT와 하드웨어 timestamp가 있으면 정확도가 보장된다"

두 기능은 서로 다른 오차를 줄입니다. PREEMPT_RT는 host scheduling 지연, hardware timestamp는 timestamp에 섞이는 스택 지연을 줄입니다. 위 `asym` 계산처럼 경로 비대칭은 둘 중 어느 것으로도 사라지지 않습니다.

### "PTP는 하드웨어이고 NTP는 소프트웨어다"

위 VM 실험은 hardware timestamp 없이 PTP를 돌렸습니다. PTP 메시지를 쓰는 것과 NIC hardware timestamp를 쓰는 것은 별개의 조건이고, software timestamp PTP는 이 VM에서 수 μs 오차를 보였습니다.

### "ptp4l의 master offset이 작으면 시계가 맞은 것이다"

master offset은 servo가 *자기 timestamp로 추정한* 값입니다. VM 실험의 slave는 실제 오프셋이 0인데도 수 μs를 보고했고, 반대로 경로 비대칭이 있으면 보고값이 0이어도 실제 오프셋은 남습니다. 외부 기준(예: 두 장치의 PPS 출력을 같은 오실로스코프로 비교)으로 잰 값과 구별해야 합니다.

### "관측 p99.9가 1 μs면 항상 1 μs 이내다"

표본 백분위는 보장 상한이 아닙니다. `ec_DCtime`도 reference clock 값이므로 slave 사이의 오차를 직접 보여 주지 않습니다.

## 정리

- cycle은 샘플링·통신·deadline 중 무엇인지 정하고, 단계별 최악 시간의 합으로 예산을 짭니다.
- jitter는 정의(예정 시각 대비·간격 편차·peak-to-peak)와 함께 보고하고, 백분위와 보장 상한을 구별합니다.
- 고정 지연은 오프셋으로 보정하고, 변동분만 jitter 예산에 넣습니다.
- PTP는 네 timestamp로 오프셋과 지연을 분리하지만, 경로 비대칭의 절반은 오프셋 오차로 남습니다.
- software timestamp ptp4l은 VM에서 실제 오프셋 0인 시계에 수 μs를 보고했습니다. 정확도는 timestamp를 어디서 찍느냐가 정합니다.
- EtherCAT DC는 첫 DC 지원 ESC를 reference로 삼고, 포트별 수신 시각 latch와 FRMW 배포로 동기합니다.
- TDMA(POWERLINK·Sercos)는 *시간 슬롯*으로 hard 트래픽과 비동기 트래픽을 나눕니다.

다음 편은 **Ch 3: EtherCAT 아키텍처 — Processing on the Fly**입니다. 슬레이브가 어떻게 프레임을 *통과시키면서* 데이터를 읽고 쓰는지, FMMU와 Sync Manager가 무엇인지 풀어봅니다.

## 관련 항목

- [Ch 1: 산업용 이더넷 개요](/blog/embedded/protocols/industrial-ethernet/chapter01-overview)
- [Ch 3: EtherCAT 아키텍처 — Processing on the Fly](/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture)
- [Practical RTOS Internals Part 1.4: Preemption](/blog/embedded/rtos/practical-internals/part1-04-preemption)
- [Modern Embedded Recipes: IRQ affinity](/blog/embedded/modern-recipes/part7-13-irq-affinity) — PTP 패킷 처리를 RT core로 고정
- [linuxptp v4.4 `tsproc.c`](https://github.com/richardcochran/linuxptp/blob/v4.4/tsproc.c)
- [SOEM v1.4.0 `ethercatdc.c`](https://github.com/OpenEtherCATsociety/SOEM/blob/v1.4.0/soem/ethercatdc.c)
- [Beckhoff EtherCAT Slave Controller Section I — Technology v2.3](https://download.beckhoff.com/download/document/io/ethercat-development-products/ethercat_esc_datasheet_sec1_technology_2i3.pdf)
- [원문 — IEEE 1588-2019 PTP](https://standards.ieee.org/standard/1588-2019.html)
- [원문 — linuxptp project](https://linuxptp.sourceforge.net/)
