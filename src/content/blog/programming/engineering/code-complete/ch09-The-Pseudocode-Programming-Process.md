---
title: "Chapter 9: The Pseudocode Programming Process"
date: 2025-06-20T09:00:00
description: "PPP — 의도 수준의 의사 코드 → 주석 → 코드. ReportErrorMessage 예제, 5 이점, HARD DATA 95%."
series: "Code Complete"
seriesOrder: 9
tags: [code-complete, pseudocode, PPP, McConnell]
draft: true
---

## 이 챕터의 메시지

> 이 책 — 전체가 — 클래스·루틴 — 생성 — 프로세스의 — 확장 설명이지만, 이 챕터는 — 그 단계들을 — **맥락에 넣는다**. 작은 프로그래밍 — 즉, **개별 클래스와 루틴 — 구축의 — 구체적 단계**에 — 집중.

PPP = **Pseudocode Programming Process** = McConnell이 — 권장하는 — 루틴 — 작성의 — 체계적 — 흐름. 설계·문서화 작업을 — 줄이고 — 둘 다의 — 품질을 — 향상.

## 핵심 내용

- 클래스 만들기 = **iterative**. 일반 설계 → 루틴 구축 → 클래스 검토.
- 루틴 만들기 = **Design → Check → Code → Review** 사이클.
- 의사 코드 = **intent 수준** — programming-language 구문 X.
- 5 이점 — review 쉬움, iterative refinement, 변경 쉬움, comment 노력 최소, 유지보수 쉬움.
- HARD DATA — **95% 오류 = 자신의 코드** (Ostrand, Weyuker 1984). 컴파일러·OS·하드웨어 = 5%만.
- **KEY POINT** — *"A working routine isn't enough. If you don't know why it works, study it..."*
- 대안 = test-first, design by contract, hacking.

## §9.1 Summary of Steps in Building Classes and Routines

클래스 구축 = **iterative 프로세스** — 일반 설계 → 클래스 내 — 루틴 열거 → 구체적 — 루틴 구축 → 전체 검토.

### Steps in Creating a Class

1. **Create a general design for the class** — 책임, "비밀", 추상, 상속 여부, key public 메서드, non-trivial 데이터. 충분히 — iterate.
2. **Construct each routine within the class** — 보조 루틴의 — 필요가 — 떠오름. 자주 — 클래스 전체 설계로 — **ripple back**.
3. **Review and test the class as a whole** — 각 루틴은 — 만들 때 — 테스트. 클래스 전체가 — 가동 후 — 개별 루틴 — 수준에서 — 테스트 — 불가한 — 사항들 — 검토.

### Steps in Building a Routine

루틴 = 단순 — accessor·pass-through 등이 — 다수. 그러나 — 복잡한 루틴 = **체계적 — 접근**이 — 이익.

4 활동 (Figure 9-2):

1. **Design the routine**
2. **Check the design** (반복)
3. **Code the routine**
4. **Review and test the code**

McConnell의 — 선호 = **PPP** = 다음 섹션.

## §9.2 Pseudocode for Pros

Pseudocode = 알고리즘·루틴·클래스·프로그램의 — 동작을 — 묘사하는 — **비공식 — English-like 표기**. PPP는 — **구체적 접근** = pseudocode를 — 사용해 — 루틴 내 코드 생성을 — 간소화.

### Guidelines (4)

- **English-like 문장** — 구체적 연산을 — 정확히 — 묘사.
- **target 언어의 — 구문 요소 — 회피** — pseudocode = 코드보다 — 약간 — 높은 — 수준에서 — 설계 가능. 언어 구성 — 사용 시 — 더 낮은 수준으로 — 가라앉음, 높은 수준의 — 주된 이익 X.
- **intent 수준에서 작성** — 접근의 — **의미**를 — 묘사. target 언어에서 — **어떻게** — 구현될지 X.
- **충분히 — 낮은 — 수준** — 코드 생성이 — 거의 — 자동. 너무 — 높으면 — 문제성 — 디테일을 — 미끄러뜨림.

### Bad vs Good Pseudocode

#### Bad (CODING HORROR)

```
increment resource number by 1
allocate a dlg struct using malloc
if malloc() returns NULL then return 1
invoke OSrsrc_init to initialize a resource for the operating system
*hRsrcPtr = resource number
return 0
```

