---
title: "Valgrind Leak Report 분석 — definitely·indirectly·possibly·still reachable"
slug: "tools/debugging/valgrind/chapter03-leak-report"
date: 2026-05-28T09:03:00
description: "Memcheck의 네 가지 누수 분류 — definitely/indirectly/possibly/still reachable — 정확한 의미와 우선순위."
tags: [Valgrind, Memcheck, MemoryLeak, Debugging, C, cpp]
series: "Valgrind"
seriesOrder: 3
draft: false
topics: ["tools", "tools/debugging"]
---

## 네 가지 누수 분류

`--leak-check=full --show-leak-kinds=all`로 실행하면 보고서 끝에 *LEAK SUMMARY*가 나옵니다. 네 종류를 한 프로그램에 모두 넣은 `kinds.c`를 먼저 봅니다. 실행 환경은 [Ch 1](/blog/tools/debugging/valgrind/chapter01-intro)과 같은 Valgrind 3.24.0, Debian 13 arm64, GCC 14.2.0(`-g -O0`)입니다.

```c title="kinds.c"
#include <stdlib.h>
struct Node { int value; struct Node* next; };
char* g_config;          // still reachable
char* g_interior;        // possibly lost
__attribute__((noinline)) void lose_list(void) {
    struct Node* head = malloc(sizeof(*head));
    head->next = malloc(sizeof(*head));
    head->next->next = NULL;
}                        // head를 잃어버림
__attribute__((noinline)) void lose_plain(void) { char* p = malloc(40); (void)p; }
__attribute__((noinline)) void keep_interior(void) { char* p = malloc(100); g_interior = p + 10; }
__attribute__((noinline)) void init_config(void) { g_config = malloc(1024); }
int main(void) {
    lose_plain();
    lose_list();
    keep_interior();
    init_config();
    return 0;
}
```

```text
$ valgrind --leak-check=full --show-leak-kinds=all ./kinds
...
==3713== LEAK SUMMARY:
==3713==    definitely lost: 56 bytes in 2 blocks
==3713==    indirectly lost: 16 bytes in 1 blocks
==3713==      possibly lost: 100 bytes in 1 blocks
==3713==    still reachable: 1,024 bytes in 1 blocks
==3713==         suppressed: 0 bytes in 0 blocks
==3713== ERROR SUMMARY: 3 errors from 3 contexts (suppressed: 0 from 0)
```

`ERROR SUMMARY`가 3인 점부터 짚어 둡니다. 레코드는 다섯 개지만 기본 `--errors-for-leak-kinds=definite,possible`에 따라 definite 레코드 2개와 possible 레코드 1개만 에러로 셌습니다.

분류 기준은 *종료 시점에 그 블록을 가리키는 포인터가 어떤 모양으로 남았는가*입니다. [Memcheck 매뉴얼 4.2.10절](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.leaks)에 따르면 Memcheck는 종료 때 모든 스레드의 범용 레지스터와, 접근 가능한 메모리(스택 포함)에서 초기화되고 정렬된 포인터 크기 워드를 *루트*로 삼아 남은 블록을 찾아갑니다. 블록 시작을 가리키면 start-pointer, 중간을 가리키면 interior-pointer입니다. 매뉴얼은 이 조합을 아홉 가지 경우로 나누고 출력에서는 네 종류로 합칩니다. 집 열쇠로 비유하면 이렇습니다.

| 종류 | 4.2.10절의 정의 | 열쇠 비유 |
| --- | --- | --- |
| still reachable | 루트에서 start-pointer 사슬로 닿음 | 열쇠가 아직 주머니에 있음 |
| definitely lost | 블록을 가리키는 포인터가 하나도 없음 | 열쇠를 잃어버림 |
| indirectly lost | 가리키는 포인터는 있지만 그 포인터가 든 블록이 모두 lost | 열쇠가 잠긴 집 안에 있음 |
| possibly lost | 닿는 사슬 중 하나 이상이 interior-pointer | 열쇠처럼 생긴 쇳조각만 남음 |

네 종류의 의미를 잡지 못하면 *어디서부터 고쳐야 할지* 결정하기 어렵습니다. 이 장은 각 종류를 실제 출력으로 확인합니다.

---

## `definitely lost` — 진짜 누수

```text
==3713== 40 bytes in 1 blocks are definitely lost in loss record 3 of 5
==3713==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==3713==    by 0x1087F7: lose_plain (kinds.c:10)
==3713==    by 0x108873: main (kinds.c:14)
```

*가장 명확한 누수*입니다. 종료 시점에 어떤 포인터로도 가리켜지지 않는 메모리이고, 원인은 대개 단순한 *forget to free*입니다.

