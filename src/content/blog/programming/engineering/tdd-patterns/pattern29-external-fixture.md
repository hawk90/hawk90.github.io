---
title: "Pattern 29: External Fixture"
date: 2026-07-02T05:00:00
description: "Process·resource에 걸친 fixture — DB·file·network."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 29
tags: [xunit, external-fixture, integration, beck]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 데이터베이스, 파일 시스템, 네트워크 같은 외부 리소스를 테스트에서 관리한다.

## 동기 (Motivation)

일반 fixture는 **메모리 안**에서 동작한다. 하지만 실제 시스템은 **외부 리소스**에 의존한다:

```text
- 데이터베이스
- 파일 시스템
- 네트워크 서비스
- 메시지 큐
- 캐시 서버
```

**External Fixture**는 이런 리소스의 **설정과 정리**를 다룬다.

## 데이터베이스 Fixture

### 기본 패턴

```python
import pytest

@pytest.fixture
def db():
    """데이터베이스 연결"""
    connection = Database.connect("test_db")
    yield connection
    connection.close()

@pytest.fixture
def clean_db(db):
    """깨끗한 상태의 DB"""
    db.execute("DELETE FROM users")
    db.execute("DELETE FROM orders")
    yield db
    # 테스트 후에도 정리
    db.execute("DELETE FROM users")
    db.execute("DELETE FROM orders")
```

### 트랜잭션 롤백

```python
@pytest.fixture
def transactional_db(db):
    """트랜잭션으로 격리"""
    db.begin_transaction()
    yield db
    db.rollback()  # 모든 변경 취소
```

이 방식이 **가장 빠르고 안전**하다.

## Testcontainers

실제 DB를 **Docker로 실행**한다:

```python
import testcontainers.postgres as postgres

@pytest.fixture(scope="module")
def postgres_db():
    """Docker로 PostgreSQL 실행"""
    with postgres.PostgresContainer("postgres:15") as pg:
        yield pg.get_connection_url()
```

### 장점

```text
✓ 실제 DB와 동일한 환경
✓ 격리된 테스트 환경
✓ CI/CD에서 일관된 실행
```

### 단점

```text
✗ 느림 (컨테이너 시작 시간)
✗ Docker 필요
✗ 리소스 사용량
```

## 파일 시스템 Fixture

### 임시 디렉토리

```python
import pytest
import tempfile
import os

@pytest.fixture
def temp_dir():
    """임시 디렉토리 생성 및 정리"""
    dir_path = tempfile.mkdtemp()
    yield dir_path
    # 정리
    import shutil
    shutil.rmtree(dir_path)
```

### pytest의 tmp_path

```python
def test_file_write(tmp_path):
    """pytest 내장 임시 디렉토리"""
    file = tmp_path / "test.txt"
    file.write_text("hello")

    assert file.read_text() == "hello"
    # 자동 정리됨
```

## 네트워크 서비스 Fixture

### Mock 서버

```python
import responses

@pytest.fixture
def mock_api():
    """HTTP 응답 모킹"""
    with responses.RequestsMock() as rsps:
        rsps.add(
            responses.GET,
            "https://api.example.com/users",
            json={"users": [{"name": "Alice"}]},
            status=200
        )
        yield rsps
```

### 실제 서비스 (통합 테스트)

```python
@pytest.fixture(scope="session")
def api_server():
    """테스트용 서버 실행"""
    import subprocess
    server = subprocess.Popen(["python", "server.py"])
    time.sleep(2)  # 시작 대기
    yield "http://localhost:8080"
    server.terminate()
```

## Fixture 범위와 비용

```python
# Function: 매 테스트마다 (느림, 격리 좋음)
@pytest.fixture(scope="function")
def fresh_db(): ...

# Class: 클래스당 한 번
@pytest.fixture(scope="class")
def class_db(): ...

# Module: 모듈당 한 번
@pytest.fixture(scope="module")
def module_db(): ...

# Session: 전체 테스트 세션당 한 번 (빠름, 격리 나쁨)
@pytest.fixture(scope="session")
def session_db(): ...
```

### 트레이드오프

| 범위 | 속도 | 격리 | 사용 시점 |
|------|------|------|----------|
| function | 느림 | 완벽 | 상태 변경 테스트 |
| class | 중간 | 좋음 | 관련 테스트 그룹 |
| module | 빠름 | 주의 | 읽기 전용 테스트 |
| session | 가장 빠름 | 위험 | 불변 데이터 |

## 격리 vs 속도

```python
# 완벽한 격리 (느림)
@pytest.fixture
def isolated_db():
    db = create_fresh_database()  # 매번 새로 생성
    yield db
    drop_database(db)

# 빠른 격리 (권장)
@pytest.fixture
def fast_isolated_db(session_db):
    session_db.begin_transaction()
    yield session_db
    session_db.rollback()  # 트랜잭션으로 격리
```

## 정리 실패 처리

```python
@pytest.fixture
def robust_fixture():
    resource = acquire_resource()
    try:
        yield resource
    finally:
        # 예외가 발생해도 정리
        try:
            resource.cleanup()
        except Exception as e:
            print(f"Cleanup failed: {e}")
```

## Factory Fixture

```python
@pytest.fixture
def user_factory(db):
    """사용자 생성 팩토리"""
    created_users = []

    def create_user(name, email=None):
        user = User(name=name, email=email or f"{name}@test.com")
        db.save(user)
        created_users.append(user)
        return user

    yield create_user

    # 생성된 모든 사용자 정리
    for user in created_users:
        db.delete(user)
```

사용:

```python
def test_multiple_users(user_factory):
    alice = user_factory("Alice")
    bob = user_factory("Bob")
    # 테스트 후 자동 정리
```

## 정리

- **외부 리소스**(DB, 파일, 네트워크) 관리
- **트랜잭션 롤백**이 가장 효율적
- **Testcontainers**로 실제 환경 재현
- **범위 선택** — 격리 vs 속도 트레이드오프
- **정리 실패** 처리 중요
- **Factory fixture**로 유연성

## 관련 패턴

- [Pattern 28: Fixture](/blog/programming/engineering/tdd-patterns/pattern28-fixture) — 일반 fixture
- [Pattern 17: Mock Object](/blog/programming/engineering/tdd-patterns/pattern17-mock-object) — 외부 의존성 대체
- [Pattern 2: Isolated Test](/blog/programming/engineering/tdd-patterns/pattern02-isolated-test) — 테스트 격리

