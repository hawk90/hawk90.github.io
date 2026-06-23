---
title: "Ch 9: Control System: Traffic Management"
date: 2026-05-19T09:00:00
description: "케이스 스터디 — 교통 관리 제어 시스템."
series: "Object-Oriented Analysis and Design with Applications"
seriesOrder: 9
tags: [oop, booch, case-study, control-system, traffic]
draft: true
type: book-review
bookTitle: "Object-Oriented Analysis and Design with Applications"
bookAuthor: "Grady Booch"
---

## 한 줄 요약

> 교통 관리 시스템은 **센서**, **액추에이터**, **제어 알고리즘**의 협력이다. 실시간 제약과 분산 처리가 객체지향 설계의 핵심 과제다.

## 문제 도메인

### 시스템 개요

| 구분 | 항목 |
|------|------|
| **목표** | 교통 흐름 최적화, 대기 시간 최소화, 안전성 확보, 비상 상황 대응 |
| **구성 요소** | 감지 장치(센서), 신호등(액추에이터), 제어 컴퓨터, 통신 네트워크, 운영자 인터페이스 |

### 요구사항

**기능 요구사항**

| 기능 | 세부 내용 |
|------|----------|
| 교차로 신호 제어 | 시간 기반 제어, 교통량 감응 제어, 보행자 신호 연동 |
| 구역 제어 | 여러 교차로 조율, 녹색파(green wave), 혼잡 분산 |
| 비상 대응 | 비상 차량 우선, 사고 감지, 대체 경로 유도 |
| 모니터링 | 실시간 교통량 표시, 이력 분석, 알림/경고 |

**비기능 요구사항**

| 항목 | 요구 수준 |
|------|----------|
| 응답 시간 | 센서 입력 후 100ms 이내 결정 |
| 가용성 | 99.99% |
| 고장 모드 | 안전 실패(safe fail) |

## 핵심 추상화

### 도메인 모델

| 개념 | 속성 |
|------|------|
| Intersection (교차로) | 위치, 진입로(approaches), 신호 그룹, 현재 페이즈 |
| Phase (페이즈) | 신호 상태 조합, 지속 시간, 다음 페이즈 |
| Signal (신호) | 상태(녹색, 황색, 적색), 방향, 유형(차량, 보행자) |
| Detector (감지기) | 위치, 유형(루프, 비디오, 레이더), 측정값(점유율, 속도, 대기열) |
| Vehicle (차량) | 위치, 속도, 방향, 유형(일반, 비상) |

```java
// 핵심 클래스

public class Intersection {
    private final IntersectionId id;
    private final GeoLocation location;
    private final List<Approach> approaches;
    private final List<SignalGroup> signalGroups;
    private Phase currentPhase;
    private Instant phaseStartTime;

    public void advancePhase() {
        Phase nextPhase = currentPhase.getNextPhase();
        transitionTo(nextPhase);
    }

    public void setPhase(Phase phase) {
        if (!isValidTransition(currentPhase, phase)) {
            throw new InvalidPhaseTransitionException(currentPhase, phase);
        }
        transitionTo(phase);
    }

    private void transitionTo(Phase phase) {
        // 안전 간격 (all-red) 확보
        setAllRed();
        schedulePhaseActivation(phase, CLEARANCE_INTERVAL);
    }
}

public class Phase {
    private final PhaseId id;
    private final Map<SignalGroup, SignalState> signalStates;
    private final Duration minDuration;
    private final Duration maxDuration;
    private final Phase nextPhase;

    public boolean conflictsWith(Phase other) {
        // 두 페이즈의 녹색 신호가 충돌하는지 검사
        return signalStates.entrySet().stream()
            .filter(e -> e.getValue() == SignalState.GREEN)
            .anyMatch(e -> other.signalStates.get(e.getKey()) == SignalState.GREEN
                && e.getKey().conflictsWith(other.getConflictingGroups()));
    }
}

public class Detector {
    private final DetectorId id;
    private final DetectorType type;
    private final GeoLocation location;
    private final Approach monitoredApproach;

    public DetectorReading read() {
        return switch (type) {
            case INDUCTIVE_LOOP -> readLoop();
            case VIDEO -> processVideo();
            case RADAR -> readRadar();
            case INFRARED -> readInfrared();
        };
    }
}

public record DetectorReading(
    DetectorId detectorId,
    Instant timestamp,
    double occupancy,      // 0.0 ~ 1.0
    int vehicleCount,
    double averageSpeed,   // m/s
    int queueLength        // 대기 차량 수
) {}
```

