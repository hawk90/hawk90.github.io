---
title: "CXL TEE 확장 — Trusted Execution을 메모리 디바이스까지"
slug: "embedded/embedded-security/chapter13-cxl-tee"
date: 2026-06-17T09:03:00
description: "PCI-SIG TDISP·CXL TSP·Linux PCI TSM — Confidential Computing이 메모리 디바이스·가속기로 확장되는 표준 흐름."
series: "Embedded Security"
seriesOrder: 13
tags: [cxl, tdisp, confidential-computing, arm-cca, sev-tio, tvm]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"CPU 안의 TEE·암호화된 링크·인증된 디바이스 — 이 셋을 묶어 *디바이스까지 TVM 신뢰 경계 안에 넣는* 것이 목표입니다."** — PCIe 쪽은 PCI-SIG의 *TDISP (TEE Device Interface Security Protocol)*가, CXL 메모리 쪽은 CXL 3.1의 *TSP (TEE Security Protocol)*가 맡습니다. PCIe TDISP의 Linux PCI TSM 인터페이스와 CXL TSP의 상태·보호 범위는 구분해서 확인해야 합니다. 특정 kernel의 PCI TSM 지원이 CXL TSP 구현·실행 성공을 뜻하지 않습니다.

[Ch 5 (OP-TEE)](/blog/embedded/embedded-security/chapter05-tee)는 secure-world 호출·저장소의 경계. [Ch 11 (IDE)](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)은 *링크 암호화*. [Ch 12 (SPDM)](/blog/embedded/embedded-security/chapter12-spdm-cma)은 *디바이스 인증*. 이 셋이 *Confidential Computing*에서 *어떻게 합쳐지는지*를 본 마지막 장입니다.

## 왜 디바이스까지 TEE가 필요한가

Confidential Computing은 *클라우드에서 호스트(hypervisor 포함) 자체를 신뢰하지 않는* 모델입니다. 그런데 GPU·CXL.mem 같은 *가속기·메모리 디바이스*는 *전통적으로 hypervisor가 매개*합니다. TVM(Trusted VM)이 디바이스를 쓰려면 그 디바이스와 경로도 신뢰 경계 안에 들어와야 합니다.

## 구성 요소

| 구성 요소 | 정의 주체 | 역할 |
|------|----|----|
| **TDISP** | PCI-SIG (TDISP ECR, CXL 3.1 §11.5.1) | PCIe device interface의 보안 상태(LOCKED·RUN·ERROR 등)를 관리. Linux v7.0에서는 VFIO/IOMMUFD가 TSM bind를 시작 |
| **TSP** | CXL Consortium (CXL 3.1 §11.5) | 직접 연결된 Type 3 메모리를 confidential computing의 신뢰 경계에 포함. IDE·TDISP와 함께 쓸 수 있으나 의존하지 않음 |
| **SPDM** | DMTF DSP0274 | 디바이스 인증·측정·secure session ([Ch 12](/blog/embedded/embedded-security/chapter12-spdm-cma)) |
| **IDE** | PCI-SIG, CXL | 링크 트래픽 보호 ([Ch 11](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)) |

CXL 3.1의 용어표는 TDISP를 "PCI-SIG가 정의한 TEE Device Interface Security Protocol"로 적습니다. CXL 쪽 대응물이 TSP이며, 같은 사양의 개정 이력은 TSP 기능이 "CXL IDE나 PCIe TDISP와 함께 쓸 수 있지만 어느 쪽에도 의존하지 않는다"고 적습니다. TSP가 authentication·attestation에 SPDM 1.2 이상을 쓴다는 것은 §11.5.2 Scope에 있습니다.

## TDISP 상태

