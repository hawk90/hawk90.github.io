---
title: "Ch 17: 디바이스 퍼징"
date: 2026-05-17T17:00:00
description: "Syzkaller·QEMU device fuzzer — 가상 디바이스로 driver 취약점 발견."
tags: [QEMU, fuzzing, syzkaller, security, AFL]
series: "QEMU Fake Device Driver"
seriesOrder: 17
draft: true
---

**Fuzzing**은 *random·malformed input*으로 *bug·취약점*을 발견하는 기법입니다. driver의 *register write*·*DMA descriptor*가 *guest의 통제*에 있으므로, *적대적 guest*가 driver를 무력화할 위험. QEMU 환경에서 *체계적*으로 검증하는 흐름을 봅니다.

## Fuzzing 카테고리

| 카테고리 | 대상 | 도구 |
|----------|------|------|
| **Syscall fuzzing** | kernel syscall | Syzkaller |
| **Device fuzzing** | device MMIO/DMA path | QEMU device fuzzer, AFL |
| **Userspace fuzzing** | driver ioctl | AFL, libFuzzer |
| **Network fuzzing** | network stack | libfuzzer |

driver 개발자가 *직접 활용*하는 건 *device fuzzing*과 *Syzkaller*.

## Syzkaller — kernel fuzzer

Google의 coverage-guided kernel fuzzer.

```bash
# 설정
git clone https://github.com/google/syzkaller
cd syzkaller
make

# QEMU 환경 설정
cat > config.json <<EOF
{
    "target": "linux/amd64",
    "http": "127.0.0.1:8080",
    "workdir": "./workdir",
    "kernel_obj": "/path/to/linux/build",
    "image": "/path/to/rootfs.img",
    "sshkey": "/path/to/id_rsa",
    "syzkaller": "$(pwd)",
    "procs": 4,
    "type": "qemu",
    "vm": {
        "count": 4,
        "kernel": "/path/to/bzImage",
        "cpu": 2,
        "mem": 2048
    }
}
EOF

./bin/syz-manager -config config.json
```

Syzkaller가 *4 VM*을 띄우고 *동시에 random syscall* 실행. crash 발생 시 *minimal reproducer* 자동 생성.

## driver-specific syzkaller

driver의 *ioctl·sysfs* fuzz target.

```text
# my_pci.txt — syzkaller syscall description
my_pci_open$dev
  fd = openat(AT_FDCWD, &(0x7f0000000000)="/dev/my0", 0x2, 0x0)
my_pci_ioctl_dma$cmd
  ioctl$my_pci_ioctl_dma(fd, MY_PCI_IOCTL_DMA_XFER, &arg)

resource my_pci_fd[fd]
```

driver의 *attack surface* 정의. Syzkaller가 *random argument*로 매우 빠르게 호출.

## QEMU built-in device fuzzer

QEMU 자체에 *device fuzzer*. `--enable-fuzzing` 빌드.

```bash
./configure --enable-fuzzing --target-list=x86_64-softmmu
make qemu-fuzz-x86_64

# fuzz target list
./qemu-fuzz-x86_64 --list-fuzzers
# generic-fuzz
# ahci-fuzz
# virtio-net-fuzz
# my-pci-fuzz   (등록 시)

# 실행
./qemu-fuzz-x86_64 -fuzz-target my-pci-fuzz
```

QEMU process 자체가 *fuzz target*. *device 구현 bug*를 잡음.

## Custom fuzz target

device를 *fuzz-friendly*하게 등록.

```c
/* hw/misc/my_pci_fuzz.c */
#include "qemu/osdep.h"
#include "tests/qtest/fuzz/fuzz.h"
#include "tests/qtest/fuzz/generic_fuzz_configs.h"

static GenericFuzzConfig predefined_configs[] = {
    {
        .name = "my-pci-fuzz",
        .args = "-device my-pci-device",
        .objects = "my-pci",
    }
};

static void register_my_pci_fuzz_targets(void) {
    fuzz_add_target(&(FuzzTarget){
        .name = "my-pci-fuzz",
        .description = "Fuzz my-pci device",
        .pre_fuzz = generic_pre_fuzz,
        .fuzz = generic_fuzz,
    });
}

fuzz_target_init(register_my_pci_fuzz_targets);
```

빌드 후 *random input*이 *MMIO write*·*PCI config*·*DMA*에 자동 inject.

## AFL — userspace ioctl

driver의 *user-space test program*을 AFL로.

```bash
# AFL 설치
sudo apt install afl++

# 빌드 — afl-cc 사용
afl-clang my_test.c -o my_test

# corpus 준비
mkdir corpus
echo '{"len":4096,"in_addr":0}' > corpus/0

# fuzz
afl-fuzz -i corpus -o findings -- ./my_test @@
```

`@@`가 input file. AFL이 *mutated input*으로 ioctl call.

## Coverage-guided

modern fuzzer는 *coverage feedback*으로 *새 path 탐색*.

```bash
# kernel을 coverage instrumented로 빌드
make ARCH=... CONFIG_KCOV=y

# Syzkaller가 KCOV로 coverage 수집
# 새 coverage 발견 시 *해당 input*을 corpus에 추가
```

random보다 *수천 배* 효율적. 1주일 fuzz로 *수십 bug* 발견 가능.