### 제어 알고리즘 추상화

![Control Strategy Hierarchy](/images/blog/ooad/diagrams/ch09-control-strategy-hierarchy.svg)

```java
// 제어 전략 인터페이스

public interface ControlStrategy {
    /**
     * 다음 페이즈와 지속 시간을 결정한다.
     */
    PhaseDecision decide(IntersectionState state);

    /**
     * 전략 이름을 반환한다.
     */
    String getName();
}

public record PhaseDecision(
    Phase nextPhase,
    Duration duration,
    String reason
) {}

// 고정 시간 제어
public class FixedTimeStrategy implements ControlStrategy {
    private final List<PhaseTiming> timingPlan;
    private int currentIndex = 0;

    @Override
    public PhaseDecision decide(IntersectionState state) {
        PhaseTiming timing = timingPlan.get(currentIndex);
        currentIndex = (currentIndex + 1) % timingPlan.size();
        return new PhaseDecision(
            timing.phase(),
            timing.duration(),
            "Fixed timing plan"
        );
    }
}

// 감응식 제어
public class ActuatedStrategy implements ControlStrategy {
    private final Duration minGreen;
    private final Duration maxGreen;
    private final Duration extensionTime;

    @Override
    public PhaseDecision decide(IntersectionState state) {
        Phase currentPhase = state.currentPhase();
        Duration elapsed = state.phaseElapsedTime();

        // 최소 녹색 시간 미충족
        if (elapsed.compareTo(minGreen) < 0) {
            return new PhaseDecision(
                currentPhase,
                minGreen.minus(elapsed),
                "Minimum green not reached"
            );
        }

        // 차량 감지 시 연장
        if (hasVehiclePresence(state) && elapsed.compareTo(maxGreen) < 0) {
            return new PhaseDecision(
                currentPhase,
                extensionTime,
                "Vehicle presence detected, extending"
            );
        }

        // 다음 페이즈로 전환
        return new PhaseDecision(
            currentPhase.getNextPhase(),
            minGreen,
            "No vehicle presence, advancing"
        );
    }

    private boolean hasVehiclePresence(IntersectionState state) {
        return state.activeDetectors().stream()
            .anyMatch(d -> d.occupancy() > PRESENCE_THRESHOLD);
    }
}

// 적응형 제어 (SCOOT 스타일)
public class AdaptiveStrategy implements ControlStrategy {
    private final TrafficPredictor predictor;
    private final CycleOptimizer optimizer;

    @Override
    public PhaseDecision decide(IntersectionState state) {
        // 교통량 예측
        TrafficPrediction prediction = predictor.predict(
            state.historicalData(),
            Duration.ofMinutes(5)
        );

        // 최적 사이클/분할 계산
        OptimizedPlan plan = optimizer.optimize(
            state.currentPhase(),
            prediction,
            state.constraints()
        );

        return new PhaseDecision(
            plan.nextPhase(),
            plan.duration(),
            "Adaptive optimization: " + plan.rationale()
        );
    }
}
```

## 아키텍처 설계

### 계층 구조

교통 관리 시스템은 3-계층 — TMC, Zone Controller, Local Controller.

![Traffic Management System Layers](/images/blog/ooad/diagrams/ch09-system-layers.svg)

| 계층 | 역할 |
|------|------|
| TMC (Traffic Management Center) | 전체 네트워크 감시, 전략 결정, 비상 대응 |
| Zone | 구역 내 교차로 조율, 연동 제어 (녹색파) |
| Local | 개별 교차로 제어, 센서/액추에이터 인터페이스 |

데이터 흐름은 양방향. 아래에서 위로 — 센서 측정값과 상태 보고. 위에서 아래로 — 전략 명령과 비상 우선 명령.

### 로컬 컨트롤러

