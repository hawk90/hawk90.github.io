---
title: "Chapter 7: Lambda Architecture"
date: 2026-05-06T07:00:00
description: "배치 + 스트리밍 통합 — Hadoop/Storm/Spark. 정확성과 실시간성의 트레이드오프."
series: "Seven Concurrency Models in Seven Weeks"
seriesOrder: 7
tags: [parallel, concurrency, book-review, lambda-architecture, hadoop, storm, spark, distributed]
type: book-review
bookTitle: "Seven Concurrency Models in Seven Weeks"
bookAuthor: "Paul Butcher"
draft: false
---

> **Seven Concurrency Models in Seven Weeks** Chapter 7 요약

## 분산 데이터의 새로운 도전

지금까지 본 모델은 한 머신 안의 동시성, 또는 몇 대의 머신을 잇는 actor 분산이었습니다. 이번 모델은 **수백에서 수천 대의 머신이 PB급 데이터를 처리**하는 세계입니다. 데이터 자체가 한 머신에 들어가지 않는 규모이기 때문에, 동시성의 정의가 다시 한 번 확장됩니다.

| 영역 | 데이터 규모 | 핵심 가정 |
|------|-------------|-----------|
| 단일 머신 | GB ~ TB | 메모리·디스크가 한 곳 |
| Actor 분산 | TB | 노드 단위 격리, 메시지 |
| Lambda Architecture | TB ~ PB ~ EB | 머신은 언제든 죽는다 |

세 가지 전제가 새로 들어옵니다. 첫째, 데이터가 디스크에 분산되어 *디스크 지역성*이 성능을 좌우합니다. 둘째, 네트워크는 디스크보다 느리고 디스크는 메모리보다 느린 *성능 계층*이 명확합니다. 셋째, 노드 고장은 예외가 아니라 *상시 발생하는 사건*입니다. Nathan Marz가 제안한 Lambda Architecture는 이 세 전제를 그대로 받아들이고 두 갈래 처리 경로로 응답합니다.

3일에 걸친 학습 흐름은 다음과 같습니다.

| Day | 주제 | 도구 | 얻는 것 |
|-----|------|------|--------|
| 1 | MapReduce | Hadoop streaming | 함수형 변환의 분산 실행 |
| 2 | Batch Layer | Hadoop + Cascalog | 마스터 데이터셋과 batch view |
| 3 | Speed Layer | Storm | 실시간 토폴로지와 merge |

Day 1은 분산 처리의 *원리*입니다. Day 2는 그 원리를 *아키텍처*로 키웁니다. Day 3는 시간 축에 *실시간 보정*을 더해 그림을 완성합니다.

## 직관 — 왜 두 파이프라인이 같은 데이터를 처리하는가

Lambda Architecture의 모양이 낯설게 느껴지는 가장 큰 이유는 *같은 데이터를 두 번 처리한다*는 점입니다. 비즈니스 요구를 잠깐 들여다보면 이유가 또렷해집니다. 광고 플랫폼이라면 *어제까지의 정산은 한 푼도 틀리면 안 되고*, *오늘의 클릭은 30초 안에 대시보드에 보여야* 합니다. 두 요구를 한 시스템이 동시에 만족하는 것은 불가능에 가깝습니다. 정확성을 우선하면 전체 데이터를 다시 훑어야 하니 느리고, 속도를 우선하면 메모리 안의 근사값이라 누락이나 중복을 피하기 어렵습니다.

Lambda Architecture는 이 갈등을 *시간 축으로 분할*하는 발상입니다. *어제까지의 정확한 답*은 batch가 책임지고, *어제 자정 이후의 대략적인 보정*은 speed가 채웁니다. 두 결과를 합치면 *오늘 이 순간까지의 답*이 됩니다. 같은 데이터를 두 번 처리한다는 비효율을 *정확성과 지연을 동시에 만족하는* 대가로 받아들이는 것이 핵심입니다.

| 비즈니스 요구 | 단일 시스템의 한계 | Lambda의 답 |
|--------------|------------------|------------|
| 어제까지 *정확한* 정산 | 정확성을 위해 전체 재처리 → 느림 | Batch layer가 책임 |
| 오늘 *지금까지*의 실시간 지표 | 메모리 근사값 → 누락·중복 | Speed layer가 책임 |
| 두 요구를 동시에 | 한 엔진이 둘 다 잘하기 어렵다 | 두 view를 merge |

## Day 1 — MapReduce: Google 2004 paper의 영향

**직관** — *수만 권의 책*이 도서관에 흩어져 있고, 한 단어가 전체에 몇 번 등장하는지 세어야 한다고 해 봅시다. 한 사람이 모든 책을 들고 다닐 수는 없습니다. 합리적인 방법은 *책을 한 권씩 여러 사람에게 나눠* 각자 자기 책에서만 단어를 세게 하고(map), *그 결과를 모아 합산하는*(reduce) 것입니다. MapReduce는 이 발상을 컴퓨터 클러스터로 옮긴 모델입니다. 데이터를 한 머신에 모으는 대신 *연산을 데이터가 있는 곳으로* 보냅니다.

MapReduce는 2004년 Google의 OSDI 논문에서 처음 공개된 모델입니다. 논문은 두 가지를 분리합니다. 위에는 *map과 reduce 함수만 작성하는* 사용자 코드를 두고, 아래에는 *파티셔닝·재시도·셔플·장애 복구를 처리하는* 런타임을 둡니다. 사용자는 함수형 변환을 쓰고, 인프라가 분산의 어려운 부분을 책임집니다. Hadoop은 이 모델을 그대로 오픈소스로 구현한 결과물입니다.

책은 이 분리를 강조합니다. 동시성 모델로서 MapReduce가 의미 있는 이유는 *순수한 변환 함수*만 작성하면 분산 실행이 자동으로 된다는 데 있습니다. 부수효과가 있으면 재시도가 안 되고, 키 의존이 있으면 셔플이 의미를 잃기 때문에, 함수형 사고가 전제입니다.

## Mapper, Reducer, Shuffle, Sort

**직관** — 다섯 단계는 *우편물 분류 센터의 하루*에 비유할 수 있습니다. 트럭이 우편물을 *덩어리 단위*로 부립니다(Input split). 직원들이 자기 책상에서 우편물을 *지역명 라벨로 정리*합니다(Map). 같은 책상에서 정리한 *같은 지역 묶음*은 책상에서 미리 묶어 둡니다(Combiner). 그 다음 *지역별로 다른 차고지로 옮겨* 같은 지역끼리 모입니다(Shuffle & Sort). 마지막으로 차고지에서 *최종 배달 순서를 정해 합칩니다*(Reduce). Shuffle이 비싼 이유는 직원 책상에서 차고지까지의 *대규모 이동*에 해당하기 때문이고, Combiner가 절감해 주는 것은 *그 이동의 양*입니다.

