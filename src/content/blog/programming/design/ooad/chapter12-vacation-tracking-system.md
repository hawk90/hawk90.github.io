---
title: "Ch 12: Web Application: Vacation Tracking System"
date: 2026-05-19T12:00:00
description: "케이스 스터디 — 휴가 관리 웹 애플리케이션."
series: "Object-Oriented Analysis and Design with Applications"
seriesOrder: 12
tags: [oop, booch, case-study, web-application, vacation]
draft: false
type: book-review
bookTitle: "Object-Oriented Analysis and Design with Applications"
bookAuthor: "Grady Booch"
---

## 한 줄 요약

> 휴가 관리 시스템은 **도메인 모델**, **계층 아키텍처**, **웹 인터페이스**의 협력이다. 객체지향이 비즈니스 규칙과 UI를 깔끔하게 분리한다.

## 문제 도메인

### 시스템 개요

| 구분 | 항목 |
|------|------|
| **목표** | 직원 휴가 신청/승인, 휴가 잔여일 관리, 팀/부서 휴가 현황 파악, 캘린더 통합 |
| **사용자** | 직원(신청, 조회), 관리자(승인/반려, 팀 현황), HR(정책 관리, 보고서) |

### 요구사항

**기능 요구사항**

| 기능 | 세부 내용 |
|------|----------|
| 휴가 신청 | 휴가 유형 선택(연차, 병가, 경조사 등), 기간 지정, 사유 입력, 대리자 지정 |
| 승인 워크플로우 | 직속 상사 승인, 다단계 승인(선택), 자동 알림 |
| 휴가 관리 | 잔여일 계산, 이월/소멸 정책, 휴가 취소 |
| 조회/보고 | 개인 휴가 이력, 팀 휴가 캘린더, 통계 보고서 |

**비기능 요구사항**

| 항목 |
|------|
| 웹 기반 접근 |
| 모바일 반응형 |
| 보안(인증/인가) |
| 감사 로그 |

## 도메인 모델

### 핵심 엔티티

| 개념 | 속성 |
|------|------|
| Employee (직원) | 사번, 이름, 부서, 입사일, 직급, 직속 상사 |
| VacationType (휴가 유형) | 연차/병가/경조사/출산휴가 등, 유급/무급, 연간 할당량 |
| LeaveRequest (휴가 신청) | 신청자, 유형, 시작일, 종료일, 상태(대기, 승인, 반려, 취소), 사유 |
| LeaveBalance (휴가 잔액) | 직원, 연도, 유형별 할당/사용/잔여 |