```java
// 로컬 교차로 컨트롤러

public class LocalController {
    private final Intersection intersection;
    private final List<Detector> detectors;
    private final SignalController signalController;
    private final ControlStrategy strategy;
    private final EventBus eventBus;

    private final ScheduledExecutorService scheduler;

    public void start() {
        // 센서 폴링 태스크
        scheduler.scheduleAtFixedRate(
            this::pollDetectors,
            0, 100, TimeUnit.MILLISECONDS
        );

        // 제어 결정 태스크
        scheduler.scheduleAtFixedRate(
            this::makeControlDecision,
            0, 1, TimeUnit.SECONDS
        );
    }

    private void pollDetectors() {
        List<DetectorReading> readings = detectors.stream()
            .map(Detector::read)
            .collect(Collectors.toList());

        eventBus.publish(new DetectorReadingsEvent(
            intersection.getId(), readings, Instant.now()
        ));
    }

    private void makeControlDecision() {
        IntersectionState state = buildCurrentState();
        PhaseDecision decision = strategy.decide(state);

        if (shouldChangePhase(decision)) {
            schedulePhaseChange(decision);
        }

        eventBus.publish(new ControlDecisionEvent(
            intersection.getId(), decision, Instant.now()
        ));
    }

    private IntersectionState buildCurrentState() {
        return new IntersectionState(
            intersection.getCurrentPhase(),
            intersection.getPhaseElapsedTime(),
            getLatestReadings(),
            getQueuedDemands()
        );
    }
}

// 신호 컨트롤러 (하드웨어 인터페이스)
public class SignalController {
    private final Map<SignalGroup, SignalHead> signalHeads;
    private final ConflictMonitor conflictMonitor;

    public void setSignalState(SignalGroup group, SignalState state) {
        // 충돌 검사
        if (conflictMonitor.wouldConflict(group, state)) {
            throw new ConflictException(group, state);
        }

        // 하드웨어 명령
        SignalHead head = signalHeads.get(group);
        head.setState(state);

        // 상태 확인
        if (head.getActualState() != state) {
            handleMalfunction(head);
        }
    }

    public void setAllRed() {
        signalHeads.values().forEach(head -> head.setState(SignalState.RED));
    }
}
```

### 구역 컨트롤러

```java
// 구역 조율 컨트롤러

public class ZoneController {
    private final ZoneId zoneId;
    private final List<LocalController> localControllers;
    private final CoordinationStrategy coordinationStrategy;

    public void coordinateSignals() {
        // 구역 내 교통 상태 수집
        ZoneState zoneState = collectZoneState();

        // 연동 계획 계산
        CoordinationPlan plan = coordinationStrategy.plan(zoneState);

        // 각 교차로에 오프셋 전달
        for (IntersectionOffset offset : plan.offsets()) {
            LocalController controller = findController(offset.intersectionId());
            controller.applyOffset(offset.offset());
        }
    }

    private ZoneState collectZoneState() {
        Map<IntersectionId, IntersectionState> states = localControllers.stream()
            .collect(Collectors.toMap(
                lc -> lc.getIntersection().getId(),
                LocalController::getCurrentState
            ));

        return new ZoneState(zoneId, states, Instant.now());
    }
}

// 녹색파 전략
public class GreenWaveStrategy implements CoordinationStrategy {
    private final double targetSpeed;  // m/s
    private final Direction mainDirection;

    @Override
    public CoordinationPlan plan(ZoneState state) {
        List<Intersection> intersections = state.intersectionsByDirection(mainDirection);

        List<IntersectionOffset> offsets = new ArrayList<>();
        Duration cumulativeOffset = Duration.ZERO;

        for (int i = 0; i < intersections.size() - 1; i++) {
            Intersection current = intersections.get(i);
            Intersection next = intersections.get(i + 1);

            double distance = current.getLocation().distanceTo(next.getLocation());
            Duration travelTime = Duration.ofSeconds((long)(distance / targetSpeed));

            cumulativeOffset = cumulativeOffset.plus(travelTime);
            offsets.add(new IntersectionOffset(next.getId(), cumulativeOffset));
        }

        return new CoordinationPlan(offsets, Duration.ofSeconds(90), "Green wave");
    }
}
```

## 안전성 설계

### 충돌 방지

| 수준 | 메커니즘 |
|------|----------|
| 소프트웨어 | 충돌 매트릭스 검사, 상태 전이 검증, 타임아웃 감시 |
| 하드웨어 | 충돌 모니터(독립 장치), 하드웨어 인터록, 안전 릴레이 |
| 안전 실패(fail-safe) | 이상 감지 시 전적색, 통신 두절 시 독립 운행, 전원 실패 시 점멸 모드 |

