---
title: "Ch 11: Data Acquisition: Weather Monitoring Station"
date: 2026-05-19T11:00:00
description: "케이스 스터디 — 기상 모니터링 스테이션 데이터 수집."
series: "Object-Oriented Analysis and Design with Applications"
seriesOrder: 11
tags: [oop, booch, case-study, data-acquisition, weather]
draft: true
type: book-review
bookTitle: "Object-Oriented Analysis and Design with Applications"
bookAuthor: "Grady Booch"
---

## 한 줄 요약

> 기상 모니터링 시스템은 **센서 추상화**, **데이터 파이프라인**, **저장/조회**의 협력이다. 객체지향이 다양한 센서와 데이터 형식의 복잡성을 관리한다.

## 문제 도메인

### 시스템 개요

| 구분 | 항목 |
|------|------|
| **목표** | 기상 데이터 수집, 실시간 모니터링, 이력 저장/분석, 경보 발생 |
| **측정 항목** | 기온, 습도, 기압, 풍속/풍향, 강수량, 일사량, 가시거리 |

### 요구사항

**기능 요구사항**

| 기능 | 세부 내용 |
|------|----------|
| 데이터 수집 | 다양한 센서 지원, 설정 가능한 샘플링 주기, 결측치 처리 |
| 데이터 처리 | 단위 변환, 품질 검사, 통계 계산(평균, 최대, 최소) |
| 데이터 저장 | 시계열 데이터베이스, 요약 데이터 생성, 장기 보관 |
| 알림 | 임계값 경보, 급격한 변화 감지, 센서 고장 알림 |

**비기능 요구사항**

| 항목 |
|------|
| 24/7 무인 운영 |
| 데이터 손실 방지 |
| 원격 접근 |
| 저전력 운영 |

## 핵심 추상화

### 센서 계층

![Weather Sensor Hierarchy](/images/blog/ooad/diagrams/ch11-sensor-hierarchy.svg)

```java
// 센서 인터페이스

public interface Sensor<T extends Measurement> {
    SensorId getId();
    SensorType getType();
    T read();
    SensorStatus getStatus();
    void calibrate(CalibrationData data);
    SensorMetadata getMetadata();
}

public interface Measurement {
    MeasurementType getType();
    double getValue();
    Unit getUnit();
    Instant getTimestamp();
    QualityFlag getQualityFlag();
}

// 구체적 센서 구현
public class ThermistorSensor implements Sensor<TemperatureMeasurement> {
    private final SensorId id;
    private final AnalogChannel channel;
    private CalibrationCurve calibrationCurve;

    @Override
    public TemperatureMeasurement read() {
        double rawVoltage = channel.readVoltage();
        double resistance = calculateResistance(rawVoltage);
        double temperatureCelsius = calibrationCurve.convert(resistance);

        QualityFlag quality = validateReading(temperatureCelsius);

        return new TemperatureMeasurement(
            temperatureCelsius,
            Unit.CELSIUS,
            Instant.now(),
            quality
        );
    }

    private double calculateResistance(double voltage) {
        // 전압 분배기 공식
        return REFERENCE_RESISTANCE * voltage / (SUPPLY_VOLTAGE - voltage);
    }

    private QualityFlag validateReading(double value) {
        if (value < MIN_VALID_TEMP || value > MAX_VALID_TEMP) {
            return QualityFlag.OUT_OF_RANGE;
        }
        if (Math.abs(value - lastReading) > MAX_CHANGE_RATE) {
            return QualityFlag.SUSPECT;
        }
        return QualityFlag.GOOD;
    }
}

// 풍속 센서
public class CupAnemometer implements Sensor<WindSpeedMeasurement> {
    private final SensorId id;
    private final PulseCounter pulseCounter;
    private final double pulsesPerRevolution;
    private final double metersPerRevolution;

    @Override
    public WindSpeedMeasurement read() {
        Duration samplingPeriod = Duration.ofSeconds(3);
        int pulseCount = pulseCounter.count(samplingPeriod);

        double revolutions = pulseCount / pulsesPerRevolution;
        double distance = revolutions * metersPerRevolution;
        double speedMps = distance / samplingPeriod.toSeconds();

        return new WindSpeedMeasurement(
            speedMps,
            Unit.METERS_PER_SECOND,
            Instant.now(),
            QualityFlag.GOOD
        );
    }
}
```

