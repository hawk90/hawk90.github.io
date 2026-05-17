---
title: "Chapter 8: Defensive Programming"
date: 2025-06-20T08:00:00
description: "방어적 프로그래밍 — Garbage In, Nothing Out. assertion, 10가지 에러 처리, 예외, barricade, offensive programming."
series: "Code Complete"
seriesOrder: 8
tags: [code-complete, defensive-programming, assertions, exceptions, McConnell]
draft: true
---

## 이 챕터의 메시지

> **KEY POINT** — 방어적 프로그래밍 = 프로그래밍에 대해 — 방어적이 — 되라는 — 의미 X. *"It does so work!"*가 아님. 방어 운전에서 — 빌린 개념. 다른 운전자가 — 무엇을 할지 — 모르니 — 자기 자신을 — 보호.

루틴이 — 나쁜 데이터를 — 받아도 — 다치지 않도록. 나쁜 데이터가 — 다른 루틴의 — 잘못이라 해도. **프로그램은 — 문제·수정을 — 가지게 마련**이라는 — 인식.

## 핵심 내용

- **Garbage In, Garbage Out**은 — production에서는 — 부족. **Garbage In, Nothing Out** / **Error Message Out** / **No Garbage Allowed**.
- 3 일반 처리 = 외부 데이터 검증 / 루틴 입력 검증 / 나쁜 입력 처리.
- **Assertion** = 절대 — 일어나면 안 되는 조건. **Error handling** = 일어날 거라 — 기대되는 조건.
- 에러 처리 — **10 옵션** + Robustness vs Correctness.
- **Exception** = 무시될 수 — 없는 방식으로 — 알리는 도구. 신중히.
- **Barricade** = 손상 격리. 신뢰/비신뢰 영역 분리.
- **Offensive programming** = 개발에서 — 강하게 실패, 운영에서 — 부드럽게.
- 방어가 — 너무 — 많아도 — 문제. *"Too much of anything is bad, but too much whiskey is just enough"* — Mark Twain.

## §8.1 Protecting Your Program From Invalid Inputs

> *"Garbage In, Garbage Out"* = 학교에서 — 들었던 — 표현. **소프트웨어판 caveat emptor** — 사용자 — 조심.

> **KEY POINT** — Production 소프트웨어는 — "Garbage in, garbage out" — 부족. 좋은 프로그램 = **"Garbage in, nothing out"** / **"Garbage in, error message out"** / **"No garbage allowed in"**. 오늘날 기준으로 — Garbage in/out = 게으르고 — 비보안 프로그램.

### 3 처리 방식

#### Check the values of all data from external sources

파일·사용자·네트워크·외부 인터페이스에서 — 받은 — 데이터. 허용 범위 검사. 보안 응용 = **buffer overflow, SQL injection, HTML/XML injection, integer overflow** — 특히 의심.

#### Check the values of all routine input parameters

외부 검사와 — 본질적으로 — 같음. 단지 — 데이터가 — 외부 인터페이스 X → 다른 루틴에서 옴.

#### Decide how to handle bad inputs

검출 후 — 무엇을 할 것인가? 이 챕터 — 나머지(특히 §8.3) = 12+ 접근. 응용 상황에 — 따라.

> 방어적 코딩은 — 다른 — 품질 기법의 — **보조**. **최선의 방어 = 처음부터 — 오류 삽입 X**. iterative design, pseudocode 우선, 저수준 — 설계 검사가 — 더 우선.

## §8.2 Assertions

Assertion = 개발 중 — 사용되는 — 코드(루틴/매크로). 프로그램이 — 실행 중 — 자기 자신을 — 검사. True면 — 정상. False면 — **예상치 못한 오류 검출**.

예: 시스템이 — 고객 정보 파일에 — 50,000 레코드 이하라고 — 가정 → 50,000 초과 시 — assertion 발화.