데이터 파이프라인은 다섯 단계로 흐릅니다.

| 단계 | 역할 | 비고 |
|------|------|------|
| Input split | 입력을 블록 단위로 쪼개 mapper에 분배 | HDFS block과 정렬 |
| Map | 레코드를 `(key, value)`로 변환 | 무상태, 병렬 |
| Combiner | mapper 노드 안에서 *부분 reduce* 수행 | 네트워크 트래픽 절감 |
| Shuffle & Sort | 같은 key를 같은 reducer로 모으고 정렬 | 가장 비싼 단계 |
| Reduce | 같은 key의 values를 집계 | 결과를 HDFS에 기록 |

Shuffle은 모든 mapper의 출력을 모든 reducer로 옮기는 *all-to-all* 단계입니다. Combiner를 둘 수 있다면 mapper 측에서 합산을 미리 끝내 네트워크 양을 크게 줄일 수 있습니다. WordCount에서는 reducer와 combiner의 로직이 같지만, 일반적으로는 *교환·결합 법칙이 성립하는 연산*만 combiner로 안전합니다.

평균을 구하는 잡을 생각하면 차이가 분명해집니다. Reducer는 `(sum, count)`를 입력으로 받아 `sum/count`를 반환합니다. 그러나 combiner가 같은 일을 하면, 평균의 평균은 *전체 평균과 다릅니다*. 따라서 combiner는 `(sum, count)` 쌍을 *그대로 합산*하는 별도 함수여야 하고, 최종 나눗셈은 reducer만 합니다. 책은 이 차이를 강조하며 *분산 처리에서 함수의 대수적 성질이 곧 안전성*임을 짚습니다.

## Wikipedia Word Count — Hadoop streaming

책은 Hadoop streaming을 통해 표준 입출력만 쓰는 Python mapper/reducer를 보여 줍니다. 자바를 직접 쓰지 않아도 분산 실행이 가능하다는 점을 보이기 위함입니다.

코드 직전에 *각 스크립트가 무엇을 하는지* 짚어 둡니다. `mapper.py`는 *책 한 권을 받은 사람*에 해당합니다. 한 줄씩 읽어 단어를 쪼개고 *“이 단어가 한 번 나왔다”*라는 메모를 표준 출력으로 토해냅니다. `reducer.py`는 *같은 단어 메모를 모으는 집계자*입니다. Hadoop이 같은 단어가 항상 같은 reducer에 모이도록 셔플을 마친 뒤이므로, reducer는 *연속해서 들어오는 같은 단어*의 카운트만 더하면 됩니다.

```python
# mapper.py
import sys

for line in sys.stdin:
    for word in line.strip().split():
        print(f"{word}\t1")
```

```python
# reducer.py
import sys

current_word = None
current_count = 0

for line in sys.stdin:
    word, count = line.strip().split("\t")
    count = int(count)
    if word == current_word:
        current_count += count
    else:
        if current_word is not None:
            print(f"{current_word}\t{current_count}")
        current_word = word
        current_count = count

if current_word is not None:
    print(f"{current_word}\t{current_count}")
```

```bash
hadoop jar hadoop-streaming.jar \
    -input  /wiki/articles \
    -output /wiki/wordcount \
    -mapper  mapper.py \
    -reducer reducer.py
```

이 명령은 *“위 두 스크립트를 클러스터에 배포해 분산 실행하라”*는 한 줄 지시입니다. Hadoop은 `/wiki/articles` 아래 블록들을 mapper에 나눠 주고, 셔플로 같은 단어를 같은 reducer에 모아 주고, reducer 결과를 `/wiki/wordcount`에 모아 저장합니다. 사용자는 분산의 어려운 부분은 건드리지 않고 *map과 reduce 함수만 작성*한 셈입니다.

입력이 `Hello world, Hello there, world is wide`라면 흐름은 다음과 같습니다.

![MapReduce flow](/images/blog/seven-concurrency-models/diagrams/ch07-mapreduce-flow.svg)

## HDFS — block size와 replication

**직관** — *책 한 권*을 한 도서관에만 두면 그 도서관이 불타는 순간 책은 사라집니다. HDFS의 발상은 단순합니다. 같은 책을 *세 곳의 도서관에 복사*해 둡니다. 한 곳이 불타도 다른 두 곳에 책이 있으니 데이터는 살아남습니다. 더 나아가 *분산된 사본이 분산된 연산에 가깝다*는 점도 함께 얻습니다. mapper를 띄울 때 *책이 있는 도서관에서 일하게* 하면 네트워크로 책을 옮길 필요가 없습니다. 데이터 복제와 데이터 지역성이 *같은 설계의 양면*이라는 점이 HDFS의 핵심입니다.

MapReduce가 의미를 가지려면 입력이 *지역적으로* 분산되어 있어야 합니다. HDFS는 이 전제를 떠받치는 파일 시스템입니다.

| 항목 | 기본값 | 이유 |
|------|--------|------|
| Block size | 64 MB ~ 128 MB | 큰 블록으로 시크 비용 분산 |
| Replication factor | 3 | 노드 고장에도 데이터 유지 |
| NameNode | 마스터 | 메타데이터, 블록 위치 |
| DataNode | 워커 | 실제 블록 저장 |

블록이 크기 때문에 mapper는 *블록 단위로* 분할됩니다. 스케줄러는 *블록이 있는 노드에서 mapper를 띄우려고* 시도해 네트워크 전송을 줄입니다. 이 *데이터 지역성(data locality)*이 MapReduce 성능의 핵심입니다. Replication 3은 두 노드가 동시에 죽어도 데이터가 살아남는 안전 마진을 제공합니다.

![HDFS block + replication](/images/blog/seven-concurrency-models/diagrams/ch07-hdfs-replication.svg)

## N-gram과 Co-occurrence

**직관** — Bigram은 *“이 단어 다음에 어떤 단어가 자주 오는가”*를 세는 일입니다. WordCount가 한 단어의 빈도를 셌다면, bigram은 *단어 쌍*의 빈도를 셉니다. Co-occurrence는 한발 더 나가, *같은 문장 안에 함께 등장한 단어 쌍*을 셉니다. 발상이 같으니 mapper/reducer의 *기본 골격*도 같습니다. 키만 *단어*에서 *(단어, 단어)*로 바뀌었을 뿐입니다. 한 도구로 *완전히 다른 분석*을 풀어내는 능력이 MapReduce의 매력이라는 점이 여기서 보입니다.

