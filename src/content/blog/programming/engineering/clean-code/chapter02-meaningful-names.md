---
title: "Ch 2: 의미 있는 이름"
date: 2025-06-15T02:00:00
description: "변수·함수·클래스 이름은 코드의 80%를 차지하는 토큰이다. 의도가 드러나는 이름을 짓는 규칙들."
tags: [CleanCode, Naming, Robert Martin]
series: "Clean Code"
seriesOrder: 2
---

## 이 챕터의 메시지

코드의 거의 모든 토큰은 누군가의 **이름**이다. 변수명, 함수명, 클래스명, 패키지명. 이 이름들이 의도를 드러내지 못하면, 작성자가 아무리 좋은 설계를 했더라도 다음 사람은 코드를 이해할 수 없다.

Martin은 이 챕터에서 단호하다 — **이름은 진지한 일**이다. "나중에 바꾸지 뭐"는 통하지 않는다. 한 번 박힌 이름은 코드 전체에 퍼지고, 시간이 지날수록 바꾸기 어려워진다.

> 이름을 잘 짓는 데 시간을 쓰는 것은 비용이 아니라 **투자**다.

## 핵심 내용

- 이름은 **의도를 드러내야 한다** — `int d;`가 아니라 `int elapsedTimeInDays;`
- **거짓 정보를 주지 마라** — `accountList`는 List 아니면 거짓말이다
- **의미 있는 구분**을 하라 — `a1`, `a2`나 `info`, `data`는 구분이 아니다
- **발음 가능, 검색 가능**한 이름을 짓자
- **인지 매핑**을 강요하지 마라 — 짧은 이름이 무조건 좋은 게 아니다
- 클래스는 **명사**, 메서드는 **동사**
- **약어 금지**, 한 가지 일을 한 가지 단어로
- 컨텍스트를 더하되 **불필요한 컨텍스트는 빼라**

## 의도가 드러나는 이름

가장 기본 원칙이다. 변수 이름만 보고 그 변수가 무엇을, 왜, 어떻게 쓰이는지 짐작이 가야 한다.

```java
// Bad
int d;  // elapsed time in days

// Good
int elapsedTimeInDays;
int daysSinceCreation;
int daysSinceModification;
int fileAgeInDays;
```

주석으로 의미를 보충해야 한다면 — 이름 자체가 의미를 담지 못한 것이다. 주석 대신 이름을 고친다.

다음 코드는 무엇을 하는가?

```java
public List<int[]> getThem() {
    List<int[]> list1 = new ArrayList<int[]>();
    for (int[] x : theList)
        if (x[0] == 4)
            list1.add(x);
    return list1;
}
```

코드 자체는 단순하다. 그런데 무엇을 하는지 알 수 없다. `theList`가 무엇이고, `x[0]`가 왜 중요하며, `4`가 무엇을 의미하는지 모른다.

이름을 바꾸면 단번에 명확해진다.

```java
public List<Cell> getFlaggedCells() {
    List<Cell> flaggedCells = new ArrayList<Cell>();
    for (Cell cell : gameBoard)
        if (cell.isFlagged())
            flaggedCells.add(cell);
    return flaggedCells;
}
```

같은 로직, 다른 이름. 이게 의도를 드러내는 이름의 힘이다.

## 거짓 정보를 피하라

이름은 **타입과 일치**해야 한다. `accountList`라는 변수가 사실 `Set`이라면 거짓말이다. 다음 사람이 `.get(0)`을 호출했다가 에러를 만난다.

```java
// 거짓말
Set<Account> accountList;       // List 아닌데 List라고 적힘

// 솔직
Set<Account> accounts;
List<Account> accountList;      // 진짜 List일 때만
```

소문자 `l`과 대문자 `O`도 함정이다. 숫자 `1`, `0`과 거의 같아 보인다.

```java
int a = l;
if (O == l)
    a = O1;
else
    l = 01;
```

이런 코드를 읽으려고 폰트를 바꿔야 한다면 — 이미 문제다.

## 의미 있는 구분

이름이 다르려면 **의미가 달라야** 한다. 단순히 컴파일러를 만족시키기 위해 다르게 적은 이름은 가짜 구분이다.

