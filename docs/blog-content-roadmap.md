# Blog Content Roadmap

책 목록 기반 블로그 콘텐츠 확장 계획

---

## 상세 계획 문서

| 문서 | 설명 |
|-----|------|
| [cpp-software-design-plan.md](./cpp-software-design-plan.md) | C++ Software Design 39 가이드라인 |
| [cpp-concurrency-in-action-plan.md](./cpp-concurrency-in-action-plan.md) | C++ Concurrency 11장 |
| [clean-architecture-plan.md](./clean-architecture-plan.md) | Clean Architecture 34장 |
| [embedded-courses-design.md](./embedded-courses-design.md) | 임베디드 4개 시리즈 설계 |
| [embedded-courses-references.md](./embedded-courses-references.md) | 임베디드 참고자료 |

---

## 현재 블로그 시리즈 현황

### Programming (14 시리즈)
- Effective C++ (진행중)
- Effective Modern C++ (진행중)
- C++ Software Design (40 가이드라인)
- C++ Concurrency in Action (12장)
- Beautiful C++
- Clean Architecture (35장)
- Code Complete
- Pragmatic Programmer
- GoF Design Patterns (23 패턴)
- Data Structures & Algorithms
- UML
- Refactoring — Fowler (예정)
- Code: The Hidden Language — Petzold (예정)
- 리눅스 커널의 구조와 원리 (예정)

### Embedded (4 시리즈, preface만 존재)
- Modern Embedded Recipes (6 Parts, 36글 예정)
- RTOS Internals (3 Parts, 15글 예정)
- Performance Engineering (4 Parts, 16글 예정)
- Embedded C++ (3 Parts, 12글 예정)

### Writing (8 시리즈, stubs)
- On Writing Well (24장)
- Elements of Style (5장)
- Academic Writing (8 units)
- Style Williams (10 lessons)
- Only Grammar Book (6장)
- 우리글 바로쓰기 - 이오덕 (20장)
- 고종석의 문장 (16장)
- 비판적 사고를 위한 논리 - 박은진·김희정 (예정)

### Math (3 시리즈)
- Linear Algebra
- Set Theory
- How to Solve It

### Parallel (1 시리즈)
- Parallel Principles (3장)

---

## 신규 시리즈 제안

책 목록을 분석한 결과, 다음 시리즈를 추가하면 기존 임베디드 시리즈와 시너지가 높습니다.

---

### 1. Parallel Programming Principles (최우선)

**플랫폼 독립적인 병렬 프로그래밍 원리와 패턴에 집중**

**관련 서적:**
- *The Art of Multiprocessor Programming* - Herlihy & Shavit ★★
- *Structured Parallel Programming* - McCool, Reinders, Robison ★★
- *Patterns for Parallel Programming* - Mattson, Sanders, Massingill ★
- *Seven Concurrency Models in Seven Weeks* - Butcher ★
- *An Introduction to Parallel Programming* - Pacheco
- *C++ Concurrency in Action* - Anthony Williams ★
- *The Art of Concurrency* - Breshears

**제안 구조:**

```
시리즈: Parallel Programming Principles
총 4개 Part, 40개 글

Part 1: Fundamentals (10개)
- 병렬성 vs 동시성
- Amdahl의 법칙, Gustafson의 법칙
- 데이터 병렬성 vs 태스크 병렬성
- 의존성 분석 (data, control, resource)
- 작업 분해 전략
- 공유 메모리 vs 분산 메모리 모델
- 스레드 vs 프로세스
- 병렬 알고리즘 복잡도
- 스케일링 (strong vs weak)
- 효율성과 스피드업

Part 2: Synchronization & Correctness (12개)
- 원자적 연산
- Compare-and-Swap (CAS)
- 락 (mutex, spinlock, rwlock)
- 조건 변수
- 배리어, 래치, 세마포어
- 메모리 모델과 순서 보장
- Acquire-Release 의미론
- 데드락 (원인, 탐지, 회피)
- 라이브락과 기아
- Lock-free 알고리즘 기초
- Wait-free 알고리즘
- ABA 문제

Part 3: Parallel Patterns (12개)
- Map 패턴
- Reduce 패턴
- Scan (Prefix Sum) 패턴
- Fork-Join 패턴
- Divide and Conquer
- Pipeline 패턴
- Producer-Consumer
- Work Stealing
- Stencil 패턴
- Partition 패턴
- 패턴 조합과 중첩
- 패턴 선택 가이드

Part 4: Performance Analysis (6개)
- 병렬 성능 측정
- 스케일링 분석
- 로드 밸런싱
- False Sharing과 캐시 효과
- 통신 오버헤드
- 병렬 벤치마킹 방법론
```

