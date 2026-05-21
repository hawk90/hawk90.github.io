---
title: "Ch 6: Process"
date: 2026-05-19T06:00:00
description: "프로세스 — 반복적 개발, 마이크로/매크로 프로세스."
series: "Object-Oriented Analysis and Design with Applications"
seriesOrder: 6
tags: [oop, booch, process, iterative, incremental]
draft: false
type: book-review
bookTitle: "Object-Oriented Analysis and Design with Applications"
bookAuthor: "Grady Booch"
---

## 한 줄 요약

> 객체지향 개발은 **반복적(iterative)**이고 **점진적(incremental)**이다. **마이크로 프로세스**가 일상 활동을, **매크로 프로세스**가 프로젝트 전체를 안내한다.

## 프로세스의 필요성

"프로세스"라는 단어에 거부감을 느끼는 개발자가 많습니다. 관료주의, 무의미한 문서, 진짜 일을 방해하는 회의를 떠올리기 때문입니다. 하지만 *좋은* 프로세스는 다릅니다. 팀이 올바른 방향으로 가도록 안내하는 지도입니다.

### 왜 프로세스가 필요한가

| 목적 | 설명 | 없을 때의 문제 |
|------|------|--------------|
| 예측 가능성 | 무엇을 언제 할지 알 수 있음 | "다음 주까지 뭘 해야 하죠?" "진행 상황이 몇 %죠?" |
| 품질 보장 | 일관된 산출물, 검증 포인트 | 결함이 배포 후에야 발견됨 |
| 의사소통 | 팀 내 공통 언어, 역할과 책임 명확 | "그건 내 일이 아닌데요" "누가 그걸 결정하죠?" |
| 지식 축적 | 경험의 체계화, 교훈의 전파 | 같은 실수 반복, 사람이 떠나면 지식도 떠남 |

### 폭포수 vs 반복

두 가지 근본적으로 다른 접근법이 있습니다.

| 모델 | 흐름 | 핵심 가정 | 현실 |
|------|------|----------|------|
| 폭포수 | 요구분석 → 설계 → 구현 → 테스트 → 배포 | 요구사항이 초기에 완전히 정의됨 | 요구사항은 *항상* 변한다 |
| 반복적 | [분석 → 설계 → 구현 → 테스트] × N | 요구사항은 점진적으로 발견됨 | 조기 피드백으로 위험 분산 |

**폭포수의 문제**: 고객이 "완성된 시스템"을 처음 보는 시점이 프로젝트 막바지입니다. 이때 "아, 제가 원한 건 이게 아니에요"라고 하면? 이미 늦었습니다.

**반복적 개발의 핵심**: 작동하는 소프트웨어를 *자주* 전달합니다. 2주마다, 4주마다. 고객이 실제로 써보고 피드백을 주면, 그 피드백을 다음 반복에 반영합니다. 잘못된 방향을 일찍 수정할 수 있습니다.

## 마이크로 프로세스

### 일상 개발 활동

**마이크로 프로세스**: 개발자의 일상적인 분석/설계/구현 사이클 (일별/주별).

| 단계 | 활동 |
|------|------|
| 1 | 클래스와 객체 식별 |
| 2 | 의미론(Semantics) 식별 |
| 3 | 관계 식별 |
| 4 | 인터페이스와 구현 명세 |

### 클래스와 객체 식별

| 발견 유형 | 입력 | 활동 | 출력 |
|----------|------|------|------|
| 클래스 발견 | 요구사항, 도메인 지식 | 명사 추출, CRC 세션, 도메인 모델링 | 클래스 후보 목록 |
| 객체 발견 | 시나리오, 유스케이스 | 시나리오 워크스루, 책임 할당 | 객체 협력 모델 |

```java
// 예: 도서관 시스템에서 클래스 식별

// 요구사항에서 추출한 명사들
// "회원이 책을 대출하고 반납한다"
// → Member, Book, Loan

// 후보 클래스
public class Member {
    private MemberId id;
    private String name;
    private List<Loan> activeLoans;
}

public class Book {
    private ISBN isbn;
    private String title;
    private BookStatus status;
}

public class Loan {
    private Member member;
    private Book book;
    private LocalDate dueDate;
}
```

