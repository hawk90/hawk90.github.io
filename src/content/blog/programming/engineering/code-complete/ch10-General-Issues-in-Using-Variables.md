---
title: "Chapter 10: General Issues in Using Variables"
date: 2025-06-20T10:00:00
description: "변수 — Data Literacy, 초기화 13 가이드, span/live time, binding time, hybrid coupling 회피."
series: "Code Complete"
seriesOrder: 10
tags: [code-complete, variables, initialization, scope, McConnell]
draft: true
---

## 이 챕터의 메시지

> Construction은 — 요구사항·아키텍처의 — 작은 — 간극을 — 채우는 — 정상·바람직 — 작업. **변수의 — ins and outs** = nuts-and-bolts construction 이슈.

경험 — 프로그래머도 — 위험한 — 관행을 — 모르고 — 사용하기 — 쉬움. binding time(§10.6)과 — 한 변수 — 한 목적(§10.8)이 — 특히 — 흥미로울 것.

## 핵심 내용

- **Data Literacy Test** — 27 용어 → 점수.
- 초기화 = **가장 — 비옥한 — 오류 — 원천**. 13 가이드라인.
- **Principle of Proximity** — 변수 = 첫 사용 — 가까이 — 선언·초기화.
- **Span** + **live time** — 둘 다 — 최소화. 평균 54 vs 7 — 측정 가능 — 차이.
- **5 binding time** — coding / compile / load / instantiation / just in time. 늦을수록 — 유연·복잡.
- Jackson 1975 — 데이터 ↔ 제어 구조: sequential / selective / iterative.
- **한 변수, 한 목적** (KEY POINT) — `temp` 재사용 = hybrid coupling.

## §10.1 Data Literacy

> **KEY POINT** — 효과적 — 데이터 생성 — 첫 단계 = **어떤 — 종류의 — 데이터를 — 만들지 — 아는 것**. 좋은 — 데이터 타입 — 레퍼토리는 — 프로그래머의 — 핵심 도구.

### The Data Literacy Test

익숙한 용어 = 1점, "안다고 — 생각하지만 — 확신 X" = 0.5점. (PDF — 27 용어):

`abstract data type, array, bitmap, boolean variable, B-tree, character variable, container class, double precision, elongated stream, enumerated type, floating point, heap, index, integer, linked list, literal, local variable, lookup table, member data, pointer, private, retroactive synapse, referential integrity, stack, string, structured variable, tree, typedef, union, named constant, variant, value chain`

#### 점수 해석

- **0~14** — 초보 (CS 1년차).
- **15~19** — intermediate / 경험자가 — 많이 잊음.
- **20~24** — expert.
- **25~29** — 책 — 쓰셔야.
- **30~32** — **사기꾼**. *"elongated stream", "retroactive synapse", "value chain"* = **McConnell이 — 지어냄**.

## §10.2 Making Variable Declarations Easy

### Implicit Declarations

> **KEY POINT** — Implicit 선언 = 어느 — 언어에서든 — 가장 — 위험한 — 기능. VB = `acctNo`가 — 옳은 값 X → `acctNum`을 — `0`으로 — 재초기화 — 알아보기 — 어려움. 명시 선언 — 강제 언어 = 두 실수가 — 필요 → **synonymous-variables — 사실상 — 제거**.

VB에서 — implicit 사용 시:

- **Implicit 선언 OFF** — `Option Explicit` 명령.
- **모든 변수 선언** — 컴파일러 미요구라도.
- **Naming convention** — `Num` / `No` 같은 — 흔한 — 접미사 — 표준화.
- **변수 이름 검사** — 컴파일러의 — cross-reference 리스트.

## §10.3 Guidelines for Initializing Variables

> **KEY POINT** — 부적절 — 데이터 초기화 = 컴퓨터 프로그래밍의 — **가장 — 비옥한 — 오류 — 원천**. 효과적 — 초기화 — 회피 기법 → 디버깅 시간 — 절약.

### 초기화 — 문제의 — 3 변형

- 변수에 — **값이 — 한 번도 — 할당 X**. 메모리에 — 우연히 — 있던 — 비트.
- 변수의 — 값이 — **outdated**. 한 시점에 — 할당, 그러나 — 더 이상 — 유효 X.
- 변수의 — **일부만 — 할당**, 일부는 X. 객체 멤버 — 일부, 메모리 — 할당 — 잊고 — 포인터 — 초기화 → 무작위 메모리 부분을 — 가리킴. 포인터 오류가 — 디버깅 — 어려운 — 이유.

