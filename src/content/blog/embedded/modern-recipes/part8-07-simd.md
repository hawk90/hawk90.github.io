---
title: "SIMD 활용 분석 — Intrinsics·Auto-Vectorization·OpenMP SIMD"
slug: "embedded/modern-recipes/part8-07-simd"
date: 2026-04-17T09:06:00
description: "자동 벡터화·아키텍처 intrinsic·OpenMP SIMD의 적용 조건과 컴파일 결과 확인법을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 95
tags: [recipes, simd, vectorization, intrinsics, openmp]
topics: ["embedded"]
---

## 한 줄 요약

> SIMD는 같은 연산을 여러 원소에 적용하는 방법입니다. 벡터 폭만으로 실제 처리량이나 가속 배수를 알 수는 없습니다.

오디오 샘플 변환, 픽셀 처리, 센서 배열처럼 원소별 계산이 독립적인 작업은 SIMD 후보입니다. 다만 계산보다 메모리 이동이나 분기 비용이 크면 벡터 명령을 써도 전체 실행 시간은 거의 줄지 않을 수 있습니다. 먼저 결과와 메모리 접근을 정의하고, 컴파일러가 만든 코드를 확인한 다음 실제 입력에서 측정합니다.

같은 도장을 여러 장의 서류에 한 번씩 찍는 작업과 비슷합니다. 서류 사이에 이전 장의 결과를 기다려야 한다면 여러 도장을 동시에 움직일 수 없듯, 데이터 의존성이 있는 loop는 lane 병렬 실행을 그대로 적용할 수 없습니다.

## 세 가지 적용 방법

스칼라 C 코드는 여러 플랫폼에서 읽기 쉽고 유지하기 좋습니다. 컴파일러 자동 벡터화는 이 코드를 그대로 두고 대상 ISA에 맞는 vector loop와 tail을 생성하려고 시도합니다. Intrinsic은 명령 선택을 더 직접 제어하지만 ISA와 데이터 폭에 묶이고, OpenMP SIMD는 반복을 SIMD lane에서 실행할 수 있다고 표시하면서 reduction·정렬 등의 계약을 지정합니다.

세 방법은 순차적으로 시험할 선택지입니다. 자동 벡터화가 충분한 코드를 만들면 그 결과를 유지하고, 병목이 확인된 loop에 한해 intrinsic이나 더 나은 데이터 배치를 검토합니다. OpenMP `aligned` 절은 정렬을 보장하는 선언이 아니라 프로그래머가 제공하는 전제이므로 포인터가 실제로 그 경계에 맞지 않으면 잘못된 코드가 됩니다.

| 방법 | 코드의 역할 | 확인할 점 |
|---|---|---|
| 자동 벡터화 | 일반 loop와 유효한 alias 계약을 제공 | vectorizer 진단, 생성된 assembly, scalar fallback |
| Intrinsic | 특정 ISA 연산을 명시 | ISA 지원, tail, 정렬, saturation과 overflow 의미 |
| OpenMP SIMD | loop를 SIMD 실행 대상으로 표시 | loop-carried dependency 의미, reduction, `aligned` 전제, compiler 지원 |

## 컴파일러가 실제로 한 일을 확인하기

