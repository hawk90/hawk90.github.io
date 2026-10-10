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

> **"CPU 안의 TEE·암호화된 링크·인증된 디바이스 — 이 셋을 묶어 *디바이스까지 TVM 신뢰 경계 안에 넣는* 것이 목표입니다."** — PCIe 쪽은 PCI-SIG의 *TDISP (TEE Device Interface Security Protocol)*가, CXL 메모리 쪽은 CXL 3.1의 *TSP (TEE Security Protocol)*가 맡습니다. Linux mainline에는 둘을 호스트 TSM(TEE Security Manager)에 연결하는 *PCI TSM 프레임워크*가 있고, 현재 이 프레임워크에 구현을 등록한 것은 AMD SEV-TIO입니다.

[Ch 5 (TEE)](/blog/embedded/embedded-security/chapter05-tee)는 *CPU 안 Secure World*. [Ch 11 (IDE)](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)은 *링크 암호화*. [Ch 12 (SPDM)](/blog/embedded/embedded-security/chapter12-spdm-cma)은 *디바이스 인증*. 이 셋이 *Confidential Computing*에서 *어떻게 합쳐지는지*를 본 마지막 장입니다.

## 왜 디바이스까지 TEE가 필요한가

Confidential Computing은 *클라우드에서 호스트(hypervisor 포함) 자체를 신뢰하지 않는* 모델입니다. 그런데 GPU·CXL.mem 같은 *가속기·메모리 디바이스*는 *전통적으로 hypervisor가 매개*합니다. TVM(Trusted VM)이 디바이스를 쓰려면 그 디바이스와 경로도 신뢰 경계 안에 들어와야 합니다.

## 구성 요소

| 구성 요소 | 정의 주체 | 역할 |
|------|----|----|
| **TDISP** | PCI-SIG (Linux 주석은 PCIe r7.0 §11로 인용) | PCIe 디바이스 인터페이스(TDI)를 TVM에 lock·attach |
| **TSP** | CXL Consortium (CXL 3.1 §11.5) | 직접 연결된 Type 3 메모리를 TVM 신뢰 경계에 포함. TDISP를 보완 |
| **SPDM** | DMTF DSP0274 | 디바이스 인증·측정·secure session ([Ch 12](/blog/embedded/embedded-security/chapter12-spdm-cma)) |
| **IDE** | PCI-SIG, CXL | 링크 트래픽 보호 ([Ch 11](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)) |

TDISP는 PCI-SIG 표준이고 CXL Consortium이 공동 정의한 것이 아닙니다. CXL 쪽 대응물이 TSP이며, TSP는 IDE·TDISP와 함께 쓸 수 있지만 둘 중 어느 것에도 의존하지 않습니다(CXL 3.1 개정 이력). TSP는 SPDM 1.2 이상 연결로 target을 인증·attest합니다(§11.5.3.2).

## TDISP 상태

Linux ABI 문서(`Documentation/ABI/testing/sysfs-bus-pci`)와 `include/linux/pci-tsm.h`가 적는 TDISP 상태는 넷입니다.

| 상태 | 의미 |
|------|------|
| UNLOCKED | 기본 상태. 보안 운용 전 |
| LOCKED | 설정이 잠긴 상태. TVM이 받아들이기 전 단계 |
| RUN | TVM에 attach되어 동작 중 |
| ERROR | 오류 상태 |

상태 변경 요청은 UNLOCKED→LOCKED, LOCKED→RUN 순서로 갑니다(`PCI_TSM_REQ_STATE_CHANGE` 주석). `tsm/bound`는 디바이스가 UNLOCKED가 아닌 상태(LOCKED·RUN·ERROR)일 때 TSM 이름을 돌려줍니다.

## CXL TSP target 상태

CXL 메모리 디바이스(TSP target)의 상태는 TDISP와 다릅니다(CXL 3.1 §11.5.4.8).

| 상태 | 의미 | 전이 |
|------|------|----------|
| CONFIG_UNLOCKED | Conventional Reset 뒤 기본. 보안 설정을 하는 상태. TEE 트랜잭션 불가 | 잠금 성공 → CONFIG_LOCKED |
| CONFIG_LOCKED | 레지스터·CCI 접근 제한, TE State 저장·검사. TEE 트랜잭션 허용 | Transport Security 실패·CXL Reset → ERROR. Conventional Reset → CONFIG_UNLOCKED |
| ERROR | TVM 데이터는 계속 보호, 새 TEE 트랜잭션 거부 | 세션·데이터 정리 후, 또는 Conventional Reset → CONFIG_UNLOCKED |

CXL 3.1 TSP는 host Root Port에 *직접* 연결된 Type 3 디바이스만 다룹니다. switch, switch 뒤 디바이스, PBR, 68B flit, 메모리 sharing은 범위 밖입니다(§11.5.2).

