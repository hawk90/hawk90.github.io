# Remediation execution graph

> `baseline_established` means enabling work exists; it is never category completion.

| Category | Status | Depends on |
| --- | --- | --- |
| AP-D 방법론 | completed | — |
| AP-R 저장소·운영 | remediation_in_progress | methodology |
| AP-T 품질·테스트 | remediation_in_progress | methodology, repository |
| AP-SEC 보안 | baseline_established | methodology, repository, quality |
| AP-M 메타데이터 | baseline_established | methodology, quality |
| AP-I 정보구조 | baseline_established | metadata, quality |
| AP-L 로컬라이제이션 | baseline_established | metadata, information_architecture |
| AP-S 검색·SEO | baseline_established | metadata, information_architecture, localization |
| AP-U UX | baseline_established | information_architecture, localization, search_seo |
| AP-P 성능 | baseline_established | repository, quality, ux |
| AP-O 관측성 | baseline_established | security, repository, performance |
| AP-A 콘텐츠 | baseline_established | metadata, information_architecture, localization, search_seo, ux, performance, observability, quality, security |

- Ready to activate: AP-R 저장소·운영, AP-T 품질·테스트
- Activation exceptions: 1
- Graph findings: 0
