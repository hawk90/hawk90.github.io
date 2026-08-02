# Original guidance traceability audit

- Source: [archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/original-guidance.md](archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/original-guidance.md)
- Guidance sections: 437
- Sections with canonical AP links: 167
- Anti-pattern candidates pending canonical action (all reviewed): 34
- Guidance-only sections (do not force an AP ID): 236
- Candidate priority: P0 1, P1 7, P2 26
- P0 review decision: [p0-review.md](p0-review.md)
- P1 review decisions: [p1-review.md](p1-review.md)
- P2 review decisions: [p2-review.md](p2-review.md)
- Consolidated decisions: [decision-index.md](decision-index.md)

> This is a routing report, not a semantic equivalence claim. Unlinked guidance must be reviewed before assigning or merging anti-pattern IDs.

## Linked guidance

| Guidance | Original IDs | Canonical IDs | Source |
| --- | --- | --- | --- |
| SEC-30. Default Broad Workflow Permissions | SEC-30 | AP-SEC-30 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:17936; message: 48 (assistant); path: D. GitHub Actions 공급망 > SEC-30. Default Broad Workflow Permissions |
| Task 2-10. Content Governance & Editorial Workflow Anti-patterns | G-01, G-02, G-03, G-04, G-05, G-06, G-07, G-08, G-09, G-10 | AP-G-01, AP-G-01-2, AP-G-02, AP-G-02-2, AP-G-03, AP-G-03-2, AP-G-04, AP-G-04-2, AP-G-05, AP-G-05-2, AP-G-06, AP-G-06-2, AP-G-07, AP-G-07-2, AP-G-08, AP-G-08-2, AP-G-09, AP-G-09-2, AP-G-10, AP-G-10-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:20752; message: 52 (assistant); path: Task 2-10. Content Governance & Editorial Workflow Anti-patterns |
| 출처와 검증 | G-11, G-12, G-13, G-14, G-15, G-16, G-17, G-18 | AP-G-11, AP-G-11-2, AP-G-12, AP-G-12-2, AP-G-13, AP-G-13-2, AP-G-14, AP-G-14-2, AP-G-15, AP-G-15-2, AP-G-16, AP-G-16-2, AP-G-17, AP-G-17-2, AP-G-18, AP-G-18-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:20998; message: 52 (assistant); path: 출처와 검증 |
| 권장 경계 | G-80 | AP-G-80 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:22113; message: 52 (assistant); path: AI 활용 > G-80. No AI Usage Boundary > 권장 경계 |
| 관계 모델 | K-11, K-12, K-13, K-14, K-15, K-16, K-17, K-18, K-19, K-20 | AP-K-11, AP-K-12, AP-K-13, AP-K-14, AP-K-15, AP-K-16, AP-K-17, AP-K-18, AP-K-19, AP-K-20 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24515; message: 56 (assistant); path: 관계 모델 |
| 자동화와 AI 추천 | K-61, K-62, K-63, K-64, K-65, K-66, K-67, K-68, K-69, K-70, K-71, K-72 | AP-K-61, AP-K-62, AP-K-63, AP-K-64, AP-K-65, AP-K-66, AP-K-67, AP-K-68, AP-K-69, AP-K-70, AP-K-71, AP-K-72 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25248; message: 56 (assistant); path: 자동화와 AI 추천 |
| Task 2-15. Anti-pattern Detection, Prioritization & Remediation Anti-patterns | D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10 | AP-D-01, AP-D-01-2, AP-D-02, AP-D-02-2, AP-D-03, AP-D-03-2, AP-D-04, AP-D-04-2, AP-D-05, AP-D-05-2, AP-D-06, AP-D-06-2, AP-D-07, AP-D-07-2, AP-D-08, AP-D-08-2, AP-D-09, AP-D-09-2, AP-D-10, AP-D-10-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:28967; message: 62 (assistant); path: Task 2-15. Anti-pattern Detection, Prioritization & Remediation Anti-patterns |
| 개선 후 검증 | D-71, D-72, D-73, D-74, D-75, D-76, D-77, D-78, D-79, D-80 | AP-D-71, AP-D-72, AP-D-73, AP-D-74, AP-D-75, AP-D-76, AP-D-77, AP-D-78, AP-D-79, AP-D-80 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:30296; message: 62 (assistant); path: 개선 후 검증 |
| 권장 title 예시 | A-08 | AP-A-08, AP-A-08-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:31492; message: 64 (assistant); path: A-08. 홈 SEO metadata 정비 > 권장 title 예시 |
| 자동화 가능 범위 | C-11 | AP-C-11, AP-C-11-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:33325; message: 68 (assistant); path: C-11. 가설을 사실로 바꾸는 자동 문체 수정 금지 > 자동화 가능 범위 |
| C-21. 대표 글 리뷰 체크리스트 | C-21 | AP-C-21, AP-C-21-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:33653; message: 68 (assistant); path: C-21. 대표 글 리뷰 체크리스트 |
| C-22. 자동 검사와 사람 검토의 경계 | C-22 | AP-C-22, AP-C-22-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:33695; message: 68 (assistant); path: C-22. 자동 검사와 사람 검토의 경계 |
| 자동 검사 가능 범위 | D-14 | AP-D-14, AP-D-14-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34525; message: 70 (assistant); path: D-14. 내부 링크 anchor 개선 > 자동 검사 가능 범위 |
| G-03. Workflow별 권한 전수 조사 | G-03 | AP-G-03, AP-G-03-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:38302; message: 77 (assistant); path: GitHub Actions 권한 > G-03. Workflow별 권한 전수 조사 |
| 실행 환경 없음 | C-34 | AP-C-34 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:9913; message: 34 (assistant); path: Task 2-2. Content Architecture Anti-patterns > C-34. Environment Omission > 실행 환경 없음 |
| 테마가 JavaScript 실행 후 적용되어 화면이 번쩍임 | P-43 | AP-P-43 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:12276; message: 38 (assistant); path: JavaScript and Rendering > P-43. Runtime Theme Initialization Flash > 테마가 JavaScript 실행 후 적용되어 화면이 번쩍임 |
| 실행 환경에 따라 한글·영문 정렬 순서가 달라짐 | P-77 | AP-P-77 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:12718; message: 38 (assistant); path: Build Reliability > P-77. Locale-Dependent Sorting > 실행 환경에 따라 한글·영문 정렬 순서가 달라짐 |
| 페이지 전환·제목 morph·smooth scroll을 항상 실행 | U-81 | AP-U-81 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:15571; message: 43 (assistant); path: 접근성 > U-81. Reduced Motion Ignored > 페이지 전환·제목 morph·smooth scroll을 항상 실행 |
| migration 실행 즉시 파일 수정 | M-13 | AP-M-13 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:16192; message: 45 (assistant); path: Migration > M-13. Migration Without Dry Run > migration 실행 즉시 파일 수정 |
| 같은 migration을 두 번 실행하면 결과가 달라짐 | M-14 | AP-M-14 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:16214; message: 45 (assistant); path: Migration > M-14. Migration Without Idempotency > 같은 migration을 두 번 실행하면 결과가 달라짐 |
| 작성자만 실행 방법을 앎 | M-21 | AP-M-21 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:16324; message: 45 (assistant); path: Scripts and Tooling > M-21. Script as Undocumented Tribal Knowledge > 작성자만 실행 방법을 앎 |
| 로컬에서는 전체 검증을 실행하기 어려움 | M-31 | AP-M-31 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:16489; message: 45 (assistant); path: CI/CD > M-31. CI as the Only Reproducible Environment > 로컬에서는 전체 검증을 실행하기 어려움 |
| fork PR 코드를 privileged context에서 checkout·실행 | SEC-36 | AP-SEC-36 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18045; message: 48 (assistant); path: D. GitHub Actions 공급망 > SEC-36. Unsafe `pull_request_target` > fork PR 코드를 privileged context에서 checkout·실행 |
| package의 `preinstall`·`postinstall` 실행을 무조건 허용 | SEC-47 | AP-SEC-47 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18244; message: 48 (assistant); path: E. npm과 Dependency Supply Chain > SEC-47. Install Script Trust > package의 `preinstall`·`postinstall` 실행을 무조건 허용 |
| SEC-61. Editor Can Modify Workflow Files | SEC-61 | AP-SEC-61 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18438; message: 48 (assistant); path: F. OAuth와 관리자 편집기 > SEC-61. Editor Can Modify Workflow Files |
| 가끔 실패해도 재실행으로 해결 | O-79 | AP-O-79 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:20369; message: 50 (assistant); path: 빌드와 운영 관측 > O-79. CI Success Rate Ignored > 가끔 실패해도 재실행으로 해결 |
| T-12. Unit Test Internal Implementation | T-12 | AP-T-12 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26121; message: 58 (assistant); path: Hello > T-12. Unit Test Internal Implementation |
| 내부 함수 호출 순서까지 검증 | T-12 | AP-T-12 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26123; message: 58 (assistant); path: Hello > T-12. Unit Test Internal Implementation > 내부 함수 호출 순서까지 검증 |
| lint와 unit test만 실행 | T-17 | AP-T-17 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26192; message: 58 (assistant); path: 통합 테스트 > T-17. Production Build Never Tested in CI > lint와 unit test만 실행 |
| 그래프만 남고 raw result·환경·실행 script가 없음 | R-66 | AP-R-66 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:28384; message: 60 (assistant); path: 장기 기술 정확성 > R-66. Benchmark Without Preservation Data > 그래프만 남고 raw result·환경·실행 script가 없음 |
| 점수가 높은 항목은 무조건 실행 | D-43 | AP-D-43 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:29886; message: 62 (assistant); path: 점수화 > D-43. Score Determines Decision Automatically > 점수가 높은 항목은 무조건 실행 |
| 자동화부터 만들고 규칙은 나중에 정함 | D-61 | AP-D-61 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:30174; message: 62 (assistant); path: 구현 과정 > D-61. Tool Before Policy > 자동화부터 만들고 규칙은 나중에 정함 |
| 같은 개선 스크립트를 재실행하면 계속 변경 | D-65 | AP-D-65 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:30234; message: 62 (assistant); path: 구현 과정 > D-65. No Idempotency > 같은 개선 스크립트를 재실행하면 계속 변경 |
| 권장 흐름 | D-09 | AP-D-09, AP-D-09-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34343; message: 70 (assistant); path: D-09. 검색 인덱스 지연 로딩 > 권장 흐름 |
| D-16. 관련 글 추천 재설계 | D-16 | AP-D-16, AP-D-16-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34576; message: 70 (assistant); path: D-16. 관련 글 추천 재설계 |
| 추천 신호 순서 | D-16 | AP-D-16, AP-D-16-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34580; message: 70 (assistant); path: D-16. 관련 글 추천 재설계 > 추천 신호 순서 |
| 모든 품질 검사가 배포를 차단 | P-04 | AP-P-04 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:11660; message: 38 (assistant); path: Task 2-4. Performance & Build Anti-patterns > P-04. Every Audit Is a Release Blocker > 모든 품질 검사가 배포를 차단 |
| 실제 전체 블로그로만 스크립트 검증 | M-24 | AP-M-24 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:16374; message: 45 (assistant); path: Scripts and Tooling > M-24. No Fixture Tests for Content Tools > 실제 전체 블로그로만 스크립트 검증 |
| 문장만 수정하고 환경 검증일도 최신으로 변경 | M-77 | AP-M-77 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:17124; message: 45 (assistant); path: Content Operations > M-77. Update Without Revalidation > 문장만 수정하고 환경 검증일도 최신으로 변경 |
| M-80. No Content Retirement Workflow | M-80 | AP-M-80 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:17167; message: 45 (assistant); path: Content Operations > M-80. No Content Retirement Workflow |
| integrity hash는 있지만 교차 출처 검증 설정이 잘못됨 | SEC-14 | AP-SEC-14 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:17652; message: 48 (assistant); path: B. 외부 JavaScript > SEC-14. SRI Without `crossorigin` > integrity hash는 있지만 교차 출처 검증 설정이 잘못됨 |
| 링크의 `href`를 검증하지 않음 | SEC-23 | AP-SEC-23 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:17805; message: 48 (assistant); path: C. XSS와 콘텐츠 렌더링 > SEC-23. Unsafe URL Scheme > 링크의 `href`를 검증하지 않음 |
| SEC-35. Pull Request Workflow with Secrets | SEC-35 | AP-SEC-35 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18029; message: 48 (assistant); path: D. GitHub Actions 공급망 > SEC-35. Pull Request Workflow with Secrets |
| OAuth 요청과 callback의 연결을 검증하지 않음 | SEC-57 | AP-SEC-57 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18384; message: 48 (assistant); path: F. OAuth와 관리자 편집기 > SEC-57. Missing OAuth `state` > OAuth 요청과 callback의 연결을 검증하지 않음 |
| custom domain 변경 후 인증서·리다이렉트·canonical 미검증 | SEC-79 | AP-SEC-79 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18677; message: 48 (assistant); path: H. 도메인·HTTPS·배포 > SEC-79. DNS Change Without Verification > custom domain 변경 후 인증서·리다이렉트·canonical 미검증 |
| CSP·redirect·admin 제한을 설정했지만 실제 검증 없음 | SEC-99 | AP-SEC-99 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18995; message: 48 (assistant); path: J. 보안 운영 > SEC-99. Security Controls Without Tests > CSP·redirect·admin 제한을 설정했지만 실제 검증 없음 |
| O-18. URL Inspection as a Workflow | O-18 | AP-O-18 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:19480; message: 50 (assistant); path: Search Console > O-18. URL Inspection as a Workflow |
| 참고 링크를 넣었으니 검증됐다고 생각 | G-12 | AP-G-12, AP-G-12-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:21032; message: 52 (assistant); path: 출처와 검증 > G-12. Citation as Decoration > 참고 링크를 넣었으니 검증됐다고 생각 |
| 직접 검증할 작업 | G-80 | AP-G-80 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:22126; message: 52 (assistant); path: AI 활용 > G-80. No AI Usage Boundary > 권장 경계 > 직접 검증할 작업 |
| 언어만 자연스럽게 다듬고 기술 용어 검증은 없음 | L-29 | AP-L-29 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:23146; message: 54 (assistant); path: 번역 콘텐츠 > L-29. Translation Without Technical Review > 언어만 자연스럽게 다듬고 기술 용어 검증은 없음 |
| 추천 품질을 체감으로만 판단 | K-85 | AP-K-85 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25585; message: 56 (assistant); path: 품질과 평가 > K-85. Auto Recommendation Without Evaluation Set > 추천 품질을 체감으로만 판단 |
| Markdown은 사람이 읽는 문서이므로 자동 검증이 필요 없다고 생각 | T-04 | AP-T-04 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25975; message: 58 (assistant); path: Task 2-13. Testing, Validation & Quality Assurance Anti-patterns > T-04. Content Is Not Code > Markdown은 사람이 읽는 문서이므로 자동 검증이 필요 없다고 생각 |
| custom remark·rehype plugin을 실제 Markdown 예제로 검증하지 않음 | T-08 | AP-T-08 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26051; message: 58 (assistant); path: 단위 테스트 > T-08. No Parser Fixture > custom remark·rehype plugin을 실제 Markdown 예제로 검증하지 않음 |
| Markdown부터 최종 HTML까지 한 번도 전체 검증하지 않음 | T-16 | AP-T-16 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26173; message: 58 (assistant); path: 통합 테스트 > T-16. No End-to-End Content Pipeline Test > Markdown부터 최종 HTML까지 한 번도 전체 검증하지 않음 |
| 검색 결과 없음, Topic 글 없음, 관련 글 없음 상태를 검증하지 않음 | T-22 | AP-T-22 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26278; message: 58 (assistant); path: 통합 테스트 > T-22. No Empty-State Test > 검색 결과 없음, Topic 글 없음, 관련 글 없음 상태를 검증하지 않음 |
| 링크 검증 | T-26, T-27, T-28, T-29, T-30, T-31, T-32, T-33, T-34, T-35 | AP-T-26, AP-T-27, AP-T-28, AP-T-29, AP-T-30, AP-T-31, AP-T-32, AP-T-33, AP-T-34, AP-T-35 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26320; message: 58 (assistant); path: 링크 검증 |
| 마우스로만 검증 | T-58 | AP-T-58 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26752; message: 58 (assistant); path: 접근성 테스트 > T-58. No Keyboard Test > 마우스로만 검증 |
| 메타데이터와 그래프 검증 | T-76, T-77, T-78, T-79, T-80, T-81, T-82, T-83, T-84, T-85 | AP-T-76, AP-T-77, AP-T-78, AP-T-79, AP-T-80, AP-T-81, AP-T-82, AP-T-83, AP-T-84, AP-T-85 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26991; message: 58 (assistant); path: 메타데이터와 그래프 검증 |
| 생성 자산 검증 | T-86, T-87, T-88, T-89, T-90, T-91, T-92, T-93, T-94 | AP-T-86, AP-T-87, AP-T-88, AP-T-89, AP-T-90, AP-T-91, AP-T-92, AP-T-93, AP-T-94 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:27109; message: 58 (assistant); path: 생성 자산 검증 |
| D-50. Risk Acceptance Without Reason | D-50 | AP-D-50 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:29992; message: 62 (assistant); path: 점수화 > D-50. Risk Acceptance Without Reason |
| D-54. Refactor Without Acceptance Criteria | D-54 | AP-D-54 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:30053; message: 62 (assistant); path: 개선 계획 > D-54. Refactor Without Acceptance Criteria |
| D-55. Acceptance Criteria as Implementation Detail | D-55 | AP-D-55 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:30070; message: 62 (assistant); path: 개선 계획 > D-55. Acceptance Criteria as Implementation Detail |
| D-56. No Negative Acceptance Criteria | D-56 | AP-D-56 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:30087; message: 62 (assistant); path: 개선 계획 > D-56. No Negative Acceptance Criteria |
| 권장 구성 | A-07 | AP-A-07, AP-A-07-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:31442; message: 64 (assistant); path: A-07. 홈의 사이트 신뢰 신호 추가 > 권장 구성 |
| 권장 정책 | C-02 | AP-C-02, AP-C-02-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:32852; message: 68 (assistant); path: C-02. 상태별 노출 정책 정의 > 권장 정책 |
| 권장 운영 | C-04 | AP-C-04, AP-C-04-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:32982; message: 68 (assistant); path: C-04. `updated`와 `lastVerified` 분리 > 권장 운영 |
| 2차: 강하지만 검증이 필요한 글 5개 | C-20 | AP-C-20, AP-C-20-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:33625; message: 68 (assistant); path: C-20. 대표 글 보완 순서 > 2차: 강하지만 검증이 필요한 글 5개 |
| D-22. 내부 링크 검증 | D-22 | AP-D-22, AP-D-22-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34756; message: 70 (assistant); path: D-22. 내부 링크 검증 |
| P-14. Unknown Language Fallback to Heavy Parser | P-14 | AP-P-14 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:11869; message: 38 (assistant); path: Syntax Highlighting > P-14. Unknown Language Fallback to Heavy Parser |
| P-48. No JavaScript Failure Fallback | P-48 | AP-P-48 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:12338; message: 38 (assistant); path: JavaScript and Rendering > P-48. No JavaScript Failure Fallback |
| M-35. CI Workflow Logic Duplication | M-35 | AP-M-35 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:16548; message: 45 (assistant); path: CI/CD > M-35. CI Workflow Logic Duplication |
| 여러 workflow에 install·build·cache 설정 반복 | M-35 | AP-M-35 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:16550; message: 45 (assistant); path: CI/CD > M-35. CI Workflow Logic Duplication > 여러 workflow에 install·build·cache 설정 반복 |
| AI나 자동화가 만든 Markdown은 안전하다고 가정 | SEC-22 | AP-SEC-22 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:17791; message: 48 (assistant); path: C. XSS와 콘텐츠 렌더링 > SEC-22. Trusting Generated Content > AI나 자동화가 만든 Markdown은 안전하다고 가정 |
| README가 편리해 보여 바로 workflow에 추가 | SEC-29 | AP-SEC-29 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:17918; message: 48 (assistant); path: D. GitHub Actions 공급망 > SEC-29. Arbitrary Third-Party Action > README가 편리해 보여 바로 workflow에 추가 |
| workflow 전체에 secret을 환경변수로 설정 | SEC-32 | AP-SEC-32 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:17979; message: 48 (assistant); path: D. GitHub Actions 공급망 > SEC-32. Secrets Available to Every Step > workflow 전체에 secret을 환경변수로 설정 |
| 외부 PR 콘텐츠를 secret이 있는 workflow에서 처리 | SEC-35 | AP-SEC-35 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18031; message: 48 (assistant); path: D. GitHub Actions 공급망 > SEC-35. Pull Request Workflow with Secrets > 외부 PR 콘텐츠를 secret이 있는 workflow에서 처리 |
| 임의 branch나 workflow_dispatch 입력으로 운영 배포 | SEC-40 | AP-SEC-40 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18114; message: 48 (assistant); path: D. GitHub Actions 공급망 > SEC-40. Deployment From Unreviewed Commit > 임의 branch나 workflow_dispatch 입력으로 운영 배포 |
| 콘텐츠 편집 token이 `.github/workflows`까지 수정 가능 | SEC-61 | AP-SEC-61 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18440; message: 48 (assistant); path: F. OAuth와 관리자 편집기 > SEC-61. Editor Can Modify Workflow Files > 콘텐츠 편집 token이 `.github/workflows`까지 수정 가능 |
| 어떤 workflow와 dependency로 배포됐는지 모름 | SEC-97 | AP-SEC-97 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:18971; message: 48 (assistant); path: J. 보안 운영 > SEC-97. No Deployment Provenance > 어떤 workflow와 dependency로 배포됐는지 모름 |
| 본인 방문과 자동화 트래픽이 성과에 포함 | O-90 | AP-O-90 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:20511; message: 50 (assistant); path: 개인정보와 데이터 품질 > O-90. Author Traffic Pollution > 본인 방문과 자동화 트래픽이 성과에 포함 |
| 자동화가 metadata·링크를 예상보다 많이 변경 | G-47 | AP-G-47 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:21643; message: 52 (assistant); path: 발행 > G-47. Publish Without Content Diff > 자동화가 metadata·링크를 예상보다 많이 변경 |
| L-81. Separate Translation Workflow Without Sync | L-81 | AP-L-81 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:23947; message: 54 (assistant); path: 다국어 사이트 운영 > L-81. Separate Translation Workflow Without Sync |
| L-85. Missing Translation Fallback | L-85 | AP-L-85 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:23995; message: 54 (assistant); path: 다국어 사이트 운영 > L-85. Missing Translation Fallback |
| 공통 태그 수만으로 관련 글 추천 | K-01 | AP-K-01 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24297; message: 56 (assistant); path: Task 2-12. Content Discoverability, Recommendation & Knowledge Graph Anti-patterns > K-01. Related Posts by Tag Count > 공통 태그 수만으로 관련 글 추천 |
| K-89. Recommendation System Without Failure Fallback | K-89 | AP-K-89 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25631; message: 56 (assistant); path: 품질과 평가 > K-89. Recommendation System Without Failure Fallback |
| 원본 Markdown과 컴포넌트만 검사하고 최종 배포물을 보지 않음 | T-25 | AP-T-25 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26308; message: 58 (assistant); path: 통합 테스트 > T-25. Test Against Source, Not Dist > 원본 Markdown과 컴포넌트만 검사하고 최종 배포물을 보지 않음 |
| CI 환경에 따라 fallback font가 달라짐 | T-53 | AP-T-53 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26686; message: 58 (assistant); path: 시각 회귀 테스트 > T-53. Font Not Pinned > CI 환경에 따라 fallback font가 달라짐 |
| T-90. Missing Font Fallback in Generator | T-90 | AP-T-90 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:27159; message: 58 (assistant); path: 생성 자산 검증 > T-90. Missing Font Fallback in Generator |
| T-99. Workflow Permission Not Tested | T-99 | AP-T-99 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:27267; message: 58 (assistant); path: 보안 테스트 > T-99. Workflow Permission Not Tested |
| R-33. Custom Directive Without Fallback | R-33 | AP-R-33 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:27933; message: 60 (assistant); path: 포맷 이식성 > R-33. Custom Directive Without Fallback |
| 자동화가 수천 줄 formatting 변경까지 만듦 | D-68 | AP-D-68 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:30264; message: 62 (assistant); path: 구현 과정 > D-68. Generated Diff Overload > 자동화가 수천 줄 formatting 변경까지 만듦 |
| 추천 작업 상태 | A-01 | AP-A-01, AP-A-01-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:30756; message: 62 (assistant); path: 추천 작업 상태 |
| 권장 구조 | A-02 | AP-A-02, AP-A-02-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:31011; message: 64 (assistant); path: A-02. 홈 Hero 문구 재정의 > 권장 구조 |
| 권장 Topic | A-04 | AP-A-04, AP-A-04-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:31162; message: 64 (assistant); path: A-04. Core Topics 영역 추가 > 권장 Topic |
| 권장 description 예시 | A-08 | AP-A-08, AP-A-08-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:31506; message: 64 (assistant); path: A-08. 홈 SEO metadata 정비 > 권장 description 예시 |
| 권장 callout | C-10 | AP-C-10, AP-C-10-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:33280; message: 68 (assistant); path: C-10. 근거·관찰·추론 구분 > 권장 callout |
| 권장 표기 | C-14 | AP-C-14, AP-C-14-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:33437; message: 68 (assistant); path: C-14. 사양 기반 글에 revision 추가 > 권장 표기 |
| 자동화할 것 | C-22 | AP-C-22, AP-C-22-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:33697; message: 68 (assistant); path: C-22. 자동 검사와 사람 검토의 경계 > 자동화할 것 |
| 자동화하지 않을 것 | C-22 | AP-C-22, AP-C-22-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:33710; message: 68 (assistant); path: C-22. 자동 검사와 사람 검토의 경계 > 자동화하지 않을 것 |
| 권장 정보 | D-08 | AP-D-08, AP-D-08-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34302; message: 70 (assistant); path: D-08. 검색 결과 UI 재설계 > 권장 정보 |
| D-10. 검색 실패 fallback | D-10 | AP-D-10, AP-D-10-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34375; message: 70 (assistant); path: D-10. 검색 실패 fallback |
| fallback | D-10 | AP-D-10, AP-D-10-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34379; message: 70 (assistant); path: D-10. 검색 실패 fallback > fallback |
| fallback | D-16 | AP-D-16, AP-D-16-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34601; message: 70 (assistant); path: D-16. 관련 글 추천 재설계 > fallback |
| 권장 구조 | G-01 | AP-G-01, AP-G-01-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:38191; message: 77 (assistant); path: Epic G. 보안·개인정보·공급망 정비 > G-01. 공개 사이트와 관리자 기능 경계 확정 > 권장 구조 |
| 기본 권장 | G-03 | AP-G-03, AP-G-03-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:38317; message: 77 (assistant); path: GitHub Actions 권한 > G-03. Workflow별 권한 전수 조사 > 기본 권장 |
| 배포 후 검사 | G-28 | AP-G-28, AP-G-28-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39385; message: 77 (assistant); path: 민감 정보 노출 > G-28. 민감 파일 Artifact Allowlist > 배포 후 검사 |
| 태그 겹침만으로 관련 글 추천 | I-28 | AP-I-28 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:10911; message: 36 (assistant); path: Task 2-3. Information Architecture & Navigation Anti-patterns > I-28. Related Posts by Shared Tag Only > 태그 겹침만으로 관련 글 추천 |
| 임의 추천 | I-29 | AP-I-29 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:10934; message: 36 (assistant); path: Task 2-3. Information Architecture & Navigation Anti-patterns > I-29. Random Related Posts > 임의 추천 |
| 같은 글들만 서로 순환 추천 | I-30 | AP-I-30 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:10948; message: 36 (assistant); path: Task 2-3. Information Architecture & Navigation Anti-patterns > I-30. Circular Recommendation Trap > 같은 글들만 서로 순환 추천 |
| 실제 검색 결과에서 제목·설명이 어떻게 보일지 확인하지 않음 | G-44 | AP-G-44 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:21605; message: 52 (assistant); path: 발행 > G-44. Publish Without Search Preview Review > 실제 검색 결과에서 제목·설명이 어떻게 보일지 확인하지 않음 |
| 글을 쓰기 위해 에디터·추천 시스템부터 개발 | G-88 | AP-G-88 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:22259; message: 52 (assistant); path: 운영 우선순위 > G-88. Tooling Work Disguised as Editorial Work > 글을 쓰기 위해 에디터·추천 시스템부터 개발 |
| 왜 추천하는지 설명하지 않음 | K-03 | AP-K-03 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24358; message: 56 (assistant); path: Task 2-12. Content Discoverability, Recommendation & Knowledge Graph Anti-patterns > K-03. Recommendation Without Purpose > 왜 추천하는지 설명하지 않음 |
| 조회수 높은 글만 추천 | K-05 | AP-K-05 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24406; message: 56 (assistant); path: Task 2-12. Content Discoverability, Recommendation & Knowledge Graph Anti-patterns > K-05. Popularity Bias > 조회수 높은 글만 추천 |
| 최신 글을 관련 글보다 우선 추천 | K-06 | AP-K-06 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24420; message: 56 (assistant); path: Task 2-12. Content Discoverability, Recommendation & Knowledge Graph Anti-patterns > K-06. Recency Bias > 최신 글을 관련 글보다 우선 추천 |
| 클릭률 높은 추천을 계속 강화 | K-07 | AP-K-07 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24434; message: 56 (assistant); path: Task 2-12. Content Discoverability, Recommendation & Knowledge Graph Anti-patterns > K-07. Engagement Optimization > 클릭률 높은 추천을 계속 강화 |
| 특정 Topic 안에서만 추천이 순환 | K-08 | AP-K-08 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24456; message: 56 (assistant); path: Task 2-12. Content Discoverability, Recommendation & Knowledge Graph Anti-patterns > K-08. Recommendation Echo Chamber > 특정 Topic 안에서만 추천이 순환 |
| 다양성을 위해 임의 글을 추천 | K-09 | AP-K-09 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24481; message: 56 (assistant); path: Task 2-12. Content Discoverability, Recommendation & Knowledge Graph Anti-patterns > K-09. Random Exploration Slot > 다양성을 위해 임의 글을 추천 |
| 글 하단에 추천 글 10~20개 | K-10 | AP-K-10 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24495; message: 56 (assistant); path: Task 2-12. Content Discoverability, Recommendation & Knowledge Graph Anti-patterns > K-10. Too Many Recommendations > 글 하단에 추천 글 10~20개 |
| AI가 추천한 관련 글을 자동 게시 | K-61 | AP-K-61 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25252; message: 56 (assistant); path: 자동화와 AI 추천 > K-61. AI Recommendation as Truth > AI가 추천한 관련 글을 자동 게시 |
| 제목과 description만 보고 관계 추천 | K-62 | AP-K-62 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25266; message: 56 (assistant); path: 자동화와 AI 추천 > K-62. LLM Reads Only Titles > 제목과 description만 보고 관계 추천 |
| 클릭이 많은 추천을 강화하면서 같은 글만 반복 노출 | K-69 | AP-K-69 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25364; message: 56 (assistant); path: 자동화와 AI 추천 > K-69. Recommendation Feedback Loop > 클릭이 많은 추천을 강화하면서 같은 글만 반복 노출 |
| 새 글은 클릭 데이터가 없어 추천되지 않음 | K-70 | AP-K-70 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25374; message: 56 (assistant); path: 자동화와 AI 추천 > K-70. Cold-Start Neglect > 새 글은 클릭 데이터가 없어 추천되지 않음 |
| 임베딩 모델 업데이트 후 추천과 그래프가 대폭 변경 | K-71 | AP-K-71 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25384; message: 56 (assistant); path: 자동화와 AI 추천 > K-71. Model Upgrade Changes Site Structure > 임베딩 모델 업데이트 후 추천과 그래프가 대폭 변경 |
| 모든 관련 검색과 추천이 대표 Guide로만 감 | K-74 | AP-K-74 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25424; message: 56 (assistant); path: Canonical Guide와 중복 > K-74. Canonical Guide Dominates Everything > 모든 관련 검색과 추천이 대표 Guide로만 감 |
| 사실상 같은 검색 의도의 글을 서로 추천 | K-75 | AP-K-75 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25438; message: 56 (assistant); path: Canonical Guide와 중복 > K-75. Duplicate Articles Linked as Related > 사실상 같은 검색 의도의 글을 서로 추천 |
| 하위 글이 대표 문서보다 검색·추천에서 강함 | K-77 | AP-K-77 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25462; message: 56 (assistant); path: Canonical Guide와 중복 > K-77. Related Content Competes with Canonical > 하위 글이 대표 문서보다 검색·추천에서 강함 |
| 검색으로 들어온 사용자와 시리즈를 따라온 사용자에게 같은 추천 | K-78 | AP-K-78 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25474; message: 56 (assistant); path: 사용자 문맥 > K-78. Same Recommendation for All Entry Points > 검색으로 들어온 사용자와 시리즈를 따라온 사용자에게 같은 추천 |
| 사용자별 추천 시스템을 구축 | K-79 | AP-K-79 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25493; message: 56 (assistant); path: 사용자 문맥 > K-79. Personalization Before Need > 사용자별 추천 시스템을 구축 |
| 소비형 추천 문구 사용 | K-82 | AP-K-82 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25535; message: 56 (assistant); path: 사용자 문맥 > K-82. “You May Also Like” Without Explanation > 소비형 추천 문구 사용 |
| 클릭률이 높으면 추천이 정확하다고 판단 | K-83 | AP-K-83 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25557; message: 56 (assistant); path: 품질과 평가 > K-83. Click-Through Rate as Relevance > 클릭률이 높으면 추천이 정확하다고 판단 |
| 왜 특정 글이 추천되지 않는지 알 수 없음 | K-86 | AP-K-86 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25595; message: 56 (assistant); path: 품질과 평가 > K-86. No Explanation for Exclusion > 왜 특정 글이 추천되지 않는지 알 수 없음 |
| 추천 데이터 생성 실패 시 페이지 오류 | K-89 | AP-K-89 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25633; message: 56 (assistant); path: 품질과 평가 > K-89. Recommendation System Without Failure Fallback > 추천 데이터 생성 실패 시 페이지 오류 |
| 결론보다 추천 카드가 더 크게 보임 | K-90 | AP-K-90 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25643; message: 56 (assistant); path: 품질과 평가 > K-90. Recommendation UI Dominates Conclusion > 결론보다 추천 카드가 더 크게 보임 |
| 알고리즘 추천을 사람이 수정할 수 없음 | K-98 | AP-K-98 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25746; message: 56 (assistant); path: 운영 > K-98. No Editorial Override > 알고리즘 추천을 사람이 수정할 수 없음 |
| 그래프·추천 시스템 개발이 콘텐츠 연결보다 커짐 | K-100 | AP-K-100 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25770; message: 56 (assistant); path: 운영 > K-100. Knowledge Graph Becomes the Product > 그래프·추천 시스템 개발이 콘텐츠 연결보다 커짐 |
| 코드 예제 안 URL을 실제 링크로 검사 | T-32 | AP-T-32 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26408; message: 58 (assistant); path: 링크 검증 > T-32. Link Checker Parses Code Blocks > 코드 예제 안 URL을 실제 링크로 검사 |
| 내부 링크가 모두 redirect를 거치지만 검사 통과 | T-35 | AP-T-35 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26446; message: 58 (assistant); path: 링크 검증 > T-35. Redirect Hides Internal Link Debt > 내부 링크가 모두 redirect를 거치지만 검사 통과 |
| 데이터 모델 권장안 | A-04 | AP-A-04, AP-A-04-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:31209; message: 64 (assistant); path: A-04. Core Topics 영역 추가 > 데이터 모델 권장안 |
| 권장 구조 | A-09 | AP-A-09, AP-A-09-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:31562; message: 64 (assistant); path: A-09. 홈 컴포넌트 경계 단순화 > 권장 구조 |
| 권장 카드 수 | A-09 | AP-A-09, AP-A-09-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:31582; message: 64 (assistant); path: A-09. 홈 컴포넌트 경계 단순화 > 권장 카드 수 |
| 권장 검색 레코드 | D-02 | AP-D-02, AP-D-02-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:33965; message: 70 (assistant); path: D-02. 검색 문서 모델 재설계 > 권장 검색 레코드 |
| 권장 우선순위 | D-03 | AP-D-03, AP-D-03-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34019; message: 70 (assistant); path: D-03. 검색 필드 가중치 정의 > 권장 우선순위 |
| 추천 슬롯 | D-16 | AP-D-16, AP-D-16-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34591; message: 70 (assistant); path: D-16. 관련 글 추천 재설계 > 추천 슬롯 |
| 정기 검사 | D-22 | AP-D-22, AP-D-22-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34769; message: 70 (assistant); path: D-22. 내부 링크 검증 > 정기 검사 |
| 자동 검사 | G-02 | AP-G-02, AP-G-02-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:38275; message: 77 (assistant); path: Epic G. 보안·개인정보·공급망 정비 > G-02. Production 빌드에서 관리자 코드 제거 > 자동 검사 |
| G-20. Privacy Policy와 실제 동작 일치 검사 | G-20 | AP-G-20, AP-G-20-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:38994; message: 77 (assistant); path: 외부 스크립트와 개인정보 > G-20. Privacy Policy와 실제 동작 일치 검사 |
| 검사 항목 | G-20 | AP-G-20, AP-G-20-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:38998; message: 77 (assistant); path: 외부 스크립트와 개인정보 > G-20. Privacy Policy와 실제 동작 일치 검사 > 검사 항목 |
| 검사 패턴 | G-26 | AP-G-26, AP-G-26-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39269; message: 77 (assistant); path: 민감 정보 노출 > G-26. 콘텐츠 Secret Scan > 검사 패턴 |
| 검사 | G-30 | AP-G-30, AP-G-30-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39442; message: 77 (assistant); path: 도메인과 HTTPS > G-30. HTTPS·Canonical·Domain 점검 > 검사 |
| 모든 생성·검사를 하나의 build에 묶음 | P-03 | AP-P-03 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:11621; message: 38 (assistant); path: Task 2-4. Performance & Build Anti-patterns > P-03. Build Pipeline Monolith > 모든 생성·검사를 하나의 build에 묶음 |
| typo 수정에도 전체 중복 분석·신선도 검사 | P-59 | AP-P-59 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:12480; message: 38 (assistant); path: GitHub Actions and CI > P-59. Heavy Audit on Every Commit > typo 수정에도 전체 중복 분석·신선도 검사 |
| 작은 검사도 모든 파일 탐색 | M-25 | AP-M-25 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:16394; message: 45 (assistant); path: Scripts and Tooling > M-25. Full Repository Scan for Every Command > 작은 검사도 모든 파일 탐색 |
| 문체 검사로 모든 문장을 같은 톤으로 만듦 | G-24 | AP-G-24, AP-G-24-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:21246; message: 52 (assistant); path: 집필 > G-24. Tone Uniformity by Automation > 문체 검사로 모든 문장을 같은 톤으로 만듦 |
| K-12. Relation Type Explosion | K-12 | AP-K-12 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24542; message: 56 (assistant); path: 관계 모델 > K-12. Relation Type Explosion |
| 관계 종류가 지나치게 많음 | K-12 | AP-K-12 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24544; message: 56 (assistant); path: 관계 모델 > K-12. Relation Type Explosion > 관계 종류가 지나치게 많음 |
| 첫 번째 결과만 검사 | T-40 | AP-T-40 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26517; message: 58 (assistant); path: 검색 품질 테스트 > T-40. Rank-One-Only Evaluation > 첫 번째 결과만 검사 |
| Chromium만 검사 | T-49 | AP-T-49 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26633; message: 58 (assistant); path: 시각 회귀 테스트 > T-49. Visual Test on One Browser > Chromium만 검사 |
| `aria-label` 존재 여부만 검사 | T-64 | AP-T-64 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26821; message: 58 (assistant); path: 접근성 테스트 > T-64. Screen Reader Label Snapshot > `aria-label` 존재 여부만 검사 |
| meta description 글자 수만 검사 | T-69 | AP-T-69 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:26889; message: 58 (assistant); path: 콘텐츠 품질 테스트 > T-69. Description Length as Quality > meta description 글자 수만 검사 |
| 검사 결과를 바로 수정 | D-63 | AP-D-63 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:30201; message: 62 (assistant); path: 구현 과정 > D-63. Automatic Fix by Default > 검사 결과를 바로 수정 |
| 실험·디버깅 글 권장 | C-03 | AP-C-03, AP-C-03-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:32925; message: 68 (assistant); path: C-03. 최소 metadata schema 도입 > 필수와 선택 > 실험·디버깅 글 권장 |
| 권장 방법 | D-06 | AP-D-06, AP-D-06-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34199; message: 70 (assistant); path: D-06. 오류 메시지 검색 지원 > 권장 방법 |
| 권장 | G-08 | AP-G-08, AP-G-08-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:38557; message: 77 (assistant); path: Secret과 환경변수 > G-08. Secret 전달 범위 축소 > 권장 |
| 권장 방식 | G-18 | AP-G-18, AP-G-18-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:38923; message: 77 (assistant); path: 외부 스크립트와 개인정보 > G-18. 댓글 지연 로딩 > 권장 방식 |
| 권장 | G-23 | AP-G-23, AP-G-23-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39138; message: 77 (assistant); path: CSP와 브라우저 보안 > G-23. `innerHTML`과 검색 Highlight 감사 > 권장 |
| 권장 | G-24 | AP-G-24, AP-G-24-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39197; message: 77 (assistant); path: CSP와 브라우저 보안 > G-24. Raw HTML 허용 정책 > 권장 |
| 권장 방식 | G-28 | AP-G-28, AP-G-28-2 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39381; message: 77 (assistant); path: 민감 정보 노출 > G-28. 민감 파일 Artifact Allowlist > 권장 방식 |

