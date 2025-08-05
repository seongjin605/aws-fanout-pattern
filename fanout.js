const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');

// LocalStack에 연결하기 위한 SNS 클라이언트 설정
const snsClient = new SNSClient({
  endpoint: 'http://sns.us-east-1.localhost.localstack.cloud:4566', // LocalStack의 Edge 포트
  region: 'ap-northeast-2',
  credentials: {
    accessKeyId: 'test', // LocalStack 기본 자격 증명
    secretAccessKey: 'test'
  }
});

// SNS 메시지 전송 함수
async function sendSnsMessage(topicArn = '', message = '') {
  try {
    const command = new PublishCommand({
      TopicArn: topicArn,
      Message: message
    });

    const response = await snsClient.send(command);
    console.log('SNS 메시지 전송 성공:', response.MessageId);
  } catch (error) {
    console.error('SNS 메시지 전송 실패:', error);
  }
}

// 실행 예제
const topicArn = 'arn:aws:sns:ap-northeast-2:000000000000:sample-topic';
sendSnsMessage(topicArn, 'Hello from LocalStack!');

const sqsClient = new SQSClient({
  region: 'ap-northeast-2',
  endpoint: 'http://sqs.ap-northeast-2.localhost.localstack.cloud:4566',
  credentials: {
    accessKeyId: 'test', // LocalStack 기본 자격 증명
    secretAccessKey: 'test'
  }
});

// SQS 메시지 수신 함수
async function receiveSqsMessages(queueUrl = '') {
  try {
    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10, // 최대 10개의 메시지를 가져옴
      WaitTimeSeconds: 5 // 폴링 대기 시간
    });

    const response = await sqsClient.send(command);

    if (response.Messages && response.Messages.length > 0) {
      console.log('수신된 메시지:', response.Messages);

      // 메시지 삭제
      for (const message of response.Messages) {
        if (message.ReceiptHandle) {
          await deleteSqsMessage(queueUrl, message.ReceiptHandle);
        }
      }
    } else {
      console.log('메시지가 없습니다.');
    }
  } catch (error) {
    console.error('SQS 메시지 수신 실패:', error);
  }
}

// SQS 메시지 삭제 함수
async function deleteSqsMessage(queueUrl = '', receiptHandle = '') {
  try {
    const command = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle
    });

    await sqsClient.send(command);
    console.log('메시지 삭제 완료:', receiptHandle);
  } catch (error) {
    console.error('메시지 삭제 실패:', error);
  }
}

receiveSqsMessages('http://sqs.ap-northeast-2.localhost.localstack.cloud:4566/000000000000/sns-subscriber-queue');
receiveSqsMessages('http://sqs.ap-northeast-2.localhost.localstack.cloud:4566/000000000000/sns-subscriber-queue-2');
