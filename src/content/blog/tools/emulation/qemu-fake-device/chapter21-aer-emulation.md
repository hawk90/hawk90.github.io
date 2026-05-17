---
title: "Ch 21: PCIe AER 에뮬레이션"
date: 2025-09-01T21:00:00
description: "Correctable·uncorrectable·fatal — Advanced Error Reporting 주입."
tags: [QEMU, pcie-aer, error-injection, ras]
series: "QEMU Fake Device Driver"
seriesOrder: 21
draft: true
---

## 이 챕터의 의도

실제 서버는 *uncorrectable PCIe 에러*가 가끔 발생한다 — 시그널 무결성, 노이즈, link retrain 실패 등. Driver가 이걸 *제대로 복구*하는지 검증하려면 *실 HW*가 아닌 *주입* 시뮬레이션이 필요. QEMU AER injection은 RAS (Reliability, Availability, Serviceability) 검증의 표준 도구.

## 핵심 항목

- ✦ PCIe AER (Advanced Error Reporting) Extended Capability — offset 0x0001
- ✦ Error class — **Correctable** (자동 복구, 로깅만), **Non-Fatal** (link 유지, driver intervention 필요), **Fatal** (link 다운, system 영향)
- ✦ Error type
  - Correctable: Receiver Error, Bad TLP, Bad DLLP, REPLAY_NUM Rollover
  - Uncorrectable: Poisoned TLP, ECRC, Malformed TLP, Unsupported Request, Completer Abort
- ✦ **AER capability registers** — Uncorrectable Status / Mask / Severity, Correctable Status / Mask
- ✦ QEMU monitor: `pcie_aer_inject_error` — 디바이스에 직접 error log entry 삽입
- ✦ AER root port reporting — root port가 모은 후 OS에 통보 (MSI or system error)
- ✦ Linux AER handler — `pci_error_handlers` struct (error_detected / mmio_enabled / slot_reset / resume)
- ✦ Recovery flow — error 통보 → driver `error_detected` → link/secondary bus reset → `slot_reset` → `resume`
- ✦ DPC (Downstream Port Containment) — fatal error 시 link 자동 차단, recovery 시간 확보
- ✦ FLR vs Secondary Bus Reset vs Hot Reset — recovery 옵션 비교
- ◦ EEH (Enhanced Error Handling) — POWER 아키텍처 동등물
- ◦ Multi-error storm — masking·rate limit

## 다이어그램 (4)

1. AER capability layout (Uncorrectable Status/Mask/Severity, Correctable, Root Error)
2. Error class flow — correctable → log → continue / uncorrectable → recovery
3. Linux AER handler state machine (`error_detected` → `slot_reset` → `resume`)
4. DPC trigger + recovery 흐름 (DPC capability + link disable)

## 코드 sketch

```c
/* QEMU 측 — AER inject helper */
static void inject_aer_uncorrectable(MyPCIDev *s) {
    PCIDevice *pdev = PCI_DEVICE(s);
    PCIEAERErr err = {
        .status   = PCI_ERR_UNC_POISON_TLP,
        .source   = pci_dev_bdf(pdev),
        .flags    = PCIE_AER_ERR_IS_FIRST,
        .header   = { 0x40000001, 0xdeadbeef, 0x00000000, 0xcafebabe },
    };
    pcie_aer_inject_error(pdev, &err);
}
```

```c
/* Driver 측 — AER recovery callback */
static pci_ers_result_t my_error_detected(struct pci_dev *pdev,
                                          pci_channel_state_t state) {
    struct my_dev *d = pci_get_drvdata(pdev);

    if (state == pci_channel_io_perm_failure)
        return PCI_ERS_RESULT_DISCONNECT;

    /* 새 IO 차단, in-flight 작업 정지 */
    atomic_set(&d->io_stopped, 1);
    drain_requests(d);
    return PCI_ERS_RESULT_NEED_RESET;
}

static pci_ers_result_t my_slot_reset(struct pci_dev *pdev) {
    /* PCI config 복원 — 보통 pci_restore_state */
    pci_restore_state(pdev);
    pci_save_state(pdev);
    return PCI_ERS_RESULT_RECOVERED;
}

static void my_resume(struct pci_dev *pdev) {
    struct my_dev *d = pci_get_drvdata(pdev);
    reinit_hw(d);
    atomic_set(&d->io_stopped, 0);
}

static const struct pci_error_handlers my_err_handler = {
    .error_detected = my_error_detected,
    .slot_reset     = my_slot_reset,
    .resume         = my_resume,
};
```

```bash
# QEMU monitor에서 inject
(qemu) pcie_aer_inject_error my-pcidev 8000 ffff ffff ffff ffff
# guest dmesg
[ ... ] pcieport 0000:00:00.0: AER: Uncorrected (Non-Fatal) error received
[ ... ] my_dev 0000:01:00.0: PCI ERR: error_detected
[ ... ] my_dev 0000:01:00.0: PCI ERR: slot_reset successful
[ ... ] my_dev 0000:01:00.0: PCI ERR: resume
```

## 레퍼런스

- PCIe Base Spec §6.2 (Error Signaling and Logging), §7.10 (AER capability)
- QEMU `hw/pci/pcie_aer.c`, `Documentation/specs/pcie-aer-inject.rst`
- Linux `Documentation/PCI/pcieaer-howto.rst`
- Linux `drivers/pci/pcie/aer.c`
- `aer-inject` kernel module (test도구)

## 관련 항목

- [Ch 20: 핫플러그](/blog/tools/emulation/qemu-fake-device/chapter20-hotplug)
- [Ch 22: 크로스 아키텍처](/blog/tools/emulation/qemu-fake-device/chapter22-cross-architecture)
- [PCIe Ch 7 Error Handling + Ch 14 운영](/blog/embedded/hardware/pcie/)