## Manual anti-pattern mapping queue

| Priority | Guidance | Source |
| --- | --- | --- |
| P0 | Audit Without Remediation Workflow | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:6975; message: 28 (assistant); path: 14. 열네 번째 핵심 안티패턴 > Audit Without Remediation Workflow |
| P1 | 추천 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:6550; message: 28 (assistant); path: 6. 여섯 번째 핵심 안티패턴 > Build Stability by Increasing Heap > 추천 |
| P1 | 96. 최신 CSS 기능의 Fallback 미검토 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:73364; message: 116 (assistant); path: 96. 최신 CSS 기능의 Fallback 미검토 |
| P1 | 권장 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:7101; message: 28 (assistant); path: 16. 열여섯 번째 핵심 안티패턴 > Migration Avoidance > 권장 |
| P1 | 1. 모든 검증을 E2E 테스트로 해결 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:73944; message: 118 (assistant); path: Task 3-26. 테스트 아키텍처·회귀 방지·품질 게이트 안티패턴 > 1. 모든 검증을 E2E 테스트로 해결 |
| P1 | 작성일·수정일·검증일이 혼동됨 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:5677; message: 25 (assistant); path: 14. 열세 번째 핵심 안티패턴 > Date Ambiguity > 작성일·수정일·검증일이 혼동됨 |
| P1 | 48. 검색 실패 Fallback | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:57049; message: 102 (assistant); path: 48. 검색 실패 Fallback |
| P1 | 권장 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:6811; message: 28 (assistant); path: 10. 열 번째 핵심 안티패턴 > CSS Drift Under Utility Composition > 권장 |
| P2 | 권장 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:3982; message: 22 (assistant); path: 2. 첫 번째 핵심 안티패턴 > 범용 테마가 원하는 것 > 권장 |
| P2 | 권장 원칙 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4053; message: 22 (assistant); path: 3. 두 번째 핵심 안티패턴 > 잃을 수 있는 것 > 권장 원칙 |
| P2 | 내부 링크가 단순 관련 글 추천에 머묾 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:5279; message: 25 (assistant); path: 8. 일곱 번째 핵심 안티패턴 > Internal Link Underuse > 내부 링크가 단순 관련 글 추천에 머묾 |
| P2 | 장기적인 권장 경계 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:6240; message: 28 (assistant); path: 2. 두 번째 핵심 안티패턴 > 관리자 도구 > 장기적인 권장 경계 |
| P2 | 권장 경계 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:6854; message: 28 (assistant); path: 11. 열한 번째 핵심 안티패턴 > Integration Lifecycle Entanglement > 권장 경계 |
| P2 | 권장 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:6618; message: 28 (assistant); path: 7. 일곱 번째 핵심 안티패턴 > Content Model Drift > 권장 |
| P2 | 권장 구조 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:67391; message: 112 (assistant); path: Task 3-23. 의존성·기능 가지치기와 정적 사이트 복잡도 축소 > 1. 핵심 안티패턴: 정적 블로그를 애플리케이션처럼 운영 > 권장 구조 |
| P2 | 권장 검색 문서 모델 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4376; message: 22 (assistant); path: 7. 여섯 번째 핵심 안티패턴 > Client-Side Full-Text Index > 권장 검색 문서 모델 |
| P2 | 권장 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4622; message: 22 (assistant); path: 11. 열 번째 핵심 안티패턴 > Configuration Surface Expansion > 권장 |
| P2 | 권장 검색 문서 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:5064; message: 25 (assistant); path: 4. 세 번째 핵심 안티패턴 > Search Index as a Dump > 권장 검색 문서 |
| P2 | 추천 링크 모델 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:5317; message: 25 (assistant); path: 8. 일곱 번째 핵심 안티패턴 > Internal Link Underuse > 추천 링크 모델 |
| P2 | 추천 규칙 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:5579; message: 25 (assistant); path: 12. 열한 번째 핵심 안티패턴 > Tag Vocabulary Drift > 추천 규칙 |
| P2 | 추천 표시 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:5706; message: 25 (assistant); path: 14. 열세 번째 핵심 안티패턴 > Date Ambiguity > 추천 표시 |
| P2 | 권장 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:6958; message: 28 (assistant); path: 13. 열세 번째 핵심 안티패턴 > Dependency Residue > 권장 |
| P2 | Documentation and Implementation Divergence | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:7127; message: 28 (assistant); path: 17. 열일곱 번째 핵심 안티패턴 > Documentation and Implementation Divergence |
| P2 | 19.2 콘텐츠 감사 자동화 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:7220; message: 28 (assistant); path: 19. 현재 유지보수성에서 잘한 부분 > 19.2 콘텐츠 감사 자동화 |
| P2 | 14. 중복 콘텐츠 사전 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:62863; message: 108 (assistant); path: 14. 중복 콘텐츠 사전 검사 |
| P2 | 권장 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4238; message: 22 (assistant); path: 5. 네 번째 핵심 안티패턴 > Content Processing Pipeline as a Compiler > 권장 |
| P2 | 권장 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4444; message: 22 (assistant); path: 8. 일곱 번째 핵심 안티패턴 > Tailwind Convenience Becoming Semantic Loss > 권장 |
| P2 | 권장 판단 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4563; message: 22 (assistant); path: 10. 아홉 번째 핵심 안티패턴 > Admin Capability Inside a Static Blog > 권장 판단 |
| P2 | 추천 가중치 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:5098; message: 25 (assistant); path: 4. 세 번째 핵심 안티패턴 > Search Index as a Dump > 추천 가중치 |
| P2 | 추천 구조화 데이터 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:5640; message: 25 (assistant); path: 13. 열두 번째 핵심 안티패턴 > Structured Data Without Content Model > 추천 구조화 데이터 |
| P2 | 추천 우선순위 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:5846; message: 25 (assistant); path: 17. 열다섯 번째 핵심 안티패턴 > Heavy Article Tail > 추천 우선순위 |
| P2 | 권장 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:6756; message: 28 (assistant); path: 9. 아홉 번째 핵심 안티패턴 > Component Proliferation by Page Variation > 권장 |
| P2 | “어떻게” 질문 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:55782; message: 102 (assistant); path: 9. Content Type 기반 검색 의도 > “어떻게” 질문 |
| P2 | 권장 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4318; message: 22 (assistant); path: 6. 다섯 번째 핵심 안티패턴 > 발생 가능한 비용 > 권장 |