`-O3`를 붙였다는 사실만으로 loop가 vectorize됐다고 결론낼 수 없습니다. GCC는 현재 `-O2`에서도 loop와 SLP vectorization을 기본 활성화하며, 대상·비용 모델·alias 분석에 따라 scalar 코드를 택할 수 있습니다. GCC의 vectorization 진단과 최종 assembly를 함께 보고, Clang에서는 optimization remark를 확인합니다. [GCC 최적화 옵션](https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html)과 [GCC 개발 진단 옵션](https://gcc.gnu.org/onlinedocs/gcc/Developer-Options.html)을 참고합니다.

컴파일러 이름은 toolchain에 맞춰 지정해야 합니다. `gcc-aarch64`는 보편적인 실행 파일 이름이 아니므로 배포판의 `aarch64-linux-gnu-gcc`처럼 실제 cross compiler를 사용합니다. 옵션은 target과 compiler 버전에 맞춰 조정합니다.

```bash title="simd-vectorization-diagnostics"
gcc -O3 -fopt-info-vec-optimized -fopt-info-vec-missed -c source.c
clang -O3 -Rpass=loop-vectorize -Rpass-missed=loop-vectorize -c source.c
aarch64-linux-gnu-gcc -O3 -mcpu=cortex-a72 -c source.c
```

이 명령은 진단을 요청할 뿐 특정 loop의 vectorization을 보장하지 않습니다. 출력이 없거나 기대와 다르면 전처리된 코드, target flags, aliasing, loop-carried dependency와 vectorizer 보고를 차례로 확인합니다. cross compiler에서 `-mcpu=native`를 쓸 수 없는 경우에는 실제 CPU 모델에 맞는 compiler 옵션을 선택합니다.

## 임의 길이에서 안전한 벡터 loop

다음 NEON 예제는 입력 두 배열을 더해 별도 출력 배열에 기록합니다. 포인터가 가리키는 범위는 서로 겹치지 않아야 하고, `count`개 원소를 모두 읽고 쓸 수 있어야 합니다. 남은 원소는 scalar loop가 처리하므로 길이가 vector lane 수의 배수일 필요가 없습니다.

```c title="simd-add-neon.c"
#include <arm_neon.h>
#include <stddef.h>

void add_f32_neon(const float * restrict a, const float * restrict b,
                  float * restrict out, size_t count) {
    while (count >= 4) {
        const float32x4_t va = vld1q_f32(a);
        const float32x4_t vb = vld1q_f32(b);
        vst1q_f32(out, vaddq_f32(va, vb));
        a += 4; b += 4; out += 4; count -= 4;
    }
    while (count != 0) {
        *out++ = *a++ + *b++;
        --count;
    }
}
```

`restrict`는 겹치는 버퍼도 처리한다는 표지가 아닙니다. 호출자가 겹치지 않는다는 계약을 지키지 않으면 C의 alias 규칙을 위반할 수 있습니다. 제자리 연산이나 부분 overlap이 필요한 API라면 `restrict`를 빼고 그 메모리 관계에 맞는 알고리즘을 작성합니다.

## 의존성과 reduction

조건문이 있거나 반복 횟수를 컴파일 시 모른다는 이유만으로 vectorization이 불가능하지는 않습니다. 컴파일러는 predicate, runtime alias check, scalar prologue/tail 또는 여러 loop version을 만들 수 있지만, 비용 모델이 이 변환을 거절할 수도 있습니다. 반대로 누적값을 다음 반복이 읽는 recurrence는 lane 실행에서도 그 의존성을 보존해야 합니다. OpenMP `simd`가 dependence를 무시하도록 허용하는 것은 아니며, compiler가 자동 prefix-scan 알고리즘을 만들어 준다고 가정하지 않습니다.

실수 reduction은 lane마다 부분합을 만든 뒤 합치면서 덧셈 순서가 달라질 수 있습니다. 부동소수점은 결합법칙이 성립하지 않으므로 bitwise 동일성이 필요한 계산은 자동 reduction이나 fast-math 옵션을 켜기 전에 허용 오차와 반올림 계약을 정합니다. 정수 reduction도 overflow가 정의된 연산인지 확인합니다.

```c title="simd-independent-and-recurrence.c"
#include <stddef.h>

void add_arrays(const float *a, const float *b, float *out, size_t n) {
    for (size_t i = 0; i < n; ++i) out[i] = a[i] + b[i];
}

void prefix_sum_in_place(float *values, size_t n) {
    for (size_t i = 1; i < n; ++i) values[i] += values[i - 1];
}
```

첫 loop의 각 출력은 같은 인덱스의 입력만 읽습니다. 두 번째 loop는 앞 원소의 새 값에 의존하므로 변환 시 그 순서를 보존해야 합니다. 이 차이는 vectorizer 진단과 작은 입력을 이용한 scalar/SIMD 결과 비교로 확인합니다.

누적 합은 매출 장부의 앞 줄 잔액을 다음 줄이 이어받는 것과 같습니다. 컴파일러가 그 순서를 지키면서 코드를 바꿀 수는 있지만, 단순히 여러 줄을 동시에 계산해도 같은 결과가 되는 것은 아닙니다.

## ISA별 벡터 길이와 tail

NEON Advanced SIMD는 고정 폭 벡터를 사용하고, SVE는 구현별 벡터 길이를 실행 시 질의하는 vector-length-agnostic 모델입니다. SVE 코드는 현재 남은 원소에 predicate를 만들고 그 predicate로 load/store를 제한합니다. MVE(Helium)는 Cortex-M 계열의 별도 ISA이며 NEON과 intrinsic/API가 같지 않습니다. 각 API는 [Arm ACLE 문서](https://developer.arm.com/documentation/101028/latest/)와 대상 compiler의 header에서 확인합니다.

아래 SVE loop는 float 배열의 길이가 임의일 때 마지막 부분도 predicate로 제한합니다. `svcntw()`는 32-bit lane 수를 반환하므로 네 원소씩 고정 증가시키는 코드와 달리 구현의 vector 길이에 맞춰 다음 구간으로 이동합니다.

Predicate는 마지막 묶음에서 유효 원소만 통과시키는 출입문처럼 동작합니다. 그래도 pointer와 남은 길이는 호출자가 올바르게 관리해야 합니다.

```c title="simd-add-sve.c"
#include <arm_sve.h>
#include <stddef.h>

void add_f32_sve(const float * restrict a, const float * restrict b,
                 float * restrict out, size_t count) {
    size_t i = 0;
    while (i < count) {
        const svbool_t pg = svwhilelt_b32(i, count);
        const svfloat32_t va = svld1_f32(pg, a + i);
        const svfloat32_t vb = svld1_f32(pg, b + i);
        svst1_f32(pg, out + i, svadd_f32_x(pg, va, vb));
        i += svcntw();
    }
}
```

SVE 지원은 CPU와 운영체제 실행 환경에서 확인해야 하며, SVE의 존재만으로 모든 구현의 vector 길이나 처리량이 같다고 가정하지 않습니다. MVE도 tail predicate로 유효 lane만 접근할 수 있지만 NEON 코드와 섞어 쓸 수 없으므로 Cortex-M용 compiler와 헤더로 따로 빌드합니다.

아래 MVE 예제는 signed 16-bit 두 배열을 더합니다. 호출자는 모든 lane의 합이 `int16_t` 범위 안에 든다는 조건을 지켜야 합니다. 마지막 1~7개 원소도 vector 명령으로 처리하며, predicate가 유효한 lane만 load/store하도록 제한합니다.

```c title="simd-add-mve.c"
#include <arm_mve.h>
#include <stddef.h>
#include <stdint.h>

void add_i16_mve(const int16_t * restrict a, const int16_t * restrict b,
                 int16_t * restrict out, size_t count) {
    while (count != 0) {
        const uint32_t lanes = count >= 8 ? 8u : (uint32_t)count;
        const mve_pred16_t pg = vctp16q(lanes);
        const int16x8_t va = vld1q_z_s16(a, pg);
        const int16x8_t vb = vld1q_z_s16(b, pg);
        vst1q_p_s16(out, vaddq_x_s16(va, vb, pg), pg);
        if (count >= 8) { a += 8; b += 8; out += 8; count -= 8; }
        else { a += count; b += count; out += count; count = 0; }
    }
}
```

마지막 조각 이후 pointer는 유효 범위의 one-past까지만 이동합니다. 이 intrinsic 조합은 compiler header로 확인하며, 다른 ACLE/compiler version에서 이름이나 target flags를 다시 점검합니다.

## OpenMP SIMD와 정렬 계약

OpenMP `simd`는 반복을 SIMD lane으로 분배할 수 있다는 계약을 표시합니다. `aligned(a:64)`는 컴파일러에게 `a`가 64-byte 경계에 정렬돼 있다고 알려 주므로, allocator와 offset이 실제로 그 보장을 유지할 때만 적습니다. 정렬되지 않은 pointer에 선언만 붙이면 잘못된 최적화가 발생할 수 있습니다. [OpenMP SIMD 지시문](https://www.openmp.org/spec-html/5.2/openmpse60.html)에서 loop와 aligned 조건을 확인합니다.

```c title="simd-openmp.c"
#include <stddef.h>

void multiply_arrays(const float *a, const float *b, float *out, size_t n) {
    #pragma omp simd
    for (size_t i = 0; i < n; ++i) out[i] = a[i] * b[i];
}

float sum_array(const float *values, size_t n) {
    float sum = 0.0f;
    #pragma omp simd reduction(+:sum)
    for (size_t i = 0; i < n; ++i) sum += values[i];
    return sum;
}
```

OpenMP SIMD pragma는 여러 compiler가 구현하지만 진단과 생성 결과는 compiler·version·target에 따라 다릅니다. 이 예제의 `sum_array`는 합산 순서가 바뀔 수 있으므로 허용 오차를 정한 뒤 사용합니다. 병렬 thread 생성을 뜻하는 `parallel for`와 SIMD lane 분할인 `simd`도 구분합니다.

## 측정 순서

벡터 폭은 한 명령에 담기는 데이터 수이지 프로그램 전체의 가속 배수가 아닙니다. 메모리 대역폭, cache miss, 정렬, tail 비율, 호출 비용, compiler의 instruction 선택이 결과를 바꿉니다. scalar baseline과 최적화된 결과를 같은 입력·compiler·target 조건에서 비교하고, 실행 시간과 함께 출력 검증을 남깁니다.

최적화 전후에는 작은 길이 0·1·vector 폭 바로 아래·같음·위, 비배수 길이, 큰 입력, 허용된 alias 관계를 검사합니다. 유한 범위의 샘플만 통과했다고 모든 수치 입력의 동등성이 입증되는 것은 아니며, saturation·rounding·NaN 같은 의미도 따로 확인합니다.

## 자주 보는 함정

**tail 누락**은 길이가 벡터 폭의 배수일 때만 우연히 드러나지 않습니다. vector loop 다음에 scalar tail을 두거나 predicate load/store를 사용하고, 포인터 연산 자체가 범위를 넘지 않는지 확인합니다.

**alias를 단정**하면 compiler가 runtime check를 만들거나 loop를 scalar로 남길 수 있습니다. `restrict`는 성능 힌트이면서 호출자의 언어 계약이므로, 실제 버퍼 관계와 함께 결정합니다.

**intrinsic 수를 세어 성능을 예측**하면 load/store, shuffle, register spill과 메모리 병목을 놓칩니다. 생성 assembly는 구현 확인 수단이고, 성능 결론은 대상 workload에서 반복 측정해야 합니다.

## 정리

- 일반 C loop로 시작해 compiler 진단과 assembly를 확인합니다.
- alias, 반복 간 의존성, 정수·실수 overflow와 재정렬 허용 범위를 정합니다.
- vector tail을 처리하고 `restrict`·OpenMP `aligned` 전제를 실제 호출자가 지키게 합니다.
- NEON, MVE, SVE는 별도 ISA와 API로 다룹니다.
- vector 폭을 speedup으로 바꾸어 말하지 말고 대상 입력에서 측정합니다.

다음 편에서는 행렬·픽셀·FFT 예제를 NEON과 CMSIS-DSP의 계약에 맞춰 살펴봅니다.

## 관련 항목

- [8-06: NUMA](/blog/embedded/modern-recipes/part8-06-numa)
- [8-08: ARM NEON 심화](/blog/embedded/modern-recipes/part8-08-neon)
- [PE 2-09: SIMD NEON](/blog/embedded/performance-engineering/part2-09-simd-neon)
- [8-03: Cache Alignment](/blog/embedded/modern-recipes/part8-03-cache-alignment)