**특징:**
- 플랫폼/벤더 독립적 (CUDA, OpenCL 등 특정 기술 제외)
- 이론과 원리 중심
- 어떤 환경에서든 적용 가능한 패턴
- C++ 예제 (std::thread, std::atomic 수준)

**기존 시리즈와 연결:**
- Embedded Performance Engineering Part 4 (Concurrency) 심화
- Embedded C++ Part 4 (Lock-free 패턴) 확장

---

### 2. Mathematics for Engineers (높은 우선순위)

**관련 서적:**
- *Linear Algebra* - Hoffman, Lang, Shilov, Lay
- *Calculus* - Spivak
- *Principles of Mathematical Analysis* - Rudin
- *Introduction to Probability* - Bertsekas, Ross
- *All of Statistics*
- *The Matrix Cookbook*
- *Mathematics for Machine Learning*
- *Convex Optimization* - Boyd
- *Introduction to Graph Theory*

**제안 구조:**

```
시리즈: Mathematics for Engineers
총 5개 Part, 50개 글

Part 1: Linear Algebra Essentials (15개)
- 벡터 공간, 기저, 차원
- 행렬 연산, 역행렬
- 고유값, 고유벡터
- SVD (특이값 분해)
- 최소제곱법
- 수치적 안정성
- 희소 행렬

Part 2: Calculus & Analysis (10개)
- 극한과 연속
- 미분과 적분
- 다변수 미적분
- 벡터 미적분
- 푸리에 변환

Part 3: Probability & Statistics (15개)
- 확률 공간, 조건부 확률
- 확률 분포
- 기대값, 분산
- 대수의 법칙, 중심극한정리
- 베이즈 정리
- 추정과 검정
- 마르코프 체인

Part 4: Optimization (7개)
- 볼록 최적화 기초
- 경사하강법
- 라그랑주 승수법
- 선형 프로그래밍
- 수치 최적화

Part 5: Discrete Mathematics (3개)
- 그래프 이론 기초
- 조합론
- 알고리즘 분석
```

**활용:**
- ML/AI 시리즈의 사전 지식
- 성능 분석의 수학적 모델링
- 신호 처리, 제어 이론 기초

---

### 3. Computer Vision & Image Processing

**관련 서적:**
- *Computer Vision: Algorithms and Applications* - Szeliski
- *Digital Image Processing* - Gonzalez
- *Pattern Classification* - Duda
- *Computer Vision Metrics*

**제안 구조:**

```
시리즈: Computer Vision Fundamentals
총 4개 Part, 40개 글

Part 1: Image Processing Basics (12개)
- 디지털 이미지 표현
- 히스토그램, 명암 변환
- 공간 필터링 (smoothing, sharpening)
- 주파수 영역 처리
- 에지 검출
- 형태학적 처리

Part 2: Feature Detection & Matching (10개)
- Harris 코너 검출
- SIFT, SURF, ORB
- 특징점 매칭
- RANSAC
- 호모그래피

Part 3: 3D Vision (10개)
- 카메라 모델, 캘리브레이션
- 에피폴라 기하
- 스테레오 비전
- 깊이 추정
- Structure from Motion

Part 4: Deep Learning for Vision (8개)
- CNN 기초
- 객체 검출 (YOLO, SSD)
- 시맨틱 세그멘테이션
- 임베디드 추론 최적화
```

**기존 시리즈와 연결:**
- Modern Embedded Recipes Part 11 (Edge AI)
- Parallel Programming Principles (병렬 패턴)

