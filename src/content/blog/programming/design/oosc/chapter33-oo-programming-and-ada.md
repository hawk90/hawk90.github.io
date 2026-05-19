---
title: "Ch 33: O-O Programming and Ada"
date: 2026-05-19T09:00:00
description: "Ada에서의 OO 프로그래밍 — 패키지, 태그 타입."
series: "Object-Oriented Software Construction"
seriesOrder: 33
tags: [oop, meyer, ada, tagged-types, packages]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> Ada는 **패키지**로 모듈화를, **태그 타입**으로 다형성을 지원한다. 완전한 OO 언어는 아니지만, Ada 95 이후로 OO 프로그래밍이 가능해졌다.

## Ada의 진화

### Ada 83 — 모듈 지향

| Ada 83의 특징 | 설명 |
|--------------|------|
| 패키지 (Package) | 모듈화 단위 |
| 제네릭 (Generic) | 파라미터화된 모듈 |
| 태스크 (Task) | 동시성 |
| 예외 처리 | — |

| OO 관점에서 부족한 것 |
|--------------------|
| 상속 없음 |
| 다형성 없음 |
| 동적 바인딩 없음 |
| 메서드 없음 (프로시저만) |

**결론**: "객체 기반(Object-Based)"이지 "객체지향(Object-Oriented)"은 아님.

### Ada 95 — OO 확장

| Ada 95의 OO 추가 기능 | 설명 |
|---------------------|------|
| 태그 타입 (Tagged Types) | 상속 지원, 동적 바인딩 |
| 클래스와이드 타입 (Class-Wide Types) | 다형적 참조 |
| 추상 타입 (Abstract Types) | 지연된 구현 |
| 제어된 타입 (Controlled Types) | 초기화/종료화 |
| 자식 패키지 (Child Packages) | 상속 계층 구조 |

## 패키지

### 패키지란

```ada
-- 패키지 명세 (Specification)
package Stack_Package is
    type Stack is private;

    procedure Push (S : in out Stack; Item : Integer);
    procedure Pop (S : in Out Stack; Item : out Integer);
    function Is_Empty (S : Stack) return Boolean;

private
    Max_Size : constant := 100;

    type Stack is record
        Data  : array (1..Max_Size) of Integer;
        Top   : Integer := 0;
    end record;
end Stack_Package;

-- 패키지 본체 (Body)
package body Stack_Package is
    procedure Push (S : in out Stack; Item : Integer) is
    begin
        S.Top := S.Top + 1;
        S.Data (S.Top) := Item;
    end Push;

    procedure Pop (S : in Out Stack; Item : out Integer) is
    begin
        Item := S.Data (S.Top);
        S.Top := S.Top - 1;
    end Pop;

    function Is_Empty (S : Stack) return Boolean is
    begin
        return S.Top = 0;
    end Is_Empty;
end Stack_Package;
```

### 패키지 vs 클래스

| 패키지 | 클래스 |
|-------|-------|
| 명세(인터페이스)와 본체(구현) 분리 | 단일 타입 정의 |
| private 섹션으로 캡슐화 | 속성과 메서드 통합 |
| 여러 타입을 포함 가능 | 상속 계층 형성 |
| 타입과 연산의 집합 | 인스턴스 생성 가능 |

**핵심 차이**: 패키지 ≠ 클래스. 패키지 = 모듈. 태그 타입 ≈ 클래스.

### 제네릭 패키지

```ada
-- 제네릭 패키지 명세
generic
    type Element_Type is private;
package Generic_Stack is
    type Stack is private;

    procedure Push (S : in out Stack; Item : Element_Type);
    procedure Pop (S : in Out Stack; Item : out Element_Type);
    function Is_Empty (S : Stack) return Boolean;

private
    Max_Size : constant := 100;

    type Stack is record
        Data  : array (1..Max_Size) of Element_Type;
        Top   : Integer := 0;
    end record;
end Generic_Stack;

-- 인스턴스화
package Integer_Stack is new Generic_Stack (Element_Type => Integer);
package String_Stack is new Generic_Stack (Element_Type => String);
```

## 태그 타입

### 태그 타입이란

```ada
-- 태그 타입 선언 (루트 타입)
package Figures is
    type Figure is tagged record
        X, Y : Float := 0.0;
    end record;

    procedure Move (F : in Out Figure; Dx, Dy : Float);
    function Area (F : Figure) return Float;  -- 기본 구현
end Figures;

-- 태그 타입 구현
package body Figures is
    procedure Move (F : in Out Figure; Dx, Dy : Float) is
    begin
        F.X := F.X + Dx;
        F.Y := F.Y + Dy;
    end Move;

    function Area (F : Figure) return Float is
    begin
        return 0.0;  -- 기본값
    end Area;
end Figures;
```

### 타입 확장 (상속)

