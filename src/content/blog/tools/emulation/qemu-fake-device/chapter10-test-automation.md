---
title: "Ch 10: 테스트 자동화"
date: 2026-05-17T10:00:00
description: "CI 파이프라인에서 QEMU를 활용해 드라이버 테스트를 자동화한다."
tags: [QEMU, CI, Testing, qtest, pytest, GitHub-Actions]
series: "QEMU Fake Device Driver"
seriesOrder: 10
draft: true
---

driver 개발의 회귀를 *수동*으로 잡으면 시간 낭비. *매 commit마다* QEMU를 띄워 *unit + functional* 시험하는 자동화가 핵심입니다. 이 장은 qtest·pytest·GitHub Actions를 결합한 *production-grade CI*를 정리합니다.

## Test layer

```text
┌────────────────────────┐
│ Functional (end-to-end)│  guest VM에서 driver 시험
├────────────────────────┤
│ Unit (kunit)           │  driver의 *내부 함수* 단위
├────────────────────────┤
│ qtest (QEMU-side)      │  device emulation 검증
└────────────────────────┘
```

각 layer가 *다른 bug class*를 잡음.

## qtest — QEMU device 검증

QEMU의 *built-in testing framework*. `tests/qtest/` 디렉터리.

```c
/* tests/qtest/my-pci-test.c */
#include "qemu/osdep.h"
#include "libqtest.h"

static void test_ident(void) {
    QTestState *qts = qtest_init("-machine pc -nodefaults -device my-pci-device");

    uint32_t bar0 = qtest_readl(qts, 0xfeb00000);   /* assume mapped at this addr */
    g_assert_cmphex(bar0, ==, 0x46414b45);   /* "FAKE" */

    qtest_quit(qts);
}

int main(int argc, char **argv) {
    g_test_init(&argc, &argv, NULL);
    qtest_add_func("/my-pci/ident", test_ident);
    return g_test_run();
}
```

`tests/qtest/meson.build`에 등록.

```text
qtests_x86_64 += ['my-pci-test']
```

```bash
make check-qtest-x86_64
```

QEMU 자체의 *regression test* 일부로 동작.

## pytest — user-space integration

driver의 *user-space API* 검증.

```python
# test/test_driver.py
import os
import struct
import fcntl

IOCTL_DMA_XFER = (0xc0 << 16) | (1 << 8) | ord('M')

def test_dma():
    fd = os.open("/dev/my0", os.O_RDWR)
    arg = struct.pack("QQI", in_addr, out_addr, 4096)
    fcntl.ioctl(fd, IOCTL_DMA_XFER, arg)
    os.close(fd)

def test_invalid_length():
    fd = os.open("/dev/my0", os.O_RDWR)
    arg = struct.pack("QQI", in_addr, out_addr, 0)
    with pytest.raises(OSError):
        fcntl.ioctl(fd, IOCTL_DMA_XFER, arg)
    os.close(fd)
```

```bash
pytest -v test/
```

## kunit — kernel unit test

```c
#include <kunit/test.h>

static void my_pci_checksum_test(struct kunit *test) {
    uint8_t data[] = {0x01, 0x02, 0x03, 0x04};
    KUNIT_EXPECT_EQ(test, my_checksum(data, 4), 0x0a);
}

static struct kunit_case my_pci_test_cases[] = {
    KUNIT_CASE(my_pci_checksum_test),
    {},
};

static struct kunit_suite my_pci_test_suite = {
    .name = "my_pci",
    .test_cases = my_pci_test_cases,
};

kunit_test_suite(my_pci_test_suite);
```

`drivers/misc/my_pci_test.c`로 두고 kernel config 활성.

```bash
./tools/testing/kunit/kunit.py run my_pci
```

driver의 *내부 함수*만 test — device emulation 불필요.

## End-to-end test 흐름

```bash
#!/bin/bash
# scripts/run-test.sh

# 1. QEMU 시작 (background)
qemu-system-x86_64 -enable-kvm -m 512M -nographic \
    -kernel vmlinuz -initrd test-rootfs.cpio.gz \
    -append "console=ttyS0 init=/test.sh" \
    -device my-pci-device \
    -serial mon:stdio \
    > qemu.log 2>&1 &

QEMU_PID=$!
trap "kill $QEMU_PID 2>/dev/null" EXIT

# 2. 부팅 대기
timeout 60 grep -q "TEST_DONE" <(tail -f qemu.log)

# 3. 결과 확인
grep "TEST_PASS" qemu.log
```

`test-rootfs.cpio.gz`의 `/test.sh`가 *insmod + test 실행 + poweroff*.

```bash
#!/bin/sh
# test.sh inside guest
insmod /my_pci_driver.ko
./my_test
if [ $? -eq 0 ]; then
    echo TEST_PASS
else
    echo TEST_FAIL
fi
echo TEST_DONE
poweroff -f
```

## GitHub Actions 통합