### 측정값 추상화

```java
// 측정값 계층

public abstract class Measurement {
    protected final double value;
    protected final Unit unit;
    protected final Instant timestamp;
    protected final QualityFlag qualityFlag;

    public abstract MeasurementType getType();

    public Measurement convertTo(Unit targetUnit) {
        if (unit.equals(targetUnit)) {
            return this;
        }
        double converted = UnitConverter.convert(value, unit, targetUnit);
        return withValue(converted, targetUnit);
    }

    protected abstract Measurement withValue(double value, Unit unit);
}

public class TemperatureMeasurement extends Measurement {
    @Override
    public MeasurementType getType() {
        return MeasurementType.TEMPERATURE;
    }

    @Override
    protected Measurement withValue(double value, Unit unit) {
        return new TemperatureMeasurement(value, unit, timestamp, qualityFlag);
    }

    public double toCelsius() {
        return switch (unit) {
            case CELSIUS -> value;
            case FAHRENHEIT -> (value - 32) * 5 / 9;
            case KELVIN -> value - 273.15;
            default -> throw new IllegalStateException("Unknown temperature unit");
        };
    }
}

public class WindMeasurement extends Measurement {
    private final double direction;  // 도 (0-360)

    public double getSpeed() { return value; }
    public double getDirection() { return direction; }

    public String getCardinalDirection() {
        String[] cardinals = {"N", "NE", "E", "SE", "S", "SW", "W", "NW"};
        int index = (int) Math.round(direction / 45) % 8;
        return cardinals[index];
    }
}
```

### 데이터 수집기

```java
// 데이터 수집기

public class DataAcquisitionUnit {
    private final List<SensorChannel> channels;
    private final DataBuffer buffer;
    private final EventBus eventBus;
    private final ScheduledExecutorService scheduler;

    public void start() {
        for (SensorChannel channel : channels) {
            Duration interval = channel.getSamplingInterval();
            scheduler.scheduleAtFixedRate(
                () -> acquireData(channel),
                0, interval.toMillis(), TimeUnit.MILLISECONDS
            );
        }
    }

    private void acquireData(SensorChannel channel) {
        try {
            Measurement measurement = channel.getSensor().read();

            // 품질 검사
            if (measurement.getQualityFlag() != QualityFlag.GOOD) {
                eventBus.publish(new QualityAlertEvent(channel, measurement));
            }

            // 버퍼에 저장
            buffer.add(new DataPoint(channel.getId(), measurement));

            // 이벤트 발행
            eventBus.publish(new MeasurementEvent(channel, measurement));

        } catch (SensorException e) {
            log.error("Sensor read failed: {}", channel.getId(), e);
            eventBus.publish(new SensorErrorEvent(channel, e));
        }
    }
}

// 센서 채널 설정
public record SensorChannel(
    ChannelId id,
    Sensor<?> sensor,
    Duration samplingInterval,
    ProcessingPipeline pipeline,
    List<AlertRule> alertRules
) {}
```

## 데이터 처리 파이프라인

### 파이프라인 구조

![Weather Data Processing Pipeline](/images/blog/ooad/diagrams/ch11-pipeline.svg)