```java
// 의미 없는 구분
void copyChars(char a1[], char a2[]) { /* ... */ }

// 의미 있는 구분
void copyChars(char source[], char destination[]) { /* ... */ }
```

`info`, `data`, `the` 같은 노이즈 단어도 마찬가지다.

```java
// 같은 데이터의 세 가지 이름 — 어느 게 무엇?
Product;
ProductInfo;
ProductData;

getActiveAccount();
getActiveAccounts();
getActiveAccountInfo();
```

같은 일을 가리키는 다른 이름들이 코드에 흩어져 있으면, 다음 사람은 어떤 차이가 있는지 추적하느라 시간을 쓴다. 실제로 차이가 없다면 그 시간 자체가 낭비다.

## 발음 가능한 이름

이름은 동료와의 **대화에서 쓰인다**. 발음할 수 없는 이름은 회의에서 코드를 논의할 수 없게 만든다.

```java
// 발음 불가
class DtaRcrd102 {
    private Date genymdhms;
    private Date modymdhms;
    private final String pszqint = "102";
}

// 발음 가능
class Customer {
    private Date generationTimestamp;
    private Date modificationTimestamp;
    private final String recordId = "102";
}
```

"디타 알씨알디 백둘"이라고 말할 일은 없다. 이름을 입에 올릴 수 없으면, 동료들과 코드를 함께 작업할 수도 없다.

## 검색 가능한 이름

단일 글자 이름이나 상수 리터럴은 검색할 수 없다. 의미 있는 이름을 붙여야 grep으로 찾을 수 있다.

```java
// 검색 불가
for (int j=0; j<34; j++) {
    s += (t[j]*4)/5;
}

// 검색 가능
int realDaysPerIdealDay = 4;
const int WORK_DAYS_PER_WEEK = 5;
int sum = 0;
for (int j=0; j < NUMBER_OF_TASKS; j++) {
    int realTaskDays = taskEstimate[j] * realDaysPerIdealDay;
    int realTaskWeeks = realTaskDays / WORK_DAYS_PER_WEEK;
    sum += realTaskWeeks;
}
```

규칙: **이름의 길이는 그 스코프의 크기에 비례**한다. for 루프의 인덱스는 `i`로 충분하지만, 클래스 멤버는 검색 가능해야 한다.

## 인코딩을 피하라

타입이나 스코프를 이름에 박는 옛 컨벤션이 있었다.

### 헝가리안 표기법 — 더 이상 필요 없다

```java
// 옛날 (타입 안전성이 약하던 시절)
String     phoneString;
PhoneNumber phoneNumberObj;
```

현대 IDE는 마우스 호버만으로 타입을 알려준다. 이름에 박을 필요가 없다.

### 멤버 접두사 — `m_`도 잡음

```java
// 잡음
public class Part {
    private String m_dsc;
    void setName(String name) { m_dsc = name; }
}

// 깔끔
public class Part {
    private String description;
    void setName(String name) { description = name; }
}
```

IDE가 멤버를 색으로 구분한다. 접두사가 필요하던 시대는 끝났다.

### 인터페이스와 구현

```java
// I 접두사 — 클라이언트에 인터페이스임을 알리는 의미가 있음 (그러나 노이즈)
public interface IShapeFactory { ... }
public class ShapeFactory implements IShapeFactory { ... }

// 권장 — 구현 쪽에 접미사
public interface ShapeFactory { ... }
public class ShapeFactoryImpl implements ShapeFactory { ... }
// 또는
public class CShapeFactory implements ShapeFactory { ... }
```

클라이언트는 인터페이스만 본다. 인터페이스 이름이 일급 시민이고, 구현 이름은 그 안쪽 디테일이다.

## 클래스는 명사, 메서드는 동사

```java
// 클래스 — 명사 또는 명사구
Customer
WikiPage
Account
AddressParser

// 메서드 — 동사 또는 동사구
postPayment()
deletePage()
save()
isPosted()
hasError()
```

`Manager`, `Processor`, `Data`, `Info` 같은 노이즈 명사는 피한다. **이 클래스가 진짜로 무엇인지**를 한 단어로 표현하지 못하면, 책임이 너무 많을 가능성이 크다.

