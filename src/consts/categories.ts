export interface Category {
  id: string;
  name: string;
  description: string;
  icon?: string;
  parent?: string;
}

export const CATEGORIES: Category[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // TOP-LEVEL CATEGORIES
  // ═══════════════════════════════════════════════════════════════════════════

  { id: 'programming', name: 'Programming', icon: '💻', description: '프로그래밍 — C/C++, 디자인 패턴, 알고리즘, 소프트웨어 공학' },
  { id: 'systems', name: 'Systems', icon: '⚙️', description: '시스템 — OS, 커널, 분산 시스템, 네트워킹' },
  { id: 'embedded', name: 'Embedded', icon: '🔧', description: '임베디드 — 하드웨어 인터페이스, RTOS, 프로토콜' },
  { id: 'parallel', name: 'Parallel & Concurrency', icon: '⚡', description: '병렬 / 동시성 — 원리, 패턴, 성능' },
  { id: 'ml', name: 'Machine Learning Systems', icon: '🤖', description: 'ML 시스템 — NPU, 컴파일러, 추론, 엣지 AI' },
  { id: 'media', name: 'Media & Codecs', icon: '🎬', description: '미디어 코덱 — AV1, HEVC, H.264' },
  { id: 'math', name: 'Mathematics', icon: '📐', description: '수학 — 선형대수, 집합론, 이산수학' },
  { id: 'writing', name: 'Writing', icon: '✍️', description: '글쓰기 — 영문, 한국어, 학술, 기술 문서' },
  { id: 'philosophy', name: 'Philosophy & Thinking', icon: '🧠', description: '철학 / 사고 — 과학철학, 비판적 사고, 인지심리' },
  { id: 'science', name: 'Science', icon: '🔭', description: '자연과학 — 물리학, 고전역학, 과학사' },
  { id: 'design', name: 'Design', icon: '🎨', description: '디자인 — UX, UI, 정보 디자인' },
  { id: 'tools', name: 'Tools', icon: '🛠️', description: '개발 도구 — Vim, 디버거, 프로파일러, 빌드' },
  { id: 'security', name: 'Security & Cryptography', icon: '🔐', description: '보안 / 암호학 — 시스템 보안, 웹 보안' },
  { id: 'devops', name: 'DevOps & Infrastructure', icon: '🐳', description: 'DevOps — 컨테이너, CI/CD, IaC' },

  // ═══════════════════════════════════════════════════════════════════════════
  // SUB-CATEGORIES
  // ═══════════════════════════════════════════════════════════════════════════

  // Programming
  { id: 'programming/cpp', parent: 'programming', name: 'C / C++', description: 'Effective, Modern, Software Design' },
  { id: 'programming/python', parent: 'programming', name: 'Python', description: 'Fluent Python, 모범 사례' },
  { id: 'programming/design', parent: 'programming', name: 'Design & Patterns', description: '디자인 패턴, 아키텍처, 리팩토링' },
  { id: 'programming/algorithms', parent: 'programming', name: 'Algorithms', description: '자료구조, 알고리즘' },
  { id: 'programming/engineering', parent: 'programming', name: 'Software Engineering', description: '요구사항, 테스팅, 레거시' },
  { id: 'programming/git', parent: 'programming', name: 'Git', description: 'Pro Git, 컨벤션, 브랜치 전략' },
  { id: 'programming/standards', parent: 'programming', name: 'Coding Standards', description: 'Google C++, Linux Kernel, PEP 8' },
  { id: 'programming/compilers', parent: 'programming', name: 'Compilers', description: '컴파일러, 인터프리터, 파서' },
  { id: 'programming/databases', parent: 'programming', name: 'Databases', description: 'SQL, NoSQL, 쿼리 최적화' },
  { id: 'programming/fp', parent: 'programming', name: 'Functional Programming', description: 'SICP, Haskell, 범주론' },
  { id: 'programming/testing', parent: 'programming', name: 'Testing', description: 'TDD, 단위/통합 테스트' },
  { id: 'programming/verification', parent: 'programming', name: 'Formal Verification', description: 'TLA+, Coq, 모델 체킹' },
  { id: 'programming/classics', parent: 'programming', name: 'Developer Classics', description: 'Pragmatic Programmer, Clean Code' },
  { id: 'programming/code-review', parent: 'programming', name: 'Code Review', description: '코드 리뷰, 오픈소스 읽기' },

  // Systems
  { id: 'systems/linux-kernel', parent: 'systems', name: 'Linux Kernel', description: '스케줄러, 메모리, 동기화' },
  { id: 'systems/linux-drivers', parent: 'systems', name: 'Linux Drivers', description: '문자, 블록, 네트워크 드라이버' },
  { id: 'systems/os', parent: 'systems', name: 'Operating Systems', description: '프로세스, 메모리, 파일 시스템' },
  { id: 'systems/distributed', parent: 'systems', name: 'Distributed Systems', description: '합의, 복제, 대규모 설계' },
  { id: 'systems/networking', parent: 'systems', name: 'Networking', description: 'TCP/IP, 소켓, 프로토콜' },
  { id: 'systems/architecture', parent: 'systems', name: 'Computer Architecture', description: 'CPU, 캐시, 파이프라인, RISC-V' },
  { id: 'systems/sre', parent: 'systems', name: 'SRE', description: '모니터링, 온콜, 장애 대응' },
  { id: 'systems/wireless', parent: 'systems', name: 'Wireless (Kernel)', description: 'mac80211/cfg80211, BlueZ, hostapd, wpa_supplicant, Linux Wi-Fi 드라이버' },

  // Embedded
  { id: 'embedded/hardware', parent: 'embedded', name: 'Hardware Interfaces', description: 'PCIe, NVMe, DDR, CXL, HBM, UCIe, UALink' },
  { id: 'embedded/protocols', parent: 'embedded', name: 'Protocols', description: 'SPI, UART, I2C, CAN, MIPI' },
  { id: 'embedded/standards', parent: 'embedded', name: 'Coding Standards', description: 'MISRA, CERT, AUTOSAR' },
  { id: 'embedded/patterns', parent: 'embedded', name: 'Patterns', description: '실시간, 메모리 제약' },
  { id: 'embedded/industrial', parent: 'embedded', name: 'Industrial', description: 'EtherCAT, PROFINET, TSN' },
  { id: 'embedded/yocto', parent: 'embedded', name: 'Yocto Project', description: 'BitBake, recipes, layers, 커스텀 배포판' },
  { id: 'embedded/wireless', parent: 'embedded', name: 'Wireless (Firmware)', description: 'BLE, Zigbee, Thread, Matter, LoRa, ESP32 Wi-Fi — RTOS/MCU 측' },
  { id: 'embedded/avionics', parent: 'embedded', name: 'Avionics & Aerospace SW', description: '발사체 에비오닉스 umbrella — 아키텍처·Flight SW·C&DH·SW Assurance·GNC·Simulation·Sensors·Systems Engineering' },

  // ML
  { id: 'ml/accelerators', parent: 'ml', name: 'Accelerators', description: 'NPU, TPU, Systolic Array' },
  { id: 'ml/compilers', parent: 'ml', name: 'Compilers', description: 'TVM, MLIR, 그래프 최적화' },
  { id: 'ml/inference', parent: 'ml', name: 'Inference', description: 'ONNX, TensorRT, Core ML' },
  { id: 'ml/tinyml', parent: 'ml', name: 'TinyML', description: 'TFLite Micro, CMSIS-NN' },
  { id: 'ml/systems', parent: 'ml', name: 'Systems', description: '프로덕션, MLOps' },
  { id: 'ml/drivers', parent: 'ml', name: 'Drivers', description: 'DRM, DMA-BUF, IOMMU' },

  // Tools
  { id: 'tools/debugging', parent: 'tools', name: 'Debugging', description: 'sanitizer, valgrind, tracing' },
  { id: 'tools/build', parent: 'tools', name: 'Build Systems', description: 'CMake, GNU Make, Bazel' },
  { id: 'tools/emulation', parent: 'tools', name: 'Emulation', description: 'QEMU, 가상 디바이스, 에뮬레이션' },

  // Others
  { id: 'math/applied', parent: 'math', name: 'Applied Math', description: '이산수학, 확률통계' },
  { id: 'philosophy/math', parent: 'philosophy', name: 'Philosophy of Math', description: '플라톤주의, 형식주의' },
  { id: 'science/classics', parent: 'science', name: 'Classics', description: 'Newton, Euclid' },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((cat) => cat.id === id);
}

export function getTopLevelCategories(): Category[] {
  return CATEGORIES.filter((cat) => !cat.parent);
}

export function getSubCategories(parentId: string): Category[] {
  return CATEGORIES.filter((cat) => cat.parent === parentId);
}
