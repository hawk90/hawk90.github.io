---
title: "Chapter 12: Fundamental Data Types"
date: 2025-06-20T12:00:00
description: "기본 데이터 타입 — magic number 금지, 정수 overflow, float Equals(), Unicode, enum 5 용도, 자기 타입 생성."
series: "Code Complete"
seriesOrder: 12
tags: [code-complete, data-types, McConnell]
draft: true
---

## 이 챕터의 메시지

> 기본 데이터 타입 = 모든 — 다른 — 데이터 타입의 — **빌딩 블록**. integer, floating-point, character/string, boolean, enum, named constant, array. 마지막 — 섹션 = **자기 — 타입 생성**.

## 핵심 내용

- **숫자** — magic number 금지. divide-by-zero 예상. type 변환 명시. mixed-type 비교 회피. KEY POINT — 컴파일러 경고.
- **정수** — 7/10 = 0. overflow (8/16/32/64-bit unsigned/signed). 중간 결과 overflow.
- **Floating-point** (KEY POINT) — `0.1` 10번 ≠ `1.0`. `Equals()` + `ACCEPTABLE_DELTA`.
- **문자/문자열** — magic 회피. Unicode / ISO 8859. C: `strncpy()` > `strcpy()`. `CONSTANT+1` 선언. `calloc()` > `malloc()`.
- **Boolean** — 문서화·단순화. `legalLineCount` 등 — 추상 — 이름.
- **Enum** — readability + reliability + modifiability + boolean 대안. `InvalidFirst` / `First` / `Last`.
- **Named constant** — magic 회피. `Month_January To Month_December` 4 단계 — 진화.
- **Array** — bounds, end points, multidimensional, `ARRAY_LENGTH()` 매크로. Mills, Linger 1986 — sequential 접근.
- **Own types** — `typedef Coordinate` — 변경 — 한 자리. Ada `range 0..212` — 컴파일러 — 검사.

## §12.1 Numbers in General

### Avoid "magic numbers"

`100`, `47524` 같은 — literal — 프로그램 — 곳곳. **3 이점**:

- **변경 — 신뢰성** — `100`이 — 다른 — 의미일 때 — 놓치지 X.
- **변경 — 쉬움** — `100` → `200` 시 — 모든 `100`/`100+1`/`100-1` 찾기 — 불필요. 정의 — 한 자리만.
- **가독성** — `for i = 0 to MAX_ENTRIES-1` >> `for i = 0 to 99`.

### Use hard-coded 0s and 1s if you need to

`0`, `1` = increment/decrement, 배열 첫 — element. `for i = 0 to CONSTANT` OK. `total = total + 1` OK. **본문에 — 등장 가능한 — literal = 0과 1뿐**.

### Anticipate divide-by-zero errors

`/` 사용 — 매번 — 분모가 — 0 가능성 — 생각. 가능하면 — 방지 — 코드.

### Make type conversions obvious

```cpp
y = x + (float)i;     // C++
```

```vb
y = x + CSng(i)       // Visual Basic
```

명시 — 변환 → 원하는 — 변환 — 보장 + 컴파일러마다 — 다른 변환 — 회피.

### Avoid mixed-type comparisons

`x`(float) ↔ `i`(int) — `if (i == x)` = **거의 — 안 동작 — 보장**. 컴파일러가 — 어느 — 타입으로 — 변환할지 — 결정 → 반올림 → 운 좋으면 — 실행. **수동 변환** → 같은 타입끼리 — 비교.

### Heed your compiler's warnings (KEY POINT)

> **KEY POINT** — 다른 — 숫자 타입이 — 같은 표현식에 — 있을 때 — 경고. **주의 깊게**. 모든 — 프로그래머가 — 누군가의 — 골치 — 추적 도와줬는데 — 컴파일러가 — 처음부터 — 경고하던 — 오류. **Top 프로그래머는 — 모든 — 경고 — 제거**.

## §12.2 Integers

### Check for integer division

