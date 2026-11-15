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

`--leak-check=full --show-leak-kinds=all`로 실행하면 보고서 끝에 *LEAK SUMMARY*가 나옵니다.

**LEAK SUMMARY:**

- definitely lost: 40 bytes in 1 blocks
- indirectly lost: 80 bytes in 5 blocks
- possibly lost: 16 bytes in 1 blocks
- still reachable: 256 bytes in 3 blocks
- suppressed: 0 bytes in 0 blocks

네 종류의 의미를 정확히 잡지 못하면 *어디서부터 고쳐야 할지* 결정이 어렵습니다. 이 장은 그 네 가지를 *정확히* 다룹니다.

---

## `definitely lost` — 진짜 누수

```text
40 bytes in 1 blocks are definitely lost in loss record 1 of 1
   at 0x483977F: malloc
   by 0x10918A: main (leak.c:5)
```

*가장 명확한 누수*. 종료 시점에 어떤 포인터로도 가리켜지지 않는 메모리. 단순한 *forget to free*가 원인.

```c
char* p = malloc(40);
// p가 어디에도 저장 안 됨, 함수 종료
```

`p`가 함수 안의 지역 변수이고 *반환 전에 해제도, 어디 저장도* 안 됐다면 *definitely lost*.

### 우선순위: 가장 높음

`definitely lost`는 *반드시 고쳐야* 합니다. 누군가가 *이전에 가리키고 있었지만 잃어버린* 명백한 사고입니다.

해결의 출발점은 *스택 트레이스*입니다. `malloc()`이 어디서 호출됐는지 보고, 그 위 호출자에서 *해제할 책임자*를 찾습니다.

---

## `indirectly lost` — Definite의 자식

```c
struct Node {
    int value;
    struct Node* next;
};

struct Node* head = malloc(sizeof(*head));
head->next = malloc(sizeof(*head));    // ← 자식
head->next->next = NULL;
// head를 잃어버림 → head->next도 잃어버림
```

이 경우:
- head 할당은 definitely lost, head->next 할당은 indirectly lost가 될 수 있습니다.
- 각 할당 크기는 sizeof(struct Node)이며 ABI에 따라 달라집니다.

`head`가 잃어버려진 순간 `head->next`도 *도달 불가능*해집니다. 두 누수는 *같은 사고의 부산물*입니다.

### 우선순위: definite와 함께

루트를 잃어버린 원인을 고치고 연결된 자식까지 순회 해제해야 합니다. head만 free하면 자식은 여전히 누수이며 오히려 definite로 바뀔 수 있습니다.

보고서를 볼 때:

1. *definite* 항목들을 모두 검토.
2. 각 definite의 *자식 그래프*가 indirect로 묶임.
3. 자료 구조 전체의 소유권·해제 경로를 고친 뒤 두 분류가 모두 해소됐는지 확인합니다.

```text
40 bytes in 1 blocks are definitely lost in loss record X
   at 0x483977F: malloc
   by 0x10918A: main (list.c:10)

80 bytes in 5 blocks are indirectly lost in loss record Y
   at 0x483977F: malloc
   by 0x10918A: append (list.c:25)
```

두 보고가 *같은 자료 구조*임을 알면 디버깅이 빨라집니다.

---

## `possibly lost` — *애매한* 누수

```c
char* p = malloc(100);
p += 10;       // 포인터 내부를 가리킴
// 종료
```

`malloc()`이 *블록의 시작*을 반환했지만, 변수 `p`는 *블록 중간*을 가리킵니다. Memcheck는 이렇게 판단합니다:

> 이 포인터가 *진짜 그 블록의 시작*을 의도한 것인지, 아니면 *우연히 그 안쪽*을 가리키는 것인지 모르겠다.

이게 *possibly lost*입니다. *interior pointer*(블록 내부 포인터)가 원인.

### 흔한 발생 자리

1. **C++ 다중 상속**

```cpp
struct Base1 { virtual ~Base1() = default; int a = 1; };
struct Base2 { virtual ~Base2() = default; int b = 2; };
struct Derived : Base1, Base2 {};

Base2* b = new Derived();   // b는 Derived의 *Base2 부분*을 가리킴 (블록 중간)
// b만 루트로 남으면 ABI·휴리스틱에 따라 내부 포인터로 분류될 수 있음
```