---

### 4. Systems Programming & OS Internals

**관련 서적:**
- *Understanding the Linux Kernel*
- *Linux Kernel in a Nutshell*
- *Linux System Programming Techniques*
- *Operating System Concepts* - Silberschatz
- *The Design of the Unix*
- *Principles of Computer System Design*

**제안 구조:**

```
시리즈: Linux Systems Deep Dive
총 4개 Part, 40개 글

Part 1: Linux Kernel Fundamentals (12개)
- 커널 구조, 모듈
- 프로세스 관리
- 메모리 관리 (페이징, 슬랩)
- 파일 시스템
- I/O 서브시스템

Part 2: System Programming (10개)
- 시스템 콜 인터페이스
- 프로세스와 스레드
- 시그널 처리
- 파일 I/O (buffered, direct)
- 메모리 매핑

Part 3: Device Drivers (10개)
- 드라이버 아키텍처
- 캐릭터/블록 디바이스
- 네트워크 드라이버
- DMA 드라이버
- 전원 관리

Part 4: Kernel Debugging & Tracing (8개)
- printk, dmesg
- ftrace, perf
- eBPF/bpftrace
- kprobe/uprobe
- crash dump 분석
```

**기존 시리즈와 연결:**
- Modern Embedded Recipes Part 7 (Linux Embedded)
- Performance Engineering Part 5 (Profiling Tools)

---

### 5. Distributed Systems & Architecture

**관련 서적:**
- *Distributed Systems* - Tanenbaum
- *Building Microservices* - Newman
- *Designing Distributed Systems*
- *Software Engineering at Google*
- *Fundamentals of Software Architecture*
- *Patterns of Enterprise Application Architecture*

**제안 구조:**

```
시리즈: Distributed Systems Engineering
총 4개 Part, 35개 글

Part 1: Fundamentals (10개)
- 분산 시스템 개요
- CAP 정리
- 일관성 모델
- 시간과 순서
- 합의 프로토콜 (Paxos, Raft)

Part 2: Communication & Coordination (8개)
- RPC, gRPC
- 메시지 큐
- 서비스 디스커버리
- 로드 밸런싱
- 서킷 브레이커

Part 3: Storage & Data (10개)
- 복제, 파티셔닝
- 분산 트랜잭션
- 분산 파일 시스템
- 키-값 스토어
- 이벤트 소싱

Part 4: Microservices & Cloud Native (7개)
- 마이크로서비스 아키텍처
- 컨테이너 오케스트레이션
- 서비스 메시
- 관찰 가능성
- CI/CD 파이프라인
```

---

### 6. Machine Learning Engineering

**관련 서적:**
- *Pattern Recognition and Machine Learning* - Bishop
- *The Elements of Statistical Learning*
- *Machine Learning Design Patterns*
- *Machine Learning Engineering*
- *Approaching (Almost) Any Machine Learning Problem*
- *Scaling up Machine Learning*

**제안 구조:**

```
시리즈: Machine Learning Engineering
총 4개 Part, 40개 글

Part 1: ML Fundamentals (12개)
- 지도학습 (회귀, 분류)
- 비지도학습 (클러스터링, 차원축소)
- 모델 평가, 교차 검증
- 특성 공학
- 앙상블 방법

Part 2: Deep Learning (10개)
- 신경망 기초
- CNN, RNN, Transformer
- 학습 기법 (optimizer, regularization)
- 전이 학습
- 모델 해석

Part 3: MLOps & Production (10개)
- 데이터 파이프라인
- 피처 스토어
- 모델 서빙
- A/B 테스트
- 모니터링, 드리프트 탐지

Part 4: Embedded ML (8개)
- 모델 경량화
- 양자화, 프루닝
- 온디바이스 추론
- TinyML
- 하드웨어 가속
```

**기존 시리즈와 연결:**
- Modern Embedded Recipes Part 11 (Edge AI)
- Mathematics for Engineers Part 3-4 (확률, 최적화)

---

### 7. Refactoring — Martin Fowler