7/10 = **0.7 X** = **0**. 중간 결과도. 10 * (7/10) = (10*7)/10 = 7 (수학). 정수 = **10 * (7/10) = 0** (정수 나눗셈 7/10 = 0). 해결 = **나눗셈 — 마지막**: `(10*7) / 10`.

### Check for integer overflow

| Integer Type | Range |
| --- | --- |
| Signed 8-bit | -128 ~ 127 |
| Unsigned 8-bit | 0 ~ 255 |
| Signed 16-bit | -32,768 ~ 32,767 |
| Unsigned 16-bit | 0 ~ 65,535 |
| Signed 32-bit | -2,147,483,648 ~ 2,147,483,647 |
| Unsigned 32-bit | 0 ~ 4,294,967,295 |
| Signed 64-bit | -9.2×10¹⁸ ~ 9.2×10¹⁸ |
| Unsigned 64-bit | 0 ~ 1.8×10¹⁹ |

예: `m = j * k`, `j` 최대 200,000, `k` 최대 100,000 → `m` = **2×10¹⁰**. 32-bit 한도(2.1×10⁹) 초과 → **64-bit 또는 — float — 필요**.

### Check for overflow in intermediate results

```java
int termA = 1000000;
int termB = 1000000;
int product = termA * termB / 1000000;   // = -727 (오버플로)
```

중간 — `termA * termB` = **1,000,000,000,000** — int 한도 초과. `1,000,000,000,000 mod 2^32 = 727,379,968` → /1,000,000 = **-727**. 해결 = `long` / float.

## §12.3 Floating-Point Numbers

> **KEY POINT** — 주된 — 고려 = 많은 — 소수가 — 1과 0으로 — 정확히 — 표현 X. 1/3 = 7~15 자리만. 32-bit float — VB의 — 1/3 = 0.33333330 (7 자리).

### Avoid additions/subtractions of greatly different magnitudes

32-bit float — `1,000,000.00 + 0.1` = **1,000,000.00** (significant digit 부족). `5,000,000.02 - 5,000,000.01` = **0.0**.

**해결**: 정렬 후 — **작은 — 값부터** — 합. 무한 — 급수 = **거꾸로** — 합. round-off 제거 X — 최소화.

### Avoid equality comparisons (KEY POINT)

> *"1 = 2 for sufficiently large values of 1."* — Anonymous

```java
// Java Bad Comparison
double nominal = 1.0;
double sum = 0.0;

for (int i = 0; i < 10; i++) {
    sum += 0.1;     // sum이 — 10*0.1 → 1.0이어야
}

if (nominal == sum) {
    System.out.println("Numbers are the same.");
}
else {
    System.out.println("Numbers are different.");
}
```

출력 = **"Numbers are different."** `sum` 진행:

```
0.1
0.2
0.30000000000000004
0.4
0.5
0.6
0.7
0.7999999999999999
0.8999999999999999
0.9999999999999999
```

#### `Equals()` 함수

```java
double const ACCEPTABLE_DELTA = 0.00001;
boolean Equals(double Term1, double Term2) {
    if (Math.abs(Term1 - Term2) < ACCEPTABLE_DELTA) {
        return true;
    }
    else {
        return false;
    }
}

// 사용
if (Equals(Nominal, Sum)) ...  // → "Numbers are the same."
```

`ACCEPTABLE_DELTA`는 — 응용 — 요구에 — 따라 — 두 — 수의 — 크기 — 기반 — 계산이 — 필요할 수도.

### Anticipate rounding errors

- **더 — 정밀 — 타입**으로 — 변경 (single → double).
- **BCD (binary coded decimal)** — 느리지만 — 정확. 달러·센트 — 균형 — 정확 — 필요 시.
- **Floating → integer 변환** — 자기 — BCD. 달러를 — 100으로 — 곱해 — 센트 — 0~99 — 범위에. **`DollarsAndCents` 클래스**로 — 캡슐화.

### Check language and library support

VB의 — `Currency` 같은 — round-off 민감 — 타입.

## §12.4 Characters and Strings

### Avoid magic characters and strings

```cpp
// Bad
if (input_char == '\027') ...

// Better
if (input_char == ESCAPE) ...
```

