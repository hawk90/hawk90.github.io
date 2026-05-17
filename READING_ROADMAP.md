# 기술 서적 로드맵

블로그 시리즈로 다룰 기술 서적 목록. 우선순위와 상태를 관리한다.

---

## 상태 범례

| 상태 | 의미 |
|------|------|
| ✅ | 스토리보드 완료 |
| 📝 | 작성 중 |
| 📋 | 계획됨 (스토리보드 예정) |
| 💡 | 후보 (검토 필요) |

---

## 1. 리눅스 커널 / 드라이버

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| 코드로 읽는 리눅스 디바이스 드라이버 | Venkateswaran (박재호 역) | ✅ | 24장, 커널 6.x 최신화 |
| 디버깅을 통해 배우는 리눅스 커널의 구조와 원리 | 김동현 | ✅ | 16장, 커널 6.x 최신화 |
| Is Parallel Programming Hard | Paul McKenney | 📋 | RCU 저자, 커널 동시성 |
| Linux Kernel Development | Robert Love | 💡 | 커널 입문 클래식 |

**경로:**
```
디버깅으로 배우는 커널 → 코드로 읽는 드라이버 → Is Parallel Programming Hard
```

---

## 2. 임베디드 시스템

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| Design Patterns for Embedded Systems in C | Bruce Douglass | 📋 | GoF → C 변환 |
| Real-Time Design Patterns | Bruce Douglass | 📋 | RTOS/RT UML 패턴 |
| Making Embedded Systems | Elecia White | 📋 | 실무 패턴/안티패턴 |
| Patterns for Time-Triggered Embedded Systems | Michael Pont | 💡 | 안전 필수 (자동차/항공) |
| Small Memory Software | Noble & Weir | 💡 | 메모리 제약 환경 |

### 2.x SpaceX-스타일 실전 — *무료 책 우선*

