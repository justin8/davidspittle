import cdk = require("@aws-cdk/core");
import iam = require("@aws-cdk/aws-iam");
import { SnsAction } from "@aws-cdk/aws-cloudwatch-actions";
import { PolicyStatement, ManagedPolicy } from "@aws-cdk/aws-iam";
import { FilterPattern, LogGroup, MetricFilter } from "@aws-cdk/aws-logs";
import { Topic } from "@aws-cdk/aws-sns";
import { MANAGED_POLICIES } from "cdk-constants";
import { LogGroupWrapper } from "@justin8-cdk/logwrapper";

export interface s3BackupStackProps {
  alarmsTopic: Topic;
}

export class s3BackupStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: s3BackupStackProps) {
    super(scope, id);

    // IAM
    const readynas = new iam.User(this, "readynas", { userName: "readynas" });

    const policies = [
      new iam.Policy(this, "s3BackupsWriterPolicy", {
        policyName: "s3BackupsWriterPolicy",
        statements: [
          new PolicyStatement({
            actions: ["s3:*"],
            effect: iam.Effect.ALLOW,
            resources: [
              "arn:aws:s3:::davidspittlebackups",
              "arn:aws:s3:::davidspittlebackups/*"
            ]
          })
        ]
      })
    ];

    for (let policy of policies) {
      readynas.attachInlinePolicy(policy);
    }

    readynas.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        MANAGED_POLICIES.CLOUD_WATCH_AGENT_SERVER_POLICY
      )
    );

    // Logs
    const logGroups = [
      new LogGroupWrapper(this, "s3Backup", {
        logGroupName: "/var/log/s3-backup.log",
        alarmsTopic: props.alarmsTopic,
        filterPattern: FilterPattern.anyTerm(
          "error",
          "Error",
          "does not exist",
          "command not found"
        ),
        noLogsAlarm: {
          enabled: true,
          evaluationPeriods: 1,
          metricPeriod: cdk.Duration.days(1),
          threshold: 5
        },
        errorsAlarm: {
          enabled: true,
          evaluationPeriods: 1,
          metricPeriod: cdk.Duration.minutes(5),
          threshold: 1
        }
      }),
      new LogGroupWrapper(this, "ansiblePull", {
        logGroupName: "/var/log/ansible-pull.log",
        alarmsTopic: props.alarmsTopic,
        filterPattern: FilterPattern.anyTerm("FAILED", "ERROR"),
        alarmsTopic: props.alarmsTopic,
        noLogsAlarm: {
          enabled: true,
          evaluationPeriods: 4,
          metricPeriod: cdk.Duration.hours(1),
          threshold: 5
        },
        errorsAlarm: {
          enabled: true,
          evaluationPeriods: 5,
          metricPeriod: cdk.Duration.minutes(5),
          threshold: 1
        }
      })
    ];
  }
}
