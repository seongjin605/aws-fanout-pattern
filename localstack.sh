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

TOPIC_ARN="arn:aws:sns:ap-northeast-2:000000000000:sample-topic"

# 1. ColorQueue: 모든 색상 메시지 수신
echo "ColorQueue 생성 및 구독 중..."
awslocal sqs create-queue --queue-name ColorQueue
COLOR_QUEUE_ARN=$(awslocal sqs get-queue-attributes --queue-url http://sqs.ap-northeast-2.localhost.localstack.cloud:4566/000000000000/ColorQueue --attribute-names QueueArn | jq -r '.Attributes.QueueArn')
COLOR_SUBSCRIPTION_ARN=$(awslocal sns subscribe --topic-arn "$TOPIC_ARN" --protocol sqs --notification-endpoint "$COLOR_QUEUE_ARN" --output text)
# 모든 색상을 허용하는 필터 정책
awslocal sns set-subscription-attributes --subscription-arn "$COLOR_SUBSCRIPTION_ARN" --attribute-name FilterPolicy --attribute-value '{"color":["blue","red","yellow","green"]}'
echo "ColorQueue가 SNS 토픽에 구독되었습니다 (모든 색상 수신)"

# 2. BlueYellowQueue: blue와 yellow만 수신
echo "BlueYellowQueue 생성 및 구독 중..."
awslocal sqs create-queue --queue-name BlueYellowQueue
BLUE_YELLOW_QUEUE_ARN=$(awslocal sqs get-queue-attributes --queue-url http://sqs.ap-northeast-2.localhost.localstack.cloud:4566/000000000000/BlueYellowQueue --attribute-names QueueArn | jq -r '.Attributes.QueueArn')
BLUE_YELLOW_SUBSCRIPTION_ARN=$(awslocal sns subscribe --topic-arn "$TOPIC_ARN" --protocol sqs --notification-endpoint "$BLUE_YELLOW_QUEUE_ARN" --output text)
# blue와 yellow만 허용하는 필터 정책
awslocal sns set-subscription-attributes --subscription-arn "$BLUE_YELLOW_SUBSCRIPTION_ARN" --attribute-name FilterPolicy --attribute-value '{"color":["blue","yellow"]}'
echo "BlueYellowQueue가 SNS 토픽에 구독되었습니다 (blue, yellow만 수신)"

# 3. RedQueue: red만 수신
echo "RedQueue 생성 및 구독 중..."
awslocal sqs create-queue --queue-name RedQueue
RED_QUEUE_ARN=$(awslocal sqs get-queue-attributes --queue-url http://sqs.ap-northeast-2.localhost.localstack.cloud:4566/000000000000/RedQueue --attribute-names QueueArn | jq -r '.Attributes.QueueArn')
RED_SUBSCRIPTION_ARN=$(awslocal sns subscribe --topic-arn "$TOPIC_ARN" --protocol sqs --notification-endpoint "$RED_QUEUE_ARN" --output text)
# red만 허용하는 필터 정책
awslocal sns set-subscription-attributes --subscription-arn "$RED_SUBSCRIPTION_ARN" --attribute-name FilterPolicy --attribute-value '{"color":["red"]}'
echo "RedQueue가 SNS 토픽에 구독되었습니다 (red만 수신)"

# 4. GreenHighQueue: green 메시지가 100 이상일 때만 수신
echo "GreenHighQueue 생성 및 구독 중..."
awslocal sqs create-queue --queue-name GreenHighQueue
GREEN_HIGH_QUEUE_ARN=$(awslocal sqs get-queue-attributes --queue-url http://sqs.ap-northeast-2.localhost.localstack.cloud:4566/000000000000/GreenHighQueue --attribute-names QueueArn | jq -r '.Attributes.QueueArn')
GREEN_HIGH_SUBSCRIPTION_ARN=$(awslocal sns subscribe --topic-arn "$TOPIC_ARN" --protocol sqs --notification-endpoint "$GREEN_HIGH_QUEUE_ARN" --output text)
# green이고 count가 100 이상인 메시지만 허용하는 필터 정책
awslocal sns set-subscription-attributes --subscription-arn "$GREEN_HIGH_SUBSCRIPTION_ARN" --attribute-name FilterPolicy --attribute-value '{"color":["green"],"count":[{"numeric":[">=",100]}]}'
echo "GreenHighQueue가 SNS 토픽에 구독되었습니다 (green이고 100개 이상일 때만 수신)"

# 5. GreenLowQueue: green 메시지가 100 미만일 때만 수신
echo "GreenLowQueue 생성 및 구독 중..."
awslocal sqs create-queue --queue-name GreenLowQueue
GREEN_LOW_QUEUE_ARN=$(awslocal sqs get-queue-attributes --queue-url http://sqs.ap-northeast-2.localhost.localstack.cloud:4566/000000000000/GreenLowQueue --attribute-names QueueArn | jq -r '.Attributes.QueueArn')
GREEN_LOW_SUBSCRIPTION_ARN=$(awslocal sns subscribe --topic-arn "$TOPIC_ARN" --protocol sqs --notification-endpoint "$GREEN_LOW_QUEUE_ARN" --output text)
# green이고 count가 100 미만인 메시지만 허용하는 필터 정책
awslocal sns set-subscription-attributes --subscription-arn "$GREEN_LOW_SUBSCRIPTION_ARN" --attribute-name FilterPolicy --attribute-value '{"color":["green"],"count":[{"numeric":["<",100]}]}'
echo "GreenLowQueue가 SNS 토픽에 구독되었습니다 (green이고 100개 미만일 때만 수신)"

localstack status services