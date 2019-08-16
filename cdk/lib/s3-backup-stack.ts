import cdk = require('@aws-cdk/core');
import s3 = require('@aws-cdk/aws-s3');
import iam = require('@aws-cdk/aws-iam');
import { LogGroup, MetricFilter, FilterPattern } from "@aws-cdk/aws-logs";
import { Alarm, Metric, ComparisonOperator  } from "@aws-cdk/aws-cloudwatch";
import cloudwatch = require('@aws-cdk/aws-cloudwatch');
import { PolicyStatement } from '@aws-cdk/aws-iam';
import { SnsAction } from "@aws-cdk/aws-cloudwatch-actions";
import { Topic, Subscription, SubscriptionProtocol } from "@aws-cdk/aws-sns";

export interface s3BackupStackProps {
  alarmsTopicName: string;
}

export class s3BackupStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: s3BackupStackProps) {
    super(scope, id);

    const ERRORMETRICNAME = "s3BackupError";
    const ERRORMETRICNAMESPACE = "LogMetrics";
    const REGION = cdk.Aws.REGION;
    const ACCOUNTID = cdk.Aws.ACCOUNT_ID;
    const ALARMSTOPICARN = `arn:aws:sns:${REGION}:${ACCOUNTID}:${props.alarmsTopicName}`;
    const ALARMSTOPIC = Topic.fromTopicArn(this, props.alarmsTopicName, ALARMSTOPICARN);

    // IAM
    const readynas = new iam.User(this, 'readynas', {
      userName: 'readynas2'
    });

    const cloudwatchLogsWriter = new iam.Policy(this, "cloudwatchLogsWriter", {
      policyName: "cloudwatchLogsWriter",
      statements: [new PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
        ],
        effect: iam.Effect.ALLOW,
        resources: [ "arn:aws:logs:*"]
      })],
    });

    const s3BackupsWriterPolicy = new iam.Policy(this, "s3BackupsWriterPolicy", {
      policyName: "s3BackupsWriterPolicy",
      statements: [new PolicyStatement({
        actions: [ "s3:*" ],
        effect: iam.Effect.ALLOW,
        resources: [
          "arn:aws:s3:::davidspittlebackups",
          "arn:aws:s3:::davidspittlebackups/*",
        ]
      })],
    });
    
    for (let policy of [
      cloudwatchLogsWriter,
      s3BackupsWriterPolicy
      ]) {
        readynas.attachInlinePolicy(policy);
    }

    // Logs
    const logGroup = new LogGroup(this, "s3BackupLogGroup", {
      logGroupName: "/var/log/s3-backup.log",
      retention: 14,
    });

    new MetricFilter(this, ERRORMETRICNAME, {
      filterPattern: FilterPattern.anyTerm("error", "Error"),
      logGroup: logGroup,
      metricValue: "1",
      metricName: ERRORMETRICNAME,
      metricNamespace: ERRORMETRICNAMESPACE,
    });

    // Alarms
    const alarms = [
      new Alarm(this, "s3BackupErrorsAlarm", {
        actionsEnabled: true,
        alarmDescription: "The S3 backup script has encountered an error. Please check the logs.",
        threshold: 0,
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        evaluationPeriods: 1,
        metric: new Metric({
          metricName: ERRORMETRICNAME,
          namespace: ERRORMETRICNAMESPACE,
          period: cdk.Duration.minutes(5),
        })
      }),
      new Alarm(this, "s3BackupNoLogsAlarm", {
        actionsEnabled: true,
        alarmDescription: "The S3 backup script has not logged any errors in a while. Please check the logs.",
        threshold: 20,
        comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
        evaluationPeriods: 1,
        metric: new Metric({
          metricName: "IncomingLogEvents",
          namespace: "AWS/Logs",
          period: cdk.Duration.hours(1),
          dimensions: { LogGroupName: logGroup.logGroupName},
        })
      }),
    ];

    for (let alarm of alarms) {
      alarm.addAlarmAction(new SnsAction(ALARMSTOPIC));
    }
  }
}
