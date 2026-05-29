---
title: "Ch 8: System Architecture: Satellite-Based Navigation"
date: 2026-05-19T08:00:00
description: "케이스 스터디 — 위성 기반 항법 시스템 아키텍처."
series: "Object-Oriented Analysis and Design with Applications"
seriesOrder: 8
tags: [oop, booch, case-study, architecture, navigation]
draft: true
type: book-review
bookTitle: "Object-Oriented Analysis and Design with Applications"
bookAuthor: "Grady Booch"
---

## 한 줄 요약

> 위성 기반 항법 시스템은 **실시간성**, **분산 처리**, **안전성**을 요구하는 복잡한 시스템이다. 객체지향 분해가 이 복잡성을 관리한다.

## 문제 도메인

### 시스템 개요

| 구분 | 내용 |
|------|------|
| 입력 | 위성 신호(GPS, GLONASS, Galileo), 관성 항법 장치(INS), 기압 고도계, 사용자 입력(목적지, 경유지) |
| 처리 | 위치 계산, 항로 계획, 이탈 감지, 지형 경고 |
| 출력 | 현재 위치, 항로 안내, 경고/알림, 디스플레이 렌더링 |

### 품질 요구사항

| 품질 속성 | 요구사항 |
|----------|---------|
| 실시간성 | 위치 갱신: 1초 이내, 경고 응답: 100ms 이내, 디스플레이 갱신: 30fps |
| 정확성 | 수평 위치: ±5m(일반)/±1m(정밀), 수직 위치: ±10m, 속도: ±0.1m/s |
| 안전성 | 위치 무결성 검증, 고장 감지 및 격리, 백업 항법 모드 |
| 가용성 | 99.9% 동작 시간, 단일 장애점 없음, 우아한 성능 저하 |

## 핵심 추상화

### 도메인 모델

| 개념 | 속성 |
|------|------|
| Position (위치) | 위도, 경도, 고도, 정확도(수평, 수직), 시간 스탬프, 기준 좌표계 |
| Waypoint (경유지) | 위치, 이름/식별자, 유형(출발, 경유, 도착), 고도 제한 |
| Route (항로) | 경유지 시퀀스, 총 거리, 예상 시간, 대체 경로 |
| Track (궤적) | 위치 이력, 속도, 방향, 시간 기록 |

```java
// 핵심 클래스

public class Position {
    private final double latitude;    // 도 (degrees)
    private final double longitude;   // 도
    private final double altitude;    // 미터
    private final double horizontalAccuracy;  // 미터
    private final double verticalAccuracy;    // 미터
    private final Instant timestamp;
    private final CoordinateSystem referenceSystem;

    public double distanceTo(Position other) {
        // Haversine 공식으로 거리 계산
        return GeoCalculator.haversineDistance(this, other);
    }

    public double bearingTo(Position other) {
        // 방위각 계산
        return GeoCalculator.initialBearing(this, other);
    }

    public boolean isValid() {
        return horizontalAccuracy < MAX_ACCEPTABLE_ACCURACY
            && timestamp.isAfter(Instant.now().minusSeconds(MAX_AGE));
    }
}

public class Waypoint {
    private final String identifier;
    private final Position position;
    private final WaypointType type;
    private final AltitudeConstraint altitudeConstraint;

    public enum WaypointType {
        DEPARTURE, ENROUTE, ARRIVAL, ALTERNATE
    }
}

public class Route {
    private final List<Waypoint> waypoints;
    private final List<Leg> legs;

    public double getTotalDistance() {
        return legs.stream()
            .mapToDouble(Leg::getDistance)
            .sum();
    }

    public Duration getEstimatedTime(double groundSpeed) {
        double totalDistance = getTotalDistance();
        double hours = totalDistance / groundSpeed;
        return Duration.ofMinutes((long)(hours * 60));
    }
}
```

### 센서 추상화

`PositionSource` 인터페이스 아래 여러 구체 센서가 실체화된다.

![Sensor Class Hierarchy](/images/blog/ooad/diagrams/ch08-sensor-hierarchy.svg)

센서 융합은 여러 소스의 데이터를 결합하여 최적의 위치 추정값을 계산한다.

