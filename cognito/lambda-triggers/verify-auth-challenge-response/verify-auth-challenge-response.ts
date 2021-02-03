// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { VerifyAuthChallengeResponseTriggerHandler } from "aws-lambda";

export const handler: VerifyAuthChallengeResponseTriggerHandler = async (
  event
) => {
  console.log(JSON.stringify(event, null, 2));
  event.response.answerCorrect = false;
  const expectedAnswer =
    event.request.privateChallengeParameters?.secretLoginCode;
  if (expectedAnswer && event.request.challengeAnswer === expectedAnswer) {
    event.response.answerCorrect = true;
  }
  console.log(JSON.stringify(event, null, 2));
  return event;
};
