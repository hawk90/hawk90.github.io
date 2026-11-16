---
title: "Ch 5: CXL 4.0의 핵심 새 기능 — 128 GT/s·Bundled Port"
slug: "embedded/hardware/cxl/chapter05-cxl-4-features"
date: 2026-05-16T09:05:00
description: "PCIe 7.0 기반 128 GT/s, Bundled Port·Streamlined Port의 동기와 효과."
series: "CXL 4.0 Internals"
seriesOrder: 5
tags: [cxl-4, pcie-7, bundled-port, streamlined-port, ppr]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"CXL 4.0은 *PCIe 7.0의 128 GT/s*로 *대역폭을 두 배*로 늘리고, *Bundled Port*로 *가속기 디바이스의 port를 묶어* 대역폭을 더 늘린 세대입니다."** — *256B flit 형식과 3.x 프로토콜 개선*은 그대로 두고, *native x2 width*, *retimer 최대 4개*, *memory RAS 강화*를 더했습니다.

[Ch 4](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)에서 *CXL 2.0~3.x의 fabric 진화*를 봤습니다. 이 장은 컨소시엄이 공개한 세 문서로 4.0의 변경을 정리합니다. [CXL 4.0 발표문](https://computeexpresslink.org/wp-content/uploads/2025/11/CXL_4.0-Specification-Release_FINAL_Website-Copy.pdf)(2025-11-18), [CXL 4.0 백서](https://computeexpresslink.org/wp-content/uploads/2025/11/CXL_4.0-White-Paper_FINAL.pdf)(Tony Benavides·Mahesh Wagh, Technical Task Force 공동 의장), [공식 Q&A](https://computeexpresslink.org/blog/introducing-the-cxl-4-0-specification-webinar-qa-recap-4386/)(2026-01-15)입니다. 4.0 규격 본문은 평가판을 받으려면 신청자 정보를 제출해야 해서 열람하지 않았습니다. 그래서 이 장에는 세 문서에 없는 4.0 세부(레지스터·필드·명령 형식)를 쓰지 않습니다.

## 4.0의 변경

| 영역 | 주요 변경 | 출처 |
|------|----------|------|
| 물리 계층 | *128 GT/s* (PCIe 7.0 기반), *native x2 width*, *retimer 최대 4개* | 발표문, 백서 |
| 토폴로지 | *Bundled Port* (full-capability port + Streamlined Port) | 발표문, 백서 |
| Memory RAS | 장치 boot 시 *host-initiated PPR*, boot 중 또는 다음 주기로 미루는 *memory sparing*, *patrol scrub* 주기의 세분화된 오류 검출·event 생성 | 백서 |
| 호환성 | 256B flit의 3.x 프로토콜 개선 유지, CXL 3.x·2.0·1.1·1.0과 하위 호환 | 발표문 |

## 128 GT/s — PCIe 7.0 PHY

같은 고속도로에서 차선 수를 그대로 두고 제한 속도를 두 배로 올리는 변화입니다. 백서는 이를 "PAM4 신호와 CXL 3.0의 FEC·CRC를 가진 flit 구조를 보존한 채 Nyquist 주파수를 두 배로 올려" 얻었다고 설명합니다.

| 세대 | 최대 데이터 속도 | 출처 |
|------|-----------|------|
| CXL 1.1·2.0 | 32 GT/s | 1.1 §1.5, 3.1 §1.4.1 |
| CXL 3.x | 64 GT/s (PAM4) | 3.1 §1.4.1 |
| **CXL 4.0** | **128 GT/s** | 4.0 발표문 |

한 방향의 raw rate를 단순 환산하면 x16에서 `128 × 16 ÷ 8 = 256 GB/s`입니다. GB는 십진 단위이며 양방향 합산값이나 CXL.mem payload 대역폭이 아닙니다. 공식 Q&A의 Q4 답변도 "정확한 성능은 설계·구성·트래픽에 달려 있다"고 하고, 규격은 일부 트랜잭션의 목표 지연만 제공한다고 씁니다.

발표문은 이 두 배를 "zero added latency"로, 백서는 "CXL 3.0과 같은 낮은 지연과 전력 효율 안에서"로 표현합니다. 128 GT/s 장치가 없어 이 주장은 측정하지 않았습니다. QEMU 11.1.3으로도 재현할 수 없습니다. QEMU의 PCIe 링크 속도 열거형은 `qapi/common.json:118-119`에서 `'2_5', '5', '8', '16', '32', '64'`로 끝나고, Type 3 모델의 `x-speed` 기본값은 32 GT/s입니다(`hw/mem/cxl_type3.c:1367-1368`).

### 신뢰성 수치

백서는 128 GT/s 링크의 FIT(Failure in Time, 10억 시간당 고장 수)가 10⁻³보다 낮다고 씁니다. 공식 Q&A Q1은 128 GT/s와 64 GT/s 모두 PAM-4 신호, -36 dB channel loss에서 FBER(First Bit Error Rate) 10⁻⁶ 미만으로 같다고 답합니다.

### Flit 형식은 그대로

4.0 발표문은 "256B Flit format으로 이전에 도입된 CXL 3.x 프로토콜 개선을 유지한다"고 씁니다. 자세한 flit 구조는 [Ch 9 Flit Format](/blog/embedded/hardware/cxl/chapter09-flit-format)에서 봅니다.

### Native x2 Width

CXL 3.1 §1.5는 CXL 모드 link width를 x16·x8·x4로 두고 x2·x1을 degraded mode로 분류합니다. 4.0 발표문은 *native x2 width* 개념을 도입해 "플랫폼의 fan-out을 늘린다"고 씁니다. 같은 lane 수로 더 많은 장치를 붙일 수 있다는 뜻입니다.

| Lane 구성 | 원시 전송률 (128 GT/s, 한 방향, 산술 환산) |
|----------|----------------------|
| x2 | 32 GB/s |
| x4 | 64 GB/s |
| x8 | 128 GB/s |
| x16 | 256 GB/s |

### Retimer 최대 4개

*Retimer*는 링크 중간에서 신호를 받아 다시 만들어 보내는 component입니다. 3.1 §1.4.2는 CPU와 장치 사이에 retimer를 한두 개 넣을 수 있다고 씁니다. 4.0은 *최대 4개*로 늘려 channel reach를 늘렸습니다(발표문). 공식 Q&A Q1은 광 연결도 retimer로 얻으며, retimer 양쪽이 각각 독립 channel처럼 동작해 FBER 특성이 end-to-end로 유지된다고 설명합니다.

## Bundled Port — 가속기 port 묶기

128 GT/s가 차선의 제한 속도를 올리는 것이라면, Bundled Port는 차선을 더 까는 것입니다. 백서는 이 방식의 장점을 내부 설계 관점에서 설명합니다. 데이터 경로 폭이나 내부 클럭을 두 배로 늘리는 대신 port stack을 두 배로 늘리면 대역폭을 쉽게 두 배로 만들 수 있다고 씁니다.

| 항목 | 내용 | 출처 |
|------|------|------|
| 대상 | Host와 CXL 가속기(Type 1/2 device) 사이 | 발표문 |
| 정의 | 여러 물리 CXL device port를 하나의 논리 entity로 묶음. enumeration 모델은 바꾸지 않음 | 백서 |
| 연결 대상 | host Root Port 하나 이상, 또는 switch upstream port | 백서 |
| 구성 | 묶음마다 full-capability port 하나 이상 + Streamlined Port. 장치 하나에 묶음 여러 개 가능 (Figure 2) | 백서 |
| SLD-B | Bundled Port를 구현한 SLD. 시스템에는 장치 하나로 보이고 대역폭은 묶은 링크에 걸쳐 늘어남 | 백서 |
| enumeration | bus enumeration 소프트웨어에는 SLD-B 여러 개가 보이고, device driver가 이들을 한 가속기로 관리 | Q&A Q6 |
| 트래픽 분산 | Bundled Port Device가 모든 port에 트래픽을 분산. driver는 interleave 힌트를 줄 수 있음 | Q&A Q6 |
| flit | 각 port가 독립 링크. flit 하나를 여러 port로 쪼개지 않음 | Q&A Q10 |
| multi-headed | MH-SLD·MH-MLD로 확장할 계획은 현재 없음 | Q&A Q7 |

백서 Figure 1은 Root Port 3개에 SLD-B 하나와 Streamlined SLD-B 두 개를 묶은 Bundle 0을 그리고, x16 128 GT/s 링크를 가정하면 한 방향 768 GB/s, 양방향 1.536 TB/s라고 적습니다. x16 한 링크의 한 방향 raw rate 256 GB/s에 링크 3개를 곱한 값입니다.

### Streamlined Port

백서는 Streamlined Port를 "데이터 이동에 최적화한" port로 설명하고, Bundled Port가 256B Flit Mode에 최적화되어 기존 68B Flit Mode의 오버헤드와 하드웨어 복잡도·비용을 줄일 수 있다고 씁니다. 다만 하위 호환을 위해 묶음의 port 가운데 적어도 하나는 68B flit을 지원해야 합니다.

## Memory RAS 강화

### Host-initiated PPR — 부팅 시 Repair

*PPR(Post Package Repair)*은 DRAM의 불량 row를 spare row로 대체하는 maintenance입니다. CXL 3.1에도 host가 내리는 *Perform Maintenance* 명령과 sPPR·hPPR 동작이 있습니다(§8.2.9.7). 백서는 4.0이 *장치 boot 시점*에 host가 시작하는 PPR을 가능하게 해, 고객 workload를 띄우기 전에 정비할 수 있게 했다고 씁니다.

### Memory Sparing — Boot 또는 Deferred

*Memory sparing*은 fault가 난 영역을 spare 영역으로 대체하는 maintenance입니다. 3.1 개정 이력도 memory sparing에 대한 가시성·제어 확장을 적고 있습니다. 백서에 따르면 4.0은 sparing을 boot 중에 수행하거나 다음 주기로 미룰 수 있게 해, 가용성을 해치지 않고 정비 시점을 고를 수 있게 했습니다.

### Patrol Scrub과 CVME

*CVME(Corrected Volatile Memory Error)*는 휘발성 메모리에서 정정된 오류입니다. 백서는 4.0이 "고급 CVME 보고"로 patrol scrub 주기 동안 더 세분화된 오류 검출과 event 생성을 제공한다고 씁니다. 3.1에 이미 있는 CVME 임계값 기능은 [Ch 15](/blog/embedded/hardware/cxl/chapter15-ras-performance)에서 봅니다.

## 발표 기능과 실제 관측 연결하기

4.0 기능이 실제 시스템에서 켜져 있는지는 어디서 볼 수 있을까요. 링크 속도·폭은 PCI sysfs에 있습니다. QEMU 게스트(CXL 2.0 수준 Type 3 모델)에서 읽은 값은 다음과 같습니다.

```bash
grep . /sys/bus/pci/devices/0000:0f:00.0/{max_link_speed,max_link_width,current_link_speed,current_link_width}
```

```text
/sys/bus/pci/devices/0000:0f:00.0/max_link_speed:32.0 GT/s PCIe
/sys/bus/pci/devices/0000:0f:00.0/max_link_width:16
/sys/bus/pci/devices/0000:0f:00.0/current_link_speed:32.0 GT/s PCIe
/sys/bus/pci/devices/0000:0f:00.0/current_link_width:16
```

같은 게스트의 root port `0c:00.0`은 `max_link_speed`가 `64.0 GT/s PCIe`, `max_link_width`가 32였지만 현재 링크는 32.0 GT/s x16이었습니다. QEMU에는 실제 링크 트레이닝이 없으므로 이 값들은 모델이 레지스터에 써 넣은 값입니다. 실제 128 GT/s 링크라면 같은 파일에서 협상된 속도를 읽습니다.

Bundled Port 지원은 소스에서 확인했습니다. Linux v6.12 `drivers/cxl/` 전체에서 `bundl`·`streamlin`을 대소문자 구분 없이 grep하면 0건입니다. 이 커널 판에는 Bundled Port 관련 코드가 없습니다.

| 관찰 단계 | 확인할 내용 | 이 시리즈의 결과 |
|---|---|---|
| PCI enumeration | port별 BDF·device ID와 driver binding | QEMU 모델은 단일 port Type 3 |
| Link 상태 | `current_link_speed`·`current_link_width` | 32.0 GT/s x16 (QEMU 고정값) |
| Bundled-aware 소프트웨어 | driver가 SLD-B를 한 장치로 관리하는지 | v6.12 `drivers/cxl/`에 해당 코드 없음 |
| RAS | PPR·sparing 명령과 event | 4.0 형식은 규격 본문 미열람 |

## 자주 하는 실수

### "128 GT/s로 바뀌면서 지연도 늘었다"

발표문은 *zero added latency*로, 백서는 *3.0과 같은 낮은 지연* 안에서 두 배라고 씁니다. 이 시리즈에서는 측정하지 않았습니다.

### "Bundled Port를 꽂으면 host가 알아서 한 device로 쓴다"

Q&A Q6에 따르면 bus enumeration에는 SLD-B 여러 개가 보이고, 이를 한 가속기로 묶어 관리하는 것은 device driver의 몫입니다. Linux v6.12 `drivers/cxl/`에는 그런 코드가 없습니다.

### "Bundled Port는 flit을 여러 port에 나눠 보낸다"

Q&A Q10은 각 port가 독립 링크이고 flit을 쪼개지 않는다고 답합니다. 대역폭은 port마다 독립된 flit 흐름이 여러 개라서 늘어납니다.

### "Streamlined Port는 Bundled Port의 간소화 모드다"

Streamlined Port는 Bundled Port *안에 들어가는 port 종류*입니다. 묶음에는 full-capability port가 하나 이상 있어야 하고, 적어도 한 port는 68B flit을 지원해야 합니다(백서).

### "Host-initiated PPR은 4.0에서 처음 생겼다"

host가 PPR을 요청하는 *Perform Maintenance*는 3.1에도 있습니다(§8.2.9.7). 백서가 4.0의 변경으로 적는 것은 *장치 boot 시점*의 host-initiated PPR입니다.

## 정리

- CXL 4.0은 *PCIe 7.0 기반 128 GT/s*로 대역폭을 두 배로 늘렸고, 컨소시엄은 *지연 추가 없음*을 주장합니다(측정하지 않음).
- *native x2 width*로 fan-out을, *retimer 최대 4개*로 channel reach를 늘렸습니다. 3.1에서는 x2가 degraded, retimer는 한두 개였습니다.
- *Bundled Port*는 가속기의 port를 묶어 대역폭을 늘리고, 각 port는 독립 flit 흐름을 가집니다.
- *boot 시 PPR*, *boot·deferred sparing*, *patrol scrub event*로 memory RAS를 강화했습니다.
- QEMU 11.1.3은 64 GT/s까지만 표현하고, Linux v6.12에는 Bundled Port 코드가 없습니다.

## 다음 편

[Ch 6: CXL.io — PCIe와의 차이·DOE·DVSEC](/blog/embedded/hardware/cxl/chapter06-cxl-io)에서 *CXL.io 프로토콜의 PCIe 호환성*과 *CXL 고유 확장*(DVSEC·DOE)을 본격적으로 분해합니다.

## 관련 항목

- [Ch 1: CXL의 자리와 진화](/blog/embedded/hardware/cxl/chapter01-cxl-position)
- [Ch 2: System Architecture](/blog/embedded/hardware/cxl/chapter02-system-architecture)
- [Ch 9: Flit Format](/blog/embedded/hardware/cxl/chapter09-flit-format)
- [Ch 15: RAS·Performance·Compliance](/blog/embedded/hardware/cxl/chapter15-ras-performance)

## 시리즈 자료 출처 안내

이 글은 CXL 4.0 발표문(2025-11-18)·백서·공식 Q&A(2026-01-15), CXL 3.1·1.1 규격, QEMU 11.1.3 소스와 게스트의 PCI sysfs 출력, Linux v6.12 `drivers/cxl/` grep 결과를 근거로 합니다. 시리즈 전체의 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
