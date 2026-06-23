---
title: "Chapter 11: The Power of Variable Names"
date: 2026-05-11T11:00:00
description: "변수 이름 — 9~15 chars (HARD DATA), 의도 묘사, 컨벤션, 5 differentiation, 17 회피 함정."
series: "Code Complete"
seriesOrder: 11
tags: [code-complete, naming, McConnell]
draft: true
---

## 이 챕터의 메시지

> 변수 — 강아지에 — 이름 — 주듯이 — 줄 수 X. 강아지·이름 = **다른 — 개체**. 변수와 — 변수의 — 이름 = **본질적으로 — 같은 것**. **변수의 — 좋고 나쁨 = 거의 — 이름이 — 결정**.

이 — 챕터에서 — McConnell은 — **수십 — 고려사항을 — 다룬 — 논의를 — 본 적 X**라며 — 일부러 — **사용할 수 — 있는 — 양보다 — 많은 정보**로 — 넘침.

## 핵심 내용

- **가장 — 중요한 고려** (KEY POINT) — 이름이 — **entity를 — 완전·정확하게 — 묘사**.
- **HARD DATA** — Gorla, Benander, Benander (1990) — **10~16 chars 평균**이 — 디버깅 노력 최소화.
- **Computed-value qualifier** = 이름 **끝**. `revenueTotal`, `expenseAverage`.
- **17 반대 쌍** — begin/end, first/last 등.
- **Boolean** = `done`, `error`, `found`, `success` — 긍정형.
- 컨벤션 (KEY POINT) — 특정 컨벤션 X **존재가 — power**.
- **5 differentiation 옵션** — Initial capitalization / All caps / `t_` prefix / `a` prefix / 더 구체적 이름.
- **17+ 회피 함정** — Weinberg 1983 — Fortran FORMAT — **$1.6B 우주선 — 손실**.

## §11.1 Considerations in Choosing Good Names

### Poor vs Good (CODING HORROR)

```java
// CODING HORROR
x = x - xx;
xxx = aretha + SalesTax(aretha);
x = x + LateFee(x1, x) + xxx;
x = x + Interest(x1, x);
```

`x1`, `xx`, `xxx`이 — 무엇? `aretha`는? "outstanding balance + new purchases — 기반 — total customer bill 계산" — 알려줘도 — 어느 — 변수가 — **new purchases — bill — 출력에 — 사용**되는가?

```java
// Good
balance = balance - lastPayment;
monthlyTotal = NewPurchases + SalesTax(newPurchases);
balance = balance + LateFee(customerID, balance) + monthlyTotal;
balance = balance + Interest(customerID, balance);
```

### The Most Important Naming Consideration

> **KEY POINT** — **이름이 — entity를 — 완전·정확하게 — 묘사**. 좋은 — 이름 — 만드는 — 효과적 기법 = **변수가 — 무엇을 — 나타내는지 — 말로 — 진술** → 그 — 진술 — 자체가 — 가장 — 좋은 — 이름인 — 경우 — 많음.

- US 올림픽 — 인원수 → `numberOfPeopleOnTheUsOlympicTeam`.
- 경기장 — 좌석 → `numberOfSeatsInTheStadium`.
- 현대 올림픽 — 최고 — 점수 → `maximumNumberOfPointsInModernOlympics`.
- 현재 — 이자율 → `rate` 또는 — `interestRate` (`r` / `x` X).

이런 — 이름의 — 2 특성: **해독 — 불필요** (그냥 읽음), **너무 — 길어서 — 비실용**.

### Table 11-1 — Good vs Bad

| 목적 | Good | Bad |
| --- | --- | --- |
| 현재까지 — 작성된 — checks 합 | `runningTotal`, `checkTotal`, `nChecks` | `written`, `ct`, `checks`, `CHKTTL`, `x`, `x1`, `x2` |
| 총알기차 — 속도 | `velocity`, `trainVelocity`, `velocityInMph` | `velt`, `v`, `tv`, `x`, `x1`, `x2`, `train` |
| 현재 — 날짜 | `currentDate`, `todaysDate` | `cd`, `current`, `c`, `x`, `x1`, `x2`, `date` |
| 페이지당 — 줄 | `linesPerPage` | `lpp`, `lines`, `l`, `x1`, `x2` |

