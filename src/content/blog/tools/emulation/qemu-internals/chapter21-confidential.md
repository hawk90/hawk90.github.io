---
title: "Ch 21: Confidential Computing"
date: 2026-05-17T21:00:00
description: "SEV·SEV-SNP·TDX — secure VM 기반."
tags: [QEMU, sev, tdx, confidential-computing]
series: "QEMU Internals"
seriesOrder: 21
draft: true
---

## 이 챕터의 의도

전통 VM은 hypervisor를 신뢰해야 한다. cloud 운영자가 guest 메모리를 볼 수 있다는 뜻이다. Confidential VM은 hypervisor도 볼 수 없는 메모리와 CPU 상태로 격리된다. AMD SEV-SNP, Intel TDX, ARM CCA가 이를 하드웨어로 보장한다. 2026 cloud의 기본 옵션으로 확산되고 있다.

## 핵심 항목

- ✦ Confidential VM 정의 — guest memory·register state가 *hypervisor도 볼 수 없도록* HW 격리
- ✦ **AMD SEV 시리즈** (Secure Encrypted Virtualization)
  - **SEV** (1st gen, 2016) — guest memory encryption only
  - **SEV-ES** (Encrypted State) — vCPU register도 암호화
  - **SEV-SNP** (Secure Nested Paging) — *integrity 보호*까지, 가장 강함
- ✦ **Intel TDX** (Trust Domain Extensions, 2022~) — SEV-SNP 동등물, SGX보다 큰 단위
- ✦ **ARM CCA** (Confidential Compute Architecture) — Realm Management Monitor, Armv9
- ✦ Encrypted memory — AES-128/256, key는 *CPU 안에만*, hypervisor/host kernel 접근 불가
- ✦ Launch measurement — VM 시작 시 image·firmware의 hash를 hardware가 측정
- ✦ Attestation — *원격 verifier*가 measurement를 검증, *진짜 secure VM*임 확인
- ✦ QEMU 옵션
  - SEV: `-object sev-guest,id=sev0,policy=0x07,cbitpos=51,reduced-phys-bits=1`
  - TDX: `-object tdx-guest,id=tdx0,sept-ve-disable=on,attestation-key-id=...`
- ✦ KVM API — `KVM_MEMORY_ENCRYPT_OP` (SEV), `KVM_TDX_*` (TDX)
- ✦ Boot 흐름
  - QEMU: secure VM 객체 생성 → KVM 등록
  - KVM: HW에 키 등록, image 측정
  - Guest: 정상 부팅, 메모리는 자동 암호화
  - Attest: 원격 verifier에 attestation report 전송
- ✦ Use case
  - **Cloud confidentiality** — AWS Nitro Enclaves, Azure Confidential VM, GCP Confidential Computing
  - **Multi-tenant** — 같은 호스트의 다른 tenant·hypervisor admin이 못 봄
  - **Confidential AI** — NVIDIA H100 Confidential Computing 모드와 결합
  - **Confidential I/O** — TDISP/PCIe IDE로 device pass-through까지 (PCIe Ch 13)
- ✦ Limitation — *측면 채널* 공격 일부 가능, microcode 패치 진행
- ◦ SGX vs TDX — 둘 다 Intel, SGX는 enclave (작은 단위), TDX는 full VM (큰 단위)

## 다이어그램 (4)

1. 전통 VM vs Confidential VM — hypervisor 접근 범위
2. SEV-SNP integrity 보호 — page mapping 위·변조 차단
3. Launch + attestation 흐름 (measurement → report → verifier)
4. SEV / TDX / CCA 비교 매트릭스

## 코드 sketch

```bash
# QEMU SEV-SNP 부팅
qemu-system-x86_64 -enable-kvm -cpu EPYC-v4 -m 4G \
    -machine q35,confidential-guest-support=sev0,memory-encryption=sev0 \
    -object sev-snp-guest,id=sev0,cbitpos=51,reduced-phys-bits=1 \
    -bios OVMF.fd \
    -kernel vmlinuz -initrd initrd

# Intel TDX 부팅 (Sapphire Rapids+)
qemu-system-x86_64 -enable-kvm -cpu host -m 4G \
    -machine q35,confidential-guest-support=tdx0 \
    -object tdx-guest,id=tdx0,sept-ve-disable=on \
    -bios OVMF.fd -kernel vmlinuz
```

```c
/* SEV launch — QEMU 측 (단순화) */
static int sev_launch_start(SevGuest *sev) {
    struct kvm_sev_launch_start start = {
        .policy = sev->policy,
        .handle = sev->handle,
    };
    int ret = sev_ioctl(sev->sev_fd, KVM_SEV_LAUNCH_START, &start, &fw_err);
    if (ret < 0) return ret;
    sev->handle = start.handle;
    return 0;
}

/* Attestation report 받기 */
static int sev_get_attestation(uint8_t *report, size_t *len) {
    struct kvm_sev_attestation_report att = { .len = *len, .uaddr = (uintptr_t)report };
    int ret = sev_ioctl(sev_fd, KVM_SEV_GET_ATTESTATION_REPORT, &att, &fw_err);
    *len = att.len;
    return ret;
}
```

```python
# Attestation verifier (단순화) — AMD KDS / Intel TDX QVL 사용
import sevsnpmeasure
report = recv_attestation_report()
expected = sevsnpmeasure.calc_launch_digest(ovmf=OVMF, kernel=Kernel, initrd=Initrd, cmdline=Cmd)
assert report.measurement == expected, "tampered!"
verify_chain(report.signature)   # AMD root key 검증
print("Confidential VM trustworthy")
```

## 레퍼런스

- AMD SEV-SNP Whitepaper, SEV API spec
- Intel TDX Module Spec, "Intel TDX Architecture"
- ARM CCA — developer.arm.com/architectures/confidential-compute
- QEMU `hw/i386/sev*.c`, `target/i386/sev.c`
- Linux `arch/x86/kvm/svm/sev.c`, `arch/x86/kvm/vmx/tdx.c`
- "AMD Secure Encrypted Virtualization (SEV)" — David Kaplan
- LWN "Confidential computing" 시리즈

## 관련 항목

- [Ch 14: KVM accel](/blog/tools/emulation/qemu-internals/chapter14-kvm-accel)
- [Ch 20: microvm](/blog/tools/emulation/qemu-internals/chapter20-microvm)
- [Ch 22: Snapshot vs migration](/blog/tools/emulation/qemu-internals/chapter22-snapshot-vs-migration)
- [PCIe Ch 13: vIOMMU/S-IOV/VirtIO-PCI/IDE/TDISP](/blog/embedded/hardware/pcie/) — Confidential I/O