> **KEY POINT** — Assertion은 — **크고 — 복잡한 — 프로그램**과 — **고신뢰 — 프로그램**에서 — 특히 — 유용. 매칭 안 되는 — 인터페이스 가정, 코드 수정 시 — 스며든 오류 — 빨리 — 비워냄.

Java 예시:

```java
assert denominator != 0 : "denominator is unexpectedly equal to 0.";
```

2 인자 = boolean 표현식 + False 시 — 표시 메시지.

### Assertion으로 — 검사할 — 가정 (PDF 11개)

- 입력 매개변수 값이 — 기대 범위 안.
- 파일/스트림이 — 열려 (또는 닫혀) — 시작·종료 시.
- 파일/스트림이 — 시작 (또는 끝)에.
- 파일/스트림이 — read-only / write-only / 둘 다.
- input-only 변수 값이 — 루틴에서 — 변경 X.
- 포인터가 — non-NULL.
- 배열/컨테이너가 — 최소 X개 — 데이터 요소.
- 테이블이 — 실제 값으로 — 초기화됨.
- 컨테이너가 — empty (또는 full) — 시작·종료 시.
- 최적화된 복잡 루틴 결과 = 느리지만 — 명확한 — 루틴 결과와 — 일치.
- 기타.

> Production에서 = assertion 메시지 — 사용자에 — 노출 X. 개발 시 — 컴파일 in, production 시 — 컴파일 out → 성능 저하 X.

### Building Your Own Assertion Mechanism

C++/Java/VB = 내장 지원. C++ 표준 `assert` 매크로 = 텍스트 메시지 — 제공 X. 자체 매크로:

```cpp
#define ASSERT(condition, message) {        \
    if (!(condition)) {                     \
        fprintf(stderr, "Assertion %s failed: %s\n", \
            #condition, message);           \
        exit(EXIT_FAILURE);                 \
    }                                       \
}
```

### Guidelines for Using Assertions

#### Use error-handling code for conditions you expect; assertions for conditions that should never occur

- **Error handling** = off-nominal 상황 — 자주는 — 아니지만 — 예상됨. production 코드가 — 처리 — 필요.
- **Assertion** = 절대 — 일어나면 안 됨. 발화 시 — 시정 = **소스 코드 변경 + 재컴파일 + 새 릴리스**. (= "graceful 처리" 아님.)

좋은 사고법 = assertion을 — **실행 가능한 — 문서**로. 의존 X, 그러나 — 가정을 — 주석보다 — 더 — 능동적으로 — 문서화.

#### Avoid putting executable code in assertions

```vb
' Dangerous
Debug.Assert(PerformAction())  ' assertion off → PerformAction 호출 X
```

```vb
' Safe
actionPerformed = PerformAction()
Debug.Assert(actionPerformed)
```

assertion 컴파일 — off 시 — 액션 자체가 — 사라짐. **한 줄에 — 여러 명령** 문제와 — 유사.

#### Use assertions to document preconditions and postconditions

> **Design by contract** (Meyer 1997) — 각 루틴·클래스가 — 나머지 프로그램과 — 계약 — 형성. **Preconditions** = 클라이언트가 — 호출 전 — 보장. **Postconditions** = 루틴이 — 종료 시 — 보장.

```vb
Private Function Velocity(_
    ByVal latitude As Single, _
    ByVal longitude As Single, _
    ByVal elevation As Single _
) As Single
    ' Preconditions
    Debug.Assert(-90 <= latitude And latitude <= 90)
    Debug.Assert(0 <= longitude And longitude < 360)
    Debug.Assert(-500 <= elevation And elevation <= 75000)

    ...

    ' Postconditions
    Debug.Assert(0 <= returnVelocity And returnVelocity <= 600)
    Velocity = returnVelocity
End Function
```

`latitude`, `longitude`, `elevation`이 — **외부 소스**에서 오면 — assertion X, **error handling** 사용. **신뢰 — 내부 소스**에서 오면 — assertion OK.