`current` = 무엇이 — 현재인지 — 안 알림. `date` = 거의 — 좋지만, 그저 — 어떤 — 날짜가 — 아니라 — **current** 날짜 → 거기에 — 표시 X.

> **KEY POINT** — 이름은 — 가능한 — 한 — **구체적**으로. `x`, `temp`, `i`는 — 너무 — 일반적 → 한 — 목적 — 이상에 — 사용 가능 → 보통 — 나쁜 이름.

### Problem-Orientation

좋은 — mnemonic 이름 = **솔루션보다 — 문제에 대해 — 말함**. **What** > **how**.

- `inputRec` (컴퓨터 용어 = input, record) vs `employeeData` (문제 — 도메인).
- `bitFlag` (computerish) vs `printerReady`.
- `calcVal` vs `sum`.

### Optimum Name Length (HARD DATA)

> **HARD DATA** — Gorla, Benander, Benander (1990) — **10~16 chars 평균**이 — 디버깅 노력 — 최소화. 8~20 chars 평균도 — 거의 — 같이 — 쉬움. **9~15 / 10~16으로 — 만들라는 — 게 X**, **더 — 짧은 — 이름들이 — 많으면 — 충분히 — 명확한지 — 검사**라는 뜻.

| 평가 | 예시 |
| --- | --- |
| **Too long** | `numberOfPeopleOnTheUsOlympicTeam`, `numberOfSeatsInStadium`, `maximumNumberOfPointsInModernOlympics` |
| **Too short** | `n`, `np`, `ntm`, `n`, `ns`, `nsisd`, `m`, `mp`, `max`, `points` |
| **Just right** | `numTeamMembers`, `teamMemberCount`, `numSeatsInStadium`, `seatCount`, `teamPointsMax`, `pointsRecord` |

### The Effect of Scope on Variable Names

짧은 — 이름이 — 항상 — 나쁜가? X. `i` = 길이 자체가 — **scratch 값 + 제한된 — scope** — 말함.

Hansen 연구 (Shneiderman 1980) — **드물게 — 사용/global = 긴 이름**, **local/loop = 짧은 이름**. 그러나 — 짧은 이름 = 많은 — 문제 prone → 일부 — 신중 — 프로그래머는 — 방어적 정책으로 — 전부 — 회피.

#### Use qualifiers on names in the global name space

C++/C# = `namespace`. Java = 패키지. 미지원 언어 = 컨벤션:

- `uiEmployee` (UI 서브시스템의 Employee).
- `dbEmployee` (DB 서브시스템의 Employee).

### Computed-Value Qualifiers in Variable Names

`Total`, `Sum`, `Average`, `Max`, `Min`, `Record`, `String`, `Pointer` 같은 — qualifier = **이름 — 끝**.

이유:

- **가장 — 중요한 부분 = 앞에**, 가장 — 두드러짐.
- `totalRevenue`/`revenueTotal` — 같은 — 프로그램에 — 혼란 — 회피.
- `revenueTotal`, `expenseTotal`, `revenueAverage`, `expenseAverage` = **즐거운 대칭**. `totalRevenue, expenseTotal, revenueAverage, averageExpense` = 무질서.
- 일관성 → 가독성 + 유지보수.

**예외** = `Num` qualifier — 관습적 — 위치. `numSales` = 매출 — 총수. `saleNum` = 현재 — 매출의 — 인덱스. `Num` = 혼란 — 야기 → **`Count`(총수) + `Index`(특정)으로 — 사이드스텝**이 — 보통 — 최선. `salesCount` + `salesIndex`.

### Common Opposites in Variable Names

§6.2와 — 유사. PDF — 11 쌍:

`begin/end`, `first/last`, `locked/unlocked`, `min/max`, `next/previous`, `old/new`, `opened/closed`, `visible/invisible`, `source/target`, `source/destination` (less common), `up/down`.