## Crash 분석

Syzkaller가 crash 발견 시 *자동으로* 분석.

```text
workdir/crashes/<hash>/
├── description    ← BUG 메시지
├── log0           ← kernel log
├── report0        ← crash report
└── repro.cprog    ← C 프로그램 (minimal reproducer)
```

`repro.cprog`가 *수십 줄*로 *bug 재현*. fix 후 *regression test*에 추가.

## Sanitizer 결합

fuzzing + sanitizer가 *진짜 weapon*.

| Sanitizer | 검출 |
|-----------|------|
| **KASAN** | use-after-free, out-of-bounds |
| **UBSAN** | undefined behavior |
| **KCSAN** | data race |
| **KMSAN** | uninitialized memory |
| **KFENCE** | low-overhead heap bug |

```bash
make CONFIG_KASAN=y CONFIG_UBSAN=y CONFIG_KCSAN=y Image
```

fuzz 중 sanitizer가 *bug 즉시 검출* — silent corruption까지.

## driver의 fuzz-resistant 코드

fuzz에 *graceful*하게 대응하도록.

```c
/* nope */
static int my_ioctl(...) {
    struct req r;
    copy_from_user(&r, ...);
    process(r.array[r.index]);   /* r.index check 없음 */
}

/* yes */
static int my_ioctl(...) {
    struct req r;
    if (copy_from_user(&r, ...)) return -EFAULT;
    if (r.index >= ARRAY_SIZE(r.array)) return -EINVAL;
    process(r.array[r.index]);
}
```

*모든 user input*을 *validate*. fuzz가 *validation 못 통과*하면 *bug 없음*.

## Specific bug class

| Bug | fuzz가 잘 잡음 |
|-----|----------------|
| Out-of-bounds | ✓✓✓ |
| Use-after-free | ✓✓✓ |
| Integer overflow | ✓✓ |
| Null deref | ✓✓✓ |
| Race condition | ✓ (KCSAN과 결합 시) |
| Deadlock | ✗ |
| Semantic bug | ✗ |
| Logic error | ✗ |

memory safety bug에 매우 강력. logic bug는 *spec-based testing*.

## CI 통합

```yaml
name: Fuzz
on:
  schedule:
    - cron: "0 0 * * 0"   # 주간 회귀

jobs:
  syzkaller:
    runs-on: ubuntu-latest-large
    timeout-minutes: 480   # 8시간
    steps:
      - run: |
          ./scripts/syzkaller-config.sh
          ./bin/syz-manager -config config.json &
          sleep 6h
          /bin/bash -c "[ -z \"$(ls workdir/crashes 2>/dev/null)\" ]"
```

매주 *6시간 fuzz*. crash 발견 시 fail.

## Public fuzz infrastructure

- **syzbot**: kernel.org의 public Syzkaller. *모든 mainline patch*가 fuzz 대상.
- **OSS-Fuzz**: Google의 open-source fuzz. QEMU도 등록.
- **Linux Kernel CI**: KernelCI가 일부 결합.

mainline upstream에 기여하면 *자동으로* fuzz 받음.

## driver hardening checklist

- [ ] 모든 `copy_from_user` 후 *반환값 확인*.
- [ ] 모든 array index *range check*.
- [ ] 모든 *integer arithmetic*에 overflow 검사.
- [ ] *null pointer* 가능성 항상 확인.
- [ ] *lock acquisition order*가 일관.
- [ ] resource cleanup이 *error path 모든 시점*에 정확.
- [ ] *user-controlled string* 길이 제한.
- [ ] DMA address가 *valid range*에 있는지.

이 checklist를 *PR template*에 두면 회귀 방지.

## 흔한 함정

- **fuzz coverage 부족** — driver의 *일부 path만* 도달. corpus·grammar 개선.
- **non-deterministic crash** — race condition. KCSAN으로 재현.
- **environmental bug** — host의 *random behavior*에 의존. isolate.
- **fuzz session 너무 짧음** — 1시간으론 *얕은 bug만*. 6시간 이상 권장.

## 정리

- **Fuzzing**은 *random·malformed input*으로 driver 취약점 발견. memory safety bug에 매우 강력.
- **Syzkaller**가 kernel fuzz의 표준. coverage-guided + automated repro.
- driver의 *syscall description*을 *txt*로 작성해 attack surface 정의.
- **QEMU built-in fuzzer**(`--enable-fuzzing`)로 *device 구현* 자체 검증.
- **Sanitizer**(KASAN/UBSAN/KCSAN/KMSAN/KFENCE)와 결합이 *진짜 weapon*.
- driver 코드를 *fuzz-resistant*하게 작성 — validate all user input.
- CI에 *주간 fuzz session* 추가로 회귀 방지.
- mainline upstream은 *syzbot*이 자동 fuzz.

## 다음 장 예고

다음 장은 *device의 performance characteristic* — latency·throughput 모델링.

## 관련 항목

- [Ch 16: VirtIO Advanced](/blog/tools/emulation/qemu-fake-device/chapter16-virtio-advanced)
- [Ch 18: Performance Modeling](/blog/tools/emulation/qemu-fake-device/chapter18-performance-modeling)
- [Ch 11: Advanced Scenarios](/blog/tools/emulation/qemu-fake-device/chapter11-advanced-scenarios)