#### For highly robust code, assert and then handle the error anyway

전문가 = 하나만 — 충분 (Meyer 1997).

실세계 = 너무 — 지저분. 큰·장수 시스템 = 5~10년 — 다른 설계자, 다른 기술, 다른 — 표준, 다른 — 지리. 회귀 테스트도 — 광범위 X.

**Microsoft Word** = 항상 — true여야 하는 — 조건을 — assertion + assertion이 — 실패할 경우를 위해 — error-handling 코드도. 둘 다.

```vb
Private Function Velocity(_
    ByRef latitude As Single, _
    ByRef longitude As Single, _
    ByRef elevation As Single _
) As Single
    ' Preconditions
    Debug.Assert(-90 <= latitude And latitude <= 90)
    ...

    ' Sanitize input data.
    If (latitude < -90) Then
        latitude = -90
    ElseIf (latitude > 90) Then
        latitude = 90
    End If
    If (longitude < 0) Then
        longitude = 0
    ElseIf (longitude > 360) Then
        ...
```

## §8.3 Error Handling Techniques

10 옵션 (PDF):

1. **Return a neutral value** — 무해한 — 값. 숫자 = 0. 문자열 = "". 포인터 = empty. 색상 = 기본 배경/전경.
2. **Substitute the next piece of valid data** — 스트림. 손상 레코드 — 건너뛰고 — 다음. 100/초 — 온도계 = 다음 1/100초 — 값.
3. **Return the same answer as the previous time** — 온도계가 — 한 번 — 읽기 실패 → 이전 값. 비디오 게임 — 픽셀 색.
4. **Substitute the closest legal value** — 온도계 0~100°C 보정. <0 → 0, >100 → 100. McConnell 자동차 — 후진 시 — 속도 = 0 (음수 표시 X).
5. **Log a warning message** — 다른 기법과 — 병행.
6. **Return an error code** — status 변수 설정 / function 반환값 / 예외 throw. **보안 critical** = 호출자가 — 반드시 — 검사.
7. **Call an error processing routine/object** — 중앙화. **단점** = 전체 프로그램 — 그것을 — 알게 됨, 재사용 시 — 같이 — 끌고 다님. **보안 영향** = buffer-overrun 후 — 공격자가 — 핸들러 — 주소 손상 가능 → 안전 X.
8. **Display an error message wherever the error is encountered** — 오버헤드 최소. UI 메시지가 — 전체 응용으로 — 퍼짐 → 일관 UI, 분리, 지역화 어려움. **보안** = 공격자에게 — 시스템 — 너무 많이 — 알림 위험.
9. **Handle the error in whatever way works best locally** — 개발자 — 자율. **위험** = 시스템 전체 — correctness/robustness — 충족 X 가능.
10. **Shutdown** — Safety critical. 방사선 치료 = 잘못된 — 선량보다 — 재부팅이 — 낫다. Windows = 보안 로그 가득 차면 — 정상은 — 계속 동작, 옵션으로 — halt 설정 가능.

### Robustness vs. Correctness

> 브레인 티저: 그래픽 응용 — 화면 우하단 — 몇 픽셀이 — 잘못된 색. 다음 업데이트 시 — 새로고침 → 옳은 색. 최선?

- **빠른 비디오 게임** → 이전 값 유지 / 기본 배경색. (다음 새로고침 = <1초)
- **X-ray 표시** → 에러 메시지 또는 — 셧다운. X-ray 데이터에 — 나쁜 데이터 — 위험.

- **Correctness** = **부정확 결과 — 절대 — 반환 X**. 결과 없는 게 — 부정확보다 — 낫다. 방사선·X-ray.
- **Robustness** = **계속 동작 — 항상 — 시도**. 부정확이라도. 워드프로세서.

