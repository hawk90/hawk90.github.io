---
title: "Ch 20: 크로스 플랫폼 CI 매트릭스"
date: 2026-05-17T20:00:00
description: "ARM·RISC-V·x86 동시 검증 — embedded software CI."
tags: [QEMU, ci, matrix-build, github-actions]
series: "QEMU Embedded Emulation"
seriesOrder: 20
draft: true
---

## 이 챕터의 의도

임베디드 소프트웨어는 수많은 board × kernel × toolchain 조합에서 동작해야 한다. 실 HW를 모두 갖추는 건 비용과 관리 부담이 크다. QEMU와 GitHub Actions/GitLab CI 매트릭스를 결합하면 매 commit마다 수십 조합을 자동 검증할 수 있다. Linux kernel, U-Boot, Zephyr 같은 mainline 프로젝트가 정확히 이 방식을 쓴다.

## 핵심 항목

- ✦ CI 매트릭스 축 — `{arch} × {board} × {kernel version} × {toolchain} × {config}`
  - arch: x86_64, aarch64, arm, riscv64, ppc64le, mips
  - board: virt, raspi3b, mps2-an385, hifive_unmatched, ...
  - kernel: 6.6 LTS, 6.10, 6.12, mainline
  - toolchain: gcc-12, gcc-13, gcc-14, clang-17, clang-18
- ✦ **GitHub Actions** — `strategy.matrix` + `include`/`exclude`
- ✦ **GitLab CI** — `parallel: matrix:` + `rules:`
- ✦ Container — `qemu-system-*` in Docker (예: `dockerproject/qemu` or self-built)
- ✦ Test 계층
  - **Build** — 모든 조합 컴파일 OK
  - **Boot** — QEMU에서 init까지 도달
  - **Smoke** — 핵심 syscall 동작
  - **Unit** — kunit/cunit user-space
  - **Functional** — driver별 시나리오
- ✦ Test result aggregation — JUnit XML, Allure
- ✦ Timeout 처리 — 무한 루프 방지, `timeout 300 qemu-system-...`
- ✦ Reproducible build — SOURCE_DATE_EPOCH, deterministic ar, container pinning
- ✦ Cross-platform regression detection — bisect across arch
- ✦ Performance regression — 같은 워크로드의 cycle 카운트 추적
- ✦ Caching — sccache, ccache (cross compiler 빌드 가속)
- ◦ Hardware-in-the-loop (HIL) — QEMU pass → 실 board test (Jenkins)
- ◦ Lava (Linaro Automated Validation Architecture) — 임베디드 표준

## 다이어그램 (4)

1. CI 매트릭스 5축 시각화
2. Build → Boot → Smoke → Unit → Functional 5단계 pyramid
3. GitHub Actions matrix job 그래프 (병렬 job들)
4. Bisect across arch — regression detection 흐름

## 코드 sketch

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
          - { arch: x86_64,  cross: '',                machine: q35,    qemu: x86_64 }
          - { arch: aarch64, cross: aarch64-linux-gnu, machine: virt,   qemu: aarch64 }
          - { arch: aarch64, cross: aarch64-linux-gnu, machine: raspi3b, qemu: aarch64 }
          - { arch: arm,     cross: arm-linux-gnueabihf, machine: mps2-an385, qemu: arm }
          - { arch: riscv64, cross: riscv64-linux-gnu, machine: virt,   qemu: riscv64 }
        kernel: ['6.6', '6.12', 'mainline']
        toolchain: ['gcc-13', 'clang-17']

    steps:
      - uses: actions/checkout@v4
      - name: Cache toolchain
        uses: actions/cache@v4
        with:
          path: ~/toolchains
          key: ${{ matrix.target.cross }}-${{ matrix.toolchain }}

      - name: Build kernel
        run: |
          export ARCH=${{ matrix.target.arch }} CROSS_COMPILE=${{ matrix.target.cross }}-
          make ${{ matrix.target.machine }}_defconfig
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

      - name: Upload artifact
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: boot-log-${{ matrix.target.arch }}-${{ matrix.kernel }}
          path: boot.log
```

```bash
# 로컬에서 빠르게 매트릭스 일부만
./scripts/run-matrix.sh --arch aarch64 --machine virt --kernel 6.12

# Result aggregation
junit2html test-results.xml > report.html
```

```yaml
# .gitlab-ci.yml — GitLab 버전
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
    - timeout 60 qemu-system-${ARCH} -M ${MACHINE} -kernel Image -nographic
```

## 레퍼런스

- Linux kernel `tools/testing/kunit/`, kernelci.org
- Linaro LAVA — lavasoftware.org
- Zephyr `west` build system + Twister test runner
- "Continuous Integration for Embedded Linux" (Bootlin)
- GitHub Actions docs — `jobs.<job_id>.strategy.matrix`

## 관련 항목

- [Ch 17: ARM Hypervisor](/blog/tools/emulation/qemu-embedded/chapter17-hypervisor)
- [Ch 18: 보드 bringup](/blog/tools/emulation/qemu-embedded/chapter18-board-bringup)
- [Ch 19: Fault Injection](/blog/tools/emulation/qemu-embedded/chapter19-fault-injection)
- [QEMU Fake Device Ch 22: Cross-Architecture](/blog/tools/emulation/qemu-fake-device/chapter22-cross-architecture)
