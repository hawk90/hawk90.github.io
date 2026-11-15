---
title: "LSan 누수 분석 — Stop-the-world Leak Detection 메커니즘"
slug: "tools/debugging/sanitizers/chapter03-lsan-leaks"
date: 2026-05-29T09:03:00
description: "LeakSanitizer로 메모리 누수 추적 — 보고서 해석, suppression, 일회성·반복 분석 패턴."
tags: [Sanitizer, LSan, MemoryLeak, Debugging, C, cpp]
series: "Sanitizers"
seriesOrder: 3
draft: false
topics: ["tools", "tools/debugging"]
---

## LSan이 잡는 것

```c
void leak_demo() {
    char* p = malloc(40);
    p[0] = 'A';
    return;     // ❌ p 해제 안 됨 — 누수
}
```

이 함수는 *호출될 때마다 40바이트씩* 누적됩니다. 짧게 도는 프로그램이면 문제 안 되지만, *오래 도는 서버*에서는 시간이 지나면 메모리가 바닥납니다.

LSan은 전역·스택·레지스터 등 루트에서 도달 가능한 할당을 제외하고 누수 후보를 찾습니다. 모든 미해제 할당을 나열하는 도구는 아니며, 아래 출력은 보고 형식의 예시입니다.

```text
=================================================================
==12345==ERROR: LeakSanitizer: detected memory leaks

Direct leak of 40 byte(s) in 1 object(s) allocated from:
    #0 0x7f8c1a04b3a8 in malloc (libasan.so.6+0xb13a8)
    #1 0x401234 in leak_demo /path/to/main.c:3
    #2 0x401356 in main /path/to/main.c:10

SUMMARY: AddressSanitizer: 40 byte(s) leaked in 1 allocation(s).
```

**핵심 단어 둘**:
- *Direct leak* — 어떤 포인터로도 접근 가능하지 않은 할당. 진짜 잃어버린 메모리.
- *Indirect leak* — Direct leak이 가리키던 자식 할당. 함께 잃어버린 메모리.

---

## LSan이 어떻게 동작하는가

LSan은 *마지막 순간의 reachability 분석*입니다. 프로세스 종료 시점에:

1. 다른 스레드를 일시 정지시키고 전역 영역·스택·레지스터·TLS 등 루트를 조사합니다. 구체적인 정지·스캔 방식은 플랫폼 구현에 따릅니다.
2. 이 루트들로부터 *도달 가능한* 모든 힙 할당을 마킹.
3. 도달 불가능한 할당을 누수 후보로 분류합니다.
4. 누수 후보 사이의 포인터 관계를 이용해 direct/indirect를 구분합니다. 순환에서는 모든 노드가 direct로 표시되는 것은 아닙니다.

이 모델 덕분에 *순환 참조*도 잡힙니다. 두 객체가 서로만 가리킨다면, 둘 다 루트에서 도달 불가능하므로 누수입니다.

```c
struct Node {
    struct Node* next;
};

void cycle_leak() {
    struct Node* a = malloc(sizeof(*a));
    struct Node* b = malloc(sizeof(*b));
    a->next = b;
    b->next = a;
    // a, b 두 포인터 모두 함수가 끝나면서 사라짐
    // → 두 노드는 서로만 가리키므로 도달 불가능 → 둘 다 leak
}
```

---

## LSan 켜기

LSan은 *ASan에 자동 포함*되어 있습니다. 별도로 켤 필요가 거의 없습니다.

```bash
gcc -fsanitize=address -g main.c -o myapp
./myapp
# 종료 시 자동으로 누수 검사
```

LSan만 독립으로 쓰려면:

```bash
gcc -fsanitize=leak -g main.c -o myapp
```

LSan 단독 모드는 ASan의 접근별 경계 검사를 추가하지 않습니다. 실행 중 할당 추적과 누수 검사 비용은 남으므로 속도는 해당 작업에서 측정합니다. 누수만 추적하고 다른 버그는 무시할 때 유용합니다.

### 플랫폼별 차이

지원되는 Linux ASan에서는 보통 누수 검사가 기본 활성화됩니다. upstream은 macOS에서도 detect_leaks=1로 켜는 방식을 설명하지만, Apple Clang과 다른 LLVM 배포판의 runtime 지원을 같은 것으로 취급하면 안 됩니다. 옵션 누락 외에 지원 아키텍처·런타임·스레드 정지 권한도 확인합니다.

```bash
ASAN_OPTIONS=detect_leaks=1 ./myapp
```

