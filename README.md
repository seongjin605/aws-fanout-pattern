# aws-fanout-pattern

이 프로젝트는 LocalStack을 사용하여 AWS의 SNS(Simple Notification Service)와 SQS(Simple Queue Service)를 이용한 Fanout 패턴을 로컬 환경에서 테스트하기 위한 프로젝트입니다.

## 프로젝트 개요

Fanout 패턴은 하나의 메시지 발행자(Publisher)가 여러 구독자(Subscriber)에게 메시지를 전달하는 메시징 패턴입니다. 이 프로젝트에서는 AWS SNS를 사용하여 메시지를 발행하고, 여러 SQS 큐가 이를 구독하는 형태로 구현하였습니다.

## 기술 스택

- **LocalStack**: AWS 서비스를 로컬 환경에서 에뮬레이션
- **Node.js**: JavaScript 런타임
- **AWS SDK v3 for JavaScript**: AWS 서비스 접근을 위한 SDK
  - `@aws-sdk/client-sns`: SNS 서비스 클라이언트
  - `@aws-sdk/client-sqs`: SQS 서비스 클라이언트

## 설치 및 실행 방법

### 사전 요구사항

- Node.js (최신 LTS 버전 권장)
- Docker (LocalStack 실행에 필요) - 도커 데스크탑은 라이센스 이슈로 [Colima](https://github.com/abiosoft/colima) 사용 추천
- LocalStack (설치 방법은 [공식 LocalStack GitHub 저장소](https://github.com/localstack/localstack)를 참고해주세요)

### 설치

1. 저장소 클론

```bash
git clone https://github.com/seongjin605/aws-fanout-pattern.git
cd aws-fanout-pattern
```

2. 의존성 설치

```bash
npm install
# 또는
yarn
```

### 실행

1. LocalStack 환경 설정

```bash
# 실행 권한 부여
chmod +x localstack.sh

# LocalStack 시작 및 리소스 생성
./localstack.sh
```

2. Fanout 패턴 테스트 실행

```bash
npm run start
# 또는
yarn start
```

## 프로젝트 구조

- `localstack.sh`: LocalStack 시작 및 AWS 리소스(SNS 토픽, SQS 큐) 생성
- `fanout.js`: SNS 메시지 발행 및 SQS 메시지 수신 로직
- `package.json`: 프로젝트 메타데이터 및 의존성 정의

## LocalStack 환경 구성

이 프로젝트는 다음과 같은 AWS 리소스를 LocalStack에 생성합니다:

- SNS 토픽: `sample-topic`
- SQS 큐:
  - `sample-queue` (일반 큐)
  - `sns-subscriber-queue` (SNS 구독 큐)
  - `sns-subscriber-queue-2` (SNS 구독 큐)

## Fanout 패턴 동작 과정

1. SNS 토픽에 메시지 발행
2. 토픽을 구독하는 SQS 큐들이 메시지를 수신
3. Node.js 애플리케이션에서 각 SQS 큐의 메시지를 처리

## 참고 사항

- 이 프로젝트는 개발 및 테스트 목적으로만 사용됩니다.
- 실제 AWS 환경에서 실행하려면 적절한 자격 증명과 리전 설정이 필요합니다.
- LocalStack은 AWS 서비스의 일부 기능만 지원하므로, 모든 기능이 정확히 작동하지 않을 수 있습니다.