```java
// 충돌 모니터

public class ConflictMonitor {
    private final ConflictMatrix conflictMatrix;
    private final Duration maxGreenTime;
    private final Duration maxAllRedTime;

    public void monitor(IntersectionState state) {
        // 충돌 검사
        if (hasConflictingGreens(state)) {
            triggerConflictAlert(state);
            forceAllRed();
        }

        // 최대 녹색 시간 검사
        if (state.phaseElapsedTime().compareTo(maxGreenTime) > 0) {
            triggerMaxGreenAlert(state);
            forceNextPhase();
        }

        // 전적색 시간 검사
        if (isAllRed(state) &&
            state.allRedTime().compareTo(maxAllRedTime) > 0) {
            triggerStuckAlert(state);
        }
    }

    private boolean hasConflictingGreens(IntersectionState state) {
        List<SignalGroup> greenGroups = state.signalStates().entrySet().stream()
            .filter(e -> e.getValue() == SignalState.GREEN)
            .map(Map.Entry::getKey)
            .collect(Collectors.toList());

        for (int i = 0; i < greenGroups.size(); i++) {
            for (int j = i + 1; j < greenGroups.size(); j++) {
                if (conflictMatrix.conflicts(greenGroups.get(i), greenGroups.get(j))) {
                    return true;
                }
            }
        }
        return false;
    }

    private void forceAllRed() {
        log.error("CONFLICT DETECTED - Forcing all red");
        eventBus.publish(new ConflictEvent(Instant.now()));
        signalController.setAllRed();
    }
}

// 충돌 매트릭스
public class ConflictMatrix {
    private final boolean[][] matrix;
    private final Map<SignalGroup, Integer> groupIndex;

    public ConflictMatrix(List<SignalGroup> groups, List<ConflictPair> conflicts) {
        int n = groups.size();
        matrix = new boolean[n][n];
        groupIndex = IntStream.range(0, n)
            .boxed()
            .collect(Collectors.toMap(groups::get, Function.identity()));

        for (ConflictPair pair : conflicts) {
            int i = groupIndex.get(pair.group1());
            int j = groupIndex.get(pair.group2());
            matrix[i][j] = true;
            matrix[j][i] = true;
        }
    }

    public boolean conflicts(SignalGroup a, SignalGroup b) {
        return matrix[groupIndex.get(a)][groupIndex.get(b)];
    }
}
```

### 통신 장애 대응

```java
// 통신 관리자

public class CommunicationManager {
    private final Duration heartbeatInterval = Duration.ofSeconds(5);
    private final Duration timeoutThreshold = Duration.ofSeconds(15);

    private final Map<ControllerId, Instant> lastHeartbeat = new ConcurrentHashMap<>();
    private final Map<ControllerId, ConnectionState> connectionStates = new ConcurrentHashMap<>();

    public void handleHeartbeat(ControllerId id) {
        lastHeartbeat.put(id, Instant.now());
        if (connectionStates.get(id) == ConnectionState.DISCONNECTED) {
            connectionStates.put(id, ConnectionState.CONNECTED);
            eventBus.publish(new ConnectionRestoredEvent(id));
        }
    }

    @Scheduled(fixedRate = 5000)
    public void checkConnections() {
        Instant now = Instant.now();
        lastHeartbeat.forEach((id, lastSeen) -> {
            if (Duration.between(lastSeen, now).compareTo(timeoutThreshold) > 0) {
                if (connectionStates.get(id) == ConnectionState.CONNECTED) {
                    connectionStates.put(id, ConnectionState.DISCONNECTED);
                    handleDisconnection(id);
                }
            }
        });
    }

    private void handleDisconnection(ControllerId id) {
        log.warn("Controller {} disconnected - switching to standalone mode", id);
        eventBus.publish(new ConnectionLostEvent(id));

        // 해당 컨트롤러에 독립 운행 모드 지시
        // (통신이 복구되면 전달됨)
        commandQueue.add(new SwitchToStandaloneCommand(id));
    }
}
```

## 비상 차량 우선

