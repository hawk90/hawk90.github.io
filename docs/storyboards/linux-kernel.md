# 디버깅을 통해 배우는 리눅스 커널의 구조와 원리 — 스토리보드

## 원서 정보

- **제목**: 디버깅을 통해 배우는 리눅스 커널의 구조와 원리 (1, 2권)
- **저자**: 김동현 (Austin Kim)
- **출판**: 위키북스 (2021)
- **커널 기준**: 4.19 LTS
- **타겟**: 라즈베리 파이 3B+

## 최신화 전략

원서가 커널 4.19 기준이라 다음을 보강한다:

| 원서 내용 | 최신화 (커널 6.x) |
|----------|------------------|
| ftrace 기본 | ftrace + BPF/bpftrace |
| TRACE32 (상용) | QEMU + GDB 대안 제시 |
| Raspberry Pi 3B+ | Raspberry Pi 4/5, QEMU |
| CFS 스케줄러 | EEVDF (6.6+) 언급 |
| 기존 동기화 | PREEMPT_RT 패치 언급 |
| ARM32 위주 | ARM64 코드 병행 |

---

## 시리즈 구조 (16장)

```
리눅스 커널의 구조와 원리 (16장)
│
├── Part 1: 환경과 디버깅 (3장) ──────── 라즈베리파이, ftrace, 디버깅
├── Part 2: 프로세스 (2장) ───────────── 프로세스 생성/소멸, task_struct
├── Part 3: 인터럽트 (3장) ───────────── 인터럽트, Bottom Half, 워크큐
├── Part 4: 타이머와 동기화 (2장) ────── jiffies, 스핀락, 뮤텍스
├── Part 5: 스케줄링 (2장) ───────────── CFS, 컨텍스트 스위칭
├── Part 6: 시스템 인터페이스 (2장) ─── 시스템 콜, 시그널
└── Part 7: 메모리와 VFS (2장) ───────── 가상 메모리, VFS
```

---

## Part 1: 환경과 디버깅 (ch01-03)

| Ch | 제목 | 원서 | 최신화 |
|----|------|------|--------|
| 01 | 리눅스 소개와 환경 구축 | Ch 1-2 | QEMU, Raspberry Pi 4/5 |
| 02 | ftrace와 커널 트레이싱 | Ch 3 | BPF, bpftrace 추가 |
| 03 | 커널 디버깅 실전 | Ch 3 | GDB + QEMU, crash utility |

**Ch 01 상세:**
- 리눅스 역사와 전망
- 임베디드 리눅스 개발 조직
- 필요 지식
- 라즈베리 파이 4/5 설정 (원서: 3B+)
- QEMU 가상 환경 대안
- 커널 빌드와 설치

**Ch 02 상세:**
- printk와 동적 디버그
- dump_stack() 함수
- ftrace 완전 정복
- trace-cmd와 KernelShark
- BPF와 bpftrace (최신화)
- debugfs 드라이버 작성

**Ch 03 상세:**
- TRACE32 vs QEMU+GDB
- KGDB/KDB 사용법
- crash utility로 덤프 분석
- 커널 OOPS 분석

---

## Part 2: 프로세스 (ch04-05)

| Ch | 제목 | 원서 | 최신화 |
|----|------|------|--------|
| 04 | 프로세스 기초 | Ch 4 | clone3(), pidfd |
| 05 | task_struct와 스레드 | Ch 4 | 커널 스레드 kthread API |

**Ch 04 상세:**
- 프로세스 개념
- 유저 프로세스와 커널 스레드
- fork(), exec(), exit() 흐름
- clone3() 시스템 콜 (최신화)
- pidfd 인터페이스 (최신화)
- 프로세스 생성 커널 코드 분석
- 프로세스 종료 분석

**Ch 05 상세:**
- task_struct 구조체 완전 분석
- thread_info 구조체
- current 매크로
- PID 네임스페이스
- kthread_create/kthread_run
- kthread_worker (최신화)

---

## Part 3: 인터럽트 (ch06-08)

| Ch | 제목 | 원서 | 최신화 |
|----|------|------|--------|
| 06 | 인터럽트 처리 | Ch 5 | GICv3, ITS (ARM64) |
| 07 | 인터럽트 후반부 | Ch 6 | threaded IRQ 권장 |
| 08 | 워크큐 | Ch 7 | WQ_UNBOUND, system_wq |

**Ch 06 상세:**
- 인터럽트 개념
- 인터럽트 컨텍스트
- 인터럽트 핸들러 등록
- 인터럽트 디스크립터
- GICv3 (ARM64) 추가
- in_interrupt() 매크로
- 인터럽트 비활성화 타이밍

**Ch 07 상세:**
- Bottom Half 기법 개요
- IRQ 스레드 (threaded IRQ)
- Soft IRQ 서비스
- ksoftirqd 스레드
- Tasklet
- 언제 threaded IRQ vs Soft IRQ?
- ftrace로 후반부 추적

**Ch 08 상세:**
- 워크큐 개념
- 워크 구조체
- 시스템 워크큐 vs 커스텀 워크큐
- WQ_UNBOUND, WQ_HIGHPRI
- 워커 스레드 풀
- Delayed Work
- 워크큐 디버깅

---

## Part 4: 타이머와 동기화 (ch09-10)

| Ch | 제목 | 원서 | 최신화 |
|----|------|------|--------|
| 09 | 커널 타이머 | Ch 8 | hrtimer, NO_HZ_FULL |
| 10 | 동기화 기법 | Ch 9 | lockdep, PREEMPT_RT |

**Ch 09 상세:**
- HZ와 jiffies
- 저해상도 타이머 (timer_list)
- 고해상도 타이머 (hrtimer)
- 동적 타이머 등록/실행
- msecs_to_jiffies()
- NO_HZ, NO_HZ_FULL (최신화)
- ftrace로 타이머 추적