## §11.2 Naming Specific Types of Data

### Naming Loop Indexes

`i`, `j`, `k` = 관습.

```java
for (i = firstItem; i < lastItem; i++) {
    data[i] = 0;
}
```

루프 — 외부에서 — 사용 → **의미 있는 이름**:

```java
recordCount = 0;
while (moreScores()) {
    score[recordCount] = GetNextScore();
    recordCount++;
}

// lines using recordCount
...
```

루프가 — 몇 줄 — 이상으로 — 길어지면 — `i`가 — 무엇을 — 의미했는지 — 잊기 — 쉬움. **중첩 루프** = 긴 이름:

```java
for (teamIndex = 0; teamIndex < teamCount; teamIndex++) {
    for (eventIndex = 0; eventIndex < eventCount[teamIndex]; eventIndex++) {
        score[teamIndex][eventIndex] = 0;
    }
}
```

`score[teamIndex][eventIndex]`가 — `score[i][j]`보다 — 정보적. **index cross talk** (`i`를 — 의미하는데 — `j`라 — 말함) — 회피.

`i`, `j`, `k`를 — 사용하면 — **루프 인덱스 — 외 — 사용 X**. 컨벤션이 — 너무 — 잘 — 확립 → 다른 용도가 — 혼란.

### Naming Status Variables

#### Think of a better name than `flag`

```cpp
// CODING HORROR
if (flag) ...
if (statusFlag & 0x0F) ...
if (printFlag == 16) ...
if (computeFlag == 0) ...

flag = 0x1;
statusFlag = 0x80;
printFlag = 16;
computeFlag = 0;
```

`statusFlag = 0x80`이 — 무엇을 의미? 작성자 — 외에는 — 모름.

```cpp
// Good
if (dataReady) ...
if (characterType & PRINTABLE_CHAR) ...
if (reportType == ReportType_Annual) ...
if (recalcNeeded == True) ...

dataReady = True;
characterType = CONTROL_CHARACTER;
reportType = ReportType_Annual;
recalcNeeded = False;
```

enumerated type + named constant — 활용.

> 코드 섹션을 — **"figure out"하고 있으면** — 변수 — rename — 고려. murder mystery는 — figure out OK, **코드는 — 그냥 — 읽을 수 — 있어야**.

### Naming Temporary Variables

> Temporary 변수 = 보통 — 프로그래머가 — 문제를 — **완전히 — 이해 X 신호**. "temporary" 상태로 — 공식 — 부여되어 — 다른 — 변수보다 — 부주의하게 — 다루는 — 경향 → 오류 ↑.

```cpp
// CODING HORROR
// Compute roots of a quadratic equation.
// This assumes that (b^2-4*a*c) is positive.
temp = sqrt(b^2 - 4*a*c);
root[0] = (-b + temp) / (2 * a);
root[1] = (-b - temp) / (2 * a);
```

```cpp
// Good
discriminant = sqrt(b^2 - 4*a*c);
root[0] = (-b + discriminant) / (2 * a);
root[1] = (-b - discriminant) / (2 * a);
```

### Naming Boolean Variables

#### 유용한 boolean 이름

- **`done`** — 루프/연산 — 완료 — 여부. False 시작, True 완료.
- **`error`** — 오류 발생 — 여부.
- **`found`** — 값 — 발견 — 여부. 배열 — 검색, employee ID — 검색.
- **`success`** — 연산 — 성공 — 여부. 가능하면 — 더 — 구체적 — 이름 (`processingComplete`).

#### Give boolean names that imply True or False

`status`, `sourceFile` = 나쁜 boolean 이름 — True일 때 — 의미 — 모호. `status`가 — True면 — "무언가 — 상태 — 가짐"? 모든 게 — 상태 — 가짐. `True` = OK 상태? `False` = 잘못된 — 게 X?

→ `status` → `error` / `statusOK`. `sourceFile` → `sourceFileAvailable` / `sourceFileFound`.

