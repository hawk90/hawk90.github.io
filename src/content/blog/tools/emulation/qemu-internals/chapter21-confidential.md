---
title: "Ch 21: Confidential Computing"
date: 2026-05-17T21:00:00
description: "SEV·SEV-SNP·TDX — secure VM 기반."
tags: [QEMU, sev, tdx, confidential-computing, cca]
series: "QEMU Internals"
seriesOrder: 21
draft: true
---

**Confidential Computing**은 *cloud의 새로운 보안 모델*입니다. 기존의 *hypervisor를 신뢰*하는 모델을 넘어, *hypervisor도 guest의 메모리·상태를 볼 수 없게* 합니다. AMD **SEV** 시리즈·Intel **TDX**·ARM **CCA**가 그 표준 — QEMU가 이 모든 platform을 지원합니다.

## 위협 모델 변화

기존 cloud VM의 *신뢰 구조*.

```text
[ Trusted ]
- Guest OS
- Hardware

[ Trusted but potentially compromised ]
- Hypervisor / VMM
- Host OS
- Cloud provider's admin
```

CSP(cloud service provider) 직원·hypervisor 버그·host root이 guest 데이터를 *볼 수 있는* 모델.

**Confidential VM**의 신뢰 구조.

```text
[ Trusted ]
- Guest OS
- CPU + memory controller (HW)

[ Not trusted ]
- Hypervisor / VMM
- Host OS
- Cloud provider
```

CPU가 *guest memory를 암호화*해 hypervisor가 못 보게 함. *legal·regulated workload*(금융·의료)에 가능성.

## AMD SEV (Secure Encrypted Virtualization)

EPYC 1세대(2017)부터.

| 단계 | 의미 |
|------|------|
| **SEV** | guest memory를 *guest-specific key*로 암호화 |
| **SEV-ES** | + register state 암호화 |
| **SEV-SNP** | + memory integrity 보장 (replay 공격 방지) |

```bash
qemu-system-x86_64 -enable-kvm \
    -object sev-guest,id=sev0,policy=0x3 \
    -machine memory-encryption=sev0 \
    -kernel vmlinux ...
```

`policy=0x3`이 *NO_DBG + NO_KS*. guest debug·key share 금지.

## SEV-SNP — production confidential

```bash
-object sev-snp-guest,id=snp0,policy=0x30000 \
-machine memory-encryption=snp0
```

SEV-SNP는 *attestation*도 표준화. guest가 *AMD-signed report*로 *자기 환경 증명*. 외부 verifier(client)가 *trust 결정*.

## Intel TDX (Trust Domain Extensions)

Intel의 동등한 기술. Sapphire Rapids(2023)부터.

```bash
qemu-system-x86_64 -enable-kvm \
    -object tdx-guest,id=td0 \
    -machine confidential-guest-support=td0,kernel-irqchip=split \
    -kernel vmlinux ...
```

TDX는 *TD module*이라는 *Intel firmware*가 *kernel과 hypervisor 사이*에 위치해 보안 boundary 강제.

## ARM CCA (Confidential Compute Architecture)

ARMv9 도입. *Realm*이라는 새 world.

```text
EL3: Secure Monitor (root)
EL2: 4-world model
  - Normal world (기존 OS)
  - Secure world (TrustZone)
  - Realm (CCA confidential)
  - Root
```

Realm은 *hypervisor와 분리* — RMM(Realm Management Monitor)이 격리.

## QEMU의 confidential-guest framework

`hw/i386/sev.c`·`hw/i386/tdx.c`·`hw/arm/cca.c` 등이 *platform-specific*. 공통 abstraction:

```c
struct ConfidentialGuestSupport {
    Object parent;
    /* ... */
    bool (*kvm_init)(...);
    bool (*launch_finish)(...);
};
```

QEMU의 *machine init flow*에서 *encryption setup*을 호출.

## Memory encryption 흐름

```text
QEMU       → allocate guest memory (host RAM)
KVM        → page register to TDX/SEV
TDX/SEV HW → encrypt page with guest key
Guest CPU  → page를 보면 자동 decrypt (guest's view)
Hypervisor → 같은 page를 보면 *encrypted bytes*
```

guest 입장에서는 *그냥 plaintext memory*. hypervisor·host process는 *random bytes*만 봄.

## Attestation

confidential VM의 *증명서*. guest가 *자기 환경*을 *외부에 증명*.

```text
1. Guest가 "내 환경" hash 생성 (kernel·init·OS image)
2. CPU가 그 hash를 *signed report*로 wrap
3. Guest가 report를 *verifier*에 전송
4. Verifier가 *AMD/Intel public key*로 검증
5. Verifier가 *trust 여부* 결정 (예: 회사 KMS key release)
```

이 흐름이 *cloud KMS·CDN secret*의 *조건부 noaccess* 메커니즘.

## QEMU 측 attestation 노출

```text
(qemu) info sev
SEV: enabled
SEV-SNP: enabled
Build ID: ...
API ver: ...
guest measurement: <hash>
```