영역별 갭 (ISR latency / Cache coherency / DMA / FPGA-CPU 인터페이스 / RTOS 깊이) 를 *무료 책*으로 시작.

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| **Mastering the FreeRTOS Real Time Kernel** | Richard Barry | 📋 | 공식 무료. FreeRTOS scheduler·task·queue·timer 내부. [freertos.org](https://www.freertos.org/Documentation/RTOS_book.html) |
| **Linux Device Drivers (LDD3)** | Corbet·Rubini·Kroah-Hartman | 📋 | 무료 online. Ch 10 interrupt / Ch 15 DMA 가 ISR·DMA 갭 채움. [lwn.net/Kernel/LDDv3](https://lwn.net/Kernel/LDD3/) |
| **The Zynq Book** | Crockett·Elliot·Enderwitz·Stewart | 📋 | Strathclyde 무료 PDF. FPGA ↔ ARM PS·AXI·PetaLinux 통합. [zynqbook.co.uk](http://www.zynqbook.co.uk/) |
| **RTEMS Documentation** | RTEMS Project | 💡 | 무료. RTOS internals 한 사례 (open source 풀 소스). [docs.rtems.org](https://docs.rtems.org/) |
| **A Primer on Memory Consistency and Cache Coherence** | Sorin·Hill·Wood | 💡 | Synthesis Lectures, *유료지만* 표준. cache coherency 깊이는 이 책이 유일. |

**경로 (무료 우선):**

```
Making Embedded Systems → LDD3 (ISR·DMA 챕터) → Mastering FreeRTOS → The Zynq Book → RTEMS Docs
```

**카테고리·sub-series 매핑 (book-review 패턴)**

| 책 | 위치 | 카테고리 | 시리즈 이름 | 챕터 수 |
|------|------|----------|------------|---------|
| Mastering FreeRTOS | `src/content/blog/embedded/rtos/freertos-mastering/` | `embedded/rtos` (신규) | "Mastering FreeRTOS" | 15 |
| The Zynq Book | `src/content/blog/embedded/hardware/zynq-book/` | `embedded/hardware` | "The Zynq Book" | 13 |
| LDD3 (modern) | `src/content/blog/systems/linux-drivers/ldd3-modern/` | `systems/linux-drivers` | "Linux Device Drivers (LDD3)" | 18 (모던 커널 6.x 노트 포함) |
| Sorin Cache Coherence Primer | `src/content/blog/systems/architecture/cache-coherence/` | `systems/architecture` | "Cache Coherence Primer" | 10 |
| RTEMS Docs | `src/content/blog/embedded/rtos/rtems/` (later) | `embedded/rtos` | "RTEMS Internals" | 미정 |
| McKenney *Is Parallel Programming Hard* | 이미 §1·§5에 등재 | `systems/linux-kernel` 또는 `parallel/` | — | — |

**기존 `embedded/rtos-internals/` 처리**

현재 *Practical RTOS Internals* 시리즈가 flat 위치에 있음 (preface 1편). 책 리뷰들과 *같은 토픽 카테고리*에 통합:

- 이동 — `embedded/rtos-internals/00-preface.md` → `embedded/rtos/practical-internals/00-preface.md`
- 결과 — `embedded/rtos/` 카테고리 아래 sub-series:
  - `practical-internals/` (원본, deep)
  - `freertos-mastering/` (책 리뷰)
  - `rtems/` (later)
  - `zephyr/` (later)
- 패턴 일치 — `embedded/automotive/{misra-c, cert-c, autosar-cpp}/`와 동일

---

## 3. 분산 시스템 / 대규모 설계

### 3.1 이론·설계 책

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| 가상면접 사례로 배우는 대규모 시스템 설계 기초 | Alex Xu | 📋 | 16장, 면접 필수 |
| 가상면접 사례로 배우는 대규모 시스템 설계 기초 2 | Alex Xu | 💡 | 13장, 심화 |
| 30가지 패턴으로 배우는 분산 시스템 설계와 구현 기법 | Unmesh Joshi | 📋 | Patterns of Distributed Systems |
| Designing Data-Intensive Applications (DDIA) | Martin Kleppmann | 📝 | 분산 시스템 바이블 (12장 작성 중) |
| Database Internals | Alex Petrov | 📋 | 스토리지 엔진/분산 DB |
| Distributed Systems | Tanenbaum & van Steen | 💡 | 교과서 바이블, 4판 무료 PDF |
| Distributed Algorithms | Nancy Lynch | 💡 | 이론 깊이 (FLP, consensus) |
| Site Reliability Engineering | Google (Beyer 외) | 💡 | SRE 바이블, 무료 온라인 |
| Designing Distributed Systems | Brendan Burns | 💡 | K8s 작가, 클라우드 네이티브 패턴 |
| Building Microservices | Sam Newman | 💡 | 마이크로서비스 입문 |
| Microservices Patterns | Chris Richardson | 💡 | 44개 구현 패턴 |

**경로:**
```
시스템 설계 기초 (Alex Xu) → DDIA → Patterns of Distributed Systems → Database Internals → Distributed Algorithms
```

**참고 링크:**
- [DDIA 공식 사이트 (dataintensive.net)](https://dataintensive.net/)
- [Martin Kleppmann's Site](https://martin.kleppmann.com/)
- [Database Internals (databass.dev)](https://www.databass.dev/)
- [ByteByteGo (Alex Xu)](https://bytebytego.com/)
- [SRE Books (free)](https://sre.google/books/)
- [Distributed Systems by Tanenbaum (free PDF)](https://www.distributed-systems.net/)

### 3.2 데이터 엔지니어링 (Spark / Kafka / Hadoop)

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| Fundamentals of Data Engineering | Joe Reis & Matt Housley | 💡 | 현대 데이터 엔지니어링 종합, O'Reilly 2022 |
| Spark: The Definitive Guide | Bill Chambers & Matei Zaharia | 💡 | Spark 창시자, 바이블 |
| Learning Spark, 2nd Ed | Damji 외 | 💡 | 입문 |
| High Performance Spark | Karau & Warren | 💡 | 튜닝 |
| Kafka: The Definitive Guide, 2nd Ed | Narkhede·Shapira·Palino | 💡 | Kafka 바이블 |
| Streaming Systems | Akidau·Chernyak·Lax | 💡 | Google Dataflow, 스트리밍 이론 바이블 |
| Designing Event-Driven Systems | Ben Stopford (Confluent) | 💡 | 무료, Kafka 중심 이벤트 아키텍처 |
| Hadoop: The Definitive Guide | Tom White | 💡 | Hadoop 바이블, 4판 |
| MapReduce Design Patterns | Donald Miner & Adam Shook | 💡 | MR 패턴 카탈로그 |
| Stream Processing with Apache Flink | Hueske & Kalavri | 💡 | Flink |
| The Data Warehouse Toolkit | Ralph Kimball | 💡 | Dimensional modeling 바이블 |

### 3.3 분산 플랫폼 / 오픈소스 (소스 읽기 — 자체 시리즈)

DDIA·Patterns of Distributed Systems의 *이론*을 실제 코드와 비교하며 학습. 각 프로젝트 1편짜리 deep-dive 시리즈로.

**스토리지 / DB**

| 시스템 | 언어 | 상태 | 비고 |
|---|---|---|---|
| **etcd** | Go | 💡 | Raft 구현 레퍼런스, K8s 의존, 코드 짧고 명확 |
| **CockroachDB** | Go | 💡 | 분산 SQL, Spanner 영감, MVCC + Raft |
| **TiDB** | Go/Rust | 💡 | MySQL 호환 분산 SQL, TiKV(Rust) + PD |
| **FoundationDB** | C++ | 💡 | Apple, deterministic simulation testing 유명 |
| **Cassandra** | Java | 💡 | Dynamo + BigTable, AP, 가십 프로토콜 |
| **ScyllaDB** | C++ | 💡 | Cassandra C++ rewrite, seastar 프레임워크 |
| **Redis Cluster** | C | 💡 | gossip-based, sharding + replication |

**데이터 처리 (배치 / 스트림)**

| 시스템 | 언어 | 상태 | 비고 |
|---|---|---|---|
| **Apache Spark** | Scala/JVM | 💡 | RDD, Catalyst optimizer, Tungsten |
| **Apache Flink** | Java | 💡 | 진짜 스트리밍, exactly-once 체크포인트 |
| **Apache Beam** | Java/Python | 💡 | Google Dataflow 이식, 통합 API |
| **Trino / Presto** | Java | 💡 | 분산 SQL 쿼리 엔진 (Facebook → Starburst) |
| **Ray** | Python/C++ | 💡 | ML 분산, actor model |
| **Dask** | Python | 💡 | pandas/numpy 분산 |

**메시징 / 스트리밍**

| 시스템 | 언어 | 상태 | 비고 |
|---|---|---|---|
| **Apache Kafka** | Scala/Java | 💡 | 사실상 표준, log abstraction |
| **Apache Pulsar** | Java | 💡 | 다중 테넌시, geo-replication, BookKeeper |
| **Redpanda** | C++ | 💡 | Kafka API 호환, seastar 기반 (JVM 제거) |
| **NATS** | Go | 💡 | 가벼운 high-throughput |

**오케스트레이션 / 워크플로우**

| 시스템 | 언어 | 상태 | 비고 |
|---|---|---|---|
| **Kubernetes** | Go | 💡 | 컨테이너 오케스트레이션 표준 |
| **Temporal** | Go | 💡 | durable workflow, Uber Cadence 후속 |
| **Apache Airflow** | Python | 💡 | DAG 워크플로우 |
| **Nomad** | Go | 💡 | HashiCorp, K8s 대안 |

**검색 / OLAP**

| 시스템 | 언어 | 상태 | 비고 |
|---|---|---|---|
| **Elasticsearch / OpenSearch** | Java | 💡 | Lucene 기반, inverted index |
| **ClickHouse** | C++ | 💡 | OLAP 컬럼 스토어, Yandex |
| **Apache Druid** | Java | 💡 | 실시간 OLAP |
| **DuckDB** | C++ | 💡 | embedded OLAP, "SQLite for analytics" |

**Consensus / Coordination**

| 시스템 | 언어 | 상태 | 비고 |
|---|---|---|---|
| **etcd** | Go | 💡 | Raft (위 스토리지 섹션과 중복) |
| **Apache ZooKeeper** | Java | 💡 | Zab 합의 알고리즘, Hadoop 생태계 |
| **Consul** | Go | 💡 | Raft + service discovery |

**소스 읽기 추천 우선순위:**
1. **etcd** — Raft 학습 최적, Go 짧고 명확
2. **Redpanda / FoundationDB** — 시스템 디자인 정수
3. **Spark / Flink** — 데이터 처리 엔진 내부
4. **Kafka** — 로그 기반 시스템의 결정판
5. **CockroachDB / TiDB** — Spanner-style 분산 SQL

---

## 4. 알고리즘

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| The Algorithm Design Manual | Steven Skiena | 📋 | 3판 2020, 실용 알고리즘 |
| Introduction to Algorithms (CLRS) | Cormen 외 | 💡 | 알고리즘 바이블, 4판 2022 |
| Algorithms | Robert Sedgewick | 💡 | Princeton, Java 기반 |
| Grokking Algorithms | Aditya Bhargava | 💡 | 입문용, 그림 중심 |

**경로:**
```
Grokking Algorithms (입문) → Algorithm Design Manual → CLRS (심화)
```

**참고 링크:**
- [The Algorithm Design Manual (algorist.com)](https://www.algorist.com/)
- [Skiena's Lecture Videos](https://www3.cs.stonybrook.edu/~skiena/373/videos/)
- [Exercise Solutions Wiki](https://www.algorist.com/algowiki/index.php/The_Algorithms_Design_Manual_(Skiena))
- [Programming Challenges](https://www.programming-challenges.com/)

---

## 5. 동시성 / 병렬 프로그래밍

### 5.1 책

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| The Art of Multiprocessor Programming | Herlihy & Shavit | 📝 | 이론 + 알고리즘 바이블 (18장 작성 중) |
| C++ Concurrency in Action, 2nd Ed | Anthony Williams | 📝 | C++ 동시성 패턴 (11장 작성 중) |
| Seven Concurrency Models in Seven Weeks | Paul Butcher | 📝 | 7가지 모델 (스레드/액터/CSP/STM 등, 7장 작성 중) |
| Is Parallel Programming Hard (perfbook) | Paul McKenney | 📋 | RCU 저자 무료 PDF, 커널 동시성 정수 |
| Java Concurrency in Practice | Brian Goetz | 💡 | Java memory model 바이블 |
| Programming Massively Parallel Processors | Kirk & Hwu | 💡 | GPU/CUDA 바이블 |
| Patterns for Parallel Programming | Mattson 외 | 💡 | 병렬 프로그래밍 패턴 |
| Parallel and Concurrent Programming in Haskell | Simon Marlow | 💡 | 함수형 병렬 |

**경로:**
```
The Art of Multiprocessor Programming (이론)
  → C++ Concurrency in Action (실무 C++)
  → Seven Concurrency Models (다양한 모델)
  → Is Parallel Programming Hard (커널 수준 깊이)
  → Programming Massively Parallel Processors (GPU)
```

**참고 링크:**
- [perfbook (free)](https://mirrors.edge.kernel.org/pub/linux/kernel/people/paulmck/perfbook/perfbook.html)
- [The Art of Multiprocessor Programming 코드](https://github.com/AlexanderMagrini/The-Art-of-Multiprocessor-Programming)

### 5.2 병렬 플랫폼 / 라이브러리 (자체 시리즈)

각 플랫폼 1-3편 deep-dive.

| 시스템 | 언어 | 모델 | 상태 | 비고 |
|---|---|---|---|---|
| **MPI** (OpenMPI/MPICH) | C/Fortran | 메시지 패싱 | 💡 | HPC 표준 |
| **CUDA / SYCL** | C++ | GPU SIMT | 💡 | NVIDIA GPU |
| **OpenMP** | C/C++/Fortran | shared memory | 💡 | 컴파일러 directive |
| **Intel TBB / oneTBB** | C++ | task-based | 💡 | work-stealing |
| **Rayon** | Rust | data parallel | 💡 | join + work-stealing |
| **Tokio** | Rust | async runtime | 💡 | epoll + work-stealing |
| **Erlang / BEAM** | Erlang/Elixir | actor | 💡 | actor model 본가 |
| **Akka** | Scala/Java | actor | 💡 | JVM actor |
| **Go runtime** | Go | CSP / goroutine | 💡 | M:N 스케줄러 |
| **HPX** | C++ | async + futures | 💡 | C++ standard async 영감 |

---

## 5. 아키텍처 / 설계 패턴

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| Fundamentals of Software Architecture | Richards & Ford | 📋 | 아키텍트 입문, 2판 2025 |
| C++ Software Design | Klaus Iglberger | 📋 | O'Reilly 2022, 현대 C++ 패턴 |
| POSA Vol.1 | Buschmann 외 | 💡 | 아키텍처 패턴 기초 |
| POSA Vol.2 | Schmidt 외 | 📋 | 네트워킹/동시성 패턴 |
| POSA Vol.4 | Buschmann 외 | 💡 | 분산 컴퓨팅 패턴 |
| Software Architecture Patterns | Mark Richards | 💡 | O'Reilly 무료 |
| Clean Architecture | Robert Martin | 💡 | 클린 아키텍처 |

**경로:**
```
Fundamentals of Software Architecture → POSA Vol.1 → Clean Architecture
C++ Software Design (C++ 특화)
```

**참고 링크:**
- [Fundamentals of Software Architecture (공식)](http://fundamentalsofsoftwarearchitecture.com/)
- [Architectural Katas (연습문제)](http://fundamentalsofsoftwarearchitecture.com/katas/)
- [DeveloperToArchitect.com (Mark Richards)](https://developertoarchitect.com/)
- [C++ Software Design (O'Reilly)](https://www.oreilly.com/library/view/c-software-design/9781098113155/)
- [Klaus Iglberger CppCon Talks](https://www.youtube.com/results?search_query=klaus+iglberger+cppcon)

---

## 6. SRE / 운영

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| Site Reliability Engineering | Google (Beyer 외) | 📋 | SRE 바이블, 무료 온라인 |
| The Site Reliability Workbook | Google (Beyer 외) | 💡 | SRE 실습편 |
| Building Secure & Reliable Systems | Google | 💡 | 보안 + 신뢰성 |
| Seeking SRE | David Blank-Edelman | 💡 | SRE 에세이 모음 |

**경로:**
```
Site Reliability Engineering → The Site Reliability Workbook → Building Secure & Reliable Systems
```

---

## 7. 소프트웨어 공학 / 요구사항

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| 소프트웨어 요구사항 3판 | Karl Wiegers & Joy Beatty | 📋 | 요구사항 공학 바이블 |
| User Stories Applied | Mike Cohn | 💡 | 애자일 요구사항 |
| Writing Effective Use Cases | Alistair Cockburn | 💡 | 유스케이스 작성법 |
| Domain-Driven Design | Eric Evans | 💡 | DDD, 도메인 모델링 |

**경로:**
```
소프트웨어 요구사항 3판 → User Stories Applied → Domain-Driven Design
```

---

## 8. 기술 문서 / 제안서 작성

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| 개발자를 위한 기술 글쓰기 | 유영경 외 | 📋 | 한국어, 실무 중심 |
| Docs for Developers | Jared Bhatti 외 | 📋 | 기술 문서 작성법 |
| 제안서 작성의 기술 | 톰 샌트 | 💡 | 설득력 있는 제안서 |
| The Craft of Scientific Writing | Michael Alley | 💡 | 학술/기술 글쓰기 |

**경로:**
```
개발자를 위한 기술 글쓰기 → Docs for Developers → 제안서 작성의 기술
```

---

## 9. 하드웨어 인터페이스 (자체 시리즈)

| 시리즈 | 상태 | 비고 |
|--------|------|------|
| PCIe Deep Dive | ✅ | 17장, 스펙+드라이버 |
| NVMe Deep Dive | ✅ | 18장, 스펙+드라이버 |
| DDR Memory Deep Dive | ✅ | 17장, 스펙+트레이닝 |
| CXL 심화 | 📋 | 4.0 스펙, 메모리 풀링, 멀티랙 |
| HBM / GDDR 심화 | 📋 | HBM3E, 고대역 메모리 |
| UCIe 심화 | 📋 | 3.0 스펙, 칩렛 인터커넥트 🔥 |
| UALink 심화 | 📋 | 1.0 스펙, GPU 인터커넥트, NVLink 대안 🔥 |
| BoW (Bunch of Wires) | 💡 | OCP 오픈 D2D, 저비용 칩렛 |
| PCIe 6.0 확장 | 📋 | PAM4, 64 GT/s (기존 시리즈 확장) |
| **기초 프로토콜** | | |
| Embedded Protocols 심화 | 📋 | SPI, UART, I2C, RS-485 — 기본기 |
| CAN Bus 심화 | 📋 | CAN 2.0, CAN FD, CAN XL — 자동차/산업 |
| MIPI 심화 | 📋 | CSI-2, DSI-2, A-PHY — 카메라/디스플레이 |
| Industrial Ethernet | 📋 | EtherCAT, PROFINET, TSN — 산업용 이더넷 |

### 9.1 CXL 심화 (신규)

| 챕터 | 주제 |
|------|------|
| 1 | CXL 개요 — PCIe 확장, 왜 필요한가 |
| 2 | CXL.io — PCIe 호환 I/O |
| 3 | CXL.cache — 호스트 메모리 캐싱 |
| 4 | CXL.mem — 디바이스 메모리 접근 |
| 5 | Type 1/2/3 디바이스 분류 |
| 6 | 메모리 풀링과 공유 |
| 7 | CXL 스위치와 패브릭 |
| 8 | ML 가속기와 CXL |
| 9 | CXL 3.0 — 패브릭 확장 |
| 10 | 리눅스 CXL 드라이버 |

### 9.2 HBM / GDDR 심화 (신규)

| 챕터 | 주제 |
|------|------|
| 1 | 고대역 메모리 개요 — HBM vs GDDR |
| 2 | HBM 스택 구조와 TSV |
| 3 | HBM2/HBM2E/HBM3/HBM3E 스펙 비교 |
| 4 | GDDR6/GDDR6X/GDDR7 |
| 5 | 대역폭 계산과 병목 분석 |
| 6 | 열 설계와 전력 관리 |
| 7 | 메모리 컨트롤러 인터페이스 |
| 8 | NPU/GPU에서의 활용 |

### 9.3 UCIe 심화 (신규) 🔥

칩렛 시대의 "PCIe" — 2025.08 UCIe 3.0 릴리스.

| 챕터 | 주제 |
|------|------|
| 1 | UCIe 개요 — 왜 칩렛인가, 무어의 법칙 이후 |
| 2 | UCIe 아키텍처 — 프로토콜 스택, 레이어 구조 |
| 3 | 물리 계층 — 시그널링, 64 GT/s |
| 4 | D2D 어댑터 — 프로토콜 변환 |
| 5 | UCIe 1.0 vs 2.0 vs 3.0 비교 |
| 6 | 2.5D 패키징 — 인터포저, 실리콘 브릿지 |
| 7 | 3D 패키징 — 하이브리드 본딩, TSV |
| 8 | 런타임 재교정과 RAS |
| 9 | CXL over UCIe — 메모리 확장 |
| 10 | PCIe over UCIe — I/O 확장 |
| 11 | 멀티 벤더 칩렛 생태계 |
| 12 | 사례 연구 — Intel/AMD/NVIDIA 칩렛 |

### 9.4 UALink 심화 (신규) 🔥

NVLink 대안 — 2025.04 UALink 1.0 릴리스, 75개사 참여.

| 챕터 | 주제 |
|------|------|
| 1 | UALink 개요 — 왜 오픈 GPU 인터커넥트인가 |
| 2 | UALink vs NVLink 비교 |
| 3 | 물리 계층 — 802.3 이더넷 PHY 기반 |
| 4 | 링크 구성 — x1, x2, x4 |
| 5 | 토폴로지 — 1024 가속기 스케일링 |
| 6 | UALink 스위치 아키텍처 |
| 7 | CXL과의 협력 — 메모리 + GPU 연결 |
| 8 | AI 클러스터 설계 패턴 |
| 9 | 하드웨어 로드맵 (2026~2027) |
| 10 | 사례 연구 — AMD MI350X, Intel Gaudi |

### 9.5 BoW (Bunch of Wires) 개요

OCP 오픈 D2D 인터페이스 — 저비용 칩렛 타겟.

| 챕터 | 주제 |
|------|------|
| 1 | BoW 개요 — 오픈소스 칩렛 인터페이스 |
| 2 | BoW 아키텍처 — 슬라이스 구조 |
| 3 | BoW 2.0 vs UCIe 비교 |
| 4 | BoW Memory — 직접 메모리 접근 |
| 5 | BoW Flexi — 저비용 구현 |
| 6 | 패키징 요구사항 |

### 9.6 Embedded Protocols 심화 (신규)

SPI, UART, I2C, RS-485 — 모든 임베디드의 기본.

| 챕터 | 주제 |
|------|------|
| 1 | 직렬 통신 개요 — 동기 vs 비동기 |
| 2 | SPI 기초 — 마스터/슬레이브, CPOL/CPHA |
| 3 | SPI 고급 — Multi-slave, Dual/Quad SPI |
| 4 | I2C 기초 — 주소 체계, ACK/NACK |
| 5 | I2C 고급 — Clock stretching, Bus arbitration |
| 6 | I2C 문제 해결 — Stuck bus, 풀업 저항 |
| 7 | UART 기초 — 보레이트, 프레이밍 |
| 8 | UART 고급 — 하드웨어 흐름 제어, DMA |
| 9 | RS-232/RS-485 — 전기적 특성, 멀티드롭 |
| 10 | 리눅스 디바이스 트리 — SPI/I2C/UART 설정 |
| 11 | 리눅스 드라이버 — spidev, i2c-dev, ttyS |
| 12 | 디버깅 — Logic analyzer, Protocol decoder |

### 9.7 CAN Bus 심화 (신규)

자동차/산업 표준 — CAN 2.0, CAN FD, CAN XL.

| 챕터 | 주제 |
|------|------|
| 1 | CAN 개요 — 왜 CAN인가, 역사 |
| 2 | CAN 2.0 물리 계층 — 차동 신호, 종단 저항 |
| 3 | CAN 2.0 프레임 구조 — Standard/Extended ID |
| 4 | CAN 2.0 Arbitration — CSMA/CA, 우선순위 |
| 5 | CAN 에러 처리 — Error frames, Fault confinement |
| 6 | CAN FD 개요 — 8MB 이상, 가변 비트레이트 |
| 7 | CAN FD 프레임 구조 — BRS, ESI |
| 8 | CAN XL 개요 — 10 Mbps+, 2048 바이트 페이로드 |
| 9 | CANopen 프로토콜 — SDO, PDO, NMT |
| 10 | J1939 프로토콜 — 상용차 표준 |
| 11 | 리눅스 SocketCAN — can-utils, 드라이버 |
| 12 | 디버깅 — CANalyzer, candump, cansniffer |

### 9.8 MIPI 심화 (신규)

카메라/디스플레이 인터페이스 — CSI-2, DSI-2, A-PHY.

| 챕터 | 주제 |
|------|------|
| 1 | MIPI Alliance 개요 — 생태계, 표준 계층 |
| 2 | D-PHY 물리 계층 — LP/HS 모드, Lane 구성 |
| 3 | C-PHY 물리 계층 — 3선 심볼, 효율성 |
| 4 | CSI-2 개요 — 카메라 인터페이스, 패킷 구조 |
| 5 | CSI-2 데이터 타입 — RAW, YUV, RGB |
| 6 | CSI-2 v4.2 — 고해상도, 가상 채널 확장 |
| 7 | DSI 개요 — 디스플레이 인터페이스, Command/Video 모드 |
| 8 | DSI-2 — 고해상도 디스플레이, Display Stream Compression |
| 9 | A-PHY — 자동차용 장거리 SerDes |
| 10 | 리눅스 미디어 서브시스템 — V4L2, DRM/KMS |
| 11 | 카메라 드라이버 개발 — imx sensor 예제 |
| 12 | 디버깅 — mipi-dbi, 신호 분석 |

### 9.9 Industrial Ethernet 심화 (신규)

산업용 이더넷 — EtherCAT, PROFINET, TSN.

| 챕터 | 주제 |
|------|------|
| 1 | 산업용 이더넷 개요 — 왜 표준 이더넷이 아닌가 |
| 2 | 실시간 요구사항 — Determinism, Cycle time |
| 3 | EtherCAT 아키텍처 — Processing on the fly |
| 4 | EtherCAT 프레임 구조 — Datagram, WKC |
| 5 | EtherCAT 마스터/슬레이브 — SOEM, IgH |
| 6 | PROFINET 개요 — RT, IRT 클래스 |
| 7 | PROFINET IO — Controller, Device, Supervisor |
| 8 | TSN (Time-Sensitive Networking) — IEEE 802.1 |
| 9 | TSN 스케줄링 — Qbv, Qbu, 동기화 |
| 10 | Ethernet POWERLINK — OpenSAFETY |
| 11 | 리눅스 실시간 — PREEMPT_RT, EtherCAT 드라이버 |
| 12 | 비교 분석 — 프로토콜 선택 가이드 |

**참고 링크:**

**고속 인터커넥트:**
- [CXL Consortium](https://www.computeexpresslink.org/)
- [UCIe Consortium](https://www.uciexpress.org/)
- [UALink Consortium](https://ualinkconsortium.org/)
- [OCP BoW Specification](https://opencomputeproject.github.io/ODSA-BoW/)
- [JEDEC HBM Standards](https://www.jedec.org/standards-documents/focus/high-bandwidth-memory-hbm)
- [Linux CXL Documentation](https://www.kernel.org/doc/html/latest/driver-api/cxl/index.html)

**기초 프로토콜:**
- [SPI Linux Documentation](https://www.kernel.org/doc/html/latest/spi/index.html)
- [I2C Linux Documentation](https://www.kernel.org/doc/html/latest/i2c/index.html)
- [Serial UART Documentation](https://www.kernel.org/doc/html/latest/driver-api/serial/index.html)
- [I2C Tutorial (Sparkfun)](https://learn.sparkfun.com/tutorials/i2c)
- [SPI Tutorial (Sparkfun)](https://learn.sparkfun.com/tutorials/serial-peripheral-interface-spi)

**CAN Bus:**
- [CAN in Automation (CiA)](https://www.can-cia.org/)
- [Linux SocketCAN](https://www.kernel.org/doc/html/latest/networking/can.html)
- [CAN FD Specification (Bosch)](https://www.bosch-semiconductors.com/ip-modules/can-fd/)
- [CANopen (CiA 301)](https://www.can-cia.org/canopen/)
- [SAE J1939](https://www.sae.org/standards/content/j1939/)

**MIPI:**
- [MIPI Alliance](https://www.mipi.org/)
- [MIPI CSI-2 Specification](https://www.mipi.org/specifications/csi-2)
- [MIPI DSI Specification](https://www.mipi.org/specifications/dsi-2)
- [MIPI A-PHY (Automotive)](https://www.mipi.org/specifications/a-phy)
- [Linux V4L2 Documentation](https://www.kernel.org/doc/html/latest/userspace-api/media/v4l/v4l2.html)

**Industrial Ethernet:**
- [EtherCAT Technology Group](https://www.ethercat.org/)
- [PROFINET (PI)](https://www.profibus.com/technology/profinet)
- [IEEE 802.1 TSN](https://1.ieee802.org/tsn/)
- [SOEM (Simple Open EtherCAT Master)](https://github.com/OpenEtherCATsociety/SOEM)
- [IgH EtherCAT Master](https://etherlab.org/en/ethercat/)

---

## 10. 미디어 / 코덱 (자체 시리즈)

| 시리즈 | 상태 | 비고 |
|--------|------|------|
| AV1 Deep Dive | ✅ | 30장 |

---

## 11. 머신러닝 시스템

| 책/자료 | 저자/출처 | 상태 | 비고 |
|---------|-----------|------|------|
| Dive into Deep Learning Compiler | D2L Contributors | 📋 | TVM 기반, 무료 온라인 |
| Machine Learning Design Patterns | Lakshmanan, Robinson, Munn | 📋 | O'Reilly, 30 패턴 |
| Designing Machine Learning Systems | Chip Huyen | 📋 | O'Reilly, 프로덕션 ML |
| AI Engineering | Chip Huyen | 💡 | O'Reilly 2025, DMLS 후속 |
| Apache TVM 공식 문서 | Apache | 📋 | Relay IR, 스케줄링, 오토튜닝 |
| MLIR 공식 문서 | LLVM | 📋 | 다층 IR, 방언 설계 |
| ONNX 공식 문서 | ONNX | 💡 | 모델 교환 포맷 |
| Architecture of NPU for DNNs | ScienceDirect | 📋 | NPU 아키텍처 챕터 |

**시리즈 구성:**

### 11.1 NPU 아키텍처

| 챕터 | 주제 |
|------|------|
| 1 | 가속기 기초 — CPU → GPU → NPU 진화 |
| 2 | SIMD와 Systolic Array |
| 3 | Google TPU 아키텍처 |
| 4 | Apple Neural Engine |
| 5 | Qualcomm Hexagon / HTP |
| 6 | Intel NPU (Meteor Lake+) |
| 7 | 메모리 계층과 대역폭 병목 |
| 8 | 양자화와 저정밀 연산 |
| 9 | 전력 효율과 열 설계 |
| 10 | NPU 프로그래밍 모델 비교 |

### 11.2 ML 컴파일러

| 챕터 | 주제 |
|------|------|
| 1 | ML 컴파일러 개요 — 왜 필요한가 |
| 2 | IR 설계 — Relay, HLO, MLIR |
| 3 | TVM 아키텍처 |
| 4 | 그래프 최적화 — 연산자 융합, 상수 폴딩 |
| 5 | 텐서 스케줄링 |
| 6 | 오토튜닝 — AutoTVM, Ansor |
| 7 | MLIR 방언과 변환 |
| 8 | IREE — MLIR 기반 런타임 |
| 9 | 양자화 컴파일 |
| 10 | BYOC — NPU 백엔드 통합 |
| 11 | 프로파일링과 디버깅 |
| 12 | 사례 연구 — 모바일 배포 |

### 11.3 ONNX 실전

| 챕터 | 주제 |
|------|------|
| 1 | ONNX 포맷 구조 |
| 2 | 프레임워크 → ONNX 변환 |
| 3 | ONNX Runtime |
| 4 | TensorRT와 ONNX |
| 5 | Core ML 변환 |
| 6 | 최적화 패스 |
| 7 | 호환성과 opset 버전 |
| 8 | 배포 패턴 |

### 11.4 ML 디자인 패턴

| 챕터 | 주제 |
|------|------|
| 1 | 왜 ML 디자인 패턴인가 |
| 2 | 데이터 표현 패턴 |
| 3 | 피처 엔지니어링 패턴 |
| 4 | 문제 표현 패턴 |
| 5 | 모델 학습 패턴 |
| 6 | 재현성 패턴 |
| 7 | 책임 있는 AI 패턴 |
| 8 | 연결 패턴 |
| 9 | 서빙 패턴 |
| 10 | MLOps 패턴 |

### 11.5 대규모 ML 시스템 설계 (Chip Huyen)

| 챕터 | 주제 |
|------|------|
| 1 | ML 시스템 개요 |
| 2 | ML 시스템 설계 소개 |
| 3 | 데이터 엔지니어링 기초 |
| 4 | 학습 데이터 |
| 5 | 피처 엔지니어링 |
| 6 | 모델 개발과 오프라인 평가 |
| 7 | 모델 배포와 예측 서비스 |
| 8 | 데이터 분포 시프트와 모니터링 |
| 9 | 지속적 학습과 프로덕션 테스트 |
| 10 | ML 인프라와 MLOps |
| 11 | ML 시스템의 인간적 측면 |

### 11.6 TinyML / Edge AI (신규)

| 책/자료 | 저자/출처 | 상태 | 비고 |
|---------|-----------|------|------|
| TinyML | Pete Warden & Daniel Situnayake | 📋 | O'Reilly, MCU 추론 |
| TensorFlow Lite Micro 공식 | TensorFlow | 📋 | 베어메탈 추론 |
| CMSIS-NN | ARM | 📋 | Cortex-M 최적화 커널 |
| Edge Impulse 문서 | Edge Impulse | 💡 | 임베디드 ML 워크플로우 |

| 챕터 | 주제 |
|------|------|
| 1 | TinyML 개요 — 왜 MCU에서 ML인가 |
| 2 | TensorFlow Lite Micro 아키텍처 |
| 3 | 인터프리터와 메모리 할당 |
| 4 | 모델 양자화 — INT8/INT4 |
| 5 | CMSIS-NN 최적화 커널 |
| 6 | 전력 제약 설계 |
| 7 | 메모리 제약 설계 (< 256KB) |
| 8 | 센서 데이터 전처리 |
| 9 | 웨이크워드 / 키워드 검출 |
| 10 | 이미지 분류 on MCU |
| 11 | 이상 탐지 패턴 |
| 12 | microTVM — TVM 베어메탈 타겟 |

### 11.7 NPU 드라이버 개발 (신규)

리눅스 커널 레벨에서 NPU/가속기 드라이버 개발.

| 챕터 | 주제 |
|------|------|
| 1 | 가속기 드라이버 개요 — DRM subsystem |
| 2 | DMA-BUF와 버퍼 공유 |
| 3 | IOMMU와 주소 변환 |
| 4 | ioctl 인터페이스 설계 |
| 5 | 메모리 매핑 (mmap) |
| 6 | 명령 큐와 제출 |
| 7 | 인터럽트와 완료 통보 |
| 8 | Fence / Sync 객체 |
| 9 | 전력 관리 — Runtime PM |
| 10 | 펌웨어 로딩 |
| 11 | 유저스페이스 라이브러리 설계 |
| 12 | 사례 연구 — Etnaviv / Panfrost |

### 11.8 ML 시스템 프로파일링 (신규)

| 챕터 | 주제 |
|------|------|
| 1 | ML 워크로드 특성 분석 |
| 2 | NPU 프로파일러 활용 |
| 3 | 레이어별 지연 분석 |
| 4 | 메모리 대역폭 병목 |
| 5 | 전력 프로파일링 |
| 6 | ftrace / perf for ML |
| 7 | 시스템 트레이싱 — LTTng |
| 8 | 병목 진단과 최적화 |

### 11.9 MLIR 심화 (신규) 🔥

11.2의 *개요*보다 깊이. NPU Compiler 진로의 *토대*. CUDA 제외 트랙의 1순위.

| 챕터 | 주제 |
|------|------|
| 1 | MLIR의 위치 — LLVM·SPIR-V·HLO와 비교 |
| 2 | Dialect 개념과 설계 원칙 |
| 3 | Operation·Type·Attribute 시스템 |
| 4 | Pass와 PatternRewriter |
| 5 | Conversion·Lowering 패턴 |
| 6 | `linalg` dialect — 핵심 추상 |
| 7 | `tosa`·`stablehlo` — frontend dialect |
| 8 | `vector`·`affine`·`scf`·`memref` |
| 9 | LLVM dialect로의 lowering |
| 10 | Bufferization 패스 |
| 11 | Async / GPU / SPIR-V dialect |
| 12 | 나만의 dialect 작성 |
| 13 | TableGen — ODS / DRR |
| 14 | mlir-opt·mlir-translate 도구 |
| 15 | 디버깅·trace·crash reduction |
| 16 | 사례 — Triton·IREE·TensorFlow MLIR |

### 11.10 XLA / OpenXLA 심화 (신규) 🔥

MLIR 실전 사례. JAX·TensorFlow·PyTorch(PJRT) 공통 백엔드.

| 챕터 | 주제 |
|------|------|
| 1 | XLA의 위치 — TF·JAX·PyTorch backend |
| 2 | StableHLO — 입력 IR |
| 3 | HLO IR — 내부 표현 |
| 4 | HLO 패스 파이프라인 |
| 5 | Operator fusion 전략 |
| 6 | Layout assignment |
| 7 | Backend — CPU / GPU / TPU |
| 8 | PJRT — Pluggable Runtime |
| 9 | Sharding과 SPMD |
| 10 | Autotuning |
| 11 | JAX와 XLA 통합 |
| 12 | TF·PyTorch와 XLA 통합 |

### 11.11 Triton DSL (신규)

OpenAI Triton — block programming DSL. CUDA 대안.

| 챕터 | 주제 |
|------|------|
| 1 | Triton의 위치와 동기 |
| 2 | Programming model — block, program_id |
| 3 | Tiled matmul 예제 |
| 4 | Attention 구현 (FlashAttention 스타일) |
| 5 | Triton 컴파일러 흐름 (MLIR 기반) |
| 6 | Autotuning |
| 7 | Backend — PTX·AMDGCN |
| 8 | PyTorch Inductor와의 통합 |
| 9 | 한계와 트레이드오프 |

### 11.12 PyTorch Internals (신규)

| 챕터 | 주제 |
|------|------|
| 1 | eager mode 흐름 — autograd, dispatcher |
| 2 | C++ 백엔드 구조 — ATen·c10 |
| 3 | Operator·dispatch key |
| 4 | TorchScript |
| 5 | TorchDynamo — Python frame 추적 |
| 6 | AOTAutograd |
| 7 | TorchInductor — Triton/C++ codegen |
| 8 | torch.compile 사용 패턴 |
| 9 | Distributed — DDP·FSDP |
| 10 | Quantization (PTQ·QAT) |
| 11 | ExecuTorch — 추론용 |
| 12 | 모바일·임베디드 배포 |

### 11.13 추론 엔진 심화 (신규)

11.3 (ONNX 실전)을 *엔진별*로 깊게.

**TensorRT (8편)** — engine builder, plugin API, INT8 calibration, dynamic shape, multi-stream, refit, TimingCache, 모델별 최적화 패턴.

**ONNX Runtime (8편)** — Execution Provider 구조, Graph Optimizer, custom op, sessions·IO binding, IO/memory 최적화.

**Core ML (6편)** — Apple Neural Engine, MPSGraph 백엔드, model conversion, Stateful ML programs, on-device personalization.

### 11.14 Apple Metal Stack (신규) 🔥

CUDA 외 GPU 컴퓨트 스택. Apple Silicon 통합 메모리·NPU(ANE) 접근.

**Metal Compute / MSL (10~12편)** — Metal API, MSL(C++14) 셰이더, command queue·encoder, unified memory, ray tracing, tile shading.

**MPS / MPSGraph (6~8편)** — cuDNN/cuBLAS 등가물, MPSGraph로 ML 그래프 실행, ANE 활용 경로(Core ML 통한 우회).

| 챕터 | 주제 |
|------|------|
| 1 | Metal의 위치 — Vulkan·CUDA와 비교 |
| 2 | MSL 기초 — kernel·thread·threadgroup |
| 3 | Command queue·buffer·encoder |
| 4 | Unified memory와 storage mode |
| 5 | MPS — built-in 커널들 |
| 6 | MPSGraph — graph-based ML |
| 7 | Apple AIR (Apple Intermediate Representation) |
| 8 | Performance — tile shader, raster order |
| 9 | ML 워크로드 사례 — convolution, attention |
| 10 | Core ML 백엔드로서의 Metal |

**경로:**
```
NPU 아키텍처 → ML 컴파일러 → ONNX 실전
      ↓              ↘
NPU 드라이버      ML 디자인 패턴 → 대규모 ML 시스템 설계
      ↓
TinyML / Edge AI → ML 시스템 프로파일링

[심화·CUDA 제외 트랙]
MLIR 심화 → XLA 심화 → Triton DSL
                ↓
         PyTorch Internals → 추론 엔진 심화
                ↓
         Apple Metal Stack
```

**참고 링크:**
- [Dive into Deep Learning Compiler](https://tvm.d2l.ai/)
- [Apache TVM Documentation](https://tvm.apache.org/docs/)
- [MLIR Documentation](https://mlir.llvm.org/docs/)
- [IREE Project](https://github.com/iree-org/iree)
- [ML Design Patterns GitHub](https://github.com/GoogleCloudPlatform/ml-design-patterns)
- [Designing ML Systems (Chip Huyen)](https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/)
- [Chip Huyen's Site](https://huyenchip.com/)
- [Intel NPU Acceleration Library](https://intel.github.io/intel-npu-acceleration-library/npu.html)
- [ARM NPU Documentation](https://developer.arm.com/documentation/102023/latest/)

**TinyML / Edge AI:**
- [TinyML Book (O'Reilly)](https://www.oreilly.com/library/view/tinyml/9781492052036/)
- [TensorFlow Lite Micro](https://www.tensorflow.org/lite/microcontrollers)
- [CMSIS-NN (ARM)](https://arm-software.github.io/CMSIS_5/NN/html/index.html)
- [Edge Impulse Documentation](https://docs.edgeimpulse.com/)
- [microTVM (TVM)](https://tvm.apache.org/docs/topic/microtvm/index.html)

**NPU 드라이버:**
- [DRM Documentation (Linux Kernel)](https://www.kernel.org/doc/html/latest/gpu/index.html)
- [DMA-BUF Sharing (Linux Kernel)](https://www.kernel.org/doc/html/latest/driver-api/dma-buf.html)
- [Etnaviv Driver (오픈소스 GPU)](https://github.com/etnaviv/etnaviv_gpu_tests)
- [Panfrost Driver (ARM Mali)](https://docs.mesa3d.org/drivers/panfrost.html)
- [IOMMU Documentation](https://www.kernel.org/doc/html/latest/driver-api/iommu.html)

**MLIR / XLA / Triton (CUDA 제외 트랙):**
- [MLIR Tutorial](https://mlir.llvm.org/docs/Tutorials/)
- [MLIR Dialect List](https://mlir.llvm.org/docs/Dialects/)
- [StableHLO Specification](https://github.com/openxla/stablehlo)
- [OpenXLA Project](https://openxla.org/)
- [XLA HLO Documentation](https://openxla.org/xla)
- [PJRT — Pluggable Runtime](https://github.com/openxla/xla/tree/main/xla/pjrt)
- [Triton (OpenAI)](https://github.com/openai/triton)
- [Triton Documentation](https://triton-lang.org/)
- [IREE Architecture](https://iree.dev/developers/)

**PyTorch Internals:**
- [PyTorch Developer Wiki](https://github.com/pytorch/pytorch/wiki)
- [TorchDynamo Deep Dive](https://pytorch.org/docs/stable/dynamo/index.html)
- [TorchInductor Overview](https://pytorch.org/blog/inside-the-matrix/)
- [ExecuTorch](https://pytorch.org/executorch/)

**추론 엔진:**
- [TensorRT Developer Guide](https://docs.nvidia.com/deeplearning/tensorrt/)
- [ONNX Runtime Documentation](https://onnxruntime.ai/docs/)
- [Core ML Tools](https://apple.github.io/coremltools/)

**Apple Metal Stack:**
- [Metal Programming Guide](https://developer.apple.com/metal/)
- [Metal Shading Language Specification](https://developer.apple.com/metal/Metal-Shading-Language-Specification.pdf)
- [Metal Performance Shaders (MPS)](https://developer.apple.com/documentation/metalperformanceshaders)
- [MPSGraph](https://developer.apple.com/documentation/metalperformanceshadersgraph)
- [Apple Machine Learning Research](https://machinelearning.apple.com/)

---

## 12. 수리철학

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| Introduction to Mathematical Philosophy | Bertrand Russell | 📋 | 1919, 논리주의 고전, 무료 온라인 |
| Lectures on the Philosophy of Mathematics | Joel David Hamkins | 💡 | MIT Press, 수학 기반 접근 |
| Philosophy of Mathematics | Øystein Linnebo | 💡 | Princeton, 현대적 입문 |
| An Introduction to the Philosophy of Mathematics | Mark Colyvan | 💡 | Cambridge, 응용 중심 |
| Philosophy of Mathematics: Classic and Contemporary | Ahmet Çevik | 💡 | Routledge, 수학자 관점 |

**시리즈 구성:**

### 12.1 수리철학 입문 (Russell)

Russell의 *Introduction to Mathematical Philosophy* (1919) 기반. 논리주의의 고전.

| 챕터 | 주제 |
|------|------|
| 1 | 자연수의 계열 |
| 2 | 수의 정의 |
| 3 | 유한성과 수학적 귀납법 |
| 4 | 순서의 정의 |
| 5 | 관계의 종류 |
| 6 | 관계의 유사성 |
| 7 | 유리수, 실수, 복소수 |
| 8 | 무한 기수 |
| 9 | 무한 급수와 서수 |
| 10 | 극한과 연속성 |
| 11 | 함수의 극한과 연속성 |
| 12 | 선택과 곱셈 공리 |
| 13 | 무한 공리와 논리적 유형 |
| 14 | 비양립성과 연역 이론 |
| 15 | 명제 함수 |
| 16 | 기술구 |
| 17 | 클래스 |
| 18 | 수학과 논리학 |

**경로:**
```
(집합론/논리학 기초) → 수리철학 입문 (Russell) → 현대 수리철학 (Hamkins/Linnebo)
```

**참고 링크:**
- [Introduction to Mathematical Philosophy (Project Gutenberg, 무료)](https://www.gutenberg.org/ebooks/41654)
- [Introduction to Mathematical Philosophy (PDF)](https://people.umass.edu/klement/imp/imp-ebk.pdf)
- [Internet Archive 스캔본](https://archive.org/details/introductiontoma00russuoft)
- [Stanford Encyclopedia — Philosophy of Mathematics](https://plato.stanford.edu/entries/philosophy-mathematics/)
- [Stanford Encyclopedia — Bertrand Russell](https://plato.stanford.edu/entries/russell/)

---

## 13. 과학 고전

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| Principia Mathematica | Isaac Newton | 📋 | 1687, 자연철학의 수학적 원리, 무료 온라인 |

**시리즈 구성:**

### 13.1 프린키피아 (Newton)

Newton의 *Philosophiæ Naturalis Principia Mathematica* (1687). 고전역학과 만유인력의 기초.

| 권 | 주제 |
|------|------|
| **Book I** | 물체의 운동 (저항 없는 매질) |
| 1 | 정의와 운동 법칙 |
| 2 | 구심력과 궤도 |
| 3 | 원뿔곡선 위의 운동 |
| 4 | 타원/쌍곡선/포물선 궤도 |
| 5 | 궤도 결정 |
| 6 | 케플러 문제 |
| **Book II** | 물체의 운동 (저항 매질) |
| 7 | 저항 매질 내 운동 |
| 8 | 유체역학 기초 |
| 9 | 파동과 소용돌이 |
| **Book III** | 우주의 체계 |
| 10 | 만유인력 법칙 |
| 11 | 행성 운동 |
| 12 | 달의 운동 |
| 13 | 혜성 궤도 |
| 14 | 조석 현상 |

**경로:**
```
(미적분/기하학 기초) → 프린키피아 → 해석역학 (Lagrange/Hamilton)
```

**참고 링크:**
- [Principia (Project Gutenberg, 영문 무료)](https://www.gutenberg.org/ebooks/76404)
- [Principia 라틴어 원문 (Project Gutenberg)](https://www.gutenberg.org/ebooks/28233)
- [Internet Archive 스캔본](https://archive.org/details/newtonspmathema00newtrich)
- [Wikisource 1846 영역본](https://en.wikisource.org/wiki/The_Mathematical_Principles_of_Natural_Philosophy_(1846))
- [Stanford Encyclopedia — Newton's Philosophiae Naturalis Principia](https://plato.stanford.edu/entries/newton-principia/)

---

## 14. 네트워킹

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| Computer Networking: A Top-Down Approach | Kurose & Ross | 📋 | 네트워킹 바이블, 8판 |
| TCP/IP Illustrated Vol.1 | W. Richard Stevens | 💡 | 프로토콜 깊이 파기 |
| Unix Network Programming | W. Richard Stevens | 💡 | 소켓 프로그래밍 |
| High Performance Browser Networking | Ilya Grigorik | 💡 | 웹 성능, 무료 온라인 |

**경로:**
```
Computer Networking (Top-Down) → TCP/IP Illustrated → Unix Network Programming
```

**참고 링크:**
- [저자 공식 사이트](https://gaia.cs.umass.edu/kurose_ross/instructor.php)
- [Wireshark Labs (무료)](https://gaia.cs.umass.edu/kurose_ross/wireshark.php)
- [Programming Assignments](https://gaia.cs.umass.edu/kurose_ross/programming_assignments.php)
- [High Performance Browser Networking (무료 온라인)](https://hpbn.co/)

---

## 15. 운영체제

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| Operating Systems: Three Easy Pieces (OSTEP) | Remzi & Andrea | 📋 | 무료 온라인, 현대적 |
| Modern Operating Systems | Andrew Tanenbaum | 💡 | OS 클래식 |
| Operating System Concepts | Silberschatz 외 | 💡 | 공룡책 |

**경로:**
```
OSTEP → Modern Operating Systems → 리눅스 커널 시리즈
```

**참고 링크:**
- [OSTEP 무료 온라인 (pages.cs.wisc.edu)](https://pages.cs.wisc.edu/~remzi/OSTEP/)
- [OSTEP Projects / Homework](https://github.com/remzi-arpacidusseau/ostep-projects)
- [OSTEP YouTube Lectures](https://pages.cs.wisc.edu/~remzi/Classes/537/Spring2018/Discussion/videos.html)

---

## 16. 컴퓨터 아키텍처

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| Computer Systems: A Programmer's Perspective | Bryant & O'Hallaron | 📋 | CSAPP, 시스템 필독 |
| Computer Architecture: A Quantitative Approach | Hennessy & Patterson | 💡 | 아키텍처 바이블 |
| Computer Organization and Design | Patterson & Hennessy | 💡 | RISC-V 에디션 |

**경로:**
```
CSAPP → Computer Organization → Quantitative Approach
```

**참고 링크:**
- [CSAPP 공식 사이트](https://csapp.cs.cmu.edu/)
- [CSAPP Labs (Attack Lab, Bomb Lab 등)](https://csapp.cs.cmu.edu/3e/labs.html)
- [CSAPP Student Resources](https://csapp.cs.cmu.edu/3e/students.html)
- [CMU 15-213 Course Materials](https://www.cs.cmu.edu/~213/)

---

## 17. 컴파일러

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| Crafting Interpreters | Robert Nystrom | 📋 | 무료 온라인, 실습 중심 |
| Writing An Interpreter In Go | Thorsten Ball | 💡 | 짧고 실용적 |
| Engineering a Compiler | Cooper & Torczon | 💡 | 현대적 컴파일러 |
| Compilers (Dragon Book) | Aho 외 | 💡 | 컴파일러 바이블 |

**경로:**
```
Crafting Interpreters → Writing An Interpreter In Go → Engineering a Compiler
```

**참고 링크:**
- [Crafting Interpreters (무료 온라인)](https://craftinginterpreters.com/)
- [Crafting Interpreters GitHub](https://github.com/munificent/craftinginterpreters)
- [Writing An Interpreter In Go (interpreterbook.com)](https://interpreterbook.com/)

---

## 18. 보안 / 암호학

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| Real-World Cryptography | David Wong | 📋 | 현대 암호학 실무 |
| Serious Cryptography | Jean-Philippe Aumasson | 💡 | 암호학 입문 |
| The Web Application Hacker's Handbook | Stuttard & Pinto | 💡 | 웹 보안 |
| Hacking: The Art of Exploitation | Jon Erickson | 💡 | 시스템 보안 |

**경로:**
```
Serious Cryptography → Real-World Cryptography → 웹/시스템 보안
```

**참고 링크:**
- [Real-World Cryptography (Manning)](https://www.manning.com/books/real-world-cryptography)
- [David Wong's Blog (cryptologie.net)](https://www.cryptologie.net/)
- [Serious Cryptography (No Starch)](https://nostarch.com/seriouscrypto)

---

## 19. 데이터베이스

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| Database System Concepts | Silberschatz 외 | 📋 | DB 바이블 |
| Readings in Database Systems (Red Book) | Hellerstein & Stonebraker | 💡 | 논문 모음, 무료 |
| SQL Performance Explained | Markus Winand | 💡 | 인덱스/쿼리 최적화 |

**경로:**
```
Database System Concepts → Database Internals → SQL Performance Explained
```

**참고 링크:**
- [Database Internals (databass.dev)](https://www.databass.dev/)
- [Red Book 5th Edition (무료 온라인)](http://www.redbook.io/)
- [Use The Index, Luke (SQL Performance)](https://use-the-index-luke.com/)

---

## 20. 함수형 프로그래밍

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| Structure and Interpretation of Computer Programs | Abelson & Sussman | 📋 | SICP, 무료 온라인 |
| Functional Programming in Scala | Chiusano & Bjarnason | 💡 | Red Book |
| Haskell Programming from First Principles | Allen & Moronuki | 💡 | Haskell 입문 |
| Category Theory for Programmers | Bartosz Milewski | 💡 | 무료 온라인 |

**경로:**
```
SICP → FP in Scala 또는 Haskell → Category Theory
```

**참고 링크:**
- [SICP (MIT 무료 온라인)](https://mitp-content-server.mit.edu/books/content/sectbyfn/books_pres_0/6515/sicp.zip/full-text/book/book.html)
- [MIT 6.037 Course](https://web.mit.edu/6.001/6.037/)
- [MIT OpenCourseWare 6.001](https://ocw.mit.edu/courses/6-001-structure-and-interpretation-of-computer-programs-spring-2005/)
- [Haskell Book (haskellbook.com)](https://haskellbook.com/)
- [Haskell Book Exercise Solutions (GitHub)](https://github.com/scarvalhojr/haskellbook)
- [Category Theory for Programmers (무료)](https://bartoszmilewski.com/2014/10/28/category-theory-for-programmers-the-preface/)

---

## 21. 테스팅

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| Test Driven Development: By Example | Kent Beck | 📋 | TDD 원전 |
| Growing Object-Oriented Software, Guided by Tests | Freeman & Pryce | 💡 | GOOS, 실전 TDD |
| Unit Testing Principles, Practices, and Patterns | Vladimir Khorikov | 💡 | 단위 테스트 깊이 |
| xUnit Test Patterns | Gerard Meszaros | 💡 | 테스트 패턴 카탈로그 |

**경로:**
```
TDD by Example → GOOS → Unit Testing Principles
```

**참고 링크:**
- [TDD by Example (O'Reilly)](https://www.oreilly.com/library/view/test-driven-development/0321146530/)
- [TDD by Example Exercises (GitHub)](https://github.com/jeremykendall/tdd-by-example)
- [Kent Beck Money Example (GitHub)](https://github.com/test-driven-development/kent-beck-money-example)

---

## 22. DevOps / 컨테이너

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| The DevOps Handbook | Kim, Humble 외 | 📋 | DevOps 바이블, 2판 2022 |
| Kubernetes in Action | Marko Lukša | 💡 | K8s 깊이 파기 |
| Docker Deep Dive | Nigel Poulton | 💡 | Docker 실무 |
| Infrastructure as Code | Kief Morris | 💡 | IaC 패턴 |

**경로:**
```
DevOps Handbook → Docker Deep Dive → Kubernetes in Action
```

**참고 링크:**
- [The DevOps Handbook 2nd Edition (IT Revolution)](https://itrevolution.com/product/the-devops-handbook-second-edition/)
- [Reader's Guide (Discussion Questions)](https://itrevolution.com/product/readers-guide-the-devops-handbook-2nd-edition/)
- [IT Revolution Resources](https://itrevolution.com/)

---

## 23. 형식 검증

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| Practical TLA+ | Hillel Wayne | 📋 | TLA+ 입문, 실용적 |
| Specifying Systems | Leslie Lamport | 💡 | TLA+ 원전 |
| Software Foundations | Pierce 외 | 💡 | Coq 기반, 무료 온라인 |

**경로:**
```
Practical TLA+ → Specifying Systems → Software Foundations (Coq)
```

**참고 링크:**
- [Learn TLA+ (무료 온라인)](https://www.learntla.com/)
- [Practical TLA+ Source Code (GitHub)](https://github.com/Apress/practical-tla-plus)
- [Hillel Wayne's Site](https://www.hillelwayne.com/)
- [TLA+ Official (Lamport)](https://lamport.azurewebsites.net/tla/tla.html)
- [Software Foundations (무료 온라인)](https://softwarefoundations.cis.upenn.edu/)

---

## 24. 개발자 필독서

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| The Pragmatic Programmer | Hunt & Thomas | 📋 | 20주년 기념판 |
| Clean Code | Robert Martin | 📋 | 코드 품질 |
| Refactoring | Martin Fowler | 📋 | 2판, 리팩토링 바이블 |
| Code Complete | Steve McConnell | 💡 | 실무 종합 |
| Working Effectively with Legacy Code | Michael Feathers | 📋 | 레거시 다루기 |
| Release It! | Michael Nygard | 💡 | 프로덕션 패턴 |
| A Philosophy of Software Design | John Ousterhout | 💡 | 설계 철학 |

**경로:**
```
Pragmatic Programmer → Clean Code → Refactoring → Working with Legacy Code
```

---

## 25. 실용 수학

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| Convex Optimization | Boyd & Vandenberghe | ✅ | 무료, 11 ch. ML 학습·컴파일러 스케줄링 핵심 |
| Elements of Information Theory | Cover & Thomas | ✅ | 16 ch. entropy·KL·MI·rate-distortion |
| Information Theory, Inference, and Learning | David MacKay | ✅ | 무료, 15 ch (50중 핵심). info theory + ML 통합 |
| All of Statistics | Larry Wasserman | ✅ | 15 ch. 통계 빠른 입문 |
| Probability Theory: The Logic of Science | E.T. Jaynes | ✅ | 12 ch. 베이지안 관점 |
| Concrete Mathematics | Knuth, Graham, Patashnik | 📋 | 이산수학 + 분석 |
| Think Stats | Allen Downey | 💡 | 프로그래머용 통계, 무료 |
| Mathematics for Machine Learning | Deisenroth 외 | 💡 | ML 수학, 무료 (Murphy ML1으로 대체 가능) |

### 25.2 Plausible Reasoning·Causality (고전 + 현대)

확률의 토대를 *논리 확장으로서의 추론* 시각에서 본다. Jaynes 라인 + Pearl 라인.

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| **Pólya, Mathematics and Plausible Reasoning Vol I** | George Pólya | 📋 | 1954. 8 ch. *plausible reasoning 용어의 원전*. Induction·Analogy |
| **Pólya, Mathematics and Plausible Reasoning Vol II** | George Pólya | 📋 | 8 ch. Patterns of Plausible Inference |
| **Cox, Algebra of Probable Inference** | Richard T. Cox | 📋 | 1961. 5 ch (~100 p). *Cox theorem 원전*. Jaynes의 토대 |
| **Pearl, Probabilistic Reasoning in Intelligent Systems** | Judea Pearl | 📋 | 1988. 10 ch. *Bayesian network 창시 책 (PRIS)* |
| **Pearl, Causality: Models, Reasoning, Inference** | Judea Pearl | 📋 | 2009 2판. 11 ch. *causal inference 바이블*. do-calculus·SCM |
| **Halpern, Reasoning About Uncertainty** | Joseph Y. Halpern | 📋 | 2017 2판. 14 ch. Bayes·Dempster-Shafer·possibility 통합 |

**대체·심화 후보:**
- Pearl, Glymour, Jewell, *Causal Inference in Statistics: A Primer* — 4 ch 짧은 입문
- Pearl & Mackenzie, *The Book of Why* — 대중서·관점 정리
- Howson & Urbach, *Scientific Reasoning: The Bayesian Approach*
- Walley, *Statistical Reasoning with Imprecise Probabilities*

**경로:**

```
[고전 기반] Pólya Vol I → Vol II → Cox → Jaynes
[modern AI]  Pearl PRIS → Pearl Causality → Halpern
```

### 25.3 Bayesian Data Analysis·Modern Bayesian (응용·교육)

Bayesian 데이터 분석의 실전·교육 표준. McElreath·Gelman 라인.

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| **Gelman et al., Bayesian Data Analysis (BDA3)** | Gelman·Carlin·Stern·Dunson·Vehtari·Rubin | 📋 | 28 ch. *Bayesian 바이블*. HMC·hierarchical·model checking |
| **McElreath, Statistical Rethinking** | Richard McElreath | 📋 | 2판 17 ch. *modern Bayesian 교육 표준*. Stan/PyMC 실용 |
| **Robert, The Bayesian Choice** | Christian P. Robert | 📋 | 2판 11 ch. *decision-theoretic Bayesian* — 이론 깊이 |
| **Kruschke, Doing Bayesian Data Analysis** | John K. Kruschke | 📋 | 2판 25 ch (핵심 15). 강아지 책. JAGS·Stan 응용 |
| **Hoff, A First Course in Bayesian Statistical Methods** | Peter D. Hoff | 💡 | 11 ch. 짧은 입문. Gibbs sampling 중심 |

**대체·심화:**
- Gelman & Hill, *Data Analysis Using Regression and Multilevel/Hierarchical Models*
- Bernardo & Smith, *Bayesian Theory* — measure-theoretic Bayesian
- Box & Tiao, *Bayesian Inference in Statistical Analysis* — 고전

**경로:**

```
[입문]   Hoff or McElreath → Kruschke
[표준]   McElreath → BDA3
[이론]   BDA3 → Robert (Bayesian Choice)
```

### 25.1 측도론적 확률·확률모델·고차원 (NPU compiler·ML 이론 트랙)

ML 이론·연구로 가는 길의 수학 토대. *무료 우선*.

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| **Durrett, Probability: Theory and Examples** | Rick Durrett | 📋 | *무료 PDF*. 측도론적 확률 baseline. Cornell 표준. 8 ch (5판) |
| **Bertsekas & Tsitsiklis, Introduction to Probability** | Bertsekas·Tsitsiklis | 📋 | *MIT 무료 PDF*. 9 ch. 응용 확률 학부 표준 |
| **Casella & Berger, Statistical Inference** | Casella·Berger | 📋 | 그래듀에이트 수리통계 바이블. 12 ch |
| **Vershynin, High-Dimensional Probability** | Roman Vershynin | 📋 | *무료 PDF*. 11 ch. ML 이론 modern foundation·집중부등식 |
| **Koller & Friedman, Probabilistic Graphical Models** | Koller·Friedman | 📋 | 21 ch. PGM 바이블. Bishop PRML과 보완 |

**대체·심화 후보 (필요 시 추가):**
- Williams, *Probability with Martingales* — martingale 중심 elegant (Durrett 대안)
- Ross, *Introduction to Probability Models* — queuing·Markov·renewal 응용 (B&T 대안)
- Norris, *Markov Chains* — 무료, chain 깊이
- Øksendal, *Stochastic Differential Equations* — Itô·SDE
- Lehmann & Romano, *Testing Statistical Hypotheses* — 가설검정 심화
- Wainwright, *High-Dimensional Statistics* — Vershynin 보완
- Boucheron·Lugosi·Massart, *Concentration Inequalities*

**경로:**

```
[기초] Wasserman / Jaynes → Convex Opt (Boyd) → Information Theory (Cover-Thomas / MacKay)
[심화] B&T → Durrett → Casella & Berger → Vershynin → Koller & Friedman
```

**참고 링크:**
- [Boyd, Convex Optimization (무료 PDF)](https://web.stanford.edu/~boyd/cvxbook/)
- [Durrett, Probability (무료 PDF)](https://services.math.duke.edu/~rtd/PTE/pte.html)
- [Bertsekas & Tsitsiklis (MIT OCW)](https://ocw.mit.edu/courses/res-6-012-introduction-to-probability-spring-2018/)
- [Vershynin, HDP (무료 PDF)](https://www.math.uci.edu/~rvershyn/papers/HDP-book/HDP-book.html)
- [MacKay, ITILA (무료 PDF)](https://www.inference.org.uk/itila/)
- [Concrete Mathematics (Stanford / Knuth)](https://www-cs-faculty.stanford.edu/~knuth/gkp.html)
- [Think Stats (무료 온라인)](https://greenteapress.com/thinkstats/)
- [Mathematics for Machine Learning (무료 PDF)](https://mml-book.github.io/)
- [Koller & Friedman PGM (Stanford)](https://pgm.stanford.edu/)
- [Cox — Algebra of Probable Inference (PDF)](https://bayes.wustl.edu/etj/articles/cox.algebra.pdf)
- [Pearl — Causality (UCLA)](https://bayes.cs.ucla.edu/BOOK-2K/)
- [McElreath — Statistical Rethinking (저자 사이트)](https://xcelab.net/rm/statistical-rethinking/)
- [Gelman — BDA3 (Stan)](http://www.stat.columbia.edu/~gelman/book/)
- [Robert — The Bayesian Choice (Springer)](https://link.springer.com/book/10.1007/0-387-71599-1)

---

## 26. 디버깅

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| Effective Debugging — 66 Specific Ways to Debug Software & Systems | Diomidis Spinellis | 📋 | Addison-Wesley, 66개 규칙, 범용 |
| Debugging: The 9 Indispensable Rules | David J. Agans | 📋 | 짧고 실용적, 멘탈 모델 중심 |
| Self-Service Linux | Wilding & Behman | 💡 | Linux production 디버깅 (IBM Press) |
| Linux Kernel Debugging | Kaiwan N. Billimoria | 💡 | kdump, crash, kgdb (Packt, 2022) |
| Advanced Windows Debugging | Hewardt & Pravat | 💡 | WinDbg, 메모리 corruption |

**경로:**
```
Agans (9 Rules, 짧음) → Spinellis (Effective, 깊이) → Self-Service Linux / Advanced Windows Debugging
```

**자체 시리즈 (이미 작성 중):**
- `tools/debugging/postmortem-debug` — Core dump · ELF core format · GDB core 분석 · debuginfod / minidump
- `tools/debugging/concurrency-debug` — 동시성 결함 진단
- `tools/debugging/embedded-debug` — RTOS / 임베디드 트러블슈팅
- `tools/debugging/sanitizers`, `valgrind`, `runtime-debugging`, `dwarf-elf`, `gdb-extension`, `python-debug`

**참고 링크:**
- [Effective Debugging (저자 사이트)](https://www.spinellis.gr/debugging/)
- [Debugging Rules! (Agans 공식 사이트)](http://debuggingrules.com/)

---

## 27. 패턴 활용 리팩터링

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| Refactoring to Patterns | Joshua Kerievsky | 📋 | Addison-Wesley 2004, Fowler + GoF 다리 |
| Refactoring (2판) | Martin Fowler | 📋 | 리팩터링 카탈로그 (section 24와 중복) |
| Design Patterns | Gamma 외 (GoF) | ✅ | 23개 패턴 (블로그 시리즈 완성) |
| Working Effectively with Legacy Code | Michael Feathers | 📋 | seam · sprout · 안전 리팩터링 |
| Smells to Refactorings Quick Reference | Kerievsky | 💡 | 냄새 → 리팩터링 → 패턴 매핑 카드 |

**경로:**
```
GoF (개별 패턴 익히기) → Fowler Refactoring (기계적 변환)
   → Kerievsky Refactoring to Patterns (코드 냄새 → 패턴 도입 / 제거)
   → Legacy Code (테스트 없는 코드부터 안전하게)
```

**핵심 아이디어:**
- *패턴은 목표가 아니라 도착지* — Kerievsky의 핵심 주장
- "Pattern-Happy" 회피 — 처음부터 패턴을 박지 말고, *냄새* 가 보이면 *그쪽으로 리팩터링*
- 27가지 리팩터링이 GoF 패턴으로 *나아가거나(Toward)* / *벗어나거나(Away from)* / *대안 패턴으로(Toward Alternative)*
- 예: Replace Implicit Tree with Composite, Move Accumulation to Visitor, Replace State-Altering Conditionals with State

**자체 시리즈 (계획):**
- `programming/design/refactoring-to-patterns` — 책의 27개 리팩터링을 코드 냄새 기준으로 재구성
  - Part 1 — 형성(Formation): 패턴을 *도입* 하는 리팩터링
  - Part 2 — 변형(Transformation): 패턴을 *바꾸는* 리팩터링
  - Part 3 — 제거(Removal): 패턴을 *걷어내는* 리팩터링 (과도한 패턴 청소)

**참고 링크:**
- [Refactoring to Patterns (industriallogic.com)](https://www.industriallogic.com/xp/refactoring/)
- [refactoring.com (Fowler)](https://refactoring.com/)
- [Kerievsky CCD Cards](https://www.industriallogic.com/blog/refactoring-cards/)

---

## 우선순위 큐

### Tier 1 — 즉시 착수
1. **DDIA** — 분산 시스템 바이블, 면접 필수
2. **Design Patterns for Embedded Systems in C** — 임베디드 + GoF 연결
3. **가상면접 사례로 배우는 대규모 시스템 설계 기초** — 면접 대비
4. **소프트웨어 요구사항 3판** — 요구사항 공학 필수
5. **Site Reliability Engineering** — SRE 바이블

### Tier 2 — 다음 분기
6. **C++ Concurrency in Action** — 동시성 패턴
7. **30가지 패턴으로 배우는 분산 시스템 설계와 구현 기법** — 분산 패턴
8. **Database Internals** — 스토리지 엔진
9. **Docs for Developers** — 기술 문서 작성

### Tier 3 — 장기
10. **Is Parallel Programming Hard** — 커널 동시성
11. **POSA Vol.2** — 네트워킹 패턴
12. **Making Embedded Systems** — 임베디드 실무
13. **Real-Time Design Patterns** — RTOS 패턴
14. **제안서 작성의 기술** — 설득력 있는 제안서

### Tier 4 — ML 시스템 / 임베디드 ML
15. **NPU 아키텍처** — 가속기 기초, TPU/ANE/Hexagon
16. **Dive into Deep Learning Compiler** — TVM/MLIR 기반 컴파일러
17. **ML Design Patterns** — 30개 ML 패턴
18. **ONNX 실전** — 모델 교환과 런타임
19. **Designing ML Systems** — Chip Huyen, 프로덕션 ML
20. **TinyML / Edge AI** — MCU 추론, TFLite Micro, CMSIS-NN
21. **NPU 드라이버 개발** — DRM, DMA-BUF, 커널 레벨

### Tier 5 — 가속기 하드웨어 / 인터커넥트 🔥
22. **UCIe 심화** — 칩렛 인터커넥트, 3.0 스펙 (2025.08)
23. **UALink 심화** — GPU 인터커넥트, NVLink 대안 (2025.04)
24. **CXL 심화** — 메모리 풀링, 4.0 스펙 (2025.11)
25. **HBM / GDDR 심화** — HBM3E, 고대역 메모리

### Tier 6 — 기초 페리페럴 / 산업 프로토콜 / QEMU
26. **Embedded Protocols 심화** — SPI, UART, I2C, RS-485 (기본기)
27. **CAN Bus 심화** — CAN 2.0, CAN FD, CAN XL (자동차/산업)
28. **MIPI 심화** — CSI-2, DSI-2, A-PHY (카메라/디스플레이)
29. **Industrial Ethernet** — EtherCAT, PROFINET, TSN (산업용)
30. **QEMU Fake Device Driver** — 가상 디바이스로 드라이버 테스트 🆕
31. **QEMU Embedded Emulation** — ARM/RISC-V 펌웨어 테스트 🆕
32. **QEMU Internals** — QEMU 소스 분석, 디바이스 모델 🆕

### Tier 7 — 철학/과학 고전
33. **수리철학 입문** — Russell, 논리주의 고전 (1919)
34. **프린키피아** — Newton, 고전역학 기초 (1687)

### Tier 8 — 아키텍처/알고리즘
35. **Fundamentals of Software Architecture** — 아키텍트 입문
36. **C++ Software Design** — 현대 C++ 패턴
37. **Algorithm Design Manual** — Skiena, 실용 알고리즘

### Tier 9 — 시스템 기초
38. **CSAPP** — 시스템 프로그래머 필독
39. **OSTEP** — 운영체제, 무료 온라인
40. **Computer Networking** — Kurose & Ross

### Tier 10 — 개발자 필독서
41. **Pragmatic Programmer** — 개발자 마인드셋
42. **Clean Code** — 코드 품질
43. **Refactoring** — 리팩토링 바이블
44. **Working with Legacy Code** — 레거시 다루기
45. **TDD by Example** — 테스트 주도 개발

### Tier 11 — 컴파일러/형식 검증
46. **Crafting Interpreters** — 인터프리터 만들기, 무료
47. **Practical TLA+** — 형식 검증 입문

### Tier 12 — 보안/암호학/FP
48. **Real-World Cryptography** — 현대 암호학
49. **SICP** — 함수형 프로그래밍 고전

### Tier 13 — 수학/DevOps
50. **Concrete Mathematics** — Knuth 이산수학
51. **DevOps Handbook** — DevOps 바이블

---

## 26. QEMU / 에뮬레이션

| 시리즈 | 상태 | 비고 |
|--------|------|------|
| QEMU Fake Device Driver | 📋 | 가상 디바이스로 드라이버 개발/테스트 |
| QEMU Embedded Emulation | 📋 | ARM/RISC-V 보드 에뮬레이션, 펌웨어 테스트 |
| QEMU Internals | 📋 | QEMU 소스 분석, 디바이스 모델 구현 |

### 26.1 QEMU Fake Device Driver (신규)

가상 디바이스로 리눅스 드라이버 개발/테스트. 실제 하드웨어 없이 드라이버 검증.

| 챕터 | 주제 |
|------|------|
| 1 | QEMU 개요 — 왜 가상 디바이스인가 |
| 2 | QEMU 설치와 빌드 |
| 3 | QEMU 디바이스 모델 기초 — QOM (QEMU Object Model) |
| 4 | 간단한 PCI 디바이스 만들기 |
| 5 | MMIO 레지스터 구현 |
| 6 | 인터럽트 (MSI/MSI-X) 구현 |
| 7 | DMA 버퍼 처리 |
| 8 | 리눅스 드라이버 작성 — 가상 디바이스용 |
| 9 | 디버깅 — QEMU + GDB로 드라이버 디버깅 |
| 10 | 테스트 자동화 — CI에서 QEMU 활용 |
| 11 | 고급 시나리오 — 에러 주입, 경쟁 조건 테스트 |
| 12 | 사례 연구 — NVMe 가상 디바이스 |

### 26.2 QEMU Embedded Emulation (신규)

ARM/RISC-V 보드 에뮬레이션으로 펌웨어/OS 개발.

| 챕터 | 주제 |
|------|------|
| 1 | 임베디드 에뮬레이션 개요 — 왜 QEMU인가 |
| 2 | ARM virt 머신 — 범용 ARM 플랫폼 |
| 3 | RISC-V virt 머신 — RISC-V 플랫폼 |
| 4 | U-Boot 부팅 — 부트로더 에뮬레이션 |
| 5 | 리눅스 커널 부팅 — 크로스 컴파일 + QEMU |
| 6 | 루트 파일시스템 — Buildroot/Yocto 이미지 |
| 7 | 디바이스 트리 — DTB 커스터마이징 |
| 8 | 페리페럴 추가 — UART, SPI, I2C 에뮬레이션 |
| 9 | 네트워킹 — TAP/User-mode 네트워킹 |
| 10 | GDB 원격 디버깅 — 커널/펌웨어 디버깅 |
| 11 | 베어메탈 펌웨어 — RTOS 없이 실행 |
| 12 | RTOS 에뮬레이션 — FreeRTOS/Zephyr on QEMU |

### 26.3 QEMU Internals (신규)

QEMU 소스 코드 분석과 디바이스 모델 구현 심화.

| 챕터 | 주제 |
|------|------|
| 1 | QEMU 아키텍처 개요 — TCG, KVM, 디바이스 모델 |
| 2 | QOM (QEMU Object Model) 심화 — 타입 시스템, 속성 |
| 3 | 메모리 모델 — MemoryRegion, AddressSpace |
| 4 | 이벤트 루프 — main loop, AIO, coroutine |
| 5 | 블록 레이어 — 이미지 포맷, I/O 경로 |
| 6 | 네트워크 레이어 — NIC 에뮬레이션, 백엔드 |
| 7 | PCI 서브시스템 — 버스, 브릿지, 디바이스 |
| 8 | 인터럽트 컨트롤러 — GIC, APIC 에뮬레이션 |
| 9 | 타이머와 클럭 — 시간 관리, RTC |
| 10 | 마이그레이션 — 라이브 마이그레이션, VMState |
| 11 | 커스텀 머신 타입 — 새 보드 정의 |
| 12 | QEMU 기여하기 — 코드 스타일, 패치 제출 |

**경로:**
```
QEMU Fake Device Driver → QEMU Embedded Emulation → QEMU Internals
```

**참고 링크:**
- [QEMU Official Documentation](https://www.qemu.org/docs/master/)
- [QEMU Wiki](https://wiki.qemu.org/)
- [QEMU Source Code (GitLab)](https://gitlab.com/qemu-project/qemu)
- [QEMU Device Model Documentation](https://www.qemu.org/docs/master/devel/qom.html)
- [QEMU Mailing List Archives](https://lists.gnu.org/archive/html/qemu-devel/)
- [Bootlin QEMU Tutorials](https://bootlin.com/docs/)
- [Linux Kernel QEMU Testing](https://www.kernel.org/doc/html/latest/dev-tools/kunit/qemu.html)

---

## 카테고리 매핑

| 카테고리 ID | 콘텐츠 |
|-------------|--------|
| `programming/cpp` | C/C++ |
| `programming/design` | 디자인 패턴, 아키텍처 |
| `programming/algorithms` | 알고리즘 |
| `programming/engineering` | 소프트웨어 공학 |
| `programming/compilers` | 컴파일러 |
| `programming/databases` | 데이터베이스 |
| `programming/fp` | 함수형 프로그래밍 |
| `programming/testing` | 테스팅, TDD |
| `programming/verification` | 형식 검증 (TLA+) |
| `programming/classics` | 필독서 |
| `programming/code-review` | 코드 리뷰, 오픈소스 |
| `systems/linux-kernel` | 리눅스 커널 |
| `systems/linux-drivers` | 디바이스 드라이버 |
| `systems/os` | 운영체제 |
| `systems/distributed` | 분산 시스템 |
| `systems/networking` | 네트워킹 |
| `systems/architecture` | 컴퓨터 아키텍처 |
| `systems/sre` | SRE |
| `embedded/hardware` | PCIe, NVMe, DDR, CXL, HBM, UCIe, UALink |
| `embedded/protocols` | SPI, UART, I2C, CAN, MIPI |
| `embedded/standards` | MISRA, CERT, AUTOSAR |
| `embedded/patterns` | 임베디드 패턴 |
| `embedded/industrial` | EtherCAT, PROFINET, TSN |
| `parallel` | 동시성/병렬 |
| `ml/accelerators` | NPU, TPU |
| `ml/compilers` | TVM, MLIR |
| `ml/inference` | ONNX, TensorRT |
| `ml/tinyml` | TFLite Micro, CMSIS-NN |
| `ml/systems` | ML 시스템 설계, MLOps |
| `ml/drivers` | NPU 드라이버 |
| `media` | AV1, 코덱 |
| `math/applied` | 이산수학, 확률통계 |
| `writing` | 글쓰기 |
| `philosophy` | 철학, 비판적 사고 |
| `philosophy/math` | 수리철학 |
| `science/classics` | 과학 고전 |
| `design` | UX, UI |
| `tools/debugging` | 디버깅 |
| `tools/emulation` | QEMU, 에뮬레이션 |
| `security` | 보안, 암호학 |
| `devops` | DevOps, 컨테이너 |

---

## 다음 단계

1. [ ] Tier 1 책들 스토리보드 작성
2. [x] ML 카테고리 추가
3. [x] 수리철학 카테고리 추가
4. [x] 과학 고전 카테고리 추가
5. [x] 신규 분야 카테고리 추가 (네트워킹, OS, 컴파일러, 보안, DB, FP, 테스팅, DevOps, 형식 검증)
6. [x] TinyML / Edge AI 시리즈 추가
7. [x] NPU 드라이버 개발 시리즈 추가
8. [x] CXL / HBM Deep Dive 시리즈 추가
9. [x] UCIe / UALink / BoW 시리즈 추가 (칩렛/GPU 인터커넥트)
10. [x] 기초 페리페럴 시리즈 추가 (SPI, UART, I2C, CAN, MIPI, Industrial Ethernet)
11. [x] categories.ts에 신규 카테고리 반영
12. [x] QEMU / 에뮬레이션 시리즈 추가 (Fake Device, Embedded Emulation, Internals)
13. [x] 디버깅 책 섹션 추가 (Effective Debugging, 9 Rules, Self-Service Linux 등)
14. [x] 패턴 활용 리팩터링 섹션 추가 (Refactoring to Patterns)
15. [ ] 각 책별 디렉터리 및 첫 글 생성
16. [ ] 스토리보드 작성 (우선순위 순)

---

## 참고 링크

### 리눅스 / 시스템
- [kernel.org Documentation](https://www.kernel.org/doc/html/latest/)
- [Bootlin Training](https://bootlin.com/docs/)
- [Paul McKenney's perfbook](https://mirrors.edge.kernel.org/pub/linux/kernel/people/paulmck/perfbook/perfbook.html)

### 분산 시스템 / SRE
- [Martin Kleppmann's Site](https://martin.kleppmann.com/)
- [Alex Xu's ByteByteGo](https://bytebytego.com/)
- [Google SRE Books](https://sre.google/books/)

### 소프트웨어 공학
- [Karl Wiegers' Site](https://www.processimpact.com/)

### ML 시스템
- [Dive into Deep Learning Compiler](https://tvm.d2l.ai/)
- [Apache TVM Documentation](https://tvm.apache.org/docs/)
- [MLIR Documentation](https://mlir.llvm.org/docs/)
- [IREE Project](https://github.com/iree-org/iree)
- [ML Design Patterns (O'Reilly)](https://www.oreilly.com/library/view/machine-learning-design/9781098115777/)
- [ML Design Patterns GitHub](https://github.com/GoogleCloudPlatform/ml-design-patterns)
- [Designing ML Systems (Chip Huyen)](https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/)
- [Chip Huyen's Site](https://huyenchip.com/)
- [ONNX Official](https://onnx.ai/)
- [Intel NPU Acceleration Library](https://intel.github.io/intel-npu-acceleration-library/npu.html)
- [ARM NPU Documentation](https://developer.arm.com/documentation/102023/latest/)
- [TVM 논문 (OSDI'18)](https://arxiv.org/abs/1802.04799)

### 수리철학
- [Introduction to Mathematical Philosophy (Project Gutenberg, 무료)](https://www.gutenberg.org/ebooks/41654)
- [Introduction to Mathematical Philosophy (PDF)](https://people.umass.edu/klement/imp/imp-ebk.pdf)
- [Stanford Encyclopedia — Bertrand Russell](https://plato.stanford.edu/entries/russell/)
- [Stanford Encyclopedia — Philosophy of Mathematics](https://plato.stanford.edu/entries/philosophy-mathematics/)
- [Stanford Encyclopedia — Logicism](https://plato.stanford.edu/entries/logicism/)

### 과학 고전
- [Principia (Project Gutenberg, 영문 무료)](https://www.gutenberg.org/ebooks/76404)
- [Principia 라틴어 원문 (Project Gutenberg)](https://www.gutenberg.org/ebooks/28233)
- [Wikisource 1846 영역본](https://en.wikisource.org/wiki/The_Mathematical_Principles_of_Natural_Philosophy_(1846))
- [Stanford Encyclopedia — Newton's Principia](https://plato.stanford.edu/entries/newton-principia/)

### 아키텍처 / 설계
- [Fundamentals of Software Architecture (O'Reilly)](https://www.oreilly.com/library/view/fundamentals-of-software/9781098175504/)
- [fundamentalsofsoftwarearchitecture.com](http://fundamentalsofsoftwarearchitecture.com/)
- [C++ Software Design (O'Reilly)](https://www.oreilly.com/library/view/c-software-design/9781098113155/)
- [Klaus Iglberger CppCon Talks](https://www.youtube.com/results?search_query=klaus+iglberger+cppcon)

### 알고리즘
- [The Algorithm Design Manual (algorist.com)](https://www.algorist.com/)
- [Skiena's Lecture Videos](https://www3.cs.stonybrook.edu/~skiena/373/videos/)

### TinyML / Edge AI
- [TinyML Book (O'Reilly)](https://www.oreilly.com/library/view/tinyml/9781492052036/)
- [TensorFlow Lite Micro](https://www.tensorflow.org/lite/microcontrollers)
- [CMSIS-NN (ARM)](https://arm-software.github.io/CMSIS_5/NN/html/index.html)
- [Edge Impulse Documentation](https://docs.edgeimpulse.com/)
- [microTVM (TVM)](https://tvm.apache.org/docs/topic/microtvm/index.html)
- [TinyML Foundation](https://www.tinyml.org/)

### 가속기 하드웨어
- [CXL Consortium](https://www.computeexpresslink.org/)
- [Linux CXL Documentation](https://www.kernel.org/doc/html/latest/driver-api/cxl/index.html)
- [JEDEC HBM Standards](https://www.jedec.org/standards-documents/focus/high-bandwidth-memory-hbm)
- [DRM Documentation (Linux Kernel)](https://www.kernel.org/doc/html/latest/gpu/index.html)
- [DMA-BUF Sharing](https://www.kernel.org/doc/html/latest/driver-api/dma-buf.html)
- [Etnaviv Driver](https://github.com/etnaviv/etnaviv_gpu_tests)
- [Panfrost Driver (ARM Mali)](https://docs.mesa3d.org/drivers/panfrost.html)
