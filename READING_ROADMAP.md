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
| Designing Data-Intensive Applications (DDIA) | Martin Kleppmann | 📋 | 분산 시스템 바이블 |
| Database Internals | Alex Petrov | 📋 | 스토리지 엔진/분산 DB |
| Building Microservices | Sam Newman | 💡 | 마이크로서비스 입문 |
| Microservices Patterns | Chris Richardson | 💡 | 44개 구현 패턴 |

**경로:**
```
시스템 설계 기초 (Alex Xu) → DDIA → 분산 시스템 패턴 → Database Internals
```

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

---

## 10. 미디어 / 코덱 (자체 시리즈)

| 시리즈 | 상태 | 비고 |
|--------|------|------|
| AV1 Deep Dive | ✅ | 30장, 8 Parts 구조 |

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

**경로:**
```
NPU 아키텍처 → ML 컴파일러 → ONNX 실전
                ↘
            ML 디자인 패턴 → 대규모 ML 시스템 설계
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

---

## 22. DevOps / 컨테이너

| 책 | 저자 | 상태 | 비고 |
|---|------|------|------|
| The DevOps Handbook | Kim, Humble 외 | 📋 | DevOps 바이블 |
| Kubernetes in Action | Marko Lukša | 💡 | K8s 깊이 파기 |
| Docker Deep Dive | Nigel Poulton | 💡 | Docker 실무 |
| Infrastructure as Code | Kief Morris | 💡 | IaC 패턴 |

**경로:**
```
DevOps Handbook → Docker Deep Dive → Kubernetes in Action
```

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

### Tier 4 — ML 시스템 (신규)
15. **NPU 아키텍처** — 가속기 기초, TPU/ANE/Hexagon
16. **Dive into Deep Learning Compiler** — TVM/MLIR 기반 컴파일러
17. **ML Design Patterns** — 30개 ML 패턴
18. **ONNX 실전** — 모델 교환과 런타임
19. **Designing ML Systems** — Chip Huyen, 프로덕션 ML

### Tier 5 — 철학/과학 고전 (신규)
20. **수리철학 입문** — Russell, 논리주의 고전 (1919)
21. **프린키피아** — Newton, 고전역학 기초 (1687)

### Tier 6 — 아키텍처/알고리즘
22. **Fundamentals of Software Architecture** — 아키텍트 입문
23. **C++ Software Design** — 현대 C++ 패턴
24. **Algorithm Design Manual** — Skiena, 실용 알고리즘

### Tier 7 — 시스템 기초
25. **CSAPP** — 시스템 프로그래머 필독
26. **OSTEP** — 운영체제, 무료 온라인
27. **Computer Networking** — Kurose & Ross

### Tier 8 — 개발자 필독서
28. **Pragmatic Programmer** — 개발자 마인드셋
29. **Clean Code** — 코드 품질
30. **Refactoring** — 리팩토링 바이블
31. **Working with Legacy Code** — 레거시 다루기
32. **TDD by Example** — 테스트 주도 개발

### Tier 9 — 컴파일러/형식 검증
33. **Crafting Interpreters** — 인터프리터 만들기, 무료
34. **Practical TLA+** — 형식 검증 입문

### Tier 10 — 보안/암호학/FP
35. **Real-World Cryptography** — 현대 암호학
36. **SICP** — 함수형 프로그래밍 고전

### Tier 11 — 수학/DevOps
37. **Concrete Mathematics** — Knuth 이산수학
38. **DevOps Handbook** — DevOps 바이블

---

## 카테고리 매핑

| 카테고리 ID | 시리즈 |
|-------------|--------|
| `systems/linux-kernel` | 리눅스 커널 |
| `systems/linux-drivers` | 리눅스 드라이버 |
| `systems/distributed` | 분산 시스템 |
| `systems/sre` | SRE / 운영 |
| `embedded/hardware` | PCIe, NVMe, DDR |
| `embedded/patterns` | 임베디드 패턴 |
| `parallel` | 동시성/병렬 |
| `programming/design` | 아키텍처/패턴 |
| `programming/engineering` | 요구사항/공학 |
| `writing` | 기술 문서/제안서 |
| `media/av1` | AV1 코덱 |
| `ml` | 머신러닝 시스템 |
| `ml/accelerators` | NPU/TPU 아키텍처 |
| `ml/compilers` | ML 컴파일러 (TVM/MLIR) |
| `ml/patterns` | ML 디자인 패턴 |
| `ml/inference` | ONNX / 추론 런타임 |
| `ml/systems` | 대규모 ML 시스템 설계 |
| `philosophy/math` | 수리철학 |
| `science/classics` | 과학 고전 (Newton 등) |
| `programming/algorithms` | 알고리즘 |
| `programming/cpp` | C++ 소프트웨어 디자인 |
| `systems/networking` | 네트워킹 |
| `systems/os` | 운영체제 |
| `systems/architecture` | 컴퓨터 아키텍처 |
| `programming/compilers` | 컴파일러 |
| `security` | 보안/암호학 |
| `programming/databases` | 데이터베이스 |
| `programming/fp` | 함수형 프로그래밍 |
| `programming/testing` | 테스팅 |
| `devops` | DevOps/컨테이너 |
| `programming/verification` | 형식 검증 |
| `programming/classics` | 개발자 필독서 |
| `math/applied` | 실용 수학 |

---

## 다음 단계

1. [ ] Tier 1 책들 스토리보드 작성
2. [x] ML 카테고리 추가
3. [x] 수리철학 카테고리 추가
4. [x] 과학 고전 카테고리 추가
5. [x] 신규 분야 카테고리 추가 (네트워킹, OS, 컴파일러, 보안, DB, FP, 테스팅, DevOps, 형식 검증)
6. [ ] 각 책별 디렉터리 및 첫 글 생성
7. [ ] 스토리보드 작성 (우선순위 순)

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
