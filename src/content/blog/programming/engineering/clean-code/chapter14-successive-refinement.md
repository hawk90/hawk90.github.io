---
title: "Ch 14: 점진적 개선"
date: 2026-06-15T14:00:00
description: "Args 명령행 파서를 점진적으로 다듬는 사례 — 작동하게 → 깨끗하게. 매 단계마다 테스트가 유지된다."
tags: [CleanCode, Refactoring, Robert Martin]
series: "Clean Code"
seriesOrder: 14
---

## 이 챕터의 메시지

책의 후반 세 챕터(14, 15, 16)는 **리팩토링 사례 연구**다. 클린 코드 원칙을 실제 코드에 적용하는 과정을 보여 준다. 이 챕터는 첫 사례 — Martin이 작성한 명령행 파서 **Args**다.

> 원칙은 추상적이다. **현실 코드에 적용하는 과정**을 보면 원칙이 살아 움직인다.

이 챕터의 가장 큰 메시지는 — **클린 코드는 한 번에 짜지 못한다**는 점이다. 처음엔 작동하게 짜고, 테스트가 통과되면 다듬는다. 반복한다.

## 핵심 내용

- **처음부터 클린한 코드가 나오지 않는다**. 작동 → 다듬기.
- **테스트가 안전망** — 매 단계마다 동작이 보존됨을 보증.
- **점진적 리팩토링** — 한 번에 한 작은 변경, 매번 테스트 통과.
- 추상화는 **요구가 자라면서 등장**한다 — 처음부터 만들지 않는다.
- 좋은 코드는 **누적된 작은 다듬기**의 결과다.

## Args 명령행 파서

Martin의 예시는 명령행 인수를 파싱하는 작은 라이브러리다.

```java
public static void main(String[] args) {
    try {
        Args arg = new Args("l,p#,d*", args);
        boolean logging = arg.getBoolean('l');
        int port = arg.getInt('p');
        String directory = arg.getString('d');
        executeApplication(logging, port, directory);
    } catch (ArgsException e) {
        System.out.printf("Argument error: %s\n", e.errorMessage());
    }
}
```

스키마 `"l,p#,d*"`가 다음을 의미한다.

- `l` — boolean 플래그
- `p#` — int 인자
- `d*` — String 인자

사용자는 `myapp -l -p 8080 -d /tmp`로 호출한다.

## 첫 버전 — 작동하지만 더러운 코드

Martin은 책에 첫 버전 코드(약 300줄)를 그대로 적는다. 한 번 본 후 — **개선할 자리들**을 짚는다.

### 문제점들

- **클래스가 너무 크다** — 모든 책임이 `Args` 한 곳에.
- **메서드가 너무 길다** — 30~50줄 메서드들.
- **타입별 분기가 흩어져 있다** — boolean, int, String 처리가 클래스 곳곳에.
- **에러 처리가 섞여 있다** — try/catch가 본문 곳곳에.

이 코드는 동작은 한다. 그러나 다음 사람이 새 타입(예: `double`)을 추가하려면 — 여러 자리를 동시에 수정해야 한다.

## 리팩토링 단계

Martin은 작은 단계로 코드를 다듬는다. 각 단계 후 테스트가 통과되는지 확인한다.

### 단계 1: 타입별 처리를 분리

`int`, `boolean`, `String` 처리가 곳곳에 흩어져 있다. **각 타입마다 인터페이스를 구현하는 클래스**로 분리한다.

```java
public interface ArgumentMarshaler {
    void set(Iterator<String> currentArgument) throws ArgsException;
}

public class BooleanArgumentMarshaler implements ArgumentMarshaler {
    private boolean value = false;
    public void set(Iterator<String> currentArgument) {
        value = true;
    }
    public static boolean getValue(ArgumentMarshaler am) {
        return am instanceof BooleanArgumentMarshaler
            ? ((BooleanArgumentMarshaler)am).value : false;
    }
}

public class IntegerArgumentMarshaler implements ArgumentMarshaler { ... }
public class StringArgumentMarshaler  implements ArgumentMarshaler { ... }
```

이 단계 후 — 새 타입 추가는 새 클래스 하나만 만들면 된다. **OCP**(개방-폐쇄 원칙)가 시각화된다.

### 단계 2: 메서드 추출

긴 메서드들을 의미 단위로 잘라낸다. 각 추출이 작은 명사·동사 한 가지를 추상화한다.

```java
// Before — 30줄
public Args(String schema, String[] args) throws ArgsException {
    // 스키마 파싱 ...
    // 인자 파싱 ...
    // 검증 ...
}

// After — 흐름이 보임
public Args(String schema, String[] args) throws ArgsException {
    parseSchema(schema);
    parseArguments(args);
}
```

