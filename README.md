# hawk90.github.io

장문 기술 글을 쓰는 개인 블로그입니다. Astro로 빌드하고 GitHub Pages로 배포합니다.

이 문서는 **저장소를 운영하는 사람**을 위한 것입니다. 글쓰기 규칙과 자동화 지도는
[CLAUDE.md](./CLAUDE.md)가 정본이고, 스크립트 개별 설명은
[scripts/README.md](./scripts/README.md)에 있습니다. 이 README는 그 둘을 가리키고,
같은 내용을 다시 적지 않습니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # dist/ 생성. 발행 3387편 중 draft 아닌 것만 페이지가 됩니다
```

Node는 `.nvmrc`와 `engines`에 명시된 버전을 씁니다.

## 콘텐츠가 사는 곳

글은 `src/content/blog/` 아래 `.md`입니다. frontmatter 필수 필드와 톤 규칙은
[CLAUDE.md §1~§4](./CLAUDE.md)에 있습니다.

**URL은 파일 경로입니다.** `src/content/blog/embedded/hardware/cxl/chapter12.md`는
`/blog/embedded/hardware/cxl/chapter12`가 됩니다. 그래서 파일을 옮기면 발행된 URL이
깨집니다. 이 규칙은 `src/lib/utils.ts`의 `getPostUrl` 한 곳에만 적혀 있고,
`audit:portability`가 다른 데서 URL을 손으로 조립하면 빌드를 세웁니다.

다이어그램은 글 옆에 `.tex`로 두고 `npm run diagrams`로 SVG를 만듭니다.
`math/linear-algebra/**`는 `../book-notes/`에서 동기화되므로 직접 고치지 않습니다.

## 무엇이 커밋·발행을 막는가

lefthook이 설치돼 있으면(`lefthook install`) commit·push 때 자동으로 돕니다.

| 시점 | 검사 |
|------|------|
| commit | staged `.md`에 발행 게이트 + frontmatter 검사 + 태그 정규화 |
| push | push되는 커밋의 변경 파일에 발행 게이트 |
| 수동 | `npm run audit:gate` (전체), `npm run verify:release` (배포 아티팩트) |

게이트를 우회하려면 `--no-verify`를 쓰되, 우회했으면 `npm run audit:gate`를 따로
돌립니다. 어떤 단계에 어떤 도구가 있는지는 [CLAUDE.md §14](./CLAUDE.md)의 표가 정본입니다.

## 자주 쓰는 것만

전체 목록은 `npm run`으로 보거나 [scripts/README.md](./scripts/README.md)를 봅니다.

| 명령 | 하는 일 |
|------|---------|
| `npm run check` | 타입·콘텐츠 스키마 검사 |
| `npm run audit:gate` | 발행 전 통합 게이트 |
| `npm run verify:release` | 빌드 + 보안·시크릿 게이트까지 |
| `npm run diagrams:watch` | `.tex` 저장 시 SVG 자동 재빌드 |
| `npm run audit:reading` | 빌드된 HTML의 읽기 경험 감사 |
| `npm run og` | OG 카드 생성 (`public/og/`, gitignore됨) |

## 배포

GitHub Pages입니다. 서버 라우트가 없으므로 `output: 'static'`이고, 관리자 화면은
PAT 전용입니다. OAuth 콜백 라우트를 이 프로젝트에 추가하면 안 됩니다 —
별도 서버가 필요합니다.

저장소·배포가 날아갔을 때의 복구 순서는
[docs/runbooks/repository-recovery.md](./docs/runbooks/repository-recovery.md)에
있습니다. 아직 한 번도 실행해 보지 않은 절차라는 점이 문서에 명시돼 있습니다.

## 설정

사이트 제목·네비게이션·댓글·뉴스레터 등은 `src/consts/config.ts` 한 파일에 모여
있습니다. 각 `define*` 헬퍼는 런타임에는 항등 함수이고 편집 시 타입만 잡아 줍니다.
전체 설정 표면은 `src/lib/define.ts`의 JSDoc에 있습니다.

## 라이선스

[LICENSE](./LICENSE) 참조.
