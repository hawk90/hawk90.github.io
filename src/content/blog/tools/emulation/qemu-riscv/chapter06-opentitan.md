---
title: "Ch 6: opentitan 머신"
date: 2026-05-17T00:00:00
description: "QEMU opentitan — 보안 칩 에뮬레이션, ROM 부팅을 다룬다."
series: "RISC-V QEMU 심화"
seriesOrder: 6
tags: [RISC-V, QEMU, OpenTitan, Security, Root-of-Trust, Ibex]
draft: true
---

**OpenTitan**은 Google이 lowRISC와 함께 주도하는 *오픈소스 Root-of-Trust* 프로젝트입니다. 부트 무결성·키 보관·암호 가속을 한 칩에 담은 마이크로컨트롤러로, 기존의 *closed* TPM/secure-element를 *open-source*로 대체하려는 시도입니다. QEMU의 `opentitan` 머신은 그 칩을 모사합니다.

이 장은 OpenTitan의 의도, QEMU에서의 머신 구성, 보안 부팅과 암호 가속기 모델까지 다룹니다. 보안 펌웨어 개발을 *실 칩 없이* 시작하고 싶을 때의 표준 환경입니다.

## OpenTitan이 무엇인가

배경부터.

| 항목 | 값 |
|------|-----|
| 주도 | Google (lowRISC, ETH Zurich 등과 공동) |
| 시작 | 2019 |
| 라이선스 | Apache-2.0 (RTL·SW 모두) |
| 코어 | Ibex (RV32IMC + 보안 확장) |
| 목적 | 보안 부팅·키 관리·암호 가속의 *open* 구현 |

기존 secure element(예: TPM 2.0 칩)는 *closed*입니다. 어떻게 동작하는지·어떤 측면 채널에 취약한지가 *벤더 비공개*. OpenTitan은 *RTL부터 SW까지 모두 공개*해서 감사 가능한 보안 칩을 만들자는 의도입니다.

## QEMU의 OpenTitan 머신

```bash
qemu-system-riscv32 -machine opentitan -nographic \
    -kernel boot_rom.elf
```

QEMU의 `opentitan` 머신은 OpenTitan의 *Earlgrey* 칩 구성을 따라갑니다.

| 항목 | 값 |
|------|-----|
| CPU | Ibex (RV32IMC + Zicsr/Zicntr) |
| 클럭 | emulation |
| ROM | 32KB Boot ROM |
| Main RAM | 128KB |
| Ret RAM | 4KB Retention SRAM |
| Flash | 1MB Data flash |
| Crypto | AES, HMAC, KMAC, OTBN(elliptic curve), CSRNG |

OpenTitan의 부팅 흐름은 *측정된 부트*(measured boot)에 가깝습니다 — 각 단계가 다음 단계의 해시를 *측정*하고 OTBN/HMAC을 통해 인증합니다. 이 흐름이 QEMU에서 *부분적으로* 동작합니다(부트 시퀀스 자체는 동작, 실 HW 측정은 모사).

## 메모리 맵

OpenTitan의 핵심 영역.

| 주소 | 영역 |
|------|------|
| `0x0000_0000` | ROM (Boot ROM) |
| `0x1000_0000` | SRAM (main) |
| `0x1001_0000` | SRAM (retention) |
| `0x2000_0000` | Flash (data) |
| `0x4000_0000` | Peripherals 시작 |
| `0x4000_0000` | UART |
| `0x4001_0000` | GPIO |
| `0x4002_0000` | SPI Device |
| `0x4004_0000` | I2C |
| `0x4011_0000` | AES |
| `0x4012_0000` | HMAC |
| `0x4011_8000` | KMAC |
| `0x4015_0000` | OTBN |
| `0x4014_0000` | CSRNG, EDN, Entropy |
| `0x4015_4000` | RV_TIMER |
| `0x4115_0000` | LC_CTRL (Life Cycle) |

`LC_CTRL`(Life Cycle Controller)이 OpenTitan의 특이점입니다. 칩의 lifecycle을 상태로 관리해 *생산 → 개발 → RMA → 사용 종료* 같은 상태 전이를 제어합니다. QEMU에서도 이 controller가 모델링되어 있어서 부트 시퀀스의 정책 분기를 시험할 수 있습니다.

## OpenTitan ROM 부팅

OpenTitan의 ROM은 *고정 코드*입니다. 그 코드가 *다음 단계*(ROM_EXT, BL0, OWNER 등)를 해시·서명 검증한 뒤 jump합니다. QEMU에서는 이 ROM을 직접 빌드한 binary로 교체할 수 있습니다.

```bash
# OpenTitan 저장소
git clone https://github.com/lowRISC/opentitan.git
cd opentitan

# bazel로 ROM 빌드 (의존성 많음)
./bazelisk.sh build //sw/device/silicon_creator/rom

# 결과 ROM ELF
ls bazel-bin/sw/device/silicon_creator/rom/rom_with_fake_keys_sim_dv.elf
```

