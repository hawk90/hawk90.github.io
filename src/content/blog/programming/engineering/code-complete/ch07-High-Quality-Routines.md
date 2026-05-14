---
title: "Chapter 7: High-Quality Routines"
date: 2025-06-20T07:00:00
description: "고품질 루틴 — 14 정당한 이유, functional cohesion, 좋은 이름, 길이 100~200줄, 7 이하 매개변수."
series: "Code Complete"
seriesOrder: 7
tags: [code-complete, routines, functions, McConnell]
draft: true
---

## 이 챕터의 메시지

> **KEY POINT** — 루틴 = 컴퓨터 자체를 제외하면 — 컴퓨터 과학에서 — 가장 위대한 발명. 모든 다른 언어 기능보다 — 프로그램을 — 읽기·이해하기 — 쉽게 만든다.

루틴(routine) = 단일 목적을 위해 — 호출 가능한 — 개별 메서드·프로시저. C++ 함수, Java 메서드, VB 함수/sub procedure 모두 — 루틴. C/C++의 macro도 — 일부 용도에서는 — 루틴으로 — 취급.

## 핵심 내용

- 루틴을 만드는 **14 정당한 이유** — 복잡성 감소가 — 가장 중요.
- **Functional cohesion** = 최고. HARD DATA — 50% vs 18% 결함 자유율.
- 좋은 이름 = 루틴이 — 하는 모든 일 — 묘사. wishy-washy 동사(`HandleStuff`) 금지.
- 길이 = **100~200줄 자연스레** 자라도 OK. 200 넘으면 — 주의.
- 매개변수 = **7 이하**. input-modify-output 순서.
- Function ↔ Procedure 구분. Macro·inline = 최후 수단.

## §7.1 Valid Reasons to Create a Routine

### Low-Quality Routine 예시 (CODING HORROR)

```cpp
void HandleStuff(CORP_DATA & inputRec, int crntQtr, EMP_DATA empRec,
                 double & estimRevenue, double ytdRevenue, int screenX,
                 int screenY, COLOR_TYPE & newColor, COLOR_TYPE & prevColor,
                 StatusType & status, int expenseType)
{
    int i;
    for (i = 0; i < 100; i++) {
        inputRec.revenue[i] = 0;
        inputRec.expense[i] = corpExpense[crntQtr][i];
    }
    UpdateCorpDatabase(empRec);
    estimRevenue = ytdRevenue * 4.0 / (double)crntQtr;
    newColor = prevColor;
    status = SUCCESS;
    if (expenseType == 1) {
        for (i = 0; i < 12; i++)
            profit[i] = revenue[i] - expense.type1[i];
    }
    else if (expenseType == 2) {
        profit[i] = revenue[i] - expense.type2[i];
    }
    else if (expenseType == 3)
        profit[i] = revenue[i] - expense.type3[i];
}
```

PDF가 — 11개 문제 — 나열:

1. **이름이 나쁨** — `HandleStuff()` 무의미.
2. **문서화 X**.
3. **레이아웃 나쁨** — 일관성 X.
4. **`inputRec` 변경** — input 변수면 — 변경 X. 변경되면 — `inputRec` 아님.
5. **전역 변수 읽고 쓰기** — `corpExpense`에서 읽고, `profit`에 쓰기.
6. **단일 목적 X** — 변수 초기화 + DB 쓰기 + 계산. 무관한 일들.
7. **잘못된 데이터 방어 X** — `crntQtr == 0`이면 — 0 나누기.
8. **매직 넘버** — 100, 4.0, 12, 2, 3.
9. **2 필드만 사용하면서 — 전체 구조체 전달** — `CORP_DATA`.
10. **사용 안 하는 매개변수** — `screenX`, `screenY`.
11. **매개변수 라벨링 오류** — `prevColor`가 — reference(`&`)인데 — 값 할당 X.
12. **매개변수 너무 많음** — 11개. 7 이하 권장.
13. **매개변수 순서 나쁨, 문서화 X**.

### Valid Reasons (KEY POINT)

> 학부 시절 — 루틴의 주된 이유 = 중복 회피로 — 배움. **이는 — 좋은 설명이 — 아니다.** 더 나은 설명:

- **복잡성 감소** (KEY POINT) — 가장 중요. 한 번 작성 후 — 내부 모르고 — 사용. 깊게 중첩된 — 루프·조건 = 루틴 분리 — 신호.
- **읽기 쉬운 — 코드 섹션 만들기** — 명명된 루틴 호출이 — 6 줄 의도 — 자동 문서화.
- **중복 코드 회피** — 가장 — 대중적 이유. 비슷한 코드 두 곳 = 분해 오류 — 신호.
- **subclassing 지원** — 잘 명명된 — 짧은 루틴은 — 오버라이드가 — 쉽다.
- **시퀀스 은닉** — 사용자→파일 데이터 순서 — 의존 X로. stack top 읽기·decrement = `PopStack()`.
- **포인터 연산 은닉** — 어렵고 — 오류 prone. 의도에 집중.
- **이식성 개선** — 비표준 언어 기능, 하드웨어·OS 의존성 — 격리.
- **복잡한 boolean 검사 단순화** — `if (IsValidCustomer(customer))` >> 인라인 검사.
- **성능 개선** — 한 자리만 — 최적화·재코딩.

#### Operations That Seem Too Simple to Put Into Routines (KEY POINT)

> **KEY POINT** — 효과적 루틴 작성의 — 가장 강한 정신적 장애 = 단순 목적의 — 단순 루틴 작성을 — 꺼리는 것.

```
Points = deviceUnits * (POINTS_PER_INCH / DeviceUnitsPerInch())
```

이 한 줄을 — 12 곳에서 — 사용. 명명된 루틴으로:

```
points = DeviceUnitsToPoints(deviceUnits)
```

가독성 ↑. **나중에 — `DeviceUnitsPerInch()`가 — 0 반환 시** — 한 자리에서만 — 0-나누기 처리. 만약 인라인이었으면 — 12 × 3줄 = **36 줄 추가** vs 루틴에선 — **3줄 추가**.

### Summary of Reasons (14 가지)

PDF 요약 리스트 — 14 정당한 이유:

1. Reduce complexity
2. Make a section of code readable
3. Avoid duplicate code
4. Support subclassing
5. Hide sequences
6. Hide pointer operations
7. Improve portability
8. Simplify complicated boolean tests
9. Improve performance

추가로 — 클래스 생성 이유와 — 겹치는 것들:

10. Isolate complexity
11. Hide implementation details
12. Limit effects of changes
13. Hide global data
14. Make central points of control
15. Facilitate reusable code
16. To accomplish a specific refactoring

## §7.2 Design at the Routine Level

> 응집 개념 = 클래스 수준에서는 — 추상화로 — 대체. 그러나 **개별 루틴 수준에서는 — 여전히 — work-horse**.

루틴의 cohesion = 루틴 내 — 연산들이 — 얼마나 — 관련되었는가. `Cosine()` = 완벽 응집. `CosineAndTan()` = 낮은 응집.

> **HARD DATA** — 450 루틴 연구 (Card, Church, Agresti 1986) — **고응집 = 50% fault-free**, 저응집 = **18% fault-free**.

> **HARD DATA** — 또 다른 450 루틴 (Selby, Basili 1991) — 가장 — 고 coupling/cohesion 비율 = **7배 더 많은 오류**, **20배 더 비싼 수리**.

### 응집 종류 (좋은 순)

#### Functional cohesion (최고)

한 가지 — 명확한 일. `sin()`, `GetCustomerName()`, `EraseFile()`, `CalculateLoanPayment()`, `AgeFromBirthday()`.

이름이 — 정확히 — 하는 일 묘사. 다른 일도 하면 → **응집 약함 + 명명 나쁨**.

#### Sequential cohesion

순서 있는 — 데이터 공유 연산들. 한 단계가 — 다음 단계 입력. 그러나 — 전체로 — 완전한 함수 X.

예: 생일 → 나이 → 은퇴까지 시간. **functional로 만들려면** — `AgeFromBirthday()` + `TimeToRetirement(birthDate)` (내부에서 — `AgeFromBirthday` 호출).

#### Communicational cohesion

같은 데이터에 — 무관한 연산들. 예: 요약 보고서 출력 + 요약 데이터 재초기화. 같은 데이터 — 사용한다는 — 이유로만 — 묶임.

→ 분리. 보고서 출력은 — 그대로, 재초기화는 — 데이터 생성/수정 — 근처로.

#### Temporal cohesion

같은 시점에 일어나는 — 일들. `Startup()`, `CompleteNewEmployee()`, `Shutdown()`.

