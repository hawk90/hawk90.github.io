---
title: "Ch 7: spike vs QEMU"
date: 2026-05-17T01:00:00
description: "RISC-V 시뮬레이터 비교 — spike와 QEMU의 차이, 용도별 선택을 다룬다."
series: "RISC-V QEMU 심화"
seriesOrder: 7
tags: [RISC-V, QEMU, spike, Simulator, ISA]
draft: true
---

RISC-V 생태계에는 두 가지 *공식적*인 simulator가 있습니다. **Spike**는 *ISA reference simulator*고, **QEMU**는 *system emulator*입니다. 둘 다 같은 ISA를 다루는데 왜 *둘 다* 필요한가, 언제 어느 쪽을 골라야 하는가가 이 장의 질문입니다.

## Spike — ISA의 진실

**Spike**(RISC-V ISA Simulator)는 RISC-V Foundation의 공식 reference입니다. ISA spec이 *실제로 무엇을 의미하는지*를 표현하는 코드입니다.

```bash
# 설치
git clone https://github.com/riscv-software-src/riscv-isa-sim.git
cd riscv-isa-sim
mkdir build && cd build
../configure --prefix=/opt/riscv
make -j$(nproc)
sudo make install

# 실행
spike pk hello.elf
```

`pk`는 *proxy kernel*로, host의 system call을 forward하는 최소한의 OS 레이어입니다. user-space C 프로그램을 *그냥* 실행하기에 적합.

Spike의 특징:
- **One instruction at a time** — 정확히 한 명령씩, 명시적 fetch-decode-execute.
- **Spec과 1:1 대응** — privileged spec의 의사 코드와 거의 같은 구조.
- **모든 확장 지원** — vector·hypervisor·bit-manip 등 신규 확장의 *최초 구현*.
- **상세 trace 가능** — `--log-commits`로 매 명령의 RD 변화·CSR 변화를 dump.
- **느림** — 100k~1M IPS(instructions per second) 수준.

## QEMU — 시스템의 모사

QEMU는 *system emulator*입니다. CPU만이 아니라 *플랫폼 전체*를 모사하고, *JIT*(TCG)을 통해 빠르게 실행합니다.

| 특징 | 의미 |
|------|------|
| TCG JIT | host 명령으로 번역. 100M~1B IPS |
| 디바이스 모델 | UART·CLINT·PLIC·VirtIO 등 풍부 |
| GDB stub | 그대로 디버깅 |
| Linux 부팅 | 풀 OS 실행 |
| 표준 ISA | spec 따라가지만 spike만큼 자세히 update하진 않음 |

같은 hello.elf를 QEMU에서 실행할 수도 있습니다(user-mode binary).

```bash
qemu-riscv64 hello.elf
```

system emulation도 가능.

```bash
qemu-system-riscv64 -machine virt -nographic -kernel hello.elf
```

## 정면 비교

자주 헷갈리는 두 도구의 차이를 정리.

| 항목 | spike | QEMU |
|------|-------|------|
| 주된 목적 | ISA spec의 reference 구현 | system 에뮬레이션 |
| 속도 | 100k~1M IPS | 100M~1B IPS (TCG JIT) |
| 정확도 | spec-accurate, side-effect 정확 | spec-accurate, 일부 detail 차이 |
| 디바이스 | 최소 (HTIF, RTC, 약간의 UART) | 풍부 (PLIC, CLINT, VirtIO, PCIe, ...) |
| 디버깅 | 자체 명령 + log | GDB 통합 |
| Linux 부팅 | 가능하지만 느림 | 표준 |
| 신규 확장 지원 | 가장 빠름 (V·H·B·...의 첫 구현) | spec 동결 후 추가 |
| 라이선스 | BSD | GPL |
| 사용 | 검증·교육·컴파일러 테스트 | 개발·테스트·CI |

## 상세 trace — spike의 우위

ISA-level 디버깅에서 spike가 결정적으로 우위인 이유.

```bash
spike --log-commits pk hello.elf 2>&1 | head -20
```

```text
core   0: 3 0x0000000000010078 (0xf14025f3) x11 0x0000000000000000
core   0: 3 0x000000000001007c (0x00859593) x11 0x0000000000000000
core   0: 3 0x0000000000010080 (0x12058863) c.bnez t0, .+24
core   0: 3 0x0000000000010098 (0x0000a517) x10 0x0000000000010098
core   0: 3 0x000000000001009c (0xff050513) x10 0x0000000000010088
core   0: 3 0x00000000000100a0 (0x00100613) x12 0x0000000000000001
```

매 줄: `core   N: priv 0xPC (0xINSTR) regs`. 한 명령의 모든 부수효과를 *완벽히* 추적할 수 있습니다. QEMU의 `-d in_asm`은 그저 *어셈블리만* dump하지 *register 변화*는 안 보여 줍니다.

## 컴파일러 검증 — spike의 무대

GCC·LLVM의 RISC-V backend가 새 instruction을 emit했을 때 *기대대로* 실행되는지를 확인하려면 spike가 표준입니다.