`Is` 접두사 = 변수가 — **질문**. `isDone?`, `isError?`, `isFound?`. 답 = True/False. **이점** = vague 이름과 — 안 어울림. `isStatus?` = 의미 X.

#### Use positive boolean variable names

`notFound`, `notdone`, `notSuccessful` = 부정 시 — 읽기 어려움:

```
if not notFound
```

`found`/`done`/`processingComplete`로 — 교체 후 — 연산자로 — 부정.

### Naming Enumerated Types

```vb
Public Enum Color
    Color_Red
    Color_Green
    Color_Blue
End Enum

Public Enum Planet
    Planet_Earth
    Planet_Mars
    Planet_Venus
End Enum

Public Enum Month
    Month_January
    Month_February
    ...
    Month_December
End Enum
```

Enum 이름 자체 = ALL_CAPS / `e_` 접두사 등. 책에서는 — ALL_CAPS.

### Naming Constants

상수가 — **나타내는 — 추상 entity**로 — 명명, 숫자 X. `FIVE` = 나쁨 (값이 — 5.0이든 6.0이든). `CYCLES_NEEDED` = 좋음 (5.0/6.0 — 둘 다 — OK). `BAKERS_DOZEN` = 나쁨. `DONUTS_MAX` = 좋음.

## §11.3 The Power of Naming Conventions

### Why Have Conventions? (7 이익)

- **더 — 많은 것을 — 당연하게** — 한 — global 결정 = 많은 — local 결정 — 대체.
- **프로젝트 — 간 — 지식 전달**.
- **새 프로젝트 — 코드 — 학습 — 더 빠름**.
- **이름 — 증식 ↓** — `pointTotal`/`totalPoints` — 같은 — 것을 — 두 — 이름으로.
- **언어 — 약점 — 보완** — named constant, enum 흉내.
- **관련 — 항목 — 관계 — 강조** — `employeeAddress`, `employeePhone`, `employeeName`.

> **KEY POINT** — 핵심 = **어떤 — 컨벤션이든 — 무 — 컨벤션보다 — 보통 — 낫다**. 임의적 — 컨벤션이라도. 명명 컨벤션의 — 힘 = 특정 — 컨벤션에서 X — **컨벤션이 — 존재한다는 — 사실**에서 — 옴.

### When You Should Have a Naming Convention (5 cases)

- 여러 — 프로그래머 — 협업.
- 다른 — 프로그래머에게 — 인계 (= 거의 — 항상).
- 동료 — 검토.
- 큰 — 프로그램 — 부분으로 — 사고.
- 장수 — 프로그램 — 몇 주/개월 — 후 — 재개.
- 흔치 않은 — 용어 — 표준 — 약어.

> **KEY POINT** — **항상 — 어떤 — 컨벤션을 — 가지는 게 — 이익**. 위 — 고려사항이 — 특정 — 프로젝트의 — 컨벤션 — 범위 — 결정에 — 도움.

## §11.4 Informal Naming Conventions

### Differentiate variables vs routines

Java = 변수 = 소문자 시작, 루틴 = 대문자 시작. `variableName` vs `RoutineName()`.

### Differentiate classes and objects (5 options)

#### Option 1: Initial Capitalization

```cpp
Widget widget;
LongerWidget longerWidget;
```

대소문자만으로 — 차별 X 사람도. **VB는 — 미지원** — case insensitive.

#### Option 2: All Caps

```cpp
WIDGET widget;
LONGERWIDGET longerWidget;
```

C++/Java = ALL_CAPS = 상수 → 충돌.

#### Option 3: `t_` Prefix for Types

```cpp
t_Widget Widget;
t_LongerWidget LongerWidget;
```

모든 언어 OK. prefix 미관 — 일부 — 싫어함.

#### Option 4: `a` Prefix for Variables

```cpp
Widget aWidget;
LongerWidget aLongerWidget;
```

**모든 — 인스턴스 이름이 — 영향**.

#### Option 5: 더 구체적 이름

```cpp
Widget employeeWidget;
LongerWidget fullEmployeeWidget;
```

