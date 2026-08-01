---
title: "Ticket S1-04. Topic Registry 생성"
source_message: 53
source_role: assistant
---

# Ticket S1-04. Topic Registry 생성

## 목적

글마다 자유 문자열로 Topic을 작성해 표기가 분열되는 것을 막는다.

## 초기 Topic

```ts
export const TOPICS = {
  cpp: {
    id: "cpp",
    title: "C++",
    href: "/topics/cpp/",
  },

  linuxSystems: {
    id: "linux-systems",
    title: "Linux & Systems",
    href: "/topics/linux-systems/",
  },

  firmwareBootloader: {
    id: "firmware-bootloader",
    title: "Firmware & Bootloader",
    href: "/topics/firmware-bootloader/",
  },

  gpuCuda: {
    id: "gpu-cuda",
    title: "GPU & CUDA",
    href: "/topics/gpu-cuda/",
  },

  pcieCxl: {
    id: "pcie-cxl",
    title: "PCIe & CXL",
    href: "/topics/pcie-cxl/",
  },
} as const;
```

## FPGA 처리

초기에는 별도 최상위 Topic으로 바로 만들지 않아도 된다.

다음 문서 분포를 먼저 본다.

```text
FPGA architecture
FPGA firmware
PCIe FPGA device
Vitis/XRT
영상 코덱 가속기
```

FPGA가 독립된 학습 경로를 충분히 가진다면 후속 Topic으로 분리한다.

## Registry 원칙

```text
ID는 안정적인 영문 slug
표시 제목은 별도
URL도 registry에서 관리
글 front matter에는 ID만 사용
```

## 완료 조건

```text
[ ] 초기 Topic 5개
[ ] ID·표시명·URL 분리
[ ] 잘못된 Topic ID validation 가능
[ ] Topic 이름을 글마다 직접 입력하지 않음
```

## 예상 작업량

```text
1~2시간
```

---
