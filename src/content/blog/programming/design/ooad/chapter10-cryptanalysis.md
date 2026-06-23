---
title: "Ch 10: Artificial Intelligence: Cryptanalysis"
date: 2026-05-19T10:00:00
description: "케이스 스터디 — 암호 분석 AI 시스템."
series: "Object-Oriented Analysis and Design with Applications"
seriesOrder: 10
tags: [oop, booch, case-study, ai, cryptanalysis]
draft: true
type: book-review
bookTitle: "Object-Oriented Analysis and Design with Applications"
bookAuthor: "Grady Booch"
---

## 한 줄 요약

> 암호 분석 시스템은 **지식 표현**, **추론 엔진**, **학습 알고리즘**의 협력이다. 객체지향은 AI 시스템의 복잡한 지식 구조를 자연스럽게 모델링한다.

## 문제 도메인

### 시스템 개요

| 구분 | 항목 |
|------|------|
| **목표** | 암호화된 메시지 해독, 암호 체계 식별, 키/패턴 발견, 취약점 분석 |
| **접근 방식** | 빈도 분석, 패턴 매칭, 통계적 방법, 기계 학습, 휴리스틱 탐색 |

### 요구사항

**기능 요구사항**

| 기능 | 세부 내용 |
|------|----------|
| 암호문 분석 | 문자 빈도 분석, n-gram 분석, 패턴 인식 |
| 암호 체계 식별 | 대체 암호(Substitution), 전치 암호(Transposition), 다중 암호(Polyalphabetic) |
| 해독 시도 | 자동 키 탐색, 부분 해독 지원, 후보 순위 지정 |
| 학습 | 과거 해독 사례 학습, 새 패턴 발견, 성능 개선 |

**비기능 요구사항**

| 항목 |
|------|
| 대용량 암호문 처리 |
| 점진적 결과 표시 |
| 확장 가능한 암호 알고리즘 |

## 핵심 추상화

### 지식 표현

| 개념 | 속성 |
|------|------|
| Cipher (암호) | 유형(대체, 전치, 다중), 알고리즘, 키 공간, 특성(주기, 패턴) |
| Message (메시지) | 원문(평문), 암호문, 언어, 맥락 |
| Key (키) | 유형, 값, 공간 크기, 부분 키 |
| Hypothesis (가설) | 암호 유형 추정, 부분 해독, 신뢰도, 근거 |

```java
// 암호 체계 추상화

public abstract class Cipher {
    protected final CipherType type;

    public abstract String encrypt(String plaintext, Key key);
    public abstract String decrypt(String ciphertext, Key key);
    public abstract KeySpace getKeySpace();
    public abstract List<CipherCharacteristic> getCharacteristics();
}

public class SubstitutionCipher extends Cipher {
    @Override
    public String encrypt(String plaintext, Key key) {
        SubstitutionKey subKey = (SubstitutionKey) key;
        return plaintext.chars()
            .mapToObj(c -> String.valueOf(subKey.substitute((char) c)))
            .collect(Collectors.joining());
    }

    @Override
    public String decrypt(String ciphertext, Key key) {
        SubstitutionKey subKey = (SubstitutionKey) key;
        return ciphertext.chars()
            .mapToObj(c -> String.valueOf(subKey.inverseSubstitute((char) c)))
            .collect(Collectors.joining());
    }

    @Override
    public KeySpace getKeySpace() {
        // 26! 가능한 키
        return new KeySpace(factorial(26));
    }
}

public class VigenereCipher extends Cipher {
    @Override
    public String encrypt(String plaintext, Key key) {
        VigenereKey vKey = (VigenereKey) key;
        StringBuilder result = new StringBuilder();
        String keyword = vKey.getKeyword();

        for (int i = 0; i < plaintext.length(); i++) {
            char p = plaintext.charAt(i);
            char k = keyword.charAt(i % keyword.length());
            char c = (char) ((p - 'A' + k - 'A') % 26 + 'A');
            result.append(c);
        }
        return result.toString();
    }

    @Override
    public KeySpace getKeySpace() {
        // 키워드 길이에 따라 26^n
        return new KeySpace(n -> Math.pow(26, n));
    }
}
```

### 분석 엔진

![Cryptanalysis Analyzer Hierarchy](/images/blog/ooad/diagrams/ch10-analyzer-hierarchy.svg)