책은 WordCount 이외에도 두 가지 예제로 MapReduce 사고법을 넓힙니다.

| 예제 | Mapper 출력 | Reducer 역할 |
|------|------------|-------------|
| Bigram | `(word_i, word_{i+1}) → 1` | 쌍의 빈도 합산 |
| Co-occurrence | `(word, neighbor) → 1` | 같은 문장 안 동시 등장 빈도 |
| Inverted index | `(term, docId)` | term별 docId 리스트 |

Bigram에서는 *문장 경계*를 어떻게 처리할지가 까다롭습니다. 한 줄이 mapper 둘로 쪼개지면 경계의 쌍을 놓치기 때문입니다. 책은 입력 형식을 고민하는 것 자체가 MapReduce 설계의 일부라고 짚습니다. Co-occurrence는 텍스트 분석·추천 시스템의 출발점이고, 같은 형태의 mapper/reducer로 *어휘 의미를 통계적으로* 잡아낼 수 있다는 점을 보여 줍니다.

Inverted index 예제는 더 깊이 들어가면 *검색 엔진의 토대*입니다. Mapper가 `(term, docId)`를 방출하면 reducer가 같은 term의 docId 목록을 모읍니다. 추가로 *문서 안 위치*를 함께 방출하면 구절 검색까지 지원하는 *positional index*가 됩니다.

코드 직전에 *이 mapper가 무엇을 만드는지* 정리합니다. 한 줄에 `docId<TAB>본문` 형태로 들어온 문서를, 단어별로 *“이 단어가 이 문서의 이 위치에 있다”*는 키-값으로 쪼개 내보냅니다. Hadoop이 같은 단어를 한 reducer로 모아 주면, reducer는 자연스럽게 *“이 단어가 어느 문서들의 어느 위치들에 나타났는가”*를 만들 수 있습니다. 검색창에 단어를 입력하면 이 인덱스에서 *문서 목록을 즉시* 꺼내 결과로 보여 주는 셈입니다.

```python
# inverted-index mapper.py
import sys

for line in sys.stdin:
    doc_id, text = line.split("\t", 1)
    for pos, word in enumerate(text.split()):
        print(f"{word}\t{doc_id}:{pos}")
```

같은 셔플·정렬 메커니즘이 *완전히 다른 응용*을 떠받친다는 점이 책의 핵심 메시지입니다. MapReduce를 익히는 일은 결국 *데이터를 키 공간으로 사상하는 사고법*을 익히는 일입니다.

## Day 2 — Lambda Architecture 전체 그림

**직관** — Lambda Architecture는 *회사 회계*에 비유하면 자연스럽습니다. 회사에는 *월말 결산 보고서*가 있습니다. 모든 거래를 한 달 단위로 다시 정리해 만든 보고서이고, 한 번 만들어지면 정확합니다. 다만 *오늘의 매출*은 보고서에 들어 있지 않습니다. 그래서 사무실 한 쪽에 *실시간 상황판*을 둡니다. 오늘 들어온 거래만 더해 표시합니다. CEO가 *오늘까지의 누적 매출*을 물으면 *지난달 결산 + 오늘의 상황판*을 합쳐 답합니다. Lambda Architecture의 batch view와 speed view는 정확히 같은 구도입니다.

| 비유 | Lambda 구성요소 |
|------|----------------|
| 회계 장부 (append-only, 절대 수정 안 함) | Master dataset |
| 월말 결산 (정확하지만 늦음) | Batch view |
| 실시간 상황판 (빠르지만 대략) | Speed view |
| “오늘까지 누적 매출은?” 질문 | Merge query |

Nathan Marz가 제안한 Lambda Architecture는 세 레이어로 구성됩니다.

| 레이어 | 역할 | 도구 (책 기준) |
|--------|------|---------------|
| Batch Layer | 전체 데이터에서 정확한 view 생성 | Hadoop + Cascalog |
| Speed Layer | 최근 데이터에서 근사 view 생성 | Storm |
| Serving Layer | batch view와 speed view를 합쳐 쿼리에 응답 | ElephantDB 등 |

Raw 데이터는 두 갈래로 흐릅니다. 한쪽은 *불변(immutable)으로 누적되는* 마스터 데이터셋에 들어가 batch layer가 주기적으로 재계산합니다. 다른 한쪽은 Storm 토폴로지에 흘러 들어가 *수 초 단위*로 speed view를 갱신합니다. 클라이언트는 두 view를 합산해 한 응답을 받습니다.

![Lambda Architecture 3-layer](/images/blog/seven-concurrency-models/diagrams/ch07-lambda-architecture.svg)

## Master dataset과 Batch view

**직관** — Master dataset은 *회계 장부*에 가장 가깝습니다. 회계 장부는 *지운 적 없고*, *수정한 적도 없고*, *오로지 새 줄을 append*만 합니다. 잘못 적힌 거래가 있어도 *원래 줄을 지우는* 것이 아니라 *반대 거래를 새로 적어* 균형을 맞춥니다. 이 방식이 답답해 보여도 *언제든 과거 어느 시점의 잔액을 정확히 재현*할 수 있다는 점에서 강력합니다. Lambda Architecture의 마스터 데이터셋도 같은 약속을 따릅니다. 한 번 들어온 사실은 그대로 남고, batch view는 *그 사실들의 누적에서 다시 계산된 결과*에 불과합니다. View가 깨지면 장부에서 다시 만들고, view 정의가 바뀌면 장부를 다시 훑습니다.

| 비유 | Lambda 대응 |
|------|------------|
| 회계 장부 줄 | Master dataset의 fact 한 건 |
| “지난달 잔액” 보고서 | Batch view |
| 거래 정정용 반대 거래 | 보정 fact 추가 |
| 보고서 재생성 | Batch 잡 재실행 |

Batch layer의 중심에는 *master dataset*이 있습니다. 이는 두 가지 원칙을 따릅니다.

- **Immutable** — 한 번 쓴 사실(fact)은 수정·삭제하지 않는다. 새 사실을 추가할 뿐.
- **Append-only** — 모든 이벤트는 시간순으로 누적된다.

이 원칙 덕에 마스터 데이터셋은 *진실의 단일 출처(single source of truth)*가 됩니다. Batch view는 마스터 데이터셋을 *처음부터 다시* 처리해 생성하는 사전 계산 결과입니다. View는 캐시이자 인덱스이며, 마스터에서 언제든 재생성됩니다.

| 항목 | 마스터 데이터셋 | 배치 뷰 |
|------|----------------|---------|
| 가변성 | 불변 | 매 실행마다 재생성 |
| 저장 | HDFS, append-only | ElephantDB, key-value |
| 쿼리 | 직접 쿼리하지 않음 | 빠른 룩업 |
| 크기 | 시간에 따라 증가 | 압축된 결과 |

