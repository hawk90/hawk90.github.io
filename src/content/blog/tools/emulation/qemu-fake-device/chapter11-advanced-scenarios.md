---
title: "Ch 11: 고급 시나리오 — 에러 주입, 경쟁 조건"
date: 2026-05-17T11:00:00
description: "에러 주입과 경쟁 조건 테스트로 드라이버 견고성을 검증한다."
tags: [QEMU, Testing, ErrorInjection, race-condition, stress]
series: "QEMU Fake Device Driver"
seriesOrder: 11
draft: true
---

production driver의 *신뢰성*은 *정상 path 동작*만으로 보장되지 않습니다 — *fault·race·stress* 같은 *비정상 시나리오*도 *예측 가능하게* 동작해야 합니다. 이 장은 QEMU 환경에서 *고급 시나리오*를 *결정적*으로 시뮬레이션하는 기법을 정리합니다.

## 시나리오 카테고리

| 시나리오 | 의미 |
|----------|------|
| **Error injection** | timeout·corrupt response·bus error |
| **Race condition** | 동시 작업이 *예상치 못한 ordering* |
| **Stress** | high throughput·burst·long-running |
| **Reset 재진입** | 작업 도중 reset |
| **Resource exhaustion** | 메모리·queue·IRQ 부족 |
| **Hot-plug racing** | add/remove 도중 access |

각자 *production에서 마주칠* 시나리오 — driver가 *graceful*하게 대응해야.

## QOM property로 fault mode

```c
typedef enum {
    FAULT_NONE,
    FAULT_TIMEOUT,
    FAULT_DMA_ERROR,
    FAULT_IRQ_LOSS,
    FAULT_CORRUPT_RESPONSE,
    FAULT_PARTIAL_WRITE,
} FaultMode;

struct MyPCIState {
    /* ... */
    int fault_mode;     /* QOM property */
};

static Property my_pci_properties[] = {
    DEFINE_PROP_INT32("fault_mode", MyPCIState, fault_mode, FAULT_NONE),
    DEFINE_PROP_END_OF_LIST(),
};
```

QMP에서 runtime 변경:

```text
(qemu) qom-set /machine/peripheral-anon/device[0] fault_mode 1
```

## DMA timeout 주입

```c
static void process_dma(MyPCIState *s) {
    if (s->fault_mode == FAULT_TIMEOUT) {
        /* 응답 안 함 — driver의 timeout path 검증 */
        return;
    }
    if (s->fault_mode == FAULT_DMA_ERROR) {
        s->intr_status |= INTR_ERROR;
        msix_notify(&s->parent_obj, ERROR_VEC);
        return;
    }
    /* 정상 처리 */
    /* ... */
}
```

driver 측 timeout handler가 *정상 발동*하는지 시험.

## Corrupt response

```c
if (s->fault_mode == FAULT_CORRUPT_RESPONSE) {
    /* host에 잘못된 data 씀 */
    uint8_t garbage[4096];
    memset(garbage, 0xFF, sizeof(garbage));
    pci_dma_write(&s->parent_obj, s->dst_addr, garbage, s->dma_len);
    s->intr_status |= INTR_DONE;
    msix_notify(...);
}
```

driver가 *checksum 검증* 또는 *retry policy*를 가지는지 확인.

## Partial write

```c
if (s->fault_mode == FAULT_PARTIAL_WRITE) {
    /* 절반만 write */
    pci_dma_write(..., s->dma_len / 2);
    s->intr_status |= INTR_DONE;
}
```

driver가 *반환 length*를 *확인*하는지. 안 그러면 *silent corruption*.

## IRQ loss

```c
if (s->fault_mode == FAULT_IRQ_LOSS) {
    /* DMA 완료 후 IRQ 안 발사 */
    s->intr_status |= INTR_DONE;
    /* msix_notify 안 함 */
}
```

driver의 *polling fallback* 동작 검증. 또는 *watchdog timer*가 작동하는지.

## Race — 동시 IRQ 처리

```c
/* QEMU 측 — burst IRQ */
static void burst_irqs(MyPCIState *s) {
    for (int i = 0; i < 100; i++) {
        s->intr_status |= INTR_DONE;
        msix_notify(&s->parent_obj, i % MSIX_VECTORS);
    }
}
```

driver의 IRQ handler가 *동시 다발 IRQ*에 *re-entrancy* 보장 필요.

## Race — 동시 ioctl

guest test:

```c
/* user-space — 두 thread */
void *thread_func(void *arg) {
    int fd = open("/dev/my0", O_RDWR);
    while (running) {
        ioctl(fd, IOCTL_DMA_XFER, &req);
    }
    return NULL;
}

pthread_create(&t1, NULL, thread_func, NULL);
pthread_create(&t2, NULL, thread_func, NULL);
```

driver가 *동시 ioctl*에 *deadlock*이나 *corruption* 없이 동작해야.

## Reset 도중 작업

