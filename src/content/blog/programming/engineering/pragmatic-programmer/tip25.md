---
title: "Tip 25: Keep Knowledge in Plain Text"
date: 2026-05-12T01:00:00
description: "지식을 평문으로 유지하라 — 바이너리 형식은 미래에 안 읽힌다."
series: "The Pragmatic Programmer"
seriesOrder: 25
tags: [pragmatic-programmer, tools]
draft: true
---

## 이 팁의 메시지

> **Tip 25: Keep Knowledge in Plain Text.** Plain text won't become obsolete. It helps leverage your work and simplifies debugging and testing.

지식은 평문(plain text)으로 저장해야 한다. 바이너리 형식은 도구에 종속되고, 그 도구가 사라지면 지식도 잃는다.

## 평문의 이점

평문은 여러 장점을 가진다.

- **영구성**: 10년, 20년 후에도 읽힌다. 특정 도구가 필요 없다.
- **도구 다양성**: `grep`, `awk`, `sed`, `git` 등 수많은 도구가 평문을 다룬다.
- **버전 관리**: diff와 merge가 의미 있게 동작한다.
- **사람이 읽는다**: 도구 없이 직접 열어서 읽고 쓸 수 있다.

## 바이너리의 함정

바이너리 형식은 위험하다.

- 특정 도구가 폐기되면 파일을 열 수 없다.
- 버전 간 호환성이 깨질 수 있다.
- 내용 검색이 어렵다.
- 부분 수정이 어렵다.

과거에 작성한 독점 형식의 문서를 열지 못한 경험이 있는가? 바이너리 형식의 위험이다.

## 적용 예시

지식을 담는 곳에 평문 형식을 선택한다.

| 종류 | 평문 형식 |
|------|----------|
| 설정 | JSON, YAML, TOML |
| 문서 | Markdown |
| 데이터 교환 | CSV, JSON |
| 빌드 | Makefile, Gradle |
| 인프라 | Terraform HCL |

## 예외: 모든 것이 평문은 아니다

평문이 적합하지 않은 곳도 있다.

- **이미지, 영상, 오디오**: 바이너리가 자연스럽다.
- **대용량 데이터베이스**: 효율을 위해 바이너리 저장을 쓴다.
- **컴파일된 코드**: 당연히 바이너리다.

핵심은 **지식**(설정, 문서, 메타데이터, 스키마)을 평문으로 유지하는 것이다. 미디어 데이터는 예외다.

## 정리

- 지식 = 평문. 10년 후에도 읽힌다.
- 도구 다양성, 버전 관리, 사람의 접근성.
- 바이너리는 도구에 종속된다.
- 미디어 데이터는 예외.

## 다음 장 예고

[Tip 26: Use the Power of Command Shells](/blog/programming/engineering/pragmatic-programmer/tip26)에서는 GUI보다 셸이 강력한 이유를 다룬다.

## 관련 항목

- [Tip 24: Iterate the Schedule with the Code](/blog/programming/engineering/pragmatic-programmer/tip24)
- [Tip 26: Use the Power of Command Shells](/blog/programming/engineering/pragmatic-programmer/tip26)
- [Tip 28: Always Use Version Control](/blog/programming/engineering/pragmatic-programmer/tip28)
