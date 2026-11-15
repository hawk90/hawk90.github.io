# 공개 406편 독립 재검토 — 공통 게이트

- 대상 커밋: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`
- 실행일: 2026-10-18 (Asia/Seoul)
- 사용자 요청: Modern Embedded Recipes를 제외한 Claude 평가 406편의 점수와 판정 재검토.
- 기존 미커밋 `package.json`, `scripts/adsense-score-loop.mjs`, `embedded-performance-engineering-loop-01.md`는 보존한다.
- 원문 수정 없음. 아래 검사는 본문 정확성·점수의 타당성을 증명하지 않는다. 실제 글별 근거 대조는 `double-check-loop-NN.md`에 기록한다.

## 실행 결과

| 검사 | 결과 | 범위·근거 |
| --- | --- | --- |
| `npm run check` | 통과, exit 0 | 264 files; 0 errors, 0 warnings, 4 hints. `/private/tmp/adsense-double-check-astro-check.log` |
| `npm run build` | 통과, exit 0 | 1,135 pages built; 공개 글 559편 광고 CSP. `/private/tmp/adsense-double-check-build.log` |
| `npm run audit:links` | 통과, exit 0 | 소스 3,408편; broken page/image 0. `/private/tmp/adsense-double-check-links.log` |
| `npm run audit:sitemap` | 통과, exit 0 | built HTML 1,136; sitemap entries 580; noindex submitted 0, orphans 0. `/private/tmp/adsense-double-check-sitemap.log` |
| `npm run audit:ads` | 통과, exit 0 | 1,136 HTML 중 559편 AdSense 로드; ClientRouter 0, failures 0. `/private/tmp/adsense-double-check-ads.log` |
| `npm run audit:anchors` | 통과, exit 0 | fragment links 66; findings 0. `/private/tmp/adsense-double-check-anchors.log` |
| `npm run audit:reading` | 통과, exit 0 | 1,136 pages, 1,791 tables, 3,812 images, 135,353 links; 위반 0. `/private/tmp/adsense-double-check-reading.log` |
| `bash scripts/audit-publish-gate.sh` | non-strict 차단 검사 통과 | series integrity 178개 시리즈·3,403장, blocking 0·warning 0. 전체 로그 `/private/tmp/adsense-double-check-publish-gate.log`. 개별 내용 검사 경고를 사실 검증 통과로 해석하지 않음. |
| 대상 406편 inline math 검사 | 통과, exit 0 | 의도하지 않은 inline math 없음. `/private/tmp/adsense-double-check-inline-math.log` |

publish gate의 cited-symbol 검사는 Folly·Abseil·Linux CXL·PCIe upstream clone이 없어 **SKIPPED**였다. 해당 API·심볼을 확인했다고 기록하지 않는다.

빌드가 생성했다고 보고한 1,135 pages와 HTML 검사기의 1,136 pages는 각 도구의 집계값 그대로 기록했다. 일치한다고 표현하지 않는다. 기계 링크 검사는 라벨·번호·설명과 대상 글의 의미가 일치하는지 보증하지 않으므로 F 평가는 원문을 별도로 대조한다. 읽기 검사 통과도 모바일 육안 확인과 같지 않다.

## 게이트 상태

- `gate_status`: 조건부 통과
- `scope`: 위 커밋의 로컬 빌드·링크·sitemap·광고·읽기 정적 검사.
- `evidence`: 위 명령의 종료 코드와 로그, 표의 집계 결과.
- `owner`: 독립 재검토 담당.
- `next_action`: 글별 정확성·중복·의미상 링크 검토를 완료한다. Search Console 색인, AdSense 계정 ads.txt 상태, 실제 모바일 육안 렌더링은 이번 로컬 검사로 확인하지 않았다.

각 루프가 동일 원문 스냅샷을 검토하므로 공통 빌드 검사를 인용한다. 이 문서의 통과를 근거로 `factcheck: 검증됨` 또는 A~G 상향을 부여하지 않는다.
