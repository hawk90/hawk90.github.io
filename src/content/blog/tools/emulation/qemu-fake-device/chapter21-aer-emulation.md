---
title: "Ch 21: PCIe AER 에뮬레이션"
date: 2026-05-17T21:00:00
description: "Correctable·uncorrectable·fatal — Advanced Error Reporting 주입."
tags: [QEMU, pcie-aer, error-injection, ras]
series: "QEMU Fake Device Driver"
seriesOrder: 21
draft: true
---

**AER**(Advanced Error Reporting)은 PCIe spec의 *표준 error reporting 메커니즘*입니다. correctable/uncorrectable/fatal error를 *device가 host에 알리는* path. cloud·datacenter의 *RAS*(Reliability·Availability·Serviceability)에 핵심이고, driver의 *error path*가 *실제 동작*하는지 검증하려면 AER injection이 필수.

## AER이란

PCIe spec §6.2의 *capability*. error를 *세 categories*로 분류.

| Category | 의미 | 처리 |
|----------|------|------|
| **Correctable** | 자동 복구 (예: ECC 단일 비트) | log만, 동작 지속 |
| **Uncorrectable non-fatal** | data 손상, link 유지 | driver가 retry·recover |
| **Uncorrectable fatal** | link 손상 | system restart 또는 device disable |

각각 *별도 status register*·*severity mask*·*log*.

## AER register 구조

PCIe extended config space의 *capability list*에.

| Offset | Register |
|--------|----------|
| 0x00 | AER Cap Header |
| 0x04 | Uncorrectable Error Status |
| 0x08 | Uncorrectable Error Mask |
| 0x0C | Uncorrectable Error Severity |
| 0x10 | Correctable Error Status |
| 0x14 | Correctable Error Mask |
| 0x18 | AER Capabilities |
| 0x1C ~ 0x2C | Header Log |

## QEMU 측 — AER 활성

```c
static void my_pci_realize(PCIDevice *pdev, Error **errp) {
    /* ... */

    /* PCIe capability */
    if (pcie_endpoint_cap_init(pdev, 0x80) < 0) {
        error_setg(errp, "pcie_endpoint_cap_init failed");
        return;
    }

    /* AER capability */
    if (pcie_aer_init(pdev, PCI_ERR_VER, 0x100, PCI_ERR_SIZEOF, errp) < 0) {
        return;
    }
}
```

`pcie_aer_init`이 AER capability를 *config space*에 등록.

## Error injection — QEMU API

```c
#include "hw/pci/pcie_aer.h"

PCIEAERMsg msg = {
    .severity = PCI_ERR_ROOT_CMD_FATAL_EN,
    .source_id = pci_requester_id(pdev),
};
pcie_aer_msg(pdev, &msg);
```

또는 QOM property로 *user-controllable injection*.

```c
DEFINE_PROP_INT32("inject_aer", MyDeviceState, inject_aer, 0),
```

QMP에서:

```text
(qemu) qom-set /machine/peripheral-anon/device[0] inject_aer 2
```

## driver — AER handler 등록

```c
static const struct pci_error_handlers my_pci_err_handlers = {
    .error_detected = my_pci_error_detected,
    .mmio_enabled   = my_pci_mmio_enabled,
    .slot_reset     = my_pci_slot_reset,
    .resume         = my_pci_resume,
};

static struct pci_driver my_pci_driver = {
    /* ... */
    .err_handler = &my_pci_err_handlers,
};
```

PCI error가 발생하면 *kernel의 AER core*가 driver의 callback 호출.

## Error sequence

```c
static pci_ers_result_t my_pci_error_detected(struct pci_dev *pdev,
                                                pci_channel_state_t state) {
    struct my_dev *d = pci_get_drvdata(pdev);

    dev_warn(&pdev->dev, "PCI error detected, state=%d\n", state);

    /* 모든 작업 일시 정지 */
    atomic_set(&d->error_state, 1);
    drain_in_flight(d);

    switch (state) {
    case pci_channel_io_normal:
        return PCI_ERS_RESULT_CAN_RECOVER;
    case pci_channel_io_frozen:
        /* link frozen */
        return PCI_ERS_RESULT_NEED_RESET;
    case pci_channel_io_perm_failure:
        return PCI_ERS_RESULT_DISCONNECT;
    }
    return PCI_ERS_RESULT_CAN_RECOVER;
}
```

state에 따라 *recovery 방향* 결정.

## MMIO re-enable

```c
static pci_ers_result_t my_pci_mmio_enabled(struct pci_dev *pdev) {
    /* register 다시 읽을 수 있음 */
    /* device의 status 확인 */
    return PCI_ERS_RESULT_RECOVERED;
}
```

correctable error의 경우 *이 단계*에서 끝.

## Slot reset

```c
static pci_ers_result_t my_pci_slot_reset(struct pci_dev *pdev) {
    /* hardware reset 후 호출 */
    struct my_dev *d = pci_get_drvdata(pdev);

    /* device re-init */
    pci_restore_state(pdev);
    initialize_device(d);

    return PCI_ERS_RESULT_RECOVERED;
}
```