이 measurement를 cloud orchestrator가 verifier에 forward.

## VirtIO + confidential

guest는 *VirtIO ring을 hypervisor와 공유*. 이게 *trust boundary 위반*?

해법: ring은 *guest의 plaintext* 영역에. hypervisor가 *그 영역만* 볼 수 있고 *guest 다른 메모리*는 못 봄. swiotlb 같은 bounce buffer.

```text
Guest memory:
  [encrypted ... GB] ← hypervisor 못 봄
  [plaintext shared ... MB] ← VirtIO ring, bounce buffer
```

guest driver가 *swiotlb*를 통해 bounce. performance overhead 있지만 *보안 확보*.

## Live migration 제한

기본은 migration 불가 — destination이 *guest key* 모름. 해결책:

- **SEV-SNP에 migration 추가** (proposed)
- **encrypted state transfer with new key** — pre-shared

production에서는 *current generation*에서 migration *비활성*이 보통.

## 사용 사례

| 도메인 | 이유 |
|--------|------|
| Healthcare | HIPAA — patient data가 *cloud admin에게도 비공개* |
| Finance | trading algorithm·portfolio data 보호 |
| Government | classified workload on commercial cloud |
| ML inference | model weights 보호 (model marketplace) |
| Cross-org collaboration | mutual distrust 환경 |

## Performance overhead

| Workload | overhead |
|----------|----------|
| CPU-intensive | ~3~5% (encryption은 HW이지만 page management 추가) |
| Memory-intensive | 5~15% (cache miss 비용 증가) |
| I/O intensive | 10~25% (bounce buffer) |
| Network | similar |

*"보안 == 성능 비용"*의 단단한 trade-off. 그 비용을 *justify*하는 workload에서만.

## SEV vs TDX 비교

| 측면 | SEV-SNP | TDX |
|------|---------|-----|
| Vendor | AMD | Intel |
| 보호 단위 | per-VM key | per-TD key |
| Attestation | AMD signed | Intel signed |
| Memory integrity | RMP table | TDX module |
| 가용성 | EPYC 3rd gen+ | Sapphire Rapids+ |
| Linux 지원 | mature | 진화 중 |

cloud provider별 *선호*가 갈림 — AWS는 *SEV-SNP*, Azure는 *TDX + SEV-SNP*, GCP는 *AMD SEV*.

## QEMU 빌드

```bash
./configure --enable-kvm --target-list=x86_64-softmmu
# SEV는 default 활성, TDX는 일부 patch 필요
```

production은 *vendor BSP*(Red Hat·SUSE·Canonical)의 QEMU 사용 권장. mainline은 *feature 변동* 큼.

## RMM·CCA on ARM

ARMv9 Cortex-X4·X5와 Neoverse가 지원. AWS Graviton 4 등이 채택 시 cloud에 도입 시작.

```bash
qemu-system-aarch64 -M virt,virtualization=on,confidential-guest-support=rmm0 \
    -object rmm-guest,id=rmm0 \
    -kernel Image ...
```

QEMU의 ARM CCA 지원은 *현재 진행 중*. mainline 도착 임박.

## 흔한 함정

- **CPU 미지원** — Ryzen은 SEV 미지원, EPYC만. lscpu로 *cpuid flags* 확인.
- **kernel patch 누락** — TDX는 host kernel 6.5+ 권장.
- **SMM/BIOS 의존** — confidential VM은 *최소 firmware*. OVMF 사용 시 *Linux only*.
- **performance assume** — bouncer buffer로 *예상 외 슬로우*. workload-specific 측정.

## 정리

- **Confidential Computing**으로 *hypervisor도 guest 메모리를 못 봄*. cloud의 새 보안 모델.
- AMD **SEV → SEV-ES → SEV-SNP**, Intel **TDX**, ARM **CCA**.
- QEMU의 `-object sev-guest,...` 같은 confidential-guest-support framework.
- **Memory encryption**: HW가 guest-specific key로. hypervisor는 encrypted bytes만.
- **Attestation**으로 guest가 자기 환경 증명. cloud KMS 통합.
- VirtIO ring은 *plaintext shared* region. bounce buffer 사용.
- Overhead: CPU 3~5%, memory 5~15%, I/O 10~25%.
- Live migration *제한적*. encrypted state transfer 진화 중.

## 다음 장 예고

마지막 장은 *데이터 보호의 다른 측면* — **snapshot vs live migration**의 메커니즘 비교.

## 관련 항목

- [Ch 20: microvm Machine](/blog/tools/emulation/qemu-internals/chapter20-microvm)
- [Ch 22: Snapshot vs Migration](/blog/tools/emulation/qemu-internals/chapter22-snapshot-vs-migration)
- [QEMU Embedded — TrustZone](/blog/tools/emulation/qemu-embedded/chapter16-trustzone)
- [Ch 10: 마이그레이션](/blog/tools/emulation/qemu-internals/chapter10-migration)