QEMU에서 실행:

```bash
qemu-system-riscv32 -machine opentitan -nographic \
    -kernel rom_with_fake_keys_sim_dv.elf
```

`sim_dv`는 *DV(Design Verification) 시뮬레이션용 키*가 들어간 ROM이라는 뜻으로, 디버깅에 자유롭게 쓸 수 있습니다.

## 주변 장치 모델

QEMU opentitan이 모사하는 peripheral.

| 디바이스 | 충실도 | 비고 |
|----------|--------|------|
| UART | 충실 | 콘솔 출력 |
| GPIO | 부분 | input/output |
| SPI Device | 부분 | host와의 통신 |
| AES | 부분 | block-level 모델, 실 timing 아님 |
| HMAC | 부분 | SHA-256 기반 |
| KMAC | 부분 | Keccak-MAC |
| OTBN | 미흡 | elliptic curve 가속기, 실 구현 일부만 |
| CSRNG/EDN/Entropy | 부분 | 의사 난수 |
| RV_TIMER | 충실 | counter, IRQ |
| LC_CTRL | 부분 | state 전이 가능 |
| OTP_CTRL | 부분 | one-time programmable memory |

암호 가속기는 *기능적*으로 동작합니다 — AES register에 key/data를 쓰면 결과가 나옵니다. 하지만 *side-channel resistance*나 *cycle-accurate timing* 같은 보안 관련 동작은 모사되지 않습니다.

## 부트 ROM의 역할

OpenTitan ROM 코드의 큰 흐름.

```text
Reset
  │
  ▼
[1] Hardware setup
    - PLL, clock dividers
    - SRAM scrubbing/init
    - Stack/heap 설정
  │
  ▼
[2] Boot policy
    - Life Cycle 상태 확인
    - 다음 단계 slot 결정 (A/B)
    - Anti-rollback counter 확인
  │
  ▼
[3] ROM_EXT 검증
    - SHA-256 측정
    - RSA-3072 서명 검증
    - 측정값을 ePMP/HMAC에 보관
  │
  ▼
[4] Jump to ROM_EXT
    - 권한 축소(M-mode 유지)
    - 인터럽트 활성화
```

이 흐름이 QEMU에서 *그대로* 실행됩니다 — fake key를 사용하더라도 서명 검증 코드는 동일하게 동작.

## 암호 가속기 사용

AES 가속기에 데이터를 보내는 베어메탈 코드 예.

```c
#define AES_BASE          0x41110000
#define AES_CTRL_SHADOWED (*(volatile uint32_t *)(AES_BASE + 0x0C))
#define AES_KEY_SHARE0_0  (*(volatile uint32_t *)(AES_BASE + 0x14))
#define AES_DATA_IN_0     (*(volatile uint32_t *)(AES_BASE + 0x54))
#define AES_DATA_OUT_0    (*(volatile uint32_t *)(AES_BASE + 0x64))
#define AES_STATUS        (*(volatile uint32_t *)(AES_BASE + 0x84))

void aes_encrypt_block(const uint32_t *key, const uint32_t *pt, uint32_t *ct) {
    // Configure: ECB, 128-bit key, encrypt
    AES_CTRL_SHADOWED = 0x00000041;
    AES_CTRL_SHADOWED = 0x00000041;  // Shadow register: 2 writes

    // Load key
    for (int i = 0; i < 4; i++) {
        (&AES_KEY_SHARE0_0)[i] = key[i];
    }

    // Wait for IDLE
    while (!(AES_STATUS & 0x1)) ;

    // Write input
    for (int i = 0; i < 4; i++) {
        (&AES_DATA_IN_0)[i] = pt[i];
    }

    // Wait for OUTPUT_VALID
    while (!(AES_STATUS & 0x4)) ;

    // Read output
    for (int i = 0; i < 4; i++) {
        ct[i] = (&AES_DATA_OUT_0)[i];
    }
}
```

QEMU에서 이 코드를 실행하면 *실 AES 알고리즘*이 적용된 결과가 돌아옵니다. 따라서 *함수 로직*은 검증되지만, *실 HW의 side channel*은 검증되지 않습니다.

## Shadow register

OpenTitan 보안 register의 큰 특징: **shadowed register**. 같은 값을 *두 번* 써야 적용됩니다. 이는 single-bit fault attack을 완화하기 위함.

```c
AES_CTRL_SHADOWED = 0x41;
AES_CTRL_SHADOWED = 0x41;  // 같은 값을 다시 — 다르면 적용 안 됨
```

QEMU의 모델은 이 동작도 모사합니다. shadow register 검증 로직을 시험해 볼 수 있습니다.

