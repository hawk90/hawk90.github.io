---
title: "Ch 7: Side-channel 공격 — 전력 / 타이밍 / EM"
date: 2026-05-08T08:00:00
description: "DPA / SPA / EM / fault injection. constant-time, masking, hiding 방어."
tags: [Side-channel, Power Analysis, Timing Attack, Fault Injection, ChipWhisperer]
series: "Embedded Security"
seriesOrder: 7
draft: false
---

## 한 줄 요약

> **"side-channel 공격은 *알고리즘이 틀린 것이 아니라 구현이 새는 것*입니다."** — AES-256이 수학적으로 안전해도, 비밀 키에 따라 전력 소모 곡선이 달라지면 *몇 천 번의 측정*으로 키 전체가 복원됩니다.

암호학은 *수학*이지만 *구현은 물리*입니다. 어떤 칩에서 비밀 키와 관련된 연산을 수행하면, 그 흔적이 *전력 소모*, *전자기 방출(EM)*, *연산 시간*, *캐시 상태*에 남습니다. 1996년 Paul Kocher의 *Timing Attacks*가 학계 첫 충격이었고, 1999년 *Differential Power Analysis*가 산업계 충격이었습니다. 이후 25년 동안 임베디드 보안 인증(EMVCo, CC EAL, FIPS 140-3)이 모두 side-channel 저항성을 핵심 평가 항목으로 다루고 있습니다.

이 장은 *공격자가 어떻게 키를 뽑아내는지* 그리고 *방어자가 무엇을 해야 하는지*를 균형 있게 봅니다. 공격 방법을 이해하지 못하면 방어가 비싸기만 하고 효과가 없는 경우가 많습니다.

## Side-channel의 분류 — 무엇이 새는가

| 채널 | 측정 대상 | 장비 | 거리 |
|------|---------|------|------|
| Power (SPA/DPA/CPA) | shunt 저항의 전압 강하 | oscilloscope + ChipWhisperer | 접촉 |
| EM (Electromagnetic) | 칩 위의 자기장 변화 | near-field probe + LNA | 0~수십 cm |
| Timing | 함수 실행 시간 | 정밀 타이머 / 원격 RTT | 원격 가능 |
| Cache | cache hit/miss 패턴 | 같은 CPU의 다른 프로세스 | 같은 머신 |
| Acoustic | CPU coil whine | 마이크 | 1~2m |
| Optical | LED 깜빡임, 광방출 | photodiode | 수 m |
| Fault | 의도적 결함 주입 | clock/voltage glitcher, laser | 접촉 |

임베디드에서는 *Power*와 *EM*이 가장 위험합니다. *접촉 가능*한 자리에 있는 디바이스(스마트카드, 차량 ECU, IoT 게이트웨이)는 누구나 분해해서 측정할 수 있습니다. *Timing*은 원격에서도 가능합니다.

## SPA — Simple Power Analysis

가장 쉬운 공격이고 가장 쉽게 막을 수 있는 공격입니다. SPA는 *전력 트레이스 한 두 개를 눈으로 보고* 키를 알아내는 방식입니다.

RSA의 *square-and-multiply* 구현을 예로 듭니다.

```c
// 취약한 RSA modular exponentiation
uint32_t rsa_exp(uint32_t base, uint32_t exp, uint32_t mod) {
    uint32_t result = 1;
    for (int i = 31; i >= 0; i--) {
        result = (result * result) % mod;       // square (항상 수행)
        if ((exp >> i) & 1) {
            result = (result * base) % mod;     // multiply (key bit가 1일 때만)
        }
    }
    return result;
}
```

전력 트레이스를 그려 보면 *square만 있는 구간*과 *square + multiply 구간*이 시각적으로 다릅니다. 비트가 1인 자리는 더 길고 더 많은 에너지를 소모합니다. 키가 256비트면 256개의 길이를 눈으로 읽으면 키가 그대로 드러납니다.

SPA 방어는 *조건 분기를 없애는 것*입니다.