```java
// 도메인 엔티티

@Entity
public class Employee {
    @Id
    private EmployeeId id;
    private String name;
    private String email;

    @ManyToOne
    private Department department;

    @ManyToOne
    private Employee manager;

    private LocalDate hireDate;
    private EmployeeStatus status;

    public boolean canApprove(LeaveRequest request) {
        return this.equals(request.getEmployee().getManager());
    }

    public int getYearsOfService() {
        return Period.between(hireDate, LocalDate.now()).getYears();
    }
}

@Entity
public class VacationType {
    @Id
    private VacationTypeId id;
    private String name;
    private String description;
    private boolean paid;
    private int defaultDaysPerYear;
    private boolean requiresApproval;
    private boolean allowsHalfDay;

    public int calculateAllocation(Employee employee) {
        // 근속 연수에 따른 추가 할당
        int base = defaultDaysPerYear;
        int serviceYears = employee.getYearsOfService();
        int bonus = Math.min(serviceYears / 3, 5); // 3년당 1일, 최대 5일
        return base + bonus;
    }
}

@Entity
public class LeaveRequest {
    @Id
    private LeaveRequestId id;

    @ManyToOne
    private Employee employee;

    @ManyToOne
    private VacationType vacationType;

    private LocalDate startDate;
    private LocalDate endDate;
    private boolean halfDayStart;
    private boolean halfDayEnd;

    @Enumerated(EnumType.STRING)
    private LeaveStatus status;

    private String reason;

    @ManyToOne
    private Employee substitute;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "request", cascade = CascadeType.ALL)
    private List<ApprovalStep> approvalSteps;

    public double getDurationInDays() {
        long days = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        double duration = days;

        if (halfDayStart) duration -= 0.5;
        if (halfDayEnd) duration -= 0.5;

        return duration;
    }

    public boolean canBeCancelled() {
        return status == LeaveStatus.PENDING
            || (status == LeaveStatus.APPROVED && startDate.isAfter(LocalDate.now()));
    }

    public void submit() {
        if (status != LeaveStatus.DRAFT) {
            throw new IllegalStateException("Can only submit draft requests");
        }
        this.status = LeaveStatus.PENDING;
        this.createdAt = LocalDateTime.now();
    }

    public void approve(Employee approver) {
        if (!approver.canApprove(this)) {
            throw new UnauthorizedException("Not authorized to approve");
        }
        this.status = LeaveStatus.APPROVED;
        this.updatedAt = LocalDateTime.now();
    }

    public void reject(Employee approver, String reason) {
        if (!approver.canApprove(this)) {
            throw new UnauthorizedException("Not authorized to reject");
        }
        this.status = LeaveStatus.REJECTED;
        this.updatedAt = LocalDateTime.now();
    }

    public void cancel() {
        if (!canBeCancelled()) {
            throw new IllegalStateException("Cannot cancel this request");
        }
        this.status = LeaveStatus.CANCELLED;
        this.updatedAt = LocalDateTime.now();
    }
}

@Entity
public class LeaveBalance {
    @Id
    private LeaveBalanceId id;

    @ManyToOne
    private Employee employee;

    @ManyToOne
    private VacationType vacationType;

    private int year;
    private double allocated;
    private double used;
    private double carriedOver;

    public double getRemaining() {
        return allocated + carriedOver - used;
    }

    public boolean hasSufficientBalance(double days) {
        return getRemaining() >= days;
    }

    public void deduct(double days) {
        if (!hasSufficientBalance(days)) {
            throw new InsufficientBalanceException(
                "Insufficient balance: " + getRemaining() + " < " + days
            );
        }
        this.used += days;
    }

    public void restore(double days) {
        this.used = Math.max(0, this.used - days);
    }
}
```

### 값 객체

```java
// 값 객체

public record DateRange(LocalDate start, LocalDate end) {
    public DateRange {
        if (end.isBefore(start)) {
            throw new IllegalArgumentException("End date before start date");
        }
    }

    public long getDays() {
        return ChronoUnit.DAYS.between(start, end) + 1;
    }

    public boolean overlaps(DateRange other) {
        return !this.end.isBefore(other.start) && !other.end.isBefore(this.start);
    }

    public boolean contains(LocalDate date) {
        return !date.isBefore(start) && !date.isAfter(end);
    }
}

public record EmployeeId(String value) {
    public EmployeeId {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Employee ID cannot be empty");
        }
    }
}

public enum LeaveStatus {
    DRAFT,      // 작성 중
    PENDING,    // 승인 대기
    APPROVED,   // 승인됨
    REJECTED,   // 반려됨
    CANCELLED   // 취소됨
}
```

## 계층 아키텍처

### 아키텍처 구조

```text
계층 구조:

┌─────────────────────────────────────────────────────────┐
│                  Presentation Layer                     │
│  ┌───────────────────┐  ┌───────────────────────────┐  │
│  │   Web Controllers │  │   REST API Controllers    │  │
│  └─────────┬─────────┘  └─────────────┬─────────────┘  │
└────────────┼──────────────────────────┼─────────────────┘
             │                          │
┌────────────┼──────────────────────────┼─────────────────┐
│            ▼           Application    ▼                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │               Application Services                │  │
│  │  (LeaveRequestService, ApprovalService, ...)     │  │
│  └─────────────────────────┬─────────────────────────┘  │
└────────────────────────────┼────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────┐
│                            ▼           Domain           │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Domain Model (Entities)              │  │
│  │  (Employee, LeaveRequest, LeaveBalance, ...)      │  │
│  └─────────────────────────┬─────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Domain Services                      │  │
│  │  (BalanceCalculator, PolicyValidator, ...)       │  │
│  └───────────────────────────────────────────────────┘  │
└────────────────────────────┼────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────┐
│                            ▼      Infrastructure        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ Repositories│  │   Email     │  │   Calendar      │  │
│  │             │  │   Service   │  │   Integration   │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 애플리케이션 서비스

```java
// 휴가 신청 서비스