## Life Cycle Controller

LC_CTRL은 칩의 *생애 단계*를 추적합니다.

| 상태 | 의미 |
|------|------|
| `RAW` | wafer에서 막 나온 상태 |
| `TEST_UNLOCKED` | 시험용, 디버그 가능 |
| `DEV` | 개발용, 일부 디버그 |
| `PROD` | 양산, 디버그 비활성 |
| `RMA` | 반품·분석, debug 재활성 |
| `SCRAP` | 폐기 |

각 상태 전이가 *돌이킬 수 없음*. fuse(OTP)에 burn되어야 하므로 실 칩에서는 한 번 PROD로 가면 디버그가 영구히 막힙니다. QEMU 모델에서는 *시뮬레이션*이므로 자유롭게 전이를 시험할 수 있어, 정책 분기 테스트에 유용합니다.

## ROM ↔ ROM_EXT ↔ BL0 ↔ Owner

OpenTitan의 부팅 chain은 보통 4단계:

```text
ROM            ← 칩 안에 박힌 silicon creator의 코드
  ↓ 측정 + 서명 검증
ROM_EXT        ← silicon creator의 업데이트 가능한 layer
  ↓ 측정 + 서명 검증
BL0            ← silicon owner의 부트로더
  ↓ 측정 + 서명 검증
Owner code     ← 최종 application
```

각 단계는 *다음* 단계를 *측정·검증*하므로 *어떤 단계에서 변조가 일어나도* 그 다음 단계가 검출합니다. *chain of trust*가 형성됩니다.

QEMU 환경에서는 fake key로 chain을 구성해서 *부팅 흐름*과 *측정 메커니즘*을 디버깅합니다. 실 키는 *실 silicon*에서만 의미가 있습니다.

## 보안 펌웨어 개발 시나리오

QEMU opentitan이 가장 빛나는 시나리오.

- **부팅 chain 로직 디버깅** — ROM_EXT의 새로운 anti-rollback 정책을 시험.
- **암호 라이브러리 통합** — silicon owner의 *application*이 HW AES/HMAC을 어떻게 호출하는지.
- **Life Cycle 정책 분기** — TEST_UNLOCKED와 PROD에서 *디버그 노출 차이*가 의도대로인지.
- **Anti-rollback** — 카운터 값 조작에 코드가 어떻게 반응하는지.

실 칩(올해 일부 EU 시제품)이 손에 들어오기 *전*에 1년 단위로 펌웨어 개발이 진행되는 영역입니다. QEMU 모델이 그 사이의 다리.

## 흔한 함정

- **shadow register 위반** — 한 번만 쓰면 register가 적용 안 되어 *조용히* 동작 X. 디버깅 어려움.
- **bazel build 복잡** — OpenTitan 빌드 시스템이 무겁고 cross-tool 의존성이 많음. Docker로 우회 권장.
- **OTBN 미흡 모델** — ECC 가속이 필요하면 QEMU 모델로 부족. 실 RTL simulator나 실 칩 필요.
- **boot ROM 직접 수정 어려움** — 실 OpenTitan은 ROM이 *fuse*. QEMU에서는 ELF 교체 가능하지만 실 환경에서는 불가.

## 정리

- **OpenTitan**은 *오픈소스 Root-of-Trust*. RTL부터 SW까지 모두 공개된 보안 마이크로컨트롤러.
- QEMU `opentitan` 머신은 Ibex 코어 + AES/HMAC/KMAC/OTBN 가속기 + LC_CTRL을 모사.
- 부팅 chain은 ROM → ROM_EXT → BL0 → Owner, 각 단계가 *측정·서명 검증*.
- Shadow register·LC 상태 전이·anti-rollback 같은 *정책 메커니즘*을 시험할 수 있음.
- 암호 가속기는 *기능적*으로만 동작 — side channel·timing은 모사 X.
- 실 칩 도착 전 *부트 정책과 펌웨어 로직*을 1년 단위로 개발하는 데 적합.

## 다음 장 예고

다음 장은 *경쟁 도구* 시각으로 **spike vs QEMU**를 비교합니다. ISA 레퍼런스 시뮬레이터와 시스템 에뮬레이터가 어떻게 다르고, 언제 어느 쪽을 골라야 하는지.

## 관련 항목

- [Ch 5: sifive_u 머신](/blog/tools/emulation/qemu-riscv/chapter05-sifive-u)
- [Ch 7: spike vs QEMU](/blog/tools/emulation/qemu-riscv/chapter07-spike-vs-qemu)
- [Embedded Security](/blog/embedded/embedded-security/chapter01-threat-model) — 보안 펌웨어 일반
- [JSF C++](/blog/embedded/aerospace-standards/jsf-cpp/chapter01-introduction) — 보안 코드 표준과의 비교