문제 = `*hRsrcPtr`, `malloc()` — 구체적 — C 구문. **어떻게 — 작성될지**에 — 집중, 설계의 **의미**가 X. 1/0 반환 — 코딩 디테일.

#### Good

```
Keep track of current number of resources in use
If another resource is available
    Allocate a dialog box structure
    If a dialog box structure could be allocated
        Note that one more resource is in use
        Initialize the resource
        Store the resource number at the location provided by the caller
    Endif
Endif
Return TRUE if a new resource was created; else return FALSE
```

순수 — English. 언어 — 선택 — 제약 X. **Intent 수준**.

### 5 Benefits

- **Review — 쉬움** — 소스 코드 검사 — 없이 — 상세 설계 — 검토. 35줄 C++/Java보다 — 11줄 pseudocode를 — 검토할 — 의지가 — 높음.
- **Iterative refinement 지원** — 고수준 설계 → pseudocode → 소스 코드. 작은 — 단계로 — 정제. **고수준 오류 = 고수준에서, 저수준 오류 = 저수준에서** — 잡힘.
- **변경 — 쉬움** — pseudocode 몇 줄 = 한 페이지 코드보다 — 변경 쉬움. **least-value stage**에서 — 오류 — 잡기 (Grove 1983).
- **Comment 노력 — 최소** — 보통: 코드 작성 후 → 주석 추가. PPP = pseudocode 문장이 — **그 자체로** — 주석. 제거가 — 더 — 노력.
- **유지보수 — 쉬움** — 다른 — 설계 문서 = 코드와 — 분리, 변경 시 — 어긋남. PPP = pseudocode가 — 코드 내 — 주석. 인라인 주석만 — 유지하면 — 설계 문서화 — 정확.

> **KEY POINT** — 한 설문 — 프로그래머들이 — pseudocode 선호: construction — 쉬움, 충분히 — 상세하지 않은 — 설계 — 검출, 문서화·변경의 — 용이성 (Ramsey, Atwood, Van Doren 1983).

## §9.3 Constructing Routines Using the PPP

McConnell의 — **running example** = `ReportErrorMessage()`. 비공식 사양:

> `ReportErrorMessage()`는 — error code를 — 입력으로 — 받고, 해당 메시지를 — 출력. 잘못된 코드 — 처리. 대화형 모드면 — 사용자에게 — 메시지 표시. 명령줄 모드면 — 메시지 파일에 — 로그. 출력 후 — 성공/실패 — status 값 — 반환.

### Design the Routine

#### Check the prerequisites

루틴 자체 작업 전 — **선행 조건**이 — 충족됐는지. 루틴이 — 잘 정의 + 전체 설계와 — 깔끔하게 — 맞는지. 프로젝트 요구사항이 — 실제 — 호출하는지.

#### Define the problem

루틴이 — 해결할 — 문제 — 진술. 고수준 — 설계가 — 충분히 — 상세하면 — 거의 — 다 됨. **최소** — 명시:

- 루틴이 — 숨길 정보.
- 입력.
- 출력.
- 호출 전 — 보장되는 — **Preconditions** (입력 범위, 스트림 초기화, 파일 open/close, 버퍼 fill/flush 등).
- 호출자에 — 제어 반환 전 — 보장되는 — **Postconditions** (출력 범위, 스트림 초기화, 파일 open/close, 버퍼 fill/flush 등).

`ReportErrorMessage()` 예시:

- **숨김**: 메시지 텍스트, 현재 처리 방법(대화형 / 명령줄).
- **Preconditions**: 보장 X.
- **입력**: error code.
- **출력**: 메시지 + status.
- **보장**: status가 — Success 또는 Failure.

#### Name the routine

> 좋은 이름 = 우수 — 프로그램의 — 한 — 신호. 만들기 — 쉽지 X. 문제 = 보통 — 루틴 — 목적이 — 명확 X 신호. Wishy-washy 이름 = **campaign trail의 politician** — 무언가 — 말하는 — 듯하나 — 자세히 — 보면 — 의미 — 알 수 X.

`ReportErrorMessage()` = 모호 X. 좋은 이름.