uncorrectable error의 *recovery*. hardware reset 후 driver가 *clean state*로 재시작.

## Resume

```c
static void my_pci_resume(struct pci_dev *pdev) {
    struct my_dev *d = pci_get_drvdata(pdev);
    atomic_set(&d->error_state, 0);
    /* 작업 재개 */
}
```

recovery 성공 후. user-space는 *짧은 hiccup* 후 *정상 동작*으로 인식.

## Error types — Uncorrectable

| Bit | Error |
|-----|-------|
| 4 | Data Link Protocol Error |
| 12 | Poisoned TLP |
| 13 | Flow Control Protocol |
| 14 | Completion Timeout |
| 15 | Completer Abort |
| 16 | Unexpected Completion |
| 17 | Receiver Overflow |
| 18 | Malformed TLP |
| 19 | ECRC Error |
| 20 | Unsupported Request |

real cloud에서 *완료 timeout*과 *Poisoned TLP*가 가장 흔함.

## Correctable

| Bit | Error |
|-----|-------|
| 0 | Receiver Error |
| 6 | Bad TLP |
| 7 | Bad DLLP |
| 8 | Replay Num Rollover |
| 12 | Replay Timer Timeout |

전기적·신호 issues. 자동 retry로 복구.

## Test scenario

```python
# pytest with QMP
@pytest.mark.parametrize("err_type", [
    "uncorrectable-fatal",
    "uncorrectable-non-fatal",
    "correctable",
])
def test_aer_recovery(err_type, qmp):
    qmp.command('qom-set', path=DEVICE,
                property='inject_aer', value=err_to_int(err_type))

    # driver가 error 감지 + recovery 수행해야
    time.sleep(1)
    assert driver_is_functional()
    assert no_user_visible_corruption()
```

각 error type마다 *driver behavior* 검증.

## RAS metric

driver가 *AER event를 count*해 *sysfs*에 노출.

```text
guest$ cat /sys/bus/pci/devices/0000:00:04.0/aer_dev_correctable
TLP : 0
DLLP : 0
Replay Timer : 5     ← 5회 replay
```

`pcieport` driver가 *kernel-side count*. 별도 daemon이 *경고·logging*.

## Production RAS

cloud provider는 *fleet 단위*로 AER count 모니터링.

```text
AER count per host per day:
host01: replay=3 (정상)
host02: replay=120 (cable·connector 불량 의심)
host03: fatal=1 (즉시 isolation)
```

high count host는 *automated dispatch*. *예방 정비*.

## hot-plug + AER

fatal error 시 *device disconnect*. hot-plug remove와 비슷한 path.

```text
1. AER fatal → driver error_detected (perm_failure)
2. PCIe link down
3. PCI core가 device remove
4. user-space에 ENODEV
```

cloud의 *resilient design*은 fatal error 시 *replica로 failover*.

## EDAC + AER

memory error (ECC)와 PCIe error를 *통합 view*로.

```bash
guest$ edac-util
mc0: ce_count=12 (ECC corrections)
pcie0: replay=3
```

datacenter dashboard에서 *RAS overview* 그릴 때.

## 흔한 함정

- **AER 미활성** — `pcie_aer_init` 호출 누락. error injection이 *조용히* 사라짐.
- **handler 안 등록** — `err_handler` 없으면 kernel이 *시스템 panic*.
- **recovery 시 state stale** — slot_reset 후 *모든 state 재설정*. resume에서 *옛 state* 사용 시 fail.
- **production-only test** — QEMU에서 AER 검증하지 않으면 *first deployment에서 발견*.

## 정리

- **AER**은 PCIe의 표준 error reporting. correctable·uncorrectable(non-fatal/fatal) 분류.
- QEMU `pcie_aer_init`로 activation. QOM property로 *injection*.
- Driver의 `pci_error_handlers`: `error_detected`·`mmio_enabled`·`slot_reset`·`resume`.
- Error 발생 시 driver가 *작업 정지·drain·reset·resume* sequence 수행.
- *Uncorrectable*은 *completion timeout*·*poisoned TLP*가 흔함.
- *RAS metric*을 sysfs에 노출, fleet 단위 모니터링.
- *Surprise device disconnect*에 driver가 graceful fail.
- QEMU AER injection으로 *production 사고 전 모든 error path 검증*.

## 다음 장 예고

마지막 장은 *device의 portability* — **cross-architecture** 시뮬레이션.

## 관련 항목

- [Ch 20: Hotplug](/blog/tools/emulation/qemu-fake-device/chapter20-hotplug)
- [Ch 22: Cross-Architecture](/blog/tools/emulation/qemu-fake-device/chapter22-cross-architecture)
- [QEMU Embedded — Fault Injection](/blog/tools/emulation/qemu-embedded/chapter19-fault-injection)
