---
title: "Ch 3: LSan과 누수 분석"
date: 2026-05-15T03:00:00
description: "LeakSanitizer로 메모리 누수 추적 — 보고서 해석, suppression, 일회성·반복 분석 패턴."
tags: [Sanitizer, LSan, MemoryLeak, Debugging, C, C++]
series: "Sanitizers"
seriesOrder: 3
draft: false
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

LSan(`LeakSanitizer`)은 *프로세스 종료 시점*에 살아 있는 모든 할당을 검사해 *어떤 할당이 회수되지 않았는지* 보고합니다.

```
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

1. *루트 집합*을 결정 — 전역 변수, 스택의 모든 포인터, 레지스터 값, TLS.
2. 이 루트들로부터 *도달 가능한* 모든 힙 할당을 마킹.
3. 마킹되지 않은 할당이 *Direct leak*.
4. Direct leak이 가리키던 할당은 *Indirect leak*.

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

LSan 단독 모드는 *훨씬 빠릅니다* (ASan 같은 메모리 추적 없음, 종료 시점만 검사). 누수만 추적하고 다른 버그는 무시할 때 유용합니다.

### 플랫폼별 차이

- **Linux**: ASan과 함께 LSan이 *자동 활성화*.
- **macOS**: `ASAN_OPTIONS=detect_leaks=1` 환경 변수가 *반드시 필요*. 기본은 꺼져 있음.
- **Windows**: LSan 미지원.

macOS에서 누수 추적 안 되어 보이면 거의 100% 환경 변수 누락입니다.

```bash
# macOS
ASAN_OPTIONS=detect_leaks=1 ./myapp
```

---

## 보고서 해석

### 단순한 누수

```
Direct leak of 1024 byte(s) in 1 object(s) allocated from:
    #0 0x...  in malloc
    #1 0x...  in load_config /src/config.c:42
    #2 0x...  in initialize_app /src/main.c:15
```

읽는 법:
1. `1024 byte(s) in 1 object(s)` — 한 번의 1024바이트 할당이 누수
2. 스택 트레이스 = *할당이 일어난 자리* (해제되지 않은 자리가 아님)
3. `load_config` 함수에서 할당했고, `initialize_app`이 호출한 것

해제할 코드를 *호출 그래프의 어디에 넣어야 할지* 결정하는 출발점이 됩니다.

### Direct + Indirect

```
Direct leak of 16 byte(s) in 1 object(s) allocated from:
    #0 0x...  in malloc
    #1 0x...  in create_list /src/list.c:10

Indirect leak of 80 byte(s) in 5 object(s) allocated from:
    #0 0x...  in malloc
    #1 0x...  in list_append /src/list.c:25
```

리스트 헤드(16바이트)가 누수되고, 그 헤드가 가리키던 *5개의 노드*(80바이트)가 같이 잃어버려졌습니다. Indirect는 *Direct를 고치면 자동 해결*되는 경우가 대부분이라, *Direct leak에 집중*하면 됩니다.

### 동일 위치의 반복 누수

```
Direct leak of 12000 byte(s) in 300 object(s) allocated from:
    #0 0x...  in malloc
    #1 0x...  in process_request /src/server.c:88
```

같은 자리에서 300번 할당이 누수됐다는 뜻입니다. 서버가 `process_request`를 300번 호출하면서 매번 해제를 빠뜨렸습니다. *Hot path의 누수*는 영향이 크므로 우선순위가 높습니다.

---

## Suppression — 알려진 누수 무시

외부 라이브러리에서 *어쩔 수 없는* 누수가 보고될 때, suppression으로 *그 자리만* 무시합니다.

### LSan suppression 파일

```
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

```
# 함수명
leak:my_known_leaking_function

# 모듈명 (라이브러리)
leak:libfoo.so

# 정규식 (앞에 ^ 또는 $ 또는 .* 같은 형태)
leak:^OpenSSL_init.*

# 정확히 일치
leak:dl_init
```

