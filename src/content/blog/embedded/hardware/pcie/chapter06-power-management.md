---
title: "Ch 6: Power Management — D-state·L-state·ASPM"
slug: "embedded/hardware/pcie/chapter06-power-management"
date: 2026-05-19T09:06:00
description: "PCIe 전력 관리 — Device D0~D3·Link L0~L3·ASPM·L1 substates·CLKREQ·PME 흐름."
series: "PCIe Deep Dive"
seriesOrder: 6
tags: [pcie, power-management, aspm, l1-substates, clkreq, pme]
draft: false
topics: ["embedded", "embedded/hardware"]
---


## 두 축을 나눠야 하는 이유

장치가 한동안 I/O를 하지 않는다고 장치 전원과 링크 클럭을 모두 꺼도 되는 것은 아닙니다. 복귀 지연, wake 경로, 공유하는 upstream port가 각각 제약을 만듭니다. PCIe 전력 관리는 **장치 상태 D-state**와 **링크 상태 L-state**를 나눠 봐야 합니다.

이 장은 [Linux v6.12 PCI PM 문서](https://www.kernel.org/doc/html/v6.12/power/pci.html)와 [동일 판의 ASPM 구현](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/pci/pcie/aspm.c)을 기준으로 정책과 관찰 방법을 설명합니다. 실제 suspend·wake 시험이나 전력·지연 측정은 수행하지 않았습니다. 특정 제품의 mW·복귀 시간도 일반적인 PCIe 수치로 제시하지 않습니다.

## 장치 상태와 링크 상태

D-state는 장치 기능과 공급 전원에 관한 상태입니다. 반면 L-state는 연결의 동작·절전을 표현합니다. 장치의 문을 닫는 것과 연결 통로의 조명을 끄는 일을 나눠 생각하면 됩니다. D0라는 이유만으로 link가 항상 L0인 것은 아닙니다.

| 장치 상태 | 확인할 의미 |
|------|------|
| D0 | 정상 기능을 수행할 수 있는 상태 |
| D1·D2 | 선택적 저전력 상태. 지원 여부를 확인 |
| D3hot | 표준 config 접근은 가능하고 I/O·memory 공간은 비활성 |
| D3cold | 주 전원 제거. PMCSR의 D-state 값만 써서 직접 만드는 상태가 아니며 플랫폼 전원 제어가 관여 |

D3cold에서 PME wake를 지원하려면 필요한 보조 전원과 wake 경로가 있어야 합니다. 모든 장치가 이를 지원하지는 않습니다. Linux PM 문서는 전원을 다시 공급하면 power-on reset과 기본 설정 복원이 일어난다고 설명하므로, 기존 runtime 설정이 남아 있다고 가정해서는 안 됩니다.

| 링크 상태 | 의미와 제약 |
|------|------|
| L0 | 정상 트래픽 전송 |
| L0s | 한 방향의 저전력 상태. Non-Flit Mode 설명과 구분 필요 |
| L1 | 더 깊은 링크 절전 상태 |
| L1.1·L1.2 | L1 substates. 지원·활성화·타이밍과 플랫폼 clock 설계를 확인 |
| L2·L3 | 더 깊은 절전·전원 제거 문맥. 비활성 link에서 즉시 정상 TLP를 전송한다고 가정할 수 없음 |

각 상태의 복귀 시간을 보편적인 상수로 적을 수는 없습니다. Link Capability, L1 PM Substates Capability와 플랫폼 제약을 함께 봐야 합니다.

## ASPM과 CLKREQ#

ASPM은 장치가 D0일 때도 idle link를 절전 상태로 전환할 수 있게 합니다. Linux의 선택은 양단 capability, firmware가 허용한 제어권, latency 제약, quirk와 policy에 영향을 받습니다. `powersave` 같은 policy 이름은 요청한 정책이며 실제 L1.2 체류 시간이나 절감 전력을 입증하지 않습니다.

CLKREQ#는 active-low clock 요청 신호입니다. 요청 여부와 실제 clock 공급·차단은 보드의 clock 구조와 절전 진입 절차에 따라 해석합니다. L1.2를 단순히 “CLKREQ# off”라는 고정 전압 상태로 외우거나, 모든 L1.2 지원 장치가 항상 같은 복귀 지연을 갖는다고 해석하면 안 됩니다.

LTR은 장치가 견딜 수 있는 snoop·non-snoop 지연 정보를 전달해 전력 관리에 활용하게 합니다. 이는 CPU가 측정한 애플리케이션의 p99 latency budget과 동일한 수치가 아닙니다.

## PME와 실제 wake 순서

Wake는 호출벨에 가깝습니다. 벨에 전원이 있고 소리가 담당자에게 전달돼야 문을 열 수 있습니다. PME 지원, 장치의 wake enable, upstream·플랫폼의 전달 경로, OS 정책을 모두 확인해야 합니다.

| 단계 | 확인할 조건 |
|------|------|
| 외부 이벤트 발생 | NIC packet 등 해당 장치의 wake 기능과 보조 전원 |
| wake 신호 전달 | 현재 link·전원 상태에서 지원하는 sideband·플랫폼 경로 또는 PME 전달 |
| 링크·전원 복원 | 비활성 링크라면 정상 메시지를 전송할 수 있는 상태로 복귀 |
| OS 통지와 resume | firmware ownership·native PME 처리, 장치 설정과 driver 상태 복구 |

따라서 “D3cold·L3 상태에서 Vaux만으로 바로 PME TLP를 보낸다”는 하나의 흐름으로 묶으면 안 됩니다. Native PCIe PME는 in-band 메시지이지만, 시스템을 깨우기 위한 전원·링크 복원 과정은 그 이전에 필요할 수 있습니다. Firmware가 native PME 제어권을 OS에 주지 않는 플랫폼에서는 처리 경로도 다릅니다.

## Linux에서 관찰하기

먼저 바꿀 설정을 정하기보다 현재 요청 정책과 관찰 상태를 모읍니다. 아래는 대상 Linux에서 실행할 수 있는 조회 예이며, 이 작업에서는 실제 PCI 장치에 실행하지 않았습니다. `0000:01:00.0`은 예시 BDF이며 대상 장치로 바꿔야 합니다.

```bash
bdf=0000:01:00.0
lspci -s "$bdf" -vv
cat "/sys/bus/pci/devices/$bdf/power/control"
cat "/sys/bus/pci/devices/$bdf/power/runtime_status"
cat "/sys/bus/pci/devices/$bdf/power/wakeup"
cat /sys/module/pcie_aspm/parameters/policy
```

`power/control`의 `auto`는 runtime PM을 허용하는 정책이며, 이미 suspend됐다는 뜻이 아닙니다. `runtime_status`와 driver 동작을 함께 확인합니다. 속성 부재·권한 오류를 `disabled`나 `active` 같은 정상 상태로 채우지 않습니다. `lspci`의 설정 비트도 실제 절전 체류율을 직접 측정한 결과는 아닙니다.

설정을 비교하는 실험에서는 같은 장치·firmware·kernel·부하를 유지하고 전력, throughput, p50·p99, wake 실패 횟수를 함께 기록합니다. idle 소비 전력만 줄어도 반복되는 wake 실패나 tail latency 증가가 있으면 그 정책이 목적을 만족한다고 판정할 수 없습니다. 이 글에서는 policy 변경이나 sysfs write를 실행하지 않았습니다.

## 실패를 가르는 기준

| 증상 | 먼저 나눌 원인 | 단정하면 안 되는 것 |
|------|------|------|
| `auto`인데 계속 active | driver 지원, 사용 중인 reference, 실제 idle 여부 | ASPM 미지원 하나로 확정 |
| 절전 뒤 장치 접근 실패 | 전원 복원·link·config 복원·driver resume | 단순 link 속도 부족 |
| wake가 오지 않음 | wake capability·enable·보조 전원·전달 경로 | PME bit만 켜면 항상 성공 |
| burst latency 증가 | 절전 진입·복귀와 workload의 시간 상관관계 | 모든 서버에서 ASPM을 꺼야 함 |
| boot부터 불안정 | firmware 초기 설정·quirk·신호·전원 조건 | OS 진입 전이므로 ASPM과 무관 |

## 정리

- D-state와 L-state는 다른 축이며, D0에서도 link 절전이 가능합니다.
- D3cold는 주 전원 제거 상태이고, 복원 시 reset·설정 복구가 필요합니다.
- ASPM 지원·활성 설정·실제 체류와 절감 효과를 구분합니다.
- CLKREQ#와 L1 substates는 플랫폼의 clock·타이밍 조건을 함께 봅니다.
- PME wake에는 장치·링크·플랫폼·OS의 전달과 복원 과정이 필요합니다.
- 전력과 평균 성능만 보지 않고 tail latency·wake 실패를 함께 비교합니다.

## 다음 편

[Ch 7: Error Handling — Correctable·Uncorrectable·AER·DPC](/blog/embedded/hardware/pcie/chapter07-error-handling)에서 *PCIe 에러 분류와 Advanced Error Reporting·Downstream Port Containment*를 본격적으로 분해합니다.

## 관련 항목

- [Ch 3: Configuration Space](/blog/embedded/hardware/pcie/chapter03-config-space) — PCI-PM Cap·LTR
- [Ch 5: Interrupts](/blog/embedded/hardware/pcie/chapter05-interrupts) — MSI·MSI-X와 인터럽트 전달
- [Ch 9: Physical Layer](/blog/embedded/hardware/pcie/chapter09-physical-layer) — LTSSM·L states 진입
- [BSP: SoC 데이터시트 읽기](/blog/embedded/bsp/chapter02-datasheet) — L1 timeout을 일으키는 i.MX erratum과 커널 driver 속 workaround 위치

## 시리즈 자료 출처 안내

본 글의 1차 자료·정책은 [Ch 1 footer](/blog/embedded/hardware/pcie/chapter01-fundamentals#시리즈-자료-출처-안내) 참고.
