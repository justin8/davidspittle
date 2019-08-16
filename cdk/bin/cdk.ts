#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import {s3BackupStack} from '../lib/s3-backup-stack';
import {alarmsStack} from '../lib/alarms-stack';

const app = new cdk.App();
const alarmsTopicName = 'alarmsTopic';

new alarmsStack(app, 'alarms-stack', {
  alarmEmails: ['justin@dray.be'],
  alarmsTopicName: alarmsTopicName,
});

new s3BackupStack(app, 's3-backup-stack', {
  alarmsTopicName: alarmsTopicName,
});
