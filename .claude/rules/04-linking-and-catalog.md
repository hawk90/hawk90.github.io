## 7. 교차 링크

### 같은 시리즈 안

이전/다음 + 직접 관련 항목.

```markdown
## 관련 항목

- [Ch 2: Header Files](/blog/embedded/standards/google-cpp/chapter02-header-files)
- [Ch 4: Classes](/blog/embedded/standards/google-cpp/chapter04-classes)
```

### 다른 시리즈로

개념이 겹치는 글을 1~2개 골라 링크. 너무 많으면 노이즈.

```markdown
- [Refactoring Ch 6: Extract Function](/blog/programming/design/refactoring/ch06) — sprout의 일반화
- [Clean Architecture Ch 11: DIP](/blog/programming/design/clean-architecture/chapter11-dip-the-dependency-inversion-principle)
```

링크 뒤에 짧은 설명(`— ...`)이 있으면 클릭 결정에 도움이 됩니다.

### 원문 / 외부

책 요약이나 가이드 정리는 원문 링크를 꼭 둡니다.

```markdown
- [원문 — Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html)
```

---

## 8. 카테고리

`src/consts/categories.ts`에 정의된 상위/하위 카테고리에 맞게 디렉터리를 정합니다.

```
programming/cpp        — C/C++ 언어
programming/design     — 디자인 패턴, 아키텍처
programming/algorithms — 자료구조, 알고리즘
programming/engineering — 소프트웨어 공학 (TDD, Legacy, Refactoring)
programming/git        — Git

systems                — OS, 커널, 시스템 프로그래밍
embedded               — RTOS, MCU, 트러블슈팅
embedded/standards     — MISRA, CERT, AUTOSAR, Google C++

parallel               — 병렬·동시성
math                   — 선형대수, 집합론
writing                — 영문/한국어/학술 글쓰기
thinking               — 디자인·철학
code-review            — 코드 리뷰
tools                  — Vim, tmux, CLI, 디버거
media                  — 영상·오디오 코덱
media/av1              — AV1
```

새 시리즈를 만들 때 적합한 자리가 없으면 `categories.ts`에 카테고리를 추가합니다.

---

## 9. 시리즈 양산 워크플로

긴 시리즈(20+편)는 다음 순서로 진행합니다.

1. **스텁 생성** — 모든 챕터의 frontmatter + 빈 본문(또는 outline). `draft: true`.
2. **개요 + 1편 파일럿** — 시리즈 개요(00-overview)와 1편을 완성도 있게.
3. **사용자 확인** — 톤·구조·예시 깊이가 맞는지 검토.
4. **양산** — 2편부터 끝까지. 5~6편씩 묶어 커밋.
5. **마무리** — 마지막 글에 시리즈 요약 + 다음 추천 시리즈.

각 단계가 끝날 때마다 `npm run build`로 빌드 검증.