비어 있는 기반 클래스는 empty base 최적화로 같은 주소일 수 있습니다. 위처럼 멤버가 있는 경우에도 정확한 배치와 Memcheck의 multipleinheritance 휴리스틱을 확인합니다. 내부 포인터도 잃어버리면 possibly가 아니라 definite 쪽 분류가 될 수 있습니다.

2. **STL 컨테이너 내부 구현**

```cpp
std::string s("hello");   // 내부적으로 SSO 또는 heap 할당
```

`std::string` 같은 STL 구현이 *내부 포인터*를 들고 있을 수 있어 possibly로 잡힘.

3. **메모리 풀**

```c
char* pool = malloc(1024);
char* slot1 = pool + 100;
char* slot2 = pool + 200;
// pool이 사라지면 slot1, slot2는 possibly lost
```

### 우선순위: 검토 후 판단

*possibly lost*는 *케이스별 판단*이 필요합니다.

- 다중 상속·STL도 소유권·해제 경로·내부 포인터와 휴리스틱 적용을 확인합니다. 이름만으로 오탐으로 분류하지 않습니다.
- 메모리 풀에서 정리 잊은 거면 *진짜 누수*.

`--show-leak-kinds=definite,possible`로 함께 검사하고, possibly가 우리 코드 자리면 *definite처럼 다룸*.

---

## `still reachable` — *살아 있는 캐시*

```c
char* g_config = NULL;

void init_config() {
    g_config = malloc(1024);
}

int main() {
    init_config();
    // free(g_config) 없이 종료
}
```

`g_config`는 *전역 변수*라 프로그램 종료까지 살아 있습니다. 메모리도 그 포인터로 *여전히 도달 가능*. 종료 시점에 free 안 했지만 *기술적으로 누수가 아닙니다*.

### 흔한 자리

- 전역 캐시 (config, lookup table)
- 정적 변수 (Singleton)
- `atexit()` 핸들러가 들고 있는 메모리
- 라이브러리 내부 상태 (예: zlib의 internal buffer)
- C++의 정적 로컬 (`static T instance;`)

### 우선순위: 보통 무시

still reachable은 현재 루트에서 도달 가능하다는 분류입니다. 의도한 종료 시 보존인지, 요청마다 늘어나는 무제한 캐시인지에 따라 영향과 CI 정책이 달라집니다.

```bash
# CI에서는 reachable 제외
--errors-for-leak-kinds=definite,indirect
```

다만 *왜* reachable인지 알면 좋습니다. 어떤 정적 캐시가 종료 시 정리되지 않는지 *문서화*해 두면, 나중에 *누수처럼 보이는 신규 코드*를 빨리 식별할 수 있습니다.

### `still reachable`을 *진짜 정리*하고 싶을 때

릴리스 모드에서 *완전 클린*을 원하면 `atexit()` 핸들러를 등록합니다.

```c
char* g_config = NULL;

void cleanup_config(void) {
    free(g_config);
    g_config = NULL;
}

void init_config(void) {
    g_config = malloc(1024);
    atexit(cleanup_config);
}
```

C++에서는 *Singleton 소멸자*가 자동 호출됩니다.

```cpp
class Config {
public:
    static Config& instance() {
        static Config inst;   // 종료 시 자동 소멸
        return inst;
    }
};
```

이 객체의 해제 경로는 만들 수 있지만, 다른 런타임·라이브러리 할당까지 포함한 전체 reachable=0을 보장하지는 않습니다. 종료 순서와 서비스 반복 사용 목적도 함께 확인합니다.

---

## *우선순위 결정 알고리즘*

LEAK SUMMARY가 다음과 같다고 합시다.

```text
   definitely lost: 240 bytes in 6 blocks
   indirectly lost: 1024 bytes in 12 blocks
     possibly lost: 80 bytes in 2 blocks
   still reachable: 4096 bytes in 8 blocks
```

이걸 고치는 순서:

1. **definite 6개 블록 검토** — 블록 수는 loss record 수와 다릅니다. 할당 스택과 소유권을 확인합니다.
2. **indirect의 자식 정리 확인** — 루트만 free하지 않고 자료 구조 전체를 정리합니다.
3. **possible 2개 블록 검토** — 라이브러리 종류와 무관하게 내부 포인터·해제 경로를 확인합니다.
4. **reachable은 검토만** — 의도된 정적 데이터인지 확인. 보통 무시.