## Cascalog — Clojure 위의 declarative query

코드 직전에 *이 도구가 어떤 단계에 해당하는지* 짚어 둡니다. Cascalog의 자리는 *batch view를 만드는 잡 작성 단계*입니다. mapper/reducer를 손으로 쓰는 대신, *“이런 결과가 나와야 한다”*를 선언형으로 적으면 도구가 *여러 MapReduce 잡으로 알아서 컴파일*합니다. 회계 비유로 옮기면, “지난달 페이지별 PV 합계를 뽑아라”라는 *요청서*를 쓰는 일이고, 실제로 장부를 펼쳐 합산하는 *실무*는 Cascading과 Hadoop이 맡습니다.

책은 Hadoop을 직접 자바로 쓰는 대신 *Clojure on Hadoop*인 Cascalog를 사용합니다. Cascalog는 *Datalog 스타일*의 선언형 질의를 Cascading을 통해 MapReduce 잡으로 컴파일합니다. Pig·Hive와 비슷한 위치지만 Clojure의 함수형 표현이 그대로 들어옵니다.

```clojure
(use 'cascalog.api)

;; 사용자 방문 로그에서 페이지별 PV를 집계
(defn page-views [src]
  (<- [?page ?count]
      (src ?user ?page ?ts)
      (c/count ?count)))

(?- (hfs-textline "/output/pv")
    (page-views (hfs-textline "/logs/visits")))
```

질의는 *논리식*처럼 읽힙니다. `src`가 `(user, page, ts)` 트리플을 생성하면, `?page`로 그룹핑한 카운트를 출력합니다. 같은 표현으로 join, sub-query, filter를 합성할 수 있어 책은 이를 *MapReduce 위의 함수형 추상*으로 소개합니다.

## 사용자 visit log 분석

**직관** — *방문 로그*는 *호텔 로비의 출입 기록부*에 가깝습니다. 누가 언제 어느 방을 거쳤는지가 줄줄이 적힙니다. *Pageview by URL*은 *“각 방을 몇 명이나 거쳤는가”*에 해당하고, *Bounce rate*는 *“로비만 잠깐 들렀다 바로 나간 비율”*에 해당합니다. 같은 로그에서 두 질문이 모두 답해질 수 있다는 점이 마스터 데이터셋의 가치입니다. 질문이 새로 생기면 *기록부를 다시 훑는 새 잡*을 추가하면 됩니다.

책의 대표 예제는 *방문 로그*에서 두 가지 view를 만드는 작업입니다.

| Batch view | 정의 |
|-----------|------|
| Pageview by URL | 페이지별 누적 조회 수 |
| Bounce rate | 한 페이지만 보고 떠난 세션 비율 |

```clojure
(defn pageviews-by-url [logs]
  (<- [?url ?count]
      (logs _ ?url _)
      (c/count ?count)))

(defn sessions [logs]
  (<- [?user ?session-id ?pages]
      (logs ?user ?url ?ts)
      (session-id ?user ?ts :> ?session-id)
      (c/distinct-count ?url :> ?pages)))

(defn bounce-rate [logs]
  (<- [?rate]
      ((sessions logs) ?_ ?_ ?pages)
      (single? ?pages :> ?bounce)
      (avg ?bounce :> ?rate)))
```

Cascalog는 위 표현을 여러 MapReduce 잡으로 컴파일합니다. 같은 마스터 데이터셋에서 *서로 다른 view*가 같은 도구로 만들어진다는 점이 핵심입니다.

각 view는 *독립된 batch 잡*으로 실행되어, 한 view의 갱신이 다른 view의 갱신을 막지 않습니다. 새 분석 요구가 생기면 마스터 데이터셋을 재처리하는 새 잡을 추가하면 됩니다. 책은 이를 *“view 추가의 비용이 낮다”*는 점에서 Lambda Architecture의 큰 장점으로 꼽습니다. 전통적인 DB 인덱스는 *한 번 만들면 운영 부담*이지만, batch view는 마스터에서 *언제든 다시 만드는 결과물*에 가깝습니다.

| 운영 패턴 | 전통 DB | Lambda Batch View |
|----------|--------|------------------|
| 신규 인덱스 추가 | 운영 중 ALTER, 다운타임 위험 | 새 잡 작성, 다음 사이클에 반영 |
| 인덱스 손상 복구 | 백업 복원 | 마스터에서 재계산 |
| 스키마 변경 | 마이그레이션 필요 | 새 view로 점진 교체 |

## 재계산성 — human fault-tolerance

Lambda Architecture가 다른 분산 처리와 가장 다른 점은 *재계산성(recomputability)*입니다. 마스터 데이터셋이 불변이기 때문에 batch view 생성 코드를 바꾸면 *처음부터 다시 돌리면* 됩니다. 운영 중 발견된 집계 버그는 다음 세 단계로 고칠 수 있습니다.

1. 버그 수정 — batch 잡 코드 갱신
2. 마스터 데이터셋 전체 재처리 — 새 batch view 생성
3. Serving layer가 새 view로 교체

이는 *변동성 있는 데이터 모델*에서는 불가능한 안전망입니다. 책은 이를 *“human fault-tolerance”*라고 표현합니다. 시스템 고장뿐 아니라 *사람의 실수*까지 복구할 수 있는 설계가 Lambda Architecture의 가치입니다.

데이터베이스에서 흔히 보는 *업데이트 위주* 모델은 한 번 잘못 갱신된 값을 *원래대로 되돌릴* 방법이 거의 없습니다. Lambda Architecture는 이 문제를 *데이터 모델 차원에서* 해소합니다. 마스터 데이터셋이 오직 추가만 허용한다면, 과거 어느 시점으로도 *다시 계산해* 갈 수 있기 때문입니다. 책은 이 점에서 batch layer를 *함수형 프로그래밍의 분산 버전*으로 다시 강조합니다.

## Day 3 — Storm topology: Spout, Bolt, Stream

**직관** — Hadoop이 *책 더미를 한 번에 처리하는 도서관*이라면, Storm은 *흐르는 강물*입니다. 데이터는 멈춰 있는 더미가 아니라 *연속으로 흘러오는 튜플*이고, 한번 흘러간 물은 두 번 같은 자리에 머물지 않습니다. 또 다른 비유는 *우편물 분류 라인*입니다. Spout는 우편물이 라인에 올라오는 입구이고, 각 bolt는 분류대 한 칸입니다. 같은 단계의 분류대가 여럿이라 *fan-out 병렬*이 되고, 분류 규칙(grouping)이 *어느 우편물이 어느 칸으로 갈지*를 결정합니다. 우편물은 멈추지 않고 라인을 흘러 다음 칸으로, 그다음 칸으로 넘어갑니다.

