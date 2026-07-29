// 학습경로(러닝패스) — 책/출처 축으로 조직된 시리즈 위에 얹는 "주제 축" 인덱스.
//
// 블로그의 콘텐츠는 책·출처별 시리즈(CSAPP, OSTEP, Petzold…)로 나뉘어 있다.
// 하나의 주제(예: 인터럽트)는 여러 시리즈에 고도(altitude)를 달리해 흩어져 있다.
// 이 파일은 그 흩어진 시리즈를 하나의 이야기 순서로 꿰어, "무엇을 어떤 순서로
// 읽으면 되는가"를 보여 주는 큐레이션 레이어다. 콘텐츠를 재배치하지 않는다.
//
// 노드는 개별 글이 아니라 *시리즈*를 가리킨다(유지보수성). 페이지가 빌드 시
// 각 시리즈의 발행/초안 상태를 계산해 링크·"준비 중"·"예정"으로 분류한다.

export interface PathNode {
  /** 시리즈 id — src/consts/series.ts / frontmatter `series:` 값과 정확히 일치. 없으면 순수 '예정' gap 노드. */
  series?: string;
  /** gap 노드 라벨(또는 series 노드의 표시 override). */
  label?: string;
  /** '— GIC로 전달' 식 짧은 주석. */
  note?: string;
  /** gap 노드가 향할 집(카테고리/서브카테고리 경로). 예: 'systems/arm'. */
  home?: string;
}

export interface PathPart {
  title: string;
  intro?: string;
  nodes: PathNode[];
}

export interface LearningPath {
  id: string;
  name: string;
  description: string;
  /** 상단 안내 문단. */
  intro?: string;
  parts: PathPart[];
}

