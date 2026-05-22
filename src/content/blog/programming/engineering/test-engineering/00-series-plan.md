---
title: "Practical Test Engineering - Series Plan"
date: 2026-05-22T00:00:00
description: "테스트 설계 실무 시리즈 기획안"
series: "Practical Test Engineering"
seriesOrder: 0
tags: [testing, planning]
draft: true
---

# Practical Test Engineering 시리즈 기획

## 시리즈 개요

**목표**: 테스트 전략 수립부터 임베디드 환경까지, 실무에서 바로 적용할 수 있는 테스트 설계 가이드

**대상 독자**:
- 테스트 코드를 작성하지만 체계가 부족한 개발자
- 테스트 커버리지는 높은데 버그가 계속 나오는 팀
- 임베디드 환경에서 테스트 자동화를 고민하는 엔지니어

**톤**: Tone A (`~합니다` 친근체)

**분량**: 15-17개 챕터, 파트당 5-6개

---

## Part 1: 테스트 전략 (Test Strategy)

테스트 레벨 선택, 커버리지 전략, 우선순위 결정의 원칙.

### Ch 1: 테스트 레벨의 트레이드오프

**핵심 질문**: 단위/통합/E2E 중 어디에 투자할 것인가?

**다룰 내용**:
- 테스트 피라미드의 원래 의미 (Mike Cohn)
- 피라미드가 깨지는 경우 (프론트엔드, 레거시)
- 트로피 모델 (Kent C. Dodds) — 통합 테스트 중심
- 다이아몬드, 역피라미드 — 안티패턴인가?
- 의사결정 프레임워크: 변경 빈도 × 실패 비용 × 피드백 속도

**예시**:
- CRUD API → 통합 테스트 위주
- 복잡한 계산 로직 → 단위 테스트 위주
- 결제 흐름 → E2E 필수

**TikZ 다이어그램**:
- 테스트 피라미드 vs 트로피 vs 다이아몬드 비교

---

### Ch 2: 단위 테스트의 경계

**핵심 질문**: "단위"란 무엇인가? 함수? 클래스? 모듈?

**다룰 내용**:
- 고전파 vs 런던파 (Classical vs Mockist)
  - 고전파: 실제 협력자 사용, 공유 의존성만 격리
  - 런던파: 모든 협력자를 목으로
- 사회적 단위 vs 고독한 단위 (Sociable vs Solitary)
- 행위 검증 vs 상태 검증
- 언제 목을 쓰고, 언제 실제 객체를 쓰는가
- 과도한 목킹의 문제 — 구현에 결합된 테스트

**예시 (Python)**:
```python
# 고전파: 실제 Repository 사용
def test_order_total():
    repo = InMemoryOrderRepository()
    service = OrderService(repo)
    ...

# 런던파: Repository를 목으로
def test_order_total():
    mock_repo = Mock(spec=OrderRepository)
    service = OrderService(mock_repo)
    ...
```

**관련 자료**:
- Vladimir Khorikov, "Unit Testing Principles, Practices, and Patterns"
- Martin Fowler, "Mocks Aren't Stubs"

---

### Ch 3: 통합 테스트의 범위

**핵심 질문**: 어디까지 통합하고, 어디서 끊을 것인가?

**다룰 내용**:
- 좁은 통합 테스트 vs 넓은 통합 테스트
- 컴포넌트 테스트 (단일 서비스 + 실제 DB)
- 계약 테스트 (Pact, Spring Cloud Contract)
- 테스트 컨테이너 (Testcontainers) 활용
- 외부 서비스 경계: 실제 호출 vs 목 vs 샌드박스
- 통합 테스트의 속도 문제와 해결책

**예시**:
- DB 통합: SQLite in-memory vs Testcontainers PostgreSQL
- HTTP 통합: WireMock vs 실제 스테이징 서버
- 메시지 큐: 임베디드 Kafka vs 목

