export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  parent?: string;
}

export const CATEGORIES: Category[] = [
  // Top-level categories
  {
    id: 'programming',
    name: 'Programming',
    description: '프로그래밍 — C/C++, 디자인, 알고리즘, 소프트웨어 공학',
    icon: '💻',
  },
  {
    id: 'systems',
    name: 'Systems',
    description: 'OS / 커널 / 시스템 프로그래밍',
    icon: '⚙️',
  },
  {
    id: 'embedded',
    name: 'Embedded',
    description: '임베디드 — RTOS, MCU, 성능, 트러블슈팅',
    icon: '🔧',
  },
  {
    id: 'parallel',
    name: 'Parallel & Concurrency',
    description: '병렬 / 동시성 — 원리, 패턴, 성능',
    icon: '⚡',
  },
  {
    id: 'math',
    name: 'Mathematics',
    description: '수학 — 선형대수, 집합론, 문제 해결',
    icon: '📐',
  },
  {
    id: 'writing',
    name: 'Writing',
    description: '글쓰기 — 영문 / 한국어 / 학술',
    icon: '✍️',
  },
  {
    id: 'thinking',
    name: 'Thinking',
    description: '비판적 사고 / 인지심리',
    icon: '🧠',
  },
  {
    id: 'philosophy',
    name: 'Philosophy',
    description: '철학 — 과학철학 / 인식론 / 윤리 / 논리',
    icon: '🏛️',
  },
  {
    id: 'design',
    name: 'Design',
    description: '디자인 — UX / UI / 정보 디자인 / 사용자 경험',
    icon: '🎨',
  },
  {
    id: 'code-review',
    name: 'Code Review',
    description: '코드 리뷰 / 오픈소스 코드 읽기',
    icon: '👀',
  },
  {
    id: 'tools',
    name: 'Tools',
    description: '개발 도구 — Vim / tmux / CLI / 디버거 / 프로파일러',
    icon: '🛠️',
  },
  {
    id: 'media',
    name: 'Media & Codecs',
    description: '영상 / 오디오 코덱 — AV1, HEVC, H.264, 인코더 / 디코더 분석',
    icon: '🎞️',
  },
  {
    id: 'ml',
    name: 'Machine Learning Systems',
    description: 'ML 시스템 — NPU / 컴파일러 / 추론 / 디자인 패턴',
    icon: '🤖',
  },
  {
    id: 'science',
    name: 'Science',
    description: '자연과학 — 물리학 / 고전역학 / 과학사',
    icon: '🔭',
  },
  {
    id: 'security',
    name: 'Security & Cryptography',
    description: '보안 / 암호학 — 시스템 보안 / 웹 보안 / 암호화',
    icon: '🔐',
  },
  {
    id: 'devops',
    name: 'DevOps & Infrastructure',
    description: 'DevOps — 컨테이너 / CI-CD / IaC / 모니터링',
    icon: '🐳',
  },

  // Sub-categories of programming
  {
    id: 'programming/cpp',
    parent: 'programming',
    name: 'C / C++',
    description: 'C / C++ 언어 — Effective / Modern / Software Design',
    icon: '🔠',
  },
  {
    id: 'programming/design',
    parent: 'programming',
    name: 'Design & Patterns',
    description: '디자인 패턴 / 아키텍처 / 리팩토링',
    icon: '🧩',
  },
  {
    id: 'programming/algorithms',
    parent: 'programming',
    name: 'Algorithms',
    description: '자료구조 / 알고리즘',
    icon: '🔢',
  },
  {
    id: 'programming/engineering',
    parent: 'programming',
    name: 'Software Engineering',
    description: '소프트웨어 공학 — 클래식 / 실무 / 문화',
    icon: '🏗️',
  },
  {
    id: 'programming/git',
    parent: 'programming',
    name: 'Git',
    description: 'Git — Pro Git / 컨벤션 / 브랜치 전략',
    icon: '🌿',
  },
  {
    id: 'programming/python',
    parent: 'programming',
    name: 'Python',
    description: 'Python — Fluent Python / 모범 사례 / 라이브러리',
    icon: '🐍',
  },
  {
    id: 'programming/standards',
    parent: 'programming',
    name: 'Coding Standards',
    description: '범용 코딩 표준 — Google C++ / Linux Kernel / PEP 8',
    icon: '📐',
  },
  {
    id: 'programming/compilers',
    parent: 'programming',
    name: 'Compilers & Interpreters',
    description: '컴파일러 — 인터프리터 / 파서 / 코드 생성',
    icon: '⚙️',
  },
  {
    id: 'programming/databases',
    parent: 'programming',
    name: 'Databases',
    description: '데이터베이스 — SQL / NoSQL / 쿼리 최적화 / 인덱싱',
    icon: '🗄️',
  },
  {
    id: 'programming/fp',
    parent: 'programming',
    name: 'Functional Programming',
    description: '함수형 프로그래밍 — SICP / Haskell / Scala / 범주론',
    icon: 'λ',
  },
  {
    id: 'programming/testing',
    parent: 'programming',
    name: 'Testing',
    description: '테스팅 — TDD / 단위 테스트 / 통합 테스트 / 테스트 패턴',
    icon: '✅',
  },
  {
    id: 'programming/verification',
    parent: 'programming',
    name: 'Formal Verification',
    description: '형식 검증 — TLA+ / Coq / 모델 체킹 / 정형 기법',
    icon: '📝',
  },
  {
    id: 'programming/classics',
    parent: 'programming',
    name: 'Developer Classics',
    description: '개발자 필독서 — Pragmatic Programmer / Clean Code / Refactoring',
    icon: '📚',
  },
  {
    id: 'embedded/standards',
    parent: 'embedded',
    name: 'Coding Standards',
    description: '임베디드 코딩 표준 — MISRA / CERT / AUTOSAR / High Integrity',
    icon: '📜',
  },
  {
    id: 'embedded/hardware',
    parent: 'embedded',
    name: 'Hardware Interfaces',
    description: '하드웨어 인터페이스 — PCIe, NVMe, DDR 스펙과 드라이버',
    icon: '🔌',
  },
  {
    id: 'tools/debugging',
    parent: 'tools',
    name: 'Debugging & Diagnostics',
    description: '디버깅 / 진단 — sanitizer / valgrind / core dump / tracing',
    icon: '🐞',
  },

  // Sub-categories of media
  {
    id: 'media/av1',
    parent: 'media',
    name: 'AV1',
    description: 'AV1 코덱 — bitstream / intra / inter / transform / loop filter / encoder',
    icon: '📼',
  },

  // Sub-categories of systems
  {
    id: 'systems/linux-drivers',
    parent: 'systems',
    name: 'Linux Device Drivers',
    description: '리눅스 디바이스 드라이버 — 커널 모듈 / 문자·블록·네트워크 드라이버',
    icon: '🐧',
  },
  {
    id: 'systems/linux-kernel',
    parent: 'systems',
    name: 'Linux Kernel Internals',
    description: '리눅스 커널 내부 — 스케줄러 / 메모리 / 동기화 / 디버깅',
    icon: '🔬',
  },
  {
    id: 'systems/distributed',
    parent: 'systems',
    name: 'Distributed Systems',
    description: '분산 시스템 — 합의 / 복제 / 파티셔닝 / 대규모 설계',
    icon: '🌐',
  },
  {
    id: 'systems/sre',
    parent: 'systems',
    name: 'Site Reliability Engineering',
    description: 'SRE — 모니터링 / 온콜 / 용량 계획 / 장애 대응',
    icon: '🚨',
  },
  {
    id: 'systems/networking',
    parent: 'systems',
    name: 'Networking',
    description: '네트워킹 — TCP/IP / 소켓 / 프로토콜 / 웹 성능',
    icon: '🌐',
  },
  {
    id: 'systems/os',
    parent: 'systems',
    name: 'Operating Systems',
    description: '운영체제 — 프로세스 / 메모리 / 파일 시스템 / 가상화',
    icon: '💽',
  },
  {
    id: 'systems/architecture',
    parent: 'systems',
    name: 'Computer Architecture',
    description: '컴퓨터 아키텍처 — CPU / 캐시 / 파이프라인 / RISC-V',
    icon: '🖥️',
  },

  // Sub-categories of embedded
  {
    id: 'embedded/patterns',
    parent: 'embedded',
    name: 'Embedded Patterns',
    description: '임베디드 패턴 — 실시간 / 메모리 제약 / 안전 필수 시스템',
    icon: '🧱',
  },

  // Sub-categories of ml
  {
    id: 'ml/accelerators',
    parent: 'ml',
    name: 'ML Accelerators',
    description: 'ML 가속기 — NPU / TPU / Systolic Array / 메모리 계층',
    icon: '🔲',
  },
  {
    id: 'ml/compilers',
    parent: 'ml',
    name: 'ML Compilers',
    description: 'ML 컴파일러 — TVM / MLIR / 그래프 최적화 / 오토튜닝',
    icon: '🔄',
  },
  {
    id: 'ml/inference',
    parent: 'ml',
    name: 'Inference & Deployment',
    description: '추론과 배포 — ONNX / TensorRT / Core ML / 엣지 배포',
    icon: '🚀',
  },
  {
    id: 'ml/patterns',
    parent: 'ml',
    name: 'ML Design Patterns',
    description: 'ML 디자인 패턴 — 데이터 표현 / 학습 / 서빙 / MLOps',
    icon: '📊',
  },
  {
    id: 'ml/systems',
    parent: 'ml',
    name: 'ML Systems Design',
    description: '대규모 ML 시스템 설계 — 프로덕션 / 데이터 파이프라인 / MLOps',
    icon: '🏭',
  },

  // Sub-categories of philosophy
  {
    id: 'philosophy/math',
    parent: 'philosophy',
    name: 'Philosophy of Mathematics',
    description: '수리철학 — 플라톤주의 / 형식주의 / 직관주의 / 구조주의',
    icon: '∞',
  },

  // Sub-categories of science
  {
    id: 'science/classics',
    parent: 'science',
    name: 'Science Classics',
    description: '과학 고전 — Newton / Euclid / 고전역학 / 기하학 원론',
    icon: '📜',
  },

  // Sub-categories of math
  {
    id: 'math/applied',
    parent: 'math',
    name: 'Applied Mathematics',
    description: '실용 수학 — 이산수학 / 확률통계 / ML 수학',
    icon: '🧮',
  },
];

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((cat) => cat.id === id);
}

export function getTopLevelCategories(): Category[] {
  return CATEGORIES.filter((cat) => !cat.parent);
}

export function getSubCategories(parentId: string): Category[] {
  return CATEGORIES.filter((cat) => cat.parent === parentId);
}