## Linux PCI TSM — 실제 흐름

Linux mainline(v7.3-rc6)의 `drivers/pci/tsm.c`는 PCIe TDISP용 PCI TSM 프레임워크입니다. 플랫폼 TSM 드라이버가 `pci_tsm_ops`를 등록하면, 그 TSM이 인정한 디바이스에 `tsm/` sysfs 디렉터리가 생깁니다.

```bash
# 플랫폼 TSM 장치
$ ls /sys/class/tsm/
tsm0

# 디바이스와 secure session 수립 (SPDM over DOE, 필요하면 IDE까지)
$ echo tsm0 > /sys/bus/pci/devices/0000:5e:00.0/tsm/connect

# 연결된 TSM 확인
$ cat /sys/bus/pci/devices/0000:5e:00.0/tsm/connect

# TDISP 운용 상태(LOCKED·RUN·ERROR)일 때 TSM 이름
$ cat /sys/bus/pci/devices/0000:5e:00.0/tsm/bound
```

TDI를 TVM에 bind하는 동작은 VFIO/IOMMUFD가 시작합니다. 해제는 `tsm/disconnect`에 같은 TSM 이름을 씁니다.

| 위치 | 내용 |
|------|------|
| `drivers/pci/tsm.c`, `include/linux/pci-tsm.h` | PCI TSM 프레임워크. `link_ops`(connect·bind·guest_req)와 `devsec_ops`(lock·unlock) |
| `drivers/crypto/ccp/sev-dev-tsm.c` | AMD SEV-TIO. mainline에서 `pci_tsm_ops`를 등록하는 유일한 구현 |

Intel TDX Connect나 Arm CCA의 host 쪽 디바이스 할당 구현은 v7.3-rc6 mainline에 `pci_tsm_ops`로 들어와 있지 않습니다. 이 프레임워크는 PCIe TDISP용이고, CXL TSP를 다루는 코드는 mainline에 없습니다.

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

*보완 관계*입니다. TDISP는 *디바이스 인터페이스 lock·attach*, IDE는 *링크 트래픽 보호*입니다. Linux의 `tsm/connect`는 SPDM session을 열고 IDE 수립까지 포함할 수 있습니다.

## 정리

- *TDISP*는 PCI-SIG 표준으로 *PCIe 디바이스 인터페이스를 TVM에 attach*합니다. CXL 메모리 쪽은 CXL 3.1 *TSP*가 보완합니다.
- TDISP 상태는 UNLOCKED → LOCKED → RUN (+ ERROR), TSP target 상태는 CONFIG_UNLOCKED → CONFIG_LOCKED (+ ERROR)입니다.
- CXL 3.1 TSP는 직접 연결 Type 3 메모리만 다루고 switch·PBR·sharing은 범위 밖입니다.
- Linux mainline의 PCI TSM 프레임워크는 `tsm/connect`·`tsm/bound` sysfs를 주고, 구현은 현재 AMD SEV-TIO입니다.
- TSP 위협 모델의 대응은 SPDM 인증, CXL IDE, TSP 메모리 암호화·TE State 접근 제어입니다.

## 시리즈 마무리

이 장으로 *Embedded Security 시리즈가 CPU 안(TEE) → 디바이스 인증(SPDM) → 링크 암호화(IDE) → 디바이스 격리(TDISP·TSP)까지* *Confidential Computing 전체 스택*을 *흐름으로 완성*했습니다.

다음 깊이는 *기존 다른 시리즈*에 *분산 추가*된 챕터로 이어집니다:

- 운영 디버깅: [Embedded Debugging Ch 9: CXL 디바이스 트러블슈팅](/blog/tools/debugging/embedded/chapter09-cxl-device-troubleshoot)
- 펌웨어·드라이버: [Modern Embedded Recipes Ch 151: Linux CXL 드라이버 분석](/blog/embedded/modern-recipes/part11-17-linux-cxl-driver)
- 부팅 통합: [Bootloader Internals Ch 35: EFI·UEFI에서 CXL 초기화](/blog/embedded/bootloader/chapter35-uefi-cxl-init)

## 관련 항목

- [Ch 1: 임베디드 보안 위협 모델](/blog/embedded/embedded-security/chapter01-threat-model)
- [Ch 5: TEE 비교 분석 — OP-TEE·ARM CCA·SGX](/blog/embedded/embedded-security/chapter05-tee)
- [Ch 11: PCIe·CXL IDE 분석](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)
- [Ch 12: SPDM과 CMA 인증 흐름](/blog/embedded/embedded-security/chapter12-spdm-cma)
- [HBM·GDDR 심화 Ch 12: 메모리 풀링과 데이터센터 토폴로지](/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric) — 데이터센터에서의 TEE 통합 그림
- [Confidential Computing Consortium](https://confidentialcomputing.io/)