**TikZ 다이어그램**:
- 통합 테스트 경계 다이어그램 (어디서 끊는가)

---

### Ch 4: E2E 테스트의 전략적 사용

**핵심 질문**: E2E는 언제, 얼마나 작성하는가?

**다룰 내용**:
- E2E의 비용: 느림, 불안정, 디버깅 어려움
- E2E의 가치: 실제 사용자 시나리오 검증
- 스모크 테스트 vs 전체 회귀 테스트
- 핵심 경로(Critical Path)만 E2E로
- Flaky 테스트 관리 전략
- 테스트 환경 관리 (테스트 데이터, 격리)

**예시**:
- 이커머스: 회원가입 → 상품검색 → 장바구니 → 결제 (핵심 경로)
- 나머지 시나리오는 통합/단위로

**관련 개념**:
- Page Object Pattern
- Screenplay Pattern
- 테스트 데이터 빌더

---

### Ch 5: 커버리지 전략

**핵심 질문**: 커버리지 100%가 목표인가?

**다룰 내용**:
- 라인 커버리지의 한계
- 브랜치 커버리지 (조건 분기)
- 상태 커버리지 (Tip 92 연결)
- MC/DC (임베디드/항공 표준)
- 뮤테이션 테스트 — 테스트의 품질 측정
- 커버리지 목표 설정: 80%? 90%? 문맥에 따라

**예시**:
```python
# 라인 커버리지 100%지만 버그 있음
def abs(x):
    if x >= 0:
        return x
    return x  # 버그: -x여야 함

def test_abs():
    assert abs(1) == 1
    assert abs(-1) == -1  # 실패해야 하는데 라인은 커버됨
```

**도구**:
- Python: coverage.py, mutmut
- C/C++: gcov, lcov, LLVM coverage
- 뮤테이션: mutpy, pitest

---

### Ch 6: 테스트 우선순위

**핵심 질문**: 시간이 부족할 때 무엇을 먼저 테스트하는가?

**다룰 내용**:
- 리스크 기반 테스트 (Risk-Based Testing)
- 변경 빈도 × 실패 영향 매트릭스
- 핵심 비즈니스 로직 우선
- 버그 다발 지역 (Bug Cluster) 집중
- 레거시 코드: 변경할 부분만 테스트 추가
- 시간 제약 하의 테스트 전략

**의사결정 프레임워크**:

| 변경 빈도 | 실패 영향 | 우선순위 |
|----------|----------|----------|
| 높음 | 높음 | 최우선 |
| 높음 | 낮음 | 중간 |
| 낮음 | 높음 | 중간 |
| 낮음 | 낮음 | 낮음 |

---

## Part 2: 테스트 아키텍처 (Test Architecture)

테스트 코드의 설계, 구조, 유지보수성.

### Ch 7: 테스트 더블의 종류와 선택

**핵심 질문**: Mock, Stub, Fake, Spy — 언제 무엇을 쓰는가?

**다룰 내용**:
- Gerard Meszaros의 분류
  - Dummy: 전달만 되고 사용 안 됨
  - Stub: 미리 정해진 값 반환
  - Spy: 호출 기록
  - Mock: 기대값 검증
  - Fake: 동작하는 경량 구현
- 언제 Fake가 Mock보다 나은가
- Mock 라이브러리 vs 수동 구현
- 과도한 Mock의 문제

**예시 (Python)**:
```python
# Stub
class StubEmailSender:
    def send(self, to, subject, body):
        pass  # 아무것도 안 함

# Fake
class FakeEmailSender:
    def __init__(self):
        self.sent = []

    def send(self, to, subject, body):
        self.sent.append((to, subject, body))

# Mock (with library)
mock_sender = Mock(spec=EmailSender)
mock_sender.send.assert_called_once_with(...)
```

**TikZ 다이어그램**:
- 테스트 더블 분류 다이어그램

---

### Ch 8: 픽스처와 팩토리 설계