```bash
# 새 명령을 사용하는 작은 프로그램
cat << 'EOF' > vec_test.c
#include <stdio.h>
int main(void) {
    int arr[8] = {1,2,3,4,5,6,7,8};
    int sum = 0;
    for (int i = 0; i < 8; i++) sum += arr[i];
    printf("sum=%d\n", sum);
    return 0;
}
EOF

# Vector 활성화 컴파일
riscv64-unknown-elf-gcc -march=rv64gcv -O3 -o vec_test vec_test.c

# spike에 vector 지원으로 실행
spike --isa=rv64gcv pk vec_test
```

GCC가 *자동 vectorize*한 결과를 spike가 *spec대로* 해석해 정답을 냅니다. 컴파일러 backend QA의 핵심.

## QEMU의 무대 — 풀 시스템

Linux 부팅, driver 개발, application 디버깅이 QEMU의 영역입니다.

```bash
qemu-system-riscv64 -machine virt -m 2G -smp 4 -nographic \
    -bios default \
    -kernel Image \
    -append "root=/dev/vda rw console=ttyS0" \
    -drive file=rootfs.ext2,format=raw,id=hd0 \
    -device virtio-blk-device,drive=hd0
```

spike로는 같은 일이 *몇 시간* 걸립니다(혹은 안 됩니다). QEMU에서는 몇 초~분.

## Co-simulation — spike와 QEMU 함께 쓰기

가장 진보된 시나리오: *같은 코드*를 spike와 QEMU에 *동시에* 실행하고 출력이 일치하는지 확인. 어느 한 쪽의 버그를 *다른 쪽*이 잡습니다.

- spike의 commit log를 dump.
- QEMU의 `-d in_asm,exec` 출력을 dump.
- 두 trace를 diff.

차이가 나는 명령이 *어느 한 쪽의* 버그입니다(보통 QEMU). 이런 cross-validation이 RISC-V kernel 개발에서 종종 쓰이는 디버깅 기법입니다.

## 사용 시나리오 — 어느 쪽을 고르나

| 시나리오 | 추천 |
|----------|------|
| 새 ISA 확장 spec 검증 | **spike** |
| GCC/LLVM의 새 backend 출력 검증 | **spike** |
| privileged mode 동작 정확성 | **spike** (시각화 도구 유리) |
| 펌웨어/부트로더 개발 | **QEMU** |
| Linux 커널 포팅 | **QEMU** |
| driver 개발 | **QEMU** |
| CI에서 Linux app 회귀 시험 | **QEMU** |
| 교육 — ISA 학습 | **spike** |
| 교육 — 시스템 부팅 학습 | **QEMU** |

## 두 도구의 *공통 미덕*

- **spec 충실** — 둘 다 RISC-V Foundation의 spec을 따라갑니다.
- **활발한 커뮤니티** — 신규 확장 추가가 빠릅니다.
- **상호운용** — `pk`는 spike와 QEMU 모두에서 호스팅 가능.
- **무료 + 오픈소스** — 양쪽 모두 license 부담 없음.

## RISC-V 개발자가 *둘 다* 알아야 하는 이유

ARM 개발자는 QEMU만 알아도 됩니다. ARM ISA는 *spec*과 *실 구현*이 매우 안정적입니다. RISC-V는 그렇지 않습니다.

- 새 vector instruction이 *어제* spec에 추가되었을 수 있습니다. → spike가 먼저 구현.
- 어떤 ISA 확장이 *지원되는지* 정확히 알아야 합니다. → spike의 `--isa=...` 옵션.
- spec과 실 구현의 *어긋남*이 종종 발견됩니다. → spike와 QEMU의 결과를 비교.

이 변동성 때문에 RISC-V 개발자는 *양손에 두 도구*를 들고 시작합니다.

## 정리

- **spike**는 ISA reference, **QEMU**는 system emulator. 같은 ISA를 다른 방식으로 다룸.
- spike는 *느리지만 정확*, `--log-commits`로 매 명령의 side effect 완벽 dump.
- QEMU는 *빠르고 시스템*, 디바이스·디버거·Linux 부팅을 모두 지원.
- 컴파일러 backend 검증·새 확장 spec 검증은 spike. 펌웨어·Linux 개발은 QEMU.
- *Co-simulation*으로 두 도구의 결과를 diff하면 *서로의 버그*를 잡을 수 있음.
- RISC-V는 ARM과 달리 spec 변동성이 크므로 둘을 *모두* 알아야 함.

## 다음 장 예고

다음 장은 QEMU 자체를 *확장*하는 영역으로 들어갑니다. **커스텀 디바이스**를 QOM(QEMU Object Model)으로 추가해서 *자기 보드*를 모사하는 흐름입니다.

## 관련 항목

- [Ch 6: opentitan 머신](/blog/tools/emulation/qemu-riscv/chapter06-opentitan)
- [Ch 8: 커스텀 디바이스 추가](/blog/tools/emulation/qemu-riscv/chapter08-custom-device)
- [QEMU Internals — TCG Deep](/blog/tools/emulation/qemu-internals/chapter13-tcg-deep)
- [RISC-V ISA 해부](/blog/systems/riscv/isa-anatomy/chapter01-overview)