literal — 회피 이유:

- **국제 — 번역** — 외부 — 리소스 파일에 — 묶어두면 — 번역 — 쉬움.
- **저장 공간** — 임베디드 시스템 등.
- **암호화** — comment + named constant.
- **변경** — `"Gigamatic Accounting Program"` → `"New and Improved! Gigamatic Accounting Program"`.

### Watch for off-by-one errors

substring 인덱싱 = 배열 — 같음. 문자열 — 끝 — 너머 — 읽기/쓰기 — 주의.

### Know Unicode support

Java = 모든 — 문자열 — Unicode. C/C++ = 자체 — 함수 — 필요. 표준·서드파티 — 라이브러리 — 통신 시 — 변환 — 필요. **일찍 — 결정**.

### Decide on internationalization/localization strategy early

외부 — 리소스 저장 / 언어별 — 빌드 / 런타임 — 결정.

### Single alphabetic → ISO 8859

영어만 — 같은 — 단일 — 알파벳. ISO 8859 (extended-ASCII) = Unicode — 대안.

### Multiple → Unicode

ISO 8859보다 — 광범위.

### Consistent conversion strategy

프로그램 — 내부 = 단일 포맷. **입출력 — 가까이** — 변환.

### Strings in C

C++ STL `string` = 대부분 — C 문자열 — 문제 — 제거. C 직접 — 작업 시:

#### String pointers vs character arrays

```c
StringPtr = "Some Text String";
```

`"Some Text String"` = literal — 포인터. 할당 = `StringPtr`이 — literal을 — 가리키게만. **내용 — 복사 X**.

- **`=` 포함 — 문자열 표현식 — 의심** — C 문자열 = `strcmp()`, `strcpy()`, `strlen()`.
- **명명 — 컨벤션** — `ps` 접두사 = pointer to string, `ach` 접두사 = array of characters.

#### Declare C-style strings to have length CONSTANT+1

C/C++ = 길이 `n` 문자열 = **`n+1` 바이트** (null terminator).

```c
/* Declare string to have length of "constant+1".
   Every other place uses "constant" rather than "constant+1". */
char string[NAME_LENGTH + 1] = { 0 };   /* string of length NAME_LENGTH */
...
/* Example 1: Set string to all 'A's using the constant, NAME_LENGTH */
for (i = 0; i < NAME_LENGTH; i++)
    string[i] = 'A';
...
/* Example 2: Copy another string */
strncpy(string, some_other_string, NAME_LENGTH);
```

컨벤션 X → 어떤 — 때는 — `NAME_LENGTH`로 — 선언 + `NAME_LENGTH-1` 연산. 다른 — 때는 — 반대. **매번 — 외워야**.

#### Initialize strings to null to avoid endless strings

C = null terminator로 — 끝 — 결정. 0 바이트 — 누락 → **연산이 — 예상대로 — X**.

- **배열 — 0으로 — 초기화**:
  ```c
  char EventName[MAX_NAME_LENGTH + 1] = { 0 };
  ```
- **동적 — 할당** = `malloc()` 대신 — **`calloc()`** — 0으로 — 초기화.

#### Use arrays of characters instead of pointers in C

메모리 — 제약 X → 모든 — 문자열 — 배열. 포인터 — 문제 — 회피 + 컴파일러 — 경고 ↑.

#### Use strncpy() instead of strcpy() to avoid endless strings

`strcpy()`, `strcmp()` = NULL terminator까지 — 계속. `strncpy()`, `strncmp()` = **최대 길이 — 매개변수**.

## §12.5 Boolean Variables

### Use boolean variables to document your program

```java
// Unclear
if ((elementIndex < 0) || (MAX_ELEMENTS < elementIndex) ||
    (elementIndex == lastElementIndex)) {
    ...
}
```

```java
// Clear
finished = ((elementIndex < 0) || (MAX_ELEMENTS < elementIndex));
repeatedEntry = (elementIndex == lastElementIndex);
if (finished || repeatedEntry) {
    ...
}
```

### Use boolean variables to simplify complicated tests

