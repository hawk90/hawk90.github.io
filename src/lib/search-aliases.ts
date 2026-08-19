/**
 * Editorial terminology registry.
 *
 * `canonical` is the spelling used in titles, headings, tags, and UI. When a
 * term is introduced to a new audience, write `firstMention` once — e.g.
 * "PCIe (Peripheral Component Interconnect Express)" — then use canonical.
 * `aliases` exist only for retrieval and must name the same concept.
 */
export interface SearchTermDefinition {
  canonical: string;
  expansion?: string;
  aliases: readonly string[];
}

export const SEARCH_TERMS: readonly SearchTermDefinition[] = [
  // Languages, operating systems, and core systems terms.
  { canonical: 'C++', aliases: ['cpp', 'c plus plus', 'cplusplus'] },
  { canonical: 'RISC-V', aliases: ['riscv'] },
  { canonical: 'RTOS', expansion: 'Real-Time Operating System', aliases: ['realtime operating system', '실시간 운영체제', '실시간 os'] },
  { canonical: 'PREEMPT_RT', aliases: ['preempt realtime'] },
  { canonical: 'Device Tree', aliases: ['devicetree', 'device tree blob', 'dtb', '디바이스 트리'] },
  { canonical: 'RAII', expansion: 'Resource Acquisition Is Initialization', aliases: [] },
  { canonical: 'ABI', expansion: 'Application Binary Interface', aliases: [] },
  { canonical: 'API', expansion: 'Application Programming Interface', aliases: [] },
  { canonical: 'IPC', expansion: 'Inter-Process Communication', aliases: ['프로세스 간 통신', '프로세스간 통신'] },
  { canonical: 'SMP', expansion: 'Symmetric Multiprocessing', aliases: [] },
  { canonical: 'NUMA', expansion: 'Non-Uniform Memory Access', aliases: [] },
  { canonical: 'ELF', expansion: 'Executable and Linkable Format', aliases: [] },
  { canonical: 'DWARF', expansion: 'Debugging With Attributed Record Formats', aliases: [] },

  // Interconnect, storage, and embedded interfaces.
  { canonical: 'PCIe', expansion: 'Peripheral Component Interconnect Express', aliases: ['pci express'] },
  { canonical: 'CXL', expansion: 'Compute Express Link', aliases: [] },
  { canonical: 'NVMe', expansion: 'Non-Volatile Memory Express', aliases: ['non volatile memory express'] },
  { canonical: 'DMA', expansion: 'Direct Memory Access', aliases: ['direct memory access'] },
  { canonical: 'IOMMU', expansion: 'Input-Output Memory Management Unit', aliases: ['io memory management unit'] },
  { canonical: 'DDR', expansion: 'Double Data Rate', aliases: ['double data rate'] },
  { canonical: 'UART', expansion: 'Universal Asynchronous Receiver-Transmitter', aliases: ['universal asynchronous receiver transmitter'] },
  { canonical: 'SPI', expansion: 'Serial Peripheral Interface', aliases: ['serial peripheral interface'] },
  { canonical: 'I²C', expansion: 'Inter-Integrated Circuit', aliases: ['i2c', 'inter integrated circuit'] },
  { canonical: 'U-Boot', aliases: ['uboot'] },
  { canonical: 'Wi-Fi', aliases: ['wifi'] },
  { canonical: 'BSP', expansion: 'Board Support Package', aliases: [] },
  { canonical: 'FPGA', expansion: 'Field-Programmable Gate Array', aliases: [] },
  { canonical: 'HBM', expansion: 'High Bandwidth Memory', aliases: [] },
  { canonical: 'UCIe', expansion: 'Universal Chiplet Interconnect Express', aliases: [] },
  { canonical: 'UALink', expansion: 'Ultra Accelerator Link', aliases: [] },
  { canonical: 'MMIO', expansion: 'Memory-Mapped Input/Output', aliases: [] },
  { canonical: 'MMU', expansion: 'Memory Management Unit', aliases: [] },
  { canonical: 'MPU', expansion: 'Memory Protection Unit', aliases: [] },
  { canonical: 'GPIO', expansion: 'General-Purpose Input/Output', aliases: [] },
  { canonical: 'ISR', expansion: 'Interrupt Service Routine', aliases: [] },
  { canonical: 'JTAG', expansion: 'Joint Test Action Group', aliases: [] },
  { canonical: 'AXI', expansion: 'Advanced eXtensible Interface', aliases: [] },
  { canonical: 'CAN', expansion: 'Controller Area Network', aliases: [] },
  { canonical: 'MIPI', expansion: 'Mobile Industry Processor Interface', aliases: [] },
  { canonical: 'BLE', expansion: 'Bluetooth Low Energy', aliases: [] },

  // Engineering methods and ML terminology.
  { canonical: 'TDD', expansion: 'Test-Driven Development', aliases: ['test driven development'] },
  { canonical: 'BDD', expansion: 'Behavior-Driven Development', aliases: ['behavior driven development'] },
  { canonical: 'DDD', expansion: 'Domain-Driven Design', aliases: ['domain driven design'] },
  { canonical: 'OOP', expansion: 'Object-Oriented Programming', aliases: ['object oriented programming', '객체지향', '객체 지향', '객체 지향 프로그래밍'] },
  { canonical: 'CI', expansion: 'Continuous Integration', aliases: ['continuous integration'] },
  { canonical: 'CD', expansion: 'Continuous Delivery', aliases: ['continuous delivery'] },
  { canonical: 'ML', expansion: 'Machine Learning', aliases: ['machine learning'] },
  { canonical: 'NPU', expansion: 'Neural Processing Unit', aliases: ['neural processing unit'] },
  { canonical: 'TPU', expansion: 'Tensor Processing Unit', aliases: ['tensor processing unit'] },
  { canonical: 'MLIR', expansion: 'Multi-Level Intermediate Representation', aliases: [] },
  { canonical: 'XLA', expansion: 'Accelerated Linear Algebra', aliases: [] },
  { canonical: 'ONNX', expansion: 'Open Neural Network Exchange', aliases: [] },
  { canonical: 'SIMD', expansion: 'Single Instruction, Multiple Data', aliases: [] },
  { canonical: 'HPC', expansion: 'High-Performance Computing', aliases: [] },
  { canonical: 'eBPF', expansion: 'extended Berkeley Packet Filter', aliases: ['ebpf'] },
  { canonical: 'TLA+', expansion: 'Temporal Logic of Actions', aliases: [] },
  { canonical: 'UML', expansion: 'Unified Modeling Language', aliases: [] },
  { canonical: 'GoF', expansion: 'Gang of Four', aliases: ['gang of four'] },
  { canonical: 'SOLID', aliases: [] },
  { canonical: 'GDB', expansion: 'GNU Debugger', aliases: [] },
  { canonical: 'LLDB', expansion: 'LLVM Debugger', aliases: [] },
  { canonical: 'ASan', expansion: 'AddressSanitizer', aliases: ['asan'] },
  { canonical: 'TSan', expansion: 'ThreadSanitizer', aliases: ['tsan'] },
  { canonical: 'UBSan', expansion: 'UndefinedBehaviorSanitizer', aliases: ['ubsan'] },
  { canonical: 'CI/CD', expansion: 'Continuous Integration and Continuous Delivery', aliases: ['ci cd'] },
  { canonical: 'AUTOSAR', expansion: 'Automotive Open System Architecture', aliases: [] },
  { canonical: 'DO-178C', expansion: 'Software Considerations in Airborne Systems and Equipment Certification', aliases: [] },
  { canonical: 'MISRA C', aliases: ['misra'] },

  // Video codec names have established, interchangeable standards names.
  // Concepts whose posts are titled in English while a Korean reader reaches
  // for the Korean name. Measured against the built index before adding: each
  // of these returned results in one language and nothing in the other.
  { canonical: 'Cache Coherence', aliases: ['캐시 일관성', 'cache 일관성', '캐시 코히런스'] },
  { canonical: 'Memory Model', aliases: ['메모리 모델'] },
  { canonical: 'Memory Consistency', aliases: ['메모리 일관성'] },
  { canonical: 'Deadlock', aliases: ['교착', '교착 상태', '데드락'] },
  { canonical: 'Context Switch', aliases: ['문맥 교환', '컨텍스트 스위치'] },
  { canonical: 'Atomic', aliases: ['원자적', '원자성'] },
  { canonical: 'Lock', aliases: ['잠금'] },
  { canonical: 'H.264', expansion: 'Advanced Video Coding', aliases: ['h264', 'avc'] },
  { canonical: 'H.265', expansion: 'High Efficiency Video Coding', aliases: ['h265', 'hevc'] },
  { canonical: 'AV1', aliases: ['aomedia video 1'] },
];

/** Normalize text consistently for both index fields and user queries. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s_.\-/]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Formats the approved first-use spelling for UI copy and editorial tools. */
export function formatFirstMention(term: SearchTermDefinition): string {
  return term.expansion ? `${term.canonical} (${term.expansion})` : term.canonical;
}

/** Returns a query plus same-concept aliases without changing their priority. */
export function expandSearchTerms(query: string): readonly string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];

  const terms = new Set([normalized]);
  for (const term of SEARCH_TERMS) {
    const variants = [term.canonical, term.expansion, ...term.aliases]
      .filter((variant): variant is string => Boolean(variant))
      .map(normalizeSearchText);
    if (variants.includes(normalized)) variants.forEach((variant) => terms.add(variant));
  }
  return [...terms];
}
