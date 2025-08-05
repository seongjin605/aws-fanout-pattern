const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');

const snsClient = new SNSClient({
  endpoint: 'http://sns.us-east-1.localhost.localstack.cloud:4566',
  region: 'ap-northeast-2',
  // LocalStack 기본 자격 증명
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  }
});

async function sendSnsMessage({ topicArn = '', message = '', color = '', count = null }) {
  try {
    const messageAttributes = {
      color: {
        DataType: 'String',
        StringValue: color
      }
    };

    if (count) {
      messageAttributes.count = {
        DataType: 'Number',
        StringValue: count.toString()
      };
    }

    const command = new PublishCommand({
      TopicArn: topicArn,
      Message: message,
      MessageAttributes: messageAttributes
    });

    const response = await snsClient.send(command);
    console.log(
      `SNS 메시지 전송 성공 [색상: ${color}${count !== null ? `, 개수: ${count}` : ''}]:`,
      response.MessageId
    );
    return response;
  } catch (error) {
    console.error('SNS 메시지 전송 실패:', error);
    throw error;
  }
}

const sqsClient = new SQSClient({
  region: 'ap-northeast-2',
  endpoint: 'http://sqs.ap-northeast-2.localhost.localstack.cloud:4566',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  }
});

async function receiveSqsMessages(queueUrl = '', deleteMessages = true) {
  try {
    const queueName = queueUrl.split('/').pop();
    console.log(`\n=== 큐 [${queueName}]에서 메시지 수신 중... ===`);

    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10, // 최대 10개의 메시지를 가져옴
      WaitTimeSeconds: 3, // 폴링 대기 시간
      MessageAttributeNames: ['All'] // 모든 메시지 속성 가져오기
    });

    const response = await sqsClient.send(command);

    if (response.Messages && response.Messages.length > 0) {
      console.log(`큐 [${queueName}]에서 ${response.Messages.length}개의 메시지 수신됨:`);

      for (let i = 0; i < response.Messages.length; i++) {
        const message = response.Messages[i];
        console.log(`\n--- 메시지 ${i + 1} ---`);

        try {
          const snsMessage = JSON.parse(message.Body);
          console.log(`실제 메시지: ${snsMessage.Message}`);

          if (snsMessage.MessageAttributes) {
            console.log('메시지 속성:');
            Object.entries(snsMessage.MessageAttributes).forEach(([key, value]) => {
              console.log(`  - ${key}: ${value.Value} (타입: ${value.Type})`);
            });
          }
        } catch (parseError) {
          console.log(`메시지 내용: ${message.Body}`);
        }

        if (deleteMessages && message.ReceiptHandle) {
          await deleteSqsMessage({ queueUrl, receiptHandle: message.ReceiptHandle });
        }
      }
    } else {
      console.log(`큐 [${queueName}]에 메시지가 없습니다.`);
    }

    return response.Messages || [];
  } catch (error) {
    console.error(`큐 [${queueUrl}] 메시지 수신 실패:`, error);
    return [];
  }
}

async function deleteSqsMessage({ queueUrl = '', receiptHandle = '' }) {
  try {
    const queueName = queueUrl.split('/').pop();

    const command = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle
    });

    await sqsClient.send(command);
    console.log(`큐 [${queueName}]에서 메시지 삭제 완료:`, receiptHandle.substring(0, 10) + '...');
  } catch (error) {
    console.error(`큐 [${queueUrl}]에서 메시지 삭제 실패:`, error);
  }
}

const QUEUE_URLS = {
  ColorQueue: 'http://sqs.ap-northeast-2.localhost.localstack.cloud:4566/000000000000/ColorQueue',
  BlueYellowQueue: 'http://sqs.ap-northeast-2.localhost.localstack.cloud:4566/000000000000/BlueYellowQueue',
  RedQueue: 'http://sqs.ap-northeast-2.localhost.localstack.cloud:4566/000000000000/RedQueue',
  GreenHighQueue: 'http://sqs.ap-northeast-2.localhost.localstack.cloud:4566/000000000000/GreenHighQueue',
  GreenLowQueue: 'http://sqs.ap-northeast-2.localhost.localstack.cloud:4566/000000000000/GreenLowQueue'
};

const TOPIC_ARN = 'arn:aws:sns:ap-northeast-2:000000000000:sample-topic';

// 큐 정리 함수
async function clearAllQueues() {
  console.log('🧹 모든 큐 정리 중...');

  for (const [queueName, queueUrl] of Object.entries(QUEUE_URLS)) {
    try {
      console.log(`  - ${queueName} 정리 중...`);
      let totalDeleted = 0;

      while (true) {
        const command = new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 1
        });

        const response = await sqsClient.send(command);
        if (!response.Messages || response.Messages.length === 0) break;

        for (const message of response.Messages) {
          if (message.ReceiptHandle) {
            await deleteSqsMessage({ queueUrl, receiptHandle: message.ReceiptHandle });
            totalDeleted++;
          }
        }
      }

      if (totalDeleted > 0) {
        console.log(`    → ${totalDeleted}개 메시지 삭제됨`);
      } else {
        console.log(`    → 이미 비어있음`);
      }
    } catch (error) {
      console.error(`    → ${queueName} 정리 실패:`, error.message);
    }
  }

  console.log('✅ 큐 정리 완료\n');
}