```java
// 센서 인터페이스

public interface PositionSource {
    /**
     * 현재 위치를 반환한다.
     * @return 위치 정보, 사용 불가하면 empty
     */
    Optional<Position> getCurrentPosition();

    /**
     * 센서 상태를 반환한다.
     */
    SensorStatus getStatus();

    /**
     * 센서가 사용 가능한지 확인한다.
     */
    boolean isAvailable();
}

public class GpsReceiver implements PositionSource {
    private final SatelliteTracker tracker;
    private volatile GpsStatus status;

    @Override
    public Optional<Position> getCurrentPosition() {
        List<SatelliteSignal> signals = tracker.getTrackedSignals();

        if (signals.size() < MIN_SATELLITES) {
            return Optional.empty();
        }

        // 삼변측량으로 위치 계산
        return Optional.of(
            PositionCalculator.trilaterate(signals)
        );
    }

    @Override
    public SensorStatus getStatus() {
        int satellites = tracker.getTrackedCount();
        if (satellites >= 4) return SensorStatus.NOMINAL;
        if (satellites >= 3) return SensorStatus.DEGRADED;
        return SensorStatus.UNAVAILABLE;
    }
}

public class SensorFusion implements PositionSource {
    private final List<PositionSource> sources;
    private final KalmanFilter filter;

    @Override
    public Optional<Position> getCurrentPosition() {
        List<Position> measurements = sources.stream()
            .filter(PositionSource::isAvailable)
            .map(PositionSource::getCurrentPosition)
            .filter(Optional::isPresent)
            .map(Optional::get)
            .collect(Collectors.toList());

        if (measurements.isEmpty()) {
            return Optional.empty();
        }

        // 칼만 필터로 최적 추정
        return Optional.of(filter.estimate(measurements));
    }
}
```

## 아키텍처 설계

### 서브시스템 분해

항법 시스템은 6개의 서브시스템으로 나뉜다.

![Navigation System Subsystems](/images/blog/ooad/diagrams/ch08-subsystems.svg)

| 서브시스템 | 책임 |
|------------|------|
| Sensors | 센서 데이터 수집, 전처리 |
| Position | 위치 계산, 센서 융합 |
| Route | 항로 계획, 이탈 감지 |
| Integrity Monitor | 위치 무결성 검증 |
| Display | 시각화, 사용자 인터페이스 |
| Alert | 경고 생성, 우선순위 관리 |

### 실시간 구조

실시간 태스크는 우선순위와 주기로 스케줄된다.

| 우선순위 | 태스크 | 주기 | 책임 |
|----------|--------|------|------|
| 높음 | `SensorTask` | 20 ms | 센서 데이터 읽기, 전처리, 이벤트 발행 |
| 높음 | `PositionTask` | 100 ms | 위치 계산, 무결성 검증, 위치 발행 |
| 높음 | `AlertTask` | 비주기 (이벤트) | 경고 조건 검사, 경고 생성, 우선순위 스케줄링 |
| 중간 | `RouteTask` | 1 s | 항로 이탈 검사, ETA 갱신, 경유지 시퀀싱 |
| 낮음 | `DisplayTask` | 33 ms (30 fps) | 맵 렌더링, 계기 갱신, 사용자 입력 처리 |

```java
// 실시간 태스크 구조

public abstract class PeriodicTask implements Runnable {
    private final Duration period;
    private final Priority priority;
    private volatile boolean running = true;

    protected abstract void execute();

    @Override
    public void run() {
        while (running) {
            long startTime = System.nanoTime();

            try {
                execute();
            } catch (Exception e) {
                handleError(e);
            }

            long elapsed = System.nanoTime() - startTime;
            long sleepTime = period.toNanos() - elapsed;

            if (sleepTime > 0) {
                LockSupport.parkNanos(sleepTime);
            } else {
                // 데드라인 미스 로깅
                logDeadlineMiss(elapsed, period);
            }
        }
    }
}

public class SensorTask extends PeriodicTask {
    private final List<PositionSource> sensors;
    private final EventBus eventBus;

    public SensorTask() {
        super(Duration.ofMillis(20), Priority.HIGH);
    }

    @Override
    protected void execute() {
        for (PositionSource sensor : sensors) {
            sensor.getCurrentPosition().ifPresent(position ->
                eventBus.publish(new PositionEvent(sensor, position))
            );
        }
    }
}
```