Batch layer가 가지지 못한 것은 *지연(latency)*입니다. 매 시간 또는 매 일 단위로 view가 갱신되는 동안 그 사이에 들어온 데이터는 보이지 않습니다. Storm은 그 *틈*을 채우는 실시간 토폴로지를 제공합니다.

| 구성요소 | 역할 |
|---------|------|
| Spout | 외부 소스에서 튜플을 *방출* (Kafka, queue, log tail) |
| Bolt | 튜플을 처리하고 다음 단계로 전달 |
| Stream | spout/bolt 사이의 *튜플 흐름* |
| Topology | spout과 bolt를 연결한 DAG |

같은 bolt를 여러 인스턴스로 띄워 *fan-out 병렬*을 만들 수 있고, grouping 전략으로 *어떤 bolt 인스턴스가 어떤 튜플을 받을지* 결정합니다. `shuffleGrouping`은 무작위, `fieldsGrouping`은 특정 필드 값이 같은 튜플을 같은 인스턴스로 보냅니다.

아래 코드는 *우편물 분류 라인을 조립하는 설계도*에 해당합니다. `tweets` spout가 트윗을 라인에 올리고, `split` bolt 네 개가 무작위로(`shuffleGrouping`) 트윗을 받아 단어로 쪼갭니다. 다음 `count` bolt 네 개는 *같은 단어가 같은 칸으로 가도록*(`fieldsGrouping`) 받아 카운트를 누적합니다. 마지막에 `StormSubmitter.submitTopology`로 *조립한 라인을 클러스터에 띄우는* 셈입니다.

```java
TopologyBuilder builder = new TopologyBuilder();

builder.setSpout("tweets", new TwitterSpout(), 1);

builder.setBolt("split", new SplitSentenceBolt(), 4)
       .shuffleGrouping("tweets");

builder.setBolt("count", new WordCountBolt(), 4)
       .fieldsGrouping("split", new Fields("word"));

Config conf = new Config();
StormSubmitter.submitTopology("wordcount", conf, builder.createTopology());
```

이 토폴로지는 CSP의 분산 버전으로 볼 수 있습니다. 채널은 stream, goroutine은 bolt입니다. 차이는 노드가 *물리적으로* 다른 머신에 있다는 점과, 실패가 *항상 가능*하다는 점입니다. Storm은 *Nimbus*라는 마스터 노드가 토폴로지를 워커들에 배포하고, ZooKeeper가 상태 메타데이터를 보관합니다. 워커가 죽으면 Nimbus가 다른 노드에 다시 띄워 *토폴로지 단위의 가용성*을 유지합니다.

![Storm topology — spout, bolts, streams](/images/blog/seven-concurrency-models/diagrams/ch07-storm-topology.svg)

## At-least-once vs Exactly-once

**직관** — 처리 보증의 세 등급은 *택배 배송*에 비유하면 분명해집니다. *At-most-once*는 *“보내긴 보냈는데 도착 보장 안 함”* — 잃어버리면 그만. *At-least-once*는 *“도착할 때까지 다시 보냄”* — 같은 물건이 두 번 도착할 수 있으니 받는 쪽이 *중복을 견뎌야* 합니다. *Exactly-once*는 *“정확히 한 번만 도착”*인데, 분산 시스템에서 *진짜* 한 번을 보장하기는 어렵습니다. 실제로는 *부수효과의 효과가 한 번만 보이게* 트랜잭션 ID로 중복을 걸러 내는 *operational exactly-once*에 가깝습니다.

Storm은 두 가지 처리 보증을 제공합니다.

| 보증 | 의미 | 비용 |
|------|------|------|
| At-most-once | 튜플이 한 번 이하 처리됨 (손실 허용) | 가장 낮음 |
| At-least-once | 튜플이 최소 한 번 처리됨 (중복 가능) | ack 추적 비용 |
| Exactly-once | 튜플이 정확히 한 번 처리됨 (Trident 사용) | 트랜잭션·배치 비용 |

기본 Storm은 *at-least-once*입니다. Spout가 튜플을 방출할 때 ID를 부여하고, 모든 하류 bolt가 ack를 보낼 때까지 추적합니다. 일정 시간 안에 ack가 없으면 spout가 같은 튜플을 *재방출*합니다. 따라서 reducer 측은 *멱등(idempotent)*해야 합니다. Trident는 Storm 위에 *마이크로 배치*와 트랜잭션 ID를 두어 exactly-once를 흉내 냅니다.

책은 *exactly-once는 진짜 exactly-once가 아니다*는 점을 분명히 합니다. 네트워크 분리가 가능한 시스템에서 *정확히 한 번* 처리는 *결과의 effect*가 한 번만 보이게 한다는 의미입니다. 튜플 자체는 여러 번 처리될 수 있지만, *부수효과의 적용*은 트랜잭션 ID로 중복 제거됩니다. 책은 이 미묘함을 *operational exactly-once*라고 부르며, 다운스트림 저장소도 트랜잭션을 지원해야 한다고 짚습니다.

| 분류 | Hadoop 배치 | Storm 스트리밍 |
|------|-------------|---------------|
| 처리 단위 | 잡 단위 (수 분~수 시간) | 튜플 단위 (밀리초) |
| 결과 갱신 | 잡 종료 후 일괄 | 즉시 |
| 정확성 | 전체 입력에 대해 결정적 | 보증 수준에 따라 다름 |
| 재처리 | 자연스러움 | 어려움 |
| 사용 시점 | view 재계산 | 최근 데이터 갱신 |

## 실시간 해시태그 분석

코드 직전에 *이 토폴로지가 무엇을 하는지* 정리합니다. Twitter 피드는 *흐르는 강물*입니다. 트윗 한 건이 spout에서 라인에 올라오면, 분리 bolt가 본문에서 해시태그를 뽑아 다음 라인으로 흘려보냅니다. 카운트 bolt는 같은 해시태그를 받아 *카운터 +1*을 하고 결과를 다음으로 내보냅니다. 핵심은 *같은 해시태그가 같은 bolt 인스턴스로 가야* 카운트가 정확해진다는 점입니다. 우편물 분류 라인이라면 *“#오늘날씨” 표가 붙은 우편물은 항상 6번 칸으로”* 같은 규칙(`fieldsGrouping`)이 보장돼야 합니다.