**책 정보:**
- *Refactoring: Improving the Design of Existing Code* — Fowler, 2nd ed (2018)
- 1st edition (1999) — Java / 2nd edition (2018) — JavaScript
- ~440쪽, 12장 + 88 refactoring catalog
- "코드 냄새 → 리팩토링 매핑"의 정전

**제안 구조:**

```
시리즈: Refactoring (Fowler 2nd Edition)
총 ~95개 글 (개념 7 + catalog 88)

Part 1: Principles (Ch 1-3, ~5개)
- 첫 예제 (비디오 대여 시스템)
- 리팩토링 원칙
- Bad Smells in Code (24 smells)

Part 2: Tests & Composing (Ch 4-6, ~4개)
- 테스트 구축
- 메서드 합성 / 분해
- Move 계열 리팩토링

Part 3: Encapsulation, Features (Ch 7-9, ~3개)
- 캡슐화 강화
- 기능 이동
- 데이터 조직화

Part 4: Conditional, API, Inheritance (Ch 10-12, ~3개)
- 조건문 단순화
- API 리팩토링
- 상속 다루기

Catalog: 88 리팩토링 (각 글 1-2)
- Extract Function / Variable
- Inline Function / Variable
- Change Function Declaration
- Encapsulate Variable
- Rename Variable
- Move Function / Field
- Replace Conditional with Polymorphism
- ... (총 88개)
```

**예제 통일** — JavaScript 원본 → TypeScript + C++ 병행 (시리즈 결합)

**기존 시리즈와 연결:**
- C++ Software Design 가이드라인 1-2 (변경 친화)
- Clean Architecture Ch 7-11 (SOLID)
- GoF — Strategy / Visitor / State 등 (Replace Conditional 등에서)

---

### 8. Code: The Hidden Language — Charles Petzold

**책 정보:**
- *Code: The Hidden Language of Computer Hardware and Software* — Petzold, 2nd ed (2022)
- ~430쪽, 28장
- "모스 부호 → CPU"까지 bottom-up — 컴퓨터 본질의 정전
- 64선 추천 도서

**제안 구조:**

```
시리즈: Code (Petzold 2nd Edition)
총 29개 글 (overview + 28장)

Part 1: Information & Signals (Ch 1-7, 7개)
- 손전등 통신, 모스 부호
- 점자, 코드의 본질
- 전기, 전선과 신호
- 논리 게이트

Part 2: From Gates to Computers (Ch 8-16, 9개)
- 부호화, 이진수
- 가산기 / 감산기
- 플립플롭, 카운터
- 메모리

Part 3: A CPU (Ch 17-22, 6개)
- 자동화
- 단순 CPU 설계
- 명령어 / 어셈블리
- 인텔 8080 / 모토로라 6800

Part 4: Modern Computer (Ch 23-28, 6개)
- 운영체제
- 부동소수점
- 그래픽
- 인터넷
- 마무리
```

**위상:**
- 가장 낮은 추상에서 시작하는 입문 — 면접 / 기초 다지기
- Computer Architecture (Hennessy/Patterson)의 사전 단계
- 임베디드 / OS 시리즈의 학부 기초

---

### 9. 리눅스 커널의 구조와 원리

**책 정보:**
- 후보 — *리눅스 커널의 구조와 원리* (김민장) 또는 *리눅스 커널 내부구조* (백승재/최태영)
- 또는 — *Understanding the Linux Kernel* (Bovet/Cesati) 한국어로 다룸
- 한국어 출판 / 한국어 자료 풍부

**위상:**
- 기존 로드맵의 "Linux Systems Deep Dive"와 부분 겹침
- 그러나 — Kernel **내부 구조**에 집중 (vs 시스템 프로그래밍)
- 임베디드 Linux Recipe Part 7과 시너지

**제안 구조:**