### 13 가이드라인

#### Initialize each variable as it's declared

저비용 — 방어적 프로그래밍. 좋은 — 보험.

```cpp
char studentName[NAME_LENGTH + 1] = {'\0'};   // full name of student
```

#### Initialize each variable close to where it's first used

VB는 — 선언 시 — 초기화 — 미지원. **bad 패턴** = 시작에 — 모두 — 선언 → 모두 — 초기화 → 사용 — 멀리:

```vb
' CODING HORROR
' declare all variables
Dim accountIndex As Integer
Dim total As Double
Dim done As Boolean

' initialize all variables
accountIndex = 0
total = 0.0
done = False
...

' code using accountIndex
...

' code using total
...

' code using done
While Not done
    ...
```

**Good** — 사용 — 가까이:

```vb
Dim accountIndex As Integer
accountIndex = 0
' code using accountIndex
...

Dim total As Double
total = 0.0
' code using total
...

Dim done As Boolean
done = False
' code using done
While Not done
    ...
```

이유:

- 실행이 — `done` 사용까지 — 도달 — 전에 — `done`이 — 수정될 수 — 있음 (현재는 — 아니어도, 나중 수정으로).
- 모두 — 시작에 = 모두 — 루틴 — 전체에 — 사용된다는 — **잘못된 인상**. `done` = 끝에만.
- 디버깅 — 루프 — 추가 시 — `done`이 — 재초기화 — 필요. 첫 — 예시 = 짜증나는 — 초기화 오류 — prone.

> **Principle of Proximity** — 관련 — 동작을 — 가까이 — 두기. 주석을 — 코드 — 가까이, 루프 setup을 — 루프 — 가까이, straight-line 코드의 — 그룹화 등에도 — 적용.

#### Ideally, declare and define each variable close to where it's used

C++/Java = 둘 다 — 가능. 같은 — 시점에:

```java
int accountIndex = 0;
// code using accountIndex
...

double total = 0.0;
// code using total
...

boolean done = false;
while (!done) {
    ...
```

#### Pay special attention to counters and accumulators

`i`, `j`, `k`, `sum`, `total`. 다음 — 사용 전 — 리셋 — 잊기 — 흔한 오류.

#### Initialize a class's member data in its constructor

생성자에서 — 메모리 할당 → destructor에서 — 해제.

#### Check the need for reinitialization

루프 내 — 여러 번 — 사용 / 호출 사이 — 값 유지 후 — 리셋 — 필요. 재초기화 — 필요면 — 초기화 명령이 — 반복되는 — 코드 부분 — **안에**.

#### Initialize named constants once; initialize variables with executable code

named constant 흉내 — 변수 = 프로그램 시작 — 한 번 → `Startup()` 루틴. **진짜 변수** = executable 코드로 — 사용 — 가까이. 가장 — 흔한 수정 = 한 번 — 호출되던 — 루틴을 — 여러 번 — 호출되도록.

#### Use the compiler setting that automatically initializes all variables

지원 시 — 활용. 그러나 — 컴파일러 — 특정 — 설정 의존 = 다른 — 머신/컴파일러로 — 이동 시 — 문제. **문서화**.

#### Take advantage of your compiler's warning messages

대다수 — 컴파일러 = 미초기화 변수 — 경고.

#### Check input parameters for validity

값 — 할당 전 — 합리적인지.

#### Use a memory-access checker to check for bad pointers

OS가 — 잘못된 — 포인터 — 검사 X 환경 = memory-access checker — 구매.

#### Initialize working memory at the beginning of your program

알려진 — 값으로 — 채워서 — 초기화 문제 — 노출.

- **preprogram memory filler** — `0` (포인터 → 저메모리, 검출 쉬움). Intel = `0xCC` (breakpoint interrupt 머신 코드 — 데이터 실행 시 — breakpoint 가득). Kernighan, Pike — `0xDEADBEEF` (디버거에서 — 인식 쉬움) (1999).
- **filler 값 — 가끔 — 변경** — 환경 배경 — 같으면 — 숨겨지는 — 문제 — 발견.
- **프로그램 — 시작 시 — 자기가 — 채우기** — preprogram filler와 — 반대 목적: **결함 — 숨김**. 매번 — 같은 값 → 시작 메모리의 — 무작위 — 변화에 — 영향 X 보장.