**Ch 10 상세:**
- 임계 영역과 경쟁 조건
- 스핀락 상세 분석
- raw_spinlock vs spinlock
- 뮤텍스 상세 분석
- 세마포어
- RCU (Read-Copy-Update)
- lockdep 사용법 (최신화)
- PREEMPT_RT 언급 (최신화)

---

## Part 5: 스케줄링 (ch11-12)

| Ch | 제목 | 원서 | 최신화 |
|----|------|------|--------|
| 11 | CFS 스케줄러 | Ch 10 | EEVDF (6.6+) |
| 12 | 컨텍스트 스위칭 | Ch 10 | ARM64 코드 |

**Ch 11 상세:**
- 스케줄링 개념
- 선점형 vs 비선점형
- 프로세스 상태 머신
- 스케줄러 클래스
- 런큐 (rq 구조체)
- CFS 알고리즘 상세
- vruntime 계산
- EEVDF 스케줄러 (6.6+) 언급 (최신화)
- ftrace로 스케줄링 추적

**Ch 12 상세:**
- 컨텍스트 스위칭 정의
- schedule() 함수 분석
- __schedule() 상세
- context_switch() 함수
- switch_to 매크로
- ARM32/ARM64 어셈블리 (최신화)
- ftrace로 컨텍스트 스위칭 추적

---

## Part 6: 시스템 인터페이스 (ch13-14)

| Ch | 제목 | 원서 | 최신화 |
|----|------|------|--------|
| 13 | 시스템 콜 | Ch 11 | ARM64 syscall |
| 14 | 시그널 | Ch 12 | signalfd, pidfd_send_signal |

**Ch 13 상세:**
- 시스템 콜 개념
- glibc → 커널 흐름
- ARM32 SWI vs ARM64 SVC
- 시스템 콜 테이블
- sys_* 핸들러 분석
- SYSCALL_DEFINEx 매크로
- 시스템 콜 반환 과정
- strace + ftrace 디버깅

**Ch 14 상세:**
- 시그널 개념
- 시그널 종류와 동작
- sigaction() 시스템 콜
- 커널 시그널 전달 과정
- __send_signal() 분석
- do_signal() 분석
- signalfd (최신화)
- pidfd_send_signal (최신화)
- ftrace로 시그널 추적

---

## Part 7: 메모리와 VFS (ch15-16)

| Ch | 제목 | 원서 | 최신화 |
|----|------|------|--------|
| 15 | 메모리 관리 | Ch 14 | SLUB, folio |
| 16 | 가상 파일시스템 | Ch 13 | io_uring 언급 |

**Ch 15 상세:**
- 가상 메모리 개념
- 페이지와 페이지 프레임
- 페이지 테이블
- 가상→물리 주소 변환
- 메모리 존
- kmalloc과 GFP 플래그
- SLUB 할당자 (최신화: SLAB 폐지)
- folio 추상화 (최신화)
- ftrace로 메모리 할당 추적

**Ch 16 상세:**
- VFS 개념
- file, inode, dentry, superblock
- file_operations
- 파일 시스템별 처리
- 프로세스의 파일 관리 (files_struct)
- open/read/write/close 분석
- io_uring 언급 (최신화)
- ftrace로 VFS 추적

---

## 난이도별 분류

### 필수 (Core) — 10장
| Ch | 제목 |
|----|------|
| 01 | 리눅스 소개와 환경 구축 |
| 02 | ftrace와 커널 트레이싱 |
| 04 | 프로세스 기초 |
| 05 | task_struct와 스레드 |
| 06 | 인터럽트 처리 |
| 07 | 인터럽트 후반부 |
| 10 | 동기화 기법 |
| 11 | CFS 스케줄러 |
| 13 | 시스템 콜 |
| 15 | 메모리 관리 |

### 중급 (Intermediate) — 4장
| Ch | 제목 |
|----|------|
| 03 | 커널 디버깅 실전 |
| 08 | 워크큐 |
| 09 | 커널 타이머 |
| 16 | 가상 파일시스템 |

### 고급 (Advanced) — 2장
| Ch | 제목 |
|----|------|
| 12 | 컨텍스트 스위칭 |
| 14 | 시그널 |

---

## 학습 경로

### 경로 A: 커널 입문 (8장)
```
Ch 01 → 02 → 04 → 06 → 10 → 11 → 13 → 15
```

### 경로 B: 인터럽트/동기화 전문 (10장)
```
Ch 01 → 02 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 03
```

### 경로 C: 시스템 프로그래머 (12장)
```
Ch 01 → 02 → 04 → 05 → 13 → 14 → 15 → 16 → 10 → 11 → 12 → 03
```

---

## 실무 도구

| 도구 | 용도 |
|------|------|
| `ftrace` | 커널 함수 추적 |
| `trace-cmd` | ftrace 프론트엔드 |
| `KernelShark` | ftrace GUI |
| `bpftrace` | BPF 기반 트레이싱 |
| `perf` | 성능 프로파일링 |
| `crash` | 커널 덤프 분석 |
| `QEMU+GDB` | 커널 디버깅 |

---

## 참고 자료

- [원서 - 위키북스](https://wikibook.co.kr/linux-kernel-1/)
- [저자 인프런 강의](https://www.inflearn.com/users/1180851/@austinkernelkim)
- [kernel.org Documentation](https://www.kernel.org/doc/html/latest/)
- [Bootlin Training](https://bootlin.com/docs/)

---

## 다음 단계

1. 00-overview.md 작성
2. 스텁 파일 생성 (16개)
3. Part 1부터 순차 작성
