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

> **"side-channel 공격은 *알고리즘이 틀린 것이 아니라 구현이 새는 것*입니다."** — 비밀값과 연관된 전력·시간·EM 누출은 알고리즘의 수학적 강도와 별도로 분석합니다. 필요한 측정 수는 몇 자리씩 차이가 납니다. Kocher의 1999년 DPA 논문은 smart card의 DES를 1,000개 trace로 보여 주면서, 개선한 template DPA는 대부분의 smart card에서 15개 미만의 trace로 DES key를 찾는다고 적습니다.

암호학은 *수학*이지만 *구현은 물리*입니다. 어떤 칩에서 비밀 키와 관련된 연산을 수행하면 그 흔적이 전력·전자기 방출(EM)·시간·캐시 상태에 남을 수 있습니다. 1996년 Paul Kocher의 *Timing Attacks on Implementations of Diffie-Hellman, RSA, DSS, and Other Systems*와 1999년 Kocher·Jaffe·Jun의 *Differential Power Analysis*가 이 분야의 출발점입니다.

이 장은 *공격자가 어떻게 키를 뽑아내는지* 그리고 *방어자가 무엇을 해야 하는지*를 함께 봅니다. 공격이 무엇을 재는지 알아야 방어가 그 측정을 실제로 방해하는지 판단할 수 있습니다.

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

Power·EM·Fault는 장치를 손에 쥔 공격자([Ch 1](/blog/embedded/embedded-security/chapter01-threat-model)의 Level 4)를 가정합니다. Timing은 다릅니다. 응답 시간을 잴 수 있는 network interface만 있으면 원격으로도 성립합니다. 아래 cache timing 절의 Bernstein 실험이 그 예입니다.

## SPA — 분기와 데이터 경로의 흔적