**가장 — 가독적** — 컨벤션 — 모르는 — 독자가 — 이해 — 쉬움. 책에서 — Option 5 사용.

> McConnell 선호 = Option 3 — 모든 언어 OK. *"Option 3 = Churchill의 — 민주주의 묘사 같은 — 끔찍한 — 명명 컨벤션 — 단, 시도된 — 모든 — 다른 것 — 제외하고는"*.

### Identify (다양한)

- **Global** — `g_RunningTotal` (`g_` 접두사).
- **Member variables** — `m_` 접두사.
- **Type definitions** — ALL_CAPS / `t_` 접두사.
- **Named constants** — ALL_CAPS / `c_` 접두사.
- **Enumerated types** — ALL_CAPS / `e_` / `E_` 접두사.
- **Input-only parameters** — `Input_` 접두사 (Java처럼 — `by value` — 객체도 — 변경 가능 — 언어).

### Format names to enhance readability

- `gymnasticsPointTotal` 또는 — `gymnastics_point_total` >> `GYMNASTICSPOINTTOTAL`.
- **혼합 — X**.

### Java / C++ / C / VB Conventions

#### Java

- `i`, `j` = integer 인덱스.
- Constants = `ALL_CAPS` + underscores.
- Class/interface = `ClassOrInterfaceName`.
- Variable/method = `variableOrRoutineName`.
- Underscore X (all caps 제외).
- `get`/`set` 접두사 — Bean.

#### C++

- `i`, `j` = integer 인덱스.
- `p` = pointer.
- Constants/typedefs/preprocessor macros = `ALL_CAPS`.
- Class/variable/routine = `MixedUpperAndLowerCase()`.

#### C

- `c`, `ch` = character.
- `i`, `j` = integer.
- `n` = 개수.
- `p` = pointer.
- `s` = string.
- Preprocessor macros = `ALL_CAPS`.
- Variable/routine = `all_lower_case`. `_` = separator.

### Sample Naming Convention (Table 11-3 — C++/Java)

| Entity | Description |
| --- | --- |
| `ClassName` | mixed case, initial cap |
| `TypeName` | mixed case, initial cap |
| `EnumeratedTypes` | 위 + 복수형 |
| `localVariable` | mixed case, initial lowercase. type 독립. |
| `RoutineName()` | mixed case, initial cap |
| `m_ClassVariable` | `m_` 접두사 |
| `g_GlobalVariable` | `g_` 접두사 |
| `CONSTANT` | ALL_CAPS |
| `MACRO` | ALL_CAPS |
| `Base_EnumeratedType` | enum 기본 — singular + element. `Color_Red`, `Color_Blue` |

## §11.5 Standardized Prefixes

Hungarian (Simonyi, Heller 1991) — Microsoft Windows — 광범위 사용. 더 — 안 쓰임. 그러나 — **terse·precise abbreviation — 표준화** 아이디어는 — 가치.

2 부분: **UDT** (User-Defined Type) abbreviation + **Semantic Prefix**.

### UDT Abbreviation

언어 — 사전정의 — 타입 X — UDT (window, screen region, font). 짧은 코드 + 표준화. 워드프로세서 예시 (Table 11-6):

| UDT | 의미 |
| --- | --- |
| `ch` | character (워드프로세서 — 문서의 — character) |
| `doc` | document |
| `pa` | paragraph |
| `scr` | screen region |
| `sel` | selection |
| `wn` | window |

```
CH  chCursorPosition;
SCR scrUserWorkspace;
DOC docActive;
PA  firstPaActiveDocument;
PA  lastPaActiveDocument;
WN  wnMain;
```

### Semantic Prefix (Table 11-7)

UDT — 너머. 변수가 — **어떻게 — 사용되는지** 묘사. **프로젝트 간 — 표준**:

| Prefix | 의미 |
| --- | --- |
| `c` | Count |
| `first` | 다뤄야 할 — 첫 요소 (현재 연산 — 기준) |
| `g` | Global |
| `i` | Index into array |
| `last` | 다뤄야 할 — 마지막 요소 (`first` 짝) |
| `lim` | 상한 (non-inclusive). `lim = last + 1` |
| `m` | Class-level variable |
| `max` | 절대 — 마지막 (배열 자체 기준) |
| `min` | 절대 — 첫 |
| `p` | Pointer |

조합: `firstPa` (문서 — 첫 paragraph), `cPa` (paragraph 개수), `ipa` (paragraph 배열의 — index), `firstPaActiveDocument`.

### Advantages (KEY POINT)

> **KEY POINT** — 표준화로 — 기억할 — 이름 ↓. `min`/`first`/`last`/`max` — 정확한 — 구별 — 도움. **이름 — 더 — compact** — `cPa` (vs `totalParagraphs`), `ipa` (vs `indexParagraphs`). **타입 — 정확 — 검사** — 컴파일러가 — 못하는 — abstract 데이터 — 타입에 — `paReformat = docReformat` 거의 — 잘못.

**Pitfall** = prefix 외에 — 의미 — 이름 — 부여 — 잊음. `ipaActiveDocument`가 — 단순 — `ipa`보다 — 정보적.

## §11.6 Creating Short Names That Are Readable (KEY POINT)

> **KEY POINT** — 짧은 — 이름 — 욕구 = 옛 — 컴퓨팅 — 시대의 — 잔재. assembler/Basic/Fortran — 2~8 chars 제한. 수학과 — 밀접 (i, j, k = summation). **현대 — C++/Java/VB = 거의 — 모든 — 길이 가능 → 짧게 할 — 이유 — 거의 X**.

상황이 — 짧은 — 이름 — 요구 시:

### General Abbreviation Guidelines (10)

서로 — 모순도 — 있음 — 동시에 — 다 — 적용 X:

- 표준 — 약어 — 사용 (사전 — 등재).
- 비선행 — 모음 — 제거. `computer` → `cmptr`. `screen` → `scrn`. `apple` → `appl`. `integer` → `intgr`.
- 관사 제거. `and`, `or`, `the`.
- 각 — 단어 — 첫 — 글자.
- 첫/두/세 — 글자 — 후 — 잘라냄.
- 각 — 단어의 — 첫·끝 — 글자 — 유지.
- 의미 있는 — 단어 — 모두 — 사용 (최대 — 3 단어).
- 무용한 — 접미사 제거 — `ing`, `ed`.
- 각 — 음절의 — 가장 — 두드러진 — 소리 — 유지.
- 8~20 chars / 언어 — 제한까지 — iterate.

### Phonetic Abbreviations (비권장)

`skating` → `sk8ing`, `highlight` → `hilite`, `before` → `b4`, `execute` → `xqt`. **개인 — 번호판 — 알아맞히기처럼**. 권장 X.

> 연습: 이게 — 무엇? `ILV2SK8`, `XMEQWK`, `S2DTM8O`, `NXTC`, `TRMN8R`

### Comments on Abbreviations

#### Don't abbreviate by removing one character

한 글자 — 절약 = 가독성 — 손실 — 정당화 X. `Jun`/`Jul` 캘린더 — 6월 = "Jun"라 — 외워야 한다 — 큰 사기.

#### Abbreviate consistently

`Num` 전체 사용 또는 — `No` 전체 사용. 둘 다 X. 일부에서만 — 약어 X.

#### Create names that you can pronounce

`xPos` >> `xPstn`. `needsComp` >> `ndsCmptg`. **Telephone test** (Kernighan, Plauger 1978) — 전화로 — 코드 — 읽기 — 못하면 — 변수 — rename.

#### Avoid mispronunciation

`B`의 — 끝 → `BEND`보다는 — `B-END`/`b_end`. 잘 — 분리하면 — 회피.

#### Use a thesaurus to resolve naming collisions

3 chars 제한, `fired` + `full revenue disbursal` 둘 다 → 부주의하게 — 둘 다 — `frd`로 — 약어. **thesaurus** = `dismissed` (`dsm`) + `complete revenue disbursal` (`crd`).

