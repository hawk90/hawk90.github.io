---
title: "Ch 4: 주석"
date: 2025-06-15T04:00:00
description: "주석은 필요악이다. 좋은 주석과 나쁜 주석을 구분하고, 가능하면 코드 자체로 의도를 표현하라."
tags: [CleanCode, Comments, Robert Martin]
series: "Clean Code"
seriesOrder: 4
---

## 이 챕터의 메시지

Martin은 주석에 대해 분명한 입장을 가진다.

> **주석은 실패다.**

코드만으로 의도를 표현하지 못해서 주석을 다는 것이다. 그래서 주석을 칭찬하지 말고 **이름을 고치고, 함수를 쪼개고, 변수를 추출**하는 것을 먼저 고민해야 한다.

그렇다고 모든 주석이 나쁘진 않다. 정당한 주석도 분명히 있다. 이 챕터는 **좋은 주석과 나쁜 주석**을 구분하고, 나쁜 주석의 패턴을 보여준다.

## 핵심 내용

- 주석은 **실패**다. 코드로 표현할 수 없을 때만 어쩔 수 없이 쓴다.
- **오래된 주석은 거짓말**이다. 코드는 바뀌어도 주석은 따라가지 않는다.
- 좋은 주석: 법적, 정보 제공, 의도 설명, 결과 경고, TODO, API 공개 문서.
- 나쁜 주석: 중얼거림, 중복, 오해의 여지, 의무적, 일지, 잡음, HTML, 함수 끝 표시.
- **주석 대신 함수/변수 추출**이 거의 항상 더 좋다.

## 주석은 실패다

> 주석은 우리가 코드로 의도를 표현하는 데 실패했음을 의미한다.

코드를 읽고 무슨 일을 하는지 알 수 있다면 — 주석은 필요 없다. 주석이 필요하다는 건 코드의 이름이 부족하거나, 함수가 너무 크거나, 추상화가 부적절하다는 신호다.

```java
// 직원이 모든 혜택을 받을 자격이 있는지 검사
if ((employee.flags & HOURLY_FLAG) && (employee.age > 65))
```

위 주석은 코드의 의도를 보충한다. 그런데 코드 자체를 고치면 주석이 불필요해진다.

```java
if (employee.isEligibleForFullBenefits())
```

이름 하나가 주석 한 줄을 대체한다. 그리고 **이름은 코드와 함께 변한다**. 주석은 그렇지 않다.

## 주석은 코드를 보완하지 않는다 — 코드를 메운다

오래된 코드일수록 주석은 코드와 어긋난다. 코드는 누군가 수정하지만, 주석은 보통 그대로 남는다. 결국 주석은 **거짓말**이 된다.

```java
/**
 * Returns the default port. Default is 8080.
 */
public int getPort() {
    return port;   // 누군가 9090으로 바꿈 — 주석은 그대로
}
```

이런 주석을 발견할 때 결정해야 한다 — 주석을 갱신할 것인가, 삭제할 것인가. **거짓말하는 주석보다 없는 게 낫다**.

## 좋은 주석

모든 주석이 나쁘진 않다. 정당한 주석의 패턴들이다.

### 법적 주석

저작권, 라이선스 같은 법적 요구는 어쩔 수 없다.

```java
// Copyright (C) 2024 by Hawk Yoon. All rights reserved.
// Released under the MIT License.
```

### 정보 제공

코드만으로 명확하지 않은 정보 — 정규식의 의미, 단위, 포맷.

```java
// kk:mm:ss EEE, MMM dd, yyyy 포맷 — Java SimpleDateFormat
Pattern timeMatcher = Pattern.compile("\\d*:\\d*:\\d* \\w*, \\w* \\d*, \\d*");
```

### 의도 설명

코드가 **무엇을** 하는지가 아니라 **왜** 그렇게 하는지를 설명한다.

```java
// 큰 합계를 더해 보고 두 스레드가 경합하는지 확인하는 시도
for (int i = 0; i < 25000; i++) {
    WidgetBuilderThread builderThread = new WidgetBuilderThread(...);
    Thread thread = new Thread(builderThread);
    thread.start();
}
```

