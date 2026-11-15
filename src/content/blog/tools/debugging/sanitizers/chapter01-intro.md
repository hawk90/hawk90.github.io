---
title: "Sanitizer 종류 비교 — ASan·UBSan·LSan·TSan·MSan"
slug: "tools/debugging/sanitizers/chapter01-intro"
date: 2026-05-29T09:01:00
description: "C/C++ 런타임 검사 도구 Sanitizer 계열의 역할, 종류별 선택, 실무 도입 순서."
tags: [Sanitizer, ASan, UBSan, TSan, LSan, MSan, Debugging, C, cpp]
series: "Sanitizers"
seriesOrder: 1
draft: false
topics: ["tools", "tools/debugging"]
---

## 왜 Sanitizer인가

정적 분석과 런타임 검사는 서로 다른 증거를 제공합니다. 정적 분석으로 찾을 수 있는 메모리 오류도 있지만, 실제 입력과 스레드 실행 경로에서만 관찰되는 문제도 있습니다. 그렇다고 디버거로 한 줄 한 줄 추적하는 건 비효율적입니다 — 문제가 *어디서 시작됐는지* 모르기 때문입니다.

**Sanitizer**는 이 틈을 메웁니다. 컴파일러가 *런타임 검사 코드*를 자동 삽입해, 문제가 *발생하는 순간*에 즉시 보고합니다.

```c
// 누구나 한 번쯤 실수하는 코드
char buf[10];
strcpy(buf, "hello world");  // buffer overflow

// 디버거: "프로그램이 어디선가 죽었네..."
// AddressSanitizer:
// ==12345==ERROR: AddressSanitizer: stack-buffer-overflow on address...
//   WRITE of size 12 at 0x7fff... thread T0
//     #0 strcpy in main.c:5
//   This frame has 1 object(s):
//     [32, 42) 'buf' <== Memory access at offset 42 overflows this variable
```

정적 분석이 *코드 패턴*을 보고, Valgrind가 *바이너리 실행*을 보는 동안, Sanitizer는 *컴파일러 계측*으로 그 둘 사이에 자리 잡습니다. 세 도구의 위치는 다음과 같습니다.

| 도구 | 검사 방식 | 확인 범위 |
| --- | --- | --- |
| 정적 분석 | 실행 없이 소스·경로 분석 | 실제 실행하지 않은 경로도 분석하지만 모델의 한계가 있습니다. |
| Sanitizer | 컴파일 계측과 런타임 검사 | 선택한 검사와 실제 실행 경로에 의존합니다. |
| Valgrind Memcheck | 실행 파일의 동적 분석 | 지원 플랫폼에서 메모리 접근과 초기화 상태를 추적합니다. |

속도와 정확도를 하나의 배율로 비교하지 않습니다. 검사 종류, 입력, 라이브러리 계측 여부에 따라 비용과 탐지 범위가 달라집니다.

---

## Sanitizer 다섯 종류

대표적인 다섯 검사 계열입니다. MSan은 Clang 계열 기능이며, 나머지도 컴파일러·OS·아키텍처·배포 런타임의 지원을 확인해야 합니다.

| Sanitizer | 옵션 | 주요 검사·조건 |
| --- | --- | --- |
| ASan | `-fsanitize=address` | 지원되는 메모리 경계·수명 오류를 검사합니다. |
| UBSan | `-fsanitize=undefined` | 선택된 미정의 동작 검사를 수행합니다. 모든 UB를 검출하지는 않습니다. |
| LSan | `-fsanitize=leak` | 지원 런타임에서 도달 불가능한 할당을 찾습니다. |
| TSan | `-fsanitize=thread` | 관찰된 접근 사이의 동기화와 레이스를 분석합니다. |
| MSan | `-fsanitize=memory` | 초기화되지 않은 값 사용을 추적하며 종속 코드의 계측도 필요합니다. |

### 호환성 — 한 빌드에 같이 쓸 수 있는가

| | ASan | UBSan | LSan | TSan | MSan |
|---|---|---|---|---|---|
| ASan | — | ✓ | ✓ (포함) | ✗ | ✗ |
| UBSan | ✓ | — | ✓ | ✓ | ✓ |
| TSan | ✗ | ✓ | ✗ | — | ✗ |
| MSan | ✗ | ✓ | ✗ | ✗ | — |

