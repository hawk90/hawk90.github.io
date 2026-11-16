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

이 장의 예제는 `leaks.c` 하나에 모았습니다. 인자로 누수 모양을 고르고, 끝나기 전에 `clobber()`로 스택을 덮어써 남은 포인터 값이 누수를 가리지 않게 했습니다(이유는 아래 "LSan 켜기"에서 봅니다).

```c title="leaks.c"
#include <stdlib.h>
#include <string.h>
struct Node { struct Node *next; };
__attribute__((noinline)) void leak_demo(void) { char *p = malloc(40); p[0] = 'A'; }
__attribute__((noinline)) void cycle_leak(void) {
    struct Node *a = malloc(sizeof *a); struct Node *b = malloc(sizeof *b);
    a->next = b; b->next = a;
}
struct List { struct Item *head; };
struct Item { struct Item *next; char pad[8]; };
__attribute__((noinline)) struct List *create_list(void) { struct List *l = malloc(sizeof *l); l->head = 0; return l; }
__attribute__((noinline)) void list_append(struct List *l) { struct Item *it = malloc(sizeof *it); it->next = l->head; l->head = it; }
__attribute__((noinline)) void list_leak(void) { struct List *l = create_list(); for (int i = 0; i < 5; i++) list_append(l); }
__attribute__((noinline)) void process_request(void) { char *p = malloc(40); p[0] = 1; }
__attribute__((noinline)) void clobber(void) { volatile char big[8192]; memset((char *)big, 0, sizeof big); }
int main(int argc, char **argv) {
    int which = argc > 1 ? atoi(argv[1]) : 0;
    if (which == 1) leak_demo();
    if (which == 2) cycle_leak();
    if (which == 3) list_leak();
    if (which == 4) for (int i = 0; i < 300; i++) process_request();
    clobber();
    return 0;
}
```

Debian 13의 GCC 14로 `gcc -fsanitize=address -g leaks.c`(최적화 없음)를 빌드해 `./lkg 1`을 실행한 전체 출력입니다.

```text
=================================================================
==609==ERROR: LeakSanitizer: detected memory leaks

Direct leak of 40 byte(s) in 1 object(s) allocated from:
    #0 0xffff8e18a400 in malloc ../../../../src/libsanitizer/asan/asan_malloc_linux.cpp:69
    #1 0xaaaad8820bf4 in leak_demo /root/t2/leaks.c:4
    #2 0xaaaad8821020 in main /root/t2/leaks.c:18
    #3 0xffff8df12258  (/lib/aarch64-linux-gnu/libc.so.6+0x22258) (BuildId: 5f3926d9963ff284b8173bf3601bbb00c3abad16)
    #4 0xffff8df12338 in __libc_start_main (/lib/aarch64-linux-gnu/libc.so.6+0x22338) (BuildId: 5f3926d9963ff284b8173bf3601bbb00c3abad16)
    #5 0xaaaad8820aec in _start (/root/t2/lkg+0xaec) (BuildId: a5a786b5232aedf1da4791126bd4da8b71893a09)

SUMMARY: AddressSanitizer: 40 byte(s) leaked in 1 allocation(s).
```

종료 코드는 1이었습니다. 보고를 낸 주체는 LeakSanitizer인데 SUMMARY 줄은 `AddressSanitizer:`로 시작합니다. ASan 런타임 안에 든 LSan이 돌았기 때문이고, `-fsanitize=leak` 단독 빌드에서는 같은 줄이 `SUMMARY: LeakSanitizer:`로 나옵니다.

**핵심 단어 둘**:
- *Direct leak* — 어떤 포인터로도 접근 가능하지 않은 할당. 진짜 잃어버린 메모리.
- *Indirect leak* — Direct leak이 가리키던 자식 할당. 함께 잃어버린 메모리.

---

## LSan이 어떻게 동작하는가

