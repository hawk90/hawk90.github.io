---
title: "Ch 5: 포맷팅"
date: 2026-05-11T05:00:00
description: "포맷은 코드를 통해 의도를 전달하는 시각적 구조. 신문 기사 비유, 수직·수평 거리, 팀 규칙."
tags: [CleanCode, Formatting, Robert Martin]
series: "Clean Code"
seriesOrder: 5
draft: true
---

## 이 챕터의 메시지

코드의 포맷은 단순한 미감 문제가 아니다. 그것은 **코드의 의도가 다음 사람에게 전달되는 시각적 채널**이다. 잘 포맷된 코드는 첫눈에 구조가 보이고, 못 포맷된 코드는 읽기 전부터 부담을 준다.

Martin은 이 챕터에서 두 가지를 주장한다.

- **포맷은 의사소통이다** — 동작과 무관하지만 가독성에 결정적이다.
- **팀 규칙이 개인 취향보다 우선**한다 — 일관성이 가독성의 핵심이다.

## 핵심 내용

- 포맷은 **의사소통**이다 — 미감 아니라 의도 전달.
- 파일은 **신문 기사**처럼 — 위에서 아래로 추상이 내려간다.
- **수직 거리**: 관련 개념은 가까이, 무관한 개념은 멀리.
- **수평 거리**: 가로 스크롤 금지. 120자 안에.
- 팀 컨벤션은 **개인 취향보다 우선**한다.

## 포맷의 목적

먼저 큰 그림. 코드를 짤 때 우리는 두 가지 시간을 보낸다.

- **새 코드를 쓰는** 시간 (1)
- **기존 코드를 읽는** 시간 (10)

비율이 1:10이다. 그러므로 포맷이 향상시켜야 하는 것은 **읽는 시간**이지 쓰는 시간이 아니다.

기능이 옳은 것은 기본이다. 그러나 **시간이 지나 사라지는 것은 기능이 아니라 코드의 가독성**이다. 처음 짠 기능은 머지 안 되거나, 다른 기능으로 대체된다. 그러나 **코딩 스타일은 남는다**. 새 기능을 짤 때도, 버그를 잡을 때도, 다음 사람이 코드를 이해할 때도 — 그 스타일이 계속 영향을 준다.

> 코드의 포맷은 그 자체로 **장기적 자산**이다.

## 수직 포맷 — 신문 기사 비유

좋은 신문 기사는 어떻게 쓰여 있는가?

- 헤드라인이 짧고 의미 있다 — 한 줄로 무슨 기사인지 안다.
- 첫 문단이 요약이다 — 더 보고 싶으면 계속.
- 아래로 내려갈수록 세부가 늘어난다.

**소스 파일도 신문 기사처럼** 작성한다.

- 파일 위쪽: 가장 고수준 함수, 고수준 개념.
- 아래쪽으로 내려가면서: 점점 디테일.
- 가장 아래: 가장 저수준 헬퍼.

이게 [Ch 3](/blog/programming/engineering/clean-code/chapter03-functions)의 **내려가기 규칙**의 파일 단위 적용이다.

### 적정 파일 길이

Martin이 살펴본 대형 프로젝트들의 평균 파일 길이는 **200줄 안팎**이다.

- FitNesse: 평균 65줄, 최대 500줄.
- JUnit, Time and Money: 평균 25~32줄, 최대 100줄.
- Tomcat, Ant: 평균 175~225줄, 최대 1700줄+.

큰 파일이 무조건 나쁘진 않지만, **작은 파일이 거의 항상 더 잘 짜여 있다**. 200~500줄은 사람이 한 번에 머리에 담을 수 있는 범위다.

### 수직 거리 — 가까이/멀리

연관 개념은 **수직으로 가까이**, 무관한 개념은 **수직으로 멀리** 둔다.

#### 수직 공백 — 단락 구분

```java
package fitnesse.wikitext.widgets;

import java.util.regex.*;

public class BoldWidget extends ParentWidget {
    public static final String REGEXP = "'''.+?'''";
    private static final Pattern pattern = Pattern.compile("'''(.+?)'''",
        Pattern.MULTILINE + Pattern.DOTALL);

    public BoldWidget(ParentWidget parent, String text) throws Exception {
        super(parent);
        Matcher match = pattern.matcher(text);
        match.find();
        addChildWidgets(match.group(1));
    }

    public String render() throws Exception {
        StringBuffer html = new StringBuffer("<b>");
        html.append(childHtml()).append("</b>");
        return html.toString();
    }
}
```

빈 줄이 단락을 나눈다. 각 단락은 한 개념·한 책임의 단위다. 빈 줄이 없으면 코드가 한 덩어리로 뭉쳐 보인다.

#### 수직 밀집도 — 함께 가까이

같은 개념을 표현하는 변수, 같이 동작하는 함수들은 **공백 없이 붙여** 둔다.

```java
public class ReporterConfig {
    private String m_className;
    private List<Property> m_properties = new ArrayList<Property>();

    public void addProperty(Property property) {
        m_properties.add(property);
    }
}
```

`m_className`과 `m_properties`는 같은 클래스의 두 멤버다. 사이에 빈 줄을 두지 않는다.

#### 수직 거리 — 가까이 정의

함수 A가 함수 B를 호출한다면, B는 A 바로 아래(또는 가까운 곳)에 둔다. 호출자가 호출당하는 함수로 시선을 자연스럽게 따라간다.

```java
public void render() {
    setHeader();
    renderBody();
    setFooter();
}

private void setHeader() { /* ... */ }

private void renderBody() { /* ... */ }

private void setFooter() { /* ... */ }
```

