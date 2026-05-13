---
title: "Ch 8: 경계"
date: 2026-06-15T08:00:00
description: "외부 코드와 자기 코드 사이의 경계 — 학습 테스트, Adapter, 우리 시스템에 맞는 인터페이스로 감싸기."
tags: [CleanCode, Boundaries, Adapter, Robert Martin]
series: "Clean Code"
seriesOrder: 8
---

## 이 챕터의 메시지

모든 시스템은 외부 코드(라이브러리, 프레임워크, 서비스, OS API)에 의존한다. 이 의존성을 다루는 방식이 시스템의 변경 가능성을 결정한다.

> **외부 코드와 자기 코드 사이의 경계를 의식적으로 그려라.**

경계가 분명하면 외부 변경의 충격이 한 자리에 갇힌다. 경계가 흐릿하면 외부 API가 시스템 곳곳에 새어 들어가, 라이브러리를 교체할 때마다 코드 전체가 깨진다.

## 핵심 내용

- **외부 인터페이스를 그대로 노출하지 마라**. 우리 시스템에 맞는 추상으로 감싸라.
- **학습 테스트**(learning test)로 외부 라이브러리의 동작을 검증하라.
- **Adapter**가 경계의 표준 도구.
- 외부 코드 변경 시 영향이 **한 자리**에 갇히도록 설계.

## 외부 인터페이스 사용

`java.util.Map`을 예시로 보자. `Map`은 너무 범용적이라 모든 메서드가 모든 호출자에게 노출된다.

```java
Map<String, Sensor> sensors = new HashMap<>();
// ...
Sensor s = sensors.get(sensorId);  // 자유 형식 — 누구나 어떤 키로도 호출 가능
```

이게 문제인 이유는 두 가지다.

1. **타입 안전성** — `Map<String, Sensor>`에 `Object`도 들어갈 수 있다 (제네릭이 런타임에 erased).
2. **모든 메서드 노출** — `clear()`, `keySet()`, `equals()` 등 호출자가 알 필요 없는 메서드까지.

해결책은 우리 시스템의 의도에 맞는 인터페이스로 **wrap**하는 것이다.

```java
public class Sensors {
    private Map<String, Sensor> sensors = new HashMap<>();

    public Sensor getById(String id) {
        return sensors.get(id);
    }

    public void add(String id, Sensor s) {
        sensors.put(id, s);
    }

    // 우리 시스템이 필요한 메서드만 노출
}
```

이제 `Map`은 **`Sensors` 안에 갇혀** 있다. 다른 자료구조로 교체해도 사용자 코드는 변경 없다.

## 학습 테스트 (Learning Tests)

외부 라이브러리를 처음 도입할 때 — **문서를 읽고 코드를 짜기 전에**, 작은 테스트로 라이브러리 동작을 확인한다.

```java
// log4j 학습 테스트
@Test
public void testLogCreate() {
    Logger logger = Logger.getLogger("MyLogger");
    logger.info("hello");
    // 출력 확인
}

@Test
public void testLogAddAppender() {
    Logger logger = Logger.getLogger("MyLogger");
    ConsoleAppender appender = new ConsoleAppender();
    logger.addAppender(appender);
    logger.info("hello");
}
```

학습 테스트의 가치는 세 가지다.

1. **라이브러리의 정확한 사용법 학습** — 문서가 부족하면 실험이 답.
2. **추후 라이브러리 업그레이드 시 회귀 검증** — 새 버전이 옛 동작을 깨면 학습 테스트가 잡는다.
3. **무료 보너스** — 학습 시간을 어차피 쓴다. 테스트로 적으면 그 시간이 자산이 된다.

## 아직 존재하지 않는 코드와의 경계

새 시스템을 개발하다 보면 — 아직 안 만들어진 외부 API와 인터페이스해야 할 때가 있다. 다른 팀이 만드는 중이거나, 명세만 있고 구현이 없을 때.

이 때 **우리가 원하는 인터페이스를 먼저 정의**하고, 그 뒤에 실제 외부 API와 연결하는 Adapter를 둔다.

```java
// 우리가 원하는 인터페이스
public interface Transmitter {
    void transmitOn(double frequency, double amplitude);
}

// Adapter — 외부 API가 완성되면 여기서 호출
public class TransmitterAdapter implements Transmitter {
    @Override
    public void transmitOn(double frequency, double amplitude) {
        // 외부 API 호출 (아직 미구현일 수도)
    }
}
```

이 방식의 이점은 두 가지다.

1. **우리 코드는 즉시 진행 가능** — Adapter 안에서 mock으로 동작하면 된다.
2. **외부 API가 결정되면 한 곳만 수정** — Adapter 안만.

## 깔끔한 경계의 패턴

경계 코드의 공통 특징을 정리하면 다음과 같다.

| 특징 | 설명 |
| --- | --- |
| **Adapter 패턴** | 외부 인터페이스와 우리 인터페이스 사이의 번역기 |
| **Wrapping 클래스** | 외부 API 호출을 우리 의도의 메서드 이름으로 감싸기 |
| **명확한 의존 방향** | 우리 코드 → 경계 → 외부. 반대는 X |
| **테스트 격리** | 경계 너머 코드를 mock하여 우리 로직만 테스트 |

이것들 모두 **외부 변경의 영향을 한 자리에 가두기 위한** 패턴이다.

## 경계의 위치

경계는 어디에 그어야 하는가? Martin의 권장은 단순하다.

> **외부 API의 유형(타입 시그니처)을 직접 다루지 마라.**

함수 시그니처에 `java.sql.Connection`이나 `org.apache.http.HttpClient`가 등장하기 시작하면 — 우리 시스템이 그 라이브러리에 묶인 것이다. 그 자리에 우리 도메인의 추상 타입을 두는 게 첫 단계다.

이게 [Clean Architecture의 의존성 규칙](/blog/programming/design/clean-architecture/chapter11-dip-the-dependency-inversion-principle)으로 이어진다 — 비즈니스 로직은 외부 디테일에 의존하지 않는다.

## 정리

- 외부 인터페이스를 **그대로 노출하지 마라** — 우리 시스템에 맞는 추상으로 감싼다.
- **학습 테스트**로 외부 라이브러리를 학습 + 회귀 검증 동시에.
- **Adapter**로 외부와 우리 사이를 번역.
- 외부 변경의 영향이 **한 자리**에 갇히도록 설계.

다음 챕터는 **단위 테스트** — 클린 코드의 가장 큰 안전망.

## 관련 항목

- [Ch 7: 에러 처리](/blog/programming/engineering/clean-code/chapter07-error-handling) — 라이브러리 예외 wrap
- [Clean Architecture Ch 11: DIP](/blog/programming/design/clean-architecture/chapter11-dip-the-dependency-inversion-principle) — 경계의 본질
- [Effective C++ Ch 1: C++ 연합체](/blog/programming/cpp/effective-cpp/item01-view-cpp-as-a-federation-of-languages) — 영역 사이의 경계