#### Decide how to test the routine

작성 중에 — 테스트 — 어떻게 할지. unit testing + 독립 — 테스터를 — 위해. 단순 입력 → 모든 — 유효 + 다양한 — 무효 — error code 테스트.

#### Think about error handling

루틴 내 — 잘못될 수 — 있는 — 모든 것. 나쁜 입력값, 다른 루틴 — 반환의 — 무효값 등.

아키텍처가 — 에러 처리 — 전략 — 정의했으면 — 따르기. 아니면 — 의식적으로 — 선택.

#### Think about efficiency

대다수 — 시스템 = 효율 critical X. → **인터페이스 — 잘 추상화, 코드 가독성**만 — 챙기면 — 나중에 — 개선 가능. 캡슐화 — 좋으면 — 느린 구현을 — 더 좋은 — 알고리즘 / 빠른 — 저수준 — 구현으로 — 교체 — 다른 — 루틴 — 영향 X.

소수 — 시스템 = 성능 critical. 아키텍처가 — 루틴별 — 리소스·속도 — 예산 — 명시. 그 — 한도 — 맞춰 — 설계.

> **개별 루틴 수준 — 효율 작업은 — 노력 낭비**. 큰 최적화 = 고수준 설계 — 정제에서. 마이크로-최적화 = 전체 — 프로그램 — 완료 후 — 필요 — 확인 시.

#### Research functionality available in the standard libraries

> 코드 품질·생산성 — **최고 — 개선 — 방법 = 좋은 — 코드 — 재사용**. 복잡한 — 루틴 — 설계 시 — 일부/전부가 — 환경/도구의 — 라이브러리에 — 이미 — 있을 수 — 있음. **누군가가 — Ph.D. 논문 — 쓴 — 알고리즘을 — 재발명하기 전에** — 몇 분 — 살펴봐.

#### Research the algorithms and data types

라이브러리에 — 없으면 — 알고리즘 책에. 처음부터 — 복잡 코드 — 작성 전 — 확인.

#### Write the pseudocode

앞 — 단계 — 마치고 — 작성 — 시작. 목적 = 실제 — 작성 시 — 유용한 — **mental orientation** — 확립.

일반에서 — 구체로. **헤더 주석** = 가장 — 일반적 — 부분. 루틴 — 목적의 — 간결한 진술. 작성이 — 어려우면 — 루틴의 역할 — 더 — 이해 필요 — 경고 신호.

```
This routine outputs an error message based on an error code
supplied by the calling routine. The way it outputs the message
depends on the current processing state, which it retrieves
on its own. It returns a value indicating success or failure.
```

High-level pseudocode:

```
set the default status to "fail"
look up the message based on the error code

if the error code is valid
    if doing interactive processing, display the error message
    interactively and declare success

    if doing command line processing, log the error message to the
    command line and declare success

if the error code isn't valid, notify the user that an internal error
has been detected

return status information
```

**높은 수준** + **정확한 English**. 무엇을 — 해야 하는지.

#### Think about the data

데이터를 — 여러 — 시점에 — 설계 — 가능. 예시 = 데이터가 — 단순, 데이터 조작이 — 두드러진 부분 X → 안 함. 데이터 조작이 — 두드러지면 — 로직 — 설계 전 — **주요 데이터 — 생각**.

#### Check the pseudocode

작성 후 — 다른 — 사람에 — 설명하는 듯 — 검토. 11 — pseudocode 줄을 — 다른 사람에게 — 보여주는 게 — 어색해도 — **놀랄** 것. Pseudocode는 — 가정·고수준 — 실수가 — 코드보다 — 더 — 명백.

> Pseudocode 수준에서 — 개념적으로 — 이해 X → 프로그래밍 언어 — 수준에서 — 이해할 — 가능성? 이해 X → **누가 — 이해할 — 것인가?**

#### Try a few ideas in pseudocode, and keep the best (iterate)

코딩 시작 전 — pseudocode에서 — 가능한 — 많은 — 아이디어. **코딩 시작 후** — 코드에 — 감정적으로 — 묶임 → 나쁜 — 설계 — 버리기 — 어려워짐.

pseudocode가 — 충분히 — 단순해질 때까지 — iterate. 각 — pseudocode 줄 — 아래에 — 코드 — 채울 수 — 있을 때까지 — 정제·분해.