호출 순서와 정의 순서가 같다.

#### 수직 순서 — 의존성의 방향

호출자가 호출당하는 함수 **위**에, 사용하는 함수가 사용되는 함수 **위**에 위치한다. 이게 신문 기사식 흐름이다.

```java
public class Widget {
    public void process() {
        loadData();
        transform();
        save();
    }

    private void loadData() { /* ... */ }

    private void transform() {
        normalize();
        validate();
    }

    private void save() { /* ... */ }

    private void normalize() { /* ... */ }

    private void validate() { /* ... */ }
}
```

위쪽일수록 고수준, 아래로 갈수록 저수준.

## 수평 포맷

한 줄의 폭은 얼마나 가능한가?

> Martin의 조사: 대부분 줄은 **20~60자**. 80자를 넘는 줄은 흔치 않다.

현대 컨벤션은 보통 **100~120자**다. 80자 제한은 너무 빡빡하고, 그 이상은 IDE를 분할 뷰로 쓸 때 불편하다. **가로 스크롤을 강요하는 줄은 절대 만들지 마라**.

### 수평 공백

연관 강도에 따라 공백을 둔다.

```java
private void measureLine(String line) {
    lineCount++;
    int lineSize = line.length();
    totalChars += lineSize;
    lineWidthHistogram.addLine(lineSize, lineCount);
    recordWidestLine(lineSize);
}
```

- 대입은 좌우에 공백 (`lineCount++` 대신 `lineCount ++`는 X).
- 함수 호출의 인자 사이 공백 (`f(a, b, c)`).
- 함수와 괄호 사이 공백 없음 (`measureLine(line)` 권장; `measureLine (line)` X).

연산자 우선순위에 따라 공백을 다르게 두는 패턴도 있다.

```java
b * b - 4 * a * c       // 우선순위 같음 — 모두 공백
b*b - 4*a*c             // 곱셈 우선 — 더 강하게 묶음
```

후자가 더 표현적이다. 다만 자동 포맷터가 이 의도를 보존하기 어려워 — 팀이 자동화를 쓴다면 일관된 한 가지만 따른다.

### 들여쓰기

들여쓰기는 **계층을 시각화**한다.

- 패키지 → 클래스 → 메서드 → 메서드 본문 → 블록 안 블록.

들여쓰기를 무시하면 — 위 계층이 한 평면이 된다. 사람의 인지가 폭주한다.

```java
public class CommentWidget extends TextWidget {
public static final String REGEXP = "^#[^\r\n]*(?:(?:\r\n)|\n|\r)?";
public CommentWidget(ParentWidget parent, String text){super(parent, text);}
public String render() throws Exception {return ""; }
}
```

읽을 수 있는가? 똑같은 코드를 들여쓰면 즉시 명확해진다.

```java
public class CommentWidget extends TextWidget {
    public static final String REGEXP = "^#[^\r\n]*(?:(?:\r\n)|\n|\r)?";

    public CommentWidget(ParentWidget parent, String text) {
        super(parent, text);
    }

    public String render() throws Exception {
        return "";
    }
}
```

### 들여쓰기 깊이 — 분할 신호

들여쓰기 깊이가 4단계를 넘는 함수는 거의 항상 **분할이 필요**하다. 깊은 중첩은 함수가 너무 많은 일을 한다는 신호다 ([Ch 3 참고](/blog/programming/engineering/clean-code/chapter03-functions)).

## 팀 규칙

지금까지의 모든 규칙은 **저자의 권장사항**이다. 팀의 컨벤션이 다르면 — **팀을 따른다**.

> 일관된 형식이 개인의 취향보다 중요하다.

같은 코드베이스 안의 파일이 서로 다른 스타일이면, 읽는 사람의 인지가 매번 흔들린다. 한 가지로 통일된 스타일은 가독성에 결정적이다.

### 자동화

스타일은 **사람이 매번 결정하지 않는다**. 자동화한다.

- Java: Google Java Format, Checkstyle.
- C++: clang-format.
- Python: black, ruff format.
- JavaScript/TypeScript: prettier, eslint.

CI에서 자동 포맷팅을 강제하면 — 스타일에 관한 코드 리뷰 시간이 0이 된다. 진짜 검토할 것에만 집중할 수 있다.

## 객체 멤버 순서

자바 컨벤션의 한 예시 — 멤버 순서는 보통 다음을 따른다.

1. public static 상수
2. private static 변수
3. private 인스턴스 변수
4. (public 인스턴스 변수가 있다면 그것 — 권장하진 않음)
5. public 생성자
6. public 메서드 (고수준 → 저수준)
7. private 헬퍼

이 순서가 신문 기사식 내려가기와 일치한다.

## 정리

- 포맷은 **의사소통**이다. 미감이 아니라 의도 전달.
- 파일은 **신문 기사** — 위에서 아래로 추상이 내려간다.
- **수직 거리**: 가까운 개념은 가까이, 먼 개념은 멀리.
- **수평 거리**: 100~120자 안에. 가로 스크롤 금지.
- **팀 규칙**이 개인 취향보다 우선. 자동 포맷터로 강제.
- 들여쓰기 4단계 이상이면 **함수 분할 신호**.

다음 챕터는 **객체와 자료구조** — 데이터를 노출할 것인가 감출 것인가.

## 관련 항목

- [Ch 3: 함수](/blog/programming/engineering/clean-code/chapter03-functions) — 작은 함수와 내려가기 규칙
- [Ch 6: 객체와 자료구조](/blog/programming/engineering/clean-code/chapter06-objects-and-data-structures) — 다음 챕터
