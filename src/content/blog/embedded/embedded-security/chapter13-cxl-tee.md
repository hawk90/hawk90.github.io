---
title: "CXL TEE 확장 — Trusted Execution을 메모리 디바이스까지"
date: 2026-06-17T09:03:00
description: "TDISP·TVM·CXL TEE — Confidential Computing이 메모리 디바이스·가속기로 확장되는 표준 흐름."
series: "Embedded Security"
seriesOrder: 13
tags: [cxl, tdisp, confidential-computing, arm-cca, sev-tio, tvm]
draft: false
---

## 한 줄 요약

> **"CPU 안의 Secure World·암호화된 링크·인증된 디바이스 — 이 셋이 합쳐져 *디바이스 메모리도 hypervisor가 못 보는* Confidential Computing 영역이 됩니다."** — *TDISP (TEE Device Interface Security Protocol)*가 *디바이스를 TVM에 안전하게 attach*하는 표준을 정의합니다. *AMD SEV-TIO·Intel TDX Connect·ARM CCA*가 *각자의 confidential compute 메커니즘*에 *TDISP를 통합*합니다.

[Ch 5 (TEE)](/blog/embedded/embedded-security/chapter05-tee)는 *CPU 안 Secure World*. [Ch 11 (IDE)](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)은 *링크 암호화*. [Ch 12 (SPDM)](/blog/embedded/embedded-security/chapter12-spdm-cma)은 *디바이스 인증*. 이 셋이 *Confidential Computing*에서 *어떻게 합쳐지는지*를 본 마지막 장입니다.

## 왜 CXL TEE가 필요한가

Confidential Computing은 *클라우드에서 호스트(hypervisor 포함) 자체를 신뢰하지 않는* 모델입니다. 그런데 GPU·CXL.mem 같은 *가속기·메모리 디바이스*는 *전통적으로 hypervisor가 매개*합니다. 이게 *Confidential VM의 마지막 약점*입니다.

| 위협 | 기존 TEE의 방어 | 가속기·메모리 약점 |
|------|---------------|------------------|
| CPU 메모리 sniffing | SEV-SNP·TDX·CCA 메모리 암호화 | GPU HBM·CXL.mem은 평문 |
| Hypervisor 코드 변조 | guest 코드 attestation | 가속기 호출은 hypervisor 경유 |
| Cross-tenant 도용 | guest 격리 | 같은 GPU 공유하는 다른 VM이 device memory 봄 |

CXL TEE (TDISP)는 *이 약점*을 *메모리 디바이스까지 확장*해 해결합니다.

## TDISP — 표준

*TDISP (TEE Device Interface Security Protocol)*는 PCI-SIG·CXL Consortium·CCC(Confidential Computing Consortium)가 *공동 정의*한 표준입니다.

| 항목 | 값 |
|------|----|
| 정의 | PCI-SIG ECN + CXL Consortium ECN |
| 첫 ECN | 2023 |
| 적용 | PCIe·CXL 디바이스 모두 |
| 필수 의존 | SPDM (Ch 12), IDE (Ch 11) |

TDISP의 핵심: *디바이스를 한 TVM (Trusted VM)에 lock해 다른 VM·hypervisor가 못 건드리게* 합니다.

## TVM — Trusted Virtual Machine

각 CPU 벤더의 confidential compute 메커니즘:

| CPU 벤더 | TVM 구현 | 메모리 보호 |
|---------|---------|------------|
| AMD | SEV-SNP | 메모리 암호화 + RMP (Reverse Map Table) |
| Intel | TDX | TD private memory (encrypted, integrity protected) |
| ARM | CCA | Realm — RMM (Realm Management Monitor)이 관리 |

이 셋이 TVM의 *세 가지 구현*입니다. TDISP는 *어느 구현에도 통합*되도록 설계됐습니다.

## TDISP 상태 머신

디바이스는 TDISP의 4가지 상태로 lifecycle:

| 상태 | 의미 | 진입 조건 |
|------|------|----------|
| UNLOCKED | 기본 상태. 누구나 접근 가능 | 초기·해제 후 |
| CONFIG_LOCKED | 설정 잠김. 변경 불가하지만 사용 가능 | TDI lock 명령 |
| RUN | TVM에 attach되어 동작 중 | START_INTERFACE_REQUEST |
| ERROR | 에러 발생, 격리 | violation 감지 |

상태 전이는 *out-of-band 컨트롤*로 trigger되며, *각 전이마다 SPDM 검증* 또는 *firmware attestation*이 필요합니다.

## MMIO·DMA 격리

TDISP가 *TVM에 attach된 디바이스*가 동작할 때:

| 자원 | 누가 접근 가능 | 메커니즘 |
|------|--------------|---------|
| 디바이스 MMIO BAR | TVM만 | IOMMU + memory encryption |
| 디바이스가 발생시킨 DMA | TVM 메모리만 | IOMMU translation table을 TVM 소유 |
| 디바이스 메모리 (CXL.mem) | TVM만 | IDE 암호화 + device-side access control |
| Hypervisor의 접근 시도 | *block* | RMP/EPT가 *NRP (Not Reflected Page)*로 표시 |

*핵심*은 *hypervisor가 attach 후에는 device·메모리·DMA에 어떤 접근도 못 한다*는 점. *device 측도 자기 메모리 접근에 access control* 적용.

## AMD SEV-TIO

*SEV-TIO (Trusted I/O)*는 AMD의 *SEV-SNP에 TDISP 통합*입니다.

| 컴포넌트 | 역할 |
|---------|------|
| AMD-SP (Secure Processor) | SPDM authentication, key derivation |
| RMP (Reverse Map Table) | physical page → owner 매핑 |
| IOMMU v3 | DMA translation, TIO-aware |
| ASP firmware | TDISP state machine 관리 |

*NVIDIA H100·Blackwell GPU*가 *AMD EPYC SEV-SNP 호스트*에서 *Confidential Computing 모드*로 동작하는 사례가 *Hopper H200부터 본격*입니다.

## Intel TDX Connect

*TDX Connect*는 Intel의 *TDX에 TDISP 통합*입니다.

| 컴포넌트 | 역할 |
|---------|------|
| Intel TDX module | TD memory 관리 |
| Intel TDX Connect | TDISP 인터페이스 |
| VT-d (IOMMU) | DMA translation, TDX-aware |
| TDX EAS (Enable, Authenticate, Start) | TDISP state 관리 |

Intel Granite Rapids·Sierra Forest에서 *2025+ 본격 도입*. CXL.mem·NVIDIA GPU와의 *cross-vendor confidential computing*이 가능해집니다.

## ARM CCA의 CXL 통합

*ARM Confidential Compute Architecture*는 *Realm Memory*를 핵심으로 합니다.

| 컴포넌트 | 역할 |
|---------|------|
| Realm | 격리된 컨테이너 (Realm Memory) |
| RMM (Realm Management Monitor) | EL2 monitor, Realm lifecycle 관리 |
| GPT (Granule Protection Table) | physical 메모리 boundary 강제 |
| EL3 monitor | RMM과 normal world 간 mediation |

*Realm이 CXL device를 attach*하면 *device의 memory가 Realm Memory처럼 보호*. 모바일·임베디드 SoC도 *ARM CCA 기반 confidential compute에 CXL device 통합*이 가능합니다.

## 실 운영 흐름 — KVM 예

Linux KVM에서 *TDX guest + CXL.mem device* 시작:

```bash
# 1. TDX guest 시작 (qemu-kvm-tdx)
$ qemu-system-x86_64 \
    -machine q35,kernel-irqchip=split,confidential-guest-support=tdx0 \
    -object tdx-guest,id=tdx0 \
    -m 16G \
    ...

# 2. CXL device attach 요청
$ echo "0000:5e:00.0" > /sys/kernel/tdx/attach_devices

# 3. TDISP 상태 확인
$ cat /sys/bus/pci/devices/0000:5e:00.0/tdisp_state
RUN  # TVM에 attach 완료

# 4. Guest 안에서 attestation 확인
guest$ tdx-attest --verify-device=0000:5e:00.0
device_id: 1e98:0000
manufacturer: Samsung
firmware_hash: sha256:abc... (matches RIM)
status: AUTHENTICATED
```

