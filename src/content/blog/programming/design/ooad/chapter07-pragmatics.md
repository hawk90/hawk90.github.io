---
title: "Ch 7: Pragmatics"
date: 2026-05-19T07:00:00
description: "실무 — 팀 관리, 릴리스 계획, 재사용, 품질 보증."
series: "Object-Oriented Analysis and Design with Applications"
seriesOrder: 7
tags: [oop, booch, pragmatics, team, quality, reuse]
draft: false
type: book-review
bookTitle: "Object-Oriented Analysis and Design with Applications"
bookAuthor: "Grady Booch"
---

## 한 줄 요약

> 좋은 설계만으로는 부족하다. **팀 조직**, **재사용 전략**, **품질 보증**, **문서화**가 프로젝트 성공을 결정한다.

## 팀 관리

### 팀 구성

| 역할 | 책임 |
|------|------|
| 프로젝트 관리자 | 일정, 예산, 자원 관리. 이해관계자 의사소통. 위험 관리 |
| 아키텍트 | 전체 아키텍처 설계. 기술 결정. 품질 속성 보장 |
| 분석가 | 요구사항 수집. 도메인 모델링. 유스케이스 작성 |
| 설계자 | 클래스 설계. 메커니즘 설계. 인터페이스 정의 |
| 개발자 | 코드 구현. 단위 테스트. 리팩터링 |
| 테스터 | 테스트 계획. 테스트 실행. 결함 보고 |

### 팀 크기와 구조

| 팀 크기 | 구조 | 장점/과제 |
|---------|------|----------|
| 작은 팀 (2-5명) | 플랫 구조, 역할 중첩 가능, 전문가 팀 | 의사소통 오버헤드 적음, 빠른 의사결정, 높은 응집력 |
| 수술팀 | 수석 프로그래머 + 부 프로그래머 + 전문가들 | 일관된 비전, 의사소통 단순화, 명확한 책임 |
| 대규모 팀 | 계층적 조직, 서브시스템별 팀, 통합 팀 | 과제: 의사소통 경로 관리, 인터페이스 계약, 통합 계획 |

### 의사소통

**의사소통 경로**: n명의 팀 → n(n-1)/2 경로.

| 팀 규모 | 경로 수 |
|---------|--------|
| 5명 | 10 |
| 10명 | 45 |
| 20명 | 190 |

| 의사소통 전략 | 내용 |
|--------------|------|
| 정기 회의 | 짧고 집중된 회의, 명확한 아젠다, 결정 사항 기록 |
| 비동기 의사소통 | 문서화된 결정, 코드 리뷰, 이슈 트래커 |
| 아키텍처 문서 | 공유된 비전, 인터페이스 계약, 설계 결정 근거 |

## 릴리스 계획

### 릴리스 전략

| 릴리스 유형 | 특성 |
|------------|------|
| 내부 릴리스 | 팀 내부용, 통합 테스트, 데모/검토 |
| 알파 릴리스 | 기능 완료, 내부 테스트 중, 알려진 결함 존재 |
| 베타 릴리스 | 외부 테스터 참여, 결함 수정 중, 피드백 수집 |
| 정식 릴리스 | 품질 기준 충족, 문서 완료, 지원 준비 완료 |

### 버전 관리

**버전 번호 체계**: Major.Minor.Patch

| 버전 | 변경 예 | 내용 |
|------|--------|------|
| Major | 1.0.0 → 2.0.0 | 호환성 깨지는 변경, 주요 기능 추가, 아키텍처 변경 |
| Minor | 1.0.0 → 1.1.0 | 기능 추가, 하위 호환 유지, 개선 사항 |
| Patch | 1.0.0 → 1.0.1 | 버그 수정, 보안 패치, 성능 개선 |

### 형상 관리

| 형상 관리 요소 |
|---------------|
| 소스 코드, 빌드 스크립트, 테스트 코드, 문서, 설정 파일, 의존성 명세 |

