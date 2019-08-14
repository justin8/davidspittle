#!/bin/bash
set -euo pipefail
stack_name=s3-backups
aws="aws --profile davidspittle"
stack_command="create-stack"

stack_status() {
    $aws cloudformation list-stacks | jq -r ".StackSummaries[] | select(.StackName | contains(\"$stack_name\")) | .StackStatus" | grep -v "DELETE_COMPLETE"
}

if [[ "$(stack_status)" ]]; then
    stack_command="update-stack"
fi

$aws cloudformation $stack_command --stack-name $stack_name --template-body "file://$PWD/s3-backups-cloudformation.yaml" --capabilities CAPABILITY_NAMED_IAM

current_status="IN_PROGRESS"
while [[ $current_status =~ IN_PROGRESS ]]; do
    sleep 10
    current_status="$(stack_status)"
    echo "Current status: $current_status"
done