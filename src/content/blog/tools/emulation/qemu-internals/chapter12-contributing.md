---
title: "Ch 12: QEMU 기여하기"
date: 2026-05-17T12:00:00
description: "QEMU 프로젝트에 코드 기여하는 방법 — 코드 스타일, 패치 제출."
tags: [QEMU, Contributing, OpenSource]
series: "QEMU Internals"
seriesOrder: 12
draft: true
---

## QEMU 개발 워크플로우

1. 소스 클론
2. 브랜치 생성
3. 코드 작성
4. 테스트
5. 패치 생성
6. 메일링 리스트 제출
7. 리뷰 반영
8. 머지

---

## 코드 스타일

QEMU 코드 스타일:

```c
// 함수
static void my_function(int arg)
{
    if (condition) {
        // ...
    }
}

// 구조체
typedef struct MyStruct {
    int field;
} MyStruct;
```

검사:
```bash
scripts/checkpatch.pl --no-tree my.patch
```

---

## 패치 생성

```bash
git format-patch -1 --cover-letter
git send-email --to=qemu-devel@nongnu.org *.patch
```

---

## 테스트

```bash
make check
make check-qtest
```

---

## 정리

- QEMU는 메일링 리스트 기반으로 패치를 제출한다.
- checkpatch.pl로 코드 스타일을 검사한다.
- make check로 테스트를 실행한다.

---

## 시리즈 마무리

이 시리즈에서 배운 것:
- QEMU 전체 아키텍처 (TCG, KVM)
- QOM 타입 시스템
- 메모리 모델 (MemoryRegion, AddressSpace)
- 이벤트 루프와 Coroutine
- 블록/네트워크/PCI 서브시스템
- 인터럽트 컨트롤러
- 타이머와 마이그레이션
- 커스텀 머신 정의
- 오픈소스 기여 방법

---

## 관련 항목

- [Ch 11: 커스텀 머신 타입](/blog/tools/emulation/qemu-internals/chapter11-custom-machine)
- [QEMU Official Documentation](https://www.qemu.org/docs/master/)
- [QEMU Mailing List](https://lists.gnu.org/mailman/listinfo/qemu-devel)