```java
// 비상 차량 우선 시스템

public class EmergencyVehiclePreemption {
    private final Map<IntersectionId, PreemptionState> preemptionStates
        = new ConcurrentHashMap<>();

    public void handleEmergencyVehicleDetected(EmergencyVehicleEvent event) {
        IntersectionId intersectionId = event.approachingIntersection();
        Direction approachDirection = event.direction();
        Duration eta = event.estimatedArrivalTime();

        log.info("Emergency vehicle approaching {} from {}, ETA: {}",
            intersectionId, approachDirection, eta);

        // 우선 신호 요청
        PreemptionRequest request = new PreemptionRequest(
            event.vehicleId(),
            intersectionId,
            approachDirection,
            PreemptionPriority.fromVehicleType(event.vehicleType()),
            eta
        );

        initiatePreemption(request);
    }

    private void initiatePreemption(PreemptionRequest request) {
        LocalController controller = controllers.get(request.intersectionId());

        // 현재 페이즈 확인
        Phase currentPhase = controller.getCurrentPhase();
        Phase preemptionPhase = calculatePreemptionPhase(request, currentPhase);

        // 안전한 전환 시퀀스 계획
        TransitionSequence sequence = planSafeTransition(currentPhase, preemptionPhase);

        // 우선 신호 실행
        preemptionStates.put(request.intersectionId(),
            new PreemptionState(request, sequence, Instant.now()));

        controller.executePreemption(sequence);
    }

    private TransitionSequence planSafeTransition(Phase from, Phase to) {
        List<PhaseTransition> transitions = new ArrayList<>();

        // 1. 현재 페이즈 종료 (황색 → 적색)
        transitions.add(new PhaseTransition(from, SignalState.YELLOW, YELLOW_TIME));
        transitions.add(new PhaseTransition(from, SignalState.RED, CLEARANCE_TIME));

        // 2. 전적색 (안전 간격)
        transitions.add(new PhaseTransition(Phase.ALL_RED, SignalState.RED, ALL_RED_TIME));

        // 3. 우선 페이즈 활성화
        transitions.add(new PhaseTransition(to, SignalState.GREEN, Duration.ZERO));

        return new TransitionSequence(transitions);
    }

    public void handleEmergencyVehicleCleared(EmergencyVehicleClearedEvent event) {
        IntersectionId id = event.intersectionId();
        PreemptionState state = preemptionStates.remove(id);

        if (state != null) {
            log.info("Emergency vehicle cleared {}, resuming normal operation", id);
            controllers.get(id).resumeNormalOperation();
        }
    }
}
```

## 상태 다이어그램

### 교차로 제어 상태

![Intersection Controller State Machine](/images/blog/ooad/diagrams/ch09-intersection-state.svg)

| 상태 | 의미 |
|------|------|
| `Initializing` | 부팅·하드웨어 자가 진단 |
| `Normal` | 상위 제어기와 연동, 정상 운행 |
| `Standalone` | 통신 두절, 독립 운행 |
| `Preemption` | 비상 차량 우선 신호 |

### 신호 상태

개별 신호의 색상 상태 머신.

![Signal State Machine](/images/blog/ooad/diagrams/ch09-signal-state.svg)

| 전이 | 조건 |
|------|------|
| `OFF` → `GREEN` | 페이즈 활성화 (`greenOn`) |
| `GREEN` → `YELLOW` | 시간 만료 또는 충돌 요청 |
| `YELLOW` → `RED` | 황색 시간 경과 |
| `RED` → `GREEN` | 다음 페이즈 활성화 |
| 임의 → `FLASH` | 고장 또는 야간 모드 |

## 정리

핵심 추상화:
- **Intersection**: 교차로, 페이즈, 신호 그룹
- **Detector**: 감지기, 교통량 측정
- **ControlStrategy**: 고정, 감응, 적응, 연동 제어
- **ConflictMonitor**: 충돌 방지, 안전 감시

아키텍처:
- **계층 구조**: TMC → Zone → Local
- **로컬 컨트롤러**: 센서/액추에이터 인터페이스
- **구역 컨트롤러**: 연동 제어, 녹색파

안전성:
- **충돌 방지**: 매트릭스, 인터록, 모니터
- **통신 장애**: 독립 운행 모드
- **비상 우선**: 안전 전환, 우선 신호

## 다음 장 예고

Chapter 10에서는 **암호 분석 시스템**을 다룬다. AI와 객체지향의 결합 — 지식 표현, 추론 엔진, 학습.

## 관련 항목

- [Ch 8: Satellite-Based Navigation](/blog/programming/design/ooad/chapter08-satellite-based-navigation) — 항법 시스템
- [Ch 10: Cryptanalysis](/blog/programming/design/ooad/chapter10-cryptanalysis) — 암호 분석
- [OOSC Ch 31: Object-Oriented Programming and Concurrency](/blog/programming/design/oosc/chapter31-object-persistence-and-databases) — 동시성

