---
title: "Tip 28: Always Use Version Control"
date: 2026-05-12T04:00:00
description: "항상 버전 관리를 써라 — 코드만이 아니라, 글·설정·문서까지."
series: "The Pragmatic Programmer"
seriesOrder: 28
tags: [pragmatic-programmer, tools]
draft: false
---

## 이 팁의 메시지

> **Tip 28: Always Use Version Control.** Version control is a time machine for your project—it lets you go back to the past and explore alternatives.

항상 버전 관리를 써야 한다. 코드만이 아니다. 설정, 문서, 빌드 스크립트, 인프라 정의까지 모든 텍스트 자산에 적용한다.

## 모든 것에 버전 관리를

버전 관리 대상은 코드만이 아니다.

- **코드**: 당연하다.
- **설정**: 환경 변수, 설정 파일 (시크릿 제외).
- **문서**: README, 설계 문서, API 문서.
- **빌드**: Makefile, CI 설정, Docker 파일.
- **인프라**: Terraform, Kubernetes YAML.
- **데이터 스키마**: 마이그레이션 파일.

이 모든 것이 프로젝트의 역사다. 버전 관리에 넣으면 시간 여행이 가능해진다.

## 버전 관리의 이점

버전 관리는 여러 문제를 해결한다.

- **시간 여행**: 어느 시점으로든 돌아갈 수 있다. 실수를 되돌린다.
- **누가, 왜, 언제**: `git blame`과 `git log`로 변경의 맥락을 이해한다.
- **분기(branch)**: 위험한 실험을 분기에서 안전하게 한다.
- **협업**: 여러 사람의 변경을 충돌 없이 합친다.

## 혼자 작업해도 필요하다

> "혼자 작업하니까 버전 관리는 필요 없어."

이건 함정이다. 미래의 자기 자신은 지금의 결정을 기억하지 못한다. "왜 이렇게 했지?"라는 질문에 커밋 메시지가 답을 준다. 버전 관리는 미래의 자신과의 협업 도구다.

## Git

여러 버전 관리 시스템이 있지만, Git이 사실상의 표준이다. GitHub, GitLab, Bitbucket 등의 호스팅 서비스와 함께 쓴다. 배울 가치가 있다.

## 정리

- 모든 텍스트 자산에 버전 관리를.
- 혼자 작업해도 필수다.
- 시간 여행, 맥락 추적, 분기, 협업.
- Git이 사실상의 표준.

## 다음 장 예고

[Tip 29: Fix the Problem, Not the Blame](/blog/programming/engineering/pragmatic-programmer/tip29)에서는 버그를 만났을 때 비난보다 해결에 집중해야 한다는 점을 다룬다.

## 관련 항목

- [Tip 25: Keep Knowledge in Plain Text](/blog/programming/engineering/pragmatic-programmer/tip25)
- [Tip 27: Achieve Editor Fluency](/blog/programming/engineering/pragmatic-programmer/tip27)
- [Tip 29: Fix the Problem, Not the Blame](/blog/programming/engineering/pragmatic-programmer/tip29)