@Service
@Transactional
public class LeaveRequestService {
    private final LeaveRequestRepository requestRepository;
    private final LeaveBalanceRepository balanceRepository;
    private final EmployeeRepository employeeRepository;
    private final LeavePolicy policy;
    private final NotificationService notificationService;

    public LeaveRequestDto createRequest(CreateLeaveRequestCommand command) {
        Employee employee = employeeRepository.findById(command.employeeId())
            .orElseThrow(() -> new EmployeeNotFoundException(command.employeeId()));

        VacationType type = vacationTypeRepository.findById(command.typeId())
            .orElseThrow(() -> new VacationTypeNotFoundException(command.typeId()));

        // 정책 검증
        policy.validate(employee, type, command.startDate(), command.endDate());

        // 잔여일 확인
        LeaveBalance balance = balanceRepository
            .findByEmployeeAndTypeAndYear(employee, type, command.startDate().getYear())
            .orElseThrow(() -> new NoBalanceException(employee.getId(), type.getId()));

        double days = calculateDays(command);
        if (!balance.hasSufficientBalance(days)) {
            throw new InsufficientBalanceException(balance.getRemaining(), days);
        }

        // 신청 생성
        LeaveRequest request = LeaveRequest.builder()
            .employee(employee)
            .vacationType(type)
            .startDate(command.startDate())
            .endDate(command.endDate())
            .halfDayStart(command.halfDayStart())
            .halfDayEnd(command.halfDayEnd())
            .reason(command.reason())
            .status(LeaveStatus.DRAFT)
            .build();

        if (command.substituteId() != null) {
            Employee substitute = employeeRepository.findById(command.substituteId())
                .orElseThrow(() -> new EmployeeNotFoundException(command.substituteId()));
            request.setSubstitute(substitute);
        }

        request = requestRepository.save(request);

        return LeaveRequestDto.from(request);
    }

    public LeaveRequestDto submitRequest(LeaveRequestId requestId) {
        LeaveRequest request = requestRepository.findById(requestId)
            .orElseThrow(() -> new LeaveRequestNotFoundException(requestId));

        request.submit();

        // 잔여일 차감 (승인 전 예약)
        LeaveBalance balance = balanceRepository
            .findByEmployeeAndTypeAndYear(
                request.getEmployee(),
                request.getVacationType(),
                request.getStartDate().getYear())
            .orElseThrow();

        balance.deduct(request.getDurationInDays());

        // 승인자에게 알림
        notificationService.notifyPendingApproval(request);

        return LeaveRequestDto.from(request);
    }

    public LeaveRequestDto cancelRequest(LeaveRequestId requestId, EmployeeId cancelledBy) {
        LeaveRequest request = requestRepository.findById(requestId)
            .orElseThrow(() -> new LeaveRequestNotFoundException(requestId));

        if (!request.getEmployee().getId().equals(cancelledBy)) {
            throw new UnauthorizedException("Only the requester can cancel");
        }

        request.cancel();

        // 잔여일 복원
        LeaveBalance balance = balanceRepository
            .findByEmployeeAndTypeAndYear(
                request.getEmployee(),
                request.getVacationType(),
                request.getStartDate().getYear())
            .orElseThrow();

        balance.restore(request.getDurationInDays());

        // 관련자에게 알림
        notificationService.notifyCancellation(request);

        return LeaveRequestDto.from(request);
    }
}

// 승인 서비스
@Service
@Transactional
public class ApprovalService {
    private final LeaveRequestRepository requestRepository;
    private final NotificationService notificationService;

    public LeaveRequestDto approve(LeaveRequestId requestId, EmployeeId approverId) {
        LeaveRequest request = requestRepository.findById(requestId)
            .orElseThrow(() -> new LeaveRequestNotFoundException(requestId));

        Employee approver = employeeRepository.findById(approverId)
            .orElseThrow(() -> new EmployeeNotFoundException(approverId));

        request.approve(approver);

        // 신청자에게 알림
        notificationService.notifyApproval(request);

        // 캘린더 동기화
        calendarService.addLeaveEvent(request);

        return LeaveRequestDto.from(request);
    }