일부는 — temporal 응집이 — 비수용으로 — 봄. **해결 = temporal 루틴을 — 다른 이벤트의 — 조직자로**. `Startup()`이 — config 파일 읽기, scratch 파일 초기화, 메모리 관리자 설정 — 각각의 루틴 — 호출. 직접 X.

이름도 — `ReadConfigFileInitScratchFileEtc` 대신 — `Startup()` = 응집 명확.

### 받아들이기 어려운 응집

#### Procedural cohesion

특정 순서로 — 연산들. 사용자 — 입력 순서와 — 일치하는 — 데이터 수집. 다른 — 데이터는 — 다른 루틴.

→ 분리. `GetEmployeeData()`가 — `GetFirstPartOfEmployeeData()`보다 — 낫다.

#### Logical cohesion

여러 연산이 — 한 루틴에. 제어 플래그로 — 선택. 큰 `if` 또는 `case`. **연산들이 — 논리적으로 — 관련되지 X** — 다 합치면 — *illogical cohesion*.

예: `InputAll()`, `ComputeAll()`, `EditAll()`, `PrintAll()`, `SaveAll()`. 플래그로 — 다른 처리 선택.

**예외**: 루틴이 — 호출 dispatch만 — 한다면 — *event handler* — OK.

#### Coincidental cohesion

연산들 사이 — 식별 가능한 관계 X. *No cohesion* 또는 *chaotic cohesion*. 위 — low-quality 예시가 — 이것. **재구현 — 필요**.

> 용어보다 — 개념 이해. 거의 항상 — functional cohesion으로 — 작성 가능. **functional에 — 집중**.

## §7.3 Good Routine Names

좋은 이름 = **루틴이 — 하는 모든 것을 — 명확히 묘사**.

### Describe everything the routine does

부작용까지 — 이름에 포함. `ComputeReportTotals()`가 — 출력 파일도 — 연다면 — `ComputeReportTotalsAndOpenOutputFile()`. 길고 — 어색하지만 — 정확.

길고 — 어색한 이름이 — 많다면 — **부작용 없이 — 일들이 — 직접 일어나도록 — 프로그램**.

### Avoid meaningless or wishy-washy verbs

`HandleCalculation()`, `PerformServices()`, `ProcessInput()`, `DealWithOutput()` — 무엇을 하는지 — 안 알려줌. **계산·서비스·입력·출력과 — 관련된 — 무언가**.

> **KEY POINT** — `HandleOutput()`을 — `FormatAndPrintOutput()`으로 — 교체 = 잘 설계된 루틴 + 더 — 정확한 이름.

만약 — 동사가 — 모호한 이유가 — 연산 자체가 — 모호하기 때문이면 — **루틴 자체를 — 재구조화**.

### Make names as long as necessary

- **변수 이름 — 평균** = 9~15 chars (연구).
- **루틴 이름 — nominal** = 20~35 chars (Rees 1982). 15~20이 — 더 — 현실적.

명확하다면 — 더 길어도 — OK.

### To name a function, use a description of the return value

`cos()`, `customerId.Next()`, `printer.IsReady()`, `pen.CurrentColor()` — 반환값 — 정확히 묘사.

### To name a procedure, use a strong verb followed by an object

`PrintDocument()`, `CalcMonthlyRevenues()`, `CheckOrderInfo()`, `RepaginateDocument()`.

OO 언어 = 객체 이름 — 포함 X. `document.Print()` (O), `document.PrintDocument()` (중복). 파생 클래스(`Check : Document`)에서 — `check.PrintDocument()` 부정확. `check.Print()` 명확.

### Use opposites precisely

`first/last`는 — 일관. `FileOpen()`/`_lclose()` (Windows 3.1 SDK)는 — 비대칭, 혼란.

공통 — 반대 쌍 (PDF):

`add/remove`, `begin/end`, `create/destroy`, `first/last`, `get/put`, `get/set`, `increment/decrement`, `insert/delete`, `lock/unlock`, `min/max`, `next/previous`, `old/new`, `open/close`, `show/hide`, `source/target`, `start/stop`, `up/down`.

### Establish conventions for common operations

객체 ID — 반환 루틴 — 이름 컨벤션 X 사례:

```
employee.id.Get()
dependent.GetId()
supervisor()
candidate.id()
```

모두 — id 반환. 일관성 X. 컨벤션 부재로 — 모두가 — 어느 클래스에 — 어느 문법을 — 외우는데 — 시간 낭비.