## §10.4 Scope

Scope = 변수의 — celebrity status — 얼마나 — 유명한가. 작은 scope = 한 — 루프 인덱스. 큰 scope = 전체 — 프로그램에서 — 사용되는 — employee 정보 — 테이블.

C++/유사 = 블록/루틴/클래스/프로그램. Java/C# = + 패키지/네임스페이스.

### Localize References to Variables

> 변수의 — 두 — 참조 — 사이의 — 코드 = **"window of vulnerability"**. 그 — 창에서 — 새 코드 — 추가 / 변수 — 부주의 — 변경 / 독자가 — 값을 — 잊음.

#### Span 측정

```java
a = 0;
b = 0;
c = 0;
a = b + c;
```

`a` = 첫 — 두 번째 사이에 — 2 줄 → span 2. `b` = 두 참조 사이 — 1 줄 → span 1. `c` = 0.

```java
a = 0;
b = 0;
c = 0;
b = a + 1;
b = b / c;
```

`b` = 한 줄 사이에 → span 1. 두·세 번째 = 0. **평균 span** = (1+0)/2 = 0.5 (Conte, Dunsmore, Shen 1986).

**낮은 — span** = 독자가 — 한 섹션에 — 집중. 멀리 — 떨어지면 — 점프 — 강제. **이익 = 가독성**.

### Keep Variables Live for As Short a Time As Possible

**Live time** = 변수가 — live인 — 총 — 명령 수. 첫 참조 ~ 마지막 참조. **Span과 — 달리** — 그 사이 — 사용 횟수와 — 무관.

라인 1 — 첫 참조, 라인 25 — 마지막 → **live time = 25**. 그 — 두 줄만 — 사용해도 / 모든 줄에서 — 사용해도 — live time 25.

#### 낮은 — live time의 — 이익

- **Window of vulnerability ↓** — 의도 X 변경 — 가능성 ↓.
- **정확한 — 코드 — 그림** — 라인 10에 — 할당, 라인 45에 — 사용 → 10~45 사이 — 사용된다는 — 암시. 라인 44 할당 — 라인 45 사용 → 다른 — 사용 — 암시 X, 작은 코드 섹션에 — 집중.
- **초기화 오류 ↓** — 수정 시 — straight-line이 — 루프로 → 멀리 — 떨어진 — 초기화 — 잊기 — 쉬움. 가까이 — 두면 ↓.
- **가독성 ↑** — 머리에 — 담을 — 줄 ↓.

#### Measuring Live Time — 예시

```java
1  // initialize all variables
2  recordIndex = 0;
3  total = 0;
4  done = false;
...
26 while (recordIndex < recordCount) {
27 ...
28     recordIndex = recordIndex + 1;          // last reference to recordIndex
...
64 while (!done) {
...
69     if (total > projectedTotal) {           // last reference to total
70         done = true;                         // last reference to done
```

Live times:

- `recordIndex` = (28 − 2 + 1) = **27**.
- `total` = (69 − 3 + 1) = **67**.
- `done` = (70 − 4 + 1) = **67**.
- **평균** = (27 + 67 + 67) / 3 ≈ **54**.

#### 개선

```java
25 recordIndex = 0;
26 while (recordIndex < recordCount) {
27 ...
28     recordIndex = recordIndex + 1;
...
62 total = 0;
63 done = false;
64 while (!done) {
...
69     if (total > projectedTotal) {
70         done = true;
```

- `recordIndex` = (28 − 25 + 1) = **4**.
- `total` = (69 − 62 + 1) = **8**.
- `done` = (70 − 63 + 1) = **8**.
- **평균** = (4 + 8 + 8) / 3 ≈ **7**.

직관적 — 선호를 — **정량 — 증거** = 54 vs 7. 큰 차이.

> Global 변수에 — span·live time — 적용 → **거대 — span/live time**. global 회피의 — 또 다른 — 좋은 — 이유.

### General Guidelines for Minimizing Scope

- **루프 변수 — 루프 — 직전 — 초기화**. 루틴 시작 X. 새 루프 — 추가 시 — 작동.
- **사용 — 직전까지 — 값 — 할당 X**. 가까울수록 — 명확.
- **관련 명령 — 그룹화** — 6 변수 (`oldData`, `newData`, `numOldData`, `numNewData`, `totalOldData`, `totalNewData`) — 동시에 — 머리에 — 두는 — 코드 → 둘로 — 나눠 — 각각 — 3 변수만.
- **간단한 — 동작 — 새 루틴으로 — 추출**.
- **가장 — 제한적 — 가시성으로 — 시작, 필요 시 — 확장**. global → class → private 보다 — 그 — 반대가 — 쉬움.