### 의미론 식별

**의미론 식별**: 클래스 후보 → 클래스 명세.

| 활동 | 질문 |
|------|------|
| 속성 정의 | 이 클래스는 무엇을 알아야 하는가? |
| 연산 정의 | 이 클래스는 무엇을 할 수 있어야 하는가? |
| 불변식 식별 | 항상 참이어야 하는 조건은? |
| 상태 분석 | 상태에 따라 행동이 달라지는가? |

```java
// 예: Loan 클래스의 의미론

public class Loan {
    // 속성 (무엇을 아는가)
    private final Member member;
    private final Book book;
    private final LocalDate borrowDate;
    private final LocalDate dueDate;
    private LocalDate returnDate;
    private LoanStatus status;

    // 불변식: dueDate > borrowDate
    // 불변식: returnDate == null || returnDate >= borrowDate

    // 연산 (무엇을 하는가)
    public void returnBook() {
        if (status != LoanStatus.ACTIVE) {
            throw new IllegalStateException("Loan is not active");
        }
        this.returnDate = LocalDate.now();
        this.status = LoanStatus.RETURNED;
    }

    public boolean isOverdue() {
        return status == LoanStatus.ACTIVE
            && LocalDate.now().isAfter(dueDate);
    }

    public int getDaysOverdue() {
        if (!isOverdue()) return 0;
        return (int) ChronoUnit.DAYS.between(dueDate, LocalDate.now());
    }
}
```

### 관계 식별

**관계 식별**: 클래스 명세 → 클래스 다이어그램.

| 관계 | 결정 질문 |
|------|----------|
| 연관 | A가 B를 알아야 하는가? |
| 집합 | A가 B를 포함하는가? (약한 소유) |
| 합성 | A가 B의 생명주기를 관리하는가? (강한 소유) |
| 상속 | A가 B의 일종인가? |
| 의존 | A가 B를 일시적으로 사용하는가? |

```java
// 관계 결정 예시

// 연관: Library -- Member (도서관이 회원을 알아야 함)
public class Library {
    private List<Member> members;

    public void registerMember(Member member) {
        members.add(member);
    }
}

// 합성: Order ◆── OrderItem (주문이 항목의 생명주기 관리)
public class Order {
    private List<OrderItem> items = new ArrayList<>();

    public void addItem(Product product, int qty) {
        items.add(new OrderItem(this, product, qty)); // Order가 생성
    }

    public void cancel() {
        items.clear(); // Order와 함께 소멸
    }
}

// 상속: Manager extends Employee
public class Manager extends Employee {
    private List<Employee> directReports;

    @Override
    public Money calculateBonus() {
        return getSalary().multiply(0.2);
    }
}
```

### 인터페이스와 구현

| 단계 | 입력 | 활동 | 출력 |
|------|------|------|------|
| 인터페이스 명세 | 의미론, 관계 | 공개 인터페이스 정의, 계약 명세, 예외 정의 | API 명세 |
| 구현 | 인터페이스 명세 | 알고리즘 선택, 자료구조 선택, 코드 작성, 단위 테스트 | 동작하는 코드 |

