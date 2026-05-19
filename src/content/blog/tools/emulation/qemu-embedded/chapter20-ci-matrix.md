---
title: "Ch 20: 크로스 플랫폼 CI 매트릭스"
date: 2026-05-17T20:00:00
description: "ARM·RISC-V·x86 동시 검증 — embedded software CI."
tags: [QEMU, ci, matrix-build, github-actions, gitlab-ci]
series: "QEMU Embedded Emulation"
seriesOrder: 20
draft: true
---

시리즈의 마지막 장입니다. 임베디드 소프트웨어는 *수많은 board × kernel × toolchain 조합*에서 동작해야 합니다. 실 HW를 모두 갖추는 건 비용과 관리 부담이 크죠. QEMU와 GitHub Actions/GitLab CI의 *matrix 기능*을 결합하면 *매 commit*마다 수십 조합을 *자동 검증*할 수 있습니다. Linux kernel·U-Boot·Zephyr 같은 mainline 프로젝트가 정확히 이 방식.

## CI 매트릭스 5축

| 축 | 옵션 |
|----|------|
| **Architecture** | x86_64, aarch64, arm, riscv64, ppc64le, mips |
| **Board (machine)** | virt, raspi3b, mps2-an385, hifive_unmatched, ... |
| **Kernel version** | 6.6 LTS, 6.10, 6.12, mainline |
| **Toolchain** | gcc-12, gcc-13, gcc-14, clang-17, clang-18 |
| **Config** | defconfig, allyesconfig, custom |

각 축이 *조합*되어 *수십~수백* test job이 만들어집니다.

## Test 계층 (Pyramid)

```text
              ┌──────────────────┐
              │ Functional tests │  ← 시나리오별 driver 동작
              └────────┬─────────┘
            ┌──────────┴────────────┐
            │  Unit tests           │   ← kunit/cunit user-space
            └──────────┬────────────┘
        ┌──────────────┴───────────────┐
        │  Smoke tests                 │   ← 핵심 syscall 동작
        └──────────────┬───────────────┘
    ┌──────────────────┴────────────────┐
    │  Boot tests                       │   ← init까지 도달
    └──────────────────┬────────────────┘
┌──────────────────────┴────────────────────┐
│  Build tests                              │   ← 모든 조합 컴파일 OK
└───────────────────────────────────────────┘
```

아래로 갈수록 *많은 조합*, 위로 갈수록 *깊은 검증*. 시간·비용에 맞춰 선택.

## GitHub Actions matrix

```yaml
# .github/workflows/embedded-matrix.yml
name: Embedded Matrix
on: [push, pull_request]

jobs:
  build-test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        target:
          - { arch: x86_64,  cross: '',                machine: q35,         qemu: x86_64 }
          - { arch: aarch64, cross: aarch64-linux-gnu, machine: virt,        qemu: aarch64 }
          - { arch: aarch64, cross: aarch64-linux-gnu, machine: raspi3b,     qemu: aarch64 }
          - { arch: arm,     cross: arm-linux-gnueabihf, machine: mps2-an385, qemu: arm }
          - { arch: riscv64, cross: riscv64-linux-gnu, machine: virt,        qemu: riscv64 }
        kernel: ['6.6', '6.12', 'mainline']
        toolchain: ['gcc-13', 'clang-17']

    steps:
      - uses: actions/checkout@v4

      - name: Cache toolchain
        uses: actions/cache@v4
        with:
          path: ~/toolchains
          key: ${{ matrix.target.cross }}-${{ matrix.toolchain }}

      - name: Install toolchain
        run: |
          sudo apt update
          sudo apt install -y qemu-system-${{ matrix.target.qemu }} \
              gcc-${{ matrix.target.cross }} || true

      - name: Build kernel
        run: |
          export ARCH=${{ matrix.target.arch }} CROSS_COMPILE=${{ matrix.target.cross }}-
          make defconfig
          make -j$(nproc) Image

      - name: Boot test
        run: |
          timeout 60 qemu-system-${{ matrix.target.qemu }} \
              -M ${{ matrix.target.machine }} -nographic \
              -kernel arch/${{ matrix.target.arch }}/boot/Image \
              -initrd rootfs.cpio.gz \
              -append "console=ttyAMA0 init=/sbin/poweroff" \
              | tee boot.log
          grep "reached target Power-Off" boot.log

      - name: Smoke test
        run: ./scripts/smoke.sh ${{ matrix.target.machine }}

      - name: Upload logs on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: boot-log-${{ matrix.target.arch }}-${{ matrix.kernel }}
          path: boot.log
```

5 target × 3 kernel × 2 toolchain = **30 job 병렬**. 보통 *5~15분* 안에 완료.