#### Document extremely short names with translation tables

Fortran 예시:

```fortran
C ****************************
C   Translation Table
C
C   Variable    Meaning
C   --------    -------
C   XPOS        x-Coordinate Position (in meters)
C   YPOS        Y-Coordinate Position (in meters)
C   NDSCMP      Needs Computing (=0 if no computation needed;
C                                =1 if computation is needed)
C   PTGTTL      Point Grand Total
C   PTVLMX      Point Value Maximum
C   PSCRMX      Possible Score Maximum
C ****************************
```

옛 기법 같지만 — McConnell이 — 2003년 — RPG 6-character-variable 제한 — 수십만 줄 — 클라이언트 — 작업.

#### Document all abbreviations in a project-level "Standard Abbreviations" document

2 위험:

- 독자가 — 약어 — 이해 X.
- 다른 — 프로그래머가 — 같은 — 단어를 — 여러 — 약어로.

**Standard Abbreviations** 문서 — 버전 컨트롤. 새 약어 — 작성 시 — 체크아웃 → 추가 → 체크인. 정렬은 — 전체 — 단어 기준.

**Write-time 불편 ↑, Read-time 편의 ↑**. 프로그램 — 수명 — 동안 — 읽기 > 쓰기 시간 → 이익.

#### Names matter more to reader

자신이 — 6개월 — 안 본 — 코드 — 읽기 → 이름 — 이해를 위해 — 작업하는 — 곳 — 발견 → 혼란 — 야기 관행 — 변경 — 결심.

## §11.7 Kinds of Names to Avoid

### Avoid misleading names or abbreviations

`FALSE` = `TRUE`의 — 반대로 — 보통 — 이해. `Fig and Almond Season`의 — 약어로 — 사용 X.

### Avoid names with similar meanings

`input` + `inputValue`. `recordNum` + `numRecords`. `fileNumber` + `fileIndex`. 의미적으로 — 너무 — 비슷 → 같은 — 코드에서 — 혼동 → 미묘한 — 오류.

### Avoid variables with different meanings but similar names

`clientRecs`/`clientReps` — 한 글자 — 차이. 2 글자 — 이상의 — 차이 또는 — 차이를 — **앞/끝**에. `clientRecords`/`clientReports`가 — 낫다.

### Avoid names that sound similar

호모폰. McConnell의 — **Extreme Programming (Beck 2000) — 불만** = "**Goal Donor**" + "**Gold Owner**" — 발음 시 — 구별 불가:

> *"Goal Donor와 — 방금 — 이야기했는데—"*
> *"Gold Owner라 하셨나요, Goal Donor라 하셨나요?"*
> *"Goal Donor라고 했어요."*
> *"무엇이요?"*
> *"GOAL --- DONOR!"*
> *"OK, Goal Donor. 소리지를 — 필요 X."*
> *"Gold Donut이라 하셨나요?"*

### Avoid numerals in names

`file1`, `file2`, `total1`, `total2`. 숫자가 — 정말 — 의미 있으면 — 배열 — 사용. **거의 — 항상 — 더 — 나은 — 방법**.

### Avoid misspelled words in names

`highlight` → `hilite` (3 chars 절약). 독자가 — `highlite`/`hilite`/`hilight`/`hilit`/`jai-a-lai-r` 어느 것인지 — 외워야 — 함.

### Avoid words that are commonly misspelled in English

`Absense, acummulate, ascend, calender, concieve, defferred, definate, independance, occassionally, prefered, reciept, superseed` 등 — 흔한 — 오탈자.

### Don't differentiate variable names solely by capitalization

case-sensitive 언어에서 — `frd` (fired), `FRD` (final review duty), `Frd` (full revenue disbursal). 각각의 — 의미가 — 임의적·혼란. `Frd`가 — `final review duty`라도 — 똑같이 — 쉬움.

### Avoid multiple natural languages

다국적 — 프로젝트 = 단일 — 자연어 — 강제. *"Southeast Martian"으로 — 다른 — 프로그래머 — 코드 — 읽기 — 불가능"*.

