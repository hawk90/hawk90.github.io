---
title: "Ch 18: 경계의 해부"
date: 2026-05-01T18:00:00
description: "경계가 실제로 어떻게 생겼는가. 함수 호출에서 네트워크 호출까지 — 격리 강도와 비용의 스펙트럼."
tags: [Architecture, Boundaries, Process, Service]
series: "Clean Architecture"
seriesOrder: 18
draft: true
---

## 이 챕터의 메시지

17장이 "어디에 경계를 긋는가"였다면, 18장은 "그 경계가 실제로 어떻게 생겼는가"다.

경계는 단일한 것이 아니다. **강도의 스펙트럼**이 있다. 한쪽 끝은 매우 약한 경계(함수 호출), 다른 쪽 끝은 매우 강한 경계(네트워크 호출).

각각의 강도는 다른 격리도와 다른 비용을 가진다.

## 강도 스펙트럼

![경계 강도 스펙트럼](/images/blog/clean-architecture/diagrams/ch18-boundary-strength-spectrum.svg)

이 순서대로 격리도가 올라가고 비용도 올라간다.

## 1. Monolith — 함수 호출 경계

같은 바이너리 안에서 경계를 그은 모듈들. 호출은 단순 함수 호출.

```java
// 모듈 A
public class UserService {
  private OrderService orders;  // 다른 모듈
  public void placeOrder(User u) { orders.create(u); }  // 함수 호출
}
```

**격리도** — 매우 낮음. 같은 메모리 공간에 산다.
**비용** — 매우 낮음. 함수 호출은 ns 단위.
**배포 독립성** — 없음. 한 바이너리.

**어떤 경계인가?**
- 소스 레벨의 의존 통제 (import 규칙)
- 컴포넌트별 폴더 분리
- 빌드 시스템으로 의존 방향 검증

가장 일반적인 형태. 모놀리스에서 시작해 점진적으로 강한 경계로 옮긴다.

## 2. Deployment Component — 동적 링킹 경계

다른 바이너리(jar, dll, .so) — 같은 프로세스에 동적으로 로드.

```java
// 빌드: jvm-classpath에 OrderService.jar 추가
public class UserService {
  private OrderService orders;  // 별도 jar에서 로드
}
```

**격리도** — 중간. 별도 빌드, 별도 배포 가능. 그러나 같은 프로세스라 동시 죽음.
**비용** — 낮음. 함수 호출과 거의 같음.
**배포 독립성** — 있음. 한 컴포넌트만 새 버전 배포 가능.

**어떤 경계인가?**
- 라이브러리 / 플러그인 시스템
- OSGi (Java), .NET assemblies

가장 활용도 높은 중간 단계. 모놀리스의 단순함 + 어느 정도의 배포 독립성.

## 3. Local Process — IPC 경계

다른 프로세스 — 같은 머신.

```java
// 다른 프로세스의 OrderService를 IPC로 호출
public class UserService {
  private OrderService orders;  // IPC proxy
  public void placeOrder(User u) {
    orders.create(u);  // 내부적으로 unix socket / shared memory / named pipe 등
  }
}
```

**격리도** — 높음. 한 프로세스가 죽어도 다른 프로세스는 안 죽음.
**비용** — 중간. IPC는 함수 호출보다 100~1000배 느림 (수십 µs).
**배포 독립성** — 강함. 프로세스마다 별도 재시작 가능.

**어떤 경계인가?**
- Unix daemons
- 시스템 서비스
- Docker container 사이 (같은 호스트)

## 4. Service — 네트워크 경계

다른 프로세스 — 다른 머신 (또는 같은 머신이라도 네트워크 호출).

```java
// HTTP 또는 gRPC로 다른 서버 호출
public class UserService {
  private OrderClient orders;  // REST/gRPC client
  public void placeOrder(User u) {
    orders.create(u);  // network call
  }
}
```

**격리도** — 최대. 다른 머신, 다른 OS, 다른 언어 가능.
**비용** — 최대. ms 단위 지연, 직렬화/역직렬화 비용, 네트워크 실패 가능성.
**배포 독립성** — 최대.

**어떤 경계인가?**
- 마이크로서비스
- SOA
- 외부 API 호출

## 경계 강도의 비용

```
강도 ↑        비용 ↑
                
함수 호출         ns
동적 링킹         ns
로컬 프로세스    µs (~1000배)
네트워크         ms (~1,000,000배)
```

5~6 자리수의 비용 차이가 있다. 잘못된 강도 선택은 성능을 망친다.

## 강한 경계 = 비싼 통신

강한 경계는 통신을 비싸게 만든다. 따라서 강한 경계 사이의 통신은 **적게**, **묶어서** 한다.

```
나쁨 (네트워크 경계 너머 자주 호출):
for (Order o : orders) {
  service.process(o);  // 1000번의 네트워크 호출
}

좋음 (배치):
service.processBatch(orders);  // 1번의 네트워크 호출
```

이게 마이크로서비스 디자인의 가장 흔한 함정이다 — 강한 경계 너머 통신을 함수 호출처럼 자주 한다.

## 경계의 점진적 강화

처음부터 강한 경계를 만들 필요 없다. 약한 경계로 시작하고, 필요해질 때 강화한다.

```
1단계: monolith, source-level 경계
2단계: 컴포넌트로 분리 (jar/dll)
3단계: 로컬 프로세스로 분리
4단계: 마이크로서비스로 분리
```

핵심은 **각 단계에서 경계 구조가 같아야** 한다는 것이다. 다른 말로, 1단계에서 잘 그어진 source-level 경계가 4단계의 마이크로서비스 경계로 자연스럽게 진화할 수 있어야 한다.

이게 17장의 "FitNesse 5년" 사례의 진짜 의미다 — 처음에는 메모리 기반 인메모리 저장소(약한 경계)에서 시작했지만, 같은 인터페이스로 추후 어떤 강도의 경계로도 옮길 수 있게 만들었다.

## 정리

- 경계는 **강도의 스펙트럼** — 4개 단계
- **monolith / 동적 링킹 / 로컬 프로세스 / 서비스**
- 강도가 올라가면 격리도와 비용 모두 올라간다 (수백만 배)
- 강한 경계 너머 통신은 **적게, 묶어서**
- 모든 경계가 강해야 할 필요는 없다
- **약한 경계로 시작**하고 필요해질 때 강화 — 다만 구조가 같게 유지

## 다음 장 예고

다음 장은 **정책과 수준** — 시스템 안에서 어떤 코드가 "높은 수준"이고 어떤 코드가 "낮은 수준"인지 정확히 정의.

## 관련 항목

- [Ch 16: 독립성](/blog/programming/design/clean-architecture/chapter16-independence) — 디커플링의 세 모드
- [Ch 17: 경계](/blog/programming/design/clean-architecture/chapter17-boundaries-drawing-lines) — 어디에 그을 것인가