책은 Storm으로 *해시태그 빈도*를 실시간으로 집계하는 예를 듭니다. Twitter 피드를 spout로, 분리 bolt로, 카운트 bolt로 잇는 토폴로지입니다.

```java
public class HashtagCountBolt extends BaseRichBolt {
    private Map<String, Long> counts;
    private OutputCollector collector;

    @Override
    public void prepare(Map conf, TopologyContext ctx, OutputCollector c) {
        this.counts = new HashMap<>();
        this.collector = c;
    }

    @Override
    public void execute(Tuple tuple) {
        String hashtag = tuple.getStringByField("hashtag");
        long c = counts.getOrDefault(hashtag, 0L) + 1;
        counts.put(hashtag, c);
        collector.emit(new Values(hashtag, c));
        collector.ack(tuple);
    }

    @Override
    public void declareOutputFields(OutputFieldsDeclarer d) {
        d.declare(new Fields("hashtag", "count"));
    }
}
```

`fieldsGrouping("hashtag")`로 같은 해시태그 튜플이 항상 같은 bolt 인스턴스에 도착해야 카운트가 일관됩니다. 만약 `shuffleGrouping`을 쓰면 각 인스턴스가 부분 카운트를 보유하게 되어 *최종 합산이 한 단계 더* 필요합니다.

책은 이 bolt에 *시간 윈도*를 더해 *최근 1분간 가장 많이 언급된 해시태그*를 구하는 확장을 제안합니다. 메모리 안의 카운터를 시간으로 나눈 슬롯에 두고, 새 튜플이 들어올 때마다 오래된 슬롯을 만료시킵니다. 결과는 speed view 저장소로 흘려보내 *batch view와의 merge* 대상이 됩니다.

```java
public class TimedHashtagBolt extends BaseRichBolt {
    private final long windowMs = 60_000;
    private Deque<Map.Entry<Long, String>> events;
    private Map<String, Long> counts;
    private OutputCollector collector;

    @Override
    public void prepare(Map c, TopologyContext ctx, OutputCollector col) {
        this.events = new ArrayDeque<>();
        this.counts = new HashMap<>();
        this.collector = col;
    }

    @Override
    public void execute(Tuple t) {
        long now = System.currentTimeMillis();
        String tag = t.getStringByField("hashtag");
        events.addLast(Map.entry(now, tag));
        counts.merge(tag, 1L, Long::sum);

        while (!events.isEmpty() && now - events.peekFirst().getKey() > windowMs) {
            String old = events.pollFirst().getValue();
            counts.merge(old, -1L, Long::sum);
        }

        collector.emit(new Values(tag, counts.get(tag)));
        collector.ack(t);
    }

    @Override
    public void declareOutputFields(OutputFieldsDeclarer d) {
        d.declare(new Fields("hashtag", "count_1min"));
    }
}
```

이 코드 직전에 *시간 윈도 발상*을 짚어 둡니다. *최근 1분*이라는 조건은 *흐르는 강물에 1분짜리 그물을 펼쳐 둔* 것과 같습니다. 새 이벤트가 들어오면 그물 안쪽 카운트가 1 증가하고, 1분 넘은 이벤트는 *그물 밖으로 밀려나며* 카운트에서 1 감소합니다. 결과적으로 카운터는 *현재 시점 기준 최근 1분의 합*만 들고 있습니다. 메모리 안에서 *데큐로 슬라이딩 윈도*를 운영하는 것이 흔한 구현이고, 코드는 이 발상을 그대로 옮긴 것에 가깝습니다.

이 코드는 *상태를 가진 bolt*입니다. Bolt 인스턴스가 죽으면 누적 카운트가 사라지므로, 책은 두 가지 대응을 든다. 첫째, 같은 해시태그가 항상 같은 인스턴스로 가도록 `fieldsGrouping`을 보장한다. 둘째, *speed view*에 결과를 즉시 기록해 메모리 손실의 영향을 줄인다.

## Speed view와 Batch view의 merge

**직관** — Merge는 *두 시계*를 합치는 일에 가깝습니다. Batch view는 *어제 자정에 멈춰 있는 시계*이고, speed view는 *어제 자정 이후만 흘러간 짧은 시계*입니다. 사용자가 *“지금까지 누적 카운트”*를 물으면 두 시계의 눈금을 더해 답합니다. 핵심 조건은 *두 시계가 겹치지 않아야* 한다는 점입니다. Batch view가 *오늘 새벽 3시*까지 다시 갱신됐다면, speed view는 *오늘 새벽 3시 이후만* 들고 있어야 합니다. 그렇지 않으면 같은 사건이 두 번 계산됩니다. 회계 비유로는 *월말 결산이 새로 나왔는데 상황판을 비우지 않으면 이중 계상이 일어나는* 상황과 같습니다.

Speed layer가 만드는 view는 *최근 몇 시간 분량*만 담습니다. Batch view가 어제 자정까지 정확하다면, speed view는 *어제 자정 이후의 차이*만 담아 둡니다. 쿼리는 두 view를 합산합니다.

![Batch view + speed view merge](/images/blog/seven-concurrency-models/diagrams/ch07-view-merge.svg)

이 합산이 정확하려면 두 가지 조건이 필요합니다. 첫째, batch view가 갱신되면 *speed view에서 같은 구간을 비워야* 합니다. 둘째, 두 view 모두 *같은 키 공간*을 사용해야 합니다. Marz의 책은 이를 *complete view*와 *increment view*로 부르며, 쿼리 시 두 view를 합치는 함수를 *merge function*이라고 합니다.

| 구분 | batch view | speed view |
|------|-----------|-----------|
| 갱신 주기 | 시간~일 | 밀리초~초 |
| 정확성 | 정확 | 근사 |
| 데이터 폭 | 전체 이력 | 최근 윈도 |
| 저장 | ElephantDB·HBase | 메모리·Redis |
| 역할 | 진실 | 보정 |

Merge 함수는 *연산의 종류*에 따라 다르게 정의됩니다. 카운트는 단순 합산입니다. 평균은 `(sum, count)` 쌍을 따로 저장해 합한 뒤 마지막에 나눕니다. Top-K 같은 순위 연산은 *근사 알고리즘*이 필요해, speed view에 Count-Min Sketch 같은 자료구조가 들어갑니다. 책은 merge 함수가 *연산자 대수*의 문제임을 강조하며, 잘 설계된 view는 *증분 갱신과 일괄 갱신을 같은 결과로* 묶을 수 있어야 한다고 적습니다.

## Twitter Heron — Storm의 다음 단계

