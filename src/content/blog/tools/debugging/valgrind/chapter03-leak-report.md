---
title: "Ch 3: Leak Report 읽기"
date: 2026-05-17T03:00:00
description: "Memcheck의 네 가지 누수 분류 — definitely/indirectly/possibly/still reachable — 정확한 의미와 우선순위."
tags: [Valgrind, Memcheck, MemoryLeak, Debugging, C, C++]
series: "Valgrind"
seriesOrder: 3
draft: false
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

```
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

Node* head = malloc(sizeof(Node));
head->next = malloc(sizeof(Node));    // ← 자식
head->next->next = NULL;
// head를 잃어버림 → head->next도 잃어버림
```

이 경우:
- `head` → *definitely lost* (40 bytes)
- `head->next` → *indirectly lost* (40 bytes)

`head`가 잃어버려진 순간 `head->next`도 *도달 불가능*해집니다. 두 누수는 *같은 사고의 부산물*입니다.

### 우선순위: definite와 함께

`indirectly lost`는 *직접 고칠 필요 없습니다*. 대응하는 `definitely lost`를 고치면 *자동으로* 사라집니다.

보고서를 볼 때:

1. *definite* 항목들을 모두 검토.
2. 각 definite의 *자식 그래프*가 indirect로 묶임.
3. definite를 고치면 indirect도 같이 해소.

```
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
class Base1 {};
class Base2 {};
class Derived : public Base1, public Base2 {};

Base2* b = new Derived();   // b는 Derived의 *Base2 부분*을 가리킴 (블록 중간)
// b를 잃어버리면 → possibly lost
```

다중 상속 객체의 *비-첫 베이스 포인터*는 객체 시작이 아니라 *내부*를 가리킵니다.

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

- 다중 상속·STL은 *false positive*. 무시.
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

대부분의 *still reachable*은 *의도된 동작*입니다. CI에서 빌드 실패로 만들 이유 없음.

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

이렇게 하면 *still reachable이 0 bytes*로 떨어집니다. 다만 *비용 대비 효과*가 낮아 대부분의 프로젝트는 그대로 둡니다.

---

## *우선순위 결정 알고리즘*

LEAK SUMMARY가 다음과 같다고 합시다.

```
   definitely lost: 240 bytes in 6 blocks
   indirectly lost: 1024 bytes in 12 blocks
     possibly lost: 80 bytes in 2 blocks
   still reachable: 4096 bytes in 8 blocks
```

이걸 고치는 순서:

1. **definite 6개 항목 검토** — 각각 진짜 누수. 스택 트레이스로 위치 식별.
2. **indirect는 함께 해소** — definite를 고치면 indirect도 사라짐.
3. **possible 2개 항목 검토** — 다중 상속·STL이면 무시, 우리 코드면 fix.
4. **reachable은 검토만** — 의도된 정적 데이터인지 확인. 보통 무시.

이 순서를 따르면 *6개의 definite 자리*만 고쳐도 보고서가 *거의 깨끗*해집니다.

---

## *loss record* — 같은 자리의 누수를 묶음

```
40 bytes in 5 blocks are definitely lost in loss record 3 of 8
   at 0x483977F: malloc
   by 0x10918A: alloc_node (list.c:5)
   by 0x1091CD: list_push (list.c:18)
   by 0x109234: main (main.c:42)
```

`in 5 blocks`가 핵심입니다. *같은 호출 트레이스에서 5번 할당이 일어났는데, 5개 모두 누수*.

이게 *통계적 가치*가 큽니다. *반복 호출되는 핫 패스*에서 누수가 일어나면, 시간이 지날수록 *메모리가 누적*됩니다.

```
in 1 blocks  → 일회성 누수. 짧게 도는 프로그램은 무시 가능.
in N blocks  → N번 호출된 자리에서 누수. 서버라면 시간당 누수율 측정 가능.
```

서버에서 `process_request`가 분당 1000번 호출되고 *매번 누수*면, 1시간 후 60,000개 블록이 쌓입니다. *반드시 고침*.

---

## 보고서 *그룹화*

같은 *스택 트레이스*는 한 loss record로 묶입니다. 다른 트레이스는 *다른 record*.

```
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
- `med` (기본) — 상위 4 프레임 매칭. 보통 적절.
- `high` — 모든 프레임 매칭. 가장 세밀.

세밀할수록 *record 개수가 많아지고* 보고서가 길어집니다. 처음에는 `med`로 보고, 깊은 분석 필요할 때 `high`로 올림.

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

```
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

`--show-reachable=yes`(또는 `--show-leak-kinds=reachable`)로 reachable 보고를 켜면, *어디서 가리키고 있는지*도 함께 보입니다.

```
256 bytes in 1 blocks are still reachable in loss record 1
   at 0x483977F: malloc
   by 0x10918A: init_config (config.c:10)
   by 0x109234: main (main.c:5)
```

이 자리는 *config.c:10*에서 할당된 것이고 종료 시점에도 *살아 있는 포인터로 가리켜진다*는 뜻. 보통 전역 변수 또는 정적 캐시.

위치를 확인하면 *의도된 거인지 사고인지* 즉시 판단됩니다.

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

```
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

## 정리

- **definitely lost** — 진짜 누수. *가장 먼저 고침*.
- **indirectly lost** — definite의 자식. *definite를 고치면 자동 해소*.
- **possibly lost** — 케이스 판단. 다중 상속·STL은 무시, 우리 코드면 처리.
- **still reachable** — 살아 있는 캐시. *보통 무시*. 정리하고 싶으면 `atexit` 또는 Singleton.
- *loss record*의 `in N blocks`로 *호출 빈도* 파악. 핫 패스의 누수는 우선순위 높음.
- `--leak-resolution`으로 트레이스 매칭 정밀도 조절. 재귀 코드는 `low` 권장.
- 디버깅 흐름: *짧은 재현 → Valgrind → 보고서 분석 → 코드 수정 → 재검증*.

## 다음 장 예고

[Ch 4: Helgrind와 DRD](/blog/tools/debugging/valgrind/chapter04-helgrind-drd)에서는 멀티스레드 분석 두 도구를 비교합니다. Helgrind의 락 추적, DRD의 vector clock 모델, 둘 중 *언제 무엇을* 선택할지.

## 참고 자료

- [Memcheck Leak Detection](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.leaks)
- [Loss Record Output Format](https://valgrind.org/docs/manual/mc-manual.html#mc-manual.leaks-displaying-output)