소비자 응용 = robustness 선호. 셧다운보다 — 어떤 — 결과라도. 안전 critical = correctness 선호.

### High-Level Design Implications of Error Processing

> **KEY POINT** — 너무 — 많은 — 옵션 → **일관되게 — 처리** 필요. 에러 처리 방식 = 소프트웨어의 — correctness, robustness, 비기능 — 속성 — 충족 능력에 — 영향. **나쁜 매개변수 처리 — 일반 — 접근 결정 = 아키텍처 / 고수준 — 설계 — 결정**.

선택 후 — **일관**되게 — 따르라. C++는 — 함수 반환값을 — 무시할 — 옵션 있음. **무시 X** — error information 검사.

## §8.4 Exceptions

루틴이 — 자기가 — 처리 — 모르는 — 조건 검출 → **예외 throw** = 손 들고 — *"이걸 — 어떻게 — 할지 — 모름! 다른 누군가가 — 처리할 — 줄 — 알기를"*.

C++/Java/VB = `throw` ↔ `try-catch`. Table 8-1 (PDF) 요약 — 언어별 — 다양한 — 동작.

### Use exceptions to notify other parts about errors that should not be ignored

> Andy Hunt, Dave Thomas — *"정상 처리 — 일부로 — 예외를 — 쓰는 — 프로그램은 — classic spaghetti 코드의 — 모든 — 가독성·유지보수성 문제를 — 겪는다."*

> **KEY 이점** (Meyers 1996) — 에러 조건을 — **무시할 수 — 없는 방식으로 — 신호**. 다른 처리 = 에러가 — 코드베이스를 — 미탐지로 — 전파 가능.

### Throw exception only for conditions truly exceptional

assertion과 — 유사 — 사용처 — 드물고 — **절대 — 일어나면 안 됨**.

예외 = 강력함 vs 복잡성 — 트레이드오프. 호출하는 — 코드가 — 호출되는 — 코드의 — 예외를 — 알아야 함 → 캡슐화 약화 → **복잡성 ↑** → Primary Technical Imperative(복잡성 관리)와 — 반대.

### Don't use an exception to pass the buck

지역 처리 가능 → 지역 처리. uncaught 예외를 — 떠넘기지 X.

### Avoid throwing exceptions in constructors and destructors

C++ — 매우 복잡. **destructor가 — 완전 — 생성된 — 객체만 — 호출됨** → 생성자에서 — 예외 → destructor 호출 X → **리소스 누수** (Meyers 1996, Stroustrup 1997).

법규 변호사 = "trivial 규칙"이라 — 부르지만 — 보통 — 프로그래머는 — 외우기 어려움. **그런 코드 — 처음부터 — 안 쓰기**.

### Throw exceptions at the right level of abstraction

```java
// CODING HORROR: 추상 — 비일관
class Employee {
    public TaxId getTaxId() EOFException {
        ...
    }
}
```

`getTaxId()`가 — 저수준 `io_disk_not_ready` 예외를 — 호출자에 — 전달. 캡슐화 깨짐.

```java
// Good
class Employee {
    public TaxId getTaxId() throws EmployeeDataNotAvailable {
        ...
    }
}
```

내부에서 — `io_disk_not_ready`를 — `EmployeeDataNotAvailable`로 — 매핑.

### Include all information that led to the exception in the exception message

배열 — 인덱스 오류 → 메시지에 — **상·하한 + 불법 인덱스 값** — 포함.

### Avoid empty catch blocks

```java
// CODING HORROR
try {
    // lots of code
} catch (AnException exception) {
}
```

`try` 블록이 — 잘못이거나 — `catch` 블록이 — 잘못. **루트 원인 — 결정 후 — 수정**.

드물게 — 저수준 예외가 — 호출 루틴 추상에서는 — 예외가 — 아닐 — 수도. 그 — 경우에는 — **왜 — empty catch가 — 적절한지 — 문서화**.