### Avoid the names of standard types, variables, and routines

PL/I 예시:

```
// CODING HORROR
if if = then then
   then = else;
else else = if;
```

언어 — 예약·사전정의 — 이름 — 확인.

### Don't use names that are totally unrelated to what the variables represent

`margaret`, `pookie` — 프로그램 — 곳곳에 — 뿌리면 — 아무도 — 이해 — 불가능. 여자친구, 아내, 좋아하는 — 맥주의 — 이름 — 회피. 프로그램이 — 정말 — 여자친구·아내·맥주에 — 대한 게 — 아니라면. **그래도** — `boyFriend`, `wife`, `favoriteBeer`가 — 우월 — 그것들도 — 바뀔 수 있으니.

### Avoid names containing hard-to-read characters

비슷한 — 문자 — 구별 — 어려움. 다음 — 세트에서 — 다른 — 하나 — 찾기:

```
eyeChartl  eyeChartI  eyeChartl
TTLCONFUSION  TTLCONFUSION  TTL0NFUSION
hard2Read  hardZRead  hard2Read
GRANDTOTAL  GRANDTOTAL  6RANDTOTAL
ttl5  ttlS  ttlS
```

혼동 쌍: (1, l), (1, I), (., ,), (0, O), (2, Z), (;, :), (S, 5), (G, 6).

> **HARD DATA (Weinberg 1983)** — 1970년대 — Fortran `FORMAT` 명령에서 — **콤마 대신 — 점이 — 사용** → 우주선 — 궤도 — 잘못 계산 → **$1.6 billion — 우주선 — 손실**.

## Key Points (§)

McConnell 원문 5:

1. **좋은 변수 이름 = 가독성의 — 핵심**. 루프 인덱스·status 변수 등 — 특정 종류는 — 특정 — 고려.
2. **이름은 — 가능한 — 한 — 구체적**. vague/general → 한 — 목적 — 이상 → 보통 — 나쁨.
3. **명명 컨벤션** = local·class·global 데이터 — 구별. type 이름·named constant·enum·variable — 구별.
4. **어떤 — 프로젝트든 — 변수 — 명명 컨벤션 — 채택**. 컨벤션의 — 종류 = 프로그램 크기·인원 — 의존.
5. **약어 = 현대 — 언어에서는 — 거의 — 불필요**. 사용 시 — 프로젝트 사전/Standardized Prefixes.

## 정리

- §11.1 — 가장 — 중요한 = entity — 완전·정확 — 묘사. HARD DATA — 10~16 chars (Gorla 1990). Computed-value qualifier — 끝.
- §11.2 — Loop = `i`/`j`, 중첩은 — `teamIndex`/`eventIndex`. Status = `flag` 회피. Boolean = `done`/`error`/`found`/`success` 긍정형.
- §11.3 — 컨벤션 — KEY POINT — **특정 X 존재가 — power**. 5 cases + degrees of formality.
- §11.4 — 5 differentiation 옵션. Book = Option 5. McConnell 선호 = Option 3. Sample 컨벤션 — 3 테이블.
- §11.5 — Hungarian (Simonyi 1991). UDT + Semantic Prefix (`c`/`first`/`g`/`i`/`last`/`lim`/`m`/`max`/`min`/`p`).
- §11.6 — 현대 언어 = 약어 — 거의 — 불필요. 10 가이드. Telephone test (Kernighan, Plauger 1978).
- §11.7 — 17+ 함정. **Weinberg 1983 — Fortran FORMAT — $1.6B 우주선 — 손실**.

## 관련 항목

- [Ch 10: General Issues in Using Variables](/blog/programming/engineering/code-complete/ch10-General-Issues-in-Using-Variables)
- [Ch 12: Fundamental Data Types](/blog/programming/engineering/code-complete/ch12-Fundamental-Data-Types)
- [Clean Code Ch 2: 의미 있는 이름](/blog/programming/engineering/clean-code/chapter02-meaningful-names)
- Google C++ Style: Naming