이건 코드가 어떻게 동작하는지가 아니라 **왜 이 코드를 짰는지**다. 코드 자체로는 표현하기 어렵다.

### 의미를 명확히

API 사용자가 외부 라이브러리를 바꿀 수 없을 때, 라이브러리 함수의 인자에 의미를 적는다.

```java
assertTrue(a.compareTo(b) == 0);     // a == b
assertTrue(a.compareTo(b) != 0);     // a != b
assertTrue(ab.compareTo(ab) == 0);   // ab == ab
```

`compareTo`의 반환값이 무엇을 의미하는지를 옆에 적어 둔다.

### 결과 경고

```java
// 시간이 오래 걸린다. 의도적으로 호출하지 마라.
public void _testWithReallyBigFile() {
    writeLinesToFile(10000000);
    response.setBody(testFile);
    // ...
}
```

```java
// SimpleDateFormat은 thread-safe하지 않다 — 각 스레드별로 인스턴스를 만들어라
SimpleDateFormat df = new SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss z");
```

### TODO

```java
// TODO: 이 함수는 더 이상 필요 없다. 다음 릴리스에서 제거.
protected VersionInfo makeVersion() {
    return null;
}
```

TODO는 작업 목록이다. IDE가 모아 볼 수 있게 표준 키워드를 쓴다. 단 — 정기적으로 청소해야 한다. TODO가 코드의 묘비가 되면 의미가 사라진다.

### 공개 API의 Javadoc

라이브러리 사용자를 위한 공개 API는 문서가 필수다.

```java
/**
 * 주어진 이메일 주소로 비밀번호 재설정 링크를 보낸다.
 *
 * @param email 사용자의 이메일 주소 (반드시 유효한 RFC 5322 형식)
 * @return 발송된 토큰의 만료 시각
 * @throws InvalidEmailException email이 형식에 맞지 않으면
 */
public Instant sendPasswordReset(String email) { ... }
```

코드 자체로는 표현할 수 없는 사양·계약을 적는다. 외부 사용자가 IDE 자동완성 툴팁으로 본다.

## 나쁜 주석

흔한 나쁜 주석 패턴들이다.

### 중얼거림

```java
public void loadProperties() {
    try {
        // ...
    } catch (IOException e) {
        // 누군가 속성 파일이 없으면 — 그래도 괜찮음. 기본 속성으로 진행
    }
}
```

이게 무슨 뜻인가? 작성자만 안다. 다음 사람이 이 주석을 읽고 이해하려면 — 코드를 다 따라가야 한다. 차라리 주석을 없애고 의도가 드러나는 이름과 구조로 표현하는 게 낫다.

### 중복 주석

```java
// 이 메서드는 호출자가 이 컴포넌트에 등록되었는지 확인한다.
if (this.registrationStatus.isRegistered(caller)) ...
```

코드 자체가 이미 같은 말을 한다. 주석은 노이즈다.

### 오해의 여지

```java
// 다음 작업이 끝날 때까지 기다린다
if (other.compareTo(this) == 0)
    return true;
```

`compareTo`는 "기다린다"가 아니다. 주석이 거짓말을 한다.

### 의무적 주석 — 모든 함수마다 Javadoc

```java
/**
 *
 * @param title 어쩌고
 * @param author 어쩌고
 * @param tracks 어쩌고
 */
public void addCD(String title, String author, int tracks) { ... }
```

내용이 없는 형식적 주석은 시간 낭비다. IDE가 자동으로 비어 있는 Javadoc 템플릿을 생성하면 — 채우지 말고 지워라.

### 일지 같은 주석

```java
// 변경 이력:
// 11-Oct-2001: 최초 작성
// 05-Nov-2001: 큰 메서드 추출
// 10-Jan-2002: 변환 잡음 처리
// 18-Feb-2002: 변수 이름 수정 ...
```

이건 git의 일이다. 코드에 들어갈 자리가 아니다.

### 잡음

```java
/** Default constructor. */
public CD() { ... }

/** The day. */
private int day;

/** The month. */
private int month;
```

아무 정보가 없는 주석은 그냥 잡음이다. 화면 공간만 차지한다.