이번 재현은 Homebrew Clang 23.1.3의 별도 -fsanitize=leak 런타임을 대상으로 합니다. Windows 등 다른 플랫폼의 실행 성공을 주장하지 않습니다. [현재 지원 플랫폼](https://clang.llvm.org/docs/LeakSanitizer.html#supported-platforms)을 확인합니다.

---

## 보고서 해석

### 단순한 누수

**Direct leak of 1024 byte(s) in 1 object(s) allocated from:**

- #0 0x...  in malloc
- #1 0x...  in load_config /src/config.c:42
- #2 0x...  in initialize_app /src/main.c:15

읽는 법:
1. `1024 byte(s) in 1 object(s)` — 한 번의 1024바이트 할당이 누수
2. 스택 트레이스 = *할당이 일어난 자리* (해제되지 않은 자리가 아님)
3. `load_config` 함수에서 할당했고, `initialize_app`이 호출한 것

해제할 코드를 *호출 그래프의 어디에 넣어야 할지* 결정하는 출발점이 됩니다.

### Direct + Indirect

**Direct leak of 16 byte(s) in 1 object(s) allocated from:**

- #0 0x...  in malloc
- #1 0x...  in create_list /src/list.c:10

**Indirect leak of 80 byte(s) in 5 object(s) allocated from:**

- #0 0x...  in malloc
- #1 0x...  in list_append /src/list.c:25

리스트 헤드(16바이트)가 누수되고, 그 헤드가 가리키던 *5개의 노드*(80바이트)가 같이 잃어버려졌습니다. Indirect는 *Direct를 고치면 자동 해결*되는 경우가 대부분이라, *Direct leak에 집중*하면 됩니다.

### 동일 위치의 반복 누수

**Direct leak of 12000 byte(s) in 300 object(s) allocated from:**

- #0 0x...  in malloc
- #1 0x...  in process_request /src/server.c:88

같은 자리에서 300번 할당이 누수됐다는 뜻입니다. 서버가 `process_request`를 300번 호출하면서 매번 해제를 빠뜨렸습니다. *Hot path의 누수*는 영향이 크므로 우선순위가 높습니다.

---

## Suppression — 알려진 누수 무시

외부 라이브러리에서 *어쩔 수 없는* 누수가 보고될 때, suppression으로 *그 자리만* 무시합니다.

### LSan suppression 파일

```text
# lsan.supp
leak:libcrypto.so
leak:libssl.so
leak:OpenSSL_*
leak:dl_init
```

```bash
LSAN_OPTIONS=suppressions=lsan.supp ./myapp
```

각 줄은 *스택 트레이스의 어떤 프레임이라도 매칭되면* 해당 누수를 무시합니다.

### 패턴

```text
# 함수명
leak:my_known_leaking_function

# 모듈명 (라이브러리)
leak:libfoo.so

# 와일드카드 패턴
leak:OpenSSL_init*

# 이름에 대한 부분 매칭
leak:dl_init
```

### Suppression이 *적용된 누수* 확인

```bash
LSAN_OPTIONS=suppressions=lsan.supp:print_suppressions=1 ./myapp
```

이렇게 하면 *suppression에 의해 가려진 누수의 개수*가 출력됩니다. 어느 라이브러리에서 얼마나 누수가 발생하는지 *통계*는 보고 싶을 때 유용합니다.

```text
-----------------------------------------------------
Suppressions used:
  count      bytes template
      3     4096 libcrypto.so
      1      256 OpenSSL_*
```

---

## 일회성 vs 반복 분석

### 일회성 — *특정 시나리오의 누수*

테스트 케이스 하나, 또는 *특정 입력에 대한* 누수를 찾을 때.

```bash
$ ASAN_OPTIONS=detect_leaks=1:halt_on_error=1 ./myapp test-input.txt

==12345==ERROR: LeakSanitizer: detected memory leaks
...
```

ASan의 halt_on_error는 접근 오류의 종료 정책입니다. LSan 종료 검사에서는 누수 보고와 LSAN_OPTIONS의 exitcode를 구분합니다. recoverable API는 보고 후에도 반환합니다.

### 반복 분석 — *변화 추적*

기능을 추가/수정하면서 *누수가 줄어드는지 늘어나는지* 추적할 때.

```bash
for i in 1 2 3; do
    status=0
    ASAN_OPTIONS=detect_leaks=1 ./myapp > "leak-$i.log" 2>&1 || status=$?
    echo "Run $i: exit=$status"
    grep 'SUMMARY' "leak-$i.log" || true
done
```

CI 시스템에 누수 카운트를 *시계열로* 기록하면, 회귀 즉시 알람을 받을 수 있습니다.

### 부분 분석 — *진행 중간에 검사*

종료가 아니라 *실행 중간*에 누수 검사가 필요할 때. `__lsan_do_recoverable_leak_check()`를 호출합니다.

```c
#include <sanitizer/lsan_interface.h>
#include <stdio.h>

void checkpoint() {
    // 이 시점까지의 누수 검사 (프로세스 종료 없이)
    int leaks = __lsan_do_recoverable_leak_check();
    if (leaks > 0) {
        fprintf(stderr, "Leaks found at checkpoint\n");
    }
}
```

반환값은 누수 개수가 아니라 발견 여부입니다. 이전에 잃어버린 할당도 다시 보고하므로 요청별 신규 누수 수와 같지 않습니다. 서버 코드에서 진단용 체크포인트로 호출하면, *어느 요청이 누수를 유발했는지* 시점별로 추적할 수 있습니다. 단, 함수 자체가 무거우므로 *프로덕션이 아닌 진단 빌드*에서만 씁니다.

---

## 흔한 사고 패턴

### 1. 조건부 해제 빠뜨림

```c
char* process(int input) {
    char* buf = malloc(100);
    if (input < 0) {
        return NULL;       // ❌ buf 해제 안 됨
    }
    // ... use buf
    free(buf);
    return NULL;
}
```

*조기 반환* 자리마다 정리 코드가 필요합니다. C에서는 `goto cleanup` 패턴, C++에서는 RAII로 해결.

```c
// goto cleanup 패턴
char* process(int input) {
    char* buf = malloc(100);
    char* result = NULL;

    if (input < 0) goto cleanup;
    // ... use buf
    result = strdup("done");

cleanup:
    free(buf);
    return result;
}
```

```cpp
// C++ RAII
std::unique_ptr<char[]> buf(new char[100]);
if (input < 0) return nullptr;   // 자동 해제
// ...
```

### 2. 예외와 누수

```cpp
void process() {
    char* buf = new char[100];
    might_throw();          // ❌ 예외 발생 시 buf 누수
    delete[] buf;
}
```

`new` + `delete` 사이에 예외가 발생하면 *delete가 호출되지 않습니다*. RAII 객체(`std::unique_ptr`, `std::vector`)로 해결.

### 3. 콜백 등록 후 해제 안 함

```cpp
auto* user_data = new Data();
register_callback(callback_fn, user_data);
// ❌ 콜백 해제 시점에 user_data를 해제할 책임은 누구?
```

콜백 시스템은 *소유권 이전*이 명확하지 않을 때 누수의 단골 자리입니다. *명시적인 등록 해제 API*와 *문서화된 소유권*이 답입니다.

### 4. C++ 가상 소멸자 누락

```cpp
class Base { /* 가상 소멸자 없음 */ };
class Derived : public Base { std::vector<int> data; };

Base* b = new Derived();
delete b;   // ❌ Derived의 소멸자가 호출 안 됨 → data 누수
```

파생 객체를 기본 포인터로 delete할 설계라면 접근 가능한 가상 소멸자를 둡니다. 기본 클래스 포인터로 삭제하지 못하게 하는 protected 비가상 소멸자 설계도 가능합니다. 잘못된 삭제는 UB이며, UBSan이 모든 이런 사례를 진단한다고 보장하지 않습니다.

```cpp
class Base { public: virtual ~Base() = default; };
```

### 5. 정적 변수의 *의도적* 누수

```cpp
const char* get_config_path() {
    static const std::string path = read_config_path();
    return path.c_str();
}
```

이 static std::string은 정상 종료 시 소멸자가 실행되는 객체로, 그 자체를 의도적 누수라고 부르지 않습니다. 루트에서 계속 도달 가능한 캐시를 LSan이 보고하지 않는 문제와도 구분합니다.

의도적으로 제외할 힙 객체는 __lsan_ignore_object를, 제한된 할당 구간은 __lsan_disable/__lsan_enable을 검토합니다. no_sanitize("leak") 함수 속성이 LSan 할당 제외 API를 대신한다고 가정하지 않습니다. 소유권과 재검토 조건을 먼저 기록합니다.

---

## CI에서의 운영

### GitHub Actions 예시

```yaml
- name: Build with sanitizers
  run: |
    cmake -B build \
      -DCMAKE_BUILD_TYPE=Debug \
      -DCMAKE_C_FLAGS="-fsanitize=address,undefined -fno-omit-frame-pointer -g -O1" \
      -DCMAKE_EXE_LINKER_FLAGS="-fsanitize=address,undefined"
    cmake --build build

- name: Run tests with sanitizers
  env:
    ASAN_OPTIONS: detect_leaks=1:halt_on_error=1:abort_on_error=1:symbolize=1
    UBSAN_OPTIONS: halt_on_error=1:print_stacktrace=1
    LSAN_OPTIONS: suppressions=tests/lsan.supp
  run: |
    ctest --test-dir build --output-on-failure
```

핵심 포인트:

1. *Sanitizer 빌드는 별도 작업*이 됨. 릴리스 빌드와 분리.
2. *환경 변수는 명시적으로* — CI 디폴트에 의존하지 마.
3. *Suppression 파일을 VCS에 포함* — 팀이 같은 무시 목록을 사용.
4. `--output-on-failure`로 *실패 시 sanitizer 출력*이 로그에 떨어지게.

자세한 통합은 [Ch 5](/blog/tools/debugging/sanitizers/chapter05-cmake-ci)에서.

---

## 직접 확인 — 도달 가능·누수·정리의 차이

작업 스레드가 만든 두 할당을 전역 루트에 보관합니다. 스레드 종료 후 첫 검사는 루트에서 도달 가능하므로 0입니다. 이후 루트를 비우면 direct/indirect 누수가 보고되고, free 인자로 실행하면 두 할당을 먼저 해제해 후속 검사도 0입니다.

```cpp title="leak-check.cpp"
#include <sanitizer/lsan_interface.h>
#include <cstdio>
#include <cstdlib>
#include <thread>

struct Node { void* child; };
Node* volatile retained = nullptr;
int main(int argc, char**) {
    std::thread([] {
        auto* node = static_cast<Node*>(std::malloc(sizeof(Node)));
        if (!node) std::abort();
        node->child = std::malloc(80);
        if (!node->child) std::abort();
        retained = node;
    }).join();
    int reachable = __lsan_do_recoverable_leak_check();
    if (argc > 1) {
        std::free(retained->child);
        std::free(retained);
    }
    retained = nullptr;
    int after = __lsan_do_recoverable_leak_check();
    std::printf("reachable=%d after=%d\n", reachable, after != 0);
}
```

```bash
clang++ -std=c++17 -g -O1 -fsanitize=leak leak-check.cpp -o leak-check
LSAN_OPTIONS=leak_check_at_exit=0 ./leak-check
LSAN_OPTIONS=leak_check_at_exit=0 ./leak-check free
```

누수 실행은 reachable=0 after=1, 정리 실행은 reachable=0 after=0을 기대합니다. leak_check_at_exit=0은 이 진단 예제에서 중복 종료 검사를 막기 위한 설정입니다. 실제 서비스의 검사를 끄라는 지침이 아닙니다.

## 정리

- LSan은 *프로세스 종료 시 reachability 분석*으로 누수를 찾는다.
- *Direct leak* — 진짜 잃어버린 할당. *Indirect leak* — 그 자식들. Direct에 집중.
- ASan 통합 여부·기본값은 타깃과 런타임을 확인합니다. macOS의 미검출을 옵션 누락 하나로 단정하지 않습니다.
- 단독 사용은 `-fsanitize=leak`이며 접근별 경계 검사와 누수 검사의 비용을 구분합니다.
- Suppression으로 외부 라이브러리의 알려진 누수 무시. `print_suppressions=1`로 통계.
- 실행 중간 검사는 `__lsan_do_recoverable_leak_check()`.
- 흔한 사고 — 조기 반환·예외·콜백·가상 소멸자·정적 변수.

## 다음 장 예고

[Ch 4: TSan과 데이터 레이스](/blog/tools/debugging/sanitizers/chapter04-tsan)에서는 멀티스레드 코드의 *가장 어려운 버그*인 데이터 레이스를 다룹니다. TSan의 happens-before 모델, false positive 줄이기, atomic·mutex와의 상호작용.

## 참고 자료

- [LeakSanitizer Wiki](https://github.com/google/sanitizers/wiki/AddressSanitizerLeakSanitizer)
- [LSan Flags](https://github.com/google/sanitizers/wiki/AddressSanitizerLeakSanitizer#flags)
- [Memory Leak Detection in Practice (Google)](https://research.google/pubs/pub37752/) — LSan 디자인 배경

## 관련 항목

- [Ch 2: ASan과 UBSan 실전 설정](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan) — LSan을 켜는 ASan 빌드 설정
- [Ch 4: TSan으로 데이터 레이스 디버깅](/blog/tools/debugging/sanitizers/chapter04-tsan) — 멀티스레드 코드로 넘어가는 다음 단계
- [Valgrind Ch 3: Leak Report 분석](/blog/tools/debugging/valgrind/chapter03-leak-report) — definitely·indirectly·possibly 분류와 Direct/Indirect leak 대응
- [Valgrind Ch 5: Suppression과 실무 운용](/blog/tools/debugging/valgrind/chapter05-suppressions) — 같은 고민을 Valgrind 쪽 문법으로
- [LeakSanitizer Wiki](https://github.com/google/sanitizers/wiki/AddressSanitizerLeakSanitizer) — LSan 플래그와 동작 원문