```c
// SPA 저항 — always square-and-multiply
uint32_t rsa_exp_safe(uint32_t base, uint32_t exp, uint32_t mod) {
    uint32_t r[2] = { 1, 1 };
    for (int i = 31; i >= 0; i--) {
        r[0] = (r[0] * r[0]) % mod;
        r[1] = (r[0] * base) % mod;
        int bit = (exp >> i) & 1;
        r[0] = r[bit];   // 둘 다 항상 계산, 결과만 선택
    }
    return r[0];
}
```

두 분기를 *항상 수행*하고 결과 하나만 선택합니다. 메모리 접근 패턴까지 모두 같게 만들어야 의미가 있습니다.

## DPA / CPA — 통계적 공격

SPA로는 안 보이지만 *수천~수십만 번의 측정*을 통계로 처리하면 보입니다. DPA(Differential Power Analysis)는 측정 트레이스를 *가설된 키 비트*로 분류해 두 그룹의 평균 차이를 보고, CPA(Correlation Power Analysis)는 *Hamming weight 모델*과의 상관계수를 봅니다. CPA가 일반적으로 더 효율적입니다.

AES의 첫 SubBytes를 표적으로 한 CPA의 골격:

```text
for each candidate key byte k in [0..255]:
    for each trace i in [1..N]:
        hypothesis_h[i] = HammingWeight( SBOX( plaintext_byte[i] XOR k ) )
    correlation[k] = pearson( hypothesis_h, measured_power_at_time_t )
true_key_byte = argmax(correlation)
```

`pearson()`은 가설된 Hamming weight와 *실측 전력*의 상관계수입니다. 정답 키 후보에서 상관계수가 가장 높게 나옵니다. AES-128 키 16바이트를 *바이트 단위 독립적*으로 풀 수 있어, 키 길이의 *기하급수적 안전성*이 *선형 비용*으로 무너집니다.

**필요 트레이스 수 (참고):**

- 방어 없는 SW AES        ~500
- 방어 없는 HW AES        ~5,000
- 마스킹 1차              ~100,000
- 마스킹 2차 + hiding     ~10,000,000+

수치는 칩과 측정 조건에 크게 좌우됩니다만, *방어 없는 구현은 한나절이면 뚫린다*는 감각이 중요합니다.

## ChipWhisperer — 학습·검증 도구

NewAE의 ChipWhisperer는 *side-channel 학습과 평가의 표준 도구*가 되었습니다. ChipWhisperer-Lite/Nano/Husky가 가장 흔합니다. 하드웨어 자체가 *피크 sample을 trigger 신호로 동기화*해 주기 때문에, 일반 oscilloscope보다 적은 트레이스로 키가 복원됩니다.

```python
# ChipWhisperer Python API (요약)
import chipwhisperer as cw

scope = cw.scope()
target = cw.target(scope, cw.targets.SimpleSerial)
scope.default_setup()

key = bytes(range(16))
target.set_key(key)

traces = []
for i in range(5000):
    pt = os.urandom(16)
    scope.arm()
    target.simpleserial_write('p', pt)
    scope.capture()
    ct = target.simpleserial_read('r', 16)
    traces.append((pt, ct, scope.get_last_trace()))

# CPA analysis
import numpy as np
from chipwhisperer.analyzer import attacks

attack = attacks.cpa(traces, leak_model=AES128_round1_hw)
result = attack.run()
print("Recovered key:", result.key_guess)
```

자체 검증에 권장합니다. *우리 펌웨어*를 ChipWhisperer에 올려 5,000회 측정에서 키가 풀리면, 제품 출시 전 *방어 보강*이 필요한 것입니다.

## 방어 1 — Hiding (잡음 추가, 평탄화)

*신호 대 잡음비*를 떨어뜨리는 접근입니다. 공격이 불가능해지는 게 아니라 *훨씬 더 많은 측정*이 필요해집니다.

| 기법 | 설명 |
|------|------|
| Random delay | 함수 시작 전 임의 시간 대기. 트레이스 동기화를 어렵게. |
| Dummy operation | 실제 연산 사이에 가짜 연산 삽입. 평균 전력 평탄화. |
| Clock jitter | 클럭 주파수를 조금씩 흔듦. ChipWhisperer의 동기화를 깨뜨림. |
| Shuffling | AES SubBytes 16개의 순서를 매 호출 무작위. |
| Dual-rail logic | 모든 게이트가 한 사이클에 0→1과 1→0을 동시 수행. |

