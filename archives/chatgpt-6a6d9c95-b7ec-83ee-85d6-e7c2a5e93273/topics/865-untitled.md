---
title: "/"
source_message: 64
source_role: assistant
---

#
/
```

다음 기술 식별자 때문이다.

```text
C++
MSI-X
H.264
CXL.io
std::vector
foo_bar
C#
H2D/D2H
```

---

## 보조 정규화 형태

검색어 하나에 여러 normalized form을 만들 수 있다.

예:

```text
MSI-X
```

에서:

```text
msi-x
msix
msi x
```

를 생성한다.

```ts
export interface NormalizedQuery {
  original: string;
  primary: string;
  compact: string;
  tokens: readonly string[];
}
```

```ts
export function normalizeQuery(
  query: string,
): NormalizedQuery {
  const primary =
    normalizeSearchText(query);

  return {
    original: query,
    primary,
    compact:
      primary.replace(/[\s_-]+/g, ""),
    tokens:
      tokenizeTechnicalQuery(primary),
  };
}
```

---