**핵심 질문**: 테스트 데이터를 어떻게 관리하는가?

**다룰 내용**:
- 픽스처의 종류: 인라인, 공유, 외부 파일
- Object Mother 패턴
- Test Data Builder 패턴
- Factory 함수 vs Builder 클래스
- 픽스처 오염 방지 (테스트 격리)
- 대용량 테스트 데이터 관리

**예시 (Python)**:
```python
# Object Mother
class UserMother:
    @staticmethod
    def admin():
        return User(role="admin", name="Admin User")

    @staticmethod
    def guest():
        return User(role="guest", name="Guest")

# Test Data Builder
class UserBuilder:
    def __init__(self):
        self._role = "user"
        self._name = "Default"

    def with_role(self, role):
        self._role = role
        return self

    def with_name(self, name):
        self._name = name
        return self

    def build(self):
        return User(role=self._role, name=self._name)

# 사용
user = UserBuilder().with_role("admin").with_name("Alice").build()
```

---

### Ch 9: 테스트 격리와 병렬화

**핵심 질문**: 테스트가 서로 영향을 주지 않으려면?

**다룰 내용**:
- 테스트 격리의 원칙
- 공유 상태의 위험 (전역 변수, 싱글턴, DB)
- 테스트 순서 의존성 탐지
- 트랜잭션 롤백 전략
- 테스트 병렬화의 이점과 주의점
- pytest-xdist, JUnit 병렬 실행

**예시**:
```python
# 나쁜 예: 공유 상태
counter = 0

def test_increment():
    global counter
    counter += 1
    assert counter == 1  # 다른 테스트가 먼저 실행되면 실패

# 좋은 예: 격리된 상태
def test_increment():
    counter = Counter()
    counter.increment()
    assert counter.value == 1
```

---

### Ch 10: 테스트 가능한 설계

**핵심 질문**: 테스트하기 쉬운 코드는 어떤 구조인가?

**다룰 내용**:
- 의존성 주입 (DI)
- 순수 함수와 부작용 분리
- 포트와 어댑터 (Hexagonal Architecture)
- 시간/랜덤의 주입
- 파일 시스템/네트워크 추상화
- 테스트 불가능한 코드의 징후

**예시**:
```python
# 테스트 어려움: 숨겨진 의존성
def process_order(order_id):
    order = Database.get_order(order_id)  # 전역 DB
    if datetime.now() > order.deadline:   # 현재 시간
        ...

# 테스트 쉬움: 명시적 의존성
def process_order(order_id, db, clock):
    order = db.get_order(order_id)
    if clock.now() > order.deadline:
        ...
```

**관련 개념**:
- Humble Object Pattern
- Functional Core, Imperative Shell

---

### Ch 11: 테스트 구조와 가독성

**핵심 질문**: 테스트 코드도 유지보수 대상이다

**다룰 내용**:
- AAA 패턴 (Arrange-Act-Assert)
- Given-When-Then (BDD 스타일)
- 테스트 이름 짓기
- 한 테스트에 하나의 검증 (vs 논리적 단위)
- 테스트 헬퍼 추출
- 테스트 코드 리팩터링

**예시**:
```python
# 좋은 테스트 이름
def test_order_total_includes_shipping_when_below_threshold():
    ...

def test_order_total_excludes_shipping_when_above_threshold():
    ...

# 나쁜 테스트 이름
def test_order():
    ...

def test_order2():
    ...
```

---

### Ch 12: 테스트 안티패턴

**핵심 질문**: 피해야 할 테스트 패턴은 무엇인가?

**다룰 내용**:
- Ice Cream Cone (역피라미드)
- Flaky Tests (불안정한 테스트)
- Liar Tests (항상 통과하는 무의미한 테스트)
- Excessive Setup (과도한 설정)
- Test Logic (테스트 안의 조건문/반복문)
- Hidden Dependencies (숨겨진 의존성)
- Shared State (공유 상태)