### Code the Routine

설계 후 — **construction**. 단계 (Figure 9-3) — 거의 — 표준 순서. 자유롭게 — 변경.

#### Write the routine declaration

언어의 — function/method 선언. 원래 — 헤더 주석을 — 언어 — 주석으로. pseudocode 위에 — 둠.

```cpp
/* This routine outputs an error message based on an error code
supplied by the calling routine. The way it outputs the message
depends on the current processing state, which it retrieves
on its own. It returns a value indicating success or failure.
*/

Status ReportErrorMessage(
    ErrorCode errorToReport
)
set the default status to "fail"
look up the message based on the error code
...
```

인터페이스 — 가정 — 메모 — 좋은 시점. 예시 = `error` 변수가 — 직관적, 타입 — 명확 → 문서화 X.

#### Turn the pseudocode into high-level comments

첫·마지막 명령(C++ `{` / `}`) — 작성. pseudocode를 — 주석으로:

```cpp
/* This routine outputs an error message ... */

Status ReportErrorMessage(
    ErrorCode errorToReport
) {
    // set the default status to "fail"
    // look up the message based on the error code
    // if the error code is valid
        // if doing interactive processing, display the error message
        // interactively and declare success

        // if doing command line processing, log the error message to the
        // command line and declare success

    // if the error code isn't valid, notify the user that an
    // internal error has been detected

    // return status information
}
```

이 — 시점에 — 루틴의 — 성격이 — 명백. 설계 작업 — 완료, 코드 — 없이도 — 작동 방식 — 감지 가능. pseudocode → 코드 — 변환이 — 기계적·자연·쉽다고 — **느껴져야** 함.

#### Fill in the code below each comment

각 — pseudocode 주석 — 아래에 — 실제 코드. **term paper** — 작성과 — 비슷. 먼저 — outline, 각 — 포인트마다 — paragraph. 각 — pseudocode 주석 = 코드 — 블록/문단을 — 묘사.

처음 — 두 — pseudocode 주석 → 두 — 코드 줄:

```cpp
Status ReportErrorMessage(
    ErrorCode errorToReport
) {
    // set the default status to "fail"
    Status errorMessageStatus = Status_Failure;

    // look up the message based on the error code
    Message errorMessage = LookupErrorMessage(errorToReport);

    ...
}
```

각 — 주석은 — 보통 — **2~10 줄** — 코드로 — 확장. 데이터 — 선언은 — 처음 — 사용 — 시점 — 가까이.

완성된 — 루틴 (PDF):

```cpp
/* This routine outputs an error message ... */

Status ReportErrorMessage(
    ErrorCode errorToReport
) {
    // set the default status to "fail"
    Status errorMessageStatus = Status_Failure;

    // look up the message based on the error code
    Message errorMessage = LookupErrorMessage(errorToReport);

    // if the error code is valid
    if (errorMessage.ValidCode()) {
        // determine the processing method
        ProcessingMethod errorProcessingMethod = CurrentProcessingMethod();

        // if doing interactive processing, display the error message
        // interactively and declare success
        if (errorProcessingMethod == ProcessingMethod_Interactive) {
            DisplayInteractiveMessage(errorMessage.Text());
            errorMessageStatus = Status_Success;
        }
        // if doing command line processing, log the error message to the
        // command line and declare success
        else if (errorProcessingMethod == ProcessingMethod_CommandLine) {
            CommandLine messageLog;
            if (messageLog.Status() == CommandLineStatus_Ok) {
                messageLog.AddToMessageQueue(errorMessage.Text());
                messageLog.FlushMessageQueue();
                errorMessageStatus = Status_Success;
            }
            else {
                // can't do anything because the routine is already error processing
            }
        }
        else {
            // can't do anything because the routine is already error processing
        }
    }
    // if the error code isn't valid, notify the user that an
    // internal error has been detected
    else {
        DisplayInteractiveMessage(
            "Internal Error: Invalid error code in ReportErrorMessage()"
        );
    }

    // return status information
    return errorMessageStatus;
}
```