### Know the exceptions your library code throws

언어가 — 정의 — 강제 X 한다면 — 라이브러리 — 던지는 — 예외 — 반드시 — 알기. 라이브러리 — 예외 — 안 잡으면 — 프로그램 — 크래시.

### Consider building a centralized exception reporter

예외 처리 — 일관성 — 보장. 알려진 예외, 처리 방식, 메시지 포맷 — 중앙 — 저장소.

```vb
Sub ReportException(_
    ByVal className, _
    ByVal thisException As Exception _
)
    Dim message As String
    Dim caption As String

    message = "Exception: " & thisException.Message & ". " & ControlChars.CrLf & _
        "Class:   " & className & ControlChars.CrLf & _
        "Routine: " & thisException.TargetSite.Name & ControlChars.CrLf
    caption = "Exception"
    MessageBox.Show(message, caption, MessageBoxButtons.OK, _
        MessageBoxIcon.Exclamation)
End Sub
```

```vb
Try
    ...
Catch exceptionObject As Exception
    ReportException(CLASS_NAME, exceptionObject)
End Try
```

### Standardize your project's use of exceptions

- `Exception` 기본 — 클래스 — 파생만 — throw.
- 지역 처리(`throw-catch`)의 — 상황 정의.
- 비지역 처리할 — 상황 정의.
- 중앙 reporter — 사용 여부.
- 생성자/소멸자에서 — 예외 — 허용 여부.

### Consider alternatives to exceptions

언어가 — 예외 제공한다고 — 예외만 쓰면 — *"programming in a language"*. **모든 — 대안 — 고려**:

- 지역 처리.
- 에러 코드 전파.
- 디버그 로깅.
- 셧다운.
- 다른 접근.

Bjarne Stroustrup — *"때로는 — 심각한 런타임 오류에 — 최선의 응답 = 모든 — 획득한 — 리소스를 — 해제하고 — abort. 사용자가 — 적절한 — 입력으로 — 재실행"* (Stroustrup 1997).

## §8.5 Barricade Your Program to Contain the Damage Caused by Errors

> Barricade = 손상 — 격리 전략. 선박의 — 격리 — 칸막이와 — 유사. 빙산에 — 부딪혀 — 한 칸이 — 열려도 — 나머지는 — 안전. 건물의 — 방화벽과 — 유사. (예전엔 — "firewall"이라 — 불렀으나 — 지금은 — port blocking 의미.)

특정 — 인터페이스를 — "safe area"의 — 경계로 — 지정. 데이터가 — 안전 영역의 — 경계를 — 넘을 때 — 검증.

### 클래스 수준에서 적용

- public 메서드 = 데이터가 — 안전 X 가정, 데이터 — 검사·정제.
- private 메서드 = 데이터가 — 안전하다 — 가정.

### Operating-room 비유

데이터가 — operating room 들어가기 전 — 살균. **핵심 설계 결정** = 무엇을 — 안에, 무엇을 — 밖에, **문(루틴)** — 어디.

### Convert input data to the proper type at input time

입력 = 보통 — 문자열·숫자. 그러나 — boolean (yes/no), enum (Color_Red, Color_Green) 등에 — 매핑되기도. **입력 직후 — 적절한 — 타입으로 — 변환**.

### Relationship between Barricades and Assertions

- **Barricade 밖** = error handling (데이터 — 안전 가정 X).
- **Barricade 안** = assertion (정제됐다고 가정. 안에서 — 나쁜 데이터 = 데이터 오류 X, **프로그램 오류**).

→ assertion vs error handling — 구분이 — **깔끔**.

## §8.6 Debugging Aids

방어적 — 핵심 = 디버깅 도구.

### Don't Automatically Apply Production Constraints to the Development Version

> **KEY POINT** — 개발 중 — 속도·리소스를 — 거래 — 가능 — 도구가 — 개발을 — 부드럽게 만든다면. **개발 = production 제약 — 적용 X**.