| 브랜치 | 용도 |
|--------|------|
| main/master | 릴리스 가능 상태 |
| develop | 개발 통합 브랜치 |
| feature/* | 기능 개발 |
| release/* | 릴리스 준비 |
| hotfix/* | 긴급 수정 |

| 커밋 규칙 |
|----------|
| 작은 단위로 자주, 의미 있는 메시지, 동작하는 상태 유지, 리뷰 후 병합 |

## 재사용

### 재사용의 수준

| 재사용 수준 | 예 |
|------------|-----|
| 코드 재사용 | 복사/붙여넣기(나쁨), 라이브러리/프레임워크(좋음), 공유 컴포넌트(좋음) |
| 설계 재사용 | 디자인 패턴, 아키텍처 패턴, 참조 아키텍처 |
| 분석 재사용 | 도메인 모델, 유스케이스 템플릿, 비즈니스 규칙 |

### 재사용을 위한 설계

| 특성 | 설명 |
|------|------|
| 일반성 (Generality) | 특정 맥락에 종속되지 않음, 설정 가능한 동작, 확장 포인트 제공 |
| 완전성 (Completeness) | 독립적으로 동작 가능, 명확한 인터페이스, 충분한 기능 |
| 단순성 (Simplicity) | 이해하기 쉬움, 사용하기 쉬움, 불필요한 복잡성 배제 |
| 문서화 (Documentation) | 사용법 명확, 예제 제공, 제약사항 명시 |

```java
// 재사용 가능한 설계 예시

// 나쁜 예: 특정 맥락에 종속
public class OrderValidator {
    public boolean validate(Order order) {
        // 하드코딩된 규칙들
        if (order.getTotal() > 10000) return false;
        if (order.getItems().size() > 100) return false;
        // ...
    }
}

// 좋은 예: 일반적이고 설정 가능
public interface ValidationRule<T> {
    boolean validate(T target);
    String getErrorMessage();
}

public class Validator<T> {
    private final List<ValidationRule<T>> rules = new ArrayList<>();

    public Validator<T> addRule(ValidationRule<T> rule) {
        rules.add(rule);
        return this;
    }

    public ValidationResult validate(T target) {
        List<String> errors = rules.stream()
            .filter(rule -> !rule.validate(target))
            .map(ValidationRule::getErrorMessage)
            .collect(Collectors.toList());
        return new ValidationResult(errors.isEmpty(), errors);
    }
}

// 사용
Validator<Order> orderValidator = new Validator<Order>()
    .addRule(new MaxTotalRule(10000))
    .addRule(new MaxItemsRule(100))
    .addRule(new RequiredFieldsRule());
```

### 프레임워크 vs 라이브러리

| 유형 | 특성 | 예 |
|------|------|-----|
| 라이브러리 | 사용자가 제어 흐름 결정, 필요할 때 호출, 기능 모음 | Apache Commons, Guava, Lodash |
| 프레임워크 | 프레임워크가 제어 흐름 결정, 확장 포인트 제공, "Don't call us, we'll call you" | Spring, Django, Ruby on Rails |

| 선택 기준 |
|----------|
| 라이브러리: 부분적 기능 필요, 제어 유지 |
| 프레임워크: 전체 구조 필요, 일관성 우선 |

## 품질 보증

### 품질 속성

| 품질 유형 | 속성 |
|----------|------|
| 외부 품질 (사용자 관점) | 기능성(요구사항 충족), 신뢰성(결함 없이 동작), 사용성(쉽게 사용), 효율성(빠르게 동작), 보안성(안전하게 동작) |
| 내부 품질 (개발자 관점) | 유지보수성(수정 용이), 테스트 가능성(검증 용이), 이식성(환경 독립적), 재사용성(다른 맥락에서 사용) |

### 품질 활동

| 품질 활동 | 예 |
|----------|-----|
| 예방 | 코딩 표준, 설계 리뷰, 정적 분석, 페어 프로그래밍 |
| 검출 | 코드 리뷰, 단위 테스트, 통합 테스트, 시스템 테스트, 성능 테스트 |
| 측정 | 코드 커버리지, 결함 밀도, 복잡도 메트릭, 기술 부채 |

### 테스트 전략

| 테스트 수준 | 범위 | 특성 |
|------------|------|------|
| 단위 테스트 | 개별 클래스/메서드 | 개발자 작성, 빠른 피드백, 자동화 필수 |
| 통합 테스트 | 컴포넌트 간 상호작용 | 인터페이스 검증, 외부 의존성 포함 |
| 시스템 테스트 | 전체 시스템 | 요구사항 기반, 사용자 시나리오 |
| 인수 테스트 | 비즈니스 관점 | 사용자/고객 참여, 릴리스 결정 |

```java
// 테스트 예시

// 단위 테스트
public class OrderTest {
    @Test
    void addItem_shouldIncreaseTotal() {
        // Arrange
        Order order = new Order();
        Product product = new Product("Widget", Money.of(100));

        // Act
        order.addItem(product, 2);

        // Assert
        assertEquals(Money.of(200), order.getTotal());
    }

    @Test
    void cancel_whenShipped_shouldThrowException() {
        // Arrange
        Order order = createShippedOrder();

        // Act & Assert
        assertThrows(IllegalStateException.class, order::cancel);
    }
}

// 통합 테스트
@SpringBootTest
public class OrderServiceIntegrationTest {
    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void createOrder_shouldPersistOrder() {
        // Arrange
        CreateOrderRequest request = createValidRequest();

        // Act
        OrderDto result = orderService.createOrder(request);

        // Assert
        Optional<Order> saved = orderRepository.findById(result.getId());
        assertTrue(saved.isPresent());
        assertEquals(request.getCustomerId(), saved.get().getCustomerId());
    }
}
```

### 코드 리뷰

| 코드 리뷰 목적 |
|---------------|
| 결함 발견, 지식 공유, 일관성 유지, 멘토링 |

| 리뷰 체크리스트 | 항목 |
|---------------|------|
| 설계 | 단일 책임 준수, 적절한 추상화 수준, 의존성 방향 올바름 |
| 구현 | 읽기 쉬운 코드, 에러 처리 적절, 성능 고려 |
| 테스트 | 테스트 존재, 경계 조건 테스트, 가독성 있는 테스트 |

| 리뷰 에티켓 |
|------------|
| 코드를 비판, 사람을 비판하지 않음 |
| 제안은 구체적으로 |
| 좋은 점도 언급 |
| 토론은 건설적으로 |

## 문서화

### 문서 유형

| 문서 유형 | 예 |
|----------|-----|
| 사용자 문서 | 사용자 가이드, 튜토리얼, FAQ, 릴리스 노트 |
| 개발자 문서 | API 문서, 아키텍처 문서, 설계 문서, 코드 주석 |
| 프로젝트 문서 | 요구사항 명세, 프로젝트 계획, 회의록, 결정 로그 |

### 효과적인 문서화

| 좋은 문서 특성 | 설명 |
|---------------|------|
| 목적 명확 | 누구를 위한 것인가, 무엇을 설명하는가 |
| 최신 상태 유지 | 코드와 동기화, 정기적 갱신, 자동화 가능한 것은 자동화 |
| 접근 가능 | 찾기 쉬움, 구조화됨, 검색 가능 |
| 적절한 수준 | 너무 상세하지 않게, 너무 추상적이지 않게 |

```java
// API 문서 예시 (Javadoc)

/**
 * 주문을 생성하고 처리합니다.
 *
 * <p>이 서비스는 다음 단계를 수행합니다:</p>
 * <ol>
 *   <li>재고 확인</li>
 *   <li>결제 승인</li>
 *   <li>주문 저장</li>
 *   <li>확인 이메일 발송</li>
 * </ol>
 *
 * <p>사용 예:</p>
 * <pre>{@code
 * OrderService service = new OrderServiceImpl(repo, payment, email);
 * CreateOrderRequest request = CreateOrderRequest.builder()
 *     .customerId(customerId)
 *     .items(items)
 *     .build();
 * OrderDto order = service.createOrder(request);
 * }</pre>
 *
 * @param request 주문 생성 요청
 * @return 생성된 주문 정보
 * @throws OutOfStockException 재고가 부족한 경우
 * @throws PaymentFailedException 결제가 실패한 경우
 * @see Order
 * @see CreateOrderRequest
 * @since 1.0
 */