```java
// 분석기 인터페이스

public interface Analyzer {
    AnalysisResult analyze(String ciphertext);
    AnalyzerType getType();
}

public record AnalysisResult(
    AnalyzerType analyzerType,
    Map<String, Object> findings,
    double confidence,
    List<Hypothesis> hypotheses
) {}

// 빈도 분석기
public class FrequencyAnalyzer implements Analyzer {
    private final LanguageModel languageModel;
    private final int ngramSize;

    @Override
    public AnalysisResult analyze(String ciphertext) {
        Map<String, Integer> frequencies = countNgrams(ciphertext, ngramSize);
        Map<String, Double> normalized = normalize(frequencies);

        // 언어 모델과 비교
        double similarity = languageModel.compareTo(normalized);

        // 가설 생성
        List<Hypothesis> hypotheses = generateHypotheses(normalized, similarity);

        return new AnalysisResult(
            AnalyzerType.FREQUENCY,
            Map.of(
                "frequencies", frequencies,
                "normalized", normalized,
                "similarity", similarity
            ),
            similarity,
            hypotheses
        );
    }

    private Map<String, Integer> countNgrams(String text, int n) {
        Map<String, Integer> counts = new HashMap<>();
        for (int i = 0; i <= text.length() - n; i++) {
            String ngram = text.substring(i, i + n);
            counts.merge(ngram, 1, Integer::sum);
        }
        return counts;
    }

    private List<Hypothesis> generateHypotheses(
            Map<String, Double> frequencies, double similarity) {

        List<Hypothesis> hypotheses = new ArrayList<>();

        // 영어 빈도와 유사하면 단순 대체 암호 가능성
        if (similarity > 0.8) {
            hypotheses.add(new Hypothesis(
                CipherType.SIMPLE_SUBSTITUTION,
                similarity,
                "Frequency distribution matches natural language"
            ));
        }

        // 평탄한 분포면 다중 암호 가능성
        if (isFlat(frequencies)) {
            hypotheses.add(new Hypothesis(
                CipherType.POLYALPHABETIC,
                1.0 - similarity,
                "Flat frequency distribution suggests polyalphabetic"
            ));
        }

        return hypotheses;
    }
}

// 일치 지수 분석기
public class IndexOfCoincidenceAnalyzer implements Analyzer {
    private static final double ENGLISH_IC = 0.0667;
    private static final double RANDOM_IC = 0.0385;

    @Override
    public AnalysisResult analyze(String ciphertext) {
        double ic = calculateIC(ciphertext);

        CipherType likelyType;
        double confidence;

        if (Math.abs(ic - ENGLISH_IC) < 0.01) {
            likelyType = CipherType.SIMPLE_SUBSTITUTION;
            confidence = 0.9;
        } else if (Math.abs(ic - RANDOM_IC) < 0.01) {
            likelyType = CipherType.POLYALPHABETIC;
            confidence = 0.85;
        } else {
            likelyType = CipherType.UNKNOWN;
            confidence = 0.5;
        }

        return new AnalysisResult(
            AnalyzerType.INDEX_OF_COINCIDENCE,
            Map.of("ic", ic, "english_ic", ENGLISH_IC, "random_ic", RANDOM_IC),
            confidence,
            List.of(new Hypothesis(likelyType, confidence,
                "IC = " + ic + " suggests " + likelyType))
        );
    }

    private double calculateIC(String text) {
        int[] counts = new int[26];
        int total = 0;

        for (char c : text.toUpperCase().toCharArray()) {
            if (c >= 'A' && c <= 'Z') {
                counts[c - 'A']++;
                total++;
            }
        }

        double sum = 0;
        for (int count : counts) {
            sum += count * (count - 1);
        }

        return sum / (total * (total - 1));
    }
}
```

## 추론 엔진

### 가설 관리

