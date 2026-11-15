---
title: "임베디드 Side-channel 공격 — Power·Timing·EM 분석"
slug: "embedded/embedded-security/chapter07-side-channel"
date: 2026-05-21T09:07:00
description: "DPA / SPA / EM / fault injection. constant-time, masking, hiding 방어."
tags: [Side-channel, power-analysis, timing-attack, fault-injection, ChipWhisperer]
series: "Embedded Security"
seriesOrder: 7
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"side-channel 공격은 *알고리즘이 틀린 것이 아니라 구현이 새는 것*입니다."** — 비밀값과 연관된 전력·시간·EM 누출은 알고리즘의 수학적 강도와 별도로 분석해야 하며, 필요한 측정 수는 구현·장비·공격 조건에 따라 크게 달라집니다.

암호학은 *수학*이지만 *구현은 물리*입니다. 어떤 칩에서 비밀 키와 관련된 연산을 수행하면 그 흔적이 전력·전자기 방출(EM)·시간·캐시 상태에 남을 수 있습니다. 1996년 Paul Kocher의 *Timing Attacks*와 1999년 *Differential Power Analysis*는 구현 누출 연구의 대표 논문입니다. 평가 기준은 제도와 제품 종류별로 달라 모든 인증이 같은 부채널 요구사항을 둔다고 일반화하지 않습니다.

이 장은 *공격자가 어떻게 키를 뽑아내는지* 그리고 *방어자가 무엇을 해야 하는지*를 균형 있게 봅니다. 공격 방법을 이해하지 못하면 방어가 비싸기만 하고 효과가 없는 경우가 많습니다.

## Side-channel의 분류 — 무엇이 새는가

| 채널 | 측정 대상 | 장비 | 거리 |
|------|---------|------|------|
| Power (SPA/DPA/CPA) | shunt 저항의 전압 강하 | oscilloscope + ChipWhisperer | 접촉 |
| EM (Electromagnetic) | 칩 주변 전자기 방출 변화 | near-field probe 등 | 장비·패키지·환경별 |
| Timing | 함수 실행 시간 | 정밀 타이머 / 원격 RTT | 원격 가능 |
| Cache | cache hit/miss 패턴 | 같은 CPU의 다른 프로세스 | 같은 머신 |
| Acoustic | 연산과 연관된 음향 신호 | 마이크 | 환경별 |
| Optical | 장치에서 관찰 가능한 광방출 | 광 센서 | 환경별 |
| Fault | 의도적 결함 주입 | clock/voltage glitcher, laser | 접촉 |

물리적 노출 제품에서는 Power와 EM 분석을 위협 모델에 포함할 수 있습니다. 필요한 접근·장비·기술은 제품과 공격 가정에 따라 다르며, timing 누출도 원격 관찰이 가능한 인터페이스가 있을 때 검토합니다.

## SPA — 분기와 데이터 경로의 흔적