```java
// 인터페이스 명세 예시

/**
 * 대출 서비스 인터페이스
 */
public interface LoanService {
    /**
     * 책을 대출한다.
     *
     * @param memberId 대출할 회원 ID
     * @param isbn 대출할 책의 ISBN
     * @return 생성된 대출 정보
     * @throws MemberNotFoundException 회원이 존재하지 않으면
     * @throws BookNotFoundException 책이 존재하지 않으면
     * @throws BookNotAvailableException 책이 대출 가능하지 않으면
     * @throws LoanLimitExceededException 대출 한도 초과 시
     */
    Loan borrowBook(MemberId memberId, ISBN isbn);

    /**
     * 책을 반납한다.
     *
     * @param loanId 반납할 대출 ID
     * @throws LoanNotFoundException 대출이 존재하지 않으면
     * @throws LoanAlreadyReturnedException 이미 반납된 경우
     */
    void returnBook(LoanId loanId);
}

// 구현
public class LoanServiceImpl implements LoanService {
    private final MemberRepository memberRepository;
    private final BookRepository bookRepository;
    private final LoanRepository loanRepository;

    @Override
    @Transactional
    public Loan borrowBook(MemberId memberId, ISBN isbn) {
        Member member = memberRepository.findById(memberId)
            .orElseThrow(() -> new MemberNotFoundException(memberId));

        Book book = bookRepository.findByIsbn(isbn)
            .orElseThrow(() -> new BookNotFoundException(isbn));

        if (!book.isAvailable()) {
            throw new BookNotAvailableException(isbn);
        }

        if (member.getActiveLoanCount() >= MAX_LOANS) {
            throw new LoanLimitExceededException(memberId);
        }

        Loan loan = Loan.create(member, book);
        book.markAsBorrowed();

        return loanRepository.save(loan);
    }
}
```

## 매크로 프로세스

### 프로젝트 수준 활동

**매크로 프로세스**: 프로젝트 전체의 계획과 제어 (월별/분기별).

| 단계 | 명칭 |
|------|------|
| 1 | 개념화 (Conceptualization) |
| 2 | 분석 (Analysis) |
| 3 | 설계 (Design) |
| 4 | 진화 (Evolution) |
| 5 | 유지보수 (Maintenance) |

### 개념화 단계

**개념화**: 프로젝트의 핵심 비전 수립. 기간은 프로젝트의 5-10%.

| 구분 | 내용 |
|------|------|
| 활동 | 비즈니스 문제 이해, 핵심 요구사항 식별, 기술적 타당성 검토, 초기 아키텍처 스케치, 위험 평가 |
| 산출물 | 비전 문서, 초기 유스케이스, 핵심 추상화 목록, 프로토타입(선택) |

### 분석 단계

**분석**: 문제 도메인의 이해. 기간은 프로젝트의 10-20%.

| 구분 | 내용 |
|------|------|
| 활동 | 도메인 모델 작성, 유스케이스 상세화, 핵심 클래스 식별, 시나리오 분석, 아키텍처 비전 수립 |
| 산출물 | 도메인 모델, 유스케이스 명세, 분석 클래스 다이어그램, 시퀀스 다이어그램(핵심 시나리오) |

**분석의 초점**: "시스템이 **무엇**을 해야 하는가" (어떻게가 아님).

| 핵심 질문 |
|----------|
| 주요 액터는 누구인가? |
| 시스템이 제공해야 하는 가치는? |
| 핵심 비즈니스 규칙은? |
| 도메인의 주요 개념은? |

### 설계 단계

**설계**: 솔루션 구조 결정. 기간은 프로젝트의 15-25%.

| 구분 | 내용 |
|------|------|
| 활동 | 아키텍처 설계, 서브시스템 분해, 클래스 설계, 인터페이스 정의, 메커니즘 설계 |
| 산출물 | 아키텍처 문서, 설계 클래스 다이어그램, 시퀀스 다이어그램(상세), 상태 다이어그램, 컴포넌트 다이어그램 |

**설계의 초점**: "시스템을 **어떻게** 구축할 것인가".

| 핵심 결정 |
|----------|
| 계층 구조는? |
| 핵심 메커니즘은? (영속성, 보안, 트랜잭션) |
| 인터페이스 경계는? |
| 재사용 전략은? |
| 기술 선택은? |

### 진화 단계

**진화**: 점진적 구현과 검증. 기간은 프로젝트의 40-60%.

| 구분 | 내용 |
|------|------|
| 활동 | 반복 계획, 코드 구현, 단위 테스트, 통합 테스트, 리팩터링, 사용자 검증 |
| 산출물 | 동작하는 소프트웨어, 테스트 스위트, 사용자 문서, 배포 패키지 |