핵심 규칙 셋만 기억하면 됩니다.

1. **UBSan은 다른 검사 계열과 조합할 수 있습니다.** 개별 검사와 타깃 런타임 지원을 확인합니다.
2. **ASan + TSan + MSan은 서로 배타적**. 같은 메모리 영역을 다른 방식으로 추적하므로 동시 사용 불가.
3. **LSan은 지원되는 ASan 런타임에 통합됩니다.** 기본 활성화와 별도 leak 런타임 지원은 플랫폼마다 확인합니다.

결과적으로 *실무에서 만나는 빌드는 세 가지*입니다.

- **ASAN/UBSAN 빌드**: `-fsanitize=address,undefined` — 가장 자주 사용
- **TSAN 빌드**: `-fsanitize=thread` (UBSan과 같이 켜기 가능) — 멀티스레드용
- **MSAN 빌드**: `-fsanitize=memory` (Clang) — 드물지만 깊은 초기화 추적용

---

## 어떤 순서로 도입하나

기존 프로젝트에 Sanitizer를 처음 도입할 때 권장 순서입니다.

### 1단계 — `-fsanitize=address,undefined`

ASan과 UBSan을 함께 시험하는 시작 설정입니다. 지원되는 개발·테스트 환경에서 먼저 적용하고 실행 시간과 메모리 비용을 확인합니다.

```bash
CFLAGS="-fsanitize=address,undefined -fno-omit-frame-pointer -g -O1"
```

각 옵션의 역할:

- `-fsanitize=address,undefined` — ASan + UBSan 켜기
- `-fno-omit-frame-pointer` — frame pointer를 유지해 스택 해석을 돕습니다. 인라인·tail call까지 되돌리지는 않습니다.
- `-g` — 디버그 심볼 (Sanitizer가 *소스 파일·줄 번호*를 보고하려면 필수)
- `-O1` — 초기 진단에 사용할 최적화 수준입니다. O0 자체가 오탐의 원인은 아닙니다.

이 빌드가 실행한 경로에서 지원 검사를 수행합니다. 경고가 없다는 사실만으로 모든 메모리 오류와 UB가 없다고 결론 내리지 않습니다.

### 2단계 — 멀티스레드면 `-fsanitize=thread`

데이터 레이스가 *진짜 잠재된 버그*인 경우가 많습니다. 단위 테스트에서 안 보이고, *프로덕션 부하 상황에서* 드물게 터집니다. TSan은 발생 가능성을 *코드 실행 중에* 감지합니다.

```bash
# 별도 빌드 — ASan과 충돌
CFLAGS_TSAN="-fsanitize=thread -fno-omit-frame-pointer -g -O1"
```

### 3단계 — 깊은 분석이 필요하면 MSan/LSan/UBSan trap 모드

- **MSan**: *초기화 안 된 변수*를 추적. Clang 전용, 표준 라이브러리도 *MSan-instrumented build*가 필요해 진입 장벽 높음.
- **LSan 단독**: 메모리 경계 검사 없이 누수 검사를 분리할 때 사용합니다.
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

전역 배열 경계도 검사합니다. STL의 논리적 크기와 capacity 사이 접근은 라이브러리의 container annotation 지원에 따라 달라집니다.

### UBSan이 잡는 것

```cpp
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
    data = 42;        // ready의 store 이전 쓰기
    ready = true;
});

std::thread t2([&] {
    if (ready) {
        std::cout << data;   // ready의 true를 읽었다면 안전
    }
});
```