호출자는 생성자가 "스키마 파싱 + 인자 파싱"을 한다는 것을 한눈에 안다. 디테일은 호출당하는 함수에 위임.

### 단계 3: 에러 처리 분리

본문 곳곳의 try/catch와 에러 메시지를 — **전용 예외 클래스**로 분리.

```java
public class ArgsException extends Exception {
    public enum ErrorCode {
        OK, INVALID_ARGUMENT_FORMAT,
        UNEXPECTED_ARGUMENT, INVALID_ARGUMENT_NAME,
        MISSING_STRING, MISSING_INTEGER, INVALID_INTEGER,
        MISSING_DOUBLE, INVALID_DOUBLE
    }

    private ErrorCode code;
    private char arg;
    // ...
}
```

에러 정보가 한 자리에 모인다. 호출자는 `errorMessage()` 한 메서드로 의미 있는 메시지를 얻는다.

### 단계 4: 이름과 일관성

각 변수, 메서드, 클래스의 이름을 다시 본다. 의도가 더 잘 드러나도록 수정한다.

- `args` → `arguments`
- `M` → `marshalers`
- `getInt` → `Integer`(`Arg::getInt(...)` 정적 메서드 형태)

작은 차이지만 — 누적되면 가독성이 크게 다르다.

## 점진의 진짜 의미

Martin이 보여 주는 핵심은 — **각 변경이 매우 작다**는 점이다.

- 한 단계에 메서드 하나 추출.
- 다음 단계에 변수 하나 이름 바꾸기.
- 다음 단계에 매개변수 하나 추가.

**매 변경 후 테스트를 돌린다**. 통과하면 진행. 실패하면 즉시 원복.

이게 가능한 이유는 — **테스트가 충분히 빠르고 신뢰할 수 있기 때문**이다 ([Ch 9 F.I.R.S.T](/blog/programming/engineering/clean-code/chapter09-unit-tests)).

```
변경 → 테스트 → 통과 → 다음 변경
        실패  → 원복 → 다른 시도
```

이 사이클이 30초~1분 단위로 돈다. 큰 변경은 작은 변경들의 누적이다.

## 첫 버전을 부끄러워하지 마라

> 깨끗한 코드를 짠다는 것은 **첫 버전을 깨끗하게 짜는 게 아니다**.

Martin은 자신의 첫 Args 버전을 책에 그대로 적는다. 더럽다. 그러나 부끄러워하지 않는다. **작동했기 때문**이다.

작동하지 않는 깨끗한 코드는 아무것도 아니다. 작동하는 더러운 코드는 — 다듬을 수 있다. **순서가 중요하다**:

1. 작동하게 한다 (테스트 통과).
2. 깨끗하게 한다 (리팩토링).

거꾸로는 안 된다. 깨끗하게 짜려다가 작동을 못 시키면 — 처음부터 다시.

## 추상은 점진적으로 등장한다

`ArgumentMarshaler` 같은 추상은 — Martin이 **처음부터 의도**한 게 아니다. 코드를 다듬으면서 **타입별 처리의 공통 패턴**이 보였고, 그것을 추출한 것이다.

> "혹시 모르니까" 처음부터 인터페이스를 만들지 마라.
> 첫 번째 구현을 그대로 짠다. 두 번째 구현이 등장할 때, 공통점이 보이면 — 그때 인터페이스를 추출한다.

이게 YAGNI(You Aren't Gonna Need It)다. **미리 설계한 추상**은 거의 항상 잘못된 추상이다. **발견한 추상**이 진짜 추상이다.

## 정리

- **처음부터 클린한 코드는 없다**. 작동 → 다듬기.
- **테스트가 안전망** — 매 단계가 동작 보존을 보증.
- **점진적 리팩토링** — 메서드 추출, 클래스 분리, 이름 정리.
- 추상은 **요구에서 자란다** — 미리 설계 X.
- 첫 버전을 부끄러워하지 마라. **그것을 다듬는 작업**이 좋은 코드를 만든다.

다음 두 챕터(15, 16)도 사례 연구 — JUnit 내부와 SerialDate 클래스.

## 관련 항목

- [Ch 3: 함수](/blog/programming/engineering/clean-code/chapter03-functions) — 메서드 추출의 토대
- [Ch 9: 단위 테스트](/blog/programming/engineering/clean-code/chapter09-unit-tests) — 안전망으로서의 테스트
- [Ch 12: 창발](/blog/programming/engineering/clean-code/chapter12-emergence) — 추상이 자라나는 방식
- [Refactoring: Extract Function](/blog/programming/engineering/refactoring/) — 점진적 리팩토링 카탈로그
