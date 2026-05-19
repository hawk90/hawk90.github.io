---
title: "Ch 1: Sanitizers 개요 — ASan / UBSan / LSan / TSan / MSan"
date: 2026-05-17T01:00:00
description: "C/C++ 런타임 검사 도구 Sanitizer 계열의 역할, 종류별 선택, 실무 도입 순서."
tags: [Sanitizer, ASan, UBSan, TSan, LSan, MSan, Debugging, C, C++]
series: "Sanitizers"
seriesOrder: 1
draft: false
---

## 왜 Sanitizer인가

C/C++ 코드의 버그는 *대개 정적 분석으로 보이지 않습니다*. 메모리 오류, 미정의 동작, 데이터 레이스 같은 자리는 *실제로 코드가 돌아야* 드러납니다. 그렇다고 디버거로 한 줄 한 줄 추적하는 건 비효율적입니다 — 문제가 *어디서 시작됐는지* 모르기 때문입니다.

**Sanitizer**는 이 틈을 메웁니다. 컴파일러가 *런타임 검사 코드*를 자동 삽입해, 문제가 *발생하는 순간*에 즉시 보고합니다.

```c
// 누구나 한 번쯤 실수하는 코드
char buf[10];
strcpy(buf, "hello world");  // buffer overflow

// 디버거: "프로그램이 어디선가 죽었네..."
// AddressSanitizer:
// ==12345==ERROR: AddressSanitizer: stack-buffer-overflow on address...
//   READ of size 12 at 0x7fff... thread T0
//     #0 strcpy in main.c:5
//   This frame has 1 object(s):
//     [32, 42) 'buf' <== Memory access at offset 42 overflows this variable
```

정적 분석이 *코드 패턴*을 보고, Valgrind가 *바이너리 실행*을 보는 동안, Sanitizer는 *컴파일러 계측*으로 그 둘 사이에 자리 잡습니다. 세 도구의 위치는 다음과 같습니다.

| 도구 | 동작 시점 | 오버헤드 | 정확도 |
|------|-----------|---------|--------|
| 정적 분석 (clang-tidy 등) | 컴파일 전 | 0 | 거짓 양성 많음 |
| **Sanitizer** | 컴파일 + 런타임 | 2~3× 느림 | 매우 높음 |
| Valgrind (Memcheck) | 런타임만 (재컴파일 불필요) | 10~50× 느림 | 매우 높음 |

Sanitizer가 *셋 중 가장 균형 잡힌* 선택입니다. 컴파일러 한 옵션으로 켜지고, Valgrind보다 *훨씬 빠르며*, 정적 분석보다 *정확합니다*.

---

## Sanitizer 다섯 종류

GCC와 Clang이 공통으로 지원하는 다섯 Sanitizer입니다.

| Sanitizer | 옵션 | 잡는 것 | 오버헤드 |
|-----------|------|---------|---------|
| **ASan** (AddressSanitizer) | `-fsanitize=address` | buffer overflow, use-after-free, double-free | 2~3× |
| **UBSan** (UndefinedBehavior) | `-fsanitize=undefined` | signed overflow, null deref, type confusion | 1.2~1.5× |
| **LSan** (LeakSanitizer) | `-fsanitize=leak` | 메모리 누수 (보통 ASan 포함) | ASan과 같음 |
| **TSan** (ThreadSanitizer) | `-fsanitize=thread` | 데이터 레이스, 동기화 누락 | 5~15× |
| **MSan** (MemorySanitizer) | `-fsanitize=memory` | 초기화 안 된 메모리 사용 | 3× (Clang only) |

### 호환성 — 한 빌드에 같이 쓸 수 있는가

| | ASan | UBSan | LSan | TSan | MSan |
|---|---|---|---|---|---|
| ASan | — | ✓ | ✓ (포함) | ✗ | ✗ |
| UBSan | ✓ | — | ✓ | ✓ | ✓ |
| TSan | ✗ | ✓ | ✗ | — | ✗ |
| MSan | ✗ | ✓ | ✗ | ✗ | — |

핵심 규칙 셋만 기억하면 됩니다.

1. **UBSan은 모두와 호환**. 거의 항상 켜 둡니다.
2. **ASan + TSan + MSan은 서로 배타적**. 같은 메모리 영역을 다른 방식으로 추적하므로 동시 사용 불가.
3. **LSan은 ASan에 자동 포함**. 따로 켤 필요 거의 없음.

