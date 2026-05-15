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

**경로:**
```
Making Embedded Systems → Design Patterns for Embedded C → Real-Time Design Patterns
```

---

## 3. 분산 시스템 / 대규모 설계

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| 가상면접 사례로 배우는 대규모 시스템 설계 기초 | Alex Xu | 📋 | 16장, 면접 필수 |
| 가상면접 사례로 배우는 대규모 시스템 설계 기초 2 | Alex Xu | 💡 | 13장, 심화 |
| 30가지 패턴으로 배우는 분산 시스템 설계와 구현 기법 | Unmesh Joshi | 📋 | 30 패턴 |
| Designing Data-Intensive Applications (DDIA) | Martin Kleppmann | 📋 | 분산 시스템 바이블, 2판 2026 |
| Database Internals | Alex Petrov | 📋 | 스토리지 엔진/분산 DB |
| Building Microservices | Sam Newman | 💡 | 마이크로서비스 입문 |
| Microservices Patterns | Chris Richardson | 💡 | 44개 구현 패턴 |

**경로:**
```
시스템 설계 기초 (Alex Xu) → DDIA → 분산 시스템 패턴 → Database Internals
```

**참고 링크:**
- [DDIA 공식 사이트 (dataintensive.net)](https://dataintensive.net/)
- [Martin Kleppmann's Site](https://martin.kleppmann.com/)
- [Database Internals (databass.dev)](https://www.databass.dev/)
- [ByteByteGo (Alex Xu)](https://bytebytego.com/)

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

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| C++ Concurrency in Action | Anthony Williams | 📋 | C++ 동시성 패턴 |
| Patterns for Parallel Programming | Mattson 외 | 💡 | 병렬 프로그래밍 패턴 |
| The Art of Multiprocessor Programming | Herlihy & Shavit | 💡 | 이론 + 알고리즘 |
| Is Parallel Programming Hard | Paul McKenney | 📋 | (커널 섹션과 중복) |

**경로:**
```
C++ Concurrency in Action → Patterns for Parallel Programming → Is Parallel Programming Hard
```

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
| CXL Deep Dive | 📋 | 4.0 스펙, 메모리 풀링, 멀티랙 |
| HBM / GDDR Deep Dive | 📋 | HBM3E, 고대역 메모리 |
| UCIe Deep Dive | 📋 | 3.0 스펙, 칩렛 인터커넥트 🔥 |
| UALink Deep Dive | 📋 | 1.0 스펙, GPU 인터커넥트, NVLink 대안 🔥 |
| BoW (Bunch of Wires) | 💡 | OCP 오픈 D2D, 저비용 칩렛 |
| PCIe 6.0 확장 | 📋 | PAM4, 64 GT/s (기존 시리즈 확장) |
| **기초 프로토콜** | | |
| Embedded Protocols Deep Dive | 📋 | SPI, UART, I2C, RS-485 — 기본기 |
| CAN Bus Deep Dive | 📋 | CAN 2.0, CAN FD, CAN XL — 자동차/산업 |
| MIPI Deep Dive | 📋 | CSI-2, DSI-2, A-PHY — 카메라/디스플레이 |
| Industrial Ethernet | 📋 | EtherCAT, PROFINET, TSN — 산업용 이더넷 |

### 9.1 CXL Deep Dive (신규)

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

### 9.2 HBM / GDDR Deep Dive (신규)

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

### 9.3 UCIe Deep Dive (신규) 🔥

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

### 9.4 UALink Deep Dive (신규) 🔥

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

### 9.6 Embedded Protocols Deep Dive (신규)

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

### 9.7 CAN Bus Deep Dive (신규)

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

### 9.8 MIPI Deep Dive (신규)

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

### 9.9 Industrial Ethernet Deep Dive (신규)

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

**경로:**
```
NPU 아키텍처 → ML 컴파일러 → ONNX 실전
      ↓              ↘
NPU 드라이버      ML 디자인 패턴 → 대규모 ML 시스템 설계
      ↓
TinyML / Edge AI → ML 시스템 프로파일링
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
| Concrete Mathematics | Knuth, Graham, Patashnik | 📋 | 이산수학 + 분석 |
| Think Stats | Allen Downey | 💡 | 프로그래머용 통계, 무료 |
| Probability Theory: The Logic of Science | E.T. Jaynes | 💡 | 베이지안 관점 |
| Mathematics for Machine Learning | Deisenroth 외 | 💡 | ML 수학, 무료 |

**경로:**
```
Concrete Mathematics → Think Stats → Mathematics for ML
```

**참고 링크:**
- [Concrete Mathematics (Stanford / Knuth)](https://www-cs-faculty.stanford.edu/~knuth/gkp.html)
- [Think Stats (무료 온라인)](https://greenteapress.com/thinkstats/)
- [Mathematics for Machine Learning (무료 PDF)](https://mml-book.github.io/)

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
22. **UCIe Deep Dive** — 칩렛 인터커넥트, 3.0 스펙 (2025.08)
23. **UALink Deep Dive** — GPU 인터커넥트, NVLink 대안 (2025.04)
24. **CXL Deep Dive** — 메모리 풀링, 4.0 스펙 (2025.11)
25. **HBM / GDDR Deep Dive** — HBM3E, 고대역 메모리

### Tier 6 — 기초 페리페럴 / 산업 프로토콜 / QEMU
26. **Embedded Protocols Deep Dive** — SPI, UART, I2C, RS-485 (기본기)
27. **CAN Bus Deep Dive** — CAN 2.0, CAN FD, CAN XL (자동차/산업)
28. **MIPI Deep Dive** — CSI-2, DSI-2, A-PHY (카메라/디스플레이)
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
13. [ ] 각 책별 디렉터리 및 첫 글 생성
14. [ ] 스토리보드 작성 (우선순위 순)

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