```vb
' CODING HORROR
If ((document.AtEndOfStream()) And (Not inputError) And _
    ((MIN_LINES <= lineCount) And (lineCount <= MAX_LINES)) And _
    (Not ErrorProcessing())) Then
    ...
End If
```

```vb
' Good
allDataRead = (document.AtEndOfStream()) And (Not inputError)
legalLineCount = (MIN_LINES <= lineCount) And (lineCount <= MAX_LINES)
If (allDataRead) And (legalLineCount) And (Not ErrorProcessing()) Then
    ...
End If
```

### Create your own boolean type, if necessary

C — 미지원 → 자체:

```c
typedef int BOOLEAN;
```

`BOOLEAN` 선언 → `int`보다 — 의도 — 명확 + 자기 — 문서화.

## §12.6 Enumerated Types

### Use enumerated types for readability

```
if chosenColor = 1            // Bad
if chosenColor = Color_Red    // Good
```

literal 발견 시 — enum — 가능성 — 고려.

### Use enumerated types for reliability

Ada — 컴파일러가 — `color = Country_England`나 — `country = Output_Printer` — 거부. **named constant**는 — 컴파일러가 — 모름.

### Use enumerated types for modifiability

"1=red, 2=green, 3=blue" → 결함 발견 시 — 모든 `1`/`2`/`3` — 변경. enum = 정의에 — 추가 + 재컴파일만.

### Use enumerated types as an alternative to boolean variables

```
// Boolean — 너무 — 풍부 X
return True  // 성공
return False // 실패

// Enum — 2 종류의 — 실패 가능
Status_Success
Status_Warning
Status_FatalError
```

### Check for invalid values

```vb
Select Case screenColor
    Case Color_Red ...
    Case Color_Blue ...
    Case Color_Green ...
    Case Else
        DisplayInternalError(False, "Internal Error 752: Invalid color.")
End Select
```

### Define first and last entries for use as loop limits

```vb
Public Enum Country
    Country_First = 0
    Country_China = 0
    Country_England = 1
    ...
    Country_Usa = 6
    Country_Last = 6
End Enum

' Loop
For iCountry = Country_First To Country_Last
    usaCurrencyConversionRate(iCountry) = ConversionRate(Country_Usa, iCountry)
Next
```

### Reserve the first entry as invalid

많은 — 컴파일러 = enum 첫 — 요소 = 0. **0 = invalid** → 초기화 X 변수 — 잡힘 (`0`이 — 가장 — 흔한 — invalid).

```vb
Public Enum Country
    Country_InvalidFirst = 0
    Country_First = 1
    Country_China = 1
    ...
    Country_Last = 7
End Enum
```

### Define precisely how First/Last used

`InvalidFirst`, `First`, `Last` — 사용 시 — 유효 — 엔트리가 — 0/1에서 — 시작인지 — 혼란 가능. **프로젝트 — 코딩 표준** = 일관 사용.

### Beware pitfalls of assigning explicit values

```cpp
enum Color {
    Color_InvalidFirst = 0,
    Color_Red = 1,
    Color_Green = 2,
    Color_Blue = 4,           // 점프
    Color_InvalidLast = 8
};
```

loop가 — invalid 3, 5, 6, 7도 — 통과.

### If your language doesn't have enumerated types

Java (책 — 작성 시) — 미지원 → 시뮬레이션:

```java
class Color {
    private Color() {}
    public static final Color Red = new Color();
    public static final Color Green = new Color();
    public static final Color Blue = new Color();
}

class Country {
    private Country() {}
    public static final Country China = new Country();
    public static final Country England = new Country();
    ...
}
```

`Color.Red`, `Country.England`로 — 사용. **typesafe** — 컴파일러가 — `Output output = Country.England` — 거부 (Bloch 2001).

## §12.7 Named Constants

### Use named constants in data declarations