```java
// 가설 관리자

public class HypothesisManager {
    private final PriorityQueue<Hypothesis> hypotheses;
    private final List<AnalysisResult> evidence;
    private final InferenceEngine inferenceEngine;

    public void addEvidence(AnalysisResult result) {
        evidence.add(result);
        updateHypotheses(result);
    }

    private void updateHypotheses(AnalysisResult result) {
        // 기존 가설의 신뢰도 갱신 (베이지안 업데이트)
        List<Hypothesis> updated = hypotheses.stream()
            .map(h -> updateConfidence(h, result))
            .collect(Collectors.toList());

        // 새 가설 추가
        updated.addAll(result.hypotheses());

        // 중복 제거 및 병합
        hypotheses.clear();
        hypotheses.addAll(mergeHypotheses(updated));
    }

    private Hypothesis updateConfidence(Hypothesis hypothesis, AnalysisResult evidence) {
        // P(H|E) = P(E|H) * P(H) / P(E)
        double likelihood = inferenceEngine.likelihood(hypothesis, evidence);
        double prior = hypothesis.confidence();
        double marginal = calculateMarginal(evidence);

        double posterior = (likelihood * prior) / marginal;

        return hypothesis.withConfidence(posterior);
    }

    public Hypothesis getBestHypothesis() {
        return hypotheses.peek();
    }

    public List<Hypothesis> getTopHypotheses(int n) {
        return hypotheses.stream()
            .limit(n)
            .collect(Collectors.toList());
    }
}

// 가설 클래스
public class Hypothesis implements Comparable<Hypothesis> {
    private final CipherType cipherType;
    private final double confidence;
    private final String rationale;
    private final Map<Character, Character> partialKey;
    private final List<String> supportingEvidence;

    public Hypothesis withConfidence(double newConfidence) {
        return new Hypothesis(
            cipherType, newConfidence, rationale, partialKey, supportingEvidence
        );
    }

    public Hypothesis withPartialKey(Map<Character, Character> key) {
        Map<Character, Character> merged = new HashMap<>(partialKey);
        merged.putAll(key);
        return new Hypothesis(
            cipherType, confidence, rationale, merged, supportingEvidence
        );
    }

    @Override
    public int compareTo(Hypothesis other) {
        return Double.compare(other.confidence, this.confidence); // 내림차순
    }
}
```

### 추론 규칙

```java
// 규칙 기반 추론

public interface InferenceRule {
    boolean isApplicable(AnalysisResult evidence);
    List<Hypothesis> apply(AnalysisResult evidence, List<Hypothesis> current);
}

public class SubstitutionInferenceRule implements InferenceRule {
    private final LanguageModel languageModel;

    @Override
    public boolean isApplicable(AnalysisResult evidence) {
        return evidence.analyzerType() == AnalyzerType.FREQUENCY
            && (double) evidence.findings().get("similarity") > 0.7;
    }

    @Override
    public List<Hypothesis> apply(AnalysisResult evidence, List<Hypothesis> current) {
        @SuppressWarnings("unchecked")
        Map<String, Double> frequencies =
            (Map<String, Double>) evidence.findings().get("normalized");

        // 빈도 순서로 정렬
        List<Map.Entry<String, Double>> sortedCipher = frequencies.entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .collect(Collectors.toList());

        List<Map.Entry<String, Double>> sortedLanguage = languageModel.getFrequencies()
            .entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .collect(Collectors.toList());

        // 상위 문자 매핑 추론
        Map<Character, Character> inferredKey = new HashMap<>();
        for (int i = 0; i < Math.min(5, sortedCipher.size()); i++) {
            char cipherChar = sortedCipher.get(i).getKey().charAt(0);
            char plainChar = sortedLanguage.get(i).getKey().charAt(0);
            inferredKey.put(cipherChar, plainChar);
        }

        // 기존 가설에 부분 키 추가
        return current.stream()
            .filter(h -> h.cipherType() == CipherType.SIMPLE_SUBSTITUTION)
            .map(h -> h.withPartialKey(inferredKey))
            .collect(Collectors.toList());
    }
}

public class VigenereKeyLengthRule implements InferenceRule {
    @Override
    public boolean isApplicable(AnalysisResult evidence) {
        return evidence.analyzerType() == AnalyzerType.PATTERN
            && evidence.findings().containsKey("repeatingPatterns");
    }

    @Override
    public List<Hypothesis> apply(AnalysisResult evidence, List<Hypothesis> current) {
        @SuppressWarnings("unchecked")
        List<RepeatingPattern> patterns =
            (List<RepeatingPattern>) evidence.findings().get("repeatingPatterns");

        // 반복 패턴 간격의 GCD로 키 길이 추정
        List<Integer> distances = patterns.stream()
            .flatMap(p -> p.distances().stream())
            .collect(Collectors.toList());

        int likelyKeyLength = gcd(distances);

        return List.of(new Hypothesis(
            CipherType.VIGENERE,
            0.8,
            "Repeating patterns suggest key length of " + likelyKeyLength,
            Map.of(),
            List.of("Key length: " + likelyKeyLength)
        ));
    }
}
```

## 탐색 전략

### 키 공간 탐색