위 코드는 레이스 예제가 아닙니다. ready의 기본 store/load는 seq_cst이며, true를 읽은 쪽에는 이전 data 쓰기가 전달됩니다. 반대로 두 연산을 relaxed로 바꾸면 data에 대한 동기화는 성립하지 않습니다. TSan은 실행 중 관찰한 접근을 검사하며 모든 경로의 문제를 보장하지 않습니다. [C++ atomic 순서 규칙](https://eel.is/c++draft/atomics.order)을 기준으로 구분합니다.

### LSan이 잡는 것

```c
void* p = malloc(40);
return;                          // ❌ 누수 — p 해제 안 됨
```

지원되는 ASan 런타임에서는 LSan을 함께 사용할 수 있습니다. 루트에서 도달 가능한 할당은 보통 누수로 보고하지 않으므로, 해제하지 않은 모든 할당을 나열하는 도구는 아닙니다.

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

| | Sanitizer | Valgrind Memcheck |
| --- | --- | --- |
| 준비 | 검사할 코드의 계측 빌드가 필요합니다. | 지원되는 실행 파일을 동적 분석합니다. |
| 외부 라이브러리 | 비계측 코드는 탐지 공백을 만들 수 있습니다. | 계측 재빌드 없이 분석하지만 플랫폼·명령 지원의 제한이 있습니다. |
| 초기화 상태 | MSan 계열을 별도로 선택합니다. | 초기화되지 않은 값의 사용을 추적합니다. |

재빌드 가능 여부와 검사 목적을 기준으로 선택합니다. 둘 다 시스템 콜 추적의 완전성을 보장하는 도구로 설명하지 않습니다.

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

## 직접 확인 — atomic으로 데이터 전달

아래는 앞선 seq_cst 설명을 완전한 프로그램으로 만든 예제입니다. 소비자가 true를 읽을 때까지 기다리므로 출력은 data=42입니다. relaxed 레이스 사례와 수정 비교는 4장에서 다룹니다.

```cpp title="publication.cpp"
#include <atomic>
#include <iostream>
#include <thread>

int main() {
    std::atomic<bool> ready{false};
    int data = 0;
    std::thread producer([&] {
        data = 42;
        ready = true;
    });
    std::thread consumer([&] {
        while (!ready) std::this_thread::yield();
        std::cout << "data=" << data << '\n';
    });
    producer.join();
    consumer.join();
}
```

```bash
clang++ -std=c++17 -O1 -g -fsanitize=thread publication.cpp -o publication
./publication
```

이 예제의 정상 출력과 TSan의 무경고 여부를 별도로 확인합니다. 무경고는 이 실행의 증거이며 다른 모든 코드의 안전성 증명은 아닙니다.

## 정리

- *Sanitizer*는 컴파일러 계측 기반 런타임 검사 — 정적 분석과 Valgrind 사이의 균형점.
- 다섯 가지: **ASan / UBSan / LSan / TSan / MSan**. UBSan은 거의 다른 모든 것과 호환, ASan·TSan·MSan은 서로 배타적.
- 시작 설정은 `-fsanitize=address,undefined -fno-omit-frame-pointer -g -O1`이며 지원 환경·비용을 먼저 확인합니다.
- 멀티스레드면 *별도 빌드*로 `-fsanitize=thread`.
- Valgrind는 *재컴파일 불가능한 바이너리*에 보완으로.

## 다음 장 예고

[Ch 2: ASan + UBSan 실전 설정](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)에서는 황금 조합을 *실제로 켜고 운영*하는 자세한 방법을 다룹니다. 환경 변수(`ASAN_OPTIONS`, `UBSAN_OPTIONS`), suppression 파일, 흔한 오탐 패턴, 그리고 *어디까지 켜고 어디는 꺼야 하는지* 결정 가이드.

## 참고 자료

- [Google Sanitizers (GitHub)](https://github.com/google/sanitizers) — 공식 위키
- [Clang AddressSanitizer Manual](https://clang.llvm.org/docs/AddressSanitizer.html)
- [GCC Sanitizer Options](https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html)
- [ThreadSanitizer 설계 논문 (Google, 2009)](https://research.google/pubs/pub35604/)

## 관련 항목

- [Ch 2: ASan과 UBSan 실전 설정](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan) — 황금 조합을 실제 프로젝트에서 운영하는 방법
- [Valgrind Ch 1: 도구 개요](/blog/tools/debugging/valgrind/chapter01-intro) — Memcheck·Helgrind·DRD와의 역할 대응
- [GDB·LLDB Ch 1: 두 디버거의 차이와 선택](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install) — sanitizer가 잡은 자리를 이어서 추적할 때
- [Google Sanitizers Wiki](https://github.com/google/sanitizers/wiki) — 다섯 sanitizer의 공식 문서 모음