## §7.4 How Long Can a Routine Be?

> Pilgrims가 — America 가는 길에 — 최대 길이 논쟁. Mayflower Compact 초안 시까지 — 합의 X. Plymouth Rock 도착해서 — 포기. 이후 — **끊임없는 논쟁**.

### HARD DATA (다양한 연구)

- **Basili, Perricone (1984)** — 루틴 크기 vs 오류 = **역상관**. 크기 ↑ (200 LOC까지) → LOC당 — 오류 ↓.
- **Shen et al (1985)** — 루틴 크기는 — 오류와 — 상관 X. 구조 복잡도와 — 데이터 양은 — 상관.
- **Card, Church, Agresti (1986); Card, Glass (1990)** — 32 LOC 이하 = 비용·결함률과 — 무관. **65 LOC 이상이 — LOC당 — 더 — 싸게 개발**.
- **Selby, Basili (1991)** — 450 루틴 — 143 statement 이하 = **LOC당 23% 더 많은 오류**, 그러나 — **수리 비용은 — 2.4배 더 싸다**.
- **Lind, Vairavan (1989)** — **100~150 LOC 루틴이 — 변경 가장 적음**.
- **Jones (1986a)** — IBM — **500 LOC 이상이 — 가장 — 오류 prone**. 500 넘으면 — 오류율 = 크기에 비례.

### McConnell의 결론

OO 프로그램 = accessor 루틴이 — 많은 비중. 매우 짧다.

복잡한 알고리즘 → **100~200 LOC까지 — 유기적으로 — 자라도 OK**. 수십 년 연구 = 이 길이가 — 더 — 오류 prone이지 X.

길이보다 — **중첩 깊이, 변수 수, 기타 복잡도 — 고려**가 — 우선.

**200 LOC 넘으면 — 주의**. 200 이상에서 — 비용·오류 감소를 — 보여준 연구 X. 200 넘기면 — **이해도 상한**에 — 부딪힘.

## §7.5 How to Use Routine Parameters

> **HARD DATA** — Basili, Perricone (1984) — **39% 오류가 — 내부 인터페이스 오류** — 루틴 간 통신.

### Put parameters in input-modify-output order

알파벳 X, 무작위 X. **input-only → input-modify → output-only**.

Ada 예시:

```ada
procedure InvertMatrix(
    originalMatrix: in Matrix;
    resultMatrix: out Matrix
);

procedure ChangeSentenceCase(
    desiredCase: in StringCase;
    sentence: in out Sentence
);

procedure PrintPageNumber(
    pageNumber: in Integer;
    status: out StatusType
);
```

C 라이브러리 컨벤션(변경 매개변수 — 첫째)과 — 충돌. 어느 쪽이든 — **일관**되면 — 독자에게 — 서비스.

### Create your own in and out keywords

Ada `in`/`out`을 — 흉내. C++ #define:

```cpp
#define IN
#define OUT

void InvertMatrix(
    IN Matrix originalMatrix,
    OUT Matrix *resultMatrix
);

void ChangeSentenceCase(
    IN StringCase desiredCase,
    IN OUT Sentence *sentenceToEdit
);
```

문서화 목적. 실제 변경 — pointer/reference — 필요.

### If several routines use similar parameters, consistent order

C `fprintf()` = `printf()`와 — 같지만 — 파일이 — **첫째** 인자. `fputs()` = `puts()`와 — 같지만 — 파일이 — **마지막**. 짜증나는 비일관.

`strncpy()` (target, source, max) vs `memcpy()` (target, source, max) = 일관 → 기억하기 쉬움.

Windows API = 대부분 — `handle`이 — 첫째. 일관 → 외우기 쉬움.

### Use all the parameters

> **HARD DATA** — Card, Church, Agresti (1986) — 사용하지 않는 변수가 — **0**인 루틴 = 46% 오류 없음. **1+ 사용 안 함** = 17~29%만 오류 없음.

매개변수 사용 X → 제거. 예외:

- C++ 함수 포인터 — 동일 매개변수 리스트 — 강제.
- 조건부 컴파일.

### Put status or error variables last

컨벤션. 부수적이고 — output-only.

### Don't use routine parameters as working variables

```java
// Bad
int Sample(int inputVal) {
    inputVal = inputVal * CurrentMultiplier(inputVal);
    inputVal = inputVal + CurrentAdder(inputVal);
    ...
    return inputVal;  // 더 이상 — input X
}
```