5-문장 사양 → 15 줄 pseudocode → **페이지 길이 루틴**. 사양이 — 상세해도 — 루틴 생성 = **상당한 — 설계 작업**. 그 — 저수준 — 설계가 — "코딩"이 — 사소하지 않은 — 이유.

#### Check whether code should be further factored

한 — pseudocode 줄 — 아래 — 코드가 — **폭발**. 2 — 선택:

- **새 루틴으로 — 분리** (PDF 예시 — `DisplayCommandLineMessage()`). 호출 — 작성. PPP를 — 그 — 새 루틴에 — 재귀적 적용.
- **PPP를 — 재귀적으로** — pseudocode 줄을 — 더 — 여러 줄로 — 분해. 각 — 새 줄 — 아래 — 코드 채움.

### Check the Code

> **KEY POINT** — 설계·구현 — 후 — 세 번째 — 큰 단계 = **올바른지 — 검사**. 이 — 단계에서 — 놓친 오류 = 나중 — 테스트에서야 — 발견. 거기서 — 발견·수정이 — 더 — 비쌈.

#### Mentally check the routine for errors

첫 — 공식 — 검사 = **mental**. 각 — 경로 — mentally 실행. 어려움 → **루틴을 — 작게 유지하는 — 이유 중 하나**.

- **Nominal 경로 + endpoints + 모든 — exception 조건**.
- 본인 — "desk checking".
- 동료 1+ "peer review" / "walkthrough" / "inspection".

> **HARD DATA** — 취미·전문 — 차이 = **미신**에서 — **이해**로의 — 이동. 미신 = 컴파일러/하드웨어가 — 오류 — 만들었다고 — 의심. 실제 — **약 5% 오류만이 — 하드웨어/컴파일러/OS — 오류** (Ostrand, Weyuker 1984). 이해 — 영역의 — 프로그래머는 — **항상 — 자신의 — 작업을 — 먼저 — 의심** — 95% 오류가 — 거기에 — 있다는 — 사실을 — 알기 때문.

> **KEY POINT** — Bottom line: 동작하는 — 루틴은 — **충분하지 X**. 왜 — 동작하는지 — 모르면 — 공부·논의·대안 설계 — 실험해 — 알 때까지.

#### Compile the routine

검토 후 — 컴파일. 비효율적으로 — 보일 수 — 있음 (수 페이지 — 전에 — 완성). 일찍 — 컴파일하면 — 미선언 — 변수, 명명 — 충돌 등 — 컴퓨터가 — 검사.

그러나 — **늦게 — 컴파일이 — 이익**. 첫 — 컴파일 후 — 내부 — stopwatch — 시작. "Just One More Compile" — 증후군 → 성급한, 오류 prone — 변경. **루틴이 — 옳다고 — 스스로 — 확신할 때까지 — 컴파일 X**.

- **컴파일러 경고 — 가장 — 까다로운 — 수준**. 미묘한 — 오류 — 많이 — 잡힘.
- **모든 — 컴파일러 오류·경고의 — 원인 — 제거**. 많은 — 경고 = 저품질 코드. 무시 → 다른 — 더 — 중요한 — 경고를 — 위장 또는 — Chinese water torture처럼 — 짜증. **근본 — 문제 — 재작성**이 — 보통 — 더 — 안전·덜 — 고통.

#### Step through the code in the debugger

컴파일 후 — 디버거 — 한 줄씩 — 실행. **각 — 줄이 — 예상대로 — 실행되는지 — 확인**. 많은 — 오류 — 잡힘.

#### Test the code

계획·생성한 — 테스트 케이스로. **scaffolding** — 필요할 수 — 있음 — 테스트 시 — 루틴을 — 지원하지만 — 최종 제품에 — 포함 X 코드.

#### Remove errors from the routine

오류 — 검출 → 제거. 이 — 시점에 — 버그가 — 많은 — 루틴은 — **계속 — 버그가 — 있을 가능성**. 비정상으로 — 버그가 — 많으면 — **처음부터 — 재작성**. 해킹 — 회피. 해킹 = 불완전 — 이해 — 신호 → 지금·나중 — 오류 — 보장.

### Clean Up Leftovers