### Comments on Minimizing Scope (KEY POINT)

> **KEY POINT** — "convenience" vs "intellectual manageability" — 차이 = **작성** vs **읽기**. 최대 scope = 쓰기 쉬움, 그러나 — 다른 — 루틴이 — global 데이터를 — 어떻게 — 사용하는지 — 알아야 — 이해 가능. **읽기·디버그·수정 — 어려움**.

> 가능한 — 가장 — 작은 — 세그먼트로 — 가시성 — 선언. 한 루틴 → 좋음. 한 클래스 → 다음. **거의 — 안 — 사용**해야 — naked global.

## §10.5 Persistence

Persistence = 데이터의 — life span.

- **블록/루틴 — 수명** — `for` 루프 안 선언.
- **허용하는 — 동안** — Java `new` = GC 전. C++ `new` = `delete` 전.
- **프로그램 — 수명** — global, C++/Java `static`.
- **영원** — DB에 — 저장.

문제 = **실제 — persistence보다 — 더 — 길다고 — 가정**할 때. 냉장고의 — 우유 — 같음. 한 달 가기도, 5일 — 후 — 상하기도.

회피:

- 합리적 — 값 — 검사 — 디버그 코드/assertion.
- **persistence 가정 X 코드 작성** — 루틴 — 나갈 — 때의 값이 — 다음 — 들어올 때 — 같다고 — 가정 X. (`static` 제외.)
- **선언·초기화 — 사용 — 직전 — 습관**. 가까운 — 초기화 X — 데이터 = **의심**.

## §10.6 Binding Time

> Binding time = 변수와 — 그 — 값이 — **묶이는 — 시점** (Thimbleby 1988). 코드 — 작성 시? 컴파일 시? 로드 시? 실행 시?

**늦은 — binding = 유연성 ↑**. 그러나 — **복잡성 ↑**.

### 5 binding time — 예시

`titleBar.color` (예시):

#### Coding time (magic number)

```java
titleBar.color = 0xFF;   // 0xFF = blue
```

`0xFF`가 — 변경되면 — 다른 — 곳의 — `0xFF`와 — 동기화 — 깨짐. 거의 — 항상 — 나쁨.

#### Compile time (named constant)

```java
private static final int COLOR_BLUE = 0xFF;
private static final int TITLE_BAR_COLOR = COLOR_BLUE;
...
titleBar.color = TITLE_BAR_COLOR;
```

언어 — 지원 시 — 거의 — 항상 — magic number보다 — 낫다. 가독성, 변경 — 한 자리, 런타임 — 패널티 X.

#### Run time (외부 소스 읽기)

```java
titleBar.color = ReadTitleBarColor();
```

Windows registry 등에서 — 읽기. 더 — 가독·유연. 사용자가 — 환경 — 커스터마이즈 — 응용에 — 일반.

### 5 binding time

1. **Coding time** — magic number.
2. **Compile time** — named constant.
3. **Load time** — Windows Registry 등 — 외부 소스 — 읽기.
4. **Object instantiation time** — 윈도우 생성 — 때마다 — 읽기.
5. **Just in time** — 윈도우가 — 그려질 — 때마다 — 읽기.

> 일반적으로 — **이른 — binding = 낮은 — 유연성 + 낮은 — 복잡성**. 첫 — 2 옵션은 — named constant > magic number — 단순 — 좋은 — 프로그래밍 관행으로. 그 — 이상 = **요구되는 — 유연성**까지만, 그 — 이상 X. 복잡성 ↑ → 오류 prone.

## §10.7 Relationship Between Data Types and Control Structures

Michael Jackson (1975) — 데이터 — 3 타입 ↔ 제어 구조:

### Sequential data → sequential statements

순서대로 — 함께 — 사용. 파일에서 — employee 이름·SSN·주소·전화·나이 — 5 줄 명령으로 — 읽기.

### Selective data → if and case statements

여러 데이터 — 하나만 — 존재. 시급/월급 — 다른 처리. **If-Then-Else / Case**.

### Iterative data → for, repeat, while loops

같은 타입 — 여러 번. records 배열, SSN 리스트.