```vb
Const AREA_CODE_LENGTH = 3
Const LOCAL_NUMBER_LENGTH = 7
...
Type PHONE_NUMBER
    areaCode(AREA_CODE_LENGTH) As String
    localNumber(LOCAL_NUMBER_LENGTH) As String
End Type
...
For iDigit = 1 To LOCAL_NUMBER_LENGTH
    If (phoneNumber.localNumber(iDigit) < "0") Or ("9" < phoneNumber.localNumber(iDigit)) Then
        ' error processing
        ...
```

직원이 — 한 — 국가 → 7자리. 회사 — 확장 → 다른 — 국가 → 더 — 긴 — 번호 → **한 자리만 변경**. Glass (1991).

### Avoid literals, even "safe" ones — 4 단계 진화

```vb
' Stage 1: Unclear
For i = 1 To 12
    profit(i) = revenue(i) - expense(i)
Next
```

```vb
' Stage 2: Clearer
For i = 1 To NUM_MONTHS_IN_YEAR
    profit(i) = revenue(i) - expense(i)
Next
```

```vb
' Stage 3: Even Clearer (informative index)
For month = 1 To NUM_MONTHS_IN_YEAR
    profit(month) = revenue(month) - expense(month)
Next
```

```vb
' Stage 4: Very Clear (enum)
For month = Month_January To Month_December
    profit(month) = revenue(month) - expense(month)
Next
```

> Literal — 안전해도 — named constant. **광신도가 — 되라** — 코드의 — `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`까지 — 검색.

### Use named constants consistently

named constant와 — literal을 — 같은 — entity로 — 혼용 X. 800번에 — 전화하면 — 오류가 — 집까지 — 배송되는 — 것과 — 같음. 변경 시 — hard-coded literal — 놓침 → 미묘한 결함.

## §12.8 Arrays

> **KEY POINT** — 모든 — array 문제 = element가 — **무작위로 — 접근 가능**하다는 — 사실에서. 가장 — 흔한 = bounds 밖 — 접근.

### Think of arrays as sequential structures

> 일부 — CS의 — 가장 — 똑똑한 — 사람들 — array는 — **무작위 X — 순차 — 접근**이라 — 제안 (Mills, Linger 1986). 무작위 access = `goto`와 — 유사 → 비훈련, 오류 prone, 정확성 — 증명 — 어려움. **set, stack, queue 사용 — 권장**.

> **HARD DATA** — 작은 실험 — Mills, Linger — 이렇게 만든 설계 = **변수 ↓ + 변수 참조 ↓**. 효율적·고신뢰.

### Check the end points of arrays

루프 — 끝점처럼 — array — 끝점 — 검사. 첫·마지막 — element + middle.

### Multidimensional subscripts in correct order

`Array[i][j]` ↔ `Array[j][i]` — 쉬운 — 혼동. **이중 검사**. `i`/`j`보다 — 의미 있는 — 이름.

### Watch out for index cross talk

중첩 루프 = `Array[j]` 대신 — `Array[i]` 작성 — 쉬움. **index cross talk**. 의미 있는 — index 이름.

### Throw in an extra element at the end

off-by-one — 흔함. array를 — 필요한 — 크기보다 — 1 더 — 크게 → cushion.

### In C, use the ARRAY_LENGTH() macro

```c
#define ARRAY_LENGTH(x) (sizeof(x)/sizeof(x[0]))
```

```c
ConsistencyRatios[] = {0.0, 0.0, 0.58, 0.90, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49, 1.51, 1.48, 1.56, 1.57, 1.59};
...
for (RatioIdx = 0; RatioIdx < ARRAY_LENGTH(ConsistencyRatios); RatioIdx++) {
    ...
}
```

dimension X array — 특히 유용. 추가·제거 시 — named constant — 변경 — 불필요.

## §12.9 Creating Your Own Types

> 프로그래머 — 정의 — 타입 = 언어가 — 줄 수 있는 — 가장 — 강력한 — 능력 중 하나. 예상 X 변경 — 보호 + 가독성 — 향상 — 새 — 클래스 — 설계·구축·테스트 — 없이.

### Why Pascal/Ada examples?

> Pascal/Ada = stegosaurus의 — 길을 — 갔다. 그러나 — **simple type definition 영역에서는 — C++/Java/VB가 — 3걸음 전진 + 1걸음 후퇴**.