```java
// 파이프라인 인터페이스

public interface ProcessingStage<I, O> {
    O process(I input);
    String getName();
}

public class ProcessingPipeline {
    private final List<ProcessingStage<?, ?>> stages;

    @SuppressWarnings("unchecked")
    public <T> T process(Object input) {
        Object current = input;
        for (ProcessingStage stage : stages) {
            current = stage.process(current);
        }
        return (T) current;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final List<ProcessingStage<?, ?>> stages = new ArrayList<>();

        public <I, O> Builder addStage(ProcessingStage<I, O> stage) {
            stages.add(stage);
            return this;
        }

        public ProcessingPipeline build() {
            return new ProcessingPipeline(stages);
        }
    }
}

// 검증 단계
public class ValidationStage implements ProcessingStage<Measurement, Measurement> {
    private final RangeValidator rangeValidator;
    private final RateOfChangeValidator rateValidator;

    @Override
    public Measurement process(Measurement input) {
        QualityFlag flag = QualityFlag.GOOD;

        if (!rangeValidator.isValid(input)) {
            flag = QualityFlag.OUT_OF_RANGE;
        } else if (!rateValidator.isValid(input)) {
            flag = QualityFlag.SUSPECT;
        }

        return input.withQualityFlag(flag);
    }

    @Override
    public String getName() {
        return "Validation";
    }
}

// 통계 계산 단계
public class StatisticsStage implements ProcessingStage<List<Measurement>, Statistics> {
    @Override
    public Statistics process(List<Measurement> measurements) {
        DoubleSummaryStatistics stats = measurements.stream()
            .filter(m -> m.getQualityFlag() == QualityFlag.GOOD)
            .mapToDouble(Measurement::getValue)
            .summaryStatistics();

        double standardDev = calculateStandardDeviation(measurements);

        return new Statistics(
            stats.getMin(),
            stats.getMax(),
            stats.getAverage(),
            standardDev,
            stats.getCount()
        );
    }
}

// 집계 단계
public class AggregationStage implements ProcessingStage<DataPoint, AggregatedData> {
    private final Map<ChannelId, List<DataPoint>> buffers = new ConcurrentHashMap<>();
    private final Duration aggregationPeriod;

    @Override
    public AggregatedData process(DataPoint input) {
        buffers.computeIfAbsent(input.channelId(), k -> new ArrayList<>())
            .add(input);

        List<DataPoint> buffer = buffers.get(input.channelId());

        if (shouldAggregate(buffer)) {
            AggregatedData aggregated = aggregate(buffer);
            buffer.clear();
            return aggregated;
        }

        return null; // 아직 집계 안 함
    }

    private AggregatedData aggregate(List<DataPoint> points) {
        Instant start = points.get(0).timestamp();
        Instant end = points.get(points.size() - 1).timestamp();

        List<Measurement> measurements = points.stream()
            .map(DataPoint::measurement)
            .collect(Collectors.toList());

        Statistics stats = new StatisticsStage().process(measurements);

        return new AggregatedData(start, end, stats, points.size());
    }
}
```

### 경보 시스템

```java
// 경보 규칙

public interface AlertRule {
    Optional<Alert> evaluate(Measurement measurement);
    String getName();
}

public class ThresholdAlertRule implements AlertRule {
    private final String name;
    private final double lowerThreshold;
    private final double upperThreshold;
    private final AlertSeverity severity;

    @Override
    public Optional<Alert> evaluate(Measurement measurement) {
        double value = measurement.getValue();

        if (value < lowerThreshold) {
            return Optional.of(new Alert(
                name,
                severity,
                String.format("Value %.2f below threshold %.2f",
                    value, lowerThreshold),
                measurement.getTimestamp()
            ));
        }

        if (value > upperThreshold) {
            return Optional.of(new Alert(
                name,
                severity,
                String.format("Value %.2f above threshold %.2f",
                    value, upperThreshold),
                measurement.getTimestamp()
            ));
        }

        return Optional.empty();
    }
}

public class RateOfChangeAlertRule implements AlertRule {
    private final String name;
    private final double maxChangePerMinute;
    private final AlertSeverity severity;
    private Measurement lastMeasurement;

    @Override
    public Optional<Alert> evaluate(Measurement measurement) {
        if (lastMeasurement == null) {
            lastMeasurement = measurement;
            return Optional.empty();
        }

        double deltaValue = Math.abs(measurement.getValue() - lastMeasurement.getValue());
        double deltaTime = Duration.between(
            lastMeasurement.getTimestamp(),
            measurement.getTimestamp()
        ).toMinutes();

        double ratePerMinute = deltaValue / Math.max(deltaTime, 0.01);

        lastMeasurement = measurement;

        if (ratePerMinute > maxChangePerMinute) {
            return Optional.of(new Alert(
                name,
                severity,
                String.format("Rapid change detected: %.2f per minute", ratePerMinute),
                measurement.getTimestamp()
            ));
        }

        return Optional.empty();
    }
}

// 경보 관리자
public class AlertManager {
    private final List<AlertHandler> handlers;
    private final AlertRepository repository;

    public void process(Alert alert) {
        // 저장
        repository.save(alert);

        // 핸들러에 전달
        for (AlertHandler handler : handlers) {
            if (handler.canHandle(alert)) {
                handler.handle(alert);
            }
        }
    }
}

// 경보 핸들러
public class EmailAlertHandler implements AlertHandler {
    private final EmailService emailService;
    private final List<String> recipients;
    private final AlertSeverity minimumSeverity;

    @Override
    public boolean canHandle(Alert alert) {
        return alert.severity().ordinal() >= minimumSeverity.ordinal();
    }

    @Override
    public void handle(Alert alert) {
        String subject = String.format("[%s] Weather Alert: %s",
            alert.severity(), alert.name());
        String body = formatAlertBody(alert);
        emailService.send(recipients, subject, body);
    }
}
```

