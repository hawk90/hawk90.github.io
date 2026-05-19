---
title: "Ch 7: 에러 처리"
date: 2026-05-11T07:00:00
description: "예외를 던져라. 에러 코드를 반환하지 마라. null을 반환하지 마라. null을 전달하지 마라. Special Case 패턴."
tags: [CleanCode, Error Handling, Exceptions, Robert Martin]
series: "Clean Code"
seriesOrder: 7
draft: true
---

## 이 챕터의 메시지

에러 처리는 코드의 첫째 책임이지만, 정상 경로(happy path)와 섞이면 가장 빨리 가독성을 망친다. Martin은 이 챕터에서 단순하고 단호한 원칙을 제시한다.

> **예외를 던져라. 에러 코드를 반환하지 마라.**
>
> **null을 반환하지 마라. null을 전달받지도 마라.**

이 두 원칙을 따르면 에러 처리 코드와 정상 코드가 시각적으로 분리된다. 정상 경로는 깔끔하고, 에러 경로는 한 자리에 모인다.

## 핵심 내용

- **예외를 던져라**. 에러 코드 반환은 호출 코드를 if 지옥으로 만든다.
- **try를 먼저 짜라**. 트랜잭션처럼 — 예외 후 시스템이 유효한 상태에 있어야 한다.
- **의미 있는 예외를 던져라**. 위치·맥락·연산 의도를 포함한다.
- **호출자 관점에서 예외 클래스를 정의**한다. 라이브러리 예외를 한 자리에서 wrap.
- **정상 흐름을 정의하라** — 예외 대신 Special Case 패턴이 가독성을 올린다.
- **null을 반환·전달하지 마라**. `Optional`, 빈 컬렉션, Null Object 패턴 활용.

## 예외를 던져라

C 시절의 관습은 에러 코드 반환이었다. 호출자가 매번 검사해야 했다.

```java
public class DeviceController {
    public void sendShutDown() {
        DeviceHandle handle = getHandle(DEV1);
        if (handle != DeviceHandle.INVALID) {
            retrieveDeviceRecord(handle);
            if (record.getStatus() != DEVICE_SUSPENDED) {
                pauseDevice(handle);
                clearDeviceWorkQueue(handle);
                closeDevice(handle);
            } else {
                logger.log("Device suspended. Unable to shut down");
            }
        } else {
            logger.log("Invalid handle for: " + DEV1.toString());
        }
    }
}
```

호출 코드가 if 지옥에 빠진다. 무엇이 정상이고 무엇이 에러인지 시각적으로 구분이 안 된다.

예외를 쓰면 정상 경로가 깔끔하게 드러난다.

```java
public class DeviceController {
    public void sendShutDown() {
        try {
            tryToShutDown();
        } catch (DeviceShutDownError e) {
            logger.log(e);
        }
    }

    private void tryToShutDown() throws DeviceShutDownError {
        DeviceHandle handle = getHandle(DEV1);
        DeviceRecord record = retrieveDeviceRecord(handle);
        pauseDevice(handle);
        clearDeviceWorkQueue(handle);
        closeDevice(handle);
    }

    private DeviceHandle getHandle(DeviceID id) {
        // ...
        throw new DeviceShutDownError("Invalid handle for: " + id.toString());
        // ...
    }
}
```

정상 경로는 한 줄로 흐른다. 에러 처리는 `catch` 한 자리에 모인다.

## try-catch-finally를 먼저 짜라

예외가 발생할 수 있는 코드를 짤 때, **`try`를 먼저** 적는다. 그러면 자연스럽게 두 가지 질문을 한다.

- 예외가 발생하면 시스템이 **유효한 상태**에 머무는가?
- 예외 처리 후 코드가 **계속 동작 가능한가**?

```java
public List<RecordedGrip> retrieveSection(String sectionName) {
    try {
        FileInputStream stream = new FileInputStream(sectionName);
        stream.close();
    } catch (FileNotFoundException e) {
        throw new StorageException("retrieval error", e);
    }
    return new ArrayList<RecordedGrip>();
}
```

TDD로 접근하면 더 명확하다. 먼저 **예외를 던지는 테스트**를 짜고, 그 테스트가 통과되도록 코드를 짠다. 그러면 try/catch가 자연스럽게 구조의 일부가 된다.

## Checked vs Unchecked

Java의 checked exception은 모든 호출자가 `throws` 선언을 강제한다. 한 함수의 시그니처가 바뀌면 모든 호출 체인이 깨진다.

> **OCP(Open-Closed Principle) 위반**이다.

Martin의 권장은 **unchecked exception**이다. 호출 사슬에 영향을 주지 않고도 새 예외를 추가할 수 있다.

