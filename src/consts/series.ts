// 시리즈 렌즈 레지스트리 — 각 시리즈의 한 줄 "렌즈(포지셔닝)".
//
// 블로그는 책/출처별 시리즈로 조직돼 있고, 같은 주제가 여러 시리즈에 고도를
// 달리해 나타난다(예: CSAPP=프로그래머 관점 / OSTEP=설계 원리 / LKI=Linux 구현).
// 렌즈는 겹쳐 보이는 시리즈를 "한 줄로 구분"해 준다. 구분되면 유지, 안 되면 병합 검토.
//
// `id`는 반드시 각 글의 frontmatter `series:` 값과 문자 그대로 일치해야 한다(& 등 포함).

export interface Series {
  /** frontmatter `series:` 값과 정확히 일치하는 키. */
  id: string;
  /** 이 시리즈만의 렌즈/고도 — 한 문장. */
  lens: string;
  /** 주 카테고리/서브카테고리 경로(예: 'systems', 'embedded/hardware'). */
  category?: string;
}

export const SERIES: Series[] = [
  // design
  { id: "The Design of Everyday Things", lens: "행동유도성·시그니파이어·멘탈 모델로 보는 일상 디자인의 심리학.", category: "design" },

  // embedded — 표준
  { id: "DO-178C", lens: "RTCA DO-178C — 항공 SW 인증의 모표준. 역사·구조와 ISO 26262 비교.", category: "embedded/aerospace-standards" },
  { id: "ECSS-Q-ST-80C", lens: "ESA·유럽 우주 산업의 ECSS 체계와 SW Product Assurance 표준.", category: "embedded/aerospace-standards" },
  { id: "JSF C++", lens: "Lockheed Martin이 F-35용으로 발행한 C++ 코딩 표준(2005).", category: "embedded/aerospace-standards" },
  { id: "NASA JPL Power of 10", lens: "단 10개 규칙으로 화성 로버 펌웨어를 안전하게 쓰는 법(Holzmann).", category: "embedded/aerospace-standards" },
  { id: "AUTOSAR C++14", lens: "AUTOSAR C++14 — Classic/Adaptive 채택 배경과 MISRA C++ 대비 차이.", category: "embedded/automotive" },
  { id: "CERT C", lens: "SEI CERT C — 보안 중심 철학과 MISRA 대비, Risk Assessment.", category: "embedded/automotive" },
  { id: "MISRA C", lens: "MISRA C — 자동차 산업 요구와 1998/2004/2012 세 판의 진화.", category: "embedded/automotive" },
  { id: "Developing Safety-Critical Software", lens: "SW assurance vs testing, 항공·국방·우주 영역별 안전 표준.", category: "embedded/avionics" },
  { id: "Digital Avionics Handbook", lens: "Sensor→FCC→actuator→comm, 에비오닉스 시스템 구성 요소 정리.", category: "embedded/avionics" },
  { id: "Launch Vehicle Flight Software", lens: "발사체와 항공기 에비오닉스의 차이가 SW 아키텍처에 미치는 영향.", category: "embedded/avionics" },

  // embedded — 코어
  { id: "Bootloader Internals", lens: "ROM에서 init까지의 전체 흐름과 그 사이 부트로더의 자리(U-Boot·TF-A·PSCI·DT).", category: "embedded" },
  { id: "BSP Development", lens: "보드를 부팅 가능한 시스템으로 만드는 Board Support Package의 정의·범위·구성.", category: "embedded" },
  { id: "Buildroot Practical", lens: "임베디드 리눅스 rootfs 빌드 시스템 Buildroot, Yocto와의 트레이드오프.", category: "embedded" },
  { id: "Embedded C++ for Real Systems", lens: "어디까지 C++를 써도 되는가 — RAII·constexpr·no-exception·lock-free를 임베디드에서 안전하게.", category: "embedded" },
  { id: "Embedded Security", lens: "STRIDE/DREAD 위협 모델링과 물리 접근·자원 제약이라는 임베디드 특수성.", category: "embedded" },
  { id: "Modern Embedded Recipes", lens: "HW 인터페이스부터 드라이버·RTOS·Linux·FPGA·Edge AI까지 임베디드 12파트 cookbook.", category: "embedded" },
  { id: "Embedded Performance Engineering", lens: "왜 느린가 — cache miss·pipeline stall·bus contention부터 프로파일링까지 임베디드 성능 분석.", category: "embedded" },
  { id: "RISC-V 임베디드 실습", lens: "riscv-gnu-toolchain·LLVM·IDE 설정 등 RISC-V 개발 환경 실습.", category: "embedded" },
  { id: "ESP32-C3 Mastering", lens: "Espressif가 RISC-V로 전환한 첫 SoC — RV32IMC + WiFi4 + BLE5.", category: "embedded/riscv" },
  { id: "Yocto Deep Dive", lens: "임베디드 Linux 빌드 시스템 Yocto — Mega-Manual·scarthgap LTS 기준.", category: "embedded" },

  // embedded — 하드웨어/인터커넥트
  { id: "BoW 개요", lens: "Bunch of Wires — OCP ODSA의 royalty-free 저비용 D2D 칩렛 인터페이스.", category: "embedded/hardware" },
  { id: "CXL 4.0 Internals", lens: "CXL이 푸는 문제, 세대별 진화, 4.0의 핵심 변경(128 GT/s).", category: "embedded/hardware" },
  { id: "DDR Memory Deep Dive", lens: "메모리 셀부터 Bank·Row·Column·Rank까지 DDR의 물리적 계층 구조.", category: "embedded/hardware" },
  { id: "HBM·GDDR 심화", lens: "HBM과 GDDR의 분기점 — bandwidth·capacity·cost 트레이드오프.", category: "embedded/hardware" },
  { id: "NVMe Deep Dive", lens: "AHCI와의 근본 차이에서 출발하는 NVMe 아키텍처 전체 구조.", category: "embedded/hardware" },
  { id: "PCIe Deep Dive", lens: "point-to-point 직렬 링크·3-Layer 모델·토폴로지, Gen1부터 7.0까지.", category: "embedded/hardware" },
  { id: "The Zynq Book", lens: "PS+PL — ARM Cortex-A와 FPGA가 한 다이에 있다는 것의 의미.", category: "embedded/hardware" },
  { id: "UALink 심화", lens: "NVLink 대안 — 75개사가 모인 open scaling interconnect.", category: "embedded/hardware" },
  { id: "UCIe 심화", lens: "칩렛 시대의 PCIe — UCIe가 푸는 D2D 표준화 문제.", category: "embedded/hardware" },

  // embedded — 프로토콜
  { id: "CAN Bus 심화", lens: "Bosch가 1986년 발표한 차동 버스, 우선순위 중재로 멀티마스터에 강함.", category: "embedded/protocols" },
  { id: "Embedded Protocols 심화", lens: "SPI·I²C·UART·RS-485 — 30년 묵은 표준이 여전히 MCU 보드를 지배하는 이유.", category: "embedded/protocols" },
  { id: "Industrial Ethernet 심화", lens: "표준 Ethernet으로 왜 부족한가 — 실시간성·결정성의 산업용 확장.", category: "embedded/protocols" },
  { id: "MIPI 심화", lens: "카메라·디스플레이·디버그·전원·터치를 아우르는 모바일 표준 컨소시엄.", category: "embedded/protocols" },

  // embedded — RTOS/wireless
  { id: "Mastering the FreeRTOS Real Time Kernel", lens: "FreeRTOS 소스 트리·포팅 레이어·설정을 사용자 관점에서 익히기.", category: "embedded/rtos" },
  { id: "Practical RTOS Internals", lens: "RTOS를 쓰는 게 아니라 이해·구현 — 스케줄러·컨텍스트 스위치·할당자를 소스 수준으로.", category: "embedded/rtos" },
  { id: "Getting Started with BLE", lens: "클래식 BT의 확장이 아닌 별도 프로토콜, 코인셀 1년 운용을 노린 BLE.", category: "embedded/wireless" },

  // math
  { id: "Linear Algebra", lens: "추상화 전에 손에 익히는 원본 그림 — 선형대수 첫걸음.", category: "math/linear-algebra" },
  { id: "Convex Optimization (Boyd)", lens: "왜 convexity가 결정적인가 — local = global이 보장된다.", category: "math/optimization" },
  { id: "A First Course in Bayesian Statistical Methods", lens: "sample space·conditional·Bayes에서 출발하는 베이지안 입문.", category: "math/probability" },
  { id: "All of Statistics", lens: "대학원 통계 전 분야를 한 권으로 압축한 속성 레퍼런스(Wasserman).", category: "math/probability" },
  { id: "Bayesian Data Analysis (3rd ed)", lens: "Gelman의 BDA — 계층 모형과 사후 예측 점검 중심의 베이지안 실무 표준.", category: "math/probability" },
  { id: "Doing Bayesian Data Analysis (2nd ed, core)", lens: "Kruschke — R/JAGS/Stan으로 손으로 돌려 보는 베이지안 입문.", category: "math/probability" },
  { id: "Elements of Information Theory", lens: "정보이론이 답하는 두 질문 — 압축 한계·전송 한계.", category: "math/probability" },
  { id: "High-Dimensional Probability", lens: "Vershynin — 집중부등식과 랜덤 행렬, 고차원 통계의 도구상자.", category: "math/probability" },
  { id: "Information Theory, Inference, and Learning Algorithms", lens: "MacKay — 정보이론과 추론·학습을 한 줄기로 엮은 고전.", category: "math/probability" },
  { id: "Introduction to Probability", lens: "Blitzstein — 이야기로 배우는 확률(하버드 Stat110).", category: "math/probability" },
  { id: "Mathematics and Plausible Reasoning, Vol I", lens: "Pólya — 수학적 발견에서의 귀납과 유추.", category: "math/probability" },
  { id: "Mathematics and Plausible Reasoning, Vol II", lens: "Pólya — 개연 추론의 패턴과 그럴듯함의 논리.", category: "math/probability" },
  { id: "Probabilistic Graphical Models (Koller & Friedman)", lens: "표현·추론·학습으로 나눠 보는 PGM의 결정판.", category: "math/probability" },
  { id: "Probability Theory: The Logic of Science", lens: "Jaynes — 확률을 논리의 확장으로 보는 베이지안 선언.", category: "math/probability" },
  { id: "Probability: Theory and Examples", lens: "Durrett — 측도론 기반 확률론 대학원 표준.", category: "math/probability" },
  { id: "Reasoning About Uncertainty", lens: "Halpern — 확률 너머 불확실성 표현(믿음·가능성·plausibility).", category: "math/probability" },
  { id: "Statistical Inference", lens: "probability·conditional·independence에서 쌓는 수리통계의 토대(Casella–Berger).", category: "math/probability" },
  { id: "Statistical Rethinking", lens: "McElreath — 인과와 다층모형을 코드로 다시 생각하는 베이지안.", category: "math/probability" },
  { id: "The Algebra of Probable Inference", lens: "Cox — 확률 규칙을 공리에서 유도하는 짧은 고전.", category: "math/probability" },
  { id: "The Bayesian Choice", lens: "Robert — 의사결정이론에서 출발하는 베이지안 통계.", category: "math/probability" },
  { id: "Set Theory", lens: "무한·순서수·기수를 다루는 공리적 집합론 입문.", category: "math/set-theory" },

  // media
  { id: "AV1", lens: "비트스트림 구조부터 디코더 구현·인코더 전략까지 AV1 완전 정복.", category: "media" },

  // ml
  { id: "NPU 아키텍처", lens: "왜 ML 워크로드가 또 다른 칩을 요구하는가 — 시스톨릭 어레이·데이터플로우.", category: "ml/accelerators" },
  { id: "Apple Metal Stack", lens: "Apple GPU를 겨냥한 Metal — 셰이더·compute 커널·MPS 스택.", category: "ml/compilers" },
  { id: "ML 컴파일러", lens: "그래프에서 커널까지, ML 컴파일러가 모델을 하드웨어로 낮추는 과정.", category: "ml/compilers" },
  { id: "MLIR 심화", lens: "다단계 IR로 도메인별 최적화를 쌓는 MLIR의 dialect 설계.", category: "ml/compilers" },
  { id: "PyTorch Internals", lens: "Tensor 연산이 Python에서 C++로 가는 길.", category: "ml/compilers" },
  { id: "Triton DSL", lens: "block-level 프로그래밍 — CUDA보다 짧고 cuBLAS만큼 빠르게.", category: "ml/compilers" },
  { id: "XLA·OpenXLA 심화", lens: "HLO 그래프를 fuse·컴파일하는 XLA/OpenXLA 백엔드.", category: "ml/compilers" },
  { id: "NPU 드라이버 개발", lens: "IOMMU·DMA-BUF·command queue로 가속기를 커널에 붙이는 드라이버 스택.", category: "ml/drivers" },
  { id: "Causality: Models, Reasoning, and Inference", lens: "Pearl — do-연산과 구조적 인과모형의 결정판.", category: "ml/foundations" },
  { id: "Pattern Recognition and Machine Learning", lens: "Bishop PRML — 확률적 ML의 토대를 다지는 책.", category: "ml/foundations" },
  { id: "Probabilistic Machine Learning: Advanced Topics", lens: "Murphy 2권 — 심층 생성·추론까지 확장한 확률적 ML.", category: "ml/foundations" },
  { id: "Probabilistic Machine Learning: An Introduction", lens: "Murphy 1권 — 확률 관점으로 통일한 ML 교과서.", category: "ml/foundations" },
  { id: "Probabilistic Reasoning in Intelligent Systems", lens: "Pearl 전작 — 베이지안 네트워크로 불확실 추론을 정식화.", category: "ml/foundations" },
  { id: "Core ML 심화", lens: "Apple Neural Engine·Core ML로 온디바이스 추론을 올리는 실전.", category: "ml/inference" },
  { id: "ONNX Runtime 심화", lens: "ORT의 vendor 추상 — CPU·CUDA·TensorRT·CoreML·QNN.", category: "ml/inference" },
  { id: "ONNX 실전", lens: "Protobuf·Graph·Node — ONNX 파일 안에 무엇이 들었나.", category: "ml/inference" },
  { id: "TensorRT 심화", lens: "Network·BuilderConfig·Engine — TensorRT compile flow.", category: "ml/inference" },
  { id: "Designing Machine Learning Systems", lens: "Chip Huyen — research ML vs production ML의 결정적 차이.", category: "ml/systems" },
  { id: "ML 디자인 패턴", lens: "데이터·모델·서빙 단계별 재사용 가능한 ML 시스템 패턴 카탈로그.", category: "ml/systems" },
  { id: "ML 시스템 프로파일링", lens: "학습·추론 파이프라인의 병목을 계측·프로파일링하는 법.", category: "ml/systems" },
  { id: "TinyML·Edge AI", lens: "MCU·엣지에서 양자화된 모델을 돌리는 TinyML 실전.", category: "ml" },

  // parallel — 동시성/분산 (렌즈로 구분)
  { id: "The Art of Concurrency", lens: "왜 동시성인가 — 멀티코어 시대의 성능 향상 전략.", category: "parallel" },
  { id: "C++ Concurrency in Action", lens: "C++11 std::thread부터 lock-free까지, 언어 API 관점의 동시성.", category: "parallel" },
  { id: "Designing Data-Intensive Applications", lens: "Reliability·Scalability·Maintainability — 데이터 집약 시스템의 세 품질.", category: "parallel" },
  { id: "Distributed Systems", lens: "Tanenbaum — 투명성·개방성·확장성으로 보는 분산 시스템의 정의와 목표.", category: "parallel" },
  { id: "Introduction to Parallel Computing", lens: "무어의 법칙·전력 장벽·멀티코어 — HPC 플랫폼과 아키텍처.", category: "parallel" },
  { id: "The Art of Multiprocessor Programming", lens: "공유메모리 멀티프로세서의 동기화 이론과 프리미티브.", category: "parallel" },
  { id: "Patterns for Parallel Programming", lens: "OPL의 4개 설계 공간과 계층 — 병렬 패턴 언어 카탈로그.", category: "parallel" },
  { id: "Seven Concurrency Models in Seven Weeks", lens: "threads-and-locks부터 actor·CSP·STM까지 7개 패러다임 비교 서베이.", category: "parallel" },
  { id: "Structured Parallel Programming", lens: "ad-hoc threads+locks를 피하는 구조적·패턴 기반 병렬화.", category: "parallel" },

  // philosophy
  { id: "비판적 사고를 위한 논리", lens: "명제·전제·결론과 논증/비-논증 구별에서 시작하는 논리.", category: "philosophy" },
  { id: "Understanding Philosophy of Science", lens: "과학의 출현과 방법론 — 과학철학의 핵심 물음.", category: "philosophy" },
  { id: "The Structure of Scientific Revolutions", lens: "Kuhn — 패러다임과 과학혁명, 누적적 과학사관의 한계.", category: "philosophy" },

  // programming — algorithms
  { id: "Data Structures and Algorithms", lens: "자료구조·알고리즘 기본기를 현대 C++ 구현으로 훑는 시리즈.", category: "programming/algorithms" },
  { id: "Programming Pearls", lens: "Bentley — 실전 문제로 벼리는 알고리즘 감각.", category: "programming/algorithms" },
  { id: "SICP", lens: "절차·데이터·메타언어로 쌓아 올리는 추상화의 고전.", category: "programming/algorithms" },

  // programming — code review
  { id: "Abseil Code Review", lens: "Google Abseil을 code review 시선으로 — std를 보완하는 도구의 설계 의도.", category: "programming/code-review" },
  { id: "Folly Code Review", lens: "Meta Folly를 code review 시선으로 — performance-first 철학과 fbcode의 산물.", category: "programming/code-review" },

  // programming — cpp
  { id: "A Tour of C++", lens: "Stroustrup가 직접 짚는 현대 C++ 핵심 기능 빠른 투어.", category: "programming/cpp" },
  { id: "Beautiful C++", lens: "플랫폼·컴파일러 종속을 피하고 이식성 있는 코드를 쓰는 법.", category: "programming/cpp" },
  { id: "C++ Software Design", lens: "아키텍처·디자인·구현 세 층위와 의존성 관리라는 본질.", category: "programming/cpp" },
  { id: "Effective C++", lens: "C++는 네 하위 언어의 연합 — 영역마다 효율의 규칙이 다르다.", category: "programming/cpp" },
  { id: "Effective Modern C++", lens: "템플릿 타입 추론 위에 선 modern C++ — auto·이동·람다를 규칙으로.", category: "programming/cpp" },
  { id: "전문가를 위한 C", lens: "포인터·메모리·표준 라이브러리까지 파고드는 심화 C.", category: "programming/cpp" },
  { id: "전문가를 위한 C++", lens: "언어 기능부터 대규모 설계까지 아우르는 실무 C++ 레퍼런스.", category: "programming/cpp" },

  // programming — design
  { id: "Clean Architecture", lens: "좋은 디자인의 유일한 지표 — 변경 비용이 일정하게 유지되는가.", category: "programming/design" },
  { id: "Domain-Driven Design", lens: "도메인 지식을 코드로 — 끊임없는 학습·모델링·정제.", category: "programming/design" },
  { id: "GoF Design Patterns", lens: "GoF가 어려운 이유와 그것을 풀 6개의 멘탈 모델·비유·결정 트리.", category: "programming/design" },
  { id: "Object-Oriented Analysis and Design with Applications", lens: "Booch — 객체지향 분석·설계(OOAD)의 고전.", category: "programming/design" },
  { id: "Object-Oriented Software Construction", lens: "Meyer — 정확성·견고성·확장성·재사용성으로 보는 SW 품질.", category: "programming/design" },
  { id: "Refactoring", lens: "한 예제를 워크스루로 — 리팩터링의 리듬과 감각.", category: "programming/design" },
  { id: "Refactoring Catalog (Fowler 2nd ed)", lens: "Extract Function부터 — Fowler 리팩터링 카탈로그 항목별.", category: "programming/design" },
  { id: "UML 2.5.1", lens: "OMG UML 2.5.1 명세 — 다이어그램 표기법 풀리뷰.", category: "programming/design" },

  // programming — engineering
  { id: "Agile & Lean Software Engineering", lens: "애자일·린 원칙을 소프트웨어 공학 전반으로 잇는 종합 시리즈.", category: "programming/engineering" },
  { id: "Clean Code", lens: "좋은 코드란 무엇인가 — 거장들의 답과 보이스카우트 규칙.", category: "programming/engineering" },
  { id: "Code Complete", lens: "코딩·디버깅을 중심으로 본 software construction의 자리와 중요성.", category: "programming/engineering" },
  { id: "Growing Object-Oriented Software", lens: "GOOS — 테스트로 키우는 객체지향 설계(mock 주도).", category: "programming/engineering" },
  { id: "Hackers and Painters", lens: "Graham — 해커·창업·언어에 관한 에세이.", category: "programming/engineering" },
  { id: "Khorikov Unit Testing", lens: "좋은 단위 테스트의 4대 속성과 리팩터링 내성.", category: "programming/engineering" },
  { id: "Peopleware", lens: "소프트웨어의 진짜 문제는 기술이 아니라 사람.", category: "programming/engineering" },
  { id: "Practical Test Engineering", lens: "실무 테스트 엔지니어링 관점의 전략·자동화.", category: "programming/engineering" },
  { id: "TDD by Example", lens: "곱셈 한 줄에서 red-green-refactor 한 사이클로 시작하는 TDD.", category: "programming/engineering" },
  { id: "TDD by Example — Patterns Deep Dive", lens: "자동화된 테스트를 원자로 — 두려움을 자신감으로 바꾸는 패턴.", category: "programming/engineering" },
  { id: "The Art of UNIX Programming", lens: "ESR — 모듈성·단순성 같은 UNIX 철학의 설계 원칙.", category: "programming/engineering" },
  { id: "The Mythical Man-Month", lens: "인월 신화 — 인력 추가가 오히려 지연을 늦추는 이유.", category: "programming/engineering" },
  { id: "The Pragmatic Programmer", lens: "잘하려는 마음이 없으면 어떤 도구도 쓸모없다 — 실용주의의 토대.", category: "programming/engineering" },
  { id: "Working Effectively with Legacy Code", lens: "Feathers — 테스트 없는 코드를 seam으로 길들이는 법.", category: "programming/engineering" },

  // programming — git / python / standards / testing
  { id: "Git Conventions", lens: "Conventional Commits 1.0 — type/scope/description/body/footer.", category: "programming/git" },
  { id: "Git Flow", lens: "전통 GitFlow — develop/feature/release/hotfix/main 구조.", category: "programming/git" },
  { id: "Pro Git", lens: "Git 역사·분산 VCS의 본질과 snapshot 모델 vs delta.", category: "programming/git" },
  { id: "Fluent Python", lens: "파이썬 데이터 모델 — 던더 메서드와 일관된 인터페이스.", category: "programming/python" },
  { id: "Google C++ Style", lens: "거대 코드베이스의 일관성을 위한 Google C++ 스타일 가이드.", category: "programming/standards" },
  { id: "Linux Kernel Coding Style", lens: "커널 소스의 관례 — 들여쓰기·명명·주석 규칙.", category: "programming/standards" },
  { id: "Python Style Guide (PEP 8)", lens: "PEP 8 — 파이썬 코드 레이아웃과 명명 관례.", category: "programming/standards" },
  { id: "gtest 심화", lens: "GoogleTest — fixture·매처·death test까지 C++ 테스트 심화.", category: "programming/testing" },
  { id: "pytest 심화", lens: "fixture·parametrize·plugin으로 보는 pytest 심화.", category: "programming/testing" },

  // systems
  { id: "APUE", lens: "POSIX 시스템 콜로 배우는 UNIX 시스템 프로그래밍 고전.", category: "systems" },
  { id: "A Primer on Memory Consistency and Cache Coherence", lens: "Consistency vs Coherence — 두 개념의 출발점과 차이.", category: "systems/architecture" },
  { id: "ARMv8-A Architecture Reference Manual", lens: "AArch64 실행 모델·예외 레벨·메모리 모델 스펙 리뷰.", category: "systems/arm" },
  { id: "Code: The Hidden Language", lens: "릴레이·논리 게이트에서 CPU까지, 첫 원리로 쌓는 컴퓨터.", category: "systems" },
  { id: "Computer Systems: A Programmer's Perspective", lens: "하드웨어를 아는 C 프로그래머 관점의 bottom-up 시스템 입문.", category: "systems" },
  { id: "Linux Device Drivers (LDD3)", lens: "문자·블록·PCI 드라이버를 예제로 익히는 Linux 디바이스 드라이버 고전.", category: "systems" },
  { id: "리눅스 커널의 구조와 원리", lens: "task_struct·CFS·buddy 등 Linux 커널 실제 구현 소스 리딩.", category: "systems" },
  { id: "Operating Systems: Three Easy Pieces", lens: "가상화·동시성·영속성 세 축으로 배우는 OS 설계 원리.", category: "systems" },
  { id: "RISC-V ISA 해부", lens: "RV32I/64I부터 특권 아키텍처까지 오픈 ISA 해부.", category: "systems/riscv" },
  { id: "RISC-V Vector Extension", lens: "RVV — 가변 길이 벡터 프로그래밍 모델.", category: "systems/riscv" },
  { id: "RISC-V 베어메탈 부트", lens: "OpenSBI에서 커널까지, RISC-V 베어메탈 부트 흐름.", category: "systems/riscv" },

  // tools — build
  { id: "CMake", lens: "왜 메타 빌드 시스템이 필요한가와 5줄짜리 첫 CMake 프로젝트.", category: "tools/build" },
  { id: "GNU Make", lens: "GNU Make의 역할·설치와 첫 Makefile 작성·실행.", category: "tools/build" },

  // tools — debugging
  { id: "Concurrency Debugging", lens: "경쟁 상태·데드락을 ThreadSanitizer로 잡는 법.", category: "tools/debugging" },
  { id: "Debugging: The 9 Indispensable Rules", lens: "Agans — 디버깅의 9가지 불변 규칙.", category: "tools/debugging" },
  { id: "DWARF and ELF Internals", lens: "ELF 헤더·Program/Section Header·dynamic linking·build-id.", category: "tools/debugging" },
  { id: "Embedded Debugging", lens: "JTAG·SWD·트레이스로 하는 임베디드 디버깅.", category: "tools/debugging" },
  { id: "GDB and LLDB", lens: "네이티브 디버거의 메커니즘과 gdb·lldb 차이·첫 세션.", category: "tools/debugging" },
  { id: "GDB Extension and IDE", lens: "GDB Python API — Value/Type/Frame/Symbol로 디버기 데이터 조작.", category: "tools/debugging" },
  { id: "Kernel Debugging", lens: "kgdb·crash·ftrace로 하는 리눅스 커널 디버깅.", category: "tools/debugging" },
  { id: "Memory Diagnostics", lens: "누수·오염을 잡는 메모리 진단 도구와 기법.", category: "tools/debugging" },
  { id: "Postmortem Debugging", lens: "코어 덤프에서 사후에 원인을 되짚는 법.", category: "tools/debugging" },
  { id: "Python Debugging", lens: "pdb·트레이스백으로 하는 파이썬 디버깅.", category: "tools/debugging" },
  { id: "Sanitizers", lens: "ASan·UBSan 등 C/C++ 런타임 검사 도구의 역할과 도입 순서.", category: "tools/debugging" },
  { id: "Valgrind", lens: "Sanitizer 시대에도 Valgrind가 살아남은 이유와 세 핵심 도구.", category: "tools/debugging" },

  // tools — emulation
  { id: "Driver-RTL Co-simulation", lens: "RTL과 드라이버를 함께 돌려 검증하는 co-simulation.", category: "tools/emulation" },
  { id: "FPGA Driver via QEMU+VFIO", lens: "QEMU+VFIO로 FPGA 디바이스 드라이버를 bring-up.", category: "tools/emulation" },
  { id: "QEMU Embedded Emulation", lens: "QEMU로 ARM/RISC-V 보드를 에뮬레이션해 펌웨어·OS를 테스트.", category: "tools/emulation" },
  { id: "QEMU Fake Device Driver", lens: "QEMU로 가상 디바이스를 만들어 드라이버를 테스트하는 워크플로우.", category: "tools/emulation" },
  { id: "QEMU Internals", lens: "TCG·KVM·디바이스 모델로 보는 QEMU 전체 아키텍처.", category: "tools/emulation" },
  { id: "RISC-V QEMU 심화", lens: "QEMU로 RISC-V 플랫폼을 모델링·디버깅하는 심화.", category: "tools/emulation" },

  // tools — 기타
  { id: "perf and FlameGraph", lens: "perf_event_open·PMU 카운터로 보는 Linux perf의 본질.", category: "tools" },
  { id: "Practical Vim", lens: "dot 명령과 반복으로 배우는 실전 Vim 편집술.", category: "tools" },
  { id: "System Tracing", lens: "ptrace·perf_event_open·eBPF 세 메커니즘과 비용 비교.", category: "tools" },
  { id: "Vim 마스터하기", lens: "Vim의 모드·기본 이동·시작과 종료.", category: "tools" },

  // writing
  { id: "Academic Writing for Graduate Students", lens: "독자·목적·전략에서 출발하는 학술 글쓰기.", category: "writing" },
  { id: "The Elements of Style", lens: "Strunk & White — 간결한 영문 작문의 고전 규칙집.", category: "writing" },
  { id: "고종석의 문장", lens: "문장의 정의와 본질에 대한 탐구.", category: "writing" },
  { id: "On Writing Well", lens: "글쓰기는 작가와 독자의 개인적 거래 — 진심이라는 공통점.", category: "writing" },
  { id: "The Only Grammar Book You'll Ever Need", lens: "여덟 가지 품사에서 시작하는 영어 문법.", category: "writing" },
  { id: "Science Research Writing", lens: "연구 논문 Introduction의 4-Move 표준 구조와 자기 template.", category: "writing" },
  { id: "Style: Lessons in Clarity and Grace", lens: "명확함과 우아함 — bad style은 의도가 아니라 부주의의 결과.", category: "writing" },
  { id: "우리글 바로쓰기", lens: "우리말로 생각하고 우리말로 쓰는 글쓰기의 기초.", category: "writing" },
];

export function getSeriesMetadata(id: string): Series | undefined {
  return SERIES.find((s) => s.id === id);
}