**각 안티패턴별**:
- 증상
- 원인
- 해결책
- 예시

---

## Part 3: 임베디드 테스트 (Embedded Testing)

하드웨어 의존성, 실시간 제약, 제한된 자원 환경에서의 테스트.

### Ch 13: 호스트 vs 타겟 테스트

**핵심 질문**: 개발 PC에서 테스트할 것인가, 실제 보드에서 테스트할 것인가?

**다룰 내용**:
- 테스트 실행 환경의 선택
  - 호스트 (개발 PC): 빠름, 디버깅 쉬움
  - 타겟 (실제 보드): 정확함, 느림
  - 에뮬레이터/시뮬레이터: 중간
- 듀얼 타겟팅 전략
- 아키텍처 차이 주의 (엔디안, 워드 크기, 정렬)
- 크로스 컴파일 테스트 환경 구축

**전략**:
```
비즈니스 로직 → 호스트에서 단위 테스트
HAL 계층 → 타겟에서 통합 테스트
전체 시스템 → 타겟에서 E2E 테스트
```

**TikZ 다이어그램**:
- 호스트/타겟 테스트 분리 아키텍처

---

### Ch 14: 하드웨어 추상화 계층 (HAL)

**핵심 질문**: 하드웨어 의존성을 어떻게 격리하는가?

**다룰 내용**:
- HAL의 설계 원칙
- 인터페이스 추출
- 목 HAL 구현
- 레지스터 접근 추상화
- 인터럽트 핸들러 테스트
- DMA, 타이머 추상화

**예시 (C)**:
```c
// HAL 인터페이스
typedef struct {
    void (*write)(uint8_t data);
    uint8_t (*read)(void);
    bool (*is_ready)(void);
} UartHal;

// 실제 구현
void uart_hw_write(uint8_t data) {
    UART0->DR = data;
}

// 목 구현
static uint8_t mock_buffer[256];
static int mock_index = 0;

void uart_mock_write(uint8_t data) {
    mock_buffer[mock_index++] = data;
}
```

---

### Ch 15: 인터럽트와 타이밍 테스트

**핵심 질문**: 비동기 이벤트와 타이밍을 어떻게 테스트하는가?

**다룰 내용**:
- 인터럽트 핸들러 테스트 전략
- 타이밍 의존 코드 테스트
- 시간 추상화 (가짜 시계)
- 레이스 컨디션 탐지
- 워치독 테스트
- 타임아웃 테스트

**예시 (C)**:
```c
// 시간 추상화
typedef uint32_t (*GetTickFn)(void);

// 실제
uint32_t get_system_tick(void) {
    return SysTick->VAL;
}

// 테스트용
static uint32_t fake_tick = 0;
uint32_t get_fake_tick(void) {
    return fake_tick;
}

void advance_fake_tick(uint32_t delta) {
    fake_tick += delta;
}
```

---

### Ch 16: 메모리 제약 환경 테스트

**핵심 질문**: 제한된 RAM/ROM에서 테스트 코드를 어떻게 관리하는가?

**다룰 내용**:
- 테스트 프레임워크 선택 (Unity, CppUTest)
- 테스트 코드의 메모리 풋프린트
- 조건부 컴파일로 테스트 코드 분리
- 스택/힙 사용량 테스트
- 메모리 누수 탐지
- 정적 분석 도구 활용

**테스트 프레임워크 비교**:

| 프레임워크 | ROM | RAM | 특징 |
|-----------|-----|-----|------|
| Unity | ~2KB | ~1KB | 최소, C 전용 |
| CppUTest | ~10KB | ~2KB | C/C++, 목킹 지원 |
| Google Test | ~100KB+ | ~10KB+ | 풀 기능, 임베디드 부적합 |

---

### Ch 17: HIL/SIL 테스트

**핵심 질문**: 실제 하드웨어 없이 시스템을 어떻게 검증하는가?