```c
__attribute__((noinline)) void lose_plain(void) { char* p = malloc(40); (void)p; }
```

`p`는 함수 안의 지역 변수이고, 반환 전에 해제도, 어디 저장도 하지 않았습니다. 함수가 끝나면 그 주소를 가진 곳이 사라집니다.

### 우선순위: 가장 높음

`definitely lost`는 *반드시 고쳐야* 합니다. 4.2.10절도 "포인터가 없으니 프로그래머가 종료 전에 해제할 방법이 없었다"며 고쳐야 할 대상으로 적습니다.

해결의 출발점은 *스택 트레이스*입니다. 다만 4.2.10절이 덧붙이듯 이 스택은 *할당한* 위치이고, 포인터를 *언제·어떻게 잃었는지*는 알려 주지 않습니다. `malloc()`을 부른 함수와 그 호출자를 따라가며 *해제할 책임자*를 찾습니다.

---

## `indirectly lost` — Definite의 자식

연결 리스트의 머리를 잃으면 꼬리도 같이 잃습니다. `kinds.c`의 `lose_list()`가 그 경우입니다.

```c
__attribute__((noinline)) void lose_list(void) {
    struct Node* head = malloc(sizeof(*head));
    head->next = malloc(sizeof(*head));   // 자식
    head->next->next = NULL;
}                                         // head를 잃어버림 → head->next도
```

```text
==3713== 16 bytes in 1 blocks are indirectly lost in loss record 1 of 5
==3713==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==3713==    by 0x1087C3: lose_list (kinds.c:7)
==3713==    by 0x108877: main (kinds.c:15)
==3713==
==3713== 32 (16 direct, 16 indirect) bytes in 1 blocks are definitely lost in loss record 2 of 5
==3713==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==3713==    by 0x1087B7: lose_list (kinds.c:6)
==3713==    by 0x108877: main (kinds.c:15)
```

`head`(6번 줄) 할당은 definitely lost, `head->next`(7번 줄) 할당은 indirectly lost입니다. arm64 LP64에서 `struct Node`는 `int` 4바이트 + 패딩 4바이트 + 포인터 8바이트로 16바이트입니다. definite 레코드의 `32 (16 direct, 16 indirect)`는 *이 블록을 고치면 함께 풀리는 양*을 미리 더해 보여 줍니다.

### 우선순위: definite와 함께

4.2.10절은 "indirect 누수를 만든 definite 블록을 고치면 문제가 사라지므로" 기본 출력에서 indirect 레코드를 따로 보여 주지 않는다고 적습니다. 그래서 `--show-leak-kinds`의 기본값(`definite,possible`)에서는 indirect 레코드가 아예 안 보입니다.

다만 "루트를 고친다"는 말을 "루트만 `free`한다"로 읽으면 안 됩니다. 루트만 해제하는 `headonly.c`를 돌렸습니다.

```c title="headonly.c"
#include <stdlib.h>
struct Node { int value; struct Node* next; };
int main(void) {
    struct Node* head = malloc(sizeof(*head));
    head->next = malloc(sizeof(*head));
    head->next->next = NULL;
    free(head);          // 루트만 해제
    return 0;
}
```

```text
==3826== 16 bytes in 1 blocks are definitely lost in loss record 1 of 1
==3826==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==3826==    by 0x108803: main (headonly.c:5)
```

자식은 그대로 남았고, 이제 가리키는 블록마저 없어져 *indirect에서 definite로* 바뀌었습니다. 보고서를 볼 때는 다음 순서로 갑니다.

1. *definite* 레코드를 모두 검토합니다.
2. definite 레코드의 괄호 안 `indirect` 바이트로 딸린 자식 그래프의 크기를 봅니다.
3. 자료 구조 전체의 소유권·해제 경로를 고친 뒤 두 분류가 모두 0이 됐는지 다시 돌려 봅니다.

`list.c`는 같은 `alloc_node()`로 리스트 두 개(5칸, 3칸)를 만들고 둘 다 잃습니다. 레코드가 리스트마다 definite 하나와 indirect 하나씩 생깁니다.

```text
==3760== 48 (16 direct, 32 indirect) bytes in 1 blocks are definitely lost in loss record 2 of 5
==3760==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==3760==    by 0x1087BB: alloc_node (list.c:3)
==3760==    by 0x1087F7: list_push (list.c:4)
==3760==    by 0x10888B: workflow_b (list.c:6)
==3760==    by 0x108907: main (list.c:8)
...
==3760== 80 (16 direct, 64 indirect) bytes in 1 blocks are definitely lost in loss record 4 of 5
==3760==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==3760==    by 0x1087BB: alloc_node (list.c:3)
==3760==    by 0x1087F7: list_push (list.c:4)
==3760==    by 0x108843: workflow_a (list.c:5)
==3760==    by 0x108903: main (list.c:8)
```