Hiding은 *상대적*입니다. 충분히 측정하면 결국 풀립니다. *masking*과 조합해야 의미가 있습니다.

## 방어 2 — Masking (수학적 분리)

*비밀 값*을 *둘 이상의 무작위 share*로 나누어 연산합니다. 어느 하나의 share만으로는 비밀과의 상관이 사라집니다.

1차 Boolean masking 예 (AES SubBytes):

```text
원본:    s = SBOX(x XOR k)
masked:  m = random()
         x' = x XOR m              ← masked input
         s' = SBOX_M(x', m)        ← masked SBOX (precomputed)
         s = s' XOR m              ← unmask (마지막에)
```

`SBOX_M`은 *마스크와 함께 동작하도록 재계산된 SBOX 테이블*입니다. 각 share는 *비밀 키에 대한 정보 없이* 무작위처럼 보입니다. 1차 마스킹은 *1차 DPA에는 안전*하지만 *2차 공격(트레이스 두 시점의 곱)*에는 깨집니다.

2차 이상 마스킹은 비용이 큽니다. 보통 *masking + hiding + shuffling*을 함께 씁니다.

## 방어 3 — Timing attack mitigation (constant-time)

원격에서 가능한 timing 공격은 *비밀에 의존하는 분기·메모리 접근*을 없애야 막힙니다.

```c
// Bad — early exit
bool memcmp_unsafe(const uint8_t *a, const uint8_t *b, size_t n) {
    for (size_t i = 0; i < n; i++) {
        if (a[i] != b[i]) return false;
    }
    return true;
}

// Good — constant-time
bool memcmp_ct(const uint8_t *a, const uint8_t *b, size_t n) {
    uint8_t diff = 0;
    for (size_t i = 0; i < n; i++) {
        diff |= a[i] ^ b[i];
    }
    return diff == 0;
}
```

암호 비교는 *항상* `memcmp_ct` 류를 씁니다. mbedTLS는 `mbedtls_ct_memcmp`, OpenSSL은 `CRYPTO_memcmp`, libsodium은 `sodium_memcmp`를 제공합니다.

같은 원칙이 *table lookup*에도 적용됩니다. AES의 T-table 구현은 캐시 timing 공격에 취약합니다. 캐시가 있는 CPU에서는 *bitsliced AES* 또는 *AES-NI*를 써야 안전합니다. MCU에서는 캐시가 없거나 직접 매핑이라 비교적 안전한 편입니다.

## Fault Injection — 다른 종류의 공격

*결함 주입*은 *신호를 측정*하는 것이 아니라 *연산을 망가뜨려 정보를 얻는* 공격입니다.

| 기법 | 효과 |
|------|------|
| Voltage glitching | 짧은 순간 전압 강하 → 한 인스트럭션 skip |
| Clock glitching | 클럭에 짧은 spike → 명령어 corrupt |
| EM injection | 강한 EM 펄스 → 특정 레지스터 flip |
| Laser fault injection | 패키지 decap 후 레이저 → 특정 트랜지스터 flip |
| Temperature attack | 극한 온도로 SRAM 값 보존 (cold boot) |

전형적 효과는 *분기 skip*입니다.

```c
if (signature_valid(image, signature)) {   // ← 여기서 glitch
    boot(image);
}
```

검증 분기를 *건너뛰게* 만들면, 서명이 잘못된 이미지도 부팅됩니다. *Trezor* 하드웨어 지갑이 2019년 voltage glitch로 PIN 인증을 우회당한 것이 유명한 사례입니다.

### Fault 방어

```c
// Bad — single check
if (!verify_signature(img)) return ERROR;
boot(img);

// Better — double-check + flow integrity
volatile int verified = 0;
if (verify_signature(img) != OK) goto fail;
verified++;
if (verify_signature(img) != OK) goto fail;   // 다시 확인
verified++;
if (verified != 2) goto fail;
random_delay();                                // glitch 동기화 방해
boot(img);
fail:
    panic();
```

핵심 패턴은 *redundant check + control flow integrity*입니다. `volatile`로 컴파일러 최적화도 차단합니다. ARM TrustZone-M의 `nspe`/`spe` 경계, Cortex-M Pointer Authentication(PACBTI)도 fault 저항성에 기여합니다.