분류만으로 우선순위를 확정하지 않고 재현 빈도·증가량·사용자 영향·해제 책임을 함께 기록합니다. 하나의 소유권 오류가 여러 loss record로 보일 수도 있습니다.

---

## *loss record* — 같은 자리의 누수를 묶음

```text
40 bytes in 5 blocks are definitely lost in loss record 3 of 8
   at 0x483977F: malloc
   by 0x10918A: alloc_node (list.c:5)
   by 0x1091CD: list_push (list.c:18)
   by 0x109234: main (main.c:42)
```

`in 5 blocks`가 핵심입니다. *같은 호출 트레이스에서 5번 할당이 일어났는데, 5개 모두 누수*.

이게 *통계적 가치*가 큽니다. *반복 호출되는 핫 패스*에서 누수가 일어나면, 시간이 지날수록 *메모리가 누적*됩니다.

| `blocks` 카운트 | 의미 |
|----------------|------|
| `in 1 blocks` | 이번 검색에서 미해제인 블록 하나입니다. 일회성인지 반복되는지는 추가 관찰이 필요합니다. |
| `in N blocks` | 해당 loss record에 묶인 미해제 블록 수입니다. 호출 빈도나 시간당 증가율을 직접 뜻하지 않습니다. |

서버에서 `process_request`가 분당 1000번 호출되고 *매번 누수*면, 1시간 후 60,000개 블록이 쌓입니다. *반드시 고침*.

---

## 보고서 *그룹화*

같은 *스택 트레이스*는 한 loss record로 묶입니다. 다른 트레이스는 *다른 record*.

```text
== loss record 1 ==
malloc → alloc_node → list_push → main           (5 blocks)

== loss record 2 ==
malloc → alloc_node → list_push → workflow_b     (3 blocks)
```

같은 `alloc_node`가 호출되지만 *상위 호출자*가 다르므로 별개 record. 각각의 *호출 컨텍스트*가 진짜 사고를 보여 줍니다.

---

## `--leak-resolution` — 트레이스 매칭 정밀도

`--leak-resolution=med|high|low`로 *얼마나 정밀하게* 트레이스를 비교할지 정합니다.

```bash
valgrind --leak-check=full --leak-resolution=high ./myapp
```

- `low` — 상위 2 프레임만 매칭. 같은 함수에서 호출이면 같은 record.
- med는 할당 지점부터 4개 프레임을 비교합니다.
- high가 기본값이며 기록된 모든 프레임을 비교합니다.

이 옵션은 보고서를 묶는 기준이며 누수 탐지 능력을 바꾸지 않습니다. num-callers로 저장한 깊이도 함께 확인하고, 필요할 때 기본 high에서 묶음 기준을 낮춥니다.

---

## *재귀 함수*의 누수 — 트레이스 인식

```c
void recursive(int depth) {
    if (depth == 0) return;
    char* buf = malloc(40);   // 매 호출마다 누수
    recursive(depth - 1);
}
```

Valgrind는 *재귀의 각 깊이*를 *다른 호출자 컨텍스트*로 봅니다. 깊이 10이면 10개의 *서로 다른 loss record*가 생길 수 있습니다.

```text
40 bytes in 1 blocks definitely lost
   at malloc
   by recursive (depth 1)
   by main

40 bytes in 1 blocks definitely lost
   at malloc
   by recursive (depth 2)
   by recursive (depth 1)
   by main
   
... (10번 반복)
```

`--leak-resolution=low`로 *상위 몇 프레임만 매칭*하면 *한 loss record*로 묶을 수 있습니다. 재귀 코드의 누수는 *low 해상도*가 디버깅에 더 편합니다.

---

## *Reachable from*

show-reachable=yes는 show-leak-kinds=all과 동치입니다. reachable만 보려면 show-leak-kinds=reachable을 사용합니다. 일반 보고 스택은 할당 위치이며 현재 루트 포인터의 위치를 직접 보여 주는 것은 아닙니다.

```text
256 bytes in 1 blocks are still reachable in loss record 1
   at 0x483977F: malloc
   by 0x10918A: init_config (config.c:10)
   by 0x109234: main (main.c:5)
```