```ada
-- 자식 패키지에서 타입 확장
package Figures.Rectangles is
    type Rectangle is new Figure with record
        Width, Height : Float := 1.0;
    end record;

    -- Area 재정의
    overriding function Area (R : Rectangle) return Float;

    -- 새 연산 추가
    function Perimeter (R : Rectangle) return Float;
end Figures.Rectangles;

package body Figures.Rectangles is
    overriding function Area (R : Rectangle) return Float is
    begin
        return R.Width * R.Height;
    end Area;

    function Perimeter (R : Rectangle) return Float is
    begin
        return 2.0 * (R.Width + R.Height);
    end Perimeter;
end Figures.Rectangles;

-- 또 다른 확장
package Figures.Circles is
    type Circle is new Figure with record
        Radius : Float := 1.0;
    end record;

    overriding function Area (C : Circle) return Float;
end Figures.Circles;
```

### 클래스와이드 타입

```ada
-- 클래스와이드 타입으로 다형성
procedure Process_Figure (F : in Out Figure'Class) is
begin
    -- F가 어떤 구체 타입이든 동적 바인딩
    Move (F, 10.0, 20.0);
    Put_Line ("Area: " & Float'Image (Area (F)));
end Process_Figure;

-- 사용
declare
    R : Rectangle;
    C : Circle;
begin
    R.Width := 5.0;
    R.Height := 3.0;
    C.Radius := 2.0;

    Process_Figure (R);  -- Rectangle의 Area 호출
    Process_Figure (C);  -- Circle의 Area 호출
end;
```

### 클래스와이드 접근 타입

```ada
-- 클래스와이드 포인터
type Figure_Ptr is access Figure'Class;

-- 다형적 컬렉션
type Figure_Array is array (Positive range <>) of Figure_Ptr;

-- 사용
Figures : Figure_Array (1..3);

Figures (1) := new Rectangle'(X => 0.0, Y => 0.0,
                               Width => 5.0, Height => 3.0);
Figures (2) := new Circle'(X => 1.0, Y => 1.0, Radius => 2.0);
Figures (3) := new Rectangle'(X => 2.0, Y => 2.0,
                               Width => 4.0, Height => 4.0);

-- 순회
for I in Figures'Range loop
    Put_Line ("Area: " & Float'Image (Area (Figures (I).all)));
end loop;
```

## 추상 타입

### 추상 타입과 추상 연산

```ada
package Shapes is
    -- 추상 태그 타입
    type Shape is abstract tagged record
        X, Y : Float := 0.0;
    end record;

    -- 추상 연산 (반드시 재정의해야 함)
    function Area (S : Shape) return Float is abstract;
    function Perimeter (S : Shape) return Float is abstract;

    -- 구체 연산 (상속됨)
    procedure Move (S : in Out Shape; Dx, Dy : Float);
end Shapes;

-- 구체 타입
package Shapes.Rectangles is
    type Rectangle is new Shape with record
        Width, Height : Float;
    end record;

    -- 추상 연산 구현 필수
    overriding function Area (R : Rectangle) return Float;
    overriding function Perimeter (R : Rectangle) return Float;
end Shapes.Rectangles;
```

### Eiffel 비교

```ada
-- Ada
type Shape is abstract tagged ...
function Area (S : Shape) return Float is abstract;
```

```eiffel
-- Eiffel
deferred class SHAPE
feature
    area: REAL
        deferred
        end
end
```

| 유사점 | 차이점 |
|-------|--------|
| 인스턴스화 불가 | Ada는 타입과 연산 분리 |
| 하위 타입에서 구현 필수 | Eiffel은 클래스 안에 피처 통합 |

## 제어된 타입

### 초기화와 종료화

```ada
with Ada.Finalization;

package Managed_Resources is
    type Resource is new Ada.Finalization.Controlled with record
        Handle : Integer := 0;
    end record;

    -- 초기화 (생성 시 호출)
    overriding procedure Initialize (R : in Out Resource);

    -- 조정 (대입 시 호출)
    overriding procedure Adjust (R : in Out Resource);

    -- 종료화 (소멸 시 호출)
    overriding procedure Finalize (R : in Out Resource);
end Managed_Resources;

package body Managed_Resources is
    overriding procedure Initialize (R : in Out Resource) is
    begin
        R.Handle := Acquire_Resource;
        Put_Line ("Resource acquired: " & Integer'Image (R.Handle));
    end Initialize;

    overriding procedure Adjust (R : in Out Resource) is
    begin
        -- 깊은 복사 필요 시
        R.Handle := Duplicate_Resource (R.Handle);
    end Adjust;

    overriding procedure Finalize (R : in Out Resource) is
    begin
        Release_Resource (R.Handle);
        Put_Line ("Resource released: " & Integer'Image (R.Handle));
    end Finalize;
end Managed_Resources;
```

### Eiffel과의 비교

| Ada Controlled 타입 | Eiffel |
|--------------------|--------|
| Initialize → 생성 후 자동 호출 | creation 절의 make → 명시적 호출 필요 |
| Adjust → 대입 후 자동 호출 | copy → 명시적 호출 또는 := 시 자동 |
| Finalize → 소멸 전 자동 호출 | dispose → GC에 의존 (명시적 불가) |

**차이**: Ada는 결정적(deterministic) 종료화, Eiffel은 GC 기반 비결정적 종료화.