    public LeaveRequestDto reject(LeaveRequestId requestId, EmployeeId approverId,
                                  String reason) {
        LeaveRequest request = requestRepository.findById(requestId)
            .orElseThrow(() -> new LeaveRequestNotFoundException(requestId));

        Employee approver = employeeRepository.findById(approverId)
            .orElseThrow(() -> new EmployeeNotFoundException(approverId));

        request.reject(approver, reason);

        // 잔여일 복원
        LeaveBalance balance = balanceRepository
            .findByEmployeeAndTypeAndYear(
                request.getEmployee(),
                request.getVacationType(),
                request.getStartDate().getYear())
            .orElseThrow();

        balance.restore(request.getDurationInDays());

        // 신청자에게 알림
        notificationService.notifyRejection(request, reason);

        return LeaveRequestDto.from(request);
    }
}
```

### 도메인 서비스

```java
// 휴가 정책

public interface LeavePolicy {
    void validate(Employee employee, VacationType type,
                  LocalDate start, LocalDate end);
}

@Component
public class StandardLeavePolicy implements LeavePolicy {
    private final HolidayService holidayService;

    @Override
    public void validate(Employee employee, VacationType type,
                         LocalDate start, LocalDate end) {
        // 시작일이 종료일보다 앞인지
        if (end.isBefore(start)) {
            throw new InvalidDateRangeException("End date before start date");
        }

        // 과거 날짜 신청 불가
        if (start.isBefore(LocalDate.now())) {
            throw new PastDateException("Cannot request leave for past dates");
        }

        // 최대 연속 일수 검사
        long days = ChronoUnit.DAYS.between(start, end) + 1;
        if (days > 30) {
            throw new MaxDurationExceededException("Maximum 30 consecutive days");
        }

        // 사전 신청 기간 검사
        long daysInAdvance = ChronoUnit.DAYS.between(LocalDate.now(), start);
        if (type.requiresAdvanceNotice() && daysInAdvance < type.getAdvanceNoticeDays()) {
            throw new InsufficientAdvanceNoticeException(
                type.getAdvanceNoticeDays(), daysInAdvance
            );
        }

        // 블랙아웃 기간 검사
        if (isBlackoutPeriod(start, end)) {
            throw new BlackoutPeriodException("Leave not allowed during blackout period");
        }
    }

    private boolean isBlackoutPeriod(LocalDate start, LocalDate end) {
        // 예: 회계 마감 기간
        return false; // 구현 생략
    }
}

// 잔여일 계산기
@Component
public class LeaveBalanceCalculator {
    private final LeaveBalanceRepository balanceRepository;
    private final LeaveRequestRepository requestRepository;
    private final VacationTypeRepository typeRepository;

    public LeaveBalanceSummary calculateForYear(Employee employee, int year) {
        List<LeaveBalanceDto> balances = new ArrayList<>();

        for (VacationType type : typeRepository.findAll()) {
            LeaveBalance balance = balanceRepository
                .findByEmployeeAndTypeAndYear(employee, type, year)
                .orElseGet(() -> createInitialBalance(employee, type, year));

            balances.add(new LeaveBalanceDto(
                type.getName(),
                balance.getAllocated(),
                balance.getUsed(),
                balance.getCarriedOver(),
                balance.getRemaining()
            ));
        }

        return new LeaveBalanceSummary(employee.getId(), year, balances);
    }

    private LeaveBalance createInitialBalance(Employee employee,
                                              VacationType type, int year) {
        double allocated = type.calculateAllocation(employee);
        double carriedOver = calculateCarryOver(employee, type, year - 1);

        return LeaveBalance.builder()
            .employee(employee)
            .vacationType(type)
            .year(year)
            .allocated(allocated)
            .used(0)
            .carriedOver(carriedOver)
            .build();
    }

    private double calculateCarryOver(Employee employee, VacationType type, int year) {
        return balanceRepository
            .findByEmployeeAndTypeAndYear(employee, type, year)
            .map(b -> Math.min(b.getRemaining(), type.getMaxCarryOver()))
            .orElse(0.0);
    }
}
```

## 웹 계층

### REST API 컨트롤러

```java
// REST API 컨트롤러