이 자리는 *config.c:10*에서 할당된 것이고 종료 시점에도 *살아 있는 포인터로 가리켜진다*는 뜻. 보통 전역 변수 또는 정적 캐시.

할당 위치를 출발점으로 소유권과 증가 추세를 조사합니다. 스택 하나만으로 의도와 무해성을 확정하지 않습니다.

---

## *실전 시나리오* — 서버 누수 디버깅

서버 코드에서 *시간당 1MB씩 메모리가 늘어나는* 상황. Valgrind로 추적하는 절차:

### 1. 짧은 시나리오로 재현

서버 전체를 24시간 돌릴 수는 없습니다. *짧은 단위 테스트*로 누수를 *반복 트리거*.

```c
// test_leak.c
for (int i = 0; i < 1000; i++) {
    process_request("test input");
}
```

`process_request`를 1000번 호출. 누수가 있다면 *같은 자리에서 1000개 블록*이 잡힐 것.

### 2. Valgrind 실행

```bash
valgrind --leak-check=full --show-leak-kinds=all \
         --track-origins=yes ./test_leak 2>&1 | tee valgrind.out
```

### 3. 보고서 분석

```text
40000 bytes in 1000 blocks are definitely lost in loss record 5 of 7
   at malloc
   by parse_header (parser.c:42)
   by process_request (server.c:88)
```

`in 1000 blocks` = 1000번 누수 = `process_request`에서 호출되는 *모든 요청에서* 누수.

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

같은 테스트를 다시 돌려 *누수가 0이 됐는지* 확인.

---

## 실행 입력 — 연결된 할당 전체 정리

아래 그래프는 head와 payload 두 할당을 만들고, keep은 루트 보존, lost는 루트 제거, free는 자식부터 해제합니다. 분류 비교용 Linux 입력이며 현재 macOS에서는 컴파일과 free 분기만 실행했습니다. 실제 분류·휴리스틱·블록 수는 Memcheck 검증 대기입니다.

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

## 정리

- **definitely lost** — 진짜 누수. *가장 먼저 고침*.
- **indirectly lost** — 잃어버린 자료 구조의 자식도 함께 해제해야 해결됩니다.
- **possibly lost** — 내부 포인터·휴리스틱·소유권을 확인하며 다중 상속·STL도 자동 제외하지 않습니다.
- **still reachable** — 살아 있는 캐시. *보통 무시*. 정리하고 싶으면 `atexit` 또는 Singleton.
- in N blocks는 현재 누수 블록 수이며 호출 빈도·누수율은 반복 관찰로 확인합니다.
- `--leak-resolution`으로 트레이스 매칭 정밀도 조절. 재귀 코드는 `low` 권장.
- 디버깅 흐름: *짧은 재현 → Valgrind → 보고서 분석 → 코드 수정 → 재검증*.

## 다음 장 예고

[Ch 4: Helgrind와 DRD](/blog/tools/debugging/valgrind/chapter04-helgrind-drd)에서는 멀티스레드 분석 두 도구를 비교합니다. Helgrind의 락 추적, DRD의 vector clock 모델, 둘 중 *언제 무엇을* 선택할지.

## 참고 자료

- [Memcheck Leak Detection](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.leaks)
- [Loss Record Output Format](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.leaks-displaying-output)

## 관련 항목

- [Ch 2: Valgrind Memcheck 실전](/blog/tools/debugging/valgrind/chapter02-memcheck) — 이전 글. 이 보고서를 만들어 내는 옵션들
- [Ch 4: Valgrind Helgrind와 DRD](/blog/tools/debugging/valgrind/chapter04-helgrind-drd) — 다음 글. 메모리에서 동시성으로
- [LSan 누수 분석 — Stop-the-world Leak Detection 메커니즘](/blog/tools/debugging/sanitizers/chapter03-lsan-leaks) — 같은 누수를 Sanitizer 쪽에서 보는 방법. `still reachable` 판정 차이가 흥미롭습니다
- [운영 메모리 누수 진단](/blog/tools/debugging/memory/chapter05-prod-leak-diagnosis) — Valgrind를 붙일 수 없는 long-running 프로세스의 대안
- [Memcheck Leak Detection](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.leaks) — 네 가지 누수 분류의 공식 정의