```java
// 탐색 전략

public interface SearchStrategy {
    Optional<Key> search(Cipher cipher, String ciphertext, Hypothesis hypothesis);
}

// 힐 클라이밍
public class HillClimbingStrategy implements SearchStrategy {
    private final Scorer scorer;
    private final int maxIterations;

    @Override
    public Optional<Key> search(Cipher cipher, String ciphertext, Hypothesis hypothesis) {
        Key currentKey = hypothesis.getPartialKey().isEmpty()
            ? generateRandomKey(cipher)
            : expandPartialKey(hypothesis.getPartialKey(), cipher);

        double currentScore = score(cipher, ciphertext, currentKey);

        for (int i = 0; i < maxIterations; i++) {
            Key neighbor = mutateKey(currentKey);
            double neighborScore = score(cipher, ciphertext, neighbor);

            if (neighborScore > currentScore) {
                currentKey = neighbor;
                currentScore = neighborScore;
            }
        }

        if (currentScore > ACCEPTANCE_THRESHOLD) {
            return Optional.of(currentKey);
        }
        return Optional.empty();
    }

    private double score(Cipher cipher, String ciphertext, Key key) {
        String plaintext = cipher.decrypt(ciphertext, key);
        return scorer.score(plaintext);
    }

    private Key mutateKey(Key key) {
        // 키의 두 요소 교환
        SubstitutionKey subKey = (SubstitutionKey) key;
        return subKey.swapRandom();
    }
}

// 유전 알고리즘
public class GeneticAlgorithmStrategy implements SearchStrategy {
    private final int populationSize;
    private final int generations;
    private final double mutationRate;
    private final Scorer scorer;

    @Override
    public Optional<Key> search(Cipher cipher, String ciphertext, Hypothesis hypothesis) {
        List<Key> population = initializePopulation(cipher, hypothesis);

        for (int gen = 0; gen < generations; gen++) {
            // 적합도 평가
            List<ScoredKey> scored = population.stream()
                .map(k -> new ScoredKey(k, score(cipher, ciphertext, k)))
                .sorted(Comparator.comparingDouble(ScoredKey::score).reversed())
                .collect(Collectors.toList());

            // 수렴 검사
            if (scored.get(0).score() > ACCEPTANCE_THRESHOLD) {
                return Optional.of(scored.get(0).key());
            }

            // 선택
            List<Key> parents = selectParents(scored);

            // 교차 및 변이
            population = breed(parents);
        }

        return Optional.empty();
    }

    private List<Key> breed(List<Key> parents) {
        List<Key> offspring = new ArrayList<>();

        for (int i = 0; i < populationSize; i++) {
            Key parent1 = parents.get(random.nextInt(parents.size()));
            Key parent2 = parents.get(random.nextInt(parents.size()));

            Key child = crossover(parent1, parent2);

            if (random.nextDouble() < mutationRate) {
                child = mutate(child);
            }

            offspring.add(child);
        }

        return offspring;
    }
}

// 점수 평가기
public class QuadgramScorer implements Scorer {
    private final Map<String, Double> quadgramLogProbs;

    public QuadgramScorer(String languageCorpus) {
        quadgramLogProbs = calculateQuadgramLogProbs(languageCorpus);
    }

    @Override
    public double score(String text) {
        double score = 0;
        String upper = text.toUpperCase().replaceAll("[^A-Z]", "");

        for (int i = 0; i <= upper.length() - 4; i++) {
            String quadgram = upper.substring(i, i + 4);
            score += quadgramLogProbs.getOrDefault(quadgram, -10.0);
        }

        return score / (upper.length() - 3);
    }
}
```

## 시스템 통합

### 분석 파이프라인