### 데이터 흐름

GPS·INS·BARO 세 소스가 `SensorFusion`에 모이고, 위치 계산 → 라우팅 → 디스플레이로 이어진다. 각 단계의 결과는 아래 검증/경고 체인으로도 분기한다.

![Data Flow Architecture](/images/blog/ooad/diagrams/ch08-dataflow.svg)

데이터 버스의 특징: 발행/구독 패턴, 느슨한 결합, 비동기 통신.

```java
// 발행/구독 이벤트 버스

public class NavigationEventBus {
    private final Map<Class<?>, List<Consumer<?>>> subscribers
        = new ConcurrentHashMap<>();

    public <T> void subscribe(Class<T> eventType, Consumer<T> handler) {
        subscribers.computeIfAbsent(eventType, k -> new CopyOnWriteArrayList<>())
            .add(handler);
    }

    @SuppressWarnings("unchecked")
    public <T> void publish(T event) {
        List<Consumer<?>> handlers = subscribers.get(event.getClass());
        if (handlers != null) {
            for (Consumer<?> handler : handlers) {
                ((Consumer<T>) handler).accept(event);
            }
        }
    }
}

// 이벤트 타입
public record PositionUpdateEvent(Position position, Instant timestamp) {}
public record RouteDeviationEvent(Position current, Leg activeLeg, double deviation) {}
public record TerrainAlertEvent(AlertLevel level, String message, Position location) {}
```

## 안전성 설계

### 고장 감지

| 수준 | 고장 감지 전략 |
|------|--------------|
| 센서 수준 | 자가 진단(Built-In Test), 범위 검사(plausibility check), 변화율 검사(rate of change) |
| 시스템 수준 | 다중 센서 비교, 예측-측정 비교, 무결성 검증(RAIM) |

**RAIM (Receiver Autonomous Integrity Monitoring)**: 5개 이상 위성으로 위치 계산 → 하나의 위성을 제외하고 재계산 → 결과 비교로 이상 위성 검출.

```java
// 무결성 검증

public class IntegrityMonitor {
    private final double alertLimit;  // 허용 오차
    private final double missedDetectionProbability;

    public IntegrityResult checkRAIM(List<SatelliteSignal> signals) {
        if (signals.size() < 5) {
            return IntegrityResult.insufficientSatellites();
        }

        Position fullSolution = PositionCalculator.solve(signals);
        List<Position> subsetSolutions = new ArrayList<>();

        // Leave-one-out 계산
        for (int i = 0; i < signals.size(); i++) {
            List<SatelliteSignal> subset = new ArrayList<>(signals);
            subset.remove(i);
            subsetSolutions.add(PositionCalculator.solve(subset));
        }

        // 잔차 계산
        double maxResidual = subsetSolutions.stream()
            .mapToDouble(pos -> pos.distanceTo(fullSolution))
            .max()
            .orElse(0);

        // 보호 수준 계산
        double protectionLevel = calculateProtectionLevel(
            signals, maxResidual);

        if (protectionLevel > alertLimit) {
            return IntegrityResult.alert(protectionLevel, alertLimit);
        }

        return IntegrityResult.normal(fullSolution, protectionLevel);
    }
}
```

### 이중화

| 이중화 유형 | 전략 |
|------------|------|
| 센서 이중화 | 이중 GPS 수신기, GPS + INS 융합, GPS + 지상 기반 백업 |
| 컴퓨팅 이중화 | 이중 프로세서, 상호 감시(cross-check), 핫 스탠바이 |
| 소프트웨어 이중화 | N-버전 프로그래밍, 투표(voting), 안전 모드(safe mode) |

```java
// 이중화 관리자

public class RedundancyManager<T> {
    private final List<Supplier<T>> channels;
    private final Comparator<T> comparator;
    private final BiPredicate<T, T> agreementChecker;

    public RedundancyResult<T> getConsensus() {
        List<T> results = channels.stream()
            .map(Supplier::get)
            .collect(Collectors.toList());

        if (results.size() < 2) {
            return RedundancyResult.singleChannel(results.get(0));
        }

        // 투표 또는 비교
        Map<T, Long> votes = results.stream()
            .collect(Collectors.groupingBy(
                Function.identity(),
                Collectors.counting()
            ));

        T majority = votes.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElseThrow();

        long majorityCount = votes.get(majority);

        if (majorityCount > results.size() / 2) {
            return RedundancyResult.consensus(majority, majorityCount);
        }

        return RedundancyResult.disagreement(results);
    }
}
```