- **인터페이스 검사** — 모든 — 입력·출력 — 데이터 — 처리, 모든 — 매개변수 — 사용.
- **일반 — 설계 품질** — 한 가지 — 잘 함, 느슨 — 결합, 방어적 — 설계.
- **데이터 검사** — 부정확 — 변수 이름, 미사용 데이터, 미선언 데이터.
- **명령·로직 검사** — off-by-one 오류, 무한 루프, 부적절 — 중첩.
- **레이아웃 검사** — 공백으로 — 논리 구조·표현식·매개변수 리스트 — 명확.
- **문서 검사** — pseudocode → 주석이 — 여전히 — 정확. 알고리즘 묘사, 인터페이스 가정, 비명확 — 의존성, 불명료 — 코딩 관행의 — 정당화.
- **중복 주석 제거** — 잘 명명된 — 루틴 — 호출 — 직전의 — 주석이 — 중복일 수 — 있음.

### Repeat Steps as Needed

품질이 — 나쁘면 — pseudocode로 — 후퇴. 고품질 — 프로그래밍 = **iterative 프로세스** — construction 활동 — 반복 — 망설임 X.

## §9.4 Alternatives to the PPP

PPP가 — 최고지만, 다른 — 접근:

### Test-first development

테스트 케이스를 — 코드 — 작성 — 전에. Kent Beck — *Test Driven Development* (Beck 2003).

### Design by contract

각 — 루틴이 — preconditions + postconditions를 — 가짐. §8.2 — assertion 부분에. Bertrand Meyer — *Object-Oriented Software Construction* (Meyer 1997).

### Hacking?

> 일부 — 프로그래머는 — PPP 같은 — 체계 — 대신 — 동작하는 코드로 — **해킹**. 루틴 — 코딩 중 — corner에 — 갇혀 — 처음부터 — 다시 — 시작 → **PPP가 — 더 — 잘 — 동작**한다는 — 신호. 코딩 중 — 사고 흐름 — 잃음 → **PPP가 — 유익**. 클래스/루틴의 — 일부 작성을 — **잊은** 적 있음? PPP 사용 시 — 거의 — 발생 X. 화면을 — 멍하니 — 보며 — **어디서 — 시작할지 — 모름** → **PPP가 — 프로그래밍 — 인생을 — 쉽게**.

## Key Points (§)

McConnell 원문 5:

1. 클래스·루틴 구축 = **iterative 프로세스**. 특정 루틴 — 구축 중 — 얻은 — 통찰은 — 클래스 — 설계로 — **ripple back**.
2. 좋은 pseudocode = **이해 가능 — English** + 단일 — 언어 — 특화 — 기능 — 회피 + **intent 수준** — 어떻게 X, **무엇을**.
3. **PPP = 상세 설계·코딩 — 도구**. pseudocode가 — 주석으로 — 직접 — 변환 → 주석이 — 정확·유용.
4. **첫 — 설계로 — 만족 X**. pseudocode에서 — 여러 — 접근 iterate, 코드 작성 전 — 최선 — 선택.
5. 각 — 단계 — 자신 — 검사 + 타인 — 검사 격려. **least expensive level** — 가장 — 적은 — 노력 — 투자 — 시점에서 — 실수 — 잡힘.

## 정리

- §9.1 — 클래스 = 3단계 iterative. 루틴 = 4활동 iterative.
- §9.2 — Pseudocode = intent 수준. 5 이점 (review/iterative/변경/comment/유지).
- §9.3 — `ReportErrorMessage()` 예제. Design → Code (declaration → comment → fill) → Check (HARD DATA 95% 자신, KEY POINT "why it works") → Clean → Repeat.
- §9.4 — Test-first (Beck 2003), Design by Contract (Meyer 1997), 또는 — Hacking 신호 4.

## 관련 항목

- [Ch 7: High-Quality Routines](/blog/programming/engineering/code-complete/ch07-High-Quality-Routines)
- [Ch 8: Defensive Programming](/blog/programming/engineering/code-complete/ch08-Defensive-Programming)
- [Ch 10: General Issues in Using Variables](/blog/programming/engineering/code-complete/ch10-General-Issues-in-Using-Variables)
- [Clean Code Ch 3: 함수](/blog/programming/engineering/clean-code/chapter03-functions)
- [Clean Code Ch 4: 주석](/blog/programming/engineering/clean-code/chapter04-comments)