**반복 (Iteration) 구조**: 한 반복 = 2-6주.

| 활동 | 내용 |
|------|------|
| 계획 | 이번 반복의 목표 |
| 구현 | 설계 → 코드 → 테스트 |
| 평가 | 목표 달성 검증 |
| 조정 | 다음 반복 계획 수정 |

| 반복 결과 |
|----------|
| 동작하는 증분 (increment) |
| 사용자 피드백 |
| 교훈 (lessons learned) |

### 유지보수 단계

**유지보수**: 운영 중인 시스템 관리. 기간은 시스템 수명의 대부분.

| 유형 | 설명 |
|------|------|
| 수정적 (Corrective) | 결함 수정 |
| 적응적 (Adaptive) | 환경 변화 대응 |
| 완전적 (Perfective) | 기능/성능 개선 |
| 예방적 (Preventive) | 미래 문제 예방 |

| 활동 |
|------|
| 버그 수정, 성능 개선, 새 기능 추가, 기술 부채 해소, 문서 갱신 |

## 반복적 개발의 실제

### 반복 계획

| 단계 | 활동 |
|------|------|
| 릴리스 목표 정의 | 어떤 기능을 포함할 것인가, 품질 목표는 무엇인가 |
| 반복 분해 | 몇 번의 반복으로 나눌 것인가, 각 반복의 목표는 무엇인가 |
| 위험 기반 우선순위 | 기술적 위험이 높은 것 먼저, 아키텍처적으로 중요한 것 먼저 |
| 자원 할당 | 누가 무엇을 할 것인가, 의존성은 무엇인가 |

| 우선순위 | 기능 |
|---------|------|
| 높음 | 아키텍처를 확립하는 기능, 기술적 위험이 높은 기능, 핵심 비즈니스 가치 기능, 다른 기능의 선행 조건 |
| 낮음 | 독립적인 기능, 기술적 위험이 낮은 기능, 부가적 가치 기능, UI 꾸미기, 최적화 |

### 위험 관리

| 위험 유형 | 예 |
|----------|-----|
| 기술적 | 새로운 기술 사용, 성능 요구사항, 통합 복잡성, 확장성 |
| 일정 | 요구사항 불명확, 리소스 부족, 의존성 지연, 범위 확장 |
| 비즈니스 | 요구사항 변경, 시장 변화, 자금 문제, 경쟁자 |

| 위험 대응 | 설명 |
|----------|------|
| 회피 | 위험을 제거하는 방향으로 설계 |
| 완화 | 위험의 영향을 줄이는 조치 |
| 전가 | 다른 주체에게 위험 이전 |
| 수용 | 위험을 인지하고 대비 |

### 이정표와 검토

| 이정표 | 검증 질문 |
|--------|----------|
| 개념화 완료 | 비전이 명확한가, 이해관계자 합의가 있는가, 진행할 가치가 있는가 |
| 아키텍처 확립 | 핵심 아키텍처가 검증되었는가, 주요 위험이 해소되었는가, 일정 예측이 가능한가 |
| 초기 운영 능력 | 핵심 기능이 동작하는가, 사용자 테스트가 가능한가, 배포 준비가 되었는가 |
| 릴리스 | 모든 기능이 완성되었는가, 품질 기준을 충족하는가, 문서가 완성되었는가 |

## 프로세스 조정

### 프로젝트 특성에 따른 조정

| 프로젝트 크기 | 특성 |
|-------------|------|
| 소규모 (1-5명) | 가벼운 문서화, 비공식적 의사소통, 짧은 반복(1-2주) |
| 중규모 (5-20명) | 적절한 문서화, 정기적 회의, 반복(2-4주) |
| 대규모 (20명+) | 상세한 문서화, 공식적 프로세스, 팀 간 조율, 반복(4-6주) |

| 도메인 특성 | 접근법 |
|------------|--------|
| 익숙한 도메인 | 분석 단계 축소, 재사용 강조 |
| 새로운 도메인 | 분석 단계 확대, 프로토타이핑 강조 |