## 시퀀스 다이어그램

### 위치 갱신 시퀀스

![Position Update Sequence](/images/blog/ooad/diagrams/ch08-sequence-position-update.svg)

`SensorTask`가 20 ms 주기로 호출을 시작하고, `SensorFusion`이 오케스트레이터 역할을 한다. 무결성 검증(RAIM)을 통과해야만 `EventBus`로 위치를 발행한다.

### 경고 처리 시퀀스

![Alert Handling Sequence](/images/blog/ooad/diagrams/ch08-sequence-alert.svg)

지형 데이터베이스가 근접 이벤트를 발생시키면 `AlertManager`가 우선순위 큐에 등록하고, 큐가 자체 enqueue·dequeue를 거친 뒤 `Display`와 `Audio`에 동시에 분기한다.

## 상태 다이어그램

### 항법 시스템 상태

![Navigation System State Machine](/images/blog/ooad/diagrams/ch08-state-machine.svg)

| 상태 | 의미 |
|------|------|
| `Initializing` | 부팅·센서 초기화 |
| `Normal` | 무결성 정상, 모든 센서 가용 |
| `Degraded` | 무결성 검증 실패 또는 일부 센서 손실 |
| `Dead Reckoning` | 모든 센서 손실, INS만으로 추측 항법 |
| `Failed` | DR 타임아웃, 위치 미상 |

```java
// 상태 머신 구현

public class NavigationStateMachine {
    private NavigationState state = NavigationState.INITIALIZING;
    private final SensorFusion sensors;
    private final IntegrityMonitor integrity;

    public void update() {
        switch (state) {
            case INITIALIZING:
                if (sensors.isReady()) {
                    transitionTo(NavigationState.NORMAL);
                }
                break;

            case NORMAL:
                if (!integrity.isValid()) {
                    transitionTo(NavigationState.DEGRADED);
                }
                break;

            case DEGRADED:
                if (integrity.isValid()) {
                    transitionTo(NavigationState.NORMAL);
                } else if (!sensors.hasAnySource()) {
                    transitionTo(NavigationState.DEAD_RECKONING);
                }
                break;

            case DEAD_RECKONING:
                if (sensors.hasAnySource()) {
                    transitionTo(NavigationState.DEGRADED);
                } else if (deadReckoningTimeout()) {
                    transitionTo(NavigationState.FAILED);
                }
                break;
        }
    }

    private void transitionTo(NavigationState newState) {
        log.info("State transition: {} -> {}", state, newState);
        this.state = newState;
        eventBus.publish(new StateChangeEvent(state, newState));
    }
}
```

## 정리

핵심 추상화:
- **Position**: 위치, 정확도, 시간 스탬프
- **Waypoint/Route**: 경유지와 항로
- **PositionSource**: 센서 인터페이스
- **SensorFusion**: 다중 센서 통합

아키텍처:
- **서브시스템 분해**: 센서, 위치, 항로, 무결성, 디스플레이, 경고
- **실시간 태스크**: 우선순위 기반 주기적 실행
- **데이터 흐름**: 발행/구독 패턴

안전성:
- **고장 감지**: RAIM, 다중 센서 비교
- **이중화**: 센서, 컴퓨팅, 소프트웨어
- **상태 머신**: 정상, 저하, 추측 항법, 실패

## 다음 장 예고

Chapter 9에서는 **교통 관리 시스템**을 다룬다. 제어 시스템의 객체지향 설계 — 센서, 액추에이터, 제어 알고리즘.

## 관련 항목

- [Ch 7: Pragmatics](/blog/programming/design/ooad/chapter07-pragmatics) — 실무
- [Ch 9: Traffic Management](/blog/programming/design/ooad/chapter09-traffic-management) — 교통 관리
- [OOSC Ch 32: Object-Oriented Analysis](/blog/programming/design/oosc/chapter32-object-oriented-database-systems) — 객체 데이터베이스