결과적으로 *실무에서 만나는 빌드는 세 가지*입니다.

- **ASAN/UBSAN 빌드**: `-fsanitize=address,undefined` — 가장 자주 사용
- **TSAN 빌드**: `-fsanitize=thread` (UBSan과 같이 켜기 가능) — 멀티스레드용
- **MSAN 빌드**: `-fsanitize=memory` (Clang) — 드물지만 깊은 초기화 추적용

---

## 어떤 순서로 도입하나

기존 프로젝트에 Sanitizer를 처음 도입할 때 권장 순서입니다.

### 1단계 — `-fsanitize=address,undefined`

가장 큰 효과를 내는 *황금 조합*. 거의 모든 C/C++ 프로젝트에 즉시 적용해도 좋습니다.

```bash
CFLAGS="-fsanitize=address,undefined -fno-omit-frame-pointer -g -O1"
```

세 옵션의 역할:

- `-fsanitize=address,undefined` — ASan + UBSan 켜기
- `-fno-omit-frame-pointer` — 스택 트레이스 정확도 보장 (없으면 인라인이 트레이스 망침)
- `-g` — 디버그 심볼 (Sanitizer가 *소스 파일·줄 번호*를 보고하려면 필수)
- `-O1` — 약한 최적화 (O0은 false positive 많음, O2는 정보 손실)

이 한 빌드로 가장 많이 만나는 *메모리 오류 + UB*가 다 잡힙니다.

### 2단계 — 멀티스레드면 `-fsanitize=thread`

데이터 레이스가 *진짜 잠재된 버그*인 경우가 많습니다. 단위 테스트에서 안 보이고, *프로덕션 부하 상황에서* 드물게 터집니다. TSan은 발생 가능성을 *코드 실행 중에* 감지합니다.

```bash
# 별도 빌드 — ASan과 충돌
CFLAGS_TSAN="-fsanitize=thread -fno-omit-frame-pointer -g -O1"
```

### 3단계 — 깊은 분석이 필요하면 MSan/LSan/UBSan trap 모드

- **MSan**: *초기화 안 된 변수*를 추적. Clang 전용, 표준 라이브러리도 *MSan-instrumented build*가 필요해 진입 장벽 높음.
- **LSan 단독**: 거의 안 씀. ASan에 포함되어 자동 동작.
- **UBSan trap 모드**: `-fsanitize=undefined -fsanitize-trap=undefined` — UB가 *프로세스를 죽이게* 만듦. 프로덕션 hardening 옵션.

---

## 도구별 *언제 어떤 버그를 잡는가*

### ASan이 잡는 것

```c
char buf[10];
strcpy(buf, "hello, world!");   // ❌ stack-buffer-overflow

int* p = malloc(40);
free(p);
p[0] = 1;                        // ❌ heap-use-after-free

int* q = malloc(40);
free(q);
free(q);                         // ❌ double-free

int x;
int* p = &x;
free(p);                         // ❌ invalid-free (not from malloc)
```

추가로 *static buffer overflow*, *global buffer overflow*, *container overflow*(STL)도 잡습니다.

### UBSan이 잡는 것

```c
int x = INT_MAX;
x++;                             // ❌ signed integer overflow

int* p = NULL;
int v = *p;                      // ❌ null pointer dereference

int* p = (int*)1;                // 정렬 안 된 포인터
int v = *p;                      // ❌ misaligned load

class Base { virtual ~Base() {} };
class D1 : public Base {};
class D2 : public Base {};
Base* b = new D1();
D2* d2 = static_cast<D2*>(b);   // ❌ vptr 검사 (-fsanitize=vptr)
```

`-fsanitize=undefined`는 *십수 개의 UB 종류*를 동시에 켭니다. 개별로도 켤 수 있습니다 — `-fsanitize=signed-integer-overflow,null,bounds` 등.

### TSan이 잡는 것

```cpp
std::atomic<bool> ready{false};
int data = 0;

std::thread t1([&] {
    data = 42;        // ❌ 데이터 레이스
    ready = true;
});

std::thread t2([&] {
    if (ready) {
        std::cout << data;   // ❌ 동기화 없이 읽음
    }
});
```