async function runMessageTests() {
  console.log('🚀 SNS 메시지 필터링 테스트 시작\n');

  try {
    // 먼저 모든 큐 정리
    await clearAllQueues();

    const testMessages = [
      { color: 'blue', message: 'Blue 메시지입니다!' },
      { color: 'red', message: 'Red 메시지입니다!' },
      { color: 'yellow', message: 'Yellow 메시지입니다!' },
      { color: 'green', count: 50, message: 'Green 메시지 (50개) - 적은 수량' },
      { color: 'green', count: 150, message: 'Green 메시지 (150개) - 많은 수량' },
      { color: 'green', count: 100, message: 'Green 메시지 (정확히 100개)' },
      { color: 'blue', count: 75, message: 'Blue 메시지 (75개)' },
      { color: 'yellow', count: 200, message: 'Yellow 메시지 (200개)' }
    ];

    console.log('테스트 메시지들 전송 중...\n');

    for (const testMsg of testMessages) {
      await sendSnsMessage({
        topicArn: TOPIC_ARN,
        message: testMsg.message,
        color: testMsg.color,
        count: testMsg.count
      });
      // 메시지 간 짧은 지연
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n메시지 전송 완료, 잠시 대기 후 큐에서 수신...\n');

    // 메시지가 큐에 도달할 시간을 기다림
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('각 큐에서 메시지 수신 결과:\n');

    // 각 큐에서 메시지 수신
    for (const [queueName, queueUrl] of Object.entries(QUEUE_URLS)) {
      console.log(`\n[${queueName}] 큐 확인:`);
      console.log('예상 수신 메시지:');

      switch (queueName) {
        case 'ColorQueue':
          console.log('   → 모든 색상 메시지 (8개 예상)');
          break;
        case 'BlueYellowQueue':
          console.log('   → blue, yellow 메시지만 (4개 예상)');
          break;
        case 'RedQueue':
          console.log('   → red 메시지만 (1개 예상)');
          break;
        case 'GreenHighQueue':
          console.log('   → green이고 100개 이상 (2개 예상: 150개, 100개)');
          break;
        case 'GreenLowQueue':
          console.log('   → green이고 100개 미만 (1개 예상: 50개)');
          break;
      }

      await receiveSqsMessages(queueUrl, false); // 메시지 삭제하지 않음
      console.log('-'.repeat(60));
    }

    console.log('\n테스트 완료!');
    console.log('\n필터링 규칙 요약:');
    console.log('1. ColorQueue: 모든 색상 수신');
    console.log('2. BlueYellowQueue: blue, yellow만 수신');
    console.log('3. RedQueue: red만 수신');
    console.log('4. GreenHighQueue: green이고 count >= 100');
    console.log('5. GreenLowQueue: green이고 count < 100');
  } catch (error) {
    console.error('❌ 테스트 실행 중 오류:', error);
  }
}

// 개별 큐 확인 함수
async function checkQueue(queueName, clearFirst = false) {
  if (!QUEUE_URLS[queueName]) {
    console.error(`❌ 잘못된 큐 이름: ${queueName}`);
    console.log('사용 가능한 큐:', Object.keys(QUEUE_URLS).join(', '));
    return;
  }

  if (clearFirst) {
    console.log(`🧹 [${queueName}] 큐 정리 중...`);
    let totalDeleted = 0;

    while (true) {
      const command = new ReceiveMessageCommand({
        QueueUrl: QUEUE_URLS[queueName],
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 1
      });

      const response = await sqsClient.send(command);
      if (!response.Messages || response.Messages.length === 0) break;

      for (const message of response.Messages) {
        if (message.ReceiptHandle) {
          await deleteSqsMessage({ queueUrl: QUEUE_URLS[queueName], receiptHandle: message.ReceiptHandle });
          totalDeleted++;
        }
      }
    }

    console.log(`✅ ${totalDeleted}개 메시지 삭제됨\n`);
  }

  console.log(`🔍 [${queueName}] 큐 메시지 확인:`);
  await receiveSqsMessages(QUEUE_URLS[queueName], false);
}

console.log('🎯 SNS 메시지 필터링 데모');
console.log('사용법:');
console.log('  node fanout.js                    # 전체 테스트 실행 (큐 정리 후)');
console.log('  node fanout.js [큐이름]           # 특정 큐 확인');
console.log('  node fanout.js [큐이름] clear     # 특정 큐 정리 후 확인');
console.log('  node fanout.js clear              # 모든 큐 정리만 실행');
console.log('\n사용 가능한 큐:', Object.keys(QUEUE_URLS).join(', '));
console.log('');

const queueName = process.argv[2];
const clearFlag = process.argv[3] === 'clear' || process.argv[2] === 'clear';

if (queueName === 'clear') {
  clearAllQueues();
} else if (queueName) {
  checkQueue(queueName, clearFlag);
} else {
  runMessageTests();
}