```yaml
# .github/workflows/test.yml
name: Driver Test
on: [push, pull_request]

jobs:
  qemu-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install
        run: |
          sudo apt-get update
          sudo apt-get install -y qemu-system-x86 build-essential \
              linux-headers-$(uname -r) cpio

      - name: Build QEMU with my-device
        run: |
          cd qemu
          ./configure --target-list=x86_64-softmmu --enable-debug
          make -j$(nproc)

      - name: Build driver
        run: |
          cd driver
          make

      - name: Build test rootfs
        run: ./scripts/build-rootfs.sh

      - name: Run tests
        run: ./scripts/run-test.sh

      - name: Upload logs on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-logs
          path: |
            qemu.log
            *.kernel.log
```

PR마다 *수 분 안에* full test 자동 실행.

## Test matrix

여러 architecture·kernel·QEMU 버전 조합.

```yaml
strategy:
  matrix:
    arch: [x86_64, aarch64, riscv64]
    kernel: ['6.6', '6.12', mainline]
    qemu: ['8.2.0', '9.0.0', master]
```

20+ job 병렬. *호환성 회귀*를 즉시 감지.

## Avocado — VM-based functional

QEMU의 *built-in functional test* framework. 실 OS 부팅 후 시나리오.

```python
# tests/avocado/my_pci.py
from avocado_qemu import QemuSystemTest

class MyPCI(QemuSystemTest):
    def test_basic(self):
        self.vm.add_args('-device', 'my-pci-device')
        self.vm.launch()
        self.vm.wait()
```

```bash
make check-avocado
```

자주 안 돌리지만 *release 직전* 회귀.

## Reproducibility — fixed seed

random·timing dependent test는 *seed 고정*.

```bash
qemu-system-x86_64 ... -seed 42 -icount shift=0 ...
```

같은 input은 *항상 같은 output*. flaky test 제거.

## Coverage — gcov

```bash
# kernel build with gcov
make CFLAGS_KERNEL="-fprofile-arcs -ftest-coverage" Image

# test 실행 후
lcov --capture --directory . --output-file cov.info
genhtml cov.info --output-directory cov-html
```

driver의 *어떤 line이 실행*되었는지. unused error path 발굴.

## Performance regression

```bash
# 매 PR마다 benchmark
time ./my_test --iter 10000

# baseline과 비교
./scripts/compare-perf.sh baseline.json current.json
```

cycle 수·throughput·latency. *5% 이상 regression*이면 fail.

## Fault injection in CI

```python
# pytest fixture
@pytest.fixture(params=['none', 'dma-timeout', 'irq-loss', 'register-bitflip'])
def fault_mode(request, qmp):
    qmp.command('qom-set', path=DEVICE, property='fault_mode',
                value=request.param)
    yield request.param
    qmp.command('qom-set', path=DEVICE, property='fault_mode', value='none')

def test_recovery(fault_mode):
    # 어떤 fault에도 driver가 *survive*해야 함
    rc = run_workload()
    assert rc in (0, EXPECTED_ERROR)
```

production driver의 *robust path*를 강제 검증.

## Log collection

```bash
# all artifacts
mkdir -p artifacts/
cp qemu.log artifacts/
cp /var/log/dmesg artifacts/
cp /sys/kernel/debug/tracing/trace artifacts/
tar czf artifacts.tar.gz artifacts/
```

GitHub Actions의 `actions/upload-artifact`로 자동 upload.

## flaky test detection

```bash
# 같은 test를 3번 실행
for i in 1 2 3; do
    ./run-test.sh || FAIL_COUNT=$((FAIL_COUNT+1))
done

if [ $FAIL_COUNT -gt 0 -a $FAIL_COUNT -lt 3 ]; then
    echo "FLAKY"
fi
```

flaky test는 *즉시 분류* → 별도 lane에서 분석.

## 흔한 함정

- **부팅 timeout** — cold cache로 첫 부팅이 *수십 초*. timeout 60s → 120s.
- **rootfs in artifacts** — 큰 rootfs를 매번 빌드하지 말고 *cache*.
- **side effect — host에 driver 설치** — privileged container 또는 VM 안에서 실행.
- **test isolation** — 한 test가 다른 test의 *state 오염*. fixture로 *항상 clean state*.

## 정리

- driver test는 *3 layer* — qtest(device)·kunit(driver internal)·functional(end-to-end).
- **qtest**: QEMU의 built-in. `tests/qtest/`에 추가.
- **kunit**: driver의 *unit test*. device emulation 불필요.
- **pytest** + 실 QEMU로 functional. ioctl·sysfs 검증.
- **GitHub Actions matrix**(arch × kernel × qemu)로 호환성 회귀.
- **avocado**로 VM 부팅 후 high-level 시나리오.
- **icount + seed 고정**으로 reproducibility.
- **gcov coverage**·**performance regression**·**fault injection**·**flaky detection**.

## 다음 장 예고

다음 장은 *complex scenario* — race condition·error injection·stress test.

## 관련 항목

- [Ch 9: 디버깅](/blog/tools/emulation/qemu-fake-device/chapter09-debugging)
- [Ch 11: Advanced Scenarios](/blog/tools/emulation/qemu-fake-device/chapter11-advanced-scenarios)
- [QEMU Internals — Contributing](/blog/tools/emulation/qemu-internals/chapter12-contributing)
- [QEMU Embedded — CI Matrix](/blog/tools/emulation/qemu-embedded/chapter20-ci-matrix)