## 데이터 저장

### 저장소 추상화

```java
// 저장소 인터페이스

public interface MeasurementRepository {
    void save(DataPoint dataPoint);
    void saveBatch(List<DataPoint> dataPoints);

    List<Measurement> findByChannel(
        ChannelId channelId,
        Instant from,
        Instant to
    );

    Statistics getStatistics(
        ChannelId channelId,
        Instant from,
        Instant to
    );

    List<AggregatedData> getHourlyAggregates(
        ChannelId channelId,
        LocalDate date
    );
}

// 시계열 데이터베이스 구현
public class TimeSeriesRepository implements MeasurementRepository {
    private final TimeSeriesDatabase database;

    @Override
    public void save(DataPoint dataPoint) {
        database.write(
            dataPoint.channelId().toString(),
            dataPoint.measurement().getValue(),
            dataPoint.timestamp(),
            Map.of(
                "unit", dataPoint.measurement().getUnit().toString(),
                "quality", dataPoint.measurement().getQualityFlag().toString()
            )
        );
    }

    @Override
    public List<Measurement> findByChannel(
            ChannelId channelId, Instant from, Instant to) {
        String query = String.format(
            "SELECT * FROM measurements WHERE channel = '%s' AND time >= %d AND time <= %d",
            channelId, from.toEpochMilli(), to.toEpochMilli()
        );

        return database.query(query).stream()
            .map(this::toMeasurement)
            .collect(Collectors.toList());
    }

    @Override
    public Statistics getStatistics(
            ChannelId channelId, Instant from, Instant to) {
        String query = String.format(
            "SELECT MIN(value), MAX(value), MEAN(value), STDDEV(value), COUNT(*) " +
            "FROM measurements WHERE channel = '%s' AND time >= %d AND time <= %d",
            channelId, from.toEpochMilli(), to.toEpochMilli()
        );

        return database.queryOne(query, this::toStatistics);
    }
}

// 로컬 버퍼 (네트워크 장애 대응)
public class BufferedRepository implements MeasurementRepository {
    private final MeasurementRepository primary;
    private final LocalFileBuffer buffer;
    private final int maxRetries;

    @Override
    public void save(DataPoint dataPoint) {
        try {
            primary.save(dataPoint);
            // 성공하면 버퍼에서 이전 실패 항목 재전송 시도
            flushBuffer();
        } catch (RepositoryException e) {
            log.warn("Primary save failed, buffering locally", e);
            buffer.add(dataPoint);
        }
    }

    private void flushBuffer() {
        List<DataPoint> buffered = buffer.readAll();
        for (DataPoint point : buffered) {
            try {
                primary.save(point);
                buffer.remove(point);
            } catch (RepositoryException e) {
                break; // 다음 기회에 재시도
            }
        }
    }
}
```

