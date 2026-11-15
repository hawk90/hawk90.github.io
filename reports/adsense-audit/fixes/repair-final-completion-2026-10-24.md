# 공개 406편 원고 수정 최종 확인 — 2026-10-24

Modern Embedded Recipes를 제외한 대상 406편 모두 현재 원문 SHA와 유효한 수정 기록이 일치한다. 일반 기록 400편과 외부 분석 도구 실행 대기 6편(Valgrind 5편·py-spy 1편)으로 구분한다. 기록이 없는 글과 malformed 기록은 0건이다. [전체 진행](../fix-progress.md) · [개별 검증 범위와 다음 질문](../fix-queue.md).

이는 원고 수정·검토 기록의 완료다. 모든 기술 주장, 지원 보드, 실제 성능, 보안 인증이나 장비 실행을 검증했다는 뜻은 아니다. 각 배치 보고서의 실행 범위와 NOT RUN 항목을 유지한다. 기존 평가 원장 44개는 작업 재개 시점의 SHA와 동일하며 점수·A–G·판정·factcheck 재평가는 수행하지 않았다. 커밋·push·배포는 수행하지 않았다.

## 최종 검사 로그

정본 `scripts/verify-release.mjs`의 검사 순서를 따랐다. 앞선 단계의 통과 후 실패 지점만 수정하고 나머지를 순차 실행했으므로, 최초 실패 로그를 지우거나 전체 명령이 한 번에 통과했다고 표현하지 않는다.

- [검사 1–9](repair-final-release-2026-10-24.log): 도구 계약, 실행 비트, 다이어그램 freshness, KaTeX, inline math, CI 정책, 배포 입력 경로, 저장소 무결성 통과. 의존성 검사는 최초 DNS 차단으로 중단.
- [의존성 실제 검사](repair-final-dependencies-2026-10-24.log): 네트워크 재시도 후 취약점 4건 발견. [패치](repair-final-dependency-fix-2026-10-24.log)와 [패치 후 보안 검사](repair-final-dependencies-after-2026-10-24.log)는 취약점 0건. `npm audit fix --ignore-scripts`를 사용하고 강제 major 갱신은 사용하지 않았다.
- [검사 10–24](repair-final-release-remainder-2026-10-24.log): 검색·분류·관계·내부 링크·경로·시리즈·발행 차단 gate 통과. 본문 outbound 링크 1건에서 연결성 검사가 중단되어 [RSP 후속 수정](repair-final-rsp-link-2026-10-24.md) 후 [연결성 0건](repair-final-connectivity-2026-10-24.log)을 확인.
- [검사 25–26](repair-final-release-artifact-2026-10-24.log): 학습 경로 coverage는 정본대로 report-only. 다이어그램의 깨진 참조 1건을 발견해 [SMP 그림 후속 수정](repair-final-smp-image-2026-10-24.md) 후 [참조 검사](repair-final-diagram-references-2026-10-24.log)에서 839개 참조, alt 누락 0건, broken 0건을 확인.
- [검사 27–42: 타입·빌드·생성물](repair-final-release-build-2026-10-24.log): 타입 오류·경고 0건, 1,135페이지 빌드 성공(87초), 문서 prologue·가독성·생성된 링크·앵커·검색·피드·URL 연속성·CSP·광고·관리 경계 검사 통과. Node heap 4 GiB로 실행했다. 마지막 secret scan은 아래 URL 오탐 수정 후 별도 재실행했다.
- [비밀정보 검사 회귀 검증](repair-final-secret-regression-2026-10-24.log) 및 [실제 전체 재검사](repair-final-secrets-after-2026-10-24.log): 6,753개 파일에서 0건. SK hynix 공식 인용 URL 두 개의 정확한 전체 문자열 안에서만 API 키 패턴을 예외 처리한다. 단독 토큰, 다른 호스트, query·suffix 변경 및 인접한 credential 형태는 예외 처리하지 않는다. [검사 도구 계약 재확인](repair-final-tooling-after-2026-10-24.log).
- [406편 SHA·고정 원장 확인](repair-final-invariants-2026-10-24.log), [수정 큐 재집계](repair-final-queue-2026-10-24.log).

## 마지막 보완 사항과 한계

의존성 패치는 `package-lock.json`에 반영했다. 주요 변경은 DOMPurify 3.4.16→3.4.17, undici 7.30.0→7.30.1 및 중첩 8.11.2→8.12.3, Vite 8.3.2→8.3.5, Zod 4.6.5→4.6.7이다. 관련 bundler 의존성도 함께 갱신됐다. `package.json`의 기존 변경은 유지했다.

최종 생성물 검사 수치는 1,136 HTML 문서, 1,572개 표, 3,787개 이미지, 134,874개 링크에서 가독성 위반 0건, 미해결 링크 0건, 앵커 70개 검사에서 오류 0건이다. Astro의 빌드 페이지 수와 검사기가 읽는 HTML 파일 수는 집계 기준이 달라 구분한다.

SPDM 글의 DSP0275는 올바른 MCTP binding 식별자였다. [DMTF Technical Note, January 2024, p. 4](https://www.dmtf.org/sites/default/files/standards/documents/DMTF_SPDM%20_Tech_Note_January_2024.pdf)로 역할을 확인하고 `data/known-facts.yaml`에 출처와 함께 추가했다. 함께 잘못 붙어 있던 DSP0276/0277의 설명 주석도 바로잡았다. [해당 글 whitelist 재검사](repair-final-known-facts-2026-10-24.log)는 통과했다.

전체 발행 gate의 산문·번역체·hallucination 휴리스틱은 후보 경고이며 기술 정확성 인증이 아니다. 정본의 기본 upstream clone 경로가 없어 일부 symbol 검사는 SKIPPED로 남는다. 별도 `/private/tmp`의 고정 Linux·ndctl·pciutils·Mbed TLS·OP-TEE·MCUboot 소스 및 실제 실행 범위는 해당 배치 기록에만 귀속되며 전체 자동 source 검사가 통과한 것으로 대신하지 않는다. 학습 경로 미배치 및 참조되지 않은 SVG는 report-only 항목으로 남긴다.
