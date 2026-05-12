# Blog Content Roadmap

책 목록 기반 블로그 콘텐츠 확장 계획

---

## 현재 블로그 시리즈 현황

| 카테고리 | 시리즈 | Part | 글 수 |
|---------|-------|------|------|
| Programming | Effective C++ | - | 진행중 |
| Programming | Effective Modern C++ | - | 진행중 |
| Embedded | Modern Embedded Recipes | 11 | 145 |
| Embedded | RTOS Internals | 5 | 45 |
| Embedded | Performance Engineering | 6 | 50 |
| Embedded | Embedded C++ | 5 | 40 |

---

## 신규 시리즈 제안

책 목록을 분석한 결과, 다음 시리즈를 추가하면 기존 임베디드 시리즈와 시너지가 높습니다.

---

### 1. Parallel Computing & HPC (최우선)

**관련 서적:**
- *Programming Massively Parallel Processors* - Kirk & Hwu
- *CUDA Handbook* - Nicholas Wilt
- *Professional CUDA C Programming*
- *CUDA by Example*
- *The Art of Multiprocessor Programming* - Herlihy & Shavit
- *C++ Concurrency in Action* - Anthony Williams
- *Using OpenMP*
- *OpenCL Programming Guide*
- *Heterogeneous Computing with OpenCL*
- *Seven Concurrency Models in Seven Weeks*
- *Structured Parallel Programming*
- *Intel Xeon Phi High Performance Programming*

**제안 구조:**

```
시리즈: Parallel Computing Mastery
총 6개 Part, 60개 글

Part 1: Parallel Computing Fundamentals (10개)
- 병렬 컴퓨팅 개요, Amdahl의 법칙
- 공유 메모리 vs 분산 메모리
- 스레드, 프로세스, 동기화
- 데이터 병렬성 vs 태스크 병렬성
- 병렬 알고리즘 설계 패턴

Part 2: CPU Parallelism - OpenMP & TBB (10개)
- OpenMP 기초 (pragma, 지시어)
- OpenMP 고급 (task, SIMD)
- Intel TBB 소개
- 캐시 친화적 병렬 코드
- False sharing 회피

Part 3: GPU Computing - CUDA (15개)
- GPU 아키텍처 이해
- CUDA 프로그래밍 모델
- 메모리 계층 (global, shared, constant, texture)
- Warp와 스레드 스케줄링
- 최적화 기법 (coalescing, bank conflict)
- Streams와 비동기 실행
- Multi-GPU 프로그래밍
- cuBLAS, cuDNN, Thrust

Part 4: Heterogeneous Computing - OpenCL (10개)
- OpenCL 아키텍처
- 플랫폼/디바이스 모델
- 커널 프로그래밍
- 메모리 모델
- FPGA에서의 OpenCL

Part 5: Distributed Computing - MPI (10개)
- MPI 기초 (send/recv, broadcast)
- 집합 통신
- 비동기 통신
- MPI + OpenMP 하이브리드
- 성능 분석

Part 6: Advanced Topics (5개)
- Lock-free 자료구조
- 트랜잭셔널 메모리
- 이기종 클러스터
- 성능 모델링
- 미래 동향 (CXL, UCIe)
```

**기존 시리즈와 연결:**
- Embedded Performance Engineering Part 4 (Concurrency)와 연계
- Modern Embedded Recipes Part 10 (FPGA)와 연계

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
- Parallel Computing (CUDA 가속)

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

## 우선순위 및 로드맵

### Phase 1 (높은 우선순위)

| 시리즈 | 이유 | 예상 글 수 |
|-------|------|----------|
| Parallel Computing & HPC | 임베디드/성능과 직접 연결, CUDA/OpenCL 수요 높음 | 60 |
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

---

## 기존 시리즈 보강 포인트

### Modern Embedded Recipes

**추가할 내용 (책 기반):**

| Part | 추가 레시피 | 참고 서적 |
|------|-----------|---------|
| Part 2 (프로세서) | ARM 어셈블리 심화 | ARM System Developer's Guide |
| Part 7 (Linux) | 커널 내부 심화 | Understanding the Linux Kernel |
| Part 10 (FPGA) | PCIe 심화 | PCI Express System Architecture |
| Part 11 (Edge AI) | TensorRT 심화 | CUDA Handbook |

### Performance Engineering

**추가할 내용:**

| Part | 추가 글 | 참고 서적 |
|------|--------|---------|
| Part 2 (CPU) | SIMD 최적화 | Intel Xeon Phi Programming |
| Part 4 (Concurrency) | Lock-free 심화 | The Art of Multiprocessor Programming |
| Part 5 (Tools) | CUDA 프로파일링 | Professional CUDA C Programming |

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

### Parallel / HPC / CUDA (18권)
- Programming Massively Parallel Processors ★★
- CUDA Handbook ★★
- Professional CUDA C Programming ★
- CUDA by Example ★
- The Art of Multiprocessor Programming ★★
- C++ Concurrency in Action ★★
- Using OpenMP ★
- OpenCL Programming Guide ★
- Heterogeneous Computing with OpenCL
- Seven Concurrency Models in Seven Weeks
- Structured Parallel Programming ★
- Intel Xeon Phi High Performance Programming
- An Introduction to Parallel Programming
- Parallel Programming in C with MPI and OpenMP
- The Art of Concurrency
- Patterns for Parallel Programming
- High Performance Parallelism Pearls
- Multicore Application Programming

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

★ = 핵심 참고
★★ = 시리즈 주요 참고

---

## 다음 단계

1. **Phase 1 시리즈 서문 작성**
   - Parallel Computing Mastery 서문
   - Mathematics for Engineers 서문

2. **기존 시리즈 보강**
   - Modern Embedded Recipes에 PCIe, CUDA 심화 추가
   - Performance Engineering에 SIMD, lock-free 추가

3. **카테고리 구조 업데이트**
   - `math` 카테고리 활성화
   - `hpc` 또는 `parallel` 카테고리 추가

---

*문서 작성일: 2026-05-12*
*기반: /Users/hawk/Drive/01_Book/list.txt*
