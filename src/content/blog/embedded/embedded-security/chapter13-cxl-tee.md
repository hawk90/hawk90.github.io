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
| **TDISP** | PCI-SIG | PCIe 디바이스 인터페이스(TDI)를 TVM에 lock·attach |
| **TSP** | CXL Consortium (CXL 3.1 §11.5) | 직접 연결된 Type 3 메모리를 TVM 신뢰 경계에 포함. TDISP를 보완 |
| **SPDM** | DMTF DSP0274 | 디바이스 인증·측정·secure session ([Ch 12](/blog/embedded/embedded-security/chapter12-spdm-cma)) |
| **IDE** | PCI-SIG, CXL | 링크 트래픽 보호 ([Ch 11](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)) |

TDISP는 PCI-SIG 표준이고 CXL Consortium이 공동 정의한 것이 아닙니다. CXL 쪽 대응물이 TSP이며, TSP는 IDE·TDISP와 함께 쓸 수 있지만 둘 중 어느 것에도 의존하지 않습니다(CXL 3.1 개정 이력). TSP의 SPDM1.2 이상 authentication·attestation 범위는 **§11.5.2**에 명시되어 있습니다. §11.5.3.2만을 이 요구의 출처로 적지 않습니다.

## TDISP 상태

이 장에서 대조한 [Linux v7.0 PCI sysfs ABI](https://github.com/torvalds/linux/blob/v7.0/Documentation/ABI/testing/sysfs-bus-pci)는 TDISP 운용 상태를 다음처럼 구분합니다. PCIe Base Specification 전체나 최신 kernel 지원을 재검증했다는 뜻은 아닙니다.

| 상태 | 의미 |
|------|------|
| UNLOCKED | 기본 상태. 보안 운용 전 |
| LOCKED | 설정이 잠긴 상태. TVM이 받아들이기 전 단계 |
| RUN | TVM에 attach되어 동작 중 |
| ERROR | 오류 상태 |

`tsm/bound`는 성공적으로 connect·bind한 뒤 LOCKED·RUN·ERROR 상태일 때 TSM 이름이 채워질 수 있습니다. 따라서 이름이 보인다는 사실만으로 RUN·정상 workload 실행을 판정하지 않습니다. Binding 동안 BME·MSE 등 device 설정이 안정적으로 유지되어야 하는 조건도 ABI에 명시되어 있습니다.

## CXL TSP target 상태

CXL 메모리 디바이스(TSP target)의 상태는 TDISP와 다릅니다(CXL 3.1 §11.5.4.8).

| 상태 | 의미 | 전이 |
|------|------|----------|
| CONFIG_UNLOCKED | Conventional Reset 뒤 기본. 보안 설정을 하는 상태. TEE 트랜잭션 불가 | 잠금 성공 → CONFIG_LOCKED |
| CONFIG_LOCKED | 레지스터·CCI 접근 제한, TE State 저장·검사. TEE 트랜잭션 허용 | Transport Security 실패·CXL Reset → ERROR. Conventional Reset → CONFIG_UNLOCKED |
| ERROR | TVM 데이터는 계속 보호, 새 TEE 트랜잭션 거부 | 세션·데이터 정리 후, 또는 Conventional Reset → CONFIG_UNLOCKED |

[CXL3.1 §11.5.2](https://computeexpresslink.org/wp-content/uploads/2024/02/CXL-3.1-Specification.pdf)는 직접 연결 Type3·HDM-H·256B flit을 다룹니다. Switch·switch 뒤 device·PBR·68B flit·HDM-D/HDM-DB·동시 memory sharing은 범위 밖입니다. **Memory pooling은 포함**될 수 있으므로 sharing 제외를 pooling 전체 제외로 바꾸지 않습니다. 여러 initiator가 같은 물리 메모리의 용량을 사용하되 동시에 같은 데이터에 접근하지 않는 구분입니다.

## Linux PCI TSM — 연결과 bind의 관찰 경계

Linux v7.0 ABI의 `tsm/`는 해당 physical function의 인증·interface security와 platform TSM의 수락 조건에 따라 나타납니다. TSM driver가 로드되기 전 directory가 없다는 사실만으로 장치의 최종 지원 여부를 확정하지 않습니다.

다음은 지원 platform에서 **읽을 항목의 예**이며 이 작업에서 실행한 출력이 아닙니다. `tsm0`·BDF는 실제 값으로 확인해야 합니다.

```bash
ls /sys/class/tsm/
ls /sys/bus/pci/devices/0000:5e:00.0/tsm/
cat /sys/bus/pci/devices/0000:5e:00.0/tsm/connect
cat /sys/bus/pci/devices/0000:5e:00.0/tsm/bound
```

ABI상 connect에 TSM 이름을 쓰는 동작은 보안 연결을 수립하며 통상 SPDM over DOE와 필요하면 IDE 설정을 포함합니다. Disconnect는 연결을 해체합니다. 이는 단순 상태 조회와 다른 변경 동작이며 platform·VFIO/IOMMUFD lifecycle에 맞춰 수행합니다. 이 글에서는 실제 장치 연결·해제를 실행하지 않았습니다.

| 관찰 | ABI의 의미 | 확대하면 안 되는 결론 |
|------|------|------|
| TSM class device | platform TSM의 존재·준비 상태 확인 출발점 | 모든 endpoint가 지원됨 |
| `tsm/` directory | 조건을 만족한 기능에 interface 제공 | TVM 할당·RUN 성공 |
| connect 이름 | 연결한 TSM 식별, 미연결이면 빈 값 | 측정 reference 정책도 자동 수락 |
| bound 이름 | LOCKED·RUN·ERROR 운용 상태에서 채워질 수 있음 | ERROR가 아니거나 workload가 정상 |
| 해제 완료 | platform 연결 해제 절차의 관찰 | 모든 TSP memory·key 정리가 동일하게 끝남 |

기존의 v7.3-rc6 유일 구현·TDX/CCA/CXL TSP 코드의 현재 부재 주장은 전체 driver 등록·버전을 독립 대조하지 않은 채 반복하지 않습니다. Linux v7.0 ABI와 CXL3.1 TSP 규격을 비교한 범위이며, 현재 upstream 지원 목록이나 실행 가능 platform 인증표가 아닙니다.

## Type3를 신뢰 경계에 넣을 때 남길 실패 증거

TDISP의 interface lifecycle과 TSP의 memory·TE State·암호화 설정은 같은 상태 machine이 아닙니다. Actual topology·protocol·platform 지원을 먼저 고정하고 아래는 **미실행 시험 계획**으로 남깁니다.

| 시점 | 확인할 실패 조건 | 필요한 결과 자료 |
|------|------|------|
| 인증·설정 전 | 금지 credential·reference·topology | 정책 version·정확한 거부 이유 |
| Lock·할당 중 | 부분 설정·timeout·재시도 | 양 끝 상태·설정·소유권 |
| 운용 중 | Transport Security failure·reset | 새 TEE 접근 거부·기존 데이터 보호 |
| ERROR 이후 | session·TVM 데이터 정리 지연 | 실제 cleanup 완료 전 재사용 거부 |
| 재할당 전 | 이전 tenant의 data/key 잔류 | 정리·소유권 이전·새 정책 증거 |

CXL3.1 §11.5.4.8은 ERROR에서 Primary/Secondary session과 TVM 데이터 정리를 마친 뒤 CONFIG_UNLOCKED로 돌아가는 동작을 규정합니다. 단순 reset 요청·ERROR 표시만으로 정리가 완료됐다고 추정하지 않습니다. Platform TSM·device·FM 자료의 시각·boot/session 식별자도 연결해야 합니다.

## TSP의 위협 모델

CXL 3.1 §11.5.3.3(Table 11-19)이 꼽는 위협과 대응입니다.

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

TSP 위협 모델의 side channel 대응은 *관찰한 패킷*에 대한 것(평문 주소 bit 최소화, IDE)입니다. 디바이스 내부 구현의 취약점은 IDE 보안 모델의 범위 밖입니다(§11.1). [Ch 7 (Side-channel)](/blog/embedded/embedded-security/chapter07-side-channel)의 위협은 별도로 다뤄야 합니다.

### "TDISP가 IDE를 대체"

*보완 관계*입니다. TDISP는 *디바이스 인터페이스 lock·attach*, IDE는 *링크 트래픽 보호*입니다. 위 Linux ABI의 connect는 SPDM session과 IDE 수립을 포함할 수 있으나 실제 경로·성공 조건을 target에서 확인해야 합니다.

## 정리

- *TDISP*는 PCI-SIG 표준으로 *PCIe 디바이스 인터페이스를 TVM에 attach*합니다. CXL 메모리 쪽은 CXL 3.1 *TSP*가 보완합니다.
- TDISP 상태는 UNLOCKED → LOCKED → RUN (+ ERROR), TSP target 상태는 CONFIG_UNLOCKED → CONFIG_LOCKED (+ ERROR)입니다.
- CXL 3.1 TSP는 직접 연결 Type 3 메모리만 다루고 switch·PBR·sharing은 범위 밖입니다.
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