## 시스템 통합

### 기상 스테이션 컨트롤러

```java
// 메인 컨트롤러

public class WeatherStation {
    private final DataAcquisitionUnit dau;
    private final ProcessingPipeline pipeline;
    private final AlertManager alertManager;
    private final MeasurementRepository repository;
    private final EventBus eventBus;

    public void start() {
        // 이벤트 구독
        eventBus.subscribe(MeasurementEvent.class, this::onMeasurement);
        eventBus.subscribe(SensorErrorEvent.class, this::onSensorError);

        // 데이터 수집 시작
        dau.start();

        log.info("Weather station started");
    }

    private void onMeasurement(MeasurementEvent event) {
        Measurement processed = pipeline.process(event.measurement());

        // 저장
        repository.save(new DataPoint(
            event.channel().getId(),
            processed
        ));

        // 경보 검사
        for (AlertRule rule : event.channel().alertRules()) {
            rule.evaluate(processed).ifPresent(alertManager::process);
        }
    }

    private void onSensorError(SensorErrorEvent event) {
        Alert alert = new Alert(
            "Sensor Error",
            AlertSeverity.HIGH,
            String.format("Sensor %s error: %s",
                event.channel().getId(),
                event.exception().getMessage()),
            Instant.now()
        );
        alertManager.process(alert);
    }

    public WeatherReport getCurrentWeather() {
        Map<MeasurementType, Measurement> latest = new HashMap<>();

        for (SensorChannel channel : dau.getChannels()) {
            Measurement m = channel.getSensor().read();
            latest.put(m.getType(), m);
        }

        return new WeatherReport(latest, Instant.now());
    }
}

// 기상 보고서
public record WeatherReport(
    Map<MeasurementType, Measurement> measurements,
    Instant timestamp
) {
    public double getTemperature(Unit unit) {
        return measurements.get(MeasurementType.TEMPERATURE)
            .convertTo(unit).getValue();
    }

    public double getHumidity() {
        return measurements.get(MeasurementType.HUMIDITY).getValue();
    }

    public double getWindSpeed(Unit unit) {
        return measurements.get(MeasurementType.WIND_SPEED)
            .convertTo(unit).getValue();
    }

    public String getSummary() {
        return String.format(
            "Temperature: %.1f°C, Humidity: %.0f%%, Wind: %.1f m/s %s",
            getTemperature(Unit.CELSIUS),
            getHumidity(),
            getWindSpeed(Unit.METERS_PER_SECOND),
            ((WindMeasurement) measurements.get(MeasurementType.WIND_SPEED))
                .getCardinalDirection()
        );
    }
}
```

## 정리

핵심 추상화:
- **Sensor**: 센서 인터페이스, 다양한 유형 지원
- **Measurement**: 측정값, 단위, 품질 플래그
- **ProcessingPipeline**: 검증, 변환, 집계
- **AlertRule**: 경보 규칙, 임계값, 변화율

데이터 흐름:
- **수집**: 주기적 센서 읽기, 버퍼링
- **처리**: 검증, 변환, 통계 계산
- **저장**: 시계열 DB, 로컬 백업
- **알림**: 임계값 초과, 센서 장애

품질 관리:
- **검증**: 범위 검사, 변화율 검사
- **품질 플래그**: GOOD, SUSPECT, OUT_OF_RANGE
- **결측치 처리**: 보간, 플래그

## 다음 장 예고

Chapter 12에서는 **휴가 관리 웹 애플리케이션**을 다룬다. 웹 시스템의 객체지향 설계 — 계층 아키텍처, MVC, 데이터베이스 연동.

## 관련 항목

- [Ch 10: Cryptanalysis](/blog/programming/design/ooad/chapter10-cryptanalysis) — 암호 분석
- [Ch 12: Vacation Tracking System](/blog/programming/design/ooad/chapter12-vacation-tracking-system) — 휴가 관리
- [OOSC Ch 32: Object-Oriented Database Systems](/blog/programming/design/oosc/chapter32-oo-techniques-for-gui) — 객체 데이터베이스