TSan은 *happens-before* 관계를 추적해, 두 스레드가 *동기화 없이 같은 메모리에 접근*하는 모든 경우를 보고합니다. 락이 필요한 자리, atomic을 빠뜨린 자리가 모두 잡힙니다.

### LSan이 잡는 것

```c
void* p = malloc(40);
return;                          // ❌ 누수 — p 해제 안 됨
```

ASan과 함께 자동 동작합니다. 프로세스 종료 시 *살아 있는 할당*을 모두 보고합니다.

### MSan이 잡는 것

```c
int x;                           // 초기화 없음
if (x > 0) {                    // ❌ uninitialized value
    do_something();
}
```

`malloc()`으로 할당한 메모리도 *초기화 전 사용*을 추적합니다. ASan은 *경계 위반*을, MSan은 *내용 초기화*를 봅니다 — 서로 다른 클래스의 버그.

---

## 자주 묻는 한 가지 — *왜 Valgrind 안 쓰고?*

Valgrind Memcheck는 ASan과 *비슷한 버그*를 잡지만, 동작 방식이 다릅니다.

| | Sanitizer | Valgrind |
|---|---|---|
| 동작 | 컴파일러가 코드 계측 | 바이너리 위에서 가상 실행 |
| 재컴파일 | *필요* | *불필요* |
| 오버헤드 | 2~3× | 10~50× |
| stack 검사 | *지원* | *제한적* |
| 시스템 콜 추적 | 부분적 | *완전* |
| 외부 라이브러리 | 동작 (재컴파일 불필요) | *완전 동작* |
| 멀티 도구 통합 | 옵션으로 조합 | Memcheck/Helgrind/DRD 별도 |

요약: *코드를 컴파일할 수 있으면 Sanitizer*, *바이너리만 있으면 Valgrind*. 둘은 *경쟁이 아니라 보완 관계*입니다. CI에서는 PR마다 Sanitizer를 돌리고, 야간에 Valgrind를 한 번 더 도는 식이 흔합니다.

자세한 비교는 별도 시리즈 [Valgrind](/blog/tools/debugging/valgrind/chapter01-intro)에서 다룹니다.

---

## 시리즈 로드맵

이 시리즈는 다음 다섯 챕터로 구성됩니다.

1. **Ch 1: Sanitizers 개요** (이 글)
2. **Ch 2: ASan + UBSan 실전 설정** — 컴파일 옵션, 환경 변수, 흔한 오탐, 빠른 우회
3. **Ch 3: LSan과 누수 분석** — 누수 출력 해석, suppression, 일회성 분석
4. **Ch 4: TSan과 데이터 레이스 디버깅** — happens-before 모델, false positive 줄이기
5. **Ch 5: CMake / CI 통합** — 빌드 분기, sanitizer-friendly 라이브러리, GitHub Actions 예시

각 챕터는 *실제로 돌아가는 설정*을 목표로 합니다. 이론보다 *실무 적용*에 무게.

---

## 정리

- *Sanitizer*는 컴파일러 계측 기반 런타임 검사 — 정적 분석과 Valgrind 사이의 균형점.
- 다섯 가지: **ASan / UBSan / LSan / TSan / MSan**. UBSan은 거의 다른 모든 것과 호환, ASan·TSan·MSan은 서로 배타적.
- *황금 조합*은 `-fsanitize=address,undefined -fno-omit-frame-pointer -g -O1`. 거의 모든 C/C++ 프로젝트에 즉시 적용 가능.
- 멀티스레드면 *별도 빌드*로 `-fsanitize=thread`.
- Valgrind는 *재컴파일 불가능한 바이너리*에 보완으로.

## 다음 장 예고

[Ch 2: ASan + UBSan 실전 설정](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)에서는 황금 조합을 *실제로 켜고 운영*하는 자세한 방법을 다룹니다. 환경 변수(`ASAN_OPTIONS`, `UBSAN_OPTIONS`), suppression 파일, 흔한 오탐 패턴, 그리고 *어디까지 켜고 어디는 꺼야 하는지* 결정 가이드.

## 참고 자료

- [Google Sanitizers (GitHub)](https://github.com/google/sanitizers) — 공식 위키
- [Clang AddressSanitizer Manual](https://clang.llvm.org/docs/AddressSanitizer.html)
- [GCC Sanitizer Options](https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html)
- [ThreadSanitizer 설계 논문 (Google, 2009)](https://research.google/pubs/pub35604/)