### 닫는 괄호 주석

```java
public void closeBracketComment() {
    while ((line = in.readLine()) != null) {
        // ...
    } // while
} // closeBracketComment
```

함수가 너무 커서 끝을 표시하고 싶다면 — **함수를 쪼개라**. 주석이 답이 아니다.

### 주석으로 비활성화한 코드

```java
// InputStreamResponse response = new InputStreamResponse();
// response.setBody(formatter.getResultStream(), formatter.getByteCount());
```

다음 사람은 이 코드를 두려워한다. 지워야 하나? 살려야 하나? 의도가 뭐였나?

**그냥 지워라.** git이 기록을 보관한다. 정말 살려야 하면 git에서 꺼낸다. 주석으로 둔 코드는 시간이 갈수록 점점 더 위험한 묘비가 된다.

### HTML 주석

```java
/**
 * Task to run fit tests.
 * This task runs fitnesse tests and publishes the results.
 * <p/>
 * <pre>
 * Usage:
 * &lt;taskdef name=&quot;execute-fitnesse-tests&quot;
 * </pre>
 */
```

도구 출력용으로만 HTML을 적어라. IDE에서 직접 보는 주석엔 마크업이 노이즈다.

### 비-로컬 정보

주석은 **바로 옆 코드**에 대한 것이어야 한다. 전체 시스템에 대한 메타 정보를 함수 주석에 적지 마라.

```java
/**
 * 포트 기본값: 8080
 */
public void setFortressPort(int fortressPort) {
    this.fortressPort = fortressPort;
}
```

기본 포트는 이 함수의 책임이 아니다. 함수는 그저 setter다.

### 너무 많은 정보

```java
/**
 * RFC 2045 - Multipurpose Internet Mail Extensions (MIME)
 * Part One: Format of Internet Message Bodies
 * section 6.8.  Base64 Content-Transfer-Encoding
 * The encoding process represents 24-bit groups of input bits ...
 * (계속 50줄)
 */
```

흥미로운 역사 정보지만 — 이 코드를 읽는 사람에게 필요한 정보는 아니다.

## 주석 대신 — 코드를 고친다

주석을 적고 싶을 때 다음 단계를 먼저 시도한다.

1. **이름을 고친다** — 함수/변수 이름이 의도를 더 잘 표현하도록.
2. **함수를 추출**한다 — 복잡한 표현식을 의미 있는 이름의 함수로.
3. **변수를 추출**한다 — 중간 계산에 이름을 준다.
4. **타입을 만든다** — 원시 타입 대신 의미 있는 클래스/enum.

```java
// 주석으로 의도 보충
// 두 시점 사이의 일수 계산 (윤년 무시)
int days = (date2.getTime() - date1.getTime()) / (24 * 60 * 60 * 1000);

// 함수 추출 + 의미 있는 이름
int days = daysBetweenIgnoringLeapYears(date1, date2);
```

거의 모든 주석은 이 방법으로 코드로 변환할 수 있다. 그게 가능하면, 변환한다.

## 정리

- 주석은 **실패**다. 가능하면 코드로 표현한다.
- 오래된 주석은 **거짓말**이 되기 쉽다.
- 좋은 주석: 법적, 정보, 의도, 경고, TODO, 공개 API Javadoc.
- 나쁜 주석: 중얼거림, 중복, 거짓, 의무적, 일지, 잡음, 닫기 표시, 비활성화 코드.
- 주석을 적기 전에 — **이름 고치기, 함수 추출, 변수 추출**을 먼저 시도하라.

다음 챕터는 **포맷팅** — 코드의 시각적 구조도 의도 전달의 일부다.

## 관련 항목

- [Ch 2: 의미 있는 이름](/blog/programming/engineering/clean-code/chapter02-meaningful-names) — 주석을 없애는 첫 도구
- [Ch 3: 함수](/blog/programming/engineering/clean-code/chapter03-functions) — 함수가 작아지면 주석이 줄어든다
- [Ch 5: 포맷팅](/blog/programming/engineering/clean-code/chapter05-formatting) — 다음 챕터