```
시리즈: 리눅스 커널의 구조와 원리
총 ~25개 글, 5 Part

Part 1: Boot & Kernel Init (4개)
- 부트로더 → 커널 진입
- 커널 초기화 시퀀스
- 메모리 맵 구성
- init / systemd 프로세스 1

Part 2: Process / Scheduling (6개)
- task_struct 자세히
- fork / exec / exit
- 스케줄러 (CFS, RT, deadline)
- 컨텍스트 스위치
- 시그널 처리
- namespace / cgroup

Part 3: Memory Management (6개)
- 페이지 / zone / node
- buddy allocator
- slab / slub / slob
- vmalloc
- page cache
- swap

Part 4: File System / I/O (5개)
- VFS 계층
- ext4 / Btrfs / XFS 비교
- 블록 I/O 계층
- Direct I/O / O_SYNC
- io_uring

Part 5: Synchronization & Debug (4개)
- 동기화 primitives (spinlock, mutex, rwsem, RCU)
- 인터럽트 / softirq / tasklet / workqueue
- ftrace / perf / eBPF
- crash dump 분석
```

**기존 시리즈와 연결:**
- C++ Concurrency Ch 5 (메모리 모델) — 커널 시각으로
- Modern Embedded Recipes Part 7 (Linux Embedded)
- Performance Engineering — 프로파일링 / 트레이싱

**언어 선택:**
- 본문 — 한국어 (한국어 책 기반)
- 코드 예제 — C (커널 표준)
- 어셈블리 — x86_64 / ARM64 일부

---

### 10. 비판적 사고를 위한 논리 — 박은진·김희정

**책 정보:**
- *비판적 사고를 위한 논리* [개정판] — 박은진·김희정 (아카넷)
- 한국어 형식 / 비형식 논리 교과서
- 학부 논리학 입문 / 비판적 사고 표준 교재

**위상:**
- Writing 시리즈의 사고 측면 — 논증의 형식 분석
- Math의 "How to Solve It" (Polya)와 다른 축 — 추론 구조 자체
- 기술 문서 / 논문의 논리 구조에도 적용
- 비판적 평가 능력 — 코드 리뷰 / 디자인 토론에도 전이

**제안 구조:**

```
시리즈: 비판적 사고를 위한 논리
총 ~16개 글, 4 Part

Part 1: 논리와 논증의 기초 (4개)
- 논증이란 무엇인가 — 명제 / 전제 / 결론
- 연역 논증과 귀납 논증
- 타당성, 건전성, 강도
- 논증 다이어그램 / 구조 분석

Part 2: 형식 논리 (5개)
- 명제 논리 — 연결사 / 진리표
- 자연 연역 — 추론 규칙
- 명제 논리 타당성 증명
- 술어 논리 기초
- 양화사 / 변항

Part 3: 비형식 논리 — 오류와 평가 (4개)
- 형식적 오류
- 비형식적 오류 — 관련성 / 모호성 / 가정
- 귀납 논증 평가 — 강도 / 신뢰성
- 인과 / 유비 / 가설 논증

Part 4: 적용 (3개)
- 학술 / 기술 글의 논증 구조 분석
- 반론과 재반론
- 비판적 읽기 / 쓰기 종합
```

**기존 시리즈와 연결:**
- Writing 7개 — 표현
- 비판적 사고를 위한 논리 — 사고의 형식 (표현 이전)
- Academic Writing — 학술 글 형식
- Math의 집합론 / How to Solve It — 형식적 사고의 다른 축
- 코드 리뷰 — 비형식 논리 + 형식 검증의 일상 응용

**언어:**
- 한국어 원본 — 한국어로 작성

---

## 우선순위 및 로드맵

### Phase 1 (높은 우선순위)

| 시리즈 | 이유 | 예상 글 수 |
|-------|------|----------|
| Parallel Programming Principles | 임베디드/성능과 직접 연결, 플랫폼 독립적 원리 | 40 |
| Mathematics for Engineers | 다른 모든 시리즈의 기초, 차별화 요소 | 50 |

### Phase 2 (중간 우선순위)

| 시리즈 | 이유 | 예상 글 수 |
|-------|------|----------|
| Computer Vision | Edge AI와 연결, 실무 수요 | 40 |
| Linux Systems Deep Dive | Embedded Linux와 연결 | 40 |

### Phase 3 (장기 계획)