## GitLab CI 버전

```yaml
# .gitlab-ci.yml
.matrix:
  parallel:
    matrix:
      - ARCH: [aarch64, riscv64, arm]
        MACHINE: [virt]
        KERNEL: ['6.6', '6.12']

boot-test:
  extends: .matrix
  script:
    - apt-get install -y qemu-system-${ARCH}
    - make ARCH=${ARCH} ${MACHINE}_defconfig
    - timeout 60 qemu-system-${ARCH} -M ${MACHINE} \
        -kernel Image -nographic
```

`parallel.matrix`가 GitHub Actions와 같은 역할.

## Boot test의 핵심 — 어떻게 success 판정?

QEMU가 *kernel을 띄우고 끝까지* 가는지 확인.

```bash
timeout 60 qemu-system-aarch64 -M virt -m 512M -nographic \
    -kernel Image -initrd rootfs.cpio.gz \
    -append "console=ttyAMA0 init=/sbin/poweroff panic=10" \
    | tee boot.log

# Pass 조건 — kernel halt 메시지
grep "reached target Power-Off" boot.log || exit 1
# Or:
grep "Power down" boot.log || exit 1
```

`init=/sbin/poweroff`가 *kernel 정상 halt*. timeout 60s 안에 도달해야 함.

## Smoke test

핵심 syscall 동작 확인.

```bash
# scripts/smoke.sh
qemu-system-aarch64 -M virt -m 512M -nographic \
    -kernel Image -initrd smoke-rootfs.cpio.gz \
    -append "console=ttyAMA0 init=/smoke.sh" \
    | tee smoke.log

grep "SMOKE PASS" smoke.log || exit 1
```

`smoke-rootfs`의 `/smoke.sh`가 *기본 명령 시험* 후 `echo "SMOKE PASS"`.

## Functional test

특정 driver의 시나리오.

```bash
# I2C driver 시험
qemu-system-aarch64 ... \
    -device my-i2c-sensor,address=0x48 \
    -kernel Image -initrd test-rootfs.cpio.gz
```

guest 안의 test program이 *sensor를 통한 read·write·error*를 시험.

## Test result aggregation

JUnit XML 포맷으로 결과 통합.

```python
# test_runner.py
import xml.etree.ElementTree as ET

def write_junit(results, path):
    root = ET.Element('testsuites')
    for suite_name, cases in results.items():
        suite = ET.SubElement(root, 'testsuite', name=suite_name)
        for case in cases:
            tc = ET.SubElement(suite, 'testcase', name=case['name'])
            if not case['pass']:
                ET.SubElement(tc, 'failure', message=case['msg'])
    ET.ElementTree(root).write(path)
```

```yaml
# GitHub Actions에서
- name: Publish test results
  uses: dorny/test-reporter@v1
  with:
    name: kernel-boot-test
    path: 'test-results.xml'
    reporter: 'junit'
```

PR 페이지에 *pass/fail 상태*가 시각화.

## Caching

cross compiler·kernel object 캐싱.

```yaml
- name: Cache build artifacts
  uses: actions/cache@v4
  with:
    path: |
      ${{ github.workspace }}/.ccache
      ${{ github.workspace }}/build
    key: ${{ matrix.target.arch }}-${{ hashFiles('configs/**', 'Makefile') }}
```

ccache·sccache 통합으로 *전체 빌드*가 *증분*. CI 시간 *수 배* 단축.

## Timeout 처리

무한 루프 방지.

```bash
timeout 60 qemu-system-... || {
    echo "TIMEOUT — likely boot hang"
    exit 1
}
```

QEMU process가 *60초 안에* 끝나지 않으면 강제 kill. *kernel hang 시나리오*에 대비.

## Reproducible build

같은 commit으로 *언제 빌드해도 같은 결과*. embedded production에서 필수.

```bash
export SOURCE_DATE_EPOCH=$(git log -1 --format=%ct)
export TZ=UTC
export LC_ALL=C
make defconfig
make
```

*deterministic ar·strip*, *timestamp 고정*. CI runner의 *cache hit*도 더 잘 작동.

## Hardware-in-the-loop (HIL)

QEMU CI 통과 후 *실 보드*에 자동 deploy하는 다음 단계.

```text
QEMU CI (10분, 30 job)
        │
        ▼ pass
HIL CI (수십 분, 실 보드 N대)
        │
        ▼ pass
Release artifact
```

HIL은 *Jenkins/Lava* 같은 전용 시스템. QEMU가 *first stage filter*.

## LAVA — embedded 표준

**Lava**(Linaro Automated Validation Architecture)는 *embedded HIL* 표준 framework.

- 보드 farm 관리
- automated provisioning
- test job 정의
- JUnit/XML 결과

