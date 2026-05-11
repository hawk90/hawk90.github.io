---
title: "DSA 6: 스택 — 미로 탐색·표현식 평가"
date: 2026-03-02T10:00:00
description: "LIFO의 위력 — 함수 호출, 표현식 평가, 백트래킹의 토대."
tags: [Data Structure, Algorithm, Stack]
series: "Data Structures and Algorithms"
seriesOrder: 6
draft: false
---

## 한 줄 요약

> **"가장 마지막에 넣은 게 가장 먼저 나온다 (LIFO)"** — 함수 호출 스택, undo, 백트래킹 모두 같은 원리.

## 어떤 문제를 푸는가

- **함수 호출** — 호출 순서 역순으로 반환
- **표현식 평가** — `(a + b) * c` 같은 중첩 처리
- **괄호 매칭** — 짝 맞는지 검사
- **백트래킹** — 가다가 막히면 되돌아가기 (미로, N-Queens)
- **undo/redo** — 가장 최근 동작 취소

공통점: **가장 최근의 것**에 접근.

## 한눈에 보는 구조

```
push(C) →   [C]
            [B]
push(B)     [A]    ← top
push(A)
            top → A
            
pop()  →    [B]    ← A 반환, top 한 단계 아래
            [C]
```

연산:
- `push(x)` — top 위에 x 추가 — O(1)
- `pop()` — top 제거 + 반환 — O(1)
- `top()` / `peek()` — top 조회 (제거 X) — O(1)
- `empty()` — O(1)

## C++ 구현 — 배열 기반

```cpp
#include <stdexcept>

template<typename T, std::size_t N>
class ArrayStack {
    T data[N];
    int topIdx = -1;
public:
    void push(const T& x) {
        if (topIdx == N - 1) throw std::overflow_error("stack full");
        data[++topIdx] = x;
    }

    T pop() {
        if (topIdx < 0) throw std::underflow_error("stack empty");
        return data[topIdx--];
    }

    T top() const {
        if (topIdx < 0) throw std::underflow_error("stack empty");
        return data[topIdx];
    }

    bool empty() const { return topIdx < 0; }
    int size() const { return topIdx + 1; }
};
```

## C++ 구현 — STL 활용

```cpp
#include <stack>

std::stack<int> s;
s.push(1);
s.push(2);
s.push(3);
std::cout << s.top();   // 3
s.pop();                // 반환값 없음
std::cout << s.top();   // 2
```

`std::stack`은 **컨테이너 어댑터** — 내부적으로 `std::deque`(기본) / `vector` / `list` 사용.

## C 구현

```c
#include <stdio.h>
#include <stdlib.h>

#define STACK_SIZE 100

typedef struct {
    int data[STACK_SIZE];
    int top;
} Stack;

void stack_init(Stack* s) { s->top = -1; }

int  stack_empty(const Stack* s) { return s->top == -1; }
int  stack_full(const Stack* s)  { return s->top == STACK_SIZE - 1; }

void stack_push(Stack* s, int x) {
    if (stack_full(s)) { fprintf(stderr, "stack full\n"); exit(1); }
    s->data[++s->top] = x;
}

int stack_pop(Stack* s) {
    if (stack_empty(s)) { fprintf(stderr, "stack empty\n"); exit(1); }
    return s->data[s->top--];
}

int stack_top(const Stack* s) {
    if (stack_empty(s)) { fprintf(stderr, "stack empty\n"); exit(1); }
    return s->data[s->top];
}
```

## 응용 1 — 괄호 매칭

```cpp
#include <stack>
#include <string>

bool isBalanced(const std::string& s) {
    std::stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') st.push(c);
        else if (c == ')' || c == ']' || c == '}') {
            if (st.empty()) return false;
            char open = st.top(); st.pop();
            if ((c == ')' && open != '(') ||
                (c == ']' && open != '[') ||
                (c == '}' && open != '{')) return false;
        }
    }
    return st.empty();
}

isBalanced("({[]})");   // true
isBalanced("({[)}");    // false
```

## 응용 2 — 후위 표기식 (Postfix) 평가

`3 4 + 2 *` → `(3 + 4) * 2 = 14`.

```cpp
#include <stack>
#include <sstream>

int evalPostfix(const std::string& expr) {
    std::stack<int> st;
    std::istringstream iss(expr);
    std::string token;
    while (iss >> token) {
        if (isdigit(token[0])) {
            st.push(std::stoi(token));
        } else {
            int b = st.top(); st.pop();
            int a = st.top(); st.pop();
            switch (token[0]) {
                case '+': st.push(a + b); break;
                case '-': st.push(a - b); break;
                case '*': st.push(a * b); break;
                case '/': st.push(a / b); break;
            }
        }
    }
    return st.top();
}

evalPostfix("3 4 + 2 *");   // 14
```

## 응용 3 — 미로 탐색 (DFS 핵심)

스택으로 백트래킹 구현 — 막다른 길에서 이전 분기로 되돌아감.

```cpp
struct Pos { int r, c; };

bool dfsMaze(int maze[N][N], Pos start, Pos end) {
    std::stack<Pos> st;
    st.push(start);
    bool visited[N][N] = {false};

    while (!st.empty()) {
        Pos p = st.top(); st.pop();
        if (p.r == end.r && p.c == end.c) return true;
        if (visited[p.r][p.c]) continue;
        visited[p.r][p.c] = true;

        // 4방향 (상하좌우) 시도
        for (auto [dr, dc] : {std::pair{-1,0}, {1,0}, {0,-1}, {0,1}}) {
            int nr = p.r + dr, nc = p.c + dc;
            if (nr >= 0 && nr < N && nc >= 0 && nc < N
                && !maze[nr][nc] && !visited[nr][nc])
                st.push({nr, nc});
        }
    }
    return false;
}
```

→ DFS의 본질이 스택. (item 21)

## 시간/공간 복잡도

| 연산 | 시간 |
| --- | --- |
| push | O(1) |
| pop | O(1) |
| top | O(1) |
| empty | O(1) |

공간: O(n) — n개 원소.

## 트레이드오프 — 한눈에

| 차원 | Stack |
| --- | --- |
| LIFO 패턴 | ✅ 자연스러움 |
| 모든 연산 O(1) | ✅ |
| 임의 접근 | ❌ 불가 (top만) |
| 중간 삽입/삭제 | ❌ 불가 |

## 실제 사례

- 모든 언어의 **함수 호출 스택**
- **JVM / .NET CLR**의 평가 스택
- **컴파일러**의 표현식 파싱
- **에디터의 undo/redo**
- **DFS** (item 21)

## 다음

- [큐 / 원형 큐 / 덱](/blog/programming/data-structures-and-algorithms/item07-queue-deque)