Production = 빠르게, 리소스 — 절약. Development = **느리고 — 사치스러워도 OK**. 더 — 위험한 — 연산·안전망.

McConnell — quadruply linked list 무결성 — 검사 — 메뉴. Microsoft Word = 디버그 모드 — idle loop에서 — Document 객체 무결성 — 매 몇 초 — 검사.

### Introduce Debugging Aids Early

빨리 — 도입할수록 — 도움 ↑. 보통 — 같은 — 문제에 — 여러 번 — 시달린 — 후에야 — 작성. **첫 번째에 — 작성 + 다음 프로젝트에 — 재사용**.

### Use Offensive Programming

> Howard, LeBlanc (2003) — *"offensive programming"*. 예외 — 경우를 — **개발 중 — 명백하게, production 중 — 회복 가능하게**.

> *"A dead program normally does a lot less damage than a crippled one."* — Andy Hunt, Dave Thomas

`case`문 — 5 종류 처리 — 기대. 개발 중 — default = **경고 발생** "*"Hey! 또 다른 케이스! 프로그램 고쳐!"*. Production 중 — default = 우아하게 — error-log 메시지.

#### 공격적 프로그래밍 방법 (PDF)

- **`assert`가 — 프로그램 abort 보장** — 우회 X. 알려진 — 문제 — bypass 위해 — Enter 키만 — 누르는 — 습관 X. **고치도록 — 충분히 — 아프게**.
- 메모리 할당 — 전부 채워서 — 메모리 할당 오류 — 검출.
- 파일/스트림 할당 — 전부 채워서 — 파일 포맷 오류 — 비우기.
- `case`문 `else` 절 = 강하게 abort.
- 삭제 — 직전 — 객체를 — junk 데이터로 — 채우기.

**최고의 방어 = 좋은 공격**. 개발에서 — 강하게 실패 → production에서 — 부드럽게 실패.

### Plan to Remove Debugging Aids

#### Use version control and build tools like make

같은 — 소스에서 — 다른 버전 — 빌드. 개발 = include, production = exclude.

#### Use a built-in preprocessor

C++ — 직접:

```cpp
#define DEBUG
...
#if defined(DEBUG)
// debugging code
...
#endif
```

또는 — 매크로로:

```cpp
#define DEBUG
#if defined(DEBUG)
#define DebugCode(code_fragment) { code_fragment }
#else
#define DebugCode(code_fragment)
#endif
...
DebugCode(
    statement 1;
    statement 2;
    ...
);
```

#### Write your own preprocessor

언어가 — 미지원 시. Java = `//#BEGIN DEBUG` / `//#END DEBUG` 키워드 — precompiler — 작성.

#### Use debugging stubs

```cpp
// Development
void CheckPointer(void *pointer) {
    // check 1 -- NULL이 아닌가
    // check 2 -- dogtag 정당한가
    // check 3 -- 손상 X
    ...
}

// Production
void CheckPointer(void *pointer) {
    // no code; just return
}
```

## §8.7 Determining How Much Defensive Programming to Leave in Production Code

방어의 — paradox = 개발 중 = **눈에 띄게** (간과보다 — obnoxious가 — 낫다). Production 중 = **눈에 안 띄게** (회복 또는 — graceful 실패).

### Leave in code that checks for important errors

어느 영역이 — 미탐지 오류를 — 감당 — 가능한가. 스프레드시트 = 화면 갱신 = 미탐지 OK (지저분한 화면뿐). **계산 엔진 = 미탐지 X** (잘못된 결과 → IRS 감사).

### Remove code that checks for trivial errors

trivial = 제거. "제거" = 물리적 제거 X — 버전 컨트롤·precompiler 스위치로 — 컴파일 안 함.

### Remove code that results in hard crashes