## 인터페이스

### Ada 2005 인터페이스

```ada
-- 인터페이스 정의
package Interfaces is
    type Drawable is interface;
    procedure Draw (D : Drawable) is abstract;

    type Serializable is interface;
    procedure Save (S : Serializable; File : String) is abstract;
    procedure Load (S : in Out Serializable; File : String) is abstract;
end Interfaces;

-- 다중 인터페이스 구현
package Shapes.Drawable_Rectangles is
    type Drawable_Rectangle is new Rectangle
        and Drawable
        and Serializable with null record;

    overriding procedure Draw (D : Drawable_Rectangle);
    overriding procedure Save (S : Drawable_Rectangle; File : String);
    overriding procedure Load (S : in Out Drawable_Rectangle; File : String);
end Shapes.Drawable_Rectangles;
```

### Eiffel 다중 상속과의 비교

| Ada 2005 | Eiffel |
|---------|--------|
| 단일 태그 타입 상속 | 다중 클래스 상속 |
| 다중 인터페이스 구현 | 이름 충돌 시 rename, redefine |
| 다이아몬드 문제 회피 | 다이아몬드 상속 허용 (명시적 해결) |

| Ada의 제한 |
|-----------|
| 구현 상속은 단일 |
| 인터페이스만 다중 |
| Java와 유사한 모델 |

## OO 비교

### Ada vs Eiffel

| 특성 | Ada | Eiffel |
|------|-----|--------|
| 캡슐화 | 패키지 + private 섹션 | export 절 (피처별 세밀한 제어) |
| 상속 | `is new ... with` 구문 | inherit 절 |
| 다형성 | `'Class` 접미사 (`Figure'Class`) | 자동 (상위 타입 참조) |
| 동적 바인딩 | 클래스와이드 파라미터일 때만 | 항상 (명시적 frozen 제외) |
| 계약 | pragma Assert (Ada 2012: Pre/Post) | require, ensure, invariant (언어 내장) |
| 제네릭 | 컴파일 타임 인스턴스화 | 타입 파라미터 (런타임 유지) |

### 문법 비교

```ada
-- Ada
package body Stack_Package is
    procedure Push (S : in Out Stack; Item : Integer) is
    begin
        S.Top := S.Top + 1;
        S.Data (S.Top) := Item;
    end Push;
end Stack_Package;
```

```eiffel
-- Eiffel
class STACK [G]
feature
    push (item: G)
        do
            top := top + 1
            data.put (item, top)
        end
end
```

### 장단점

| Ada의 장점 | Ada의 단점 |
|-----------|-----------|
| 엄격한 타입 검사 | 문법이 장황함 |
| 결정적 자원 관리 | 계약이 언어에 완전 통합되지 않음 (Ada 2012 이전) |
| 실시간/안전 시스템에 적합 | 제네릭 인스턴스화 필요 |
| 표준화된 동시성 | 동적 바인딩이 암묵적이지 않음 |

## Ada에서 OO 설계

### 패키지 구조

**권장 구조**: 루트 패키지 → 추상 타입, 자식 패키지 → 구체 타입.

```text
Vehicles                   -- 추상 Vehicle 타입
├── Vehicles.Cars          -- Car 타입
├── Vehicles.Trucks        -- Truck 타입
└── Vehicles.Motorcycles   -- Motorcycle 타입
```

| 이점 |
|------|
| 상속 계층이 패키지 계층에 반영 |
| private 파트 접근 가능 |
| 논리적 그룹화 |

### 다형적 컨테이너

```ada
-- 다형적 컨테이너
with Ada.Containers.Vectors;

package Figure_Containers is
    package Figure_Vectors is new Ada.Containers.Vectors
        (Index_Type   => Positive,
         Element_Type => Figure_Ptr);

    type Figure_List is new Figure_Vectors.Vector with null record;

    procedure Draw_All (List : Figure_List);
    function Total_Area (List : Figure_List) return Float;
end Figure_Containers;
```

## 정리

- **Ada 83**: 객체 기반 — 패키지로 캡슐화, 상속 없음
- **Ada 95**: 객체지향 추가 — 태그 타입, 타입 확장
- **클래스와이드 타입**: `Figure'Class`로 다형성
- **추상 타입**: `is abstract`로 인스턴스화 방지
- **제어된 타입**: 결정적 초기화/종료화
- **인터페이스**: Ada 2005에서 다중 인터페이스

## 다음 장 예고

Chapter 34에서는 **비OO 환경에서의 OO 에뮬레이션**을 다룬다. C, Fortran에서 객체지향 패턴을 어떻게 흉내 낼 수 있는가.

## 관련 항목

- [Ch 32: GUI를 위한 OO 기법](/blog/programming/design/oosc/chapter32-oo-techniques-for-gui) — 이벤트 기반
- [Ch 35: Simula to Java](/blog/programming/design/oosc/chapter35-simula-to-java-and-beyond) — 언어 비교
- [Ch 10: Genericity](/blog/programming/design/oosc/chapter10-genericity) — 제네릭