@RestController
@RequestMapping("/api/leave-requests")
public class LeaveRequestController {
    private final LeaveRequestService service;

    @PostMapping
    public ResponseEntity<LeaveRequestDto> createRequest(
            @RequestBody @Valid CreateLeaveRequestCommand command,
            @AuthenticationPrincipal UserDetails user) {
        command = command.withEmployeeId(getEmployeeId(user));
        LeaveRequestDto result = service.createRequest(command);
        return ResponseEntity
            .created(URI.create("/api/leave-requests/" + result.id()))
            .body(result);
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<LeaveRequestDto> submitRequest(
            @PathVariable LeaveRequestId id,
            @AuthenticationPrincipal UserDetails user) {
        LeaveRequestDto result = service.submitRequest(id);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<LeaveRequestDto> cancelRequest(
            @PathVariable LeaveRequestId id,
            @AuthenticationPrincipal UserDetails user) {
        LeaveRequestDto result = service.cancelRequest(id, getEmployeeId(user));
        return ResponseEntity.ok(result);
    }

    @GetMapping
    public ResponseEntity<Page<LeaveRequestDto>> getMyRequests(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam(required = false) LeaveStatus status,
            Pageable pageable) {
        EmployeeId employeeId = getEmployeeId(user);
        Page<LeaveRequestDto> requests = service.findByEmployee(employeeId, status, pageable);
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/{id}")
    public ResponseEntity<LeaveRequestDto> getRequest(
            @PathVariable LeaveRequestId id) {
        LeaveRequestDto request = service.findById(id);
        return ResponseEntity.ok(request);
    }
}

// 승인 API
@RestController
@RequestMapping("/api/approvals")
public class ApprovalController {
    private final ApprovalService service;

    @GetMapping("/pending")
    public ResponseEntity<List<LeaveRequestDto>> getPendingApprovals(
            @AuthenticationPrincipal UserDetails user) {
        EmployeeId managerId = getEmployeeId(user);
        List<LeaveRequestDto> pending = service.findPendingForManager(managerId);
        return ResponseEntity.ok(pending);
    }

    @PostMapping("/{requestId}/approve")
    public ResponseEntity<LeaveRequestDto> approve(
            @PathVariable LeaveRequestId requestId,
            @AuthenticationPrincipal UserDetails user) {
        LeaveRequestDto result = service.approve(requestId, getEmployeeId(user));
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{requestId}/reject")
    public ResponseEntity<LeaveRequestDto> reject(
            @PathVariable LeaveRequestId requestId,
            @RequestBody RejectCommand command,
            @AuthenticationPrincipal UserDetails user) {
        LeaveRequestDto result = service.reject(
            requestId, getEmployeeId(user), command.reason()
        );
        return ResponseEntity.ok(result);
    }
}

// 잔여일 API
@RestController
@RequestMapping("/api/balance")
public class LeaveBalanceController {
    private final LeaveBalanceCalculator calculator;

    @GetMapping
    public ResponseEntity<LeaveBalanceSummary> getMyBalance(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam(defaultValue = "#{T(java.time.Year).now().getValue()}") int year) {
        Employee employee = getEmployee(user);
        LeaveBalanceSummary summary = calculator.calculateForYear(employee, year);
        return ResponseEntity.ok(summary);
    }
}
```

### DTO

```java
// DTO

public record LeaveRequestDto(
    LeaveRequestId id,
    EmployeeId employeeId,
    String employeeName,
    VacationTypeId typeId,
    String typeName,
    LocalDate startDate,
    LocalDate endDate,
    boolean halfDayStart,
    boolean halfDayEnd,
    double durationDays,
    LeaveStatus status,
    String reason,
    EmployeeId substituteId,
    String substituteName,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static LeaveRequestDto from(LeaveRequest request) {
        return new LeaveRequestDto(
            request.getId(),
            request.getEmployee().getId(),
            request.getEmployee().getName(),
            request.getVacationType().getId(),
            request.getVacationType().getName(),
            request.getStartDate(),
            request.getEndDate(),
            request.isHalfDayStart(),
            request.isHalfDayEnd(),
            request.getDurationInDays(),
            request.getStatus(),
            request.getReason(),
            request.getSubstitute() != null ? request.getSubstitute().getId() : null,
            request.getSubstitute() != null ? request.getSubstitute().getName() : null,
            request.getCreatedAt(),
            request.getUpdatedAt()
        );
    }
}

public record CreateLeaveRequestCommand(
    EmployeeId employeeId,
    VacationTypeId typeId,
    @NotNull LocalDate startDate,
    @NotNull LocalDate endDate,
    boolean halfDayStart,
    boolean halfDayEnd,
    String reason,
    EmployeeId substituteId
) {
    public CreateLeaveRequestCommand withEmployeeId(EmployeeId id) {
        return new CreateLeaveRequestCommand(
            id, typeId, startDate, endDate, halfDayStart, halfDayEnd, reason, substituteId
        );
    }
}

public record LeaveBalanceSummary(
    EmployeeId employeeId,
    int year,
    List<LeaveBalanceDto> balances
) {}

public record LeaveBalanceDto(
    String typeName,
    double allocated,
    double used,
    double carriedOver,
    double remaining
) {}
```

## 시퀀스 다이어그램

### 휴가 신청 흐름

```text
:Browser    :Controller    :Service    :Repository    :Notification
    │            │             │             │              │
    │ POST /leave-requests     │             │              │
    │───────────▶│             │             │              │
    │            │createRequest│             │              │
    │            │────────────▶│             │              │
    │            │             │ findEmployee│              │
    │            │             │────────────▶│              │
    │            │             │ findType    │              │
    │            │             │────────────▶│              │
    │            │             │ validate    │              │
    │            │             │────┐        │              │
    │            │             │◀───┘        │              │
    │            │             │ findBalance │              │
    │            │             │────────────▶│              │
    │            │             │ save        │              │
    │            │             │────────────▶│              │
    │            │   DTO       │             │              │
    │            │◀────────────│             │              │
    │  201 Created             │             │              │
    │◀───────────│             │             │              │
    │            │             │             │              │
    │ POST /submit             │             │              │
    │───────────▶│             │             │              │
    │            │submitRequest│             │              │
    │            │────────────▶│             │              │
    │            │             │ deductBalance              │
    │            │             │────────────▶│              │
    │            │             │ notifyPendingApproval     │
    │            │             │─────────────────────────▶│
    │  200 OK    │             │             │              │
    │◀───────────│             │             │              │
```

## 정리

도메인 모델:
- **Employee**: 직원, 부서, 관리자 관계
- **LeaveRequest**: 휴가 신청, 상태 머신
- **LeaveBalance**: 휴가 잔액, 유형별 관리
- **VacationType**: 휴가 유형, 정책

계층 아키텍처:
- **Presentation**: REST API, 웹 컨트롤러
- **Application**: 서비스, 트랜잭션 관리
- **Domain**: 엔티티, 비즈니스 규칙
- **Infrastructure**: 저장소, 외부 연동

비즈니스 규칙:
- **정책 검증**: 날짜, 사전 신청, 블랙아웃
- **잔여일 관리**: 할당, 사용, 이월
- **승인 워크플로우**: 권한 검사, 알림

## 시리즈 마무리

이 시리즈는 Booch의 OOA&D 책을 따라가며 객체지향 분석과 설계의 핵심 개념을 다루었다.

핵심 교훈:
- **추상화**: 복잡성을 관리하는 열쇠
- **분류**: 좋은 클래스를 찾는 기술
- **표기법**: 설계를 소통하는 언어
- **프로세스**: 반복적이고 점진적인 개발
- **실무**: 팀, 품질, 재사용

케이스 스터디를 통해 다양한 도메인에서 객체지향 원칙이 어떻게 적용되는지 살펴보았다. 항법 시스템의 실시간성, 교통 관리의 안전성, 암호 분석의 추론, 기상 모니터링의 데이터 흐름, 웹 애플리케이션의 계층 — 모두 객체지향 분해로 복잡성을 관리한다.

## 관련 항목

- [Ch 11: Weather Monitoring Station](/blog/programming/design/ooad/chapter11-weather-monitoring-station) — 기상 모니터링
- [Ch 1: Complexity](/blog/programming/design/ooad/chapter01-complexity) — 복잡성
- [OOSC Ch 1: Software Quality](/blog/programming/design/oosc/chapter01-software-quality) — 품질