### Suppression이 *적용된 누수* 확인

```bash
LSAN_OPTIONS=suppressions=lsan.supp:print_suppressions=1 ./myapp
```

이렇게 하면 *suppression에 의해 가려진 누수의 개수*가 출력됩니다. 어느 라이브러리에서 얼마나 누수가 발생하는지 *통계*는 보고 싶을 때 유용합니다.

```
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

`halt_on_error=1`로 첫 누수에서 즉시 종료. CI에서 이 옵션이 표준입니다.

### 반복 분석 — *변화 추적*

기능을 추가/수정하면서 *누수가 줄어드는지 늘어나는지* 추적할 때.

```bash
$ for i in 1 2 3; do
    ASAN_OPTIONS=detect_leaks=1 ./myapp > /dev/null 2>&1
    echo "Run $i: $(./myapp 2>&1 | grep 'SUMMARY' | tail -1)"
  done
```

CI 시스템에 누수 카운트를 *시계열로* 기록하면, 회귀 즉시 알람을 받을 수 있습니다.

### 부분 분석 — *진행 중간에 검사*

종료가 아니라 *실행 중간*에 누수 검사가 필요할 때. `__lsan_do_recoverable_leak_check()`를 호출합니다.

```c
#include <sanitizer/lsan_interface.h>

void checkpoint() {
    // 이 시점까지의 누수 검사 (프로세스 종료 없이)
    int leaks = __lsan_do_recoverable_leak_check();
    if (leaks > 0) {
        fprintf(stderr, "Leaks at checkpoint: %d\n", leaks);
    }
}
```

서버 코드에서 *각 요청 처리 후*에 호출하면, *어느 요청이 누수를 유발했는지* 시점별로 추적할 수 있습니다. 단, 함수 자체가 무거우므로 *프로덕션이 아닌 진단 빌드*에서만 씁니다.

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
    return result;
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

기본 클래스가 *상속 가능*하면 소멸자를 *반드시* 가상으로. UBSan이 이 자리도 잡을 수 있습니다.

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

`static`은 프로세스 종료 시까지 살아 있어 *의도된 누수*입니다. LSan은 이를 *잡지 않습니다* — 정적 저장 영역이라 *루트로 도달 가능*하기 때문입니다.

진짜 의도된 누수(예: 단일 인스턴스 캐시)는 `__attribute__((no_sanitize("leak")))`나 suppression으로 처리합니다.

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

## 정리

- LSan은 *프로세스 종료 시 reachability 분석*으로 누수를 찾는다.
- *Direct leak* — 진짜 잃어버린 할당. *Indirect leak* — 그 자식들. Direct에 집중.
- ASan에 자동 포함 (Linux). macOS는 `detect_leaks=1` 명시 필요.
- 단독 사용은 `-fsanitize=leak` — 훨씬 빠름.
- Suppression으로 외부 라이브러리의 알려진 누수 무시. `print_suppressions=1`로 통계.
- 실행 중간 검사는 `__lsan_do_recoverable_leak_check()`.
- 흔한 사고 — 조기 반환·예외·콜백·가상 소멸자·정적 변수.

## 다음 장 예고

[Ch 4: TSan과 데이터 레이스](/blog/tools/debugging/sanitizers/chapter04-tsan)에서는 멀티스레드 코드의 *가장 어려운 버그* — 데이터 레이스 — 를 다룹니다. TSan의 happens-before 모델, false positive 줄이기, atomic·mutex와의 상호작용.

## 참고 자료

- [LeakSanitizer Wiki](https://github.com/google/sanitizers/wiki/AddressSanitizerLeakSanitizer)
- [LSan Flags](https://github.com/google/sanitizers/wiki/AddressSanitizerLeakSanitizer#flags)
- [Memory Leak Detection in Practice (Google)](https://research.google/pubs/pub37752/) — LSan 디자인 배경