TDISP 원문(CXL 3.1 §11.5.1이 "PCI-SIG TEE Device Interface Security Protocol (TDISP) ECR"로 부르는 문서)은 이 글에서 대조하지 않았습니다. 대신 [Linux v7.0 PCI sysfs ABI](https://github.com/torvalds/linux/blob/v7.0/Documentation/ABI/testing/sysfs-bus-pci)의 `tsm/bound` 항목이 TDISP 상태 이름을 씁니다. ABI는 LOCKED·RUN·ERROR를 "TDISP operational state"로, UNLOCKED를 그 밖의 상태로 구분합니다.

| 상태 | v7.0 ABI에서의 의미 |
|------|------|
| UNLOCKED | operational state가 아님. `tsm/bound`가 비어 있음 |
| LOCKED | operational state. `tsm/bound`에 TSM 이름이 채워짐 |
| RUN | operational state. `tsm/bound`에 TSM 이름이 채워짐 |
| ERROR | operational state. `tsm/bound`에 TSM 이름이 채워짐 |

`tsm/bound`는 connect와 TSM bind가 성공한 뒤에만 채워지고, bind는 VFIO/IOMMUFD가 시작합니다. ERROR도 bound 상태에 들어가므로 이름이 보인다고 RUN이라고 판정할 수 없습니다. ABI는 bound 동안 BME(Bus Master Enable)·MSE(Memory Space Enable) 같은 device 설정이 바뀌지 않아야 한다고도 적습니다.

## CXL TSP target 상태

CXL 메모리 디바이스(TSP target)의 상태는 TDISP와 다릅니다(CXL 3.1 §11.5.4.8).

| 상태 | 의미 | 전이 |
|------|------|----------|
| CONFIG_UNLOCKED | Conventional Reset 뒤 기본. 보안 설정을 하는 상태. TEE 트랜잭션 불가 | 잠금 성공 → CONFIG_LOCKED |
| CONFIG_LOCKED | 레지스터·CCI 접근 제한, TE State 저장·검사. TEE 트랜잭션 허용 | Transport Security 실패·CXL Reset → ERROR. Conventional Reset → CONFIG_UNLOCKED |
| ERROR | TVM 데이터는 계속 보호, 새 TEE 트랜잭션 거부 | 세션·데이터 정리 후, 또는 Conventional Reset → CONFIG_UNLOCKED |

[CXL 3.1 §11.5.2](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf)의 범위는 다음과 같습니다.

| 포함 | 제외 |
|------|------|
| SPDM 1.2 이상 authentication·attestation | CXL switch, switch 뒤 device(MLD 포함) |
| 직접 연결 LD·SLD·MH-SLD, Dynamic Capacity device | UIO·CXL.mem·CXL.io direct P2P |
| HDM-H memory, 256B flit | HDM-D·HDM-DB, PBR·68B flit, Type 1·2의 Type 3 HDM 접근 |
| Memory pooling | Memory sharing |
| Comprehensive·Selective Trust model, 암시적·명시적 TE State 접근 제어 | |

Pooling과 sharing의 차이는 동시 접근입니다. 사양은 pooling을 "여러 initiator가 한 device의 같은 물리 메모리에 접근하지만 접근을 공유하지는 않는 것", sharing을 "동시에 공유하는 것"으로 구분합니다.

## Linux PCI TSM — 연결과 bind의 관찰 경계

Linux v7.0 ABI에 따르면 `tsm/` directory는 physical function이 CMA-SPDM 인증과 TDISP를 지원하고 platform TSM driver가 secure operation을 받아들였을 때만 나타나며, driver가 load된 뒤 동적으로 생깁니다. 그래서 ABI는 `/sys/class/tsm/tsm0`이 나타난 뒤에야 "`tsm/`이 없는 device는 앞으로도 없다"고 판단할 수 있다고 적습니다.

다음은 지원 platform에서 **읽을 항목의 예**이며 이 작업에서 실행한 출력이 아닙니다. `tsm0`·BDF는 실제 값으로 확인해야 합니다.

```bash
ls /sys/class/tsm/
ls /sys/bus/pci/devices/0000:5e:00.0/tsm/
cat /sys/bus/pci/devices/0000:5e:00.0/tsm/connect
cat /sys/bus/pci/devices/0000:5e:00.0/tsm/bound
```

ABI상 `tsm/connect`에 TSM 이름을 쓰면 device와 연결을 맺습니다. ABI는 이 동작이 "보통 PCIe DOE 위의 SPDM session을 포함하고 PCIe IDE 수립도 포함할 수 있다"고 적습니다. `tsm/disconnect`에 같은 이름을 쓰면 연결을 해체합니다. 둘 다 읽기가 아니라 상태를 바꾸는 동작입니다. 이 글에서는 실제 장치 연결·해제를 실행하지 않았습니다.

| 관찰 | ABI의 의미 | 확대하면 안 되는 결론 |
|------|------|------|
| TSM class device | platform TSM의 존재·준비 상태 확인 출발점 | 모든 endpoint가 지원됨 |
| `tsm/` directory | 조건을 만족한 기능에 interface 제공 | TVM 할당·RUN 성공 |
| connect 이름 | 연결한 TSM 식별, 미연결이면 빈 값 | 측정 reference 정책도 자동 수락 |
| bound 이름 | connect·bind 성공 뒤 LOCKED·RUN·ERROR 상태에서 채워짐 | ERROR가 아니거나 workload가 정상 |
| 해제 완료 | platform 연결 해제 절차의 관찰 | 모든 TSP memory·key 정리가 동일하게 끝남 |

이 절은 Linux v7.0 ABI 문서와 CXL 3.1 TSP 규격을 비교한 것이며, 어느 platform TSM driver가 upstream에 있는지 목록을 만든 것은 아닙니다.

## Type3를 신뢰 경계에 넣을 때 남길 실패 증거

TDISP의 interface lifecycle과 TSP의 target 상태(CONFIG_UNLOCKED·CONFIG_LOCKED·ERROR)는 서로 다른 상태 machine입니다. 아래는 **실행하지 않은 시험 계획**이며, 각 행의 기대 동작은 위 §11.5.4.8 상태 정의에서 옮겼습니다.

| 시점 | 확인할 실패 조건 | 필요한 결과 자료 |
|------|------|------|
| 인증·설정 전 | 금지 credential·reference·topology | 정책 version·정확한 거부 이유 |
| Lock·할당 중 | 부분 설정·timeout·재시도 | 양 끝 상태·설정·소유권 |
| 운용 중 | Transport Security failure·reset | 새 TEE 접근 거부·기존 데이터 보호 |
| ERROR 이후 | session·TVM 데이터 정리 지연 | 실제 cleanup 완료 전 재사용 거부 |
| 재할당 전 | 이전 tenant의 data/key 잔류 | 정리·소유권 이전·새 정책 증거 |

CXL 3.1 §11.5.4.8은 ERROR 상태의 target이 모든 TVM data를 계속 보호하고 새 TEE memory transaction을 받지 않다가, 현재 secure session과 data를 정리한 뒤 스스로 CONFIG_UNLOCKED로 돌아간다고 정합니다. ERROR 전에 받은 transaction은 정상 처리해도 됩니다. 같은 절은 CONFIG_LOCKED에서 ERROR로 가는 원인으로 Transport Security 실패(CXL IDE가 insecure가 되는 경우 등)와 device 전체를 reset하지 않는 CXL Reset을 듭니다. 또 TSP는 host가 모든 configuration policy를 소유하는 single authority model을 가정합니다.

## TSP의 위협 모델

CXL 3.1 §11.5.3.3(Table 11-19)이 꼽는 위협과 대응 중 일부입니다. 표에는 이 밖에 TEE가 허가되지 않은 non-TEE data를 읽고 쓰는 경우, 다른 host의 TEE 자원 접근, 한 port의 target이 다른 port로 요청을 보내는 경우도 있습니다.

| 위협 | 대응 |
|---|------|
| 프로토콜 비밀 추출 | CXL IDE 같은 transport security, TSP 메모리 암호화(initiator·target 기반), SPDM 인증 |
| 정상 initiator·target으로 위장 | SPDM 상호 인증, 물리 공격 방지 |
| 중간에 끼어 조작 | SPDM 인증, CXL IDE |
| 관찰한 패킷에서 정보 추출(side channel) | 평문으로 보내는 주소 bit 최소화, CXL IDE |
| 데이터·요청 삽입·변조·삭제·재전송 | CXL IDE |
| non-TEE가 TEE 데이터 읽기·쓰기 | TSP TE State 검사로 접근 제어 |
| 한 TEE가 다른 TEE 데이터 접근 | 접근 허용 범위 설정, TSP 메모리 암호화 |

## 자주 하는 실수

### "TDISP는 CXL 표준이다"

TDISP는 PCI-SIG 표준입니다. CXL 쪽 대응물이 TSP이고, 둘은 보완 관계입니다.

### "TSP는 multi-host fabric 보안"

CXL 3.1 TSP는 switch·PBR·memory sharing을 *범위에서 뺍니다*. 직접 연결된 Type 3 메모리용입니다(§11.5.2).

### "TSP만 켜면 side channel도 막힌다"

TSP 위협 모델의 side channel 대응은 *관찰한 패킷*에 대한 것(평문으로 보내는 주소 bit를 최소화, 가능하면 0, 그리고 IDE)입니다. 부적절한 device 구현으로 생기는 노출은 IDE 보안 모델의 범위 밖입니다(§11.1). [Ch 7 (Side-channel)](/blog/embedded/embedded-security/chapter07-side-channel)의 위협은 별도로 다뤄야 합니다.

### "TDISP가 IDE를 대체"

*보완 관계*입니다. TDISP는 *디바이스 인터페이스 lock·attach*, IDE는 *링크 트래픽 보호*입니다. 위 Linux ABI도 connect 단계에 SPDM session과 IDE 수립을 묶고, bind는 그 뒤 VFIO/IOMMUFD가 따로 시작합니다.

## 정리

- *TDISP*는 PCI-SIG 표준으로 *PCIe 디바이스 인터페이스를 TVM에 attach*합니다. CXL 메모리 쪽은 CXL 3.1 *TSP*가 보완합니다.
- Linux v7.0 ABI는 TDISP의 LOCKED·RUN·ERROR를 operational state로 봅니다. TSP target 상태는 CONFIG_UNLOCKED → CONFIG_LOCKED (+ ERROR)이고, ERROR는 정리를 마치면 CONFIG_UNLOCKED로 돌아갑니다.
- CXL 3.1 TSP는 직접 연결 Type 3 메모리(LD·SLD·MH-SLD)만 다루고 switch·MLD·PBR·68B flit·sharing은 범위 밖입니다. Pooling은 범위 안입니다.
- Linux PCI TSM의 connect·bound 의미와 실제 TDISP 운용·CXL TSP 지원을 구분합니다. Bound 이름만으로 RUN 성공을 판단하지 않습니다.
- TSP 위협 모델의 대응은 SPDM 인증, CXL IDE, TSP 메모리 암호화·TE State 접근 제어입니다.

## 시리즈 마무리

이 장은 CPU 격리·장치 인증·링크 보호·device lifecycle의 서로 다른 증거를 연결합니다. 이 설명만으로 Confidential Computing 전체 스택을 구현·검증한 것은 아닙니다. 실제 TVM·device·SPDM·IDE·TSP reset/cleanup 시험은 수행하지 않았습니다.

다음 깊이는 *기존 다른 시리즈*에 *분산 추가*된 챕터로 이어집니다:

- 운영 디버깅: [Embedded Debugging Ch 9: CXL 디바이스 트러블슈팅](/blog/tools/debugging/embedded/chapter09-cxl-device-troubleshoot)
- 펌웨어·드라이버: [Modern Embedded Recipes Ch 152: Linux CXL 드라이버 분석](/blog/embedded/modern-recipes/part11-17-linux-cxl-driver)
- 부팅 통합: [Bootloader Internals Ch 35: EFI·UEFI에서 CXL 초기화](/blog/embedded/bootloader/chapter35-uefi-cxl-init)

## 관련 항목

- [Ch 1: 임베디드 보안 위협 모델](/blog/embedded/embedded-security/chapter01-threat-model)
- [Ch 5: OP-TEE — 호출과 저장소 경계](/blog/embedded/embedded-security/chapter05-tee)
- [Ch 11: PCIe·CXL IDE 분석](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)
- [Ch 12: SPDM과 CMA 인증 흐름](/blog/embedded/embedded-security/chapter12-spdm-cma)
- [CXL Ch14: security — IDE·TSP 상세 경계](/blog/embedded/hardware/cxl/chapter14-security)
- [Confidential Computing Consortium](https://confidentialcomputing.io/)