export const LEARNING_PATHS: LearningPath[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. 컴퓨터는 어떻게 동작하는가 — 전기에서 AI 가속기까지 (플래그십)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'computer-from-scratch',
    name: '컴퓨터는 어떻게 동작하는가',
    description: '전기 → 논리 → CPU → 캐시 → 메모리 → 인터럽트 → 커널 → 드라이버 → PCIe → FPGA → AI 가속기를 하나의 이야기로.',
    intro:
      '보통 책은 "CPU까지" 또는 "리눅스까지"에서 멈춘다. 이 경로는 트랜지스터에서 시작해 AI 가속기까지, 같은 주제를 여러 시리즈의 서로 다른 고도(프로그래머 관점 → 설계 원리 → 실제 구현)로 이어서 읽게 배치했다. 각 단계마다 "내가 이 기능을 설계한다면?"을 함께 물으면 암기가 아니라 원리가 남는다.',
    parts: [
      {
        title: '0부. 논리 기초 — 전기에서 CPU까지',
        intro: '릴레이·논리 게이트·플립플롭에서 아주 작은 CPU가 만들어지기까지, 첫 원리부터.',
        nodes: [{ series: 'Code: The Hidden Language' }],
      },
      {
        title: '1–2부. CPU와 ISA — 명령어는 어떻게 실행되나',
        intro: 'ISA라는 계약 위에서 fetch·decode·execute, 파이프라인·해저드·분기예측이 어떻게 돌아가는지.',
        nodes: [
          { series: "Computer Systems: A Programmer's Perspective", note: '프로그래머 관점 bottom-up' },
          { series: 'RISC-V ISA 해부', note: '오픈 ISA로 보는 명령어 인코딩·특권 모드' },
          { series: 'Embedded Performance Engineering', note: '파이프라인·IPC·분기예측 실측' },
          { series: 'ARMv8-A Architecture Reference Manual', note: 'ARM 레인 — AArch64 ISA' },
        ],
      },
      {
        title: '3부. 캐시와 메모리 계층 — 왜 느려지고, 왜 캐시가 있나',
        intro: 'Register→L1→L2→L3→DRAM의 지연 사다리, 그리고 멀티코어에서의 일관성.',
        nodes: [
          { series: "Computer Systems: A Programmer's Perspective", note: '캐시 친화적 코드' },
          { series: 'A Primer on Memory Consistency and Cache Coherence', note: '멀티코어 MESI·메모리 모델' },
          { series: 'DDR Memory Deep Dive' },
          { series: 'HBM·GDDR 심화', note: '가속기 대역폭 벽' },
          { series: 'Embedded Performance Engineering', note: '캐시·대역폭 프로파일링' },
          { label: '단일코어 캐시 replacement policy·TLB 아키텍처 (교육용 정리)', home: 'systems/architecture' },
        ],
      },
      {
        title: '4부. 인터럽트 — 하드웨어가 CPU를 가로채는 법',
        intro: 'CPU→Interrupt→ISR→Scheduler→Task wakeup. 그리고 ARM GIC·MSI-X까지 연결.',
        nodes: [
          { series: 'Operating Systems: Three Easy Pieces', note: '설계 원리' },
          { series: '리눅스 커널의 구조와 원리', note: 'softirq·tasklet·workqueue 실제 구현' },
          { series: 'Linux Device Drivers (LDD3)', note: '드라이버 관점 인터럽트 처리' },
          { series: 'RISC-V ISA 해부', note: 'ISA 레벨 예외·인터럽트' },
          { series: 'Practical RTOS Internals', note: 'ISR·컨텍스트 스위치' },
          { label: 'ARM GIC / MSI-X 전달 경로', home: 'systems/arm', note: 'ARM 레인' },
        ],
      },
      {
        title: '5부. 부트 — 전원 ON에서 셸까지',
        intro: 'ROM→Bootloader→Kernel→init→systemd→login. "왜 BIOS가, 왜 U-Boot가 필요한가."',
        nodes: [
          { series: 'Bootloader Internals', note: 'U-Boot·TF-A·PSCI·Device Tree' },
          { series: 'RISC-V 베어메탈 부트', note: 'OpenSBI 부트 흐름' },
          { series: '리눅스 커널의 구조와 원리', note: '커널 부트·init' },
          { series: 'BSP Development', note: 'Device Tree·보드 초기화' },
        ],
      },
      {
        title: '6부. 프로세스 — CPU는 프로세스를 모른다',
        intro: 'CPU는 PC·SP·Register만 안다. 커널이 task_struct·컨텍스트 스위치로 "프로세스"를 만든다.',
        nodes: [
          { series: 'Operating Systems: Three Easy Pieces' },
          { series: '리눅스 커널의 구조와 원리', note: 'task_struct·fork/exec' },
          { series: 'APUE', note: 'POSIX 프로세스 제어' },
        ],
      },
      {
        title: '7부. 가상 메모리 — MMU와 페이지 테이블',
        intro: 'MMU·Page Table·TLB·CoW·Demand Paging·Huge Page. 세 고도로 겹쳐 읽기.',
        nodes: [
          { series: 'Operating Systems: Three Easy Pieces', note: '페이징 설계 원리' },
          { series: "Computer Systems: A Programmer's Perspective", note: '주소 변환 기초' },
          { series: '리눅스 커널의 구조와 원리', note: 'zone·buddy·slab·swap 구현' },
          { series: 'RISC-V ISA 해부', note: 'Sv39/48·RVWMO' },
        ],
      },
      {
        title: '8부. 시스템콜 — 유저에서 하드웨어까지',
        intro: 'printf/malloc/read/write/fork가 libc→syscall→커널→드라이버→하드웨어로 내려가는 경로.',
        nodes: [
          { series: 'APUE', note: '시스템콜 인터페이스' },
          { series: '리눅스 커널의 구조와 원리', note: 'syscall 진입·VFS·io_uring' },
        ],
      },
      {
        title: '9부. 드라이버와 PCIe — Enumeration에서 DMA까지',
        intro: 'PCIe Enumeration→BAR Mapping→DMA→Interrupt. UIO·VFIO·IOMMU가 왜 필요한가.',
        nodes: [
          { series: 'Linux Device Drivers (LDD3)', note: '드라이버 뼈대' },
          { series: 'PCIe Deep Dive', note: 'TLP·링크 트레이닝·enumeration' },
          { series: 'NVMe Deep Dive', note: '큐 기반 스토리지 인터페이스' },
          { series: 'NPU 드라이버 개발', note: 'IOMMU·DMA-BUF·command queue' },
          { series: 'CXL 4.0 Internals', note: 'coherent interconnect' },
          { series: 'UCIe 심화', note: '칩렛 인터커넥트' },
          { series: 'BoW 개요' },
        ],
      },
      {
        title: '10부. 스케줄러 — CFS·RT·IRQ',
        intro: 'CFS·priority·RT·SoftIRQ·workqueue·bottom half. "여러 프로그램을 동시에 돌리려면?"',
        nodes: [
          { series: 'Operating Systems: Three Easy Pieces', note: '스케줄링 정책' },
          { series: '리눅스 커널의 구조와 원리', note: 'CFS/RT/Deadline 구현' },
          { series: 'Practical RTOS Internals', note: '실시간 스케줄링·우선순위 역전' },
        ],
      },
      {
        title: '11부. 파일 시스템 — inode에서 NVMe까지',
        intro: 'VFS·inode·ext4·page cache·block I/O.',
        nodes: [
          { series: '리눅스 커널의 구조와 원리', note: 'VFS·ext4·block I/O' },
          { series: 'Operating Systems: Three Easy Pieces', note: 'FS 설계·저널링' },
        ],
      },
      {
        title: '12부. 네트워크 — Ethernet에서 epoll까지',
        intro: 'Ethernet→MAC→IP→TCP→Socket→epoll→Application.',
        nodes: [
          { series: 'APUE', note: '소켓 시스템 프로그래밍' },
          { series: 'Distributed Systems', note: '통신·이름·일관성' },
          { series: 'Designing Data-Intensive Applications', note: '대규모 데이터 흐름' },
          { label: 'Ethernet→TCP→epoll 커널 네트워크 스택', home: 'systems/networking' },
        ],
      },
      {
        title: '13부. 현대 컴퓨터 — FPGA·가속기·가상화',
        intro: 'FPGA·CUDA·NPU·eBPF·io_uring·VFIO. 하나의 이야기가 AI 가속기에서 닫힌다.',
        nodes: [
          { series: 'The Zynq Book', note: 'FPGA/SoC — PS+PL' },
          { series: 'FPGA Driver via QEMU+VFIO', note: 'VFIO로 FPGA bring-up' },
          { series: 'Driver-RTL Co-simulation', note: 'RTL↔드라이버 공동 검증' },
          { series: 'NPU 아키텍처', note: '시스톨릭 어레이·데이터플로우' },
          { series: 'NPU 드라이버 개발' },
          { series: 'ML 컴파일러', note: '가속기 코드젠' },
          { series: 'Apple Metal Stack', note: 'GPU compute 커널' },
          { series: 'TinyML·Edge AI', note: 'MCU/엣지 추론' },
          { label: 'CUDA 메모리 계층·warp 실행·cuBLAS/cuDNN', home: 'ml' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. ARM 세계관 (골격) — x86으로 세운 개념을 실제 SoC로 확장
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'arm-worldview',
    name: 'ARM 세계관',
    description: 'x86으로 개념을 세우고 ARM으로 "실제 SoC는 이렇게 한다"를 붙인다. EL·AMBA·GIC·SMMU·TF-A.',
    intro:
      '컴퓨터 경로가 x86 위주로 개념을 세웠다면, 이 경로는 같은 주제를 ARM SoC의 관점으로 다시 본다. 특히 부트(Device Tree vs ACPI)와 인터커넥트(AMBA/AXI)에서 x86과 크게 갈린다. FPGA/Zynq 경험이 그대로 이어지는 지점이다.',
    parts: [
      {
        title: 'ISA와 특권 레벨',
        nodes: [
          { series: 'ARMv8-A Architecture Reference Manual', note: 'AArch64 ISA' },
          { label: 'EL0–EL3 · TrustZone · 가상화 확장(EL2)', home: 'systems/arm' },
        ],
      },
      {
        title: '인터커넥트와 IOMMU',
        nodes: [
          { label: 'AMBA — AXI/ACE/CHI, CCI/CMN', home: 'systems/arm', note: 'FPGA에서 익숙한 AXI' },
          { label: 'SMMU (ARM IOMMU)', home: 'systems/arm' },
          { label: 'GIC — 인터럽트 컨트롤러', home: 'systems/arm' },
        ],
      },
      {
        title: '메모리 모델과 컨텍스트 스위치',
        nodes: [
          { label: 'weak memory model · dmb/dsb/isb · LL/SC', home: 'systems/arm' },
          { series: 'Practical RTOS Internals', note: 'ARM Cortex 컨텍스트 스위치' },
        ],
      },
      {
        title: '부트 — Device Tree 세계',
        nodes: [
          { series: 'Bootloader Internals', note: 'TF-A(BL1/BL2/BL31)·PSCI' },
          { series: 'BSP Development', note: 'Device Tree·보드 bring-up' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. ML 가속기 스택 (골격) — HW에서 엣지 추론까지 레이어로
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ml-accelerator-stack',
    name: 'ML 가속기 스택',
    description: '하드웨어 → 드라이버 → 컴파일러 → 런타임 → 인프라 → 엣지. 가속기를 레이어로 훑는다.',
    parts: [
      { title: '하드웨어', nodes: [{ series: 'NPU 아키텍처' }, { series: 'HBM·GDDR 심화', note: '대역폭' }] },
      { title: '드라이버', nodes: [{ series: 'NPU 드라이버 개발', note: 'IOMMU·DMA-BUF' }] },
      {
        title: '컴파일러 · 코드젠',
        nodes: [
          { series: 'ML 컴파일러' },
          { series: 'MLIR 심화' },
          { series: 'XLA·OpenXLA 심화' },
          { series: 'Triton DSL' },
          { series: 'Apple Metal Stack' },
        ],
      },
      {
        title: '런타임 · 추론',
        nodes: [
          { series: 'Core ML 심화' },
          { series: 'ONNX Runtime 심화' },
          { series: 'TensorRT 심화' },
        ],
      },
      {
        title: '인프라 · 엣지',
        nodes: [
          { series: 'Designing Machine Learning Systems' },
          { series: 'ML 시스템 프로파일링' },
          { series: 'TinyML·Edge AI' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. 동시성 모델 (골격) — 렌즈 순으로 정렬한 7권
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'concurrency-models',
    name: '동시성 모델',
    description: '"왜 동시성인가" 입문 → 이론 → 메모리 모델 → 패턴 → 패러다임 비교. 렌즈가 겹치지 않게 정렬.',
    intro:
      '동시성 시리즈가 여럿이라 겹쳐 보이지만, 각 책의 렌즈는 다르다. 이 순서로 읽으면 중복 없이 저수준(메모리 모델)부터 고수준(패러다임 비교)까지 오른다.',
    parts: [
      {
        title: '왜 동시성인가 (입문)',
        nodes: [
          { series: 'The Art of Concurrency', note: '멀티코어 성능' },
          { series: 'Introduction to Parallel Computing', note: 'HPC 플랫폼' },
          { series: 'C++ Concurrency in Action', note: 'C++ 언어 API' },
        ],
      },
      {
        title: '이론과 메모리 모델',
        nodes: [
          { series: 'The Art of Multiprocessor Programming', note: '공유메모리 동기화 이론' },
          { series: 'A Primer on Memory Consistency and Cache Coherence', note: '하드웨어 메모리 모델' },
        ],
      },
      {
        title: '패턴',
        nodes: [
          { series: 'Patterns for Parallel Programming' },
          { series: 'Structured Parallel Programming' },
        ],
      },
      {
        title: '패러다임 비교',
        nodes: [{ series: 'Seven Concurrency Models in Seven Weeks' }],
      },
    ],
  },
];

export function getLearningPath(id: string): LearningPath | undefined {
  return LEARNING_PATHS.find((p) => p.id === id);
}