책이 쓰인 시점에 Twitter는 Storm을 운영하다 한계를 겪고 *Heron*이라는 후속 시스템을 발표했습니다. Heron은 Storm과 *API 호환*을 유지하면서 내부적으로 자원 격리, backpressure, 디버깅 가능성을 개선했습니다. 책은 Heron을 *Storm의 다음 단계*로 짧게 언급하고, 실시간 처리가 한 시스템에 고정될 필요가 없다는 점을 시사합니다.

| 항목 | Storm | Heron |
|------|-------|-------|
| API | TopologyBuilder | 동일 |
| 자원 격리 | 워커 JVM 공유 | 컨테이너 단위 격리 |
| Backpressure | 약함 | 명시적 |
| 디버깅 | 제한적 | 컨테이너별 로그·메트릭 |

이 표는 *speed layer 도구는 진화 중인 영역*이라는 책의 메시지를 담습니다. Lambda Architecture는 특정 도구에 종속되지 않고 *layer 단위 추상*으로 설명되므로, Heron이든 다른 후속 시스템이든 같은 자리에 들어갈 수 있습니다.

## 실제 시스템 사례 — 어디서 이 아키텍처가 자라났는가

추상적인 layer 그림이 *진짜 운영되는 시스템*에서 어떤 모습인지 보면 직관이 단단해집니다. 책에서 직접 다루지 않지만, 같은 사고가 적용된 대표 사례를 짚어 둡니다.

| 회사·시스템 | 위치 | 핵심 아이디어 |
|------------|------|--------------|
| Twitter Timeline | Lambda Architecture의 출발점 | 사용자별 타임라인을 batch로 사전 계산하고, 새 트윗은 speed view로 합산 |
| Netflix Mantis | Stream Processing 사례 | 운영 메트릭·재생 이벤트를 실시간 스트림으로 처리, Storm 계열 토폴로지 운용 |
| LinkedIn Kafka | Kappa 모델의 시작점 | 모든 이벤트를 영속 로그로 두고 *재처리도 stream으로* — Jay Kreps가 Kappa를 제안한 토양 |
| Uber Athena·AthenaX | 실시간 분석 플랫폼 | SQL on streams로 시장 가격·ETA 분석을 sub-second로 갱신 |

Twitter는 사용자가 *팔로우한 사람들의 트윗을 시간순으로 보는* 일을 사전 계산으로 풀었습니다. 매번 모든 팔로위의 트윗을 모아 정렬하면 너무 느리니, *batch*가 사용자별 타임라인을 미리 만들어 두고, *speed*가 방금 도착한 트윗을 그 위에 합쳐 보여 줍니다. Lambda Architecture가 *실제로 돌아갔던 첫 무대*에 해당합니다.

Netflix의 Mantis는 *재생 중인 모든 세션의 메트릭*을 초 단위로 보는 운영 도구입니다. 장애의 조짐을 *어제 배치*가 알려 줄 수는 없습니다. Storm 계열의 토폴로지가 *흐르는 강물*에 그물을 던져 이상치를 잡아냅니다. LinkedIn의 Kafka는 *영속 로그* 자체를 인프라로 끌어올린 사례입니다. 모든 이벤트가 토픽에 차곡차곡 쌓이니, 같은 토픽을 *처음부터 다시 읽으면* 재처리가 됩니다. Kappa Architecture가 등장할 수 있었던 *재료*는 Kafka가 만든 셈입니다. Uber Athena는 SQL 한 줄로 *흐르는 데이터*에 질의하는 평면화 시도이고, Lambda·Kappa 어느 쪽에도 끼워 넣을 수 있는 *상위 추상*에 해당합니다.

이 사례들을 한 줄로 정리하면 *“같은 데이터를 정확하게도, 빠르게도 보고 싶다”*는 동일한 요구가 회사마다 다른 도구 조합으로 응답한 결과라는 점입니다. Lambda는 그 응답의 *가장 일반적인 모양*이고, Kappa는 *단일 엔진으로 충분할 때의 간소화 버전*입니다.

## Wrap-Up — Lambda Architecture의 강점

- **정확성** — 마스터 데이터셋이 불변이라 batch view는 결정적이고 재계산 가능
- **낮은 지연** — speed layer가 최근 데이터를 메우므로 사용자는 항상 최신값을 봅니다
- **유연성** — 같은 마스터 데이터셋 위에 여러 view를 자유롭게 만들 수 있습니다
- **human fault-tolerance** — 코드 버그를 발견해도 마스터를 다시 돌려 회복

## Lambda Architecture의 약점과 Kappa

- **두 코드베이스** — 같은 로직을 batch와 speed에 *두 번* 작성해야 합니다
- **운영 복잡성** — Hadoop 클러스터와 Storm 클러스터를 동시에 운영
- **데이터 일관성** — batch view와 speed view 사이의 경계 처리, merge 함수의 정확성
- **테스트 부담** — 두 경로의 결과가 *수렴*하는지 검증하는 부담

**Kappa 직관** — Kappa는 *Lambda에서 batch를 빼고 stream만 남긴* 모양입니다. 회계 비유로 옮기면, 월말 결산 보고서 없이 *상황판 하나*로 모든 답을 내겠다는 발상입니다. 가능하려면 한 가지 조건이 필요합니다. *과거 기록을 처음부터 다시 흘려보낼 수 있어야* 합니다. 그래야 집계 버그를 고친 뒤 *같은 로그를 다시 한 번* 흘려보내 같은 view를 새로 만들 수 있습니다. Kafka 같은 영속 로그가 이 조건을 만족시키는 인프라이고, *재처리가 stream으로 가능하다*는 점이 Kappa를 가능하게 만든 열쇠입니다.

Jay Kreps는 책 출간 이후 *Kappa Architecture*를 제안합니다. 모든 데이터를 *영속 로그(Kafka 토픽)*에 두고 스트리밍 엔진 하나가 처리합니다. 재처리가 필요하면 같은 로그를 *처음부터 다시* 흘려보냅니다. 단일 코드베이스로 batch와 speed의 이중성을 없애는 것이 핵심 동기입니다.

![Lambda vs Kappa Architecture](/images/blog/seven-concurrency-models/diagrams/ch07-lambda-vs-kappa.svg)

| 아키텍처 | 흐름 | 장점 | 단점 |
|----------|------|------|------|
| Lambda | Raw → Batch + Speed → Merge | 정확성·낮은 지연 | 두 코드베이스 |
| Kappa | Raw → Stream(재처리 가능) | 단일 코드베이스 | 재처리 비용, 엔진 의존 |

책은 Kappa를 *Lambda의 한 갈래*로 짧게 소개하면서, 어느 쪽이 정답이라기보다 *조직과 워크로드의 선택*임을 강조합니다.

