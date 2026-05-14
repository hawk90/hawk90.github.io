---
title: "Ch 26: Main 컴포넌트"
date: 2025-06-02T02:00:00
description: "Main은 가장 더러운 컴포넌트다. composition root에서 의존성 그래프를 조립한다. 환경별로 별도의 main이 가능하다."
tags: [Architecture, Main, CompositionRoot, DI]
series: "Clean Architecture"
seriesOrder: 26
draft: true
---

## 이 챕터의 메시지

모든 시스템에는 진입점이 있다. `main()` 함수. 그 함수가 시스템을 부트스트랩한다.

Martin은 이 main 컴포넌트의 역할을 명확히 정의한다.

> **Main은 시스템의 가장 저수준 컴포넌트다. 모든 것을 알고, 모든 것을 조립한다.**

main의 본질은 **composition root**다. 의존성 그래프를 구성하는 한 곳.

## main의 책임

**1. 시스템 초기화**
- 설정 로드 (config file, env variables)
- 로깅, 모니터링 설정
- 외부 자원 연결 (DB, 메시징, 외부 API)

**2. 의존성 그래프 조립**
- 모든 구체 클래스를 인스턴스화
- 인터페이스에 구현체 주입
- 시스템 객체 그래프 완성

**3. 시스템 시작**
- 메인 루프 / 서비스 시작
- 종료 신호 처리

## 예제

```java
public class Main {
  public static void main(String[] args) {
    // 1. 설정 로드
    Config config = ConfigLoader.load(args);
    
    // 2. 외부 자원 초기화
    DataSource db = DataSourceFactory.create(config.dbUrl);
    EmailSender email = new SmtpEmailSender(config.smtp);
    Logger logger = new FileLogger(config.logPath);
    
    // 3. Adapter 층 — 인터페이스 구현
    UserRepository repo = new SqlUserRepository(db);
    NotificationService notif = new EmailNotificationService(email);
    
    // 4. Use Case 층 — 비즈니스 로직
    CreateUserUseCase createUser = new CreateUserUseCase(repo, notif, logger);
    LoginUseCase login = new LoginUseCase(repo, logger);
    
    // 5. Controller 층 — 진입점
    UserController userCtrl = new UserController(createUser, login);
    
    // 6. 시스템 시작
    HttpServer server = new HttpServer(userCtrl);
    server.start(config.port);
  }
}
```

main이 모든 구체 클래스를 알고 있다. **가장 더러운 컴포넌트** — 모든 디테일이 여기 모인다.

## "가장 더러운"의 의미

main이 더럽다는 게 부정적인 의미가 아니다. **그래야 한다**는 의미다.

다른 컴포넌트는 추상에만 의존한다 (DIP). 그러나 어딘가에서 구체 클래스를 알아야 한다 — 누군가가 `new SqlUserRepository(...)`를 해야 하니까.

main이 그 "어딘가"다. 모든 구체 결정이 main에 모인다. 다른 곳은 깨끗하게 유지.

## main은 플러그인이다

흥미로운 관점. Main을 **플러그인**으로 봐도 된다.

```
Application (안정적, 변경 없음)
       ↑
       │
Main (가장 외부, 자주 변경)
```

Application은 추상 인터페이스를 정의한다. Main은 그 인터페이스에 구체 구현을 채워 넣는 플러그인이다.

이 관점이 좋은 건 **환경별로 다른 main을 가질 수 있다**는 것이다.

## 환경별 Main

같은 Application을 여러 환경에서 다르게 운용할 수 있다.

```java
class ProdMain {
  // 실제 DB, SMTP, S3
}

class DevMain {
  // 인메모리 DB, mock SMTP, 로컬 파일 시스템
}

class TestMain {
  // 모두 mock
}

class IntegrationTestMain {
  // 실제 DB(테스트용), mock 외부 API
}
```

각 main은 같은 Application 객체들을 다른 구현체로 조립한다. Application 자체는 안 바뀐다.

이게 dev/staging/prod 환경 분리의 정확한 디자인이다. 환경별 `main`이 환경별 어댑터를 주입한다.

## DI 컨테이너

main이 모든 wiring을 손으로 하는 게 부담스러우면 **DI 컨테이너**를 쓸 수 있다.

- Spring (Java)
- Guice (Java)
- Dagger (Java/Android)
- Boost.DI (C++)
- inversify (TypeScript)

DI 컨테이너는 main의 wiring 코드를 **선언적으로** 표현하게 해 준다.

```java
@Configuration
class AppConfig {
  @Bean DataSource db() { return DataSourceFactory.create(...); }
  @Bean UserRepository repo(DataSource db) { return new SqlUserRepository(db); }
  // ...
}
```

다만 DI 컨테이너 자체가 또 하나의 결정이고 디테일이다. Application 코드가 DI 컨테이너에 의존하지 않게 주의해야 한다 — wiring 코드만 컨테이너를 알고, Use Case나 Entity는 컨테이너를 모른다.

## main의 격리

main을 작게 유지한다. 모든 비즈니스 로직은 main 바깥. main은 wiring 외에 아무 일도 안 한다.

```java
// ❌ main에 비즈니스 로직
class Main {
  public static void main(String[] args) {
    User u = repo.find(args[0]);
    if (u.age >= 18) {  // ← 비즈니스 규칙
      // ...
    }
  }
}

// ✅ main은 wiring만
class Main {
  public static void main(String[] args) {
    // 조립
    AgeCheckUseCase uc = new AgeCheckUseCase(repo);
    // 호출
    uc.execute(args[0]);
  }
}
```

비즈니스 로직이 main에 들어가면 그 로직이 환경별로 달라질 위험이 생긴다. 항상 Use Case로 옮긴다.

## main과 framework

흥미로운 관찰 — 많은 framework가 main을 대신한다.

- Spring Boot의 `@SpringBootApplication`
- Rails의 `config/application.rb`
- Django의 `wsgi.py`

이들은 사실 framework가 작성한 main이다. 우리가 직접 작성하진 않지만, 같은 역할을 한다.

Clean Architecture는 framework를 디테일로 본다 — main도 framework가 만든 디테일의 일부다.

## 정리

- **main = composition root** — 의존성 그래프를 조립하는 한 곳
- **가장 더럽고 가장 저수준** — 의도된 디자인
- 모든 구체 클래스가 main에 모인다, 다른 곳은 깨끗
- **환경별 다른 main** — dev / staging / prod 분리
- **main은 플러그인** — Application은 안정, main이 환경별로 변경
- **비즈니스 로직은 main에 들어가지 않는다**
- DI 컨테이너는 main의 wiring을 선언적으로 만들 뿐

## 다음 장 예고

다음 장은 **서비스의 크기** — 마이크로서비스 논쟁에 대한 Martin의 입장.

## 관련 항목

- [Ch 11: DIP](/blog/programming/design/clean-architecture/chapter11-dip-the-dependency-inversion-principle) — main의 자리
- [Ch 22: The Clean Architecture](/blog/programming/design/clean-architecture/chapter22-the-clean-architecture)
- [C++ Software Design 가이드라인 37: Singleton](/blog/programming/cpp/cpp-software-design/guideline37-treat-singleton-as-an-implementation-pattern-not-a-design-pattern) — composition root와의 연결