SPA는 개별 power trace의 구조에서 연산이나 비밀값 의존 패턴을 분석합니다. 항상 한두 trace로 키가 복원되거나 단순히 분기를 없애면 막히는 것은 아닙니다. [Kocher의 Timing Attacks](https://www.paulkocher.com/doc/TimingAttacks.pdf)는 입력·비밀값·실행 시간의 관계를 분석하고, [DPA 논문](https://www.paulkocher.com/doc/DifferentialPowerAnalysis.pdf)은 반복 측정의 통계적 접근을 설명합니다.

Square-and-multiply 지수승에서 지수 bit에 따라 multiply를 추가하면 연산 패턴이 달라집니다. 그러나 두 후보를 항상 계산해 mask로 고르는 형태도 compiler, 정수 연산 latency, memory access와 실제 power/EM 누출을 검토해야 합니다. 32-bit 곱셈이 overflow하는 작은 정수 코드를 RSA나 “SPA-safe” 구현으로 제시하지 않습니다. 실제 암호 연산에는 검증된 big-integer·blinding·constant-time 구현과 타깃 평가가 필요합니다.

## DPA / CPA — 통계적 공격

SPA에서 보이지 않는 누출도 반복 측정과 통계 분석으로 검출될 수 있습니다. DPA는 선택한 중간값 가설에 따른 그룹 통계 차이를 분석하고, CPA는 누출 모델과 측정값의 상관을 분석합니다. 성공률과 측정량은 보드·알고리즘·잡음·모델에 따라 달라집니다.

AES의 첫 SubBytes를 표적으로 한 CPA의 골격:

```text
for each candidate key byte k in [0..255]:
    for each trace i in [1..N]:
        hypothesis_h[i] = HammingWeight( SBOX( plaintext_byte[i] XOR k ) )
    correlation[k] = pearson( hypothesis_h, measured_power_at_time_t )
candidate_key_byte = argmax(abs(correlation))
```

`pearson()`은 가설된 Hamming weight와 *실측 전력*의 상관계수입니다. 적절한 모델·정렬·잡음 조건에서는 정답 후보가 큰 절댓값의 상관을 보일 수 있습니다. 측정 polarity에 따라 음의 상관도 있으므로 부호만으로 후보를 버리면 안 됩니다. AES-128 키 16바이트를 *바이트 단위 독립적*으로 풀 수 있어, 전체 키 brute force와 다른 가정으로 중간값을 추정합니다. 모든 구현에서 byte별 공격이 성공하거나 비용이 선형이라는 보장은 아닙니다.

정해진 보편 트레이스 수는 없습니다. 시험 보고서에는 target, compiler, capture setup, trace count, 성공 기준과 공격 모델을 명시해야 합니다.

## ChipWhisperer — 학습·검증 도구

NewAE의 ChipWhisperer는 side-channel 교육과 실험에 사용할 수 있는 공개 하드웨어·소프트웨어 제품군입니다. trigger와 capture 설정은 target firmware, scope와 API version에 따라 정합니다. 장비가 자동으로 최고점을 동기화하거나 적은 trace 수로 키를 복원한다고 보장하지 않습니다.

[NewAE Analyzer API](https://chipwhisperer.readthedocs.io/en/latest/analyzer-api.html)의 `cpa()`는 capture project와 leakage model을 사용합니다. 임의 tuple 목록과 정의되지 않은 `AES128_round1_hw`를 넘기는 코드를 실행 예로 쓰지 않습니다. 실제 장비에서는 firmware·SimpleSerial·scope·project 형식과 timeout·잘린 trace·응답 실패를 함께 처리해야 합니다.


평가 기록에는 target 보드, clock, trigger, probe 위치, firmware build, scope·analyzer version, trace 수와 성공 판정 기준을 남깁니다. 이 환경에서는 ChipWhisperer 장비나 MCU target에서 실행하지 않았습니다.

## 합성 데이터로 상관 계산만 확인하기

아래는 이 글의 Pearson 상관 함수입니다. 크기가 맞고 유한한 배열만 받아, 상수 벡터로 상관을 정의할 수 없으면 null을 반환합니다. 입력은 이 예의 작은 크기·동적 범위 안에서 사용하며 대규모 수치 계산의 안정성을 보증하는 통계 library가 아닙니다.

```js title="leakage-correlation.mjs"
export function pearson(x, y) {
  if (!Array.isArray(x) || !Array.isArray(y) ||
      x.length !== y.length || x.length < 2 ||
      !Array.from(x).every(Number.isFinite) ||
      !Array.from(y).every(Number.isFinite))
    throw new TypeError('equal finite arrays of length >= 2 required');
  const mean = a => a.reduce((sum, v) => sum + v, 0) / a.length;
  const mx = mean(x), my = mean(y);
  let covariance = 0, vx = 0, vy = 0;
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    covariance += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }
  return vx === 0 || vy === 0 ? null : covariance / Math.sqrt(vx * vy);
}
```

Mbed TLS 3.6.4 source의 AES S-box로 첫 byte의 Hamming-weight 후보를 만들고, 알려진 key byte 0x2b의 모델에 작은 결정적 잡음을 더한 합성 trace를 생성했습니다. 256개 후보의 절댓값 상관 순위, polarity 반전과 정렬 실패·상수 입력을 검사합니다. 생성 시 정답 모델을 심었으므로 실제 MCU의 키 복원이나 누출 발견을 입증하는 실험은 아닙니다.

## EM 측정에서 함께 남길 조건

Near-field probe의 위치·방향·높이, 증폭·filter·sampling rate와 trigger를 기록해야 같은 실험을 비교할 수 있습니다. 위치를 바꿔 신호가 커져도 key-dependent leakage가 커진 것과 같지는 않습니다. Clock·전원·다른 연산의 방출이 섞일 수 있으므로 known-key 조건과 독립적인 검증 trace에서 모델을 평가합니다. 이 작업에서는 EM 장비나 실제 power capture를 사용하지 않았습니다.

## 방어 1 — Hiding (잡음 추가, 평탄화)

*신호 대 잡음비*를 떨어뜨리는 접근입니다. 공격이 불가능해지는 게 아니라 *훨씬 더 많은 측정*이 필요해집니다.

| 기법 | 설명 |
|------|------|
| Random delay | 함수 시작 전 임의 시간 대기. 트레이스 동기화를 어렵게. |
| Dummy operation | 추가 연산이 누출과 비용 분석을 바꾸지만 전력 평탄화를 보장하지 않습니다. |
| Clock variation | 측정 정렬을 어렵게 할 수 있지만 재동기화 공격을 막지는 않습니다. |
| Shuffling | 독립 작업의 순서를 섞는 기법으로 알고리즘별 적용 가능성과 누출을 평가합니다. |
| Balanced logic | 특정 회로 구현 기법이며 소프트웨어만으로 모든 gate의 균형을 만들 수 없습니다. |

Hiding은 *상대적*입니다. 측정 수만 늘리면 반드시 키가 복원된다는 뜻은 아닙니다. 공격 모델·성능 비용과 다른 countermeasure를 포함해 효과를 평가해야 합니다.

## 방어 2 — Masking (수학적 분리)

*비밀 값*을 *둘 이상의 무작위 share*로 나누어 연산합니다. 어느 하나의 share만으로는 비밀과의 상관이 사라집니다.

Boolean masking은 비밀값을 여러 share로 표현하고 각 연산을 share 영역에서 수행하는 구현 기법입니다. AES S-box는 입력·키 share와 fresh randomness를 고려한 검증된 masked circuit/lookup을 사용해야 합니다. 입력을 XOR한 뒤 원래 S-box를 적용하거나 출력에 같은 mask를 XOR하는 것만으로는 올바른 masked AES가 되지 않습니다. 보호 수준은 공격 모델과 구현 검증에 따라 달라집니다.

2차 이상 마스킹은 비용이 큽니다. 보통 *masking + hiding + shuffling*을 함께 씁니다.

## 방어 3 — Timing attack mitigation (constant-time)

원격에서 가능한 timing 공격은 *비밀에 의존하는 분기·메모리 접근*을 없애야 막힙니다.

일반 memcmp의 조기 종료를 비밀 비교에 의존하지 않습니다. 검증된 library의 비교 함수와 전체 호출 경로를 사용합니다. [Ch 3](/blog/embedded/embedded-security/chapter03-mcu-crypto)의 실제 Mbed TLS 3.6.4 `mbedtls_ct_memcmp()` 기능 검사는 입력 동일·차이를 확인한 것이며, MCU에서 timing leak이 없다는 증거는 아닙니다. Homemade C loop도 compiler 변환·주변 코드·target의 영향을 받습니다.

같은 원칙이 *table lookup*에도 적용됩니다. AES의 비밀값 의존 T-table lookup은 일부 캐시 구조에서 timing 누출을 만들 수 있습니다. 대안 구현의 안전성은 CPU·library·compiler에 맞춰 평가하며, MCU가 캐시가 없거나 직접 매핑이라는 이유만으로 부채널 안전하다고 보지 않습니다.

## Fault Injection — 다른 종류의 공격

*결함 주입*은 *신호를 측정*하는 것이 아니라 *연산을 망가뜨려 정보를 얻는* 공격입니다.

| 기법 | 효과 |
|------|------|
| Voltage glitching | 짧은 순간 전압 강하 → 한 인스트럭션 skip |
| Clock glitching | 클럭에 짧은 spike → 명령어 corrupt |
| EM injection | 강한 EM 펄스 → 특정 레지스터 flip |
| Laser fault injection | 패키지 decap 후 레이저 → 특정 트랜지스터 flip |
| 환경 교란 | 전압·clock·온도 등의 조건에서 실제 오류 모델을 따로 규정 |

전형적 효과는 *분기 skip*입니다.

```c
if (signature_valid(image, signature)) {   // ← 여기서 glitch
    boot(image);
}
```

검증 분기가 건너뛰어지는 fault가 성공하면 잘못된 이미지가 통과할 수 있습니다. 구체적인 제품 사건과 연도는 원 보고서가 확인되지 않아 여기서는 사례로 단정하지 않습니다.

### Fault 방어

서명 검증 실패 시 fail-closed 동작, 제어 흐름 보호, 독립 검증 경로, fault 감지와 recovery 정책을 threat model에 맞게 설계합니다. 동일 검증을 두 번 호출하거나 `volatile` 변수를 쓴다고 glitch 저항성이 보장되지 않습니다. Arm security-state 경계와 pointer-authentication 기능도 해당 코어 지원 범위와 fault 모델에 맞춰 별도 평가합니다.

Cold boot의 메모리 잔류 관찰은 실행 중 fault injection과 같은 분류로 묶지 않습니다. Glitch가 언제나 한 instruction이나 특정 bit를 원하는 대로 바꾸는 것도 아닙니다.

## 인증과 표준

[FIPS 140-3](https://csrc.nist.gov/pubs/fips/140-3/final)는 암호 모듈 검증의 기준이며 적용 security level·관련 문서·certificate 범위를 확인해야 합니다. Common Criteria도 EAL 숫자만으로 특정 DPA·fault 시험 통과를 추론하지 않고, 실제 Security Target·assurance component와 평가 범위를 읽습니다. 서로 다른 인증을 같은 물리 공격 내성 등급표로 바꾸지 않습니다.

제품 위협 모델에 fault/SCA가 포함되면 secure element 사용 여부와 평가 수준을 요구사항으로 검토할 수 있습니다. 특정 제품의 인증·DPA 저항성은 모델별 공개 평가 자료로 확인해야 합니다.

## 자주 하는 실수

### 알고리즘만 보고 안전하다고 판단

"AES-256 쓰니까 안전합니다"는 *수학적 안전*입니다. side-channel 공격은 *구현 안전*입니다. 분리해서 평가합니다.

### masking만으로 충분하다고 가정

마스킹 효과는 구체적인 구현, leakage model과 평가 범위로 검증해야 합니다. 공격 차수만으로 안전성을 확정하지 않습니다.

### 비밀 비교에 `memcmp` 사용

`memcmp`는 early-exit입니다. 항상 *constant-time* 함수를 씁니다. crypto 라이브러리가 제공하는 것을 그대로 쓰는 것이 안전합니다.

### "공격자가 접근 못 함"이라는 가정

차량 ECU·스마트미터·게이트웨이는 물리 접근 가능성을 위협 모델에서 검토합니다. 기본 가정은 제품 배치와 운영 환경으로 정합니다.

### 단일 분기로 보안 결정

단일 fault가 보안 결정에 미치는 영향을 평가하고 검증 실패 시 안전한 상태로 전환되도록 설계합니다. 중복 검사만으로 fault 저항성을 보장하지 않습니다.

### secure element를 RoT로만 쓰고 검증 로직은 MCU에서

MCU 검증 로직 자체가 glitch 표적입니다. Secure element 내부 검증도 결과를 받은 MCU의 실행 결정이 fault로 우회될 수 있습니다. 검증 주체부터 실제 boot·접근 제어까지 전체 제어 흐름을 평가해야 합니다.

## 정리

- side-channel은 *알고리즘이 아니라 구현*에서 새는 공격입니다.
- SPA/DPA/CPA의 관측량과 성공률은 실험 조건 및 구현에 따라 달라집니다.
- 방어는 *hiding + masking + constant-time + redundant check*의 layer로 쌓습니다.
- ChipWhisperer로 우리 펌웨어를 *우리가 먼저 공격*해 봐야 합니다.
- timing 공격은 원격에서도 가능합니다. 비밀 비교는 항상 constant-time.
- fault injection은 여러 오류 모델을 포함합니다. fail-closed 정책과 검증된 countermeasure를 제품별로 평가합니다.
- secure element는 위협 모델과 제품 평가 근거가 있을 때 후보로 검토합니다.
- 물리 접근 가정은 제품의 배치·수명·운영 조건에 근거해 명시합니다.

다음 편은 **Ch 8: IoT 표준 — ETSI EN 303 645 / IEC 62443**.

## 관련 항목

- [Ch 3: MCU 크립토 — API와 가속기 검증](/blog/embedded/embedded-security/chapter03-mcu-crypto)
- [Ch 4: TrustZone — secure/non-secure 분리](/blog/embedded/embedded-security/chapter04-trustzone)
- [Ch 6: OTA Update — 서명·counter·복구 정책](/blog/embedded/embedded-security/chapter06-ota-update)
- [Practical RTOS Internals — Part 4-11: TrustZone & TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
- [원문 — Paul Kocher: Timing Attacks on Implementations of DH, RSA, DSS](https://www.paulkocher.com/doc/TimingAttacks.pdf)
- [원문 — Differential Power Analysis (Kocher, Jaffe, Jun, 1999)](https://www.paulkocher.com/doc/DifferentialPowerAnalysis.pdf)
- [원문 — ChipWhisperer Documentation](https://chipwhisperer.readthedocs.io/)
- [원문 — Mangard, Oswald, Popp: Power Analysis Attacks (book)](https://www.springer.com/gp/book/9780387308579)