Java 외 언어는 대부분 unchecked 모델이다 (C#, C++, Python, Ruby 등). Java만의 특이한 선택이다.

> 예외: 라이브러리 API 경계에서 호출자가 반드시 처리해야 하는 진짜 회복 가능한 에러라면 checked로 둘 수 있다.

## 의미 있는 예외 메시지

예외에는 **위치, 맥락, 의도**를 포함한다.

```java
// Bad
throw new IOException();

// Good
throw new IOException(
    "Failed to read config from " + path + " (operation: " + opName + ")",
    cause
);
```

stack trace는 어디서 던졌는지 알려주지만 — **왜 그게 문제인지**는 메시지가 알려줘야 한다.

## 호출자 관점에서 예외 클래스 정의

외부 라이브러리의 예외를 **그대로 호출자에게 전파**하지 마라. 호출자가 라이브러리의 모든 예외 종류를 알아야 한다.

```java
// Bad — 모든 예외 종류를 호출자가 직접 처리
ACMEPort port = new ACMEPort(12);
try {
    port.open();
} catch (DeviceResponseException e) {
    reportPortError(e);
    logger.log("Device response exception", e);
} catch (ATM1212UnlockedException e) {
    reportPortError(e);
    logger.log("Unlock exception", e);
} catch (GMXError e) {
    reportPortError(e);
    logger.log("Device response exception");
}
```

라이브러리 예외를 **하나의 예외로 wrap**한다.

```java
// Good — Wrapper가 라이브러리 차이를 흡수
LocalPort port = new LocalPort(12);
try {
    port.open();
} catch (PortDeviceFailure e) {
    reportError(e);
    logger.log(e.getMessage(), e);
}

public class LocalPort {
    private ACMEPort innerPort;
    public LocalPort(int portNumber) {
        innerPort = new ACMEPort(portNumber);
    }
    public void open() {
        try {
            innerPort.open();
        } catch (DeviceResponseException e) {
            throw new PortDeviceFailure(e);
        } catch (ATM1212UnlockedException e) {
            throw new PortDeviceFailure(e);
        } catch (GMXError e) {
            throw new PortDeviceFailure(e);
        }
    }
}
```

호출자 코드는 단순해진다. 라이브러리를 교체해도 호출자는 그대로다 (Wrapper만 수정).

## Special Case 패턴

예외가 정상 흐름의 일부가 되어선 안 된다. 가끔은 **예외 대신 특별한 객체**를 반환하는 게 더 깨끗하다.

```java
// 예외 흐름 — 외부 결제가 없을 때 0을 처리하기 위해 try/catch
try {
    MealExpenses expenses = expenseReportDAO.getMeals(employee.getID());
    m_total += expenses.getTotal();
} catch (MealExpensesNotFound e) {
    m_total += getMealPerDiem();
}

// Special Case — DAO가 항상 객체를 반환
MealExpenses expenses = expenseReportDAO.getMeals(employee.getID());
m_total += expenses.getTotal();

public class PerDiemMealExpenses implements MealExpenses {
    public int getTotal() {
        return /* 식대 기본값 */;
    }
}
```

DAO가 식비가 없을 때 `PerDiemMealExpenses`를 반환하면 — 호출자는 분기를 안 한다. 한 코드 경로로 모든 케이스가 처리된다.

이 패턴은 [Gang of Four의 Null Object 패턴](https://en.wikipedia.org/wiki/Null_object_pattern)의 일반화다.

## null을 반환하지 마라

null은 호출자에게 **검사 책임**을 떠넘긴다. 한 곳에서 검사를 잊으면 NPE다.

```java
// Bad — 호출자가 매번 null 검사
public List<Employee> getEmployees() {
    if ( /* 직원이 없는 경우 */ )
        return null;
    // ...
}

// 호출자
List<Employee> employees = getEmployees();
if (employees != null) {
    for (Employee e : employees) ...
}
```

세 가지 대안이 있다.

### 1) 빈 컬렉션 반환

```java
public List<Employee> getEmployees() {
    return employees == null ? Collections.emptyList() : employees;
}

// 호출자
for (Employee e : getEmployees()) ...   // null 검사 불필요
```

### 2) `Optional` 사용 (Java 8+)

```java
public Optional<Employee> findById(String id) {
    return Optional.ofNullable(map.get(id));
}

// 호출자
findById("alice")
    .map(Employee::getEmail)
    .ifPresent(this::sendEmail);
```

### 3) Special Case (Null Object)

```java
// "직원 없음"을 표현하는 객체
public final Employee NULL_EMPLOYEE = new Employee("none", "—");
```

## null을 전달하지 마라

함수에 `null`을 매개변수로 넘기지 마라. 함수가 모든 매개변수에 null 검사를 박아야 하고, 그 검사를 잊으면 NPE다.

```java
// Bad — null 가능
public double xProjection(Point p1, Point p2) {
    return (p2.x - p1.x) * 1.5;
}
calculator.xProjection(null, new Point(12, 13));   // NPE

// 검사 추가 — 모든 함수에 흩어짐
public double xProjection(Point p1, Point p2) {
    if (p1 == null || p2 == null) {
        throw new InvalidArgumentException("Invalid arg for xProjection");
    }
    return (p2.x - p1.x) * 1.5;
}

// 또는 assertion — 디버그에서만 보호
public double xProjection(Point p1, Point p2) {
    assert p1 != null : "p1 should not be null";
    assert p2 != null : "p2 should not be null";
    return (p2.x - p1.x) * 1.5;
}
```

진짜 답은 **null을 전달하지 않기로 규약을 정하는 것**이다. 검사가 사라지고 호출자는 항상 유효한 객체를 넘긴다.

## 정리

- **예외를 던져라**. 에러 코드는 호출 코드를 if 지옥으로 만든다.
- **try를 먼저 짜라** — 예외 후 시스템이 유효한 상태에 머물도록.
- 의미 있는 메시지로 **위치·맥락·의도**를 전달.
- 라이브러리 예외는 **wrap**해서 호출자에게 단일 타입으로 전달.
- **Special Case** 패턴으로 예외 흐름을 정상 흐름으로 만든다.
- **null을 반환·전달하지 마라**. `Optional`, 빈 컬렉션, Null Object 활용.

다음 챕터는 **경계** — 외부 코드와 자기 코드 사이의 인터페이스.

## 관련 항목

- [Ch 3: 함수](/blog/programming/engineering/clean-code/chapter03-functions) — try/catch 본문은 별도 함수로 빼라
- [Ch 8: 경계](/blog/programming/engineering/clean-code/chapter08-boundaries) — 다음 챕터
- [Effective C++ Ch 8: 소멸자에서 예외 금지](/blog/programming/cpp/effective-cpp/item08-prevent-exceptions-from-leaving-destructors) — C++에서의 예외 안전성