| 선택 기준 | Lambda 쪽으로 | Kappa 쪽으로 |
|----------|-------------|-------------|
| 팀 규모 | 데이터 엔지니어 다수 | 작은 통합 팀 |
| 도구 성숙도 | 배치 도구가 강함 | 스트리밍 엔진이 강함 |
| 워크로드 | 정확한 배치 분석 + 라이브 보정 | 모두 스트리밍으로 표현 가능 |
| 운영 부담 | 두 시스템 감수 가능 | 단일 시스템을 선호 |

## 7개 모델 회고

7주의 여정을 표 하나로 다시 봅니다.

| Week | 모델 | 단위 | 안전성 메커니즘 | 가장 잘 맞는 문제 |
|------|------|------|---------------|----------------|
| 1 | Threads and Locks | 스레드 | 락·메모리 모델 | 단일 머신 임계 영역 |
| 2 | Functional Programming | 함수 | 불변성 | 순수 계산·파이프라인 |
| 3 | The Clojure Way | identity·STM | 트랜잭션 메모리 | 복잡한 상태 합성 |
| 4 | Actors | actor | 격리·메시지 | 분산·장애 격리 |
| 5 | CSP | 채널 | 동기 메시지 | 흐름이 명확한 동시성 |
| 6 | Data Parallelism | SIMD/GPU | 데이터 단위 병렬 | 수치·신호 처리 |
| 7 | Lambda Architecture | 클러스터 | 불변 마스터·재계산 | 대규모 데이터·실시간 |

같은 *동시성*이라는 단어가 매주 다른 단위에서 작동했습니다. 1주차에는 스레드 사이, 7주차에는 클러스터 사이입니다. 안전성 메커니즘도 락에서 시작해 불변성, STM, 격리, 채널, 데이터 분할, 마스터 데이터셋으로 옮겨갔습니다.

세 가지 흐름이 7주를 관통합니다. 첫째, *공유 가변 상태를 줄이는 방향*입니다. 락에서 출발해 불변성, STM, actor, 채널까지 모두 *공유의 양을 줄이거나 통제하는* 시도입니다. 둘째, *단위의 확장*입니다. 한 스레드에서 한 머신, 다시 한 클러스터로 단위가 커집니다. 셋째, *함수형 사고의 일관된 활용*입니다. Map/reduce, 불변 데이터, 순수 함수, 메시지 핸들러, 변환 파이프라인이 매주 모습을 바꿔 등장합니다.

## 시리즈 마무리

> 어떤 모델도 만능이 아닙니다. 문제에 맞는 모델을 고르는 안목이 7주를 끝낸 후 남는 가장 큰 가치입니다.

Butcher의 책은 *기술 스택의 카탈로그*가 아니라 *사고 모델의 카탈로그*입니다. Lambda Architecture가 가르치는 마지막 교훈은, 동시성의 도구가 한 머신에서 한 클러스터까지 *연속된 스펙트럼*이라는 점입니다. 같은 함수형 사고, 같은 불변성, 같은 격리 원칙이 *규모를 가로질러* 작동합니다.

상황별 권장 모델을 한 표로 마무리합니다.

| 상황 | 권장 모델 | 그 이유 |
|------|----------|--------|
| 짧은 임계 영역 | Threads + Locks | 단일 머신, 저지연 |
| 순수 계산·파이프라인 | Functional | 불변성·재시도 안전 |
| 복잡한 상태 합성 | Clojure Way (STM) | 트랜잭션으로 합성 |
| 분산·장애 격리 | Actors | 메시지·supervision |
| 명시적 흐름 | CSP | 채널 중심 설계 |
| 수치·신호 처리 | Data Parallelism | SIMD/GPU |
| 빅데이터·실시간 | Lambda | batch + speed |

이 표가 7주의 결과물입니다. 어느 모델 하나가 다른 모델을 *대체*하는 게 아니라, *문제의 모양*에 맞춰 모델을 고르는 안목이 책의 결론입니다.

## 정리

- **MapReduce**는 함수형 변환을 *수천 머신*으로 분산하는 모델입니다
- Hadoop은 HDFS의 블록 단위 데이터 지역성 위에서 mapper/reducer를 실행합니다
- **Lambda Architecture**는 *불변 마스터 데이터셋* 위에 batch view와 speed view를 두는 설계입니다
- Cascalog는 Clojure 위에서 *선언형 질의*로 batch view를 작성합니다
- Storm은 *spout·bolt·stream*으로 실시간 토폴로지를 구성합니다
- 기본 Storm은 at-least-once이며, Trident로 exactly-once를 흉내 냅니다
- Speed view와 batch view는 *merge 함수*로 합쳐 사용자 쿼리에 응답합니다
- 책 이후 등장한 **Kappa Architecture**는 두 레이어를 단일 스트리밍 엔진으로 통합하는 대안입니다

## 자기 점검

- [ ] MapReduce의 Shuffle 단계가 왜 가장 비싼지 설명할 수 있습니까?
- [ ] Combiner와 Reducer는 언제 같은 함수이고 언제 다릅니까?
- [ ] HDFS block size가 큰 이유와 데이터 지역성의 관계를 말할 수 있습니까?
- [ ] Master dataset이 불변이라는 원칙이 *재계산성*에 어떻게 기여합니까?
- [ ] Cascalog 질의가 MapReduce 잡으로 컴파일된다는 말의 의미는 무엇입니까?
- [ ] Storm의 fieldsGrouping과 shuffleGrouping은 어떤 차이를 만듭니까?
- [ ] At-least-once 보증에서 reducer가 *멱등*해야 하는 이유는 무엇입니까?
- [ ] Batch view와 speed view를 합치는 merge 함수는 어떤 조건을 만족해야 합니까?
- [ ] Kappa Architecture가 두 코드베이스 문제를 어떻게 해결하려 합니까?

## 관련 항목

- [Ch 6: Data Parallelism](/blog/parallel/seven-concurrency-models/ch06-data-parallelism) — 한 머신의 데이터 병렬
- [Ch 5: CSP](/blog/parallel/seven-concurrency-models/ch05-communicating-sequential-processes) — Storm 토폴로지와의 유사성
- [Ch 4: Actors](/blog/parallel/seven-concurrency-models/ch04-actors) — 분산·메시지의 다른 모델
- [Ch 3: The Clojure Way](/blog/parallel/seven-concurrency-models/ch03-the-clojure-way) — Cascalog의 모태 언어
- [Ch 2: Functional Programming](/blog/parallel/seven-concurrency-models/ch02-functional-programming) — MapReduce의 사고 토대
- [Ch 1: Threads and Locks](/blog/parallel/seven-concurrency-models/ch01-threads-and-locks) — 시리즈 시작
