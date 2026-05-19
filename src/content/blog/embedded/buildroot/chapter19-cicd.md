---
title: "Ch 19: CI/CD — container build와 cache 공유"
date: 2026-05-19T19:00:00
description: "GitLab/GitHub Actions에서 Buildroot 트리를 컨테이너로 빌드하고 dl·ccache를 팀이 공유하는 패턴."
series: "Buildroot Practical"
seriesOrder: 19
tags: [embedded, buildroot, ci-cd, docker, gitlab]
draft: true
---

Outline:
- container base image — Ubuntu LTS + 빌드 의존성
- GitLab CI 예 — cache·artifacts
- GitHub Actions 예 — matrix·cache
- dl 캐시 공유 (s3·nfs·named volume)
- ccache 공유
- 산출물 (image·SDK·SBOM) 자동 배포