**다룰 내용**:
- MIL (Model-in-the-Loop)
- SIL (Software-in-the-Loop)
- PIL (Processor-in-the-Loop)
- HIL (Hardware-in-the-Loop)
- 각 단계의 목적과 트레이드오프
- HIL 테스트 환경 구축
- 자동화 전략

**TikZ 다이어그램**:
- MIL → SIL → PIL → HIL 진행 다이어그램

**예시**:
- 자동차 ECU 테스트
- 모터 제어기 테스트
- 센서 시뮬레이션

---

### Ch 18: 임베디드 CI/CD

**핵심 질문**: 임베디드 프로젝트의 지속적 통합은 어떻게 구축하는가?

**다룰 내용**:
- 크로스 컴파일 CI 환경
- 에뮬레이터 기반 테스트 (QEMU, Renode)
- 실제 하드웨어 CI (테스트 팜)
- 플래싱 자동화
- 테스트 결과 수집
- 커버리지 리포팅

**CI 파이프라인 예**:
```yaml
stages:
  - build
  - test-host
  - test-emulator
  - test-hardware

test-host:
  script:
    - cmake --build build --target test_host
    - ./build/test_host

test-emulator:
  script:
    - qemu-system-arm -M lm3s6965evb -kernel firmware.elf -nographic -semihosting
```

---

## 부록

### 부록 A: 테스트 도구 카탈로그

| 언어 | 프레임워크 | 목킹 | 커버리지 |
|------|-----------|------|----------|
| Python | pytest | unittest.mock, pytest-mock | coverage.py |
| C | Unity, CppUTest | CMock, fff | gcov |
| C++ | Google Test | Google Mock | lcov, llvm-cov |
| Rust | cargo test | mockall | tarpaulin |

### 부록 B: 용어집

- SUT (System Under Test)
- DOC (Depended-On Component)
- Test Double
- Fixture
- Coverage
- Mutation Testing
- Flaky Test

### 부록 C: 참고 자료

**서적**:
- "Unit Testing Principles, Practices, and Patterns" — Vladimir Khorikov
- "xUnit Test Patterns" — Gerard Meszaros
- "Test Driven Development for Embedded C" — James W. Grenning
- "Growing Object-Oriented Software, Guided by Tests" — Freeman & Pryce

**온라인**:
- Martin Fowler's Testing Articles
- Google Testing Blog

---

## 시리즈 간 연결

**이 시리즈 → 다른 시리즈**:
- Ch 5 (상태 커버리지) → Pragmatic Programmer Tip 92
- Ch 10 (테스트 가능한 설계) → Clean Architecture
- Ch 14-18 → Modern Embedded Recipes

**다른 시리즈 → 이 시리즈**:
- TDD by Example → Ch 1-6 (전략 심화)
- Pragmatic Programmer Testing Tips → 전체

---

## 작성 우선순위

**1차 (핵심)**:
- Ch 1: 테스트 레벨의 트레이드오프
- Ch 7: 테스트 더블의 종류와 선택
- Ch 13: 호스트 vs 타겟 테스트

**2차 (전략)**:
- Ch 2-4: 단위/통합/E2E 상세
- Ch 5-6: 커버리지와 우선순위

**3차 (아키텍처)**:
- Ch 8-12: 픽스처, 격리, 설계, 가독성, 안티패턴

**4차 (임베디드)**:
- Ch 14-18: HAL, 인터럽트, 메모리, HIL, CI

---

## 예상 분량

| 챕터 | 예상 단어 수 | 코드 예시 | 다이어그램 |
|------|-------------|----------|-----------|
| Part 1 (6개) | 각 1500-2000 | 3-5개 | 1-2개 |
| Part 2 (6개) | 각 1500-2000 | 5-7개 | 1개 |
| Part 3 (6개) | 각 1500-2000 | 4-6개 | 1-2개 |

총 18개 챕터, 약 30,000 단어.
