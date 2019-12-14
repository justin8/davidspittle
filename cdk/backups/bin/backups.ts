#!/usr/bin/env node
import "source-map-support/register";
import cdk = require("@aws-cdk/core");
import { s3BackupStack } from "../lib/s3-backup-stack";
import { alarmsStack } from "@justin8-cdk/alarms-stack";

const app = new cdk.App();
const alarmsTopicName = "alarmsTopic";

const alarms = new alarmsStack(app, "alarms-stack", {
  alarmEmails: ["justin@dray.be", "ds@davidspittle.com"],
  alarmsTopicName: alarmsTopicName
});

const backups = new s3BackupStack(app, "s3-backup-stack", {
  alarmsTopic: alarms.alarmsTopic
});