### 애자일과의 관계

Booch의 프로세스(1990년대)와 애자일(2001년 선언문)은 같은 뿌리에서 나왔습니다.

| 비교 | Booch 프로세스 | 애자일 |
|------|---------------|--------|
| 공통점 | 반복적 개발, 점진적 전달, 변화 수용, 팀 협업 | (동일) |
| 차이점 | 아키텍처와 모델링 강조 | 개인과 상호작용, 작동하는 소프트웨어 강조 |

**실무에서의 통합**: 둘은 대립이 아니라 *보완*입니다.

| 상황 | 접근법 |
|------|--------|
| 아키텍처 불확실 | 초기에 *아키텍처 스파이크*(기술 검증 반복) 후 스프린트 시작 |
| 복잡한 도메인 | 스프린트 전 *모델링 세션*으로 도메인 이해 공유 |
| 대규모 팀 | Booch의 매크로 프로세스 + 팀별 스크럼 |

## 자주 하는 실수

프로세스 적용 시 흔히 빠지는 함정입니다.

| 실수 | 증상 | 해결 |
|------|------|------|
| **프로세스 과잉** | 문서 작성이 코딩보다 많음, 회의가 업무 시간의 절반 | "이 산출물이 정말 필요한가?" 자문, 가치 있는 것만 남김 |
| **프로세스 부재** | "일단 코딩해봐", 방향 없는 개발 | 최소한의 반복 구조(목표 → 구현 → 검증) 도입 |
| **빅뱅 통합** | 반복 끝에 모든 것을 한꺼번에 통합 | 매일 통합, CI/CD 도입 |
| **위험 후순위** | 쉬운 것부터 구현, 어려운 건 나중에 | 기술적 위험이 높은 것 먼저 |
| **아키텍처 무시** | "나중에 리팩터링하면 돼" | 초기 반복에서 핵심 아키텍처 확립 |
| **피드백 무시** | 반복마다 기능은 추가하지만 검토는 안 함 | 반복 끝 회고, 사용자 피드백 수집 의무화 |
| **반복 = 폭포수 축소** | 4주 반복 안에서 1주 분석, 1주 설계, 1주 구현, 1주 테스트 | 매일 분석·설계·구현·테스트가 섞여야 함 |

**핵심 원칙**: 프로세스는 *목적*이 아니라 *수단*입니다. 더 좋은 소프트웨어를 더 예측 가능하게 만들기 위한 것입니다. 프로세스가 이 목적에 기여하지 않으면 바꿔야 합니다.

## 정리

마이크로 프로세스 (일상):
- **클래스/객체 식별**: 명사 추출, CRC, 도메인 모델링
- **의미론 식별**: 속성, 연산, 불변식, 상태
- **관계 식별**: 연관, 집합, 상속, 의존
- **인터페이스/구현**: API 명세, 코드 작성

매크로 프로세스 (프로젝트):
- **개념화**: 비전 수립, 초기 아키텍처
- **분석**: 도메인 모델, 유스케이스
- **설계**: 아키텍처, 클래스 설계
- **진화**: 반복적 구현, 검증
- **유지보수**: 운영, 개선

핵심 원칙:
- **반복적**: 피드백 기반 점진적 정제
- **위험 주도**: 높은 위험 먼저 해결
- **아키텍처 중심**: 초기에 구조 확립

## 다음 장 예고

Chapter 7에서는 **실무**를 다룬다. 팀 관리, 릴리스 계획, 재사용, 품질 보증 등 프로젝트 성공을 위한 실무적 고려사항.

## 관련 항목

- [Ch 5: Notation](/blog/programming/design/ooad/chapter05-notation) — 표기법
- [Ch 7: Pragmatics](/blog/programming/design/ooad/chapter07-pragmatics) — 실무
- [OOSC Ch 28: The Software Construction Process](/blog/programming/design/oosc/chapter28-the-software-construction-process) — 구축 프로세스