Linaro·KernelCI·Yocto가 표준 채택. QEMU job과 *같은 yaml*로 정의 가능.

## Performance regression

같은 워크로드의 *cycle count* 추적.

```bash
qemu-system-aarch64 -M virt -d int -D int.log ...
# int.log의 timestamp로 핵심 path latency 측정
```

매 PR마다 *latency가 X% 증가*하면 fail. *performance gate*.

## Bisect across arch

regression이 *어느 commit*에서 발생했는지 자동 추적.

```bash
git bisect start good-rev bad-rev
git bisect run ./scripts/qemu-boot-test.sh aarch64
```

bisect가 각 commit에서 boot test를 돌려 *failure 시점* 찾음.

## 흔한 함정

- **matrix가 너무 큼** — 100+ job이 모든 PR에서 돌면 CI 큐 막힘. *PR은 작은 subset, main은 full matrix*.
- **timeout 부족** — 처음 부팅이 *cold cache*로 느림. timeout 60s → 120s 권장.
- **flaky test** — host load·timing 의존. *3회 retry* + flaky tracker.
- **artifact 크기** — 모든 job이 큰 artifact 업로드하면 storage 폭발. *fail시만* upload.

## 시리즈 마무리

20장을 통해 *QEMU embedded emulation*의 전체 지도를 그렸습니다.

| 영역 | 장 |
|------|----|
| 기본 | Ch 1~3 (overview, ARM/RISC-V virt) |
| 부팅 chain | Ch 4~6 (U-Boot, kernel, rootfs) |
| 시스템 구성 | Ch 7~9 (DT, peripherals, networking) |
| 디버깅·정적 검증 | Ch 10 (GDB) |
| OS 미만 | Ch 11~12 (baremetal, RTOS) |
| 실 SoC 시뮬레이션 | Ch 13~14 (vendor machines, semihosting) |
| 고급 architecture | Ch 15~17 (OpenAMP, TrustZone, hypervisor) |
| 실전 워크플로 | Ch 18~20 (bringup, fault injection, CI) |

이제 *내 펌웨어·driver·시스템*을 *어떤 단계*에서도 QEMU로 검증할 수 있습니다.

## 다음 단계

- *내 SoC*를 QEMU에 추가 — QEMU Internals 시리즈로
- *driver-RTL 통합* — Driver-RTL Co-simulation 시리즈로
- *FPGA driver* — FPGA Driver via QEMU+VFIO 시리즈로
- *RISC-V 심화* — RISC-V QEMU 심화 시리즈로

이 4개 시리즈가 *임베디드 + QEMU*의 다음 깊이.

## 정리

- CI matrix의 5축: arch·machine·kernel·toolchain·config. 30~100 job이 매 commit에.
- Test pyramid: Build → Boot → Smoke → Unit → Functional. 위로 갈수록 깊고 좁음.
- GitHub Actions와 GitLab CI 모두 `strategy.matrix`·`parallel.matrix`로 자연스럽게.
- Boot test pass 판정은 `init=/sbin/poweroff` + log grep.
- ccache·sccache·matrix cache로 CI 시간 *수 배* 단축.
- HIL과 결합해 *QEMU first* → *실 보드 second* 흐름.
- LAVA·KernelCI가 embedded HIL 표준.
- `git bisect`로 cross-arch regression 자동 추적.

## 시리즈 마무리 — 다음 단계로

20장을 끝까지 따라온 셈입니다. 이제 *진짜 시작*입니다 — 자기 프로젝트에 적용해 보고, *4개 인접 시리즈*로 깊이를 더해 가세요.

QEMU가 *임베디드 개발의 가속기*가 되어 주기를 바랍니다.

## 관련 시리즈

- [QEMU Internals](/blog/tools/emulation/qemu-internals/chapter01-architecture) — QEMU 내부 구조
- [QEMU Fake Device Driver](/blog/tools/emulation/qemu-fake-device/chapter01-overview) — driver 개발
- [FPGA Driver via QEMU+VFIO](/blog/tools/emulation/qemu-fpga-driver/chapter01-fpga-driver-challenge) — FPGA 결합
- [Driver-RTL Co-simulation](/blog/tools/emulation/driver-cosim/chapter01-why-cosim) — pre-silicon 검증
- [RISC-V QEMU 심화](/blog/tools/emulation/qemu-riscv/chapter01-overview) — RISC-V 깊이

## 참고 자료

- QEMU `Documentation/`
- Linux kernel `Documentation/admin-guide/kernel-parameters.txt`
- Linaro LAVA — lavasoftware.org
- KernelCI — kernelci.org
- Bootlin training slides — bootlin.com/training