개발 중 = 크래시 — 좋음 (눈에 띄게). Production = **사용자가 — 작업 저장할 — 기회 필요**. 데이터 손실 야기하는 — 디버깅 코드 = production에서 — 제거.

### Leave in code that helps the program crash gracefully

> Mars Pathfinder = 엔지니어가 — 디버그 코드 — 일부를 — 의도적으로 — 남김. Pathfinder 착륙 후 — 오류 발생. 남긴 디버그 도움으로 — JPL 엔지니어 = 문제 진단, 수정 코드 — Pathfinder에 — 업로드 → **Pathfinder가 — 미션 완료** (March 1999).

### Log errors for your technical support personnel

assertion이 — production 코드에 — halt시키지 X도록 — 동작 변경. 메시지를 — 파일에 — 로그.

### See that the error messages you leave in are friendly

McConnell 초기 프로그램 — 사용자 보고 — *"You've got a bad pointer allocation, Dog Breath!"* 메시지. 다행히 — 유머 감각. **"내부 오류"** + email/전화 = 일반적·효과적.

## §8.8 Being Defensive About Defensive Programming

> *"Too much of anything is bad, but too much whiskey is just enough."* — Mark Twain

방어 — 너무 — 많으면 — 문제. **모든 가능한 — 방식·자리에서 — 매개변수 — 검사** → 프로그램 = fat + slow. 게다가 — 방어 코드 자체도 — 결함 — 가능. casually 작성된 — 방어 코드 = 다른 코드처럼 — 결함 — 발견 가능.

**어디에 — 방어할지 — 생각**, 우선순위 — 설정.

## Key Points (§)

McConnell 원문 5:

1. Production 코드는 — **"garbage in, garbage out"보다 — 더 — 정교한 방식**으로 — 에러 처리.
2. 방어적 — 기법 = 에러 발견·수정 — 쉽게, production 손상 — 적게.
3. **Assertion** = 큰 시스템·고신뢰·빠르게 — 변하는 코드베이스에서 — 조기 — 검출.
4. **나쁜 입력 처리 결정** = key error-handling + high-level — 설계 결정.
5. **Exception** = 정상 흐름과 — 다른 — 차원의 처리. 조심히 — 사용 시 — toolkit에 — 가치.
6. Production 제약 = development 버전에 — 반드시 — 적용 X. **그 이점을 — 활용** — 개발 버전에 — 오류 — 빠르게 — 비우는 — 코드 추가.

## 정리

- §8.1 — Garbage in, **nothing out**. 외부 데이터 + 매개변수 — 모두 검증.
- §8.2 — Assertion = 절대 일어나면 안 됨. Design by contract (Meyer 1997). 고신뢰 = assert + error handling 둘 다.
- §8.3 — 10 에러 처리 옵션. **Robustness vs Correctness** = safety critical = correctness, consumer = robustness.
- §8.4 — Exception = 무시할 수 없는 — 신호. 추상 수준 일관. empty catch 금지.
- §8.5 — Barricade = 손상 격리. 안전 영역 안 = assertion, 밖 = error handling.
- §8.6 — Offensive programming. 개발에서 — 강하게, production에서 — 부드럽게.
- §8.7 — Mars Pathfinder. 중요 검사 = 남김, trivial = 제거. 친근한 메시지.
- §8.8 — Mark Twain. 너무 많은 방어 = fat + slow.

## 관련 항목

- [Ch 7: High-Quality Routines](/blog/programming/engineering/code-complete/ch07-High-Quality-Routines)
- [Ch 9: The Pseudocode Programming Process](/blog/programming/engineering/code-complete/ch09-The-Pseudocode-Programming-Process)
- [Clean Code Ch 7: 에러 처리](/blog/programming/engineering/clean-code/chapter07-error-handling)
- [Effective C++ Ch 8: C++의 예외에 익숙해져라](/blog/programming/cpp/effective-cpp/item01-view-cpp-as-a-federation-of-languages)