생성자가 오버로드될 때는 **정적 팩토리 메서드**가 더 명확하다.

```java
// 어느 게 어떤 의미?
Complex c1 = new Complex(23.0);
Complex c2 = new Complex(23.0, 0.0);

// 의도 분명
Complex c1 = Complex.FromRealNumber(23.0);
```

## 한 가지 일에 한 가지 단어

**같은 추상 개념엔 같은 단어**를 쓴다. 어떤 클래스에선 `fetch`, 다른 클래스에선 `retrieve`, 또 다른 곳에선 `get`을 쓰면 — 다음 사람은 셋이 다른지 같은지 짐작해야 한다.

```java
// 일관성 없음
PaymentService.fetch(id);
OrderService.retrieve(id);
CustomerService.get(id);

// 일관성
PaymentService.get(id);
OrderService.get(id);
CustomerService.get(id);
```

반대 원리도 있다 — **다른 개념엔 다른 단어**. `add`가 어떤 자리에선 산술이고 다른 자리에선 컨테이너 삽입이라면, 두 번째는 `insert`나 `append`로 바꾼다.

## 의미 있는 컨텍스트

대부분의 이름은 **그 자체로 의미가 분명하지 않다**. 컨텍스트가 받쳐 줘야 한다.

```java
// 컨텍스트 없음 — 무엇의 이름인가?
firstName, lastName, street, houseNumber, city, state, zipcode

// 컨텍스트 추가 — 한 주소의 부분들
class Address {
    String firstName;
    String lastName;
    String street;
    // ...
}
```

함수 안 변수에 prefix를 붙이는 대신, **함수를 작은 함수로 쪼개고 컨텍스트를 클래스로 추출**한다. 이게 더 일반적인 해결책이다.

### 불필요한 컨텍스트는 빼라

반대로 — 클래스 이름이 이미 컨텍스트라면 멤버에 반복하지 않는다.

```java
// 불필요한 반복
class Address {
    String addressStreet;
    String addressCity;
    String addressZipcode;
}

// 깔끔
class Address {
    String street;
    String city;
    String zipcode;
}
```

`address.addressStreet`는 어색하다. 클래스가 이미 컨텍스트를 제공한다.

## 마지막 조언

> **이름을 짓는 데 두려워하지 말고, 나중에 더 좋은 이름을 발견하면 바꿔라.**

이름을 바꾸는 것은 코드를 개선하는 **가장 저렴한** 리팩토링이다. 현대 IDE는 한 클릭으로 안전하게 이름을 바꾼다. 옛 이름이 어색해 보이면 — 그 자리에서 고친다.

이름이 어색하다는 감각은 코드의 다른 문제(잘못된 추상화, 잘못된 책임 분배)를 지적하기도 한다. 좋은 이름이 안 떠오르면, 그 코드의 구조가 문제일 가능성이 있다.

## 정리

- 이름은 **의도**를 드러낸다. 주석으로 보충해야 한다면 이름이 부족한 것이다.
- **거짓 정보**를 주지 마라 — 타입과 일치하게.
- **의미 있는 구분** — `a1`, `data` 같은 가짜 구분 금지.
- **발음 가능, 검색 가능**한 이름 — 길이는 스코프에 비례.
- **인코딩 금지** — IDE가 타입과 스코프를 알려준다.
- **클래스는 명사, 메서드는 동사**. 같은 개념엔 같은 단어.
- **컨텍스트는 추가하되 반복하지 마라** — 클래스 이름이 이미 컨텍스트다.
- 더 좋은 이름이 떠오르면 **즉시 바꿔라**.

다음 챕터는 **함수** — 의미 있는 이름들이 모여 만드는 가장 작은 단위.

## 관련 항목

- [Ch 1: 클린 코드](/blog/programming/engineering/clean-code/chapter01-clean-code) — 작가의 책임
- [Ch 3: 함수](/blog/programming/engineering/clean-code/chapter03-functions) — 이름들의 다음 층위
- [Effective C++ Ch 18: 인터페이스는 올바르게 쓰기 쉽게](/blog/programming/cpp/effective-cpp/item18-make-interfaces-easy-to-use-correctly-and-hard-to-use-incorrectly) — 타입으로 의도 표현