| 시리즈 | 이유 | 예상 글 수 |
|-------|------|----------|
| Distributed Systems | 클라우드 엣지 연동 | 35 |
| ML Engineering | AI 배포, 임베디드 ML | 40 |

### Phase 추가 (사용자 요청)

| 시리즈 | 이유 | 예상 글 수 |
|-------|------|----------|
| Refactoring (Fowler) | 코드 품질 / 변경 친화 — 모든 C++ 시리즈와 시너지 | ~95 |
| Code (Petzold) | 학부 기초 / 면접 / Computer Architecture 사전 단계 | 29 |
| 리눅스 커널의 구조와 원리 | 임베디드 Linux / 시스템 프로그래밍 심화 | ~25 |
| 비판적 사고를 위한 논리 (박은진·김희정) | 형식·비형식 논리 — 사고 / 논증 / 비판적 평가 | ~16 |

---

## 기존 시리즈 보강 포인트

### Modern Embedded Recipes

**추가할 내용 (책 기반):**

| Part | 추가 레시피 | 참고 서적 |
|------|-----------|---------|
| Part 2 (프로세서) | ARM 어셈블리 심화 | ARM System Developer's Guide |
| Part 7 (Linux) | 커널 내부 심화 | Understanding the Linux Kernel |
| Part 10 (FPGA) | PCIe 심화 | PCI Express System Architecture |
| Part 11 (Edge AI) | 모델 최적화 심화 | ML Engineering |

### Performance Engineering

**추가할 내용:**

| Part | 추가 글 | 참고 서적 |
|------|--------|---------|
| Part 2 (CPU) | SIMD 최적화 | Intel Xeon Phi Programming |
| Part 4 (Concurrency) | Lock-free 심화 | The Art of Multiprocessor Programming |
| Part 5 (Tools) | 병렬 프로파일링 | Performance Analysis and Tuning |

### Embedded C++

**추가할 내용:**

| Part | 추가 글 | 참고 서적 |
|------|--------|---------|
| Part 4 (Patterns) | 동시성 패턴 | C++ Concurrency in Action |
| Part 5 (HAL) | 타입 안전 레지스터 | Making Embedded Systems |

---

## 참고 서적 분류 (전체)

### Computer Architecture / Hardware (4권)
- Computer Architecture - A Quantitative Approach ★
- Computer Organisation and Design ★
- Digital Design
- PCI Express System Architecture ★

### Embedded / Systems (3권)
- Making Embedded Systems ★
- Security in Embedded Devices
- Interconnecting Smart Objects with IP

### Linux / OS (6권)
- Understanding the Linux Kernel ★
- Linux Kernel in a Nutshell
- Linux System Programming Techniques ★
- Operating System Concepts ★
- The Design of the Unix
- Principles of Computer System Design

### Parallel Programming - 원리/패턴 (핵심, 7권)
- The Art of Multiprocessor Programming ★★
- Structured Parallel Programming ★★
- Patterns for Parallel Programming ★
- C++ Concurrency in Action ★★
- Seven Concurrency Models in Seven Weeks ★
- The Art of Concurrency ★
- An Introduction to Parallel Programming

### Parallel Programming - 플랫폼별 (참고, 11권)
- Programming Massively Parallel Processors (CUDA)
- CUDA Handbook (CUDA)
- Professional CUDA C Programming (CUDA)
- CUDA by Example (CUDA)
- Using OpenMP (OpenMP)
- OpenCL Programming Guide (OpenCL)
- Heterogeneous Computing with OpenCL (OpenCL)
- Intel Xeon Phi High Performance Programming (Xeon Phi)
- Parallel Programming in C with MPI and OpenMP (MPI/OpenMP)
- High Performance Parallelism Pearls (Mixed)
- Multicore Application Programming (Mixed)

### C/C++ (6권)
- C Interfaces and Implementations ★
- Extreme C ★
- Modern C ★
- Professional C++ ★
- CMake Best Practices
- Professional CMake

### Algorithms (4권)
- The Algorithm Design Manual ★
- Introduction to Algorithms (CLRS) ★★
- 50 Algorithms Every Programmer Should Know
- Purely Functional Data Structures