SPA는 trace 하나(또는 몇 개)의 모양에서 실행 경로를 읽습니다. [DPA 논문](https://www.paulkocher.com/doc/DifferentialPowerAnalysis.pdf)의 Figure 3은 3.5714 MHz로 도는 smart card의 7 clock cycle을 확대해, jump를 한 경우와 안 한 경우의 trace가 6번째 cycle에서 갈라지는 것을 보여 줍니다. 논문은 DES key schedule에서 28-bit register를 회전하며 밀려난 bit를 조건 분기로 검사하면, bit가 1일 때와 0일 때 SPA로 구분되는 흔적이 남는다고 설명합니다. [Kocher의 Timing Attacks](https://www.paulkocher.com/doc/TimingAttacks.pdf)는 같은 실행 경로 차이를 전력 대신 실행 시간으로 읽습니다.

Square-and-multiply 지수승에서 지수 bit에 따라 multiply를 추가하면 연산 패턴이 달라집니다. 그러나 두 후보를 항상 계산해 mask로 고르는 형태도 compiler, 정수 연산 latency, memory access와 실제 power/EM 누출을 검토해야 합니다. 32-bit 곱셈이 overflow하는 작은 정수 코드를 RSA나 “SPA-safe” 구현으로 제시하지 않습니다. 실제 암호 연산에는 검증된 big-integer·blinding·constant-time 구현과 타깃 평가가 필요합니다.

## DPA / CPA — 통계적 공격

SPA로 안 보이는 작은 누출은 trace를 많이 모아 평균을 내면 드러납니다. DPA는 key 후보로 계산한 중간값 bit 하나로 trace를 두 그룹으로 나누고 두 평균의 차이를 봅니다. 차이가 튀는 후보가 정답입니다. 논문의 DES 예는 1,000개 trace를 썼습니다. CPA는 Brier·Clavier·Olivier의 [CHES 2004 논문](https://www.iacr.org/archive/ches2004/31560016/31560016.pdf)이 정리한 방법으로, 그룹을 나누는 대신 누출 모델(논문은 Hamming distance)과 측정값의 상관계수를 씁니다.

AES의 첫 SubBytes를 표적으로 한 CPA의 골격:

```text
for each candidate key byte k in [0..255]:
    for each trace i in [1..N]:
        hypothesis_h[i] = HammingWeight( SBOX( plaintext_byte[i] XOR k ) )
    correlation[k] = pearson( hypothesis_h, measured_power_at_time_t )
candidate_key_byte = argmax(abs(correlation))
```

`pearson()`은 가설된 Hamming weight와 *실측 전력*의 상관계수입니다. Probe 방향이 반대면 상관의 부호가 뒤집히므로 후보는 절댓값으로 고릅니다. 이 공격이 무서운 이유는 분할 정복입니다. AES-128 키 전체는 2^128개지만, 첫 round의 S-box 입력은 key byte 하나에만 의존하므로 16개 byte를 각각 256개 후보로 따로 풀면 됩니다. 아래 합성 실험이 이 골격을 그대로 실행합니다.

## ChipWhisperer — 학습·검증 도구

NewAE의 ChipWhisperer는 side-channel 교육·실험용 공개 하드웨어·소프트웨어입니다. Target MCU가 trigger pin을 올리는 순간부터 scope가 전력을 기록하고, 분석 library가 위 CPA를 돌립니다. [ChipWhisperer Analyzer API 문서](https://chipwhisperer.readthedocs.io/en/latest/analyzer-api.html)의 진입점은 `chipwhisperer.analyzer.CPA(project, leakage_model, subkeys)` class입니다. `project`는 trace와 plaintext·ciphertext를 담은 capture project이고, 문서는 "현재 analyzer는 leakage model 하나만 지원한다"며 `leakage_models.sbox_output`을 듭니다. 평가 기록에는 target 보드, clock, trigger, probe 위치, firmware build, scope·analyzer version, trace 수와 성공 판정 기준을 남깁니다. 이 글에서는 ChipWhisperer 장비나 MCU target에서 실행하지 않았습니다.

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

이 함수를 Node v24.21.0에서 돌렸습니다. S-box는 Mbed TLS 3.6.4 `library/aes.c`의 `FSb[256]`을 그대로 읽었고, key byte `0x2b`로 HW(S-box(p ⊕ key))를 만든 뒤 고정 seed LCG로 만든 균등 잡음을 더해 합성 trace를 만들었습니다. 256개 후보를 절댓값 상관으로 정렬한 결과입니다.

출력 중 일부입니다.

```text
node v24.21.0, N=200, key byte 0x2b, noise uniform +-2
normal: top=0x2b:0.828 0x77:0.290 0x14:-0.277 | 0x2b rank=1
polarity inverted: top=0x2b:-0.828 0x77:-0.290 0x14:0.277 | 0x2b rank=1
misaligned by 1 trace: top=0xef:-0.173 0xe6:0.162 0x30:-0.159 | 0x2b rank=60
constant trace -> null
noise +-16, traces=25: 0x2b rank=9 corr=0.392 best_wrong=-0.560
noise +-16, traces=100: 0x2b rank=26 corr=0.162 best_wrong=-0.291
noise +-16, traces=200: 0x2b rank=34 corr=0.104 best_wrong=-0.215
noise +-16, traces=400: 0x2b rank=1 corr=0.143 best_wrong=0.138
noise +-16, traces=800: 0x2b rank=1 corr=0.112 best_wrong=-0.108
noise +-16, traces=2000: 0x2b rank=1 corr=0.121 best_wrong=0.058
```

잡음이 ±2일 때는 정답이 0.828로 2등(0.290)과 크게 떨어집니다. Polarity를 뒤집어도 절댓값 순위는 같습니다. Plaintext와 trace를 한 칸만 어긋나게 짝지으면 정답은 60등으로 밀립니다. Trigger가 흔들려 trace 정렬이 깨지면 CPA가 무너지는 이유입니다. 잡음을 ±16으로 키우면 200개로는 34등이고, 400개에서 처음 1등이 되지만 오답(0.138)과의 차이가 0.005뿐입니다. 2,000개가 되어서야 0.121 대 0.058로 벌어집니다. HW의 분산이 2, ±16 균등 잡음의 분산이 32²/12 ≈ 85.3이므로 기대 상관은 √(2/87.3) ≈ 0.15이고, 측정값 0.12~0.14가 그 근처입니다. 정답 모델을 심어 만든 데이터이므로 실제 MCU의 키 복원 실험은 아닙니다.

## EM 측정에서 함께 남길 조건

Near-field probe의 위치·방향·높이, 증폭·filter·sampling rate와 trigger를 기록해야 같은 실험을 비교할 수 있습니다. 위치를 바꿔 신호가 커져도 key-dependent leakage가 커진 것과 같지는 않습니다. Probe가 key와 무관한 clock·전원 회로의 방출도 함께 잡기 때문입니다. 그래서 key를 아는 장치로 모델을 맞추고, 그 모델을 따로 모은 trace에서 다시 확인합니다. 이 글에서는 EM 장비나 실제 power capture를 쓰지 않았습니다.

## 방어 1 — Hiding (잡음 추가, 평탄화)

*신호 대 잡음비*를 떨어뜨리는 접근입니다. 공격이 불가능해지는 게 아니라 *훨씬 더 많은 측정*이 필요해집니다.

| 기법 | 설명 |
|------|------|
| Random delay | 함수 시작 전 임의 시간 대기. 트레이스 동기화를 어렵게. |
| Dummy operation | 추가 연산이 누출과 비용 분석을 바꾸지만 전력 평탄화를 보장하지 않습니다. |
| Clock variation | 측정 정렬을 어렵게 할 수 있지만 재동기화 공격을 막지는 않습니다. |
| Shuffling | 독립 작업의 순서를 섞는 기법으로 알고리즘별 적용 가능성과 누출을 평가합니다. |
| Balanced logic | 특정 회로 구현 기법이며 소프트웨어만으로 모든 gate의 균형을 만들 수 없습니다. |

Hiding은 *상대적*입니다. 위 합성 실험에서 잡음을 ±2에서 ±16으로 키우자 정답이 안정적으로 1등이 되는 데 필요한 trace가 10개 이하에서 수백~2,000개로 늘었습니다. 잡음은 공격을 막지 않고 비용을 올립니다.

## 방어 2 — Masking (수학적 분리)

*비밀 값*을 *둘 이상의 무작위 share*로 나누어 연산합니다. 어느 하나의 share만으로는 비밀과의 상관이 사라집니다.

Boolean masking은 비밀값을 여러 share로 표현하고 각 연산을 share 영역에서 수행하는 구현 기법입니다. AES S-box는 입력·키 share와 fresh randomness를 고려한 검증된 masked circuit/lookup을 사용해야 합니다. 입력을 XOR한 뒤 원래 S-box를 적용하거나 출력에 같은 mask를 XOR하는 것만으로는 올바른 masked AES가 되지 않습니다.

## 방어 3 — Timing attack mitigation (constant-time)

원격에서 가능한 timing 공격은 *비밀에 의존하는 분기·메모리 접근*을 없애야 막힙니다.

일반 memcmp의 조기 종료를 비밀 비교에 의존하지 않습니다. 검증된 library의 비교 함수와 전체 호출 경로를 사용합니다. [Ch 3](/blog/embedded/embedded-security/chapter03-mcu-crypto)의 실제 Mbed TLS 3.6.4 `mbedtls_ct_memcmp()` 기능 검사는 입력 동일·차이를 확인한 것이며, MCU에서 timing leak이 없다는 증거는 아닙니다. Homemade C loop도 compiler 변환·주변 코드·target의 영향을 받습니다.

같은 원칙이 *table lookup*에도 적용됩니다. Bernstein의 ["Cache-timing attacks on AES"](https://cr.yp.to/antiforgery/cachetiming-20050414.pdf)(2005)는 850 MHz Pentium III에서 OpenSSL 0.9.7a AES로 packet을 암호화하는 UDP server를 만들었습니다. 이 server는 응답에 CPU cycle counter timestamp를 실어 보냅니다. 같은 기종에서 key를 아는 server로 timing profile을 먼저 모은 뒤, 다른 컴퓨터에서 대상 server에 known-plaintext packet을 보내 그 timing과 상관을 계산해 AES key 전체를 복원했습니다. 800 B packet 2^25개(약 160분), 이어 600 B 2^25개와 400 B 2^27개를 써서 후보를 좁혔습니다. 논문은 timestamp를 빼도 client가 round-trip 시간을 재면 공격이 된다고 주장합니다. 원인은 key에 의존하는 T-table index가 cache hit/miss로 시간을 바꾸는 것입니다. Ch 1에서 잰 Mbed TLS 기본 AES도 T-table을 RAM에 만드는 구현이므로, cache가 있는 Cortex-A·Cortex-M7에서는 같은 질문을 던져야 합니다.

## Fault Injection — 다른 종류의 공격

*결함 주입*은 *신호를 측정*하는 것이 아니라 *연산을 망가뜨려 정보를 얻는* 공격입니다.

| 기법 | 방법 |
|------|------|
| Voltage glitching | 전원을 짧게 떨어뜨림 |
| Clock glitching | clock에 짧은 spike를 넣음 |
| EM injection | 칩 위에서 강한 EM 펄스를 냄 |
| Laser fault injection | 패키지를 연 뒤 레이저를 특정 영역에 쏨 |

방어 코드가 겨냥하는 결과는 *명령 skip*입니다. 아래 분기가 건너뛰어지면 서명 검증 결과와 상관없이 부팅합니다.

```c
if (signature_valid(image, signature)) {   // ← 여기서 glitch
    boot(image);
}
```



### Fault 방어

실제 bootloader가 쓰는 방어를 보면 구체적입니다. MCUboot v2.1.0의 [`fault_injection_hardening.h`](https://github.com/mcu-tools/mcuboot/blob/9c99326b9756dbcc35b524636d99ed5f3e6cb29b/boot/bootutil/include/bootutil/fault_injection_hardening.h#L10-L79)는 네 가지 기법을 profile로 묶습니다.

| 기법 | 동작 | LOW | MEDIUM | HIGH |
|------|------|:---:|:---:|:---:|
| `FIH_ENABLE_GLOBAL_FAIL` | 모든 실패 loop를 loop 탈출 방지가 들어간 전역 실패 loop로 보냄 | O | O | O |
| `FIH_ENABLE_CFI` | 중요 함수 호출 전후 전역 counter를 증감해 호출이 실제로 일어났는지 확인 | O | O | O |
| `FIH_ENABLE_DOUBLE_VARS` | 중요 변수를 (x, x ⊕ mask) 쌍으로 저장하고 비교 시 둘 다 확인 | | O | O |
| `FIH_ENABLE_DELAY` | 무작위 지연으로 glitch 시점 맞추기를 어렵게 함(RNG 필요) | | | O |

같은 header는 이 구성이 "모든 compiler에서 안전하다고 보장되지는 않는다"고 적고, CFI가 ROP·JOP는 막지 않는다고 밝힙니다. 동일 검증을 두 번 호출하는 코드는 compiler가 하나로 합칠 수 있으므로, 이런 방어는 최종 binary의 disassembly에서 남아 있는지 확인합니다.

Cold boot의 메모리 잔류 관찰은 실행 중 fault injection과 같은 분류로 묶지 않습니다. Glitch가 언제나 한 instruction이나 특정 bit를 원하는 대로 바꾸는 것도 아닙니다.

## 인증과 표준

[FIPS 140-3](https://csrc.nist.gov/pubs/fips/140-3/final)는 암호 모듈 검증 기준입니다. 어떤 시험을 거쳤는지는 FIPS 140-3라는 이름이 아니라 개별 certificate의 security level과 Security Policy 문서에 적혀 있습니다. Common Criteria도 마찬가지로 EAL 숫자가 아니라 제품의 Security Target이 평가 범위(물리 공격 포함 여부)를 정합니다. Secure element를 고를 때는 그 모델의 certificate와 Security Target을 직접 읽습니다.

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
- DPA 논문의 DES는 1,000 trace, template DPA는 15개 미만이었습니다. 합성 CPA에서는 잡음을 ±2→±16으로 키우자 필요한 trace가 10개 이하에서 수백 개 이상으로 늘었고, trace를 한 칸 어긋나게 짝지으면 정답이 60등으로 밀렸습니다.
- 방어는 *hiding + masking + constant-time + redundant check*의 layer로 쌓습니다.
- ChipWhisperer로 우리 펌웨어를 *우리가 먼저 공격*해 봐야 합니다.
- timing 공격은 원격에서도 가능합니다. 비밀 비교는 항상 constant-time.
- Fault 방어의 예는 MCUboot FIH profile(GLOBAL_FAIL·CFI·DOUBLE_VARS·DELAY)이며, 최종 binary에서 남아 있는지 확인합니다.
- Secure element의 물리 공격 내성은 인증 이름이 아니라 certificate·Security Target에 적힌 범위로 판단합니다.

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