이름이 — 거짓이 됨. 원래 input 값을 — 다른 곳에서 — 쓸 수 — 없게 됨.

```java
// Good
int Sample(int inputVal) {
    int workingVal = inputVal;
    workingVal = workingVal * CurrentMultiplier(workingVal);
    workingVal = workingVal + CurrentAdder(workingVal);
    ...
    return workingVal;
}
```

`workingVal`이라는 — 실제 이름은 — 나쁘지만 — 역할 — 명확화 위한 — 예시. C++ = `const`로 — 컴파일러 강제 가능.

### Document interface assumptions about parameters

문서화·assertion으로 — 가정 — 명시:

- input-only / modified / output-only.
- 단위 (inches, feet, meters).
- enum 아니면 — 상태 코드 의미.
- 기대값 범위.
- 나타나면 — 안 되는 — 특정 값.

### Limit the number of parameters to about seven

> **HARD DATA** — Miller 1956 — 사람은 — 한 번에 — **7±2 chunk**만 기억. 매개변수도 — 마찬가지.

매개변수 — 7 이상 — 일관 전달 → 루틴 간 — 결합 너무 — 강함. **재설계 또는 — 클래스로 — 묶기**.

### Consider an input, modify, and output naming convention

`i_`, `m_`, `o_` 접두사. 또는 `Input_`, `Modify_`, `Output_`.

### Pass the variables or objects that maintain interface abstraction

객체 vs 특정 데이터 요소 — 전달. 두 학파:

- **3 요소만** — 결합 최소화, 캡슐화 위배 X.
- **전체 객체** — 인터페이스 안정, 캡슐화 위배 X.

> **KEY POINT** — 두 규칙 모두 — 단순화. 진짜 질문 = **루틴의 인터페이스가 — 어떤 — 추상을 — 제시하는가?**

- 추상 = "3 데이터 — 필요" → 3 요소 전달.
- 추상 = "그 객체에 — 무언가 — 행함" → 전체 객체 전달.

3 요소 추출하려고 — 객체 생성 후 — 호출 후 — 또 — 추출 → **3 요소 전달이 — 맞음**.

호출 전·후 코드가 — "setup"/"takedown" → 루틴이 — **설계가 — 나쁨**.

### Used named parameters

Ada / VB = 명시 — 매개변수 — 이름 — 호출 시:

```vb
Distance = Distance3d(xDistance := latitude,
                      yDistance := longitude,
                      zDistance := elevation)
```

동일 타입 — 긴 리스트에서 — 유용. 안전 critical에서.

### Don't assume anything about the parameter-passing mechanism

high-level 언어의 — 매개변수 전달 메커니즘을 — 우회 X. 다른 — 머신에서 — 안 돌아감.

### Make sure actual parameters match formal parameters

formal = 정의 — 더미. actual = 실제 호출 — 변수.

약타입 언어(C) = 컴파일러 경고 — 주의. 강타입(C++/Java) = 문제 X.

## §7.6 Special Considerations in the Use of Functions

**Function** = 값을 — 반환하는 — 루틴. **Procedure** = 반환 X.

C++는 — 모든 루틴을 — "function"이라 — 부르지만 — `void` 반환은 — 의미적으로 — procedure.

### When to Use a Function and When to Use a Procedure

순수주의자: function = **1 값만 반환**. 수학적 — 함수처럼.

실용: function이 — procedure처럼 — 작동하고 — status 값을 — 반환하는 — 일반적 관행:

```
if (report.FormatOutput(formattedReport) == Success) then ...
```

McConnell 선호:

```
outputStatus = report.FormatOutput(formattedReport)
if (outputStatus == Success) then ...
```

이유 = 호출과 — status 검사 — 분리 → 가독성.

> **KEY POINT** — 루틴의 — **primary 목적이 — function 이름이 — 가리키는 값을 — 반환**하는 거라면 — function 사용. 그렇지 X → procedure.

### Setting the Function's Return Value

- **모든 가능한 — 반환 경로 검사** — 함수 시작에서 — 기본값 초기화 = 안전망.
- **로컬 데이터에 대한 — 참조·포인터 — 반환 X** — 루틴 종료 시 — 스코프 벗어남, 무효.

## §7.7 Macro Routines and Inline Routines

### Fully parenthesize macro expressions

