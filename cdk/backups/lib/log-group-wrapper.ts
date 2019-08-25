import cdk = require('@aws-cdk/core');
import {IFilterPattern, LogGroup, MetricFilter} from '@aws-cdk/aws-logs';
import {Construct, Duration} from '@aws-cdk/core';
import {Alarm, ComparisonOperator, TreatMissingData, Metric} from '@aws-cdk/aws-cloudwatch';

export interface LogGroupProps {
  logGroupName: string;
  filterPattern: IFilterPattern;
  noLogsAlarm: AlarmProps;
  errorsAlarm: AlarmProps;
}

export interface AlarmProps {
  enabled: boolean;
  evaluationPeriods: number;
  metricPeriod: Duration;
  threshold: number;
}

export class LogGroupWrapper extends Construct {
  public alarms: Array<Alarm>;

  constructor(parent: Construct, name: string, props: LogGroupProps) {
    super(parent, name);

    const errorMetricName = `${name}Errors`;
    const metricNamespace = 'LogMetrics';

    const logGroup = new LogGroup(
        this, `${name}LogGroup`, {logGroupName: props.logGroupName});

    const filter = new MetricFilter(this, `${name}Errors`, {
      filterPattern: props.filterPattern,
      logGroup: logGroup,
      metricValue: '1',
      metricName: errorMetricName,
      metricNamespace: metricNamespace,
    });

    // Alarms
    this.alarms = [
      new Alarm(this, `${name}ErrorsAlarm`, {
        actionsEnabled: true,
        alarmDescription:
            `An error was found in the ${props.logGroupName} log group`,
        threshold: props.errorsAlarm.threshold,
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        evaluationPeriods: props.errorsAlarm.evaluationPeriods,
        treatMissingData: TreatMissingData.NOT_BREACHING,
        metric: new Metric({
          metricName: errorMetricName,
          namespace: metricNamespace,
          period: cdk.Duration.minutes(5)
        })
      }),
      new Alarm(this, `${name}NoLogsAlarm`, {
        actionsEnabled: true,
        alarmDescription: `No logs have been found recently for the ${
            props.logGroupName} log group`,
        threshold: props.noLogsAlarm.threshold,
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        evaluationPeriods: props.noLogsAlarm.evaluationPeriods,
        treatMissingData: TreatMissingData.NOT_BREACHING,
        metric: new Metric({
          metricName: 'IncomingLogEvents',
          namespace: 'AWS/Logs',
          period: cdk.Duration.minutes(5),
          dimensions: {LogGroupName: logGroup.logGroupName}
        })
      })
    ];
  }
}