```c
/* QEMU 측 — reset이 in-flight 작업을 abort해야 */
static void my_pci_reset(DeviceState *dev) {
    MyPCIState *s = MY_PCI(dev);
    /* in-flight cleanup */
    if (s->bh_pending) {
        qemu_bh_cancel(s->dma_bh);
    }
    /* state clear */
    s->ctrl = 0;
    /* ... */
}
```

driver 측: reset 후 *새 작업 가능*해야. *stale state* 누적 없음.

## Stress — high throughput

```bash
# guest에서
guest$ for i in $(seq 1 100000); do
    ./my_test --no-wait || break
done
```

100K 작업 *연속*. driver의 *memory leak*·*resource exhaustion*·*slow path bug* 발굴.

## Resource exhaustion

```c
/* QEMU 측 — queue full 시뮬레이션 */
static void process_request(MyPCIState *s) {
    if (s->queue_depth >= MAX_QUEUE) {
        s->status |= STATUS_BUSY;
        return;   /* driver는 retry해야 */
    }
    s->queue_depth++;
    /* ... */
}
```

driver의 *backpressure* 처리 검증.

## Hotplug racing

```text
# QMP
(qemu) device_add my-pci-device,id=hotdev
...
(qemu) device_del hotdev
```

driver가 *probe 도중 remove* 시도해도 안전해야. *atomic state*로 보호.

## fuzz-style fault injection

```python
# pytest with hypothesis
from hypothesis import given, strategies as st

@given(fault=st.sampled_from(['none', 'timeout', 'error', 'corrupt', 'irq_loss']))
def test_robust(fault, qmp):
    qmp.command('qom-set', path=DEVICE, property='fault_mode', value=fault)
    rc = run_workload(timeout=10)
    assert rc in (0, EXPECTED_ERR), f"unexpected behavior in mode {fault}"
```

random 조합으로 *예상 외 시나리오* 발굴.

## Migration during DMA

QEMU의 *live migration* 중 DMA 진행:

```text
(qemu) migrate -d tcp:dest:4444
```

source의 in-flight DMA가 *destination에서 재개*하는지. VMState 정확성 검증.

## Coverage measurement

```bash
# 모든 fault mode 순회
for fault in none timeout error corrupt irq_loss; do
    qemu ... -global my-pci-device.fault_mode=$fault &
    ./run-test.sh
done

# gcov로 path coverage 측정
lcov --capture ...
```

각 fault mode가 *driver의 다른 path* 활성화. coverage 비교로 *missing test* 발견.

## Replay — record + replay

```bash
qemu ... -icount shift=0,rr=record,rrfile=record.log
# 작업 수행

qemu ... -icount shift=0,rr=replay,rrfile=record.log
# 같은 시나리오를 *결정적*으로 재현
```

비결정적 bug를 *디버깅 가능 시점*에 stop하는 데.

## 시나리오 라이브러리

흔히 검증할 시나리오를 *체크리스트*로.

| ID | 시나리오 | 검증 |
|----|----------|------|
| S001 | DMA timeout | driver timeout 발동 |
| S002 | DMA error response | error path |
| S003 | IRQ loss | polling fallback 또는 watchdog |
| S004 | Burst 100 IRQ | re-entrancy |
| S005 | 동시 ioctl ×N thread | lock 정확성 |
| S006 | Reset during DMA | in-flight cleanup |
| S007 | Queue full | backpressure |
| S008 | Hotplug during probe | atomic state |
| S009 | Migration during DMA | VMState |
| S010 | Power state change | suspend/resume |

각 시나리오를 *별도 test case*로. CI에 *모두 포함*.

## 흔한 함정

- **fault mode 영구 set** — test 후 cleanup 안 하면 다음 test가 *영향 받음*.
- **race 시나리오의 비결정성** — sleep 의존 race는 *환경에 따라* fail. atomic primitive로 동기.
- **stress test 너무 빠름** — driver의 *cleanup*까지 시간 부여. cool-down period.
- **production code에 fault path leak** — fault hook이 *production 빌드*에 들어가면 안 됨. `#ifdef CONFIG_FAULT_INJECT`.

## 정리

- 정상 path만으론 부족. **fault·race·stress·resource·hotplug** 모두 검증.
- QOM `fault_mode` property로 *runtime fault 주입*. QMP로 trigger.
- **DMA timeout·error·corrupt·partial·IRQ loss**가 흔한 fault.
- 동시 IRQ·ioctl·hotplug로 *race* 시험.
- Stress·resource exhaustion으로 *long-running* path 검증.
- **Migration during operation**으로 VMState 정확성.
- **Record + replay**(`-icount rr=record/replay`)로 비결정적 bug 재현.
- 시나리오 라이브러리(S001~)를 만들어 CI에 *all-or-nothing* 적용.

## 다음 장 예고

다음 장은 *실 device case study* — **NVMe controller** emulation.

## 관련 항목

- [Ch 10: Test Automation](/blog/tools/emulation/qemu-fake-device/chapter10-test-automation)
- [Ch 12: NVMe Case Study](/blog/tools/emulation/qemu-fake-device/chapter12-case-study-nvme)
- [QEMU Embedded — Fault Injection](/blog/tools/emulation/qemu-embedded/chapter19-fault-injection)