```cpp
// Bad
#define Cube(a) a*a*a
// Cube(x+1) = x+1*x+1*x+1 (precedence 문제)

// Still bad
#define Cube(a) (a)*(a)*(a)
// 외부 표현식에서 — 우선순위 문제

// Good
#define Cube(a) ((a)*(a)*(a))
```

### Surround multiple-statement macros with curly braces

```cpp
// Bad
#define LookupEntry(key, index) \
    index = (key - 10) / 5; \
    index = min(index, MAX_INDEX); \
    index = max(index, MIN_INDEX);

// for 루프에서 — 첫 줄만 — 반복됨

// Good
#define LookupEntry(key, index) { \
    index = (key - 10) / 5; \
    index = min(index, MAX_INDEX); \
    index = max(index, MIN_INDEX); \
}
```

### Name macros that expand to code like routines

C++ — 컨벤션 = 매크로 = ALL_CAPS. 그러나 — 루틴으로 — 교체 가능한 매크로면 — **루틴 명명 컨벤션** 사용. 매크로 ↔ 루틴 — 전환 시 — 변경 — 최소.

부수 효과(`++`, `--`)와 — 충돌 위험 — 주의.

### Limitations on the Use of Macro Routines

C++ — 매크로 대안:

- `const` — 상수 값.
- `inline` — 인라인 컴파일.
- `template` — type-safe `min`, `max`.
- `enum` — enum 타입.
- `typedef` — 단순 타입 치환.

> **KEY POINT** — Bjarne Stroustrup — *"거의 모든 매크로가 — 프로그래밍 언어, 프로그램, 또는 프로그래머의 결함을 — 보여준다... 매크로 사용 시 — 디버거·교차 참조 도구·프로파일러의 — 열등한 서비스를 — 기대해야"* (Stroustrup 1997).

매크로 = **루틴의 — 대안으로 — 최후 수단**.

### Inline Routines (sparingly)

C++ `inline` — 코드 작성 시 — 루틴처럼 — 작성 → 컴파일 시 — 인라인.

**캡슐화 위배** — 구현이 — 헤더에 — 노출. 매 호출마다 — 전체 코드 — 생성 → 코드 크기 ↑.

성능 이유 = 측정 후 — 결정. 측정 안 한 인라인 = **코드 품질 침식만 — 함**.

## Key Points (§)

McConnell 원문 5:

1. **루틴 생성의 — 가장 — 중요한 — 이유** = 프로그램의 — 지적 — 관리 가능성 — 개선. 공간 절약 = 부차적. 가독성·신뢰성·변경 가능성이 — 더 좋은 이유.
2. **단순 연산도 — 자기 루틴이 — 가장 — 큰 이익**일 때가 — 있다.
3. **루틴 이름 = 품질의 — 지표**. 이름이 — 나쁘고 — 부정확하면 — 루틴 — 잘못 설계. 이름이 — 나쁘고 — 정확해도 — 의도 — 안 전달.
4. **Function = primary 목적이 — 이름이 — 가리키는 값 반환일 때만** — 사용.
5. **신중한 프로그래머 = Macro·inline 루틴을 — 조심히, 최후 수단**으로만.

## 정리

- §7.1 — 14 정당한 이유. KEY POINT = 복잡성 감소가 — 가장 중요.
- §7.2 — Functional cohesion = 최고. HARD DATA 50% vs 18% (Card 1986), 7x/20x (Selby 1991).
- §7.3 — 이름 = 하는 모든 일 묘사. wishy-washy 동사 금지. function = 반환값 묘사, procedure = 동사+객체.
- §7.4 — HARD DATA 다섯. **100~200줄 자연스레 OK**. 200 넘으면 — 주의.
- §7.5 — 7 이하 매개변수 (Miller 1956). input-modify-output 순서. 39% 오류 — 인터페이스 (Basili 1984).
- §7.6 — Function ↔ Procedure 구분. primary 목적이 — 반환이면 — function.
- §7.7 — Macro·inline = 최후 수단. Stroustrup KEY POINT.

## 관련 항목

- [Ch 6: Working Classes](/blog/programming/engineering/code-complete/ch06-Working-Classes)
- [Ch 8: Defensive Programming](/blog/programming/engineering/code-complete/ch08-Defensive-Programming)
- [Clean Code Ch 3: 함수](/blog/programming/engineering/clean-code/chapter03-functions)
- [Effective C++ Ch 30: inline은 신중히](/blog/programming/cpp/effective-cpp/item30-understand-the-ins-and-outs-of-inlining)
