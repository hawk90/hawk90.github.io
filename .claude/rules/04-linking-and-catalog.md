---
paths:
  - "src/content/**"
  - "public/images/blog/**"
---

## 7. 교차 링크

### 같은 시리즈 안

이전/다음 + 직접 관련 항목.

```markdown
## 관련 항목

- [Ch 2: Header Files](/blog/programming/standards/google-cpp/chapter02-header-files)
- [Ch 4: Classes](/blog/programming/standards/google-cpp/chapter04-classes)
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

`src/consts/categories.ts`의 `CATEGORIES`가 정본입니다. 디렉터리(`src/content/blog/<id>/...`)는 거기 등록된 id에 맞춥니다. 하위 카테고리는 파일에서 확인합니다.

```text
최상위 id: programming systems embedded parallel ml media math writing
           philosophy science design tools security devops
예: programming/standards (Google C++·MISRA 등 코딩 표준), programming/code-review,
    systems/linux-kernel, embedded/rtos, ml/compilers, tools/debugging
```

새 시리즈를 만들 때 적합한 자리가 없으면 `categories.ts`에 추가할 카테고리를 사용자에게 제안합니다. 카테고리 변경은 사용자가 결정합니다(§13).

---

## 9. 시리즈 양산 워크플로

긴 시리즈(20+편)는 다음 순서로 진행합니다.

1. **스텁 생성** — 모든 챕터의 frontmatter + 빈 본문(또는 outline). `draft: true`.
2. **1편 파일럿** — 1편을 완성도 있게(도입을 겸함). 별도 overview/00- 글은 만들지 않는다(CLAUDE.md §13, 4개 예외 시리즈 제외).
3. **사용자 확인** — 톤·구조·예시 깊이가 맞는지 검토.
4. **양산** — 2편부터 끝까지. 5~6편씩 묶어 커밋.
5. **마무리** — 마지막 글에 시리즈 요약 + 다음 추천 시리즈.

각 단계가 끝날 때마다 `npm run build`로 빌드 검증.