두 보고가 *같은 자료 구조*라는 것은 `direct + indirect` 합과 같은 호출 스택에서 바로 읽힙니다.

---

## `possibly lost` — *애매한* 누수

`kinds.c`의 `keep_interior()`는 100바이트를 할당하고 *10바이트 안쪽* 주소만 전역 변수에 남깁니다.

```c
__attribute__((noinline)) void keep_interior(void) { char* p = malloc(100); g_interior = p + 10; }
```

```text
==3713== 100 bytes in 1 blocks are possibly lost in loss record 4 of 5
==3713==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==3713==    by 0x108817: keep_interior (kinds.c:11)
==3713==    by 0x10887B: main (kinds.c:16)
```

`malloc()`은 *블록의 시작*을 반환했지만, 남은 포인터는 *블록 중간*을 가리킵니다. 4.2.10절은 이런 interior-pointer가 생기는 경우로, 일부러 옮긴 포인터, 하위 비트를 태그로 쓰는 포인터, 우연히 블록 안을 가리키는 쓰레기 값, 일부 C++ 객체 배치를 듭니다. Memcheck는 이 중 어느 것인지 구분할 수 없으므로 *possibly lost*로 분류하고, 매뉴얼은 "interior-pointer를 쓴다는 걸 알지 않는 한 괜찮다고 여기지 말라"고 적습니다.

### 흔한 발생 자리와 휴리스틱