```java
// 암호 분석 파이프라인

public class CryptanalysisPipeline {
    private final List<Analyzer> analyzers;
    private final HypothesisManager hypothesisManager;
    private final List<InferenceRule> rules;
    private final SearchStrategy searchStrategy;

    public DecryptionResult analyze(String ciphertext) {
        // 1단계: 분석 실행
        List<AnalysisResult> results = analyzers.stream()
            .map(a -> a.analyze(ciphertext))
            .collect(Collectors.toList());

        // 2단계: 증거 수집 및 가설 갱신
        results.forEach(hypothesisManager::addEvidence);

        // 3단계: 추론 규칙 적용
        for (InferenceRule rule : rules) {
            for (AnalysisResult result : results) {
                if (rule.isApplicable(result)) {
                    List<Hypothesis> newHypotheses = rule.apply(
                        result, hypothesisManager.getTopHypotheses(10)
                    );
                    newHypotheses.forEach(hypothesisManager::addHypothesis);
                }
            }
        }

        // 4단계: 최선의 가설로 키 탐색
        Hypothesis bestHypothesis = hypothesisManager.getBestHypothesis();
        Cipher cipher = CipherFactory.create(bestHypothesis.cipherType());

        Optional<Key> key = searchStrategy.search(cipher, ciphertext, bestHypothesis);

        // 5단계: 결과 반환
        if (key.isPresent()) {
            String plaintext = cipher.decrypt(ciphertext, key.get());
            return DecryptionResult.success(plaintext, key.get(), bestHypothesis);
        }

        return DecryptionResult.partial(
            hypothesisManager.getTopHypotheses(5),
            results
        );
    }
}

public record DecryptionResult(
    boolean success,
    String plaintext,
    Key key,
    Hypothesis hypothesis,
    List<Hypothesis> alternativeHypotheses,
    List<AnalysisResult> evidence
) {
    public static DecryptionResult success(String plaintext, Key key, Hypothesis h) {
        return new DecryptionResult(true, plaintext, key, h, List.of(), List.of());
    }

    public static DecryptionResult partial(List<Hypothesis> alternatives,
                                           List<AnalysisResult> evidence) {
        return new DecryptionResult(false, null, null, null, alternatives, evidence);
    }
}
```

### 대화형 분석

```java
// 대화형 분석 세션

public class InteractiveSession {
    private final CryptanalysisPipeline pipeline;
    private final HypothesisManager hypothesisManager;
    private String ciphertext;
    private Map<Character, Character> userConstraints = new HashMap<>();

    public void loadCiphertext(String text) {
        this.ciphertext = text;
        hypothesisManager.clear();
    }

    public void runAutomaticAnalysis() {
        DecryptionResult result = pipeline.analyze(ciphertext);
        displayResult(result);
    }

    public void addUserConstraint(char cipherChar, char plainChar) {
        userConstraints.put(cipherChar, plainChar);

        // 제약 조건으로 가설 필터링
        hypothesisManager.filterByConstraint(cipherChar, plainChar);

        // 부분 해독 표시
        displayPartialDecryption();
    }

    public void tryHypothesis(int hypothesisIndex) {
        Hypothesis selected = hypothesisManager.getTopHypotheses(10).get(hypothesisIndex);

        Cipher cipher = CipherFactory.create(selected.cipherType());
        Optional<Key> key = searchStrategy.search(cipher, ciphertext, selected);

        if (key.isPresent()) {
            String plaintext = cipher.decrypt(ciphertext, key.get());
            System.out.println("Decrypted: " + plaintext);
        } else {
            System.out.println("Could not find complete key");
            System.out.println("Partial key: " + selected.partialKey());
        }
    }

    private void displayPartialDecryption() {
        StringBuilder partial = new StringBuilder();
        for (char c : ciphertext.toCharArray()) {
            if (userConstraints.containsKey(c)) {
                partial.append(userConstraints.get(c));
            } else {
                partial.append('_');
            }
        }
        System.out.println("Partial: " + partial);
    }
}
```

## 정리

핵심 추상화:
- **Cipher**: 암호 알고리즘, 키 공간
- **Analyzer**: 빈도, 패턴, 통계 분석
- **Hypothesis**: 가설, 신뢰도, 부분 키
- **SearchStrategy**: 키 탐색 알고리즘

추론 시스템:
- **HypothesisManager**: 가설 관리, 베이지안 갱신
- **InferenceRule**: 규칙 기반 추론
- **Scorer**: 평문 품질 평가

탐색:
- **HillClimbing**: 지역 최적화
- **GeneticAlgorithm**: 전역 탐색
- **QuadgramScorer**: 언어 모델 기반 평가

## 다음 장 예고

Chapter 11에서는 **기상 모니터링 스테이션**을 다룬다. 데이터 수집 시스템의 객체지향 설계 — 센서, 데이터 처리, 저장.

## 관련 항목

- [Ch 9: Traffic Management](/blog/programming/design/ooad/chapter09-traffic-management) — 교통 관리
- [Ch 11: Weather Monitoring Station](/blog/programming/design/ooad/chapter11-weather-monitoring-station) — 기상 모니터링
- [OOSC Ch 26: Pattern Matching](/blog/programming/design/oosc/chapter26-a-sense-of-style) — 패턴 매칭