public OrderDto createOrder(CreateOrderRequest request);
```

### 아키텍처 문서

| 아키텍처 문서 | 내용 |
|--------------|------|
| 맥락 | 시스템 범위, 외부 시스템, 이해관계자 |
| 아키텍처 결정 | 주요 결정 사항, 결정의 근거, 고려한 대안 |
| 뷰 | 논리적 뷰(클래스, 패키지), 프로세스 뷰(동시성, 배포), 개발 뷰(모듈, 빌드), 물리적 뷰(하드웨어, 네트워크) |
| 품질 속성 | 성능 목표, 확장성 계획, 보안 요구사항 |

## 정리

팀 관리:
- **역할 정의**: 아키텍트, 분석가, 설계자, 개발자, 테스터
- **팀 구조**: 규모에 맞는 조직, 의사소통 관리
- **의사소통**: 정기 회의, 문서화, 코드 리뷰

릴리스:
- **버전 관리**: Semantic Versioning
- **형상 관리**: 브랜치 전략, 커밋 규칙
- **릴리스 단계**: 알파, 베타, 정식

재사용:
- **수준**: 코드, 설계, 분석
- **설계 원칙**: 일반성, 완전성, 단순성
- **프레임워크 vs 라이브러리**: 제어의 역전

품질:
- **품질 속성**: 외부(사용자) vs 내부(개발자)
- **활동**: 예방, 검출, 측정
- **테스트**: 단위, 통합, 시스템, 인수

문서화:
- **유형**: 사용자, 개발자, 프로젝트
- **원칙**: 목적 명확, 최신 유지, 적절한 수준

## 다음 장 예고

Chapter 8부터는 **케이스 스터디**를 다룬다. 첫 번째는 위성 기반 항법 시스템 — 실시간, 분산, 안전 중시 시스템 아키텍처.

## 관련 항목

- [Ch 6: Process](/blog/programming/design/ooad/chapter06-process) — 프로세스
- [Ch 8: Satellite-Based Navigation](/blog/programming/design/ooad/chapter08-satellite-based-navigation) — 케이스 스터디
- [OOSC Ch 29: Teaching the Method](/blog/programming/design/oosc/chapter29-teaching-the-method) — 방법론 교육