C++ 객체 배치 중 몇몇은 Memcheck가 *휴리스틱*으로 알아봅니다. `--leak-check-heuristics`의 기본값은 `all`이고(`stdstring`, `length64`, `newarray`, `multipleinheritance`), 휴리스틱이 알아본 interior-pointer는 start-pointer처럼 취급해 still reachable로 셉니다([4.3절](https://valgrind.org/docs/manual/mc-manual.html#opt.leak-check-heuristics)).

1. **C++ 다중 상속**

```cpp title="mi.cpp"
struct Base1 { virtual ~Base1() = default; int a = 1; };
struct Base2 { virtual ~Base2() = default; int b = 2; };
struct Derived : Base1, Base2 {};
Base2* g_b;
int main() {
    g_b = new Derived();   // Base2 부분을 가리킴
    return 0;
}
```

`g_b`는 32바이트 `Derived` 블록의 *Base2 부분*, 곧 블록 중간을 가리킵니다. 기본 설정과 휴리스틱을 끈 설정의 결과가 다릅니다.

```text
$ valgrind --leak-check=full --show-leak-kinds=all ./mi
==3727==    still reachable: 32 bytes in 1 blocks
==3727==                       of which reachable via heuristic:
==3727==                         multipleinheritance: 32 bytes in 1 blocks
$ valgrind --leak-check=full --show-leak-kinds=all --leak-check-heuristics=none ./mi
==3745== 32 bytes in 1 blocks are possibly lost in loss record 1 of 1
==3745==      possibly lost: 32 bytes in 1 blocks
```

3.24.0 기본값으로는 다중 상속이 possibly lost로 *나오지 않습니다*. 4.3절은 이 휴리스틱이 C++ 컴파일러가 만든 객체 배치에 의존하며 일부 gcc 버전으로 시험했다고 적으므로, 다른 컴파일러에서는 `--leak-check-heuristics=none`과 비교해 봅니다.

2. **`std::string`**

```cpp title="str.cpp"
#include <string>
std::string* g_s;
std::string g_long(100, 'x');
int main() {
    g_s = new std::string(100, 'y');
    return 0;
}
```

`stdstring` 휴리스틱은 4.2.10절 설명대로 길이·용량·참조 카운트를 블록 앞에 두고 *그 뒤*를 가리키는 일부 컴파일러의 `std::string` 구현을 위한 것입니다. GCC 14의 libstdc++(C++11 ABI, `std::__cxx11::basic_string`)에서는 문자열 포인터가 힙 블록 *시작*을 가리키므로 휴리스틱 없이도 still reachable입니다.

```text
==3730== 101 bytes in 1 blocks are still reachable in loss record 2 of 2
==3730==    at 0x4885C0C: operator new(unsigned long) (vg_replace_malloc.c:487)
==3730==    by 0x4A1118F: std::__cxx11::basic_string<char, std::char_traits<char>, std::allocator<char> >::_M_construct(unsigned long, char) (in /usr/lib/aarch64-linux-gnu/libstdc++.so.6.0.33)
...
==3730==    still reachable: 133 bytes in 2 blocks
```

101바이트는 문자 100개와 종료 문자이고, 나머지 32바이트는 `new std::string` 객체 자체입니다. 요약에 `of which reachable via heuristic` 줄이 없다는 점이 휴리스틱을 쓰지 않았다는 증거입니다. 전역 `g_long`의 버퍼도 101바이트입니다(`total heap usage: 4 allocs, 2 frees, 73,962 bytes allocated` = 32 + 101 + 101 + libstdc++ 초기화 블록 73,728). 그런데 레코드가 하나뿐인 이유는, 전역 객체 소멸자가 종료 처리 중에 그 버퍼를 해제했기 때문입니다.

3. **메모리 풀**

```c title="pool.c"
#include <stdlib.h>
char* slot1; char* slot2;
__attribute__((noinline)) void make_pool(void) {
    char* pool = malloc(1024);
    slot1 = pool + 100;
    slot2 = pool + 200;
}
int main(void) { make_pool(); return 0; }
```

풀의 시작 포인터는 잃고 슬롯 포인터만 남았습니다. 휴리스틱 네 가지 어디에도 해당하지 않으므로 기본값에서도 `1,024 bytes in 1 blocks are possibly lost`입니다.

### 우선순위: 검토 후 판단

*possibly lost*는 *케이스별 판단*이 필요합니다.

- 우리 코드가 의도적으로 interior-pointer를 쓰는지 먼저 확인합니다. 메모리 풀처럼 시작 포인터를 잃은 것이라면 *진짜 누수*입니다.
- 의도적이라면 시작 포인터를 따로 보관하거나, 풀을 [4.8절의 메모리 풀 client request](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.mempools)로 Memcheck에 설명합니다.

기본 `--show-leak-kinds=definite,possible`이 possible을 함께 보여 주는 것도, 기본 `--errors-for-leak-kinds`가 possible을 에러로 세는 것도 이 때문입니다. possibly lost가 우리 코드 자리면 *definite처럼 다룹니다*.

---

## `still reachable` — *살아 있는 캐시*

```c title="cleanup.c"
#include <stdlib.h>
char* g_config = NULL;
void cleanup_config(void) { free(g_config); g_config = NULL; }
void init_config(int clean) {
    g_config = malloc(1024);
    if (clean) atexit(cleanup_config);
}
int main(int argc, char** argv) { (void)argv; init_config(argc > 1); return 0; }
```

`g_config`는 *전역 변수*라 프로그램 종료까지 살아 있고, 메모리도 그 포인터로 *여전히 도달 가능*합니다. 인자 없이 돌리면 종료 시점에 free하지 않았지만, 4.2.10절의 정의로는 누수가 아니라 still reachable입니다.

```text
$ valgrind --leak-check=full --show-leak-kinds=all ./cleanup
==3736== 1,024 bytes in 1 blocks are still reachable in loss record 1 of 1
==3736==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==3736==    by 0x10886B: init_config (cleanup.c:5)
==3736==    by 0x1088C3: main (cleanup.c:8)
...
==3736== ERROR SUMMARY: 0 errors from 0 contexts (suppressed: 0 from 0)
```

### 흔한 자리

- 전역 캐시 (config, lookup table)
- 정적 변수가 잡고 있는 힙 블록
- 휴리스틱이 알아본 C++ interior-pointer (위의 다중 상속 예)

### 우선순위: 증가 여부로 판단

4.2.10절은 still reachable을 "매우 흔하고, 문제라고 보기 어렵다"고 적고 기본 출력에서 개별 레코드를 보여 주지 않습니다. 실무 판단의 기준은 *크기가 늘어나는가*입니다. 종료 시 한 번 남는 1 KiB 설정 버퍼와, 요청마다 항목이 쌓이는 캐시는 같은 still reachable로 나오지만 서버에서의 영향은 전혀 다릅니다. 같은 테스트를 입력 크기만 바꿔 두 번 돌려 바이트 수가 따라 늘면 무제한 캐시입니다.

```bash
# CI에서는 reachable 제외
--errors-for-leak-kinds=definite,indirect
```

어떤 정적 캐시가 종료 시 정리되지 않는지 *문서화*해 두면, 나중에 *누수처럼 보이는 신규 코드*를 빨리 식별할 수 있습니다.

### `still reachable`을 *진짜 정리*하고 싶을 때

릴리스 모드에서 *완전 클린*을 원하면 `atexit()` 핸들러를 등록합니다. 위 `cleanup.c`에 인자를 주면 그 경로로 갑니다.

```text
$ valgrind --leak-check=full --show-leak-kinds=all ./cleanup x
==3739==     in use at exit: 0 bytes in 0 blocks
==3739==   total heap usage: 1 allocs, 1 frees, 1,024 bytes allocated
==3739== All heap blocks were freed -- no leaks are possible
```

C++에서는 함수 안 `static` 객체의 소멸자가 종료 처리 중에 자동으로 호출됩니다.

```cpp title="singleton.cpp"
#include <vector>
class Config {
public:
    static Config& instance() { static Config inst; return inst; }
    std::vector<int> data = std::vector<int>(256);
};
int main() { return Config::instance().data[0]; }
```

`std::vector<int>(256)`의 1 KiB 버퍼까지 `2 allocs, 2 frees`로 정리되어 `All heap blocks were freed`가 나왔습니다. 할당은 두 개(`total heap usage: 2 allocs, 2 frees, 74,752 bytes allocated`)입니다. 하나는 이 vector이고, 다른 하나는 Massif로 따라가 보니 `_dl_init`이 libstdc++의 초기화 코드를 부를 때 할당된 73,728바이트 블록이었습니다. 이 블록도 종료 때 해제되어 reachable로 남지 않았습니다.

---

## *우선순위 결정 알고리즘*

`kinds.c`의 LEAK SUMMARY로 돌아가 보겠습니다.

```text
==3713==    definitely lost: 56 bytes in 2 blocks
==3713==    indirectly lost: 16 bytes in 1 blocks
==3713==      possibly lost: 100 bytes in 1 blocks
==3713==    still reachable: 1,024 bytes in 1 blocks
```

이걸 고치는 순서는 다음과 같습니다.

1. **definite 2개 블록 검토** — `lose_plain`의 40바이트와 `lose_list`의 `head` 16바이트입니다. 블록 수는 loss record 수와 다를 수 있으므로 레코드마다 `in N blocks`를 봅니다.
2. **indirect의 자식 정리 확인** — `head`만 `free`하면 자식이 definite로 바뀌는 것을 위에서 봤습니다. 리스트 전체를 순회하며 해제합니다.
3. **possible 1개 블록 검토** — `keep_interior`가 시작 포인터를 버린 것이 의도인지 확인합니다.
4. **reachable은 증가 여부만 확인** — 1 KiB 설정 버퍼가 입력에 따라 늘지 않으면 문서화하고 넘어갑니다.

바이트 크기로 순서를 정하지 않는다는 점이 중요합니다. 가장 큰 것은 1,024바이트 reachable이지만 가장 덜 급합니다. 반대로 하나의 소유권 오류가 여러 loss record로 나뉘어 보일 수도 있으니(아래 재귀 예), 레코드 수보다 *할당 스택이 가리키는 소유권 경로* 단위로 묶어서 고칩니다.

---

## *loss record* — 같은 자리의 누수를 묶음

`list.c`의 `lose_many()`는 루프에서 `alloc_node()`를 5번 부르고 결과를 모두 버립니다.

```text
==3760== 80 bytes in 5 blocks are definitely lost in loss record 5 of 5
==3760==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==3760==    by 0x1087BB: alloc_node (list.c:3)
==3760==    by 0x1088CB: lose_many (list.c:7)
==3760==    by 0x10890B: main (list.c:8)
```

`in 5 blocks`가 핵심입니다. *같은 종류, 충분히 비슷한 호출 스택*의 블록 5개가 레코드 하나로 묶였습니다(4.2.10절).

반복 호출되는 경로에서 누수가 일어나면 이 숫자는 호출 횟수를 따라 늘어납니다.

| `blocks` 카운트 | 의미 |
|----------------|------|
| `in 1 blocks` | 이 실행에서 해당 스택으로 남은 블록이 하나입니다. 일회성인지 반복되는지는 입력을 바꿔 다시 돌려 봐야 압니다. |
| `in N blocks` | 해당 loss record에 묶인 미해제 블록 수입니다. 호출 횟수와 같은지는 테스트의 반복 횟수와 비교해 확인합니다. |

예를 들어 서버에서 `process_request`가 분당 1000번 호출되고 *매번* 40바이트를 잃는다면, 산술로 1시간에 60,000블록, 2.4 MB가 쌓입니다. 이런 누수는 *반드시 고칩니다*. 아래 "실전 시나리오"에서 이 경우를 실제로 돌립니다.

---

## 보고서 *그룹화*

같은 *스택 트레이스*는 한 loss record로 묶이고, 다른 트레이스는 *다른 record*가 됩니다. 앞의 `list.c` 출력에서 리스트 두 개는 둘 다 `malloc → alloc_node → list_push`를 거쳤지만, 바로 위 호출자가 `workflow_a`(record 4)와 `workflow_b`(record 2)로 달라서 별개 record로 나왔습니다.

| record | 스택 (안쪽 → 바깥쪽) | 내용 |
| --- | --- | --- |
| 2 | malloc → alloc_node → list_push → workflow_b → main | `48 (16 direct, 32 indirect)` |
| 4 | malloc → alloc_node → list_push → workflow_a → main | `80 (16 direct, 64 indirect)` |
| 5 | malloc → alloc_node → lose_many → main | `80 bytes in 5 blocks` |

같은 `alloc_node`가 할당했어도 *상위 호출자*가 다르면 별개 record입니다. 각각의 *호출 컨텍스트*가 소유권을 잃은 자리를 보여 줍니다.

---

## `--leak-resolution` — 트레이스 매칭 정밀도

`--leak-resolution=low|med|high`로 *몇 프레임까지 같아야 같은 record로 묶을지* 정합니다([4.3절](https://valgrind.org/docs/manual/mc-manual.html#opt.leak-resolution)).

```bash
valgrind --leak-check=full --leak-resolution=high ./myapp
```

- `low` — 위쪽 2개 프레임만 같으면 같은 record입니다.
- `med` — 위쪽 4개 프레임이 같아야 합니다.
- `high` — 기본값이며, 기록된 모든 프레임이 같아야 합니다.

4.3절은 이 옵션이 "누수를 찾는 능력에는 영향을 주지 않고 결과를 보여 주는 방식만 바꾼다"고 적습니다. 기록되는 프레임 수 자체는 `--num-callers`(기본 12)가 정합니다.

---

## *재귀 함수*의 누수 — 트레이스 인식

재귀는 `--leak-resolution`의 차이가 가장 크게 드러나는 경우입니다. 깊이 10까지 내려가며 호출마다 40바이트를 잃습니다.

```c title="recur.c"
#include <stdlib.h>
__attribute__((noinline)) void recursive(int depth) {
    if (depth == 0) return;
    char* volatile buf = malloc(40);   // 매 호출마다 누수
    (void)buf;
    recursive(depth - 1);
    __asm__ volatile("" ::: "memory");
}
int main(void) { recursive(10); return 0; }
```

기본값 `high`에서는 *재귀 깊이마다* 스택이 한 프레임씩 길어지므로 레코드 10개가 생기고, 에러도 10개로 셉니다.

```text
$ valgrind --leak-check=full ./recur
==3780== 40 bytes in 1 blocks are definitely lost in loss record 1 of 10
==3780==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==3780==    by 0x1087C7: recursive (recur.c:4)
==3780==    by 0x1087FB: main (recur.c:9)
==3780==
==3780== 40 bytes in 1 blocks are definitely lost in loss record 2 of 10
==3780==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==3780==    by 0x1087C7: recursive (recur.c:4)
==3780==    by 0x1087DB: recursive (recur.c:6)
==3780==    by 0x1087FB: main (recur.c:9)
...
==3780== ERROR SUMMARY: 10 errors from 10 contexts (suppressed: 0 from 0)
```

세 가지 해상도의 레코드 수를 비교했습니다.

| `--leak-resolution` | loss record | 묶인 모양 |
| --- | ---: | --- |
| `high` (기본) | 10 | 깊이마다 `40 bytes in 1 blocks` |
| `med` | 3 | `40` + `40` + `320 bytes in 8 blocks` |
| `low` | 1 | `400 bytes in 10 blocks` |

`med`가 3개인 이유는 위쪽 4개 프레임 때문입니다. 가장 얕은 두 호출은 4프레임 안에 `main`이 들어가 서로 다르고, 나머지 8개는 `malloc → recursive → recursive → recursive`로 같습니다. `low`로 묶으면 레코드 하나에 첫 블록의 스택 하나만 남습니다.

```text
$ valgrind --leak-check=full --leak-resolution=low ./recur
==3782== 400 bytes in 10 blocks are definitely lost in loss record 1 of 1
==3782==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==3782==    by 0x1087C7: recursive (recur.c:4)
==3782==    by 0x1087FB: main (recur.c:9)
```

재귀 코드의 누수는 `low`로 *한 덩어리*로 본 뒤, 원인 줄(`recur.c:4`)을 찾으면 기본값으로 돌아가는 편이 읽기 쉽습니다. `low`에서는 에러 개수도 1개로 줄어드는 점에 주의합니다. CI에서 에러 개수를 추적하고 있다면 해상도를 바꾸지 않습니다.

---

## *Reachable from*

`--show-reachable=yes`는 `--show-leak-kinds=all`과 같고, reachable만 보려면 `--show-leak-kinds=reachable`을 씁니다(4.3절). `kinds.c`를 reachable만 보게 돌리면 레코드 하나만 남습니다.

```text
$ valgrind --leak-check=full --show-leak-kinds=reachable ./kinds
==3807== 1,024 bytes in 1 blocks are still reachable in loss record 5 of 5
```

record 번호가 `5 of 5`로 남는 것은 번호가 필터 전에 매겨지기 때문입니다. 레코드의 스택은 다른 레코드와 마찬가지로 *할당 위치*이고, 지금 그 블록을 붙잡고 있는 포인터의 위치는 아닙니다. 누가 붙잡고 있는지 알고 싶으면 Ch 2의 vgdb 세션에서 쓴 `monitor who_points_at <주소>`로 물어봅니다.

할당 위치를 출발점으로 소유권과 증가 추세를 조사합니다. 스택 하나만으로 의도와 무해성을 확정하지 않습니다.

---

## *실전 시나리오* — 서버 누수 디버깅

서버 프로세스의 RSS가 시간이 갈수록 늘어나는 상황을 가정합니다. 서버 전체를 Valgrind 아래에서 몇 시간씩 돌리면 Ch 1에서 잰 10배 이상의 배율 때문에 비현실적이므로, *짧은 단위 테스트*로 누수를 *반복 트리거*합니다.

### 1. 짧은 시나리오로 재현

`process_request()`를 1000번 부르는 테스트입니다. 인자를 주면 수정된 경로(`free(hdr)`)로 갑니다.

```c title="server.c"
#include <stdlib.h>
#include <string.h>
typedef struct { char method[8]; char path[32]; } Header;
__attribute__((noinline)) Header* parse_header(const char* input) {
    Header* h = malloc(sizeof *h);
    memset(h, 0, sizeof *h);
    strncpy(h->method, input, sizeof h->method - 1);
    return h;
}
__attribute__((noinline)) void process_request(const char* input, int fixed) {
    Header* hdr = parse_header(input);
    if (hdr->method[0] == 'G') { /* 처리 */ }
    if (fixed) free(hdr);
}
int main(int argc, char** argv) {
    (void)argv;
    for (int i = 0; i < 1000; i++) process_request("GET /", argc > 1);
    return 0;
}
```

### 2. Valgrind 실행

```bash
valgrind --leak-check=full --show-leak-kinds=all \
         --track-origins=yes ./server 2>&1 | tee valgrind.out
```

### 3. 보고서 분석

```text
==3784== 40,000 bytes in 1,000 blocks are definitely lost in loss record 1 of 1
==3784==    at 0x488545C: malloc (vg_replace_malloc.c:446)
==3784==    by 0x10887B: parse_header (server.c:5)
==3784==    by 0x1088C3: process_request (server.c:11)
==3784==    by 0x10891F: main (server.c:17)
```

`in 1,000 blocks`가 테스트의 반복 횟수와 정확히 같습니다. `process_request`를 *부를 때마다* 40바이트(`Header`의 8 + 32바이트)를 잃는다는 뜻입니다.

### 4. 코드 검토

```c
void process_request(const char* input) {
    Header* hdr = parse_header(input);   // malloc 결과
    // ... 처리 ...
    // ❌ free(hdr) 빠짐
}
```

해결: `free(hdr)` 추가, 또는 RAII (C++의 경우).

### 5. 재실행 검증

같은 테스트를 수정 경로로 다시 돌려 *누수가 0이 됐는지* 확인합니다.

```text
$ valgrind --leak-check=full ./server fixed
==3786==     in use at exit: 0 bytes in 0 blocks
==3786==   total heap usage: 1,000 allocs, 1,000 frees, 40,000 bytes allocated
==3786== All heap blocks were freed -- no leaks are possible
```

`1,000 allocs, 1,000 frees`로 짝이 맞았습니다.

---

## 실행 입력 — 연결된 할당 전체 정리

마지막으로 루트 하나와 자식 하나로 된 그래프를 세 가지로 끝내 봅니다. `keep`은 전역 루트를 보존하고, `lost`는 루트 포인터를 지우고, `free`는 자식부터 해제합니다.

```c title="graph.c"
#include <stdlib.h>
#include <string.h>
struct Node { char* payload; };
struct Node* root;
int main(int argc, char** argv) {
    root = malloc(sizeof(*root));
    if (!root) return 1;
    root->payload = malloc(80);
    if (!root->payload) { free(root); root = NULL; return 1; }
    memset(root->payload, 0, 80);
    if (argc > 1 && strcmp(argv[1], "free") == 0) {
        free(root->payload);
        free(root);
        root = NULL;
    } else if (argc > 1 && strcmp(argv[1], "lost") == 0) {
        root = NULL;
    }
    return 0;
}
```

```bash
cc -g -O0 graph.c -o graph
valgrind --leak-check=full --show-leak-kinds=all ./graph keep
valgrind --leak-check=full --show-leak-kinds=all ./graph lost
valgrind --leak-check=full --show-leak-kinds=all ./graph free
```

| 입력 | 결과 | `ERROR SUMMARY` |
| --- | --- | ---: |
| `keep` | 8 B·80 B 블록 둘 다 still reachable (`88 bytes in 2 blocks`) | 0 |
| `lost` | `88 (8 direct, 80 indirect) bytes in 1 blocks are definitely lost` + 80 B indirectly lost | 1 |
| `free` | `All heap blocks were freed -- no leaks are possible` | 0 |

같은 두 블록이 루트를 어떻게 다뤘느냐에 따라 reachable, definite+indirect, 0으로 나뉩니다. `lost`의 에러가 2개가 아니라 1개인 것은 indirect가 기본 `--errors-for-leak-kinds`에 들어 있지 않기 때문입니다.

## 정리

- **definitely lost** — 가리키는 포인터가 없는 블록입니다. *가장 먼저 고칩니다*.
- **indirectly lost** — lost 블록 안에서만 가리켜지는 블록입니다. 루트만 `free`하면 자식이 definite로 바뀌므로 자료 구조 전체를 해제합니다. 기본 출력에서는 숨겨집니다.
- **possibly lost** — interior-pointer만 남은 블록입니다. 3.24.0의 기본 휴리스틱은 다중 상속을 reachable로 돌렸고, GCC 14의 `std::string`은 휴리스틱 없이 reachable이었습니다. 메모리 풀처럼 시작 포인터를 잃은 경우가 진짜 문제입니다.
- **still reachable** — 시작 포인터가 남은 블록입니다. 증가하는지로 판단하고, 정리하려면 `atexit` 또는 함수 안 `static` 객체를 씁니다.
- `in N blocks`는 같은 스택으로 묶인 블록 수입니다. 테스트 반복 횟수와 비교하면 호출마다 새는지 알 수 있습니다.
- `--leak-resolution`은 묶는 방식만 바꿉니다. 재귀 10단계가 `high` 10개, `med` 3개, `low` 1개 레코드로 나왔습니다.
- 디버깅 흐름: *짧은 재현 → Valgrind → 보고서 분석 → 코드 수정 → 재검증*.

## 다음 장 예고

[Ch 4: Helgrind와 DRD](/blog/tools/debugging/valgrind/chapter04-helgrind-drd)에서는 멀티스레드 분석 두 도구를 비교합니다. 같은 레이스·잠금 순서·condition variable 오용 프로그램을 두 도구에 돌려 무엇을 잡고 무엇을 놓치는지 봅니다.

## 참고 자료

- [Memcheck Leak Detection (4.2.10)](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.leaks) — 루트 집합, 아홉 가지 경우, 네 가지 종류
- [Memcheck Command-line Options (4.3)](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.options) — `--leak-resolution`, `--leak-check-heuristics`, `--show-leak-kinds`
- [Memory Pools (4.8)](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.mempools)

## 관련 항목

- [Ch 2: Valgrind Memcheck 실전](/blog/tools/debugging/valgrind/chapter02-memcheck) — 이전 글. 이 보고서를 만들어 내는 옵션들
- [Ch 4: Valgrind Helgrind와 DRD](/blog/tools/debugging/valgrind/chapter04-helgrind-drd) — 다음 글. 메모리에서 동시성으로
- [LSan 누수 분석 — Stop-the-world Leak Detection 메커니즘](/blog/tools/debugging/sanitizers/chapter03-lsan-leaks) — 같은 누수를 Sanitizer 쪽에서 보는 방법. `still reachable` 판정 차이가 흥미롭습니다
- [운영 메모리 누수 진단](/blog/tools/debugging/memory/chapter05-prod-leak-diagnosis) — Valgrind를 붙일 수 없는 long-running 프로세스의 대안
- [Memcheck Leak Detection](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.leaks) — 네 가지 누수 분류의 공식 정의