```ada
currentTemperature: INTEGER range 0..212;   -- Ada: semantic info 풍부
```

```c
int temperature;                            // C: 정보 X
```

```ada
type Temperature is range 0..212;
...
currentTemperature: Temperature;            -- 컴파일러 — Temperature만 — 할당 — 보장
```

Ada — `Temperature` 클래스 — 작성 가능. 그러나 — **한 줄 typedef → 클래스 = 큰 — 단계** → 많은 — 상황에서 — 클래스 — 추가 — 노력 — 안 함.

### Coordinate 예제

```cpp
typedef float Coordinate;   // for coordinate variables

Routine1(...) {
    Coordinate latitude;     // latitude in degrees
    Coordinate longitude;    // longitude in degrees
    Coordinate elevation;    // elevation in meters
    ...
}

Routine2(...) {
    Coordinate x;            // x in meters
    Coordinate y;            // y in meters
    Coordinate z;            // z in meters
    ...
}
```

`float` → `double` 변경 — `typedef` **한 자리만**:

```cpp
typedef double Coordinate;   // 변경 — 끝
```

### Guidelines for Creating Your Own Types

#### Create types with functionally oriented names

real-world 문제 — 부분에 — 참조. `BigInteger`, `LongString` = computer data 참조 → **회피**. `Coordinate` / `Currency` / `Age` = real-world.

#### Avoid predefined types

타입 변경 — 가능성 → `typedef`/`type` — 외에는 — 미사용. `Coordinate x`가 — `float x`보다 — `x`에 대해 — 더 — 많이 알림.

#### Don't redefine a predefined type

언어의 — 예약 `Integer` → 자기 `Integer` X — 혼란.

#### Define substitute types for portability

`INT` (vs `int`), `LONG` (vs `long`) — 다른 — 하드웨어로 — 이동 시 — 한 자리만 — 재정의.

#### Consider creating a class rather than using a typedef

추가 — 유연성·통제 — 원하면 — 클래스.

## Key Points (§)

McConnell 원문 3:

1. 특정 데이터 타입 — 각각의 — **많은 — 개별 규칙** — 외움. **체크리스트** — 흔한 문제 — 고려.
2. **자기 — 타입 생성** = 프로그램 — 수정 쉬움 + 자기 — 문서화. 언어 지원 시.
3. 단순 — 타입 — `typedef` 생성 시 — **새 — 클래스가 — 더 — 나을지 — 고려**.

## 정리

- §12.1 — Magic number 금지. divide-by-zero, mixed-type, 컴파일러 경고.
- §12.2 — 7/10 = 0. 8/16/32/64-bit 범위. 중간 결과 overflow.
- §12.3 — KEY POINT — 정확 표현 X. `Equals()` + `ACCEPTABLE_DELTA`. BCD / 정수 / `DollarsAndCents`.
- §12.4 — Unicode / ISO 8859. C: `CONSTANT+1`, `calloc()`, `strncpy()`.
- §12.5 — Boolean = 문서화·단순화. C — `typedef int BOOLEAN`.
- §12.6 — Enum — 4 용도 + first/last + InvalidFirst. Java 시뮬레이션 (Bloch 2001).
- §12.7 — Named constant — 4 단계 진화 (`12` → `NUM_MONTHS_IN_YEAR` → `month` 인덱스 → `Month_January To Month_December`).
- §12.8 — KEY POINT — bounds. Mills, Linger 1986 — sequential. `ARRAY_LENGTH()` 매크로.
- §12.9 — `typedef Coordinate float` — 한 자리만 변경. Ada `range 0..212` — 컴파일러 — 보장.

## 관련 항목

- [Ch 11: The Power of Variable Names](/blog/programming/engineering/code-complete/ch11-The-Power-of-Variable-Names)
- [Ch 13: Unusual Data Types](/blog/programming/engineering/code-complete/ch13-Unusual-Data-Types)
- [Effective C++ Ch 2: const/enum/inline > #define](/blog/programming/cpp/effective-cpp)