## Guidance-only sections

| Guidance | Source |
| --- | --- |
| Task 8. 실행 계획 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:1472; message: 11 (assistant); path: Task 8. 실행 계획 |
| 15. 추천 목표 아키텍처 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4745; message: 22 (assistant); path: 15. 추천 목표 아키텍처 |
| 추천 표기 원칙 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24245; message: 54 (assistant); path: 추천 표기 원칙 |
| 추천 최소 복원력 기준선 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:28892; message: 60 (assistant); path: 추천 최소 복원력 기준선 |
| F-04. Canonical URL 전수 검증 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36773; message: 75 (assistant); path: F-04. Canonical URL 전수 검증 |
| 권장 원칙 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36786; message: 75 (assistant); path: F-04. Canonical URL 전수 검증 > 권장 원칙 |
| 권장 구성 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37220; message: 75 (assistant); path: F-12. About 페이지 개편 > 권장 구성 |
| Task 3-8. 테스트·회귀 검증·출시 체크리스트 백로그 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39716; message: 79 (assistant); path: Task 3-8. 테스트·회귀 검증·출시 체크리스트 백로그 |
| H-10. 최종 `dist` 구조 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40249; message: 79 (assistant); path: H-10. 최종 `dist` 구조 검사 |
| Task 3-9. 전체 실행 로드맵과 스프린트 계획 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:41725; message: 81 (assistant); path: Task 3-9. 전체 실행 로드맵과 스프린트 계획 |
| 0. 실행 원칙 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:41743; message: 81 (assistant); path: 0. 실행 원칙 |
| Sprint 2 — 2주차: 대표 문서 선정과 검증 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:41995; message: 81 (assistant); path: 2주 계획: 기반과 대표 콘텐츠 > Sprint 2 — 2주차: 대표 문서 선정과 검증 |
| Task 3-10. 첫 실행용 작업 티켓 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:42900; message: 83 (assistant); path: Task 3-10. 첫 실행용 작업 티켓 |
| 커밋 분리 권장안 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:43664; message: 83 (assistant); path: 커밋 분리 권장안 |
| 원칙 2. 형식 검증과 의미 검증을 분리한다 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:50203; message: 98 (assistant); path: 2. 설계 원칙 > 원칙 2. 형식 검증과 의미 검증을 분리한다 |
| 92. Article 품질 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:62113; message: 106 (assistant); path: 92. Article 품질 검사 |
| 47. 발행 전 체크리스트 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:63629; message: 108 (assistant); path: 47. 발행 전 체크리스트 |
| 74. 추천 최종 런타임 경계 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:69057; message: 112 (assistant); path: 74. 추천 최종 런타임 경계 |
| 71. 반대로 매 변경에 모든 Visual Test 실행 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:75529; message: 118 (assistant); path: 71. 반대로 매 변경에 모든 Visual Test 실행 |
| 지금 시점의 추천 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:79601; message: 123 (assistant); path: 지금 시점의 추천 |
| 내가 추천하는 최종 프로젝트 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:1554; message: 11 (assistant); path: Task 8. 실행 계획 > 내가 추천하는 최종 프로젝트 |
| 21. 추천 리팩토링 순서 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:7261; message: 28 (assistant); path: 21. 추천 리팩토링 순서 |
| 9. 현실적인 첫 번째 실행 묶음 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:8081; message: 30 (assistant); path: 9. 현실적인 첫 번째 실행 묶음 |
| 첫 번째 실제 실행 묶음 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:31675; message: 64 (assistant); path: 첫 번째 실제 실행 묶음 |
| 두 번째 실제 실행 묶음 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:32729; message: 66 (assistant); path: 두 번째 실제 실행 묶음 |
| 세 번째 실제 실행 묶음 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:33872; message: 68 (assistant); path: 세 번째 실제 실행 묶음 |
| 네 번째 실제 실행 묶음 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:34925; message: 70 (assistant); path: 네 번째 실제 실행 묶음 |
| 실행 조건 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:35808; message: 72 (assistant); path: E-15. 다이어그램 파이프라인 격리 > 실행 조건 |
| 명시적으로 실행 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36330; message: 72 (assistant); path: E-27. 로컬 Fast Path > 명시적으로 실행 |
| 실행 경로 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36474; message: 72 (assistant); path: Epic E 완료 기준 > 실행 경로 |
| 다섯 번째 실제 실행 묶음 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36529; message: 72 (assistant); path: 다섯 번째 실제 실행 묶음 |
| 여섯 번째 실제 실행 묶음 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:38113; message: 75 (assistant); path: 여섯 번째 실제 실행 묶음 |
| 일곱 번째 실제 실행 묶음 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39689; message: 77 (assistant); path: 일곱 번째 실제 실행 묶음 |
| Epic H. 테스트·회귀 검증·출시 관리 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39743; message: 79 (assistant); path: Epic H. 테스트·회귀 검증·출시 관리 |
| 여덟 번째 실제 실행 묶음 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:41676; message: 79 (assistant); path: 여덟 번째 실제 실행 묶음 |
| 첫 실행 순서 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:42878; message: 81 (assistant); path: 첫 실행 순서 |
| Sprint 1 권장 실행 순서 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:43647; message: 83 (assistant); path: Sprint 1 권장 실행 순서 |
| 권장 역할 구성 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:44279; message: 85 (assistant); path: 8. Featured Guides > 권장 역할 구성 |
| 23. 권장 커밋 순서 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:44978; message: 85 (assistant); path: 23. 권장 커밋 순서 |
| ① CPU는 전원을 켜면 무엇부터 실행하는가 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:45848; message: 90 (assistant); path: 9. 신규로 반드시 써야 하는 글 > ① CPU는 전원을 켜면 무엇부터 실행하는가 |
| 58. 권장 커밋 순서 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:50050; message: 96 (assistant); path: 58. 권장 커밋 순서 |
| 권장 선택 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:51088; message: 98 (assistant); path: 21. 기본 타입을 `reference`로 두는 문제 > 권장 선택 |
| 28. Topic 검증 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:51373; message: 98 (assistant); path: 28. Topic 검증 |
| 권장 커밋 순서 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:54070; message: 98 (assistant); path: 권장 커밋 순서 |
| Hawk90 블로그에 가장 추천하는 Hub | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:55197; message: 100 (assistant); path: Hawk90 블로그에 가장 추천하는 Hub |
| 69. 권장 커밋 순서 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:57557; message: 102 (assistant); path: 69. 권장 커밋 순서 |
| 41. Series 검증 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:58819; message: 104 (assistant); path: 41. Series 검증 |
| 91. 권장 커밋 순서 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:60024; message: 104 (assistant); path: 91. 권장 커밋 순서 |
| 100. 권장 커밋 순서 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:62322; message: 106 (assistant); path: 100. 권장 커밋 순서 |
| 23. 실행 결과 검증 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:63084; message: 108 (assistant); path: 23. 실행 결과 검증 |
| 95. 권장 커밋 순서 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:64756; message: 108 (assistant); path: 95. 권장 커밋 순서 |
| 71. 권장 Topic 순서 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:66587; message: 110 (assistant); path: 71. 권장 Topic 순서 |
| 99. 권장 커밋 순서 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:67213; message: 110 (assistant); path: 99. 권장 커밋 순서 |
| 80. 권장 커밋 순서 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:69212; message: 112 (assistant); path: 80. 권장 커밋 순서 |
| 74. Deployment Smoke가 너무 늦게 실행 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:70867; message: 114 (assistant); path: 74. Deployment Smoke가 너무 늦게 실행 |
| 99. 권장 커밋 순서 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:71358; message: 114 (assistant); path: 99. 권장 커밋 순서 |
| 권장 커밋 순서 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:73833; message: 116 (assistant); path: 권장 커밋 순서 |
| 67. 테스트 실행 명령이 너무 많음 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:75424; message: 118 (assistant); path: 67. 테스트 실행 명령이 너무 많음 |
| 69. 빠른 검증과 전체 검증 구분 없음 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:75476; message: 118 (assistant); path: 69. 빠른 검증과 전체 검증 구분 없음 |
| 81. 테스트 실패를 자동 재실행해 숨김 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:75660; message: 118 (assistant); path: 81. 테스트 실패를 자동 재실행해 숨김 |
| 88. 배포 Workflow를 테스트하지 않음 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:75751; message: 118 (assistant); path: 88. 배포 Workflow를 테스트하지 않음 |
| 89. `package.json` Script가 실제로 동작하는지 미검증 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:75768; message: 118 (assistant); path: 89. `package.json` Script가 실제로 동작하는지 미검증 |
| 103. 권장 커밋 순서 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:76161; message: 118 (assistant); path: 103. 권장 커밋 순서 |
| 권장 순서 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:76746; message: 121 (assistant); path: 11. 홈에서 최근 글만 보여줌 > 권장 순서 |
| 95. 권장 실행 순서 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:79059; message: 121 (assistant); path: 95. 권장 실행 순서 |
| 권장 상태 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:3536; message: 19 (assistant); path: 15. 수정 이력이 콘텐츠에 반영되지 않는 문제 > Timeless Technical Article > 권장 상태 |
| 정기 품질 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4166; message: 22 (assistant); path: 4. 세 번째 핵심 안티패턴 > Build-Time Feature Accumulation > 정기 품질 검사 |
| 권장 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4679; message: 22 (assistant); path: 12. 사용하지 않는 의존성 잔존 가능성 > Dependency Archaeology > 권장 |
| 13.6 품질 감사 자동화 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:4718; message: 22 (assistant); path: 13. 현재 기술 스택에서 잘한 부분 > 13.6 품질 감사 자동화 |
| 추천 보안 기준선 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:19058; message: 48 (assistant); path: 추천 보안 기준선 |
| 추천 최소 관측 체계 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:20675; message: 50 (assistant); path: 추천 최소 관측 체계 |
| 추천 최소 편집 흐름 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:22491; message: 52 (assistant); path: 추천 최소 편집 흐름 |
| 추천 최소 테스트 피라미드 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:27318; message: 58 (assistant); path: 추천 최소 테스트 피라미드 |
| 권장 정책 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36664; message: 75 (assistant); path: F-02. Indexability Matrix 확정 > 권장 정책 |
| 검사할 문제 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36775; message: 75 (assistant); path: F-04. Canonical URL 전수 검증 > 검사할 문제 |
| F-19. 검색 색인 품질 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37539; message: 75 (assistant); path: F-19. 검색 색인 품질 검사 |
| F-26. AdSense 재신청 전 최종 체크리스트 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37860; message: 75 (assistant); path: F-26. AdSense 재신청 전 최종 체크리스트 |
| 검증 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:38076; message: 75 (assistant); path: F-30. Epic F 완료 조건 > 검증 |
| H-04. Internal Link 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39936; message: 79 (assistant); path: H-04. Internal Link 검사 |
| Anchor 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39951; message: 79 (assistant); path: H-04. Internal Link 검사 > Anchor 검사 |
| H-05. Relation Integrity 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40000; message: 79 (assistant); path: H-05. Relation Integrity 검사 |
| H-12. SEO Metadata 회귀 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40357; message: 79 (assistant); path: H-12. SEO Metadata 회귀 검사 |
| H-13. 구조화 데이터 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40407; message: 79 (assistant); path: H-13. 구조화 데이터 검사 |
| H-16. 접근성 자동 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40572; message: 79 (assistant); path: H-16. 접근성 자동 검사 |
| 자동 검사로 충분하지 않은 항목 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40597; message: 79 (assistant); path: H-16. 접근성 자동 검사 > 자동 검사로 충분하지 않은 항목 |
| 권장 viewport | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40653; message: 79 (assistant); path: H-18. 모바일 Viewport Smoke Test > 권장 viewport |
| H-20. 코드 블록 회귀 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40763; message: 79 (assistant); path: H-20. 코드 블록 회귀 검사 |
| H-21. 표와 다이어그램 회귀 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40819; message: 79 (assistant); path: H-21. 표와 다이어그램 회귀 검사 |
| H-22. 보안 회귀 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40865; message: 79 (assistant); path: H-22. 보안 회귀 검사 |
| H-26. 광고 제외 페이지 회귀 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:41038; message: 79 (assistant); path: H-26. 광고 제외 페이지 회귀 검사 |
| 권장 필드 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:43241; message: 83 (assistant); path: Ticket S1-05. 최소 Front Matter Schema 추가 > 권장 필드 |
| Ticket S1-06. Featured 불변조건 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:43308; message: 83 (assistant); path: Ticket S1-06. Featured 불변조건 검사 |
| 권장 표 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:43448; message: 83 (assistant); path: Ticket S1-08. 대표 문서 감사표 작성 > 권장 표 |
| 10. Schema에서 하지 말아야 할 검증 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:48015; message: 96 (assistant); path: 10. Schema에서 하지 말아야 할 검증 |
| 형식 검증 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:50205; message: 98 (assistant); path: 2. 설계 원칙 > 원칙 2. 형식 검증과 의미 검증을 분리한다 > 형식 검증 |
| 의미 검증 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:50215; message: 98 (assistant); path: 2. 설계 원칙 > 원칙 2. 형식 검증과 의미 검증을 분리한다 > 의미 검증 |
| 권장 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:50427; message: 98 (assistant); path: 6. 날짜 모델 > 권장 |
| 24. Manifest 전체 검증 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:51215; message: 98 (assistant); path: 24. Manifest 전체 검증 |
| 29. Relation 대상 검증 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:51416; message: 98 (assistant); path: 29. Relation 대상 검증 |
| 30. 자기 참조 검증 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:51478; message: 98 (assistant); path: 30. 자기 참조 검증 |
| 31. Superseded 상태 검증 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:51515; message: 98 (assistant); path: 31. Superseded 상태 검증 |
| 40. Top 3 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:56885; message: 102 (assistant); path: 40. Top 3 검사 |
| 41. 검색 결과의 상태 회귀 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:56908; message: 102 (assistant); path: 41. 검색 결과의 상태 회귀 검사 |
| 63. 보안 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:57368; message: 102 (assistant); path: 63. 보안 검사 |
| 36. 상태 기반 추천 필터 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:58718; message: 104 (assistant); path: 36. 상태 기반 추천 필터 |
| 73. 추천 상태 검증 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:59603; message: 104 (assistant); path: 73. 추천 상태 검증 |
| 96. 인쇄 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:62209; message: 106 (assistant); path: 96. 인쇄 검사 |
| 16. 기술 검증 단계 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:62922; message: 108 (assistant); path: 16. 기술 검증 단계 |
| 19. 기술 검증 체크리스트 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:62996; message: 108 (assistant); path: 19. 기술 검증 체크리스트 |
| 24. 코드 검증 수준 표시 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:63107; message: 108 (assistant); path: 24. 코드 검증 수준 표시 |
| 38. 문장 품질 자동 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:63437; message: 108 (assistant); path: 38. 문장 품질 자동 검사 |
| 79. 세 가지 검증 프로파일 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:64346; message: 108 (assistant); path: 79. 세 가지 검증 프로파일 |
| 92. Legacy Fallback Description | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:67041; message: 110 (assistant); path: 92. Legacy Fallback Description |
| 15. Dist 폴더를 검증하지 않음 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:69739; message: 114 (assistant); path: 15. Dist 폴더를 검증하지 않음 |
| 30. HTTPS 강제 상태를 검증하지 않음 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:70073; message: 114 (assistant); path: 30. HTTPS 강제 상태를 검증하지 않음 |
| 63. Cache Hit를 신뢰하고 검증 생략 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:70691; message: 114 (assistant); path: 63. Cache Hit를 신뢰하고 검증 생략 |
| OPS-06. Base Path·URL 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:71328; message: 114 (assistant); path: 98. 구현 티켓 > OPS-06. Base Path·URL 검사 |
| 권장 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:74192; message: 118 (assistant); path: 7. 거대한 만능 Fixture Factory > 권장 |
| 14. 하나의 테스트에서 모든 상태를 검증 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:74370; message: 118 (assistant); path: 14. 하나의 테스트에서 모든 상태를 검증 |
| 권장 분류 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:76398; message: 121 (assistant); path: 3. 모든 과거 메모를 검색 페이지로 유지 > 권장 분류 |
| 내가 가장 추천하는 구조 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:2832; message: 16 (assistant); path: 내가 가장 추천하는 구조 |
| 추천 최소 관계 모델 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25810; message: 56 (assistant); path: 추천 최소 관계 모델 |
| 권장 URL | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:31886; message: 66 (assistant); path: B-03. `PCIe & CXL` Hub 생성 > 권장 URL |
| 추천 역할 분배 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:32012; message: 66 (assistant); path: B-06. `PCIe & CXL` 대표 글 선정 기준 > 추천 역할 분배 |
| 권장 함수 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:35213; message: 72 (assistant); path: E-04. Publication Policy 중앙화 > 권장 함수 |
| 권장 role | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:35413; message: 72 (assistant); path: E-08. 코드 블록 역할 분리 > 권장 role |
| 권장 파이프라인 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:35883; message: 72 (assistant); path: E-17. CI Job 분리 > 권장 파이프라인 |
| E-26. 외부 링크 검사를 정기 작업으로 이동 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36273; message: 72 (assistant); path: E-26. 외부 링크 검사를 정기 작업으로 이동 |
| 권장 핵심 문장 방향 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37240; message: 75 (assistant); path: F-12. About 페이지 개편 > 권장 핵심 문장 방향 |
| 권장 최소 구성 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37435; message: 75 (assistant); path: F-17. 구조화 데이터 최소 구현 > 권장 최소 구성 |
| 권장 Canary | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40720; message: 79 (assistant); path: H-19. Visual Canary 세트 > 권장 Canary |
| Hero 권장 방향 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:42191; message: 81 (assistant); path: 6주 계획: 사용자에게 보이는 구조 완성 > Sprint 4 — 4주차: 홈 개편 > Hero 권장 방향 |
| 권장 배분 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:43374; message: 83 (assistant); path: Ticket S1-07. 대표 문서 후보 20개 선정 > 권장 배분 |
| 권장 URL | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:43822; message: 85 (assistant); path: 2. 페이지 기본 Metadata > 권장 URL |
| 권장 제목 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:43940; message: 85 (assistant); path: 5. Start Here > 5.1 전체 구조 입문 > 권장 제목 |
| 권장 제목 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:43978; message: 85 (assistant); path: 5. Start Here > 5.2 BAR와 MMIO 핵심 Concept > 권장 제목 |
| 권장 흐름도 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:44057; message: 85 (assistant); path: 6. System Flow > 권장 흐름도 |
| 권장 대표 문서 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:44110; message: 85 (assistant); path: 7. Core Concepts > 7.1 Enumeration & Configuration Space > 권장 대표 문서 |
| 권장 다이어그램 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:45319; message: 90 (assistant); path: 4. System Flow > 권장 다이어그램 |
| 권장 구조 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:54341; message: 100 (assistant); path: 권장 구조 |
| 57. Topic Hub 추천 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:57250; message: 102 (assistant); path: 57. Topic Hub 추천 |
| SEA-10. 결과 없음·오류 Fallback | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:57551; message: 102 (assistant); path: 68. 실제 구현 티켓 > SEA-10. 결과 없음·오류 Fallback |
| 32. Related Articles 자동 추천의 fallback | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:58647; message: 104 (assistant); path: 32. Related Articles 자동 추천의 fallback |
| 34. Fallback은 Topic Hub 하나로 충분할 수 있다 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:58683; message: 104 (assistant); path: 34. Fallback은 Topic Hub 하나로 충분할 수 있다 |
| 35. 추천 알고리즘 점수 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:58699; message: 104 (assistant); path: 35. 추천 알고리즘 점수 |
| REL-09. 태그 기반 추천을 fallback으로 이동 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:60014; message: 104 (assistant); path: 90. 실제 구현 티켓 > REL-09. 태그 기반 추천을 fallback으로 이동 |
| 40. Primary Topic 하나를 권장하는 이유 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:65949; message: 110 (assistant); path: 40. Primary Topic 하나를 권장하는 이유 |
| 20. 외부 링크 검사를 매 Build에서 수행 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:67940; message: 112 (assistant); path: 20. 외부 링크 검사를 매 Build에서 수행 |
| 50. Image Missing Fallback 없음 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:70480; message: 114 (assistant); path: 50. Image Missing Fallback 없음 |
| 선택 또는 Fallback 가능 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:71233; message: 114 (assistant); path: 94. 필수와 선택 산출물 분류 > 선택 또는 Fallback 가능 |
| OPS-02. Workflow 권한 최소화 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:71303; message: 114 (assistant); path: 98. 구현 티켓 > OPS-02. Workflow 권한 최소화 |
| 권장 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:76880; message: 121 (assistant); path: 15. 제목이 검색 키워드 나열 > 권장 |
| 47. Broken Link 검사 없음 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:1068; message: 9 (assistant); path: 12. 운영 > 47. Broken Link 검사 없음 |
| 추천 최소 용어 관리 모델 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:24226; message: 54 (assistant); path: 추천 최소 용어 관리 모델 |
| 추천 노출 구조 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:25839; message: 56 (assistant); path: 추천 노출 구조 |
| 권장 URL | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:32162; message: 66 (assistant); path: B-11. `Firmware & Bootloader` Hub 생성 > 권장 URL |
| 권장 흐름 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:35329; message: 72 (assistant); path: E-06. AST 생명주기 제한 > 권장 흐름 |
| 전체 검사가 필요한 작업 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:35669; message: 72 (assistant); path: E-12. 변경 파일 인식 > 전체 검사가 필요한 작업 |
| 문서별 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:35858; message: 72 (assistant); path: E-16. 이미지 처리 정책 > 문서별 검사 |
| 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36197; message: 72 (assistant); path: E-24. 배포 결과 Smoke Test > 검사 |
| 검사 대상 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36946; message: 75 (assistant); path: F-07. 빈 페이지와 Placeholder 제거 > 검사 대상 |
| 권장 처리 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36960; message: 75 (assistant); path: F-07. 빈 페이지와 Placeholder 제거 > 권장 처리 |
| 검사 대상 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37110; message: 75 (assistant); path: F-10. 일반적인 AI 문장 제거 > 검사 대상 |
| 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37659; message: 75 (assistant); path: F-21. 모바일 콘텐츠 경험 감사 > 검사 |
| 동결 권장 영역 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37971; message: 75 (assistant); path: F-28. 재신청 후 변경 동결 범위 > 동결 권장 영역 |
| 검사 대상 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:39940; message: 79 (assistant); path: H-04. Internal Link 검사 > 검사 대상 |
| 검사 항목 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40056; message: 79 (assistant); path: H-06. Topic Hub Validation > 검사 항목 |
| 추가 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40112; message: 79 (assistant); path: H-07. Featured Content Validation > 추가 검사 |
| H-08. Publication Set 일치 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40137; message: 79 (assistant); path: H-08. Publication Set 일치 검사 |
| 파일 크기 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40266; message: 79 (assistant); path: H-10. 최종 `dist` 구조 검사 > 파일 크기 검사 |
| 검사 항목 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40323; message: 79 (assistant); path: H-11. Dist HTTP Smoke Test > 검사 항목 |
| Production artifact 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40880; message: 79 (assistant); path: H-22. 보안 회귀 검사 > Production artifact 검사 |
| 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:41363; message: 79 (assistant); path: H-32. Production Verification > 검사 |
| 예시 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:43325; message: 83 (assistant); path: Ticket S1-06. Featured 불변조건 검사 > 예시 검사 |
| 권장 Warning | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:44673; message: 85 (assistant); path: 14. Hub Validation 규칙 > 권장 Warning |
| Ticket PCH-06. 모바일·링크 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:44966; message: 85 (assistant); path: 22. 첫 구현 티켓 > Ticket PCH-06. 모바일·링크 검사 |
| 3. 권장 최상위 디렉터리 구조 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:47572; message: 96 (assistant); path: 3. 권장 최상위 디렉터리 구조 |
| 54. 권장 최소 구현 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:49849; message: 96 (assistant); path: 54. 권장 최소 구현 |
| 55. 최종 권장 디렉터리 구조 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:49877; message: 96 (assistant); path: 55. 최종 권장 디렉터리 구조 |
| 32. Supersession Cycle 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:51563; message: 98 (assistant); path: 32. Supersession Cycle 검사 |
| 권장 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:53251; message: 98 (assistant); path: 72. Policy를 Config 데이터로 만들지 코드로 만들지 > 권장 |
| 추천 모델 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:54771; message: 100 (assistant); path: 추천 모델 |
| 64. 접근성 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:57385; message: 102 (assistant); path: 64. 접근성 검사 |
| 3. 권장 관계 모델 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:57692; message: 104 (assistant); path: 3. 권장 관계 모델 |
| 24. 타입 기반 관계 추천 규칙 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:58377; message: 104 (assistant); path: 24. 타입 기반 관계 추천 규칙 |
| 33. 추천 슬롯 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:58664; message: 104 (assistant); path: 33. 추천 슬롯 |
| 3. 권장 전체 구조 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:60172; message: 106 (assistant); path: 3. 권장 전체 구조 |
| 권장 방향 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:71492; message: 116 (assistant); path: Task 3-25. CSS 아키텍처·반응형 레이아웃·기술 문서 시각 시스템 안티패턴 > 1. 가장 흔한 근본 문제: 페이지 단위로 디자인하기 > 권장 방향 |
| 84. 가로 방향 모바일 미검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:73222; message: 116 (assistant); path: 84. 가로 방향 모바일 미검사 |
| 101. 권장 Visual Canary | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:73452; message: 116 (assistant); path: 101. 권장 Visual Canary |
| 권장 계층 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:73970; message: 118 (assistant); path: Task 3-26. 테스트 아키텍처·회귀 방지·품질 게이트 안티패턴 > 1. 모든 검증을 E2E 테스트로 해결 > 권장 계층 |
| 28. 빈 문자열과 공백 입력 미검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:74662; message: 118 (assistant); path: 28. 빈 문자열과 공백 입력 미검사 |
| 61. Bundle Size가 작아졌는지만 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:75318; message: 118 (assistant); path: 61. Bundle Size가 작아졌는지만 검사 |
| 91. Structured Data JSON-LD를 문자열 포함으로만 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:75815; message: 118 (assistant); path: 91. Structured Data JSON-LD를 문자열 포함으로만 검사 |
| 100. 추천 디렉터리 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:76015; message: 118 (assistant); path: 100. 추천 디렉터리 |
| 권장 역할 분리 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:76533; message: 121 (assistant); path: 5. 카테고리와 태그가 같은 목록을 생성 > 권장 역할 분리 |
| 신판 발행 시 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:77579; message: 121 (assistant); path: 39. 내부 링크가 구판으로 계속 향함 > 신판 발행 시 검사 |
| 권장 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:77807; message: 121 (assistant); path: 47. 문서 수를 늘리기 위해 키워드별 페이지 생성 > 권장 |
| 92. 재신청 전 대표 URL 수동 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:78932; message: 121 (assistant); path: 92. 재신청 전 대표 URL 수동 검사 |
| 93. 재신청 전 약한 URL 수동 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:78951; message: 121 (assistant); path: 93. 재신청 전 약한 URL 수동 검사 |
| 권장 도입부 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:3037; message: 19 (assistant); path: 3. 문서의 목적이 초반에 드러나지 않는 문제 > Delayed Value Proposition > 권장 도입부 |
| 권장 종료 구조 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:3495; message: 19 (assistant); path: 14. 글의 종료 지점이 없는 문제 > Abrupt Ending > 권장 종료 구조 |
| 권장 명령 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:35036; message: 72 (assistant); path: E-02. 빌드 명령 역할 분리 > 권장 명령 |
| 권장 구조 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:35799; message: 72 (assistant); path: E-15. 다이어그램 파이프라인 격리 > 권장 구조 |
| 권장 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:35987; message: 72 (assistant); path: E-19. 동일 작업의 Job 간 중복 제거 > 권장 |
| 검사 항목 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36157; message: 72 (assistant); path: E-23. 대표 복잡도 페이지 Canary 선정 > 검사 항목 |
| 자동 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:36799; message: 75 (assistant); path: F-04. Canonical URL 전수 검증 > 권장 원칙 > 자동 검사 |
| 검사 대상 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37483; message: 75 (assistant); path: F-18. 제목과 Description 감사 > 검사 대상 |
| 검사할 것 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37693; message: 75 (assistant); path: F-22. 광고 없는 상태에서 사이트 감사 > 검사할 것 |
| 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:37842; message: 75 (assistant); path: F-25. 광고 슬롯 CLS 방지 > 검사 |
| 검사 대상 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40004; message: 79 (assistant); path: H-05. Relation Integrity 검사 > 검사 대상 |
| Cycle 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40025; message: 79 (assistant); path: H-05. Relation Integrity 검사 > Cycle 검사 |
| 집합 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40149; message: 79 (assistant); path: H-08. Publication Set 일치 검사 > 집합 검사 |
| 검사할 실패 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40223; message: 79 (assistant); path: H-09. Production Build 통합 테스트 > 검사할 실패 |
| 기본 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40253; message: 79 (assistant); path: H-10. 최종 `dist` 구조 검사 > 기본 검사 |
| 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40421; message: 79 (assistant); path: H-13. 구조화 데이터 검사 > 검사 |
| 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40676; message: 79 (assistant); path: H-18. 모바일 Viewport Smoke Test > 검사 |
| 자동 검사 가능 항목 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40689; message: 79 (assistant); path: H-18. 모바일 Viewport Smoke Test > 자동 검사 가능 항목 |
| 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:40781; message: 79 (assistant); path: H-20. 코드 블록 회귀 검사 > 검사 |
| 검사 방법 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:41056; message: 79 (assistant); path: H-26. 광고 제외 페이지 회귀 검사 > 검사 방법 |
| 권장 제목 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:44006; message: 85 (assistant); path: 5. Start Here > 5.3 CXL 메모리 전체 Guide > 권장 제목 |
| 권장 하위 분류 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:44332; message: 85 (assistant); path: 9. Debug & Experiments > 권장 하위 분류 |
| ① Linux Kernel은 어떻게 구성되어 있는가 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:46570; message: 92 (assistant); path: 9. 반드시 작성하면 좋은 대표 글 > ① Linux Kernel은 어떻게 구성되어 있는가 |
| 관계 배열은 `undefined`보다 빈 배열 권장 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:50674; message: 98 (assistant); path: 12. 선택 필드와 필수 필드의 경계 > 관계 배열은 `undefined`보다 빈 배열 권장 |
| 26. 중복 ID 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:51299; message: 98 (assistant); path: 26. 중복 ID 검사 |
| 27. 중복 URL 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:51336; message: 98 (assistant); path: 27. 중복 URL 검사 |
| 권장 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:60397; message: 106 (assistant); path: 10. TL;DR 적용 기준 > 권장 |
| 권장 표시 조건 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:60475; message: 106 (assistant); path: 13. Table of Contents > 권장 표시 조건 |
| 33. Heading만 읽기 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:63310; message: 108 (assistant); path: 33. Heading만 읽기 검사 |
| 34. 중복 문단 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:63336; message: 108 (assistant); path: 34. 중복 문단 검사 |
| 39. 자동 문장 검사를 Error로 만들지 않기 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:63457; message: 108 (assistant); path: 39. 자동 문장 검사를 Error로 만들지 않기 |
| 40. Dead Code 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:68379; message: 112 (assistant); path: 40. Dead Code 검사 |
| 권장 책임 분리 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:71550; message: 116 (assistant); path: 2. 전역 CSS와 Scoped CSS의 책임이 불분명 > 권장 책임 분리 |
| 85. Browser Zoom 미검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:73230; message: 116 (assistant); path: 85. Browser Zoom 미검사 |
| 100. Visual Regression이 Home만 검사 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:73432; message: 116 (assistant); path: 100. Visual Regression이 Home만 검사 |
| 권장 | archives/chatgpt-6a6d9c95-b7ec-83ee-85d6-e7c2a5e93273/conversation.full.md:77156; message: 121 (assistant); path: 24. 본문보다 광고가 먼저 보임 > 권장 |