> 실제 — 데이터 = 3 타입의 — 조합. 단순 — 빌딩 블록으로 — 복잡 — 데이터 묘사.

## §10.8 Using Each Variable for Exactly One Purpose

> **KEY POINT** — 변수를 — 미묘하게 — 여러 — 목적에 — 사용 가능. **그런 — 미묘함 — 없는 게 — 낫다**.

### Use each variable for one purpose only

```cpp
// CODING HORROR
// Compute roots of a quadratic equation.
// This code assumes that (b*b-4*a*c) is positive.
temp = Sqrt(b*b - 4*a*c);
root[0] = (-b + temp) / (2 * a);
root[1] = (-b - temp) / (2 * a);
...
// swap the roots
temp = root[0];
root[0] = root[1];
root[1] = temp;
```

질문 = 첫 — `temp` ↔ 마지막 — `temp` — 관계? **답 = 무관**. 같은 — 변수 — 사용 = 관련이 — 있는 — 듯한 — 인상.

```cpp
// Good
discriminant = Sqrt(b*b - 4*a*c);
root[0] = (-b + discriminant) / (2 * a);
root[1] = (-b - discriminant) / (2 * a);
...
// swap the roots
oldRoot = root[0];
root[0] = root[1];
root[1] = oldRoot;
```

### Avoid variables with hidden meanings

**Hybrid coupling** (Page-Jones 1988). 변수가 — 두 — 일에 — 늘어남. 잘못된 — 타입.

```
// CODING HORROR
- pageCount = 출력 페이지 수, 단 −1이면 — 오류.
- customerId = 고객 번호, 단 500,000 초과면 — 빼서 — 연체 계정 번호.
- bytesWritten = 출력 파일에 — 쓴 바이트, 단 음수면 — 디스크 — 번호.
```

`pageCount`가 — `-1`일 때 = boolean으로 — 외도. **명확함** = 두 — 변수.

### Make sure that all declared variables are used

> **HARD DATA** — Card, Church, Agresti (1986) — **참조 안 된 — 변수 = 더 — 높은 — 결함률과 — 상관**. 모든 — 선언 변수 — 사용 — 검사 습관. lint 같은 — 도구 = 경고.

## Key Points (§)

McConnell 원문 5:

1. **데이터 초기화** = 오류 prone. 이 — 챕터 기법 — 사용.
2. **각 변수 — scope 최소화**. 참조 — 가까이. 루틴/클래스 — local. **global 회피**.
3. **같은 변수 — 다루는 — 명령 — 가까이**.
4. **이른 binding = 유연성 ↓, 복잡성 ↓. 늦은 binding = 유연성 ↑, 복잡성 ↑**.
5. **한 변수, 한 목적**.

## 정리

- §10.1 — Data Literacy Test 27 용어. McConnell 함정 = elongated stream / retroactive synapse / value chain.
- §10.2 — Implicit 선언 = 가장 — 위험. VB `Option Explicit`.
- §10.3 — 초기화 = **가장 — 비옥한 — 오류 원천**. 13 가이드라인. 0xCC / 0xDEADBEEF.
- §10.4 — Span + live time. 54 → 7 측정. KEY POINT = convenience vs intellectual manageability.
- §10.5 — Persistence = 우유 비유. 실제보다 — 길다고 — 가정 X.
- §10.6 — 5 binding time. coding < compile < load < instantiation < just in time. 늦을수록 — 유연·복잡.
- §10.7 — Jackson 1975 — sequential/selective/iterative.
- §10.8 — `temp` → `discriminant` + `oldRoot`. Hybrid coupling 회피. HARD DATA — 미참조 변수 = 결함률 ↑ (Card 1986).

## 관련 항목

- [Ch 9: The Pseudocode Programming Process](/blog/programming/engineering/code-complete/ch09-The-Pseudocode-Programming-Process)
- [Ch 11: The Power of Variable Names](/blog/programming/engineering/code-complete/ch11-The-Power-of-Variable-Names)
- [Ch 12: Fundamental Data Types](/blog/programming/engineering/code-complete/ch12-Fundamental-Data-Types)
- [Effective C++ Ch 4: 초기화 보장](/blog/programming/cpp/effective-cpp/item04-make-sure-objects-are-initialized-before-use)
- [Effective C++ Ch 26: 변수 정의 늦추기](/blog/programming/cpp/effective-cpp/item26-postpone-variable-definitions-as-long-as-possible)