Guest exit 시:

```bash
$ echo "0000:5e:00.0" > /sys/kernel/tdx/detach_devices
# → TDISP state: UNLOCKED, device memory 자동 wipe
```

## 위협 모델 정리

CXL TEE는 *다음을 모두 적*으로 가정합니다:

| 적 | 가정 |
|---|------|
| Cloud operator | 물리 접근 가능, BIOS·hypervisor 제어 |
| Hypervisor | guest를 매개하지만 *guest 안 들여다보기 시도* |
| Co-tenant | 같은 host의 다른 VM이 도용 시도 |
| 디바이스 firmware | (한정적 신뢰) — measurement로 검증 |
| 네트워크 attacker | 링크 sniffing·MITM |

이 위협 모델에서 *guest VM 안*만 신뢰 영역. *나머지 모두 untrusted*. 그 안에서 *CPU + 디바이스 메모리·계산을 모두 사용 가능*하게 만드는 게 CXL TEE의 목표.

## 자주 하는 실수

### "CXL TEE만 켜면 운영자 위협 0"

*Side-channel 공격*은 여전히 가능합니다. *power·timing·EM* 채널을 통한 측면 누수는 CXL TEE 영역 밖. [Ch 7 (Side-channel)](/blog/embedded/embedded-security/chapter07-side-channel)의 *기존 위협*은 그대로 남습니다.

### "Confidential Computing이 모든 워크로드에 필요"

*overhead가 큽니다*. 메모리 암호화·attestation·IOMMU translation 모두 *10~20% 성능 비용*. *민감한 데이터 워크로드만* 적용. 일반 워크로드는 *기존 VM*으로 충분.

### "한 번 attach하면 영구"

*틀렸습니다*. Hot-plug·hot-remove에 대응해야 하고, *TVM 종료 시 자동 detach + memory wipe*. *Operational lifecycle*이 *기존 PCIe 디바이스보다 복잡*.

### "AMD SEV-TIO와 Intel TDX Connect는 호환"

*프로토콜은 호환되지만 실제 운영은 별개*. *guest 측 driver*가 *벤더별로 다름*. *cross-vendor migration은 현재 불가*.

### "TDISP가 IDE를 대체"

*완전 보완 관계*입니다. TDISP는 *디바이스 lock·attach*, IDE는 *링크 트래픽 암호화*. *둘 다 활성*해야 confidential.

## 정리

- *TDISP*는 PCI-SIG·CXL·CCC 공동 표준으로 *디바이스를 TVM에 안전 attach*하는 메커니즘입니다.
- *AMD SEV-TIO, Intel TDX Connect, ARM CCA의 Realm + CXL*이 *벤더별 구현*. TDISP는 *벤더 무관*하게 동작.
- *TDISP 상태 머신*은 UNLOCKED → CONFIG_LOCKED → RUN → ERROR. 전이마다 *SPDM·attestation 검증*.
- *MMIO·DMA·device memory*가 *TVM만 접근 가능*. *hypervisor가 attach 후 완전 격리*.
- *위협 모델*은 *cloud operator·hypervisor·co-tenant·firmware·network*를 모두 적으로 가정.
- *Side-channel 공격은 별개 위협*. CXL TEE만으로 *모든 보안 완성 아님*.

## 시리즈 마무리

이 장으로 *Embedded Security 시리즈가 CPU 안(TEE) → 디바이스 인증(SPDM) → 링크 암호화(IDE) → 메모리 디바이스 격리(TDISP)까지* *Confidential Computing 전체 스택*을 *흐름으로 완성*했습니다.

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