## 인증과 표준

| 표준 | 평가 대상 |
|------|---------|
| FIPS 140-3 | 암호 모듈 (level 3 이상에서 side-channel 분석 일부) |
| Common Criteria EAL4+ AVA_VAN.5 | 고급 침투 분석 (DPA 포함) |
| EMVCo SC | 결제 카드 칩, DPA/CPA 평가 의무 |
| ISO/SAE 21434 | 자동차, *위협 분석*에 side-channel 포함 |
| CRYPTREC, BSI AIS 46 | 국가 단위 가이드 |

소비자 IoT는 인증이 의무가 아니어도, *공격자 모델*에 fault/SCA가 들어가면 RoT 칩에 *DPA 인증된 secure element*(NXP A1006, ATECC608, Microchip TA100)를 외장으로 두는 것이 일반적입니다.

## 자주 하는 실수

### 알고리즘만 보고 안전하다고 판단

"AES-256 쓰니까 안전합니다"는 *수학적 안전*입니다. side-channel 공격은 *구현 안전*입니다. 분리해서 평가합니다.

### masking만으로 충분하다고 가정

1차 마스킹은 *1차 DPA에만* 안전합니다. 2차 공격, EM, fault에 추가 방어가 필요합니다. *layer*로 쌓아야 의미가 있습니다.

### 비밀 비교에 `memcmp` 사용

`memcmp`는 early-exit입니다. 항상 *constant-time* 함수를 씁니다. crypto 라이브러리가 제공하는 것을 그대로 쓰는 것이 안전합니다.

### "공격자가 접근 못 함"이라는 가정

차량 ECU·스마트미터·게이트웨이는 *공격자가 분해할 수 있는* 자리에 놓입니다. *물리 접근 가능*이 default 가정입니다.

### 단일 분기로 보안 결정

서명 검증, PIN 비교, 인증 결과 같은 *생사 결정*을 단 한 번의 분기로 두면 glitch 한 방에 무너집니다. *redundant check*가 표준입니다.

### secure element를 RoT로만 쓰고 검증 로직은 MCU에서

MCU 검증 로직 자체가 glitch 표적입니다. 가능하면 *secure element 안에서 결정*을 끝내고 MCU는 결과만 받습니다.

## 정리

- side-channel은 *알고리즘이 아니라 구현*에서 새는 공격입니다.
- SPA는 한두 트레이스, DPA/CPA는 수천 트레이스로 키를 복원합니다.
- 방어는 *hiding + masking + constant-time + redundant check*의 layer로 쌓습니다.
- ChipWhisperer로 우리 펌웨어를 *우리가 먼저 공격*해 봐야 합니다.
- timing 공격은 원격에서도 가능합니다. 비밀 비교는 항상 constant-time.
- fault injection은 *분기 skip*이 전형입니다. redundant check + control flow integrity로 대응합니다.
- 인증을 받지 않더라도 *DPA-resistant secure element*를 RoT로 두는 것이 비용 대비 효과적입니다.
- 공격자 모델은 *물리 접근 가능*이 default입니다.

다음 편은 **Ch 8: IoT 표준 — ETSI EN 303 645 / IEC 62443**.

## 관련 항목

- [Ch 3: MCU Crypto — secure element, true RNG](/blog/embedded/embedded-security/chapter03-mcu-crypto)
- [Ch 4: TrustZone — secure/non-secure 분리](/blog/embedded/embedded-security/chapter04-trustzone)
- [Ch 6: OTA Update — 서명 검증의 fault 저항](/blog/embedded/embedded-security/chapter06-ota-update)
- [Practical RTOS Internals — Part 4-11: TrustZone & TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
- [원문 — Paul Kocher: Timing Attacks on Implementations of DH, RSA, DSS](https://www.paulkocher.com/doc/TimingAttacks.pdf)
- [원문 — Differential Power Analysis (Kocher, Jaffe, Jun, 1999)](https://www.paulkocher.com/doc/DifferentialPowerAnalysis.pdf)
- [원문 — ChipWhisperer Documentation](https://chipwhisperer.readthedocs.io/)
- [원문 — Mangard, Oswald, Popp: Power Analysis Attacks (book)](https://www.springer.com/gp/book/9780387308579)