LSan은 *마지막 순간의 reachability 분석*입니다. [LSan 설계 문서](https://github.com/google/sanitizers/wiki/AddressSanitizerLeakSanitizerDesignDocument)가 설명하는 순서는 다음과 같습니다.

1. 프로세스를 멈춥니다. 문서는 포인터 그래프가 검사 중에 바뀌지 않게 하고, 실행 중인 스레드의 레지스터 값까지 모으려고 별도 태스크가 ptrace로 부모 프로세스에 붙는다고 적습니다. 제목의 *Stop-the-world*가 이 단계입니다.
2. 루트 집합을 모읍니다. 전역 변수, 각 스레드의 스택, 범용 레지스터, TLS입니다. Debian 13의 `LSAN_OPTIONS=help=1`에서 `use_globals`·`use_stacks`·`use_registers`·`use_tls`가 모두 `true`였습니다.
3. 루트 메모리에서 힙 블록을 가리키는 것처럼 *보이는* 바이트 패턴을 찾고, 그 블록 내용도 다시 훑으며 도달 가능 블록을 표시합니다. 블록 중간을 가리키는 포인터도 시작 포인터와 똑같이 취급합니다.
4. 표시되지 않은 블록을 할당 스택과 함께 보고하고, 다른 누수 블록에서만 닿는 블록은 *Indirect*로 따로 묶습니다.

3번이 "보이는" 패턴이라는 점이 중요합니다. LSan은 타입 정보 없이 바이트를 포인터 후보로 보므로, 덮어쓰이지 않은 스택 칸에 남은 옛 주소 하나가 블록을 살려 둡니다. 1장에서 Homebrew LLVM으로 `clobber()` 없이 돌린 40바이트 누수가 보고되지 않은 이유입니다.

이 모델 덕분에 *순환 참조*도 잡힙니다. `leaks.c`의 `cycle_leak()`은 두 노드가 서로만 가리키게 만들고 끝납니다. Debian 13의 clang 19 ASan 빌드로 `./lk 2`를 돌리자 이렇게 나왔습니다(libc 프레임은 생략).

```text
Indirect leak of 8 byte(s) in 1 object(s) allocated from:
    #1 0xaaaac2ac6408 in cycle_leak /root/t2/leaks.c:6:58

Indirect leak of 8 byte(s) in 1 object(s) allocated from:
    #1 0xaaaac2ac63f8 in cycle_leak /root/t2/leaks.c:6:22

SUMMARY: AddressSanitizer: 16 byte(s) leaked in 2 allocation(s).
```

두 노드가 모두 *Indirect*로만 나오고 Direct는 하나도 없었습니다. 각 노드가 다른 누수 블록에서 닿기 때문입니다. "Direct만 보면 된다"는 규칙이 순환에서는 통하지 않는다는 뜻이라, Indirect만 있는 보고는 순환 구조를 먼저 의심합니다.

---

## LSan 켜기

Linux에서 LSan은 *ASan에 자동 포함*되어 있습니다. 별도로 켤 필요가 없습니다.

```bash
gcc -fsanitize=address -g main.c -o myapp
./myapp
# 종료 시 자동으로 누수 검사
```

LSan만 독립으로 쓰려면:

```bash
gcc -fsanitize=leak -g main.c -o myapp
```

Debian 13에서 GCC 14의 `-fsanitize=leak` 바이너리는 `ldd`로 보면 `liblsan.so.0`에 링크됐고, `./lkgl 1`은 `SUMMARY: LeakSanitizer: 40 byte(s) leaked in 1 allocation(s).`과 함께 종료 코드 23으로 끝났습니다. LSan 단독 런타임의 `exitcode` 기본값이 23이기 때문입니다(ASan에 든 LSan은 ASan의 1을 씁니다). 단독 모드는 ASan의 접근별 경계 검사를 넣지 않습니다. [LSan 문서](https://clang.llvm.org/docs/LeakSanitizer.html)는 이 모드가 "almost no performance overhead until the very end of the process"라고 적습니다.

최적화 수준도 결과를 바꿉니다. 같은 `leaks.c`를 GCC 14 `-O1`로 빌드하자 `./lkg1 1`이 아무 보고 없이 종료 코드 0으로 끝났습니다. 어셈블리에서 `leak_demo`는 `ret` 한 줄만 남아 있었습니다. 쓰기만 하고 읽지 않는 `malloc` 블록을 컴파일러가 통째로 지웠으니, 누수할 블록 자체가 없었습니다.

### 플랫폼별 차이

같은 Mac에서도 컴파일러에 따라 결과가 갈렸습니다.

| 환경 | `-fsanitize=address` 기본 | `ASAN_OPTIONS=detect_leaks=1` | `-fsanitize=leak` |
|------|------|------|------|
| Debian 13 clang 19·GCC 14 | `detect_leaks=true`, 종료 시 보고 | 보고 | 보고 (종료 코드 23) |
| macOS Homebrew LLVM 23.1.5 | 보고 없음 (`detect_leaks`가 `false`) | 보고 | 보고 |
| macOS Apple clang 21 | 보고 없음 | `detect_leaks is not supported on this platform.` 후 abort | `unsupported option` 컴파일 오류 |

macOS에서 누수를 보려면 Homebrew LLVM 같은 upstream 배포판으로 빌드하고 `ASAN_OPTIONS=detect_leaks=1`을 명시하거나 `-fsanitize=leak`을 씁니다.

```bash
ASAN_OPTIONS=detect_leaks=1 ./myapp
```

Windows 등 이번에 돌리지 않은 플랫폼은 [지원 플랫폼 목록](https://clang.llvm.org/docs/LeakSanitizer.html#supported-platforms)을 봅니다. 목록에는 Android, Fuchsia, Linux, macOS, NetBSD가 있습니다.

---

## 보고서 해석

아래 보고는 모두 Debian 13의 clang 19로 `clang -fsanitize=address -g leaks.c -o lk`를 빌드해 얻었습니다. libc·`_start` 프레임은 생략했습니다.

### 단순한 누수

`./lk 1`의 보고 본문입니다.

```text
Direct leak of 40 byte(s) in 1 object(s) allocated from:
    #1 0xaaaad247637c in leak_demo /root/t2/leaks.c:4:60
```

읽는 법:
1. `40 byte(s) in 1 object(s)` — 한 번의 40바이트 할당이 누수
2. 스택 트레이스 = *할당이 일어난 자리* (해제되지 않은 자리가 아님)
3. `leak_demo`의 4번 줄 60열, 즉 `malloc(40)` 호출에서 할당했다

LSan은 블록이 *어디서 버려졌는지*는 모릅니다. 해제 코드를 *호출 그래프의 어디에 넣을지*는 이 할당 위치에서 소유권을 따라가며 정합니다.

### Direct + Indirect

`./lk 3`은 리스트 헤드 하나와 노드 다섯 개를 만들고 헤드를 잃어버립니다.

```text
Direct leak of 8 byte(s) in 1 object(s) allocated from:
    #1 0xaaaae00c64a4 in create_list /root/t2/leaks.c:11:77

Indirect leak of 80 byte(s) in 5 object(s) allocated from:
    #1 0xaaaae00c6500 in list_append /root/t2/leaks.c:12:80

SUMMARY: AddressSanitizer: 88 byte(s) leaked in 6 allocation(s).
```

리스트 헤드(`struct List`, 포인터 하나라 8바이트)가 Direct로, 헤드에서만 닿던 노드 다섯 개(16바이트씩 80바이트)가 Indirect로 나왔습니다. 헤드를 해제하는 코드가 노드도 함께 정리한다면 Direct 하나를 고쳐 Indirect까지 사라집니다. 다만 앞의 순환 예처럼 Indirect만 있는 보고도 있으니, Direct가 없다고 무시하지 않습니다.

### 동일 위치의 반복 누수

`./lk 4`는 `process_request()`를 300번 부르고, 매번 40바이트를 버립니다.

```text
Direct leak of 12000 byte(s) in 300 object(s) allocated from:
    #1 0xaaaacfcb6620 in process_request /root/t2/leaks.c:14:66

SUMMARY: AddressSanitizer: 12000 byte(s) leaked in 300 allocation(s).
```

LSan은 같은 할당 스택을 가진 블록을 한 항목으로 묶어 개수와 합계를 보여 줍니다. *호출 횟수에 비례해 커지는 항목*은 오래 도는 서버에서 메모리를 바닥내는 쪽이므로 먼저 봅니다.

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

[LSan 문서](https://clang.llvm.org/docs/LeakSanitizer.html#suppression-format)의 규칙은 "A memory leak is suppressed if <pattern> matches any function name, source file name, or library/module name in the symbolized stack trace"입니다. 스택의 *어느 프레임*이든 함수·파일·모듈 이름이 맞으면 그 누수 전체가 빠집니다. ASan 빌드에서도 이 파일은 `LSAN_OPTIONS`로 넘깁니다. `ASAN_OPTIONS=suppressions=`로 넘기면 2장에서 본 `failed to parse suppressions` 오류가 납니다.

### 패턴

알려진 누수 함수 `OpenSSL_init_fake`(1024바이트 3개)와 우리 버그 `my_bug`(16바이트 1개)를 같은 파일 `lsupp2.c`에 두고, 규칙 하나씩 바꿔 가며 Debian 13 clang 19 ASan 빌드(`ls2`)를 돌렸습니다.

| 규칙 | 결과 |
|------|------|
| `leak:OpenSSL_*` | `OpenSSL_init_fake` 3개만 빠지고 `16 byte(s) leaked` 남음 |
| `leak:OpenSSL_init*` | 같음 |
| `leak:OpenSSL` | 같음. 와일드카드 없이도 *부분 문자열*로 맞음 |
| `leak:lsupp2.c` | 4개 모두 빠짐. 파일 이름이 두 함수에 다 맞음 |
| `leak:ls2` | 4개 모두 빠짐. 실행 파일(모듈) 이름이 모든 프레임에 맞음 |
| `leak:libcrypto.so` | 아무것도 안 빠짐 (스택에 그 모듈이 없음) |

`leak:ls2`처럼 짧은 이름은 실행 파일 전체를 가립니다. 패턴은 함수 이름처럼 좁게 쓰고, 파일·모듈 이름은 그 파일이 정말 외부 코드일 때만 씁니다.

### Suppression이 *적용된 누수* 확인

`lsupp.c`(위와 같은 구조, 알려진 함수 이름은 `known_leaking_function`)에 `leak:known_leaking_function` 한 줄만 주고 돌린 결과입니다. 프레임 일부는 생략했습니다.

```text
$ LSAN_OPTIONS=suppressions=lsan.supp ./ls

=================================================================
==645==ERROR: LeakSanitizer: detected memory leaks

Direct leak of 16 byte(s) in 1 object(s) allocated from:
...
    #1 0xaaaad1136424 in my_bug /root/t2/lsupp.c:4:57

-----------------------------------------------------
Suppressions used:
  count      bytes template
      3       3072 known_leaking_function
-----------------------------------------------------

SUMMARY: AddressSanitizer: 16 byte(s) leaked in 1 allocation(s).
```

`Suppressions used:` 표는 `print_suppressions=1`을 주지 않아도 나왔습니다. Debian 13의 `LSAN_OPTIONS=help=1`에서 `print_suppressions`의 기본값이 `true`였습니다. `my_bug`까지 suppression에 넣으면 누수 보고 없이 이 표만 남고 종료 코드가 0이 됐고, `print_suppressions=0`을 주면 표도 사라졌습니다. CI 로그에서 표를 남겨 두면 어떤 규칙이 몇 바이트를 가렸는지 매번 기록됩니다.

---

## 일회성 vs 반복 분석

### 일회성 — *특정 시나리오의 누수*

테스트 케이스 하나, 또는 *특정 입력에 대한* 누수를 찾을 때.

```bash
ASAN_OPTIONS=detect_leaks=1:halt_on_error=1 ./myapp test-input.txt
```

`halt_on_error`는 누수 검사에 영향을 주지 않았습니다. `./lk 1`의 종료 코드는 이 옵션이 있든 없든 1이었습니다. 누수 보고의 종료 코드는 `LSAN_OPTIONS=exitcode=7`을 주자 7로 바뀌었고, `ASAN_OPTIONS=detect_leaks=0`을 주자 보고 없이 0이 됐습니다. CI에서 누수를 다른 실패와 구분하려면 `exitcode`를 따로 주면 됩니다.

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

`SUMMARY` 줄의 바이트 수와 할당 수를 CI 산출물로 남겨 두면, 이전 빌드보다 늘어난 순간을 비교할 수 있습니다.

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

`sanitizer/lsan_interface.h`의 주석은 반환값을 "zero if no leaks have been found or if leak detection is disabled, non-zero otherwise"로 정의합니다. 개수가 아니라 발견 여부입니다. 24바이트 블록 3개를 버린 뒤 한 번, 2개를 더 버린 뒤 다시 한 번 부르는 `recov.c`를 `-fsanitize=leak`으로 돌리자 두 번 모두 1이 반환됐습니다. 두 번째 보고는 새 2개(48바이트)만이 아니라 처음 3개(72바이트)를 다시 포함해 `120 byte(s) leaked in 5 allocation(s)`이었습니다. 요청별로 *새로 생긴* 누수만 세려면 보고를 직접 비교해야 합니다. 요청 경로마다 부르기보다 진단 빌드의 체크포인트에서 부릅니다.

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

`new` + `delete` 사이에 예외가 발생하면 *delete가 호출되지 않습니다*. `might_throw()`가 `std::runtime_error`를 던지고 `main`이 잡는 완전한 프로그램으로 만들어 Debian 13 clang 19 ASan으로 돌리자 `Direct leak of 100 byte(s) in 1 object(s)`가 `process() exc.cpp:5:17`, 즉 `new char[100]` 줄을 가리켰습니다. RAII 객체(`std::unique_ptr`, `std::vector`)로 해결합니다.

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

`Base`를 `struct Base { int id = 0; };`, `Derived`의 `data`를 원소 100개로 채워 Debian 13에서 돌려 봤습니다. 결과는 빌드 옵션마다 달랐습니다.

| 빌드 | 결과 |
|------|------|
| clang 19 `-fsanitize=address` | `ERROR: AddressSanitizer: new-delete-type-mismatch` (`vdtor.cpp:6:5`의 `delete b`) |
| GCC 14 `-fsanitize=address` | 같은 `new-delete-type-mismatch` |
| clang 19 `-fsanitize=address -fno-sized-deallocation` | `Direct leak of 400 byte(s) in 1 object(s)`, `std::__new_allocator<int>::allocate`에서 할당 |
| clang 19 `-fsanitize=undefined` | 보고 없음, 종료 코드 0 |

clang 빌드의 보고는 `size of the allocated type:   32 bytes;`와 `size of the deallocated type: 4 bytes.`였습니다. ASan은 C++14의 크기 있는 `operator delete(void*, unsigned long)`에 넘어온 크기(`Base`, 4바이트)와 실제 할당 크기(`Derived`, 32바이트)가 다르다는 점을 먼저 잡았습니다. 크기 정보를 끄자 그다음 증상인 `vector` 버퍼 400바이트 누수가 LSan에 잡혔습니다. UBSan은 이 UB를 보지 못했습니다. 파생 객체를 기본 포인터로 delete할 설계라면 접근 가능한 가상 소멸자를 둡니다. 기본 클래스 포인터로 삭제하지 못하게 하는 protected 비가상 소멸자 설계도 가능합니다.

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

이 `static std::string`은 정상 종료 시 소멸자가 실행되는 객체로, 그 자체를 의도적 누수라고 부르지 않습니다. 64자짜리 경로를 돌려주게 만들어 ASan으로 돌리자 출력 `64`와 종료 코드 0만 나오고 누수 보고는 없었습니다.

정말로 일부러 해제하지 않는 힙 객체가 있다면 `sanitizer/lsan_interface.h`의 API로 표시합니다. 세 경우를 한 파일에 넣어 Debian 13 clang 19 ASan으로 돌렸습니다.

```c title="ignore.c"
#include <sanitizer/lsan_interface.h>
#include <stdlib.h>
#include <string.h>
__attribute__((noinline)) void cache_init(void) { char *p = malloc(64); p[0] = 1; __lsan_ignore_object(p); }
__attribute__((noinline)) void scoped(void) { __lsan_disable(); char *q = malloc(32); q[0] = 1; __lsan_enable(); }
__attribute__((noinline)) void real_bug(void) { char *r = malloc(16); r[0] = 1; }
__attribute__((noinline)) void clobber(void) { volatile char big[8192]; memset((char *)big, 0, sizeof big); }
int main(void) { cache_init(); scoped(); real_bug(); clobber(); return 0; }
```

```text
Direct leak of 16 byte(s) in 1 object(s) allocated from:
    #1 0xaaaac2cd647c in real_bug /root/t3/ignore.c:6:59
SUMMARY: AddressSanitizer: 16 byte(s) leaked in 1 allocation(s).
```

`__lsan_ignore_object`로 표시한 64바이트와 `__lsan_disable`/`__lsan_enable` 사이의 32바이트는 빠지고 `real_bug`만 남았습니다. 반면 함수에 `__attribute__((no_sanitize("leak")))`를 붙인 경우는 그 함수의 48바이트가 그대로 `Direct leak of 48 byte(s)`로 보고됐습니다. 할당을 빼는 수단은 속성이 아니라 이 API입니다. C++에서는 같은 헤더의 `__lsan::ScopedDisabler`가 생성자와 소멸자에서 `__lsan_disable`/`__lsan_enable`을 부릅니다.

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
2. *환경 변수는 명시적으로* 적습니다. `detect_leaks` 기본값은 Debian에서 `true`, macOS에서 `false`였습니다.
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

Debian 13의 clang 19에서 실행한 결과입니다. 템플릿 프레임 #2~#9는 생략했습니다.

```text
$ LSAN_OPTIONS=leak_check_at_exit=0 ./leak-check

=================================================================
==955==ERROR: LeakSanitizer: detected memory leaks

Direct leak of 8 byte(s) in 1 object(s) allocated from:
    #0 0xaaaab9234f70 in malloc (/root/t/leak-check+0x34f70) (BuildId: 2ab98bb67375c08aa491a24d4238e2cd4c6e8407)
    #1 0xaaaab92386a0 in main::$_0::operator()() const /root/t/leak-check.cpp:10:41
...

Indirect leak of 80 byte(s) in 1 object(s) allocated from:
    #0 0xaaaab9234f70 in malloc (/root/t/leak-check+0x34f70) (BuildId: 2ab98bb67375c08aa491a24d4238e2cd4c6e8407)
    #1 0xaaaab92386b0 in main::$_0::operator()() const /root/t/leak-check.cpp:12:23
...

SUMMARY: LeakSanitizer: 88 byte(s) leaked in 2 allocation(s).
reachable=0 after=1
$ LSAN_OPTIONS=leak_check_at_exit=0 ./leak-check free
reachable=0 after=0
```

전역 `retained`가 노드를 붙잡은 동안의 첫 검사는 0을, 루트를 비운 뒤의 검사는 노드(8바이트)를 Direct로, 노드만 가리키던 자식(80바이트)을 Indirect로 보고했습니다. 두 실행 모두 종료 코드는 0이었습니다. `__lsan_do_recoverable_leak_check()`는 보고만 하고 종료 코드를 바꾸지 않고, `leak_check_at_exit=0`이 종료 시 검사를 껐기 때문입니다. 이 설정은 이 진단 예제에서 같은 누수를 두 번 보지 않으려고 쓴 것이고, 실제 서비스의 검사를 끄라는 지침이 아닙니다.

## 정리

- LSan은 *프로세스 종료 시* 프로세스를 멈추고 루트(전역·스택·레지스터·TLS)에서 닿는 블록을 표시해 누수를 찾습니다. 스택에 남은 옛 포인터나 `-O1`에서 사라진 `malloc`은 보고를 바꿉니다.
- *Direct leak*은 어디서도 닿지 않는 블록, *Indirect leak*은 다른 누수에서만 닿는 블록입니다. 순환은 Indirect만으로 보고됐습니다.
- Debian의 clang·GCC는 ASan에서 누수 검사가 기본으로 켜지고, macOS는 Homebrew LLVM에서 `detect_leaks=1`로 켜야 하며 Apple clang은 지원하지 않습니다.
- 단독 사용은 `-fsanitize=leak`이고 종료 코드 기본값은 23입니다.
- `leak:` 패턴은 함수·파일·모듈 이름에 부분 문자열로 맞습니다. 사용된 규칙 표는 Linux에서 기본으로 출력됩니다.
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