### Machine Learning / AI (12권)
- Pattern Recognition and Machine Learning ★★
- The Elements of Statistical Learning ★★
- Introduction to Machine Learning
- Mathematics for Machine Learning ★
- Machine Learning Design Patterns ★
- Machine Learning Engineering
- Bayesian Reasoning and Machine Learning
- Learning from Data
- Approaching Any Machine Learning Problem
- Scaling up Machine Learning
- Deep Learning Illustrated
- An Introduction to Statistical Learning

### Mathematics (15권)
- Linear Algebra (Hoffman, Lang, Shilov, Lay) ★★
- Calculus - Spivak ★
- Principles of Mathematical Analysis - Rudin ★
- The Matrix Cookbook ★
- Convex Optimization - Boyd ★★
- All of Statistics ★
- Introduction to Probability - Bertsekas ★★
- The Princeton Companion to Mathematics
- Mathematics for Computer Science
- Introduction to Graph Theory
- Introduction to Analysis
- The Way of Analysis

### Computer Vision (4권)
- Computer Vision: Algorithms and Applications ★★
- Digital Image Processing ★
- Pattern Classification ★
- Computer Vision Metrics

### Distributed / Cloud (8권)
- Distributed Systems - Tanenbaum ★★
- Building Microservices ★
- Designing Distributed Systems
- Software Engineering at Google ★
- Fundamentals of Software Architecture ★
- Docker (여러 권)
- Infrastructure as Code

### Security (7권)
- Analyzing Computer Security
- Cyber Threat Intelligence
- Machine Learning and Security
- Network Security Through Data Analysis
- A Practical Guide to Trusted Computing
- Secure Integrated Circuits and Systems
- Security in Embedded Devices

### Writing (10권)
- On Writing Well ★
- The Elements of Style ★
- Writing for Computer Science ★
- How to Write & Publish Scientific Paper
- Academic Writing for Graduate Students

### 프로그래머 필독서 64선 (선별 21권)

**Core Fundamentals (핵심)**
- The Pragmatic Programmer - Hunt & Thomas ★★
- Code Complete - McConnell ★★
- Refactoring - Fowler ★★
- Design Patterns (GoF) - Gamma et al ★★
- The Mythical Man-Month - Brooks ★★

**Code Quality (코드 품질)**
- Test Driven Development: By Example - Beck ★
- Working Effectively with Legacy Code - Feathers ★

**Algorithms & CS (알고리즘)**
- Programming Pearls - Bentley ★
- Structure and Interpretation of Computer Programs - Abelson & Sussman ★
- Introduction to Algorithms (CLRS) - Cormen et al ★★
- How to Solve It - Polya ★

**Systems (시스템)**
- Advanced Programming in the UNIX Environment - Stevens ★★
- The Art of UNIX Programming - Raymond ★
- Computer Architecture: A Quantitative Approach - Hennessy & Patterson ★★

**Team & Process (팀/프로세스)**
- Peopleware - DeMarco & Lister ★
- Rapid Development - McConnell ★
- Extreme Programming Explained - Beck ★

**Design & Thinking (설계/사고)**
- Head First Design Patterns - Freeman ★
- The Design of Everyday Things - Norman ★
- Code: The Hidden Language - Petzold ★
- Hackers & Painters - Graham ★

★ = 핵심 참고
★★ = 시리즈 주요 참고

---

## 다음 단계

### 우선순위 1: 기존 시리즈 본문 작성
- [ ] C++ Software Design 파일럿 (가이드라인 1-3)
- [ ] C++ Concurrency 파일럿 (Ch 1-2)
- [ ] Clean Architecture 파일럿 (Ch 1-2)

### 우선순위 2: Embedded 본문 시작
- [ ] Modern Embedded Recipes Part 1 첫 글

### 우선순위 3: Writing 시리즈 본문 작성
- [ ] On Writing Well 1-3장

---

*문서 작성일: 2026-05-12*
*최종 수정: 2026-05-13 (Refactoring / Code / 리눅스 커널 / 비판적 사고를 위한 논리 추가)*
