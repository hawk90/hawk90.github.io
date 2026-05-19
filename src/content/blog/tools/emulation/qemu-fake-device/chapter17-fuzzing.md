---
title: "Ch 17: 디바이스 퍼징"
date: 2026-05-17T17:00:00
description: "Syzkaller·QEMU device fuzzer — 가상 디바이스로 driver 취약점 발견."
tags: [QEMU, fuzzing, syzkaller, security]
series: "QEMU Fake Device Driver"
seriesOrder: 17
draft: true
---

## 이 챕터의 의도

Driver 보안 버그는 대부분 device → host 방향에서 발생한다. 신뢰할 수 없는 device가 보내는 MMIO/DMA 값을 driver가 검증 없이 그대로 받아 쓰기 때문이다. QEMU와 Syzkaller 같은 fuzzer는 device를 흉내 내 수백만 조합을 던져 corner case를 자동으로 탐색한다. 보안과 안정성 검증의 표준 도구다.

## 핵심 항목

- ✦ Fuzzing의 가치 — 사람이 못 떠올리는 *조합 폭발* 경로 자동 탐색
- ✦ Driver attack surface — MMIO read, DMA-read, IRQ vector, hot-plug event
- ✦ **Syzkaller** — Google 발 Linux kernel syscall fuzzer, system call sequence 생성
- ✦ **QEMU built-in device fuzzer** (Alexander Bulekov, 2020) — `--enable-fuzzing`, virtual device 진입점 직접
- ✦ Coverage feedback — libFuzzer (LLVM SanitizerCoverage) / AFL++ — branch coverage 신호로 corpus 진화
- ✦ Sanitizer 통합 — **KASAN** (heap/stack out-of-bounds), **UBSAN** (undefined), **KCSAN** (data race), **MSAN** (uninit read)
- ✦ Corpus 관리 — minimization (작은 reproducer), seed selection
- ✦ Reproducer minimization — `syz-minimize`, libFuzzer `-minimize_crash`
- ✦ CI integration — Google syzbot, kernel upstream에 자동 보고
- ✦ Bug 발견 사례 — virtio-net OOB, USB driver UAF, NIC DMA race
- ◦ Differential fuzzing — same input, two devices (compatibility 검증)
- ◦ Smart fuzzer (`hongfuzz`, `Fuzzilio` for protocols)

## 다이어그램 (3)

1. Fuzzing loop — corpus → mutate → device input → run → coverage → feedback
2. QEMU device fuzzer 구조 — fuzzer ↔ QEMU runtime ↔ virtual device
3. Bug → reproducer → minimize → upstream 보고 흐름

## 코드 sketch

```c
/* QEMU built-in fuzzer entry — hw/core/qdev-fuzz.c 패턴 */
static int qemu_device_fuzz_one(const uint8_t *data, size_t size) {
    /* data를 device MMIO write 시퀀스로 해석 */
    while (size >= sizeof(MMIOOp)) {
        MMIOOp *op = (MMIOOp *)data;
        if (op->is_write) {
            qtest_writel(qts, op->addr, op->value);
        } else {
            qtest_readl(qts, op->addr);
        }
        data += sizeof(*op);
        size -= sizeof(*op);
    }
    return 0;
}

/* libFuzzer entry */
int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
    return qemu_device_fuzz_one(data, size);
}
```

```bash
# 빌드 + 실행
./configure --enable-fuzzing --enable-sanitizers=address,undefined
make qemu-fuzz-i386
./qemu-fuzz-i386 --fuzz-target=generic-pci-fuzz corpus/

# Syzkaller 설정
syz-manager -config syzkaller.cfg   # QEMU target, KASAN kernel
```

## 레퍼런스

- Bulekov et al. "QEMU device fuzzing" (DEFCON 2020, USENIX Security 2021)
- syzkaller GitHub — github.com/google/syzkaller
- Linux KASAN docs — `Documentation/dev-tools/kasan.rst`
- QEMU `tests/qtest/fuzz/` — 실제 fuzzer 소스
- syzbot dashboard — syzkaller.appspot.com

## 관련 항목

- [Ch 9: 디버깅](/blog/tools/emulation/qemu-fake-device/chapter09-debugging) (기존)
- [Ch 16: VirtIO 심화](/blog/tools/emulation/qemu-fake-device/chapter16-virtio-advanced)
- [Ch 21: AER 에뮬레이션](/blog/tools/emulation/qemu-fake-device/chapter21-aer-emulation)
