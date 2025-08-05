#!/bin/bash

if ! command -v localstack &> /dev/null; then
  echo "LocalStack CLI가 설치되어 있지 않습니다. 설치를 진행합니다."
  brew install localstack/tap/localstack-cli
else
  echo "LocalStack CLI가 이미 설치되어 있습니다."
fi

echo "LocalStack 컨테이너를 시작합니다..."
localstack start -d

echo "LocalStack 서비스가 준비될 때까지 대기 중입니다..."
until curl -s localhost:4566 > /dev/null; do
  sleep 1
done

echo "sample-queue 큐를 생성합니다..."
awslocal sqs create-queue --queue-name sample-queue
echo "LocalStack 및 SQS 큐 설정이 완료되었습니다."

echo "sample-topic 을 생성합니다..."
awslocal sns create-topic --name sample-topic
echo "LocalStack 및 SNS topic 설정이 완료되었습니다."

echo "SNS 토픽에 구독자로 추가하는 중 입니다..."

# 첫 번째 SQS 큐 생성 및 구독
awslocal sqs create-queue --queue-name sns-subscriber-queue
QUEUE_ARN=$(awslocal sqs get-queue-attributes --queue-url http://sqs.ap-northeast-2.localhost.localstack.cloud:4566/000000000000/sns-subscriber-queue --attribute-names QueueArn | jq -r '.Attributes.QueueArn')
TOPIC_ARN="arn:aws:sns:ap-northeast-2:000000000000:sample-topic"

awslocal sns subscribe --topic-arn "$TOPIC_ARN" --protocol sqs --notification-endpoint "$QUEUE_ARN"
echo "첫 번째 SNS 수신자 큐가 SNS 토픽에 구독자로 추가되었습니다."

# 두 번째 SQS 큐 생성 및 구독
awslocal sqs create-queue --queue-name sns-subscriber-queue-2
QUEUE_ARN_2=$(awslocal sqs get-queue-attributes --queue-url http://sqs.ap-northeast-2.localhost.localstack.cloud:4566/000000000000/sns-subscriber-queue-2 --attribute-names QueueArn | jq -r '.Attributes.QueueArn')

awslocal sns subscribe --topic-arn "$TOPIC_ARN" --protocol sqs --notification-endpoint "$QUEUE_ARN_2"
echo "두 번째 SNS 수신자 큐가 SNS 토픽에 구독자로 추가되었습니다."

localstack status services